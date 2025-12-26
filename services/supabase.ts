import { createClient } from '@supabase/supabase-js';

// Fallback values provided for the project
const FALLBACK_URL = "https://tttmwegnolhsbjyjzfhx.supabase.co";
const FALLBACK_KEY = "sb_publishable_sijijZDWGZKwamc4ikVGxw_OLQUeNNq";

const getEnv = (key: string): string => {
  try {
    // Try process.env (Vite/Node) or import.meta.env (Vite)
    return (window as any).process?.env?.[key] || (import.meta as any).env?.[key] || "";
  } catch {
    return "";
  }
};

const supabaseUrl = getEnv('VITE_SUPABASE_URL') || FALLBACK_URL;
const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY') || FALLBACK_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase credentials are missing. Archive functionality will be limited.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);