-- ============================================================================
-- GAEL / TORRE V2 - Migration 0002
-- Objetivo: criar camada aditiva para auditoria, pedidos, motoristas,
-- intervencoes e feature flags.
--
-- Risco: medio.
-- Motivo: cria novas tabelas. Nao altera tabelas legadas (`sla_days`,
-- `sla_drivers`, `tower_snapshots`, `tower_status`) e nao muda numeros oficiais.
-- ============================================================================

create extension if not exists pgcrypto;

create table if not exists public.feature_flags (
  key         text primary key,
  enabled     boolean not null default false,
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

insert into public.feature_flags (key, enabled, metadata) values
  ('FEATURE_TOWER_V2_UI', false, '{"description":"Cockpit visual V2 da Torre"}'::jsonb),
  ('FEATURE_ORDER_DETAIL', false, '{"description":"Detalhamento por pedido quando houver granularidade"}'::jsonb),
  ('FEATURE_DRIVER_INTERVENTIONS', false, '{"description":"Registro de tratativas/intervencoes"}'::jsonb),
  ('FEATURE_AUTH_ACTIONS', false, '{"description":"Acoes operacionais exigindo Supabase Auth"}'::jsonb),
  ('FEATURE_TOWER_RISK_V2', false, '{"description":"Risk score V2 comparativo"}'::jsonb)
on conflict (key) do nothing;

create table if not exists public.profiles (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role         text not null default 'viewer' check (role in ('admin', 'supervisor', 'operator', 'viewer')),
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists public.import_batches (
  id              uuid primary key default gen_random_uuid(),
  source          text not null,
  filename        text not null,
  report_date     date,
  row_count       integer not null default 0,
  recognized_rows integer not null default 0,
  order_rows      integer not null default 0,
  aggregate_rows  integer not null default 0,
  imported_by     uuid references auth.users(id),
  imported_at     timestamptz not null default now(),
  file_fingerprint text,
  status          text not null default 'success' check (status in ('success', 'partial', 'failed')),
  warnings        jsonb not null default '[]'::jsonb,
  metadata        jsonb not null default '{}'::jsonb
);

create index if not exists import_batches_report_date_idx
  on public.import_batches (report_date);

create index if not exists import_batches_source_date_idx
  on public.import_batches (source, report_date);

create index if not exists import_batches_fingerprint_idx
  on public.import_batches (file_fingerprint);

create table if not exists public.operational_orders (
  id                     uuid primary key default gen_random_uuid(),
  source                 text not null,
  data_granularity       text not null default 'order' check (data_granularity in ('order', 'driver_aggregate')),
  operational_date       date not null,
  order_number           text,
  tracking_number        text,
  order_key              text not null,
  unit                   text check (unit in ('maua', 'rbp')),
  driver_name            text,
  driver_key             text,
  received_at            timestamptz,
  ofd_at                 timestamptz,
  delivered_at           timestamptz,
  expected_delivery_date date,
  last_event_at          timestamptz,
  operational_status     text,
  occurrence_type        text,
  is_excluded            boolean not null default false,
  excluded_reason        text,
  same_day_success       boolean,
  import_batch_id        uuid references public.import_batches(id),
  first_seen_at          timestamptz not null default now(),
  last_seen_at           timestamptz not null default now(),
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  unique (source, operational_date, order_key)
);

create index if not exists operational_orders_date_idx
  on public.operational_orders (operational_date);

create index if not exists operational_orders_source_date_idx
  on public.operational_orders (source, operational_date);

create index if not exists operational_orders_unit_date_idx
  on public.operational_orders (unit, operational_date);

create index if not exists operational_orders_driver_date_idx
  on public.operational_orders (driver_key, operational_date);

create index if not exists operational_orders_tracking_idx
  on public.operational_orders (tracking_number);

create index if not exists operational_orders_status_idx
  on public.operational_orders (operational_status);

create index if not exists operational_orders_ofd_idx
  on public.operational_orders (ofd_at);

create index if not exists operational_orders_delivered_idx
  on public.operational_orders (delivered_at);

create table if not exists public.driver_profiles (
  id               uuid primary key default gen_random_uuid(),
  driver_key       text not null unique,
  display_name     text not null,
  phone_e164       text,
  default_unit     text check (default_unit in ('maua', 'rbp')),
  active           boolean not null default true,
  whatsapp_enabled boolean not null default false,
  notes            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists driver_profiles_active_idx
  on public.driver_profiles (active);

create table if not exists public.driver_interventions (
  id                   uuid primary key default gen_random_uuid(),
  operational_date     date not null,
  driver_id            uuid references public.driver_profiles(id),
  driver_key           text not null,
  driver_name_snapshot text not null,
  unit                 text check (unit in ('maua', 'rbp')),
  carrier              text,
  action_type          text not null check (action_type in ('whatsapp_contact', 'phone_contact', 'note', 'support_requested', 'redistribution', 'other')),
  channel              text,
  reason               text,
  message              text,
  tower_status         text,
  risk_score           integer check (risk_score is null or (risk_score >= 0 and risk_score <= 100)),
  pending_count        integer,
  sla_projected        numeric(5,1),
  no_progress_minutes  integer,
  actor_user_id        uuid references auth.users(id),
  actor_name_snapshot  text,
  created_at           timestamptz not null default now(),
  status               text not null default 'initiated' check (status in ('initiated', 'waiting', 'acknowledged', 'resolved', 'no_response')),
  notes                text,
  followup_at          timestamptz,
  resolved_at          timestamptz
);

create index if not exists driver_interventions_date_idx
  on public.driver_interventions (operational_date);

create index if not exists driver_interventions_driver_date_idx
  on public.driver_interventions (driver_key, operational_date);

create index if not exists driver_interventions_status_idx
  on public.driver_interventions (status);

create or replace function public.set_generic_updated_at()
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
  if not exists (select 1 from pg_trigger where tgname = 'trg_feature_flags_updated_at') then
    create trigger trg_feature_flags_updated_at
    before update on public.feature_flags
    for each row execute function public.set_generic_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'trg_profiles_updated_at') then
    create trigger trg_profiles_updated_at
    before update on public.profiles
    for each row execute function public.set_generic_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'trg_operational_orders_updated_at') then
    create trigger trg_operational_orders_updated_at
    before update on public.operational_orders
    for each row execute function public.set_generic_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'trg_driver_profiles_updated_at') then
    create trigger trg_driver_profiles_updated_at
    before update on public.driver_profiles
    for each row execute function public.set_generic_updated_at();
  end if;
