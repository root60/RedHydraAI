import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Activity,
  AlertTriangle,
  Bot,
  BookOpen,
  Brain,
  CheckCircle2,
  ChevronRight,
  Code2,
  Copy,
  Database,
  Download,
  Eye,
  FileText,
  Flame,
  Globe2,
  KeyRound,
  Loader2,
  Lock,
  Menu,
  MessageSquare,
  Radar,
  RotateCcw,
  Search,
  Send,
  Settings,
  Shield,
  Sparkles,
  Terminal,
  Trash2,
  User,
  Wrench,
  X,
  Zap,
} from 'lucide-react';

type Tab = 'chat' | 'tools' | 'analyzer' | 'intel' | 'training' | 'research' | 'data' | 'settings';
type Mode = 'chat' | 'agent';
type Persona = 'defender' | 'secure-code' | 'threat-intel' | 'trainer' | 'lab';
type Provider = 'local' | 'openai-compatible' | 'ollama' | 'webllm';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  mode?: Mode;
  persona?: Persona;
  sources?: string[];
  createdAt: number;
};

type ProviderConfig = {
  provider: Provider;
  endpoint: string;
  model: string;
  apiKey: string;
  webSearch: boolean;
  encryptedMemory: boolean;
};

type Finding = {
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  title: string;
  evidence: string;
  fix: string;
};

type TrainingModule = {
  id: string;
  title: string;
  level: string;
  lessons: string;
  description: string;
  outcomes: string[];
  practice: string;
};

const APP_VERSION = '3.1.0';
const STORAGE_CONFIG = 'redhydra.config.v3';
const STORAGE_MESSAGES = 'redhydra.messages.v3';
const STORAGE_PROGRESS = 'redhydra.training.progress.v3';

const defaultConfig: ProviderConfig = {
  provider: 'local',
  endpoint: 'https://api.openai.com/v1/chat/completions',
  model: 'gpt-4o-mini',
  apiKey: '',
  webSearch: true,
  encryptedMemory: true,
};

const personaInfo: Record<Persona, { label: string; short: string; icon: ReactNode; description: string }> = {
  defender: {
    label: 'Defensive Security',
    short: 'Defender',
    icon: <Shield size={14} />,
    description: 'Hardening, detection, remediation, incident response, and safe security operations.',
  },
  'secure-code': {
    label: 'Secure Code',
    short: 'Code',
    icon: <Code2 size={14} />,
    description: 'Code review, safer patterns, tests, documentation, and developer-focused fixes.',
  },
  'threat-intel': {
    label: 'Threat Intelligence',
    short: 'Intel',
    icon: <Radar size={14} />,
    description: 'CVE analysis, source-aware summaries, risk triage, and defensive strategy.',
  },
  trainer: {
    label: 'Security Trainer',
    short: 'Trainer',
    icon: <BookOpen size={14} />,
    description: 'Simple learning modules, quizzes, awareness content, and lab explanations.',
  },
  lab: {
    label: 'Authorized Lab',
    short: 'Lab',
    icon: <Terminal size={14} />,
    description: 'Controlled lab workflows, safe toy examples, validation steps, and guardrails.',
  },
};

const navGroups: Array<{ label: string; items: Array<{ id: Tab; label: string; hint: string; icon: ReactNode }> }> = [
  {
    label: 'Main Workspace',
    items: [{ id: 'chat', label: 'Chat + Agent', hint: 'Ask, plan, generate', icon: <MessageSquare size={17} /> }],
  },
  {
    label: 'Build & Analyze',
    items: [
      { id: 'tools', label: 'Tool Builder', hint: 'Defensive scripts', icon: <Wrench size={17} /> },
      { id: 'analyzer', label: 'Code Analyzer', hint: 'Find risky patterns', icon: <Code2 size={17} /> },
    ],
  },
  {
    label: 'Knowledge',
    items: [
      { id: 'intel', label: 'Threat Intel', hint: 'CVE lookup', icon: <Radar size={17} /> },
      { id: 'training', label: 'Training Hub', hint: 'Guided lessons', icon: <BookOpen size={17} /> },
      { id: 'research', label: 'Deep Research', hint: 'Source notes', icon: <Search size={17} /> },
    ],
  },
  {
    label: 'Workspace',
    items: [
      { id: 'data', label: 'Data Lab', hint: 'CSV insights', icon: <Database size={17} /> },
      { id: 'settings', label: 'Settings', hint: 'AI providers', icon: <Settings size={17} /> },
    ],
  },
];

const allTabs = navGroups.flatMap((group) => group.items);
const tabTitles: Record<Tab, string> = Object.fromEntries(allTabs.map((item) => [item.id, item.label])) as Record<Tab, string>;

const quickPrompts = [
  'Create a Python security header checker for my own website.',
  'Analyze this code for SQL injection and XSS risks.',
  'Explain CVE-2024-3094 and give defensive actions.',
  'Teach me API authentication security with examples.',
  'Build an incident response checklist for ransomware.',
  'Create a lab-only port scanner with safe usage notes.',
];

const taskLaunchers: Array<{ title: string; prompt: string; icon: ReactNode; tone: string }> = [
  {
    title: 'Generate a tool',
    prompt: 'Create a Python security header checker for my own website with tests and documentation.',
    icon: <Wrench size={18} />,
    tone: 'from-red-500/30 to-orange-500/10',
  },
  {
    title: 'Analyze code',
    prompt: 'Review this code for common web security issues and explain the fixes step by step.',
    icon: <Code2 size={18} />,
    tone: 'from-cyan-500/25 to-blue-500/10',
  },
  {
    title: 'Threat triage',
    prompt: 'Explain CVE-2024-3094, likely impact, affected assets, detection ideas, and remediation actions.',
    icon: <Radar size={18} />,
    tone: 'from-amber-500/25 to-red-500/10',
  },
  {
    title: 'Training lesson',
    prompt: 'Teach me SQL injection defense with a simple example, fixed code, checklist, and mini quiz.',
    icon: <BookOpen size={18} />,
    tone: 'from-emerald-500/25 to-lime-500/10',
  },
];

const trainingModules: TrainingModule[] = [
  {
    id: 'owasp',
    title: 'OWASP Top 10 Essentials',
    level: 'Beginner',
    lessons: '8 lessons',
    description: 'Learn the major web application risk classes with prevention checklists and practice questions.',
    outcomes: ['Recognize common web risks', 'Map risks to secure coding fixes', 'Build basic review checklists'],
    practice: 'Review a login form and identify three possible risk areas before writing mitigations.',
  },
  {
    id: 'secure-code',
    title: 'Secure Coding Workflow',
    level: 'Professional',
    lessons: '6 lessons',
    description: 'Review input handling, authentication, dependency hygiene, secrets management, and testing.',
    outcomes: ['Design safer input validation', 'Avoid secret leakage', 'Add security test cases'],
    practice: 'Turn a risky API endpoint into a safer endpoint with validation, authorization, logging, and tests.',
  },
  {
    id: 'intel',
    title: 'Threat Intel Triage',
    level: 'Analyst',
    lessons: '5 lessons',
    description: 'Turn CVE and advisory data into prioritized defensive actions, detections, and reports.',
    outcomes: ['Summarize CVE impact', 'Prioritize patch actions', 'Write executive and technical summaries'],
    practice: 'Choose a CVE, identify exposed assets, then write a 24-hour remediation plan.',
  },
  {
    id: 'opsec',
    title: 'OPSEC and Privacy',
    level: 'All users',
    lessons: '4 lessons',
    description: 'Avoid leaking secrets, tokens, customer data, metadata, or operational details during analysis.',
    outcomes: ['Sanitize sensitive data', 'Use local-only workflows', 'Understand browser storage risks'],
    practice: 'Prepare a sanitized code snippet for review by removing secrets, private IPs, and customer data.',
  },
];

const starterCode = `// Paste code here for local pattern analysis
app.get('/user', (req, res) => {
  const q = "SELECT * FROM users WHERE name='" + req.query.name + "'";
  db.query(q, (err, rows) => {
    res.send('<div>' + rows[0].bio + '</div>');
  });
});`;

