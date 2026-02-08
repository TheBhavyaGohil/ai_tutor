import { NextResponse } from "next/server";
import crypto from "crypto";
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

function signState(payload: Record<string, unknown>): string {
  const secret = requireEnv("GOOGLE_OAUTH_STATE_SECRET");
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", secret).update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}

export async function POST(req: Request) {
  try {
    const { userId, nextPath, currentView } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    const oauth2Client = createOAuthClient();
    const state = signState({ userId, nextPath: nextPath || "/", currentView: currentView || "dashboard", ts: Date.now() });

    const url = oauth2Client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: ["https://www.googleapis.com/auth/calendar.events"],
      state,
    });

    return NextResponse.json({ url });
  } catch (error: any) {
    console.error("Google OAuth URL Error:", error);
    return NextResponse.json({ error: error.message || "Failed to start Google OAuth" }, { status: 500 });
  }
}
