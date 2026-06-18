import React, { useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import type { AISettings, AssistantMode, AttachmentPayload, ChatSession, Message, ProviderType, ResearchBundle, ResponseStyle, ThinkingLevel } from './types';
import { sendChatMessage } from './services/aiService';
import { runWebResearch, shouldRunWebResearch } from './services/webResearch';
import { estimateAttachmentTokens, getLastMessagesTokenData, getRealtimeUsage } from './utils/tokenCounter';

const APP_NAME = import.meta.env.VITE_APP_NAME || 'RedHydra OpenCore';
const DEFAULT_MODEL = import.meta.env.VITE_REDHYDRA_BASE_MODEL || 'dphn/Dolphin-Llama3-8B-Instruct-exl2-6bpw';

const defaultSettings: AISettings = {
  provider: 'opencore-local',
  modelName: DEFAULT_MODEL,
  baseUrl: '',
  apiKey: '',
  temperature: 0.7,
  maxTokens: 2048,
  streaming: true,
  thinkingLevel: 'auto',
  responseStyle: 'structured',
  assistantMode: 'general',
  safeMode: true,
  customSystemPrompt: ''
};

function createMessage(role: Message['role'], content: string, attachment?: AttachmentPayload): Message {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    role,
    content,
    createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    attachment
  };
}

function createChat(): ChatSession {
  return {
    id: `chat-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title: 'New Chat',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    pinned: false,
    mode: 'general',
    messages: [
      createMessage('assistant', `### Welcome to **${APP_NAME}**\n\nChat mode is the default. Agent Mode is secondary and stays off until you toggle it.\n\n- Default model target: \`${DEFAULT_MODEL}\`\n- Old vendor traces removed from UI and runtime code\n- Token dashboard and live usage monitor are active\n- Use \`/web topic\` for live web search\n- Use \`/research topic\` for deep research across public sources\n\nConfigure a local/GPU OpenAI-compatible endpoint, OpenRouter, OpenAI, Ollama, or a custom endpoint in **Settings** for full model generation.`)
    ]
  };
}

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}