function makeId(prefix = 'id') {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function cls(...values: Array<string | false | undefined | null>) {
  return values.filter(Boolean).join(' ');
}

function loadConfig(): ProviderConfig {
  try {
    const modern = localStorage.getItem(STORAGE_CONFIG);
    const legacy = localStorage.getItem('redhydra.config');
    const raw = modern || legacy;
    return raw ? { ...defaultConfig, ...JSON.parse(raw) } : defaultConfig;
  } catch {
    return defaultConfig;
  }
}

function saveConfig(config: ProviderConfig) {
  localStorage.setItem(STORAGE_CONFIG, JSON.stringify(config));
}

function initialMessages(): Message[] {
  return [
    {
      id: 'welcome',
      role: 'assistant',
      mode: 'chat',
      persona: 'defender',
      createdAt: Date.now(),
      sources: ['Built-in defensive security knowledge base'],
      content:
        '## Welcome to RedHydra AI\n\nThis workspace opens directly into **Chat + Agent**, so you can ask for security guidance, defensive scripts, code review, CVE triage, training content, OPSEC checklists, or lab-safe simulations immediately.\n\n**How it works:** use the built-in local guided assistant now, connect an optional API provider for stronger model responses, or use local Ollama when you want private local inference. The app is GitHub Pages friendly and does not pretend to have hidden backend powers.',
    },
  ];
}

function loadMessages(): Message[] {
  try {
    const modern = localStorage.getItem(STORAGE_MESSAGES);
    const legacy = localStorage.getItem('redhydra.messages');
    const raw = modern || legacy;
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore malformed storage
  }
  return initialMessages();
}

function saveMessages(messages: Message[]) {
  localStorage.setItem(STORAGE_MESSAGES, JSON.stringify(messages.slice(-50)));
}

function loadTrainingProgress(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_PROGRESS) || '{}');
  } catch {
    return {};
  }
}

function saveTrainingProgress(progress: Record<string, boolean>) {
  localStorage.setItem(STORAGE_PROGRESS, JSON.stringify(progress));
}

function copyText(text: string) {
  navigator.clipboard?.writeText(text).catch(() => undefined);
}

function downloadFile(name: string, text: string, type = 'text/plain') {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function extractCves(text: string) {
  return Array.from(new Set(text.toUpperCase().match(/CVE-\d{4}-\d{4,7}/g) || []));
}

function isUnsafeRequest(input: string) {
  const lower = input.toLowerCase();
  const dangerous = [
    'steal cookies',
    'steal password',
    'credential theft',
    'keylogger',
    'ransomware payload',
    'worm',
    'botnet',
    'persistence',
    'bypass antivirus',
    'bypass edr',
    'disable defender',
    'exfiltrate',
    'payload that destroys',
    'backdoor',
    'malware',
    'phishing kit',
    'unauthorized',
  ];
  return dangerous.some((term) => lower.includes(term));
}

function detectIntent(input: string) {
  const lower = input.toLowerCase();
  if (extractCves(input).length) return 'CVE analysis';
  if (lower.includes('generate') || lower.includes('create') || lower.includes('build') || lower.includes('script') || lower.includes('tool')) return 'Tool generation';
  if (lower.includes('analyze') || lower.includes('review') || lower.includes('code') || lower.includes('vulnerability')) return 'Code/security analysis';
  if (lower.includes('teach') || lower.includes('learn') || lower.includes('training') || lower.includes('explain')) return 'Training guidance';
  if (lower.includes('threat') || lower.includes('ioc') || lower.includes('apt') || lower.includes('intel')) return 'Threat intelligence';
  if (lower.includes('opsec') || lower.includes('privacy') || lower.includes('secret') || lower.includes('token')) return 'OPSEC/privacy';
  return 'General security guidance';
}

function systemPrompt(persona: Persona, mode: Mode) {
  const base = `You are RedHydra AI, an open-source defensive cybersecurity assistant. You help with security learning, defensive automation, secure coding, vulnerability analysis, threat intelligence, OPSEC, report writing, and controlled lab training. Keep answers practical and accurate. Do not claim impossible capabilities. Clearly separate verified facts from assumptions. Refuse harmful requests involving credential theft, malware, stealth, persistence, unauthorized exploitation, bypassing controls, destructive payloads, or exfiltration. Offer defensive alternatives.`;
  const format =
    mode === 'agent'
      ? ' For agent tasks, respond using: Goal, Safe Assumption, Plan, Output, Testing, Limitations, Next Step.'
      : ' For chat, respond naturally with clear steps, safe assumptions, and useful examples.';
  return `${base}${format} Current persona: ${personaInfo[persona].label} — ${personaInfo[persona].description}`;
}

async function callOpenAICompatible(config: ProviderConfig, messages: Message[], persona: Persona, mode: Mode, userText: string) {
  const conversation = [
    { role: 'system', content: systemPrompt(persona, mode) },
    ...messages.slice(-10).map((m) => ({ role: m.role, content: m.content })),
    { role: 'user', content: userText },
  ];

  const response = await fetch(config.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
    },
    body: JSON.stringify({ model: config.model, messages: conversation, temperature: 0.35 }),
  });

  if (!response.ok) throw new Error(`Provider returned ${response.status}`);
  const json = await response.json();
  return json?.choices?.[0]?.message?.content || 'The configured model returned an empty response.';
}

async function callOllama(config: ProviderConfig, messages: Message[], persona: Persona, mode: Mode, userText: string) {
  const endpoint = config.endpoint || 'http://localhost:11434/api/chat';
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: config.model || 'llama3.2',
      stream: false,
      messages: [
        { role: 'system', content: systemPrompt(persona, mode) },
        ...messages.slice(-10).map((m) => ({ role: m.role, content: m.content })),
        { role: 'user', content: userText },
      ],
    }),
  });

  if (!response.ok) throw new Error(`Ollama returned ${response.status}`);
  const json = await response.json();
  return json?.message?.content || 'Ollama returned an empty response.';
}

async function fetchNvd(cveId: string) {
  const response = await fetch(`https://services.nvd.nist.gov/rest/json/cves/2.0?cveId=${encodeURIComponent(cveId)}`);
  if (!response.ok) throw new Error(`NVD returned ${response.status}`);
  const json = await response.json();
  const item = json?.vulnerabilities?.[0]?.cve;
  if (!item) throw new Error('No CVE record found');
  const metric = item.metrics?.cvssMetricV31?.[0]?.cvssData || item.metrics?.cvssMetricV30?.[0]?.cvssData || item.metrics?.cvssMetricV2?.[0]?.cvssData;
  return {
    id: item.id,
    published: item.published,
    lastModified: item.lastModified,
    description: item.descriptions?.find((d: { lang: string; value: string }) => d.lang === 'en')?.value || 'No English description found.',
    refs: (item.references?.referenceData || []).slice(0, 6).map((r: { url: string }) => r.url),
    metrics: metric,
  };
}

async function generateAnswer(config: ProviderConfig, messages: Message[], persona: Persona, mode: Mode, userText: string) {
  if (isUnsafeRequest(userText)) return safetyResponse(userText, mode);

  if (config.provider === 'openai-compatible') {
    if (!config.apiKey) throw new Error('Add an API key in Settings or switch to the built-in local guided assistant.');
    return callOpenAICompatible(config, messages, persona, mode, userText);
  }

  if (config.provider === 'ollama') return callOllama(config, messages, persona, mode, userText);

  if (config.provider === 'webllm') {
    return `## Browser AI status\n\nThe interface is ready for browser-side AI, but this static build does not bundle a heavy model runtime by default because it would make deployment large and device-dependent.\n\nUse one of these working modes now:\n\n1. **Built-in local guided assistant** for immediate structured security help.\n2. **Local Ollama endpoint** for private local LLM inference.\n3. **OpenAI-compatible API** with your own restricted key.\n\nI will answer this request using the built-in local guided assistant below.\n\n${await localGuidedAnswer(userText, persona, mode, config)}`;
  }

  return localGuidedAnswer(userText, persona, mode, config);
}

function safetyResponse(input: string, mode: Mode) {
  const format = mode === 'agent' ? '## Goal\n\nHandle a risky security request safely.\n\n' : '';
  return `${format}## I can’t help with that as requested\n\nYour request appears to involve malware, credential theft, stealth, persistence, unauthorized access, bypassing controls, destructive behavior, or exfiltration. I can’t generate instructions or code for that.\n\n## Safe alternatives\n\n- Build a defensive detection rule for the behavior.\n- Create an incident response checklist.\n- Write a hardening script for owned systems.\n- Explain the risk at a high level for training.\n- Create a lab-safe toy example that cannot be used against real systems.\n\n## Useful next prompt\n\n“Create a defensive detection and response checklist for this threat, including logs to monitor and containment steps.”\n\n## Input category\n\n${detectIntent(input)}`;
}

async function localGuidedAnswer(input: string, persona: Persona, mode: Mode, config: ProviderConfig) {
  const intent = detectIntent(input);
  const cves = extractCves(input);
  if (config.webSearch && cves.length) {
    try {
      const cve = await fetchNvd(cves[0]);
      return cveAdvisor(cves, `**${cve.id}**\n\nPublished: ${cve.published}\nLast modified: ${cve.lastModified}\nSeverity: ${cve.metrics?.baseSeverity || 'not available'} ${cve.metrics?.baseScore ? `(${cve.metrics.baseScore})` : ''}\n\n${cve.description}\n\nReferences:\n${cve.refs.map((r: string) => `- ${r}`).join('\n')}`);
    } catch (error) {
      return cveAdvisor(cves, `Public CVE lookup failed: ${error instanceof Error ? error.message : 'unknown error'}. Verify with NVD and vendor advisories.`);
    }
  }

  if (intent === 'Tool generation') return toolAdvisor(input, mode);
  if (intent === 'Code/security analysis') return analyzerAdvisor(input, mode);
  if (intent === 'Training guidance') return trainingAdvisor(input, persona, mode);
  if (intent === 'Threat intelligence') return threatIntelAdvisor(input, mode);
  if (intent === 'OPSEC/privacy') return opsecAdvisor(input, mode);

  return generalAdvisor(input, persona, mode);
}

