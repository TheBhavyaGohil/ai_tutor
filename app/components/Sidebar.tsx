"use client";
import React, { useEffect, useState } from 'react';
import { 
  BarChart, MessageSquare, Search, Calendar, Clock, FileText, LogOut, Brain, X, ChevronRight, Award, Moon, Sun, Monitor, BookOpen
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

type ViewType = 'dashboard' | 'tutor' | 'courses' | 'schedule' | 'pomodoro' | 'quiz' | 'pdf_tutor' | 'skills' | 'notes_llm';

interface SidebarProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (v: boolean) => void;
  view: ViewType;
  setView: React.Dispatch<React.SetStateAction<ViewType>>;
  user: any;
  handleLogout: () => void;
}

export default function Sidebar({ isSidebarOpen, setIsSidebarOpen, view, setView, user, handleLogout }: SidebarProps) {
  const [profile, setProfile] = useState<{ name: string; email: string }>({
    name: user?.user_metadata?.full_name || 'User',
    email: user?.email || 'email@example.com'
  });

  // Theme State
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  const applyTheme = (nextTheme: 'light' | 'dark') => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(nextTheme);
    root.style.colorScheme = nextTheme;
  };

  // Toggle Theme Function
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    applyTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  useEffect(() => {
    // Set initial user data
    if (user) {
      setProfile({
        name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
        email: user.email || ''
      });
    }
  }, [user]);

  useEffect(() => {
    const saved = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (saved) {
      setTheme(saved);
      applyTheme(saved);
      return;
    }
    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    const initial = prefersDark ? 'dark' : 'light';
    setTheme(initial);
    applyTheme(initial);
  }, []);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  return (
    <aside 
      className={`
        h-full bg-slate-900 text-white flex-shrink-0 shadow-2xl transition-all duration-300 ease-in-out relative z-50 overflow-hidden
        ${isSidebarOpen ? 'w-72' : 'w-5 cursor-pointer hover:w-6 hover:bg-slate-800'}
      `}
      onClick={() => !isSidebarOpen && setIsSidebarOpen(true)}
      title={!isSidebarOpen ? "Click to open menu" : ""}
    >
      {/* --- CLOSED STATE: THIN STRIP --- */}
      <div className={`absolute inset-0 flex flex-col items-center justify-center space-y-4 transition-opacity duration-300 ${isSidebarOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
         {/* A visual indicator that this is clickable */}
         <div className="w-1 h-16 bg-slate-700 rounded-full group-hover:bg-indigo-500 transition-colors" />
         <div className="w-1 h-1 bg-slate-700 rounded-full" />
         <div className="w-1 h-1 bg-slate-700 rounded-full" />
      </div>

      {/* --- OPEN STATE: CONTENT --- */}
      <div className={`flex flex-col h-full w-72 transition-opacity duration-200 ${!isSidebarOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
          <div className="overflow-hidden">
            <h1 className="text-2xl font-bold flex items-center gap-2 whitespace-nowrap">
              <Brain className="text-indigo-400 shrink-0" /> EduGenie
            </h1>
            <p className="text-xs text-slate-500 mt-1 whitespace-nowrap">Innovation Challenge 2026</p>
          </div>
          <button 
            className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors" 
            onClick={(e) => { e.stopPropagation(); setIsSidebarOpen(false); }}
          >
            <X size={24} />
          </button>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
          <NavItem icon={<BarChart size={20} />} label="Dashboard" active={view === 'dashboard'} onClick={() => setView('dashboard')} />
          <NavItem icon={<MessageSquare size={20} />} label="AI Tutor" active={view === 'tutor'} onClick={() => setView('tutor')} />
          <NavItem icon={<Search size={20} />} label="Courses" active={view === 'courses'} onClick={() => setView('courses')} />
          <NavItem icon={<BookOpen size={20} />} label="Notes LLM" active={view === 'notes_llm'} onClick={() => setView('notes_llm')} />
          <NavItem icon={<FileText size={20} />} label="PDF Tutor" active={view === 'pdf_tutor'} onClick={() => setView('pdf_tutor')} />
          <NavItem icon={<Calendar size={20} />} label="Schedule" active={view === 'schedule'} onClick={() => setView('schedule')} />
          <NavItem icon={<Clock size={20} />} label="Pomodoro" active={view === 'pomodoro'} onClick={() => setView('pomodoro')} />
          <NavItem icon={<Award size={20} />} label="Quiz" active={view === 'quiz'} onClick={() => setView('quiz')} />
        </nav>

        {/* Footer / User Profile */}
        <div className="p-4 border-t border-slate-800 bg-slate-900">
          
          {/* User Info Card */}
          <button
            onClick={(e) => { e.stopPropagation(); setView('skills'); }}
            className="mb-3 w-full text-left rounded-xl bg-slate-800 px-3 py-2 border border-slate-700/50 hover:bg-slate-700 transition-colors"
            title="View your skills"
          >
            <p className="text-sm font-semibold text-white truncate">{profile.name}</p>
            <p className="text-xs text-slate-400 truncate">{profile.email}</p>
          </button>

          {/* Action Buttons Row */}
          <div className="flex gap-2">
            {/* Theme Toggle */}
            <button 
              onClick={(e) => { e.stopPropagation(); toggleTheme(); }}
              className="flex-1 flex items-center justify-center p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
            >
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>

            {/* Logout */}
            <button 
              onClick={(e) => { e.stopPropagation(); handleLogout(); }}
              className="flex-[3] flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-600 text-red-400 hover:text-white py-2.5 rounded-xl text-sm font-medium transition-all duration-200 border border-red-500/20 hover:border-red-600"
            >
              <LogOut size={16} /> Logout
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}

function NavItem({ icon, label, active, onClick }: any) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group whitespace-nowrap ${
        active 
        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' 
        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
      }`}
    >
      <span className={`${active ? 'text-white' : 'text-slate-500 group-hover:text-indigo-400'} transition-colors`}>{icon}</span>
      <span className="font-medium text-sm">{label}</span>
      {active && <ChevronRight size={14} className="ml-auto opacity-50" />}
    </button>
  );
}
