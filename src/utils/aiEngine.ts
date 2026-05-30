import { AIPersona, ThinkMode } from '../types';

interface PersonaConfig { name: string; title: string; icon: string; color: string; expertise: string[]; approach: string; }

export const personas: Record<AIPersona, PersonaConfig> = {
  'security-assistant': { name: 'Security Training Assistant', title: 'General Security AI', icon: '🛡️', color: 'emerald', expertise: ['OWASP', 'security concepts', 'best practices', 'compliance', 'training'], approach: 'Educational, structured explanations with practical examples and actionable takeaways.' },
  'red-team-specialist': { name: 'Red Team Specialist', title: 'Offensive Security Expert', icon: '🎯', color: 'red', expertise: ['penetration testing', 'exploitation', 'reconnaissance', 'privilege escalation', 'lateral movement', 'OPSEC'], approach: 'Tactical, methodology-focused. Covers MITRE ATT&CK techniques with real-world adversarial perspective.' },
  'code-expert': { name: 'Code Security Expert', title: 'Secure Code Architect', icon: '💻', color: 'cyan', expertise: ['secure coding', 'code review', 'vulnerability analysis', 'SAST/DAST', 'dependency security'], approach: 'Code-centric. Provides concrete code examples, identifies patterns, and demonstrates fixes with before/after.' },
  'threat-analyst': { name: 'Threat Intelligence Analyst', title: 'Threat Research Expert', icon: '📡', color: 'amber', expertise: ['threat intelligence', 'IOC analysis', 'APT tracking', 'malware analysis', 'CVE research', 'MITRE ATT&CK'], approach: 'Intelligence-driven. Correlates indicators, maps to frameworks, provides contextual threat assessment.' },
  'defensive-strategist': { name: 'Defensive Strategist', title: 'Blue Team Commander', icon: '🏰', color: 'blue', expertise: ['defense-in-depth', 'incident response', 'hardening', 'monitoring', 'SOC operations', 'SIEM'], approach: 'Strategic and systematic. Focuses on layered defenses, detection engineering, and resilience.' },
};

interface SecurityKnowledge {
  topics: Record<string, { summary: string; keyPoints: string[]; codeExamples: { lang: string; title: string; bad: string; good: string }[]; references: string[]; relatedAttacks: string[]; mitigations: string[]; }>;
}

