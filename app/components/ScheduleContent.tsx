"use client";
import React, { useState } from "react";

export default function ScheduleContent() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [schedule, setSchedule] = useState([
    { time: "09:00 - 10:30", subject: "Python Programming", status: "DONE" },
    { time: "11:30 - 13:00", subject: "Data Structures", status: "PENDING" },
  ]);
  const [error, setError] = useState<string | null>(null);

  const generateSchedule = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/generate-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `Status ${res.status}`);
      }

      const data = await res.json();
      // server returns { schedule: [...] } or { text: "json..." }
      const raw = data?.schedule ?? data?.text ?? null;
      let parsed: any = null;

      if (Array.isArray(raw)) {
        parsed = raw;
      } else if (typeof raw === "string") {
        // strip common fences then parse
        const cleaned = raw.replace(/```json|```/g, "").trim();
        parsed = JSON.parse(cleaned);
      } else {
        throw new Error("Unexpected response shape from server");
      }

      // basic validation: ensure entries have time, subject, status
      const ok = Array.isArray(parsed) && parsed.every((it: any) => it.time && it.subject && it.status);
      if (!ok) throw new Error("Model returned invalid schedule format");

      setSchedule(parsed);
    } catch (err: any) {
      console.error("Schedule generation error:", err);
      setError(err?.message || "Failed to generate schedule");
      alert("Error generating schedule. See console for details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* INPUT */}
      <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm space-y-4">
        <h2 className="text-xl font-black text-slate-800">🚀 AI Timetable Generator</h2>
        <textarea
          className="w-full p-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-600"
          placeholder='Describe your schedule (e.g., "A 3-day workout split")'
          rows={3}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
        <div className="flex gap-3 items-center">
          <button
            onClick={generateSchedule}
            disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-black py-3 px-8 rounded-full transition-all flex items-center gap-2"
          >
            {loading ? "Generating..." : "Generate Schedule ✨"}
          </button>
          {error && <span className="text-red-600 text-sm font-medium">{error}</span>}
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest">
              <tr>
                <th className="px-8 py-5">Time</th>
                <th className="px-8 py-5">Subject</th>
                <th className="px-8 py-5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {schedule.map((item, index) => (
                <ScheduleRow key={index} time={item.time} subject={item.subject} status={item.status} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ScheduleRow({ time, subject, status }: any) {
  return (
    <tr className="hover:bg-slate-50/50 transition-colors">
      <td className="px-8 py-6 font-bold text-slate-500 text-sm">{time}</td>
      <td className="px-8 py-6 font-black text-slate-800">{subject}</td>
      <td className="px-8 py-6 text-right">
        <span
          className={`px-4 py-1.5 rounded-full text-[10px] font-black ${
            status === "DONE" ? "bg-emerald-100 text-emerald-600" : status === "PENDING" ? "bg-orange-100 text-orange-600" : "bg-slate-100 text-slate-400"
          }`}
        >
          {status}
        </span>
      </td>
    </tr>
  );
}