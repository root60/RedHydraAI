const cfg = window.REDHYDRA_CONFIG || {};

const $ = (selector) => document.querySelector(selector);
const els = {
  canvas: $('#hydraCanvas'),
  statusDot: $('#statusDot'),
  statusTitle: $('#statusTitle'),
  statusText: $('#statusText'),
  backendUrl: $('#backendUrl'),
  modelSelect: $('#modelSelect'),
  modelHint: $('#modelHint'),
  modeSelect: $('#modeSelect'),
  reasoningSelect: $('#reasoningSelect'),
  animationSelect: $('#animationSelect'),
  streamSelect: $('#streamSelect'),
  usageInputTokens: $('#usageInputTokens'),
  usageOutputTokens: $('#usageOutputTokens'),
  usageTotalTokens: $('#usageTotalTokens'),
  usageRequests: $('#usageRequests'),
  liveState: $('#liveState'),
  liveElapsed: $('#liveElapsed'),
  liveMeterFill: $('#liveMeterFill'),
  liveTokensSec: $('#liveTokensSec'),
  liveChars: $('#liveChars'),
  resetUsageBtn: $('#resetUsageBtn'),
  usageHint: $('#usageHint'),
  newChatBtn: $('#newChatBtn'),
  healthBtn: $('#healthBtn'),
  exportBtn: $('#exportBtn'),
  hideHeroBtn: $('#hideHeroBtn'),
  heroCard: $('#heroCard'),
  workspaceTitle: $('#workspaceTitle'),
  modePill: $('#modePill'),
  messageList: $('#messageList'),
  composer: $('#composer'),
  promptInput: $('#promptInput'),
  sendBtn: $('#sendBtn'),
  template: $('#messageTemplate')
};

const STORAGE_KEY = 'redhydra-opencore-state-v3';
const DEFAULT_MODELS = [
  { id: 'dphn/Dolphin-Llama3-8B-Instruct-exl2-6bpw', label: 'RedHydra Dolphin Llama3 EXL2', provider: 'GPU / OpenAI-compatible' },
  { id: 'dphn/Dolphin3.0-Qwen2.5-0.5B', label: 'RedHydra Dolphin Fast', provider: 'OpenAI-compatible' },
  { id: 'llama3.1:8b', label: 'Local Ollama Llama 3.1 8B', provider: 'Ollama local' }
];

let state = loadState();
let messages = state.messages || [];
let busy = false;
let abortController = null;
let models = DEFAULT_MODELS;
let usage = normalizeUsage(state.usage);
let liveMonitor = { start: 0, timer: null, promptTokens: 0, outputTokens: 0, outputChars: 0, active: false };

function loadState() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}



function normalizeUsage(value = {}) {
  return {
    prompt: Number(value.prompt || 0),
    completion: Number(value.completion || 0),
    total: Number(value.total || 0),
    requests: Number(value.requests || 0),
    lastPrompt: Number(value.lastPrompt || 0),
    lastCompletion: Number(value.lastCompletion || 0),
    lastTotal: Number(value.lastTotal || 0),
    lastLatencyMs: Number(value.lastLatencyMs || 0),
    lastTokensPerSec: Number(value.lastTokensPerSec || 0)
  };
}

function estimateTokens(text = '') {
  const raw = String(text || '').trim();
  if (!raw) return 0;
  const words = raw.split(/\s+/).filter(Boolean).length;
  const chars = raw.length;
  const nonAscii = (raw.match(/[^\x00-\x7F]/g) || []).length;
  const byChars = Math.ceil(chars / (nonAscii > chars * 0.25 ? 2.2 : 4));
  const byWords = Math.ceil(words * 1.35);
  return Math.max(1, Math.max(byChars, byWords));
}

function formatNumber(value) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(Number(value || 0));
}

