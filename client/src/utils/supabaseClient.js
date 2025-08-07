import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://llqbqlgpepyhstgaltwh.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxscWJxbGdwZXB5aHN0Z2FsdHdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2ODE1OTYsImV4cCI6MjA2OTI1NzU5Nn0.-wIjaWpohI91Q49oTwaeOqQDp0LAvZZ97hBFXUp_8xE';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase URL or Anon Key is missing. Please check your environment variables.');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// For debugging - expose supabase globally
if (process.env.NODE_ENV === 'development') {
  window.supabase = supabase;
}

export default supabase;