import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { userId, accessToken } = await req.json();

    if (!userId || !accessToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: "Missing Supabase config" }, { status: 500 });
    }

    const supabaseAuth = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    });

    const { data, error } = await supabaseAuth
      .from("google_auth")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;

    return NextResponse.json({ connected: !!data });
  } catch (error: any) {
    console.error("Google Status Error:", error);
    return NextResponse.json({ error: error.message || "Failed to check Google status" }, { status: 500 });
  }
}
