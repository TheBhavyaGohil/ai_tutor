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

    const prompt = `You are a reminder parser. Return ONLY a valid JSON object (no markdown, no explanations, no code blocks).

RESPONSE MUST BE VALID JSON ONLY. Example valid response:
{"isReminder": true, "title": "Meeting", "date": "2024-02-10", "time": "14:30", "durationMinutes": 30, "description": null}

Schema:
{
  "isReminder": boolean,
  "title": string or null,
  "date": "YYYY-MM-DD" or null,
  "time": "HH:MM" or null,
  "durationMinutes": number or null,
  "description": string or null
}

Rules:
- If the text contains reminder/alarm/schedule intent (e.g., "remind me", "set reminder", "@", "alarm"), set isReminder=true. Otherwise isReminder=false
- Extract the reminder title/context (what to remind about) - be concise but clear
- Parse time formats: @10:45, 10:45, at 10:45, etc. Convert to 24-hour HH:MM format
- Resolve relative dates like "tomorrow", "today" using the provided current date
- If date is not mentioned and isReminder is true, use today's date
- Default duration to 30 minutes if not specified and isReminder is true
- Use the provided timezone when interpreting time phrases
- Return null for fields that are not applicable

Examples:
- "Remind me @ 10:45 for visiting bike broker" → {"isReminder": true, "title": "Visiting bike broker", "date": "2024-02-10", "time": "10:45", "durationMinutes": 30, "description": null}
- "Set alarm at 3pm for meeting" → {"isReminder": true, "title": "Meeting", "date": "2024-02-10", "time": "15:00", "durationMinutes": 30, "description": null}
- "Remind me tomorrow at 9am for lab" → {"isReminder": true, "title": "Lab", "date": "2024-02-11", "time": "09:00", "durationMinutes": 30, "description": null}
- "Hello there" → {"isReminder": false, "title": null, "date": null, "time": null, "durationMinutes": null, "description": null}

Current time (ISO): ${nowIso}
Timezone: ${timeZone}
User text: ${text}`;

    const completion = await groq.chat.completions.create({
      model: process.env.GROQ_MODEL || "llama-3.1-8b-instant",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
      max_tokens: 800,
    });

    const content = completion.choices[0]?.message?.content || "";
    const jsonStart = content.indexOf("{");
    const jsonEnd = content.lastIndexOf("}");

    if (jsonStart === -1 || jsonEnd === -1) {
      return NextResponse.json({ error: "Invalid parser response" }, { status: 500 });
    }

    let jsonStr = content.substring(jsonStart, jsonEnd + 1);
    
    // Clean up common JSON artifacts
    jsonStr = jsonStr
      .replace(/,\s*}/, "}") // Remove trailing commas before closing brace
      .replace(/,\s*]/, "]") // Remove trailing commas before closing bracket
      .trim();

    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error("Failed to parse JSON. Raw content:", content);
      console.error("Extracted JSON:", jsonStr);
      return NextResponse.json({ error: "Failed to parse reminder response" }, { status: 500 });
    }

    return NextResponse.json(parsed);
  } catch (error: any) {
    console.error("Reminder Parse Error:", error);
    return NextResponse.json({ error: error.message || "Failed to parse reminder" }, { status: 500 });
  }
}
