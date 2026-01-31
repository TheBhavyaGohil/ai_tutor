import { NextResponse } from "next/server";
import { Groq } from "groq-sdk";
import { createClient } from '@supabase/supabase-js';

export const runtime = "nodejs";

// Initialize Supabase Admin for server-side fetching of previous history
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, topic, language, quizData, userAnswers, score, userId } = body;

    const GROQ_API_KEY = process.env.GROQ_API_KEY;
    if (!GROQ_API_KEY) return NextResponse.json({ error: "Server API Key missing" }, { status: 500 });
    const groq = new Groq({ apiKey: GROQ_API_KEY });

    // --- ACTION 1: GENERATE QUIZ ---
    if (action === 'generate') {
      const systemMsg = "You are a quiz API. Output ONLY raw JSON. No markdown.";
      // Optimization: Instructions to randomize option position
      const userPrompt = `Generate 5 multiple-choice questions on "${topic}". Language: ${language || "English"}.
      CRITICAL RULES:
      1. Randomize the correct answer position. It must NOT always be 'A' or 'C'. Distribute evenly.
      2. Return JSON ONLY: { "title": "Topic", "questions": [ { "question": "...", "options": {"A":"..","B":"..","C":"..","D":".."}, "correctAnswer": "A", "skillCategory": "Category" } ] }`;

      const completion = await groq.chat.completions.create({
        model: "llama-3.1-8b-instant",
        messages: [{ role: "system", content: systemMsg }, { role: "user", content: userPrompt }],
        temperature: 0.7, // Higher temp = more randomness
        response_format: { type: "json_object" }
      });

      const content = completion.choices[0]?.message?.content || "{}";
      return NextResponse.json(JSON.parse(content));
    }

    // --- ACTION 2: ANALYZE PERFORMANCE ---
    if (action === 'analyze') {
      // 1. Fetch Previous History for Context
      let historyContext = "No previous history.";
      if (userId) {
        const { data: lastQuiz } = await supabase
          .from('quiz_results')
          .select('ai_analysis')
          .eq('user_id', userId)
          .eq('topic', topic)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        
        if (lastQuiz?.ai_analysis) {
          historyContext = `Previous Analysis: ${lastQuiz.ai_analysis.summary}`;
        }
      }

      // 2. Prepare Prompt
      const systemMsg = "You are an expert tutor. Analyze the student's quiz performance.";
      const analysisPrompt = `
      Topic: ${topic}
      Score: ${score}
      User Answers vs Correct: ${JSON.stringify(userAnswers)}
      Questions: ${JSON.stringify(quizData.questions.map((q:any, i:number) => ({id: i, cat: q.skillCategory})))}
      Context from Last Time: ${historyContext}

      Generate a JSON report:
      {
        "summary": "2 sentence summary comparing to last time (if applicable).",
        "strengths": ["List 2 strong skills"],
        "weaknesses": ["List 2 weak areas"],
        "focusRecommendations": ["Specific action items"],
        "overallGrade": "S/A/B/C/F"
      }`;

      const completion = await groq.chat.completions.create({
        model: "llama-3.1-8b-instant",
        messages: [{ role: "system", content: systemMsg }, { role: "user", content: analysisPrompt }],
        temperature: 0.3,
        response_format: { type: "json_object" }
      });

      const content = completion.choices[0]?.message?.content || "{}";
      return NextResponse.json(JSON.parse(content));
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  } catch (err: any) {
    console.error("API Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}