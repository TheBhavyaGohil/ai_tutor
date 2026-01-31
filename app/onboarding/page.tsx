"use client";

import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Sparkles, Code, Briefcase, Palette, Database, Globe, Brain, Cpu, ChevronRight, Check } from "lucide-react";

const skillCategories = [
  {
    category: "Programming",
    icon: <Code className="w-5 h-5" />,
    color: "bg-blue-500",
    skills: [
      "Python", "JavaScript", "Java", "C++", "C#", "Go", "Rust", "PHP", 
      "TypeScript", "Ruby", "Swift", "Kotlin", "R", "MATLAB"
    ]
  },
  {
    category: "Web Development",
    icon: <Globe className="w-5 h-5" />,
    color: "bg-green-500",
    skills: [
      "HTML/CSS", "React", "Vue.js", "Angular", "Node.js", "Next.js",
      "Express.js", "Django", "Flask", "FastAPI", "Spring Boot", "Laravel"
    ]
  },
  {
    category: "Data & AI",
    icon: <Brain className="w-5 h-5" />,
    color: "bg-purple-500",
    skills: [
      "Machine Learning", "Data Science", "Deep Learning", "NLP",
      "Computer Vision", "TensorFlow", "PyTorch", "Pandas", "NumPy",
      "Scikit-learn", "Data Analysis", "Statistics"
    ]
  },
  {
    category: "Databases",
    icon: <Database className="w-5 h-5" />,
    color: "bg-orange-500",
    skills: [
      "SQL", "PostgreSQL", "MySQL", "MongoDB", "Redis", "Firebase",
      "Supabase", "DynamoDB", "Cassandra", "Neo4j", "Oracle"
    ]
  },
  {
    category: "DevOps & Cloud",
    icon: <Cpu className="w-5 h-5" />,
    color: "bg-cyan-500",
    skills: [
      "AWS", "Azure", "Google Cloud", "Docker", "Kubernetes", "CI/CD",
      "Jenkins", "GitHub Actions", "Terraform", "Ansible", "Linux"
    ]
  },
  {
    category: "Design & Creative",
    icon: <Palette className="w-5 h-5" />,
    color: "bg-pink-500",
    skills: [
      "UI/UX Design", "Figma", "Adobe XD", "Photoshop", "Illustrator",
      "Sketch", "InVision", "Graphic Design", "Video Editing", "3D Modeling"
    ]
  },
  {
    category: "Business & Soft Skills",
    icon: <Briefcase className="w-5 h-5" />,
    color: "bg-indigo-500",
    skills: [
      "Project Management", "Agile/Scrum", "Communication", "Leadership",
      "Problem Solving", "Critical Thinking", "Time Management", "Teamwork"
    ]
  }
];

export default function OnboardingPage() {
  const router = useRouter();
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState(1);

  const toggleSkill = (skill: string) => {
    setSelectedSkills(prev =>
      prev.includes(skill)
        ? prev.filter(s => s !== skill)
        : [...prev, skill]
    );
  };

  const handleSubmit = async () => {
    if (selectedSkills.length === 0) {
      setError("Please select at least one skill");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push("/login");
        return;
      }

      // Update user profile with skills
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ skills: selectedSkills })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // Redirect to main dashboard
      router.push("/");
    } catch (err: any) {
      setError(err.message || "Failed to save skills");
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm mb-4">
            <Sparkles className="w-5 h-5 text-purple-600" />
            <span className="text-sm font-bold text-slate-700">Step {step} of 2</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-slate-800 mb-3">
            What are your skills?
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Help us personalize your learning experience by selecting the skills you have or want to learn
          </p>
        </div>

        {/* Skills Selection */}
        <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-6 md:p-8 mb-6">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-8">
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

        {/* Selected Skills Summary */}
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

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={handleSkip}
            className="px-8 py-4 bg-white text-slate-700 rounded-2xl font-bold hover:bg-slate-100 transition-colors border border-slate-200"
          >
            Skip for now
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || selectedSkills.length === 0}
            className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-bold hover:from-indigo-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg flex items-center justify-center gap-2"
          >
            {loading ? (
              "Saving..."
            ) : (
              <>
                Continue to Dashboard
                <ChevronRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
