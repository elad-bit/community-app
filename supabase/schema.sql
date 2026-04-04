-- ================================================
-- Community App - Supabase Schema
-- הרץ את הקוד הזה ב: Supabase Dashboard -> SQL Editor
-- ================================================

-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- ================================================
-- ENUMS
-- ================================================

create type member_status as enum ('active', 'inactive', 'pending');
create type member_role as enum ('admin', 'moderator', 'member');

-- ================================================
-- TABLES
-- ================================================

-- Members table
create table if not exists public.members (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  email text not null unique,
  phone text,
  avatar_url text,
  status member_status not null default 'active',
  role member_role not null default 'member',
  tags text[],
  notes text,
  created_at timestamptz default now() not null,
  updated_at timestamptz
);

-- Activity log table
create table if not exists public.activity_log (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  message text not null,
  icon text not null default '📋',
  time text not null default 'עכשיו',
  metadata jsonb,
  created_at timestamptz default now() not null
);

-- ================================================
-- INDEXES
-- ================================================

create index if not exists idx_members_email on public.members(email);
create index if not exists idx_members_status on public.members(status);
create index if not exists idx_members_created_at on public.members(created_at desc);
create index if not exists idx_activity_log_created_at on public.activity_log(created_at desc);
create index if not exists idx_activity_log_user_id on public.activity_log(user_id);

-- ================================================
-- ROW LEVEL SECURITY (RLS)
-- ================================================

-- Enable RLS
alter table public.members enable row level security;
alter table public.activity_log enable row level security;

-- Members policies
create policy "Authenticated users can view members"
  on public.members for select
  to authenticated
  using (true);

create policy "Authenticated users can insert members"
  on public.members for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update members"
  on public.members for update
  to authenticated
  using (true);

create policy "Authenticated users can delete members"
  on public.members for delete
  to authenticated
  using (true);

-- Activity log policies
create policy "Authenticated users can view activity"
  on public.activity_log for select
  to authenticated
  using (true);

create policy "Authenticated users can insert activity"
  on public.activity_log for insert
  to authenticated
  with check (true);

-- ================================================
-- FUNCTIONS & TRIGGERS
-- ================================================

-- Auto-update updated_at
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_members_updated_at
  before update on public.members
  for each row execute function public.handle_updated_at();

-- ================================================
-- SEED DATA (אופציונלי)
-- ================================================

insert into public.members (name, email, status, role) values
  ('ישראל ישראלי', 'israel@example.com', 'active', 'admin'),
  ('שרה כהן', 'sarah@example.com', 'active', 'member'),
  ('דוד לוי', 'david@example.com', 'pending', 'member')
on conflict (email) do nothing;