function ProviderSettings({ settings, onChange }: { settings: AISettings; onChange: (next: AISettings) => void }) {
  const applyProvider = (provider: ProviderType) => {
    const presets: Record<ProviderType, Partial<AISettings>> = {
      'opencore-local': { provider, modelName: DEFAULT_MODEL, baseUrl: '', apiKey: '' },
      openai: { provider, modelName: 'gpt-4o-mini', baseUrl: 'https://api.openai.com/v1' },
      openrouter: { provider, modelName: 'meta-llama/llama-3.3-70b-instruct', baseUrl: 'https://openrouter.ai/api/v1' },
      ollama: { provider, modelName: 'llama3.1', baseUrl: 'http://localhost:11434/v1', apiKey: '' },
      'custom-openai-compatible': { provider, modelName: settings.modelName || DEFAULT_MODEL, baseUrl: settings.baseUrl || 'https://your-endpoint.example/v1' }
    };
    onChange({ ...settings, ...presets[provider] });
  };

  const modelPresets: Array<{ label: string; model: string; provider: ProviderType; baseUrl?: string; note: string }> = [
    { label: 'Actual Loaded Local/GPU', model: DEFAULT_MODEL, provider: 'opencore-local', note: 'Default target' },
    { label: 'GPT-4o mini', model: 'gpt-4o-mini', provider: 'openai', baseUrl: 'https://api.openai.com/v1', note: 'Fast cloud' },
    { label: 'GPT-4o', model: 'gpt-4o', provider: 'openai', baseUrl: 'https://api.openai.com/v1', note: 'Stronger cloud' },
    { label: 'DeepSeek R1', model: 'deepseek/deepseek-r1', provider: 'openrouter', baseUrl: 'https://openrouter.ai/api/v1', note: 'Reasoning' },
    { label: 'Llama 3.3 70B', model: 'meta-llama/llama-3.3-70b-instruct', provider: 'openrouter', baseUrl: 'https://openrouter.ai/api/v1', note: 'Open model' },
    { label: 'Qwen Reasoning', model: 'qwen/qwen-2.5-72b-instruct', provider: 'openrouter', baseUrl: 'https://openrouter.ai/api/v1', note: 'Multilingual' },
    { label: 'Ollama Llama', model: 'llama3.1', provider: 'ollama', baseUrl: 'http://localhost:11434/v1', note: 'Local' }
  ];

  return (
    <section className="panel stack">
      <div className="section-title">Model settings</div>
      <label>
        Provider
        <select value={settings.provider} onChange={(event) => applyProvider(event.target.value as ProviderType)}>
          <option value="opencore-local">OpenCore local fallback</option>
          <option value="openai">OpenAI</option>
          <option value="openrouter">OpenRouter</option>
          <option value="ollama">Ollama / local OpenAI-compatible</option>
          <option value="custom-openai-compatible">Custom OpenAI-compatible</option>
        </select>
      </label>
      <label>
        Model identifier
        <input value={settings.modelName} onChange={(event) => onChange({ ...settings, modelName: event.target.value })} />
      </label>
      <label>
        Base URL
        <input value={settings.baseUrl} onChange={(event) => onChange({ ...settings, baseUrl: event.target.value })} placeholder="https://api.openai.com/v1" />
      </label>
      <label>
        User-owned API token
        <input value={settings.apiKey} onChange={(event) => onChange({ ...settings, apiKey: event.target.value })} placeholder="Do not commit keys. Saved only in this browser." type="password" />
      </label>
      <div className="notice">This repo contains a real safe .env with public values only. Browser-entered keys stay in localStorage and are not committed.</div>
      <div className="preset-grid">
        {modelPresets.map((preset) => (
          <button
            key={`${preset.provider}-${preset.model}`}
            className={settings.modelName === preset.model ? 'preset active' : 'preset'}
            onClick={() => onChange({ ...settings, provider: preset.provider, modelName: preset.model, baseUrl: preset.baseUrl ?? '', apiKey: preset.provider === 'ollama' || preset.provider === 'opencore-local' ? '' : settings.apiKey })}
          >
            <strong>{preset.label}</strong>
            <span>{preset.model}</span>
            <em>{preset.note}</em>
          </button>
        ))}
      </div>
      <div className="split">
        <label>
          Thinking capability
          <select value={settings.thinkingLevel} onChange={(event) => onChange({ ...settings, thinkingLevel: event.target.value as ThinkingLevel })}>
            <option value="minimal">Minimal / instant</option>
            <option value="low">Low latency</option>
            <option value="auto">Auto</option>
            <option value="high">High reasoning</option>
          </select>
        </label>
        <label>
          Response style
          <select value={settings.responseStyle} onChange={(event) => onChange({ ...settings, responseStyle: event.target.value as ResponseStyle })}>
            <option value="structured">Structured</option>
            <option value="concise">Concise</option>
            <option value="detailed">Detailed</option>
            <option value="bulleted">Bulleted</option>
          </select>
        </label>
      </div>
      <div className="split">
        <label>
          Temperature {settings.temperature.toFixed(1)}
          <input type="range" min="0" max="1.5" step="0.1" value={settings.temperature} onChange={(event) => onChange({ ...settings, temperature: Number(event.target.value) })} />
        </label>
        <label>
          Max tokens
          <input type="number" min="128" max="32768" value={settings.maxTokens} onChange={(event) => onChange({ ...settings, maxTokens: Number(event.target.value) || 2048 })} />
        </label>
      </div>
      <label className="check"><input type="checkbox" checked={settings.streaming} onChange={(event) => onChange({ ...settings, streaming: event.target.checked })} /> Streaming / instant partial response</label>
      <label className="check"><input type="checkbox" checked={settings.safeMode} onChange={(event) => onChange({ ...settings, safeMode: event.target.checked })} /> Defensive safety mode</label>
      <label>
        Custom system prompt
        <textarea value={settings.customSystemPrompt} onChange={(event) => onChange({ ...settings, customSystemPrompt: event.target.value })} placeholder="Optional persistent instruction" />
      </label>
    </section>
  );
}

