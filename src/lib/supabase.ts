import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Cached client
let clientInstance: SupabaseClient | null = null;
let lastUrl = "";
let lastKey = "";

export function getSupabaseCredentials(): { url: string; key: string } {
  // Check browser localStorage first for runtime user overrides in Settings
  if (typeof window !== "undefined") {
    const customUrl = localStorage.getItem("road_to_jan16_supabase_url");
    const customKey = localStorage.getItem("road_to_jan16_supabase_key");
    if (customUrl && customKey) {
      return { url: customUrl.trim(), key: customKey.trim() };
    }
  }

  // Fallback to Next.js environment variables
  const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const envKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  return { url: envUrl.trim(), key: envKey.trim() };
}

export function isSupabaseConfigured(): boolean {
  const { url, key } = getSupabaseCredentials();
  return (
    Boolean(url) &&
    Boolean(key) &&
    url.startsWith("https://") &&
    !url.includes("your-project") &&
    key !== "your-anon-key"
  );
}

export function getSupabaseClient(): SupabaseClient | null {
  const { url, key } = getSupabaseCredentials();
  if (!url || !key || !isSupabaseConfigured()) {
    return null;
  }

  if (!clientInstance || lastUrl !== url || lastKey !== key) {
    clientInstance = createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
    lastUrl = url;
    lastKey = key;
  }

  return clientInstance;
}
