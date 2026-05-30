import {LayoutDashboard,Wrench,SearchCode,MessageSquare,BookOpen,GraduationCap,Radar,Microscope,HelpCircle,Settings,ChevronLeft,ChevronRight,Flame} from 'lucide-react';
import {Page} from '../types';
interface Props{currentPage:Page;onNavigate:(p:Page)=>void;collapsed:boolean;onToggleCollapse:()=>void}
const nav:{page:Page;label:string;icon:React.ReactNode;section?:string}[]=[
  {page:'dashboard',label:'Dashboard',icon:<LayoutDashboard size={18}/>,section:'Main'},
  {page:'tool-generator',label:'Tool Generator',icon:<Wrench size={18}/>,section:'Build'},
  {page:'code-analyzer',label:'Code Analyzer',icon:<SearchCode size={18}/>},
  {page:'tool-library',label:'Tool Library',icon:<BookOpen size={18}/>},
  {page:'chat-agent',label:'AI Agent',icon:<MessageSquare size={18}/>,section:'AI'},
  {page:'deep-research',label:'Deep Research',icon:<Microscope size={18}/>},
  {page:'training-hub',label:'Training Hub',icon:<GraduationCap size={18}/>,section:'Learn'},
  {page:'threat-intel',label:'Threat Intel',icon:<Radar size={18}/>},
  {page:'user-guide',label:'User Guide',icon:<HelpCircle size={18}/>,section:'Help'},
  {page:'settings',label:'Settings',icon:<Settings size={18}/>},
];
export default function Sidebar({currentPage,onNavigate,collapsed,onToggleCollapse}:Props){
  let last='';
  return(
    <aside className={`fixed left-0 top-0 h-full z-40 flex flex-col transition-all duration-300 ${collapsed?'w-[68px]':'w-64'} bg-[#07070f] border-r border-gray-800/60`}>
      <div className="flex items-center gap-3 px-4 h-16 border-b border-gray-800/60 shrink-0">
        <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-red-500 to-purple-600 shadow-lg shadow-red-500/25 shrink-0">
          <Flame size={20} className="text-white"/>
          <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-[#07070f] animate-pulse"/>
        </div>
        {!collapsed&&<div className="overflow-hidden"><div className="flex items-center gap-0.5"><span className="font-bold text-white text-sm">Red</span><span className="font-bold text-red-400 text-sm">Hydra</span><span className="text-[10px] text-purple-400 font-semibold ml-0.5">AI</span></div><p className="text-[10px] text-gray-500 -mt-0.5">Security Platform v2</p></div>}
      </div>
      <nav className="flex-1 py-3 overflow-y-auto px-2">
        {nav.map(item=>{
          const active=currentPage===item.page;
          const show=!collapsed&&item.section&&item.section!==last;
          if(item.section)last=item.section;
          return(<div key={item.page}>
            {show&&<div className="px-3 pt-4 pb-1"><span className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider">{item.section}</span></div>}
            <button onClick={()=>onNavigate(item.page)} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-200 mb-0.5 ${collapsed?'justify-center':''} ${active?'bg-gradient-to-r from-red-500/15 to-purple-500/10 text-red-400 border border-red-500/25 shadow-sm shadow-red-500/10':'text-gray-400 hover:text-gray-200 hover:bg-gray-800/40 border border-transparent'}`} title={collapsed?item.label:undefined}>
              <span className={`shrink-0 ${active?'text-red-400':''}`}>{item.icon}</span>
              {!collapsed&&<span>{item.label}</span>}
            </button>
          </div>);
        })}
      </nav>
      <div className="p-2 border-t border-gray-800/60 shrink-0">
        {!collapsed&&<div className="px-3 py-1 mb-1"><p className="text-[10px] text-gray-600">v2.0 • MIT License</p></div>}
        <button onClick={onToggleCollapse} className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-gray-800/40 transition-colors text-xs">
          {collapsed?<ChevronRight size={14}/>:<ChevronLeft size={14}/>}{!collapsed&&<span>Collapse</span>}
        </button>
      </div>
    </aside>
  );
}
