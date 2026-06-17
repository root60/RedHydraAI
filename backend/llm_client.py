from __future__ import annotations

import json
from typing import Any, AsyncGenerator, Dict, List

import anyio
import httpx

from redhydra_config import settings
from research import last_user_text
from schemas import ChatRequest, ChatMessage


def sse(data: Dict[str, Any] | str) -> str:
    if isinstance(data, str):
        return f"data: {data}\n\n"
    return "data: " + json.dumps(data, ensure_ascii=False) + "\n\n"


def clean_messages(messages: List[ChatMessage]) -> List[Dict[str, str]]:
    cleaned: List[Dict[str, str]] = []
    for message in messages[-30:]:
        role = message.role if message.role in {"system", "user", "assistant"} else "user"
        content = str(message.content or "").strip()
        if content:
            cleaned.append({"role": role, "content": content[:32000]})
    return cleaned


def fallback_text(body: ChatRequest, research: Dict[str, Any] | None = None) -> str:
    last_user = last_user_text(body.messages)

    if research and research.get("context"):
        lines = [
            "Live web search is active. Connect an upstream OpenAI-compatible model for full synthesized answers.",
            "Here are the latest sources I found:",
            "",
        ]
        for index, item in enumerate(research.get("results", [])[:8], start=1):
            lines.append(f"[{index}] {item.get('title', 'Untitled')}")
            lines.append(f"    {item.get('url', '')}")
            if item.get("snippet"):
                lines.append(f"    {item['snippet']}")
        if research.get("pages"):
            lines.append("")
            lines.append("Deep research page extracts were fetched and will be passed to the model when an upstream model is connected.")
        return "\n".join(lines).strip()

    if not last_user:
        return "RedHydra OpenCore is online. Send a message to begin."

    lower = last_user.lower()
    if any(term in lower for term in ["hello", "hi", "hey"]):
        return "Hi, I’m RedHydra OpenCore. The Python backend is online. How can I help?"

    return (
        "RedHydra Python backend is running in open-source demo mode. "
        "For real model output, set UPSTREAM_BASE_URL to an OpenAI-compatible model server. "
        "Live web search and deep research are enabled in auto mode by default.\n\n"
        f"Your message was: {last_user[:900]}"
    )


async def stream_fallback(text: str) -> AsyncGenerator[str, None]:
    for index in range(0, len(text), 18):
        yield sse({"text": text[index : index + 18]})
        await anyio.sleep(0.003)
    yield sse("[DONE]")


async def stream_upstream(payload: Dict[str, Any], headers: Dict[str, str]) -> AsyncGenerator[str, None]:
    upstream_url = f"{settings.upstream_base_url}/v1/chat/completions"
    async with httpx.AsyncClient(timeout=settings.request_timeout_seconds) as client:
        async with client.stream("POST", upstream_url, headers=headers, json=payload) as response:
            if response.status_code >= 400:
                detail = (await response.aread()).decode(errors="ignore")[:1000]
                yield sse({"error": f"Upstream model error HTTP {response.status_code}: {detail}"})
                yield sse("[DONE]")
                return
            async for raw_chunk in response.aiter_text():
                if raw_chunk:
                    yield raw_chunk


async def call_upstream_json(payload: Dict[str, Any], headers: Dict[str, str]) -> Dict[str, Any]:
    async with httpx.AsyncClient(timeout=settings.request_timeout_seconds) as client:
        response = await client.post(f"{settings.upstream_base_url}/v1/chat/completions", headers=headers, json=payload)
    if response.status_code >= 400:
        raise RuntimeError(response.text[:1000])
    return response.json()
