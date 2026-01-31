"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation"; // For redirection
import DynamicTimetable from "./DynamicTimetable";
import { Sparkles, Loader2, Save, DownloadCloud, Search, X, FileText, RefreshCw, Trash2, User, LogOut } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import NotificationOverlay, { NotificationType } from "./NotificationOverlay";

export default function ScheduleContent() {
  const router = useRouter();

  // --- AUTH STATE ---
  const [user, setUser] = useState<any>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  // --- CORE DATA STATE ---
  const [schedule, setSchedule] = useState<any[]>([]);
  const [scheduleId, setScheduleId] = useState<number | null>(null);
  const [scheduleName, setScheduleName] = useState<string>("");

  // --- UI STATE ---
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // --- MODAL STATE ---
  const [isLoadModalOpen, setIsLoadModalOpen] = useState(false);
  const [savedSchedules, setSavedSchedules] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [notification, setNotification] = useState<{ message: string; type: NotificationType } | null>(null);

  const showNotification = (message: string, type: NotificationType = "info") => {
    setNotification({ message, type });
  };

  // 1. CHECK AUTH ON LOAD
  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push("/login"); // Redirect if not logged in
        } else {
          setUser(session.user);
        }
      } catch (error) {
        console.error("Auth check failed", error);
        router.push("/login");
      } finally {
        setIsAuthChecking(false);
      }
    };

    checkUser();
  }, [router]);

  // 2. LOGOUT FUNCTION
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  // --- API HELPER (Uses authenticated user id) ---
  const apiCall = async (payload: any) => {
    if (!user?.id) {
      setError("User not authenticated.");
      return null;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      setError("Session expired. Please log in again.");
      return null;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/generate-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // INJECT REAL USER ID + ACCESS TOKEN HERE
        body: JSON.stringify({ ...payload, userId: user.id, accessToken: session.access_token }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      return data;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // --- ACTIONS (Same logic, just connected to state) ---

  const generateSchedule = async () => {
    if (!prompt.trim()) return;
    setScheduleId(null);
    setScheduleName("");
    setSchedule([]);
    const data = await apiCall({ action: "generate", prompt });
    if (data?.schedule) setSchedule(data.schedule);
  };

  const saveAsNew = async () => {
    if (schedule.length === 0) return;
    const name = window.prompt("Name this schedule:", scheduleName || "New Schedule");
    if (!name) return;

    const data = await apiCall({ action: "save", schedule, name });
    if (data?.data) {
      setScheduleId(data.data.id);
      setScheduleName(data.data.name);
      showNotification("Saved successfully!", "success");
    }
  };

  const updateExisting = async () => {
    if (!scheduleId) return;
    const res = await apiCall({ action: "update", id: scheduleId, schedule, name: scheduleName });
    if (res?.success) showNotification("Updated successfully!", "success");
  };

  const openLoadModal = async () => {
    setIsLoadModalOpen(true);
    const res = await apiCall({ action: "load_list" });
    if (res?.data) setSavedSchedules(res.data);
  };

  const loadSpecific = async (id: number) => {
    const res = await apiCall({ action: "load_one", id });
    if (res?.data) {
      setSchedule(res.data.content);
      setScheduleId(res.data.id);
      setScheduleName(res.data.name);
      setIsLoadModalOpen(false);
    }
  };

  const deleteSchedule = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation(); 
    if (!window.confirm("Are you sure you want to delete this schedule?")) return;
    
    const res = await apiCall({ action: "delete", id });
    if (res?.success) {
      setSavedSchedules(prev => prev.filter(item => item.id !== id));
      if (scheduleId === id) {
        setSchedule([]);
        setScheduleId(null);
        setScheduleName("");
      }
    }
  };

  const handleStatusChange = (index: number, newStatus: string) => {
    const updated = [...schedule];
    updated[index].status = newStatus;
    setSchedule(updated);
  };

  // 3. LOADING SCREEN (While checking auth)
  if (isAuthChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  // 4. MAIN DASHBOARD (Only shows if logged in)
  return (
    <div className="h-full w-full p-2 md:p-4 font-sans overflow-visible pb-4 md:pb-6">
      <NotificationOverlay
        open={!!notification}
        message={notification?.message || ""}
        type={notification?.type || "info"}
        onClose={() => setNotification(null)}
      />

      <div id="timetable-root" className="w-full h-full bg-white rounded-[2rem] shadow-2xl shadow-slate-300/50 border border-slate-200 overflow-hidden relative flex flex-col">
        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-12 custom-scrollbar">
          <div className="max-w-4xl mx-auto">
            
            {/* Header / User Info */}
            <div className="print:hidden flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
              {/* User Badge */}
              <div className="flex items-center gap-2 text-sm text-slate-500 bg-slate-50 px-4 py-2 rounded-full border border-slate-200 shadow-sm">
                <User className="w-4 h-4 text-indigo-600" />
                <span className="hidden md:inline">Logged in as:</span> 
                <span className="font-semibold text-slate-700">{user?.email}</span>
              </div>

              {/* Logout Button */}
              <button 
                onClick={handleLogout}
                className="flex items-center gap-2 text-sm font-bold text-red-500 hover:text-red-700 hover:bg-red-50 px-4 py-2 rounded-full transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>

            {/* Controls */}
            <div className="print:hidden mb-10 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-600 rounded-xl mb-4 shadow-lg shadow-indigo-200">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-3xl font-black text-slate-900">
                {scheduleName || "AI Schedule Maker"}
              </h1>
              <p className="text-slate-500 mt-2 mb-8">Generate, Edit, and Track your progress.</p>

              {/* Input Area */}
              <div className="bg-slate-50 p-2 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-2 mb-6">
                <input
                  className="flex-1 p-3 px-4 outline-none text-slate-700 placeholder:text-slate-400 bg-transparent"
                  placeholder='e.g., "Week 1 Exam Prep" or "Daily Routine"'
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && generateSchedule()}
                />
                <button
                  onClick={generateSchedule}
                  disabled={loading || !prompt.trim()}
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 min-w-[140px]"
                >
                  {loading ? <Loader2 className="animate-spin w-5 h-5"/> : "Generate"}
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap justify-center gap-3">
                <button onClick={openLoadModal} className="px-4 py-2 bg-slate-50 border border-slate-200 hover:border-indigo-500 hover:text-indigo-600 rounded-lg text-sm font-medium flex items-center gap-2 transition-all">
                  <DownloadCloud className="w-4 h-4" /> Load Saved
                </button>

                <button onClick={saveAsNew} disabled={schedule.length === 0} className="px-4 py-2 bg-slate-50 border border-slate-200 hover:border-indigo-500 hover:text-indigo-600 rounded-lg text-sm font-medium flex items-center gap-2 transition-all disabled:opacity-50">
                  <Save className="w-4 h-4" /> Save As New
                </button>

                {scheduleId && (
                  <button onClick={updateExisting} className="px-4 py-2 bg-green-50 border border-green-200 text-green-700 hover:bg-green-100 rounded-lg text-sm font-bold flex items-center gap-2 transition-all">
                    <RefreshCw className="w-4 h-4" /> Update Saved
                  </button>
                )}
              </div>

              {error && <div className="mt-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg">{error}</div>}
            </div>

            {/* Timetable View */}
            <DynamicTimetable schedule={schedule} onStatusChange={handleStatusChange} />
          </div>
        </div>

        {/* --- LOAD MODAL --- */}
        {isLoadModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm print:hidden">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col">
              <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-bold text-lg text-slate-800">Your Schedules</h3>
                <button onClick={() => setIsLoadModalOpen(false)} className="p-1 hover:bg-slate-100 rounded-full">
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              <div className="p-4 pb-2">
                <div className="relative">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <input 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {loading && <div className="text-center py-4 text-slate-400"><Loader2 className="animate-spin w-5 h-5 mx-auto"/></div>}
                
                {!loading && savedSchedules
                  .filter(s => (s.name || "Untitled").toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((item) => (
                  <div
                    key={item.id}
                    onClick={() => loadSpecific(item.id)}
                    className="w-full text-left p-3 rounded-lg hover:bg-indigo-50 group transition-colors flex items-center gap-3 cursor-pointer relative"
                  >
                    <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg group-hover:bg-indigo-200">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-slate-800">{item.name || "Untitled"}</div>
                      <div className="text-xs text-slate-500">{new Date(item.created_at).toLocaleDateString()}</div>
                    </div>
                    
                    {/* Delete Button */}
                    <button 
                      onClick={(e) => deleteSchedule(item.id, e)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors z-10"
                      title="Delete Schedule"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                
                {!loading && savedSchedules.length === 0 && (
                  <div className="text-center py-8 text-slate-400 text-sm">No schedules found.</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}