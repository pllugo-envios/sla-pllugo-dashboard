const assert = require('assert');

function round1(n) {
  return Math.round(n * 10) / 10;
}

function isJtRealOperationalException(problemStr) {
  const s = String(problemStr || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ');
  return s.includes('ERRO DE TRIAGEM')
    || s.includes('ENCOMENDA EXPEDIDA MAS NAO CHEGOU')
    || s.includes('EXPEDIDA MAS NAO CHEGOU')
    || s.includes('EXPEDIDO MAS NAO CHEGOU');
}

function jtRealOfficial(rows) {
  const eligible = rows.filter(r => !(isJtRealOperationalException(r.problem) && r.onTime !== true));
  const delivered = eligible.filter(r => r.onTime === true).length;
  return {
    total: eligible.length,
    entregues: delivered,
    pendentes: eligible.length - delivered,
    desconsiderados: rows.length - eligible.length,
    sla: eligible.length ? round1(100 * delivered / eligible.length) : 0,
  };
}

function jtDriverRouteDay(rows, day) {
  const routed = rows.filter(r => r.driver && r.routeDay === day);
  const delivered = routed.filter(r => r.deliveryDay === r.routeDay).length;
  return {
    total: routed.length,
    delivered,
    pendentes: routed.length - delivered,
    sla: routed.length ? round1(100 * delivered / routed.length) : 0,
  };
}

function imileAggregate(rows) {
  const total = rows.reduce((sum, r) => sum + (Number(r.ofd) || 0), 0);
  const delivered = rows.reduce((sum, r) => sum + (Number(r.delivered) || 0), 0);
  return {
    total,
    entregues: delivered,
    pendentes: total - delivered,
    sla: total ? round1(100 * delivered / total) : 0,
  };
}

function mergePllugo(jt, imile) {
  const total = (jt?.total || 0) + (imile?.total || 0);
  const entregues = (jt?.entregues || 0) + (imile?.entregues || 0);
  const pendentes = (jt?.pendentes || 0) + (imile?.pendentes || 0);
  const desconsiderados = (jt?.desconsiderados || 0) + (imile?.desconsiderados || 0);
  return {
    total,
    entregues,
    pendentes,
    desconsiderados,
    sla: total ? round1(100 * entregues / total) : 0,
  };
}

{
  const official = jtRealOfficial([
    { onTime: true },
    { onTime: true },
    { onTime: false },
    { onTime: false, problem: 'Erro de triagem' },
    { onTime: false, problem: 'Expedido mas nao chegou' },
  ]);
  assert.deepStrictEqual(official, {
    total: 3,
    entregues: 2,
    pendentes: 1,
    desconsiderados: 2,
    sla: 66.7,
  });
}

{
  const driver = jtDriverRouteDay([
    { driver: 'Carlos', promisedDay: '2026-08-09', routeDay: '2026-08-10', deliveryDay: '2026-08-10' },
    { driver: 'Carlos', promisedDay: '2026-08-10', routeDay: '2026-08-10', deliveryDay: '2026-08-11' },
    { driver: 'Carlos', promisedDay: '2026-08-10', routeDay: null, deliveryDay: null },
  ], '2026-08-10');
  assert.deepStrictEqual(driver, {
    total: 2,
    delivered: 1,
    pendentes: 1,
    sla: 50,
  });
}

{
  const imile = imileAggregate([
    { ofd: 100, delivered: 95 },
    { ofd: 80, delivered: 72 },
  ]);
  assert.deepStrictEqual(imile, {
    total: 180,
    entregues: 167,
    pendentes: 13,
    sla: 92.8,
  });
}

{
  const jt = { total: 3, entregues: 2, pendentes: 1, desconsiderados: 2 };
  const imile = { total: 180, entregues: 167, pendentes: 13, desconsiderados: 0 };
  assert.deepStrictEqual(mergePllugo(jt, imile), {
    total: 183,
    entregues: 169,
    pendentes: 14,
    desconsiderados: 2,
    sla: 92.3,
  });
}

console.log('regression_sla_contract.test.js: contratos de SLA preservados');