function responseFrame(mode: Mode, title: string, body: string) {
  if (mode !== 'agent') return body;
  return `## Goal\n\n${title}\n\n${body}`;
}

function toolAdvisor(input: string, mode: Mode) {
  const lower = input.toLowerCase();
  const wantsHeaders = lower.includes('header') || lower.includes('website');
  const wantsPort = lower.includes('port');
  const code = wantsPort ? safePortScannerTemplate() : wantsHeaders ? securityHeaderTemplate() : genericDefensiveToolTemplate();
  return responseFrame(
    mode,
    'Generate a safe defensive security tool for owned or authorized systems.',
    `## Safe Assumption\n\nThis tool is intended only for systems you own or have permission to assess.\n\n## Recommended Approach\n\n1. Keep the scanner non-destructive.\n2. Add clear usage instructions.\n3. Include timeouts and error handling.\n4. Print findings with remediation hints.\n5. Test it in a local or authorized environment first.\n\n## Generated Output\n\n${code}\n\n## Testing\n\n- Run the tool against a local test service or your own domain.\n- Review the output manually before using it in a report.\n- Do not use it for unauthorized scanning.\n\n## Limitations\n\nThis is a lightweight helper, not a full vulnerability scanner or proof of compliance.\n\n## Next Step\n\nPaste your exact requirements if you want the script customized for Python, Bash, PowerShell, Go, or TypeScript.`
  );
}

function securityHeaderTemplate() {
  return '```python\n#!/usr/bin/env python3\n"""\nRedHydra AI - Security Header Checker\nPurpose: Check common defensive HTTP security headers on an owned/authorized website.\nUsage: python security_headers.py https://example.com\n"""\nimport sys\nimport requests\n\nREQUIRED_HEADERS = {\n    "content-security-policy": "Helps reduce XSS impact by controlling script/content sources.",\n    "strict-transport-security": "Forces HTTPS in supported browsers after first secure visit.",\n    "x-content-type-options": "Use nosniff to reduce MIME confusion risks.",\n    "x-frame-options": "Helps reduce clickjacking risk. CSP frame-ancestors is preferred for modern apps.",\n    "referrer-policy": "Limits sensitive URL data leakage through the Referer header.",\n    "permissions-policy": "Restricts browser features such as camera, microphone, and geolocation."\n}\n\ndef check_headers(url: str) -> int:\n    try:\n        response = requests.get(url, timeout=10, allow_redirects=True)\n    except requests.RequestException as exc:\n        print(f"[ERROR] Could not reach target: {exc}")\n        return 2\n\n    headers = {k.lower(): v for k, v in response.headers.items()}\n    print(f"Target: {response.url}")\n    print(f"Status: {response.status_code}\\n")\n\n    missing = []\n    for header, reason in REQUIRED_HEADERS.items():\n        if header in headers:\n            print(f"[OK] {header}: {headers[header]}")\n        else:\n            print(f"[MISSING] {header} - {reason}")\n            missing.append(header)\n\n    print("\\nSummary:")\n    if missing:\n        print(f"Missing {len(missing)} recommended header(s): {\', \'.join(missing)}")\n        return 1\n    print("All checked headers are present. Review values manually for correctness.")\n    return 0\n\nif __name__ == "__main__":\n    if len(sys.argv) != 2 or not sys.argv[1].startswith(("http://", "https://")):\n        print("Usage: python security_headers.py https://example.com")\n        sys.exit(2)\n    sys.exit(check_headers(sys.argv[1]))\n```';
}

function safePortScannerTemplate() {
  return '```python\n#!/usr/bin/env python3\n"""\nRedHydra AI - Lab-Safe TCP Port Checker\nPurpose: Check selected TCP ports on owned/local systems.\nUsage: python port_check.py 127.0.0.1 22,80,443\n"""\nimport socket\nimport sys\n\ndef check_port(host: str, port: int, timeout: float = 1.0) -> bool:\n    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:\n        s.settimeout(timeout)\n        return s.connect_ex((host, port)) == 0\n\ndef main():\n    if len(sys.argv) != 3:\n        print("Usage: python port_check.py 127.0.0.1 22,80,443")\n        return 2\n    host = sys.argv[1]\n    ports = [int(p.strip()) for p in sys.argv[2].split(",") if p.strip().isdigit()]\n    if not ports or len(ports) > 50:\n        print("Provide 1-50 comma-separated ports for an authorized host.")\n        return 2\n    for port in ports:\n        status = "open" if check_port(host, port) else "closed/filtered"\n        print(f"{host}:{port} -> {status}")\n    return 0\n\nif __name__ == "__main__":\n    raise SystemExit(main())\n```';
}

function genericDefensiveToolTemplate() {
  return '```python\n#!/usr/bin/env python3\n"""\nRedHydra AI - Defensive Security Checklist Generator\nPurpose: Produce a simple hardening checklist for an owned system.\n"""\nCHECKS = [\n    "Apply current security updates",\n    "Disable unused services",\n    "Use strong authentication and MFA where possible",\n    "Remove default credentials",\n    "Restrict admin interfaces to trusted networks",\n    "Enable logging and alerting",\n    "Back up critical data and test restoration",\n]\n\nfor index, check in enumerate(CHECKS, 1):\n    print(f"{index}. [ ] {check}")\n```';
}

function analyzerAdvisor(input: string, mode: Mode) {
  const findings = analyzeCode(input);
  const findingsText = findings.length
    ? findings.map((f) => `### ${f.severity}: ${f.title}\n\n**Evidence:** ${f.evidence}\n\n**Fix:** ${f.fix}`).join('\n\n')
    : 'No obvious high-risk pattern was detected in the provided text. This does not prove the code is secure.';
  return responseFrame(
    mode,
    'Analyze code or configuration for common defensive security concerns.',
    `## Safe Assumption\n\nThe code/configuration belongs to you or you are authorized to review it.\n\n## Findings\n\n${findingsText}\n\n## Recommended Approach\n\n1. Confirm whether the risky pattern is reachable in production.\n2. Add unit and integration tests around the fix.\n3. Use dependency scanning and secret scanning.\n4. Run a peer review before deployment.\n\n## Testing\n\nCreate a safe test case that proves the vulnerability is fixed without attacking a real system.\n\n## Limitations\n\nThis browser analyzer uses pattern-based checks. For stronger results, combine it with SAST, dependency scanning, manual review, and runtime testing.`
  );
}

function cveAdvisor(cves: string[], data: string) {
  return `## CVE Analysis\n\n### Identified CVE\n\n${cves.join(', ') || 'No CVE ID detected'}\n\n### Public data\n\n${data}\n\n### Defensive triage\n\n1. Confirm whether affected software exists in your asset inventory.\n2. Check the vendor advisory and official patch notes.\n3. Prioritize internet-facing and privileged systems first.\n4. Apply patches or mitigations in a tested change window.\n5. Monitor logs for related indicators after remediation.\n\n### Report note\n\nCVE data can be delayed or incomplete. Treat this as a starting point and verify with vendor advisories before making risk decisions.`;
}

function trainingAdvisor(input: string, persona: Persona, mode: Mode) {
  return responseFrame(
    mode,
    'Create a practical security learning path.',
    `## Lesson: ${input.toLowerCase().includes('sql') ? 'SQL Injection Defense' : personaInfo[persona].label}\n\n### Simple explanation\n\nA security weakness becomes dangerous when untrusted input reaches sensitive code without validation, authorization, safe APIs, or monitoring. Defensive security means reducing that path and proving the control works.\n\n### Real-world defensive pattern\n\n- Validate inputs near the boundary.\n- Use safe APIs such as parameterized queries.\n- Apply least privilege.\n- Log useful security events without storing secrets.\n- Test both normal and malicious-looking input safely.\n\n### Safe fixed example\n\n\`\`\`python\n# Parameterized query example\ncursor.execute("SELECT id, name FROM users WHERE name = %s", (user_input,))\n\`\`\`\n\n### Checklist\n\n- [ ] Is input validated and normalized?\n- [ ] Is authorization checked server-side?\n- [ ] Are secrets removed from logs and error messages?\n- [ ] Are dependencies updated?\n- [ ] Are security tests included?\n\n### Mini quiz\n\n1. Why are parameterized queries safer than string concatenation?\n2. What should not be logged during authentication?\n3. Why does least privilege reduce impact?\n\n### Practice task\n\nTake one endpoint in a test project and write a before/after security review note.`
  );
}

