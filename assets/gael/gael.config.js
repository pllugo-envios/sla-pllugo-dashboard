/* ==================================================================
   GAEL — CONFIGURAÇÃO
   Este é o único arquivo que você edita para adaptar o Gael a uma
   ferramenta. O gael.js é o motor e não precisa ser tocado.

   Como está agora: configurado para o Dashboard SLA da Pllugo.
   Para outra ferramenta, troque os seletores em `data.fields`,
   reescreva os `intents` e ajuste `sections`.
   ================================================================== */
window.GAEL_CONFIG = {

  /* ================================================================
     1. PERSONAGEM
     ================================================================ */
  character: {
    heightVh: 0.24,      // altura como fração da janela
    heightMin: 130,      // nunca menor que isso (px)
    heightMax: 260,      // nunca maior que isso (px)
    entry: 'right',      // 'right' (ao lado da barra) | 'left' | número em px
    mirror: 'moving',    // espelha só andando — o tablet tem a marca, logo invertido fica ruim
    ground: 14,          // distância dos pés até a base da janela
    zIndex: 45           // fique abaixo de modais e do cabeçalho fixo
  },

  behavior: {
    chatter: false,      // puxar assunto sozinho, sem motivo
    wander: true,        // caminhadas ociosas curtas
    minTalkGap: 25000    // intervalo mínimo entre comentários automáticos (ms)
  },

  sound: { enabled: true, volume: 1 },

  dock: {
    enabled: true,
    position: 'right',   // 'right' | 'left' | 'center'
    label: 'Pergunte ao Gael',
    placeholder: 'SLA, risco, pendências…',
    submitLabel: 'Enviar'
  },

  /* Botão de ligar/desligar injetado na barra da ferramenta.
     container: seletor de onde encaixar. Deixe null para não criar. */
  toggle: { container: '.topbar-actions', className: 'btn-clear', label: '🦊 Gael', remember: true },

  /* ================================================================
     2. FONTE DE DADOS
     Cada campo é lido do DOM já renderizado pela ferramenta.
       type: 'percent' | 'int' | 'text' | 'list' | 'exists'
     Também aceita função: minhaCoisa: () => meuEstado.sla
     Ou troque tudo por: source: () => ({ sla: 92.4, ... })
     ================================================================ */
  data: {
    fields: {
      sla:            { sel:'#hero-sla',        type:'percent' },
      meta:           { sel:'#exec-meta',       type:'percent', default:95 },
      entregues:      { sel:'#hero-entregues',  type:'int' },
      pendentes:      { sel:'#hero-pendentes',  type:'int' },
      total:          { sel:'#hero-total',      type:'int' },
      motoristas:     { sel:'#hero-drivers',    type:'int' },
      ofensores:      { sel:'#hero-drivers-sub',type:'text' },
      gap:            { sel:'#exec-gap',        type:'text' },
      base:           { sel:'#exec-base',       type:'text' },
      excluidos:      { sel:'#exec-excluded',   type:'text' },
      criticos:       { sel:'#tower-critical',  type:'int' },
      emRisco:        { sel:'#tower-risk',      type:'int' },
      atencao:        { sel:'#tower-attention', type:'int' },
      monitorados:    { sel:'#tower-monitored', type:'int' },
      frescor:        { sel:'#tower-freshness', type:'text' },
      badge:          { sel:'#nav-alert-badge', type:'int', default:0 },
      nomesCriticos:  { sel:'.tower-driver.critical .tower-name', type:'list', limit:5 },
      nomesRisco:     { sel:'.tower-driver.risk .tower-name',     type:'list', limit:5 },
      qtdOfensores:    { sel:'#ofensor-count', type:'int', default:0 },
      topOfensores:    () => Array.from(document.querySelectorAll('#ofensores-grid .ofensor')).slice(0,3).map(card => {
        const nome = (card.querySelector('.ofensor-name')?.textContent || '').trim();
        const sla = (card.querySelector('.ofensor-sla')?.textContent || '').trim();
        const perda = (card.querySelector('[style*="pllugo-red"]')?.textContent || '').trim();
        return [nome, sla, perda].filter(Boolean).join(' · ');
      }).filter(Boolean),
      janela:         { sel:'#window-info',     type:'text' },
      dias:           { sel:'#day-count',       type:'text' },
      causa:          { sel:'#cause-insight',   type:'text' },
      qualidade:      { sel:'#data-quality-title', type:'text' },
      qualidadePill:  { sel:'#data-quality-pill',  type:'text' },
      transportadora: () => (document.querySelector('.carrier-tabs .tab.active')?.textContent || 'Pllugo').trim(),
      unidade:        () => (document.querySelector('#unit-filter')?.selectedOptions?.[0]?.textContent || 'Todas').trim()
    },

    /* quando considerar que existe dado na tela */
    ready: d => d.sla != null && (d.total || 0) > 0,

    emptyMessage: 'Não tem dado carregado nessa janela. Importe os relatórios em Atualizar Dashboard que eu leio na hora.'
  },

  /* frase-resumo reaproveitada na saudação e no clique */
  summary: d => `${d.transportadora} está em <b>${br(d.sla)}%</b> de SLA ${d.sla >= d.meta ? '— acima da meta de' : 'contra a meta de'} ${br(d.meta)}%. `
              + `<b>${mil(d.entregues)}</b> entregues de ${mil(d.total)} na base elegível.`,

  /* ================================================================
     3. NAVEGAÇÃO
     Antes de apontar para um alvo escondido, o Gael clica nas abas
     necessárias e rola a tela até ele.
     ================================================================ */
  sections: {
    '#hero-section':          { click:['.mode-tab[data-mode="geral"]'] },
    '#executive-kpis':        { click:['.mode-tab[data-mode="geral"]'] },
    '#unit-performance-grid': { click:['.mode-tab[data-mode="geral"]'] },
    '#descons-section':       { click:['.mode-tab[data-mode="geral"]'] },
    '#data-quality-banner':   { click:[] },
    '#tower-section':         { click:['.mode-tab[data-mode="torre"]'] },
    '#operation-section':     { click:['.mode-tab[data-mode="operacao"]','.operation-subtab[data-op-view="resumo"]'] },
    '#cause-section':         { click:['.mode-tab[data-mode="operacao"]','.operation-subtab[data-op-view="ofensores"]'] },
    '#ofensores-section':     { click:['.mode-tab[data-mode="operacao"]','.operation-subtab[data-op-view="ofensores"]'] },
    '#ranking-section':       { click:['.mode-tab[data-mode="operacao"]','.operation-subtab[data-op-view="motoristas"]'] }
  },

  /* ================================================================
     4. BASE DE PERGUNTAS
     Primeiro intent cujo `match` aparece na pergunta vence.
     `when` permite duas respostas para o mesmo assunto.
     `text` aceita função(dados) ou texto com {campo}.
     Acentos e maiúsculas são ignorados na comparação.
     ================================================================ */
  intents: [
    {
      id: 'motoristas-ofensores',
      match: ['motoristas ofensores','motorista ofensor','ofensores','fora da meta','abaixo da meta'],
      point: '#ofensores-section',
      type: d => (d.qtdOfensores||0) > 0 ? 'warning' : 'success',
      text: d => {
        const top = d.topOfensores || [];
        if (!(d.qtdOfensores||0)) return 'Nenhum motorista ofensor com volume mínimo na janela selecionada.';
        return `<b>${d.qtdOfensores}</b> motorista(s) ofensores na janela. `
             + (top.length ? `Top 3 por impacto: ${top.join('; ')}.` : 'Estou abrindo a lista para análise.');
      }
    },
    {
      id: 'risco-zerado',
      match: ['risco','torre','parado','critico','sem bipe','motorista'],
      when: d => (d.criticos||0) + (d.emRisco||0) === 0,
      point: '#tower-section', type: 'success',
      text: d => `Nenhum motorista em risco agora. ${d.monitorados||0} monitorados, todos dentro do padrão.`
    },
    {
      id: 'risco',
      match: ['risco','torre','parado','critico','sem bipe','motorista'],
      point: '#tower-section',
      type: d => (d.criticos||0) > 0 ? 'critical' : 'warning',
      text: d => {
        const nomes = [...(d.nomesCriticos||[]), ...(d.nomesRisco||[])].slice(0,3);
        return `<b>${d.criticos||0}</b> crítico(s) e <b>${d.emRisco||0}</b> em risco entre ${d.monitorados||0} monitorados`
             + (nomes.length ? `. Primeiros da fila: ${nomes.join(', ')}.` : '.');
      }
    },
    {
      id: 'sla',
      match: ['sla','meta','prazo','gap','performance'],
      point: '#hero-section',
      type: d => d.sla >= d.meta ? 'success' : (d.sla >= 90 ? 'warning' : 'critical'),
      text: d => `${d.transportadora} está em <b>${br(d.sla)}%</b> de SLA contra a meta de ${br(d.meta)}%.`
               + (d.gap && d.gap !== '—' ? ` Gap para a meta: <b>${String(d.gap).replace(/\.$/,'')}</b>.` : '')
    },
    {
      id: 'ofensas',
      match: ['pendencia','ofensa','perda','fora da regra','atraso'],
      point: '#executive-kpis', type: 'warning',
      text: '<b>{pendentes}</b> ofensas na janela, sobre uma base elegível de {base}. Excluídos: {excluidos}.'
    },
    {
      id: 'causa',
      match: ['causa','motivo','porque','por que','razao'],
      point: '#cause-section', type: 'info',
      text: d => d.causa || 'A quebra por causa fica na Visão Operação, aba Ofensores. Estou te levando lá.'
    },
    {
      id: 'unidade',
      match: ['unidade','maua','ribeirao','rbp','estacao','base'],
      point: '#unit-performance-grid', type: 'info',
      text: 'Filtro atual: {unidade}. A comparação entre Mauá e Ribeirão Pires está aqui.'
    },
    {
      id: 'ranking',
      match: ['ranking','melhor','pior','entregador','equipe','time'],
      point: '#ranking-section', type: 'info',
      text: '{motoristas} motoristas na janela — {ofensores}. O ranking completo é este.'
    },
    {
      id: 'volume',
      match: ['entregue','volume','produtividade','quanto','quantos'],
      point: '#hero-section', type: 'success',
      text: '<b>{entregues}</b> entregues de {total} na base elegível, em {dias} dia(s) ({janela}).'
    },
    {
      id: 'qualidade',
      match: ['dado','qualidade','atualiz','fonte','confia'],
      point: '#data-quality-banner', type: 'info',
      text: '{qualidade} — {qualidadePill}. {frescor}'
    },
    {
      id: 'desconsiderados',
      match: ['desconsiderado','excluido','excluidos'],
      point: '#descons-section', type: 'info',
      text: 'Excluídos da base: {excluidos}. A lista de pedidos desconsiderados fica na Visão Geral.'
    },
    {
      id: 'saudacao',
      match: ['oi','ola','bom dia','boa tarde','boa noite','tudo bem','e ai'],
      type: 'normal',
      text: d => 'Oi! ' + window.GAEL_CONFIG.summary(d)
    },
    {
      id: 'resumo',
      match: ['resumo','como esta','situacao','panorama','dia','geral'],
      type: 'info',
      text: d => window.GAEL_CONFIG.summary(d)
              + (d.criticos ? ` Tem <b>${d.criticos}</b> motorista(s) crítico(s) na Torre.` : '')
    }
  ],

  fallback: 'Sei responder sobre SLA, motoristas em risco, ofensas, causas, unidades, ranking e qualidade dos dados. Pergunta de outro jeito?',

  /* Para plugar um agente de verdade depois (n8n, Supabase, API própria):
     descomente e o motor passa a usar isto no lugar dos intents.
     Nenhuma chave de API no frontend — chame o seu backend.

  ask: async (pergunta, dados) => {
    const r = await fetch('/api/gael', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ pergunta, dados })
    });
    const j = await r.json();
    return { text: j.resposta, type: j.tipo || 'info', point: j.alvo };
  },
  */

  ask: async (pergunta, dados, data) => {
    const q = gaelNorm(pergunta);
    const falaDeOfensor = ['motoristas ofensores','motorista ofensor','ofensores','fora da meta','abaixo da meta']
      .some(termo => q.includes(gaelNorm(termo)));
    if (!falaDeOfensor) return null;

    await data.reveal('#ofensores-section');
    const atual = data.read();
    const top = atual.topOfensores || [];
    if (!(atual.qtdOfensores || 0)) {
      return {
        text: 'Nenhum motorista ofensor com volume mínimo na janela selecionada.',
        type: 'success',
        point: '#ofensores-section'
      };
    }
    return {
      text: `<b>${atual.qtdOfensores}</b> motorista(s) ofensores na janela. `
          + (top.length ? `Top 3 por impacto: ${top.join('; ')}.` : 'Estou abrindo a lista para análise.'),
      type: 'warning',
      point: '#ofensores-section'
    };
  },

  /* ================================================================
     5. SAUDAÇÃO
     Ele espera o dado aparecer (até greetingWaitMs) antes de falar.
     ================================================================ */
  greetingWaitMs: 14000,
  greeting: d => {
    if (d.sla == null) return { text:'Olá! Eu sou o Gael. Assim que você importar os relatórios, eu começo a acompanhar a operação.', type:'normal' };
    const critico = (d.criticos||0) > 0;
    return {
      text: 'Olá! Eu sou o Gael. ' + window.GAEL_CONFIG.summary(d)
          + (critico ? ` Já tem <b>${d.criticos}</b> motorista(s) crítico(s) na Torre.` : ''),
      type: critico ? 'warning' : (d.sla >= d.meta ? 'success' : 'info')
    };
  },

  /* frases quando clicam nele sem ter dado */
  tapLines: ['Pode falar, estou aqui.','O que você quer ver?','Manda a pergunta na barra ali do lado.'],

  /* ================================================================
     6. REAÇÕES AUTOMÁTICAS
     O motor observa os elementos de `watch` e roda `when` a cada
     mudança. Respeita o minTalkGap, salvo ignoreGap: true.
     ================================================================ */
  watchers: [
    {
      id: 'escalada-torre',
      watch: '#nav-alert-badge',
      ignoreGap: true,             // risco de motorista fura a fila
      cooldown: 60000,
      when: (cur, prev) => (cur.badge||0) > (prev.badge||0) && (cur.badge||0) > 0,
      do: (Gael, d) => {
        const nomes = [...(d.nomesCriticos||[]), ...(d.nomesRisco||[])].slice(0,2);
        Gael.alert(`<b>${d.badge}</b> motorista(s) em risco ou crítico na Torre agora`
          + (nomes.length ? `: ${nomes.join(', ')}.` : '.')
          + ' Vale acionar antes do fim da janela.', '#tower-section');
      }
    },
    {
      id: 'sla-caiu',
      watch: '#hero-sla',
      when: (cur, prev) => cur.sla != null && prev.sla != null && prev.sla >= prev.meta && cur.sla < cur.meta,
      do: (Gael, d) => Gael.warn(`SLA caiu para <b>${br(d.sla)}%</b>, abaixo da meta de ${br(d.meta)}%.`, '#hero-section')
    },
    {
      id: 'meta-batida',
      watch: '#hero-sla',
      when: (cur, prev) => cur.sla != null && prev.sla != null && prev.sla < prev.meta && cur.sla >= cur.meta,
      do: (Gael, d) => Gael.celebrate(`Meta atingida: SLA em <b>${br(d.sla)}%</b>. Excelente trabalho!`)
    }
  ]
};

/* atalhos de formatação usados acima */
function br(v){ return (v==null||!isFinite(v)) ? '—' : v.toFixed(1).replace('.',','); }
function mil(v){ return (v==null||!isFinite(v)) ? '—' : Number(v).toLocaleString('pt-BR'); }
function gaelNorm(v){ return String(v || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,''); }
