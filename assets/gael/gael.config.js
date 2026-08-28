/* ==================================================================
   GAEL — CONFIGURAÇÃO
   Este é o único arquivo que você edita para adaptar o Gael a uma
   ferramenta. O gael.js é o motor e não precisa ser tocado.

   Como está agora: configurado para o Dashboard SLA da Pllugo.
   Para outra ferramenta, troque os seletores em `data.fields`,
   reescreva os `intents` e ajuste `sections`.
   ================================================================== */
try { window.localStorage?.removeItem('gael:hidden'); } catch (_) {}

window.GAEL_CONFIG = {

  /* ================================================================
     1. PERSONAGEM
     ================================================================ */
  character: {
    heightVh: 0.24,      // altura como fração da janela
    heightMin: 130,      // nunca menor que isso (px)
    heightMax: 260,      // nunca maior que isso (px)
    entry: 'left',       // entra e repousa no lado esquerdo da tela
    mirror: 'moving',    // espelha só andando — o tablet tem a marca, logo invertido fica ruim
    ground: 14,          // distância dos pés até a base da janela
    zIndex: 1200         // acima do dashboard, abaixo dos modais operacionais
  },

  behavior: {
    chatter: false,      // puxar assunto sozinho, sem motivo
    wander: false,       // permanece fixo; movimentos manuais continuam disponíveis
    minTalkGap: 25000    // intervalo mínimo entre comentários automáticos (ms)
  },

  sound: { enabled: true, volume: 1 },

  dock: {
    enabled: true,
    position: 'right',  // 'right' | 'left' | 'center'
    label: 'Gael monitorando operação',
    placeholder: 'Pergunte ao Gael sobre SLA, motorista, risco...',
    submitLabel: 'Enviar'
  },

  /* Botão de ligar/desligar injetado na barra da ferramenta.
     container: seletor de onde encaixar. Deixe null para não criar. */
  toggle: { container: null, className: 'btn-clear', label: 'Gael', remember: false },

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
      slaOperacional:  { sel:'#operation-sla',     type:'percent' },
      rota:            { sel:'#operation-route',   type:'int' },
      concluidos:      { sel:'#operation-done',    type:'int' },
      naoConcluidos:   { sel:'#operation-pending', type:'int' },
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

  ask: async (pergunta, dados, data) => gaelAnswerQuestion(pergunta, dados, data),

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
function gaelEsc(v){ return String(v ?? '').replace(/[&<>'"]/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[ch])); }
function gaelSafe(fn, fallback){ try { return fn(); } catch (_) { return fallback; } }
function gaelN(v){ return Number(v) || 0; }
function gaelPct(v){ return v == null || !isFinite(v) ? '—' : `${Number(v).toFixed(1).replace('.', ',')}%`; }
function gaelStatusPt(s){ return ({ critical:'Crítico', risk:'Em risco', attention:'Atenção', normal:'Normal', monitoring:'Coletando' }[s] || s || '—'); }

function gaelBaseHistory(daysN) {
  const all = gaelSafe(() => historyForUnit(state.unit), []);
  if (!daysN || !all.length) return all;
  const sorted = all.slice().sort((a, b) => a.date.localeCompare(b.date));
  const last = sorted[sorted.length - 1]?.date;
  if (!last) return sorted;
  const start = new Date(last + 'T00:00:00');
  start.setDate(start.getDate() - daysN + 1);
  const startKey = start.toISOString().slice(0, 10);
  return sorted.filter(d => d.date >= startKey && d.date <= last);
}

function gaelFilteredHistory() {
  return gaelSafe(() => filteredHistory(), []);
}

function gaelAgg(hist = gaelFilteredHistory(), carrier = state.carrier) {
  return gaelSafe(() => aggregate(hist, carrier), { total:0, entregues:0, pendentes:0, sla:0 });
}

function gaelDrivers(hist = gaelFilteredHistory(), operational = true) {
  return gaelSafe(() => driversForCarrier(state.carrier, hist, { operationalJt: operational }), []);
}

function gaelDriverDaily(name, hist = gaelBaseHistory(30)) {
  const days = [];
  for (const day of hist) {
    const ds = gaelSafe(() => driversForCarrier(state.carrier, [day], { operationalJt:true }), []);
    const d = ds.find(x => gaelNorm(x.name) === gaelNorm(name));
    if (d) days.push({ date:day.date, total:gaelN(d.total), delivered:gaelN(d.delivered), pendentes:gaelN(d.pendentes), sla:gaelN(d.sla) });
  }
  return days;
}

function gaelFindDriver(question) {
  const q = gaelNorm(question);
  const all = gaelDrivers(gaelBaseHistory(30), true);
  const exact = all.find(d => q.includes(gaelNorm(d.name)));
  if (exact) return exact;
  const tokens = gaelDriverTokens(q);
  let best = null, score = 0, hits = 0;
  for (const d of all) {
    const nameTokens = gaelDriverTokens(d.name);
    let localHits = 0, localScore = 0;
    for (const token of tokens) {
      const match = nameTokens.find(nt => nt.includes(token) || token.includes(nt));
      if (match) {
        localHits++;
        localScore += Math.max(token.length, match.length);
      }
    }
    if (localScore > score) { best = d; score = localScore; hits = localHits; }
  }
  return best && (hits >= 2 || score >= 7) ? best : null;
}

const GAEL_DRIVER_STOPWORDS = new Set(['de','da','do','das','dos','e','a','o','as','os','jr','sr','filho','neto']);
function gaelDriverTokens(value) {
  return gaelNorm(value).split(/\s+/).filter(t => t.length >= 4 && !GAEL_DRIVER_STOPWORDS.has(t));
}

function gaelTopOffenders(daysN = null, limit = 8) {
  const hist = daysN ? gaelBaseHistory(daysN) : gaelFilteredHistory();
  return gaelDrivers(hist, true)
    .filter(d => gaelN(d.total) >= 5 && gaelN(d.sla) < 95)
    .map(d => ({ ...d, impact:gaelN(d.pendentes) }))
    .sort((a, b) => b.impact - a.impact || gaelN(a.sla) - gaelN(b.sla))
    .slice(0, limit);
}

function gaelRecurrentDrivers(daysN = 7) {
  const hist = gaelBaseHistory(daysN);
  const drivers = gaelDrivers(hist, true);
  return drivers.map(d => {
    const daily = gaelDriverDaily(d.name, hist);
    const badDays = daily.filter(x => x.total >= 3 && x.sla < 95).length;
    return { ...d, badDays, activeDays:daily.filter(x => x.total > 0).length };
  }).filter(d => d.badDays >= 2).sort((a, b) => b.badDays - a.badDays || gaelN(b.pendentes) - gaelN(a.pendentes));
}

function gaelTowerRows() {
  return gaelSafe(() => buildTowerAnalysis().filter(carrierOkForTower), []);
}

function gaelWhereToAct() {
  const tower = gaelTowerRows().slice().sort((a, b) => {
    const rank = { critical:4, risk:3, attention:2, normal:1, monitoring:0 };
    return (rank[b.status] || 0) - (rank[a.status] || 0) || gaelN(b.score) - gaelN(a.score) || gaelN(b.pendentes) - gaelN(a.pendentes);
  });
  const acts = tower.filter(d => ['critical','risk','attention'].includes(d.status)).slice(0, 5).map(d => ({
    title:d.name,
    text:`${gaelStatusPt(d.status)} · ${mil(gaelN(d.pendentes))} pendentes · projeção ${gaelPct(d.projected)}`,
    level:d.status
  }));
  if (acts.length) return acts;
  return gaelTopOffenders(null, 5).map(d => ({
    title:d.name,
    text:`${mil(gaelN(d.pendentes))} perdas · SLA ${gaelPct(d.sla)}`,
    level:d.sla < 90 ? 'critical' : 'attention'
  }));
}

function gaelGapText() {
  const a = gaelAgg();
  const need = Math.max(0, Math.ceil(a.total * 0.95 - a.entregues));
  return `Gap para 95%: com ${mil(a.total)} pedidos elegíveis, o SLA atual é <b>${gaelPct(a.sla)}</b>. Faltam aproximadamente <b>${mil(need)}</b> entrega(s) dentro da regra para chegar a 95%.`;
}

function gaelAnswerOverview() {
  const a = gaelAgg();
  const tower = gaelTowerRows();
  const critical = tower.filter(x => x.status === 'critical').length;
  const risk = tower.filter(x => x.status === 'risk').length;
  return `Resumo do Gael: ${window.GAEL_CONFIG.summary({ ...a, transportadora:(document.querySelector('.carrier-tabs .tab.active')?.textContent || 'Pllugo').trim(), meta:95 })}`
       + ` Pendentes/ofensas: <b>${mil(a.pendentes)}</b>. Torre: <b>${critical}</b> crítico(s) e <b>${risk}</b> em risco.`;
}

function gaelAnswerWhere() {
  const acts = gaelWhereToAct();
  if (!acts.length) return 'Onde atuar agora: nenhuma exceção relevante apareceu nos filtros atuais.';
  return `Onde atuar agora: ${acts.map((x, i) => `<b>${i + 1}. ${gaelEsc(x.title)}</b> - ${gaelEsc(x.text)}`).join('; ')}. Ordem: Torre, status, pendências, score e SLA.`;
}

function gaelAnswerRecurrent() {
  const r = gaelRecurrentDrivers(7);
  return 'Reincidência nos últimos 7 dias: '
       + (r.length ? r.slice(0, 8).map(d => `<b>${gaelEsc(d.name)}</b> - ${d.badDays} dia(s) abaixo de 95%, ${mil(gaelN(d.pendentes))} perdas`).join('; ') : 'não encontrei motoristas com 2 ou mais dias abaixo da meta no período.');
}

function gaelDatePt(date) {
  return date ? date.split('-').reverse().join('/') : '—';
}

function gaelDriverDetail(name) {
  const d = gaelDrivers(gaelBaseHistory(30), true).find(x => gaelNorm(x.name) === gaelNorm(name));
  const daily = gaelDriverDaily(name, gaelBaseHistory(30)).sort((a, b) => a.date.localeCompare(b.date));
  const total = d ? gaelN(d.total) : daily.reduce((s, x) => s + x.total, 0);
  const delivered = d ? gaelN(d.delivered) : daily.reduce((s, x) => s + x.delivered, 0);
  const pending = d ? gaelN(d.pendentes) : daily.reduce((s, x) => s + x.pendentes, 0);
  const sla = total ? 100 * delivered / total : null;
  const active = daily.filter(x => x.total > 0);
  const goodDays = active.filter(x => x.total >= 3 && x.sla >= 95).length;
  const badDays = active.filter(x => x.total >= 3 && x.sla < 95).length;
  const worst = active.length ? active.slice().sort((a, b) => a.sla - b.sla || b.total - a.total)[0] : null;
  const best = active.length ? active.slice().sort((a, b) => b.sla - a.sla || b.total - a.total)[0] : null;
  const last7 = daily.slice(-7), prev7 = daily.slice(-14, -7);
  const avg = arr => {
    const t = arr.reduce((s, x) => s + x.total, 0);
    const e = arr.reduce((s, x) => s + x.delivered, 0);
    return t ? 100 * e / t : null;
  };
  const delta = avg(last7) != null && avg(prev7) != null ? avg(last7) - avg(prev7) : null;
  const tower = gaelTowerRows().find(x => gaelNorm(x.name) === gaelNorm(name));
  const occ = Object.entries((d && d.occurrences) || {}).sort((a, b) => gaelN(b[1]) - gaelN(a[1]));
  return { name, d, daily, total, delivered, pending, sla, active, goodDays, badDays, worst, best, delta, tower, occ };
}

function gaelDriverMiniBars(daily) {
  if (!daily.length) return '<div class="gael-insight-empty">Sem histórico diário para este motorista nos últimos 30 dias.</div>';
  return daily.map(x => {
    const cls = x.sla >= 95 ? 'ok' : x.sla >= 90 ? 'warn' : 'bad';
    return `<div class="gael-day ${cls}" title="${gaelEsc(gaelDatePt(x.date))} · ${gaelPct(x.sla)} · ${mil(x.total)} OFD"><span>${gaelEsc(x.date.slice(8))}</span><b>${Math.round(gaelN(x.sla))}%</b></div>`;
  }).join('');
}

function gaelOpenInsight(title, subtitle, bodyHtml) {
  let modal = document.querySelector('#gael-insight-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'gael-insight-modal';
    modal.innerHTML = '<div class="gael-insight-card" role="dialog" aria-modal="true" aria-labelledby="gael-insight-title"><button type="button" class="gael-insight-close" aria-label="Fechar">×</button><div class="gael-insight-kicker">Gael · analista operacional</div><h3 id="gael-insight-title"></h3><p class="gael-insight-sub"></p><div class="gael-insight-body"></div></div>';
    document.body.appendChild(modal);
    modal.addEventListener('click', e => {
      if (e.target === modal || e.target.closest('.gael-insight-close')) modal.classList.remove('open');
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') modal.classList.remove('open');
    });
  }
  modal.querySelector('#gael-insight-title').textContent = title;
  modal.querySelector('.gael-insight-sub').textContent = subtitle;
  modal.querySelector('.gael-insight-body').innerHTML = bodyHtml;
  modal.classList.add('open');
}

function gaelOpenDriverInsight(name) {
  const d = gaelDriverDetail(name);
  const mainClass = d.sla >= 95 ? 'ok' : d.sla >= 90 ? 'warn' : 'bad';
  const trend = d.delta == null ? 'Sem base comparativa' : `${d.delta >= 0 ? '+' : ''}${d.delta.toFixed(1).replace('.', ',')} p.p. vs semana anterior`;
  const causes = d.occ.length
    ? `<div class="gael-insight-list">${d.occ.slice(0, 5).map(([label, qty]) => `<div><span>${gaelEsc(label)}</span><b>${mil(gaelN(qty))}</b></div>`).join('')}</div>`
    : '<div class="gael-insight-empty">Sem ocorrências categorizadas para este motorista.</div>';
  const tower = d.tower
    ? `<div class="gael-insight-alert ${d.tower.status}"><b>Torre agora</b><span>${gaelStatusPt(d.tower.status)} · score ${d.tower.score || 0}/100 · ${mil(gaelN(d.tower.pendentes))} pendentes · projeção ${gaelPct(d.tower.projected)}</span></div>`
    : '';
  const html = `
    <div class="gael-insight-grid">
      <div class="gael-insight-kpi ${mainClass}"><span>SLA 30d</span><strong>${gaelPct(d.sla)}</strong><small>${mil(d.total)} OFD</small></div>
      <div class="gael-insight-kpi"><span>Entregues</span><strong>${mil(d.delivered)}</strong><small>${mil(d.pending)} pendentes</small></div>
      <div class="gael-insight-kpi ${d.badDays >= 3 ? 'bad' : d.badDays ? 'warn' : 'ok'}"><span>Dias abaixo</span><strong>${mil(d.badDays)}</strong><small>${mil(d.goodDays)} dias na meta</small></div>
      <div class="gael-insight-kpi"><span>Tendência</span><strong>${d.delta == null ? '—' : (d.delta >= 0 ? '+' : '') + d.delta.toFixed(1).replace('.', ',')}</strong><small>${gaelEsc(trend)}</small></div>
    </div>
    ${tower}
    <div class="gael-insight-section"><h4>Últimos 30 dias</h4><div class="gael-days">${gaelDriverMiniBars(d.daily)}</div></div>
    <div class="gael-insight-grid two">
      <div class="gael-insight-kpi ok"><span>Melhor dia</span><strong>${d.best ? gaelPct(d.best.sla) : '—'}</strong><small>${d.best ? gaelDatePt(d.best.date) : 'sem base'}</small></div>
      <div class="gael-insight-kpi bad"><span>Pior dia</span><strong>${d.worst ? gaelPct(d.worst.sla) : '—'}</strong><small>${d.worst ? gaelDatePt(d.worst.date) : 'sem base'}</small></div>
    </div>
    <div class="gael-insight-section"><h4>Onde observar</h4>${causes}</div>`;
  const unitName = (document.querySelector('#unit-filter')?.selectedOptions?.[0]?.textContent || 'Todas').trim();
  gaelOpenInsight(d.name, `Histórico operacional · ${unitName} · ${(document.querySelector('.carrier-tabs .tab.active')?.textContent || 'Pllugo').trim()}`, html);
}

function gaelAnswerDriver(driver) {
  const d = gaelDriverDetail(driver.name);
  setTimeout(() => gaelOpenDriverInsight(driver.name), 0);
  const trend = d.delta != null ? ` Tendência recente: <b>${d.delta >= 0 ? '+' : ''}${d.delta.toFixed(1).replace('.', ',')} p.p.</b> versus a semana anterior.` : '';
  const tower = d.tower ? ` Agora na Torre: <b>${gaelStatusPt(d.tower.status)}</b>, ${mil(gaelN(d.tower.pendentes))} pendentes.` : '';
  return `${gaelEsc(driver.name)}: nos últimos 30 dias está com SLA <b>${gaelPct(d.sla)}</b>, ${mil(d.total)} OFD e ${mil(d.pending)} perdas. Dias abaixo de 95%: <b>${mil(d.badDays)}</b>.${trend}${tower} Abri o diagnóstico detalhado ao lado.`;
}

function gaelAnswerQuestion(pergunta, dados, data) {
  const q = gaelNorm(pergunta);
  const has = (...terms) => terms.some(t => q.includes(gaelNorm(t)));
  const driver = gaelFindDriver(pergunta);
  const driverTokenHit = driver && gaelDriverTokens(driver.name).some(t => q.includes(t));
  if (has('dado','qualidade','atualiz','confiar','auditoria')) {
    return { text:`Confiabilidade da leitura: ${gaelEsc(dados.qualidade || 'Qualidade dos dados')} · ${gaelEsc(dados.qualidadePill || '')}. ${gaelEsc(dados.frescor || '')}`, type:'info', point:'#data-quality-banner' };
  }
  if (has('causa','motivo','porque','por que','razao','razão','ocorrencia','ocorrência') && has('onde atuar','prioridade','o que fazer','reduzir','intervencao','intervenção')) {
    const text = (document.querySelector('#cause-insight')?.textContent || '').trim();
    return { text:`Causa principal: ${gaelEsc(text || 'a quebra por causa aparece em Visão Operação > Ofensores quando houver ocorrências categorizadas.')} Ação prática: ${gaelEsc(gaelWhereToAct().slice(0, 3).map((x, i) => `${i + 1}. ${x.title} - ${x.text}`).join('; ') || 'sem foco crítico no filtro atual.')}`, type:'warning', point:'#cause-section' };
  }
  if (driver && (driverTokenHit || has('motorista','como esta','como está','historico','histórico'))) {
    return { text:gaelAnswerDriver(driver), type:driver.sla < 95 ? 'warning' : 'info', point:'#ranking-section' };
  }
  if (has('onde atuar','prioridade','o que fazer','intervencao','intervenção')) {
    return { text:gaelAnswerWhere(), type:'warning', point:'#tower-section' };
  }
  if (has('reincid','recorren','ultimos 7','últimos 7')) {
    return { text:gaelAnswerRecurrent(), type:'warning', point:'#ranking-section' };
  }
  if (has('quanto falta','para 95','gap 95','gap','meta')) {
    return { text:gaelGapText(), type:'info', point:'#hero-section' };
  }
  if (has('motoristas ofensores','motorista ofensor','ofensores','fora da meta','abaixo da meta')) {
    const top = gaelTopOffenders(null, 3);
    if (!top.length) return { text:'Nenhum motorista ofensor com volume mínimo na janela selecionada.', type:'success', point:'#ofensores-section' };
    return { text:`Motoristas ofensores: ${mil(gaelTopOffenders(null, 999).length)} motorista(s) ofensores. Top 3 por impacto: ${top.map(d => `<b>${gaelEsc(d.name)}</b> (${gaelPct(d.sla)}, ${mil(gaelN(d.pendentes))} pend.)`).join('; ')}.`, type:'warning', point:'#ofensores-section' };
  }
  if (has('maua','mauá','ribeirao','ribeirão','unidade')) {
    const rows = ['maua','rbp'].map(u => ({ name:gaelSafe(() => unitLabel(u), u), a:gaelAgg(gaelSafe(() => filterHistoryPeriod(historyForUnit(u)), [])) })).filter(x => x.a.total);
    return { text:`Comparativo de unidades: ${rows.map(x => `<b>${gaelEsc(x.name)}</b> - ${gaelPct(x.a.sla)}, ${mil(x.a.pendentes)} perdas, ${mil(x.a.total)} elegíveis`).join('; ') || 'sem base por unidade no filtro atual.'}`, type:'info', point:'#overview-grid' };
  }
  if (has('cliente','jt','j&t','imile')) {
    const hist = state.unit === 'all' ? gaelFilteredHistory() : gaelSafe(() => filterHistoryPeriod(historyForUnit(state.unit)), []);
    const rows = [{ name:'J&T', a:gaelAgg(hist, 'jt_real') }, { name:'iMile', a:gaelAgg(hist, 'imile') }].filter(x => x.a.total);
    return { text:`Comparativo de clientes: ${rows.map(x => `<b>${x.name}</b> - ${gaelPct(x.a.sla)}, ${mil(x.a.pendentes)} perdas, ${mil(x.a.total)} elegíveis`).join('; ') || 'sem base por cliente no filtro atual.'}`, type:'info', point:'#overview-grid' };
  }
  if (has('causa','motivo','porque','por que','razao','razão','ocorrencia','ocorrência')) {
    const text = (document.querySelector('#cause-insight')?.textContent || '').trim();
    return { text:`Causas de perda: ${gaelEsc(text || 'a quebra por causa aparece em Visão Operação > Ofensores quando houver ocorrências categorizadas.')}`, type:'info', point:'#cause-section' };
  }
  if (has('risco','critico','crítico','parado','sem evolucao','sem evolução','torre')) {
    return { text:gaelAnswerWhere(), type:'warning', point:'#tower-section' };
  }
  if (has('sla','resumo','operacao','operação','como esta','como está','projecao','projeção')) {
    return { text:gaelAnswerOverview(), type:gaelAgg().sla >= 95 ? 'success' : 'warning', point:'#hero-section' };
  }
  return null;
}

function gaelEnhanceDock() {
  const dock = document.querySelector('#gael-dock');
  if (!dock || dock.dataset.enhanced === '1') return;
  dock.dataset.enhanced = '1';
  dock.dataset.minimized = 'false';
  const header = document.createElement('div');
  header.className = 'gael-dock-head';
  header.innerHTML = '<span class="gael-mini-avatar"><img src="assets/gael/gael-idle.webp" alt=""></span><span class="gael-live-dot"></span><div><strong>Gael monitorando operação</strong><small>Operação monitorada · leitura ativa</small></div><span class="gael-sla-pill">SLA —</span><button type="button" class="gael-minimize" aria-label="Minimizar Gael">-</button>';
  header.addEventListener('click', () => {
    if (dock.dataset.minimized === 'true') {
      dock.dataset.minimized = 'false';
      dock.dataset.open = 'false';
      return;
    }
    dock.dataset.open = 'true';
    setTimeout(() => document.querySelector('#gael-ask')?.focus(), 30);
  });
  header.querySelector('.gael-minimize')?.addEventListener('click', e => {
    e.preventDefault();
    e.stopPropagation();
    dock.dataset.minimized = 'true';
    dock.dataset.open = 'false';
  });
  const quick = document.createElement('div');
  quick.className = 'gael-quick';
  ['Resumo','Onde atuar','Gap 95%','Reincidentes','Motoristas ofensores'].forEach(label => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = label;
    btn.addEventListener('click', () => window.Gael?.ask(label));
    quick.appendChild(btn);
  });
  dock.insertBefore(header, dock.firstChild);
  dock.appendChild(quick);
  const sync = () => {
    const sla = document.querySelector('#hero-sla')?.textContent?.trim() || '—';
    const pill = dock.querySelector('.gael-sla-pill');
    if (pill) {
      pill.textContent = `SLA ${sla && sla !== '—' ? sla + (sla.includes('%') ? '' : '%') : '—'}`;
      const value = parseFloat(sla.replace('%','').replace(',','.'));
      pill.dataset.status = value >= 95 ? 'ok' : value >= 90 ? 'warn' : 'bad';
    }
  };
  sync();
  if (dock.dataset.syncBound !== '1') {
    dock.dataset.syncBound = '1';
    const syncSoon = () => {
      setTimeout(sync, 80);
      setTimeout(sync, 450);
    };
    document.addEventListener('click', e => {
      if (e.target.closest('.period-btn,.mode-tab,.operation-subtab,.carrier-tabs .tab,.tab')) syncSoon();
    }, true);
    document.addEventListener('change', e => {
      if (e.target.matches('#unit-filter,#date-day,#date-start,#date-end')) syncSoon();
    }, true);
    const heroSla = document.querySelector('#hero-sla');
    if (heroSla) new MutationObserver(syncSoon).observe(heroSla, { childList:true, characterData:true, subtree:true });
  }
  setInterval(sync, 5000);
}

function gaelPatchSpeechPlacement() {
  const speech = window.Gael?.character?.speech;
  if (!speech || speech._pllugoPlacement === '1') return false;
  speech._pllugoPlacement = '1';
  speech.update = function(dt, head, vw, vh) {
    const clampLocal = (v, a, b) => Math.min(b, Math.max(a, v));
    this.scale.step(dt);
    if (!this.visible && this.scale.v < 0.935) {
      this.el.style.transform = 'translate3d(-9999px,-9999px,0)';
      return;
    }
    if (this.isTyping) {
      this.charT += dt;
      const n = Math.floor(this.charT * (window.GAEL_CONFIG.speech?.typingSpeed || 52));
      if (n > this.shown) { this.shown = Math.min(this.full.length, n); this.render(); }
    } else if (this.visible) {
      this.holdT += dt * 1000;
      if (this.holdT > this.holdFor) this.hide();
    }
    if (this._dirty || this._w === undefined) {
      const r = this.el.getBoundingClientRect();
      this._w = r.width || 240;
      this._h = r.height || 60;
      this._dirty = false;
    }
    const w = this._w, h = this._h;
    const prefersLeft = head.x > vw * 0.52;
    let side = prefersLeft ? 'left' : 'right';
    let x = prefersLeft ? head.x - 24 - w : head.x + 24;
    if (x < 10) { side = 'right'; x = head.x + 24; }
    if (x + w > vw - 12) { side = 'left'; x = head.x - 24 - w; }
    x = clampLocal(x, 10, Math.max(10, vw - w - 10));
    let y = head.y - h - 16;
    if (y < 10) { side = 'below'; y = head.y + 22; }
    y = clampLocal(y, 10, Math.max(10, vh - h - 10));
    this.el.dataset.side = side;
    const caret = this.el.querySelector('.gael-caret');
    if (caret) caret.style.left = clampLocal(head.x - x - 6, 14, Math.max(14, w - 26)) + 'px';
    this.el.style.transform = `translate3d(${Math.round(x)}px,${Math.round(y)}px,0) scale(${this.scale.v.toFixed(3)})`;
  };
  return true;
}

function gaelPatchFixedLeftBehavior() {
  const gael = window.Gael?.character;
  if (!gael || gael._pllugoFixedLeft === '1') return false;
  gael._pllugoFixedLeft = '1';
  const reveal = async sel => {
    if (typeof sel !== 'string') return sel;
    return gael.data ? await gael.data.reveal(sel) : document.querySelector(sel);
  };
  const focusFromCurrentSpot = async function(sel, message, type = 'info', state = 'POINTING') {
    const el = await reveal(sel);
    if (!el) {
      if (message) this.say(message, { type });
      return;
    }
    const r = el.getBoundingClientRect();
    const cx = Math.min(innerWidth, Math.max(0, r.left + r.width / 2));
    this.stopMoving();
    this.faceTowards(cx);
    this.setState(state, { force:true });
    this.sm.lock(state === 'ALERT' ? 5200 : 3600);
    this.gazeAt(cx, r.top + r.height / 2, state === 'ALERT' ? 5600 : 4600);
    this.focusElement(el, state === 'ALERT' ? 6400 : 5400);
    if (message) this.say(message, { type });
  };
  gael.pointToElement = async function(sel, message, type = 'info') {
    await focusFromCurrentSpot.call(this, sel, message, type, 'POINTING');
    clearTimeout(this._pointT);
    this._pointT = setTimeout(() => { if (this.sm.state === 'POINTING') this.setState('IDLE', { force:true }); }, 4600);
  };
  gael.warn = async function(message, sel) {
    if (sel) await focusFromCurrentSpot.call(this, sel, message, 'warning', 'WARNING');
    else {
      this.stopMoving();
      this.setState('WARNING', { force:true });
      this.sm.lock(4000);
      this.say(message, { type:'warning' });
    }
    clearTimeout(this._warnT);
    this._warnT = setTimeout(() => { if (this.sm.state === 'WARNING') this.setState('IDLE', { force:true }); }, 5000);
  };
  gael.alert = async function(message, sel) {
    if (sel) await focusFromCurrentSpot.call(this, sel, message, 'critical', 'ALERT');
    else {
      this.stopMoving();
      this.setState('ALERT', { force:true });
      this.sm.lock(7000);
      this.say(message, { type:'critical' });
    }
    clearTimeout(this._alertT);
    this._alertT = setTimeout(() => { if (this.sm.state === 'ALERT') this.setState('IDLE', { force:true }); }, 6000);
  };
  return true;
}

function gaelInstallOfficialStyle() {
  if (document.querySelector('#gael-official-style')) return;
  const css = document.createElement('style');
  css.id = 'gael-official-style';
  css.textContent = `
    #gael-dock{right:18px!important;left:auto!important;bottom:18px!important;transform:none!important;width:min(386px,calc(100vw - 120px));display:grid!important;grid-template-columns:1fr auto!important;gap:8px!important;padding:9px!important;border-radius:16px!important;box-shadow:0 16px 42px rgba(20,20,24,.15)!important}
    #gael-dock[data-pos="center"],#gael-dock[data-pos="right"]{right:18px!important;left:auto!important;transform:none!important}
    #gael-dock[data-open="false"]{width:292px!important;grid-template-columns:1fr!important;cursor:pointer!important;padding:8px 10px!important}
    #gael-dock[data-minimized="true"]{width:48px!important;height:48px!important;padding:6px!important;border-radius:16px!important;display:flex!important;align-items:center!important;justify-content:center!important}
    #gael-open{display:none!important}
    #gael-dock[data-open="false"] #gael-ask,#gael-dock[data-open="false"] #gael-send,#gael-dock[data-open="false"] .gael-quick,#gael-dock[data-minimized="true"] #gael-ask,#gael-dock[data-minimized="true"] #gael-send,#gael-dock[data-minimized="true"] .gael-quick{display:none!important}
    .gael-dock-head{grid-column:1/-1;display:flex;align-items:center;gap:8px;min-width:0;cursor:pointer}
    #gael-dock[data-minimized="true"] .gael-dock-head{display:flex!important;gap:0!important;width:36px!important;height:36px!important}
    .gael-dock-head>div{min-width:0;flex:1}.gael-dock-head strong{display:block;font-size:12px;color:#202126;line-height:1.1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.gael-dock-head small{display:block;font-size:9px;color:#6E7280;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    #gael-dock[data-open="false"] .gael-dock-head small{display:none!important}
    .gael-mini-avatar{display:none;width:36px;height:36px;border-radius:12px;background:#FFF1F2;border:1px solid #F4C7CA;overflow:hidden;flex:0 0 auto}.gael-mini-avatar img{width:100%;height:100%;object-fit:cover}
    .gael-live-dot{width:10px;height:10px;border-radius:50%;background:#24B976;box-shadow:0 0 0 5px rgba(36,185,118,.12);flex:0 0 auto}
    .gael-sla-pill{margin-left:auto;border:1px solid #F1CED0;background:#FFF4F4;color:#D92532;border-radius:999px;padding:5px 8px;font-size:10px;font-weight:850;white-space:nowrap}.gael-sla-pill[data-status="ok"]{background:#ECFAF3;color:#0D7B51;border-color:#C7EFDB}.gael-sla-pill[data-status="warn"]{background:#FFF7E8;color:#A86400;border-color:#F2DDA5}
    .gael-minimize{width:20px!important;height:20px!important;border-radius:999px!important;border:1px solid #E3E5EB!important;background:#fff!important;color:#8A8F9B!important;font-size:13px!important;line-height:16px!important;padding:0!important;margin-left:2px!important}
    .gael-minimize:hover{background:#F7F8FA!important;color:#343844!important}
    #gael-dock[data-minimized="true"] .gael-mini-avatar{display:block!important}
    #gael-dock[data-minimized="true"] .gael-live-dot,#gael-dock[data-minimized="true"] .gael-dock-head div,#gael-dock[data-minimized="true"] .gael-sla-pill,#gael-dock[data-minimized="true"] .gael-minimize{display:none!important}
    #gael-ask{height:37px!important;width:auto!important;min-width:0!important;border:1px solid #D8DAE1!important;border-radius:10px!important;padding:0 12px!important;font-size:13px!important;background:#fff!important;box-sizing:border-box!important}
    #gael-send{width:40px!important;height:37px!important;padding:0!important;border-radius:10px!important;background:#1E2027!important;color:#fff!important;font-size:0!important;position:relative}#gael-send:after{content:'>';font-size:18px;line-height:1}
    .gael-quick{grid-column:1/-1;display:flex;gap:6px;overflow:auto;scrollbar-width:none}.gael-quick::-webkit-scrollbar{display:none}.gael-quick button{border:1px solid #E1E3EA!important;background:#fff!important;border-radius:999px!important;padding:7px 10px!important;color:#555B66!important;font-size:11px!important;font-weight:750!important}
    .agent-title{display:block;font-size:12px;font-weight:850;color:#18181B;margin-bottom:6px}.agent-note{display:block;margin-top:8px;color:#6E7280;font-size:11px}.agent-risk-line{display:flex;justify-content:space-between;gap:10px;padding:5px 0;border-bottom:1px solid rgba(0,0,0,.07)}.agent-risk-line:last-child{border-bottom:0}.agent-risk-line b{font-size:11px}.agent-risk-line span{font-size:10.5px;color:#6E7280;text-align:right}
    #gael-bubble{max-width:min(360px,calc(100vw - 130px))!important}
    #gael-bubble[data-side="left"] .gael-caret{left:auto!important;right:18px}
    #gael-insight-modal{position:fixed;inset:0;z-index:2200;display:none;align-items:flex-end;justify-content:flex-end;background:transparent;padding:18px 18px 82px;box-sizing:border-box;pointer-events:none}
    #gael-insight-modal.open{display:flex}
    .gael-insight-card{position:relative;width:min(460px,calc(100vw - 36px));max-height:min(650px,calc(100vh - 118px));overflow:auto;background:#fff;border:1px solid #E3E5EB;border-radius:16px;box-shadow:0 24px 80px rgba(20,20,24,.22);padding:16px;color:#17191F;pointer-events:auto}
    .gael-insight-close{position:absolute;right:10px;top:8px;border:0;background:transparent;font-size:22px;line-height:1;color:#8A8F9B;cursor:pointer}
    .gael-insight-kicker{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#EF3340;font-weight:850;margin-right:32px}
    .gael-insight-card h3{font-size:17px;line-height:1.15;margin:5px 32px 3px 0;color:#111827}
    .gael-insight-sub{font-size:11px;color:#667085;margin:0 0 12px}
    .gael-insight-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}.gael-insight-grid.two{grid-template-columns:repeat(2,minmax(0,1fr));margin-top:8px}
    .gael-insight-kpi{border:1px solid #E7E9EE;background:#FAFAFB;border-radius:10px;padding:9px;min-width:0}.gael-insight-kpi span{display:block;font-size:9px;font-weight:850;text-transform:uppercase;color:#667085}.gael-insight-kpi strong{display:block;font-size:17px;line-height:1.1;margin-top:5px}.gael-insight-kpi small{display:block;font-size:10px;color:#667085;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.gael-insight-kpi.ok{border-color:#BFEBD5;background:#F3FCF7}.gael-insight-kpi.warn{border-color:#F2DDA5;background:#FFF8E9}.gael-insight-kpi.bad{border-color:#F4C7CA;background:#FFF6F6}
    .gael-insight-alert{display:flex;justify-content:space-between;gap:10px;align-items:center;margin:10px 0 0;border-radius:10px;padding:9px 10px;background:#FFF8E9;border:1px solid #F2DDA5}.gael-insight-alert.critical{background:#FFF4F4;border-color:#F4C7CA}.gael-insight-alert span{font-size:11px;color:#667085;text-align:right}
    .gael-insight-section{margin-top:12px}.gael-insight-section h4{font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#667085;margin:0 0 7px}
    .gael-days{display:grid;grid-template-columns:repeat(10,minmax(0,1fr));gap:5px}.gael-day{height:36px;border-radius:8px;border:1px solid #E7E9EE;background:#FAFAFB;display:flex;flex-direction:column;align-items:center;justify-content:center}.gael-day span{font-size:9px;color:#667085}.gael-day b{font-size:10px}.gael-day.ok{background:#F3FCF7;border-color:#BFEBD5}.gael-day.warn{background:#FFF8E9;border-color:#F2DDA5}.gael-day.bad{background:#FFF4F4;border-color:#F4C7CA;color:#C4212E}
    .gael-insight-list{display:grid;gap:6px}.gael-insight-list div{display:flex;justify-content:space-between;gap:10px;border:1px solid #ECEEF3;border-radius:9px;padding:8px 10px;font-size:11px}.gael-insight-list span{color:#454B57}.gael-insight-empty{border:1px dashed #D8DAE1;border-radius:10px;padding:10px;font-size:11px;color:#667085;background:#FAFAFB}
    @media(max-width:700px){#gael-dock,#gael-dock[data-pos="center"],#gael-dock[data-pos="right"]{right:8px!important;left:8px!important;bottom:8px!important;width:auto!important;transform:none!important}#gael-dock[data-open="false"]{width:auto!important}.gael-dock-head small{display:none}#gael-bubble{max-width:calc(100vw - 22px)!important}.gael-insight-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.gael-days{grid-template-columns:repeat(7,minmax(0,1fr))}#gael-insight-modal{padding:10px}.gael-insight-card{width:100%;max-height:calc(100vh - 20px)}}
  `;
  document.head.appendChild(css);
}

function gaelInstallFilterSync() {
  if (document.body?.dataset.gaelFilterSync === '1') return;
  if (document.body) document.body.dataset.gaelFilterSync = '1';
  const hideSpeech = () => {
    try { window.Gael?.character?.speech?.hide(); } catch (_) {}
  };
  document.addEventListener('click', e => {
    if (e.target.closest('.period-btn,.mode-tab,.operation-subtab,.carrier-tabs .tab,.tab')) hideSpeech();
  }, true);
  document.addEventListener('change', e => {
    if (e.target.matches('#unit-filter,#date-day,#date-start,#date-end')) hideSpeech();
  }, true);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => { gaelInstallOfficialStyle(); gaelInstallFilterSync(); setInterval(gaelEnhanceDock, 300); setInterval(gaelPatchSpeechPlacement, 300); setInterval(gaelPatchFixedLeftBehavior, 300); });
} else {
  gaelInstallOfficialStyle();
  gaelInstallFilterSync();
  setInterval(gaelEnhanceDock, 300);
  setInterval(gaelPatchSpeechPlacement, 300);
  setInterval(gaelPatchFixedLeftBehavior, 300);
}
