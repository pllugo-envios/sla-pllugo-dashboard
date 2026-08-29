-- ============================================================================
-- GAEL / TORRE V2 - Migration 0001
-- Objetivo: versionar as tabelas que o frontend atual ja usa em producao.
--
-- Risco: baixo/medio.
-- Motivo: cria apenas tabelas ausentes com `if not exists`; nao altera regras
-- de SLA, nao apaga dados, nao altera RLS legado e nao remove colunas.
-- ============================================================================

create table if not exists public.tower_snapshots (
  date        date not null,
  stamp       timestamptz not null,
  drivers     jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now(),
  primary key (date, stamp)
);

create index if not exists tower_snapshots_date_idx
  on public.tower_snapshots (date);

create table if not exists public.tower_status (
  date        date primary key,
  status      jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

create or replace function public.set_tower_status_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'trg_tower_status_updated_at'
  ) then
    create trigger trg_tower_status_updated_at
    before update on public.tower_status
    for each row execute function public.set_tower_status_updated_at();
  end if;
end;
$$;

-- Observacao:
-- O banco real auditado em 2026-08-28 ja possui essas tabelas com as colunas:
-- tower_snapshots: date, stamp, drivers, created_at
-- tower_status: date, status, updated_at
-- Esta migration existe para deixar o repositorio coerente com o frontend.
