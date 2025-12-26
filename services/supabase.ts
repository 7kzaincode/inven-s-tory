import { createClient } from '@supabase/supabase-js';

// Hardcoded for current environment functionality. 
// Note: When deploying to Vercel, it is best practice to use process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseUrl = 'https://tttmwegnolhsbjyjzfhx.supabase.co';
const supabaseAnonKey = 'sb_publishable_sijijZDWGZKwamc4ikVGxw_OLQUeNNq';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);