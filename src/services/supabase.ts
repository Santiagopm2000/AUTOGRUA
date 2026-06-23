import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://yyuiyllbskobykruzkjj.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5dWl5bGxic2tvYnlrcnV6a2pqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxMjUwMDAsImV4cCI6MjA4NzcwMTAwMH0.khms5lVmJA3KBCsIx87FJ2uTO9-DKA2Oa6AM_FGsBkc";

function cleanValue(val: string | undefined, isUrl = false): string {
  if (!val) return "";
  let clean = val.trim();
  // Remove wrapping double or single quotes
  if ((clean.startsWith('"') && clean.endsWith('"')) || (clean.startsWith("'") && clean.endsWith("'"))) {
    clean = clean.slice(1, -1).trim();
  }
  if (clean === "undefined" || clean === "null" || clean === "") {
    return "";
  }
  
  // Si contiene espacios, palabras de otras variables o es demasiado corto, es inválido
  if (clean.includes(" ") || clean.includes("VITE_") || clean.includes("=") || clean.includes("SUPABASE_")) {
    return "";
  }

  if (isUrl) {
    if (clean.endsWith("/rest/v1/")) {
      clean = clean.slice(0, -9);
    } else if (clean.endsWith("/rest/v1")) {
      clean = clean.slice(0, -8);
    } else if (clean.endsWith("/rest/")) {
      clean = clean.slice(0, -6);
    } else if (clean.endsWith("/rest")) {
      clean = clean.slice(0, -5);
    }
    if (clean.endsWith("/")) {
      clean = clean.slice(0, -1);
    }

    if (!clean.startsWith("http://") && !clean.startsWith("https://")) {
      return "";
    }
    if (clean.length < 20 || !clean.includes("supabase")) {
      return "";
    }
  } else {
    if (clean.length < 50) {
      return "";
    }
  }

  return clean;
}

// Use environment variables if available and valid, otherwise use fallbacks
const envUrl = cleanValue(import.meta.env.VITE_SUPABASE_URL, true);
const envKey = cleanValue(import.meta.env.VITE_SUPABASE_ANON_KEY, false);

let currentUrl = SUPABASE_URL;
let currentKey = SUPABASE_ANON_KEY;

if (envUrl && envKey) {
  currentUrl = envUrl;
  currentKey = envKey;
  console.log("[SUPABASE] Initialized with custom environment credentials:", currentUrl);
} else {
  console.log("[SUPABASE] Initializing with default fallback credentials.");
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
      const cleanedUrl = cleanValue(data.supabaseUrl, true);
      const cleanedKey = cleanValue(data.supabaseAnonKey, false);
      
      if (cleanedUrl && cleanedKey) {
        currentUrl = cleanedUrl;
        currentKey = cleanedKey;
        activeClient = createClient(currentUrl, currentKey);
        console.log("[SUPABASE] Reinitialized client dynamically with runtime config:", currentUrl);
      } else {
        console.log("[SUPABASE] Dynamic config was invalid or empty, keeping fallback config:", currentUrl);
      }
    }
  } catch (err) {
    console.warn("[SUPABASE] Failed to fetch runtime config, using default client:", err);
  }
}