function UsageDashboard({ input, messages, provider, selectedFile }: { input: string; messages: Message[]; provider: string; selectedFile: AttachmentPayload | null }) {
  const attachmentTokens = selectedFile ? estimateAttachmentTokens(selectedFile.type, selectedFile.content, selectedFile.size) : 0;
  const usage = getRealtimeUsage(input, messages, provider, attachmentTokens);
  const bars = getLastMessagesTokenData(messages);
  const max = Math.max(1, ...bars.map((item) => item.total));

  return (
    <section className="panel stack usage-panel">
      <div className="section-title">Live usage monitor</div>
      <div className="metric-grid">
        <div><span>Input</span><strong>{usage.inputTokens.toLocaleString()}</strong></div>
        <div><span>Output</span><strong>{usage.outputTokens.toLocaleString()}</strong></div>
        <div><span>File</span><strong>{usage.attachmentTokens.toLocaleString()}</strong></div>
        <div><span>Total</span><strong>{usage.totalTokens.toLocaleString()}</strong></div>
      </div>
      <div className="cost">Estimated cost: ${usage.estimatedCostUsd.toFixed(6)}</div>
      <div className="bar-chart" aria-label="Last message token chart">
        {bars.length === 0 ? <span className="muted">No usage data yet.</span> : bars.map((bar) => (
          <div className="bar-row" key={bar.index} title={`${bar.role}: ${bar.total} tokens`}>
            <span>{bar.role[0].toUpperCase()}</span>
            <div><i style={{ width: `${Math.max(5, (bar.total / max) * 100)}%` }} /></div>
            <b>{bar.total}</b>
          </div>
        ))}
      </div>
    </section>
  );
}

function AgentPanel({ messages }: { messages: Message[] }) {
  const plan = [...messages].reverse().find((message) => message.agentPlan)?.agentPlan;
  return (
    <section className="panel stack">
      <div className="section-title">Agent mode telemetry</div>
      {!plan ? (
        <div className="notice">Agent Mode is secondary. Toggle it in the composer when you need planning and step tracking.</div>
      ) : (
        <>
          <div className="agent-goal"><strong>Goal</strong><p>{plan.goal}</p></div>
          <div className="agent-goal"><strong>Understanding</strong><p>{plan.understanding}</p></div>
          <div className="steps">
            {plan.steps.map((step) => <div className={`step ${step.status}`} key={step.id}><b>{step.title}</b><span>{step.description}</span></div>)}
          </div>
          <div className="checklist">
            {plan.validationChecklist.map((item) => <label key={item.text}><input type="checkbox" readOnly checked={item.checked} /> {item.text}</label>)}
          </div>
          <div className="notice">Next: {plan.nextAction}</div>
        </>
      )}
    </section>
  );
}

function ResearchPanel({ bundle, onRun }: { bundle: ResearchBundle | null; onRun: (query: string, mode: 'web' | 'deep') => void }) {
  const [query, setQuery] = useState('');
  return (
    <section className="panel stack">
      <div className="section-title">Live web search & deep research</div>
      <div className="research-tools">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search public sources" />
        <button onClick={() => query.trim() && onRun(query.trim(), 'web')}>Web</button>
        <button onClick={() => query.trim() && onRun(query.trim(), 'deep')}>Deep</button>
      </div>
      <div className="notice">Commands: <code>/web topic</code> or <code>/research topic</code></div>
      {bundle && (
        <div className="sources">
          <strong>{bundle.summary}</strong>
          {bundle.sources.map((source) => (
            <a key={source.url} href={source.url} target="_blank" rel="noreferrer">
              <span>{source.source}</span>
              <b>{source.title}</b>
              <small>{source.snippet}</small>
            </a>
          ))}
        </div>
      )}
    </section>
  );
}

function ChatList({ chats, activeChatId, onSelect, onNew, onDelete }: { chats: ChatSession[]; activeChatId: string; onSelect: (id: string) => void; onNew: () => void; onDelete: (id: string) => void }) {
  return (
    <aside className="sidebar">
      <div className="brand"><span>RH</span><div><strong>{APP_NAME}</strong><small>Open-source AI workspace</small></div></div>
      <button className="new-chat" onClick={onNew}>+ New chat</button>
      <div className="chat-list">
        {chats.map((chat) => (
          <button className={chat.id === activeChatId ? 'chat-item active' : 'chat-item'} key={chat.id} onClick={() => onSelect(chat.id)}>
            <span>{chat.title}</span>
            <small>{chat.messages.length} messages</small>
            <i onClick={(event) => { event.stopPropagation(); onDelete(chat.id); }}>×</i>
          </button>
        ))}
      </div>
    </aside>
  );
}

