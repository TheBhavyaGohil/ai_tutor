"use client";

import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Loader2, UserPlus, Mail, Lock, User, Code, Briefcase, Palette, Database, Globe, Brain, Cpu, Sparkles, Check, ChevronRight } from "lucide-react";

const skillCategories = [
  {
    category: "Programming",
    icon: <Code className="w-5 h-5" />,
    color: "bg-blue-500",
    skills: ["Python", "JavaScript", "Java", "C++", "C#", "Go", "Rust", "PHP", "TypeScript", "Ruby", "Swift", "Kotlin"]
  },
  {
    category: "Web Development",
    icon: <Globe className="w-5 h-5" />,
    color: "bg-green-500",
    skills: ["HTML/CSS", "React", "Vue.js", "Angular", "Node.js", "Next.js", "Express.js", "Django", "Flask", "Laravel"]
  },
  {
    category: "Data & AI",
    icon: <Brain className="w-5 h-5" />,
    color: "bg-purple-500",
    skills: ["Machine Learning", "Data Science", "Deep Learning", "NLP", "Computer Vision", "TensorFlow", "PyTorch", "Pandas"]
  },
  {
    category: "Databases",
    icon: <Database className="w-5 h-5" />,
    color: "bg-orange-500",
    skills: ["SQL", "PostgreSQL", "MySQL", "MongoDB", "Redis", "Firebase", "Supabase"]
  },
  {
    category: "DevOps & Cloud",
    icon: <Cpu className="w-5 h-5" />,
    color: "bg-cyan-500",
    skills: ["AWS", "Azure", "Google Cloud", "Docker", "Kubernetes", "CI/CD", "GitHub Actions"]
  },
  {
    category: "Design & Creative",
    icon: <Palette className="w-5 h-5" />,
    color: "bg-pink-500",
    skills: ["UI/UX Design", "Figma", "Adobe XD", "Photoshop", "Illustrator"]
  },
  {
    category: "Business & Soft Skills",
    icon: <Briefcase className="w-5 h-5" />,
    color: "bg-indigo-500",
    skills: ["Project Management", "Agile/Scrum", "Communication", "Leadership", "Problem Solving"]
  }
];

