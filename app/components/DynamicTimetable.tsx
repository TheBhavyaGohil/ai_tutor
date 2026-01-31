"use client";

import React, { useState, useEffect, useRef } from "react";
import { Printer, Calendar, ChevronDown } from "lucide-react";

interface ScheduleItem {
  time: string;
  activity: string;
  description?: string;
  status: "DONE" | "PENDING" | "UPCOMING";
  day?: string;
}

interface DynamicTimetableProps {
  schedule: ScheduleItem[];
  onStatusChange?: (index: number, newStatus: "DONE" | "PENDING" | "UPCOMING") => void;
}

export default function DynamicTimetable({ schedule, onStatusChange }: DynamicTimetableProps) {
  const showDayColumn = schedule.some((item) => item.day && item.day.trim() !== "");

  const handlePrint = () => {
    window.print();
  };

  if (!schedule || schedule.length === 0) return null;

  return (
    <div className="w-full max-w-5xl mx-auto mt-8">
      {/* Header Actions (Print Button) */}
      <div className="flex justify-between items-center mb-6 print:hidden">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-indigo-600" />
          Schedule View
        </h2>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-black text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Printer className="w-4 h-4" />
          Print PDF
        </button>
      </div>

      {/* Printable Area */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden print:shadow-none print:border-0 print:rounded-none print:w-full">
        <div className="overflow-x-auto print:overflow-visible">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 print:bg-slate-100">
              <tr>
                {showDayColumn && (
                  <th className="px-6 py-4 font-bold text-slate-700 w-32 border-r border-slate-200">Day</th>
                )}
                <th className="px-6 py-4 font-bold text-slate-700 w-32">Time</th>
                <th className="px-6 py-4 font-bold text-slate-700">Activity</th>
                <th className="px-6 py-4 font-bold text-slate-700 w-40 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {schedule.map((item, idx) => (
                <tr key={idx} className="group hover:bg-slate-50 transition-colors print:hover:bg-transparent">
                  {showDayColumn && (
                    <td className="px-6 py-3 font-semibold text-slate-900 border-r border-slate-100 print:border-slate-300">
                      {item.day || "-"}
                    </td>
                  )}
                  
                  <td className="px-6 py-3 font-mono text-slate-600 whitespace-nowrap align-top pt-4">
                    {item.time}
                  </td>

                  <td className="px-6 py-3 align-top pt-4">
                    <div className="font-bold text-slate-900 text-base">{item.activity}</div>
                    {item.description && (
                      <div className="text-slate-500 mt-1 leading-relaxed">{item.description}</div>
                    )}
                  </td>

                  <td className="px-6 py-3 text-center align-top pt-3 print:text-left">
                    <StatusSelector 
                      status={item.status} 
                      onChange={(newStatus) => onStatusChange && onStatusChange(idx, newStatus)} 
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Global Print CSS */}
      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          #timetable-root, #timetable-root * { visibility: visible; }
          #timetable-root { position: absolute; left: 0; top: 0; width: 100%; padding: 0; background: white; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  );
}

// --- Sub-Component: Status Selector ---
function StatusSelector({ status, onChange }: { status: string, onChange: (s: any) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close dropdown if clicked outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [ref]);

  const styles = {
    DONE: "bg-green-100 text-green-700 border-green-200 hover:bg-green-200",
    PENDING: "bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-200",
    UPCOMING: "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200",
  };
  
  const currentStyle = styles[status as keyof typeof styles] || styles.UPCOMING;

  return (
    <div className="relative inline-block text-left" ref={ref}>
      {/* 1. The Trigger Button (Visible on Screen) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`print:hidden inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${currentStyle}`}
      >
        {status}
        <ChevronDown className="w-3 h-3 opacity-50" />
      </button>

      {/* 2. The Static Badge (Visible ONLY on Print) */}
      <span className={`hidden print:inline-flex items-center px-2 py-1 rounded-full text-xs font-bold border border-slate-300 text-black`}>
        {status}
      </span>

      {/* 3. The Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 z-10 mt-2 w-36 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none print:hidden">
          <div className="py-1">
            {["PENDING", "DONE", "UPCOMING"].map((option) => (
              <button
                key={option}
                onClick={() => {
                  onChange(option);
                  setIsOpen(false);
                }}
                className={`block w-full text-left px-4 py-2 text-sm ${
                  option === status ? "bg-slate-100 font-bold text-slate-900" : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
