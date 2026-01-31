"use client";
import React, { useState, useEffect, useRef } from 'react';
import { 
  Brain, Languages, MessageSquare, Plus, History, Trash2, Loader2, X, CheckSquare, Square, ChevronLeft, Menu, Send 
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import MessageContent from './MessageContent';

type ChatMessage = { role: 'user' | 'assistant'; text: string };
type ChatSession = { id: string; title: string; updated_at: string };

export default function AITutorContent() {
  // --- STATE ---
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [language, setLanguage] = useState('English');
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isSessionsLoading, setIsSessionsLoading] = useState(true);
  const [userId, setUserId] = useState<string>('default_user');
  
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

  // --- INITIAL LOAD ---
  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser();
      const id = data?.user?.id || data?.user?.email || 'default_user';
      setUserId(id);
      await loadSessions(id);
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
      const aiMsg: ChatMessage = { role: 'assistant', text: aiText };
      setMessages(prev => [...prev, aiMsg]);
      if (activeSessionId) {
        await supabase.from('chat_messages').insert([
          { session_id: activeSessionId, user_id: userId, role: 'assistant', content: aiText }
        ]);
        await supabase
          .from('chat_sessions')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', activeSessionId);
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', text: 'Network error: failed to reach the tutor API.' }]);
    } finally {
      setIsLoading(false);
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
          <div className="p-4 lg:p-6 border-b border-slate-100 flex justify-end items-center bg-white shrink-0 h-16 lg:h-20">
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
            <div ref={chatEndRef} />
          </div>

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