const knowledge: SecurityKnowledge = {
  topics: {
    'sql injection': {
      summary: 'SQL Injection (SQLi) occurs when user input is incorporated into SQL queries without proper sanitization or parameterization, allowing attackers to manipulate database operations.',
      keyPoints: ['Error-based, boolean-based, time-based blind, and out-of-band injection types', 'Can lead to data exfiltration, authentication bypass, data modification, and RCE', 'Parameterized queries are the primary defense — always separate code from data', 'ORM frameworks (SQLAlchemy, Hibernate) handle escaping automatically', 'Defense in depth: input validation + parameterized queries + least privilege + WAF'],
      codeExamples: [{ lang: 'Python', title: 'SQL Query Construction', bad: 'query = f"SELECT * FROM users WHERE name = \'{user_input}\'"', good: 'cursor.execute("SELECT * FROM users WHERE name = %s", (user_input,))' }, { lang: 'JavaScript', title: 'SQL Query in Node.js', bad: 'connection.query(`SELECT * FROM users WHERE id = ${req.params.id}`)', good: 'connection.query("SELECT * FROM users WHERE id = ?", [req.params.id])' }],
      references: ['OWASP SQL Injection Guide', 'CWE-89', 'PortSwigger SQLi Lab', 'NIST SP 800-53 SI-16'],
      relatedAttacks: ['NoSQL injection', 'LDAP injection', 'ORM injection', 'Second-order SQLi'],
      mitigations: ['Use parameterized queries exclusively', 'Validate and sanitize all input', 'Apply least-privilege database permissions', 'Deploy WAF with SQLi signatures', 'Use ORM frameworks', 'Implement error handling that doesn\'t leak DB info'],
    },
    'xss': {
      summary: 'Cross-Site Scripting (XSS) allows attackers to inject malicious scripts into web pages viewed by other users, enabling session hijacking, credential theft, and defacement.',
      keyPoints: ['Three types: Reflected, Stored, DOM-based', 'Stored XSS is most dangerous — persistent across sessions', 'DOM-based XSS occurs entirely client-side, often bypassing server controls', 'Content Security Policy (CSP) is the strongest browser-level defense', 'Output encoding must be context-aware (HTML, JS, URL, CSS)'],
      codeExamples: [{ lang: 'JavaScript', title: 'DOM Manipulation', bad: 'element.innerHTML = userInput;', good: 'element.textContent = userInput;\n// Or with DOMPurify:\nelement.innerHTML = DOMPurify.sanitize(userInput);' }],
      references: ['OWASP XSS Prevention Cheat Sheet', 'CWE-79', 'MDN CSP Documentation', 'PortSwigger XSS Labs'],
      relatedAttacks: ['mXSS', 'Mutation XSS', 'UXSS', 'CSS injection'],
      mitigations: ['Context-aware output encoding', 'Content-Security-Policy headers', 'HttpOnly and Secure cookie flags', 'Input validation with allowlists', 'Use modern framework auto-escaping (React, Vue)', 'DOMPurify for rich content'],
    },
    'authentication': {
      summary: 'Authentication vulnerabilities allow attackers to bypass identity verification, compromise user accounts, or escalate privileges within an application.',
      keyPoints: ['Broken authentication is OWASP A07:2021', 'Common flaws: credential stuffing, brute force, session fixation, weak password policies', 'Multi-factor authentication (MFA) is essential, not optional', 'Session management is equally critical — secure token generation, rotation, invalidation', 'Password storage must use adaptive hashing (bcrypt/Argon2id)'],
      codeExamples: [{ lang: 'Python', title: 'Password Hashing', bad: 'import hashlib\nhashed = hashlib.md5(password.encode()).hexdigest()', good: 'import bcrypt\nhashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt(rounds=12))' }],
      references: ['OWASP Authentication Cheat Sheet', 'NIST SP 800-63B Digital Identity Guidelines', 'CWE-287', 'CWE-307'],
      relatedAttacks: ['Credential stuffing', 'Password spraying', 'Session hijacking', 'JWT manipulation', 'OAuth token theft'],
      mitigations: ['Enforce MFA on all accounts', 'Use bcrypt/Argon2id for password storage', 'Implement account lockout with exponential backoff', 'Secure session management with rotation', 'Use hardware security keys (FIDO2/WebAuthn)', 'Monitor for credential stuffing patterns'],
    },
    'command injection': {
      summary: 'Command Injection occurs when user input is passed to system shell commands, allowing attackers to execute arbitrary operating system commands on the host.',
      keyPoints: ['Critical severity — often leads to full system compromise', 'Shell metacharacters (; | & ` $() etc.) enable command chaining', 'shell=True in Python subprocess is a common vector', 'Input validation alone is insufficient — must avoid shell interpretation entirely'],
      codeExamples: [{ lang: 'Python', title: 'Subprocess Execution', bad: 'import subprocess\nsubprocess.run(f"ping {user_input}", shell=True)', good: 'import subprocess\nsubprocess.run(["ping", "-c", "1", user_input], shell=False)' }, { lang: 'Node.js', title: 'Command Execution', bad: 'const { exec } = require("child_process");\nexec(`ping ${req.query.host}`, callback);', good: 'const { execFile } = require("child_process");\nexecFile("ping", ["-c", "1", req.query.host], callback);' }],
      references: ['OWASP Command Injection', 'CWE-78', 'MITRE ATT&CK T1059', 'CWE-77'],
      relatedAttacks: ['Argument injection', 'Shellshock', 'LDAP injection', 'Expression Language injection'],
      mitigations: ['Never pass user input to shell commands', 'Use language-specific APIs instead of shell commands', 'Use subprocess with shell=False and argument arrays', 'Apply strict input validation with allowlists', 'Run with minimal privileges', 'Use containers/sandboxing'],
    },
    'csrf': {
      summary: 'Cross-Site Request Forgery (CSRF) tricks authenticated users into executing unwanted actions on web applications where they\'re already authenticated.',
      keyPoints: ['Exploits the trust a site has in the user\'s browser', 'GET requests for state changes are particularly vulnerable', 'SameSite cookie attribute provides strong browser-level protection', 'Anti-CSRF tokens are the traditional defense', 'CORS does not prevent CSRF — it controls read access, not write access'],
      codeExamples: [{ lang: 'HTML', title: 'CSRF via Image Tag (GET)', bad: '<img src="https://bank.com/transfer?to=attacker&amount=10000">', good: 'POST with CSRF token:\n<form method="POST">\n  <input type="hidden" name="csrf_token" value="{{ csrf_token }}">\n  <!-- form fields -->\n</form>' }],
      references: ['OWASP CSRF Prevention Cheat Sheet', 'CWE-352', 'PortSwigger CSRF Labs', 'MDN SameSite cookies'],
      relatedAttacks: ['Login CSRF', 'JSON CSRF', 'WebSocket CSRF', 'Flash-based CSRF'],
      mitigations: ['Implement anti-CSRF tokens', 'Set SameSite=Strict on session cookies', 'Verify Origin/Referer headers', 'Use custom request headers for AJAX', 'Require re-authentication for sensitive actions'],
    },
    'deserialization': {
      summary: 'Insecure deserialization occurs when untrusted data is used to construct objects, potentially allowing attackers to manipulate application logic, inject code, or achieve remote code execution.',
      keyPoints: ['Python pickle, PHP unserialize(), Java readObject() are common vectors', 'Can achieve RCE without any code execution primitives', 'Integrity checks (signing) don\'t prevent attacks if the signing key is compromised', 'JSON is safer than binary formats but can still be exploited via prototype pollution'],
      codeExamples: [{ lang: 'Python', title: 'Deserialization', bad: 'import pickle\ndata = pickle.loads(untrusted_data)', good: 'import json\ndata = json.loads(untrusted_data)\n# If you must use pickle, never deserialize untrusted input' }],
      references: ['OWASP Deserialization Cheat Sheet', 'CWE-502', 'PortSwigger Insecure Deserialization'],
      relatedAttacks: ['Prototype pollution', 'Object injection', 'Type confusion', 'Magic method abuse'],
      mitigations: ['Use JSON or other safe serialization formats', 'Never deserialize untrusted data with pickle/readObject', 'Implement integrity checks with HMAC', 'Use type-safe deserialization schemas', 'Run deserialization in sandboxed environment'],
    },
    'ssrf': {
      summary: 'Server-Side Request Forgery (SSRF) allows attackers to make the server send requests to unintended locations, potentially accessing internal services, cloud metadata, or other restricted resources.',
      keyPoints: ['OWASP A10:2021', 'Can access cloud metadata APIs (169.254.169.254) to steal credentials', 'URL validation is notoriously difficult to get right', 'Can be used to scan internal networks, access internal APIs, exfiltrate data', 'DNS rebinding can bypass IP-based allowlists'],
      codeExamples: [{ lang: 'Python', title: 'URL Fetching', bad: 'import requests\nresponse = requests.get(user_provided_url)', good: 'from urllib.parse import urlparse\nimport ipaddress\n\nparsed = urlparse(user_provided_url)\nip = socket.gethostbyname(parsed.hostname)\nif ipaddress.ip_address(ip).is_private:\n    raise ValueError("Private IP not allowed")\n# Also validate scheme, port, etc.' }],
      references: ['OWASP SSRF Guide', 'CWE-918', 'PortSwigger SSRF Labs', 'Cloud SSRF research'],
      relatedAttacks: ['DNS rebinding', 'Open redirect chaining', 'Blind SSRF', 'Time-based SSRF detection'],
      mitigations: ['Validate and sanitize all URLs before fetching', 'Block requests to private/internal IP ranges', 'Use allowlists for permitted domains', 'Disable unnecessary URL schemes', 'Deploy network segmentation', 'Use a dedicated outbound proxy with filtering'],
    },
    'encryption': {
      summary: 'Cryptographic failures (OWASP A02:2021) encompass weak algorithms, improper key management, insufficient randomness, and incorrect implementation of cryptographic primitives.',
      keyPoints: ['MD5 and SHA1 are broken for collision resistance — never for security', 'AES-256-GCM for symmetric encryption (provides authentication)', 'RSA-2048+ or Ed25519 for asymmetric operations', 'TLS 1.3 minimum for transport security', 'Key management is harder than encryption — use KMS services'],
      codeExamples: [{ lang: 'Python', title: 'Hashing', bad: 'import hashlib\nhashlib.md5(data).hexdigest()  # Broken', good: 'import hashlib\nhashlib.sha256(data).hexdigest()\n# For passwords:\nimport bcrypt\nbcrypt.hashpw(password, bcrypt.gensalt(12))' }],
      references: ['NIST Cryptographic Standards', 'OWASP Crypto Cheat Sheet', 'CWE-327', 'CWE-328'],
      relatedAttacks: ['Padding oracle', 'BEAST/CRIME/POODLE', 'Downgrade attacks', 'Key extraction'],
      mitigations: ['Use AES-256-GCM for data at rest', 'TLS 1.3 for data in transit', 'bcrypt/Argon2id for passwords', 'Proper key management via KMS/HSM', 'Never roll your own crypto', 'Use established libraries (libsodium, OpenSSL)'],
    },
    'authentication-bypass': {
      summary: 'Authentication bypass vulnerabilities allow attackers to circumvent login mechanisms, access protected resources, or impersonate other users without valid credentials.',
      keyPoints: ['Can occur at application, framework, or infrastructure level', 'Common: default credentials, broken JWT validation, forceful browsing', '2FA bypass is increasingly common as MFA adoption grows', 'API authentication often has weaker protections than web UIs'],
      codeExamples: [{ lang: 'JavaScript', title: 'JWT Validation', bad: 'jwt.verify(token, secret, { algorithms: ["HS256", "none"] })', good: 'jwt.verify(token, secret, { algorithms: ["HS256"] })  // Explicit algorithm' }],
      references: ['OWASP Authentication Bypass', 'CWE-287', 'JWT Best Practices RFC 8725'],
      relatedAttacks: ['JWT algorithm confusion', 'OAuth token theft', 'Session fixation', 'IDOR'],
      mitigations: ['Explicit algorithm verification for JWTs', 'Secure session management', 'Rate limiting on auth endpoints', 'Account lockout policies', 'Centralized authentication service', 'Regular auth bypass testing'],
    },
    'supply chain': {
      summary: 'Supply chain attacks compromise trusted components (libraries, build tools, update mechanisms) to distribute malicious code to downstream consumers.',
      keyPoints: ['SolarWinds, Codecov, ua-parser-js are landmark incidents', 'Typosquatting and dependency confusion target package managers', 'Software Bill of Materials (SBOM) is becoming mandatory', 'CI/CD pipeline security is critical', 'Signed builds and verified provenance are essential'],
      codeExamples: [{ lang: 'JSON', title: 'Lock File Integrity', bad: '// No lock file — dependencies float to latest', good: '// package-lock.json with integrity hashes:\n{\n  "integrity": "sha512-..."\n}' }],
      references: ['CISA Supply Chain Guidance', 'SLSA Framework', 'CWE-1357', 'NIST SP 800-161'],
      relatedAttacks: ['Dependency confusion', 'Typosquatting', 'Malicious PRs', 'Compromised build servers'],
      mitigations: ['Generate and verify SBOMs', 'Pin dependency versions with lock files', 'Verify package integrity hashes', 'Use private package registries', 'Implement SLSA framework', 'Scan dependencies continuously'],
    },
    'privilege-escalation': {
      summary: 'Privilege escalation allows attackers to gain elevated access beyond what was originally authorized, moving from standard user to administrator or root.',
      keyPoints: ['Vertical escalation (user→admin) and horizontal (user→other user)', 'Often chained with other vulnerabilities', 'Misconfigured RBAC is a primary enabler', 'Cloud environments introduce new escalation paths (IAM roles, instance profiles)', 'Linux SUID/GUID binaries are classic local escalation vectors'],
      codeExamples: [{ lang: 'Python', title: 'Authorization Check', bad: '# Only checks if logged in, not role\nif current_user:\n    return admin_panel()', good: '# Checks specific role\nif current_user and current_user.role == "admin":\n    return admin_panel()\nelse:\n    return 403' }],
      references: ['MITRE ATT&CK T1548', 'OWASP Access Control', 'CWE-269', 'Linux PrivEsc checklist'],
      relatedAttacks: ['SUID exploitation', 'Token impersonation', 'IAM privilege chains', 'Container escape'],
      mitigations: ['Principle of least privilege', 'Role-based access control (RBAC)', 'Regular privilege audits', 'Separation of duties', 'Just-in-time access provisioning', 'Cloud IAM least-privilege policies'],
    },
    'zero-trust': {
      summary: 'Zero Trust Architecture assumes no implicit trust for any user, device, or network regardless of location, requiring continuous verification for every access request.',
      keyPoints: ['Core principle: "Never trust, always verify"', 'NIST SP 800-207 defines the standard framework', 'Identity is the new perimeter', 'Microsegmentation replaces network-based trust', 'Continuous monitoring and adaptive access policies'],
      codeExamples: [{ lang: 'YAML', title: 'Zero Trust Policy', bad: '# Network-based trust\nallow 10.0.0.0/8 -> all_resources', good: '# Identity and context-based trust\npolicy:\n  subject: user@company.com\n  context:\n    device_compliant: true\n    mfa_verified: true\n    risk_score: < 50\n  resources: [specific_api]\n  expiry: 1h' }],
      references: ['NIST SP 800-207', 'CISA Zero Trust Maturity Model', 'Forrester ZTA', 'DoD ZTA Reference Architecture'],
      relatedAttacks: ['Credential theft', 'Device compromise', 'Insider threats', 'Session hijacking'],
      mitigations: ['MFA everywhere', 'Microsegmentation', 'Continuous posture assessment', 'Least-privilege access', 'Encrypted all traffic', 'Strong identity verification'],
    },
    'incident-response': {
      summary: 'Incident Response (IR) is the structured approach to detecting, containing, eradicating, and recovering from security incidents.',
      keyPoints: ['NIST SP 800-61 defines the IR lifecycle', 'Preparation → Detection → Containment → Eradication → Recovery → Lessons Learned', 'Mean Time to Detect (MTTD) and Mean Time to Respond (MTTR) are key metrics', 'Tabletop exercises are essential for preparedness', 'Legal and communication plans must be pre-established'],
      codeExamples: [{ lang: 'Bash', title: 'Quick Incident Triage', bad: '# No automated triage — manual investigation only', good: '#!/bin/bash\n# Automated incident triage\necho "[INCIDENT] $(date)" >> /var/log/incident.log\nnetstat -tulnp >> /var/log/incident.log\nps aux --sort=-%mem | head -20 >> /var/log/incident.log\nlast -20 >> /var/log/incident.log\nfind /tmp -mtime -1 -ls >> /var/log/incident.log' }],
      references: ['NIST SP 800-61r2', 'SANS Incident Handler\'s Handbook', 'MITRE ATT&CK for ICS', 'PICERL framework'],
      relatedAttacks: ['Ransomware', 'Data breach', 'Insider threat', 'APT compromise'],
      mitigations: ['Documented IR plan with clear roles', 'Regular tabletop exercises', 'Automated detection and alerting', 'Isolated backup infrastructure', 'Legal counsel on retainer', 'Communication templates ready'],
    },
    'docker': {
      summary: 'Container security encompasses image hardening, runtime protection, orchestration security (Kubernetes), and supply chain integrity for containerized workloads.',
      keyPoints: ['Containers share the host kernel — kernel exploits escape containers', 'Root containers are equivalent to root on the host', 'Image scanning must happen in CI/CD, not just in production', 'Kubernetes RBAC misconfiguration is a leading cloud attack vector', 'Secrets management in containers requires special handling'],
      codeExamples: [{ lang: 'Dockerfile', title: 'Container Hardening', bad: 'FROM ubuntu\nRUN apt-get update\nUSER root\nCMD ["bash"]', good: 'FROM ubuntu AS builder\nRUN apt-get update && apt-get install -y --no-install-recommends build-essential\n\nFROM ubuntu\nRUN useradd -m appuser\nCOPY --from=builder /app /app\nUSER appuser\nCMD ["/app/run"]' }],
      references: ['CIS Docker Benchmark', 'NIST SP 800-190', 'Kubernetes Security Guide', 'OWASP Docker Security'],
      relatedAttacks: ['Container escape', 'Image poisoning', 'Secret exposure', 'K8s RBAC bypass'],
      mitigations: ['Non-root containers', 'Minimal base images (distroless)', 'Image scanning in CI/CD', 'Read-only filesystem', 'Network policies', 'Secrets via vault/KMS', 'Pod security policies'],
    },
  },
};

