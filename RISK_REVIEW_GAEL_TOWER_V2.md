# RISK_REVIEW_GAEL_TOWER_V2

Data: 2026-08-28

Escopo: riscos encontrados antes da implementacao da Torre/Gael V2.

## Risco 1 - Aplicar `supabase_schema.sql` atual em producao sem reconciliacao

- Classificacao: ALTO.
- Arquivos afetados:
  - `supabase_schema.sql`
  - `index.html`
- Risco:
  - O schema versionado cria `sla_profiles`, `sla_settings`, `sla_import_logs` e politicas RLS/Auth, mas essas tabelas nao existem no banco real consultado.
  - O schema versionado nao cria `tower_snapshots` nem `tower_status`, embora a ferramenta dependa delas.
  - O frontend atual faz leitura/escrita direta com chave publica; alterar RLS sem fluxo de Auth funcionando pode quebrar importacao, limpeza e Torre.
- Impacto possivel:
  - Dashboard sem leitura.
  - Importacao falhando.
  - Torre deixando de gravar snapshot.
  - Limpeza pela ferramenta deixando de funcionar.
- Estrategia segura:
  - Nao aplicar o arquivo inteiro em producao como "correcao".
  - Criar migrations incrementais em `supabase/migrations/`.
  - Criar migration separada apenas para documentar/criar `tower_snapshots` e `tower_status`.
  - Criar Auth em fase propria, atras de feature flag.
- Rollback:
  - Nao executar alteracoes RLS em tabelas legadas ate existir rollback testado.
- Teste necessario:
  - leitura anon de `sla_days`, `sla_drivers`, `tower_snapshots`, `tower_status`;
  - upsert anon ou autenticado, conforme fluxo ativo;
  - importacao J&T/iMile;
  - capture de snapshot.
- Recomendacao:
  - Bloquear qualquer mudanca de RLS/Auth ate fase especifica.

## Risco 2 - Criar `operational_orders` e persistir pedido individual

- Classificacao: MEDIO/ALTO.
- Risco:
  - Pode introduzir PII se salvar colunas demais do Excel.
  - Pode duplicar pedidos se a chave operacional nao for correta.
  - Pode tornar a abertura do dashboard lenta se carregar pedidos sem paginacao.
- Impacto possivel:
  - Exposicao de dados pessoais.
  - Base inflada por duplicidade.
  - Consumo alto de Supabase.
- Estrategia segura:
  - Whitelist de campos operacionais.
  - Chave preferencial: `source + tracking_number` ou `source + order_number`; validar por amostra real antes.
  - Nunca carregar todos os pedidos no boot.
  - Feature flag `FEATURE_ORDER_DETAIL=false`.
- Rollback:
  - Desligar feature flag e manter tabelas agregadas antigas intactas.
- Teste necessario:
  - reimportar o mesmo arquivo;
  - importar versao atualizada;
  - validar que contagem agregada antiga nao muda.

## Risco 3 - Risk Score V2 substituir V1 cedo demais

- Classificacao: ALTO.
- Risco:
  - Falsos criticos podem atrapalhar a operacao.
  - Score atual e usado visualmente na Torre e no badge.
- Estrategia segura:
  - Criar `buildTowerAnalysisV2()` em paralelo.
  - Feature flag `FEATURE_TOWER_RISK_V2=false`.
  - Exibir comparativo V1 x V2 apenas em modo de desenvolvimento/diagnostico.
- Teste necessario:
  - comparar mesmos motoristas e snapshots;
  - verificar mudancas de status;
  - revisar falsos positivos.

## Risco 4 - WhatsApp/intervencoes sem autenticacao

- Classificacao: MEDIO/ALTO.
- Risco:
  - Registrar acao operacional sem responsavel real.
  - Usar localStorage como identidade daria falsa seguranca.
- Estrategia segura:
  - Criar tabela `driver_interventions` apenas com RLS.
  - Escrita somente com Supabase Auth.
  - Em modo anonimo: permitir visualizar, mas mostrar `Faca login para registrar uma acao operacional`.
- Teste necessario:
  - usuario anonimo nao grava;
  - usuario autorizado grava;
  - timeline preserva multiplas intervencoes.

## Risco 5 - Alterar classificacao de planilhas ou regra de SLA

- Classificacao: ALTO.
- Risco:
  - Qualquer alteracao em `processJt`, `processJtReal`, `computeImileResult`, `classifyAndProcess`, `mergePllugo` pode alterar numeros oficiais.
- Estrategia segura:
  - Nao mexer nessas funcoes na Fase 1.
  - Extrair testes/fixtures antes de qualquer refatoracao.
  - Novas camadas devem rodar depois do calculo atual.
- Teste necessario:
  - `ANTES === DEPOIS` para total, entregue, pendente, SLA, desconsiderados, motoristas e unidade.

## Risco 6 - Botao `Limpar Dados` em ferramenta operacional

- Classificacao: CRITICO se usado em producao sem backup.
- Risco:
  - `clearAllData()` apaga `sla_drivers`, `sla_days`, `tower_snapshots`, `tower_status`.
- Estrategia segura:
  - Antes da V2, decidir se o botao fica restrito a admin/Auth ou se sai da UI operacional.
  - Nunca acionar durante auditoria.
- Teste necessario:
  - backup/export antes de qualquer limpeza.

## Recomendacao de fases

1. Fase 0: adicionar baseline, risk review e testes de regressao.
2. Fase 1: migrations aditivas sem RLS destrutivo.
3. Fase 2: cockpit visual da Torre usando agregados atuais.
4. Fase 3: import_batches e auditoria de importacao.
5. Fase 4: operational_orders com whitelist e paginacao.
6. Fase 5: intervencoes/Auth/WhatsApp.
7. Fase 6: Risk Score V2 comparativo, ainda desligado por padrao.
