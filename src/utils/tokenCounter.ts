/**
 * Lightweight token estimation utilities.
 * Keeps the existing token usage dashboard/live monitor working without adding heavy dependencies.
 */

export function estimateTokens(text: string): number {
  const value = String(text || "").trim();
  if (!value) return 0;

  const words = value.split(/\s+/).filter(Boolean).length;
  const chars = value.length;
  const punctuation = (value.match(/[.,!?;:(){}[\]"'`~@#$%^&*_+=|\\<>/\-]/g) || []).length;

  return Math.max(1, Math.ceil(words * 1.25 + chars / 18 + punctuation * 0.15));
}

export function estimateMessageTokens(messages: Array<{ content?: string }>): number {
  return messages.reduce((total, message) => total + estimateTokens(message.content || "") + 4, 0);
}

export function formatTokenCount(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(Math.max(0, Math.round(value)));
}
