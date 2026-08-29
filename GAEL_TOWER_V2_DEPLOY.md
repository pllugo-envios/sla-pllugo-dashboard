# GAEL_TOWER_V2_DEPLOY

## Estado atual

Esta fase prepara arquivos para a branch `feature/gael-tower-v2`.

Nao aplicar em `main` sem validacao.

## Passo 1 - Subir arquivos na branch

Subir na branch `feature/gael-tower-v2`:

- `GAEL_TOWER_V2_ARCHITECTURE.md`
- `GAEL_TOWER_V2_DEPLOY.md`
- `GAEL_TOWER_V2_ROLLBACK.md`
- `supabase/migrations/20260828_0001_document_current_tower_tables.sql`
- `supabase/migrations/20260828_0002_gael_tower_v2_additive_tables.sql`
- `supabase/migrations/20260828_9999_lock_legacy_writes_after_auth_DO_NOT_APPLY.sql`
- `tests/regression_sla_contract.test.js`

## Passo 2 - Nao mexer no Supabase ainda

Antes de aplicar qualquer SQL:

1. exportar/baixar backup das tabelas atuais;
2. confirmar que `sla_days`, `sla_drivers`, `tower_snapshots`, `tower_status` estao acessiveis;
3. validar em ambiente de teste, se possivel.

## Passo 3 - Migration 0001

`20260828_0001_document_current_tower_tables.sql`

Uso:

- segura para documentar/criar `tower_snapshots` e `tower_status` quando ausentes;
- no banco atual, deve ser praticamente idempotente porque as tabelas ja existem.

Antes de aplicar:

- confirmar que nao ha diferenca de tipo nas colunas existentes.

## Passo 4 - Migration 0002

`20260828_0002_gael_tower_v2_additive_tables.sql`

Uso:

- cria tabelas novas;
- cria feature flags desligadas;
- nao altera tabelas legadas.

Depois de aplicar:

- validar que a ferramenta oficial ainda abre;
- validar importacao J&T/iMile;
- validar Torre;
- confirmar que nenhuma regra de SLA mudou.

## Passo 5 - Migration 9999

`20260828_9999_lock_legacy_writes_after_auth_DO_NOT_APPLY.sql`

Nao aplicar.

Ela existe apenas para documentar a fase futura de travar escrita anonima.

## Passo 6 - Testes

Rodar:

```bash
node logic_test.js
node tests/regression_sla_contract.test.js
```

Resultado esperado:

- todos os testes passam;
- nenhuma mudanca numerica no motor atual.

## Passo 7 - Deploy de UI

Nesta fase nao ha alteracao de `index.html` nem `assets/gael`.

Quando houver UI V2:

1. manter feature flag desligada;
2. subir na branch;
3. testar no GitHub Pages de branch/preview quando disponivel;
4. validar console;
5. so entao abrir PR para `main`.

## Checklist antes de PR

- Sem `DROP`, `TRUNCATE` ou `DELETE`.
- Sem mudanca nas funcoes atuais de SLA.
- Sem chave privada no frontend.
- Sem service role.
- Sem alteracao de RLS legado.
- Testes passaram.
- Rollback documentado.
