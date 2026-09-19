create table if not exists public.conversations (
  conversation_id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  turn_index integer not null default 1 check (turn_index > 0),
  raw_user_prompt text not null,
  ai_response_text text not null,
  created_at timestamptz not null default now()
);

create index if not exists conversations_user_created_at_idx
  on public.conversations (user_id, created_at desc);

alter table public.conversations enable row level security;

grant select, insert on table public.conversations to authenticated;

drop policy if exists "Users can insert their own conversations" on public.conversations;
create policy "Users can insert their own conversations"
  on public.conversations for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can read their own conversations" on public.conversations;
create policy "Users can read their own conversations"
  on public.conversations for select
  to authenticated
  using ((select auth.uid()) = user_id);

create table if not exists public."User" (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  phone text,
  age integer check (age is null or (age >= 0 and age <= 150)),
  location text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public."User" enable row level security;

grant select, insert, update on table public."User" to authenticated;

drop policy if exists "Users can read their own user record" on public."User";
create policy "Users can read their own user record"
  on public."User" for select
  to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "Users can insert their own user record" on public."User";
create policy "Users can insert their own user record"
  on public."User" for insert
  to authenticated
  with check ((select auth.uid()) = id);

drop policy if exists "Users can update their own user record" on public."User";
create policy "Users can update their own user record"
  on public."User" for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);
