"use client";
import React, { useState, useEffect, useRef } from 'react';
import { 
  Brain, Languages, MessageSquare, Plus, History, Trash2, Loader2, X, CheckSquare, Square, ChevronLeft, Menu, Send, CalendarPlus, CalendarCheck 
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import MessageContent from './MessageContent';

type ChatMessage = { role: 'user' | 'assistant'; text: string };
type ChatSession = { id: string; title: string; updated_at: string };
type ReminderParse = {
  isReminder: boolean;
  title: string | null;
  date: string | null;
  time: string | null;
  durationMinutes: number | null;
  description: string | null;
};

type ReminderState = ReminderParse & { eventId?: string };

export default function AITutorContent() {
  // --- STATE ---
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isContinuing, setIsContinuing] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [language, setLanguage] = useState('English');
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isSessionsLoading, setIsSessionsLoading] = useState(true);
  const [userId, setUserId] = useState<string>('default_user');
  const [sessionAccessToken, setSessionAccessToken] = useState<string | null>(null);

  // Google Calendar State
  const [googleConnected, setGoogleConnected] = useState(false);
  const [googleChecking, setGoogleChecking] = useState(false);
  const [pendingReminder, setPendingReminder] = useState<ReminderState | null>(null);
  const [pendingReminderLoading, setPendingReminderLoading] = useState(false);
  const [reminderAdding, setReminderAdding] = useState(false);
  const [reminderStatusText, setReminderStatusText] = useState("sure");
  const [reminderDeleting, setReminderDeleting] = useState(false);
  
  // UI State
  const [isHistoryOpen, setIsHistoryOpen] = useState(true); // Desktop: Expanded vs Collapsed Strip
  const [showMobileHistory, setShowMobileHistory] = useState(false); // Mobile: Drawer Open vs Closed
  
  // Delete State
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedSessionIds, setSelectedSessionIds] = useState<Set<string>>(new Set());

  const chatEndRef = useRef<HTMLDivElement>(null);
  const prevMessagesLengthRef = useRef(0);

  // --- SCROLL TO BOTTOM ---
  useEffect(() => {
    if (messages.length > prevMessagesLengthRef.current) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    prevMessagesLengthRef.current = messages.length;
  }, [messages]);

  useEffect(() => {
    if (!reminderAdding) return;
    const options = ["sure", "sure.", "sure..", "sure..."];
    let index = 0;
    const timer = setInterval(() => {
      index = (index + 1) % options.length;
      setReminderStatusText(options[index]);
    }, 500);
    return () => clearInterval(timer);
  }, [reminderAdding]);

  // --- INITIAL LOAD ---
  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser();
      const id = data?.user?.id || data?.user?.email || 'default_user';
      setUserId(id);
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token || null;
      setSessionAccessToken(accessToken);
      await loadSessions(id);
      if (accessToken) {
        await refreshGoogleStatus(id, accessToken);
      }
    };
    init();
  }, []);

  // --- DATA FETCHING ---
  const loadSessions = async (uid: string) => {
    setIsSessionsLoading(true);
    const { data, error } = await supabase
      .from('chat_sessions')
      .select('id,title,updated_at')
      .eq('user_id', uid)
      .order('updated_at', { ascending: false });

    if (!error && data) {
      setSessions(data as ChatSession[]);
      if (data.length === 0 && !currentSessionId) {
        setMessages([
          { role: 'assistant', text: 'Namaste! I am your AI Tutor. I can explain complex topics in English, Hindi, or Gujarati. What should we tackle today?' }
        ]);
      }
    }
    setIsSessionsLoading(false);
  };

  const loadSessionMessages = async (sessionId: string) => {
    if (isSelectionMode) {
      toggleSessionSelection(sessionId);
      return;
    }

    setCurrentSessionId(sessionId);
    setShowMobileHistory(false); // Close mobile drawer on selection

    const { data, error } = await supabase
      .from('chat_messages')
      .select('role,content,created_at')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      const msgs: ChatMessage[] = data.map((m: any) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        text: m.content
      }));
      setMessages(msgs);
    }
  };

  const refreshGoogleStatus = async (uid: string, accessToken: string) => {
    setGoogleChecking(true);
    try {
      const res = await fetch('/api/google/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: uid, accessToken })
      });
      const data = await res.json();
      if (res.ok) setGoogleConnected(!!data.connected);
    } catch (error) {
      console.warn('Failed to check Google status', error);
    } finally {
      setGoogleChecking(false);
    }
  };

  const connectGoogleCalendar = async () => {
    if (!userId) return;
    try {
      const res = await fetch('/api/google/oauth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, nextPath: '/', currentView: 'tutor' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start Google OAuth');
      window.location.href = data.url;
    } catch (err) {
      console.error('Google OAuth failed', err);
    }
  };

  const addAssistantMessage = async (text: string, sessionId?: string | null) => {
    const message: ChatMessage = { role: 'assistant', text };
    setMessages(prev => [...prev, message]);
    if (sessionId) {
      await supabase.from('chat_messages').insert([
        { session_id: sessionId, user_id: userId, role: 'assistant', content: text }
      ]);
      await supabase
        .from('chat_sessions')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', sessionId);
    }
  };

  const shouldCheckReminder = (text: string) => {
    return /(remind me|set (a )?reminder|reminder|dont let me forget|don't let me forget|notify me|alarm|@|schedule|add to calendar)/i.test(text);
  };

  const shouldCheckRemoveEvent = (text: string) => {
    return /(remove|delete|clear|cancel).*(event|events|all|everything).*(today|calendar)?/i.test(text) ||
           /(remove|delete|clear|cancel).*(all|every).*(event|events)?/i.test(text);
  };

  const formatDateString = (year: number, month: number, day: number): string => {
    const yyyy = year.toString();
    const mm = month.toString().padStart(2, '0');
    const dd = day.toString().padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const parseRemovalDate = (text: string): string => {
    const today = new Date();
    const lowerText = text.toLowerCase();

    // Check for "today"
    if (/\btoday\b/.test(lowerText)) {
      return formatDateString(today.getFullYear(), today.getMonth() + 1, today.getDate());
    }

    // Check for "tomorrow"
    if (/\btomorrow\b/.test(lowerText)) {
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      return formatDateString(tomorrow.getFullYear(), tomorrow.getMonth() + 1, tomorrow.getDate());
    }

    // Match numeric dates: 2/10/2026, 2/10, 10/2/2026, etc.
    const numericMatch = text.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
    if (numericMatch) {
      let month = parseInt(numericMatch[1]);
      let day = parseInt(numericMatch[2]);
      let year = numericMatch[3] ? parseInt(numericMatch[3]) : today.getFullYear();
      
      // Handle 2-digit years
      if (year < 100) year += 2000;
      
      // Validate date (MM/DD format assumed for US dates)
      if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        // Check if date is valid
        const testDate = new Date(year, month - 1, day);
        if (testDate.getMonth() === month - 1 && testDate.getDate() === day) {
          return formatDateString(year, month, day);
        }
      }
    }

    // Match text dates: "10th february", "february 10", "feb 10th"
    const monthNames = [
      { full: 'january', short: 'jan', num: 1 },
      { full: 'february', short: 'feb', num: 2 },
      { full: 'march', short: 'mar', num: 3 },
      { full: 'april', short: 'apr', num: 4 },
      { full: 'may', short: 'may', num: 5 },
      { full: 'june', short: 'jun', num: 6 },
      { full: 'july', short: 'jul', num: 7 },
      { full: 'august', short: 'aug', num: 8 },
      { full: 'september', short: 'sep', num: 9 },
      { full: 'october', short: 'oct', num: 10 },
      { full: 'november', short: 'nov', num: 11 },
      { full: 'december', short: 'dec', num: 12 },
    ];

    for (const month of monthNames) {
      // "10th february" or "february 10th"
      const pattern1 = new RegExp(`(\\d{1,2})(?:st|nd|rd|th)?\\s+${month.full}`, 'i');
      const pattern2 = new RegExp(`${month.full}\\s+(\\d{1,2})(?:st|nd|rd|th)?`, 'i');
      const pattern3 = new RegExp(`(\\d{1,2})(?:st|nd|rd|th)?\\s+${month.short}`, 'i');
      const pattern4 = new RegExp(`${month.short}\\s+(\\d{1,2})(?:st|nd|rd|th)?`, 'i');

      const match = lowerText.match(pattern1) || lowerText.match(pattern2) ||
                    lowerText.match(pattern3) || lowerText.match(pattern4);
      
      if (match) {
        const day = parseInt(match[1]);
        let year = today.getFullYear();
        
        // If the month has passed this year, assume next year
        const currentMonth = today.getMonth() + 1;
        const currentDay = today.getDate();
        if (month.num < currentMonth || (month.num === currentMonth && day < currentDay)) {
          year++;
        }
        
        // Validate the day is valid for this month
        const testDate = new Date(year, month.num - 1, day);
        if (testDate.getDate() === day) {
          return formatDateString(year, month.num, day);
        }
      }
    }

    // Default to today if no date found
    return formatDateString(today.getFullYear(), today.getMonth() + 1, today.getDate());
  };

  const maybeParseReminder = async (text: string) => {
    if (!shouldCheckReminder(text)) return null;

    setPendingReminderLoading(true);
    try {
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const res = await fetch('/api/reminder/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, timeZone, nowIso: new Date().toISOString() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to parse reminder');
      return data as ReminderParse;
    } catch (error) {
      console.warn('Reminder parse failed', error);
      return null;
    } finally {
      setPendingReminderLoading(false);
    }
  };

  const handleAddReminderToCalendar = async () => {
    if (!pendingReminder) return;
    
    if (!sessionAccessToken) {
      console.warn('No session token available');
      return;
    }

    if (!googleConnected) {
      await connectGoogleCalendar();
      return;
    }

    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const datePart = pendingReminder.date || new Date().toISOString().slice(0, 10);
    const timePart = pendingReminder.time || '09:00';
    const durationMinutes = pendingReminder.durationMinutes || 60;

    const start = new Date(`${datePart}T${timePart}:00`);
    const end = new Date(start.getTime() + durationMinutes * 60000);

    try {
      setReminderAdding(true);
      const res = await fetch('/api/google/add-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          accessToken: sessionAccessToken,
          event: {
            summary: pendingReminder.title || 'Reminder',
            description: pendingReminder.description || '',
            start: start.toISOString(),
            end: end.toISOString(),
            timeZone
          }
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add event');
      
      const title = pendingReminder.title || 'reminder';
      const eventId = data.eventId;
      
      // Store eventId in state for deletion
      setPendingReminder(prev => prev ? { ...prev, eventId } : null);
      
      await addAssistantMessage(`✅ Reminder set for ${title} in your Google Calendar!`, currentSessionId);
      
      // Keep the card visible for 3 seconds before clearing
      setTimeout(() => {
        setPendingReminder(null);
      }, 3000);
    } catch (error: any) {
      console.error('Failed to add reminder', error);
      await addAssistantMessage(`❌ Could not add the reminder: ${error.message}. Please try again.`, currentSessionId);
    } finally {
      setReminderAdding(false);
    }
  };

  const handleDeleteReminder = async () => {
    if (!pendingReminder?.eventId || !sessionAccessToken) return;

    setReminderDeleting(true);
    try {
      const res = await fetch('/api/google/delete-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          accessToken: sessionAccessToken,
          eventId: pendingReminder.eventId
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete event');
      
      const title = pendingReminder.title || 'reminder';
      await addAssistantMessage(`Deleted reminder for ${title}.`, currentSessionId);
      setPendingReminder(null);
    } catch (error: any) {
      console.error('Failed to delete reminder', error);
      await addAssistantMessage(`❌ Could not delete the reminder: ${error.message}.`, currentSessionId);
    } finally {
      setReminderDeleting(false);
    }
  };

  const handleRemoveAllEventsForDate = async (date: string = new Date().toISOString().slice(0, 10)) => {
    if (!sessionAccessToken) {
      await addAssistantMessage('Please connect your Google Calendar first.', currentSessionId);
      return;
    }

    try {
      const res = await fetch('/api/google/list-delete-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          accessToken: sessionAccessToken,
          date
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to remove events');
      
      if (data.deletedCount === 0) {
        await addAssistantMessage(`No events found on ${new Date(date).toLocaleDateString()} to remove.`, currentSessionId);
      } else {
        await addAssistantMessage(`✅ Removed ${data.deletedCount} event${data.deletedCount !== 1 ? 's' : ''} from ${new Date(date).toLocaleDateString()}.`, currentSessionId);
      }
    } catch (error: any) {
      console.error('Failed to remove events', error);
      await addAssistantMessage(`❌ Could not remove events: ${error.message}.`, currentSessionId);
    }
  };

  // --- ACTION HANDLERS ---
  const createNewChat = async () => {
    // Reset selection if active
    if (isSelectionMode) {
        setIsSelectionMode(false);
        setSelectedSessionIds(new Set());
        return;
    }

    const { data, error } = await supabase
      .from('chat_sessions')
      .insert([
        { user_id: userId, title: 'New Chat' }
      ])
      .select()
      .single();

    if (error || !data) return;

    const sessionId = data.id as string;
    setCurrentSessionId(sessionId);
    setShowMobileHistory(false); // Close mobile menu if open

    const welcome: ChatMessage = {
      role: 'assistant',
      text: 'Namaste! I am your AI Tutor. I can explain complex topics in English, Hindi, or Gujarati. What should we tackle today?' 
    };
    setMessages([welcome]);

    await supabase.from('chat_messages').insert([
      { session_id: sessionId, user_id: userId, role: 'assistant', content: welcome.text }
    ]);

    await loadSessions(userId);
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const userText = input.trim();
    const userMsg: ChatMessage = { role: 'user', text: userText };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);
    setHasMore(false);

    const reminderPromise = maybeParseReminder(userText);
    const isRemovalRequest = shouldCheckRemoveEvent(userText);
    const removalDate = isRemovalRequest ? parseRemovalDate(userText) : null;

    let activeSessionId = currentSessionId;
    if (!activeSessionId) {
      const { data, error } = await supabase
        .from('chat_sessions')
        .insert([{ user_id: userId, title: userText.slice(0, 40) }])
        .select()
        .single();
      if (!error && data) {
        activeSessionId = data.id as string;
        setCurrentSessionId(activeSessionId);
        await loadSessions(userId);
      }
    }

    if (activeSessionId) {
      await supabase.from('chat_messages').insert([
        { session_id: activeSessionId, user_id: userId, role: 'user', content: userText }
      ]);
      await supabase
        .from('chat_sessions')
        .update({ updated_at: new Date().toISOString(), title: userText.slice(0, 40) })
        .eq('id', activeSessionId);
    }

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userText, language })
      });

      if (!res.ok) {
        const errText = await res.text();
        setMessages(prev => [...prev, { role: 'assistant', text: `Error: ${res.status} ${errText}` }]);
        return;
      }

      const data = await res.json();
      const aiText = data?.text || "Sorry, I couldn't generate a response.";
      await addAssistantMessage(aiText, activeSessionId);
      setHasMore(!!data?.hasMore);

      const reminderResult = await reminderPromise;
      if (reminderResult?.isReminder) {
        const reminderTitle = reminderResult.title || 'your reminder';
        setPendingReminder(reminderResult);
        
        if (googleConnected && sessionAccessToken) {
          // Auto-add if already connected
          setTimeout(async () => {
            await handleAddReminderToCalendar();
          }, 500);
        } else {
          await addAssistantMessage(`Please connect your Google Calendar to set this reminder.`, activeSessionId);
        }
      } else {
        setPendingReminder(null);
      }

      // Handle event removal requests
      if (isRemovalRequest && googleConnected && sessionAccessToken && removalDate) {
        setTimeout(async () => {
          await handleRemoveAllEventsForDate(removalDate);
        }, 500);
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', text: 'Network error: failed to reach the tutor API.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinue = async () => {
    if (isLoading || isContinuing) return;

    setIsContinuing(true);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: '', language, continue: true, conversationHistory: messages })
      });

      if (!res.ok) {
        const errText = await res.text();
        setMessages(prev => [...prev, { role: 'assistant', text: `Error: ${res.status} ${errText}` }]);
        return;
      }

      const data = await res.json();
      const aiText = data?.text || "Sorry, I couldn't generate a response.";
      await addAssistantMessage(aiText, currentSessionId);
      setHasMore(!!data?.hasMore);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', text: 'Network error: failed to reach the tutor API.' }]);
    } finally {
      setIsContinuing(false);
    }
  };

  // --- DELETE LOGIC ---
  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    setSelectedSessionIds(new Set());
  };

  const toggleSessionSelection = (id: string) => {
    const newSet = new Set(selectedSessionIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedSessionIds(newSet);
  };

  const deleteSelectedSessions = async () => {
    if (selectedSessionIds.size === 0) return;
    if (!window.confirm(`Delete ${selectedSessionIds.size} chat(s)?`)) return;

    setIsSessionsLoading(true);
    const idsToDelete = Array.from(selectedSessionIds);

    const { error } = await supabase.from('chat_sessions').delete().in('id', idsToDelete);

    if (!error) {
      setSessions(prev => prev.filter(s => !selectedSessionIds.has(s.id)));
      if (currentSessionId && selectedSessionIds.has(currentSessionId)) {
        setCurrentSessionId(null);
        setMessages([{ role: 'assistant', text: 'Namaste! I am your AI Tutor. Start a new chat to begin.' }]);
      }
      setIsSelectionMode(false);
      setSelectedSessionIds(new Set());
    } else {
      alert("Failed to delete chats.");
    }
    setIsSessionsLoading(false);
  };

  return (
    <div className="h-full w-full p-2 md:p-4 font-sans">
      
      {/* INNER CARD */}
      <div className="w-full h-full bg-white rounded-[2rem] border border-slate-200 shadow-xl relative overflow-hidden flex">
        
        {/* --- MOBILE TRIGGER (Visible only on Mobile) --- */}
        <div className="lg:hidden absolute top-4 left-4 z-20">
          <button
            onClick={() => setShowMobileHistory(true)}
            className="p-2.5 bg-white border border-slate-200 shadow-md rounded-xl text-slate-600 hover:text-indigo-600 transition-all"
          >
            <History size={20} />
          </button>
        </div>

        {/* --- SIDEBAR CONTAINER --- */}
        <div className={`
          border-r border-slate-100 flex flex-col bg-white transition-all duration-300 ease-in-out z-30
          /* Mobile: Absolute Drawer over content */
          absolute inset-y-0 left-0 w-72 shadow-2xl lg:shadow-none lg:static
          ${showMobileHistory ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          /* Desktop: Collapsible Width logic */
          ${isHistoryOpen ? 'lg:w-80' : 'lg:w-20'}
        `}>
          
          {/* --- CLOSED STATE (Desktop Strip) --- */}
          {!isHistoryOpen && (
            <div className="hidden lg:flex flex-col items-center py-6 gap-4 h-full bg-slate-50/50">
              {/* Expand Button */}
              <button 
                onClick={() => setIsHistoryOpen(true)}
                className="p-3 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-indigo-600 hover:shadow-md transition-all group"
                title="Expand History"
              >
                <History size={22} className="group-hover:scale-110 transition-transform" />
              </button>
              
              {/* New Chat Button */}
              <button 
                onClick={createNewChat}
                className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all group"
                title="New Chat"
              >
                <Plus size={22} className="group-hover:rotate-90 transition-transform" />
              </button>
            </div>
          )}

          {/* --- OPEN STATE (Full List) --- */}
          <div className={`flex flex-col h-full ${!isHistoryOpen ? 'hidden lg:hidden' : 'flex'}`}>
            
            {/* Header */}
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                <History size={18} /> 
                <span className="whitespace-nowrap">{isSelectionMode ? `Selected (${selectedSessionIds.size})` : 'Chats'}</span>
              </div>
              
              <div className="flex items-center gap-1">
                {/* Close Button (Mobile) / Collapse (Desktop) */}
                <button 
                  onClick={() => {
                    setShowMobileHistory(false);
                    setIsHistoryOpen(false);
                  }} 
                  className="p-2 hover:bg-slate-200 rounded-lg text-slate-400"
                  title="Close Sidebar"
                >
                  <ChevronLeft size={18} />
                </button>

                {/* Manage Button */}
                <button
                    onClick={toggleSelectionMode}
                    className={`p-2 rounded-lg transition-colors ${isSelectionMode ? 'bg-red-50 text-red-600' : 'text-slate-400 hover:bg-slate-200'}`}
                    title={isSelectionMode ? "Cancel Selection" : "Manage Chats"}
                >
                    {isSelectionMode ? <X size={18} /> : <Trash2 size={18} />}
                </button>

                {/* New Chat (Header) */}
                {!isSelectionMode && (
                    <button
                    onClick={createNewChat}
                    className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                    title="New Chat"
                    >
                    <Plus size={18} />
                    </button>
                )}
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
              {isSessionsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 size={24} className="animate-spin text-indigo-600" />
                </div>
              ) : sessions.length === 0 ? (
                <div className="text-center py-10 px-4">
                  <p className="text-sm text-slate-400">No chats yet.</p>
                  <button onClick={createNewChat} className="mt-2 text-xs font-bold text-indigo-600 hover:underline">Start new</button>
                </div>
              ) : (
                sessions.map((s) => {
                  const isSelected = selectedSessionIds.has(s.id);
                  const isActive = currentSessionId === s.id;
                  
                  return (
                    <button
                      key={s.id}
                      onClick={() => loadSessionMessages(s.id)}
                      className={`w-full text-left px-3 py-3 rounded-xl border transition-all flex items-start gap-3 group relative ${
                        isActive && !isSelectionMode
                          ? 'bg-indigo-50 border-indigo-200 shadow-sm'
                          : isSelected
                          ? 'bg-red-50 border-red-200'
                          : 'bg-white border-transparent hover:bg-slate-50 hover:border-slate-200'
                      }`}
                    >
                      {isSelectionMode ? (
                        <div className={`mt-0.5 ${isSelected ? 'text-red-500' : 'text-slate-300'}`}>
                            {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                        </div>
                      ) : (
                        <MessageSquare size={18} className={`mt-0.5 shrink-0 ${isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-500'}`} />
                      )}
                      
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm font-semibold truncate ${isActive ? 'text-indigo-900' : 'text-slate-700'}`}>
                            {s.title || 'New Chat'}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                            {new Date(s.updated_at).toLocaleDateString()}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Footer Actions */}
            {isSelectionMode && (
                <div className="p-3 border-t border-slate-100 shrink-0 bg-white">
                    <button
                        onClick={deleteSelectedSessions}
                        disabled={selectedSessionIds.size === 0}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 disabled:bg-slate-200 disabled:text-slate-400 transition-all shadow-sm"
                    >
                        <Trash2 size={18} />
                        Delete Selected
                    </button>
                </div>
            )}
          </div>
        </div>

        {/* --- MOBILE BACKDROP --- */}
        {showMobileHistory && (
          <div 
            className="absolute inset-0 bg-black/20 backdrop-blur-sm z-20 lg:hidden"
            onClick={() => setShowMobileHistory(false)}
          />
        )}

        {/* --- MAIN CHAT AREA --- */}
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50/30 relative">
          
          {/* Header */}
          <div className="p-4 lg:p-6 border-b border-slate-100 flex justify-end items-center gap-2 bg-white shrink-0 h-16 lg:h-20">
            <button
              onClick={googleConnected ? undefined : connectGoogleCalendar}
              disabled={googleChecking}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-colors ${
                googleConnected
                  ? 'bg-white border-indigo-200 text-indigo-700'
                  : 'bg-slate-100 border-slate-200 text-slate-600 hover:border-indigo-500 hover:text-indigo-600'
              }`}
              title={googleConnected ? 'Google Calendar connected' : 'Connect Google Calendar'}
            >
              {googleConnected ? <CalendarCheck size={14} /> : <CalendarPlus size={14} />}
              {googleConnected ? 'Calendar Connected' : 'Connect Calendar'}
            </button>
            <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
               <Languages size={16} className="text-slate-500" />
               <select 
                 className="text-xs font-bold text-slate-700 bg-transparent outline-none cursor-pointer"
                 value={language}
                 onChange={(e) => setLanguage(e.target.value)}
               >
                 <option>English</option>
                 <option>Hindi</option>
                 <option>Gujarati</option>
               </select>
            </div>
          </div>

          {/* Messages List */}
          <div className="flex-1 overflow-y-auto p-4 lg:p-8 space-y-6 custom-scrollbar">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] lg:max-w-[75%] p-4 lg:p-5 rounded-2xl shadow-sm text-sm lg:text-base leading-relaxed ${
                  msg.role === 'user' 
                    ? 'bg-indigo-600 text-white rounded-tr-sm' 
                    : 'bg-white border border-slate-200 rounded-tl-sm text-slate-800'
                }`}>
                  <MessageContent content={msg.text} isUser={msg.role === 'user'} />
                </div>
              </div>
            ))}
            {isLoading && (
               <div className="flex justify-start">
                 <div className="bg-white border border-slate-200 p-4 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-2 text-sm text-slate-500">
                   <Loader2 size={16} className="animate-spin text-indigo-600" />
                   Thinking...
                 </div>
               </div>
            )}
            {hasMore && !isLoading && (
              <div className="flex justify-center">
                <button
                  onClick={handleContinue}
                  disabled={isContinuing}
                  className="px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-full border border-indigo-200 text-indigo-700 bg-white hover:bg-indigo-50 transition-colors disabled:opacity-50"
                >
                  {isContinuing ? 'Continuing...' : 'Continue'}
                </button>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Reminder Card */}
          {(pendingReminder || pendingReminderLoading || reminderAdding) && (
            <div className="px-4 lg:px-6 pb-4">
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-2xl p-4 shadow-lg flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <CalendarPlus className="w-5 h-5 text-indigo-600" />
                  <div className="text-sm font-bold text-slate-800">Reminder Detected</div>
                </div>
                {pendingReminder ? (
                  <div className="text-sm text-slate-700 font-medium">
                    📝 {pendingReminder.title || 'Untitled reminder'}
                    {pendingReminder.date && (
                      <span className="ml-2 text-xs text-indigo-600 font-semibold">
                        📅 {new Date(pendingReminder.date).toLocaleDateString()}
                      </span>
                    )}
                    {pendingReminder.time && (
                      <span className="ml-2 text-xs text-indigo-600 font-semibold">
                        🕐 {pendingReminder.time}
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-slate-500 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                    Analyzing reminder details...
                  </div>
                )}
                {reminderAdding && (
                  <div className="text-xs font-semibold text-indigo-600 animate-pulse">
                    ⏳ {reminderStatusText}
                  </div>
                )}
                {!reminderAdding && pendingReminder && (
                  <div className="flex items-center gap-2 flex-wrap">
                    {pendingReminder.eventId ? (
                      <>
                        <div className="flex-1 text-xs font-semibold text-green-600 flex items-center gap-1">
                          ✓ Added to Google Calendar
                        </div>
                        <button
                          onClick={handleDeleteReminder}
                          disabled={reminderDeleting}
                          className="px-3 py-2 text-sm font-bold rounded-lg bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 disabled:opacity-60 flex items-center gap-1"
                        >
                          <Trash2 className="w-4 h-4" />
                          Remove
                        </button>
                      </>
                    ) : (
                      <>
                        {googleConnected ? (
                          <button
                            onClick={handleAddReminderToCalendar}
                            disabled={pendingReminderLoading}
                            className="px-4 py-2 text-sm font-bold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60 shadow-md"
                          >
                            ✓ Add to Google Calendar
                          </button>
                        ) : (
                          <button
                            onClick={connectGoogleCalendar}
                            className="px-4 py-2 text-sm font-bold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 shadow-md"
                          >
                            Connect Google Calendar
                          </button>
                        )}
                        <button
                          onClick={() => setPendingReminder(null)}
                          className="px-3 py-2 text-sm font-medium rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50"
                        >
                          Cancel
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="p-4 lg:p-6 bg-white border-t border-slate-100 shrink-0">
            <div className="flex gap-2 relative max-w-4xl mx-auto">
              <input 
                type="text" value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder={`Ask anything in ${language}...`}
                className="w-full bg-slate-50 border-2 border-slate-100 focus:border-indigo-500 focus:bg-white rounded-2xl px-5 py-3 lg:py-4 text-slate-900 font-medium outline-none transition-all pr-14 shadow-inner"
                disabled={isLoading}
              />
              <button 
                onClick={handleSend} 
                disabled={!input.trim() || isLoading}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 lg:p-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-all shadow-md"
              >
                {isLoading ? <Loader2 className="animate-spin w-5 h-5" /> : <Send size={20} />}
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}