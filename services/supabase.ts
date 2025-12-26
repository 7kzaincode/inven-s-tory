import { createClient } from '@supabase/supabase-js';

// Absolute fallbacks for project connectivity
const FALLBACK_URL = "https://tttmwegnolhsbjyjzfhx.supabase.co";
const FALLBACK_KEY = "sb_publishable_sijijZDWGZKwamc4ikVGxw_OLQUeNNq";

const getSafeEnv = (key: string): string => {
  try {
    // 1. Check window.process.env (our custom shim)
    if (typeof window !== 'undefined' && (window as any).process?.env?.[key]) {
      return (window as any).process.env[key];
    }
    // 2. Check build-time process.env
    if (typeof process !== 'undefined' && process.env && (process.env as any)[key]) {
      return (process.env as any)[key];
    }
    // 3. Check Vite-specific import.meta.env with optional chaining
    const meta = import.meta as any;
    if (meta?.env && meta.env[key]) {
      return meta.env[key];
    }
  } catch (e) {
    // Prevent crashes during early initialization
  }
  return "";
};

const supabaseUrl = getSafeEnv('VITE_SUPABASE_URL') || FALLBACK_URL;
const supabaseAnonKey = getSafeEnv('VITE_SUPABASE_ANON_KEY') || FALLBACK_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);