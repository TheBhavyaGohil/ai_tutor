import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from '@supabase/supabase-js';

export const runtime = "nodejs";

// Initialize Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    // Expect userId + accessToken for RLS
    const { action, prompt, schedule, id, name, userId, accessToken } = body;

    // --- 1. AI GENERATION (Google Generative AI) ---
    if (action === "generate") {
      const apiKey = process.env.GENERATIVE_API_KEY || "";
      if (!apiKey) {
        return NextResponse.json({ error: "Missing GENERATIVE_API_KEY in environment" }, { status: 500 });
      }
      
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ 
        model: "gemini-2.5-flash",
        generationConfig: { responseMimeType: "application/json" }
      });

      const instruction = `You are a strict JSON generator. 
      Output ONLY a valid JSON Array. 
      Do not output Markdown.
      Use double quotes (") for all keys and strings. No single quotes.
      Schema: [{ "time": "hh:mm tt/ap", "activity": "string", "status": "PENDING", "day": "string (optional)" }]
      RULES: 
      1. If request implies multiple days, include "day" field.
      2. If single day, OMIT "day".
      User request: ${prompt}`;

      const result = await model.generateContent(instruction);
      const response = await result.response;
      const text = response.text();

      if (!text) {
        return NextResponse.json({ error: "Empty response from AI" }, { status: 500 });
      }

      // Parse and Normalize
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
    }

    // --- DATABASE OPERATIONS ---
    
    // Security Gate: Check userId + accessToken
    if (!userId || !accessToken) {
      return NextResponse.json({ error: "Unauthorized: No user authenticated." }, { status: 401 });
    }

    const supabaseAuth = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    });

    // All queries use 'user_id' for RLS

    if (action === "save") {
      const { data, error } = await supabaseAuth
        .from('schedules')
        .insert([{ content: schedule, name: name, user_id: userId }])
        .select()
        .single();
      
      if (error) throw error;
      return NextResponse.json({ data });
    }

    if (action === "load_list") {
      const { data, error } = await supabaseAuth
        .from('schedules')
        .select('id, name, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return NextResponse.json({ data });
    }

    if (action === "load_one") {
      const { data, error } = await supabaseAuth
        .from('schedules')
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .single();
      if (error) throw error;
      return NextResponse.json({ data });
    }

    if (action === "update") {
      const { error } = await supabaseAuth
        .from('schedules')
        .update({ content: schedule, name: name })
        .eq('id', id)
        .eq('user_id', userId);
      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    if (action === "delete") {
      const { error } = await supabaseAuth
        .from('schedules')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);
      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  } catch (error: any) {
    console.error("API Error:", error);
    return NextResponse.json({ error: error.message || "Server Error" }, { status: 500 });
  }
}