export default function SignupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState(1);
  const [userId, setUserId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: ""
  });
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation
    if (!formData.fullName || !formData.email || !formData.password) {
      setError("Please fill in all fields");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      // Check if Supabase is properly configured
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        throw new Error("Supabase is not properly configured. Please check your environment variables.");
      }

      // Sign up with Supabase
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
          },
          emailRedirectTo: `${window.location.origin}/`
        }
      });

      if (signUpError) {
        console.error("Supabase signup error:", signUpError);
        if (signUpError.message.includes('rate limit') || signUpError.message.includes('Email rate limit exceeded')) {
          setError("Too many signup attempts. Please try again in a few minutes or use a different email address.");
          return;
        }
        throw signUpError;
      }

      if (data.user) {
        setUserId(data.user.id);
        setStep(2); // Move to skills selection
      }
    } catch (err: any) {
      console.error("Signup error details:", {
        message: err.message,
        status: err.status,
        name: err.name,
        stack: err.stack
      });
      
      let errorMessage = err.message || "Failed to create account";
      
      if (errorMessage.includes('Failed to fetch')) {
        setError("Network error. Please check your internet connection and try again.");
      } else if (errorMessage.includes('already registered') || errorMessage.includes('already exists')) {
        setError("This email is already registered. Please sign in instead.");
      } else if (errorMessage.includes('invalid email')) {
        setError("Please enter a valid email address.");
      } else if (errorMessage.includes('Supabase is not properly configured')) {
        setError("Service is unavailable. Please contact support.");
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleSkill = (skill: string) => {
    setSelectedSkills(prev =>
      prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]
    );
  };

  const handleCompleteSignup = async () => {
    if (!userId) {
      setError("Session expired. Please try again.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Wait for auth to be fully processed
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Refresh session to ensure RLS can see the authenticated user
      const { data: { session } } = await supabase.auth.refreshSession();

      // Create profile with skills using upsert
      const { data, error: profileError } = await supabase
        .from('profiles')
        .upsert([
          {
            id: userId,
            full_name: formData.fullName,
            email: formData.email,
            skills: selectedSkills.length > 0 ? selectedSkills : [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ], {
          onConflict: 'id'
        })
        .select();

      if (profileError) {
        console.error("Profile error details:", {
          message: profileError.message,
          details: profileError.details,
          hint: profileError.hint,
          code: profileError.code
        });
        
        // Log but don't throw - profile might be created despite RLS message
        if (profileError.code !== 'PGRST301') {
          console.warn("Profile creation may have failed, but continuing...");
        }
      }

      // Set cookies
      if (typeof document !== 'undefined') {
        document.cookie = `ai_user_name=${encodeURIComponent(formData.fullName)}; path=/; max-age=31536000`;
        document.cookie = `ai_user_email=${encodeURIComponent(formData.email)}; path=/; max-age=31536000`;
        document.cookie = `ai_user_id=${encodeURIComponent(userId)}; path=/; max-age=31536000`;
      }

      // Redirect to dashboard
      setTimeout(() => {
        router.push("/");
      }, 500);

    } catch (err: any) {
      console.error("Complete signup error details:", {
        message: err.message,
        code: err.code,
        status: err.status,
        details: err.details
      });
      setError(err.message || "Failed to complete signup. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSkipSkills = async () => {
    await handleCompleteSignup();
  };

  return (
    <div className="h-screen w-full flex flex-col items-center bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 p-4 py-10 overflow-y-auto">
      {step === 1 ? (
        /* STEP 1: Account Information */
        <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md border border-slate-200">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl mb-4">
              <UserPlus className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-black text-slate-800 mb-2">Create Account</h1>
            <p className="text-slate-600">Start your learning journey today</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-red-700 text-sm font-medium">{error}</p>
              {error.includes('rate limit') && (
                <p className="text-red-600 text-xs mt-2">
                  💡 Tip: Try using a different email or wait a few minutes before trying again.
                </p>
              )}
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Full Name</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="John Doe"
                  className="w-full pl-12 pr-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-900 font-medium placeholder:text-slate-400"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="you@example.com"
                  className="w-full pl-12 pr-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-900 font-medium placeholder:text-slate-400"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full pl-12 pr-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-900 font-medium placeholder:text-slate-400"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  placeholder="••••••••"
                  className="w-full pl-12 pr-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-900 font-medium placeholder:text-slate-400"
                  disabled={loading}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 rounded-xl font-bold hover:from-indigo-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating Account...
                </>
              ) : (
                <>
                  Continue to Skills
                  <ChevronRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-slate-600">
              Already have an account?{" "}
              <button
                onClick={() => router.push("/login")}
                className="text-indigo-600 font-bold hover:text-indigo-700"
              >
                Sign In
              </button>
            </p>
          </div>
        </div>
      ) : (
        /* STEP 2: Skills Selection */
        <div className="w-full max-w-5xl">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm mb-4">
              <Sparkles className="w-5 h-5 text-purple-600" />
              <span className="text-sm font-bold text-slate-700">Step 2 of 2</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-slate-800 mb-3">
              What are your skills?
            </h1>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Help us personalize your learning experience
            </p>
          </div>

          <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-6 md:p-8 mb-6">
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                {error}
              </div>
            )}

            <div className="space-y-8 pr-2">
              {skillCategories.map((category) => (
                <div key={category.category}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`${category.color} p-2 rounded-lg text-white`}>
                      {category.icon}
                    </div>
                    <h3 className="text-xl font-bold text-slate-800">{category.category}</h3>
                    <span className="text-xs font-bold text-slate-400 ml-auto">
                      {category.skills.filter(s => selectedSkills.includes(s)).length} selected
                    </span>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {category.skills.map((skill) => {
                      const isSelected = selectedSkills.includes(skill);
                      return (
                        <button
                          key={skill}
                          onClick={() => toggleSkill(skill)}
                          className={`px-4 py-2 rounded-xl font-semibold text-sm transition-all ${
                            isSelected
                              ? `${category.color} text-white shadow-md scale-105`
                              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                          }`}
                        >
                          {isSelected && <Check className="w-4 h-4 inline mr-1" />}
                          {skill}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {selectedSkills.length > 0 && (
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-6 text-white mb-6 shadow-lg">
              <div className="flex items-center gap-3 mb-3">
                <Sparkles className="w-6 h-6" />
                <h3 className="text-xl font-bold">Your Selected Skills ({selectedSkills.length})</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedSkills.map((skill) => (
                  <span
                    key={skill}
                    className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-lg text-sm font-semibold"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={handleSkipSkills}
              disabled={loading}
              className="px-8 py-4 bg-white text-slate-700 rounded-2xl font-bold hover:bg-slate-100 transition-colors border border-slate-200 disabled:opacity-50"
            >
              Skip for now
            </button>
            <button
              onClick={handleCompleteSignup}
              disabled={loading}
              className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-bold hover:from-indigo-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Completing Signup...
                </>
              ) : (
                <>
                  Complete Signup
                  <ChevronRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
