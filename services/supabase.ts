import { createClient } from '@supabase/supabase-js';

// Hardcoded fallbacks ensure the app works even if env vars aren't injected yet
const FALLBACK_URL = "https://tttmwegnolhsbjyjzfhx.supabase.co";
const FALLBACK_KEY = "sb_publishable_sijijZDWGZKwamc4ikVGxw_OLQUeNNq";

/**
 * Safely retrieves environment variables across different hosting environments
 * (Vercel, Vite, Local Server) without throwing ReferenceErrors.
 */
const getSafeEnv = (key: string): string => {
  try {
    // 1. Try Vite/Vercel standard
    if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
      const val = (import.meta as any).env[key];
      if (val) return val;
    }
    // 2. Try Node/Shim standard
    if (typeof process !== 'undefined' && process.env) {
      const val = (process.env as any)[key];
      if (val) return val;
    }
    // 3. Try Window global
    if (typeof window !== 'undefined' && (window as any).process?.env) {
      const val = (window as any).process.env[key];
      if (val) return val;
    }
  } catch (e) {
    // Silent fail to prevent blank page
  }
  return "";
};

const supabaseUrl = getSafeEnv('VITE_SUPABASE_URL') || FALLBACK_URL;
const supabaseAnonKey = getSafeEnv('VITE_SUPABASE_ANON_KEY') || FALLBACK_KEY;

// Create client with absolute fallbacks to prevent crash
export const supabase = createClient(supabaseUrl, supabaseAnonKey);