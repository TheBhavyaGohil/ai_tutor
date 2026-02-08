"use client";

import React, { useState, useEffect, useRef } from "react";
import { Printer, Calendar, ChevronDown, CalendarPlus } from "lucide-react";
import { useReactToPrint } from "react-to-print";
import SchedulePrint from "./SchedulePrint";

interface ScheduleItem {
  time: string;
  activity: string;
  description?: string;
  status: "DONE" | "PENDING";
  day?: string;
}

interface DynamicTimetableProps {
  schedule: ScheduleItem[];
  onStatusChange?: (index: number, newStatus: "DONE" | "PENDING") => void;
  onAddItemToCalendar?: (index: number) => void;
  calendarConnected?: boolean;
  calendarAdding?: boolean;
  connectGoogleCalendar?: () => void;
}

export default function DynamicTimetable({
  schedule,
  onStatusChange,
  onAddItemToCalendar,
  calendarConnected = false,
  calendarAdding = false,
  connectGoogleCalendar,
}: DynamicTimetableProps) {
  const showDayColumn = schedule.some((item) => item.day && item.day.trim() !== "");
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: "Schedule",
  });

  if (!schedule || schedule.length === 0) return null;

  return (
    <div className="w-full max-w-5xl mx-auto mt-8">
      {/* Header Actions - Hidden during print via 'print:hidden' class */}
      <div className="flex justify-between items-center mb-6 print:hidden">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-indigo-600" />
          Schedule View
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-black text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Printer className="w-4 h-4" />
            Print PDF
          </button>
        </div>
      </div>

      {/* Hidden Print Component */}
      <div style={{ display: "none" }}>
        <div ref={printRef}>
          <SchedulePrint schedule={schedule} />
        </div>
      </div>

      {/* FIX 2: The 'id="timetable-root"' is what we will target in CSS.
         We use 'print:shadow-none' and 'print:border' to make it look like a document on paper.
      */}
      <div 
        id="timetable-root" 
        className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden print:shadow-none print:border print:border-slate-300 print:rounded-none print:w-full"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 print:bg-slate-100">
              <tr>
                {showDayColumn && (
                  <th className="px-6 py-4 font-bold text-slate-700 w-32 border-r border-slate-200">Day</th>
                )}
                <th className="px-6 py-4 font-bold text-slate-700 w-32">Time</th>
                <th className="px-6 py-4 font-bold text-slate-700">Activity</th>
                <th className="px-6 py-4 font-bold text-slate-700 w-40 text-center print:text-right">Status</th>
                <th className="px-6 py-4 font-bold text-slate-700 w-48 text-center print:hidden">Calendar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 print:divide-slate-300">
              {schedule.map((item, idx) => (
                <tr key={idx} className="group hover:bg-slate-50 transition-colors">
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
                      <div className="text-slate-500 mt-1 leading-relaxed print:text-slate-700">
                        {item.description}
                      </div>
                    )}
                  </td>

                  <td className="px-6 py-3 text-center align-top pt-3">
                    <StatusSelector 
                      status={item.status} 
                      onChange={(newStatus) => onStatusChange && onStatusChange(idx, newStatus)} 
                    />
                  </td>

                  <td className="px-6 py-3 text-center align-top pt-3 print:hidden">
                    {item.status.toUpperCase() !== "DONE" && onAddItemToCalendar && (
                      <button
                        onClick={() => {
                          if (!calendarConnected && connectGoogleCalendar) {
                            connectGoogleCalendar();
                          } else {
                            onAddItemToCalendar(idx);
                          }
                        }}
                        disabled={calendarAdding}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                          calendarConnected
                            ? "bg-white border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                            : "bg-slate-50 border-slate-300 text-slate-600 hover:bg-slate-100"
                        } ${calendarAdding ? "opacity-50 cursor-not-allowed" : ""}`}
                      >
                        <CalendarPlus className="w-3.5 h-3.5" />
                        {calendarConnected ? "Add" : "Connect"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatusSelector({ status, onChange }: { status: string, onChange: (s: any) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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
    DONE: "bg-green-100 text-green-700 border-green-200",
    PENDING: "bg-orange-100 text-orange-700 border-orange-200",
  };
  
  const currentStyle = styles[status as keyof typeof styles] || styles.PENDING;

  return (
    <div className="relative inline-block text-left print:text-right print:w-full" ref={ref}>
      {/* Screen Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`print:hidden inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${currentStyle}`}
      >
        {status}
        <ChevronDown className="w-3 h-3 opacity-50" />
      </button>

      {/* Print Badge: Visible ONLY when printing */}
      <span className={`hidden print:inline-block px-3 py-1 rounded-md text-[10px] font-bold border uppercase tracking-wider ${currentStyle}`}>
        {status}
      </span>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 z-10 mt-2 w-36 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none print:hidden">
          <div className="py-1">
            {["PENDING", "DONE"].map((option) => (
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
