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
-- Las claves 'b:' (barrios), 'f:' (favoritos), 'w:' (quiero ir) y 'r:' (valoración) no son lugares.
create or replace function public.visited_percentile(n int)
returns json language sql stable security definer set search_path = public as $$
  with c as (
    select (select count(*) from jsonb_each(p.visits) e
            where e.key !~ '^[bfwr]:' and coalesce((e.value->>'lvl')::int, 0) > 0) as v
    from public.progress p
  )
  select json_build_object('users', count(*), 'below', count(*) filter (where v < n)) from c;
$$;
grant execute on function public.visited_percentile(int) to anon, authenticated;

-- ---------- Comunidad (agregados anónimos; nunca devuelven datos de una persona) ----------
-- Por lugar: [viajeros que lo han sellado, a cuántos les encantó (valoración 'r:<id>' = 3)]
create or replace function public.place_stats()
returns json language sql stable security definer set search_path = public as $$
  with v as (select e.key as k, e.value as val from public.progress p, jsonb_each(p.visits) e where e.key !~ '^[bfw]:')
  select coalesce(json_object_agg(id, json_build_array(n, love)), '{}'::json) from (
    select regexp_replace(k, '^r:', '') as id,
           count(*) filter (where k !~ '^r:' and coalesce((val->>'lvl')::int, 0) > 0) as n,
           count(*) filter (where k ~ '^r:' and coalesce((val->>'v')::int, 0) = 3) as love
    from v group by 1) s;
$$;
grant execute on function public.place_stats() to anon, authenticated;

-- Puesto en el que alguien selló un lugar: cuántos lo sellaron antes de ts (ms) + 1
create or replace function public.place_rank(pid text, ts bigint)
returns int language sql stable security definer set search_path = public as $$
  select count(*)::int + 1 from public.progress p
  where coalesce((p.visits->pid->>'lvl')::int, 0) > 0 and (p.visits->pid->>'t')::bigint < ts;
$$;
grant execute on function public.place_rank(text, bigint) to anon, authenticated;

-- Avisos de error en lugares (desde la ficha). Solo se puede insertar; se leen en Supabase → Table Editor.
create table if not exists public.reports (
  id         bigserial primary key,
  place      text not null,
  reason     text not null check (reason in ('coords', 'photo', 'info', 'closed', 'other')),
  note       text check (char_length(note) <= 1000),
  lang       text,
  created_at timestamptz not null default now()
);
alter table public.reports enable row level security;
drop policy if exists "reports_insert_any" on public.reports;
create policy "reports_insert_any" on public.reports for insert to anon, authenticated with check (true);
