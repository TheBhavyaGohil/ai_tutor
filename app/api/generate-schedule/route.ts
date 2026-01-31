import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();
    
    // 1. Setup API (Use 2.5-flash for speed and reliability)
    const apiKey = process.env.GENERATIVE_API_KEY || "";
    if (!apiKey) {
      return NextResponse.json({ error: "Missing GENERATIVE_API_KEY in environment" }, { status: 500 });
    }
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      generationConfig: { responseMimeType: "application/json" }
    });

    const instruction = `You are a Timetable Generator. 
    Return a JSON array of objects with keys: "time", "subject", "status". 
    "status" must be "DONE", "PENDING", or "UPCOMING".
    User request: ${prompt}`;

    // 2. Call Gemini
    const result = await model.generateContent(instruction);
    const response = await result.response;
    const text = response.text();

    if (!text) {
      return NextResponse.json({ error: "Empty response from AI" }, { status: 500 });
    }

    // 3. Parse and Normalize
    let scheduleArray = [];
    const parsed = JSON.parse(text);

    if (Array.isArray(parsed)) {
      scheduleArray = parsed;
    } else if (parsed.schedule && Array.isArray(parsed.schedule)) {
      scheduleArray = parsed.schedule;
    } else {
      // Look for any array inside the object
      const firstArray = Object.values(parsed).find(v => Array.isArray(v));
      scheduleArray = Array.isArray(firstArray) ? firstArray : [];
    }

    return NextResponse.json({ schedule: scheduleArray });

  } catch (err: any) {
    console.error("API Error:", err);
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}