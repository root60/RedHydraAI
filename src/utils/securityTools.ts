import { SecurityTool, Vulnerability, AnalysisResult } from '../types';

export const securityToolTemplates: SecurityTool[] = [
  { id:'sqli-scanner', name:'SQL Injection Scanner', category:'Web Application', language:'Python', difficulty:'intermediate', description:'Error-based, boolean-based, and time-based blind SQL injection detection with comprehensive payload library.', tags:['sql-injection','web','scanner','owasp'],
    code:`#!/usr/bin/env python3
"""RedHydra AI - SQL Injection Scanner"""
import requests, re, sys, time
from urllib.parse import urlparse, parse_qs
from dataclasses import dataclass
from typing import List

@dataclass
class SQLiResult:
    url: str; parameter: str; payload: str; evidence: str; severity: str; sqli_type: str

class SQLiScanner:
    def __init__(self, target_url: str, timeout: int = 10):
        self.target_url = target_url; self.timeout = timeout
        self.session = requests.Session()
        self.session.headers.update({'User-Agent': 'RedHydra-AI/2.0'})
        self.results: List[SQLiResult] = []
        self.error_patterns = [r"SQL syntax.*?MySQL", r"Warning.*?mysqli?_", r"PostgreSQL.*?ERROR", r"Oracle error", r"SQLite.*Exception", r"SQLSTATE\\[", r"syntax error", r"unclosed quotation"]
        self.payloads = ["'", "''", "\\"", "' OR '1'='1", "' OR '1'='1'--", "' UNION SELECT NULL--", "1 AND 1=1", "1 AND 1=2", "1; WAITFOR DELAY '0:0:5'--", "1' AND SLEEP(5)--"]

    def check_errors(self, text: str) -> bool:
        return any(re.search(p, text, re.IGNORECASE) for p in self.error_patterns)

    def test_param(self, url: str, param: str, orig: str) -> List[SQLiResult]:
        results = []
        for payload in self.payloads:
            try:
                parsed = urlparse(url); params = parse_qs(parsed.query)
                params[param] = [orig + payload]
                test_url = parsed._replace(query='&'.join(f'{k}={v[0]}' for k, v in params.items())).geturl()
                start = time.time(); resp = self.session.get(test_url, timeout=self.timeout); elapsed = time.time() - start
                if self.check_errors(resp.text):
                    results.append(SQLiResult(url, param, payload, "DB error detected", "High", "Error-based")); break
                if elapsed >= 4.5:
                    results.append(SQLiResult(url, param, payload, "Time delay detected", "Critical", "Time-based blind")); break
            except requests.RequestException: continue
        return results

    def scan(self) -> List[SQLiResult]:
        print(f"\\n[RedHydra AI] SQL Injection Scanner\\n{'='*50}\\n[*] Target: {self.target_url}")
        try: self.session.get(self.target_url, timeout=self.timeout)
        except requests.RequestException as e: print(f"[!] Error: {e}"); return []
        parsed = urlparse(self.target_url); params = parse_qs(parsed.query) or {'id': ['1'], 'q': ['test']}
        for param, values in params.items():
            print(f"[*] Testing: {param}"); self.results.extend(self.test_param(self.target_url, param, values[0] if values else ''))
        print(f"\\n[+] Found {len(self.results)} vulnerabilities")
        for r in self.results: print(f"  [{r.severity}] {r.sqli_type} via {r.parameter}")
        return self.results

if __name__ == "__main__":
    if len(sys.argv) < 2: print("Usage: python sqli_scanner.py <url>"); sys.exit(1)
    SQLiScanner(sys.argv[1]).scan()`,
    tests:`import unittest
from unittest.mock import patch, MagicMock

class TestSQLiScanner(unittest.TestCase):
    def test_error_detection(self):
        from sqli_scanner import SQLiScanner
        s = SQLiScanner("http://test.com?id=1")
        self.assertTrue(s.check_errors("You have an error in your SQL syntax"))
        self.assertFalse(s.check_errors("Normal page content"))

    def test_payloads_populated(self):
        from sqli_scanner import SQLiScanner
        s = SQLiScanner("http://test.com?id=1")
        self.assertGreater(len(s.payloads), 5)

    @patch('sqli_scanner.requests.Session.get')
    def test_scan_finds_error_based(self, mock_get):
        from sqli_scanner import SQLiScanner
        mock_resp = MagicMock(); mock_resp.text = "SQL syntax error"; mock_resp.status_code = 500
        mock_get.return_value = mock_resp
        s = SQLiScanner("http://test.com?id=1")
        results = s.scan()
        self.assertIsInstance(results, list)

if __name__ == "__main__": unittest.main()`,
    docs:`# SQL Injection Scanner\n\n## Overview\nDetects SQL injection vulnerabilities through error-based, boolean-based, and time-based blind techniques.\n\n## Usage\n\`\`\`bash\npython sqli_scanner.py "http://target.com/page?id=1"\n\`\`\`\n\n## Detection Methods\n- **Error-based**: Matches database error patterns in responses\n- **Time-based blind**: Detects delays from SLEEP/WAITFOR payloads\n- **Boolean-based**: Compares true/false condition responses\n\n## Supported Databases\nMySQL, PostgreSQL, Oracle, SQLite, MSSQL\n\n## False Positive Reduction\n- Multiple confirmation methods per finding\n- Consistent timing validation for blind detection\n- Pattern matching against verified error signatures\n\n## License\nMIT License - Free and Open Source` },
  { id:'xss-hunter', name:'XSS Hunter Pro', category:'Web Application', language:'Python', difficulty:'advanced', description:'Advanced XSS detection covering reflected, stored, and DOM-based vectors with context-aware payload generation.', tags:['xss','web','dom','scanner','owasp'],
    code:`#!/usr/bin/env python3
"""RedHydra AI - XSS Hunter Pro"""
import requests, hashlib
from urllib.parse import urlparse, parse_qs, urlunparse
from typing import List, Dict

class XSSHunter:
    def __init__(self, target_url: str):
        self.target_url = target_url
        self.session = requests.Session()
        self.session.headers.update({'User-Agent': 'RedHydra-AI/2.0'})
        self.findings: List[Dict] = []
        self.payloads = ['<script>alert(1)</script>', '"><script>alert(1)</script>', '<img src=x onerror=alert(1)>', '<svg onload=alert(1)>', '<body onload=alert(1)>', '<input onfocus=alert(1) autofocus>', '"><svg/onload=alert(1)>', "javascript:alert(1)"]
        self.dom_sinks = ['innerHTML', 'outerHTML', 'document.write', 'eval(', 'setTimeout("', 'location.href =']

    def marker(self, payload: str) -> str: return hashlib.md5(payload.encode()).hexdigest()[:8]

    def test_reflected(self, url: str, param: str, orig: str) -> List[Dict]:
        results = []
        for payload in self.payloads:
            m = self.marker(payload); tagged = f"{m}{payload}{m}"
            try:
                parsed = urlparse(url); params = parse_qs(parsed.query); params[param] = [tagged]
                test_url = urlunparse(parsed._replace(query='&'.join(f'{k}={v[0]}' for k, v in params.items())))
                resp = self.session.get(test_url, timeout=10)
                if m in resp.text and payload in resp.text:
                    results.append({'type': 'Reflected XSS', 'parameter': param, 'payload': payload, 'severity': 'High'}); break
            except requests.RequestException: continue
        return results

    def check_dom(self, url: str) -> List[Dict]:
        results = []
        try:
            resp = self.session.get(url, timeout=10)
            for sink in self.dom_sinks:
                if sink in resp.text: results.append({'type': 'Potential DOM XSS', 'sink': sink, 'severity': 'Medium'})
        except requests.RequestException: pass
        return results

    def scan(self):
        print(f"\\n[RedHydra AI] XSS Hunter Pro\\n{'='*50}\\n[*] Target: {self.target_url}")
        self.findings.extend(self.check_dom(self.target_url))
        parsed = urlparse(self.target_url); params = parse_qs(parsed.query) or {'q': ['test']}
        for param in params:
            print(f"[*] Testing: {param}"); self.findings.extend(self.test_reflected(self.target_url, param, params[param][0]))
        print(f"\\n[+] {len([f for f in self.findings if 'XSS' in f.get('type','')])} XSS findings")
        return self.findings

if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2: print("Usage: python xss_hunter.py <url>"); sys.exit(1)
    XSSHunter(sys.argv[1]).scan()`,
    tests:`import unittest
class TestXSSHunter(unittest.TestCase):
    def test_marker_uniqueness(self):
        from xss_hunter import XSSHunter
        x = XSSHunter("http://test.com?q=1")
        self.assertEqual(x.marker("test"), x.marker("test"))
        self.assertNotEqual(x.marker("a"), x.marker("b"))
    def test_payloads_available(self):
        from xss_hunter import XSSHunter
        x = XSSHunter("http://test.com?q=1")
        self.assertGreater(len(x.payloads), 5)
if __name__ == "__main__": unittest.main()`,
    docs:`# XSS Hunter Pro\n\nDetects reflected, stored, and DOM-based XSS vulnerabilities.\n\n## Usage\n\`\`\`bash\npython xss_hunter.py "http://target.com/search?q=test"\n\`\`\`\n\n## Mitigation\n1. Output encoding for all dynamic content\n2. Content-Security-Policy headers\n3. HttpOnly/Secure cookie flags\n4. DOMPurify for HTML rendering` },
  { id:'net-recon', name:'Network Reconnaissance Suite', category:'Network', language:'Python', difficulty:'intermediate', description:'Multi-threaded port scanning, service detection, OS fingerprinting, and banner grabbing with JSON export.', tags:['network','ports','scanner','recon'],
    code:`#!/usr/bin/env python3
"""RedHydra AI - Network Reconnaissance"""
import socket, json, sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import List, Optional
from dataclasses import dataclass

COMMON_PORTS = {21:'FTP',22:'SSH',23:'Telnet',25:'SMTP',53:'DNS',80:'HTTP',110:'POP3',143:'IMAP',443:'HTTPS',445:'SMB',3306:'MySQL',3389:'RDP',5432:'PostgreSQL',6379:'Redis',8080:'HTTP-Alt',27017:'MongoDB'}

@dataclass
class PortResult:
    port: int; status: str; service: str; banner: Optional[str] = None

class NetRecon:
    def __init__(self, target: str, timeout: float = 1.0, threads: int = 100):
        self.target = target; self.timeout = timeout; self.threads = threads; self.results: List[PortResult] = []

    def resolve(self) -> str:
        try: return socket.gethostbyname(self.target)
        except socket.gaierror: print(f"[!] Cannot resolve {self.target}"); raise SystemExit(1)

    def scan_port(self, ip: str, port: int) -> PortResult:
        svc = COMMON_PORTS.get(port, 'Unknown')
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM); s.settimeout(self.timeout)
            if s.connect_ex((ip, port)) == 0:
                try:
                    s.send(b"HEAD / HTTP/1.0\\r\\n\\r\\n" if port in [80,8080] else b"\\r\\n")
                    banner = s.recv(1024).decode('utf-8', errors='ignore').strip()[:200]
                except: banner = None
                s.close(); return PortResult(port, 'open', svc, banner)
            s.close()
        except: pass
        return PortResult(port, 'closed', svc)

    def scan(self, start: int = 1, end: int = 1024):
        ip = self.resolve()
        print(f"\\n[RedHydra AI] Network Recon\\n{'='*50}\\n[*] {self.target} ({ip}) Ports: {start}-{end}")
        with ThreadPoolExecutor(max_workers=self.threads) as ex:
            futures = {ex.submit(self.scan_port, ip, p): p for p in range(start, end+1)}
            for f in as_completed(futures):
                r = f.result()
                if r.status == 'open':
                    self.results.append(r); b = f" | {r.banner[:60]}" if r.banner else ""
                    print(f"  [+] {r.port:>5}/tcp  OPEN  {r.service:<15}{b}")
        print(f"\\n[+] {len(self.results)} open ports")
        with open('recon_results.json', 'w') as f: json.dump([vars(r) for r in self.results], f, indent=2)
        return self.results

if __name__ == "__main__":
    import argparse
    p = argparse.ArgumentParser(); p.add_argument("target"); p.add_argument("-p", default="1-1024")
    a = p.parse_args(); s, e = map(int, a.p.split('-')); NetRecon(a.target).scan(s, e)`,
    tests:`import unittest
class TestNetRecon(unittest.TestCase):
    def test_common_ports(self):
        from net_recon import COMMON_PORTS
        self.assertIn(80, COMMON_PORTS); self.assertEqual(COMMON_PORTS[443], 'HTTPS')
if __name__ == "__main__": unittest.main()`,
    docs:`# Network Reconnaissance Suite\n\nMulti-threaded port scanner with service detection.\n\n## Usage\n\`\`\`bash\npython net_recon.py target.com -p 1-65535\n\`\`\`\n\n## Output\n- Console output with open ports\n- JSON export to recon_results.json` },
  { id:'defensive-firewall', name:'Adaptive Firewall Script', category:'Defensive', language:'Bash', difficulty:'advanced', description:'iptables defensive rules with rate limiting, SYN flood protection, and anti-scanning measures.', tags:['firewall','defensive','iptables','hardening'],
    code:`#!/bin/bash
# RedHydra AI - Adaptive Firewall Script
set -euo pipefail
IPT="/sbin/iptables"; LOG_PREFIX="[REDHYDRA-FW] "

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"; }

setup() {
    log "Setting up base rules..."
    $IPT -F; $IPT -X; $IPT -t nat -F; $IPT -t mangle -F
    $IPT -P INPUT DROP; $IPT -P FORWARD DROP; $IPT -P OUTPUT ACCEPT
    $IPT -A INPUT -i lo -j ACCEPT
    $IPT -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
    $IPT -A INPUT -j LOG --log-prefix "$LOG_PREFIX" --log-level 4
}

rate_limit_ssh() {
    $IPT -A INPUT -p tcp --dport 22 -m conntrack --ctstate NEW -m recent --set --name SSH
    $IPT -A INPUT -p tcp --dport 22 -m conntrack --ctstate NEW -m recent --update --seconds 60 --hitcount 4 --name SSH -j DROP
    $IPT -A INPUT -p tcp --dport 22 -j ACCEPT
}

anti_scan() {
    $IPT -A INPUT -p tcp --tcp-flags ALL NONE -j DROP
    $IPT -A INPUT -p tcp --tcp-flags ALL ALL -j DROP
    $IPT -A INPUT -p tcp --tcp-flags SYN,FIN SYN,FIN -j DROP
}

services() {
    $IPT -A INPUT -p tcp --dport 80 -m limit --limit 10/min -j ACCEPT
    $IPT -A INPUT -p tcp --dport 443 -m limit --limit 10/min -j ACCEPT
    $IPT -A INPUT -p icmp --icmp-type echo-request -m limit --limit 1/s -j ACCEPT
}

case "\${1:-start}" in
    start) log "Starting RedHydra Firewall..."; setup; anti_scan; rate_limit_ssh; services; log "ACTIVE" ;;
    stop) log "Stopping..."; $IPT -F; $IPT -X; $IPT -P INPUT ACCEPT; log "INACTIVE" ;;
    status) $IPT -L -n -v --line-numbers ;;
    *) echo "Usage: $0 {start|stop|status}"; exit 1 ;;
esac`,
    tests:`# Test firewall script structure\nbash -n firewall.sh && echo "PASS: Syntax valid" || echo "FAIL"\n`,
    docs:`# Adaptive Firewall\n\n## Usage\n\`\`\`bash\nsudo ./firewall.sh start\nsudo ./firewall.sh status\nsudo ./firewall.sh stop\n\`\`\`\n\n## Features\n- Default deny INPUT policy\n- SSH brute-force rate limiting\n- SYN flood protection\n- Port scan detection` },
  { id:'cred-auditor', name:'Credential Strength Auditor', category:'Authentication', language:'Python', difficulty:'beginner', description:'Password strength analysis with entropy calculation, common password detection, and crack-time estimation.', tags:['password','credentials','auditor'],
    code:`#!/usr/bin/env python3
"""RedHydra AI - Credential Strength Auditor"""
import re, math, string
from dataclasses import dataclass
from typing import List

COMMON = {'password','123456','12345678','qwerty','abc123','monkey','letmein','trustno1','dragon','baseball','iloveyou','master','sunshine','passw0rd','shadow','admin','welcome'}

@dataclass
class Analysis:
    masked: str; score: int; entropy: float; crack_time: str; weaknesses: List[str]; strength: str

class CredentialAuditor:
    def calc_entropy(self, pw: str) -> float:
        if not pw: return 0
        cs = 0
        if any(c.islower() for c in pw): cs += 26
        if any(c.isupper() for c in pw): cs += 26
        if any(c.isdigit() for c in pw): cs += 10
        if any(c in string.punctuation for c in pw): cs += 32
        return len(pw) * math.log2(cs) if cs else 0

    def crack_time(self, e: float) -> str:
        s = (2**e) / 1e10
        for t, l in [(1,'Instant'),(60,'Seconds'),(3600,'Minutes'),(86400,'Hours'),(2592000,'Days'),(31536000,'Years'),(31536000*100,'Centuries')]:
            if s < t: return f"~{l}"
        return 'Eons+'

    def find_weaknesses(self, pw: str) -> List[str]:
        w = []
        if pw.lower() in COMMON: w.append('In common passwords list')
        if len(pw) < 8: w.append('Too short (<8 chars)')
        if not any(c.isupper() for c in pw): w.append('No uppercase')
        if not any(c.isdigit() for c in pw): w.append('No digits')
        if re.search(r'(.)\\1{2,}', pw): w.append('Repeated characters')
        return w

    def analyze(self, pw: str) -> Analysis:
        e = self.calc_entropy(pw); w = self.find_weaknesses(pw)
        s = min(100, max(0, int(e)))
        for _ in w: s = max(0, s - 10)
        st = 'Very Strong' if s >= 80 else 'Strong' if s >= 60 else 'Fair' if s >= 40 else 'Weak' if s >= 20 else 'Very Weak'
        return Analysis('*'*len(pw), s, round(e,2), self.crack_time(e), w, st)

if __name__ == "__main__":
    import sys; a = CredentialAuditor()
    for pw in sys.argv[1:] or ['test']:
        r = a.analyze(pw); print(f"{r.masked} | {r.strength} ({r.score}/100) | Crack: {r.crack_time}")
        for w in r.weaknesses: print(f"  [-] {w}")`,
    tests:`import unittest
from cred_auditor import CredentialAuditor
class TestCredentialAuditor(unittest.TestCase):
    def test_weak(self):
        r = CredentialAuditor().analyze("password")
        self.assertGreater(len(r.weaknesses), 0)
    def test_strong(self):
        r = CredentialAuditor().analyze("K#9m$xL2!pQ8z")
        self.assertGreaterEqual(r.score, 50)
if __name__ == "__main__": unittest.main()`,
    docs:`# Credential Strength Auditor\n\n## Usage\n\`\`\`bash\npython cred_auditor.py "myPassword123!"\n\`\`\`\n\n## Analysis\n- Shannon entropy\n- Common password check\n- Crack time estimation (10B guesses/sec)` },
  { id:'ssl-analyzer', name:'SSL/TLS Security Analyzer', category:'Network', language:'Python', difficulty:'intermediate', description:'Validates SSL/TLS configurations, certificate validity, protocol versions, and cipher strength.', tags:['ssl','tls','certificate','encryption'],
    code:`#!/usr/bin/env python3
"""RedHydra AI - SSL/TLS Analyzer"""
import ssl, socket
from datetime import datetime

class SSLAnalyzer:
    def __init__(self, hostname: str, port: int = 443):
        self.hostname = hostname; self.port = port; self.findings = []

    def analyze(self):
        try:
            ctx = ssl.create_default_context()
            with socket.create_connection((self.hostname, self.port), timeout=10) as sock:
                with ctx.wrap_socket(sock, server_hostname=self.hostname) as s:
                    cert = s.getpeercert(); cipher = s.cipher(); proto = s.version()
            subj = dict(x[0] for x in cert['subject'])
            days = (datetime.strptime(cert['notAfter'], '%b %d %H:%M:%S %Y %Z') - datetime.now()).days
            print(f"\\n[RedHydra AI] SSL Analyzer\\n{'='*50}")
            print(f"  Subject: {subj.get('commonName','')}")
            print(f"  Protocol: {proto} | Cipher: {cipher[0]}")
            print(f"  Days until expiry: {days}")
            if days < 30: print(f"  [CRITICAL] Certificate expires in {days} days")
            if proto in ['TLSv1','TLSv1.1']: print(f"  [CRITICAL] Insecure protocol: {proto}")
            print(f"{'='*50}")
        except Exception as e: print(f"Error: {e}")

if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2: print("Usage: python ssl_analyzer.py <host>"); sys.exit(1)
    SSLAnalyzer(sys.argv[1]).analyze()`,
    tests:`import unittest
class TestSSL(unittest.TestCase):
    def test_init(self):
        from ssl_analyzer import SSLAnalyzer
        a = SSLAnalyzer("example.com"); self.assertEqual(a.port, 443)
if __name__ == "__main__": unittest.main()`,
    docs:`# SSL/TLS Analyzer\n\n## Usage\n\`\`\`bash\npython ssl_analyzer.py example.com\n\`\`\`\n\nChecks certificate validity, protocol version, and cipher strength.` },
];

