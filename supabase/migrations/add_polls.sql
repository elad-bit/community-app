-- ================================================
-- Add Polls System to Community App
-- הרץ את הקוד הזה ב: Supabase Dashboard -> SQL Editor
-- ================================================

-- Create ENUMS for polls
create type poll_type as enum ('general_assembly', 'committee');
create type poll_status as enum ('draft', 'open', 'closed');
create type poll_category as enum ('bylaw', 'budget', 'committee_election', 'general');

-- Create polls table
create table if not exists public.polls (
  id uuid default uuid_generate_v4() primary key,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  title text not null,
  description text,
  type poll_type not null default 'general_assembly',
  category poll_category not null default 'general',
  is_anonymous boolean not null default false,
  status poll_status not null default 'draft',
  created_by uuid references auth.users(id) on delete set null,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Create poll_options table
create table if not exists public.poll_options (
  id uuid default uuid_generate_v4() primary key,
  poll_id uuid not null references public.polls(id) on delete cascade,
  text text not null,
  order_index integer not null,
  created_at timestamptz default now() not null
);

-- Create poll_votes table
create table if not exists public.poll_votes (
  id uuid default uuid_generate_v4() primary key,
  poll_id uuid not null references public.polls(id) on delete cascade,
  option_id uuid not null references public.poll_options(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  voter_id uuid references auth.users(id) on delete set null, -- null for anonymous votes
  created_at timestamptz default now() not null
);

-- Create poll_participants table (for tracking who voted)
create table if not exists public.poll_participants (
  id uuid default uuid_generate_v4() primary key,
  poll_id uuid not null references public.polls(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  voted_at timestamptz default now() not null,
  unique(poll_id, user_id)
);

-- Create indexes
create index if not exists idx_polls_tenant_id on public.polls(tenant_id);
create index if not exists idx_polls_created_at on public.polls(created_at desc);
create index if not exists idx_polls_status on public.polls(status);
create index if not exists idx_poll_options_poll_id on public.poll_options(poll_id);
create index if not exists idx_poll_votes_poll_id on public.poll_votes(poll_id);
create index if not exists idx_poll_votes_voter_id on public.poll_votes(voter_id);
create index if not exists idx_poll_participants_poll_id on public.poll_participants(poll_id);
create index if not exists idx_poll_participants_user_id on public.poll_participants(user_id);

-- Enable RLS
alter table public.polls enable row level security;
alter table public.poll_options enable row level security;
alter table public.poll_votes enable row level security;
alter table public.poll_participants enable row level security;

-- RLS Policies for polls
create policy "Users can view polls for their tenant"
  on public.polls for select
  to authenticated
  using (
    tenant_id in (
      select tenant_id from public.residents where user_id = auth.uid()
    )
  );

create policy "Admins can create polls"
  on public.polls for insert
  to authenticated
  with check (
    tenant_id in (
      select tenant_id from public.residents
      where user_id = auth.uid() and role = 'admin'
    )
  );

create policy "Admins can update polls"
  on public.polls for update
  to authenticated
  using (
    tenant_id in (
      select tenant_id from public.residents
      where user_id = auth.uid() and role = 'admin'
    )
  );

create policy "Admins can delete polls"
  on public.polls for delete
  to authenticated
  using (
    tenant_id in (
      select tenant_id from public.residents
      where user_id = auth.uid() and role = 'admin'
    )
  );

-- RLS Policies for poll_options
create policy "Users can view poll options for their tenant"
  on public.poll_options for select
  to authenticated
  using (
    poll_id in (
      select id from public.polls
      where tenant_id in (
        select tenant_id from public.residents where user_id = auth.uid()
      )
    )
  );

create policy "Admins can manage poll options"
  on public.poll_options for insert
  to authenticated
  with check (
    poll_id in (
      select id from public.polls
      where tenant_id in (
        select tenant_id from public.residents
        where user_id = auth.uid() and role = 'admin'
      )
    )
  );

-- RLS Policies for poll_votes
create policy "Users can view votes for their tenant"
  on public.poll_votes for select
  to authenticated
  using (
    tenant_id in (
      select tenant_id from public.residents where user_id = auth.uid()
    )
  );

create policy "Users can insert votes"
  on public.poll_votes for insert
  to authenticated
  with check (
    tenant_id in (
      select tenant_id from public.residents where user_id = auth.uid()
    )
  );

-- RLS Policies for poll_participants
create policy "Users can view poll participants for their tenant"
  on public.poll_participants for select
  to authenticated
  using (
    poll_id in (
      select id from public.polls
      where tenant_id in (
        select tenant_id from public.residents where user_id = auth.uid()
      )
    )
  );

create policy "Users can insert poll participants"
  on public.poll_participants for insert
  to authenticated
  with check (
    poll_id in (
      select id from public.polls
      where tenant_id in (
        select tenant_id from public.residents where user_id = auth.uid()
      )
    )
  );

-- Auto-update updated_at for polls
create or replace function public.handle_poll_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_polls_updated_at
  before update on public.polls
  for each row execute function public.handle_poll_updated_at();
