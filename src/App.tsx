import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Activity,
  AlertTriangle,
  Bot,
  BookOpen,
  Brain,
  CheckCircle2,
  Code2,
  Copy,
  Database,
  Download,
  FileText,
  Flame,
  KeyRound,
  Loader2,
  Lock,
  MessageSquare,
  Radar,
  Search,
  Send,
  Settings,
  Shield,
  Sparkles,
  Terminal,
  User,
  Wrench,
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

const APP_VERSION = '3.0.0';
const repoBase = '/RedHydraAI/';

const defaultConfig: ProviderConfig = {
  provider: 'local',
  endpoint: 'https://api.openai.com/v1/chat/completions',
  model: 'gpt-4o-mini',
  apiKey: '',
  webSearch: true,
  encryptedMemory: true,
};

const personaInfo: Record<Persona, { label: string; icon: ReactNode; description: string }> = {
  defender: {
    label: 'Defensive Security',
    icon: <Shield size={14} />,
    description: 'Hardening, detection, remediation, incident response, and safe security operations.',
  },
  'secure-code': {
    label: 'Secure Code',
    icon: <Code2 size={14} />,
    description: 'Code review, safer patterns, tests, documentation, and developer-focused fixes.',
  },
  'threat-intel': {
    label: 'Threat Intel',
    icon: <Radar size={14} />,
    description: 'CVE analysis, source-aware summaries, risk triage, and defensive strategy.',
  },
  trainer: {
    label: 'Security Trainer',
    icon: <BookOpen size={14} />,
    description: 'Simple learning modules, quizzes, awareness content, and lab explanations.',
  },
  lab: {
    label: 'Authorized Lab',
    icon: <Terminal size={14} />,
    description: 'Controlled lab workflows, safe toy examples, validation steps, and guardrails.',
  },
};

const navItems: { id: Tab; label: string; icon: ReactNode }[] = [
  { id: 'chat', label: 'Chat + Agent', icon: <MessageSquare size={17} /> },
  { id: 'tools', label: 'Tool Builder', icon: <Wrench size={17} /> },
  { id: 'analyzer', label: 'Code Analyzer', icon: <Code2 size={17} /> },
  { id: 'intel', label: 'Threat Intel', icon: <Radar size={17} /> },
  { id: 'training', label: 'Training', icon: <BookOpen size={17} /> },
  { id: 'research', label: 'Deep Research', icon: <Search size={17} /> },
  { id: 'data', label: 'Data Lab', icon: <Database size={17} /> },
  { id: 'settings', label: 'Settings', icon: <Settings size={17} /> },
];

const quickPrompts = [
  'Create a Python security header checker for my own website.',
  'Analyze this code for SQL injection and XSS risks.',
  'Explain CVE-2024-3094 and give defensive actions.',
  'Teach me API authentication security with examples.',
  'Build an incident response checklist for ransomware.',
  'Create a lab-only port scanner with safe usage notes.',
];

const trainingModules = [
  {
    title: 'OWASP Top 10 Essentials',
    level: 'Beginner',
    lessons: '8 lessons',
    description: 'Learn the major web application risk classes with prevention checklists and practice questions.',
  },
  {
    title: 'Secure Coding Workflow',
    level: 'Professional',
    lessons: '6 lessons',
    description: 'Review input handling, authentication, dependency hygiene, secrets management, and testing.',
  },
  {
    title: 'Threat Intel Triage',
    level: 'Analyst',
    lessons: '5 lessons',
    description: 'Turn CVE and advisory data into prioritized defensive actions, detections, and reports.',
  },
  {
    title: 'OPSEC and Privacy',
    level: 'All users',
    lessons: '4 lessons',
    description: 'Avoid leaking secrets, tokens, customer data, metadata, or operational details during analysis.',
  },
];

function loadConfig(): ProviderConfig {
  try {
    const raw = localStorage.getItem('redhydra.config');
    return raw ? { ...defaultConfig, ...JSON.parse(raw) } : defaultConfig;
  } catch {
    return defaultConfig;
  }
}

function saveConfig(config: ProviderConfig) {
  localStorage.setItem('redhydra.config', JSON.stringify(config));
}

function saveMessages(messages: Message[]) {
  localStorage.setItem('redhydra.messages', JSON.stringify(messages.slice(-30)));
}

function loadMessages(): Message[] {
  try {
    const raw = localStorage.getItem('redhydra.messages');
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore malformed storage
  }
  return [
    {
      id: 'welcome',
      role: 'assistant',
      mode: 'chat',
      persona: 'defender',
      createdAt: Date.now(),
      sources: ['Built-in defensive security knowledge base'],
      content:
        '## RedHydra AI is ready\n\nI am focused on **chat and agent workflows first**. Ask for security guidance, defensive scripts, code review, CVE analysis, training content, OPSEC checklists, or lab-safe simulations.\n\n**Reality check:** this GitHub Pages version is frontend-only. It can use the built-in local guided assistant immediately, optional browser/local AI where supported, or your own API key for stronger model responses. It does not fake server-side browsing, self-training, or hidden backend features.',
    },
  ];
}

function cls(...values: Array<string | false | undefined>) {
  return values.filter(Boolean).join(' ');
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
    'ransomware',
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
  if (extractCves(input).length) return 'cve';
  if (lower.includes('generate') || lower.includes('create') || lower.includes('build') || lower.includes('script') || lower.includes('tool')) return 'tool';
  if (lower.includes('analyze') || lower.includes('review') || lower.includes('code') || lower.includes('vulnerability')) return 'analysis';
  if (lower.includes('teach') || lower.includes('learn') || lower.includes('training') || lower.includes('explain')) return 'training';
  if (lower.includes('threat') || lower.includes('ioc') || lower.includes('ransomware') || lower.includes('apt')) return 'intel';
  if (lower.includes('opsec') || lower.includes('privacy') || lower.includes('secret') || lower.includes('token')) return 'opsec';
  return 'general';
}

function systemPrompt(persona: Persona, mode: Mode) {
  const base = `You are RedHydra AI, an open-source defensive cybersecurity assistant. You help with security learning, defensive automation, secure coding, vulnerability analysis, threat intelligence, OPSEC, report writing, and controlled lab training. Keep answers practical and accurate. Do not claim impossible capabilities. Clearly separate verified facts from assumptions. Refuse harmful requests involving credential theft, malware, stealth, persistence, unauthorized exploitation, bypassing controls, destructive payloads, or exfiltration. Offer defensive alternatives.`;
  const agent = mode === 'agent'
    ? ` For agent tasks, respond using: Goal, Safe Assumption, Plan, Output, Testing, Limitations, Next Step.`
    : ` For chat, respond naturally but with clear steps, safe assumptions, and useful examples.`;
  return `${base}${agent} Current persona: ${personaInfo[persona].label} — ${personaInfo[persona].description}`;
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
    body: JSON.stringify({ model: config.model, messages: conversation, temperature: 0.4 }),
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
  return json?.message?.content || json?.response || 'The local Ollama model returned an empty response.';
}

