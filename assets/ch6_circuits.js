/* ch6_circuits.js — the circuits of chapter 6 (slides pp. 17–20), shared by the pages and tests.html.
   All are frequency-domain circuits for the engine's 'ac' mode; source phasors are peak values in the sine reference.
   CH6C.p1  practice 1 (slide p. 17, Hayt Example 10.6): Z_AB at ω = 5 rad/s, as reduction stages with a 1∠0° V test source at AB
   CH6C.p2  practice 2 (slide p. 18, Hayt Example 10.7): i(t) with vs = 40 sin 3000t V
   CH6C.hw  homework (slide p. 20, Hayt Example 10.5): I_s when I_C = 2∠28° A at ω = 2 rad/s */
(function (global) {
'use strict';
const Cx = CK.Cx, cx = Cx.c; const W_ = (a, b, o = {}) => ({ type: 'W', a, b, ...o });
const par = (a, b) => Cx.div(Cx.mul(a, b), Cx.add(a, b));
const CH6C = {};

/* ---------------- practice 1: Z_AB of a ladder at ω = 5 rad/s ---------------- */
CH6C.p1 = (() => {
  const w = 5, ZC1 = Cx.inv(cx(0, w * 0.2)), ZL1 = cx(0, w * 2), ZC2 = Cx.inv(cx(0, w * 0.5));
  const Za = par(cx(6, 0), ZC2), Zb = Cx.add(Cx.add(Za, ZC1), ZL1), Zab = par(cx(10, 0), Zb);
  const src = [{ id: 'Vt', type: 'VAC', a: 'S', b: 'Sb', amp: 1, phase: 0, name: 'V_{test}', valText: '1∠0° V', side: -1, color: '#9aa3c7', test: true }, W_('S', 'A', { id: 'wS', test: true }), W_('Sb', 'B', { id: 'wSb', test: true })];
  const base = { S: [-1.9, 0], Sb: [-1.9, 3], A: [0, 0], B: [0, 3] };
  const zt = z => CH6.rect(z, 4).replace(/-/g, '−').replace(/\\,/g, '') + ' Ω';
  const stages = [
    { nodes: { ...base, n1: [1.5, 0], m: [3.5, 0], n2: [5.5, 0], n3: [7.4, 0], n1b: [1.5, 3], n2b: [5.5, 3], n3b: [7.4, 3] },
      parts: [...src, W_('A', 'n1'), { id: 'C1', type: 'C', a: 'n1', b: 'm', value: 0.2, name: '200 mF', valText: '−j1 Ω' }, { id: 'L1', type: 'L', a: 'm', b: 'n2', value: 2, name: '2 H', valText: 'j10 Ω', side: -1 },
        W_('n2', 'n3'), { id: 'R10', type: 'R', a: 'n1', b: 'n1b', value: 10, name: '10 Ω', valText: '', side: 1 }, { id: 'R6', type: 'R', a: 'n2', b: 'n2b', value: 6, name: '6 Ω', valText: '', side: -1 },
        { id: 'C2', type: 'C', a: 'n3', b: 'n3b', value: 0.5, name: '500 mF', valText: '−j0.4 Ω', side: 1 }, W_('B', 'n1b'), W_('n1b', 'n2b'), W_('n2b', 'n3b')],
      group: ['R6', 'C2'] },
    { nodes: { ...base, n1: [1.5, 0], m: [3.5, 0], n2: [5.5, 0], n1b: [1.5, 3], n2b: [5.5, 3] },
      parts: [...src, W_('A', 'n1'), { id: 'C1', type: 'C', a: 'n1', b: 'm', value: 0.2, name: '200 mF', valText: '−j1 Ω' }, { id: 'L1', type: 'L', a: 'm', b: 'n2', value: 2, name: '2 H', valText: 'j10 Ω', side: -1 },
        { id: 'R10', type: 'R', a: 'n1', b: 'n1b', value: 10, name: '10 Ω', valText: '', side: 1 }, { id: 'Za', type: 'Z', a: 'n2', b: 'n2b', value: Za, name: 'Z_a', valText: zt(Za), side: 1 },
        W_('B', 'n1b'), W_('n1b', 'n2b')],
      born: ['Za'], group: ['C1', 'L1', 'Za'] },
    { nodes: { ...base, n1: [1.5, 0], n2: [5.5, 0], n1b: [1.5, 3], n2b: [5.5, 3] },
      parts: [...src, W_('A', 'n1'), W_('n1', 'n2'), { id: 'R10', type: 'R', a: 'n1', b: 'n1b', value: 10, name: '10 Ω', valText: '', side: 1 },
        { id: 'Zb', type: 'Z', a: 'n2', b: 'n2b', value: Zb, name: 'Z_b', valText: zt(Zb), side: 1 }, W_('B', 'n1b'), W_('n1b', 'n2b')],
      born: ['Zb'], group: ['R10', 'Zb'] },
    { nodes: { ...base, n1: [2.6, 0], n1b: [2.6, 3] },
      parts: [...src, W_('A', 'n1'), { id: 'Zab', type: 'Z', a: 'n1', b: 'n1b', value: Zab, name: 'Z_{AB}', valText: zt(Zab), side: 1 }, W_('B', 'n1b')],
      born: ['Zab'] } ];
  stages.forEach(s => { s.ground = 'Sb'; s.mode = 'ac'; s.w = w; });
  return { w, ZC1, ZL1, ZC2, Za, Zb, Zab, stages };
})();

/* ---------------- practice 2: vs = 40 sin 3000t V, find i(t) ---------------- */
CH6C.p2 = (() => {
  const w = 3000, ZL = cx(0, w / 3), ZC = Cx.inv(cx(0, w * 1e-6 / 6));
  const spec = { ground: 'g', mode: 'ac', w,
    nodes: { s: [0, 0], a: [3.6, 0], b: [7.6, 0], g: [0, 3], ga: [3.6, 3], gb: [7.6, 3] },
    parts: [ { id: 'Vs', type: 'VAC', a: 's', b: 'g', amp: 40, phase: 0, name: 'v_s', valText: '40∠0° V', side: -1 },
      { id: 'R1', type: 'R', a: 's', b: 'a', value: 1500, name: '1.5 kΩ', valText: '' }, { id: 'L', type: 'L', a: 'a', b: 'ga', value: 1 / 3, name: '⅓ H', valText: 'j1000 Ω', side: 1 },
      { id: 'R2', type: 'R', a: 'a', b: 'b', value: 1000, name: '1 kΩ', valText: '' }, { id: 'C', type: 'C', a: 'b', b: 'gb', value: 1e-6 / 6, name: '⅙ µF', valText: '−j2000 Ω', side: 1 },
      W_('g', 'ga'), W_('ga', 'gb') ] };
  /* mesh equations of the class solution: (1500 + j1000) I1 − j1000 I2 = 40 ; −j1000 I1 + (1000 − j1000) I2 = 0 */
  const a11 = cx(1500, 1000), a12 = cx(0, -1000), a21 = cx(0, -1000), a22 = cx(1000, -1000), b1 = cx(40, 0), b2 = cx(0, 0);
  const D = Cx.sub(Cx.mul(a11, a22), Cx.mul(a12, a21)), D1 = Cx.sub(Cx.mul(b1, a22), Cx.mul(a12, b2)), D2 = Cx.sub(Cx.mul(a11, b2), Cx.mul(b1, a21));
  const I1 = Cx.div(D1, D), I2 = Cx.div(D2, D);
  const Zp = par(ZL, Cx.add(cx(1000, 0), ZC)), Zeq = Cx.add(cx(1500, 0), Zp);
  return { w, ZL, ZC, spec, a11, a12, a21, a22, b1, b2, D, D1, D2, I1, I2, Zp, Zeq };
})();

/* ---------------- homework: I_C = 2∠28° A, ω = 2 rad/s, find I_s ---------------- */
CH6C.hw = (() => {
  const w = 2, IC = CH6.polar(2, 28), ZC = Cx.inv(cx(0, w * 1)), VC = Cx.mul(ZC, IC), IR2 = Cx.scale(VC, 1 / 2), Is = Cx.add(IR2, IC);
  const spec = (Vs = 5) => ({ ground: 'g', mode: 'ac', w,
    nodes: { s: [0, 0], m: [2.8, 0], r: [5.4, 0], c: [7.4, 0], g: [0, 3], gm: [2.8, 3], gr: [5.4, 3], gc: [7.4, 3] },
    parts: [ { id: 'Vs', type: 'VAC', a: 's', b: 'g', amp: Vs, phase: 0, name: 'V_s', valText: `${Vs}∠0° V`, side: -1 },
      { id: 'R1', type: 'R', a: 's', b: 'm', value: 1, name: '1 Ω', valText: '' }, { id: 'L', type: 'L', a: 'm', b: 'gm', value: 2, name: '2 H', valText: 'j4 Ω', side: -1 },
      { id: 'Is', type: 'IAC', a: 'm', b: 'r', amp: Cx.abs(Is), phase: CH6.deg(Is), name: 'I_s', valText: '?' },
      { id: 'R2', type: 'R', a: 'r', b: 'gr', value: 2, name: '2 Ω', valText: '', side: -1 }, W_('r', 'c'),
      { id: 'C', type: 'C', a: 'c', b: 'gc', value: 1, name: '1 F', valText: '−j0.5 Ω', side: 1 }, W_('g', 'gm'), W_('gm', 'gr'), W_('gr', 'gc') ] });
  return { w, IC, ZC, VC, IR2, Is, spec };
})();

global.CH6C = CH6C;
})(window);
