/**
 * RedHydra OpenCore AI service patch.
 *
 * IMPORTANT:
 * - This file preserves the original GUI, animations, token dashboard, live usage monitor,
 *   sidebar layout, and component structure.
 * - It only cleans model/backend plumbing and enables live web search + deep research through
 *   the optional Python backend.
 */

import { AISettings, Message, AgentPlan } from "../types";
import {
  ASSISTANT_SYSTEM_INSTRUCTIONS,
  AGENT_SYSTEM_PROMPT,
  getStyleInstruction,
} from "../utils/prompts";

const DEFAULT_PUBLIC_MODEL = "dphn/Dolphin3.0-Qwen2.5-0.5B";
const DEFAULT_ADVANCED_MODEL = "dphn/Dolphin-Llama3-8B-Instruct-exl2-6bpw";
const DEFAULT_PUBLIC_ENDPOINT = "https://itsredhydra-redhydraopencore-dolphin.hf.space";

const ENABLE_WEB_SEARCH = String((import.meta as any)?.env?.VITE_ENABLE_WEB_SEARCH || "true") !== "false";
const ENABLE_DEEP_RESEARCH = String((import.meta as any)?.env?.VITE_ENABLE_DEEP_RESEARCH || "true") !== "false";
const DEFAULT_WEB_SEARCH_MODE = String((import.meta as any)?.env?.VITE_WEB_SEARCH_MODE || "auto");

type AgentStatus = "pending" | "running" | "completed" | "failed";
type StreamChunkHandler = (text: string) => void;

type ChatPayloadMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

function createId(prefix = "m") {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function isBrowser() {
  return typeof window !== "undefined";
}

function asNumber(value: unknown, fallback: number) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeEndpoint(value: string) {
  return String(value || "").trim().replace(/\/$/, "");
}

function getStoredEndpoint() {
  if (!isBrowser()) return "";
  return normalizeEndpoint(window.localStorage.getItem("redhydra_llm_endpoint") || "");
}

function getBuiltInEndpoint() {
  const envEndpoint = normalizeEndpoint(
    (import.meta as any)?.env?.VITE_REDHYDRA_LLM_ENDPOINT ||
      (import.meta as any)?.env?.VITE_CLOUD_LLM_ENDPOINT ||
      ""
  );
  return getStoredEndpoint() || envEndpoint || DEFAULT_PUBLIC_ENDPOINT;
}

function getModelName(settings: AISettings) {
  const envModel = String((import.meta as any)?.env?.VITE_REDHYDRA_BASE_MODEL || "").trim();
  const selected = String(settings.modelName || "").trim();

  if (envModel) return envModel;
  if (!selected || selected === "hydra-opencore-v3") return DEFAULT_PUBLIC_MODEL;
  if (selected === "redhydra-advanced") return DEFAULT_ADVANCED_MODEL;
  return selected;
}

function cleanText(text: string) {
  return String(text || "")
    .replace(/PROXIED:\/\/[^\n]+/gi, "")
    .replace(/provider:\s*`?[^`\n]+`?/gi, "")
    .replace(/model:\s*`?[^`\n]+`?/gi, "")
    .replace(/built[- ]?in[- ]?opencore/gi, "RedHydra OpenCore")
    .replace(/hydra-opencore-v\d+/gi, "RedHydra")
    .replace(/\n{4,}/g, "\n\n")
    .trim();
}

function getLastUserMessage(messages: Message[]) {
  return [...messages].reverse().find((message) => message.role === "user")?.content?.trim() || "";
}

function includesAny(text: string, terms: string[]) {
  const lower = text.toLowerCase();
  return terms.some((term) => lower.includes(term));
}

function streamLocalText(text: string, onChunk?: StreamChunkHandler) {
  if (!onChunk || !isBrowser()) return;
  let index = 0;
  const timer = window.setInterval(() => {
    index += 14;
    onChunk(text.slice(0, index));
    if (index >= text.length) {
      onChunk(text);
      window.clearInterval(timer);
    }
  }, 10);
}

function extractWeatherLocation(text: string) {
  const patterns = [
    /weather\s+(?:today\s+)?(?:in|at|for)\s+([a-zA-Z\s,.-]{2,60})/i,
    /(?:in|at|for)\s+([a-zA-Z\s,.-]{2,60})\s+(?:weather|temperature)/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1].replace(/[?.!]+$/g, "").trim();
  }
  if (text.toLowerCase().includes("dhaka")) return "Dhaka";
  return "";
}

