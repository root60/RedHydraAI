import { AIPersona, ChatMessage, ThinkMode } from '../types';
import { generateAIResponse, personas } from './aiEngine';
import { analyzeCode, generateToolCode, securityToolTemplates } from './securityTools';
import { threatEntries } from './threatIntel';
import { secureGetJSON, secureRemove, secureSetJSON } from './secureStorage';

declare global {
  interface Window {
    ai?: any;
    LanguageModel?: any;
  }
}

export type LiveAgentProvider = 'auto' | 'webllm' | 'browser' | 'local-fallback';

export interface LiveAgentStatus {
  provider: LiveAgentProvider;
  ready: boolean;
  loading: boolean;
  progress: number;
  message: string;
  model: string;
  webgpu: boolean;
  lastError?: string;
}

export interface LiveAgentRequest {
  input: string;
  persona: AIPersona;
  thinkMode: ThinkMode;
  webSearch: boolean;
  history: ChatMessage[];
}

export interface LiveAgentResponse {
  content: string;
  thinkingChain: string[];
  sources: string[];
  provider: LiveAgentProvider;
  model: string;
}

type StatusListener = (status: LiveAgentStatus) => void;

const DEFAULT_MODEL = 'SmolLM2-360M-Instruct-q4f32_1-MLC';
const FAST_MODEL = 'SmolLM2-360M-Instruct-q4f32_1-MLC';
const STRONG_MODEL = 'SmolLM2-1.7B-Instruct-q4f16_1-MLC';
const STORE_KEY = 'redhydra_secure_agent_memory_v1';

let engine: any = null;
let enginePromise: Promise<any> | null = null;
let activeModel = DEFAULT_MODEL;
const listeners = new Set<StatusListener>();
let status: LiveAgentStatus = {
  provider: 'auto',
  ready: false,
  loading: false,
  progress: 0,
  message: 'Auto mode: local AI will start on first message if the browser supports WebGPU.',
  model: DEFAULT_MODEL,
  webgpu: typeof navigator !== 'undefined' && 'gpu' in navigator,
};

function emit(partial: Partial<LiveAgentStatus>) {
  status = { ...status, ...partial, webgpu: typeof navigator !== 'undefined' && 'gpu' in navigator };
  listeners.forEach(listener => listener(status));
}

export function subscribeAgentStatus(listener: StatusListener) {
  listeners.add(listener);
  listener(status);
  return () => listeners.delete(listener);
}

export function getAgentStatus() {
  return status;
}

function prefersStrongModel(mode: ThinkMode) {
  return mode === 'deep' || mode === 'deeper';
}

export async function initializeLiveAgent(mode: ThinkMode = 'quick', force = false) {
  const requestedModel = prefersStrongModel(mode) ? STRONG_MODEL : FAST_MODEL;
  if (engine && activeModel === requestedModel && !force) {
    emit({ ready: true, loading: false, provider: 'webllm', model: activeModel, message: `Local AI ready: ${activeModel}` });
    return engine;
  }

  if (!(typeof navigator !== 'undefined' && 'gpu' in navigator)) {
    emit({ provider: 'browser', ready: await hasBrowserBuiltInAI(), loading: false, progress: 0, model: 'Browser AI / fallback', message: 'WebGPU is not available. Using browser built-in AI if supported, otherwise local reasoning.' });
    return null;
  }

  if (enginePromise && !force) return enginePromise;

  activeModel = requestedModel;
  emit({ provider: 'webllm', ready: false, loading: true, progress: 0.02, model: activeModel, message: `Loading open-source local model: ${activeModel}` });

  enginePromise = (async () => {
    try {
      const webllm = await import(/* @vite-ignore */ 'https://esm.run/@mlc-ai/web-llm');
      const created = await webllm.CreateMLCEngine(activeModel, {
        initProgressCallback: (report: any) => {
          const rawProgress = typeof report?.progress === 'number' ? report.progress : 0;
          const text = report?.text || report?.timeElapsed || `Loading ${activeModel}`;
          emit({ loading: true, progress: Math.max(0.02, Math.min(0.98, rawProgress)), message: String(text), provider: 'webllm', model: activeModel });
        },
      });
      engine = created;
      emit({ ready: true, loading: false, progress: 1, provider: 'webllm', model: activeModel, message: `Local AI ready: ${activeModel}` });
      return created;
    } catch (error: any) {
      engine = null;
      enginePromise = null;
      const builtIn = await hasBrowserBuiltInAI();
      emit({ provider: builtIn ? 'browser' : 'local-fallback', ready: builtIn, loading: false, progress: 0, model: builtIn ? 'Browser built-in AI' : 'RedHydra local reasoning engine', message: builtIn ? 'Using browser built-in AI because WebLLM could not load.' : 'Using offline local reasoning because model loading failed.', lastError: error?.message || String(error) });
      return null;
    }
  })();

  return enginePromise;
}

