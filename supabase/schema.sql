-- Madrid Passport · progreso por usuario. Ejecutar en Supabase → SQL Editor.
create table if not exists public.progress (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  visits     jsonb not null default '{}'::jsonb,   -- { placeId: { lvl, t, gpsAt, gps } }
  badges     jsonb not null default '{}'::jsonb,   -- { badgeId: timestamp }
  updated_at timestamptz not null default now()
);

alter table public.progress enable row level security;

-- Cada usuario solo ve y modifica su propia fila
create policy "progress_select_own" on public.progress for select using (auth.uid() = user_id);
create policy "progress_insert_own" on public.progress for insert with check (auth.uid() = user_id);
create policy "progress_update_own" on public.progress for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "progress_delete_own" on public.progress for delete using (auth.uid() = user_id);
