import type { Message, TokenUsage } from '../types';

const MODEL_PRICING_PER_1K: Record<string, { input: number; output: number }> = {
  'gpt-4o': { input: 0.005, output: 0.015 },
  'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
  'openrouter': { input: 0.001, output: 0.001 },
  'local-model': { input: 0, output: 0 },
  'ollama': { input: 0, output: 0 },
  'custom-openai-compatible': { input: 0, output: 0 }
};

export function estimateTokens(text = ''): number {
  const normalized = String(text).trim();
  if (!normalized) return 0;
  const wordish = normalized.split(/\s+/).length;
  const charEstimate = Math.ceil(normalized.length / 4);
  return Math.max(wordish, charEstimate);
}

export function estimateAttachmentTokens(type: string, content: string, size = 0): number {
  const lower = (type || '').toLowerCase();
  if (lower.startsWith('text/') || lower.includes('json') || lower.includes('markdown') || lower.includes('csv')) {
    return estimateTokens(decodeReadableDataUrl(content));
  }
  return Math.ceil(size / 768);
}

export function decodeReadableDataUrl(content: string): string {
  if (!content.startsWith('data:')) return content;
  const comma = content.indexOf(',');
  if (comma === -1) return '';
  try {
    return decodeURIComponent(escape(window.atob(content.slice(comma + 1))));
  } catch {
    try {
      return window.atob(content.slice(comma + 1));
    } catch {
      return '';
    }
  }
}

export function getMessageUsage(message: Message): TokenUsage {
  const textTokens = estimateTokens(message.content);
  const attachmentTokens = message.attachment
    ? estimateAttachmentTokens(message.attachment.type, message.attachment.content, message.attachment.size)
    : 0;
  const inputTokens = message.role === 'user' ? textTokens : 0;
  const outputTokens = message.role === 'assistant' ? textTokens : 0;
  return {
    inputTokens,
    outputTokens,
    attachmentTokens,
    totalTokens: textTokens + attachmentTokens,
    estimatedCostUsd: 0
  };
}

export function getRealtimeUsage(input: string, messages: Message[], provider: string, attachmentTokens = 0): TokenUsage {
  const inputTokens = estimateTokens(input) + messages.reduce((sum, msg) => sum + (msg.role === 'user' ? estimateTokens(msg.content) : 0), 0);
  const outputTokens = messages.reduce((sum, msg) => sum + (msg.role === 'assistant' ? estimateTokens(msg.content) : 0), 0);
  const pricing = MODEL_PRICING_PER_1K[provider] || MODEL_PRICING_PER_1K['custom-openai-compatible'];
  const estimatedCostUsd = Number((((inputTokens + attachmentTokens) / 1000) * pricing.input + (outputTokens / 1000) * pricing.output).toFixed(6));
  return {
    inputTokens,
    outputTokens,
    attachmentTokens,
    totalTokens: inputTokens + outputTokens + attachmentTokens,
    estimatedCostUsd
  };
}

export function getLastMessagesTokenData(messages: Message[], limit = 10) {
  return messages.slice(-limit).map((msg, index) => {
    const usage = getMessageUsage(msg);
    return {
      index: index + 1,
      role: msg.role,
      text: estimateTokens(msg.content),
      attachment: usage.attachmentTokens,
      total: usage.totalTokens
    };
  });
}
