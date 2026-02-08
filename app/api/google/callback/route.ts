import { NextResponse } from "next/server";
import crypto from "crypto";
import { google } from "googleapis";
import { createClient } from "@supabase/supabase-js";

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

function verifyState(state: string) {
  const secret = requireEnv("GOOGLE_OAUTH_STATE_SECRET");
  const [encoded, signature] = state.split(".");
  if (!encoded || !signature) throw new Error("Invalid state format");

  const expected = crypto.createHmac("sha256", secret).update(encoded).digest("base64url");
  if (expected !== signature) throw new Error("Invalid state signature");

  const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
  const ts = Number(payload.ts || 0);
  const maxAgeMs = 30 * 60 * 1000;
  if (!ts || Date.now() - ts > maxAgeMs) throw new Error("State expired");

  return payload as { userId: string; nextPath?: string; currentView?: string };
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");

    if (!code || !state) {
      return NextResponse.json({ error: "Missing code or state" }, { status: 400 });
    }

    const { userId, nextPath, currentView } = verifyState(state);
    if (!userId) {
      return NextResponse.json({ error: "Invalid state payload" }, { status: 400 });
    }

    const oauth2Client = createOAuthClient();
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.refresh_token) {
      return NextResponse.json({ error: "Missing refresh token" }, { status: 400 });
    }

    const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
    const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
    const supabaseService = createClient(supabaseUrl, serviceRoleKey);

    const expiryDate = tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null;

    const { error } = await supabaseService
      .from("google_auth")
      .upsert({
        user_id: userId,
        access_token: tokens.access_token || null,
        refresh_token: tokens.refresh_token,
        scope: tokens.scope || null,
        token_type: tokens.token_type || null,
        expiry_date: expiryDate,
      });

    if (error) throw error;

    const redirectBase = process.env.NEXT_PUBLIC_APP_URL || url.origin;
    const redirectTo = new URL("/", redirectBase);
    
    // Preserve the current view/page
    if (currentView) {
      redirectTo.searchParams.set("view", currentView);
    }
    redirectTo.searchParams.set("google", "connected");

    return NextResponse.redirect(redirectTo);
  } catch (error: any) {
    console.error("Google OAuth Callback Error:", error);
    const fallbackBase = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
    const redirectTo = new URL("/", fallbackBase);
    redirectTo.searchParams.set("google", "error");
    return NextResponse.redirect(redirectTo);
  }
}
