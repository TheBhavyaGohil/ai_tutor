"use client";
import React, { useState, useEffect, useRef } from 'react';
import { Play, X, Clock } from 'lucide-react';

interface NotificationData {
  type: 'pomodoro';
  mode: string;
  timestamp: number;
}

export default function GlobalNotificationListener() {
  const [showNotification, setShowNotification] = useState(false);
  const [notificationData, setNotificationData] = useState<NotificationData | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const dismissTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Initialize audio
    audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGJ0fPTgjMGHm7A7+OZUQ0OVKzn77BfGAg+ltryy3cmCCR9y/DdlT8KElyw6OyrWRQLSKLh8sFrIQU1jtDz1YU0Bx5vwPDhnFENDlWs5++yYBoIPpja8sx3JQckfcvw3ZU/ChJcsOjsq1kVC0ii4fLBayEFNY7Q89WFNAceKLvR8t+aTBQMU');

    // Listen for pomodoro completion events
    const handlePomodoroComplete = () => {
      const storedData = localStorage.getItem('pomodoroNotification');
      if (storedData) {
        const data: NotificationData = JSON.parse(storedData);
        setNotificationData(data);
        setShowNotification(true);

        // Play sound
        if (audioRef.current) {
          audioRef.current.currentTime = 0;
          audioRef.current.play().catch(e => console.log('Audio play failed:', e));
        }

        // Auto-dismiss after 8 seconds
        if (dismissTimeoutRef.current) {
          clearTimeout(dismissTimeoutRef.current);
        }
        dismissTimeoutRef.current = setTimeout(() => {
          setShowNotification(false);
        }, 8000);
      }
    };

    // Also check localStorage on component mount in case notification was triggered before mount
    const storedNotification = localStorage.getItem('pomodoroNotification');
    if (storedNotification) {
      try {
        const data: NotificationData = JSON.parse(storedNotification);
        // Only show if it was triggered recently (within last 5 seconds)
        if (Date.now() - data.timestamp < 5000) {
          handlePomodoroComplete();
        }
      } catch (e) {
        console.log('Error parsing notification data:', e);
      }
    }

    window.addEventListener('pomodoroComplete', handlePomodoroComplete);

    return () => {
      window.removeEventListener('pomodoroComplete', handlePomodoroComplete);
      if (dismissTimeoutRef.current) {
        clearTimeout(dismissTimeoutRef.current);
      }
    };
  }, []);

  const dismissNotification = () => {
    setShowNotification(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if (dismissTimeoutRef.current) {
      clearTimeout(dismissTimeoutRef.current);
    }
  };

  if (!showNotification || !notificationData) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-[9999] animate-bounce">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl shadow-2xl p-6 min-w-[320px] backdrop-blur-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 rounded-full p-3 animate-pulse">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Time's Up!</h3>
              <p className="text-sm text-white/90 mt-1">
                {notificationData.mode} session complete
              </p>
            </div>
          </div>
          <button
            onClick={dismissNotification}
            className="bg-white/20 hover:bg-white/30 rounded-full p-2 transition-colors flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <button
          onClick={dismissNotification}
          className="mt-4 w-full bg-white text-blue-600 font-bold py-2 px-4 rounded-xl hover:bg-white/90 transition-colors flex items-center justify-center gap-2"
        >
          <Play size={16} className="fill-blue-600" />
          Start New Session
        </button>
      </div>
    </div>
  );
}
