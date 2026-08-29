# BASELINE_GAEL_TOWER_V2

Data da auditoria: 2026-08-28

Projeto auditado: `F:\User\Documents\Claude\Projects\SLA - MOTORISTA\web-independente`

URL oficial: `https://pllugo-envios.github.io/sla-pllugo-dashboard/`

## Status do checkpoint

- A pasta local auditada nao e um repositorio Git: `git status` retornou `fatal: not a git repository`.
- Branch `feature/gael-tower-v2` nao foi criada localmente por ausencia de `.git`.
- Nenhuma regra de SLA, importacao, Torre ou Supabase foi alterada nesta fase.
- Teste local existente executado: `node logic_test.js`.
- Resultado: `logic_test.js: todos os testes passaram`.

## Arquivos auditados

- `index.html`
- `assets/gael/gael.js`
- `assets/gael/gael.config.js`
- `assets/gael/README.md`
- `supabase_schema.sql`
- `README.md`
- `logic_test.js`

## Fonte de verdade atual

- `sla_days`: agregado por `date + source`.
- `sla_drivers`: agregado por `date + source + driver_name`.
- `tower_snapshots`: snapshots diarios da Torre, com lista JSON de motoristas por foto.
- `tower_status`: status diario da Torre, com mapa JSON por motorista/transportadora.
- `DASH_DATA.history`: estrutura em memoria montada a partir de `sla_days` + `sla_drivers`.
- `by_unit` em `sla_days`: fonte atual para recorte Maua/Ribeirao Pires.
- `localStorage`: usado apenas para preferencia de alerta sonoro; nao e fonte de verdade operacional.

## Regras atuais de SLA que nao podem regredir

### J&T Monitoramento / `source = jt`

- Funcao principal: `processJt(rows)`.
- Fonte: relatorio de bipagem/monitoramento com `Tempo de entrega` e `Horario da entrega`.
- Total: quantidade de linhas do relatorio.
- Entregue no prazo: `Horario da entrega` deve existir e estar no mesmo dia do `Tempo de entrega`.
- SLA: `entregues / total`, arredondado para 1 casa.
- Motorista: agrupado por `Entregador`, normalizado/canonicalizado.
- Problema: `Horario Registro Pacote Problematico` preenchido conta em `problematicos`.

### J&T Entrega realizada / SLA Real / `source = jt_real`

- Funcao principal: `processJtReal(rows)`.
- Fonte geral: `Data prevista de entrega`.
- Regra geral: usa coluna `Entregue no prazo` quando existir.
- Se `Entregue no prazo = Y`: pedido conta como entregue no prazo.
- Se `Entregue no prazo = N` ou vazio: pedido fica fora do prazo, exceto se for desconsiderado.
- Desconsiderados fora da responsabilidade Pllugo:
  - `Erro de triagem`
  - `Encomenda expedida mas nao chegou`
  - `Expedida mas nao chegou`
  - `Expedido mas nao chegou`
- Desconsiderado nao vira entrega: sai do denominador elegivel e fica auditavel em `desconsiderados_pedidos`.
- SLA Real: `entregues baseOnTime / total elegivel`.
- `sla_sameday`: mede entregas D0 por `Horario de Saida para Entrega` versus `Horario da entrega`, excluindo desconsiderados.

### SLA de motorista J&T

- Fonte: relatorio `Entrega realizada`.
- Data do motorista: data de `Horario de Saida para Entrega`, nao `Data prevista de entrega`.
- Total do motorista: linhas com `Entregador` e `Horario de Saida para Entrega` preenchidos.
- Entregue do motorista: entrega no mesmo dia da saida em rota.
- A regra de motorista nao usa `Entregue no prazo` nem exclusoes contratuais do SLA geral.
- Isso evita culpar motorista por atraso anterior a atribuicao da rota.

### iMile / `source = imile`

- Funcoes principais: `computeImileResult(rows)`, `processImileMultiday(rows)`, `processImile(rows)`.
- Fonte: relatorio com `OFD Date`, `OFD`, `Delivered`, `DA`, `Dld%`.
- Granularidade atual: agregado por motorista/dia, nao pedido individual.
- Total: soma de `OFD`.
- Entregues: soma de `Delivered`.
- SLA agregado: `Delivered / OFD`.
- SLA do motorista: usa `Dld%` quando ha uma linha; recalcula por volume se houver mais de uma linha do mesmo motorista no dia.

