import { NextResponse } from "next/server";
import { Groq } from "groq-sdk";
import { createClient } from '@supabase/supabase-js';

export const runtime = "nodejs";

// Initialize Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, prompt, schedule, id, name, userEmail } = body;

    // --- 1. AI GENERATION ---
    if (action === "generate") {
      const GROQ_API_KEY = process.env.GROQ_API_KEY;
      if (!GROQ_API_KEY) return NextResponse.json({ error: "Missing API Key" }, { status: 500 });
      
      const groq = new Groq({ apiKey: GROQ_API_KEY });

      // STRICTER PROMPT to force valid JSON
      const systemPrompt = `
        You are a strict JSON generator. 
        Output ONLY a valid JSON Array. 
        Do not output Markdown (no \`\`\`).
        Use double quotes (") for all keys and strings. No single quotes.
        Schema: [{ "time": "HH:MM", "activity": "string", "status": "PENDING", "day": "string (optional)" }]
        RULES: 
        1. If request implies multiple days, include "day" field.
        2. If single day, OMIT "day".
      `;

      const completion = await groq.chat.completions.create({
        model: process.env.GROQ_MODEL || "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: systemPrompt }, 
          { role: "user", content: prompt }
        ],
        temperature: 0.1, 
      });

      let content = completion.choices[0]?.message?.content || "";

      // Cleaning logic
      content = content.replace(/```json/g, "").replace(/```/g, "");
      const jsonStart = content.indexOf('[');
      const jsonEnd = content.lastIndexOf(']');

      if (jsonStart === -1 || jsonEnd === -1) {
        throw new Error("AI did not return a JSON Array.");
      }

      const jsonStr = content.substring(jsonStart, jsonEnd + 1).trim();
      const generatedSchedule = JSON.parse(jsonStr);
      
      return NextResponse.json({ schedule: generatedSchedule });
    }

    // --- DATABASE OPERATIONS ---
    
    // Security Gate
    if (!userEmail) {
      return NextResponse.json({ error: "Unauthorized: No user authenticated." }, { status: 401 });
    }

    if (action === "save") {
      const { data, error } = await supabase
        .from('schedules')
        .insert([{ content: schedule, name: name, user_email: userEmail }])
        .select()
        .single();
      
      if (error) throw error;
      return NextResponse.json({ data });
    }

    if (action === "load_list") {
      const { data, error } = await supabase
        .from('schedules')
        .select('id, name, created_at')
        .eq('user_email', userEmail)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return NextResponse.json({ data });
    }

    if (action === "load_one") {
      const { data, error } = await supabase
        .from('schedules')
        .select('*')
        .eq('id', id)
        .eq('user_email', userEmail)
        .single();
      if (error) throw error;
      return NextResponse.json({ data });
    }

    if (action === "update") {
      const { error } = await supabase
        .from('schedules')
        .update({ content: schedule, name: name })
        .eq('id', id)
        .eq('user_email', userEmail);
      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    if (action === "delete") {
      const { error } = await supabase
        .from('schedules')
        .delete()
        .eq('id', id)
        .eq('user_email', userEmail);
      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  } catch (error: any) {
    console.error("API Error:", error);
    return NextResponse.json({ error: error.message || "Server Error" }, { status: 500 });
  }
}