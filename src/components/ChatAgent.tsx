import { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, Bot, User, Sparkles, Microscope, Globe, Search, Brain, Shield, Target, Castle, Zap } from 'lucide-react';
import { ChatMessage, AIPersona, ThinkMode, ActivityItem } from '../types';
import { generateAIResponse, personas } from '../utils/aiEngine';

interface Props { addActivity: (a: Omit<ActivityItem, 'id' | 'timestamp'>) => void; }

const personaList: { id: AIPersona; icon: React.ReactNode; label: string; color: string }[] = [
  { id: 'security-assistant', icon: <Shield size={14} />, label: 'Security Assistant', color: 'text-emerald-400 border-emerald-500/25 bg-emerald-500/10' },
  { id: 'red-team-specialist', icon: <Target size={14} />, label: 'Red Team', color: 'text-red-400 border-red-500/25 bg-red-500/10' },
  { id: 'code-expert', icon: <Zap size={14} />, label: 'Code Expert', color: 'text-cyan-400 border-cyan-500/25 bg-cyan-500/10' },
  { id: 'threat-analyst', icon: <Globe size={14} />, label: 'Threat Analyst', color: 'text-amber-400 border-amber-500/25 bg-amber-500/10' },
  { id: 'defensive-strategist', icon: <Castle size={14} />, label: 'Blue Team', color: 'text-blue-400 border-blue-500/25 bg-blue-500/10' },
];

const thinkModes: { id: ThinkMode; icon: React.ReactNode; label: string; color: string; delay: number }[] = [
  { id: 'quick', icon: <Zap size={13} />, label: 'Quick', color: 'text-emerald-400 border-emerald-500/25 bg-emerald-500/10', delay: 800 },
  { id: 'deep', icon: <Brain size={13} />, label: 'Deep Think', color: 'text-purple-400 border-purple-500/25 bg-purple-500/10', delay: 2000 },
  { id: 'deeper', icon: <Microscope size={13} />, label: 'Deeper', color: 'text-red-400 border-red-500/25 bg-red-500/10', delay: 3500 },
];

