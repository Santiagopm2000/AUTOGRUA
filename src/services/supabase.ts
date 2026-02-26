import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://yyuiyllbskobykruzkjj.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5dWl5bGxic2tvYnlrcnV6a2pqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxMjUwMDAsImV4cCI6MjA4NzcwMTAwMH0.khms5lVmJA3KBCsIx87FJ2uTO9-DKA2Oa6AM_FGsBkc";

// Use environment variables if available, otherwise use fallbacks
const url = import.meta.env.VITE_SUPABASE_URL || SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY || SUPABASE_ANON_KEY;

export const supabase = createClient(url, key);
