"use client";
import React from 'react';
import { 
  BarChart, MessageSquare, Search, Calendar, Clock, Award, LogOut, Brain, X, ChevronRight 
} from 'lucide-react';
import { HelpCircle } from "lucide-react";

interface SidebarProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (v: boolean) => void;
  view: string;
  setView: (v: string) => void;
  user: any;
  handleLogout: () => void;
}

export default function Sidebar({ isSidebarOpen, setIsSidebarOpen, view, setView, user, handleLogout }: SidebarProps) {
  return (
    <aside className={`
      fixed inset-y-0 left-0 z-50 w-72 bg-slate-900 text-white flex flex-col shadow-2xl transition-transform duration-300 ease-in-out
      lg:relative lg:translate-x-0 lg:w-64 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
    `}>
      <div className="p-6 border-b border-slate-800 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="text-blue-400" /> EduGenie
          </h1>
          <p className="text-xs text-slate-500 mt-1">Innovation Challenge 2026</p>
        </div>
        <button className="lg:hidden p-1 hover:bg-slate-800 rounded" onClick={() => setIsSidebarOpen(false)}>
          <X size={24} />
        </button>
      </div>
      
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        <NavItem icon={<BarChart size={20} />} label="Dashboard" active={view === 'dashboard'} onClick={() => { setView('dashboard'); setIsSidebarOpen(false); }} />
        <NavItem icon={<MessageSquare size={20} />} label="AI Tutor" active={view === 'tutor'} onClick={() => { setView('tutor'); setIsSidebarOpen(false); }} />
        <NavItem icon={<Search size={20} />} label="Courses" active={view === 'courses'} onClick={() => { setView('courses'); setIsSidebarOpen(false); }} />
        <NavItem icon={<Calendar size={20} />} label="Schedule" active={view === 'schedule'} onClick={() => { setView('schedule'); setIsSidebarOpen(false); }} />
        <NavItem icon={<Clock size={20} />} label="Pomodoro" active={view === 'pomodoro'} onClick={() => { setView('pomodoro'); setIsSidebarOpen(false); }} />
        <NavItem icon={<Award size={20} />} label="Certificates" active={view === 'certificates'} onClick={() => { setView('certificates'); setIsSidebarOpen(false); }} />
        <NavItem icon={<HelpCircle size={20} />} label="Quiz" active={view === "quiz"} onClick={() => { setView("quiz"); setIsSidebarOpen(false);}}/>

      </nav>

      <div className="p-4 border-t border-slate-800">
        <button 
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white py-2.5 rounded-xl text-sm transition-all duration-200"
        >
          <LogOut size={16} /> Logout
        </button>
      </div>
    </aside>
  );
}

function NavItem({ icon, label, active, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
        active 
        ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' 
        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
      }`}
    >
      <span className={`${active ? 'text-white' : 'text-slate-500 group-hover:text-blue-400'}`}>{icon}</span>
      <span className="font-medium text-sm">{label}</span>
      {active && <ChevronRight size={14} className="ml-auto opacity-50" />}
    </button>
  );
}