"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Brain, Mail, Lock, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient'; 

export default function LoginPage() {
  const router = useRouter();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // 1. Authenticate with Supabase
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      // 2. Save user info in cookies for quick sidebar display
      const user = data.user;
      const name = user?.user_metadata?.full_name || user?.user_metadata?.name || 'User';
      const userEmail = user?.email || email;
      document.cookie = `ai_user_name=${encodeURIComponent(name)}; path=/; max-age=2592000`;
      document.cookie = `ai_user_email=${encodeURIComponent(userEmail)}; path=/; max-age=2592000`;

      // 3. Success: Redirect to dashboard
      // Note: The session is also stored by Supabase
      router.push('/'); 
      
    } catch (err: any) {
      setError(err.message || "Invalid login credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 md:p-10">
        <div className="text-center mb-8">
          <div className="inline-block p-3 rounded-2xl bg-blue-50 text-blue-600 mb-4"><Brain size={32} /></div>
          <h1 className="text-3xl font-bold text-slate-900">Welcome Back</h1>
          <p className="text-slate-500 mt-2">Log in to your student dashboard</p>
        </div>

        {/* ERROR MESSAGE DISPLAY */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 text-xs font-bold rounded-xl text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-4 top-4 text-slate-400" size={20} />
            <input 
              type="email" 
              placeholder="Email Address" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-blue-500 outline-none text-slate-900 font-medium transition"
              required
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-4 top-4 text-slate-400" size={20} />
            <input 
              type="password" 
              placeholder="Password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-blue-500 outline-none text-slate-900 font-medium transition"
              required
            />
          </div>
          <div className="text-right">
            <a href="#" className="text-xs font-bold text-blue-600 hover:underline">Forgot Password?</a>
          </div>
          
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-slate-900 hover:bg-blue-600 text-white font-bold py-4 rounded-2xl shadow-xl transition active:scale-[0.98] flex justify-center items-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" /> : "Login"}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-8">
          New to EduGenie? <Link href="/signup" className="text-blue-600 font-bold hover:underline">Sign Up</Link>
        </p>
      </div>
    </div>
  );
}