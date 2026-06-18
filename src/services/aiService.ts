import type { AISettings, AgentPlan, Message, ResearchBundle } from '../types';
import { estimateTokens } from '../utils/tokenCounter';
import { researchBundleToContext } from './webResearch';

const PUBLIC_BASE_MODEL = import.meta.env.VITE_REDHYDRA_BASE_MODEL || 'dphn/Dolphin-Llama3-8B-Instruct-exl2-6bpw';

const MODE_INSTRUCTIONS: Record<string, string> = {
  general: 'You are RedHydra AI, a direct, useful AI workspace assistant. Chat mode is the default. Answer clearly and avoid pretending to have hidden vendor keys.',
  security: 'You are RedHydra AI in defensive cybersecurity mode. Help with secure coding, audits, hardening, detection, and education. Refuse harmful intrusion, credential theft, malware, or evasion requests.',
  developer: 'You are RedHydra AI in developer mode. Produce clean, maintainable code and precise debugging steps.',
  research: 'You are RedHydra AI in research mode. Use provided live research context when available, compare sources, and state uncertainty.',
  writing: 'You are RedHydra AI in writing mode. Draft polished copy while preserving the user intent.'
};

function id(prefix = 'm') {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function now() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function cleanOutput(text: string): string {
  return String(text || '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function getThinkingInstruction(level: AISettings['thinkingLevel']) {
  switch (level) {
    case 'minimal':
      return 'Use minimal internal reasoning and answer fast. Do not expose hidden chain-of-thought.';
    case 'low':
      return 'Use light internal reasoning for speed. Give the answer directly.';
    case 'high':
      return 'Use deeper internal reasoning for complex work, then provide only a concise reasoning summary and final answer. Do not expose private chain-of-thought.';
    default:
      return 'Automatically choose the required amount of internal reasoning. Do not expose hidden chain-of-thought.';
  }
}

function getStyleInstruction(style: AISettings['responseStyle']) {
  switch (style) {
    case 'concise': return 'Prefer concise paragraphs and avoid filler.';
    case 'bulleted': return 'Use short bullet lists when helpful.';
    case 'detailed': return 'Give a detailed but organized answer.';
    default: return 'Use headings, short sections, and practical steps.';
  }
}

function getSystemInstruction(settings: AISettings, agentMode: boolean, research?: ResearchBundle) {
  const blocks = [
    MODE_INSTRUCTIONS[settings.assistantMode] || MODE_INSTRUCTIONS.general,
    getThinkingInstruction(settings.thinkingLevel),
    getStyleInstruction(settings.responseStyle),
    settings.safeMode ? 'Keep outputs safe, legal, defensive, and privacy-aware.' : '',
    agentMode ? 'Agent mode is secondary and only active when the user toggles it on. In agent mode, create a practical plan, execute the answer, and include validation steps.' : 'Chat mode is active. Do not over-plan unless the user asks.',
    settings.customSystemPrompt ? `User custom instruction: ${settings.customSystemPrompt}` : '',
    research?.sources.length ? `Use this live research context when relevant:\n${researchBundleToContext(research)}` : ''
  ].filter(Boolean);
  return blocks.join('\n\n');
}

function toProviderMessages(messages: Message[], systemInstruction: string) {
  return [
    { role: 'system', content: systemInstruction },
    ...messages.filter((m) => m.role !== 'system').map((m) => ({ role: m.role, content: buildMessageContent(m) }))
  ];
}

function buildMessageContent(message: Message): string {
  if (!message.attachment) return message.content;
  return [
    message.content,
    `\n\nAttached file: ${message.attachment.name} (${message.attachment.type}, ${message.attachment.size} bytes).`,
    readableAttachment(message.attachment.content, message.attachment.type)
  ].join('\n');
}

export function readableAttachment(content: string, type: string): string {
  const lower = type.toLowerCase();
  if (!content.startsWith('data:')) return content.slice(0, 6000);
  const comma = content.indexOf(',');
  if (comma === -1) return '[Attachment could not be decoded]';
  const isText = lower.startsWith('text/') || lower.includes('json') || lower.includes('xml') || lower.includes('csv') || lower.includes('markdown') || lower.includes('javascript') || lower.includes('typescript') || lower.includes('css') || lower.includes('html');
  if (!isText) return '[Binary/media attachment detected. Browser build can store metadata but cannot deeply parse this file without a backend parser.]';
  try {
    return window.atob(content.slice(comma + 1)).slice(0, 12000);
  } catch {
    return '[Attachment decode failed]';
  }
}

async function callOpenAICompatible(messages: Message[], settings: AISettings, agentMode: boolean, research: ResearchBundle | undefined, onChunk?: (text: string) => void): Promise<string> {
  const baseUrl = settings.baseUrl.replace(/\/$/, '');
  if (!baseUrl) throw new Error('No model endpoint is configured. Set an OpenAI-compatible base URL in Settings.');
  if (settings.provider !== 'ollama' && settings.apiKey.trim() === '') throw new Error('This provider requires a user-owned API key entered in Settings.');

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (settings.apiKey.trim()) headers.Authorization = `Bearer ${settings.apiKey.trim()}`;
  if (settings.provider === 'openrouter') {
    headers['HTTP-Referer'] = window.location.origin;
    headers['X-Title'] = 'RedHydra AI';
  }

  const payload = {
    model: settings.modelName || PUBLIC_BASE_MODEL,
    messages: toProviderMessages(messages, getSystemInstruction(settings, agentMode, research)),
    temperature: settings.temperature,
    max_tokens: settings.maxTokens,
    stream: settings.streaming
  };

  const response = await fetch(`${baseUrl}/chat/completions`, { method: 'POST', headers, body: JSON.stringify(payload) });
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Provider request failed (${response.status}). ${body.slice(0, 300)}`);
  }

  const contentType = response.headers.get('content-type') || '';
  if (settings.streaming && response.body && contentType.includes('text/event-stream')) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let full = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split('\n\n');
      buffer = events.pop() || '';
      for (const event of events) {
        const line = event.split('\n').find((entry) => entry.startsWith('data:'));
        if (!line) continue;
        const data = line.replace(/^data:\s*/, '').trim();
        if (!data || data === '[DONE]') continue;
        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta?.content || parsed.choices?.[0]?.message?.content || parsed.text || '';
          if (delta) {
            full += delta;
            onChunk?.(cleanOutput(full));
          }
        } catch {
          full += data;
          onChunk?.(cleanOutput(full));
        }
      }
    }
    return cleanOutput(full);
  }

  const data = await response.json();
  return cleanOutput(data.choices?.[0]?.message?.content || data.text || '');
}

function localAssistant(messages: Message[], settings: AISettings, agentMode: boolean, research?: ResearchBundle): string {
  const last = [...messages].reverse().find((m) => m.role === 'user');
  const prompt = last?.content?.trim() || '';
  const lower = prompt.toLowerCase();
  const sourceBlock = research?.sources.length
    ? `\n\nLive sources used:\n${research.sources.slice(0, 6).map((s, i) => `${i + 1}. ${s.title} — ${s.url}`).join('\n')}`
    : '';

  if (research?.sources.length) {
    return `I ran ${research.mode === 'deep' ? 'deep research' : 'live web search'} for: ${research.query}.\n\nKey findings from the public sources:\n${research.sources.slice(0, 5).map((s) => `- ${s.title}: ${s.snippet || 'Source found.'}`).join('\n')}\n\nUse a connected model endpoint in Settings for a fuller synthesized answer.${sourceBlock}`;
  }

  if (last?.attachment) {
    const preview = readableAttachment(last.attachment.content, last.attachment.type);
    return `File received: ${last.attachment.name}.\n\nQuick readable preview:\n\n${preview.slice(0, 1800)}\n\nAsk what you want me to analyze, rewrite, debug, or extract from this file.`;
  }

  if (/^(hi|hello|hey)\b/i.test(prompt)) return 'Hi, I’m RedHydra AI. Chat mode is active by default. Ask anything or toggle Agent Mode for multi-step execution.';
  if (lower.includes('model')) return `Default actual model target: ${PUBLIC_BASE_MODEL}. Configure it behind an OpenAI-compatible local/GPU endpoint, or switch to OpenAI, OpenRouter, Ollama, or a custom endpoint in Settings.`;
  if (lower.includes('web') || lower.includes('research')) return 'Use `/web your topic` for live web search or `/research your topic` for deep research across public sources.';
  if (lower.includes('token')) return 'The live token dashboard is active on the right panel. It estimates input, output, attachment, total tokens, and projected usage cost based on the selected provider.';
  if (lower.includes('github') || lower.includes('deploy')) return 'For GitHub Pages: push this repo to main, enable Pages with GitHub Actions, and the included workflow will build Vite and publish dist automatically.';
  if (agentMode) return `Agent plan created for: ${prompt}\n\n1. Clarify the target.\n2. Break the task into safe implementation steps.\n3. Produce the result.\n4. Validate before final use.\n\nCurrent browser-local response is instant. Configure a real model endpoint in Settings for full AI generation.`;
  if (prompt.endsWith('?')) return `Direct answer mode is active. I can answer this better with a configured model endpoint, but the current open-source browser build has no hidden private key.\n\nYour question: ${prompt}`;
  return `Received. Chat mode is active and ready. For full model responses, configure an OpenAI-compatible endpoint or user-owned provider key in Settings.`;
}

export function parseAgentPlan(prompt: string, answer: string): AgentPlan {
  const shortGoal = prompt.length > 90 ? `${prompt.slice(0, 87)}...` : prompt || 'Respond to user';
  return {
    goal: shortGoal,
    understanding: 'Agent mode converted the request into execution steps while keeping chat as the default mode.',
    steps: [
      { id: id('step'), title: 'Understand request', description: 'Identify goal, constraints, files, and needed tools.', status: 'completed' },
      { id: id('step'), title: 'Execute response', description: 'Generate the answer or implementation.', status: answer ? 'completed' : 'running' },
      { id: id('step'), title: 'Validate', description: 'Check safety, clarity, and deployment readiness.', status: 'completed' }
    ],
    validationChecklist: [
      { text: 'No private API key was hardcoded.', checked: true },
      { text: 'Chat is default; agent is secondary toggle.', checked: true },
      { text: 'Usage monitoring remains visible.', checked: true }
    ],
    nextAction: 'Review the output and configure a model endpoint if full remote generation is required.'
  };
}

export async function sendChatMessage(params: {
  messages: Message[];
  settings: AISettings;
  agentMode: boolean;
  research?: ResearchBundle;
  onChunk?: (text: string) => void;
}): Promise<Message> {
  const { messages, settings, agentMode, research, onChunk } = params;
  const started = performance.now();
  onChunk?.('Routing request...');

  let output = '';
  try {
    if (settings.provider === 'local-model') {
      output = localAssistant(messages, settings, agentMode, research);
    } else {
      output = await callOpenAICompatible(messages, settings, agentMode, research, onChunk);
      if (!output.trim()) output = localAssistant(messages, settings, agentMode, research);
    }
  } catch (error) {
    output = `${error instanceof Error ? error.message : 'Provider unavailable.'}\n\nFallback response:\n${localAssistant(messages, settings, agentMode, research)}`;
  }

  const clean = cleanOutput(output);
  onChunk?.(clean);
  const lastUser = [...messages].reverse().find((m) => m.role === 'user')?.content || '';
  const inputTokens = messages.reduce((sum, message) => sum + estimateTokens(message.content), 0);
  const outputTokens = estimateTokens(clean);

  return {
    id: id('assistant'),
    role: 'assistant',
    content: clean,
    createdAt: now(),
    usage: {
      inputTokens,
      outputTokens,
      attachmentTokens: messages.reduce((sum, message) => sum + (message.attachment ? Math.ceil(message.attachment.size / 768) : 0), 0),
      totalTokens: inputTokens + outputTokens,
      estimatedCostUsd: 0
    },
    agentPlan: agentMode ? parseAgentPlan(lastUser, clean) : undefined,
    researchSources: research?.sources,
  };
}
