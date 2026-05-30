import { useState } from 'react';
import { Wrench, Copy, Download, Sparkles, Code, FileText, FlaskConical, ChevronDown, Flame } from 'lucide-react';
import { generateToolCode } from '../utils/securityTools';
import { ActivityItem } from '../types';
interface Props { addActivity: (a: Omit<ActivityItem, 'id' | 'timestamp'>) => void }
export default function ToolGenerator({ addActivity }: Props) {
  const [desc, setDesc] = useState('');
  const [type, setType] = useState('Vulnerability Scanner');
  const [lang, setLang] = useState('Python');
  const [result, setResult] = useState<ReturnType<typeof generateToolCode> | null>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'code' | 'tests' | 'docs'>('code');
  const [copied, setCopied] = useState(false);
  const types = ['Vulnerability Scanner', 'Network Scanner', 'Log Analyzer', 'Password Auditor', 'Web Scanner', 'Malware Analyzer', 'Forensics Tool', 'Compliance Checker', 'Defensive Script', 'OSINT Tool', 'Custom Tool'];
  const langs = ['Python', 'JavaScript', 'Bash', 'PowerShell', 'Go'];
  const examples = ['Scanner for open S3 buckets and AWS misconfigs', 'Defensive script for Linux server hardening', 'Auth log brute force detector', 'CSRF and JWT vulnerability scanner', 'OSINT email intelligence from DNS'];
  const handleGen = () => { if (!desc.trim()) return; setLoading(true); setTimeout(() => { setResult(generateToolCode(desc, type, lang)); setLoading(false); setTab('code'); addActivity({ type: 'tool-generated', title: `Generated: ${type}`, description: `${lang}: ${desc.slice(0, 50)}` }); }, 1500); };
  const handleCopy = () => { if (!result) return; navigator.clipboard.writeText(tab === 'code' ? result.code : tab === 'tests' ? result.tests : result.docs); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  const handleDl = () => { if (!result) return; const ext: Record<string, string> = { Python: 'py', JavaScript: 'js', Bash: 'sh', Go: 'go' }; const c = tab === 'code' ? result.code : tab === 'tests' ? result.tests : result.docs; const b = new Blob([c], { type: 'text/plain' }); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `redhydra${tab === 'tests' ? '_test' : tab === 'docs' ? '_docs' : ''}.${ext[lang] || 'txt'}`; a.click(); };
  const tabs: { id: 'code' | 'tests' | 'docs'; l: string; i: React.ReactNode }[] = [{ id: 'code', l: 'Code', i: <Code size={13} /> }, { id: 'tests', l: 'Tests', i: <FlaskConical size={13} /> }, { id: 'docs', l: 'Docs', i: <FileText size={13} /> }];
  return (
    <div className="space-y-6 animate-fade-in">
      <div><h1 className="text-2xl font-bold text-white flex items-center gap-2"><Wrench size={24} className="text-red-400" /> Tool Generator</h1><p className="text-gray-400 mt-1 text-sm">Generate production-ready code with tests and documentation</p></div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="bg-[#0d0d18] border border-gray-800/40 rounded-xl p-5 animate-slide-up">
            <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2"><Flame size={14} className="text-red-400" /> Description</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Describe the security tool you need..." className="w-full h-40 bg-[#0a0a14] border border-gray-700/40 rounded-lg px-4 py-3 text-gray-200 placeholder-gray-600 text-sm focus:outline-none focus:border-red-500/50 resize-none" />
          </div>
          <div className="bg-[#0d0d18] border border-gray-800/40 rounded-xl p-5 space-y-4 animate-slide-up" style={{ animationDelay: '80ms' }}>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-xs font-medium text-gray-400 mb-1.5">Type</label><div className="relative"><select value={type} onChange={e => setType(e.target.value)} className="w-full appearance-none bg-[#0a0a14] border border-gray-700/40 rounded-lg px-3 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-red-500/50 pr-8">{types.map(t => <option key={t} value={t}>{t}</option>)}</select><ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" /></div></div>
              <div><label className="block text-xs font-medium text-gray-400 mb-1.5">Language</label><div className="relative"><select value={lang} onChange={e => setLang(e.target.value)} className="w-full appearance-none bg-[#0a0a14] border border-gray-700/40 rounded-lg px-3 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-red-500/50 pr-8">{langs.map(l => <option key={l} value={l}>{l}</option>)}</select><ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" /></div></div>
            </div>
            <button onClick={handleGen} disabled={!desc.trim() || loading} className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-gradient-to-r from-red-500 to-purple-600 hover:from-red-600 hover:to-purple-700 disabled:from-gray-700 disabled:to-gray-700 disabled:text-gray-500 text-white text-sm font-medium shadow-lg shadow-red-500/20 disabled:shadow-none">
              {loading ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Generating...</> : <><Sparkles size={16} /> Generate with Tests & Docs</>}
            </button>
          </div>
          <div className="bg-[#0d0d18] border border-gray-800/40 rounded-xl p-5 animate-slide-up" style={{ animationDelay: '160ms' }}>
            <h3 className="text-xs font-medium text-gray-400 mb-2.5">Examples</h3>
            <div className="space-y-1.5">{examples.map((e, i) => <button key={i} onClick={() => setDesc(e)} className="w-full text-left px-3 py-2 rounded-lg bg-[#0a0a14] text-xs text-gray-400 hover:text-red-400 hover:bg-red-500/5 border border-transparent hover:border-red-500/15">{e}</button>)}</div>
          </div>
        </div>
        <div className="bg-[#0d0d18] border border-gray-800/40 rounded-xl flex flex-col animate-slide-up" style={{ animationDelay: '100ms' }}>
          <div className="flex items-center justify-between p-4 border-b border-gray-800/30">
            <div className="flex gap-1">{tabs.map(t => <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${tab === t.id ? 'bg-red-500/15 text-red-400 border border-red-500/25' : 'text-gray-500 hover:text-gray-300 border border-transparent'}`}>{t.i}{t.l}</button>)}</div>
            {result && <div className="flex gap-2"><button onClick={handleCopy} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gray-800/50 text-xs text-gray-400 hover:text-white"><Copy size={11} />{copied ? 'Copied!' : 'Copy'}</button><button onClick={handleDl} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-500/10 text-xs text-red-400"><Download size={11} />Download</button></div>}
          </div>
          <div className="flex-1 p-4 overflow-auto min-h-[480px]">
            {result ? <pre className="text-xs font-mono text-gray-300 whitespace-pre-wrap leading-relaxed">{tab === 'code' ? result.code : tab === 'tests' ? result.tests : result.docs}</pre>
              : <div className="flex flex-col items-center justify-center h-full text-center py-16"><div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500/10 to-purple-500/10 flex items-center justify-center mb-4 border border-red-500/15"><Code size={24} className="text-red-400/40" /></div><p className="text-sm text-gray-500">Code, tests, and docs appear here</p><p className="text-xs text-gray-600 mt-1">Describe your tool and click Generate</p></div>}
          </div>
        </div>
      </div>
    </div>
  );
}
