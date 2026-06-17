from __future__ import annotations

import asyncio
import re
import time
from html import unescape
from typing import Any, Dict, List, Optional
from urllib.parse import parse_qs, quote_plus, urljoin, urlparse

import httpx
from bs4 import BeautifulSoup

from redhydra_config import USER_AGENT, settings
from schemas import ChatRequest, ChatMessage

CacheValue = Dict[str, Any]
_cache: Dict[str, tuple[float, CacheValue]] = {}


def _cache_get(key: str) -> Optional[CacheValue]:
    item = _cache.get(key)
    if not item:
        return None
    created_at, value = item
    if time.time() - created_at > settings.research_cache_ttl_seconds:
        _cache.pop(key, None)
        return None
    return value


def _cache_set(key: str, value: CacheValue) -> CacheValue:
    _cache[key] = (time.time(), value)
    # Simple size guard for long-running free hosts.
    if len(_cache) > 256:
        oldest = sorted(_cache.items(), key=lambda item: item[1][0])[:64]
        for old_key, _ in oldest:
            _cache.pop(old_key, None)
    return value


def normalize_text(value: str, limit: int = 4000) -> str:
    text = re.sub(r"\s+", " ", unescape(value or "")).strip()
    return text[:limit]


def last_user_text(messages: List[ChatMessage]) -> str:
    for message in reversed(messages):
        if message.role == "user":
            return message.content.strip()
    return ""


def looks_current_or_researchy(text: str) -> bool:
    lower = text.lower()
    triggers = [
        "latest", "today", "yesterday", "current", "recent", "news", "2025", "2026",
        "price", "deadline", "schedule", "version", "release", "update", "law", "rule",
        "regulation", "stock", "weather", "compare", "source", "citation", "web", "search",
        "browse", "look up", "find", "research", "verify", "fact check", "github", "repository",
        "paper", "journal", "doi", "dataset", "documentation", "policy", "official",
    ]
    return any(trigger in lower for trigger in triggers)


def looks_deep_researchy(text: str, thinking_level: str | None) -> bool:
    lower = text.lower()
    if (thinking_level or "").lower() in {"high", "deep", "research"}:
        return True
    triggers = [
        "deep research", "full research", "comprehensive research", "with sources", "with citations",
        "literature review", "compare sources", "investigate", "market research", "find evidence",
        "thorough", "detailed current", "latest research", "verify with sources", "systematic review",
    ]
    return any(trigger in lower for trigger in triggers)


def should_use_web(body: ChatRequest) -> bool:
    if not settings.enable_web_search or settings.web_search_mode == "off":
        return False
    if body.webSearch is False or body.liveWebSearch is False or body.webSearchMode == "off":
        return False
    if body.webSearch is True or body.liveWebSearch is True or body.webSearchMode == "always":
        return True
    if settings.web_search_mode == "always":
        return True
    return looks_current_or_researchy(last_user_text(body.messages))


def should_use_deep_research(body: ChatRequest) -> bool:
    if not settings.enable_deep_research:
        return False
    if body.deepResearch is False:
        return False
    if body.deepResearch is True:
        return True
    return looks_deep_researchy(last_user_text(body.messages), body.thinkingLevel)


def unwrap_duckduckgo_url(url: str) -> str:
    if not url:
        return ""
    if url.startswith("//"):
        url = "https:" + url
    parsed = urlparse(url)
    if "duckduckgo.com" in parsed.netloc and parsed.path.startswith("/l/"):
        query = parse_qs(parsed.query)
        uddg = query.get("uddg", [""])[0]
        if uddg:
            return uddg
    return url


async def duckduckgo_search(query: str, max_results: int = 5) -> List[Dict[str, str]]:
    query = query.strip()
    if not query:
        return []

    cache_key = f"search:{max_results}:{query.lower()}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached["results"]

    url = f"https://duckduckgo.com/html/?q={quote_plus(query)}"
    headers = {"User-Agent": USER_AGENT, "Accept": "text/html,application/xhtml+xml"}

    try:
        async with httpx.AsyncClient(timeout=settings.search_timeout_seconds, follow_redirects=True, headers=headers) as client:
            response = await client.get(url)
            response.raise_for_status()
    except Exception:
        return []

    soup = BeautifulSoup(response.text, "html.parser")
    results: List[Dict[str, str]] = []
    seen_urls = set()

    for result in soup.select(".result"):
        link = result.select_one("a.result__a") or result.select_one("a[href]")
        if not link:
            continue

        title = normalize_text(link.get_text(" "), 180)
        href = unwrap_duckduckgo_url(link.get("href", ""))
        if href.startswith("/"):
            href = urljoin("https://duckduckgo.com", href)
        if not title or not href or href in seen_urls:
            continue

        snippet_el = result.select_one(".result__snippet")
        snippet = normalize_text(snippet_el.get_text(" ") if snippet_el else "", 420)
        domain = urlparse(href).netloc.replace("www.", "")

        results.append({"title": title, "url": href, "snippet": snippet, "domain": domain})
        seen_urls.add(href)
        if len(results) >= max_results:
            break

    if not results:
        for link in soup.find_all("a", href=True):
            title = normalize_text(link.get_text(" "), 180)
            href = unwrap_duckduckgo_url(link.get("href", ""))
            if href.startswith("/"):
                href = urljoin("https://duckduckgo.com", href)
            netloc = urlparse(href).netloc
            if not title or not href or "duckduckgo.com" in netloc or href in seen_urls:
                continue
            results.append({"title": title, "url": href, "snippet": "", "domain": netloc.replace("www.", "")})
            seen_urls.add(href)
            if len(results) >= max_results:
                break

    return _cache_set(cache_key, {"results": results})["results"]


