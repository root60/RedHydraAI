from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    model: Optional[str] = None
    modelName: Optional[str] = None
    messages: List[ChatMessage] = Field(default_factory=list)
    system: Optional[str] = None
    systemInstruction: Optional[str] = None
    stream: bool = True
    temperature: float = 0.7
    max_tokens: Optional[int] = None
    maxTokens: Optional[int] = None
    thinkingLevel: Optional[str] = "auto"

    # Keep default research enabled without slowing every short chat.
    # auto = search when the request looks current/research-heavy.
    webSearchMode: Optional[str] = "auto"  # auto | always | off
    webSearch: Optional[bool] = None
    liveWebSearch: Optional[bool] = None
    deepResearch: Optional[bool] = None


class SearchRequest(BaseModel):
    query: str
    max_results: Optional[int] = None
    deep: bool = False