function threatIntelAdvisor(input: string, mode: Mode) {
  return responseFrame(
    mode,
    'Convert threat information into defensive action.',
    `## Analysis focus\n\n${input}\n\n## Structured triage\n\n| Area | What to check |\n| --- | --- |\n| Assets | Which systems, versions, accounts, and exposed services are relevant? |\n| Exposure | Is it internet-facing, privileged, business-critical, or internally reachable? |\n| Evidence | Is there a vendor advisory, CVE, exploit report, or observed incident? |\n| Action | Patch, disable feature, isolate asset, add detection, or improve monitoring. |\n\n## Defensive actions\n\n1. Create an asset list.\n2. Match versions and configurations.\n3. Apply vendor guidance.\n4. Add detection logic where possible.\n5. Document residual risk.\n\n## Confidence\n\nMedium until verified with official vendor advisories, asset inventory, and logs.`
  );
}

function opsecAdvisor(input: string, mode: Mode) {
  return responseFrame(
    mode,
    'Create a privacy-aware security workflow.',
    `## OPSEC checklist\n\n- [ ] Remove API keys, passwords, tokens, private keys, and session cookies before analysis.\n- [ ] Replace customer names, emails, IPs, and hostnames with safe placeholders.\n- [ ] Avoid pasting production logs unless sanitized.\n- [ ] Use local Ollama or local-only mode for sensitive code.\n- [ ] Keep browser-stored settings minimal.\n- [ ] Review generated code before running it.\n- [ ] Run tools only on systems you own or are authorized to test.\n\n## Privacy note\n\nOn GitHub Pages, there is no private backend. Any API key entered in the browser is handled client-side, so use restricted keys only.`
  );
}

function generalAdvisor(input: string, persona: Persona, mode: Mode) {
  return responseFrame(
    mode,
    'Provide practical cybersecurity guidance.',
    `## Understanding\n\nYou asked: “${input}”\n\n## Recommended next steps\n\n1. Define the asset, environment, and authorization scope.\n2. Decide whether you need learning, code review, CVE triage, tool generation, or report writing.\n3. Use the matching workspace from the left navigation.\n4. Keep sensitive values out of chat unless you are using a local-only model.\n\n## Useful prompt examples\n\n- “Generate a defensive script to check HTTP security headers.”\n- “Analyze this code for authentication and input validation issues.”\n- “Create an incident response checklist for a suspected credential leak.”\n- “Teach me API security with examples and a mini quiz.”\n\n## Current mode\n\n${personaInfo[persona].label}. I will keep responses defensive, practical, and scoped to authorized systems.`
  );
}

