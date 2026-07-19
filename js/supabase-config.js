/* ============ SARDAARJI — Supabase connection ============
   This file holds your public project settings and creates the
   client the rest of the app uses. The anon key here is the
   public, website-safe key (never put the service_role key here).
=========================================================== */

const SUPABASE_URL = 'https://nwqxofmgdbcjpflkpngn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53cXhvZm1nZGJjanBmbGtwbmduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ0MjY2MzksImV4cCI6MjEwMDAwMjYzOX0.CyE-xcRwJUUqiC05N_nqpKTw5xzmWZhMi_qkdKvtszQ';

// `supabase` here is the library loaded from the CDN; `sb` is OUR client.
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
