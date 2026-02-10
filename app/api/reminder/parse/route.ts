import { NextResponse } from "next/server";
import { Groq } from "groq-sdk";

export const runtime = "nodejs";

// Helper function to convert 12-hour time format to 24-hour format
function convertTo24Hour(timeStr: string): string | null {
  try {
    // Match patterns like: "2pm", "2 PM", "2:30 PM", "2:30pm", etc.
    const match = timeStr.match(/(\d{1,2}):?(\d{2})?\s*(am|pm|AM|PM)/i);
    if (!match) return null;

    let hours = parseInt(match[1], 10);
    const minutes = match[2] ? parseInt(match[2], 10) : 0;
    const period = match[3].toLowerCase();

    // Convert to 24-hour format
    if (period === 'pm' && hours !== 12) {
      hours += 12;
    } else if (period === 'am' && hours === 12) {
      hours = 0;
    }

    // Format as HH:MM
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  } catch (error) {
    console.error('Error converting time:', error);
    return null;
  }
}

// Helper function to get date in YYYY-MM-DD format in the user's timezone
function getLocalDate(isoString: string, offset: number = 0): string {
  const date = new Date(isoString);
  if (offset !== 0) {
    date.setDate(date.getDate() + offset);
  }
  // Get date components in the user's local time (already in their timezone from isoString)
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

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

    // Extract today's date and tomorrow's date using the user's local timezone
    const todayDate = getLocalDate(nowIso, 0); // e.g., "2026-02-10"
    const tomorrowDate = getLocalDate(nowIso, 1);

    const prompt = `You are a reminder parser. Return ONLY ONE JSON object (no markdown, no explanations, no code blocks, no multiple objects).

RESPONSE MUST BE A SINGLE JSON OBJECT EXACTLY LIKE THIS:
{"isReminder": true, "title": "Meeting", "date": "${todayDate}", "time": "14:30", "durationMinutes": 30, "description": null}

DO NOT return multiple JSON objects. DO NOT return JSON array. Return EXACTLY ONE object only.

Schema for the single JSON object you must return:
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
- **TIME CONVERSION (CRITICAL):**
  - 12-hour format: "3pm" = "15:00", "3 PM" = "15:00", "3:45 PM" = "15:45"
  - 12-hour format: "2am" = "02:00", "2 AM" = "02:00", "2:30 AM" = "02:30"
  - 12-hour format: "12pm" (noon) = "12:00", "12am" (midnight) = "00:00"
  - Parse time formats: @10:45, 10:45, at 10:45, 3pm, 3:00 PM, 2 PM, 2PM, etc. Always convert to 24-hour HH:MM format
- Resolve relative dates like "tomorrow", "today" using the provided current date
- If date is not mentioned and isReminder is true, use today's date: ${todayDate}
- Default duration to 30 minutes if not specified and isReminder is true
- Use the provided timezone when interpreting time phrases
- Return null for fields that are not applicable
- ONLY return ONE JSON object, never multiple
- **CRITICAL: Always use the current date ${todayDate} for "today", not any other date**
- **CRITICAL: For PM times, add 12 to the hour. For "2 PM" return "14:00", for "3:45 PM" return "15:45"**
- **CRITICAL: For AM times, keep as-is but pad with zero. For "2 AM" return "02:00", for "9 AM" return "09:00"**

Examples (each shows exactly one JSON object response):
- Input: "Remind me @ 10:45 for visiting bike broker" 
  Output: {"isReminder": true, "title": "Visiting bike broker", "date": "${todayDate}", "time": "10:45", "durationMinutes": 30, "description": null}
- Input: "Set alarm at 3pm for meeting" 
  Output: {"isReminder": true, "title": "Meeting", "date": "${todayDate}", "time": "15:00", "durationMinutes": 30, "description": null}
- Input: "remind me at 2 PM for testing"
  Output: {"isReminder": true, "title": "Testing", "date": "${todayDate}", "time": "14:00", "durationMinutes": 30, "description": null}
- Input: "Remind me tomorrow at 9am for lab"
  Output: {"isReminder": true, "title": "Lab", "date": "${tomorrowDate}", "time": "09:00", "durationMinutes": 30, "description": null}
- Input: "Hello there" 
  Output: {"isReminder": false, "title": null, "date": null, "time": null, "durationMinutes": null, "description": null}

Current time (ISO): ${nowIso}
Today's date: ${todayDate}
Tomorrow's date: ${tomorrowDate}
Timezone: ${timeZone}
User text: ${text}

Remember: Your response must be ONLY a single JSON object. Nothing else. Use the dates provided above (${todayDate} for today).`;

    const completion = await groq.chat.completions.create({
      model: process.env.GROQ_MODEL || "llama-3.1-8b-instant",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
      max_tokens: 800,
    });

    const content = completion.choices[0]?.message?.content || "";
    const jsonStart = content.indexOf("{");

    if (jsonStart === -1) {
      return NextResponse.json({ error: "Invalid parser response" }, { status: 500 });
    }

    // Extract only the first JSON object
    let braceCount = 0;
    let jsonEnd = -1;
    
    for (let i = jsonStart; i < content.length; i++) {
      if (content[i] === "{") braceCount++;
      if (content[i] === "}") {
        braceCount--;
        if (braceCount === 0) {
          jsonEnd = i;
          break;
        }
      }
    }

    if (jsonEnd === -1) {
      return NextResponse.json({ error: "Invalid parser response - malformed JSON" }, { status: 500 });
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

    // Validate and fix time format if needed
    if (parsed.isReminder && parsed.time) {
      // If the time looks wrong (like "01:50" for an afternoon time), try to extract the real time from the input text
      const timeMatch = text.match(/(\d{1,2}):?(\d{2})?\s*(am|pm|AM|PM)/i) || 
                        text.match(/(\d{1,2})\s*(am|pm|AM|PM)/i);
      
      if (timeMatch) {
        const extractedTime = timeMatch[0];
        const convertedTime = convertTo24Hour(extractedTime);
        if (convertedTime) {
          console.log(`Correcting time from LLM "${parsed.time}" to extracted "${convertedTime}"`);
          parsed.time = convertedTime;
        }
      }
    }

    console.log("Final parsed reminder:", parsed);
    return NextResponse.json(parsed);
  } catch (error: any) {
    console.error("Reminder Parse Error:", error);
    return NextResponse.json({ error: error.message || "Failed to parse reminder" }, { status: 500 });
  }
}
