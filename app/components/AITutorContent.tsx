"use client";
import React, { useState, useEffect, useRef } from 'react';
import { Brain, Languages, Mic, MicOff, MessageSquare, ChevronRight } from 'lucide-react';

export default function AITutorContent() {
  const [messages, setMessages] = useState([
    { role: 'ai', text: 'Namaste! I am your AI Tutor. I can explain complex Engineering topics in English, Hindi, or Gujarati. What should we tackle today?' }
  ]);
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [language, setLanguage] = useState('English');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userText = input.trim();
    setMessages(prev => [...prev, { role: 'user', text: userText }]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userText, language })
      });

      if (!res.ok) {
        const errText = await res.text();
        setMessages(prev => [...prev, { role: 'ai', text: `Error: ${res.status} ${errText}` }]);
        return;
      }

      const data = await res.json();
      const aiText = data?.text || "Sorry, I couldn't generate a response.";
      setMessages(prev => [...prev, { role: 'ai', text: aiText }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'ai', text: 'Network error: failed to reach the tutor API.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] max-w-4xl mx-auto bg-white rounded-[2rem] shadow-xl border border-slate-200 overflow-hidden">
      <div className="p-4 border-b flex justify-between items-center bg-slate-50">
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
              <p className="text-sm md:text-base leading-relaxed font-medium">{msg.text}</p>
            </div>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      <div className="p-4 bg-white border-t">
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
            {isLoading ? <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" strokeOpacity="0.25" fill="none"/><path d="M22 12a10 10 0 0 1-10 10" stroke="white" strokeWidth="3" strokeLinecap="round" /></svg> : <ChevronRight size={18} />}
          </button>
        </div>
      </div>
    </div>
  );
}