function renderUsage() {
  if (!els.usageInputTokens) return;
  els.usageInputTokens.textContent = formatNumber(usage.prompt);
  els.usageOutputTokens.textContent = formatNumber(usage.completion);
  els.usageTotalTokens.textContent = formatNumber(usage.total);
  els.usageRequests.textContent = formatNumber(usage.requests);
}

function resetUsage() {
  usage = normalizeUsage();
  stopLiveMonitor('Idle');
  renderUsage();
  saveState();
}

function buildPromptTokenEstimate(userText) {
  const systemTokens = estimateTokens(buildSystemPrompt());
  const historyTokens = compactHistory().reduce((sum, msg) => sum + estimateTokens(msg.content) + 4, 0);
  return systemTokens + historyTokens + estimateTokens(userText) + 8;
}

function startLiveMonitor(userText) {
  liveMonitor.start = performance.now();
  liveMonitor.promptTokens = buildPromptTokenEstimate(userText);
  liveMonitor.outputTokens = 0;
  liveMonitor.outputChars = 0;
  liveMonitor.active = true;
  if (els.liveState) els.liveState.textContent = 'Streaming';
  if (els.liveMeterFill) els.liveMeterFill.style.width = '8%';
  clearInterval(liveMonitor.timer);
  liveMonitor.timer = setInterval(() => updateLiveMonitor(), 120);
  updateLiveMonitor();
}

function updateLiveMonitor(outputText = null) {
  if (typeof outputText === 'string') {
    liveMonitor.outputChars = outputText.length;
    liveMonitor.outputTokens = estimateTokens(outputText);
  }
  const elapsedMs = liveMonitor.start ? performance.now() - liveMonitor.start : 0;
  const elapsedSeconds = Math.max(0.001, elapsedMs / 1000);
  const rate = liveMonitor.outputTokens / elapsedSeconds;
  if (els.liveElapsed) els.liveElapsed.textContent = `${elapsedSeconds.toFixed(1)}s`;
  if (els.liveTokensSec) els.liveTokensSec.textContent = rate.toFixed(1);
  if (els.liveChars) els.liveChars.textContent = formatNumber(liveMonitor.outputChars);
  if (els.liveMeterFill) {
    const fill = Math.min(98, 8 + Math.log2(liveMonitor.outputTokens + 1) * 10);
    els.liveMeterFill.style.width = `${fill}%`;
  }
}

function stopLiveMonitor(label = 'Idle') {
  clearInterval(liveMonitor.timer);
  liveMonitor.timer = null;
  liveMonitor.active = false;
  if (els.liveState) els.liveState.textContent = label;
  if (els.liveMeterFill) els.liveMeterFill.style.width = label === 'Complete' ? '100%' : '0%';
}

function commitUsage({ promptTokens, completionTokens, totalTokens, latencyMs }) {
  const prompt = Math.max(0, Math.round(Number(promptTokens || 0)));
  const completion = Math.max(0, Math.round(Number(completionTokens || 0)));
  const total = Math.max(0, Math.round(Number(totalTokens || prompt + completion)));
  const seconds = Math.max(0.001, Number(latencyMs || 0) / 1000);

  usage.prompt += prompt;
  usage.completion += completion;
  usage.total += total;
  usage.requests += 1;
  usage.lastPrompt = prompt;
  usage.lastCompletion = completion;
  usage.lastTotal = total;
  usage.lastLatencyMs = Number(latencyMs || 0);
  usage.lastTokensPerSec = completion / seconds;

  renderUsage();
}

function extractUsageFromPayload(data) {
  const source = data?.usage || data?.response?.usage || data?.raw?.usage;
  if (!source) return null;
  const prompt = Number(source.prompt_tokens ?? source.input_tokens ?? source.prompt ?? 0);
  const completion = Number(source.completion_tokens ?? source.output_tokens ?? source.completion ?? 0);
  const total = Number(source.total_tokens ?? source.total ?? prompt + completion);
  if (!prompt && !completion && !total) return null;
  return { promptTokens: prompt, completionTokens: completion, totalTokens: total };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    backendUrl: els.backendUrl.value.trim(),
    model: els.modelSelect.value,
    mode: els.modeSelect.value,
    reasoning: els.reasoningSelect.value,
    animation: els.animationSelect.value,
    streaming: els.streamSelect.value === 'stream',
    heroHidden: els.heroCard.classList.contains('is-hidden'),
    messages: messages.slice(-40),
    usage
  }));
}

