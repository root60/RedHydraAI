# RedHydra OpenCore Python Backend

FastAPI proxy for any OpenAI-compatible chat completion endpoint.

## Run locally

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app:app --host 0.0.0.0 --port 7860 --reload
```

## Endpoints

```text
GET  /api/health
GET  /api/models
POST /api/chat
```

## Environment

The included `.env` is open-source safe and contains no private key.

```env
UPSTREAM_BASE_URL=http://localhost:11434/v1
UPSTREAM_API_KEY=
DEFAULT_MODEL=llama3.1:8b
ALLOWED_ORIGINS=*
DEMO_MODE=false
```

Use your hosting provider's secret settings for private API keys.
