import json
import os
from pathlib import Path
from typing import Any, AsyncIterator, Dict, List

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse

load_dotenv()

ROOT = Path(__file__).resolve().parent.parent
MODELS_FILE = ROOT / "models.json"

APP_NAME = os.getenv("APP_NAME", "RedHydra OpenCore Python Backend")
UPSTREAM_BASE_URL = os.getenv("UPSTREAM_BASE_URL", "http://localhost:11434/v1").rstrip("/")
UPSTREAM_API_KEY = os.getenv("UPSTREAM_API_KEY", "")
DEFAULT_MODEL = os.getenv("DEFAULT_MODEL", "llama3.1:8b")
ALLOWED_ORIGINS = [origin.strip() for origin in os.getenv("ALLOWED_ORIGINS", "*").split(",") if origin.strip()]
MAX_TOKENS = int(os.getenv("MAX_TOKENS", "1200"))
REQUEST_TIMEOUT_SECONDS = float(os.getenv("REQUEST_TIMEOUT_SECONDS", "180"))
DEMO_MODE = os.getenv("DEMO_MODE", "false").lower() in {"1", "true", "yes", "on"}

app = FastAPI(title=APP_NAME, version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS or ["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


def _headers() -> Dict[str, str]:
    headers = {"Content-Type": "application/json"}
    if UPSTREAM_API_KEY:
        headers["Authorization"] = f"Bearer {UPSTREAM_API_KEY}"
    return headers


def _clean_messages(messages: List[Dict[str, Any]]) -> List[Dict[str, str]]:
    cleaned: List[Dict[str, str]] = []
    allowed_roles = {"system", "user", "assistant"}
    for message in messages[-24:]:
        role = str(message.get("role", "")).lower()
        content = str(message.get("content", ""))[:24000]
        if role in allowed_roles and content.strip():
            cleaned.append({"role": role, "content": content})
    return cleaned


def _build_payload(body: Dict[str, Any]) -> Dict[str, Any]:
    system_prompt = str(
        body.get(
            "system",
            "You are RedHydra OpenCore. Answer directly and helpfully. Do not expose hidden chain-of-thought."
        )
    )
    messages = [{"role": "system", "content": system_prompt}, *_clean_messages(body.get("messages", []))]
    return {
        "model": str(body.get("model") or DEFAULT_MODEL),
        "messages": messages,
        "stream": bool(body.get("stream", True)),
        "temperature": float(body.get("temperature", 0.6)),
        "max_tokens": min(int(body.get("max_tokens", MAX_TOKENS)), 4096),
    }


def _demo_text(body: Dict[str, Any]) -> str:
    last_user = ""
    for message in reversed(body.get("messages", [])):
        if message.get("role") == "user":
            last_user = str(message.get("content", ""))
            break
    mode = str(body.get("mode", "chat")).title()
    return (
        f"RedHydra {mode} backend is running in open-source demo mode.\n\n"
        "To enable live model responses, set UPSTREAM_BASE_URL to an OpenAI-compatible model server "
        "such as Ollama, TabbyAPI, vLLM, LM Studio, OpenRouter, or your own GPU endpoint.\n\n"
        f"Received message: {last_user}"
    )


async def _stream_demo(text: str) -> AsyncIterator[bytes]:
    for token in text.split(" "):
        data = {"choices": [{"delta": {"content": token + " "}}]}
        yield f"data: {json.dumps(data)}\n\n".encode("utf-8")
    yield b"data: [DONE]\n\n"


def _chat_url() -> str:
    if UPSTREAM_BASE_URL.endswith("/chat/completions"):
        return UPSTREAM_BASE_URL
    return f"{UPSTREAM_BASE_URL}/chat/completions"


def _load_models() -> List[Dict[str, Any]]:
    try:
        data = json.loads(MODELS_FILE.read_text(encoding="utf-8"))
        if isinstance(data, list):
            return data
    except Exception:
        pass
    return [{"id": DEFAULT_MODEL, "label": DEFAULT_MODEL, "provider": "configured backend"}]


@app.get("/")
@app.get("/api/health")
async def health() -> Dict[str, Any]:
    return {
        "ok": True,
        "name": APP_NAME,
        "default_model": DEFAULT_MODEL,
        "upstream_base_url": UPSTREAM_BASE_URL,
        "demo_mode": DEMO_MODE,
        "provider": "openai-compatible",
    }


@app.get("/api/models")
async def models() -> Dict[str, Any]:
    return {"models": _load_models(), "default_model": DEFAULT_MODEL}


@app.post("/api/chat")
async def chat(request: Request):
    body = await request.json()
    payload = _build_payload(body)
    stream = bool(payload.get("stream", True))

    if DEMO_MODE:
        text = _demo_text(body)
        if stream:
            return StreamingResponse(_stream_demo(text), media_type="text/event-stream")
        return {"text": text}

    url = _chat_url()
    headers = _headers()

    if stream:
        async def event_stream() -> AsyncIterator[bytes]:
            try:
                async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT_SECONDS) as client:
                    async with client.stream("POST", url, headers=headers, json=payload) as response:
                        if response.status_code >= 400:
                            error_text = (await response.aread()).decode("utf-8", errors="ignore")[:800]
                            data = {"error": "Model backend request failed", "details": error_text}
                            yield f"data: {json.dumps(data)}\n\n".encode("utf-8")
                            return
                        async for chunk in response.aiter_bytes():
                            if chunk:
                                yield chunk
            except Exception as exc:
                data = {"error": "Model backend is unreachable", "details": str(exc)[:500]}
                yield f"data: {json.dumps(data)}\n\n".encode("utf-8")

        return StreamingResponse(
            event_stream(),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
        )

    try:
        async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT_SECONDS) as client:
            response = await client.post(url, headers=headers, json=payload)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Model backend is unreachable: {exc}") from exc

    if response.status_code >= 400:
        return JSONResponse(
            status_code=response.status_code,
            content={"error": "Model backend request failed", "details": response.text[:800]},
        )

    data = response.json()
    text = data.get("choices", [{}])[0].get("message", {}).get("content", "")
    usage = data.get("usage") or {}
    return {"text": text, "usage": usage, "raw": data if not text else None}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=int(os.getenv("PORT", "7860")), reload=True)