function apiBase() {
  const manual = els.backendUrl.value.trim().replace(/\/$/, '');
  if (manual) return manual;
  if (cfg.backendUrl) return String(cfg.backendUrl).replace(/\/$/, '');
  return '';
}

function apiUrl(path) {
  const base = apiBase();
  if (!base) return `/api${path}`;
  return `${base}/api${path}`;
}

function setStatus(type, title, text) {
  els.statusDot.className = `status-dot ${type || ''}`.trim();
  els.statusTitle.textContent = title;
  els.statusText.textContent = text;
}

function setBusy(nextBusy) {
  busy = nextBusy;
  document.body.classList.toggle('is-busy', busy);
  els.sendBtn.disabled = busy;
  els.sendBtn.querySelector('span').textContent = busy ? 'Running' : 'Send';
}

function applyUiState() {
  els.backendUrl.value = state.backendUrl || cfg.backendUrl || '';
  els.modeSelect.value = state.mode || cfg.defaultMode || 'chat';
  els.reasoningSelect.value = state.reasoning || cfg.defaultReasoning || 'minimal';
  els.animationSelect.value = state.animation || cfg.defaultAnimation || 'live';
  els.streamSelect.value = state.streaming === false ? 'full' : 'stream';
  document.documentElement.dataset.animation = els.animationSelect.value;
  if (state.heroHidden) els.heroCard.classList.add('is-hidden');
  updateModeUi();
}

function updateModeUi() {
  const mode = els.modeSelect.value;
  const isAgent = mode === 'agent';
  els.workspaceTitle.textContent = isAgent ? 'Agent Mode' : 'Chat Mode';
  els.modePill.textContent = isAgent ? 'Agent secondary' : 'Chat default';
  els.promptInput.placeholder = isAgent
    ? 'Describe the task for the agent workflow...'
    : 'Ask RedHydra anything...';

  if (isAgent && els.reasoningSelect.value === 'minimal') {
    els.reasoningSelect.value = 'balanced';
  }
  saveState();
}

function renderModels() {
  const current = state.model;
  els.modelSelect.innerHTML = '';
  for (const model of models) {
    const option = document.createElement('option');
    option.value = model.id;
    option.textContent = model.label || model.id;
    option.title = `${model.provider || 'provider'} — ${model.notes || ''}`;
    els.modelSelect.append(option);
  }
  els.modelSelect.value = current && models.some((m) => m.id === current)
    ? current
    : models[0]?.id || '';
  updateModelHint();
}

function updateModelHint() {
  const selected = models.find((m) => m.id === els.modelSelect.value);
  els.modelHint.textContent = selected
    ? `${selected.provider || 'OpenAI-compatible'} · ${selected.speed || 'speed depends on backend'}`
    : 'OpenAI-compatible models supported.';
  saveState();
}

async function loadModels() {
  try {
    const response = await fetch(cfg.modelsPath || './models.json', { cache: 'force-cache' });
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data) && data.length) models = data;
    }
  } catch {
    models = DEFAULT_MODELS;
  }
  renderModels();
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function lightMarkdown(text) {
  const safe = escapeHtml(text || '');
  return safe
    .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\n{2,}/g, '</p><p>')
    .replace(/^(.+)$/s, '<p>$1</p>')
    .replace(/<p><pre>/g, '<pre>')
    .replace(/<\/pre><\/p>/g, '</pre>');
}