### Pllugo consolidado

- Funcao principal: `mergePllugo(jt, imile)`.
- Usa `jt_real || jt` para J&T no historico consolidado.
- Soma total, entregues, pendentes, problematicos e desconsiderados.
- SLA Pllugo: `entregues / total`.
- Preserva lista de `desconsiderados_pedidos`.

## Classificacao de planilhas

Funcao principal: `classifyAndProcess(filename, rows)`.

- iMile por estrutura: `OFD Date`, `OFD`, `Delivered`.
- iMile por nome: `relatorio_sla_imile`, `ofd`, ou estrutura iMile.
- J&T Real por estrutura: `Data prevista de entrega` + `Entregador`.
- J&T Real por nome: `entrega realizada`, `entrega_realizada`, ou estrutura J&T Real.
- J&T Monitoramento por estrutura: `Tempo de entrega` + `Horario da entrega`.
- J&T Monitoramento por nome: `relatorio_sla_jt`, `bipagem`, `jms`, ou estrutura J&T Monitoramento.
- Arquivo sem data identificavel ou sem estrutura reconhecida e ignorado com aviso.

## Unidade

- Funcao principal: `inferUnitFromRow(row)`.
- iMile:
  - `Station = DS MAU` -> Maua.
  - `Station = DS RBI` -> Ribeirao Pires.
- J&T e outros:
  - procura sinais como `MAUA`, `MAUA-SP`, `RBP`, `RIBEIRAO PIRES`.
- `computeUnitBreakdown(filename, rows)` reprocessa a planilha por subconjunto de unidade e grava em `by_unit`.
- Se uma unidade domina 95% ou mais do arquivo, linhas residuais da outra unidade sao ignoradas para nao sobrescrever unidade errada.

## Normalizacao de motoristas

- Funcao principal: `normalizeDriverName(name)`.
- Remove acentos, caracteres nao alfanumericos extras, normaliza espacos e caixa.
- Aplica aliases em `DRIVER_NAME_ALIASES`.
- `displayDriverName(name)` usa `DRIVER_DISPLAY_NAMES` quando houver nome consolidado.
- O agrupamento evita duplicidade no Supabase por grafias diferentes.

## Upsert e deduplicacao

- `fetchAllRows(table, extra)`: leitura paginada em blocos de 1000 linhas.
- `dedupeDriverRows(rows)`: funde duplicidades por `date + source + driver_name`.
- `upsertResults(results)`:
  - cria `dayRows` e `driverRows`;
  - mescla `by_unit` com dado existente;
  - grava apenas linhas novas ou diferentes;
  - apaga motorista antigo do mesmo `date/source` se ele sumiu na reimportacao;
  - faz upsert de `sla_days` por `date,source`;
  - faz upsert de `sla_drivers` por `date,source,driver_name`.

## Torre de Controle atual

- Fonte operacional da Torre: `tower_snapshots`.
- `captureTowerSnapshot()`:
  - relê snapshots do Supabase;
  - localiza o dia atual em `DASH_DATA.history`;
  - gera `driverRows` a partir de `day.jt` e `day.imile`;
  - nao fotografa `jt_real` para Torre;
  - evita gravar snapshot identico ao ultimo;
  - grava `{ date, stamp, drivers }` em `tower_snapshots`.
- `buildTowerAnalysis()`:
  - usa snapshots do dia atual;
  - calcula ritmo desde o primeiro snapshot ate o ultimo;
  - calcula minutos sem evolucao;
  - calcula projecao ate 17h;
  - calcula ritmo necessario para meta;
  - gera score V1 e status:
    - `monitoring`
    - `normal`
    - `attention`
    - `risk`
    - `critical`
- `tower_status` guarda mapa diario de status por chave `transportadora|motorista normalizado`.
- Alerta sonoro e acionado quando ha escalada de status para risco/critico.
- Gael nao deve mais navegar automaticamente; `watchers` esta vazio no config atual.

