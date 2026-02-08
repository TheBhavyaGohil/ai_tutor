"use client";
import React, { useEffect, useState } from "react";
import { Code, Loader2, Edit2, Save, X, Check } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

const skillCategories = [
  {
    category: "Programming",
    icon: "💻",
    color: "bg-blue-500",
    skills: ["Python", "JavaScript", "Java", "C++", "C#", "Go", "Rust", "PHP", "TypeScript", "Ruby", "Swift", "Kotlin"]
  },
  {
    category: "Web Development",
    icon: "🌐",
    color: "bg-green-500",
    skills: ["HTML/CSS", "React", "Vue.js", "Angular", "Node.js", "Next.js", "Express.js", "Django", "Flask", "Laravel"]
  },
  {
    category: "Data & AI",
    icon: "🧠",
    color: "bg-purple-500",
    skills: ["Machine Learning", "Data Science", "Deep Learning", "NLP", "Computer Vision", "TensorFlow", "PyTorch", "Pandas"]
  },
  {
    category: "Databases",
    icon: "🗄️",
    color: "bg-orange-500",
    skills: ["SQL", "PostgreSQL", "MySQL", "MongoDB", "Redis", "Firebase", "Supabase"]
  },
  {
    category: "DevOps & Cloud",
    icon: "☁️",
    color: "bg-cyan-500",
    skills: ["AWS", "Azure", "Google Cloud", "Docker", "Kubernetes", "CI/CD", "GitHub Actions"]
  },
  {
    category: "Design & Creative",
    icon: "🎨",
    color: "bg-pink-500",
    skills: ["UI/UX Design", "Figma", "Adobe XD", "Photoshop", "Illustrator"]
  },
  {
    category: "Business & Soft Skills",
    icon: "💼",
    color: "bg-indigo-500",
    skills: ["Project Management", "Agile/Scrum", "Communication", "Leadership", "Problem Solving"]
  }
];

export default function SkillsContent({ user }: { user: any }) {
  const [skills, setSkills] = useState<string[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState<string>("Student");
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [draftReady, setDraftReady] = useState(false);

  const getDraftKey = (uid: string) => `skillsDraft:${uid}`;

  useEffect(() => {
    const loadSkills = async () => {
      try {
        const activeUser = user || (await supabase.auth.getUser()).data?.user;
        if (!activeUser?.id) return;

        setUserId(activeUser.id);
        const metaName = activeUser.user_metadata?.full_name || activeUser.user_metadata?.name;
        const emailName = activeUser.email?.split("@")[0];
        setUserName(metaName || emailName || "Student");

        const { data } = await supabase
          .from("profiles")
          .select("skills")
          .eq("id", activeUser.id)
          .single();

        const remoteSkills = Array.isArray(data?.skills) ? data.skills : [];
        setSkills(remoteSkills);

        let appliedDraft = false;
        try {
          const draftRaw = localStorage.getItem(getDraftKey(activeUser.id));
          if (draftRaw) {
            const draft = JSON.parse(draftRaw);
            if (Array.isArray(draft?.selectedSkills)) {
              setSelectedSkills(draft.selectedSkills);
              setIsEditing(!!draft.isEditing);
              appliedDraft = true;
            }
          }
        } catch (err) {
          console.warn("Failed to load skills draft", err);
        }

        if (!appliedDraft) {
          setSelectedSkills(remoteSkills);
        }
      } finally {
        setLoading(false);
        setDraftReady(true);
      }
    };

    loadSkills();
  }, [user]);

  useEffect(() => {
    if (!draftReady || !userId) return;
    const key = getDraftKey(userId);
    if (isEditing) {
      localStorage.setItem(key, JSON.stringify({ selectedSkills, isEditing: true }));
    } else {
      localStorage.removeItem(key);
    }
  }, [draftReady, userId, isEditing, selectedSkills]);

  const toggleSkill = (skill: string) => {
    setSelectedSkills(prev =>
      prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]
    );
  };

  const handleSaveSkills = async () => {
    if (!userId) return;
    
    setIsSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch('/api/update-skills', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, skills: selectedSkills })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update skills');
      }

      setSkills(selectedSkills);
      setIsEditing(false);
      if (userId) {
        localStorage.removeItem(getDraftKey(userId));
      }
      setSuccess("Skills updated successfully!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to update skills");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setSelectedSkills(skills);
    setIsEditing(false);
    setError("");
    if (userId) {
      localStorage.removeItem(getDraftKey(userId));
    }
  };

  return (
    <div className="h-full w-full p-2 md:p-4 font-sans overflow-visible pb-4 md:pb-6">
      <div className="w-full h-full bg-white rounded-[2rem] shadow-2xl shadow-slate-300/50 border border-slate-200 overflow-hidden flex">
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="max-w-4xl mx-auto p-6 md:p-10">
            {/* Header */}
            <div className="flex items-center justify-between gap-3 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200">
                  <Code className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-black text-slate-900">Your Skills</h1>
                  <p className="text-slate-500 text-sm">{userName}&apos;s learning profile</p>
                </div>
              </div>
              
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit Skills
                </button>
              )}
            </div>

            {/* Error/Success Messages */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm font-medium">
                {error}
              </div>
            )}
            {success && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm font-medium flex items-center gap-2">
                <Check className="w-4 h-4" />
                {success}
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
              </div>
            ) : isEditing ? (
              /* EDIT MODE - Skill Selection */
              <div className="space-y-8">
                {skillCategories.map((category) => (
                  <div key={category.category} className="border border-slate-200 rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-2xl">{category.icon}</span>
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

                {/* Selected Skills Summary */}
                {selectedSkills.length > 0 && (
                  <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-6 text-white">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-2xl">✨</span>
                      <h3 className="text-lg font-bold">Your Selected Skills ({selectedSkills.length})</h3>
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

                {/* Action Buttons */}
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={handleCancel}
                    disabled={isSaving}
                    className="px-6 py-3 bg-slate-100 text-slate-700 rounded-lg font-semibold hover:bg-slate-200 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveSkills}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Save Changes
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : /* VIEW MODE */
            skills.length > 0 ? (
              <div className="space-y-6">
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

                {/* Skills by Category */}
                <div className="grid gap-4">
                  {skillCategories.map((category) => {
                    const categorySkills = skills.filter(s => category.skills.includes(s));
                    if (categorySkills.length === 0) return null;
                    
                    return (
                      <div key={category.category} className="border border-slate-200 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-lg">{category.icon}</span>
                          <h4 className="font-bold text-slate-800">{category.category}</h4>
                          <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded ml-auto">
                            {categorySkills.length}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {categorySkills.map((skill) => (
                            <span
                              key={skill}
                              className="px-3 py-1 bg-slate-100 text-slate-700 rounded-lg text-sm font-semibold"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="text-slate-400 mb-4">
                  <Code className="w-12 h-12 mx-auto opacity-50" />
                </div>
                <p className="text-slate-400 text-lg mb-6">No skills added yet.</p>
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
                >
                  Add Your First Skill
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
