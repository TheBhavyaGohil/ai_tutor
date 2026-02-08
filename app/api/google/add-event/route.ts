import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { google } from "googleapis";

export const runtime = "nodejs";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name} environment variable`);
  return value;
}

function createOAuthClient() {
  const clientId = requireEnv("GOOGLE_CLIENT_ID");
  const clientSecret = requireEnv("GOOGLE_CLIENT_SECRET");
  const redirectUri = requireEnv("GOOGLE_REDIRECT_URI");
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export async function POST(req: Request) {
  try {
    const { userId, accessToken, event } = await req.json();

    if (!userId || !accessToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!event?.summary || !event?.start || !event?.end || !event?.timeZone) {
      return NextResponse.json({ error: "Missing event details" }, { status: 400 });
    }

    const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
    const supabaseKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
    const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

    const supabaseAuth = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    });

    const { data: userData, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || userData?.user?.id !== userId) {
      return NextResponse.json({ error: "Invalid user" }, { status: 401 });
    }

    const supabaseService = createClient(supabaseUrl, serviceRoleKey);
    const { data: tokenRow, error: tokenError } = await supabaseService
      .from("google_auth")
      .select("refresh_token")
      .eq("user_id", userId)
      .single();

    if (tokenError || !tokenRow?.refresh_token) {
      return NextResponse.json({ error: "Google Calendar not connected" }, { status: 400 });
    }

    const oauth2Client = createOAuthClient();
    oauth2Client.setCredentials({ refresh_token: tokenRow.refresh_token });

    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    const response = await calendar.events.insert({
      calendarId: "primary",
      requestBody: {
        summary: event.summary,
        description: event.description || "",
        start: {
          dateTime: event.start,
          timeZone: event.timeZone,
        },
        end: {
          dateTime: event.end,
          timeZone: event.timeZone,
        },
      },
    });

    return NextResponse.json({ success: true, eventId: response.data.id });
  } catch (error: any) {
    console.error("Google Add Event Error:", error);
    return NextResponse.json({ error: error.message || "Failed to add event" }, { status: 500 });
  }
}