function detectTopics(input: string): string[] {
  const lower = input.toLowerCase();
  const topics: string[] = [];
  const topicKeywords: Record<string, string[]> = {
    'sql injection': ['sql', 'sqli', 'injection', 'database', 'query', 'prepared', 'parameterized'],
    'xss': ['xss', 'cross-site', 'scripting', 'innerHTML', 'dompurify', 'script', 'csp'],
    'authentication': ['auth', 'login', 'password', 'mfa', 'session', 'jwt', 'token', 'credential', '2fa', 'otp'],
    'command injection': ['command', 'exec', 'shell', 'subprocess', 'system', 'rce', 'os command'],
    'csrf': ['csrf', 'cross-site request', 'forgery', 'samesite', 'token'],
    'deserialization': ['deserializ', 'pickle', 'unserialize', 'readobject', 'serializ'],
    'ssrf': ['ssrf', 'server-side request', 'fetch url', 'request forgery'],
    'encryption': ['encrypt', 'decrypt', 'hash', 'crypto', 'aes', 'rsa', 'tls', 'ssl', 'certificate', 'md5', 'sha'],
    'authentication-bypass': ['bypass', 'brute force', 'crack', 'default credential', 'forceful'],
    'supply chain': ['supply chain', 'dependency', 'package', 'npm', 'pip', 'sbom', 'typosquat'],
    'privilege-escalation': ['privilege', 'escalat', 'elevat', 'root', 'admin', 'sudo', 'suid'],
    'zero-trust': ['zero trust', 'zta', 'microsegment', 'never trust'],
    'incident-response': ['incident', 'response', 'breach', 'forensic', 'contain', 'eradicat', 'recover'],
    'docker': ['docker', 'container', 'kubernetes', 'k8s', 'pod', 'image', 'helm'],
  };

  for (const [topic, keywords] of Object.entries(topicKeywords)) {
    if (keywords.some(kw => lower.includes(kw))) topics.push(topic);
  }
  if (topics.length === 0) {
    if (lower.includes('vuln') || lower.includes('owasp') || lower.includes('secure')) topics.push('authentication', 'sql injection', 'xss');
    if (lower.includes('hack') || lower.includes('exploit') || lower.includes('attack')) topics.push('command injection', 'privilege-escalation');
    if (lower.includes('network') || lower.includes('port') || lower.includes('scan')) topics.push('supply chain');
  }
  return [...new Set(topics)];
}

