"use client";
import React, { useEffect } from 'react';
import { X, CheckCircle2, AlertTriangle, Info } from 'lucide-react';

export type NotificationType = 'success' | 'error' | 'info';

interface NotificationOverlayProps {
  open: boolean;
  message: string;
  type?: NotificationType;
  onClose: () => void;
  autoCloseMs?: number;
}

export default function NotificationOverlay({
  open,
  message,
  type = 'info',
  onClose,
  autoCloseMs = 5000
}: NotificationOverlayProps) {
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      onClose();
    }, autoCloseMs);
    return () => clearTimeout(timer);
  }, [open, autoCloseMs, onClose]);

  if (!open) return null;

  const icon =
    type === 'success' ? <CheckCircle2 className="text-green-500" size={28} /> :
    type === 'error' ? <AlertTriangle className="text-red-500" size={28} /> :
    <Info className="text-blue-500" size={28} />;

  const ringColor =
    type === 'success' ? 'ring-green-200' :
    type === 'error' ? 'ring-red-200' :
    'ring-blue-200';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-sm">
      <div className={`relative w-full max-w-md mx-4 rounded-3xl bg-white shadow-2xl ring-2 ${ringColor} p-6`}>
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 hover:bg-slate-100 transition-colors"
          aria-label="Close notification"
        >
          <X size={18} className="text-slate-500" />
        </button>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center">
            {icon}
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">Notification</p>
            <p className="text-sm text-slate-600 mt-1 leading-relaxed">{message}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