async function hasBrowserBuiltInAI() {
  try {
    const lm = window.LanguageModel || window.ai?.languageModel;
    if (!lm) return false;
    if (typeof lm.availability === 'function') {
      const availability = await lm.availability();
      return availability === 'available' || availability === 'readily' || availability === 'after-download';
    }
    return true;
  } catch {
    return false;
  }
}

async function askBrowserBuiltIn(prompt: string) {
  const lm = window.LanguageModel || window.ai?.languageModel;
  if (!lm) throw new Error('Browser built-in AI is not available.');
  const session = typeof lm.create === 'function' ? await lm.create({ temperature: 0.4, topK: 40 }) : await lm.createTextSession?.();
  if (!session) throw new Error('Unable to create browser AI session.');
  if (typeof session.prompt === 'function') return String(await session.prompt(prompt));
  if (typeof session.promptStreaming === 'function') {
    let out = '';
    for await (const chunk of session.promptStreaming(prompt)) out += chunk;
    return out;
  }
  throw new Error('Browser AI session does not support prompt generation.');
}

function formatHistory(history: ChatMessage[]) {
  return history
    .slice(-8)
    .filter(m => m.role === 'user' || m.role === 'assistant')
    .map(m => `${m.role.toUpperCase()}: ${m.content.slice(0, 1200)}`)
    .join('\n\n');
}