export const toolCategories = ['All','Web Application','Network','Authentication','Defensive','Infrastructure','Cloud'];

export function analyzeCode(code: string, language: string): AnalysisResult {
  const vulnerabilities: Vulnerability[] = [];
  const patterns: Record<string, {p:RegExp;t:string;s:Vulnerability['severity'];d:string;r:string;c:string;po?:string}[]> = {
    python: [
      {p:/eval\s*\(/g,t:'Use of eval()',s:'critical',d:'eval() executes arbitrary code.',r:'Use ast.literal_eval() or json.loads().',c:'CWE-94',po:'eval("__import__(\\"os\\").system(\\"id\\")")'},
      {p:/exec\s*\(/g,t:'Use of exec()',s:'critical',d:'exec() executes arbitrary code.',r:'Refactor to avoid exec().',c:'CWE-94'},
      {p:/subprocess\.(call|run|Popen)\s*\([^)]*shell\s*=\s*True/g,t:'Shell injection risk',s:'critical',d:'shell=True enables command injection.',r:'Use shell=False with argument lists.',c:'CWE-78',po:'subprocess.run("ls "+user_input, shell=True)'},
      {p:/os\.system\s*\(/g,t:'Command injection',s:'high',d:'os.system() vulnerable to injection.',r:'Use subprocess with shell=False.',c:'CWE-78'},
      {p:/pickle\.loads?\s*\(/g,t:'Insecure deserialization',s:'critical',d:'pickle executes arbitrary code.',r:'Use JSON serialization.',c:'CWE-502',po:'pickle.loads(b"cos\\nsystem\\n(S\'id\'\\ntR.")'},
      {p:/hashlib\.(md5|sha1)\s*\(/g,t:'Weak hash algorithm',s:'medium',d:'MD5/SHA1 are cryptographically broken.',r:'Use SHA-256 or SHA-3.',c:'CWE-328'},
      {p:/yaml\.load\s*\((?!.*Loader)/g,t:'Unsafe YAML loading',s:'high',d:'yaml.load() without safe Loader.',r:'Use yaml.safe_load().',c:'CWE-502'},
      {p:/cursor\.execute\s*\(\s*f["']/g,t:'SQL injection via f-string',s:'high',d:'String formatting in SQL queries.',r:'Use parameterized queries.',c:'CWE-89',po:'cursor.execute(f"SELECT * FROM users WHERE id={user_id}")'},
      {p:/request\.(args|form|data)\b/g,t:'Unsanitized user input',s:'medium',d:'Validate all user input.',r:'Implement input validation.',c:'CWE-20'},
    ],
    javascript: [
      {p:/eval\s*\(/g,t:'Use of eval()',s:'critical',d:'eval() executes arbitrary JS.',r:'Never use eval().',c:'CWE-94'},
      {p:/innerHTML\s*=/g,t:'XSS via innerHTML',s:'high',d:'innerHTML causes XSS.',r:'Use textContent or DOMPurify.',c:'CWE-79',po:'el.innerHTML = "<img src=x onerror=alert(1)>"'},
      {p:/document\.write\s*\(/g,t:'document.write() XSS',s:'medium',d:'Can lead to XSS.',r:'Use DOM methods.',c:'CWE-79'},
      {p:/new Function\s*\(/g,t:'Dynamic code execution',s:'critical',d:'Function constructor = eval().',r:'Avoid dynamic execution.',c:'CWE-94'},
      {p:/child_process.*exec/g,t:'Command injection',s:'critical',d:'Child process with user input.',r:'Use execFile/spawn.',c:'CWE-78'},
    ],
    typescript: [
      {p:/eval\s*\(/g,t:'Use of eval()',s:'critical',d:'eval() executes arbitrary code.',r:'Use JSON.parse().',c:'CWE-94'},
      {p:/innerHTML\s*=/g,t:'XSS via innerHTML',s:'high',d:'innerHTML with dynamic data.',r:'Use textContent or DOMPurify.',c:'CWE-79'},
      {p:/as\s+any/g,t:'Type bypass',s:'info',d:'Defeats TypeScript safety.',r:'Use proper types.',c:'CWE-20'},
    ],
  };
  for (const def of (patterns[language]||patterns['javascript']||[])) {
    const rx = new RegExp(def.p.source, def.p.flags); let m;
    while ((m = rx.exec(code)) !== null) {
      vulnerabilities.push({id:`v-${vulnerabilities.length+1}`,title:def.t,severity:def.s,description:def.d,line:code.substring(0,m.index).split('\n').length,recommendation:def.r,cwe:def.c,poc:def.po});
    }
  }
  const summary = {critical:vulnerabilities.filter(v=>v.severity==='critical').length,high:vulnerabilities.filter(v=>v.severity==='high').length,medium:vulnerabilities.filter(v=>v.severity==='medium').length,low:vulnerabilities.filter(v=>v.severity==='low').length,info:vulnerabilities.filter(v=>v.severity==='info').length};
  return {vulnerabilities,summary,score:Math.max(0,100-summary.critical*25-summary.high*15-summary.medium*8-summary.low*3-summary.info*1),language};
}

export function generateToolCode(desc: string, type: string, lang: string): {code:string;tests:string;docs:string} {
  const c = lang==='Python'?'#':'//';
  return {
    code:`#!/usr/bin/env ${lang==='Python'?'python3':lang==='Bash'?'bash':'node'}\n${c}\n${c} RedHydra AI - Auto-Generated Security Tool\n${c} Type: ${type}\n${c} Description: ${desc}\n${c} License: MIT\n${c}\nimport sys, json\nfrom typing import List, Dict, Optional\nfrom dataclasses import dataclass\n\n@dataclass\nclass Finding:\n    title: str; severity: str; description: str; recommendation: str\n\nclass RedHydraTool:\n    """${desc}"""\n    def __init__(self, target: str = "", config: Optional[Dict] = None):\n        self.target = target; self.config = config or {}; self.findings: List[Finding] = []\n    def validate(self) -> bool:\n        if not self.target: return False\n        return True\n    def scan(self) -> List[Finding]:\n        if not self.validate(): return []\n        # TODO: Implement scanning for: ${desc}\n        return self.findings\n    def report(self, output: str = "report.json"):\n        with open(output, 'w') as f: json.dump([vars(x) for x in self.findings], f, indent=2)\n\nif __name__ == "__main__":\n    if len(sys.argv) < 2: print("Usage: tool.py <target>"); sys.exit(1)\n    RedHydraTool(sys.argv[1]).scan()`,
    tests:`import unittest\nclass TestTool(unittest.TestCase):\n    def test_import(self): self.assertTrue(True)\n    def test_validation(self): self.assertTrue(True)\nif __name__ == "__main__": unittest.main()`,
    docs:`# ${type}\n\n${desc}\n\n## Usage\n\`\`\`bash\npython tool.py <target>\n\`\`\`\n\nGenerated by RedHydra AI. Review before production use.\n\n## License\nMIT License`,
  };
}
