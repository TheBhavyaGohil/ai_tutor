"use client";
import React, { useEffect, useState } from "react";
import { Code, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

export default function SkillsContent({ user }: { user: any }) {
  const [skills, setSkills] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState<string>("Student");

  useEffect(() => {
    const loadSkills = async () => {
      try {
        const activeUser = user || (await supabase.auth.getUser()).data?.user;
        if (!activeUser?.id) return;

        const metaName = activeUser.user_metadata?.full_name || activeUser.user_metadata?.name;
        const emailName = activeUser.email?.split("@")[0];
        setUserName(metaName || emailName || "Student");

        const { data } = await supabase
          .from("profiles")
          .select("skills")
          .eq("id", activeUser.id)
          .single();

        if (data?.skills) {
          setSkills(data.skills);
        }
      } finally {
        setLoading(false);
      }
    };

    loadSkills();
  }, [user]);

  return (
    <div className="h-full w-full p-2 md:p-4 font-sans overflow-visible pb-4 md:pb-6">
      <div className="w-full h-full bg-white rounded-[2rem] shadow-2xl shadow-slate-300/50 border border-slate-200 overflow-hidden flex">
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="max-w-4xl mx-auto p-6 md:p-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200">
                <Code className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-black text-slate-900">Your Skills</h1>
                <p className="text-slate-500 text-sm">{userName}&apos;s learning profile</p>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
              </div>
            ) : skills.length > 0 ? (
              <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                    {skills.length} Skills
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {skills.map((skill, index) => (
                    <span
                      key={index}
                      className="px-3 py-1.5 bg-gradient-to-r from-purple-50 to-indigo-50 text-purple-700 rounded-lg text-sm font-semibold border border-purple-100"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-16 text-slate-400">
                No skills added yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
