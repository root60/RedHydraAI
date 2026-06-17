from __future__ import annotations

import asyncio
import time
from typing import Any, Dict

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse

from llm_client import call_upstream_json, clean_messages, fallback_text, stream_fallback, stream_upstream
from redhydra_config import settings
from research import duckduckgo_search, fetch_page_text, gather_research_context, build_web_context
from schemas import ChatRequest, SearchRequest

app = FastAPI(title=settings.app_name, version=settings.version)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


def now_ms() -> int:
    return int(time.time() * 1000)


def model_headers() -> Dict[str, str]:
    headers = {"Content-Type": "application/json"}
    if settings.upstream_api_key:
        headers["Authorization"] = f"Bearer {settings.upstream_api_key}"
    return headers


@app.get("/")
@app.get("/health")
@app.get("/api/health")
async def health() -> Dict[str, Any]:
    return {
        "ok": True,
        "name": settings.app_name,
        "version": settings.version,
        "model": settings.default_model,
        "upstream_configured": bool(settings.upstream_base_url),
        "demo_mode": settings.demo_mode,
        "web_search_enabled": settings.enable_web_search,
        "deep_research_enabled": settings.enable_deep_research,
        "web_search_mode": settings.web_search_mode,
        "timestamp": now_ms(),
    }


@app.get("/models")
@app.get("/api/models")
async def models() -> Dict[str, Any]:
    return {
        "default": settings.default_model,
        "models": [
            {"id": settings.default_model, "name": "RedHydra Dolphin EXL2", "type": "openai-compatible"},
            {"id": "dphn/Dolphin3.0-Qwen2.5-0.5B", "name": "RedHydra Dolphin Fast", "type": "openai-compatible"},
            {"id": "deepseek/deepseek-r1", "name": "DeepSeek R1", "type": "openrouter-compatible"},
            {"id": "meta-llama/llama-3.3-70b-instruct", "name": "Llama 3.3 70B", "type": "openrouter-compatible"},
            {"id": "llama3", "name": "Local Ollama Llama 3", "type": "ollama-compatible"},
        ],
    }


@app.post("/web-search")
@app.post("/api/web-search")
async def web_search(body: SearchRequest) -> Dict[str, Any]:
    if not settings.enable_web_search:
        raise HTTPException(status_code=403, detail="Web search is disabled on this backend.")
    max_results = min(max(body.max_results or settings.web_search_max_results, 1), 12)
    results = await duckduckgo_search(body.query, max_results=max_results)
    return {"query": body.query, "results": results, "count": len(results), "timestamp": now_ms()}


@app.post("/deep-research")
@app.post("/api/deep-research")
async def deep_research(body: SearchRequest) -> Dict[str, Any]:
    if not settings.enable_deep_research:
        raise HTTPException(status_code=403, detail="Deep research is disabled on this backend.")
    max_results = min(max(body.max_results or settings.deep_research_max_results, 1), 12)
    results = await duckduckgo_search(body.query, max_results=max_results)
    pages = await asyncio.gather(*(fetch_page_text(item["url"]) for item in results[: settings.deep_research_max_pages]))
    context = build_web_context(body.query, results, pages)
    return {
        "query": body.query,
        "results": results,
        "pages": pages,
        "context": context,
        "count": len(results),
        "timestamp": now_ms(),
    }


@app.post("/chat")
@app.post("/api/chat")
@app.post("/api/chat-stream")
async def chat(body: ChatRequest):
    model = body.model or body.modelName or settings.default_model
    max_tokens = body.max_tokens or body.maxTokens or settings.max_tokens
    system_text = body.system or body.systemInstruction or "You are RedHydra OpenCore. Answer directly and safely."

    research = await gather_research_context(body)

    messages = [{"role": "system", "content": system_text}]
    if research.get("context"):
        messages.append(
            {
                "role": "system",
                "content": (
                    "Live web search and deep research are enabled by default in auto mode. "
                    "Use the retrieved context only when relevant. Cite web facts with source markers [1], [2].\n\n"
                    + research["context"]
                ),
            }
        )
    messages.extend(clean_messages(body.messages))

    if not settings.upstream_base_url or settings.demo_mode:
        text = fallback_text(body, research)
        if body.stream:
            return StreamingResponse(stream_fallback(text), media_type="text/event-stream")
        return JSONResponse({"text": text, "model": model, "demo_mode": True, "research": research})

    payload: Dict[str, Any] = {
        "model": model,
        "messages": messages,
        "stream": bool(body.stream),
        "temperature": float(body.temperature),
        "max_tokens": int(max_tokens),
    }

    headers = model_headers()
    if body.stream:
        return StreamingResponse(stream_upstream(payload, headers), media_type="text/event-stream")

    try:
        data = await call_upstream_json(payload, headers)
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    text = data.get("choices", [{}])[0].get("message", {}).get("content", "")
    return {
        "text": text,
        "model": model,
        "demo_mode": False,
        "research": {
            "enabled": research.get("enabled"),
            "deep": research.get("deep"),
            "results": research.get("results", []),
        },
    }