function analyzeCode(code: string): Finding[] {
  const checks: Array<{ severity: Finding['severity']; title: string; regex: RegExp; fix: string }> = [
    { severity: 'High', title: 'Possible SQL query concatenation', regex: /(select|insert|update|delete).*\+|\+.*(select|insert|update|delete)/i, fix: 'Use parameterized queries or a safe query builder. Never concatenate untrusted input into SQL.' },
    { severity: 'High', title: 'Potential XSS through direct HTML injection', regex: /innerHTML|dangerouslySetInnerHTML|document\.write|res\.send\([^)]*\+/i, fix: 'Escape output, use safe templating, and avoid inserting untrusted data as HTML.' },
    { severity: 'High', title: 'TLS verification appears disabled', regex: /rejectUnauthorized\s*:\s*false|verify\s*=\s*False|NODE_TLS_REJECT_UNAUTHORIZED\s*=\s*['"]?0/i, fix: 'Keep TLS certificate verification enabled. Use trusted certificates for development and production.' },
    { severity: 'Medium', title: 'Possible hardcoded secret', regex: /(api[_-]?key|secret|password|token)\s*[:=]\s*['"][^'"]{8,}/i, fix: 'Move secrets to environment variables or a secret manager. Rotate exposed credentials.' },
    { severity: 'Medium', title: 'Unsafe eval-like execution', regex: /\beval\s*\(|new Function\s*\(|exec\s*\(|child_process/i, fix: 'Avoid dynamic execution. Use strict parsing and allow-lists where possible.' },
    { severity: 'Low', title: 'Weak hash algorithm mentioned', regex: /\b(md5|sha1)\b/i, fix: 'Use modern password hashing such as Argon2id/bcrypt/scrypt. For integrity, use SHA-256 or stronger as appropriate.' },
    { severity: 'Low', title: 'Wildcard CORS pattern', regex: /access-control-allow-origin.*\*|origin\s*:\s*['"]\*/i, fix: 'Restrict CORS to known trusted origins and review credentialed requests carefully.' },
  ];

  return checks
    .filter((check) => check.regex.test(code))
    .map((check) => ({
      severity: check.severity,
      title: check.title,
      evidence: `Matched pattern: ${check.regex.source}`,
      fix: check.fix,
    }));
}

function parseCsv(text: string) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  const headers = lines[0]?.split(',').map((h) => h.trim()) || [];
  const rows = lines.slice(1).map((line) => line.split(',').map((cell) => cell.trim()));
  return { headers, rows };
}

function formatMarkdown(text: string) {
  const segments = text.split(/```/g);
  return (
    <div className="space-y-3 text-sm leading-relaxed text-gray-200">
      {segments.map((segment, index) => {
        if (index % 2 === 1) {
          const lines = segment.split('\n');
          const lang = lines[0]?.trim() || 'text';
          const code = lines.slice(1).join('\n').trim();
          return <CodeBlock key={index} code={code} lang={lang} />;
        }
        return <MarkdownText key={index} text={segment} />;
      })}
    </div>
  );
}

function MarkdownText({ text }: { text: string }) {
  const lines = text.split('\n');
  const elements: ReactNode[] = [];
  let list: string[] = [];

  function flushList(keyBase: string) {
    if (!list.length) return;
    elements.push(
      <ul key={`list-${keyBase}`} className="ml-5 list-disc space-y-1 text-gray-300">
        {list.map((item, i) => <li key={i}>{inlineMarkdown(item)}</li>)}
      </ul>
    );
    list = [];
  }

  lines.forEach((raw, i) => {
    const line = raw.trim();
    if (!line) {
      flushList(String(i));
      return;
    }
    if (line.startsWith('- ') || line.startsWith('* ')) {
      list.push(line.slice(2));
      return;
    }
    if (/^\d+\.\s/.test(line)) {
      list.push(line.replace(/^\d+\.\s/, ''));
      return;
    }
    flushList(String(i));
    if (line.startsWith('### ')) elements.push(<h3 key={i} className="pt-2 text-base font-bold text-white">{inlineMarkdown(line.slice(4))}</h3>);
    else if (line.startsWith('## ')) elements.push(<h2 key={i} className="pt-2 text-lg font-black text-white">{inlineMarkdown(line.slice(3))}</h2>);
    else if (line.startsWith('# ')) elements.push(<h1 key={i} className="pt-2 text-xl font-black text-white">{inlineMarkdown(line.slice(2))}</h1>);
    else if (line.includes('|') && line.startsWith('|')) elements.push(<p key={i} className="font-mono text-xs text-gray-400">{line}</p>);
    else elements.push(<p key={i} className="text-gray-300">{inlineMarkdown(line)}</p>);
  });
  flushList('end');
  return <>{elements}</>;
}

function inlineMarkdown(text: string) {
  const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g).filter(Boolean);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={i} className="font-bold text-white">{part.slice(2, -2)}</strong>;
    if (part.startsWith('`') && part.endsWith('`')) return <code key={i} className="rounded bg-white/10 px-1.5 py-0.5 text-xs text-red-100">{part.slice(1, -1)}</code>;
    return <span key={i}>{part}</span>;
  });
}

function CodeBlock({ code, lang }: { code: string; lang: string }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#06070d] shadow-2xl shadow-black/20">
      <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.03] px-4 py-2 text-xs text-gray-400">
        <span>{lang}</span>
        <div className="flex items-center gap-2">
          <button onClick={() => copyText(code)} className="rounded-lg border border-white/10 px-2 py-1 transition hover:bg-white/10"><Copy size={13} /></button>
          <button onClick={() => downloadFile(`redhydra-output.${lang === 'python' ? 'py' : lang === 'bash' ? 'sh' : 'txt'}`, code)} className="rounded-lg border border-white/10 px-2 py-1 transition hover:bg-white/10"><Download size={13} /></button>
        </div>
      </div>
      <pre className="max-h-[460px] overflow-auto p-4 text-xs leading-relaxed text-gray-100"><code>{code}</code></pre>
    </div>
  );
}

function App() {
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    const hash = window.location.hash.replace('#', '') as Tab;
    return allTabs.some((t) => t.id === hash) ? hash : 'chat';
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [config, setConfigState] = useState<ProviderConfig>(() => loadConfig());
  const [messages, setMessages] = useState<Message[]>(() => loadMessages());
  const [mode, setMode] = useState<Mode>('agent');
  const [persona, setPersona] = useState<Persona>('defender');

  useEffect(() => saveMessages(messages), [messages]);
  useEffect(() => saveConfig(config), [config]);
  useEffect(() => {
    window.location.hash = activeTab;
    setMobileOpen(false);
  }, [activeTab]);

  function setConfig(configUpdate: ProviderConfig) {
    setConfigState(configUpdate);
  }

  return (
    <div className="min-h-screen overflow-hidden bg-[#040407] text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-red-600/20 blur-3xl" />
        <div className="absolute right-0 top-1/4 h-80 w-80 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-purple-600/10 blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:42px_42px] [mask-image:radial-gradient(circle_at_center,black,transparent_75%)]" />
      </div>

      <div className="relative z-10 flex min-h-screen">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} config={config} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
        <div className="flex min-w-0 flex-1 flex-col lg:pl-[304px]">
          <Topbar activeTab={activeTab} setMobileOpen={setMobileOpen} config={config} messages={messages} setMessages={setMessages} />
          <main className="mx-auto w-full max-w-[1480px] flex-1 p-3 sm:p-4 lg:p-5">
            {activeTab === 'chat' && (
              <ChatWorkspace
                messages={messages}
                setMessages={setMessages}
                config={config}
                mode={mode}
                setMode={setMode}
                persona={persona}
                setPersona={setPersona}
                setActiveTab={setActiveTab}
              />
            )}
            {activeTab === 'tools' && <ToolBuilder />}
            {activeTab === 'analyzer' && <CodeAnalyzerPanel />}
            {activeTab === 'intel' && <ThreatIntelPanel />}
            {activeTab === 'training' && <TrainingPanel />}
            {activeTab === 'research' && <ResearchPanel />}
            {activeTab === 'data' && <DataLab />}
            {activeTab === 'settings' && <SettingsPanel config={config} setConfig={setConfig} />}
          </main>
        </div>
      </div>
    </div>
  );
}

function Sidebar({ activeTab, setActiveTab, config, mobileOpen, setMobileOpen }: { activeTab: Tab; setActiveTab: (tab: Tab) => void; config: ProviderConfig; mobileOpen: boolean; setMobileOpen: (open: boolean) => void }) {
  const body = (
    <aside className="flex h-full flex-col border-r border-white/10 bg-black/40 p-4 backdrop-blur-2xl">
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-red-500/30 bg-gradient-to-br from-red-600/30 to-black shadow-lg shadow-red-950/30">
            <Flame className="text-red-300" size={24} />
            <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-emerald-400 shadow-[0_0_18px_rgba(52,211,153,0.9)]" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight">RedHydra AI</h1>
            <p className="text-xs text-gray-500">Chat + Agent first</p>
          </div>
        </div>
        <button onClick={() => setMobileOpen(false)} className="rounded-xl border border-white/10 p-2 lg:hidden"><X size={17} /></button>
      </div>

      <div className="mb-4 rounded-3xl border border-red-500/20 bg-gradient-to-br from-red-500/10 via-white/[0.03] to-cyan-500/10 p-4">
        <div className="flex items-center gap-2 text-sm font-bold text-red-100"><Sparkles size={16} /> Mission Control</div>
        <p className="mt-2 text-xs leading-relaxed text-gray-400">Start with the assistant, then route work into tools, CVE triage, training, research, or data analysis.</p>
        <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
          <StatusPill tone="red">Defensive</StatusPill>
          <StatusPill tone="cyan">GitHub Pages</StatusPill>
        </div>
      </div>

      <nav className="min-h-0 flex-1 overflow-auto pr-1">
        {navGroups.map((group) => (
          <div key={group.label} className="mb-5">
            <div className="mb-2 px-2 text-[11px] font-bold uppercase tracking-[0.18em] text-gray-600">{group.label}</div>
            <div className="space-y-1.5">
              {group.items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={cls(
                    'group flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition duration-200',
                    activeTab === item.id
                      ? 'border-red-500/30 bg-red-500/15 text-white shadow-lg shadow-red-950/20'
                      : 'border-transparent text-gray-400 hover:border-white/10 hover:bg-white/[0.04] hover:text-white'
                  )}
                >
                  <span className={cls('flex h-9 w-9 items-center justify-center rounded-xl border transition', activeTab === item.id ? 'border-red-400/30 bg-black/30 text-red-200' : 'border-white/10 bg-white/[0.03] text-gray-400 group-hover:text-white')}>{item.icon}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">{item.label}</span>
                    <span className="block truncate text-xs text-gray-500">{item.hint}</span>
                  </span>
                  {activeTab === item.id && <ChevronRight size={16} className="text-red-300" />}
                </button>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="mt-4 rounded-3xl border border-white/10 bg-white/[0.03] p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs text-gray-500">AI Provider</div>
          <StatusPill tone={config.provider === 'local' ? 'green' : 'cyan'}>{config.provider}</StatusPill>
        </div>
        <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-white"><Bot size={15} /> {config.model || 'local-guided'}</div>
        <p className="mt-2 text-xs leading-relaxed text-gray-500">API keys are client-side on GitHub Pages. Use restricted keys only.</p>
      </div>
    </aside>
  );

  return (
    <>
      <div className="fixed inset-y-0 left-0 z-40 hidden w-[304px] lg:block">{body}</div>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-[86vw] max-w-[340px]">{body}</div>
        </div>
      )}
    </>
  );
}

function Topbar({ activeTab, setMobileOpen, config, messages, setMessages }: { activeTab: Tab; setMobileOpen: (open: boolean) => void; config: ProviderConfig; messages: Message[]; setMessages: (messages: Message[]) => void }) {
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-[#050508]/80 backdrop-blur-2xl">
      <div className="mx-auto flex h-16 w-full max-w-[1480px] items-center justify-between gap-3 px-3 sm:px-4 lg:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <button onClick={() => setMobileOpen(true)} className="rounded-2xl border border-white/10 bg-white/[0.03] p-2 lg:hidden"><Menu size={18} /></button>
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.2em] text-gray-600">Current Workspace</p>
            <h2 className="truncate text-base font-black sm:text-lg">{tabTitles[activeTab]}</h2>
          </div>
        </div>
        <div className="hidden items-center gap-2 md:flex">
          <StatusPill tone="green"><Activity size={12} /> Stable UI</StatusPill>
          <StatusPill tone="red"><Shield size={12} /> Defensive mode</StatusPill>
          <StatusPill tone="cyan"><Brain size={12} /> {config.provider}</StatusPill>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => downloadFile('redhydra-chat-export.md', messages.map((m) => `## ${m.role.toUpperCase()}\n\n${m.content}`).join('\n\n---\n\n'), 'text/markdown')} className="hidden rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-semibold text-gray-300 transition hover:bg-white/10 sm:flex sm:items-center sm:gap-2"><Download size={14} /> Export</button>
          <button onClick={() => setMessages(initialMessages())} className="rounded-2xl border border-white/10 bg-white/[0.03] p-2 text-gray-300 transition hover:bg-white/10" title="Reset chat"><RotateCcw size={16} /></button>
        </div>
      </div>
    </header>
  );
}

function ChatWorkspace({ messages, setMessages, config, mode, setMode, persona, setPersona, setActiveTab }: { messages: Message[]; setMessages: (messages: Message[]) => void; config: ProviderConfig; mode: Mode; setMode: (mode: Mode) => void; persona: Persona; setPersona: (persona: Persona) => void; setActiveTab: (tab: Tab) => void }) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesRef = useRef<HTMLDivElement | null>(null);
  const detectedIntent = useMemo(() => detectIntent(input || messages[messages.length - 1]?.content || ''), [input, messages]);

  useEffect(() => {
    messagesRef.current?.scrollTo({ top: messagesRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  async function submit(text = input) {
    const clean = text.trim();
    if (!clean || loading) return;
    setInput('');
    const userMessage: Message = { id: makeId('user'), role: 'user', content: clean, mode, persona, createdAt: Date.now() };
    const updated = [...messages, userMessage];
    setMessages(updated);
    setLoading(true);
    try {
      const answer = await generateAnswer(config, updated, persona, mode, clean);
      const assistantMessage: Message = {
        id: makeId('assistant'),
        role: 'assistant',
        content: answer,
        mode,
        persona,
        createdAt: Date.now(),
        sources: config.provider === 'local' ? ['Built-in local guided assistant', ...(extractCves(clean).length ? ['NVD public CVE API when available'] : [])] : [config.provider],
      };
      setMessages([...updated, assistantMessage]);
    } catch (error) {
      setMessages([
        ...updated,
        {
          id: makeId('error'),
          role: 'assistant',
          content: `## Provider error\n\n${error instanceof Error ? error.message : 'Unknown error'}\n\nSwitch to **Built-in local guided assistant** in Settings, check your endpoint/API key, or use local Ollama if available.`,
          mode,
          persona,
          createdAt: Date.now(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-[calc(100vh-92px)] grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
      <section className="flex min-h-[calc(100vh-92px)] flex-col overflow-hidden rounded-[28px] border border-white/10 bg-black/35 shadow-2xl shadow-black/30 backdrop-blur-xl">
        <div className="border-b border-white/10 bg-gradient-to-r from-red-500/10 via-white/[0.03] to-cyan-500/10 p-4 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <StatusPill tone="red"><Flame size={12} /> RedHydra AI</StatusPill>
                <StatusPill tone="green"><CheckCircle2 size={12} /> Online UI</StatusPill>
                <StatusPill tone="cyan"><Bot size={12} /> {config.provider}</StatusPill>
              </div>
              <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Security Chat + Agent</h1>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-gray-400">Ask a question, generate a defensive tool, analyze code, summarize a CVE, or build a training/checklist workflow. The agent keeps output structured and safe for authorized security work.</p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4 lg:w-[420px]">
              <Metric label="Mode" value={mode === 'agent' ? 'Agent' : 'Chat'} />
              <Metric label="Persona" value={personaInfo[persona].short} />
              <Metric label="Intent" value={detectedIntent.split(' ')[0]} />
              <Metric label="Memory" value={`${messages.length}`} />
            </div>
          </div>
        </div>

        <div ref={messagesRef} className="min-h-0 flex-1 space-y-4 overflow-auto p-3 sm:p-5">
          {messages.map((message) => <MessageBubble key={message.id} message={message} />)}
          {loading && (
            <div className="flex items-center gap-3 rounded-3xl border border-white/10 bg-white/[0.03] p-4 text-sm text-gray-300">
              <Loader2 className="animate-spin text-red-300" size={18} /> RedHydra is thinking through the safest practical answer...
            </div>
          )}
        </div>

        <div className="border-t border-white/10 bg-[#07070c]/90 p-3 sm:p-4">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <ToggleButton active={mode === 'chat'} onClick={() => setMode('chat')}><MessageSquare size={14} /> Chat</ToggleButton>
            <ToggleButton active={mode === 'agent'} onClick={() => setMode('agent')}><Bot size={14} /> Agent</ToggleButton>
            {Object.entries(personaInfo).map(([key, info]) => (
              <ToggleButton key={key} active={persona === key} onClick={() => setPersona(key as Persona)}>{info.icon}{info.short}</ToggleButton>
            ))}
          </div>
          <div className="flex items-end gap-2 rounded-3xl border border-white/10 bg-black/40 p-2 focus-within:border-red-500/40">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
              placeholder="Ask RedHydra AI: generate a defensive script, analyze code, explain a CVE, create training, build a checklist..."
              className="max-h-40 min-h-[54px] flex-1 resize-none bg-transparent px-3 py-3 text-sm text-white outline-none placeholder:text-gray-600"
            />
            <button onClick={() => submit()} disabled={!input.trim() || loading} className="mb-1 flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-red-700 text-white shadow-lg shadow-red-950/40 transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-40"><Send size={18} /></button>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {quickPrompts.slice(0, 3).map((prompt) => <button key={prompt} onClick={() => submit(prompt)} className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-gray-400 transition hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-100">{prompt}</button>)}
          </div>
        </div>
      </section>

      <aside className="space-y-4 xl:sticky xl:top-20 xl:h-[calc(100vh-92px)] xl:overflow-auto">
        <Panel className="p-4">
          <div className="flex items-center gap-2 text-sm font-bold"><Sparkles size={16} className="text-red-300" /> Quick Launch</div>
          <div className="mt-3 grid gap-2">
            {taskLaunchers.map((item) => (
              <button key={item.title} onClick={() => submit(item.prompt)} className={cls('group rounded-2xl border border-white/10 bg-gradient-to-br p-3 text-left transition hover:-translate-y-0.5 hover:border-red-500/30', item.tone)}>
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-black/30 text-red-100">{item.icon}</span>
                  <span className="flex-1"><span className="block text-sm font-bold">{item.title}</span><span className="line-clamp-1 text-xs text-gray-400">{item.prompt}</span></span>
                  <ChevronRight className="text-gray-500 transition group-hover:translate-x-1 group-hover:text-red-200" size={15} />
                </div>
              </button>
            ))}
          </div>
        </Panel>

        <Panel className="p-4">
          <div className="flex items-center gap-2 text-sm font-bold"><Brain size={16} className="text-cyan-300" /> Agent Workflow</div>
          <div className="mt-4 space-y-2">
            {['Intent detection', 'Safety check', 'Task planning', 'Output generation', 'Testing notes', 'Export result'].map((step, index) => (
              <div key={step} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-red-500/15 text-xs font-bold text-red-100">{index + 1}</span>
                <span className="text-sm text-gray-300">{step}</span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel className="p-4">
          <div className="flex items-center gap-2 text-sm font-bold"><Zap size={16} className="text-amber-300" /> Jump to tools</div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {(['tools', 'analyzer', 'intel', 'training'] as Tab[]).map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-left text-xs font-semibold text-gray-300 transition hover:border-red-500/30 hover:bg-red-500/10">{tabTitles[tab]}</button>
            ))}
          </div>
        </Panel>

        <Panel className="p-4">
          <div className="flex items-center gap-2 text-sm font-bold"><Lock size={16} className="text-emerald-300" /> Trust boundary</div>
          <p className="mt-2 text-xs leading-relaxed text-gray-500">Frontend-only GitHub Pages app. Use built-in local guidance, optional API provider, or local Ollama. Do not paste secrets unless you control the runtime.</p>
        </Panel>
      </aside>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';
  return (
    <div className={cls('flex gap-3', isUser && 'justify-end')}>
      {!isUser && <Avatar icon={<Bot size={17} />} tone="red" />}
      <div className={cls('max-w-[92%] overflow-hidden rounded-[24px] border p-4 shadow-xl sm:max-w-[82%]', isUser ? 'border-cyan-500/20 bg-cyan-500/10 text-cyan-50' : 'border-white/10 bg-white/[0.035] text-gray-100')}>
        <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px] text-gray-500">
          <span className="font-bold uppercase tracking-[0.12em]">{isUser ? 'You' : 'RedHydra AI'}</span>
          {message.mode && <StatusPill tone={message.mode === 'agent' ? 'red' : 'cyan'}>{message.mode}</StatusPill>}
          {message.persona && <StatusPill tone="neutral">{personaInfo[message.persona].short}</StatusPill>}
          <button onClick={() => copyText(message.content)} className="ml-auto rounded-lg border border-white/10 px-2 py-1 transition hover:bg-white/10"><Copy size={12} /></button>
        </div>
        {isUser ? <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p> : formatMarkdown(message.content)}
        {!!message.sources?.length && (
          <div className="mt-3 flex flex-wrap gap-1.5 border-t border-white/10 pt-3">
            {message.sources.map((source) => <span key={source} className="rounded-full border border-white/10 px-2 py-1 text-[11px] text-gray-500">{source}</span>)}
          </div>
        )}
      </div>
      {isUser && <Avatar icon={<User size={17} />} tone="cyan" />}
    </div>
  );
}

function ToolBuilder() {
  const [request, setRequest] = useState('Create a Python security header checker for my own website.');
  const [language, setLanguage] = useState('Python');
  const [output, setOutput] = useState(() => toolAdvisor('Create a Python security header checker for my own website.', 'agent'));

  function build() {
    const contextual = `${request}\nPreferred language: ${language}`;
    setOutput(toolAdvisor(contextual, 'agent'));
  }

  return (
    <FeatureShell title="Tool Builder" subtitle="Generate safe defensive tools with usage notes, tests, and limitations." icon={<Wrench size={22} className="text-red-300" />}>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[430px_minmax(0,1fr)]">
        <Panel className="p-4">
          <SectionLabel icon={<Sparkles size={15} />}>Natural language command</SectionLabel>
          <textarea value={request} onChange={(e) => setRequest(e.target.value)} className="mt-3 h-44 w-full resize-none rounded-2xl border border-white/10 bg-black/40 p-4 text-sm outline-none transition focus:border-red-500/40" />
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500">Language</label>
              <select value={language} onChange={(e) => setLanguage(e.target.value)} className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none">
                {['Python', 'Bash', 'PowerShell', 'TypeScript', 'Go', 'YAML/Sigma'].map((item) => <option key={item}>{item}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500">Scope</label>
              <div className="mt-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">Owned / Authorized</div>
            </div>
          </div>
          <button onClick={build} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-red-600 to-red-700 px-4 py-3 text-sm font-bold shadow-lg shadow-red-950/30 transition hover:scale-[1.01]"><Zap size={16} /> Generate defensive tool</button>
          <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-100">The builder avoids stealth, credential theft, destructive payloads, and unauthorized exploitation. It is designed for defensive and lab-safe workflows.</div>
        </Panel>
        <Panel className="overflow-hidden p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <SectionLabel icon={<FileText size={15} />}>Generated package</SectionLabel>
            <div className="flex gap-2">
              <button onClick={() => copyText(output)} className="rounded-xl border border-white/10 px-3 py-2 text-xs text-gray-300 hover:bg-white/10"><Copy size={13} /></button>
              <button onClick={() => downloadFile('redhydra-tool.md', output, 'text/markdown')} className="rounded-xl border border-white/10 px-3 py-2 text-xs text-gray-300 hover:bg-white/10"><Download size={13} /></button>
            </div>
          </div>
          <div className="max-h-[690px] overflow-auto pr-1">{formatMarkdown(output)}</div>
        </Panel>
      </div>
    </FeatureShell>
  );
}

function CodeAnalyzerPanel() {
  const [code, setCode] = useState(starterCode);
  const findings = useMemo(() => analyzeCode(code), [code]);
  const severityOrder = { Critical: 4, High: 3, Medium: 2, Low: 1 };
  const topSeverity = findings.sort((a, b) => severityOrder[b.severity] - severityOrder[a.severity])[0]?.severity || 'Clean';

  return (
    <FeatureShell title="Code Analyzer" subtitle="Local pattern checks for risky code and configuration patterns." icon={<Code2 size={22} className="text-cyan-300" />}>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Panel className="p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <SectionLabel icon={<Code2 size={15} />}>Input</SectionLabel>
            <button onClick={() => setCode(starterCode)} className="rounded-xl border border-white/10 px-3 py-2 text-xs text-gray-400 hover:bg-white/10">Load sample</button>
          </div>
          <textarea value={code} onChange={(e) => setCode(e.target.value)} className="h-[620px] w-full resize-none rounded-2xl border border-white/10 bg-black/40 p-4 font-mono text-xs leading-relaxed outline-none transition focus:border-cyan-500/40" />
        </Panel>
        <Panel className="p-4">
          <div className="mb-4 grid grid-cols-3 gap-2">
            <Metric label="Findings" value={String(findings.length)} />
            <Metric label="Top risk" value={topSeverity} />
            <Metric label="Mode" value="Local" />
          </div>
          <div className="space-y-3">
            {findings.length ? findings.map((finding) => (
              <div key={finding.title} className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <StatusPill tone={finding.severity === 'High' || finding.severity === 'Critical' ? 'red' : finding.severity === 'Medium' ? 'amber' : 'cyan'}>{finding.severity}</StatusPill>
                <h3 className="mt-3 font-bold">{finding.title}</h3>
                <p className="mt-2 text-xs text-gray-500"><b>Evidence:</b> {finding.evidence}</p>
                <p className="mt-2 text-sm text-gray-300"><b>Fix:</b> {finding.fix}</p>
              </div>
            )) : <EmptyState icon={<CheckCircle2 size={26} />} title="No obvious pattern found" text="This does not prove the code is secure. Use SAST, dependency scanning, peer review, and safe testing." />}
          </div>
        </Panel>
      </div>
    </FeatureShell>
  );
}

function ThreatIntelPanel() {
  const [cve, setCve] = useState('CVE-2024-3094');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  async function lookup() {
    setLoading(true);
    try {
      const data = await fetchNvd(cve.trim());
      setResult(cveAdvisor([cve.toUpperCase()], `**${data.id}**\n\nPublished: ${data.published}\nLast modified: ${data.lastModified}\nSeverity: ${data.metrics?.baseSeverity || 'not available'} ${data.metrics?.baseScore ? `(${data.metrics.baseScore})` : ''}\n\n${data.description}\n\nReferences:\n${data.refs.map((r: string) => `- ${r}`).join('\n')}`));
    } catch (error) {
      setResult(`## Lookup failed\n\n${error instanceof Error ? error.message : 'Unknown error'}\n\nTry again later, check the CVE ID, or verify manually with NVD and vendor advisories.`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <FeatureShell title="Threat Intel" subtitle="CVE lookup, defensive triage, mitigation planning, and exportable reports." icon={<Radar size={22} className="text-amber-300" />}>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[430px_minmax(0,1fr)]">
        <Panel className="p-4">
          <SectionLabel icon={<Radar size={15} />}>CVE lookup</SectionLabel>
          <input value={cve} onChange={(e) => setCve(e.target.value)} className="mt-3 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none transition focus:border-amber-500/40" />
          <button onClick={lookup} disabled={loading} className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-500/15 px-4 py-3 text-sm font-bold text-amber-100 transition hover:bg-amber-500/20 disabled:opacity-50">{loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />} Lookup public CVE data</button>
          <div className="mt-4 space-y-3">
            {['Confirm asset exposure', 'Check vendor advisory', 'Patch or mitigate', 'Monitor logs', 'Document risk'].map((item, index) => (
              <div key={item} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-sm text-gray-300"><span className="text-xs text-amber-300">0{index + 1}</span>{item}</div>
            ))}
          </div>
        </Panel>
        <Panel className="p-4">
          {result ? <div className="max-h-[720px] overflow-auto pr-1">{formatMarkdown(result)}</div> : <EmptyState icon={<Search size={26} />} title="No lookup yet" text="Enter a CVE ID to generate an evidence-aware triage summary." />}
        </Panel>
      </div>
    </FeatureShell>
  );
}

function TrainingPanel() {
  const [selected, setSelected] = useState(trainingModules[0]);
  const [progress, setProgress] = useState<Record<string, boolean>>(() => loadTrainingProgress());
  const completed = Object.values(progress).filter(Boolean).length;

  function toggleComplete(id: string) {
    const next = { ...progress, [id]: !progress[id] };
    setProgress(next);
    saveTrainingProgress(next);
  }

  return (
    <FeatureShell title="Training Hub" subtitle="Interactive security concepts, awareness, lab-safe practice, and exportable notes." icon={<BookOpen size={22} className="text-emerald-300" />}>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {trainingModules.map((module) => (
            <button key={module.id} onClick={() => setSelected(module)} className={cls('rounded-[24px] border p-4 text-left transition hover:-translate-y-1', selected.id === module.id ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-white/10 bg-white/[0.03] hover:border-emerald-500/20')}>
              <div className="flex items-start justify-between gap-3">
                <StatusPill tone="green">{module.level}</StatusPill>
                {progress[module.id] ? <CheckCircle2 className="text-emerald-300" size={18} /> : <BookOpen className="text-gray-500" size={18} />}
              </div>
              <h3 className="mt-3 text-lg font-black">{module.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-400">{module.description}</p>
              <p className="mt-4 text-xs text-gray-500">{module.lessons}</p>
            </button>
          ))}
        </div>
        <Panel className="p-4">
          <div className="mb-4 flex items-center justify-between gap-2">
            <SectionLabel icon={<BookOpen size={15} />}>Selected lesson</SectionLabel>
            <StatusPill tone="cyan">{completed}/{trainingModules.length} done</StatusPill>
          </div>
          <h3 className="text-xl font-black">{selected.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-gray-400">{selected.description}</p>
          <div className="mt-4 space-y-2">
            {selected.outcomes.map((outcome) => <div key={outcome} className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-sm text-gray-300"><CheckCircle2 size={15} className="text-emerald-300" /> {outcome}</div>)}
          </div>
          <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-100"><b>Practice:</b> {selected.practice}</div>
          <button onClick={() => toggleComplete(selected.id)} className="mt-4 w-full rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-100 transition hover:bg-emerald-500/20">{progress[selected.id] ? 'Mark as not complete' : 'Mark lesson complete'}</button>
        </Panel>
      </div>
    </FeatureShell>
  );
}

function ResearchPanel() {
  const [sourceText, setSourceText] = useState('Paste advisory notes, vendor text, CVE summary, or article excerpts here.');
  const claims = sourceText.split(/[.!?]\s/).filter((item) => item.trim().length > 30).slice(0, 5);
  const summary = `## Source-aware research workspace\n\n### Input summary\n\n${sourceText.slice(0, 600)}${sourceText.length > 600 ? '...' : ''}\n\n### Claims to verify\n\n${claims.length ? claims.map((claim) => `- ${claim.trim()}`).join('\n') : '- Add more source text to extract claims.'}\n\n### Research method\n\n1. Identify claims that need verification.\n2. Separate vendor facts, third-party analysis, and assumptions.\n3. Extract affected systems, mitigations, dates, and confidence level.\n4. Build an executive summary and technical action plan.\n\n### Limitation\n\nThis static site does not perform unrestricted web crawling. Use CVE lookup, public APIs, optional search APIs, or pasted sources.`;

  return (
    <FeatureShell title="Deep Research" subtitle="No fake browsing: use pasted sources, public CVE lookup, and optional API models." icon={<Search size={22} className="text-purple-300" />}>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Panel className="p-4">
          <SectionLabel icon={<FileText size={15} />}>Source material</SectionLabel>
          <textarea value={sourceText} onChange={(e) => setSourceText(e.target.value)} className="mt-3 h-[620px] w-full resize-none rounded-2xl border border-white/10 bg-black/40 p-4 text-sm leading-relaxed outline-none transition focus:border-purple-500/40" />
        </Panel>
        <Panel className="p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <SectionLabel icon={<Search size={15} />}>Research output</SectionLabel>
            <button onClick={() => downloadFile('redhydra-research.md', summary, 'text/markdown')} className="rounded-xl border border-white/10 px-3 py-2 text-xs text-gray-300 hover:bg-white/10"><Download size={13} /></button>
          </div>
          <div className="max-h-[620px] overflow-auto pr-1">{formatMarkdown(summary)}</div>
        </Panel>
      </div>
    </FeatureShell>
  );
}

function DataLab() {
  const [data, setData] = useState('timestamp,event,severity\n2026-05-31,failed_login,medium\n2026-05-31,password_reset,low\n2026-05-31,malware_alert,high\n2026-05-31,blocked_ip,high');
  const { headers, rows } = useMemo(() => parseCsv(data), [data]);
  const severityIndex = headers.findIndex((h) => h.toLowerCase().includes('severity'));
  const severityCounts = rows.reduce<Record<string, number>>((acc, row) => {
    const value = row[severityIndex] || 'unknown';
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
  const max = Math.max(1, ...Object.values(severityCounts));

  return (
    <FeatureShell title="Data Lab" subtitle="Local CSV-style security data analysis with visual quick insights." icon={<Database size={22} className="text-cyan-300" />}>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Panel className="p-4">
          <SectionLabel icon={<Database size={15} />}>CSV input</SectionLabel>
          <textarea value={data} onChange={(e) => setData(e.target.value)} className="mt-3 h-[620px] w-full resize-none rounded-2xl border border-white/10 bg-black/40 p-4 font-mono text-xs leading-relaxed outline-none transition focus:border-cyan-500/40" />
        </Panel>
        <Panel className="p-4">
          <div className="grid grid-cols-3 gap-2">
            <Metric label="Rows" value={String(rows.length)} />
            <Metric label="Columns" value={String(headers.length)} />
            <Metric label="Mode" value="Local" />
          </div>
          <div className="mt-5 space-y-3">
            <SectionLabel icon={<Activity size={15} />}>Severity distribution</SectionLabel>
            {Object.entries(severityCounts).map(([sev, count]) => (
              <div key={sev} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                <div className="mb-2 flex items-center justify-between text-sm"><span className="capitalize text-gray-300">{sev}</span><span className="font-bold">{count}</span></div>
                <div className="h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-red-500 to-cyan-400" style={{ width: `${(count / max) * 100}%` }} /></div>
              </div>
            ))}
          </div>
          <div className="mt-5 overflow-auto rounded-2xl border border-white/10">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/[0.05] text-gray-400"><tr>{headers.map((h) => <th key={h} className="px-3 py-2">{h}</th>)}</tr></thead>
              <tbody>{rows.slice(0, 8).map((row, i) => <tr key={i} className="border-t border-white/10">{row.map((cell, j) => <td key={j} className="px-3 py-2 text-gray-300">{cell}</td>)}</tr>)}</tbody>
            </table>
          </div>
        </Panel>
      </div>
    </FeatureShell>
  );
}

function SettingsPanel({ config, setConfig }: { config: ProviderConfig; setConfig: (c: ProviderConfig) => void }) {
  const [showKey, setShowKey] = useState(false);
  return (
    <FeatureShell title="Settings" subtitle="Configure optional AI providers. Keys stay client-side; use restricted keys only." icon={<Settings size={22} className="text-gray-300" />}>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,760px)_minmax(300px,1fr)]">
        <Panel className="p-4">
          <div className="grid gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-400">AI provider</label>
              <select value={config.provider} onChange={(e) => setConfig({ ...config, provider: e.target.value as Provider })} className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none focus:border-red-500/40">
                <option value="local">Built-in local guided assistant</option>
                <option value="openai-compatible">OpenAI-compatible API</option>
                <option value="ollama">Local Ollama endpoint</option>
                <option value="webllm">Experimental browser WebLLM connector</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-400">Endpoint</label>
              <input value={config.endpoint} onChange={(e) => setConfig({ ...config, endpoint: e.target.value })} className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none focus:border-red-500/40" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-400">Model</label>
              <input value={config.model} onChange={(e) => setConfig({ ...config, model: e.target.value })} className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none focus:border-red-500/40" />
            </div>
            <div>
              <label className="flex items-center gap-2 text-xs font-semibold text-gray-400"><KeyRound size={13} /> API key</label>
              <div className="mt-2 flex gap-2">
                <input type={showKey ? 'text' : 'password'} value={config.apiKey} onChange={(e) => setConfig({ ...config, apiKey: e.target.value })} className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none focus:border-red-500/40" placeholder="Use restricted keys only" />
                <button onClick={() => setShowKey(!showKey)} className="rounded-2xl border border-white/10 px-4 text-gray-300 hover:bg-white/10"><Eye size={16} /></button>
              </div>
            </div>
            <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-gray-300"><input type="checkbox" checked={config.webSearch} onChange={(e) => setConfig({ ...config, webSearch: e.target.checked })} /> Enable public CVE lookup when possible</label>
            <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-gray-300"><input type="checkbox" checked={config.encryptedMemory} onChange={(e) => setConfig({ ...config, encryptedMemory: e.target.checked })} /> Local memory mode enabled</label>
          </div>
        </Panel>
        <div className="space-y-4">
          <Panel className="p-4">
            <SectionLabel icon={<Lock size={15} />}>Security note</SectionLabel>
            <p className="mt-3 text-sm leading-relaxed text-gray-400">GitHub Pages has no backend, so browser-entered API keys are handled client-side. Do not use sensitive production keys. Local Ollama is recommended for private code analysis.</p>
          </Panel>
          <Panel className="p-4">
            <SectionLabel icon={<Globe2 size={15} />}>Deployment status</SectionLabel>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Metric label="Version" value={APP_VERSION} />
              <Metric label="Hosting" value="Pages" />
              <Metric label="Base" value="/RedHydraAI/" />
              <Metric label="Build" value="Static" />
            </div>
          </Panel>
          <Panel className="p-4">
            <button onClick={() => { localStorage.removeItem(STORAGE_MESSAGES); localStorage.removeItem(STORAGE_PROGRESS); window.location.reload(); }} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-100 hover:bg-red-500/20"><Trash2 size={15} /> Clear local workspace data</button>
          </Panel>
        </div>
      </div>
    </FeatureShell>
  );
}

function FeatureShell({ title, subtitle, icon, children }: { title: string; subtitle: string; icon: ReactNode; children: ReactNode }) {
  return (
    <div className="min-h-[calc(100vh-92px)] space-y-4">
      <Panel className="overflow-hidden p-0">
        <div className="relative p-5">
          <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 via-transparent to-cyan-500/10" />
          <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5">{icon}</div>
              <div>
                <h2 className="text-xl font-black sm:text-2xl">{title}</h2>
                <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
              </div>
            </div>
            <StatusPill tone="red">Interactive workspace</StatusPill>
          </div>
        </div>
      </Panel>
      {children}
    </div>
  );
}

function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={cls('rounded-[28px] border border-white/10 bg-black/35 shadow-2xl shadow-black/20 backdrop-blur-xl', className)}>{children}</div>;
}

function StatusPill({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'red' | 'green' | 'cyan' | 'amber' | 'neutral' }) {
  const tones = {
    red: 'border-red-500/25 bg-red-500/10 text-red-100',
    green: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-100',
    cyan: 'border-cyan-500/25 bg-cyan-500/10 text-cyan-100',
    amber: 'border-amber-500/25 bg-amber-500/10 text-amber-100',
    neutral: 'border-white/10 bg-white/[0.05] text-gray-300',
  };
  return <span className={cls('inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold', tones[tone])}>{children}</span>;
}

function ToggleButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return <button onClick={onClick} className={cls('inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition', active ? 'border-red-500/30 bg-red-500/15 text-red-100' : 'border-white/10 bg-white/[0.03] text-gray-400 hover:bg-white/10 hover:text-white')}>{children}</button>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
      <p className="text-[10px] uppercase tracking-[0.15em] text-gray-600">{label}</p>
      <p className="mt-1 truncate text-sm font-black text-white">{value}</p>
    </div>
  );
}

function Avatar({ icon, tone }: { icon: ReactNode; tone: 'red' | 'cyan' }) {
  return <div className={cls('mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border', tone === 'red' ? 'border-red-500/30 bg-red-500/15 text-red-100' : 'border-cyan-500/30 bg-cyan-500/15 text-cyan-100')}>{icon}</div>;
}

function SectionLabel({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return <div className="flex items-center gap-2 text-sm font-bold text-white">{icon}<span>{children}</span></div>;
}

function EmptyState({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="flex min-h-[260px] flex-col items-center justify-center rounded-3xl border border-white/10 bg-white/[0.03] p-8 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-gray-300">{icon}</div>
      <h3 className="mt-4 text-lg font-black">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-gray-500">{text}</p>
    </div>
  );
}

export default App;