export default function ChatAgent({ addActivity }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([{
    id: 'welcome', role: 'assistant',
    content: `## Welcome to RedHydra AI Security Agent 🛡️\n\nI'm your AI-powered security assistant with **5 specialized personas** and **3 thinking modes**.\n\n**Personas:**\n- 🛡️ **Security Assistant** — General security guidance & training\n- 🎯 **Red Team Specialist** — Offensive techniques & OPSEC\n- 💻 **Code Security Expert** — Code review & secure coding\n- 📡 **Threat Analyst** — Threat intelligence & IOC analysis\n- 🏰 **Blue Team Commander** — Defense strategy & IR\n\n**Thinking Modes:**\n- ⚡ **Quick** — Fast, concise answers\n- 🧠 **Deep Think** — Detailed multi-vector analysis\n- 🔬 **Deeper** — Exhaustive analysis with reasoning chains\n\nToggle **Web Search** 🔍 for sourced intelligence.\n\nAsk me anything about security — I construct responses dynamically based on your question, persona, and thinking depth.`,
    timestamp: new Date(), persona: 'security-assistant', thinkMode: 'quick',
  }]);
  const [input, setInput] = useState('');
  const [persona, setPersona] = useState<AIPersona>('security-assistant');
  const [thinkMode, setThinkMode] = useState<ThinkMode>('quick');
  const [webSearch, setWebSearch] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [thinkingChain, setThinkingChain] = useState<string[]>([]);
  const [showThinking, setShowThinking] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleSend = (text?: string) => {
    const msg = text || input;
    if (!msg.trim()) return;
    setMessages(prev => [...prev, { id: `u-${Date.now()}`, role: 'user', content: msg, timestamp: new Date() }]);
    setInput('');
    setIsTyping(true);
    setThinkingChain([]);
    setShowThinking(true);

    const mode = thinkModes.find(m => m.id === thinkMode)!;
    // Simulate thinking chain animation
    const chainSteps = [
      `Initializing ${personas[persona].name}...`,
      `Mode: ${mode.label} analysis`,
      'Parsing query context...',
    ];

    let stepIndex = 0;
    const chainInterval = setInterval(() => {
      if (stepIndex < chainSteps.length) {
        setThinkingChain(prev => [...prev, chainSteps[stepIndex]]);
        stepIndex++;
      }
    }, 300);

    setTimeout(() => {
      clearInterval(chainInterval);
      const { content, thinkingChain: chain, sources } = generateAIResponse(msg, persona, thinkMode, webSearch);
      setThinkingChain(chain);
      
      setTimeout(() => {
        setMessages(prev => [...prev, {
          id: `a-${Date.now()}`, role: 'assistant', content, timestamp: new Date(),
          persona, thinkMode, sources, thinkingChain: chain,
        }]);
        setIsTyping(false);
        setShowThinking(false);
        addActivity({ type: 'chat-message', title: `${personas[persona].name} (${mode.label})`, description: msg.slice(0, 50) });
      }, 500);
    }, mode.delay + Math.random() * 500);
  };

  const formatMsg = (content: string) => content.split('\n').map((line, i) => {
    if (line.startsWith('## ')) return <h3 key={i} className="text-base font-bold text-white mt-3 mb-1">{line.replace('## ', '')}</h3>;
    if (line.startsWith('### ')) return <h4 key={i} className="text-sm font-semibold text-gray-200 mt-3 mb-1">{line.replace('### ', '')}</h4>;
    if (line.startsWith('```')) return null;
    if (line.startsWith('---')) return <hr key={i} className="border-gray-700/50 my-3" />;
    if (line.startsWith('- ')) return <p key={i} className="ml-3 text-gray-300 text-sm mt-0.5">• {line.replace('- ', '')}</p>;
    if (/^\d+\.\s/.test(line)) return <p key={i} className="ml-3 text-gray-300 text-sm mt-0.5">{line}</p>;
    if (line.trim() === '') return <br key={i} />;
    if (line.startsWith('📄') || line.startsWith('📊') || line.startsWith('🔗')) return <p key={i} className="text-gray-300 text-sm mt-1 ml-1">{line}</p>;
    const wc = line.replace(/`([^`]+)`/g, '<code class="bg-gray-800 px-1 py-0.5 rounded text-red-400 text-xs font-mono">$1</code>');
    const wb = wc.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-white">$1</strong>');
    return <p key={i} className="text-gray-300 text-sm leading-relaxed mt-0.5" dangerouslySetInnerHTML={{ __html: wb }} />;
  }).filter(Boolean);

  const p = personas[persona];

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] animate-fade-in">
      {/* Header */}
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <MessageSquare size={24} className="text-purple-400" /> AI Security Agent
          </h1>
          <p className="text-gray-400 mt-0.5 text-sm">5 personas • 3 thinking modes • Web search • Dynamic reasoning</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setWebSearch(!webSearch)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${webSearch ? 'text-cyan-400 border-cyan-500/25 bg-cyan-500/10' : 'text-gray-500 border-gray-800 hover:border-gray-700'}`}>
            <Search size={13} /> Web Search
          </button>
        </div>
      </div>

      {/* Persona & Think Mode Bar */}
      <div className="flex flex-wrap gap-2 mb-3">
        <div className="flex gap-1">
          {personaList.map(p => (
            <button key={p.id} onClick={() => setPersona(p.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition-all ${persona === p.id ? p.color : 'text-gray-500 border-gray-800 hover:border-gray-700'}`}>
              {p.icon}{p.label}
            </button>
          ))}
        </div>
        <div className="w-px bg-gray-800 mx-1" />
        <div className="flex gap-1">
          {thinkModes.map(m => (
            <button key={m.id} onClick={() => setThinkMode(m.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition-all ${thinkMode === m.id ? m.color : 'text-gray-500 border-gray-800 hover:border-gray-700'}`}>
              {m.icon}{m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Active Persona Info */}
      <div className="mb-3 p-3 rounded-xl bg-gradient-to-r from-red-500/5 via-purple-500/5 to-cyan-500/5 border border-gray-800/30 flex items-center gap-3">
        <div className="text-lg">{p.icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-white">{p.name}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800/50 text-gray-400">{p.title}</span>
          </div>
          <p className="text-[11px] text-gray-500 mt-0.5">{p.approach}</p>
        </div>
        <div className="text-[10px] text-gray-600 shrink-0">Expertise: {p.expertise.slice(0, 3).join(' • ')}</div>
      </div>

      {/* Messages */}
      <div className="flex-1 bg-[#0d0d18] border border-gray-800/40 rounded-xl overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map(msg => (
            <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-slide-up`}>
              {msg.role === 'assistant' && (
                <div className="shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-red-500/15 to-purple-500/15 border border-red-500/20 flex items-center justify-center">
                  <Bot size={16} className="text-red-400" />
                </div>
              )}
              <div className={`max-w-[78%] rounded-xl px-4 py-3 text-sm leading-relaxed ${msg.role === 'user' ? 'bg-gradient-to-r from-red-500/8 to-purple-500/8 border border-red-500/15 text-gray-200' : 'bg-gray-800/30 border border-gray-700/20'}`}>
                {msg.role === 'user' ? <p>{msg.content}</p> : (
                  <>
                    {/* Thinking Chain */}
                    {msg.thinkingChain && msg.thinkingChain.length > 0 && (
                      <details className="mb-3">
                        <summary className="text-[11px] text-gray-500 cursor-pointer hover:text-gray-300 transition-colors flex items-center gap-1.5">
                          <Brain size={11} /> Reasoning chain ({msg.thinkingChain.length} steps)
                        </summary>
                        <div className="mt-2 space-y-1 pl-3 border-l-2 border-gray-700/50">
                          {msg.thinkingChain.map((step, i) => (
                            <p key={i} className="text-[11px] text-gray-500 flex items-center gap-2">
                              <span className="w-1 h-1 rounded-full bg-gray-600 shrink-0" />
                              {step}
                            </p>
                          ))}
                        </div>
                      </details>
                    )}
                    <div className="space-y-0.5">{formatMsg(msg.content)}</div>
                    {/* Persona & Mode badges */}
                    <div className="mt-3 pt-2 border-t border-gray-700/20 flex items-center gap-2 flex-wrap">
                      {msg.persona && <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/15">{personas[msg.persona]?.icon} {personas[msg.persona]?.name.split(' ').slice(-1)[0]}</span>}
                      {msg.thinkMode && <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/15">{msg.thinkMode === 'deeper' ? '🔬 Deeper' : msg.thinkMode === 'deep' ? '🧠 Deep' : '⚡ Quick'}</span>}
                    </div>
                    {/* Sources */}
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {msg.sources.slice(0, 6).map(s => <span key={s} className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/8 text-cyan-400/70 border border-cyan-500/10">{s}</span>)}
                      </div>
                    )}
                  </>
                )}
              </div>
              {msg.role === 'user' && (
                <div className="shrink-0 w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-500/20 flex items-center justify-center"><User size={16} className="text-cyan-400" /></div>
              )}
            </div>
          ))}

          {/* Thinking animation */}
          {(isTyping || showThinking) && (
            <div className="flex gap-3 items-start animate-fade-in">
              <div className="shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-red-500/15 to-purple-500/15 border border-red-500/20 flex items-center justify-center"><Bot size={16} className="text-red-400" /></div>
              <div className="bg-gray-800/30 border border-gray-700/20 rounded-xl px-4 py-3 max-w-md">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles size={14} className={`animate-pulse ${thinkMode === 'deeper' ? 'text-red-400' : thinkMode === 'deep' ? 'text-purple-400' : 'text-emerald-400'}`} />
                  <span className="text-xs text-gray-400">{thinkMode === 'deeper' ? 'Deep analysis in progress...' : thinkMode === 'deep' ? 'Thinking deeply...' : 'Thinking...'}</span>
                </div>
                {thinkingChain.length > 0 && (
                  <div className="space-y-1 mt-2">
                    {thinkingChain.map((step, i) => (
                      <p key={i} className="text-[11px] text-gray-500 flex items-center gap-2 animate-fade-in">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${i === thinkingChain.length - 1 ? 'bg-emerald-400 animate-pulse' : 'bg-gray-600'}`} />
                        {step}
                      </p>
                    ))}
                    {thinkingChain.length > 0 && <div className="flex items-center gap-1 mt-1"><div className="w-1 h-1 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '0ms' }} /><div className="w-1 h-1 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '150ms' }} /><div className="w-1 h-1 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '300ms' }} /></div>}
                  </div>
                )}
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* Quick prompts */}
        <div className="px-4 py-2 border-t border-gray-800/20 flex gap-2 overflow-x-auto">
          {['How do I prevent SQL injection?','Explain OWASP Top 10','Zero Trust architecture','Ransomware defense strategy','Secure code review tips','MITRE ATT&CK mapping'].map(p => (
            <button key={p} onClick={() => handleSend(p)} className="shrink-0 px-3 py-1.5 rounded-full bg-gray-800/30 border border-gray-700/20 text-[11px] text-gray-400 hover:text-red-400 hover:border-red-500/25 transition-all">{p}</button>
          ))}
        </div>

        {/* Input */}
        <div className="p-4 border-t border-gray-800/20">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()}
                placeholder={`Ask ${p.name} anything about security...`}
                className="w-full bg-[#0a0a14] border border-gray-700/40 rounded-lg pl-4 pr-10 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-red-500/50 transition-colors" />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {webSearch && <Search size={12} className="text-cyan-400" />}
                {thinkMode === 'deeper' ? <Microscope size={12} className="text-red-400" /> : thinkMode === 'deep' ? <Brain size={12} className="text-purple-400" /> : <Zap size={12} className="text-emerald-400" />}
              </div>
            </div>
            <button onClick={() => handleSend()} disabled={!input.trim() || isTyping}
              className="px-4 py-2.5 rounded-lg bg-gradient-to-r from-red-500 to-purple-600 disabled:from-gray-700 disabled:to-gray-700 disabled:text-gray-500 text-white transition-all shadow-lg shadow-red-500/15 disabled:shadow-none">
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
