-- ============================================================================
-- Dashboard SLA Pllugo — schema Supabase
-- Rode isso uma vez no SQL Editor do seu projeto Supabase (Project > SQL Editor > New query).
--
-- Design: só guarda o AGREGADO por dia (mesmo formato que já existia em
-- historico_sla.json), nunca uma linha por pacote — isso mantém o espaço
-- usado em poucos KB por dia, bem longe do limite do plano grátis.
--
-- Sem duplicação: cada tabela tem uma chave única. Toda importação feita
-- pelo botão "Atualizar Dashboard" faz UPSERT (insere ou substitui a linha
-- existente) — reprocessar o mesmo dia nunca cria uma linha nova, só
-- atualiza a que já existe (mesma regra que já valia no historico_sla.json:
-- relatório mais completo sempre sobrescreve).
-- ============================================================================

-- Agregado diário por fonte (jt = J&T same-day, imile = iMile, jt_real = SLA Real J&T)
create table if not exists sla_days (
  date                     date not null,
  source                   text not null check (source in ('jt', 'imile', 'jt_real')),
  total                    integer not null default 0,
  entregues                integer not null default 0,
  pendentes                integer not null default 0,
  problematicos            integer not null default 0,
  sla                      numeric(5,1) not null default 0,
  sla_sameday              numeric(5,1),              -- só jt_real
  desconsiderados          integer,                    -- só jt_real
  desconsiderados_pedidos  jsonb,                       -- só jt_real: array de números de pedido
  updated_at               timestamptz not null default now(),
  primary key (date, source)
);

-- Agregado diário por motorista por fonte
create table if not exists sla_drivers (
  date          date not null,
  source        text not null check (source in ('jt', 'imile', 'jt_real')),
  driver_name   text not null,
  total         integer not null default 0,
  delivered     integer not null default 0,
  pendentes     integer not null default 0,
  problems      integer not null default 0,
  sla           numeric(5,1) not null default 0,
  occurrences   jsonb,                                  -- só jt_real: {"tipo problema": contagem}
  updated_at    timestamptz not null default now(),
  primary key (date, source, driver_name)
);

create index if not exists sla_drivers_date_idx on sla_drivers (date);

-- ----------------------------------------------------------------------------
-- RLS (Row Level Security)
-- A chave "anon" fica embutida no HTML público (é assim que o Supabase espera
-- que ela seja usada). Por isso: liberamos leitura/inserção/atualização pra
-- essa chave, mas NUNCA liberamos exclusão — o pior que alguém com o link
-- consegue fazer é inserir linhas erradas, nunca apagar seu histórico.
-- Se quiser travar mais no futuro, dá pra restringir por e-mail com Supabase Auth.
-- ----------------------------------------------------------------------------
alter table sla_days enable row level security;
alter table sla_drivers enable row level security;

create policy "sla_days: leitura publica" on sla_days
  for select using (true);
create policy "sla_days: insercao publica" on sla_days
  for insert with check (true);
create policy "sla_days: atualizacao publica" on sla_days
  for update using (true) with check (true);

create policy "sla_drivers: leitura publica" on sla_drivers
  for select using (true);
create policy "sla_drivers: insercao publica" on sla_drivers
  for insert with check (true);
create policy "sla_drivers: atualizacao publica" on sla_drivers
  for update using (true) with check (true);
