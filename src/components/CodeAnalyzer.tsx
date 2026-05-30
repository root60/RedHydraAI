import { useState } from 'react';
import { SearchCode, AlertCircle, AlertTriangle, Info, Play, ChevronDown, Bug, Shield, Code } from 'lucide-react';
import { analyzeCode } from '../utils/securityTools';
import { AnalysisResult, ActivityItem } from '../types';
interface Props { addActivity: (a: Omit<ActivityItem, 'id' | 'timestamp'>) => void }
export default function CodeAnalyzer({ addActivity }: Props) {
  const [code, setCode] = useState('');
  const [lang, setLang] = useState('python');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const samples: Record<string, string> = {
    python: `import os, pickle, hashlib, yaml\nfrom flask import Flask, request\napp = Flask(__name__)\n\n@app.route('/execute')\ndef execute_command():\n    cmd = request.args.get('cmd')\n    result = os.system(cmd)\n    return str(result)\n\n@app.route('/deserialize')\ndef deserialize_data():\n    data = request.args.get('data')\n    obj = pickle.loads(data.encode())\n    return str(obj)\n\n@app.route('/hash')\ndef hash_password():\n    password = request.args.get('password')\n    hashed = hashlib.md5(password.encode()).hexdigest()\n    return hashed\n\n@app.route('/search')\ndef search_users():\n    name = request.args.get('name')\n    query = f"SELECT * FROM users WHERE name = '{name}'"\n    cursor.execute(query)\n    return cursor.fetchall()\n\ndef load_config(data):\n    return yaml.load(data)`,
    javascript: `const express = require('express');\nconst { exec } = require('child_process');\napp.get('/run', (req, res) => {\n    exec(req.query.cmd, (err, stdout) => res.send(stdout));\n});\napp.get('/render', (req, res) => {\n    document.getElementById('output').innerHTML = req.query.input;\n});\napp.get('/evaluate', (req, res) => {\n    res.json({ result: eval(req.query.code) });\n});`,
    typescript: `import express from 'express';\n// @ts-ignore\napp.get('/run', (req: any, res: any) => { eval(req.query.cmd); });\nfunction processData(data: any) { const r: any = eval(data); return r as any; }`,
  };
  const handleAnalyze = () => { if (!code.trim()) return; setAnalyzing(true); setTimeout(() => { const r = analyzeCode(code, lang); setResult(r); setAnalyzing(false); addActivity({ type: 'code-analyzed', title: `Analyzed ${lang}`, description: `${r.summary.critical + r.summary.high} critical/high. Score: ${r.score}/100` }); }, 1200); };
  const sev: Record<string, { i: React.ReactNode; c: string; bg: string; b: string }> = { critical: { i: <AlertCircle size={15} />, c: 'text-red-400', bg: 'bg-red-500/10', b: 'border-red-500/25' }, high: { i: <AlertTriangle size={15} />, c: 'text-orange-400', bg: 'bg-orange-500/10', b: 'border-orange-500/25' }, medium: { i: <AlertTriangle size={15} />, c: 'text-amber-400', bg: 'bg-amber-500/10', b: 'border-amber-500/25' }, low: { i: <Info size={15} />, c: 'text-blue-400', bg: 'bg-blue-500/10', b: 'border-blue-500/25' }, info: { i: <Info size={15} />, c: 'text-gray-400', bg: 'bg-gray-500/10', b: 'border-gray-500/25' } };
  return (
    <div className="space-y-6 animate-fade-in">
      <div><h1 className="text-2xl font-bold text-white flex items-center gap-2"><SearchCode size={24} className="text-cyan-400" /> Code Analyzer</h1><p className="text-gray-400 mt-1 text-sm">Detect vulnerabilities with PoC examples, CWE references, and fix recommendations</p></div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="bg-[#0d0d18] border border-gray-800/40 rounded-xl overflow-hidden animate-slide-up">
            <div className="flex items-center justify-between p-4 border-b border-gray-800/30">
              <div className="flex items-center gap-3"><label className="text-xs font-medium text-gray-400">Language:</label><div className="relative"><select value={lang} onChange={e => setLang(e.target.value)} className="appearance-none bg-[#0a0a14] border border-gray-700/40 rounded-lg px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-cyan-500/50 pr-7"><option value="python">Python</option><option value="javascript">JavaScript</option><option value="typescript">TypeScript</option></select><ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" /></div></div>
              <button onClick={() => setCode(samples[lang] || '')} className="text-xs text-cyan-400 hover:text-cyan-300">Load Sample</button>
            </div>
            <textarea value={code} onChange={e => setCode(e.target.value)} placeholder="Paste code here..." className="w-full h-[400px] bg-transparent px-4 py-3 text-sm font-mono text-gray-200 placeholder-gray-600 focus:outline-none resize-none" />
          </div>
          <button onClick={handleAnalyze} disabled={!code.trim() || analyzing} className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 disabled:from-gray-700 disabled:to-gray-700 disabled:text-gray-500 text-white text-sm shadow-lg shadow-cyan-500/15 disabled:shadow-none">
            {analyzing ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Analyzing...</> : <><Play size={16} /> Analyze Code</>}
          </button>
        </div>
        <div className="space-y-4">
          {result ? (<>
            <div className="bg-[#0d0d18] border border-gray-800/40 rounded-xl p-5 animate-slide-up">
              <div className="flex items-center justify-between mb-3"><h3 className="text-sm font-medium text-gray-300 flex items-center gap-2"><Shield size={14} className="text-cyan-400" /> Security Score</h3><span className={`text-3xl font-bold ${result.score >= 80 ? 'text-emerald-400' : result.score >= 60 ? 'text-amber-400' : 'text-red-400'}`}>{result.score}</span></div>
              <div className="w-full bg-gray-800/60 rounded-full h-2.5 mb-4"><div className={`h-2.5 rounded-full transition-all duration-1000 ${result.score >= 80 ? 'bg-emerald-500' : result.score >= 60 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${result.score}%` }} /></div>
              <div className="grid grid-cols-5 gap-2">{(['critical', 'high', 'medium', 'low', 'info'] as const).map(s => { const c = sev[s]; return <div key={s} className={`text-center p-2 rounded-lg ${c.bg} ${c.b} border`}><div className={`text-lg font-bold ${c.c}`}>{result.summary[s]}</div><div className="text-[10px] text-gray-500">{s}</div></div>; })}</div>
            </div>
            <div className="bg-[#0d0d18] border border-gray-800/40 rounded-xl overflow-hidden animate-slide-up" style={{ animationDelay: '80ms' }}>
              <div className="p-4 border-b border-gray-800/30"><h3 className="text-sm font-medium text-gray-300 flex items-center gap-2"><Bug size={14} className="text-amber-400" /> Findings ({result.vulnerabilities.length})</h3></div>
              <div className="max-h-[350px] overflow-y-auto divide-y divide-gray-800/20">
                {result.vulnerabilities.map(v => { const c = sev[v.severity]; return (
                  <div key={v.id} className="p-4 hover:bg-gray-800/15">
                    <div className="flex items-start gap-3"><div className={`${c.c} mt-0.5 shrink-0`}>{c.i}</div><div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap"><h4 className="text-sm font-medium text-white">{v.title}</h4><span className={`text-[10px] px-1.5 py-0.5 rounded ${c.bg} ${c.c} uppercase font-medium`}>{v.severity}</span>{v.cwe && <span className="text-[10px] text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded">{v.cwe}</span>}</div>
                      <p className="text-xs text-gray-400 mt-1">{v.description}</p>
                      {v.line && <p className="text-xs text-gray-500 mt-1">Line {v.line}</p>}
                      {v.poc && <div className="mt-2 p-2 rounded bg-red-500/5 border border-red-500/10"><p className="text-xs text-red-400 font-mono">PoC: {v.poc}</p></div>}
                      <div className="mt-2 p-2 rounded bg-emerald-500/5 border border-emerald-500/10"><p className="text-xs text-emerald-400"><span className="font-medium">Fix:</span> {v.recommendation}</p></div>
                    </div></div>
                  </div>); })}
              </div>
            </div>
          </>) : (<div className="bg-[#0d0d18] border border-gray-800/40 rounded-xl flex flex-col items-center justify-center h-full min-h-[500px] text-center p-8 animate-slide-up"><div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-blue-500/10 flex items-center justify-center mb-4 border border-cyan-500/15"><Code size={24} className="text-cyan-400/40" /></div><p className="text-gray-500 text-sm">Paste code and click Analyze</p><p className="text-gray-600 text-xs mt-1">Python, JavaScript, TypeScript</p></div>)}
        </div>
      </div>
    </div>
  );
}
