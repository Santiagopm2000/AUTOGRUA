import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://yyuiyllbskobykruzkjj.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5dWl5bGxic2tvYnlrcnV6a2pqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxMjUwMDAsImV4cCI6MjA4NzcwMTAwMH0.khms5lVmJA3KBCsIx87FJ2uTO9-DKA2Oa6AM_FGsBkc";

function cleanValue(val: string | undefined): string {
  if (!val) return "";
  let clean = val.trim();
  // Remove wrapping double or single quotes
  if ((clean.startsWith('"') && clean.endsWith('"')) || (clean.startsWith("'") && clean.endsWith("'"))) {
    clean = clean.slice(1, -1).trim();
  }
  if (clean === "undefined" || clean === "null" || clean === "") {
    return "";
  }
  return clean;
}

// Use environment variables if available and valid, otherwise use fallbacks
let currentUrl = cleanValue(import.meta.env.VITE_SUPABASE_URL);
if (!currentUrl.startsWith("http://") && !currentUrl.startsWith("https://")) {
  currentUrl = SUPABASE_URL;
}

let currentKey = cleanValue(import.meta.env.VITE_SUPABASE_ANON_KEY);
if (!currentKey) {
  currentKey = SUPABASE_ANON_KEY;
}

// Create the active client (which can change) and expose a proxy so imported instances update automatically
let activeClient = createClient(currentUrl, currentKey);

export const supabase = new Proxy({} as any, {
  get(target, prop) {
    const val = Reflect.get(activeClient, prop);
    if (typeof val === 'function') {
      return val.bind(activeClient);
    }
    return val;
  }
});

export async function initializeRuntimeSupabase() {
  try {
    const res = await fetch("/api/config");
    if (res.ok) {
      const data = await res.json();
      const cleanedUrl = cleanValue(data.supabaseUrl);
      const cleanedKey = cleanValue(data.supabaseAnonKey);
      
      if (cleanedUrl && cleanedKey && (cleanedUrl.startsWith("http://") || cleanedUrl.startsWith("https://"))) {
        currentUrl = cleanedUrl;
        currentKey = cleanedKey;
        activeClient = createClient(currentUrl, currentKey);
        console.log("[SUPABASE] Reinitialized client dynamically with runtime config:", currentUrl);
      } else {
        console.log("[SUPABASE] Dynamic config was invalid, keeping active config:", currentUrl);
      }
    }
  } catch (err) {
    console.warn("[SUPABASE] Failed to fetch runtime config, using default client:", err);
  }
}
