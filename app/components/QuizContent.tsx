import React, { useState } from 'react';
import { 
  BookOpen, 
  Brain, 
  ChevronRight, 
  Loader2, 
  Trophy, 
  AlertCircle, 
  CheckCircle2, 
  XCircle, 
  RefreshCcw,
  Target,
  BarChart3,
  Lightbulb
} from 'lucide-react';
import { NextResponse } from "next/server";
export const runtime = "nodejs";

const API_ROUTE = '/api/generate-quiz';

const QuizContent: React.FC = () => {
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quiz, setQuiz] = useState<any>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number,string>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [report, setReport] = useState<any>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const fetchWithRetry = async (url: string, options: RequestInit, retries = 5, backoff = 1000) => {
    try {
      const response = await fetch(url, options);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (err) {
      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, backoff));
        return fetchWithRetry(url, options, retries - 1, backoff * 2);
      }
      throw err;
    }
  };

  const generateQuiz = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    setError(null);
    setQuiz(null);
    setUserAnswers({});
    setQuizSubmitted(false);
    setReport(null);

    const systemPrompt = `You are a professional quiz generator. 
    Create a 5-question multiple choice quiz on the user's topic. 
    Return ONLY a JSON object with this structure:
    {
      "title": "Topic Title",
      "questions": [
        {
          "id": 1,
          "question": "Question text?",
          "options": ["A", "B", "C", "D"],
          "correctAnswer": "A",
          "skillCategory": "Theoretical Knowledge/Practical Application/Specific Subtopic"
        }
      ]
    }`;

    try {
      const data = await fetchWithRetry(API_ROUTE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, systemPrompt, responseMimeType: 'application/json' })
      });

      // normalize model response into { title, questions: [...] } shape expected by the UI
      const rawText = data?.text
        || data?.candidates?.[0]?.content?.[0]?.parts?.[0]?.text
        || JSON.stringify(data);

      let parsed;
      try {
        parsed = typeof rawText === 'string' ? JSON.parse(rawText) : rawText;
      } catch (e) {
        throw new Error('Failed to parse model JSON');
      }

      // model sometimes returns top-level "quiz" array
      const rawQuestionsArray = parsed.quiz || parsed.questions || [];
      const normalizedQuestions = Array.isArray(rawQuestionsArray)
        ? rawQuestionsArray.map((q: any, idx: number) => {
            const optsObj = q.options || {};
            // preserve letter keys, convert to ["A: text", "B: text", ...]
            const optionsArr = Object.entries(optsObj).map(([k, v]) => `${k}: ${v}`);
            const correctLetter = q.answer || q.correctAnswer || '';
            const correctOption = optionsArr.find(o => o.startsWith(`${correctLetter}:`)) || correctLetter;
            return {
              id: q.id ?? idx + 1,
              question: q.question ?? `Question ${idx + 1}`,
              options: optionsArr,
              correctAnswer: correctOption,
              skillCategory: q.skillCategory ?? ''
            };
          })
        : [];

      const normalized = {
        title: parsed.title || `Quiz: ${topic}`,
        questions: normalizedQuestions
      };

      setQuiz(normalized);
      setCurrentQuestionIndex(0);
    } catch (err) {
      setError("Failed to generate quiz. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (option: string) => {
    setUserAnswers({ ...userAnswers, [currentQuestionIndex]: option });
  };

  const nextQuestion = () => {
    if (quiz && currentQuestionIndex < quiz.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const prevQuestion = () => {
    if (currentQuestionIndex > 0) setCurrentQuestionIndex(currentQuestionIndex - 1);
  };

  const generateReport = async () => {
    if (!quiz) return;
    setAnalyzing(true);
    setQuizSubmitted(true);

    const score = quiz.questions.filter((q: any, idx: number) => userAnswers[idx] === q.correctAnswer).length;
    const performanceData = quiz.questions.map((q: any, idx: number) => ({
      question: q.question,
      userAnswer: userAnswers[idx],
      correctAnswer: q.correctAnswer,
      isCorrect: userAnswers[idx] === q.correctAnswer,
      skill: q.skillCategory
    }));

    const analysisPrompt = `Analyze this quiz performance and provide a detailed report.
Topic: ${topic}
Score: ${score}/${quiz.questions.length}
Details: ${JSON.stringify(performanceData)}

Return ONLY a JSON object:
{
  "summary": "High level summary of performance",
  "strengths": ["list of what they know well"],
  "weaknesses": ["list of areas lacking"],
  "focusRecommendations": ["Specific skills or concepts to study next"],
  "overallGrade": "Expert/Intermediate/Beginner"
}`;

    try {
      const data = await fetchWithRetry(API_ROUTE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, systemPrompt: analysisPrompt, responseMimeType: 'application/json' })
      });

      const rawText = data?.text
        || data?.candidates?.[0]?.content?.[0]?.parts?.[0]?.text
        || JSON.stringify(data);

      const reportData = typeof rawText === 'string' ? JSON.parse(rawText) : rawText;
      setReport({ ...reportData, score });
    } catch (err) {
      setReport({ 
        summary: "Analysis failed, but here is your score.",
        score,
        strengths: [],
        weaknesses: [],
        focusRecommendations: ["Review the incorrect questions above."],
        overallGrade: "N/A"
      });
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-10">
          <div className="inline-flex items-center justify-center p-3 bg-indigo-600 rounded-2xl mb-4 shadow-lg shadow-indigo-200">
            <Brain className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">AI Quiz Master</h1>
          <p className="mt-2 text-slate-500 text-lg">Enter any topic to generate a personalized knowledge assessment.</p>
        </header>

        {!quiz && !loading && (
          <div className="bg-white p-6 rounded-3xl shadow-xl border border-slate-100 mb-8 transform transition-all">
            <div className="flex flex-col md:flex-row gap-4">
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., Quantum Physics, French History, React Hooks..."
                className="flex-1 p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none text-lg"
              />
              <button
                onClick={generateQuiz}
                disabled={!topic.trim()}
                className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold rounded-2xl transition-all shadow-lg hover:shadow-indigo-200 flex items-center justify-center gap-2"
              >
                Generate Quiz <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <div className="relative">
              <Loader2 className="w-16 h-16 text-indigo-600 animate-spin" />
              <Brain className="w-6 h-6 text-indigo-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>
            <p className="text-slate-600 font-medium animate-pulse">Building your quiz with AI...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-700 p-6 rounded-2xl flex items-center gap-4">
            <AlertCircle className="w-6 h-6 shrink-0" />
            <p className="font-medium">{error}</p>
            <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700 font-bold underline">Dismiss</button>
          </div>
        )}

        {quiz && Array.isArray(quiz.questions) && quiz.questions.length > 0 && !quizSubmitted && (
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
            {/* Progress Bar */}
            <div className="h-2 bg-slate-100 w-full">
              <div 
                className="h-full bg-indigo-600 transition-all duration-500"
                style={{ width: quiz?.questions?.length ? `${((currentQuestionIndex + 1) / quiz.questions.length) * 100}%` : '0%' }}
              />
            </div>

            <div className="p-8">
              <div className="flex justify-between items-center mb-6">
                <span className="px-3 py-1 bg-indigo-50 text-indigo-600 text-sm font-bold rounded-full uppercase tracking-wider">
                  Question {currentQuestionIndex + 1} of {quiz.questions.length}
                </span>
                <span className="text-slate-400 font-medium">{quiz.title}</span>
              </div>

              <h2 className="text-2xl font-bold text-slate-800 mb-8 leading-snug">
                {quiz.questions[currentQuestionIndex].question}
              </h2>

              <div className="grid gap-4">
                {quiz.questions[currentQuestionIndex].options.map((option: string, idx: number) => (
                  <button
                    key={idx}
                    onClick={() => handleAnswer(option)}
                    className={`p-5 text-left rounded-2xl border-2 transition-all flex items-center justify-between group
                      ${userAnswers[currentQuestionIndex] === option 
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-md' 
                        : 'border-slate-100 bg-slate-50 hover:border-indigo-200 hover:bg-white text-slate-600'}`}
                  >
                    <span className="font-medium text-lg">{option}</span>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all
                      ${userAnswers[currentQuestionIndex] === option ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 group-hover:border-indigo-300'}`}>
                      {userAnswers[currentQuestionIndex] === option && <CheckCircle2 className="w-4 h-4 text-white" />}
                    </div>
                  </button>
                ))}
              </div>

              <div className="flex justify-between mt-10">
                <button
                  onClick={prevQuestion}
                  disabled={currentQuestionIndex === 0}
                  className="px-6 py-3 text-slate-400 hover:text-slate-600 disabled:opacity-0 font-bold transition-all"
                >
                  Back
                </button>
                
                {currentQuestionIndex === quiz.questions.length - 1 ? (
                  <button
                    onClick={generateReport}
                    disabled={Object.keys(userAnswers).length < quiz.questions.length}
                    className="px-8 py-3 bg-green-600 hover:bg-green-700 disabled:bg-slate-300 text-white font-bold rounded-xl shadow-lg transition-all flex items-center gap-2"
                  >
                    Submit Quiz <CheckCircle2 className="w-5 h-5" />
                  </button>
                ) : (
                  <button
                    onClick={nextQuestion}
                    className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg transition-all flex items-center gap-2"
                  >
                    Next Question <ChevronRight className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {analyzing && (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <Loader2 className="w-12 h-12 text-green-500 animate-spin" />
            <p className="text-slate-600 font-semibold">AI is analyzing your performance...</p>
          </div>
        )}

        {report && !analyzing && (
          <div className="space-y-6 pb-12">
            <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
              <div className="bg-indigo-600 p-8 text-center text-white">
                <Trophy className="w-16 h-16 mx-auto mb-4 opacity-90" />
                <h2 className="text-3xl font-extrabold mb-2">Quiz Results</h2>
                <div className="inline-block px-6 py-2 bg-white/20 rounded-full text-2xl font-bold backdrop-blur-md">
                  {report.score} / {quiz.questions.length}
                </div>
                <p className="mt-4 text-indigo-100 font-medium italic opacity-90">"{report.summary}"</p>
              </div>

              <div className="p-8">
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-4">
                    <div className="p-4 bg-indigo-100 text-indigo-600 rounded-xl">
                      <BarChart3 className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Overall Grade</h4>
                      <p className="text-xl font-bold text-slate-800">{report.overallGrade}</p>
                    </div>
                  </div>

                  <div className="p-6 bg-amber-50 rounded-2xl border border-amber-100 flex items-center gap-4">
                    <div className="p-4 bg-amber-100 text-amber-600 rounded-xl">
                      <Target className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-amber-500 uppercase tracking-wider">Top Priority</h4>
                      <p className="text-xl font-bold text-slate-800">
                        {report.focusRecommendations?.[0] || "Continue Learning"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-10 grid md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-500" /> Key Strengths
                    </h3>
                    <ul className="space-y-2">
                      {report.strengths?.map((s: string, i: number) => (
                        <li key={i} className="flex items-start gap-3 p-3 bg-green-50 rounded-xl text-green-800 text-sm font-medium">
                          <span className="mt-1 flex-shrink-0 w-1.5 h-1.5 rounded-full bg-green-500" />
                          {s}
                        </li>
                      )) || <p className="text-slate-400 text-sm italic">Keep practicing to build your strengths!</p>}
                    </ul>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-red-500" /> Areas to Focus
                    </h3>
                    <ul className="space-y-2">
                      {report.weaknesses?.map((w: string, i: number) => (
                        <li key={i} className="flex items-start gap-3 p-3 bg-red-50 rounded-xl text-red-800 text-sm font-medium">
                          <span className="mt-1 flex-shrink-0 w-1.5 h-1.5 rounded-full bg-red-500" />
                          {w}
                        </li>
                      )) || <p className="text-green-600 text-sm italic">No major weaknesses identified!</p>}
                    </ul>
                  </div>
                </div>

                <div className="mt-10 p-6 bg-indigo-50 rounded-3xl">
                  <h3 className="text-lg font-bold text-indigo-900 mb-4 flex items-center gap-2">
                    <Lightbulb className="w-5 h-5" /> Learning Action Plan
                  </h3>
                  <div className="grid gap-3">
                    {report.focusRecommendations?.map((r: string, i: number) => (
                      <div key={i} className="bg-white p-4 rounded-xl border border-indigo-100 text-slate-700 text-sm shadow-sm font-medium">
                        {r}
                      </div>
                    )) || <div className="text-sm">No recommendations</div>}
                  </div>
                </div>

                <button
                  onClick={() => {
                    setQuiz(null);
                    setReport(null);
                    setTopic('');
                  }}
                  className="mt-10 w-full py-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2"
                >
                  <RefreshCcw className="w-5 h-5" /> Try Another Topic
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-xl font-bold text-slate-800 px-2">Question Review</h3>
              {quiz.questions.map((q: any, idx: number) => (
                <div key={idx} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                  <div className="flex justify-between items-start mb-4">
                    <h4 className="font-bold text-slate-800 pr-4">{q.question}</h4>
                    {userAnswers[idx] === q.correctAnswer ? (
                      <CheckCircle2 className="w-6 h-6 text-green-500 shrink-0" />
                    ) : (
                      <XCircle className="w-6 h-6 text-red-500 shrink-0" />
                    )}
                  </div>
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div className={`p-3 rounded-xl border ${userAnswers[idx] === q.correctAnswer ? 'bg-green-50 border-green-100 text-green-800' : 'bg-red-50 border-red-100 text-red-800'}`}>
                      <span className="font-bold block text-xs uppercase opacity-60 mb-1">Your Answer</span>
                      {userAnswers[idx] || "No Answer"}
                    </div>
                    {userAnswers[idx] !== q.correctAnswer && (
                      <div className="p-3 rounded-xl border bg-slate-50 border-slate-100 text-slate-800">
                        <span className="font-bold block text-xs uppercase opacity-60 mb-1">Correct Answer</span>
                        {q.correctAnswer}
                      </div>
                    )}
                  </div>
                  <div className="mt-4 flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Category:</span>
                    <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 rounded-md text-slate-500">{q.skillCategory}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuizContent;

export async function POST() {
  return NextResponse.json({
    quiz: [
      {
        question: "Test question?",
        options: {
          A: "Option 1",
          B: "Option 2",
          C: "Option 3",
          D: "Option 4"
        },
        answer: "A"
      }
    ]
  });
}
