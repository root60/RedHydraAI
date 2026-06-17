from __future__ import annotations

import os
from dataclasses import dataclass
from typing import List


def env_bool(name: str, default: bool) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "y", "on"}


def env_int(name: str, default: int, minimum: int | None = None, maximum: int | None = None) -> int:
    try:
        value = int(os.getenv(name, str(default)))
    except ValueError:
        value = default
    if minimum is not None:
        value = max(value, minimum)
    if maximum is not None:
        value = min(value, maximum)
    return value


def env_float(name: str, default: float, minimum: float | None = None, maximum: float | None = None) -> float:
    try:
        value = float(os.getenv(name, str(default)))
    except ValueError:
        value = default
    if minimum is not None:
        value = max(value, minimum)
    if maximum is not None:
        value = min(value, maximum)
    return value


def csv_env(name: str, default: str) -> List[str]:
    raw = os.getenv(name, default)
    items = [item.strip() for item in raw.split(",") if item.strip()]
    return items or ["*"]


@dataclass(frozen=True)
class Settings:
    app_name: str = os.getenv("APP_NAME", "RedHydra OpenCore Python Backend")
    version: str = os.getenv("APP_VERSION", "1.2.0")

    default_model: str = os.getenv("DEFAULT_MODEL", "dphn/Dolphin-Llama3-8B-Instruct-exl2-6bpw")
    upstream_base_url: str = os.getenv("UPSTREAM_BASE_URL", "").rstrip("/")
    upstream_api_key: str = os.getenv("UPSTREAM_API_KEY", "")
    demo_mode: bool = env_bool("DEMO_MODE", True)

    max_tokens: int = env_int("MAX_TOKENS", 1200, 64, 16000)
    request_timeout_seconds: float = env_float("REQUEST_TIMEOUT_SECONDS", 180.0, 5.0, 600.0)
    allowed_origins: List[str] = None  # set below

    enable_web_search: bool = env_bool("ENABLE_WEB_SEARCH", True)
    enable_deep_research: bool = env_bool("ENABLE_DEEP_RESEARCH", True)
    web_search_mode: str = os.getenv("WEB_SEARCH_MODE", "auto").strip().lower()  # auto | always | off
    web_search_max_results: int = env_int("WEB_SEARCH_MAX_RESULTS", 5, 1, 12)
    deep_research_max_results: int = env_int("DEEP_RESEARCH_MAX_RESULTS", 8, 1, 12)
    deep_research_max_pages: int = env_int("DEEP_RESEARCH_MAX_PAGES", 4, 1, 8)
    web_context_char_limit: int = env_int("WEB_CONTEXT_CHAR_LIMIT", 12000, 1000, 60000)
    search_timeout_seconds: float = env_float("SEARCH_TIMEOUT_SECONDS", 12.0, 2.0, 60.0)
    page_fetch_timeout_seconds: float = env_float("PAGE_FETCH_TIMEOUT_SECONDS", 10.0, 2.0, 60.0)
    research_cache_ttl_seconds: int = env_int("RESEARCH_CACHE_TTL_SECONDS", 900, 30, 86400)


settings = Settings(allowed_origins=csv_env("ALLOWED_ORIGINS", "*"))

USER_AGENT = os.getenv(
    "USER_AGENT",
    "Mozilla/5.0 (compatible; RedHydraOpenCore/1.2; +https://github.com/root60/RedHydraOpenCore)",
)
