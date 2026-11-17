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

-- Comparativa anónima: cuántos usuarios hay y cuántos han visitado menos lugares que n.
-- Solo devuelve dos números (nunca datos de nadie). Ejecutar en Supabase → SQL Editor.
-- Las claves 'b:' (barrios), 'f:' (favoritos) y 'w:' (quiero ir) no son lugares.
create or replace function public.visited_percentile(n int)
returns json language sql stable security definer set search_path = public as $$
  with c as (
    select (select count(*) from jsonb_each(p.visits) e
            where e.key !~ '^[bfw]:' and coalesce((e.value->>'lvl')::int, 0) > 0) as v
    from public.progress p
  )
  select json_build_object('users', count(*), 'below', count(*) filter (where v < n)) from c;
$$;
grant execute on function public.visited_percentile(int) to anon, authenticated;