function addMessage(role, content, meta) {
  const node = els.template.content.firstElementChild.cloneNode(true);
  node.classList.add(role);
  node.querySelector('.message-meta').textContent = meta || role;
  const contentNode = node.querySelector('.message-content');
  contentNode.innerHTML = content ? lightMarkdown(content) : '<span class="typing"><i></i><i></i><i></i></span>';
  els.messageList.append(node);
  els.messageList.scrollTop = els.messageList.scrollHeight;
  return { node, contentNode };
}

function updateMessage(view, content) {
  view.contentNode.innerHTML = lightMarkdown(content);
  els.messageList.scrollTop = els.messageList.scrollHeight;
}

function syncMessages() {
  els.messageList.innerHTML = '';
  for (const msg of messages) {
    addMessage(msg.role, msg.content, msg.meta);
  }
}

function buildSystemPrompt() {
  const mode = els.modeSelect.value;
  const reasoning = els.reasoningSelect.value;
  const speedInstruction = reasoning === 'minimal'
    ? 'Prioritize fast, direct answers. Keep responses concise unless the user asks for detail.'
    : reasoning === 'balanced'
      ? 'Give a clear answer with enough reasoning to be useful, without exposing hidden chain-of-thought.'
      : 'Analyze carefully and provide a structured final answer. Do not reveal hidden chain-of-thought; summarize reasoning briefly when helpful.';

  if (mode === 'agent') {
    return `You are RedHydra OpenCore in Agent Mode. Break tasks into short actionable steps, execute the requested work directly, preserve user intent, and avoid unnecessary questions. ${speedInstruction}`;
  }
  return `You are RedHydra OpenCore in Chat Mode. Answer naturally, quickly, and helpfully. ${speedInstruction}`;
}

function maxTokensForSettings() {
  const mode = els.modeSelect.value;
  const reasoning = els.reasoningSelect.value;
  if (mode === 'agent' || reasoning === 'deep') return 2048;
  if (reasoning === 'balanced') return 1400;
  return 900;
}

function compactHistory() {
  const limit = Number(cfg.maxHistoryMessages || 18);
  return messages.slice(-limit).map((m) => ({ role: m.role, content: m.content }));
}

async function askBackend(userText) {
  const payload = {
    model: els.modelSelect.value,
    mode: els.modeSelect.value,
    reasoning: els.reasoningSelect.value,
    stream: els.streamSelect.value === 'stream',
    temperature: els.reasoningSelect.value === 'minimal' ? 0.45 : 0.65,
    max_tokens: maxTokensForSettings(),
    system: buildSystemPrompt(),
    messages: compactHistory()
  };

  abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort('timeout'), Number(cfg.requestTimeoutMs || 180000));

  const requestStartedAt = performance.now();

  try {
    const response = await fetch(apiUrl('/chat'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: abortController.signal
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(err.slice(0, 500) || `HTTP ${response.status}`);
    }

    if (!payload.stream || !response.body) {
      const data = await response.json();
      return {
        fullText: data.text || data.content || JSON.stringify(data),
        usage: extractUsageFromPayload(data),
        latencyMs: performance.now() - requestStartedAt,
        streamed: false
      };
    }

    return { stream: response.body, latencyStart: requestStartedAt, streamed: true };
  } finally {
    clearTimeout(timeout);
  }
}

function parseSseChunk(raw) {
  const lines = raw.split('\n');
  let out = '';
  let usageData = null;
  let errorData = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed === 'data: [DONE]') continue;
    if (!trimmed.startsWith('data:')) {
      out += trimmed;
      continue;
    }
    const data = trimmed.replace(/^data:\s*/, '');
    try {
      const json = JSON.parse(data);
      if (json.error) errorData = json.details || json.error;
      const parsedUsage = extractUsageFromPayload(json);
      if (parsedUsage) usageData = parsedUsage;
      out += json.choices?.[0]?.delta?.content
        || json.choices?.[0]?.message?.content
        || json.token
        || json.text
        || '';
    } catch {
      out += data;
    }
  }
  return { text: out, usage: usageData, error: errorData };
}

