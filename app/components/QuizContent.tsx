"use client";
import React, { useState, useEffect } from 'react';
import { 
  Brain, ChevronRight, Loader2, Trophy, CheckCircle2, 
  XCircle, RefreshCcw, Target, Lightbulb, History, Trash2, X, CheckSquare, Square, Check, AlertCircle 
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

export default function QuizContent() {
  // --- STATE ---
  const [user, setUser] = useState<any>(null);
  const [view, setView] = useState<'setup' | 'quiz' | 'report' | 'history_review'>('setup');
  
  // Data State
  const [topic, setTopic] = useState('');
  const [quiz, setQuiz] = useState<any>(null);
  const [userAnswers, setUserAnswers] = useState<Record<number,string>>({});
  const [report, setReport] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  
  // UI State
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [showHistory, setShowHistory] = useState(false);

  // Multi-Delete State
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // --- INITIAL LOAD ---
  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        setUser(data.user);
        fetchHistory(data.user.id);
      }
    };
    init();
  }, []);

  const fetchHistory = async (userId: string) => {
    const { data } = await supabase
      .from('quiz_results')
      .select('id, topic, score, total_questions, created_at, quiz_data, user_answers, ai_analysis')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (data) setHistory(data);
  };

  // --- ACTIONS ---
  const generateQuiz = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/generate-quiz', {
        method: 'POST',
        body: JSON.stringify({ action: 'generate', topic, language: 'English' })
      });
      const data = await res.json();
      if (data.questions) {
        setQuiz(data);
        setUserAnswers({});
        setCurrentQIndex(0);
        setView('quiz');
        setShowHistory(false);
      } else {
        throw new Error("Failed to generate structure");
      }
    } catch (e) {
      setError("Failed to generate quiz. Try a simpler topic.");
    } finally {
      setLoading(false);
    }
  };

  const submitQuiz = async () => {
    setAnalyzing(true);
    const score = quiz.questions.filter((q: any, i: number) => userAnswers[i] === q.correctAnswer).length;
    try {
      const res = await fetch('/api/generate-quiz', {
        method: 'POST',
        body: JSON.stringify({
          action: 'analyze',
          topic,
          score,
          quizData: quiz,
          userAnswers,
          userId: user?.id
        })
      });
      const analysisData = await res.json();
      setReport({ ...analysisData, score }); 
      if (user) {
        await supabase.from('quiz_results').insert({
          user_id: user.id,
          topic: quiz.title || topic,
          score,
          total_questions: quiz.questions.length,
          quiz_data: quiz,
          user_answers: userAnswers,
          ai_analysis: analysisData
        });
        fetchHistory(user.id); 
      }
      setView('report');
    } catch (e) {
      setError("Analysis failed. Please check your connection.");
    } finally {
      setAnalyzing(false);
    }
  };

  const loadHistoryItem = (item: any) => {
    if (isSelectionMode) {
      toggleSelection(item.id);
      return;
    }
    setQuiz(item.quiz_data);
    setUserAnswers(item.user_answers || {});
    setReport({ ...item.ai_analysis, score: item.score });
    setTopic(item.topic);
    
    setView('history_review');
    setShowHistory(false); 
  };

  // --- MULTI DELETE LOGIC ---
  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    setSelectedIds(new Set());
  };

  const toggleSelection = (id: number) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const deleteSelected = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} quiz records?`)) return;

    const idsToDelete = Array.from(selectedIds);
    const { error } = await supabase.from('quiz_results').delete().in('id', idsToDelete);
    
    if (!error) {
      setHistory(prev => prev.filter(h => !selectedIds.has(h.id)));
      setIsSelectionMode(false);
      setSelectedIds(new Set());
      if (view === 'history_review' && quiz && selectedIds.has(quiz.id)) { 
        resetQuiz();
      }
    }
  };

  const resetQuiz = () => {
    setQuiz(null);
    setReport(null);
    setUserAnswers({});
    setTopic('');
    setView('setup');
  };

  return (
    // 1. OUTER CONTAINER: Padded, responsive, prevents body scroll
    <div className="h-full w-full p-2 md:p-4 pb-4 md:pb-6 relative font-sans overflow-visible">
      
      {/* 2. THE WHITE BLOCK: Holds the UI */}
      <div className="w-full h-full bg-white rounded-[2rem] border border-slate-200 shadow-2xl shadow-slate-300/50 relative overflow-hidden flex">
      
        {/* History Trigger (Top Left) */}
        {!showHistory && (
          <button 
            onClick={() => setShowHistory(true)}
            className="absolute top-4 md:top-6 left-4 md:left-6 z-20 p-2 md:p-2.5 bg-white border border-slate-200 shadow-md rounded-xl text-slate-600 hover:text-indigo-600 hover:scale-105 transition-all flex items-center gap-1 md:gap-2 font-bold text-[10px] md:text-xs uppercase tracking-wider"
          >
            <History size={16} className="md:w-[18px]" />
            <span className="hidden sm:inline">History</span>
          </button>
        )}

        {/* HISTORY SIDEBAR (Drawer) */}
        <div className={`
          absolute inset-y-0 left-0 z-30 w-72 md:w-80 bg-white shadow-2xl transform transition-transform duration-300 border-r border-slate-100 flex flex-col
          ${showHistory ? 'translate-x-0' : '-translate-x-full'}
        `}>
          {/* Header */}
          <div className="p-3 md:p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
            <h3 className="font-bold text-slate-700 flex items-center gap-2 text-sm md:text-base">
              <History size={16} className="md:w-[18px]" /> {isSelectionMode ? `Selected (${selectedIds.size})` : 'Past Quizzes'}
            </h3>
            <div className="flex items-center gap-1">
              <button 
                onClick={toggleSelectionMode}
                className={`p-1.5 md:p-2 rounded-lg transition-colors ${isSelectionMode ? 'bg-indigo-100 text-indigo-600' : 'hover:bg-slate-200 text-slate-400'}`}
                title="Manage / Multi-Select"
              >
                {isSelectionMode ? <CheckSquare size={16} className="md:w-[18px]" /> : <Trash2 size={16} className="md:w-[18px]" />}
              </button>
              <button onClick={() => setShowHistory(false)} className="p-1.5 md:p-2 hover:bg-slate-200 rounded-lg text-slate-400">
                <X size={18} className="md:w-[20px]" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
            {history.length === 0 ? (
              <p className="text-center text-slate-400 text-xs md:text-sm py-10">No history yet.</p>
            ) : (
              history.map((item) => {
                const isSelected = selectedIds.has(item.id);
                return (
                  <div 
                    key={item.id} 
                    onClick={() => loadHistoryItem(item)}
                    className={`p-2 md:p-3 rounded-xl border cursor-pointer transition-all relative flex items-start gap-2 md:gap-3
                      ${isSelected 
                        ? 'bg-indigo-50 border-indigo-300' 
                        : 'border-slate-100 hover:bg-slate-50 hover:border-indigo-200'
                      }`}
                  >
                    {isSelectionMode && (
                      <div className={`mt-1 shrink-0 ${isSelected ? 'text-indigo-600' : 'text-slate-300'}`}>
                        {isSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                      </div>
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-1 gap-2">
                        <h4 className={`font-bold text-xs md:text-sm line-clamp-1 ${isSelected ? 'text-indigo-900' : 'text-slate-800'}`}>
                          {item.topic}
                        </h4>
                        <span className={`text-[9px] md:text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 whitespace-nowrap ${
                          (item.score / item.total_questions) > 0.7 ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                        }`}>
                          {item.score}/{item.total_questions}
                        </span>
                      </div>
                      <p className="text-[10px] md:text-xs text-slate-400">
                        {new Date(item.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer (Delete Action) */}
          {isSelectionMode && (
            <div className="p-3 md:p-4 border-t border-slate-100 bg-white shrink-0">
              <button
                onClick={deleteSelected}
                disabled={selectedIds.size === 0}
                className="w-full py-2.5 md:py-3 bg-red-500 hover:bg-red-600 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-sm md:text-base rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <Trash2 size={16} className="md:w-[18px]" /> Delete ({selectedIds.size})
              </button>
            </div>
          )}
        </div>

        {/* 3. MAIN SCROLLABLE CONTENT AREA */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden bg-white relative custom-scrollbar">
          
          {/* Backdrop for history sidebar */}
          {showHistory && (
            <div 
              className="absolute inset-0 bg-black/20 z-10 backdrop-blur-sm"
              onClick={() => setShowHistory(false)}
            />
          )}

          {/* SETUP VIEW */}
          {view === 'setup' && (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-2xl mx-auto p-4 md:p-6 animate-in fade-in zoom-in duration-500">
              <div className="w-16 md:w-24 h-16 md:h-24 bg-indigo-50 rounded-[1.5rem] md:rounded-[2rem] flex items-center justify-center mb-6 md:mb-8 text-indigo-600 shadow-sm">
                <Brain size={32} className="md:w-[48px] md:h-[48px]" />
              </div>
              <h1 className="text-2xl md:text-5xl font-black text-slate-900 mb-4 md:mb-6 tracking-tight">AI Quiz Master</h1>
              <p className="text-slate-500 text-sm md:text-lg mb-6 md:mb-10 leading-relaxed px-2">
                Challenge yourself. Enter any topic below to generate a unique quiz.
              </p>
              
              <div className="flex w-full max-w-2xl gap-2 md:gap-3 shadow-2xl shadow-indigo-100 rounded-2xl md:rounded-3xl p-1.5 md:p-2 bg-white border border-slate-100 mx-auto">
                <input
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. React Hooks..."
                  className="flex-1 px-3 md:px-6 py-2.5 md:py-4 bg-transparent outline-none font-bold text-sm md:text-lg text-slate-800 placeholder:text-slate-300 placeholder:font-medium"
                  onKeyDown={(e) => e.key === 'Enter' && generateQuiz()}
                />
                <button 
                  onClick={generateQuiz}
                  disabled={loading || !topic}
                  className="px-4 md:px-8 py-2.5 md:py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl md:rounded-2xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 shrink-0"
                >
                  {loading ? <Loader2 className="animate-spin w-4 md:w-5" /> : <ChevronRight size={20} className="md:w-[24px]" />}
                </button>
              </div>
              {error && <p className="text-red-500 mt-4 md:mt-6 bg-red-50 px-4 md:px-6 py-2 md:py-3 rounded-xl md:rounded-2xl text-xs md:text-sm font-bold border border-red-100 mx-4">{error}</p>}
            </div>
          )}

          {/* QUIZ VIEW */}
          {view === 'quiz' && quiz && (
            <div className="max-w-3xl mx-auto py-6 md:py-12 px-4 md:px-6 animate-in slide-in-from-bottom-4 duration-500">
              <div className="flex justify-between items-center mb-6 md:mb-10 gap-2">
                <span className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-2 md:px-3 py-1 rounded-lg border border-slate-100 truncate">{quiz.title}</span>
                <div className="px-2.5 md:px-4 py-1 md:py-1.5 bg-indigo-50 text-indigo-700 rounded-full text-[11px] md:text-sm font-black shadow-sm shrink-0">
                  {currentQIndex + 1} / {quiz.questions.length}
                </div>
              </div>

              <h2 className="text-xl md:text-3xl font-bold text-slate-800 mb-6 md:mb-8 leading-snug">
                {quiz.questions[currentQIndex].question}
              </h2>

              <div className="grid gap-3 md:gap-4">
                {Object.entries(quiz.questions[currentQIndex].options).map(([key, val]: any) => (
                  <button
                    key={key}
                    onClick={() => setUserAnswers({ ...userAnswers, [currentQIndex]: key })}
                    className={`p-3 md:p-5 text-left rounded-xl md:rounded-2xl border-2 transition-all flex items-center gap-3 md:gap-5 group hover:shadow-md ${
                      userAnswers[currentQIndex] === key 
                      ? 'border-indigo-600 bg-indigo-50/50 text-indigo-900' 
                      : 'border-slate-100 hover:border-indigo-200 text-slate-600 bg-white'
                    }`}
                  >
                    <span className={`w-8 md:w-10 h-8 md:h-10 rounded-lg md:rounded-xl flex items-center justify-center font-black text-xs md:text-sm transition-colors shrink-0 ${
                      userAnswers[currentQIndex] === key ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-300' : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'
                    }`}>{key}</span>
                    <span className="font-semibold text-sm md:text-lg">{val}</span>
                  </button>
                ))}
              </div>

              <div className="flex justify-between mt-8 md:mt-12 pt-6 md:pt-8 border-t border-slate-100 gap-3">
                <button 
                  onClick={() => setCurrentQIndex(i => Math.max(0, i-1))}
                  disabled={currentQIndex === 0}
                  className="text-slate-400 font-bold text-sm md:text-base hover:text-slate-600 disabled:opacity-0 transition-opacity"
                >
                  Back
                </button>
                
                {currentQIndex === quiz.questions.length - 1 ? (
                  <button 
                    onClick={submitQuiz}
                    disabled={Object.keys(userAnswers).length !== quiz.questions.length || analyzing}
                    className="px-6 md:px-10 py-2.5 md:py-4 bg-green-600 hover:bg-green-700 text-white rounded-lg md:rounded-2xl font-bold text-sm md:text-base shadow-xl shadow-green-200 transition-all flex items-center justify-center gap-2 transform hover:-translate-y-1 disabled:opacity-50"
                  >
                    {analyzing ? <Loader2 className="animate-spin w-4 md:w-5" /> : "Submit"}
                  </button>
                ) : (
                  <button 
                    onClick={() => setCurrentQIndex(i => i+1)}
                    className="px-6 md:px-8 py-2.5 md:py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg md:rounded-2xl font-bold text-sm md:text-base shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2"
                  >
                    Next <ChevronRight size={16} className="md:w-[18px]" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* REPORT VIEW */}
          {(view === 'report' || view === 'history_review') && report && (
            <div className="w-full animate-in fade-in duration-500 overflow-x-hidden">
              {/* Header */}
              <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 p-6 md:p-12 text-white text-center shadow-lg relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                <Trophy className="w-12 md:w-16 h-12 md:h-16 mx-auto mb-3 md:mb-4 text-yellow-300 drop-shadow-md" />
                <h2 className="text-3xl md:text-5xl font-black mb-3 md:mb-4 tracking-tight">{report.score} / {quiz?.questions?.length || 0}</h2>
                <p className="text-indigo-100 font-medium text-sm md:text-lg max-w-xl mx-auto leading-relaxed opacity-90 px-4">"{report.summary}"</p>
              </div>

              <div className="max-w-4xl mx-auto p-4 md:p-10 -mt-6 md:-mt-8 space-y-6 md:space-y-8">
                {/* Stats Grid */}
                <div className="grid md:grid-cols-2 gap-4 md:gap-6">
                  <div className="bg-white p-4 md:p-6 rounded-2xl md:rounded-3xl border border-green-100 shadow-sm">
                    <h3 className="font-bold text-green-800 flex items-center gap-2 mb-3 md:mb-4 text-sm md:text-base">
                      <CheckCircle2 size={18} className="md:w-[20px]" /> Strengths
                    </h3>
                    <ul className="space-y-2 md:space-y-3">
                      {report.strengths?.map((s: string, i: number) => (
                        <li key={i} className="text-xs md:text-sm font-semibold text-green-700 flex gap-2">
                          <span className="mt-1 md:mt-1.5 w-1 md:w-1.5 h-1 md:h-1.5 rounded-full bg-green-500 shrink-0" /> {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-white p-4 md:p-6 rounded-2xl md:rounded-3xl border border-orange-100 shadow-sm">
                    <h3 className="font-bold text-orange-800 flex items-center gap-2 mb-3 md:mb-4 text-sm md:text-base">
                      <Target size={18} className="md:w-[20px]" /> Improve
                    </h3>
                    <ul className="space-y-2 md:space-y-3">
                      {report.weaknesses?.map((w: string, i: number) => (
                        <li key={i} className="text-xs md:text-sm font-semibold text-orange-700 flex gap-2">
                          <span className="mt-1 md:mt-1.5 w-1 md:w-1.5 h-1 md:h-1.5 rounded-full bg-orange-500 shrink-0" /> {w}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Recommendations */}
                <div className="bg-white p-4 md:p-8 rounded-2xl md:rounded-3xl border border-slate-100 shadow-sm">
                  <h3 className="font-bold text-slate-800 text-base md:text-xl mb-4 md:mb-6 flex items-center gap-2">
                    <Lightbulb className="text-yellow-500 fill-current w-4 md:w-5" /> Recommendations
                  </h3>
                  <div className="flex flex-wrap gap-2 md:gap-3">
                    {report.focusRecommendations?.map((rec: string, i: number) => (
                      <span key={i} className="px-3 md:px-4 py-1.5 md:py-2 bg-slate-50 border border-slate-200 rounded-lg md:rounded-xl text-xs md:text-sm text-slate-700 font-semibold">
                        {rec}
                      </span>
                    ))}
                  </div>
                </div>

                {/* QUESTIONS REVIEW (IMPROVED: Shows all options) */}
                {quiz && quiz.questions && (
                  <div className="space-y-4 pt-4">
                    <h3 className="font-bold text-slate-800 text-xl px-2">Review Answers</h3>
                    {quiz.questions.map((q: any, i: number) => {
                      const correctKey = q.correctAnswer;
                      const userKey = userAnswers[i];
                      const isCorrect = userKey === correctKey;

                      return (
                        <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                          <div className="flex justify-between items-start mb-4 gap-4">
                            <p className="font-bold text-slate-800 text-lg">{i + 1}. {q.question}</p>
                            {isCorrect 
                              ? <CheckCircle2 className="text-green-500 shrink-0 w-6 h-6" /> 
                              : <XCircle className="text-red-500 shrink-0 w-6 h-6" />
                            }
                          </div>

                          <div className="grid gap-3">
                            {Object.entries(q.options).map(([key, val]: any) => {
                              const isThisOptionCorrect = key === correctKey;
                              const isThisOptionSelected = key === userKey;
                              
                              let styles = "border-slate-100 bg-slate-50 text-slate-500 opacity-70"; // Default
                              let icon = null;

                              if (isThisOptionCorrect) {
                                styles = "border-green-300 bg-green-50 text-green-800 font-bold ring-1 ring-green-200";
                                icon = <Check size={16} className="text-green-600" />;
                              }
                              
                              if (isThisOptionSelected && !isThisOptionCorrect) {
                                styles = "border-red-300 bg-red-50 text-red-800 font-bold ring-1 ring-red-200";
                                icon = <X size={16} className="text-red-600" />;
                              }

                              if (isThisOptionSelected && isThisOptionCorrect) {
                                styles = "border-green-500 bg-green-100 text-green-900 font-black ring-2 ring-green-400";
                                icon = <CheckCircle2 size={16} className="text-green-700" />;
                              }

                              return (
                                <div key={key} className={`p-3 rounded-xl border flex items-center justify-between ${styles}`}>
                                  <div className="flex items-center gap-3">
                                    <span className="w-6 h-6 rounded-lg bg-white/50 flex items-center justify-center text-xs font-bold border border-black/5">
                                      {key}
                                    </span>
                                    <span className="text-sm md:text-base">{val}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {isThisOptionSelected && (
                                      <span className="text-[10px] font-extrabold uppercase tracking-wider bg-white/60 px-2 py-0.5 rounded-md">
                                        You
                                      </span>
                                    )}
                                    {isThisOptionCorrect && !isThisOptionSelected && (
                                      <span className="text-[10px] font-extrabold uppercase tracking-wider bg-green-200/60 text-green-800 px-2 py-0.5 rounded-md">
                                        Correct
                                      </span>
                                    )}
                                    {icon}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <button 
                  onClick={resetQuiz}
                  className="w-full py-3 md:py-5 bg-slate-900 text-white font-bold text-sm md:text-base rounded-xl md:rounded-2xl hover:bg-black transition-all flex items-center justify-center gap-2 shadow-xl"
                >
                  <RefreshCcw size={18} className="md:w-[20px]" /> New Quiz
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}