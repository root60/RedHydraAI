import { Shield, Wrench, Bug, Zap, ArrowRight, CheckCircle, Clock, Flame, TrendingUp, GraduationCap, Radar, Microscope } from 'lucide-react';
import { Page, ActivityItem } from '../types';

interface Props { onNavigate: (p: Page) => void; activities: ActivityItem[] }

const barData = [
  { label: 'SQLi', value: 85, color: 'bg-red-500' },
  { label: 'XSS', value: 72, color: 'bg-purple-500' },
  { label: 'CMDi', value: 60, color: 'bg-amber-500' },
  { label: 'SSRF', value: 45, color: 'bg-cyan-500' },
  { label: 'IDOR', value: 55, color: 'bg-emerald-500' },
  { label: 'Auth', value: 38, color: 'bg-blue-500' },
];
const sevDist = [
  { label: 'Critical', pct: 15, color: 'bg-red-500' },
  { label: 'High', pct: 30, color: 'bg-orange-500' },
  { label: 'Medium', pct: 33, color: 'bg-amber-500' },
  { label: 'Low', pct: 15, color: 'bg-blue-500' },
  { label: 'Info', pct: 7, color: 'bg-gray-500' },
];

export default function Dashboard({ onNavigate, activities }: Props) {
  const actions = [
    { l: 'Generate Tool', d: 'Security tools from natural language', p: 'tool-generator' as Page, i: <Wrench size={18} /> },
    { l: 'AI Agent', d: '5 personas, 3 think modes, web search', p: 'chat-agent' as Page, i: <Zap size={18} /> },
    { l: 'Deep Research', d: 'Multi-source analysis', p: 'deep-research' as Page, i: <Microscope size={18} /> },
    { l: 'Code Analyzer', d: 'Vulnerability detection with PoCs', p: 'code-analyzer' as Page, i: <Bug size={18} /> },
    { l: 'Training', d: 'Lessons, quizzes, red team sims', p: 'training-hub' as Page, i: <GraduationCap size={18} /> },
    { l: 'Threat Intel', d: 'IOCs, MITRE, defense plans', p: 'threat-intel' as Page, i: <Radar size={18} /> },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="rounded-2xl bg-gradient-to-r from-red-500/10 via-purple-500/8 to-cyan-500/10 border border-gray-800/40 p-6 animate-slide-up">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-red-500 to-purple-600 shadow-xl shadow-red-500/20 flex items-center justify-center shrink-0"><Flame size={28} className="text-white" /></div>
          <div>
            <h1 className="text-2xl font-bold text-white">Welcome to <span className="text-red-400">Red</span><span className="text-purple-400">Hydra</span> <span className="text-gray-400">AI</span></h1>
            <p className="text-gray-400 text-sm mt-0.5">Dynamic AI • 5 Personas • Deep/Deeper Thinking • Web Search • Real-time Analysis</p>
            <div className="flex items-center gap-5 mt-2 text-xs text-gray-500">
              <span className="flex items-center gap-1"><TrendingUp size={11} className="text-emerald-400" />Free & Open Source</span>
              <span className="flex items-center gap-1"><Shield size={11} className="text-cyan-400" />MIT Licensed</span>
              <span className="flex items-center gap-1"><Zap size={11} className="text-purple-400" />Dynamic AI Engine</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-slide-up" style={{ animationDelay: '80ms' }}>
        {[
          { l: 'Tools', v: '47', i: <Wrench size={18} />, bg: 'bg-red-500/10', b: 'border-red-500/15' },
          { l: 'Scans', v: '234', i: <Shield size={18} />, bg: 'bg-purple-500/10', b: 'border-purple-500/15' },
          { l: 'Vulns', v: '156', i: <Bug size={18} />, bg: 'bg-amber-500/10', b: 'border-amber-500/15' },
          { l: 'Training', v: '12', i: <GraduationCap size={18} />, bg: 'bg-emerald-500/10', b: 'border-emerald-500/15' },
        ].map(s => (
          <div key={s.l} className={`${s.bg} border ${s.b} rounded-xl p-4`}>
            <div className="flex items-center justify-between"><div className={`${s.bg} p-2 rounded-lg`}>{s.i}</div><span className="text-2xl font-bold text-white">{s.v}</span></div>
            <p className="text-xs text-gray-400 mt-2">{s.l}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-[#0d0d18] border border-gray-800/40 rounded-xl p-5 animate-slide-up" style={{ animationDelay: '160ms' }}>
          <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2"><TrendingUp size={15} className="text-red-400" />Vuln Distribution</h2>
          <div className="space-y-3">{sevDist.map(d => (
            <div key={d.label}><div className="flex items-center justify-between text-xs mb-1"><span className="text-gray-400">{d.label}</span><span className="text-gray-500">{d.pct}%</span></div><div className="w-full bg-gray-800/60 rounded-full h-2"><div className={`h-2 rounded-full ${d.color}`} style={{ width: `${d.pct}%` }} /></div></div>
          ))}</div>
        </div>
        <div className="bg-[#0d0d18] border border-gray-800/40 rounded-xl p-5 animate-slide-up" style={{ animationDelay: '200ms' }}>
          <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2"><Bug size={15} className="text-amber-400" />Attack Surface</h2>
          <div className="space-y-2.5">{barData.map(d => (
            <div key={d.label} className="flex items-center gap-3"><span className="text-xs text-gray-500 w-10">{d.label}</span><div className="flex-1 bg-gray-800/40 rounded-full h-5 overflow-hidden"><div className={`h-full rounded-full ${d.color} flex items-center justify-end pr-2`} style={{ width: `${d.value}%` }}><span className="text-[9px] text-white font-medium">{d.value}%</span></div></div></div>
          ))}</div>
        </div>
        <div className="bg-[#0d0d18] border border-gray-800/40 rounded-xl p-5 animate-slide-up" style={{ animationDelay: '240ms' }}>
          <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2"><Zap size={15} className="text-purple-400" />Quick Actions</h2>
          <div className="space-y-2">{actions.map(a => (
            <button key={a.p} onClick={() => onNavigate(a.p)} className="w-full flex items-center gap-3 p-2.5 rounded-lg bg-gray-800/30 border border-gray-700/20 hover:border-gray-600/40 transition-all text-left group">
              <div className="p-1.5 rounded-lg bg-gray-800/50 text-gray-300">{a.i}</div>
              <div className="flex-1 min-w-0"><p className="text-xs font-medium text-white group-hover:text-red-400 transition-colors">{a.l}</p><p className="text-[10px] text-gray-500">{a.d}</p></div>
              <ArrowRight size={12} className="text-gray-600 group-hover:text-red-400 transition-all group-hover:translate-x-0.5" />
            </button>
          ))}</div>
        </div>
      </div>

      <div className="bg-[#0d0d18] border border-gray-800/40 rounded-xl p-5 animate-slide-up" style={{ animationDelay: '300ms' }}>
        <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2"><Clock size={15} className="text-cyan-400" />Recent Activity</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
          {activities.slice(0, 8).map(a => (
            <div key={a.id} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-gray-800/20 border border-gray-800/30">
              <CheckCircle size={13} className="text-gray-500 mt-0.5 shrink-0" />
              <div className="min-w-0"><p className="text-xs text-gray-300 truncate">{a.title}</p><p className="text-[10px] text-gray-600 truncate">{a.description}</p></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
