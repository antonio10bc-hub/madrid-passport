-- Madrid Passport · progreso por usuario. Ejecutar en Supabase → SQL Editor.
create table if not exists public.progress (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  visits     jsonb not null default '{}'::jsonb,   -- { placeId: { lvl, t, gpsAt, gps } }
  badges     jsonb not null default '{}'::jsonb,   -- { badgeId: timestamp }
  updated_at timestamptz not null default now()
);

alter table public.progress enable row level security;

-- Cada usuario solo ve y modifica su propia fila
drop policy if exists "progress_select_own" on public.progress;
create policy "progress_select_own" on public.progress for select using (auth.uid() = user_id);
drop policy if exists "progress_insert_own" on public.progress;
create policy "progress_insert_own" on public.progress for insert with check (auth.uid() = user_id);
drop policy if exists "progress_update_own" on public.progress;
create policy "progress_update_own" on public.progress for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "progress_delete_own" on public.progress;
create policy "progress_delete_own" on public.progress for delete using (auth.uid() = user_id);

-- Lectura segura de números dentro del JSON: un valor mal formado (texto, objeto…) cuenta como 0 en vez de
-- romper la función para todos («invalid input syntax for type integer»).
create or replace function public.mp_num(j jsonb)
returns numeric language sql immutable set search_path = '' as $$
  select case when jsonb_typeof(j) = 'number' then (j #>> '{}')::numeric else 0 end;
$$;

-- Límites de la fila de progreso: objeto JSON y tamaño razonable (evita filas gigantes o con tipos raros)
alter table public.progress drop constraint if exists progress_shape;
alter table public.progress add constraint progress_shape check (
  jsonb_typeof(visits) = 'object' and jsonb_typeof(badges) = 'object'
  and pg_column_size(visits) < 262144 and pg_column_size(badges) < 32768) not valid;

-- Comparativa anónima: cuántos usuarios hay y cuántos han visitado menos lugares que n.
-- Solo devuelve dos números, y solo con 5 o más usuarios (con menos se podría deducir el progreso de alguien).
-- Las claves 'b:' (barrios), 'f:' (favoritos), 'w:' (quiero ir) y 'r:' (valoración) no son lugares.
create or replace function public.visited_percentile(n int)
returns json language sql stable security definer set search_path = public as $$
  with c as (
    select (select count(*) from jsonb_each(p.visits) e
            where e.key !~ '^[bfwr]:' and public.mp_num(e.value->'lvl') > 0) as v
    from public.progress p where jsonb_typeof(p.visits) = 'object'
  )
  select case when count(*) < 5 then json_build_object('users', count(*), 'below', 0)
              else json_build_object('users', count(*), 'below', count(*) filter (where v < n)) end from c;
$$;
grant execute on function public.visited_percentile(int) to anon, authenticated;

-- ---------- Comunidad (agregados anónimos; nunca devuelven datos de una persona) ----------
-- Por lugar: [viajeros que lo han sellado, a cuántos les encantó (valoración 'r:<id>' = 3)].
-- Solo lugares con 3 o más viajeros: con menos, la cifra describe a una persona concreta.
create or replace function public.place_stats()
returns json language sql stable security definer set search_path = public as $$
  with v as (select e.key as k, e.value as val from public.progress p, jsonb_each(p.visits) e
             where jsonb_typeof(p.visits) = 'object' and e.key !~ '^[bfw]:' and jsonb_typeof(e.value) = 'object')
  select coalesce(json_object_agg(id, json_build_array(n, love)), '{}'::json) from (
    select regexp_replace(k, '^r:', '') as id,
           count(*) filter (where k !~ '^r:' and public.mp_num(val->'lvl') > 0) as n,
           count(*) filter (where k ~ '^r:' and public.mp_num(val->'v') = 3) as love
    from v group by 1) s
  where n >= 3 and char_length(id) <= 64;
$$;
grant execute on function public.place_stats() to anon, authenticated;

-- Puesto en el que alguien selló un lugar: cuántos lo sellaron antes de ts (ms) + 1.
-- Se compara por días (no por milisegundos) y solo con 3 o más viajeros, para que no se pueda averiguar
-- a qué hora exacta estuvo alguien en un sitio probando timestamps.
create or replace function public.place_rank(pid text, ts bigint)
returns int language sql stable security definer set search_path = public as $$
  with s as (
    select floor(public.mp_num(p.visits->pid->'t') / 86400000) as d from public.progress p
    where jsonb_typeof(p.visits) = 'object' and public.mp_num(p.visits->pid->'lvl') > 0
  )
  select case when (select count(*) from s) < 3 then null
              else (select count(*)::int + 1 from s where d < floor(ts / 86400000.0)) end;
$$;
grant execute on function public.place_rank(text, bigint) to anon, authenticated;

-- Borrar mi cuenta (Ajustes → «Borrar mis datos»): elimina el usuario de Auth y, en cascada, su progreso.
create or replace function public.delete_my_account()
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  delete from public.progress where user_id = auth.uid();
  delete from auth.users where id = auth.uid();
end $$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

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
-- Límites de los avisos (la tabla es de inserción pública: que nadie pueda llenarla con textos enormes)
alter table public.reports drop constraint if exists reports_limits;
alter table public.reports add constraint reports_limits check (
  char_length(place) <= 64 and (lang is null or char_length(lang) <= 8)) not valid;

-- Límite de avisos: 5 al día por persona (por IP). La IP no se guarda: solo su huella SHA-256, para poder contar.
alter table public.reports add column if not exists ip_hash text;
create index if not exists reports_ip_hash_idx on public.reports (ip_hash, created_at);
create or replace function public.reports_rate_limit()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  h json := coalesce(nullif(current_setting('request.headers', true), '')::json, '{}'::json);
  ip text := trim(split_part(coalesce(h->>'cf-connecting-ip', h->>'x-forwarded-for', h->>'x-real-ip', ''), ',', 1));
begin
  new.ip_hash := encode(sha256(convert_to('mp-reports:' || ip, 'UTF8')), 'hex');
  if (select count(*) from public.reports where ip_hash = new.ip_hash and created_at > now() - interval '1 day') >= 5 then
    raise exception 'too_many_reports' using errcode = 'P0001', hint = 'Máximo 5 avisos al día';
  end if;
  return new;
end $$;
drop trigger if exists reports_rate_limit on public.reports;
create trigger reports_rate_limit before insert on public.reports for each row execute function public.reports_rate_limit();

