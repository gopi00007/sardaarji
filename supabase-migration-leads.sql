-- ============================================================
-- SARDAARJI — Email leads table (run in Supabase SQL Editor)
-- Stores emails captured by the free-guide / newsletter form so
-- you can build a mailing list (your #1 long-term revenue asset).
-- ============================================================

create table if not exists leads (
  id          bigint generated always as identity primary key,
  email       text not null,
  source      text,
  created_at  timestamptz default now()
);

alter table leads enable row level security;

-- Anyone (even logged-out visitors) may submit their email, but nobody
-- can read the list from the public site — only you, in the Supabase dashboard.
create policy "anyone can submit a lead" on leads for insert with check (true);

-- Optional: prevent exact duplicate spam of the same email+source
create unique index if not exists leads_email_source_idx on leads (email, source);