async function callWebLLM(config: ProviderConfig, messages: Message[], persona: Persona, mode: Mode, userText: string) {
  const modelId = config.model || 'Llama-3.2-1B-Instruct-q4f16_1-MLC';
  const mod: any = await import(/* @vite-ignore */ 'https://esm.run/@mlc-ai/web-llm');
  const engine = await mod.CreateMLCEngine(modelId, { initProgressCallback: () => undefined });
  const response = await engine.chat.completions.create({
    messages: [
      { role: 'system', content: systemPrompt(persona, mode) },
      ...messages.slice(-6).map((m) => ({ role: m.role, content: m.content })),
      { role: 'user', content: userText },
    ],
    temperature: 0.4,
  });
  return response?.choices?.[0]?.message?.content || 'The browser model returned an empty response.';
}

async function fetchNvd(cve: string) {
  const response = await fetch(`https://services.nvd.nist.gov/rest/json/cves/2.0?cveId=${encodeURIComponent(cve)}`);
  if (!response.ok) throw new Error(`NVD returned ${response.status}`);
  const json = await response.json();
  const item = json?.vulnerabilities?.[0]?.cve;
  if (!item) throw new Error('No NVD entry found');
  const description = item.descriptions?.find((d: any) => d.lang === 'en')?.value || 'No English description found.';
  const metrics = item.metrics?.cvssMetricV31?.[0]?.cvssData || item.metrics?.cvssMetricV30?.[0]?.cvssData || item.metrics?.cvssMetricV2?.[0]?.cvssData;
  const refs = (item.references?.referenceData || []).slice(0, 5).map((r: any) => r.url);
  return { id: item.id, published: item.published, lastModified: item.lastModified, description, metrics, refs };
}

function localAssistant(input: string, persona: Persona, mode: Mode, nvdNotes?: string) {
  const intent = detectIntent(input);
  const cves = extractCves(input);

  if (isUnsafeRequest(input)) {
    return `## I can’t help build harmful capability\n\nYour request appears to involve malware, credential theft, stealth, bypassing controls, unauthorized exploitation, or exfiltration. RedHydra AI is designed for **defensive security, authorized testing, training, and lab-safe work**.\n\n### Safe alternatives\n\n- Create a detection rule for the behavior you are studying.\n- Build a lab-only awareness lesson with toy examples.\n- Generate an incident response checklist.\n- Review code or configuration for weaknesses.\n- Create a hardening script for systems you own.\n\n### Next step\n\nRephrase the task around defense, detection, hardening, or an authorized lab environment, and I can help.`;
  }

  if (mode === 'agent') {
    return buildAgentResponse(input, persona, intent, cves, nvdNotes);
  }

  if (intent === 'tool') return toolAdvisor(input);
  if (intent === 'analysis') return analysisAdvisor(input);
  if (intent === 'cve' || cves.length) return cveAdvisor(cves, nvdNotes);
  if (intent === 'training') return trainingAdvisor(input);
  if (intent === 'opsec') return opsecAdvisor();
  if (intent === 'intel') return intelAdvisor(input);

  return `## Practical security guidance\n\nI can help you with this as a defensive cybersecurity task. Here is a clean way to approach it.\n\n### Recommended approach\n\n1. Define the asset, system, or learning goal.\n2. Confirm the scope is owned or authorized.\n3. Identify the risk category: code, configuration, vulnerability, identity, network, cloud, or process.\n4. Choose the output you need: explanation, script, checklist, detection rule, report, or training module.\n5. Validate results safely before using them in production.\n\n### Useful RedHydra commands\n\n- “Generate a defensive script to check security headers.”\n- “Analyze this code for insecure patterns.”\n- “Explain this CVE and give remediation steps.”\n- “Create a training module for SQL injection defense.”\n- “Build an OPSEC checklist for security research.”\n\n### Limitation\n\nThe built-in local assistant is template-and-knowledge guided. For stronger free/local model responses, configure Ollama or experimental browser AI in Settings. For cloud models, use an OpenAI-compatible endpoint with your own key.`;
}

function buildAgentResponse(input: string, persona: Persona, intent: string, cves: string[], nvdNotes?: string) {
  const outputType = intent === 'tool' ? 'defensive tool or script' : intent === 'analysis' ? 'analysis report' : intent === 'training' ? 'training module' : intent === 'cve' ? 'vulnerability intelligence brief' : 'security workflow';
  return `## Agent plan generated\n\n### Goal\n\nCreate a practical ${outputType} from your request:\n\n> ${input}\n\n### Safe assumption\n\nThis is for systems, code, accounts, and infrastructure you own or are explicitly authorized to assess.\n\n### Plan\n\n1. Classify the request as **${intent}**.\n2. Apply the **${personaInfo[persona].label}** workflow.\n3. Avoid unsafe behavior such as stealth, persistence, credential theft, bypassing controls, destructive payloads, or unauthorized exploitation.\n4. Produce an actionable output with usage notes, testing steps, and limitations.\n\n### Output\n\n${intent === 'tool' ? toolAdvisor(input) : intent === 'analysis' ? analysisAdvisor(input) : intent === 'cve' ? cveAdvisor(cves, nvdNotes) : intent === 'training' ? trainingAdvisor(input) : intelAdvisor(input)}\n\n### Testing\n\n- Run generated scripts first in a local lab or staging environment.\n- Review every line before execution.\n- Use test data, not production secrets.\n- Confirm results with at least one trusted external source or manual validation.\n\n### Limitations\n\nThis frontend-only version cannot secretly verify private systems, run server-side scans, or access protected data unless you provide it directly.\n\n### Next step\n\nUse the supporting panels below to generate code, analyze code, check CVEs, or export the result as Markdown.`;
}

function toolAdvisor(input: string) {
  const lower = input.toLowerCase();
  let suggestion = 'defensive helper script';
  if (lower.includes('header')) suggestion = 'security header checker';
  else if (lower.includes('port')) suggestion = 'authorized local/lab port scanner';
  else if (lower.includes('log')) suggestion = 'security log analyzer';
  else if (lower.includes('dependency') || lower.includes('package')) suggestion = 'dependency audit helper';
  else if (lower.includes('linux') || lower.includes('hardening')) suggestion = 'Linux hardening checklist script';

  return `## Defensive tool generation plan\n\n### Tool type\n\n${suggestion}\n\n### Best-practice output should include\n\n- Clear scope warning: owned or authorized systems only.\n- Safe defaults and timeouts.\n- Input validation.\n- Error handling.\n- Minimal permissions.\n- Human-readable results.\n- Tests or manual verification steps.\n- README usage section.\n\n### Recommended structure\n\n\`\`\`txt\nredhydra-tool/\n  tool.py\n  tests/\n  README.md\n  requirements.txt\n\`\`\`\n\nUse the **Tool Builder** tab to generate a complete script, tests, and docs.`;
}

