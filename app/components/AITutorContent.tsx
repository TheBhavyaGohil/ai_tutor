"use client";
import React, { useState, useEffect, useRef } from 'react';
import { Brain, Languages, MessageSquare, ChevronRight, Plus, History, Trash2, Loader2, X, CheckSquare, Square } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import MessageContent from './MessageContent';

type ChatMessage = { role: 'user' | 'assistant'; text: string };
type ChatSession = { id: string; title: string; updated_at: string };

export default function AITutorContent() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [language, setLanguage] = useState('English');
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isSessionsLoading, setIsSessionsLoading] = useState(true);
  const [userId, setUserId] = useState<string>('default_user');
  
  // --- DELETE FUNCTIONALITY STATE ---
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedSessionIds, setSelectedSessionIds] = useState<Set<string>>(new Set());

  const chatEndRef = useRef<HTMLDivElement>(null);
  const prevMessagesLengthRef = useRef(0);

  useEffect(() => {
    if (messages.length > prevMessagesLengthRef.current) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    prevMessagesLengthRef.current = messages.length;
  }, [messages]);

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser();
      const id = data?.user?.id || data?.user?.email || 'default_user';
      setUserId(id);
      await loadSessions(id);
    };
    init();
  }, []);

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

  // --- DELETE LOGIC ---
  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    setSelectedSessionIds(new Set()); // Clear selection
  };

  const toggleSessionSelection = (id: string) => {
    const newSet = new Set(selectedSessionIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedSessionIds(newSet);
  };

  const deleteSelectedSessions = async () => {
    if (selectedSessionIds.size === 0) return;
    const confirmDelete = window.confirm(`Delete ${selectedSessionIds.size} chat(s)?`);
    if (!confirmDelete) return;

    setIsSessionsLoading(true);
    const idsToDelete = Array.from(selectedSessionIds);

    // Supabase Delete
    const { error } = await supabase
      .from('chat_sessions')
      .delete()
      .in('id', idsToDelete);

    if (!error) {
      // 1. Update List
      setSessions(prev => prev.filter(s => !selectedSessionIds.has(s.id)));
      
      // 2. If active session was deleted, reset view
      if (currentSessionId && selectedSessionIds.has(currentSessionId)) {
        setCurrentSessionId(null);
        setMessages([{ role: 'assistant', text: 'Namaste! I am your AI Tutor. Start a new chat to begin.' }]);
      }

      // 3. Reset Mode
      setIsSelectionMode(false);
      setSelectedSessionIds(new Set());
    } else {
      alert("Failed to delete chats.");
    }
    setIsSessionsLoading(false);
  };

  const createNewChat = async () => {
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
    if (!input.trim()) return;
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

  return (
    <div className="max-w-6xl mx-auto h-[calc(100vh-180px)] grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
      {/* Sidebar */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4 flex flex-col h-full overflow-hidden">
        <div className="flex items-center justify-between mb-3 shrink-0">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <History size={16} /> 
            {isSelectionMode ? `Selected (${selectedSessionIds.size})` : 'Chats'}
          </div>
          <div className="flex gap-1">
            <button
                onClick={toggleSelectionMode}
                className={`p-1.5 rounded-lg transition-colors ${isSelectionMode ? 'bg-red-50 text-red-600' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}
                title={isSelectionMode ? "Cancel Selection" : "Manage Chats"}
            >
                {isSelectionMode ? <X size={16} /> : <Trash2 size={16} />}
            </button>
            {!isSelectionMode && (
                <button
                onClick={createNewChat}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700"
                >
                <Plus size={14} /> New
                </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2">
          {isSessionsLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 size={18} className="animate-spin text-blue-600" />
            </div>
          ) : sessions.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6">No chats yet</p>
          ) : (
            sessions.map((s) => {
              const isSelected = selectedSessionIds.has(s.id);
              const isActive = currentSessionId === s.id;
              
              return (
                <button
                  key={s.id}
                  onClick={() => loadSessionMessages(s.id)}
                  className={`w-full text-left px-3 py-3 rounded-xl border transition-all flex items-start gap-3 group ${
                    isActive && !isSelectionMode
                      ? 'bg-blue-50 border-blue-400 shadow-sm'
                      : isSelected
                      ? 'bg-red-50 border-red-200'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {isSelectionMode ? (
                    <div className={`mt-0.5 ${isSelected ? 'text-red-500' : 'text-slate-300'}`}>
                        {isSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                    </div>
                  ) : (
                    <MessageSquare size={16} className={`mt-0.5 shrink-0 ${isActive ? 'text-blue-500' : 'text-slate-400'}`} />
                  )}
                  
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-semibold truncate ${isActive ? 'text-blue-700' : 'text-slate-700'}`}>
                        {s.title || 'New Chat'}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                        {new Date(s.updated_at).toLocaleDateString()} • {new Date(s.updated_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Delete Action Bar */}
        {isSelectionMode && (
            <div className="pt-3 mt-2 border-t border-slate-100 shrink-0">
                <button
                    onClick={deleteSelectedSessions}
                    disabled={selectedSessionIds.size === 0}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 disabled:bg-slate-200 disabled:text-slate-400 transition-all shadow-sm"
                >
                    <Trash2 size={16} />
                    Delete ({selectedSessionIds.size})
                </button>
            </div>
        )}
      </div>

      {/* Chat Area */}
      <div className="flex flex-col bg-white rounded-[2rem] shadow-xl border border-slate-200 overflow-hidden h-full">
        <div className="p-4 border-b flex justify-between items-center bg-slate-50 shrink-0">
          <span className="font-bold flex items-center gap-2"><Brain size={18} className="text-purple-600" /> Genie AI Tutor</span>
          <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-xl border border-slate-200">
             <Languages size={14} className="text-slate-400" />
             <select 
               className="text-xs font-bold text-slate-600 outline-none cursor-pointer"
               value={language}
               onChange={(e) => setLanguage(e.target.value)}
             >
               <option>English</option>
               <option>Hindi</option>
               <option>Gujarati</option>
             </select>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/30 text-slate-900">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] p-4 rounded-2xl shadow-sm ${
                msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white border border-slate-200 rounded-tl-none'
              }`}>
                <MessageContent content={msg.text} isUser={msg.role === 'user'} />
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        <div className="p-4 bg-white border-t shrink-0">
          <div className="flex gap-2 relative">
            <input 
              type="text" value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder={`Ask in ${language}...`}
              className="w-full bg-slate-100 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl px-5 py-4 text-slate-900 font-medium outline-none transition-all pr-12"
              disabled={isLoading}
            />
            <button onClick={handleSend} className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition" disabled={isLoading}>
              {isLoading ? <Loader2 className="animate-spin w-4 h-4" /> : <ChevronRight size={18} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}