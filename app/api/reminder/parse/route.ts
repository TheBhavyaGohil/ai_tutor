import { NextResponse } from "next/server";
import { Groq } from "groq-sdk";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { text, timeZone, nowIso } = await req.json();

    if (!text) {
      return NextResponse.json({ error: "Missing text" }, { status: 400 });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return new NextResponse("Missing GROQ_API_KEY in environment", { status: 500 });
    }

    const groq = new Groq({ apiKey });

    const prompt = `You are a reminder parser. Return ONLY valid JSON (no markdown).
Schema:
{
  "isReminder": boolean,
  "title": string | null,
  "date": "YYYY-MM-DD" | null,
  "time": "HH:MM" | null,
  "durationMinutes": number | null,
  "description": string | null
}

Rules:
- If the text contains reminder/alarm/schedule intent (e.g., "remind me", "set reminder", "@", "alarm"), set isReminder=true
- Extract the reminder title/context (what to remind about) - be concise but clear
- Parse time formats: @10:45, 10:45, at 10:45, etc. Convert to 24-hour HH:MM format
- Resolve relative dates like "tomorrow", "today" using the provided current date
- If date is not mentioned, use today's date
- Default duration to 30 minutes if not specified
- Use the provided timezone when interpreting time phrases

Examples:
- "Remind me @ 10:45 for visiting bike broker" → title: "Visiting bike broker", time: "10:45", date: today
- "Set alarm at 3pm for meeting" → title: "Meeting", time: "15:00", date: today
- "Remind me tomorrow at 9am for lab" → title: "Lab", time: "09:00", date: tomorrow

Current time (ISO): ${nowIso}
Timezone: ${timeZone}
Text: ${text}`;

    const completion = await groq.chat.completions.create({
      model: process.env.GROQ_MODEL || "llama-3.1-8b-instant",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
      max_tokens: 400,
    });

    const content = completion.choices[0]?.message?.content || "";
    const jsonStart = content.indexOf("{");
    const jsonEnd = content.lastIndexOf("}");

    if (jsonStart === -1 || jsonEnd === -1) {
      return NextResponse.json({ error: "Invalid parser response" }, { status: 500 });
    }

    const jsonStr = content.substring(jsonStart, jsonEnd + 1);
    const parsed = JSON.parse(jsonStr);

    return NextResponse.json(parsed);
  } catch (error: any) {
    console.error("Reminder Parse Error:", error);
    return NextResponse.json({ error: error.message || "Failed to parse reminder" }, { status: 500 });
  }
}
