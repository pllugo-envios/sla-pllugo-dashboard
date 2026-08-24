# Dashboard SLA Pllugo — versão independente (sem Claude, sem Python)

Este pacote transforma o dashboard num site que roda sozinho: você abre a URL,
clica em **Atualizar Dashboard**, seleciona os relatórios `.xlsx` que baixou
da J&T (JMS BR) e da iMile DS, e a própria página processa tudo e guarda no
banco. Depois disso o link já mostra os dados atualizados pra sempre — pra
qualquer pessoa que abrir, em qualquer dispositivo, sem precisar de mim
(Claude) nem do Python rodando em algum computador.

Ficam só duas contas grátis pra criar (Supabase pro banco, GitHub pra
hospedar a página) e dois arquivos pra colar/subir. Leva uns 10-15 minutos e
só precisa ser feito **uma vez**.

## 1. Criar o banco no Supabase (~3 min)

1. Acesse [supabase.com](https://supabase.com), crie conta grátis e clique em **New project**.
2. Dê um nome (ex: `sla-pllugo`), escolha uma senha de banco (guarde, mas não vai precisar dela aqui) e a região mais próxima (`South America (São Paulo)` se disponível).
3. Espere o projeto terminar de provisionar (~2 min).
4. No menu lateral, abra **SQL Editor** → **New query**.
5. Cole todo o conteúdo do arquivo `supabase_schema.sql` (está junto deste README) e clique em **Run**. Isso cria as duas tabelas (`sla_days` e `sla_drivers`) já com as regras de segurança certas.
6. No menu lateral, abra **Project Settings** → **API**. Copie dois valores:
   - **Project URL** (algo como `https://xxxxxxxxxxxx.supabase.co`)
   - **anon public** key (uma chave longa, começa geralmente com `eyJ...`)

Guarde os dois — usa no passo 3.

## 2. Criar o repositório no GitHub (~3 min)

1. Acesse [github.com/new](https://github.com/new).
2. Nome sugerido: `sla-pllugo-dashboard`. Deixe **Public** (foi a opção escolhida — a URL não vai aparecer em lugar nenhum, mas tecnicamente qualquer um com o link acessa; se depois você quiser trocar pra privado, precisa de um plano GitHub Pro/Team pra manter o Pages funcionando).
3. Clique em **Create repository** (não precisa marcar nenhuma opção extra).
4. Na tela do repositório vazio, clique em **uploading an existing file** e arraste os dois arquivos:
   - `index.html` (depois de editar com suas credenciais — veja passo 3)
   - `supabase_schema.sql` (opcional manter aqui, só de referência)
5. Clique em **Commit changes**.

## 3. Colar as credenciais do Supabase no `index.html`

Antes de subir o `index.html` (ou depois, editando direto pelo GitHub), abra
o arquivo num editor de texto e ache estas duas linhas perto do topo (dentro
da tag `<script>`, logo depois dos `<script src=...>` do Chart.js/SheetJS/Supabase):

```js
const SUPABASE_URL = 'COLE_AQUI_SUA_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'COLE_AQUI_SUA_SUPABASE_ANON_KEY';
```

Troque pelos valores que você copiou no passo 1:

```js
const SUPABASE_URL = 'https://xxxxxxxxxxxx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJ...(sua chave completa aqui)...';
```

Salve o arquivo. Isso é tudo que precisa mudar — o resto do arquivo já está pronto.

> A chave "anon" é feita pra ficar exposta num site público — o Supabase
> espera que ela vá embutida no HTML. Ela só consegue ler, inserir e
> atualizar as duas tabelas do dashboard (não consegue apagar nada, nem
> mexer em outras partes da sua conta Supabase). Veja a seção **Segurança**
> mais abaixo se quiser entender os limites disso.

## 4. Ativar o GitHub Pages (~1 min)

1. No repositório, vá em **Settings** → **Pages** (menu lateral esquerdo).
2. Em **Source**, escolha **Deploy from a branch**.
3. Em **Branch**, escolha `main` (ou `master`) e a pasta `/ (root)`. Clique em **Save**.
4. Espere ~1 minuto. Recarregue a página — vai aparecer a URL do site no topo, algo como:
   `https://SEU-USUARIO.github.io/sla-pllugo-dashboard/`

Essa é a URL definitiva do seu dashboard. Salve nos favoritos.

## 5. Usar no dia a dia

1. Baixe os relatórios normalmente (J&T no JMS BR, iMile no iMile DS) — pode
   baixar quantos dias quiser de uma vez, de qualquer um dos formatos:
   - `Monitoramento de bipagem de entrega(Lista)....xlsx` (J&T, SLA do dia)
   - `Entrega realizada(Lista)....xlsx` (J&T, relatório detalhado SLA Real)
   - `relatorio_sla_imile_....xlsx` ou `...OFD....xlsx` (iMile, um dia ou vários dias no mesmo arquivo)
2. Abra a URL do dashboard.
3. Clique em **Atualizar Dashboard**, selecione todos os arquivos baixados de uma vez (pode misturar J&T e iMile, vários dias, não precisa separar).
4. Espere a barra de status confirmar — o dashboard já atualiza sozinho na tela.
5. Pronto. Quem mais tiver o link já vê os dados novos, sem fazer nada.

Reimportar um dia que já existe não duplica nada — o dado mais recente
sempre substitui o anterior (mesma regra que já valia antes: relatório mais
completo sobrescreve).

## O que NÃO fica salvo (e por quê)

Só o agregado por dia (totais, SLA%, e um resumo por motorista) fica no
Supabase — nunca a lista de pacotes individual. Isso é o suficiente pra tudo
que o dashboard mostra hoje, e mantém o espaço usado bem abaixo do limite do
plano grátis (500 MB) por muitos anos, mesmo importando todo santo dia.

## Segurança — o que essa configuração cobre e o que não cobre

Você escolheu manter o repositório público com URL não listada (grátis, sem
plano pago). Isso significa:

- **Cobre:** ninguém encontra o dashboard por acaso — ele não aparece em buscas nem em nenhum diretório público, só quem tiver o link exato acessa.
- **Não cobre:** se o link vazar (encaminhado, printado, compartilhado sem querer), quem tiver acesso vê os nomes e SLA dos motoristas, e — como a chave anon libera insert/update — também consegue mandar dados fantasiosos pro banco (não consegue apagar seu histórico, só sujar com linhas erradas, que dá pra limpar depois pelo painel do Supabase).
- Se um dia isso virar problema, dá pra migrar pra um repositório privado + GitHub Pro (~US$4/mês), ou pra outra hospedagem com login de verdade (ex: Cloudflare Pages + Access, que tem plano grátis com autenticação) — o `index.html` não muda, só onde ele fica hospedado.

## Arquitetura (se quiser entender ou expandir depois)

- **`index.html`** é o site inteiro — HTML, CSS e JavaScript num arquivo só. Não depende de nenhum servidor além do Supabase (que só guarda dados).
- A lógica que lê os `.xlsx` e calcula o SLA é um porte fiel do `gerar_dashboard.py` original — mesmas 4 regras de negócio (J&T same-day, J&T SLA Real com a exceção de triagem, iMile de um dia, iMile multi-dia), mesmos 8 pares de apelido de motorista. Validada em 21/08/2026 batendo número a número contra o script Python original em relatórios reais.
- O botão **Atualizar Dashboard** lê os arquivos no seu navegador (biblioteca [SheetJS](https://sheetjs.com)), calcula os agregados, e manda pro Supabase via `upsert` (insere ou substitui, nunca duplica). Depois recarrega os dados do banco e redesenha os gráficos — tudo client-side.
- `supabase_schema.sql` cria duas tabelas: `sla_days` (um agregado por dia por transportadora) e `sla_drivers` (um agregado por motorista por dia por transportadora), cada uma com chave única que garante o upsert sem duplicar.

Se um dia quiser adicionar uma nova transportadora, o padrão é o mesmo do
Python: escrever uma função que recebe as linhas do Excel e devolve
`{total, entregues, pendentes, problematicos, sla, drivers}`, e plugar no
`classifyAndProcess` do `index.html`.

## SLA por motorista na aba "SLA Real (J&T)" — de onde vem (regra final 21/08/2026)

**Fonte: o próprio relatório Entrega realizada** (não o bipagem). Motivo e
histórico da decisão abaixo, porque já mudou de direção uma vez nesse mesmo
dia:

Percebemos que o campo "Entregador" do Entrega realizada podia mostrar um
motorista com muito mais pacotes do que ele tinha no bipagem — ex.: Lucas
Ronas Pereira aparecia com 78 pacotes no SLA Real (35,9%) contra só 28 no
bipagem do mesmo dia. Na primeira tentativa de correção, concluímos (errado)
que os 50 pacotes "a mais" eram uma atribuição incorreta do Entrega
realizada, e trocamos a fonte do ranking por motorista pra usar o bipagem.

Renato corrigiu esse entendimento: os 78 pacotes são reais — é exatamente a
quantidade que **saiu em rota** com aquele motorista (todos os 78 têm a
coluna "Horário de Saída para Entrega" preenchida). O bipagem é que estava
**incompleto**: ele não registra os pacotes que saíram em rota mas não
foram entregues — só entram no bipagem os que efetivamente foram bipados na
entrega. Por isso um motorista com vários pacotes não entregues aparecia
"perfeito" (100%) no bipagem, simplesmente porque os pacotes problemáticos
dele nem apareciam lá.

Regra final, a partir de 21/08/2026:
- **Total do motorista** = exatamente a quantidade de pacotes que saíram em
  rota com ele (todo pacote do Entrega realizada onde "Horário de Saída
  para Entrega" está preenchido e o campo Entregador tem o nome dele).
- **Entregue** = desse total, quantos foram entregues no mesmo dia (D0) da
  saída — comparando "Horário de Saída para Entrega" com "Horário da
  entrega". **Não** usa a coluna "Entregue no prazo？" nem a exceção de
  triagem aqui (essas duas só valem pro número agregado do dia inteiro) —
  o motorista é cobrado pela regra D0 pura e simples, sem suavização.
- Tudo que saiu e não foi entregue no mesmo dia (atrasou, nunca entregou,
  qualquer motivo) conta contra o motorista.
- O **número geral do dia** na aba SLA Real (total, SLA%, SLA same-day,
  desconsiderados) continua vindo do agregado do relatório Entrega
  realizada, sem mudança — só o ranking por motorista usa a regra D0 acima.

Essa regra está implementada em `processJtReal` (campo `x.sameday` na
agregação por motorista) — ver comentário no código pra detalhes.

## Erro "duplicate key value violates unique constraint sla_drivers_pkey" (corrigido 21/08/2026)

Esse erro aparecia às vezes ao clicar em Atualizar Dashboard, e quando
acontecia **nenhum dado daquele dia era salvo** (o card ficava zerado). A
causa: o mesmo motorista podia aparecer no relatório com grafias diferentes
(tudo maiúsculo vs. capitalizado, com ou sem acento, com ou sem o telefone
colado no fim do nome no relatório Entrega realizada) e virava duas linhas
diferentes na tabela — o Supabase recusa duas linhas pro mesmo motorista no
mesmo dia na mesma fonte.

Duas correções foram aplicadas:
1. O agrupamento por motorista agora usa uma chave que ignora acento e
   maiúsculo/minúsculo, então qualquer grafia da mesma pessoa vira uma linha
   só (com os números somados). Isso também corrigiu um bug separado na
   função que capitalizava nomes, que bagunçava letras acentuadas no meio da
   palavra (ex: "João" virava "JoÃO").
2. Como rede de segurança extra, se ainda assim sobrar alguma duplicata na
   hora de salvar, o dashboard funde as linhas automaticamente em vez de
   travar a importação.
Coberto por testes automáticos em `logic_test.js` e `smoke_test.js`.

## SLA Geral x SLA Motoristas (21/08/2026)

O topo do dashboard agora tem dois níveis de navegação:

1. **Modo** — `SLA Geral` ou `SLA Motoristas`. Geral mostra o card principal
   (SLA%, entregues/pendentes/volume) e os gráficos de tendência. Motoristas
   mostra os ofensores e o ranking por motorista. Nunca os dois juntos.
2. **Transportadora** — `Pllugo`, `J&T` ou `iMile`, dentro de qualquer um dos
   dois modos.

O que cada combinação mostra:

|                  | SLA Geral                                   | SLA Motoristas                          |
|------------------|----------------------------------------------|------------------------------------------|
| Pllugo           | agregado J&T (bipagem) + iMile, sem SLA Real | ranking combinando bipagem + iMile        |
| J&T              | agregado do **Entrega realizada** (SLA Real), com o painel de desconsiderados; o same-day do bipagem aparece só como linha de contexto ("SLA mesmo-dia seria X%") | ranking do Entrega realizada (ver regra D0 acima) |
| iMile            | agregado iMile                               | ranking iMile                             |

A antiga aba separada "SLA Real (J&T)" deixou de existir — ela virou a
combinação `SLA Geral > J&T` (pro agregado do dia) + `SLA Motoristas > J&T`
(pro ranking). A antiga "J&T Express" (same-day) também não é mais uma aba
própria — o dado do bipagem continua sendo usado (compõe o Pllugo e aparece
como referência secundária dentro de J&T), só não tem mais uma aba dedicada
pra ele sozinho.

## Reimportar sem duplicar e sem sobrecarregar o banco (21/08/2026)

Reimportar um relatório já importado antes **sempre é permitido** — pode ter
chegado informação nova (ex: relatório corrigido, mais pacotes bipados desde
a última vez). Mas o dashboard agora só grava no Supabase o que realmente é
**novo ou diferente** do que já está salvo: antes de cada `upsert`, ele busca
o que já existe pra aquele(s) dia(s) e compara campo a campo — linha idêntica
não gera nenhum write. Isso evita gastar a cota do plano grátis do Supabase
com writes repetidos toda vez que alguém reimporta o mesmo arquivo sem
mudança nenhuma. Quando um motorista some do relatório reimportado (ex:
pacote removido/corrigido), a linha antiga dele é apagada explicitamente, não
só deixada desatualizada. Coberto por testes em `smoke_test.js`.

## Botão "Limpar Dados" — temporário, só pra testes (21/08/2026)

Enquanto a ferramenta ainda está sendo validada, tem um botão **Limpar
Dados** no topo, do lado do "Atualizar Dashboard". Ele apaga **tudo** que
está salvo no Supabase (`sla_days` e `sla_drivers`, todos os dias, todas as
transportadoras) depois de um pop-up de confirmação — serve pra zerar a base
e reimportar tudo do zero durante os testes. É uma ação destrutiva e não tem
desfazer. Quando a ferramenta estiver validada e em uso normal, esse botão
deve ser removido do `index.html` (é só apagar o bloco `.btn-clear` no HTML,
a função `clearAllData` e o listener do `#btn-clear-data` no JS).