function MessageView({ message }: { message: Message }) {
  return (
    <article className={`message ${message.role}`}>
      <div className="avatar">{message.role === 'user' ? 'U' : message.role === 'assistant' ? 'AI' : 'S'}</div>
      <div className="bubble">
        <div className="message-meta"><strong>{message.role}</strong><span>{message.createdAt}</span></div>
        {message.attachment && <div className="attachment">📎 {message.attachment.name} · {(message.attachment.size / 1024).toFixed(1)} KB</div>}
        <ReactMarkdown>{message.content}</ReactMarkdown>
        {message.researchSources?.length ? (
          <div className="message-sources">
            {message.researchSources.slice(0, 6).map((source, index) => <a key={source.url} href={source.url} target="_blank" rel="noreferrer">[{index + 1}] {source.title}</a>)}
          </div>
        ) : null}
      </div>
    </article>
  );
}

export default function App() {
  const [settings, setSettings] = useState<AISettings>(() => loadJson('redhydra.settings', defaultSettings));
  const [chats, setChats] = useState<ChatSession[]>(() => {
    try {
      const saved = localStorage.getItem('redhydra.chats');
      const parsed = saved ? JSON.parse(saved) as ChatSession[] : [];
      return parsed.length ? parsed : [createChat()];
    } catch {
      return [createChat()];
    }
  });
  const [activeChatId, setActiveChatId] = useState(() => chats[0]?.id || '');
  const [input, setInput] = useState('');
  const [selectedFile, setSelectedFile] = useState<AttachmentPayload | null>(null);
  const [agentMode, setAgentMode] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [activeTab, setActiveTab] = useState<'usage' | 'agent' | 'research' | 'settings'>('usage');
  const [lastResearch, setLastResearch] = useState<ResearchBundle | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const activeChat = useMemo(() => chats.find((chat) => chat.id === activeChatId) || chats[0], [chats, activeChatId]);

  useEffect(() => localStorage.setItem('redhydra.settings', JSON.stringify(settings)), [settings]);
  useEffect(() => localStorage.setItem('redhydra.chats', JSON.stringify(chats)), [chats]);
  useEffect(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), [activeChat?.messages, streamingText]);

  const updateActiveChat = (updater: (chat: ChatSession) => ChatSession) => {
    setChats((prev) => prev.map((chat) => chat.id === activeChat.id ? updater(chat) : chat));
  };

  const newChat = () => {
    const chat = createChat();
    setChats((prev) => [chat, ...prev]);
    setActiveChatId(chat.id);
    setAgentMode(false);
    setActiveTab('usage');
  };

  const deleteChat = (id: string) => {
    const next = chats.filter((chat) => chat.id !== id);
    if (!next.length) {
      const chat = createChat();
      setChats([chat]);
      setActiveChatId(chat.id);
      return;
    }
    setChats(next);
    if (activeChatId === id) setActiveChatId(next[0].id);
  };

  const onFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      setSelectedFile({ name: file.name, type: file.type || 'application/octet-stream', size: file.size, content: String(reader.result || '') });
    };
    reader.readAsDataURL(file);
  };

  const runResearchFromPanel = async (query: string, mode: 'web' | 'deep') => {
    setActiveTab('research');
    const bundle = await runWebResearch(query, mode);
    setLastResearch(bundle);
  };

  const send = async () => {
    const text = input.trim();
    if (!text || isGenerating || !activeChat) return;
    const userMessage = createMessage('user', text, selectedFile || undefined);
    const updatedMessages = [...activeChat.messages, userMessage];
    updateActiveChat((chat) => ({
      ...chat,
      title: chat.title === 'New Chat' ? text.slice(0, 44) || 'New Chat' : chat.title,
      updatedAt: new Date().toISOString(),
      mode: settings.assistantMode,
      messages: updatedMessages
    }));
    setInput('');
    setSelectedFile(null);
    setIsGenerating(true);
    setStreamingText('');

    let research: ResearchBundle | undefined;
    try {
      const researchDecision = shouldRunWebResearch(text);
      if (researchDecision.run && import.meta.env.VITE_ENABLE_WEB_RESEARCH !== 'false') {
        setStreamingText(`Running ${researchDecision.deep ? 'deep research' : 'web search'}...`);
        research = await runWebResearch(researchDecision.query, researchDecision.deep ? 'deep' : 'web');
        setLastResearch(research);
      }

      const response = await sendChatMessage({
        messages: updatedMessages,
        settings,
        agentMode,
        research,
        onChunk: (chunk) => setStreamingText(chunk)
      });
      updateActiveChat((chat) => ({ ...chat, updatedAt: new Date().toISOString(), messages: [...chat.messages, response] }));
    } finally {
      setIsGenerating(false);
      setStreamingText('');
    }
  };

  const exportChat = () => {
    const md = [`# ${activeChat.title}`, '', `Provider: ${settings.provider}`, `Model: ${settings.modelName}`, ''];
    activeChat.messages.forEach((message) => md.push(`## ${message.role} — ${message.createdAt}\n\n${message.content}\n`));
    const blob = new Blob([md.join('\n')], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `redhydra-chat-${activeChat.id}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearLocal = () => {
    localStorage.removeItem('redhydra.settings');
    localStorage.removeItem('redhydra.chats');
    const chat = createChat();
    setSettings(defaultSettings);
    setChats([chat]);
    setActiveChatId(chat.id);
    setAgentMode(false);
  };

  return (
    <div className="app-shell">
      <ChatList chats={chats} activeChatId={activeChat.id} onSelect={setActiveChatId} onNew={newChat} onDelete={deleteChat} />
      <main className="workspace">
        <header className="topbar">
          <div>
            <h1>{activeChat.title}</h1>
            <p>Chat default · Agent secondary · Model: <code>{settings.modelName}</code></p>
          </div>
          <div className="top-actions">
            <button onClick={exportChat}>Export</button>
            <button onClick={clearLocal}>Reset local</button>
          </div>
        </header>
        <section className="messages">
          {activeChat.messages.map((message) => <MessageView key={message.id} message={message} />)}
          {isGenerating && <article className="message assistant"><div className="avatar">AI</div><div className="bubble streaming"><div className="message-meta"><strong>assistant</strong><span>streaming</span></div><ReactMarkdown>{streamingText || 'Thinking...'}</ReactMarkdown></div></article>}
          <div ref={bottomRef} />
        </section>
        <footer className="composer">
          {selectedFile && <div className="selected-file"><span>📎 {selectedFile.name}</span><button onClick={() => setSelectedFile(null)}>remove</button></div>}
          <textarea value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void send(); } }} placeholder="Ask RedHydra. Try /web AI security news or /research open-source LLM inference." />
          <div className="composer-actions">
            <input ref={fileRef} type="file" hidden onChange={(event) => event.target.files?.[0] && onFile(event.target.files[0])} />
            <button onClick={() => fileRef.current?.click()}>Attach</button>
            <label className="agent-toggle"><input type="checkbox" checked={agentMode} onChange={(event) => setAgentMode(event.target.checked)} /> Agent Mode</label>
            <button className="send" disabled={isGenerating || !input.trim()} onClick={() => void send()}>{isGenerating ? 'Running' : 'Send'}</button>
          </div>
        </footer>
      </main>
      <aside className="rightbar">
        <nav className="tabs">
          <button className={activeTab === 'usage' ? 'active' : ''} onClick={() => setActiveTab('usage')}>Usage</button>
          <button className={activeTab === 'agent' ? 'active' : ''} onClick={() => setActiveTab('agent')}>Agent</button>
          <button className={activeTab === 'research' ? 'active' : ''} onClick={() => setActiveTab('research')}>Research</button>
          <button className={activeTab === 'settings' ? 'active' : ''} onClick={() => setActiveTab('settings')}>Settings</button>
        </nav>
        {activeTab === 'usage' && <UsageDashboard input={input} messages={activeChat.messages} provider={settings.provider} selectedFile={selectedFile} />}
        {activeTab === 'agent' && <AgentPanel messages={activeChat.messages} />}
        {activeTab === 'research' && <ResearchPanel bundle={lastResearch} onRun={runResearchFromPanel} />}
        {activeTab === 'settings' && <ProviderSettings settings={settings} onChange={setSettings} />}
      </aside>
    </div>
  );
}
