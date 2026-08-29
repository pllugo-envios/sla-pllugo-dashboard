# GAEL_TOWER_V2_ROLLBACK

## Principio

A V2 deve ser reversivel por desligamento de feature flags e retirada de UI nova, mantendo os dados oficiais atuais intactos.

## Rollback de UI

Se uma tela nova causar problema:

1. desligar a respectiva feature flag:
   - `FEATURE_TOWER_V2_UI`
   - `FEATURE_ORDER_DETAIL`
   - `FEATURE_DRIVER_INTERVENTIONS`
   - `FEATURE_AUTH_ACTIONS`
   - `FEATURE_TOWER_RISK_V2`
2. voltar para a versao anterior de `index.html` e `assets/gael/gael.config.js`;
3. nao apagar tabelas novas.

## Rollback de Risk Score V2

Se V2 gerar falso alarme:

1. manter `FEATURE_TOWER_RISK_V2=false`;
2. continuar usando `buildTowerAnalysis()` V1;
3. preservar comparativo para analise posterior.

## Rollback de pedidos detalhados

Se `operational_orders` causar lentidao ou divergencia:

1. desligar `FEATURE_ORDER_DETAIL`;
2. remover drawers/modais de pedidos da UI;
3. manter `sla_days` e `sla_drivers` como fonte oficial.

## Rollback de intervencoes

Se autenticacao ou intervencoes falharem:

1. desligar `FEATURE_DRIVER_INTERVENTIONS`;
2. desligar `FEATURE_AUTH_ACTIONS`;
3. esconder botoes de registrar tratativa/WhatsApp;
4. manter timeline inacessivel ate correcao.

## Rollback de migrations

As migrations desta fase sao aditivas.

Preferencia de rollback:

- nao dropar tabelas novas em producao;
- desligar flags;
- deixar dados para auditoria.

Rollback destrutivo so deve ocorrer depois de backup e aprovacao explicita.

## Tabelas legadas que nao devem ser apagadas

- `sla_days`
- `sla_drivers`
- `tower_snapshots`
- `tower_status`

## Banco

Nunca executar sem backup:

- `DROP TABLE`
- `TRUNCATE`
- `DELETE` em massa
- alteracao de RLS legado

## Procedimento minimo de recuperacao

1. Voltar arquivos da `main` para ultima versao estavel.
2. Confirmar leitura de `sla_days` e `sla_drivers`.
3. Confirmar que a Visao Geral abre.
4. Confirmar que a Torre atual abre.
5. Reimportar ultimo relatorio conhecido apenas se necessario.