async def fetch_page_text(url: str) -> Dict[str, str]:
    cache_key = f"page:{url}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached

    headers = {"User-Agent": USER_AGENT, "Accept": "text/html,application/xhtml+xml,text/plain"}
    try:
        async with httpx.AsyncClient(timeout=settings.page_fetch_timeout_seconds, follow_redirects=True, headers=headers) as client:
            response = await client.get(url)
            content_type = response.headers.get("content-type", "").lower()
            if response.status_code >= 400:
                value = {"url": url, "title": "", "text": "", "error": f"HTTP {response.status_code}"}
                return _cache_set(cache_key, value)
            if not any(kind in content_type for kind in ["text/html", "text/plain", "application/xhtml+xml"]):
                value = {"url": str(response.url), "title": "", "text": "", "error": "Unsupported content type"}
                return _cache_set(cache_key, value)
            html = response.text[:1_500_000]
    except Exception as exc:
        value = {"url": url, "title": "", "text": "", "error": str(exc)[:180]}
        return _cache_set(cache_key, value)

    soup = BeautifulSoup(html, "html.parser")
    for tag in soup(["script", "style", "noscript", "svg", "form", "nav", "footer", "header", "aside"]):
        tag.decompose()

    title = normalize_text(soup.title.get_text(" ") if soup.title else "", 220)
    main = soup.find("main") or soup.find("article") or soup.body or soup
    text = normalize_text(main.get_text(" "), 5200)
    value = {"url": str(response.url), "title": title, "text": text, "error": ""}
    return _cache_set(cache_key, value)


def build_web_context(query: str, results: List[Dict[str, str]], pages: Optional[List[Dict[str, str]]] = None) -> str:
    if not results and not pages:
        return ""

    lines = [
        "LIVE WEB / DEEP RESEARCH CONTEXT",
        f"Search query: {query}",
        "Use this context only when relevant. Prefer user-provided files/messages over web results if they conflict.",
        "When using live web facts, cite source markers like [1], [2].",
        "",
        "Search results:",
    ]

    for index, item in enumerate(results, start=1):
        lines.append(f"[{index}] {item.get('title', 'Untitled')} — {item.get('url', '')}")
        if item.get("snippet"):
            lines.append(f"    {item['snippet']}")

    if pages:
        lines.extend(["", "Deep research page extracts:"])
        for index, page in enumerate(pages, start=1):
            if not page.get("text"):
                continue
            lines.append(f"[P{index}] {page.get('title') or 'Untitled'} — {page.get('url', '')}")
            lines.append(f"    {page['text'][:2400]}")

    return "\n".join(lines)[: settings.web_context_char_limit]


async def gather_research_context(body: ChatRequest) -> Dict[str, Any]:
    query = last_user_text(body.messages)
    if not query:
        return {"enabled": False, "query": "", "results": [], "pages": [], "context": "", "deep": False}

    use_web = should_use_web(body)
    use_deep = should_use_deep_research(body)

    if not use_web and not use_deep:
        return {"enabled": False, "query": query, "results": [], "pages": [], "context": "", "deep": False}

    max_results = settings.deep_research_max_results if use_deep else settings.web_search_max_results
    results = await duckduckgo_search(query, max_results=max_results)

    pages: List[Dict[str, str]] = []
    if use_deep and results:
        candidates = [item["url"] for item in results[: settings.deep_research_max_pages] if item.get("url")]
        pages = await asyncio.gather(*(fetch_page_text(url) for url in candidates))

    return {
        "enabled": True,
        "deep": use_deep,
        "query": query,
        "results": results,
        "pages": pages,
        "context": build_web_context(query, results, pages),
    }
