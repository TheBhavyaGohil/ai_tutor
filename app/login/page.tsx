"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Brain, Mail, Lock, Loader2, Shield, Check, CheckCircle, ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient'; 

export default function LoginPage() {
  const router = useRouter();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  
  // Forgot password states
  const [forgotEmail, setForgotEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  const handleSendOTP = async () => {
    if (!forgotEmail) {
      setError("Please enter your email address");
      return;
    }

    setOtpLoading(true);
    setError("");

    try {
      const response = await fetch('/api/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail, purpose: 'forgot-password' })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send OTP');
      }

      setOtpSent(true);
    } catch (err: any) {
      setError(err.message || "Failed to send OTP");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp) {
      setError("Please enter the OTP");
      return;
    }

    setOtpLoading(true);
    setError("");

    try {
      const response = await fetch('/api/send-otp', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail, otp, purpose: 'forgot-password' })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Invalid OTP');
      }

      setOtpVerified(true);
    } catch (err: any) {
      setError(err.message || "Invalid OTP");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!newPassword || !confirmNewPassword) {
      setError("Please enter and confirm your new password");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setError("Passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail, newPassword })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reset password');
      }

      setResetSuccess(true);
      setTimeout(() => {
        setShowForgotPassword(false);
        setResetSuccess(false);
        // Reset all states
        setForgotEmail('');
        setOtp('');
        setNewPassword('');
        setConfirmNewPassword('');
        setOtpSent(false);
        setOtpVerified(false);
      }, 2000);

    } catch (err: any) {
      setError(err.message || "Unable to reset password. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

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
      {!showForgotPassword ? (
        /* LOGIN FORM */
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
              <button 
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-xs font-bold text-blue-600 hover:underline"
              >
                Forgot Password?
              </button>
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
      ) : (
        /* FORGOT PASSWORD FORM */
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 md:p-10">
          <div className="text-center mb-8">
            <div className="inline-block p-3 rounded-2xl bg-purple-50 text-purple-600 mb-4">
              <Shield size={32} />
            </div>
            <h1 className="text-3xl font-bold text-slate-900">Reset Password</h1>
            <p className="text-slate-500 mt-2">Verify your email to reset password</p>
          </div>

          {/* ERROR/SUCCESS MESSAGE */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 text-xs font-bold rounded-xl text-center">
              {error}
            </div>
          )}
          {resetSuccess && (
            <div className="mb-6 p-4 bg-green-50 border border-green-100 text-green-600 text-xs font-bold rounded-xl text-center">
              Password reset successfully! Redirecting to login...
            </div>
          )}

          {!resetSuccess && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              {/* Email Input */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <input 
                    type="email" 
                    placeholder="your@email.com" 
                    value={forgotEmail}
                    onChange={(e) => {
                      setForgotEmail(e.target.value);
                      setOtpSent(false);
                      setOtpVerified(false);
                      setOtp('');
                    }}
                    className="w-full pl-12 pr-4 py-3 rounded-xl bg-slate-50 border-2 border-transparent focus:border-purple-500 outline-none text-slate-900 font-medium transition"
                    disabled={otpVerified}
                    required
                  />
                  {otpVerified && (
                    <CheckCircle className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />
                  )}
                </div>

                {/* OTP Section */}
                {!otpVerified && (
                  <div className="mt-3 space-y-3">
                    {!otpSent ? (
                      <button
                        type="button"
                        onClick={handleSendOTP}
                        disabled={otpLoading || !forgotEmail}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-50 text-purple-600 rounded-lg font-semibold hover:bg-purple-100 transition-colors disabled:opacity-50"
                      >
                        {otpLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Sending OTP...
                          </>
                        ) : (
                          <>
                            <Shield className="w-4 h-4" />
                            Send Verification Code
                          </>
                        )}
                      </button>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            placeholder="Enter 6-digit OTP"
                            maxLength={6}
                            className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-900 font-mono text-center tracking-widest"
                          />
                          <button
                            type="button"
                            onClick={handleVerifyOTP}
                            disabled={otpLoading || otp.length !== 6}
                            className="px-6 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                          >
                            {otpLoading ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <Check className="w-4 h-4" />
                                Verify
                              </>
                            )}
                          </button>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <button
                            type="button"
                            onClick={handleSendOTP}
                            disabled={otpLoading}
                            className="text-purple-600 hover:text-purple-700 font-semibold"
                          >
                            Resend OTP
                          </button>
                          <span className="text-slate-500 text-xs">
                            Check your email for the code
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* New Password Fields - Only show after OTP verified */}
              {otpVerified && (
                <>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">New Password</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                      <input 
                        type="password" 
                        placeholder="••••••••" 
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 rounded-xl bg-slate-50 border-2 border-transparent focus:border-purple-500 outline-none text-slate-900 font-medium transition"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Confirm New Password</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                      <input 
                        type="password" 
                        placeholder="••••••••" 
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 rounded-xl bg-slate-50 border-2 border-transparent focus:border-purple-500 outline-none text-slate-900 font-medium transition"
                        required
                      />
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 rounded-xl shadow-xl transition active:scale-[0.98] flex justify-center items-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="animate-spin" />
                        Resetting Password...
                      </>
                    ) : (
                      "Reset Password"
                    )}
                  </button>
                </>
              )}
            </form>
          )}

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setShowForgotPassword(false);
                setError('');
                setForgotEmail('');
                setOtp('');
                setNewPassword('');
                setConfirmNewPassword('');
                setOtpSent(false);
                setOtpVerified(false);
              }}
              className="text-sm text-slate-600 hover:text-slate-900 font-semibold flex items-center gap-1 mx-auto"
            >
              <ArrowLeft size={16} />
              Back to Login
            </button>
          </div>
        </div>
      )}
    </div>
  );
}