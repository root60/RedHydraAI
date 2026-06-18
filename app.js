(() => {
  'use strict';

  const APP_NAME = 'RedHydra AI';
  const DEFAULT_MODEL = 'dphn/Dolphin-Llama3-8B-Instruct-exl2-6bpw';
  const WEB_RESEARCH_ENABLED = true;

  const defaultSettings = {
    provider: 'local-model',
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

  let settings = loadJson('redhydra.settings', defaultSettings);
  let chats = loadJson('redhydra.chats', []);
  if (!Array.isArray(chats) || chats.length === 0) chats = [createChat()];
  let activeChatId = chats[0].id;
  let input = '';
  let selectedFile = null;
  let agentMode = false;
  let activeTab = 'usage';
  let isGenerating = false;
  let streamingText = '';
  let lastResearch = null;

  const app = document.getElementById('app');

  function now() {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  function uid(prefix) {
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function loadJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
    } catch {
      return fallback;
    }
  }

  function save() {
    localStorage.setItem('redhydra.settings', JSON.stringify(settings));
    localStorage.setItem('redhydra.chats', JSON.stringify(chats));
  }

  function createMessage(role, content, attachment) {
    return { id: uid(role), role, content, createdAt: now(), attachment };
  }

  function createChat() {
    return {
      id: uid('chat'),
      title: 'New Chat',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      mode: 'general',
      messages: [createMessage('assistant', `### Welcome to **${APP_NAME}**\n\nChat mode is the default. Agent Mode is secondary and stays off until you toggle it.\n\n- Default model target: \`${DEFAULT_MODEL}\`\n- Old provider traces removed from UI and runtime code\n- Token dashboard and live usage monitor are active\n- Use \`/web topic\` for live web search\n- Use \`/research topic\` for deep research\n\nConfigure OpenRouter, Ollama/local, OpenAI-compatible, or a custom endpoint in **Settings** for full model generation.`)]
    };
  }

  function activeChat() {
    return chats.find((chat) => chat.id === activeChatId) || chats[0];
  }

  function updateActiveChat(updater) {
    const id = activeChat().id;
    chats = chats.map((chat) => chat.id === id ? updater(chat) : chat);
    save();
    render();
  }

  function estimateTokens(text) {
    const value = String(text || '').trim();
    if (!value) return 0;
    const cjk = (value.match(/[\u3400-\u9fff]/g) || []).length;
    const words = value.replace(/[\u3400-\u9fff]/g, ' ').split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.ceil(words * 1.33 + cjk * 1.1));
  }

  function estimateAttachmentTokens(file) {
    if (!file) return 0;
    return Math.ceil((file.content || '').length / 4) + Math.ceil((file.size || 0) / 768);
  }

  function getUsage() {
    const chat = activeChat();
    const inputTokens = estimateTokens(input);
    const outputTokens = chat.messages.filter((m) => m.role === 'assistant').reduce((sum, m) => sum + estimateTokens(m.content), 0);
    const historyTokens = chat.messages.reduce((sum, m) => sum + estimateTokens(m.content), 0);
    const attachmentTokens = estimateAttachmentTokens(selectedFile);
    const totalTokens = inputTokens + outputTokens + historyTokens + attachmentTokens;
    const costPer1K = settings.provider === 'openai' ? 0.0006 : settings.provider === 'openrouter' ? 0.0003 : 0;
    return { inputTokens, outputTokens, historyTokens, attachmentTokens, totalTokens, estimatedCostUsd: totalTokens / 1000 * costPer1K };
  }

  function htmlEscape(value) {
    return String(value || '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[ch]));
  }

  function markdownLite(md) {
    let text = htmlEscape(md || '');
    text = text.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
    text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
    text = text.replace(/^### (.*)$/gm, '<h3>$1</h3>');
    text = text.replace(/^## (.*)$/gm, '<h2>$1</h2>');
    text = text.replace(/^# (.*)$/gm, '<h1>$1</h1>');
    text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
    const lines = text.split('\n');
    let out = '';
    let inList = false;
    for (const line of lines) {
      if (/^\s*-\s+/.test(line)) {
        if (!inList) { out += '<ul>'; inList = true; }
        out += `<li>${line.replace(/^\s*-\s+/, '')}</li>`;
      } else {
        if (inList) { out += '</ul>'; inList = false; }
        if (line.trim()) out += line.startsWith('<h') || line.startsWith('<pre') ? line : `<p>${line}</p>`;
      }
    }
    if (inList) out += '</ul>';
    return out;
  }

  function render() {
    const chat = activeChat();
    const usage = getUsage();
    const bars = chat.messages.slice(-8).map((m, index) => ({ index: index + 1, role: m.role, total: estimateTokens(m.content) }));
    const maxBar = Math.max(1, ...bars.map((b) => b.total));
    app.innerHTML = `
      <div class="app-shell">
        <aside class="sidebar">
          <div class="brand"><div class="brand-badge">RH</div><div><strong>${APP_NAME}</strong><small>Open-source AI workspace</small></div></div>
          <button class="new-chat" data-action="new-chat">+ New chat</button>
          <div class="chat-list">
            ${chats.map((item) => `
              <button class="chat-item ${item.id === chat.id ? 'active' : ''}" data-chat-id="${item.id}">
                <span>${htmlEscape(item.title)}</span><small>${item.messages.length} messages</small><i data-delete-chat="${item.id}">×</i>
              </button>
            `).join('')}
          </div>
        </aside>

        <main class="workspace">
          <header class="topbar">
            <div><h1>${htmlEscape(chat.title)}</h1><p>Chat default · Agent secondary · Model: <code>${htmlEscape(settings.modelName)}</code></p></div>
            <div class="top-actions"><button data-action="export-chat">Export</button><button data-action="reset-local">Reset local</button></div>
          </header>

          <section class="messages" id="messages">
            ${chat.messages.map(renderMessage).join('')}
            ${isGenerating ? renderStreaming() : ''}
            <div id="bottom"></div>
          </section>

          <footer class="composer">
            ${selectedFile ? `<div class="selected-file"><span>📎 ${htmlEscape(selectedFile.name)} · ${(selectedFile.size / 1024).toFixed(1)} KB</span><button data-action="remove-file">remove</button></div>` : ''}
            <textarea id="prompt-input" placeholder="Ask RedHydra. Try /web AI security news or /research open-source LLM inference." ${isGenerating ? 'disabled' : ''}>${htmlEscape(input)}</textarea>
            <div class="composer-actions">
              <div class="composer-left"><input id="file-input" type="file" hidden /><button data-action="attach-file">Attach</button><label class="agent-toggle"><input id="agent-mode" type="checkbox" ${agentMode ? 'checked' : ''}/> Agent Mode</label></div>
              <div class="composer-right"><button class="send" data-action="send" ${isGenerating || !input.trim() ? 'disabled' : ''}>${isGenerating ? 'Running' : 'Send'}</button></div>
            </div>
          </footer>
        </main>

        <aside class="rightbar">
          <nav class="tabs">
            ${['usage','agent','research','settings'].map((tab) => `<button class="${activeTab === tab ? 'active' : ''}" data-tab="${tab}">${tab[0].toUpperCase() + tab.slice(1)}</button>`).join('')}
          </nav>
          ${renderPanel(usage, bars, maxBar)}
        </aside>
      </div>`;

    bindEvents();
    const bottom = document.getElementById('bottom');
    if (bottom) bottom.scrollIntoView({ block: 'end' });
  }

  function renderMessage(message) {
    return `
      <article class="message ${message.role}">
        <div class="avatar">${message.role === 'user' ? 'U' : message.role === 'assistant' ? 'AI' : 'S'}</div>
        <div class="bubble">
          <div class="message-meta"><strong>${htmlEscape(message.role)}</strong><span>${htmlEscape(message.createdAt)}</span></div>
          ${message.attachment ? `<div class="attachment">📎 ${htmlEscape(message.attachment.name)} · ${(message.attachment.size / 1024).toFixed(1)} KB</div>` : ''}
          ${markdownLite(message.content)}
          ${message.researchSources?.length ? `<div class="source-list">${message.researchSources.slice(0, 6).map((s, i) => `<a href="${htmlEscape(s.url)}" target="_blank" rel="noreferrer">[${i + 1}] ${htmlEscape(s.title)}</a>`).join('')}</div>` : ''}
        </div>
      </article>`;
  }

  function renderStreaming() {
    return `
      <article class="message assistant">
        <div class="avatar">AI</div>
        <div class="bubble streaming">
          <div class="message-meta"><strong>assistant</strong><span>streaming</span></div>
          ${markdownLite(streamingText || 'Thinking...')}<span class="cursor"></span>
        </div>
      </article>`;
  }

  function renderPanel(usage, bars, maxBar) {
    if (activeTab === 'usage') return `
      <section class="panel stack">
        <div class="section-title">Live usage monitor</div>
        <div class="metric-grid">
          <div><span>Input</span><strong>${usage.inputTokens.toLocaleString()}</strong></div>
          <div><span>Output</span><strong>${usage.outputTokens.toLocaleString()}</strong></div>
          <div><span>File</span><strong>${usage.attachmentTokens.toLocaleString()}</strong></div>
          <div><span>Total</span><strong>${usage.totalTokens.toLocaleString()}</strong></div>
        </div>
        <div class="cost">Estimated cost: $${usage.estimatedCostUsd.toFixed(6)}</div>
        <div class="section-title">Recent token chart</div>
        <div class="bar-chart">
          ${bars.length ? bars.map((b) => `<div class="bar-row"><span>${b.index}</span><div class="bar-shell"><div class="bar-fill" style="width:${Math.max(5, b.total / maxBar * 100)}%"></div></div><span>${b.total}</span></div>`).join('') : '<span class="muted">No usage data yet.</span>'}
        </div>
      </section>`;

    if (activeTab === 'agent') return `
      <section class="panel stack">
        <div class="section-title">Agent Mode</div>
        <div class="notice">Chat is default. Agent Mode is secondary and only runs when the toggle near Send is enabled.</div>
        <div class="agent-plan">
          <div class="step"><div class="step-dot"></div><div><strong>Understand</strong><br><span class="muted">Read request, settings, files, and context.</span></div></div>
          <div class="step"><div class="step-dot"></div><div><strong>Execute</strong><br><span class="muted">Produce practical answer, code, or plan.</span></div></div>
          <div class="step"><div class="step-dot"></div><div><strong>Validate</strong><br><span class="muted">Check safety, deployability, and clarity.</span></div></div>
        </div>
      </section>`;

    if (activeTab === 'research') return `
      <section class="panel stack">
        <div class="section-title">Live web search / deep research</div>
        <label>Research query<input id="research-input" placeholder="open-source LLM inference speed" /></label>
        <div class="split"><button data-action="run-web">Run web</button><button data-action="run-research">Deep research</button></div>
        ${lastResearch ? `<div class="notice">${htmlEscape(lastResearch.summary)}</div><div class="source-list">${lastResearch.sources.map((s) => `<div class="source-card"><strong><a href="${htmlEscape(s.url)}" target="_blank" rel="noreferrer">${htmlEscape(s.title)}</a></strong><div class="pill-row"><span class="pill">${htmlEscape(s.source)}</span>${s.published ? `<span class="pill">${htmlEscape(s.published)}</span>` : ''}</div><p>${htmlEscape(s.snippet || 'Source found.')}</p></div>`).join('')}</div>` : '<span class="muted">Use /web or /research in chat, or run a query here.</span>'}
      </section>`;

    return renderSettings();
  }

  function renderSettings() {
    const presets = [
      ['Actual Loaded Local/GPU', DEFAULT_MODEL, 'local-model', '', 'Default target'],
      ['OpenAI GPT-4o mini', 'gpt-4o-mini', 'openai', 'https://api.openai.com/v1', 'Fast cloud'],
      ['OpenAI GPT-4o', 'gpt-4o', 'openai', 'https://api.openai.com/v1', 'Stronger cloud'],
      ['DeepSeek R1', 'deepseek/deepseek-r1', 'openrouter', 'https://openrouter.ai/api/v1', 'Reasoning'],
      ['Llama 3.3 70B', 'meta-llama/llama-3.3-70b-instruct', 'openrouter', 'https://openrouter.ai/api/v1', 'Open model'],
      ['Qwen Reasoning', 'qwen/qwen-2.5-72b-instruct', 'openrouter', 'https://openrouter.ai/api/v1', 'Multilingual'],
      ['Ollama local', 'llama3.1', 'ollama', 'http://localhost:11434/v1', 'Local']
    ];
    return `
      <section class="panel stack">
        <div class="section-title">Model settings</div>
        <label>Provider<select id="setting-provider">
          ${option('local-model','Local model fallback', settings.provider)}${option('openai','OpenAI', settings.provider)}${option('openrouter','OpenRouter', settings.provider)}${option('ollama','Ollama / local OpenAI-compatible', settings.provider)}${option('custom-openai-compatible','Custom OpenAI-compatible', settings.provider)}
        </select></label>
        <label>Model identifier<input id="setting-model" value="${htmlEscape(settings.modelName)}" /></label>
        <label>Base URL<input id="setting-base" value="${htmlEscape(settings.baseUrl)}" placeholder="https://api.openai.com/v1" /></label>
        <label>User-owned API token<input id="setting-key" value="${htmlEscape(settings.apiKey)}" type="password" placeholder="Saved only in this browser. Do not commit keys." /></label>
        <div class="notice">The repo includes only public-safe env values. Browser-entered keys stay in localStorage and are never committed.</div>
        <div class="preset-grid">${presets.map((p, i) => `<button class="preset ${settings.modelName === p[1] ? 'active' : ''}" data-preset="${i}"><strong>${htmlEscape(p[0])}</strong><span>${htmlEscape(p[1])}</span><em>${htmlEscape(p[4])}</em></button>`).join('')}</div>
        <div class="split"><label>Thinking capability<select id="setting-thinking">${option('minimal','Minimal / instant', settings.thinkingLevel)}${option('low','Low latency', settings.thinkingLevel)}${option('auto','Auto', settings.thinkingLevel)}${option('high','High reasoning', settings.thinkingLevel)}</select></label><label>Response style<select id="setting-style">${option('structured','Structured', settings.responseStyle)}${option('concise','Concise', settings.responseStyle)}${option('detailed','Detailed', settings.responseStyle)}${option('bulleted','Bulleted', settings.responseStyle)}</select></label></div>
        <div class="split"><label>Temperature <input id="setting-temp" type="range" min="0" max="1.5" step="0.1" value="${settings.temperature}" /></label><label>Max tokens<input id="setting-max" type="number" min="128" max="32768" value="${settings.maxTokens}" /></label></div>
        <label class="check"><input id="setting-streaming" type="checkbox" ${settings.streaming ? 'checked' : ''}/> Streaming / instant partial response</label>
        <label class="check"><input id="setting-safe" type="checkbox" ${settings.safeMode ? 'checked' : ''}/> Defensive safety mode</label>
        <label>Custom system prompt<textarea id="setting-system">${htmlEscape(settings.customSystemPrompt)}</textarea></label>
      </section>`;
  }

  function option(value, label, selected) {
    return `<option value="${value}" ${selected === value ? 'selected' : ''}>${label}</option>`;
  }

  function bindEvents() {
    const textarea = document.getElementById('prompt-input');
    if (textarea) {
      textarea.addEventListener('input', (event) => { input = event.target.value; render(); });
      textarea.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
          event.preventDefault();
          send();
        }
      });
      textarea.selectionStart = textarea.selectionEnd = textarea.value.length;
      textarea.focus({ preventScroll: true });
    }

    document.querySelectorAll('[data-chat-id]').forEach((el) => el.addEventListener('click', () => { activeChatId = el.dataset.chatId; render(); }));
    document.querySelectorAll('[data-delete-chat]').forEach((el) => el.addEventListener('click', (event) => { event.stopPropagation(); deleteChat(el.dataset.deleteChat); }));
    document.querySelectorAll('[data-tab]').forEach((el) => el.addEventListener('click', () => { activeTab = el.dataset.tab; render(); }));
    document.querySelectorAll('[data-action]').forEach((el) => el.addEventListener('click', () => handleAction(el.dataset.action)));

    const agent = document.getElementById('agent-mode');
    if (agent) agent.addEventListener('change', (event) => { agentMode = event.target.checked; render(); });

    const file = document.getElementById('file-input');
    if (file) file.addEventListener('change', (event) => {
      const f = event.target.files && event.target.files[0];
      if (f) loadFile(f);
    });

    bindSettings();
  }

  function bindSettings() {
    const ids = ['provider','model','base','key','thinking','style','temp','max','streaming','safe','system'];
    ids.forEach((id) => {
      const el = document.getElementById(`setting-${id}`);
      if (!el) return;
      el.addEventListener('input', saveSettingsFromPanel);
      el.addEventListener('change', saveSettingsFromPanel);
    });
    document.querySelectorAll('[data-preset]').forEach((el) => el.addEventListener('click', () => {
      const presets = [
        [DEFAULT_MODEL, 'local-model', ''],
        ['gpt-4o-mini', 'openai', 'https://api.openai.com/v1'],
        ['gpt-4o', 'openai', 'https://api.openai.com/v1'],
        ['deepseek/deepseek-r1', 'openrouter', 'https://openrouter.ai/api/v1'],
        ['meta-llama/llama-3.3-70b-instruct', 'openrouter', 'https://openrouter.ai/api/v1'],
        ['qwen/qwen-2.5-72b-instruct', 'openrouter', 'https://openrouter.ai/api/v1'],
        ['llama3.1', 'ollama', 'http://localhost:11434/v1']
      ];
      const p = presets[Number(el.dataset.preset)];
      settings = { ...settings, modelName: p[0], provider: p[1], baseUrl: p[2], apiKey: p[1] === 'local-model' || p[1] === 'ollama' ? '' : settings.apiKey };
      save();
      render();
    }));
  }

  function saveSettingsFromPanel() {
    const get = (id) => document.getElementById(`setting-${id}`);
    settings = {
      ...settings,
      provider: get('provider')?.value || settings.provider,
      modelName: get('model')?.value || settings.modelName,
      baseUrl: get('base')?.value || '',
      apiKey: get('key')?.value || '',
      thinkingLevel: get('thinking')?.value || settings.thinkingLevel,
      responseStyle: get('style')?.value || settings.responseStyle,
      temperature: Number(get('temp')?.value || settings.temperature),
      maxTokens: Number(get('max')?.value || settings.maxTokens),
      streaming: Boolean(get('streaming')?.checked),
      safeMode: Boolean(get('safe')?.checked),
      customSystemPrompt: get('system')?.value || ''
    };
    save();
  }

  function handleAction(action) {
    if (action === 'new-chat') return newChat();
    if (action === 'export-chat') return exportChat();
    if (action === 'reset-local') return resetLocal();
    if (action === 'attach-file') return document.getElementById('file-input')?.click();
    if (action === 'remove-file') { selectedFile = null; return render(); }
    if (action === 'send') return send();
    if (action === 'run-web') return runResearchFromPanel('web');
    if (action === 'run-research') return runResearchFromPanel('deep');
  }

  function newChat() {
    const chat = createChat();
    chats = [chat, ...chats];
    activeChatId = chat.id;
    input = '';
    selectedFile = null;
    agentMode = false;
    activeTab = 'usage';
    save();
    render();
  }

  function deleteChat(id) {
    chats = chats.filter((chat) => chat.id !== id);
    if (!chats.length) chats = [createChat()];
    if (activeChatId === id) activeChatId = chats[0].id;
    save();
    render();
  }

  function exportChat() {
    const chat = activeChat();
    const lines = [`# ${chat.title}`, '', `Provider: ${settings.provider}`, `Model: ${settings.modelName}`, ''];
    chat.messages.forEach((m) => lines.push(`## ${m.role} — ${m.createdAt}\n\n${m.content}\n`));
    const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `redhydra-chat-${chat.id}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function resetLocal() {
    localStorage.removeItem('redhydra.settings');
    localStorage.removeItem('redhydra.chats');
    settings = { ...defaultSettings };
    chats = [createChat()];
    activeChatId = chats[0].id;
    input = '';
    selectedFile = null;
    agentMode = false;
    lastResearch = null;
    render();
  }

  function loadFile(file) {
    const reader = new FileReader();
    reader.onload = () => {
      selectedFile = { name: file.name, type: file.type || 'application/octet-stream', size: file.size, content: String(reader.result || '') };
      render();
    };
    reader.readAsDataURL(file);
  }

  async function send() {
    const text = input.trim();
    if (!text || isGenerating) return;
    const chat = activeChat();
    const userMessage = createMessage('user', text, selectedFile || undefined);
    chats = chats.map((c) => c.id === chat.id ? { ...c, title: c.title === 'New Chat' ? text.slice(0, 44) || 'New Chat' : c.title, updatedAt: new Date().toISOString(), messages: [...c.messages, userMessage] } : c);
    input = '';
    selectedFile = null;
    isGenerating = true;
    streamingText = 'Routing request...';
    save();
    render();

    let research;
    try {
      const decision = shouldRunWebResearch(text);
      if (decision.run && WEB_RESEARCH_ENABLED) {
        streamingText = `Running ${decision.deep ? 'deep research' : 'web search'}...`;
        render();
        research = await runWebResearch(decision.query, decision.deep ? 'deep' : 'web');
        lastResearch = research;
      }
      const response = await sendChatMessage([...activeChat().messages], research);
      chats = chats.map((c) => c.id === activeChatId ? { ...c, updatedAt: new Date().toISOString(), messages: [...c.messages, response] } : c);
    } catch (error) {
      const fallback = createMessage('assistant', `${error instanceof Error ? error.message : 'Something failed.'}\n\nFallback: the browser-local chat is still active. Check Settings for your endpoint and token.`);
      chats = chats.map((c) => c.id === activeChatId ? { ...c, messages: [...c.messages, fallback] } : c);
    } finally {
      isGenerating = false;
      streamingText = '';
      save();
      render();
    }
  }

  async function sendChatMessage(messages, research) {
    let output;
    try {
      if (settings.provider === 'local-model') output = localAssistant(messages, research);
      else output = await callOpenAICompatible(messages, research);
    } catch (error) {
      output = `${error instanceof Error ? error.message : 'Provider unavailable.'}\n\nFallback response:\n${localAssistant(messages, research)}`;
    }
    return {
      id: uid('assistant'),
      role: 'assistant',
      content: cleanOutput(output),
      createdAt: now(),
      researchSources: research?.sources || []
    };
  }

  function cleanOutput(text) {
    return String(text || '').replace(/\n{3,}/g, '\n\n').trim();
  }

  function localAssistant(messages, research) {
    const last = [...messages].reverse().find((m) => m.role === 'user');
    const prompt = last?.content?.trim() || '';
    const lower = prompt.toLowerCase();
    if (research?.sources?.length) {
      return `I ran ${research.mode === 'deep' ? 'deep research' : 'live web search'} for: ${research.query}.\n\nKey findings from public sources:\n${research.sources.slice(0, 5).map((s) => `- ${s.title}: ${s.snippet || 'Source found.'}`).join('\n')}\n\nSources:\n${research.sources.slice(0, 6).map((s, i) => `${i + 1}. ${s.title} — ${s.url}`).join('\n')}`;
    }
    if (last?.attachment) {
      return `File received: ${last.attachment.name}.\n\nThis static browser build stores file metadata and text/base64 preview locally. Configure a real model endpoint in Settings for deeper file analysis.`;
    }
    if (/^(hi|hello|hey)\b/i.test(prompt)) return `Hi, I’m ${APP_NAME}. Chat mode is active by default. Toggle Agent Mode only when you want step-by-step execution.`;
    if (lower.includes('model')) return `Default actual model target: ${DEFAULT_MODEL}. Use a local/GPU OpenAI-compatible endpoint, OpenRouter, Ollama, or another compatible endpoint in Settings.`;
    if (lower.includes('token')) return 'The live token dashboard is active on the right panel. It estimates input, output, file, total tokens, and provider cost.';
    if (lower.includes('web') || lower.includes('research')) return 'Use `/web your topic` for live web search or `/research your topic` for deep research.';
    if (lower.includes('github') || lower.includes('deploy')) return 'This fixed version is pure static. GitHub Actions deploys it directly to Pages without npm install, so the npm exit-handler error is removed.';
    if (agentMode) return `Agent execution for: ${prompt}\n\n1. Understand the target.\n2. Break it into implementation steps.\n3. Produce the output.\n4. Validate before final use.\n\nConfigure a real model endpoint in Settings for full AI generation.`;
    return `Received. Chat mode is active. For full model responses, configure an OpenAI-compatible endpoint or user-owned provider token in Settings. No private key is hardcoded in this open-source build.`;
  }

  function systemInstruction(research) {
    const blocks = [
      'You are RedHydra AI, a direct open-source AI workspace assistant. Chat mode is default; Agent Mode is secondary.',
      settings.safeMode ? 'Keep outputs safe, legal, defensive, and privacy-aware.' : '',
      settings.thinkingLevel === 'minimal' ? 'Answer fast with minimal reasoning summary.' : settings.thinkingLevel === 'high' ? 'Use deeper reasoning internally and provide only a concise reasoning summary.' : 'Use appropriate reasoning and do not expose private chain-of-thought.',
      settings.responseStyle === 'concise' ? 'Prefer concise answers.' : settings.responseStyle === 'detailed' ? 'Give detailed organized answers.' : settings.responseStyle === 'bulleted' ? 'Use bullets when helpful.' : 'Use clear structured answers.',
      agentMode ? 'Agent Mode is enabled. Plan, execute, and validate.' : 'Chat mode is enabled. Do not over-plan.',
      settings.customSystemPrompt || '',
      research?.sources?.length ? `Live research context:\n${research.sources.map((s, i) => `[${i + 1}] ${s.title}\n${s.url}\n${s.snippet}`).join('\n\n')}` : ''
    ].filter(Boolean);
    return blocks.join('\n\n');
  }

  async function callOpenAICompatible(messages, research) {
    const baseUrl = settings.baseUrl.replace(/\/$/, '');
    if (!baseUrl) throw new Error('No model endpoint is configured. Set an OpenAI-compatible Base URL in Settings.');
    if (settings.provider !== 'ollama' && !settings.apiKey.trim()) throw new Error('This provider requires a user-owned API key entered in Settings.');

    const headers = { 'Content-Type': 'application/json' };
    if (settings.apiKey.trim()) headers.Authorization = `Bearer ${settings.apiKey.trim()}`;
    if (settings.provider === 'openrouter') {
      headers['HTTP-Referer'] = location.origin;
      headers['X-Title'] = APP_NAME;
    }

    const payload = {
      model: settings.modelName || DEFAULT_MODEL,
      messages: [
        { role: 'system', content: systemInstruction(research) },
        ...messages.filter((m) => m.role !== 'system').map((m) => ({ role: m.role, content: m.content }))
      ],
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
              streamingText = cleanOutput(full);
              render();
            }
          } catch {
            full += data;
            streamingText = cleanOutput(full);
            render();
          }
        }
      }
      return cleanOutput(full);
    }

    const data = await response.json();
    return cleanOutput(data.choices?.[0]?.message?.content || data.text || '');
  }

  function shouldRunWebResearch(text) {
    const trimmed = text.trim();
    const lower = trimmed.toLowerCase();
    const forcedWeb = lower.startsWith('/web ');
    const forcedDeep = lower.startsWith('/research ') || lower.startsWith('/deepresearch ') || lower.startsWith('/deep-research ');
    const wantsCurrent = /\b(latest|current|today|news|recent|live|web search|search web|sources|citation|research)\b/i.test(trimmed);
    const query = trimmed.replace(/^\/(web|research|deepresearch|deep-research)\s+/i, '').trim();
    return { run: forcedWeb || forcedDeep || wantsCurrent, deep: forcedDeep || lower.includes('deep research'), query: query || trimmed };
  }

  async function runResearchFromPanel(mode) {
    const query = document.getElementById('research-input')?.value?.trim();
    if (!query) return;
    isGenerating = true;
    streamingText = `Running ${mode === 'deep' ? 'deep research' : 'web search'}...`;
    render();
    try {
      lastResearch = await runWebResearch(query, mode);
      activeTab = 'research';
    } finally {
      isGenerating = false;
      streamingText = '';
      render();
    }
  }

  async function withTimeout(promise, ms = 8000) {
    let id;
    const timeout = new Promise((_, reject) => { id = setTimeout(() => reject(new Error('Request timed out')), ms); });
    try { return await Promise.race([promise, timeout]); }
    finally { clearTimeout(id); }
  }

  function cleanSnippet(value) {
    return String(value || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 420);
  }

  function dedupe(sources) {
    const seen = new Set();
    const out = [];
    for (const s of sources) {
      if (!s.title || !s.url) continue;
      const key = `${s.title.toLowerCase()}|${s.url}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(s);
    }
    return out.slice(0, 12);
  }

  async function searchWikipedia(query) {
    const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*&srlimit=5`;
    const response = await withTimeout(fetch(url));
    if (!response.ok) return [];
    const data = await response.json();
    return (data?.query?.search || []).map((item) => ({ title: item.title, url: `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title.replace(/ /g, '_'))}`, snippet: cleanSnippet(item.snippet), source: 'Wikipedia' }));
  }

  async function searchDuckDuckGo(query) {
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_redirect=1&no_html=1&skip_disambig=1`;
    const response = await withTimeout(fetch(url));
    if (!response.ok) return [];
    const data = await response.json();
    const results = [];
    if (data.AbstractText && data.AbstractURL) results.push({ title: data.Heading || query, url: data.AbstractURL, snippet: cleanSnippet(data.AbstractText), source: 'DuckDuckGo' });
    for (const topic of data.RelatedTopics || []) if (topic.FirstURL && topic.Text) results.push({ title: topic.Text.split(' - ')[0] || query, url: topic.FirstURL, snippet: cleanSnippet(topic.Text), source: 'DuckDuckGo' });
    return results.slice(0, 5);
  }

  async function searchCrossref(query) {
    const url = `https://api.crossref.org/works?query=${encodeURIComponent(query)}&rows=5&select=title,URL,abstract,published-print,published-online,container-title`;
    const response = await withTimeout(fetch(url));
    if (!response.ok) return [];
    const data = await response.json();
    return (data?.message?.items || []).map((item) => {
      const published = item['published-print']?.['date-parts']?.[0]?.join('-') || item['published-online']?.['date-parts']?.[0]?.join('-') || '';
      return { title: Array.isArray(item.title) ? item.title[0] : item.title || 'Crossref result', url: item.URL, snippet: cleanSnippet(item.abstract || (Array.isArray(item['container-title']) ? item['container-title'][0] : 'Scholarly reference indexed by Crossref.')), published, source: 'Crossref' };
    });
  }

  async function searchHackerNews(query) {
    const url = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query)}&tags=story&hitsPerPage=5`;
    const response = await withTimeout(fetch(url));
    if (!response.ok) return [];
    const data = await response.json();
    return (data?.hits || []).map((hit) => ({ title: hit.title || hit.story_title || 'Hacker News result', url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`, snippet: cleanSnippet(`${hit.points || 0} points, ${hit.num_comments || 0} comments. ${hit.author ? `By ${hit.author}.` : ''}`), published: hit.created_at?.slice(0, 10), source: 'HackerNews' }));
  }

  async function runWebResearch(query, mode = 'web') {
    const tasks = mode === 'deep' ? [searchWikipedia(query), searchDuckDuckGo(query), searchCrossref(query), searchHackerNews(query)] : [searchWikipedia(query), searchDuckDuckGo(query), searchHackerNews(query)];
    const settled = await Promise.allSettled(tasks);
    const sources = dedupe(settled.flatMap((r) => r.status === 'fulfilled' ? r.value : []));
    const summary = sources.length ? `Found ${sources.length} live source${sources.length === 1 ? '' : 's'} from ${Array.from(new Set(sources.map((s) => s.source))).join(', ')}.` : 'No live public source returned results. The chat answer will use local reasoning only.';
    return { query, mode, sources, summary };
  }

  render();
})();
