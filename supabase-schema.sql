-- ============================================================
-- ARMAR-IA — Schema Supabase
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- Tabla de obras / proyectos
create table if not exists public.projects (
  id           bigint primary key,
  name         text not null,
  location     text,
  start_date   text,
  end_date     text,
  progress     integer default 0,
  responsible  text,
  contratista  text,
  proyecto     text,
  status       text default 'activa',
  tasks        jsonb default '[]'::jsonb,
  created_at   timestamptz default now()
);

-- Tabla de cronogramas
create table if not exists public.cronogramas (
  id                    text primary key,
  obra_id               bigint,
  nombre                text not null default '',
  creado_en             text,
  autor_cronograma      text,
  contratista_principal text,
  tareas                jsonb default '[]'::jsonb,
  informes              jsonb default '[]'::jsonb,
  created_at            timestamptz default now()
);

-- Tabla de miembros del equipo
create table if not exists public.team_members (
  id         text primary key,
  name       text not null,
  category   text not null default 'OBRA',
  created_at timestamptz default now()
);

-- ── Row Level Security (sin autenticación: acceso libre) ──────────────────────

alter table public.projects     enable row level security;
alter table public.cronogramas  enable row level security;
alter table public.team_members enable row level security;

create policy "allow_all_projects"
  on public.projects for all using (true) with check (true);

create policy "allow_all_cronogramas"
  on public.cronogramas for all using (true) with check (true);

create policy "allow_all_team_members"
  on public.team_members for all using (true) with check (true);

-- ── Realtime ──────────────────────────────────────────────────────────────────
-- Habilitar también desde: Supabase Dashboard → Database → Replication

alter publication supabase_realtime add table public.projects;
alter publication supabase_realtime add table public.cronogramas;
alter publication supabase_realtime add table public.team_members;
