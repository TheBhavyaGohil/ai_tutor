"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Loader2 } from 'lucide-react';

// Import Components
import Sidebar from './components/Sidebar';
import DashboardContent from './components/DashboardContent';
import AITutorContent from './components/AITutorContent';
import CourseContent from './components/CourseContent';
import ScheduleContent from './components/ScheduleContent';
import PomodoroContent from './components/PomodoroContent';
import PdfTutorContent from './components/pdf_tutorContent';
import QuizContent from './components/QuizContent';
import SkillsContent from './components/SkillsContent';
import NotesLLM from './components/notesllm';

type ViewType = 'dashboard' | 'tutor' | 'courses' | 'schedule' | 'pomodoro' | 'quiz' | 'pdf_tutor' | 'skills' | 'notes_llm';

export default function DashboardPage() {
  const router = useRouter();
  
  // --- STATE ---
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewType>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); // Default open

  // --- AUTH CHECK ---
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          // No session? Redirect to login
          router.replace('/login');
        } else {
          // Session exists? Load user
          setUser(session.user);
          
          // Optional: Check cookie fallback if you rely on it
          if (typeof document !== 'undefined') {
             const cookieCheck = document.cookie.includes('ai_user_email');
             if(!cookieCheck) {
                // Set cookies if missing (for middleware parity)
                document.cookie = `ai_user_email=${session.user.email}; path=/; max-age=86400`;
             }
          }
        }
      } catch (error) {
        console.error("Auth Error:", error);
        router.replace('/login');
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, [router]);

  // --- LOGOUT HANDLER ---
  const handleLogout = async () => {
    await supabase.auth.signOut();
    // Clear cookies
    document.cookie = 'ai_user_name=; path=/; max-age=0';
    document.cookie = 'ai_user_email=; path=/; max-age=0';
    router.push('/login');
  };

  // --- RENDER LOADING ---
  if (loading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mb-4" />
        <p className="text-slate-500 font-medium">Verifying access...</p>
      </div>
    );
  }

  // --- RENDER MAIN UI ---
  if (!user) return null; // Prevent flash before redirect

  return (
    // ROOT: Flex row, fixed height
    <div className="flex h-screen w-full bg-slate-50 text-slate-900 overflow-hidden">
      
      {/* 1. SIDEBAR (Flex Item) */}
      {/* It will resize, pushing the main content */}
      <Sidebar 
        isSidebarOpen={isSidebarOpen} 
        setIsSidebarOpen={setIsSidebarOpen} 
        view={view} 
        setView={setView} 
        user={user} 
        handleLogout={handleLogout} 
      />

      {/* 2. CONTENT AREA (Flex Grow) */}
      {/* Uses flex-1 to fill remaining space */}
      <main className="flex-1 h-full relative overflow-y-auto lg:overflow-hidden flex flex-col transition-all duration-300">
        
        {/* VIEW RENDERER */}
        <div className="flex-1 h-full w-full relative">
          
          {view === 'dashboard' && (
            <div className="h-full w-full overflow-y-auto p-4 md:p-8 custom-scrollbar">
              <DashboardContent user={user} onViewSchedule={() => setView('schedule')} />
            </div>
          )}
          
          {/* These components now handle their own layout/scrolling internally */}
          {view === 'tutor' && <AITutorContent />}
          
          {view === 'courses' && (
            <div className="h-full w-full overflow-y-auto custom-scrollbar">
              <CourseContent />
            </div>
          )}
          
          {view === 'schedule' && <ScheduleContent />}
          {view === 'pomodoro' && <PomodoroContent />}
          {view === 'pdf_tutor' && <PdfTutorContent />}
          {view === 'quiz' && <QuizContent />}
          {view === 'skills' && <SkillsContent user={user} />}
          {view === 'notes_llm' && <NotesLLM />}
          
        </div>
      </main>
    </div>
  );
}