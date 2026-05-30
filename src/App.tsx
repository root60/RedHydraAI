import { useState, useCallback } from 'react';
import { Page, ActivityItem } from './types';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import ToolGenerator from './components/ToolGenerator';
import CodeAnalyzer from './components/CodeAnalyzer';
import ChatAgent from './components/ChatAgent';
import ToolLibrary from './components/ToolLibrary';
import TrainingHub from './components/TrainingHub';
import ThreatIntel from './components/ThreatIntel';
import DeepResearch from './components/DeepResearch';
import UserGuide from './components/UserGuide';
import Settings from './components/Settings';

const defaultActivities: ActivityItem[] = [
  { id: '1', type: 'chat-message', title: 'AI Agent: Deep Think', description: 'Security Assistant analyzed SQL injection (5 sources)', timestamp: new Date(Date.now() - 3600000) },
  { id: '2', type: 'tool-generated', title: 'Generated: Network Scanner', description: 'Python tool with tests & docs', timestamp: new Date(Date.now() - 7200000) },
  { id: '3', type: 'code-analyzed', title: 'Analyzed Python code', description: '5 critical issues. Score: 25/100', timestamp: new Date(Date.now() - 10800000) },
  { id: '4', type: 'training-completed', title: 'Red Team Simulation', description: 'Phishing sim: 3/3 correct decisions', timestamp: new Date(Date.now() - 86400000) },
  { id: '5', type: 'research-completed', title: 'Researched: Zero Trust', description: '6 sources, 3 analysis sections', timestamp: new Date(Date.now() - 90000000) },
];

export default function App() {
  const [page, setPage] = useState<Page>('dashboard');
  const [collapsed, setCollapsed] = useState(false);
  const [activities, setActivities] = useState<ActivityItem[]>(defaultActivities);
  const addActivity = useCallback((a: Omit<ActivityItem, 'id' | 'timestamp'>) => { setActivities(prev => [{ ...a, id: `a-${Date.now()}`, timestamp: new Date() }, ...prev]); }, []);
  const render = () => {
    switch (page) {
      case 'dashboard': return <Dashboard onNavigate={setPage} activities={activities} />;
      case 'tool-generator': return <ToolGenerator addActivity={addActivity} />;
      case 'code-analyzer': return <CodeAnalyzer addActivity={addActivity} />;
      case 'chat-agent': return <ChatAgent addActivity={addActivity} />;
      case 'tool-library': return <ToolLibrary />;
      case 'training-hub': return <TrainingHub />;
      case 'threat-intel': return <ThreatIntel />;
      case 'deep-research': return <DeepResearch addActivity={addActivity} />;
      case 'user-guide': return <UserGuide />;
      case 'settings': return <Settings />;
      default: return <Dashboard onNavigate={setPage} activities={activities} />;
    }
  };
  return (<div className="min-h-screen bg-[#050508] text-white"><Sidebar currentPage={page} onNavigate={setPage} collapsed={collapsed} onToggleCollapse={() => setCollapsed(!collapsed)} /><main className={`transition-all duration-300 ${collapsed ? 'ml-[68px]' : 'ml-64'}`}><div className="p-6 max-w-[1600px] mx-auto">{render()}</div></main></div>);
}