function analysisAdvisor(input: string) {
  return `## Code and vulnerability analysis workflow\n\n### What I will check\n\n- Injection risks such as SQL injection, command injection, and unsafe deserialization.\n- XSS-prone DOM or template usage.\n- Hardcoded secrets and tokens.\n- Weak cryptography or insecure TLS settings.\n- Authentication/session mistakes.\n- Missing validation, logging, and error handling.\n\n### How to use this safely\n\nPaste the code into the **Code Analyzer** tab. Remove secrets first. The analyzer will flag risky patterns and suggest fixes.\n\n### Expected output\n\n- Severity level.\n- Evidence from the code.\n- Why it matters.\n- Safer replacement pattern.\n- Testing checklist.\n\n### Reminder\n\nStatic checks are useful but incomplete. Confirm findings through code review, tests, and approved security testing.`;
}

function cveAdvisor(cves: string[], nvdNotes?: string) {
  if (!cves.length) {
    return `## CVE analysis\n\nSend a CVE ID such as **CVE-2024-3094**, and I can produce a structured vulnerability brief with severity, affected scope, defensive actions, detection ideas, and source notes.`;
  }
  return `## Vulnerability intelligence brief\n\n### CVE IDs\n\n${cves.map((c) => `- ${c}`).join('\n')}\n\n${nvdNotes ? `### Public source lookup\n\n${nvdNotes}\n\n` : ''}### Defensive actions\n\n1. Confirm whether affected software and versions exist in your environment.\n2. Check vendor advisories and release notes.\n3. Prioritize patching based on exposure, exploitability, asset criticality, and compensating controls.\n4. Add temporary mitigations where patching is delayed.\n5. Monitor logs for suspicious activity related to the affected component.\n6. Document the decision, owner, deadline, and validation evidence.\n\n### Confidence note\n\nCVE data can change after publication. Always verify with vendor advisories and your asset inventory.`;
}

function trainingAdvisor(input: string) {
  return `## Training module outline\n\n### Topic\n\n${input}\n\n### Lesson flow\n\n1. **Simple definition** — what the issue is and why it matters.\n2. **Real-world context** — where teams usually encounter it.\n3. **Common mistake** — the risky pattern to avoid.\n4. **Safe pattern** — the defensive way to handle it.\n5. **Checklist** — quick review items.\n6. **Mini quiz** — 3 questions to test understanding.\n7. **Practice task** — lab-safe exercise using toy data only.\n\n### Example quiz\n\n1. What input should be treated as untrusted?\n2. Which control prevents code and data from mixing?\n3. Why should generated scripts be tested in a lab first?`;
}

function opsecAdvisor() {
  return `## OPSEC and privacy checklist\n\n- Do not paste API keys, passwords, tokens, private keys, customer data, or internal-only IP ranges.\n- Replace sensitive values with placeholders before analysis.\n- Use local mode or local Ollama when handling sensitive code.\n- Use restricted API keys if you connect an external AI provider.\n- Review generated code before running it.\n- Keep logs minimal and avoid storing secrets in browser storage.\n- Run tools only on owned or authorized systems.\n- Export reports without sensitive raw data unless required and approved.`;
}

function intelAdvisor(input: string) {
  return `## Threat intelligence workflow\n\n### Request\n\n${input}\n\n### Analysis sections\n\n1. **Overview** — what the threat or weakness is.\n2. **Affected assets** — systems, packages, identities, users, or processes.\n3. **Risk level** — exposure, exploitability, impact, and business criticality.\n4. **Defensive actions** — patch, harden, monitor, segment, or disable risky features.\n5. **Detection ideas** — logs, events, Sigma/YARA concepts, anomaly patterns.\n6. **References** — vendor advisories, NVD, CISA KEV, OWASP, or project documentation.\n7. **Confidence** — clearly state what is verified versus assumed.\n\nUse the **Threat Intel** tab for CVE lookup and report export.`;
}

