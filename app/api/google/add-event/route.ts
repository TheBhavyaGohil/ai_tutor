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
      const missingFields = [];
      if (!event?.summary) missingFields.push('summary');
      if (!event?.start) missingFields.push('start');
      if (!event?.end) missingFields.push('end');
      if (!event?.timeZone) missingFields.push('timeZone');
      
      const errorMsg = `Missing event details: ${missingFields.join(', ')}`;
      console.error(errorMsg, { event });
      return NextResponse.json({ error: errorMsg }, { status: 400 });
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
      console.error("Failed to get refresh token:", tokenError);
      return NextResponse.json({ error: "Google Calendar not connected" }, { status: 400 });
    }

    const oauth2Client = createOAuthClient();
    oauth2Client.setCredentials({ refresh_token: tokenRow.refresh_token });

    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    // Normalize timezone (some deprecated names need to be mapped)
    let timeZone = event.timeZone;
    const timeZoneMap: { [key: string]: string } = {
      'Asia/Calcutta': 'Asia/Kolkata',
    };
    if (timeZoneMap[timeZone]) {
      console.log(`Normalizing timezone from ${timeZone} to ${timeZoneMap[timeZone]}`);
      timeZone = timeZoneMap[timeZone];
    }

    // Get UTC offset for the timezone and date
    // For Asia/Kolkata, the offset is always +05:30
    const getTimezoneOffset = (tz: string): string => {
      if (tz === 'Asia/Kolkata' || tz === 'Asia/Calcutta') return '+05:30';
      // Add more timezone offsets as needed
      return '+00:00';
    };

    const offset = getTimezoneOffset(timeZone);

    console.log("Creating calendar event with details:", {
      summary: event.summary,
      start: event.start,
      end: event.end,
      timeZone: timeZone,
      offset: offset
    });

    // Validate datetime format
    const dateTimeRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/;
    if (!dateTimeRegex.test(event.start) || !dateTimeRegex.test(event.end)) {
      console.error("Invalid datetime format:", { 
        start: event.start, 
        startValid: dateTimeRegex.test(event.start),
        end: event.end,
        endValid: dateTimeRegex.test(event.end)
      });
      return NextResponse.json({ error: "Invalid datetime format. Expected YYYY-MM-DDTHH:MM:SS" }, { status: 400 });
    }

    // Add timezone offset to datetime strings
    const startWithOffset = `${event.start}${offset}`;
    const endWithOffset = `${event.end}${offset}`;

    console.log("Event with offset:", { start: startWithOffset, end: endWithOffset });

    const response = await calendar.events.insert({
      calendarId: "primary",
      requestBody: {
        summary: event.summary,
        description: event.description || "",
        start: {
          dateTime: startWithOffset,
        },
        end: {
          dateTime: endWithOffset,
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'popup', minutes: 1 },
          ],
        },
      },
    });

    console.log("Event created successfully:", response.data);

    if (!response.data.id) {
      return NextResponse.json({ error: "Event created but no ID returned" }, { status: 500 });
    }

    return NextResponse.json({ success: true, eventId: response.data.id });
  } catch (error: any) {
    console.error("Google Add Event Error:", {
      message: error.message,
      code: error.code,
      status: error.status,
      errors: error.errors,
      fullError: JSON.stringify(error, null, 2),
    });
    
    // Try to extract more details from the error
    if (error.errors && Array.isArray(error.errors)) {
      console.error("Detailed errors:", error.errors.map((e: any) => ({
        domain: e.domain,
        reason: e.reason,
        message: e.message,
      })));
    }
    
    return NextResponse.json({ 
      error: error.message || "Failed to add event",
      details: error.errors?.map((e: any) => e.message).join(', ') || ''
    }, { status: 500 });
  }
}
