import { useEffect, useState } from 'react';
import { Settings as SI, Brain, Shield, Save, CheckCircle, Flame, Lock, Cpu, RotateCw, Trash2, AlertTriangle, WifiOff } from 'lucide-react';
import { clearAgentMemory, getAgentStatus, initializeLiveAgent, LiveAgentStatus, subscribeAgentStatus } from '../utils/liveAgent';
import { secureGetJSON, secureSetJSON } from '../utils/secureStorage';

interface LocalPrefs {
  autoStartLocalAI: boolean;
  preferDeepModel: boolean;
  encryptedMemory: boolean;
  responsibleUseMode: boolean;
}

const PREF_KEY = 'redhydra_secure_local_ai_preferences_v1';
const defaultPrefs: LocalPrefs = {
  autoStartLocalAI: true,
  preferDeepModel: false,
  encryptedMemory: true,
  responsibleUseMode: true,
};

export default function Settings() {
  const [prefs, setPrefs] = useState<LocalPrefs>(defaultPrefs);
  const [saved, setSaved] = useState(false);
  const [status, setStatus] = useState<LiveAgentStatus>(getAgentStatus());

  useEffect(() => { secureGetJSON(PREF_KEY, defaultPrefs).then(setPrefs); }, []);
  useEffect(() => subscribeAgentStatus(setStatus), []);

  const update = <K extends keyof LocalPrefs>(key: K, value: LocalPrefs[K]) => setPrefs(prev => ({ ...prev, [key]: value }));
  const save = async () => {
    await secureSetJSON(PREF_KEY, prefs);
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  };

  return (
    <div className="space-y-6 max-w-4xl animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2"><SI size={24} className="text-gray-400" /> Settings</h1>
        <p className="text-gray-400 mt-1 text-sm">Production-ready local AI settings for GitHub Pages</p>
      </div>

      <div className="bg-[#0d0d18] border border-gray-800/40 rounded-xl animate-slide-up">
        <div className="p-5 border-b border-gray-800/30">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2"><Cpu size={18} className="text-cyan-400" /> Local Browser AI</h2>
          <p className="text-xs text-gray-500 mt-1">No backend server. No exposed API key. The model runs inside supported browsers using WebGPU.</p>
        </div>

        <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-xl border border-gray-800/40 bg-gray-900/20 p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2"><Brain size={15} className="text-purple-400" /> AI Engine Status</h3>
              <span className={`text-[10px] px-2 py-1 rounded-full border ${status.ready ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10' : status.loading ? 'text-cyan-400 border-cyan-500/20 bg-cyan-500/10' : 'text-amber-400 border-amber-500/20 bg-amber-500/10'}`}>{status.ready ? 'Ready' : status.loading ? 'Loading' : 'Hybrid fallback'}</span>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">{status.message}</p>
            <div className="mt-3 space-y-2 text-xs text-gray-500">
              <p><span className="text-gray-300">Provider:</span> {status.provider}</p>
              <p><span className="text-gray-300">Model:</span> {status.model}</p>
              <p><span className="text-gray-300">WebGPU:</span> {status.webgpu ? 'Available' : 'Not available in this browser'}</p>
            </div>
            {status.loading && <div className="mt-3 h-1.5 bg-gray-800 rounded-full overflow-hidden"><div className="h-full bg-cyan-400 rounded-full transition-all" style={{ width: `${Math.round(status.progress * 100)}%` }} /></div>}
            <button onClick={() => initializeLiveAgent(prefs.preferDeepModel ? 'deep' : 'quick', true)} disabled={status.loading}
              className="mt-4 flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-medium hover:bg-cyan-500/15 disabled:opacity-50">
              {status.loading ? <RotateCw size={14} className="animate-spin" /> : <Cpu size={14} />} Start / Reload Local AI
            </button>
          </div>

          <div className="rounded-xl border border-gray-800/40 bg-gray-900/20 p-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-3"><Lock size={15} className="text-emerald-400" /> Privacy & Memory</h3>
            <p className="text-xs text-gray-400 leading-relaxed">Chat adaptation is stored only in this browser using encrypted local storage. Nothing is sent to your own backend because this GitHub Pages build has no backend.</p>
            <button onClick={() => clearAgentMemory()} className="mt-4 flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium hover:bg-red-500/15">
              <Trash2 size={14} /> Clear Local AI Memory
            </button>
            <div className="mt-4 rounded-lg border border-amber-500/10 bg-amber-500/5 p-3 flex gap-2">
              <AlertTriangle size={15} className="text-amber-400 shrink-0 mt-0.5" />
              <p className="text-[11px] text-gray-400">True model training and self-modifying code cannot happen from static GitHub Pages. This app uses adaptive encrypted memory and scheduled GitHub maintenance instead.</p>
            </div>
          </div>
        </div>

        <div className="p-5 border-t border-gray-800/30 space-y-3">
          {[
            ['autoStartLocalAI', 'Auto-start local AI on first chat message', 'Recommended. The first model load can take time because the browser downloads the open-source model.'],
            ['preferDeepModel', 'Prefer stronger model for Deep mode', 'Uses a larger browser model where supported. Keep off for older/low-memory devices.'],
            ['encryptedMemory', 'Encrypted local memory', 'Keeps adaptive memory encrypted in this browser.'],
            ['responsibleUseMode', 'Responsible security mode', 'Keeps the tool focused on authorized testing, secure coding, defense, and education.'],
          ].map(([key, title, desc]) => (
            <label key={key} className="flex items-center justify-between gap-4 rounded-lg bg-gray-900/20 border border-gray-800/30 p-3 cursor-pointer">
              <span>
                <span className="block text-sm text-white font-medium">{title}</span>
                <span className="block text-xs text-gray-500 mt-0.5">{desc}</span>
              </span>
              <button type="button" onClick={(e) => { e.preventDefault(); update(key as keyof LocalPrefs, !prefs[key as keyof LocalPrefs] as never); }} className={`w-10 h-5 rounded-full transition-colors relative ${prefs[key as keyof LocalPrefs] ? 'bg-red-500' : 'bg-gray-700'}`}>
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${prefs[key as keyof LocalPrefs] ? 'translate-x-[1.35rem]' : 'translate-x-0.5'}`} />
              </button>
            </label>
          ))}
          <button onClick={save} className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-red-500 to-purple-600 text-white text-sm font-medium shadow-lg shadow-red-500/15">
            {saved ? <><CheckCircle size={16} />Saved encrypted settings</> : <><Save size={16} />Save Settings</>}
          </button>
        </div>
      </div>

      <div className="bg-[#0d0d18] border border-gray-800/40 rounded-xl p-5 animate-slide-up" style={{ animationDelay: '100ms' }}>
        <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2"><Flame size={18} className="text-red-400" /> Production Mode</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/10 p-3"><Shield size={15} className="text-emerald-400 mb-2" /><p className="text-gray-300 font-medium">Frontend only</p><p className="text-gray-500 mt-1">Works on GitHub Pages without a Node server.</p></div>
          <div className="rounded-lg bg-cyan-500/5 border border-cyan-500/10 p-3"><Cpu size={15} className="text-cyan-400 mb-2" /><p className="text-gray-300 font-medium">Real local AI</p><p className="text-gray-500 mt-1">Uses WebLLM/WebGPU where available, with safe fallback.</p></div>
          <div className="rounded-lg bg-amber-500/5 border border-amber-500/10 p-3"><WifiOff size={15} className="text-amber-400 mb-2" /><p className="text-gray-300 font-medium">No fake web data</p><p className="text-gray-500 mt-1">The app does not invent real-time search results.</p></div>
        </div>
      </div>
    </div>
  );
}
