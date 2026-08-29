# GAEL_TOWER_V2_ARCHITECTURE

## Objetivo

Evoluir Gael e Torre de Controle como camada operacional deterministica, sem IA externa e sem alterar os numeros oficiais atuais.

## Principio

Arquitetura aditiva:

1. manter `sla_days` e `sla_drivers` como fonte oficial dos agregados atuais;
2. manter `tower_snapshots` e `tower_status` como motor atual da Torre;
3. adicionar novas tabelas para auditoria, pedidos, perfis, intervencoes e flags;
4. ativar novos recursos somente por feature flag;
5. nunca substituir Risk Score V1 ou SLA oficial sem comparativo.

## Camadas de dados

### Camada 1 - Pedidos

Tabela proposta: `operational_orders`.

Uso:

- guardar pedido individual somente quando o relatorio fornecer granularidade por pedido;
- nao inventar pedido individual para iMile quando vier apenas agregado por motorista;
- alimentar detalhes sob demanda, com paginacao e filtros.

Privacidade:

- gravar somente campos operacionais;
- nao gravar endereco completo, CPF, telefone/nome de destinatario ou linha bruta inteira.

### Camada 2 - Motoristas

Tabelas propostas:

- `driver_profiles`
- `driver_interventions`

Uso:

- consolidar nome/telefone operacional do motorista;
- registrar tratativas sem sobrescrever historico;
- permitir timeline por motorista/dia.

### Camada 3 - Operacao

Tabelas e estruturas:

- `sla_days`
- `sla_drivers`
- `tower_snapshots`
- `tower_status`
- `feature_flags`
- `import_batches`

Uso:

- manter SLA oficial;
- registrar origem de importacoes;
- habilitar gradualmente cockpit V2, pedidos em risco, recuperabilidade e risk score V2.

## Fontes atuais

### J&T Entrega realizada

- Fonte principal da Visao Geral J&T.
- Regras oficiais congeladas:
  - `Entregue no prazo = Y` conta entregue no prazo;
  - `N` ou vazio fica fora do prazo;
  - `Erro de triagem` e `Expedido mas nao chegou` fora do prazo saem da base elegivel;
  - motorista e calculado pela data de saida em rota, com D0 puro.

### J&T Monitoramento

- Fonte operacional do dia.
- Alimenta Visao Operacao e Torre.
- Deve refletir o que saiu em rota e evolucao ao longo do dia.

### iMile

- Hoje tratada como agregado por motorista/dia.
- `data_granularity = driver_aggregate` quando nao houver pedido individual.

## Feature flags

Tabela: `feature_flags`.

Flags iniciais:

- `FEATURE_TOWER_V2_UI`
- `FEATURE_ORDER_DETAIL`
- `FEATURE_DRIVER_INTERVENTIONS`
- `FEATURE_AUTH_ACTIONS`
- `FEATURE_TOWER_RISK_V2`

Todas devem nascer `false`.

## Risk Score

### V1

Permanece oficial na Torre atual.

### V2

Futuro `buildTowerAnalysisV2()` em paralelo.

Variaveis propostas:

- proporcao pendente;
- tempo sem evolucao;
- SLA projetado;
- ritmo necessario;
- ritmo atual;
- comparacao com historico do proprio motorista;
- carga versus P75;
- reincidencia.

Status proposto:

- 0-29 Normal
- 30-51 Atencao
- 52-74 Risco
- 75-100 Critico

`FEATURE_TOWER_RISK_V2` deve permanecer `false` ate comparativo V1 x V2.

## Projecao, risco e recuperabilidade

Essas metricas nunca substituem SLA oficial.

Rotulos obrigatorios:

- `SLA atual`
- `PROJECAO`
- `estimativa operacional`

Definicoes iniciais:

- SLA projetado: entregues atuais + capacidade restante estimada sobre total em rota.
- Pedidos sob risco: pendencia acima da capacidade estimada de conclusao no tempo restante.
- Pedidos recuperaveis: parcela da pendencia que ainda cabe na capacidade estimada.

Sem roteirizacao geografica, nao apresentar previsao individual de entrega.

## WhatsApp

Fase futura:

- usar `https://wa.me/NUMERO?text=MENSAGEM_ENCODED`;
- abrir modal antes;
- permitir editar mensagem;
- registrar intervencao somente com usuario autenticado;
- nao enviar automaticamente.

## Autenticacao

Fase futura:

- Supabase Auth;
- tabela `profiles`;
- roles: `admin`, `supervisor`, `operator`, `viewer`;
- usuario anonimo pode visualizar o dashboard conforme comportamento atual;
- acoes operacionais com registro exigem login.

## Performance

- O dashboard nao deve carregar `operational_orders` completo no boot.
- Detalhe de pedido deve ser paginado.
- Consultas por data, fonte, unidade, motorista, status e tracking.
- Manter `fetchAllRows` ou paginacao equivalente para qualquer tabela que possa passar de 1000 linhas.

## Nao regressao

Antes de ativar qualquer recurso:

- `total_old === total_new`
- `delivered_old === delivered_new`
- `pending_old === pending_new`
- `excluded_old === excluded_new`
- `drivers_old === drivers_new`
- `SLA_old === SLA_new`

Qualquer diferenca exige investigacao antes de deploy.