async function streamToView(stream, view) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let text = '';
  let usageData = null;
  let lastPaint = 0;

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split('\n\n');
    buffer = parts.pop() || '';
    for (const part of parts) {
      const parsed = parseSseChunk(part);
      if (parsed.error) throw new Error(parsed.error);
      text += parsed.text;
      if (parsed.usage) usageData = parsed.usage;
    }
    const now = performance.now();
    if (now - lastPaint > 45) {
      updateMessage(view, text || '');
      updateLiveMonitor(text || '');
      lastPaint = now;
    }
  }
  if (buffer) {
    const parsed = parseSseChunk(buffer);
    if (parsed.error) throw new Error(parsed.error);
    text += parsed.text;
    if (parsed.usage) usageData = parsed.usage;
  }
  updateMessage(view, text || 'No response text received.');
  updateLiveMonitor(text || '');
  return { text: text || 'No response text received.', usage: usageData };
}

function demoReply(userText) {
  const mode = els.modeSelect.value === 'agent' ? 'Agent Mode' : 'Chat Mode';
  return [
    `RedHydra ${mode} is ready.`,
    '',
    'The animated GitHub Pages frontend is running correctly, but no live Python model backend responded yet.',
    '',
    'To enable real model output, deploy the Python backend in /backend and set backendUrl in config.public.js or in the sidebar.',
    '',
    `Your message: ${userText}`
  ].join('\n');
}

async function handleSubmit(event) {
  event.preventDefault();
  if (busy) return;
  const text = els.promptInput.value.trim();
  if (!text) return;

  els.heroCard.classList.add('is-hidden');
  els.promptInput.value = '';
  autoSizeTextarea();
  messages.push({ role: 'user', content: text, meta: 'You' });
  addMessage('user', text, 'You');
  const assistantView = addMessage('assistant', '', 'RedHydra');
  setBusy(true);
  startLiveMonitor(text);
  saveState();

  try {
    const result = await askBackend(text);
    let assistantText = '';
    let finalUsage = null;
    let latencyMs = performance.now() - liveMonitor.start;

    if (result.streamed) {
      const streamed = await streamToView(result.stream, assistantView);
      assistantText = streamed.text;
      finalUsage = streamed.usage;
      latencyMs = performance.now() - (result.latencyStart || liveMonitor.start);
    } else {
      assistantText = result.fullText || 'No response text received.';
      updateMessage(assistantView, assistantText);
      updateLiveMonitor(assistantText);
      finalUsage = result.usage;
      latencyMs = result.latencyMs || latencyMs;
    }

    const fallbackUsage = {
      promptTokens: liveMonitor.promptTokens,
      completionTokens: estimateTokens(assistantText),
      totalTokens: liveMonitor.promptTokens + estimateTokens(assistantText)
    };
    commitUsage({ ...(finalUsage || fallbackUsage), latencyMs });
    stopLiveMonitor('Complete');
    messages.push({ role: 'assistant', content: assistantText, meta: 'RedHydra' });
    setStatus('ok', 'Backend connected', `Live response · ${usage.lastCompletion} output tokens · ${usage.lastTokensPerSec.toFixed(1)} tok/s`);
  } catch (error) {
    const allowFallback = cfg.publicDemoFallback !== false;
    const fallback = allowFallback ? demoReply(text) : `Backend error: ${error.message}`;
    updateMessage(assistantView, fallback);
    updateLiveMonitor(fallback);
    commitUsage({
      promptTokens: liveMonitor.promptTokens,
      completionTokens: estimateTokens(fallback),
      totalTokens: liveMonitor.promptTokens + estimateTokens(fallback),
      latencyMs: performance.now() - liveMonitor.start
    });
    stopLiveMonitor(allowFallback ? 'Demo' : 'Error');
    messages.push({ role: 'assistant', content: fallback, meta: 'RedHydra' });
    setStatus('err', 'Backend not connected', 'Frontend is live. Connect /backend for real model output.');
  } finally {
    setBusy(false);
    abortController = null;
    saveState();
    els.promptInput.focus();
  }
}

