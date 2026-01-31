import { NextResponse } from "next/server";
import { Groq } from "groq-sdk";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { topic, language } = await req.json();
    if (!topic || typeof topic !== "string") {
      return NextResponse.json({ error: "Topic is required" }, { status: 400 });
    }

    const GROQ_API_KEY = process.env.GROQ_API_KEY || "";
    if (!GROQ_API_KEY) {
      return NextResponse.json({ error: "Missing GROQ_API_KEY in environment" }, { status: 500 });
    }

    // init client
    const groq = new Groq({ apiKey: GROQ_API_KEY });

    const systemMsg = "You are a helpful assistant that outputs only raw JSON according to the requested schema.";
    const userPrompt = `Generate 10 multiple-choice quiz questions on the topic "${topic}". Language: ${language || "English"}.
Return ONLY valid JSON, no markdown, no explanation. Format:
{ "quiz": [ { "question":"...", "options":{"A":"...","B":"...","C":"...","D":"..."}, "answer":"A" } ] }`;

    const chatCompletion = await groq.chat.completions.create({
      model: process.env.GROQ_MODEL || "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: systemMsg },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.0,
      stream: true,
    });

    // stream-accumulate response
    let full = "";
    for await (const chunk of chatCompletion) {
      full += chunk?.choices?.[0]?.delta?.content ?? "";
    }

    if (!full.trim()) {
      return NextResponse.json({ error: "Empty AI response" }, { status: 500 });
    }

    // extract first JSON object from response
    const jsonMatch = full.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      // fallback: try to find array if model returned only an array
      const arrMatch = full.match(/\[[\s\S]*\]/);
      if (arrMatch) {
        try {
          const parsedArray = JSON.parse(arrMatch[0]);
          return NextResponse.json({ quiz: parsedArray });
        } catch (e: any) {
          return NextResponse.json({ error: "Failed to parse JSON array from AI", details: e.message, raw: full.slice(0,1000) }, { status: 500 });
        }
      }

      return NextResponse.json({ error: "AI did not return valid JSON", raw: full.slice(0,1000) }, { status: 500 });
    }

    let quizData;
    try {
      quizData = JSON.parse(jsonMatch[0]);
    } catch (e: any) {
      return NextResponse.json({ error: "Failed to parse JSON from AI", details: e.message, raw: jsonMatch[0].slice(0,1000) }, { status: 500 });
    }

    return NextResponse.json(quizData);
  } catch (err: any) {
    console.error("❌ QUIZ ROUTE CRASH:", err);
    return NextResponse.json({ error: "Quiz generation failed", details: err?.message || String(err) }, { status: 500 });
  }
}
