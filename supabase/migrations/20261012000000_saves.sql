-- One row per user holding their whole game state.
create table if not exists public.saves (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.saves enable row level security;

create policy "Read own save"   on public.saves for select to authenticated using ((select auth.uid()) = user_id);
create policy "Create own save" on public.saves for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Update own save" on public.saves for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Delete own save" on public.saves for delete to authenticated using ((select auth.uid()) = user_id);

-- Live sync between devices.
alter publication supabase_realtime add table public.saves;