end;
$$;

-- RLS nas novas tabelas. Politicas permissivas de leitura anonima podem ser
-- revisadas em uma fase de Auth; escrita operacional fica preparada para Auth.
alter table public.feature_flags enable row level security;
alter table public.profiles enable row level security;
alter table public.import_batches enable row level security;
alter table public.operational_orders enable row level security;
alter table public.driver_profiles enable row level security;
alter table public.driver_interventions enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'feature_flags' and policyname = 'feature_flags_select_public') then
    create policy "feature_flags_select_public"
    on public.feature_flags for select
    to anon, authenticated
    using (true);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles' and policyname = 'profiles_select_self') then
    create policy "profiles_select_self"
    on public.profiles for select
    to authenticated
    using (user_id = auth.uid());
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'import_batches' and policyname = 'import_batches_select_public') then
    create policy "import_batches_select_public"
    on public.import_batches for select
    to anon, authenticated
    using (true);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'operational_orders' and policyname = 'operational_orders_select_public') then
    create policy "operational_orders_select_public"
    on public.operational_orders for select
    to anon, authenticated
    using (true);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'driver_profiles' and policyname = 'driver_profiles_select_public') then
    create policy "driver_profiles_select_public"
    on public.driver_profiles for select
    to anon, authenticated
    using (true);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'driver_interventions' and policyname = 'driver_interventions_select_auth') then
    create policy "driver_interventions_select_auth"
    on public.driver_interventions for select
    to authenticated
    using (true);
  end if;
end;
$$;

-- Escrita nas novas tabelas sera liberada em fase propria, apos login e
-- permissoes de operador/admin estarem testadas no frontend.
