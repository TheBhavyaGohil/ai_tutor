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
    const { userId, accessToken, date } = await req.json();

    if (!userId || !accessToken || !date) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
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

    // Get events for the specified date
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const response = await calendar.events.list({
      calendarId: "primary",
      timeMin: startOfDay.toISOString(),
      timeMax: endOfDay.toISOString(),
      singleEvents: true,
      orderBy: "startTime",
    });

    const events = (response.data.items || []).map(event => ({
      id: event.id,
      title: event.summary || "Untitled",
      startTime: event.start?.dateTime || event.start?.date,
      endTime: event.end?.dateTime || event.end?.date,
      description: event.description,
    }));

    return NextResponse.json({ success: true, count: events.length, events });
  } catch (error: any) {
    console.error("Google List Events Error:", error);
    return NextResponse.json({ error: error.message || "Failed to list events" }, { status: 500 });
  }
}