## Filtros atuais

- Periodos:
  - Hoje
  - Ontem
  - 7 dias
  - 15 dias
  - 30 dias
  - Escolher data (`customStart` + `customEnd`)
- Unidade:
  - Todas
  - Maua
  - Ribeirao Pires
- Transportadora:
  - Pllugo
  - J&T
  - iMile
- Modos:
  - Visao Geral
  - Visao Operacao
  - Torre de Controle
- Em Visao Operacao/Torre, J&T usa fonte operacional `jt`.
- Em Visao Geral, J&T usa `jt_real || jt`.

## Gael atual

- Motor: `assets/gael/gael.js`.
- Config: `assets/gael/gael.config.js`.
- Sem IA/LLM.
- Dados lidos de DOM + funcoes globais da pagina.
- `ask` deterministico chama `gaelAnswerQuestion()`.
- Respostas podem apontar para secoes, abrir detalhe de motorista e mostrar modal operacional.
- `watchers: []`: sem reacao automatica a queda de SLA ou badge da Torre.
- Comportamento visual atual:
  - personagem fixo proximo ao lado esquerdo;
  - dock discreto no canto direito;
  - modal de motorista sem escurecer a tela inteira.

## Schema versionado versus banco real

### Banco real consultado via REST publico

Tabelas existentes:

- `sla_days`: `date, source, total, entregues, pendentes, problematicos, sla, sla_sameday, desconsiderados, desconsiderados_pedidos, updated_at, by_unit`
- `sla_drivers`: `date, source, driver_name, total, delivered, pendentes, problems, sla, occurrences, updated_at`
- `tower_snapshots`: `date, stamp, drivers, created_at`
- `tower_status`: `date, status, updated_at`

Tabelas nao encontradas no banco real:

- `sla_profiles`
- `sla_settings`
- `sla_import_logs`

Colunas esperadas pelo codigo apenas via `by_unit`, nao como colunas fisicas:

- `recebidos`
- `rota_total`
- `rota_entregues`
- `rota_pendentes`

Colunas que nao existem em `tower_snapshots`:

- `source`
- `driver_name`
- `ofd`
- `pending`

### Divergencias relevantes

- `supabase_schema.sql` cria `sla_profiles`, `sla_settings`, `sla_import_logs`, mas elas nao existem no banco real.
- `supabase_schema.sql` nao cria `tower_snapshots` nem `tower_status`, embora o frontend dependa delas.
- `supabase_schema.sql` documenta RLS/Auth admin, mas o frontend atual opera com chave publica e chamadas diretas.
- README possui trechos antigos e trechos V2 com indicacoes diferentes de seguranca/autenticacao.

## Baseline de testes

- `node logic_test.js`: passou.
- Cobertura atual e pequena:
  - SLA motorista por D0;
  - ignorar linha sem saida em rota;
  - SLA same-day ponderado;
  - gap de meta;
  - entregas necessarias para meta.
- Ainda nao ha fixtures amplas para:
  - J&T Real com exclusoes;
  - iMile multiday;
  - by_unit;
  - Supabase pagination;
  - reimportacao com exclusao de motorista;
  - Torre snapshots/status;
  - Gael.

## Regras congeladas para qualquer fase V2

Qualquer evolucao deve provar que os resultados abaixo permanecem iguais para a mesma entrada:

- total
- entregues
- pendentes
- SLA
- `sla_sameday`
- problematicos
- desconsiderados
- `desconsiderados_pedidos`
- motoristas
- resultados por unidade
- filtros Pllugo/J&T/iMile
- filtros Maua/Ribeirao Pires
- Torre V1 quando feature flag V2 estiver desligada

## Proximo passo seguro recomendado

1. Criar branch `feature/gael-tower-v2` no repositorio GitHub.
2. Adicionar este baseline e o risk review como primeiros arquivos da branch.
3. Criar migrations novas em `supabase/migrations/`, sem substituir `supabase_schema.sql`.
4. Criar testes de regressao antes de implementar novas tabelas ou UI V2.
5. Implementar recursos por feature flag, com `false` por padrao.