function generateTool(description: string, language: string) {
  const lower = description.toLowerCase();
  if (isUnsafeRequest(description)) {
    return {
      name: 'Safe alternative required',
      code: '# This request appears unsafe. Reframe it as detection, hardening, authorized lab testing, or incident response.\n',
      tests: 'Verify that the request is defensive and authorized before generating code.\n',
      docs: 'RedHydra AI does not generate malware, credential theft, stealth, evasion, persistence, destructive, or unauthorized exploitation tooling.\n',
    };
  }

  if (language === 'Python' && lower.includes('header')) {
    return {
      name: 'security_headers_checker.py',
      code: `#!/usr/bin/env python3\n\"\"\"\nSecurity Header Checker\nUse only for websites you own or are authorized to assess.\n\"\"\"\nimport argparse\nimport sys\nimport requests\n\nRECOMMENDED_HEADERS = {\n    \"Content-Security-Policy\": \"Helps reduce XSS impact\",\n    \"Strict-Transport-Security\": \"Forces HTTPS after first trusted visit\",\n    \"X-Content-Type-Options\": \"Prevents MIME sniffing\",\n    \"X-Frame-Options\": \"Reduces clickjacking risk\",\n    \"Referrer-Policy\": \"Limits sensitive referrer leakage\",\n    \"Permissions-Policy\": \"Restricts powerful browser features\",\n}\n\ndef check(url: str) -> int:\n    try:\n        response = requests.get(url, timeout=10, allow_redirects=True)\n    except requests.RequestException as exc:\n        print(f\"[error] request failed: {exc}\")\n        return 2\n\n    print(f\"URL: {response.url}\")\n    print(f\"Status: {response.status_code}\")\n    print(\"\\nHeader review:\")\n\n    missing = 0\n    for header, purpose in RECOMMENDED_HEADERS.items():\n        value = response.headers.get(header)\n        if value:\n            print(f\"[ok] {header}: {value}\")\n        else:\n            missing += 1\n            print(f\"[missing] {header} — {purpose}\")\n\n    print(f\"\\nMissing headers: {missing}\")\n    return 1 if missing else 0\n\nif __name__ == \"__main__\":\n    parser = argparse.ArgumentParser(description=\"Check common defensive HTTP security headers.\")\n    parser.add_argument(\"url\", help=\"Authorized URL, e.g. https://example.com\")\n    args = parser.parse_args()\n    if not args.url.startswith((\"http://\", \"https://\")):\n        print(\"URL must start with http:// or https://\")\n        sys.exit(2)\n    sys.exit(check(args.url))\n`,
      tests: `Manual test:\npython security_headers_checker.py https://example.com\n\nExpected:\n- Shows status code\n- Lists present and missing security headers\n- Does not perform exploitation or intrusive testing\n`,
      docs: `# Security Header Checker\n\nChecks common HTTP response headers for an owned or authorized website.\n\n## Install\n\n\`pip install requests\`\n\n## Usage\n\n\`python security_headers_checker.py https://your-site.example\`\n\n## Limitations\n\nThis is a quick configuration review, not a full web security assessment.\n`,
    };
  }

  if (language === 'Python' && lower.includes('port')) {
    return {
      name: 'safe_port_checker.py',
      code: `#!/usr/bin/env python3\n\"\"\"\nSafe Port Checker for owned/authorized lab systems.\nNo stealth, evasion, exploitation, or high-speed scanning.\n\"\"\"\nimport argparse\nimport socket\nfrom concurrent.futures import ThreadPoolExecutor\n\nCOMMON_PORTS = [22, 80, 443, 445, 3306, 5432, 6379, 8080]\n\ndef check_port(host: str, port: int, timeout: float = 1.0):\n    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:\n        sock.settimeout(timeout)\n        result = sock.connect_ex((host, port))\n        return port, result == 0\n\ndef main():\n    parser = argparse.ArgumentParser(description=\"Check common open ports on an authorized host.\")\n    parser.add_argument(\"host\", help=\"Owned or authorized hostname/IP\")\n    parser.add_argument(\"--ports\", default=\",\".join(map(str, COMMON_PORTS)), help=\"Comma-separated ports\")\n    args = parser.parse_args()\n    ports = [int(p.strip()) for p in args.ports.split(\",\") if p.strip().isdigit()]\n    print(f\"Checking {args.host} for {len(ports)} ports...\")\n    with ThreadPoolExecutor(max_workers=8) as pool:\n        for port, open_ in pool.map(lambda p: check_port(args.host, p), ports):\n            print(f\"{port}/tcp {'open' if open_ else 'closed'}\")\n\nif __name__ == \"__main__\":\n    main()\n`,
      tests: `Run only against a lab host you own:\npython safe_port_checker.py 127.0.0.1 --ports 22,80,443\n`,
      docs: `# Safe Port Checker\n\nA simple authorized connectivity checker for labs and owned systems.\n\nIt does not exploit services, evade detection, or scan third-party targets.\n`,
    };
  }

  if (language === 'Bash') {
    return {
      name: 'linux_hardening_check.sh',
      code: `#!/usr/bin/env bash\nset -euo pipefail\n\necho \"RedHydra Linux Hardening Quick Check\"\necho \"Run on systems you own or administer.\"\necho\n\ncheck_cmd() { command -v \"$1\" >/dev/null 2>&1 && echo \"[ok] $1 installed\" || echo \"[warn] $1 not found\"; }\n\ncheck_cmd ufw\ncheck_cmd fail2ban-client\ncheck_cmd sshd\n\necho\necho \"SSH root login setting:\"\nif [ -f /etc/ssh/sshd_config ]; then\n  grep -Ei '^PermitRootLogin|^PasswordAuthentication' /etc/ssh/sshd_config || echo \"[info] explicit SSH settings not found\"\nelse\n  echo \"[info] sshd_config not found\"\nfi\n\necho\necho \"World-writable directories under /tmp-style paths:\"\nfind /tmp -maxdepth 1 -type d -perm -0002 -print 2>/dev/null || true\n\necho\necho \"Review output before making changes. This script does not modify system settings.\"\n`,
      tests: `bash -n linux_hardening_check.sh\nbash linux_hardening_check.sh\n`,
      docs: `# Linux Hardening Quick Check\n\nRead-only baseline helper. It reports common hardening items and does not change settings.\n`,
    };
  }

  const safeDescription = description.replace(/[`\"$]/g, '').slice(0, 180);
  return {
    name: language === 'JavaScript' ? 'redhydra_defensive_helper.js' : 'redhydra_defensive_helper.py',
    code:
      language === 'JavaScript'
        ? `// RedHydra Defensive Helper
// Scope: owned or authorized systems only.
function createChecklist(task) {
  return [
    'Task: ' + task,
    '1. Confirm authorization and scope',
    '2. Remove secrets from input data',
    '3. Use safe defaults and timeouts',
    '4. Log findings without sensitive values',
    '5. Validate results manually before action',
  ].join('\n');
}

console.log(createChecklist(process.argv.slice(2).join(' ') || 'security task'));
`
        : `#!/usr/bin/env python3
"""RedHydra Defensive Helper. Scope: owned or authorized systems only."""

def checklist(task: str):
    return [
        f"Task: {task}",
        "1. Confirm authorization and scope",
        "2. Remove secrets from input data",
        "3. Use safe defaults and timeouts",
        "4. Log findings without sensitive values",
        "5. Validate results manually before action",
    ]

if __name__ == "__main__":
    for line in checklist("${safeDescription}"):
        print(line)
`,
    tests: 'Run the helper locally and verify the checklist is generated. Add unit tests for any environment-specific logic.\n',
    docs: '# RedHydra Defensive Helper\n\nA safe starter template. Expand it only for authorized defensive workflows.\n',
  };
}

function analyzeCode(code: string): Finding[] {
  const checks: Array<{ pattern: RegExp; finding: Finding }> = [
    { pattern: /eval\s*\(/i, finding: { severity: 'High', title: 'Use of eval()', evidence: 'eval(...) found', fix: 'Avoid eval. Use safe parsers, explicit functions, or strict allowlists.' } },
    { pattern: /innerHTML\s*=/i, finding: { severity: 'Medium', title: 'Potential DOM XSS sink', evidence: 'innerHTML assignment found', fix: 'Use textContent or sanitize trusted rich HTML with a maintained sanitizer.' } },
    { pattern: /shell\s*=\s*True/i, finding: { severity: 'High', title: 'Shell command execution risk', evidence: 'shell=True found', fix: 'Pass arguments as a list and keep shell=False.' } },
    { pattern: /subprocess\.(run|popen|call).*\+/is, finding: { severity: 'High', title: 'Command injection risk', evidence: 'subprocess call appears to concatenate input', fix: 'Avoid string concatenation for commands. Validate input and pass arguments separately.' } },
    { pattern: /md5\s*\(/i, finding: { severity: 'Medium', title: 'Weak hash algorithm', evidence: 'MD5 usage found', fix: 'Use SHA-256 for integrity or Argon2id/bcrypt for passwords.' } },
    { pattern: /verify\s*=\s*False/i, finding: { severity: 'High', title: 'TLS certificate verification disabled', evidence: 'verify=False found', fix: 'Keep TLS verification enabled and configure trust stores properly.' } },
    { pattern: /(api[_-]?key|secret|password|token)\s*[:=]\s*['\"][^'\"]{8,}/i, finding: { severity: 'Critical', title: 'Possible hardcoded secret', evidence: 'Secret-like assignment found', fix: 'Move secrets to a vault or environment variable and rotate exposed values.' } },
    { pattern: /pickle\.loads|yaml\.load\s*\(/i, finding: { severity: 'High', title: 'Unsafe deserialization risk', evidence: 'Unsafe loader found', fix: 'Use safe loaders and never deserialize untrusted input.' } },
  ];
  return checks.filter((c) => c.pattern.test(code)).map((c) => c.finding);
}

function formatMarkdown(content: string) {
  const codeBlocks = content.split(/```/);
  if (codeBlocks.length > 1) {
    return codeBlocks.map((part, index) => {
      if (index % 2 === 1) {
        const firstNewLine = part.indexOf('\n');
        const lang = firstNewLine > -1 ? part.slice(0, firstNewLine).trim() : '';
        const code = firstNewLine > -1 ? part.slice(firstNewLine + 1) : part;
        return (
          <div key={index} className="my-3 overflow-hidden rounded-xl border border-red-500/15 bg-black/40">
            <div className="flex items-center justify-between border-b border-white/10 px-3 py-2 text-[11px] text-gray-500">
              <span>{lang || 'code'}</span>
              <button onClick={() => copyText(code)} className="hover:text-red-300">copy</button>
            </div>
            <pre className="overflow-x-auto p-3 text-xs leading-relaxed text-gray-200"><code>{code}</code></pre>
          </div>
        );
      }
      return <TextLines key={index} text={part} />;
    });
  }
  return <TextLines text={content} />;
}

function TextLines({ text }: { text: string }) {
  return (
    <>
      {text.split('\n').map((line, i) => {
        if (line.startsWith('## ')) return <h2 key={i} className="mb-2 mt-3 text-lg font-bold text-white">{line.slice(3)}</h2>;
        if (line.startsWith('### ')) return <h3 key={i} className="mb-1.5 mt-3 text-sm font-semibold text-red-200">{line.slice(4)}</h3>;
        if (line.startsWith('- ')) return <p key={i} className="ml-3 text-sm text-gray-300">• {line.slice(2)}</p>;
        if (/^\d+\.\s/.test(line)) return <p key={i} className="ml-3 text-sm text-gray-300">{line}</p>;
        if (line.trim() === '') return <div key={i} className="h-2" />;
        if (line.startsWith('> ')) return <blockquote key={i} className="my-2 border-l-2 border-red-500/50 pl-3 text-sm italic text-gray-300">{line.slice(2)}</blockquote>;
        return <p key={i} className="text-sm leading-relaxed text-gray-300">{line}</p>;
      })}
    </>
  );
}

function StatusPill({ children, tone = 'gray' }: { children: ReactNode; tone?: 'red' | 'green' | 'cyan' | 'amber' | 'purple' | 'gray' }) {
  const styles = {
    red: 'border-red-500/25 bg-red-500/10 text-red-300',
    green: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300',
    cyan: 'border-cyan-500/25 bg-cyan-500/10 text-cyan-300',
    amber: 'border-amber-500/25 bg-amber-500/10 text-amber-300',
    purple: 'border-purple-500/25 bg-purple-500/10 text-purple-300',
    gray: 'border-gray-700/50 bg-gray-900/60 text-gray-400',
  };
  return <span className={cls('inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium', styles[tone])}>{children}</span>;
}

function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={cls('rounded-2xl border border-white/10 bg-[#0b0b14]/85 shadow-2xl shadow-black/20 backdrop-blur', className)}>{children}</div>;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('chat');
  const [mode, setMode] = useState<Mode>('chat');
  const [persona, setPersona] = useState<Persona>('defender');
  const [messages, setMessages] = useState<Message[]>(loadMessages);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [config, setConfig] = useState<ProviderConfig>(loadConfig);
  const [notice, setNotice] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => saveMessages(messages), [messages]);
  useEffect(() => saveConfig(config), [config]);
  useEffect(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), [messages, busy]);

  const providerLabel = useMemo(() => {
    if (config.provider === 'openai-compatible') return config.apiKey ? 'API AI ready' : 'API key needed';
    if (config.provider === 'ollama') return 'Local Ollama mode';
    if (config.provider === 'webllm') return 'Experimental browser AI';
    return 'Built-in local guide';
  }, [config]);

  async function send(text?: string) {
    const userText = (text || input).trim();
    if (!userText || busy) return;

    const userMessage: Message = { id: crypto.randomUUID(), role: 'user', content: userText, mode, persona, createdAt: Date.now() };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setBusy(true);
    setNotice('Analyzing request, checking safety scope, and selecting the best available AI route...');

    let nvdNotes = '';
    const cves = extractCves(userText);
    if (config.webSearch && cves[0]) {
      try {
        const cve = await fetchNvd(cves[0]);
        nvdNotes = `**${cve.id}** — Published: ${cve.published || 'unknown'}; Last modified: ${cve.lastModified || 'unknown'}\n\n${cve.description}\n\nSeverity data: ${cve.metrics?.baseSeverity || 'not available'} ${cve.metrics?.baseScore ? `(${cve.metrics.baseScore})` : ''}\n\nReferences:\n${cve.refs.map((r: string) => `- ${r}`).join('\n')}`;
      } catch (error) {
        nvdNotes = `Public CVE lookup failed in the browser (${error instanceof Error ? error.message : 'unknown error'}). Use vendor advisories or try again later.`;
      }
    }

    try {
      let content = '';
      const currentMessages = [...messages, userMessage];
      if (config.provider === 'openai-compatible') {
        if (!config.apiKey) throw new Error('API key is missing. Add a restricted key in Settings.');
        content = await callOpenAICompatible(config, currentMessages, persona, mode, userText);
      } else if (config.provider === 'ollama') {
        content = await callOllama(config, currentMessages, persona, mode, userText);
      } else if (config.provider === 'webllm') {
        content = await callWebLLM(config, currentMessages, persona, mode, userText);
      } else {
        content = localAssistant(userText, persona, mode, nvdNotes);
      }

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content,
          mode,
          persona,
          createdAt: Date.now(),
          sources: nvdNotes ? ['NVD public CVE API', 'RedHydra local security knowledge'] : ['RedHydra local security knowledge'],
        },
      ]);
    } catch (error) {
      const fallback = `${localAssistant(userText, persona, mode, nvdNotes)}\n\n### Provider fallback note\n\nThe selected AI provider failed: ${error instanceof Error ? error.message : 'unknown error'}. I used the built-in local defensive assistant instead.`;
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: 'assistant', content: fallback, mode, persona, createdAt: Date.now(), sources: ['Local fallback assistant'] },
      ]);
    } finally {
      setBusy(false);
      setNotice('');
    }
  }

  return (
    <div className="min-h-screen overflow-hidden bg-[#040407] text-white">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-[-10%] top-[-10%] h-96 w-96 rounded-full bg-red-600/20 blur-3xl" />
        <div className="absolute right-[-10%] top-[15%] h-96 w-96 rounded-full bg-purple-700/20 blur-3xl" />
        <div className="absolute bottom-[-20%] left-[30%] h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:48px_48px] opacity-20" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-[1800px] flex-col px-3 py-3 lg:px-5">
        <header className="mb-3 flex flex-col gap-3 rounded-2xl border border-white/10 bg-[#090912]/80 p-3 backdrop-blur md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-purple-700 shadow-lg shadow-red-500/20">
              <Flame size={23} />
              <span className="absolute -right-1 -top-1 flex h-3 w-3 rounded-full bg-emerald-400 ring-4 ring-[#090912]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black tracking-tight md:text-2xl">RedHydra <span className="text-red-400">AI</span></h1>
                <StatusPill tone="green"><CheckCircle2 size={12} /> GitHub Pages ready</StatusPill>
              </div>
              <p className="text-xs text-gray-400 md:text-sm">Chat-first defensive security assistant with agent workflows, local guidance, optional AI providers, and source-aware CVE lookup.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill tone={config.provider === 'local' ? 'gray' : 'cyan'}><Brain size={12} /> {providerLabel}</StatusPill>
            <StatusPill tone="purple"><Lock size={12} /> Frontend only</StatusPill>
            <StatusPill tone="red"><Activity size={12} /> v{APP_VERSION}</StatusPill>
          </div>
        </header>

        <div className="grid flex-1 grid-cols-1 gap-3 lg:grid-cols-[240px_minmax(0,1fr)]">
          <aside className="rounded-2xl border border-white/10 bg-[#080810]/80 p-2 backdrop-blur lg:min-h-[calc(100vh-106px)]">
            <div className="mb-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-red-200"><Sparkles size={15} /> Main highlight</div>
              <p className="mt-1 text-xs leading-relaxed text-gray-400">No dashboard landing page. Open directly into Chat + Agent.</p>
            </div>
            <nav className="space-y-1">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={cls(
                    'flex w-full items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition',
                    activeTab === item.id
                      ? 'border-red-500/30 bg-gradient-to-r from-red-500/15 to-purple-500/10 text-red-200 shadow-lg shadow-red-500/10'
                      : 'border-transparent text-gray-400 hover:border-white/10 hover:bg-white/5 hover:text-gray-200',
                  )}
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
            </nav>
            <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3 text-xs leading-relaxed text-gray-500">
              <p className="font-semibold text-gray-300">Responsible scope</p>
              <p className="mt-1">Built for training, defense, authorized assessment, and lab-safe simulations. Harmful automation is blocked by design.</p>
            </div>
          </aside>

          <main className="min-w-0">
            {activeTab === 'chat' && (
              <ChatWorkspace
                messages={messages}
                input={input}
                setInput={setInput}
                send={send}
                busy={busy}
                notice={notice}
                mode={mode}
                setMode={setMode}
                persona={persona}
                setPersona={setPersona}
                endRef={endRef}
                clear={() => setMessages(loadMessages())}
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

function ChatWorkspace({
  messages,
  input,
  setInput,
  send,
  busy,
  notice,
  mode,
  setMode,
  persona,
  setPersona,
  endRef,
  clear,
}: {
  messages: Message[];
  input: string;
  setInput: (v: string) => void;
  send: (text?: string) => void;
  busy: boolean;
  notice: string;
  mode: Mode;
  setMode: (m: Mode) => void;
  persona: Persona;
  setPersona: (p: Persona) => void;
  endRef: React.RefObject<HTMLDivElement | null>;
  clear: () => void;
}) {
  return (
    <div className="grid h-[calc(100vh-106px)] min-h-[720px] grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_360px]">
      <Panel className="flex min-h-0 flex-col overflow-hidden">
        <div className="border-b border-white/10 p-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-bold"><MessageSquare size={20} className="text-red-400" /> RedHydra Chat + Agent</h2>
              <p className="text-xs text-gray-500">Ask naturally or switch to Agent for step-by-step security task execution.</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setMode('chat')} className={cls('rounded-xl border px-3 py-2 text-xs font-semibold transition', mode === 'chat' ? 'border-red-500/30 bg-red-500/15 text-red-200' : 'border-white/10 text-gray-400 hover:text-white')}>Chat</button>
              <button onClick={() => setMode('agent')} className={cls('rounded-xl border px-3 py-2 text-xs font-semibold transition', mode === 'agent' ? 'border-purple-500/30 bg-purple-500/15 text-purple-200' : 'border-white/10 text-gray-400 hover:text-white')}>AI Agent</button>
              <button onClick={clear} className="rounded-xl border border-white/10 px-3 py-2 text-xs text-gray-400 hover:text-white">Reset</button>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {(Object.keys(personaInfo) as Persona[]).map((p) => (
              <button
                key={p}
                onClick={() => setPersona(p)}
                className={cls('flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-medium transition', persona === p ? 'border-red-500/30 bg-red-500/15 text-red-200' : 'border-white/10 text-gray-500 hover:text-gray-200')}
              >
                {personaInfo[p].icon}
                {personaInfo[p].label}
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
          {messages.map((message) => (
            <div key={message.id} className={cls('flex gap-3', message.role === 'user' ? 'justify-end' : 'justify-start')}>
              {message.role === 'assistant' && <Avatar icon={<Bot size={17} />} tone="red" />}
              <div className={cls('max-w-[88%] rounded-2xl border px-4 py-3', message.role === 'user' ? 'border-cyan-500/20 bg-cyan-500/10 text-gray-100' : 'border-white/10 bg-white/[0.035]')}>
                {message.role === 'assistant' ? formatMarkdown(message.content) : <p className="whitespace-pre-wrap text-sm text-gray-100">{message.content}</p>}
                {message.role === 'assistant' && (
                  <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-white/10 pt-2">
                    {message.persona && <StatusPill tone="red">{personaInfo[message.persona].label}</StatusPill>}
                    {message.mode && <StatusPill tone={message.mode === 'agent' ? 'purple' : 'gray'}>{message.mode === 'agent' ? 'Agent output' : 'Chat response'}</StatusPill>}
                    {message.sources?.slice(0, 3).map((source) => <StatusPill key={source} tone="cyan">{source}</StatusPill>)}
                  </div>
                )}
              </div>
              {message.role === 'user' && <Avatar icon={<User size={17} />} tone="cyan" />}
            </div>
          ))}
          {busy && (
            <div className="flex gap-3">
              <Avatar icon={<Bot size={17} />} tone="red" />
              <div className="rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3">
                <div className="flex items-center gap-2 text-sm text-gray-300"><Loader2 size={15} className="animate-spin text-red-400" /> {notice || 'Thinking...'}</div>
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        <div className="border-t border-white/10 p-3">
          <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
            {quickPrompts.map((prompt) => (
              <button key={prompt} onClick={() => send(prompt)} className="shrink-0 rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-[11px] text-gray-400 transition hover:border-red-500/30 hover:text-red-200">
                {prompt}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder={mode === 'agent' ? 'Give the agent a security task: generate, analyze, explain, research, train...' : 'Ask RedHydra AI anything about defensive security...'}
              className="min-h-[52px] flex-1 resize-none rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-gray-100 outline-none transition placeholder:text-gray-600 focus:border-red-500/40"
            />
            <button onClick={() => send()} disabled={busy || !input.trim()} className="rounded-2xl bg-gradient-to-br from-red-500 to-purple-700 px-5 text-white shadow-lg shadow-red-500/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40">
              <Send size={18} />
            </button>
          </div>
        </div>
      </Panel>

      <Panel className="overflow-hidden">
        <div className="border-b border-white/10 p-4">
          <h3 className="flex items-center gap-2 font-bold"><Brain size={18} className="text-purple-300" /> Agent Control</h3>
          <p className="mt-1 text-xs text-gray-500">Use this panel to steer output without cluttering the chat.</p>
        </div>
        <div className="space-y-3 p-4">
          <div className="rounded-xl border border-white/10 bg-black/20 p-3">
            <p className="text-xs font-semibold text-gray-300">Current mode</p>
            <p className="mt-1 text-sm text-gray-400">{mode === 'agent' ? 'Agent creates structured plans, outputs, testing steps, and limitations.' : 'Chat gives natural guidance, explanations, and quick security help.'}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/20 p-3">
            <p className="text-xs font-semibold text-gray-300">Persona</p>
            <p className="mt-1 text-sm text-gray-400">{personaInfo[persona].description}</p>
          </div>
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3">
            <p className="flex items-center gap-2 text-xs font-semibold text-emerald-200"><CheckCircle2 size={14} /> What works on GitHub Pages</p>
            <ul className="mt-2 space-y-1 text-xs text-gray-400">
              <li>• Built-in defensive assistant</li>
              <li>• Optional client-side API AI</li>
              <li>• Optional local Ollama endpoint</li>
              <li>• CVE lookup through public APIs</li>
              <li>• Exportable scripts and reports</li>
            </ul>
          </div>
          <button onClick={() => downloadFile('redhydra-chat-export.md', messages.map((m) => `## ${m.role}\n\n${m.content}`).join('\n\n---\n\n'), 'text/markdown')} className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2.5 text-sm font-semibold text-red-200 transition hover:bg-red-500/15">
            <Download size={15} /> Export chat as Markdown
          </button>
        </div>
      </Panel>
    </div>
  );
}

function Avatar({ icon, tone }: { icon: ReactNode; tone: 'red' | 'cyan' }) {
  return <div className={cls('flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border', tone === 'red' ? 'border-red-500/25 bg-red-500/10 text-red-300' : 'border-cyan-500/25 bg-cyan-500/10 text-cyan-300')}>{icon}</div>;
}

function ToolBuilder() {
  const [description, setDescription] = useState('Create a Python script to check security headers for my own website.');
  const [language, setLanguage] = useState('Python');
  const [result, setResult] = useState(generateTool(description, language));
  const [tab, setTab] = useState<'code' | 'tests' | 'docs'>('code');
  const content = tab === 'code' ? result.code : tab === 'tests' ? result.tests : result.docs;

  return (
    <FeatureShell title="Tool Builder" subtitle="Generate safe defensive tools with code, tests, and documentation." icon={<Wrench size={22} className="text-red-400" />}>
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[430px_minmax(0,1fr)]">
        <Panel className="p-4">
          <label className="text-xs font-semibold text-gray-400">Natural language command</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="mt-2 h-44 w-full resize-none rounded-xl border border-white/10 bg-black/30 p-3 text-sm outline-none focus:border-red-500/40" />
          <div className="mt-3 grid grid-cols-2 gap-3">
            <select value={language} onChange={(e) => setLanguage(e.target.value)} className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none">
              {['Python', 'JavaScript', 'Bash'].map((lang) => <option key={lang}>{lang}</option>)}
            </select>
            <button onClick={() => setResult(generateTool(description, language))} className="rounded-xl bg-gradient-to-r from-red-500 to-purple-700 px-3 py-2 text-sm font-semibold">Generate</button>
          </div>
          <div className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-100">
            Tools are generated for authorized defensive use only. Unsafe requests return a safe alternative.
          </div>
        </Panel>
        <Panel className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/10 p-3">
            <div className="flex gap-2">
              {(['code', 'tests', 'docs'] as const).map((t) => <button key={t} onClick={() => setTab(t)} className={cls('rounded-lg border px-3 py-1.5 text-xs capitalize', tab === t ? 'border-red-500/30 bg-red-500/15 text-red-200' : 'border-white/10 text-gray-400')}>{t}</button>)}
            </div>
            <div className="flex gap-2">
              <button onClick={() => copyText(content)} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-gray-300"><Copy size={12} className="inline" /> Copy</button>
              <button onClick={() => downloadFile(result.name || 'redhydra-output.txt', content)} className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs text-red-200"><Download size={12} className="inline" /> Download</button>
            </div>
          </div>
          <pre className="max-h-[650px] overflow-auto p-4 text-xs leading-relaxed text-gray-200"><code>{content}</code></pre>
        </Panel>
      </div>
    </FeatureShell>
  );
}

function CodeAnalyzerPanel() {
  const [code, setCode] = useState(`const userInput = location.hash.slice(1);\ndocument.querySelector('#app').innerHTML = userInput;\n`);
  const findings = analyzeCode(code);
  return (
    <FeatureShell title="Code Analyzer" subtitle="Local static pattern review for common defensive security issues." icon={<Code2 size={22} className="text-cyan-400" />}>
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        <Panel className="p-4">
          <textarea value={code} onChange={(e) => setCode(e.target.value)} className="h-[620px] w-full resize-none rounded-xl border border-white/10 bg-black/40 p-4 font-mono text-xs outline-none focus:border-cyan-500/40" />
        </Panel>
        <Panel className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-bold">Findings</h3>
            <StatusPill tone={findings.length ? 'amber' : 'green'}>{findings.length ? `${findings.length} issue(s)` : 'No obvious pattern found'}</StatusPill>
          </div>
          <div className="space-y-3">
            {findings.length ? findings.map((f, i) => (
              <div key={i} className="rounded-xl border border-white/10 bg-black/30 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-white">{f.title}</p>
                  <StatusPill tone={f.severity === 'Critical' || f.severity === 'High' ? 'red' : 'amber'}>{f.severity}</StatusPill>
                </div>
                <p className="mt-2 text-xs text-gray-400"><b>Evidence:</b> {f.evidence}</p>
                <p className="mt-1 text-xs text-gray-400"><b>Fix:</b> {f.fix}</p>
              </div>
            )) : <p className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-100">No obvious high-risk pattern was detected. This does not prove the code is secure. Use tests, review, dependency scanning, and approved security testing.</p>}
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
      const data = await fetchNvd(cve);
      setResult(cveAdvisor([cve.toUpperCase()], `**${data.id}**\n\nPublished: ${data.published}\nLast modified: ${data.lastModified}\nSeverity: ${data.metrics?.baseSeverity || 'not available'} ${data.metrics?.baseScore ? `(${data.metrics.baseScore})` : ''}\n\n${data.description}\n\nReferences:\n${data.refs.map((r: string) => `- ${r}`).join('\n')}`));
    } catch (error) {
      setResult(`Lookup failed: ${error instanceof Error ? error.message : 'unknown error'}\n\nTry again later or verify manually with NVD/vendor advisories.`);
    } finally {
      setLoading(false);
    }
  }
  return (
    <FeatureShell title="Threat Intel" subtitle="CVE lookup, defensive triage, mitigation planning, and report export." icon={<Radar size={22} className="text-amber-400" />}>
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[420px_minmax(0,1fr)]">
        <Panel className="p-4">
          <label className="text-xs font-semibold text-gray-400">CVE ID</label>
          <input value={cve} onChange={(e) => setCve(e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none focus:border-amber-500/40" />
          <button onClick={lookup} disabled={loading} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500/15 px-3 py-2.5 text-sm font-semibold text-amber-100 disabled:opacity-50">
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />} Lookup public CVE data
          </button>
          <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-gray-400">CVE data can be delayed or incomplete. Always verify with vendor advisories and your asset inventory.</div>
        </Panel>
        <Panel className="p-4">
          {result ? <div>{formatMarkdown(result)}</div> : <p className="text-sm text-gray-500">Lookup output appears here.</p>}
        </Panel>
      </div>
    </FeatureShell>
  );
}

function TrainingPanel() {
  return (
    <FeatureShell title="Training Hub" subtitle="Security concepts, awareness, lab-safe practice, and exportable notes." icon={<BookOpen size={22} className="text-emerald-400" />}>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {trainingModules.map((m) => (
          <Panel key={m.title} className="p-4 transition hover:-translate-y-1 hover:border-red-500/25">
            <StatusPill tone="green">{m.level}</StatusPill>
            <h3 className="mt-3 font-bold">{m.title}</h3>
            <p className="mt-2 text-sm text-gray-400">{m.description}</p>
            <p className="mt-4 text-xs text-gray-500">{m.lessons}</p>
          </Panel>
        ))}
      </div>
      <Panel className="mt-3 p-4">
        {formatMarkdown(trainingAdvisor('Teach me SQL injection defense with simple examples and a mini quiz.'))}
      </Panel>
    </FeatureShell>
  );
}

function ResearchPanel() {
  const [sourceText, setSourceText] = useState('Paste advisory notes, vendor text, CVE summary, or article excerpts here.');
  const summary = `## Source-aware research workspace\n\n### Input summary\n\n${sourceText.slice(0, 500)}${sourceText.length > 500 ? '...' : ''}\n\n### Research method\n\n1. Identify claims that need verification.\n2. Separate vendor facts, third-party analysis, and assumptions.\n3. Extract affected systems, mitigations, dates, and confidence level.\n4. Build an executive summary and technical action plan.\n\n### Limitation\n\nThis static site does not perform unrestricted web crawling. Use CVE lookup, public APIs, optional search APIs, or pasted sources.`;
  return (
    <FeatureShell title="Deep Research" subtitle="No fake browsing: use pasted sources, public CVE lookup, and optional API models." icon={<Search size={22} className="text-purple-400" />}>
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        <Panel className="p-4"><textarea value={sourceText} onChange={(e) => setSourceText(e.target.value)} className="h-[560px] w-full resize-none rounded-xl border border-white/10 bg-black/40 p-4 text-sm outline-none focus:border-purple-500/40" /></Panel>
        <Panel className="p-4"><div>{formatMarkdown(summary)}</div></Panel>
      </div>
    </FeatureShell>
  );
}

function DataLab() {
  const [data, setData] = useState('timestamp,event,severity\n2026-05-31,failed_login,medium\n2026-05-31,password_reset,low\n2026-05-31,malware_alert,high');
  const rows = data.trim().split('\n').filter(Boolean);
  const headers = rows[0]?.split(',') || [];
  const body = rows.slice(1).map((r) => r.split(','));
  const severityCounts = body.reduce<Record<string, number>>((acc, row) => {
    const value = row[headers.findIndex((h) => h.toLowerCase().includes('severity'))] || 'unknown';
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
  return (
    <FeatureShell title="Data Lab" subtitle="Local CSV/JSON-style security data analysis and quick insights." icon={<Database size={22} className="text-cyan-400" />}>
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        <Panel className="p-4"><textarea value={data} onChange={(e) => setData(e.target.value)} className="h-[560px] w-full resize-none rounded-xl border border-white/10 bg-black/40 p-4 font-mono text-xs outline-none focus:border-cyan-500/40" /></Panel>
        <Panel className="p-4">
          <h3 className="font-bold">Insights</h3>
          <p className="mt-2 text-sm text-gray-400">Rows parsed: {body.length}. Columns: {headers.join(', ') || 'none'}.</p>
          <div className="mt-4 space-y-2">
            {Object.entries(severityCounts).map(([sev, count]) => <div key={sev} className="rounded-xl border border-white/10 bg-black/30 p-3 text-sm"><span className="font-semibold capitalize">{sev}</span>: {count}</div>)}
          </div>
        </Panel>
      </div>
    </FeatureShell>
  );
}

function SettingsPanel({ config, setConfig }: { config: ProviderConfig; setConfig: (c: ProviderConfig) => void }) {
  return (
    <FeatureShell title="Settings" subtitle="Configure optional AI providers. Keys stay client-side; use restricted keys only." icon={<Settings size={22} className="text-gray-300" />}>
      <Panel className="max-w-3xl p-4">
        <div className="grid gap-4">
          <div>
            <label className="text-xs font-semibold text-gray-400">AI provider</label>
            <select value={config.provider} onChange={(e) => setConfig({ ...config, provider: e.target.value as Provider })} className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none">
              <option value="local">Built-in local guided assistant</option>
              <option value="openai-compatible">OpenAI-compatible API</option>
              <option value="ollama">Local Ollama endpoint</option>
              <option value="webllm">Experimental browser WebLLM</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-400">Endpoint</label>
            <input value={config.endpoint} onChange={(e) => setConfig({ ...config, endpoint: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-400">Model</label>
            <input value={config.model} onChange={(e) => setConfig({ ...config, model: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none" />
          </div>
          <div>
            <label className="flex items-center gap-2 text-xs font-semibold text-gray-400"><KeyRound size={13} /> API key</label>
            <input type="password" value={config.apiKey} onChange={(e) => setConfig({ ...config, apiKey: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none" placeholder="Use restricted keys only" />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-300"><input type="checkbox" checked={config.webSearch} onChange={(e) => setConfig({ ...config, webSearch: e.target.checked })} /> Enable public CVE lookup when possible</label>
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-100">
            <b>Important:</b> GitHub Pages has no backend, so browser-entered API keys are handled client-side. Do not use sensitive production keys. Local Ollama is best for private code when available.
          </div>
        </div>
      </Panel>
    </FeatureShell>
  );
}

function FeatureShell({ title, subtitle, icon, children }: { title: string; subtitle: string; icon: ReactNode; children: ReactNode }) {
  return (
    <div className="min-h-[calc(100vh-106px)] space-y-3">
      <Panel className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5">{icon}</div>
          <div>
            <h2 className="text-xl font-bold">{title}</h2>
            <p className="text-sm text-gray-500">{subtitle}</p>
          </div>
        </div>
      </Panel>
      {children}
    </div>
  );
}
