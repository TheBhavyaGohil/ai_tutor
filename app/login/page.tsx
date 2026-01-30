"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Brain, Mail, Lock } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  
  // 1. Create state to store input values
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // 2. The Login Logic
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); // Reset error message

    // Hardcoded Admin Credentials
    const ADMIN_EMAIL = "admin@edugenie.com";
    const ADMIN_PASSWORD = "admin";

    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      // SUCCESS: Redirect to the dashboard (main page)
      router.push('/');
    } else {
      // FAILURE: Show error
      setError("Invalid email or password. Try admin@edugenie.com / admin");
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
          <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 text-xs font-bold rounded-xl animate-pulse text-center">
            {error}
          </div>
        )}

        <button className="w-full flex items-center justify-center gap-3 border-2 border-slate-100 py-3 rounded-2xl font-bold text-slate-700 hover:bg-slate-50 transition mb-6">
          <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAMAAABEpIrGAAAA7VBMVEVHcEz/RkL/R0D+SEr/RUD/RkOwjlb/SD7/SE3/SUj/Vzb/VDf9TFb8TVeHoFb/YTD/byn8TVn/jRr/fSL/mxL/SEj+yQn/ohH/tQv+VUb/vQn/wwn+zgj9wQm3xQ39zgT6zQYwhv/7zgowhv8uhv0ek+Avhv7yzAPjywIvhv0whv7PyQHUygIth/y3yAEnivSlxwGSxgUak94fj+h5xAlgwxMLqp8NnsQVlte6xwBNwh45wC0xwDMLt28IrJgJpa0kjPCaxQEpvzsevkkWvVANumQQu18JtXkIsIgTvVYOvGALuWtJwh4OvF8OvF9ccfxCAAAAT3RSTlMAUZvT7P8T//+wiv//kAv6/mD//+V2jv//JKf//0EmxOr/rP7+MEX//x10/6eu//3+/9v///7I//+K//+KS/3/YeX//7dsnv7/////5s3tMAqBMAAAAXFJREFUeAF0jUUCwCAMwDp3d/f9/4krnVt6goQCFzheECVJFHgOPpB5RZHYIKqqyU+vGwpCXkVM07pp2zEQ8hSYiCBf1rsuFrQCvaSahHe+9wMqWHJuOD2E/lYoWsRxkUbBxcdJshY6bEQ3L6fpWmTnXXbxkBcpJTb8UBZFgUX156uyLLHI4Y+YgqL+DZqS0R7n7o4NLQX9GQwbI5tugpKI7wF5Rjd/BiNCCQZfX5BfCwyWrsnagGEYiKKpMkLqgJmZmXn/caKTzGoM7+v4IEiWPQdJ4fMhFujHCzjH7Wny6xFwMB9UKBa4KN3Tl4kh9AZYVJRbpXhVVRGX0asEXNP1a7MM0wQJA+0WFcQtyz7bcFzPAwn+8AkPwmjDcZK6WJGR75zwsCirOo7rpu0SojC2oQUeIF72/TCMY4sUKSj2wX9iXgAHwYgEoKBPizOBgx4EhwnCtxOtDnYTzn1Gnw3wzYQT3zDJrpmXYVjmpj7d/gPknlJE6eZSewAAAABJRU5ErkJggg==" width="20" alt="Google" />
          Sign in with Google
        </button>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-4 top-4 text-slate-400" size={20} />
            <input 
              type="email" 
              placeholder="Email Address" 
              value={email}
              onChange={(e) => setEmail(e.target.value)} // Capture email
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
              onChange={(e) => setPassword(e.target.value)} // Capture password
              className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-blue-500 outline-none text-slate-900 font-medium transition"
              required
            />
          </div>
          <div className="text-right">
            <a href="#" className="text-xs font-bold text-blue-600 hover:underline">Forgot Password?</a>
          </div>
          <button type="submit" className="w-full bg-slate-900 hover:bg-blue-600 text-white font-bold py-4 rounded-2xl shadow-xl transition active:scale-[0.98]">
            Login
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-8">
          New to EduGenie? <Link href="/signup" className="text-blue-600 font-bold hover:underline">Sign Up</Link>
        </p>
      </div>
    </div>
  );
}