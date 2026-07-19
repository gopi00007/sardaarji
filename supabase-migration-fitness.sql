-- ============================================================
-- SARDAARJI — Fitness intake fields (run in Supabase SQL Editor)
-- Adds the "basic info" columns to profiles so each member's
-- meal & workout plan is saved and follows them across devices.
-- Safe to run once; "if not exists" means re-running does no harm.
-- ============================================================

alter table profiles add column if not exists sex           text;
alter table profiles add column if not exists age           integer;
alter table profiles add column if not exists height_cm     numeric;
alter table profiles add column if not exists weight_kg     numeric;
alter table profiles add column if not exists activity      text;
alter table profiles add column if not exists goal          text;
alter table profiles add column if not exists diet          text;
alter table profiles add column if not exists days_per_week integer;