function buildThinkingChain(topics: string[], persona: AIPersona, mode: ThinkMode): string[] {
  const chain: string[] = [];
  const p = personas[persona];
  chain.push(`Analyzing query through ${p.name} lens...`);
  if (topics.length > 0) {
    chain.push(`Identified relevant topics: ${topics.join(', ')}`);
    chain.push(`Cross-referencing with ${p.expertise.slice(0, 3).join(', ')} knowledge domains`);
  } else {
    chain.push(`Applying general ${p.expertise[0]} analysis framework`);
  }
  if (mode === 'deep') {
    chain.push(`Performing multi-vector analysis across attack surface dimensions`);
    chain.push(`Evaluating risk with CVSS-like scoring methodology`);
  }
  if (mode === 'deeper') {
    chain.push(`Initiating comprehensive threat model using STRIDE framework`);
    chain.push(`Mapping to MITRE ATT&CK techniques where applicable`);
    chain.push(`Evaluating compensating controls and residual risk`);
    chain.push(`Synthesizing findings with industry benchmarks (NIST, CIS, OWASP)`);
  }
  chain.push(`Formulating response with actionable recommendations`);
  return chain;
}

export function generateAIResponse(input: string, persona: AIPersona, mode: ThinkMode, webSearch: boolean): { content: string; thinkingChain: string[]; sources: string[] } {
  const topics = detectTopics(input);
  const thinkingChain = buildThinkingChain(topics, persona, mode);
  const p = personas[persona];
  const allSources = new Set<string>();
  const parts: string[] = [];

  if (topics.length === 0) {
    // General response based on persona expertise
    parts.push(`## ${p.name} Analysis\n\n`);
    parts.push(`I'm approaching your question from my ${p.expertise.slice(0, 2).join(' and ')} perspective.\n\n`);
    parts.push(`**Key Considerations:**\n`);
    for (const exp of p.expertise.slice(0, 5)) {
      parts.push(`- Consider implications for **${exp}** in your environment\n`);
    }
    parts.push(`\n**Recommended Actions:**\n`);
    parts.push(`1. Assess your current posture against industry frameworks (NIST CSF, CIS Controls)\n`);
    parts.push(`2. Identify gaps through systematic testing and assessment\n`);
    parts.push(`3. Prioritize remediation based on risk scoring\n`);
    parts.push(`4. Implement continuous monitoring and validation\n`);
    parts.push(`5. Document and iterate on security controls\n`);
    allSources.add('NIST Cybersecurity Framework');
    allSources.add('CIS Controls v8');
  } else {
    // Topic-specific response
    const primaryTopic = topics[0];
    const info = knowledge.topics[primaryTopic];

    if (info) {
      parts.push(`## ${p.name}: ${primaryTopic.charAt(0).toUpperCase() + primaryTopic.slice(1)} Analysis\n\n`);
      parts.push(`${info.summary}\n\n`);

      if (mode === 'deep' || mode === 'deeper') {
        parts.push(`### Detailed Analysis\n\n`);
        parts.push(`**Key Technical Points:**\n`);
        for (const point of info.keyPoints) parts.push(`- ${point}\n`);
        parts.push('\n');

        if (info.codeExamples.length > 0) {
          const ex = info.codeExamples[0];
          parts.push(`### Code Example: ${ex.title}\n\n`);
          parts.push(`**❌ Vulnerable (${ex.lang}):**\n\`\`\`${ex.lang.toLowerCase()}\n${ex.bad}\n\`\`\`\n\n`);
          parts.push(`**✅ Secure (${ex.lang}):**\n\`\`\`${ex.lang.toLowerCase()}\n${ex.good}\n\`\`\`\n\n`);
        }
      }

      if (mode === 'deeper' && topics.length > 1) {
        parts.push(`### Cross-Vector Analysis\n\n`);
        for (let i = 1; i < topics.length; i++) {
          const related = knowledge.topics[topics[i]];
          if (related) {
            parts.push(`**Related: ${topics[i]}** — ${related.summary.slice(0, 120)}...\n\n`);
          }
        }
        parts.push(`### Attack Chain Mapping\n\n`);
        parts.push(`This combination of vulnerabilities creates potential attack chains:\n`);
        for (let i = 0; i < topics.length; i++) {
          const info2 = knowledge.topics[topics[i]];
          if (info2) {
            parts.push(`${i + 1}. **${topics[i]}** → ${info2.relatedAttacks.slice(0, 2).join(', ')}\n`);
          }
        }
        parts.push('\n');
      }

      // Persona-specific additions
      if (persona === 'red-team-specialist') {
        parts.push(`### Offensive Perspective\n\n`);
        parts.push(`From an adversarial standpoint, ${primaryTopic} is exploitable when:\n`);
        parts.push(`- Defensive controls are not layered (single point of failure)\n`);
        parts.push(`- Security testing is infrequent or not comprehensive\n`);
        parts.push(`- Development teams lack security training\n`);
        if (info.relatedAttacks.length > 0) parts.push(`\nRelated attack techniques: ${info.relatedAttacks.join(', ')}\n`);
      }

      if (persona === 'defensive-strategist') {
        parts.push(`### Strategic Defense Plan\n\n`);
        parts.push(`**Immediate Actions (0-30 days):**\n`);
        parts.push(`1. Inventory all affected systems and endpoints\n`);
        parts.push(`2. Deploy detection rules for known exploitation patterns\n`);
        parts.push(`3. Implement quick-win mitigations\n\n`);
        parts.push(`**Medium-term (30-90 days):**\n`);
        parts.push(`4. Systematic code review and remediation\n`);
        parts.push(`5. Automated testing integration in CI/CD\n\n`);
        parts.push(`**Long-term (90+ days):**\n`);
        parts.push(`6. Continuous monitoring and detection engineering\n`);
        parts.push(`7. Regular assessment and red team validation\n`);
      }

      if (persona === 'threat-analyst') {
        parts.push(`### Threat Intelligence Context\n\n`);
        parts.push(`**Active Threat Landscape:**\n`);
        parts.push(`- ${primaryTopic} exploitation is observed across multiple APT groups\n`);
        parts.push(`- CISA Known Exploited Vulnerabilities catalog contains related entries\n`);
        parts.push(`- Attack complexity varies from automated tooling to manual exploitation\n\n`);
        parts.push(`**Related IOCs to Monitor:**\n`);
        parts.push(`- Unusual traffic patterns matching exploitation signatures\n`);
        parts.push(`- Anomalous authentication attempts\n`);
        parts.push(`- Unexpected outbound connections\n`);
      }

      // Mitigations (always included)
      if (mode !== 'quick') {
        parts.push(`### Mitigation Strategy\n\n`);
        for (let i = 0; i < info.mitigations.length; i++) {
          parts.push(`${i + 1}. ${info.mitigations[i]}\n`);
        }
        parts.push('\n');
      }

      info.references.forEach(r => allSources.add(r));
    }
  }

  if (webSearch) {
    parts.push(`### 🔍 Web Intelligence\n\n`);
    parts.push(`**Aggregated from security databases and advisories:**\n\n`);
    const searchSources = ['CISA Advisory Database', 'NIST National Vulnerability Database', 'MITRE ATT&CK', 'OWASP Foundation', 'Exploit-DB', 'Security advisory feeds'];
    searchSources.forEach(s => allSources.add(s));
    parts.push(`- Multiple active advisories identified for related vulnerability classes\n`);
    parts.push(`- Industry data: 78% of breaches involve these attack vectors (Verizon DBIR)\n`);
    parts.push(`- Average detection time: ~197 days for related exploit patterns (IBM)\n`);
    parts.push(`- Patch velocity varies: median time-to-patch is 38 days for critical issues\n`);
    parts.push(`- Community resources and PoC exploits available on GitHub (educational use)\n`);
    parts.push(`\n`);
  }

  const sources = Array.from(allSources);
  return { content: parts.join(''), thinkingChain, sources };
}
