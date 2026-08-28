# Gael Digital — pacote v2

Personagem assistente da Pllugo, pronto para plugar em qualquer ferramenta web.
Sem dependência externa, sem build, sem framework.

## Arquivos

    gael.js           motor: personagem, animação, física, fala, interação
    gael.config.js    configuração: dados, perguntas, navegação, reações
    gael-*.webp       8 poses oficiais
    exemplo.html      página de exemplo com uma configuração mínima

Você edita **só o config**. O motor não precisa ser tocado para adaptar a
uma ferramenta nova.

## Instalação

Copie a pasta `gael/` para dentro do projeto e adicione, antes de `</body>`:

    <script src="gael/gael.config.js"></script>
    <script src="gael/gael.js" defer></script>

O módulo injeta o próprio CSS e o próprio DOM. Nada mais muda no seu HTML.

Sirva por HTTP (servidor local ou GitHub Pages). Em `file://` o navegador
bloqueia a textura WebGL e ele cai no modo simplificado, sem piscada.

## Como configurar

### 1. Fonte de dados

Cada campo aponta para um seletor do que a sua ferramenta já mostra na tela:

    data: {
      fields: {
        sla:     { sel:'#hero-sla',   type:'percent' },
        volume:  { sel:'#total',      type:'int' },
        nomes:   { sel:'.linha .nome', type:'list', limit:5 },
        turno:   () => meuEstado.turno            // ou uma função sua
      },
      ready: d => d.sla != null,
      emptyMessage: 'Ainda não tem dado nessa tela.'
    }

Tipos: `percent`, `int`, `number`, `float`, `text`, `list`, `exists`.
Todo campo aceita `default`.

Se os dados não estão no DOM, troque tudo por uma função:

    data: { source: () => ({ sla: meuEstado.sla, volume: meuEstado.total }) }

### 2. Base de perguntas

    intents: [
      { id:'sla',
        match:['sla','meta','prazo'],          // acento e maiúscula são ignorados
        when: d => d.sla < d.meta,             // opcional: variante condicional
        point:'#hero-section',                 // opcional: para onde ele vai apontar
        type:'warning',                        // normal | info | success | warning | critical
        text:'SLA em {sla} contra a meta de {meta}.' }
    ]

`text` e `type` aceitam função `(dados) => ...` quando precisa de lógica.
Em texto simples, `{campo}` vira o valor já formatado em pt-BR.
O primeiro intent cujo `match` bate e cujo `when` passa vence.
Sem match, responde o `fallback`.

### 3. Navegação

Quando o alvo está escondido atrás de uma aba, diga o que clicar antes:

    sections: {
      '#tower-section': { click:['.mode-tab[data-mode="torre"]'] },
      '#cause-section': { click:['.tab-operacao','.subtab-ofensores'] }
    }

Ele clica na sequência, rola até o elemento, destaca e aponta.
Use `{ scroll:false }` para não rolar.

### 4. Reações automáticas

    watchers: [
      { id:'alerta',
        watch:'#badge',            // elemento observado
        ignoreGap:true,            // fura o intervalo mínimo entre falas
        cooldown:60000,
        when:(cur,prev) => cur.badge > prev.badge,
        do:(Gael,d) => Gael.alert(`${d.badge} alertas abertos.`, '#lista') }
    ]

O motor observa os elementos, relê os campos a cada mudança e roda `when`.

### 5. Agente de verdade

Para ligar num backend (n8n, Supabase, API própria), defina `ask`.
Quando existe, ele substitui os intents:

    ask: async (pergunta, dados) => {
      const r = await fetch('/api/gael', { method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ pergunta, dados }) });
      const j = await r.json();
      return { text:j.resposta, type:j.tipo, point:j.alvo };
    }

Nunca coloque chave de API no frontend — chame o seu backend.

## Ajustes do personagem

    character: {
      heightVh:0.24, heightMin:130, heightMax:260,   // tamanho
      entry:'right',      // 'right' (ao lado da barra) | 'left' | número em px
      mirror:'moving',    // espelha só andando, para não inverter a marca do tablet
      ground:14,          // distância dos pés até a base da janela
      zIndex:45           // abaixo de modais e cabeçalho fixo
    }
    behavior: { chatter:false, wander:true, minTalkGap:25000 }
    sound:    { enabled:true, volume:1 }
    dock:     { enabled:true, position:'right', label:'Pergunte ao Gael' }
    toggle:   { container:'.topbar-actions', label:'🦊 Gael' }

## API

    Gael.say('texto', { type:'warning' })
    Gael.pointToElement('#alvo', 'mensagem')
    Gael.warn('mensagem', '#alvo')
    Gael.alert('mensagem', '#alvo')
    Gael.celebrate('mensagem')
    Gael.think() / Gael.wave() / Gael.jump()
    Gael.walkTo(x) / Gael.runTo(x) / Gael.home()
    Gael.ask('pergunta')
    Gael.read()            // leitura atual dos campos
    Gael.show() / Gael.hide() / Gael.mute(true)

Ou por evento, sem acoplamento nenhum:

    document.dispatchEvent(new CustomEvent('gael:alert', {
      detail: { message:'SLA abaixo de 90%', target:'#hero-section' }
    }));

Eventos: `gael:alert`, `gael:warn`, `gael:success`, `gael:say`, `gael:point`.

## Testes

`?gael=dev` na URL abre um painel com os estados para validar as animações.

## Quando o gael.glb existir

Coloque o modelo em `assets/models/gael.glb` (ou ajuste `assets.model` no
config). No boot o motor faz um HEAD nesse caminho: se existir, o renderer
Three.js assume; se não, segue no 2.5D. Clipes esperados: Idle, Walk, Run,
Wave, Think, Talk, Point, Celebrate, Jump, Alert, UseTablet.
Nada mais no config muda.
