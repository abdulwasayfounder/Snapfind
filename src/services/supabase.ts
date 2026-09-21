import { createClient, SupabaseClient } from "@supabase/supabase-js";

const rawUrl = (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_SUPABASE_URL) || (typeof process !== "undefined" && process.env?.VITE_SUPABASE_URL);
const rawKey = (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_SUPABASE_ANON_KEY) || (typeof process !== "undefined" && process.env?.VITE_SUPABASE_ANON_KEY);

function isValidUrl(urlStr: string | undefined): boolean {
  if (!urlStr || typeof urlStr !== "string") return false;
  try {
    const parsed = new URL(urlStr);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

const hasValidUrl = Boolean(
  rawUrl &&
    isValidUrl(rawUrl) &&
    !rawUrl.includes("your-project") &&
    !rawUrl.includes("placeholder") &&
    !rawUrl.includes("snapfind-app.supabase.co")
);

const hasValidKey = Boolean(
  rawKey &&
    typeof rawKey === "string" &&
    rawKey.trim().length > 0 &&
    !rawKey.includes("placeholder") &&
    !rawKey.includes("your-anon-key") &&
    !rawKey.includes("supabase_anon_key")
);

// 1. Verify VITE_SUPABASE_URL comes from environment variables and is not placeholder
export const supabaseUrl: string = hasValidUrl ? rawUrl! : "https://snapfind-app.supabase.co";

// 2. Verify VITE_SUPABASE_ANON_KEY comes from environment variables
export const supabaseAnonKey: string = hasValidKey
  ? rawKey!
  : "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNuYXBmaW5kIiwicm9sZSI6ImFub24iLCJpYXQiOjE2Nzg5MDAwMDAsImV4cCI6MjAwNDQ3NjAwMH0.supabase_anon_key";

// 4. Ensure isSupabaseConfigured reflects actual availability of credentials
export const isSupabaseConfigured: boolean = hasValidUrl && hasValidKey;

// 5. Masked key output for verification
const maskedKey = supabaseAnonKey ? `${supabaseAnonKey.slice(0, 10)}...${supabaseAnonKey.slice(-6)}` : "[HIDDEN]";
console.log(`[Supabase Init] Active Supabase URL: ${supabaseUrl} (Anon Key: ${maskedKey})`);

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});