async function checkHealth() {
  setStatus('', 'Checking backend...', 'Sending health request.');
  try {
    const response = await fetch(apiUrl('/health'), { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    setStatus('ok', 'Backend connected', `${data.name || 'Python backend'} · ${data.default_model || 'model ready'}`);
  } catch {
    setStatus('err', 'Backend not connected', 'Deploy /backend or set the Backend URL.');
  }
}

function autoSizeTextarea() {
  els.promptInput.style.height = 'auto';
  els.promptInput.style.height = `${Math.min(220, els.promptInput.scrollHeight)}px`;
}

function exportChat() {
  const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), usage, messages }, null, 2)], {
    type: 'application/json'
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `redhydra-chat-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function initCanvas() {
  const canvas = els.canvas;
  const ctx = canvas.getContext('2d', { alpha: true });
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  let points = [];
  let width = 0;
  let height = 0;
  let raf = 0;

  function resize() {
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.min(92, Math.max(35, Math.floor((width * height) / 22000)));
    points = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - .5) * .28,
      vy: (Math.random() - .5) * .28,
      r: Math.random() * 1.8 + .6
    }));
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    const speed = document.documentElement.dataset.animation === 'max' ? 1.8 : document.documentElement.dataset.animation === 'calm' ? .55 : 1;
    for (const p of points) {
      p.x += p.vx * speed;
      p.y += p.vy * speed;
      if (p.x < 0 || p.x > width) p.vx *= -1;
      if (p.y < 0 || p.y > height) p.vy *= -1;
    }
    for (let i = 0; i < points.length; i++) {
      const a = points[i];
      ctx.beginPath();
      ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 62, 92, .62)';
      ctx.fill();
      for (let j = i + 1; j < points.length; j++) {
        const b = points[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 140) {
          ctx.strokeStyle = `rgba(255, 43, 79, ${0.12 * (1 - dist / 140)})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }
    raf = requestAnimationFrame(draw);
  }

  window.addEventListener('resize', resize, { passive: true });
  resize();
  draw();
  return () => cancelAnimationFrame(raf);
}

function bindEvents() {
  els.composer.addEventListener('submit', handleSubmit);
  els.promptInput.addEventListener('input', autoSizeTextarea);
  els.promptInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      els.composer.requestSubmit();
    }
  });
  els.modeSelect.addEventListener('change', updateModeUi);
  els.reasoningSelect.addEventListener('change', saveState);
  els.backendUrl.addEventListener('change', saveState);
  els.streamSelect.addEventListener('change', saveState);
  els.modelSelect.addEventListener('change', updateModelHint);
  els.animationSelect.addEventListener('change', () => {
    document.documentElement.dataset.animation = els.animationSelect.value;
    saveState();
  });
  els.hideHeroBtn.addEventListener('click', () => {
    els.heroCard.classList.add('is-hidden');
    saveState();
    els.promptInput.focus();
  });
  els.newChatBtn.addEventListener('click', () => {
    messages = [];
    syncMessages();
    els.heroCard.classList.remove('is-hidden');
    saveState();
  });
  els.healthBtn.addEventListener('click', checkHealth);
  els.exportBtn.addEventListener('click', exportChat);
  els.resetUsageBtn?.addEventListener('click', resetUsage);
}

async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  try {
    await navigator.serviceWorker.register('./sw.js');
  } catch {
    // Service worker is a speed optimization only.
  }
}

async function init() {
  applyUiState();
  renderUsage();
  bindEvents();
  await loadModels();
  syncMessages();
  if (!messages.length) {
    addMessage('assistant', 'Welcome to RedHydra OpenCore. Chat mode is active by default. Agent mode is available from the sidebar for multi-step tasks.', 'RedHydra');
  }
  initCanvas();
  registerServiceWorker();
  setStatus('', 'Frontend ready', 'Connect a Python backend for live model output.');
}

init();
