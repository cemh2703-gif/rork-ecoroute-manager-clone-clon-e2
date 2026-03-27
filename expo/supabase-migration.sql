-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/nbtzzysnqezxuypmrmrm/sql

create table if not exists public.materials (
  id text primary key,
  name text not null,
  color text not null,
  icon text
);

create table if not exists public.locations (
  id text primary key,
  name text not null,
  address text not null,
  type text not null,
  latitude double precision,
  longitude double precision,
  material_ids text[] not null default '{}',
  frequency_days integer not null default 7,
  last_collected text,
  next_collection text,
  fill_history jsonb not null default '[]',
  current_fill_level integer not null default 0,
  notes text,
  photo_uri text,
  active boolean not null default true
);

create table if not exists public.schedules (
  id text primary key,
  date text not null,
  stops jsonb not null default '[]',
  completed boolean not null default false
);

create table if not exists public.overrides (
  id text primary key,
  location_id text not null references public.locations(id) on delete cascade,
  original_date text,
  new_date text not null,
  reason text not null,
  created_at text not null
);

-- Enable Row Level Security (allow all for anon key)
alter table public.materials enable row level security;
alter table public.locations enable row level security;
alter table public.schedules enable row level security;
alter table public.overrides enable row level security;

-- Policies: allow full access with anon key
create policy "allow all materials" on public.materials for all using (true) with check (true);
create policy "allow all locations" on public.locations for all using (true) with check (true);
create policy "allow all schedules" on public.schedules for all using (true) with check (true);
create policy "allow all overrides" on public.overrides for all using (true) with check (true);
