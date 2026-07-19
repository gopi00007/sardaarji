-- ============================================================
-- SARDAARJI — Database tables (run this in Supabase SQL Editor)
-- Copy ALL of this, paste into Supabase → SQL Editor → Run.
-- It creates the filing cabinet: profiles, trades, workouts, Q&A.
-- ============================================================

-- 1) PROFILES  (one row per member — public, so the community can see them)
create table if not exists profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text,
  role        text default 'trader',          -- 'trader' | 'fitness' | 'both'
  bio         text,
  goal        text,
  created_at  timestamptz default now()
);

-- 2) TRADES  (private — each member sees only their own)
create table if not exists trades (
  id          bigint generated always as identity primary key,
  user_id     uuid references auth.users(id) on delete cascade,
  symbol      text,
  side        text,                            -- 'Long' | 'Short'
  entry       numeric,
  exit        numeric,
  qty         numeric,
  trade_date  date,
  notes       text,
  created_at  timestamptz default now()
);

-- 3) WORKOUTS  (private)
create table if not exists workouts (
  id          bigint generated always as identity primary key,
  user_id     uuid references auth.users(id) on delete cascade,
  name        text,
  type        text,                            -- Strength | Cardio | Flexibility / Yoga | Sports
  duration    integer,
  intensity   integer,
  work_date   date,
  notes       text,
  created_at  timestamptz default now()
);

-- 4) QUESTIONS  (public community board)
create table if not exists questions (
  id          bigint generated always as identity primary key,
  user_id     uuid references auth.users(id) on delete set null,
  author      text,
  title       text,
  category    text,                            -- Trading | Fitness | General
  created_at  timestamptz default now()
);

-- 5) ANSWERS  (public — replies to questions)
create table if not exists answers (
  id            bigint generated always as identity primary key,
  question_id   bigint references questions(id) on delete cascade,
  user_id       uuid references auth.users(id) on delete set null,
  who           text,
  body          text,
  created_at    timestamptz default now()
);

-- ============================================================
-- SECURITY (Row Level Security): who is allowed to see/edit what
-- ============================================================
alter table profiles  enable row level security;
alter table trades    enable row level security;
alter table workouts  enable row level security;
alter table questions enable row level security;
alter table answers   enable row level security;

-- Profiles: everyone can read; you can only create/edit your own
create policy "profiles readable by all"   on profiles for select using (true);
create policy "insert own profile"          on profiles for insert with check (auth.uid() = id);
create policy "update own profile"          on profiles for update using (auth.uid() = id);

-- Trades: fully private to the owner
create policy "own trades select" on trades for select using (auth.uid() = user_id);
create policy "own trades insert" on trades for insert with check (auth.uid() = user_id);
create policy "own trades delete" on trades for delete using (auth.uid() = user_id);

-- Workouts: fully private to the owner
create policy "own workouts select" on workouts for select using (auth.uid() = user_id);
create policy "own workouts insert" on workouts for insert with check (auth.uid() = user_id);
create policy "own workouts delete" on workouts for delete using (auth.uid() = user_id);

-- Questions & answers: everyone reads; logged-in members can post
create policy "questions readable by all" on questions for select using (true);
create policy "members post questions"    on questions for insert with check (auth.uid() = user_id);
create policy "answers readable by all"   on answers   for select using (true);
create policy "members post answers"      on answers   for insert with check (auth.uid() = user_id);

-- ============================================================
-- Auto-create a blank profile the moment someone signs up with Gmail
-- ============================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', 'New Member'), 'trader');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
