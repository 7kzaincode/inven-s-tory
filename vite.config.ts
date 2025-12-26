import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    // This ensures that 'process.env' exists in the browser context
    // and maps the specific keys required by your services.
    'process.env': {
      API_KEY: JSON.stringify(process.env.API_KEY || ''),
      VITE_SUPABASE_URL: JSON.stringify(process.env.VITE_SUPABASE_URL || 'https://tttmwegnolhsbjyjzfhx.supabase.co'),
      VITE_SUPABASE_ANON_KEY: JSON.stringify(process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_sijijZDWGZKwamc4ikVGxw_OLQUeNNq')
    }
  },
  server: {
    port: 3000,
    open: true
  }
});