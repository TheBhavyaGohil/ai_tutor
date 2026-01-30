import { NextResponse } from "next/server";

/**
 * IMPORTANT:
 * Force Node.js runtime.
 * Gemini often fails silently on Edge runtime.
 */
export const runtime = "nodejs";

/**
 * 🔴 Hardcoded Google Gemini API Key
 * (OK for college projects / demos, NOT for production)
 */
const GOOGLE_API_KEY = "AIzaSyC9ub8_qU6KiDQpic4qVNIqoNcqd179O7c";

export async function POST(req: Request) {
  try {
    // 1️⃣ Read request body
    const { topic, language } = await req.json();

    if (!topic || typeof topic !== "string") {
      return NextResponse.json(
        { error: "Topic is required" },
        { status: 400 }
      );
    }

    // 2️⃣ Build prompt
    const prompt = `
Generate 10 multiple-choice quiz questions on the topic "${topic}".
Language: ${language || "English"}.

CRITICAL RULES:
- Return ONLY valid JSON
- No markdown
- No explanations
- No text before or after JSON
- Start with { and end with }

JSON FORMAT:
{
  "quiz": [
    {
      "question": "string",
      "options": {
        "A": "string",
        "B": "string",
        "C": "string",
        "D": "string"
      },
      "answer": "A"
    }
  ]
}
`;

    // 3️⃣ Call Gemini API
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GOOGLE_API_KEY}`;
    
    const body = {
      contents: [
        {
          parts: [
            { text: prompt }
          ]
        }
      ],
      // safety or other params can be added here if required by API
    };

    async function callWithRetry(url: string, options: RequestInit, maxRetries = 3, baseBackoffMs = 1000) {
      let attempt = 0;
      while (true) {
        const res = await fetch(url, options);
        if (res.ok) return res;

        if (res.status !== 429 || attempt >= maxRetries) return res;

        attempt++;
        let waitMs = baseBackoffMs * Math.pow(2, attempt - 1);

        try {
          const errJson = await res.clone().json().catch(() => null);
          const retryInfo = errJson?.error?.details?.find((d: any) => String(d['@type'] || '').includes('RetryInfo'));
          const retryDelay = retryInfo?.retryDelay ?? errJson?.error?.retryDelay;
          if (typeof retryDelay === 'string') {
            const m = /(\d+(\.\d+)?)s/.exec(retryDelay);
            if (m) waitMs = Math.ceil(parseFloat(m[1]) * 1000);
          } else if (res.headers.get('retry-after')) {
            const h = res.headers.get('retry-after')!;
            const n = parseInt(h, 10);
            if (!Number.isNaN(n)) waitMs = n * 1000;
          }
        } catch (_) {}

        // bounds
        waitMs = Math.max(500, Math.min(waitMs, 60000));
        console.warn(`Rate limited (429). retry #${attempt} after ${waitMs}ms`);
        await new Promise((r) => setTimeout(r, waitMs));
      }
    }

    const response = await callWithRetry(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }, 4, 1000);

    if (!response.ok) {
      const errText = await response.text();
      console.error("❌ GEMINI HTTP ERROR:", response.status, errText);

      if (response.status === 429) {
        // surface retry info to client
        return NextResponse.json(
          { error: "Quota exceeded", status: 429, details: errText },
          { status: 429 }
        );
      }

      return NextResponse.json(
        { error: "Gemini API error", status: response.status, details: errText },
        { status: 500 }
      );
    }

    // 5️⃣ Parse Gemini response
    const data = await response.json();
    console.log("✅ GEMINI RAW RESPONSE:", JSON.stringify(data, null, 2));

    const rawText =
      data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
      return NextResponse.json(
        { error: "Empty AI response" },
        { status: 500 }
      );
    }

    // 6️⃣ Safely extract JSON from Gemini output
    const match = rawText.match(/\{[\s\S]*\}/);

    if (!match) {
      console.error("❌ RAW TEXT (NO JSON FOUND):", rawText);
      return NextResponse.json(
        { error: "AI did not return valid JSON" },
        { status: 500 }
      );
    }

    const quizData = JSON.parse(match[0]);

    // 7️⃣ Return quiz JSON to frontend
    return NextResponse.json(quizData);

  } catch (err: any) {
    console.error("❌ QUIZ ROUTE CRASH:", err);

    return NextResponse.json(
      {
        error: "Quiz generation failed",
        details: err.message
      },
      { status: 500 }
    );
  }
}
