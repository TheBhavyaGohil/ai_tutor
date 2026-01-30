"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import { Brain, Mail, Lock, User } from 'lucide-react';

export default function SignupPage() {
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 md:p-10 relative z-10">
        <div className="text-center mb-8">
          <div className="inline-block p-3 rounded-2xl bg-blue-50 text-blue-600 mb-4"><Brain size={32} /></div>
          <h1 className="text-3xl font-bold text-slate-900">Create Account</h1>
          <p className="text-slate-500 mt-2">Join the Innovation Challenge 2026</p>
        </div>

        <button className="w-full flex items-center justify-center gap-3 border-2 border-slate-100 py-3 rounded-2xl font-bold text-slate-700 hover:bg-slate-50 transition mb-6">
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/0/google.svg" width="20" alt="Google" />
          Sign up with Google
        </button>

        <div className="relative mb-6 text-center">
          <span className="bg-white px-4 text-xs font-bold text-slate-400 uppercase relative z-10">Or Email</span>
          <hr className="absolute top-1/2 w-full border-slate-100" />
        </div>

        <form className="space-y-4">
          <div className="relative">
            <User className="absolute left-4 top-4 text-slate-400" size={20} />
            <input 
              type="text" placeholder="Full Name" 
              className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-blue-500 outline-none text-slate-900 font-medium transition"
            />
          </div>
          <div className="relative">
            <Mail className="absolute left-4 top-4 text-slate-400" size={20} />
            <input 
              type="email" placeholder="Email Address" 
              className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-blue-500 outline-none text-slate-900 font-medium transition"
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-4 top-4 text-slate-400" size={20} />
            <input 
              type="password" placeholder="Create Password" 
              className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-blue-500 outline-none text-slate-900 font-medium transition"
            />
          </div>
          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-200 transition">
            Create Account
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-8">
          Already have an account? <Link href="/login" className="text-blue-600 font-bold hover:underline">Login</Link>
        </p>
      </div>
    </div>
  );
}