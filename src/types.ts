export type Page = 'dashboard' | 'tool-generator' | 'code-analyzer' | 'chat-agent' | 'tool-library' | 'training-hub' | 'threat-intel' | 'deep-research' | 'user-guide' | 'settings';
export type AIPersona = 'security-assistant' | 'red-team-specialist' | 'code-expert' | 'threat-analyst' | 'defensive-strategist';
export type ThinkMode = 'quick' | 'deep' | 'deeper';
export interface SecurityTool { id: string; name: string; description: string; category: string; language: string; code: string; tests: string; docs: string; tags: string[]; difficulty: 'beginner' | 'intermediate' | 'advanced'; }
export interface Vulnerability { id: string; title: string; severity: 'critical' | 'high' | 'medium' | 'low' | 'info'; description: string; line?: number; recommendation: string; cwe?: string; poc?: string; }
export interface ChatMessage { id: string; role: 'user' | 'assistant' | 'system'; content: string; timestamp: number; persona?: AIPersona; thinkMode?: ThinkMode; sources?: string[]; thinkingChain?: string[]; }
export interface AnalysisResult { vulnerabilities: Vulnerability[]; summary: { critical: number; high: number; medium: number; low: number; info: number }; score: number; language: string; }
export interface APIConfig { provider: string; apiKey: string; model: string; endpoint: string; enabled: boolean; }
export interface ActivityItem { id: string; type: string; title: string; description: string; timestamp: number; }
export interface TrainingModule { id: string; title: string; description: string; category: string; lessons: TrainingLesson[]; difficulty: 'beginner' | 'intermediate' | 'advanced'; duration: string; icon: string; }
export interface TrainingLesson { id: string; title: string; content: string; type: 'lesson' | 'simulation'; quiz?: QuizQuestion[]; scenario?: SimulationScenario; }
export interface QuizQuestion { question: string; options: string[]; correctIndex: number; explanation: string; }
export interface SimulationScenario { title: string; context: string; steps: SimulationStep[]; }
export interface SimulationStep { situation: string; question: string; options: string[]; correctIndex: number; explanation: string; consequence: string; }
export interface ThreatEntry { id: string; title: string; type: string; severity: string; description: string; ioc: string[]; mitigation: string[]; defenseStrategy: string[]; sources: string[]; date: string; mitre?: string; }
export interface ResearchTopic { id: string; query: string; summary: string; sections: { title: string; content: string; sources: string[] }[]; sources: string[]; }
export interface LearnedPattern { input: string; response: string; topics: string[]; persona: AIPersona; timestamp: number; usageCount: number; }
export interface SystemHealth { uptime: number; sessions: number; queriesProcessed: number; knowledgeGrowth: number; lastSelfCheck: number; errorsCaught: number; selfHeals: number; memoryUsage: number; }
