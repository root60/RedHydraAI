export type Role = 'system' | 'user' | 'assistant';

export type ProviderType =
  | 'opencore-local'
  | 'openai'
  | 'openrouter'
  | 'ollama'
  | 'custom-openai-compatible';

export type ThinkingLevel = 'minimal' | 'low' | 'auto' | 'high';
export type ResponseStyle = 'concise' | 'structured' | 'detailed' | 'bulleted';
export type AssistantMode = 'general' | 'security' | 'developer' | 'research' | 'writing';

export interface AttachmentPayload {
  name: string;
  type: string;
  size: number;
  content: string;
}

export interface AgentStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
}

export interface AgentPlan {
  goal: string;
  understanding: string;
  steps: AgentStep[];
  validationChecklist: Array<{ text: string; checked: boolean }>;
  nextAction: string;
}

export interface Message {
  id: string;
  role: Role;
  content: string;
  createdAt: string;
  attachment?: AttachmentPayload;
  usage?: TokenUsage;
  agentPlan?: AgentPlan;
  researchSources?: ResearchSource[];
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  pinned: boolean;
  mode: AssistantMode;
  messages: Message[];
}

export interface AISettings {
  provider: ProviderType;
  modelName: string;
  baseUrl: string;
  apiKey: string;
  temperature: number;
  maxTokens: number;
  streaming: boolean;
  thinkingLevel: ThinkingLevel;
  responseStyle: ResponseStyle;
  assistantMode: AssistantMode;
  safeMode: boolean;
  customSystemPrompt: string;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  attachmentTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
}

export interface ResearchSource {
  title: string;
  url: string;
  snippet: string;
  source: 'Wikipedia' | 'DuckDuckGo' | 'Crossref' | 'HackerNews' | 'Local';
  published?: string;
}

export interface ResearchBundle {
  query: string;
  mode: 'web' | 'deep';
  sources: ResearchSource[];
  summary: string;
}
