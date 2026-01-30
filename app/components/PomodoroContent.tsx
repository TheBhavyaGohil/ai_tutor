"use client";
import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';

export default function PomodoroContent() {
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState('focus');

  useEffect(() => {
    let interval: any = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft(timeLeft - 1), 1000);
    } else if (timeLeft === 0) {
      setIsActive(false);
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-lg mx-auto py-10">
      <div className="bg-white rounded-[3rem] shadow-2xl border border-slate-100 p-12 text-center">
        <div className="flex justify-center gap-2 mb-12 bg-slate-50 p-1 rounded-2xl">
          {['focus', 'short', 'long'].map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setIsActive(false); setTimeLeft(m === 'focus' ? 25*60 : m === 'short' ? 5*60 : 15*60); }}
              className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${mode === m ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}
            >
              {m}
            </button>
          ))}
        </div>
        <div className="text-8xl font-black text-slate-900 mb-12 tabular-nums tracking-tighter">
          {formatTime(timeLeft)}
        </div>
        <div className="flex justify-center items-center gap-6">
          <button 
            onClick={() => setIsActive(!isActive)}
            className={`w-20 h-20 rounded-full flex items-center justify-center text-white shadow-xl transition-all active:scale-95 ${isActive ? 'bg-orange-500' : 'bg-blue-600'}`}
          >
            {isActive ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" className="ml-1" />}
          </button>
          <button 
            onClick={() => { setIsActive(false); setTimeLeft(25*60); }}
            className="w-16 h-16 rounded-full flex items-center justify-center bg-slate-100 text-slate-500"
          >
            <RotateCcw size={24} />
          </button>
        </div>
      </div>
    </div>
  );
}