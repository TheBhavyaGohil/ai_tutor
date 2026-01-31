"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Menu } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

// Import Components
import Sidebar from './components/Sidebar';
import DashboardContent from './components/DashboardContent';
import AITutorContent from './components/AITutorContent';
import CourseContent from './components/CourseContent';
import ScheduleContent from './components/ScheduleContent';
import PomodoroContent from './components/PomodoroContent';
import PdfTutorContent from './components/pdf_tutorContent';
import QuizContent from './components/QuizContent';


export default function DashboardPage() {
  const router = useRouter();
  const [view, setView] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // In a real app, this user data would come from a Context or Database
  const [user] = useState({ name: 'Admin', level: 'Intermediate', points: 1250 });

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } finally {
      if (typeof document !== 'undefined') {
        document.cookie = 'ai_user_name=; path=/; max-age=0';
        document.cookie = 'ai_user_email=; path=/; max-age=0';
      }
      router.push('/login');
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-800 overflow-hidden">
      
      {/* MOBILE SIDEBAR OVERLAY */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden" 
          onClick={() => setIsSidebarOpen(false)} 
        />
      )}

      {/* SIDEBAR COMPONENT */}
      <Sidebar 
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        view={view}
        setView={setView}
        user={user}
        handleLogout={handleLogout}
      />

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="bg-white border-b border-slate-200 p-4 flex justify-between items-center sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button 
              className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-xl"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu size={24} />
            </button>
            <h2 className="text-lg md:text-xl font-bold text-slate-800 capitalize tracking-tight">
              {view.replace(/[-_]/g, ' ')}
            </h2>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          {view === 'dashboard' && <DashboardContent user={user} />}
          {view === 'tutor' && <AITutorContent />}
          {view === 'courses' && <CourseContent />}
          {view === 'schedule' && <ScheduleContent />}
          {view === 'pomodoro' && <PomodoroContent />}
          {view === 'pdf_tutor' && <PdfTutorContent />}
          {view === 'quiz' && <QuizContent />}

        </div>
      </main>
    </div>
  );
}