"use client";
import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Clock } from 'lucide-react';

export default function PomodoroContent() {
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState('focus');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Load state from localStorage on mount
  useEffect(() => {
    const savedState = localStorage.getItem('pomodoroState');
    if (savedState) {
      const { timeLeft: savedTime, isActive: savedActive, mode: savedMode, lastUpdate } = JSON.parse(savedState);
      
      // Calculate elapsed time if timer was active
      if (savedActive && lastUpdate) {
        const elapsed = Math.floor((Date.now() - lastUpdate) / 1000);
        const newTimeLeft = Math.max(0, savedTime - elapsed);
        setTimeLeft(newTimeLeft);
        
        if (newTimeLeft === 0) {
          setIsActive(false);
          playAlarm();
        } else {
          setIsActive(savedActive);
        }
      } else {
        setTimeLeft(savedTime);
        setIsActive(false);
      }
      setMode(savedMode);
    }

    // Initialize audio
    audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGJ0fPTgjMGHm7A7+OZUQ0OVKzn77BfGAg+ltryy3cmCCR9y/DdlT8KElyw6OyrWRQLSKLh8sFrIQU1jtDz1YU0Bx5vwPDhnFENDlWs5++yYBoIPpja8sx3JQckfcvw3ZU/ChJcsOjsq1kVC0ii4fLBayEFNY7Q89WFNAceKLvR8t+aTBQMU');
  }, []);

  // Timer logic
  useEffect(() => {
    let interval: any = null;
    
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => {
          const newTime = prev - 1;
          
          // Save to localStorage
          localStorage.setItem('pomodoroState', JSON.stringify({
            timeLeft: newTime,
            isActive: true,
            mode,
            lastUpdate: Date.now()
          }));
          
          if (newTime === 0) {
            setIsActive(false);
            playAlarm();
            localStorage.setItem('pomodoroState', JSON.stringify({
              timeLeft: 0,
              isActive: false,
              mode,
              lastUpdate: Date.now()
            }));
          }
          
          return newTime;
        });
      }, 1000);
    }
    
    return () => clearInterval(interval);
  }, [isActive, timeLeft, mode]);

  const playAlarm = () => {
    if (audioRef.current) {
      audioRef.current.play().catch(e => console.log('Audio play failed:', e));
    }
    
    // Dispatch global notification via localStorage
    const notificationData = {
      type: 'pomodoro',
      mode: mode === 'focus' ? 'Focus' : mode === 'short' ? 'Short Break' : 'Long Break',
      timestamp: Date.now()
    };
    localStorage.setItem('pomodoroNotification', JSON.stringify(notificationData));
    window.dispatchEvent(new Event('pomodoroComplete'));
    
    // Try browser notification API
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Pomodoro Timer', {
        body: `${notificationData.mode} session complete!`,
        icon: '/pomodoro-icon.png',
        tag: 'pomodoro'
      });
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleModeChange = (newMode: string) => {
    const newTime = newMode === 'focus' ? 25*60 : newMode === 'short' ? 5*60 : 15*60;
    setMode(newMode);
    setIsActive(false);
    setTimeLeft(newTime);
    localStorage.setItem('pomodoroState', JSON.stringify({
      timeLeft: newTime,
      isActive: false,
      mode: newMode,
      lastUpdate: Date.now()
    }));
  };

  const handleToggle = () => {
    const newActive = !isActive;
    setIsActive(newActive);
    localStorage.setItem('pomodoroState', JSON.stringify({
      timeLeft,
      isActive: newActive,
      mode,
      lastUpdate: Date.now()
    }));
  };

  const handleReset = () => {
    const newTime = mode === 'focus' ? 25*60 : mode === 'short' ? 5*60 : 15*60;
    setIsActive(false);
    setTimeLeft(newTime);
    localStorage.setItem('pomodoroState', JSON.stringify({
      timeLeft: newTime,
      isActive: false,
      mode,
      lastUpdate: Date.now()
    }));
  };

  const dismissNotification = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  // Request notification permission on first interaction
  const requestNotificationPermission = () => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  };

  return (
    <>
      {/* Main Pomodoro Interface */}
      <div className="max-w-lg mx-auto py-10">
        <div className="bg-white rounded-[3rem] shadow-2xl border border-slate-100 p-12 text-center">
          {/* Timer Status Badge */}
          {isActive && (
            <div className="mb-6 inline-flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-full text-sm font-semibold">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              Running in background
            </div>
          )}

          <div className="flex justify-center gap-2 mb-12 bg-slate-50 p-1 rounded-2xl">
            {['focus', 'short', 'long'].map((m) => (
              <button
                key={m}
                onClick={() => handleModeChange(m)}
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
              onClick={() => {
                requestNotificationPermission();
                handleToggle();
              }}
              className={`w-20 h-20 rounded-full flex items-center justify-center text-white shadow-xl transition-all active:scale-95 ${isActive ? 'bg-orange-500' : 'bg-blue-600'}`}
            >
              {isActive ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" className="ml-1" />}
            </button>
            <button 
              onClick={handleReset}
              className="w-16 h-16 rounded-full flex items-center justify-center bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
            >
              <RotateCcw size={24} />
            </button>
          </div>
          
          {/* Info text */}
          <p className="mt-8 text-xs text-slate-400">
            Timer continues running even when you switch tabs
          </p>
        </div>
      </div>
    </>
  );
}