import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://yyuiyllbskobykruzkjj.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5dWl5bGxic2tvYnlrcnV6a2pqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxMjUwMDAsImV4cCI6MjA4NzcwMTAwMH0.khms5lVmJA3KBCsIx87FJ2uTO9-DKA2Oa6AM_FGsBkc";

// Use environment variables if available, otherwise use fallbacks
let currentUrl = import.meta.env.VITE_SUPABASE_URL || SUPABASE_URL;
let currentKey = import.meta.env.VITE_SUPABASE_ANON_KEY || SUPABASE_ANON_KEY;

// Create the active client (which can change) and expose a proxy so imported instances update automatically
let activeClient = createClient(currentUrl, currentKey);

export const supabase = new Proxy({} as any, {
  get(target, prop) {
    return Reflect.get(activeClient, prop);
  }
});

export async function initializeRuntimeSupabase() {
  try {
    const res = await fetch("/api/config");
    if (res.ok) {
      const data = await res.json();
      if (data.supabaseUrl && data.supabaseAnonKey) {
        currentUrl = data.supabaseUrl;
        currentKey = data.supabaseAnonKey;
        activeClient = createClient(currentUrl, currentKey);
        console.log("[SUPABASE] Reinitialized client dynamically with runtime config:", currentUrl);
      }
    }
  } catch (err) {
    console.warn("[SUPABASE] Failed to fetch runtime config, using default client:", err);
  }
}