function detectAgentTasks(input: string) {
  const lower = input.toLowerCase();
  return {
    wantsCodeReview: /review|analy[sz]e|audit|scan|vulnerability|bug|secure code|code/.test(lower) && /```|function|class|import|const |let |var |def |public |private |SELECT|query/.test(input),
    wantsTool: /generate|create|build|make|write/.test(lower) && /tool|scanner|script|payload|checker|analyzer|scanner/.test(lower),
    wantsThreatIntel: /cve|ioc|apt|threat|malware|ransomware|mitre|intel|campaign/.test(lower),
    wantsPlan: /plan|steps|strategy|roadmap|fix|mitigate|harden|defend|deploy/.test(lower),
  };
}

function extractCodeBlock(input: string) {
  const fenced = input.match(/```[a-zA-Z0-9_-]*\n([\s\S]*?)```/);
  if (fenced?.[1]) return fenced[1];
  return input;
}

function localToolContext(input: string) {
  const tasks = detectAgentTasks(input);
  const blocks: string[] = [];
  const sources = new Set<string>();

  if (tasks.wantsCodeReview) {
    const code = extractCodeBlock(input);
    const result = analyzeCode(code, 'auto');
    blocks.push(`LOCAL CODE ANALYZER RESULT:\nSecurity score: ${result.score}/100\nFindings: ${result.vulnerabilities.length}\n${result.vulnerabilities.slice(0, 6).map(v => `- ${v.severity.toUpperCase()}: ${v.title} ${v.cwe ? `(${v.cwe})` : ''} — ${v.recommendation}`).join('\n')}`);
    sources.add('RedHydra local code analyzer');
  }

  if (tasks.wantsTool) {
    const generated = generateToolCode(input, 'auto', 'Python');
    blocks.push(`LOCAL TOOL GENERATOR RESULT:\nGenerated a relevant security tool draft with code/tests/docs available in the Tool Generator engine. Mention that the user can open Tool Generator for full export. Preview:\n${generated.docs.slice(0, 800)}`);
    sources.add('RedHydra local tool generator');
  }

  if (tasks.wantsThreatIntel) {
    const lower = input.toLowerCase();
    const matches = threatEntries.filter(t => [t.title, t.type, t.description, ...(t.ioc || []), ...(t.mitre ? [t.mitre] : [])].join(' ').toLowerCase().includes(lower.split(/\s+/).find(w => w.length > 5) || lower)).slice(0, 3);
    const chosen = matches.length ? matches : threatEntries.slice(0, 3);
    blocks.push(`LOCAL THREAT INTEL SNAPSHOT:\n${chosen.map(t => `- ${t.title} [${t.severity}] ${t.description.slice(0, 180)}... Mitigation: ${t.mitigation.slice(0, 2).join('; ')}`).join('\n')}`);
    sources.add('RedHydra offline threat intelligence database');
  }

  if (/library|available tools|what tools|modules|features/.test(input.toLowerCase())) {
    blocks.push(`LOCAL TOOL LIBRARY SNAPSHOT:\n${securityToolTemplates.slice(0, 8).map(t => `- ${t.name}: ${t.description}`).join('\n')}`);
    sources.add('RedHydra tool library');
  }

  return { context: blocks.join('\n\n'), sources: Array.from(sources) };
}

function getPersonaInstruction(persona: AIPersona) {
  const p = personas[persona];
  return `${p.name} (${p.title}). Expertise: ${p.expertise.join(', ')}. Style: ${p.approach}`;
}

function getModeInstruction(mode: ThinkMode) {
  if (mode === 'quick') return 'Answer directly and briefly. Give clear steps only when needed.';
  if (mode === 'deep') return 'Give a detailed answer with reasoning summary, risks, actions, and verification steps.';
  return 'Give a very detailed agent-style answer with assumptions, analysis, recommended actions, validation checks, and limitations. Do not expose private chain-of-thought; provide a concise reasoning summary only.';
}

function buildPrompt(req: LiveAgentRequest, toolContext: string) {
  return `You are RedHydra AI, a real security assistant and autonomous browser-side agent running in a static GitHub Pages app.

PERSONA:
${getPersonaInstruction(req.persona)}

MODE:
${getModeInstruction(req.thinkMode)}

RULES:
- Respond directly to the user's exact message. Do not give generic template replies.
- Be honest about limits. If live web search or backend actions are unavailable, say so briefly.
- Use the local tool results when supplied. Do not invent scan results, statistics, CVEs, or sources.
- Keep security help focused on authorized testing, defense, learning, and safe development.
- Refuse destructive, credential-stealing, evasion, malware, or unauthorized intrusion instructions, but still offer safe defensive alternatives.
- For code/security answers, prefer practical fixes and verification steps.

RECENT CHAT:
${formatHistory(req.history) || 'No previous messages.'}

LOCAL AGENT CONTEXT:
${toolContext || 'No local tool result was needed for this query.'}

USER MESSAGE:
${req.input}

ANSWER:`;
}

function buildReasoningSummary(req: LiveAgentRequest, hasToolContext: boolean): string[] {
  const steps = [
    `Persona selected: ${personas[req.persona].name}`,
    `Mode selected: ${req.thinkMode}`,
    'Parsed the user request and routed it through the local agent planner',
  ];
  if (hasToolContext) steps.push('Used relevant RedHydra local tools before composing the answer');
  if (req.webSearch) steps.push('Live web search is disabled in static no-backend mode unless a search API is connected');
  steps.push('Generated a direct answer with limitations separated from recommendations');
  return steps;
}

function isLikelyUnsafeCyber(input: string) {
  const lower = input.toLowerCase();
  const redFlags = [
    'steal password', 'credential', 'phishing kit', 'bypass antivirus', 'disable defender', 'malware', 'ransomware builder', 'keylogger', 'rat ', 'reverse shell', 'persistence', 'privilege escalation exploit', 'exfiltrate', 'botnet', 'ddos', 'sqlmap command for target', 'hack account', 'unauthorized', 'evade detection', 'payload to exploit', 'make undetectable'
  ];
  return redFlags.some(flag => lower.includes(flag));
}

function fallbackDirectAnswer(req: LiveAgentRequest, sourcesFromTools: string[]): LiveAgentResponse {
  const { content, thinkingChain, sources } = generateAIResponse(req.input, req.persona, req.thinkMode, false);
  const tasks = detectAgentTasks(req.input);
  const additions: string[] = [];

  if (isLikelyUnsafeCyber(req.input)) {
    additions.push(`## Safe-use boundary\n\nI can help with authorized testing, defensive analysis, secure coding, detection, hardening, and training. I cannot provide instructions that enable unauthorized access, credential theft, malware, stealth, or evasion.\n\n**Safe alternative:** describe your own lab/CTF/system scope, and I can help create a legal test plan, detection logic, secure fix, or defensive checklist.`);
  } else if (tasks.wantsPlan || content.trim().length < 80) {
    additions.push(`## Direct answer\n\nI understand you want a response to this exact request: **${req.input.slice(0, 220)}**\n\nHere is the practical agent approach:\n\n1. Define the authorized target or system scope clearly.\n2. Identify the main risk area: application, network, identity, cloud, endpoint, or user training.\n3. Run the matching RedHydra module: Code Analyzer, Tool Generator, Threat Intel, Training Hub, or Deep Research.\n4. Review findings by severity and exploitability.\n5. Apply fixes, then verify with a repeat test.\n\nFor a more accurate result, paste the real code, config, URL structure, log sample, or exact threat name you want analyzed.`);
  }

  const note = req.webSearch ? `\n\n### Live web note\n\nThis static GitHub Pages build has no backend search API, so I did **not** invent real-time web results. Connect a search API later if you want live CVE/news lookup.` : '';
  const body = additions.length ? additions.join('\n\n') : content;
  return {
    content: `${body}${note}`,
    thinkingChain: thinkingChain.length ? thinkingChain : buildReasoningSummary(req, sourcesFromTools.length > 0),
    sources: Array.from(new Set([...sources, ...sourcesFromTools, 'RedHydra local reasoning engine'])),
    provider: 'local-fallback',
    model: 'RedHydra local reasoning engine',
  };
}

