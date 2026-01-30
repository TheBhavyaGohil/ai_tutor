"use client";
import React from 'react';
import { BarChart, CheckCircle, Clock } from 'lucide-react';

export default function DashboardContent({ user }: { user: any }) {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 rounded-[2rem] p-8 text-white shadow-2xl shadow-blue-200 relative overflow-hidden group">
        <div className="relative z-10">
          <h1 className="text-2xl md:text-4xl font-bold mb-3 tracking-tight">Welcome back, {user.name}! 🚀</h1>
          <p className="text-blue-100 text-sm md:text-lg font-medium opacity-90 max-w-md">
            You've maintained your 5-day streak. Your consistency is paying off!
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        <StatCard title="Learning Gaps" value="2 Critical" sub="Data Structures" color="text-red-500" bg="bg-red-50" icon={<BarChart />} />
        <StatCard title="Mastered" value="14 Skills" sub="Latest: React Hooks" color="text-emerald-500" bg="bg-emerald-50" icon={<CheckCircle />} />
        <StatCard title="Study Time" value="12.5 hrs" sub="This Week" color="text-blue-500" bg="bg-blue-50" icon={<Clock />} />
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 md:p-8">
        <h3 className="font-bold text-xl text-slate-800 mb-6">Priority Actions</h3>
        <div className="space-y-4">
          <ActionItem title="Review Python Lists" desc="Struggled in last mock test" color="orange" />
          <ActionItem title="Web Security" desc="Crucial for Cybersecurity module" color="blue" />
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, sub, color, bg, icon }: any) {
  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">{title}</p>
          <h3 className={`text-2xl font-black ${color}`}>{value}</h3>
          <p className="text-xs text-slate-500 mt-2 font-medium">{sub}</p>
        </div>
        <div className={`p-3 ${bg} rounded-2xl ${color}`}>{icon}</div>
      </div>
    </div>
  );
}

function ActionItem({ title, desc, color }: any) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-5 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-white hover:border-blue-200 transition-all">
      <div className={`w-2 h-10 sm:h-12 rounded-full ${color === 'orange' ? 'bg-orange-400' : 'bg-blue-400'}`} />
      <div className="flex-1 min-w-0">
        <h4 className="font-bold text-slate-800 truncate">{title}</h4>
        <p className="text-sm text-slate-500 font-medium">{desc}</p>
      </div>
      <button className="whitespace-nowrap px-6 py-2 bg-white text-slate-700 font-bold text-xs rounded-xl border border-slate-200 hover:bg-slate-900 hover:text-white transition-colors">
        Start Now
      </button>
    </div>
  );
}