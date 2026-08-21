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

## SLA por motorista na aba "SLA Real (J&T)" — de onde vem (regra 21/08/2026)

O campo "Entregador" do relatório **Entrega realizada** (usado pro SLA Real)
às vezes atribui pacotes a um motorista que não bateu esse pacote naquele
dia — confirmado cruzando pedido a pedido com o **Monitoramento de
bipagem**: motorista Lucas Ronas Pereira aparecia com 78 pacotes no SLA
Real (35,9%), mas só 28 desses 78 batiam com o bipagem do mesmo dia; os
outros 50 não apareciam sob nenhum motorista no bipagem.

Por isso, a partir de 21/08/2026:
- O **número geral do dia** na aba SLA Real (total, SLA%, SLA same-day,
  desconsiderados) continua vindo 100% do relatório Entrega realizada, sem
  mudança nenhuma.
- O **ranking por motorista** dessa mesma aba passou a vir do relatório de
  bipagem (mesma fonte já usada na aba J&T normal), não mais do Entrega
  realizada. Isso significa que, num dia em que só o Entrega realizada foi
  importado (sem o bipagem correspondente), a tabela de motoristas da aba
  SLA Real fica vazia pra aquele dia — é esperado, não é bug. Pra ver o
  ranking de motorista de um dia na aba SLA Real, sempre importe os dois
  relatórios (bipagem + Entrega realizada) daquele dia juntos.

**Regra de "dentro do prazo" pro SLA motorista (confirmada por Renato em
21/08/2026):** um pacote só conta como entregue dentro do prazo se a coluna
"Horário da entrega" for do mesmo dia (D0) que a coluna que registra quando
o pacote saiu bipado pro entregador. No relatório de bipagem essa coluna se
chama "Tempo de entrega"; no Entrega realizada, a mesma informação vem na
coluna "Horário de Saída para Entrega" — são o mesmo dado (confirmado
batendo valor a valor, pedido por pedido, entre os dois relatórios). Se o
pacote não foi entregue no mesmo dia da saída — atrasou, nunca foi
entregue, qualquer motivo — conta como fora do prazo. É exatamente essa
regra que já está implementada no cálculo do bipagem (`processJt`), que é
a fonte do SLA motorista desde a mudança acima.