async function askWebLLM(prompt: string, mode: ThinkMode) {
  const modelEngine = await initializeLiveAgent(mode);
  if (!modelEngine) throw new Error('WebLLM engine unavailable.');
  const completion = await modelEngine.chat.completions.create({
    messages: [
      { role: 'system', content: 'You are RedHydra AI, a browser-side security assistant. Give direct, useful, safe, non-template answers.' },
      { role: 'user', content: prompt },
    ],
    temperature: mode === 'quick' ? 0.25 : 0.45,
    max_tokens: mode === 'quick' ? 650 : mode === 'deep' ? 1100 : 1500,
  });
  return completion?.choices?.[0]?.message?.content?.trim() || '';
}

async function rememberInteraction(req: LiveAgentRequest, response: string, provider: LiveAgentProvider) {
  try {
    const existing = await secureGetJSON<any[]>(STORE_KEY, []);
    const next = [{ input: req.input.slice(0, 1000), response: response.slice(0, 1400), persona: req.persona, provider, at: Date.now() }, ...existing].slice(0, 40);
    await secureSetJSON(STORE_KEY, next);
  } catch {
    // Local storage can be disabled. The app must keep working without memory.
  }
}

export function clearAgentMemory() {
  secureRemove(STORE_KEY);
}

export async function askLiveAgent(req: LiveAgentRequest): Promise<LiveAgentResponse> {
  const { context: toolContext, sources: toolSources } = localToolContext(req.input);
  const thinkingChain = buildReasoningSummary(req, Boolean(toolContext));

  if (isLikelyUnsafeCyber(req.input)) {
    const safe = fallbackDirectAnswer(req, toolSources);
    await rememberInteraction(req, safe.content, safe.provider);
    return safe;
  }

  const prompt = buildPrompt(req, toolContext);

  try {
    const llmText = await askWebLLM(prompt, req.thinkMode);
    if (llmText && llmText.length > 20) {
      const note = req.webSearch ? `\n\n---\n**Note:** This frontend-only GitHub Pages build cannot perform private backend web search. The answer above used the local browser model and RedHydra local context, not fabricated live web data.` : '';
      const response = `${llmText}${note}`;
      await rememberInteraction(req, response, 'webllm');
      return { content: response, thinkingChain, sources: Array.from(new Set([...toolSources, 'Open-source WebLLM local model', activeModel])), provider: 'webllm', model: activeModel };
    }
  } catch (error: any) {
    emit({ lastError: error?.message || String(error), loading: false });
  }

  try {
    if (await hasBrowserBuiltInAI()) {
      const text = await askBrowserBuiltIn(prompt);
      if (text && text.length > 20) {
        await rememberInteraction(req, text, 'browser');
        return { content: text, thinkingChain, sources: Array.from(new Set([...toolSources, 'Browser built-in AI'])), provider: 'browser', model: 'Browser built-in AI' };
      }
    }
  } catch (error: any) {
    emit({ lastError: error?.message || String(error), loading: false });
  }

  const fallback = fallbackDirectAnswer(req, toolSources);
  await rememberInteraction(req, fallback.content, fallback.provider);
  return fallback;
}