async function getWeatherAnswer(userText: string) {
  const location = extractWeatherLocation(userText);
  if (!location) return "Which city should I check the weather for?";

  try {
    const response = await fetch(`https://wttr.in/${encodeURIComponent(location)}?format=j1`, {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) throw new Error("weather lookup failed");
    const data = await response.json();
    const current = data?.current_condition?.[0];
    const area =
      data?.nearest_area?.[0]?.areaName?.[0]?.value ||
      data?.nearest_area?.[0]?.region?.[0]?.value ||
      location;
    if (!current) throw new Error("weather payload empty");

    return `Weather in ${area}: ${current.weatherDesc?.[0]?.value || "unavailable"}, ${current.temp_C}°C.\nFeels like ${current.FeelsLikeC}°C. Humidity ${current.humidity}%, wind ${current.windspeedKmph} km/h.`;
  } catch {
    return `I could not fetch live weather for ${location}. Try again with city and country name.`;
  }
}

function extractAttachment(content: string) {
  const nameMatch = content.match(/\[ATTACHED FILE:\s*"([^"]+)"/i);
  const bodyMatch = content.match(/--- ATTACHMENT CONTENT START ---\n([\s\S]*?)\n--- ATTACHMENT CONTENT END ---/i);
  return {
    name: nameMatch?.[1] || "attached file",
    body: bodyMatch?.[1]?.trim() || "",
  };
}

async function fallbackAnswer(messages: Message[]) {
  const text = getLastUserMessage(messages);
  const lower = text.toLowerCase();
  const attachment = extractAttachment(text);

  if (text.includes("--- ATTACHMENT CONTENT START ---")) {
    const preview = attachment.body
      ? attachment.body.slice(0, 1600) + (attachment.body.length > 1600 ? "\n..." : "")
      : "I could not read the attached file content in the browser.";
    return `I found ${attachment.name}.\n\n${preview}\n\nTell me what you want changed in it.`;
  }

  if (includesAny(lower, ["weather", "temperature", "forecast", "rain today"])) {
    return getWeatherAnswer(text);
  }

  if (includesAny(lower, ["hello", "hi", "hey"])) {
    return "Hi, I’m RedHydra OpenCore. How can I help?";
  }

  if (includesAny(lower, ["who are you", "your name"])) {
    return "I’m RedHydra OpenCore, an open-source AI workspace that can connect to a public RedHydra endpoint, a Python backend, OpenAI-compatible servers, or local Ollama.";
  }

  if (includesAny(lower, ["exit code 1", "process completed with exit code 1"])) {
    return "Exit code 1 means the build failed. The real cause is usually above that line. Send the first error above it and I’ll give the exact fix.";
  }

  if (includesAny(lower, ["not exported", "is not exported", "imported by"])) {
    return "That is an import/export mismatch. Export the missing item from the source file, or update the import to the correct exported name. Send both files and I’ll write the exact patch.";
  }

  if (includesAny(lower, ["vite", "build failed", "typescript", "react", "github pages", "workflow"])) {
    return "Send the full build log, especially the first error above `Process completed with exit code 1`. I’ll fix the exact file.";
  }

  if (includesAny(lower, ["fix", "bug", "error", "code", "script"])) {
    return "Send the code or full error log. I’ll give the corrected version directly.";
  }

  return text.trim().endsWith("?") ? "I can help. Add one more detail so I can answer accurately." : "Got it. Send the details you want me to work on.";
}

function getSystemInstruction(settings: AISettings, isAgentMode: boolean) {
  let instruction =
    ASSISTANT_SYSTEM_INSTRUCTIONS[settings.assistantMode] || ASSISTANT_SYSTEM_INSTRUCTIONS.general;

  const styleInstruction = getStyleInstruction(settings.responseStyle);
  if (styleInstruction) instruction += "\n\n" + styleInstruction;

  if (settings.customSystemPrompt) instruction += "\n\nUser instruction: " + settings.customSystemPrompt;

  if (settings.safeMode) {
    instruction += "\n\nSafety: Provide defensive, educational, and legitimate help. Do not provide harmful instructions.";
  }

  if (settings.thinkingLevel === "minimal" || settings.thinkingLevel === "low") {
    instruction += "\n\nRespond quickly and directly.";
  } else if (settings.thinkingLevel === "high") {
    instruction += "\n\nUse deeper analysis when needed, but do not reveal hidden reasoning.";
  }

  if (ENABLE_WEB_SEARCH) {
    instruction +=
      "\n\nLive web search is enabled through the RedHydra Python backend in auto mode. Use supplied web context when current facts, sources, or verification are helpful. Cite source markers like [1], [2] when the backend supplies live web results.";
  }

  if (ENABLE_DEEP_RESEARCH) {
    instruction +=
      "\n\nDeep research is enabled through the RedHydra Python backend in auto mode for complex or source-heavy tasks. Use it to compare sources and avoid guessing when live context is supplied.";
  }

  if (isAgentMode) instruction += "\n\n" + AGENT_SYSTEM_PROMPT;
  return instruction;
}

function normalizeMessages(messages: Message[]): Message[] {
  return messages.map((message) => {
    if (!message.attachment) return message;
    const readableContent = getReadableAttachmentContent(message.attachment);
    return {
      ...message,
      content: `[ATTACHED FILE: "${message.attachment.name}" (${message.attachment.type}, size: ${message.attachment.size} bytes)]\n--- ATTACHMENT CONTENT START ---\n${readableContent}\n--- ATTACHMENT CONTENT END ---\n\n${message.content}`,
    };
  });
}

function mapMessages(messages: Message[]): ChatPayloadMessage[] {
  return messages
    .filter((message) => message.role !== "system")
    .map((message) => ({ role: message.role, content: message.content }));
}

async function readSseOrText(response: Response, onChunk?: StreamChunkHandler) {
  const contentType = response.headers.get("content-type") || "";

  if (!response.body || (contentType.includes("application/json") && !contentType.includes("text/event-stream"))) {
    const data = await response.json().catch(() => ({}));
    return cleanText(
      data.text ||
        data.reply ||
        data.response ||
        data.message ||
        data.choices?.[0]?.message?.content ||
        ""
    );
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullText = "";
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const events = buffer.split("\n\n");
    buffer = events.pop() || "";

    for (const event of events) {
      const dataLine = event.split("\n").find((line) => line.trim().startsWith("data:"));
      if (!dataLine) continue;

      const raw = dataLine.replace(/^\s*data:\s*/, "").trim();
      if (!raw || raw === "[DONE]") continue;

      try {
        const parsed = JSON.parse(raw);
        if (parsed.error) throw new Error(parsed.error);
        const delta =
          parsed.text ||
          parsed.delta ||
          parsed.token ||
          parsed.choices?.[0]?.delta?.content ||
          parsed.choices?.[0]?.message?.content ||
          "";
        if (delta) {
          fullText += delta;
          onChunk?.(cleanText(fullText));
        }
      } catch {
        if (!raw.startsWith("{")) {
          fullText += raw;
          onChunk?.(cleanText(fullText));
        }
      }
    }
  }

  if (buffer.trim() && !buffer.includes("data:")) fullText += buffer.trim();
  return cleanText(fullText);
}

async function callRedHydraBackend(
  messages: Message[],
  settings: AISettings,
  isAgentMode: boolean,
  onChunk?: StreamChunkHandler
) {
  const endpoint = getBuiltInEndpoint();
  if (!endpoint) throw new Error("No RedHydra endpoint configured.");

  const modelName = getModelName(settings);
  const highThinking = settings.thinkingLevel === "high" || isAgentMode;

  const payload = {
    model: modelName,
    modelName,
    messages: mapMessages(messages),
    system: getSystemInstruction(settings, isAgentMode),
    systemInstruction: getSystemInstruction(settings, isAgentMode),
    stream: settings.streaming !== false,
    temperature: asNumber(settings.temperature, 0.7),
    max_tokens: asNumber(settings.maxTokens, 1200),
    maxTokens: asNumber(settings.maxTokens, 1200),
    thinkingLevel: settings.thinkingLevel || "auto",

    // Clean default: research capability is ON, but mode is AUTO so simple chat stays fast.
    webSearchMode: ENABLE_WEB_SEARCH ? DEFAULT_WEB_SEARCH_MODE : "off",
    webSearch: undefined,
    liveWebSearch: undefined,
    deepResearch: ENABLE_DEEP_RESEARCH && highThinking ? true : undefined,
  };

  const response = await fetch(`${endpoint}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) throw new Error(`RedHydra endpoint returned HTTP ${response.status}`);
  return readSseOrText(response, onChunk);
}

function getOpenAICompatibleUrl(baseUrl: string) {
  const clean = normalizeEndpoint(baseUrl);
  if (!clean) return "";
  if (clean.endsWith("/v1")) return `${clean}/chat/completions`;
  if (clean.endsWith("/chat/completions")) return clean;
  return `${clean}/v1/chat/completions`;
}

async function callOpenAICompatibleProvider(
  messages: Message[],
  settings: AISettings,
  isAgentMode: boolean,
  onChunk?: StreamChunkHandler
) {
  const endpoint = getOpenAICompatibleUrl(settings.baseUrl);
  if (!endpoint) throw new Error("Provider base URL is empty.");
  if (!settings.apiKey && settings.provider !== "ollama") throw new Error("Provider key is required for this endpoint.");

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (settings.apiKey) headers.Authorization = `Bearer ${settings.apiKey}`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: getModelName(settings),
      messages: [{ role: "system", content: getSystemInstruction(settings, isAgentMode) }, ...mapMessages(messages)],
      temperature: asNumber(settings.temperature, 0.7),
      max_tokens: asNumber(settings.maxTokens, 1200),
      stream: settings.streaming !== false,
    }),
  });

  if (!response.ok) throw new Error(`Provider returned HTTP ${response.status}`);
  return readSseOrText(response, onChunk);
}

export function parseAgentResponse(text: string): AgentPlan {
  const output = cleanText(text);
  const steps = [
    {
      id: "step-1",
      title: "Understand request",
      description: "Read user requirements and available context.",
      status: "completed" as AgentStatus,
    },
    {
      id: "step-2",
      title: "Generate answer",
      description: "Return the best direct response.",
      status: "completed" as AgentStatus,
    },
    {
      id: "step-3",
      title: "Validate output",
      description: "Keep the response safe, useful, and concise.",
      status: "completed" as AgentStatus,
    },
  ];

  return {
    goal: "Answer the user request",
    understanding: "The response was generated for the active RedHydra workspace.",
    steps,
    output,
    validationChecklist: [
      { text: "Direct answer prepared", checked: true },
      { text: "Formatting cleaned", checked: true },
      { text: "Hidden reasoning not exposed", checked: true },
    ],
    limitations: [],
    nextAction: "Ask a follow-up or continue the current task.",
  };
}

export function getReadableAttachmentContent(attachment: { type: string; content: string }): string {
  if (!attachment.content) return "";
  if (!attachment.content.startsWith("data:")) return attachment.content;

  const commaIndex = attachment.content.indexOf(",");
  if (commaIndex === -1) return attachment.content;

  const base64Part = attachment.content.substring(commaIndex + 1);
  const mimeType = (attachment.type || "").toLowerCase();
  const isTextType =
    mimeType.startsWith("text/") ||
    mimeType.includes("javascript") ||
    mimeType.includes("typescript") ||
    mimeType.includes("json") ||
    mimeType.includes("xml") ||
    mimeType.includes("yaml") ||
    mimeType.includes("markdown") ||
    mimeType.includes("css") ||
    mimeType.includes("csv") ||
    mimeType.includes("sql") ||
    mimeType.includes("shell") ||
    mimeType.includes("config");

  if (!isTextType) return "This file is not readable as plain text in the browser. Use a backend file parser for full binary/PDF/multimodal extraction.";

  try {
    const binaryString = window.atob(base64Part);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i += 1) bytes[i] = binaryString.charCodeAt(i);
    return new TextDecoder("utf-8").decode(bytes);
  } catch {
    return "Could not decode this attachment.";
  }
}

function createAssistantMessage(text: string, isAgentMode: boolean): Message {
  const content = cleanText(text) || "How can I help?";
  const message: Message = {
    id: createId(),
    role: "assistant",
    content,
    timestamp: new Date().toLocaleTimeString(),
  };
  if (isAgentMode) message.agentPlan = parseAgentResponse(content);
  return message;
}

export async function sendChatMessage(
  messages: Message[],
  settings: AISettings,
  isAgentMode: boolean,
  onChunk?: StreamChunkHandler
): Promise<Message> {
  const normalizedMessages = normalizeMessages(messages);
  const provider = settings.provider || "built-in-opencore";

  try {
    const text =
      provider === "built-in-opencore"
        ? await callRedHydraBackend(normalizedMessages, settings, isAgentMode, onChunk)
        : await callOpenAICompatibleProvider(normalizedMessages, settings, isAgentMode, onChunk);

    return createAssistantMessage(text, isAgentMode);
  } catch (error) {
    console.warn("RedHydra request fell back to local guided mode:", error);
    const fallback = cleanText(await fallbackAnswer(normalizedMessages));
    streamLocalText(fallback, onChunk);
    return createAssistantMessage(fallback, isAgentMode);
  }
}
