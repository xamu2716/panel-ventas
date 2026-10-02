-- Fila única que el cron diario de Vercel (/api/cron/keep-alive) actualiza para
-- que Supabase (free tier) vea escritura real y no pause el proyecto por inactividad.
create table public.heartbeat (
  id int primary key,
  last_ping timestamptz not null default now()
);

-- RLS activo y sin políticas: anon/authenticated no pueden leer ni escribir.
-- Solo la service role (que ignora RLS) la toca, desde el servidor.
alter table public.heartbeat enable row level security;

-- En este proyecto las tablas nuevas no reciben permisos por defecto, ni siquiera
-- service_role (RLS no basta: sin GRANT falla con "permission denied").
revoke all on public.heartbeat from anon, authenticated;
grant select, insert, update on public.heartbeat to service_role;
