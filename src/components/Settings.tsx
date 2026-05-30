import { useState } from 'react';
import { Settings as SI, Key, Globe, Brain, Shield, ExternalLink, Eye, EyeOff, Save, CheckCircle, Flame, Lock } from 'lucide-react';
import { APIConfig } from '../types';
export default function Settings() {
  const [configs, setConfigs] = useState<APIConfig[]>([
    { provider: 'OpenAI', apiKey: '', model: 'gpt-4', endpoint: 'https://api.openai.com/v1', enabled: true },
    { provider: 'Anthropic', apiKey: '', model: 'claude-3-sonnet', endpoint: 'https://api.anthropic.com/v1', enabled: false },
    { provider: 'Custom', apiKey: '', model: '', endpoint: '', enabled: false },
  ]);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState(false);
  const icons: Record<string, React.ReactNode> = { OpenAI: <Brain size={18} className="text-red-400" />, Anthropic: <Shield size={18} className="text-purple-400" />, Custom: <Globe size={18} className="text-cyan-400" /> };
  const links: Record<string, string> = { OpenAI: 'https://platform.openai.com/api-keys', Anthropic: 'https://console.anthropic.com/' };
  const ch = (i: number, f: keyof APIConfig, v: string | boolean) => { const n = [...configs]; n[i] = { ...n[i], [f]: v }; setConfigs(n); };
  return (<div className="space-y-6 max-w-3xl animate-fade-in">
    <div><h1 className="text-2xl font-bold text-white flex items-center gap-2"><SI size={24} className="text-gray-400" /> Settings</h1><p className="text-gray-400 mt-1 text-sm">AI integrations and preferences</p></div>
    <div className="bg-[#0d0d18] border border-gray-800/40 rounded-xl animate-slide-up">
      <div className="p-5 border-b border-gray-800/30"><h2 className="text-lg font-semibold text-white flex items-center gap-2"><Key size={18} className="text-red-400" /> AI Providers</h2><p className="text-xs text-gray-500 mt-1">Keys stored <span className="text-emerald-400">locally only</span></p></div>
      <div className="divide-y divide-gray-800/30">{configs.map((cfg, i) => (<div key={cfg.provider} className="p-5 animate-slide-up" style={{ animationDelay: `${i * 80}ms` }}>
        <div className="flex items-center justify-between mb-4"><div className="flex items-center gap-3">{icons[cfg.provider]}<h3 className="text-sm font-semibold text-white">{cfg.provider}</h3></div>
          <div className="flex items-center gap-3">{links[cfg.provider] && <a href={links[cfg.provider]} target="_blank" rel="noopener noreferrer" className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1">Get Key <ExternalLink size={10} /></a>}
            <button onClick={() => ch(i, 'enabled', !cfg.enabled)} className={`w-9 h-5 rounded-full transition-colors relative ${cfg.enabled ? 'bg-red-500' : 'bg-gray-700'}`}><div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${cfg.enabled ? 'translate-x-[1.125rem]' : 'translate-x-0.5'}`} /></button>
          </div>
        </div>
        <div className="space-y-3">
          <div><label className="block text-xs font-medium text-gray-400 mb-1">API Key</label><div className="relative"><input type={showKeys[cfg.provider] ? 'text' : 'password'} value={cfg.apiKey} onChange={e => ch(i, 'apiKey', e.target.value)} placeholder={cfg.provider === 'Custom' ? 'Enter key' : 'sk-...'} className="w-full bg-[#0a0a14] border border-gray-700/40 rounded-lg px-3 py-2.5 pr-10 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-red-500/50 font-mono" /><button onClick={() => setShowKeys(p => ({ ...p, [cfg.provider]: !p[cfg.provider] }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">{showKeys[cfg.provider] ? <EyeOff size={14} /> : <Eye size={14} />}</button></div></div>
          <div className="grid grid-cols-2 gap-3"><div><label className="block text-xs font-medium text-gray-400 mb-1">Model</label><input type="text" value={cfg.model} onChange={e => ch(i, 'model', e.target.value)} placeholder="e.g., gpt-4" className="w-full bg-[#0a0a14] border border-gray-700/40 rounded-lg px-3 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-red-500/50" /></div><div><label className="block text-xs font-medium text-gray-400 mb-1">Endpoint</label><input type="text" value={cfg.endpoint} onChange={e => ch(i, 'endpoint', e.target.value)} placeholder="API URL" className="w-full bg-[#0a0a14] border border-gray-700/40 rounded-lg px-3 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-red-500/50" /></div></div>
        </div>
      </div>))}</div>
      <div className="p-5 border-t border-gray-800/30"><button onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 2500); }} className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-red-500 to-purple-600 text-white text-sm font-medium shadow-lg shadow-red-500/15">{saved ? <><CheckCircle size={16} />Saved!</> : <><Save size={16} />Save</>}</button></div>
    </div>
    <div className="bg-[#0d0d18] border border-gray-800/40 rounded-xl p-5 animate-slide-up" style={{ animationDelay: '100ms' }}><h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2"><Flame size={18} className="text-red-400" /> About</h2><p className="text-sm text-gray-400">RedHydra AI — Free, open-source AI security platform. v2.0.0. MIT License.</p></div>
    <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-5 animate-slide-up" style={{ animationDelay: '200ms' }}><h3 className="text-sm font-semibold text-amber-400 mb-2 flex items-center gap-2"><Lock size={14} /> Responsible Use</h3><p className="text-xs text-gray-400">For <span className="text-amber-400 font-medium">authorized testing and education only</span>. Always obtain authorization. Unauthorized access is illegal.</p></div>
  </div>);
}
