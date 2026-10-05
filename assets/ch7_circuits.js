/* ch7_circuits.js — the circuits of chapter 7 (AC circuit analysis), shared by the pages and tests.html.
   Frequency-domain circuits for the engine's 'ac' mode. Problems that give only impedances or admittances are drawn with
   ω = 1 rad/s so that L = X_L and C = 1/|X_C| (any ω gives the same phasors). Phasors are peak values, sine reference.
   CH7C.ex1   Ex 1–3 (slides pp. 4–6, Hayt Practice 10.12 and 10.14): the 20∠0° mA / 50∠−90° mA circuit (admittances in mS)
   CH7C.ex4   Ex 4 (slide p. 7): sources at 200 and 100 rad/s, superposition in the time domain
   CH7C.ex5   Ex 5 (slide p. 8): Thévenin and Norton equivalents at A–B
   CH7C.hw1   homework 1 (slide p. 10, Hayt Problem 10.50)
   CH7C.hw2   homework 2 (slide p. 11, Hayt Problem 10.53)
   CH7C.hw3   homework 3 (slide p. 12, Hayt Problem 10.55) for ω = 20 rad/s (Hayt) or 2 rad/s (as printed in the 2025 handout)
   CH7C.x1    extra from the 2018 lecture (Hayt Example 10.9): v1(t), v2(t) by nodal analysis, with the class solution
   CH7C.x2    extra from the 2018 lecture: I1, I2, I3 by nodal (and mesh) analysis, 100∠0° V source
   CH7C.x3    extra from the 2018 lecture (Hayt Example 10.11): the Thévenin equivalent seen by the −j10 Ω, then V1
   CH7C.pd13  phasor diagram of Hayt Example 10.13 (parallel G, −jB_L, jB_C with V = 1∠0° as the reference, then the true 1∠0° A)
   CH7C.pd17  phasor diagram of Hayt Practice 10.17 (series–parallel, I_C = 1∠0° as the reference) */
(function (global) {
'use strict';
const Cx = CK.Cx, cx = Cx.c; const W_ = (a, b, o = {}) => ({ type: 'W', a, b, ...o });
const P = (m, a) => CH6.polar(m, a);
const det2 = (a, b, c, d) => Cx.sub(Cx.mul(a, d), Cx.mul(b, c));
/* 3×3 determinant by Sarrus (the six products in the slide order of chapter 1) */
const det3 = m => { const T = [[+1, [0, 0], [1, 1], [2, 2]], [+1, [0, 1], [1, 2], [2, 0]], [+1, [0, 2], [1, 0], [2, 1]], [-1, [2, 0], [1, 1], [0, 2]], [-1, [2, 1], [1, 2], [0, 0]], [-1, [2, 2], [1, 0], [0, 1]]];
  return T.reduce((s, [sg, ...ix]) => Cx.add(s, Cx.scale(ix.reduce((p, [r, c]) => Cx.mul(p, m[r][c]), cx(1)), sg)), cx(0)); };
const repl = (m, b, k) => m.map((row, r) => row.map((x, c) => c === k ? b[r] : x));
const CH7C = { det2, det3, repl };

/* ---------------- Ex 1–3: nodal, mesh and superposition on one circuit ---------------- */
CH7C.ex1 = (() => {
  const Is1 = P(0.02, 0), Is2 = P(0.05, -90), YC = cx(0, 0.05), YL = cx(0, -0.025), G = 0.04;
  const ZC = Cx.inv(YC), ZL = Cx.inv(YL), R = 1 / G;                         // −j20 Ω, j40 Ω, 25 Ω
  /* nodal (class form): j0.025 V1 + j0.025 V2 = 0.02 + j0.05 ; j0.025 V1 + (0.04 − j0.025) V2 = −j0.05 */
  const a11 = Cx.add(YC, YL), a12 = Cx.neg(YL), a21 = Cx.neg(YL), a22 = Cx.add(cx(G, 0), YL);
  const b1 = Cx.sub(Is1, Is2), b2 = Is2;                                     // 20 mA in, 50∠−90° leaves v1 and enters v2
  const D = det2(a11, a12, a21, a22), D1 = det2(b1, a12, b2, a22), D2 = det2(a11, b1, a21, b2);
  const V1 = Cx.div(D1, D), V2 = Cx.div(D2, D);
  /* mesh (class form): i1 = 0.02∠0, i2 = 0.05∠−90 known; (−j20)(i3 − i1) + j40(i3 − i2) + 25 i3 = 0 */
  const i1 = Is1, i2 = Is2, num = Cx.add(Cx.mul(ZC, i1), Cx.mul(ZL, i2)), den = Cx.add(Cx.add(ZC, ZL), cx(R, 0)), i3 = Cx.div(num, den);
  /* superposition (Hayt Practice 10.14): one source at a time */
  const only = (s1, s2) => { const bb1 = Cx.sub(s1, s2), bb2 = s2, d = det2(a11, a12, a21, a22); return { V1: Cx.div(det2(bb1, a12, bb2, a22), d), V2: Cx.div(det2(a11, bb1, a21, bb2), d) }; };
  const sup1 = only(Is1, cx(0)), sup2 = only(cx(0), Is2);
  /* o: k1 / k2 (kill source 1 / 2: open), y (admittance labels only, as on the slide) */
  const spec = (o = {}) => ({ ground: 'g1', mode: 'ac', w: 1,
    nodes: { sb: [0, 3], st: [0, 1.3], v1: [2.3, 1.3], v2: [4.9, 1.3], t1: [2.3, -0.3], t2: [4.9, -0.3], g1: [2.3, 3], g2: [4.9, 3] },
    parts: [ o.k1 ? { id: 'I1', type: 'O', a: 'sb', b: 'st', label: false, ghost: 'I' } : { id: 'I1', type: 'IAC', a: 'sb', b: 'st', amp: 0.02, phase: 0, name: '20∠0° mA', valText: '', side: -1 },
      W_('st', 'v1', { id: 'w1' }), { id: 'C', type: 'C', a: 'v1', b: 'g1', value: 0.05, name: 'j50 mS', valText: o.y ? '' : '(−j20 Ω)', side: 1 },
      { id: 'L', type: 'L', a: 'v1', b: 'v2', value: 40, name: '−j25 mS', valText: '' },
      { id: 'R', type: 'R', a: 'v2', b: 'g2', value: 25, name: '40 mS', valText: o.y ? '' : '(25 Ω)', side: 1 },
      W_('v1', 't1', { id: 'wt1' }), o.k2 ? { id: 'I2', type: 'O', a: 't1', b: 't2', label: false, ghost: 'I' } : { id: 'I2', type: 'IAC', a: 't1', b: 't2', amp: 0.05, phase: -90, name: '50∠−90° mA', valText: '' },
      W_('v2', 't2', { id: 'wt2' }), W_('sb', 'g1', { id: 'wb1' }), W_('g1', 'g2', { id: 'wb2' }) ] });
  return { Is1, Is2, YC, YL, G, ZC, ZL, R, a11, a12, a21, a22, b1, b2, D, D1, D2, V1, V2, i1, i2, i3, num, den, sup1, sup2, spec };
})();

/* ---------------- Ex 4: three sources, two frequencies ---------------- */
CH7C.ex4 = (() => {
  const L = 5e-3, src = [ { id: 'is1', w: 200, amp: 2, ph: 90, kind: 'I' }, { id: 'is2', w: 100, amp: 1, ph: 90, kind: 'I' }, { id: 'vs3', w: 200, amp: 2, ph: 0, kind: 'V' } ];
  /* the two current sources are the only path into the series branch, so i_L = i_s1 + i_s2 whatever v_s3 is */
  const part = s => s.kind === 'V' ? { VL: cx(0), IL: cx(0) } : (() => { const IL = P(s.amp, s.ph), ZL = cx(0, s.w * L); return { IL, ZL, VL: Cx.mul(ZL, IL) }; })();
  const parts = src.map(part);
  const spec = (keep, w) => ({ ground: 'ab', mode: 'ac', w,
    nodes: { ab: [0, 3], at: [0, 0], bb: [2.4, 3], bt: [2.4, 0], c: [4.6, 0], d: [6.6, 0], e: [6.6, 3] },
    parts: [ keep.includes('is1') ? { id: 'is1', type: 'IAC', a: 'ab', b: 'at', amp: 2, phase: 90, name: 'i_{s1}', valText: '2∠90° A', side: -1 } : { id: 'is1', type: 'O', a: 'ab', b: 'at', label: false, ghost: 'I' },
      keep.includes('is2') ? { id: 'is2', type: 'IAC', a: 'bb', b: 'bt', amp: 1, phase: 90, name: 'i_{s2}', valText: '1∠90° A', side: 1 } : { id: 'is2', type: 'O', a: 'bb', b: 'bt', label: false, ghost: 'I', side: 1 },
      W_('at', 'bt', { id: 'wt' }),
      keep.includes('vs3') ? { id: 'vs3', type: 'VAC', a: 'c', b: 'bt', amp: 2, phase: 0, name: 'v_{s3}', valText: '2∠0° V' } : { id: 'vs3', type: 'W', a: 'c', b: 'bt', ghost: 'V' },
      { id: 'R', type: 'R', a: 'c', b: 'd', value: 1, name: '1 Ω', valText: '' }, { id: 'L', type: 'L', a: 'd', b: 'e', value: L, name: '5 mH', valText: '', side: 1 },
      W_('e', 'bb', { id: 'wb1' }), W_('bb', 'ab', { id: 'wb2' }) ] });
  return { L, src, parts, spec };
})();

/* ---------------- Ex 5: Thévenin and Norton at A–B ---------------- */
CH7C.ex5 = (() => {
  const V1 = P(100, 0), V2 = P(100, 90), ZC = cx(0, -300), ZL = cx(0, 100);
  /* node 3 (= A), class form: (V3 − V1)/(−j300) + (V3 − V2)/(j100) = 0 */
  const Vth = Cx.div(Cx.add(Cx.div(V1, ZC), Cx.div(V2, ZL)), Cx.add(Cx.inv(ZC), Cx.inv(ZL)));
  const Zth = Cx.div(Cx.mul(ZC, ZL), Cx.add(ZC, ZL)), IN = Cx.div(Vth, Zth), Isc = Cx.add(Cx.div(V1, ZC), Cx.div(V2, ZL));
  const nodes = { c1: [0, 0], c2: [5.4, 0], n1: [0, 1.5], n2: [2.7, 1.5], A: [5.4, 1.5], g0: [0, 3.6], g2: [2.7, 3.6], B: [5.4, 3.6] };
  /* load: 'none' (open), {re, im} impedance, or 'meter' (voltmeter), 'short' (ammeter); kill: sources replaced by wires */
  const spec = (o = {}) => { const parts = [
      W_('n1', 'c1', { id: 'wc1' }), { id: 'C', type: 'C', a: 'c1', b: 'c2', value: 1 / 300, name: '−j300 Ω', valText: '' }, W_('c2', 'A', { id: 'wc2' }),
      { id: 'R', type: 'R', a: 'n1', b: 'n2', value: 200, name: '200 Ω', valText: '' }, { id: 'L', type: 'L', a: 'n2', b: 'A', value: 100, name: 'j100 Ω', valText: '' },
      o.kill ? { id: 'V1', type: 'W', a: 'n1', b: 'g0', ghost: 'V' } : { id: 'V1', type: 'VAC', a: 'n1', b: 'g0', amp: 100, phase: 0, name: '100∠0° V', valText: '', side: 1, labelOff: 0.62 },
      o.kill ? { id: 'V2', type: 'W', a: 'n2', b: 'g2', ghost: 'V' } : { id: 'V2', type: 'VAC', a: 'n2', b: 'g2', amp: 100, phase: 90, name: '100∠90° V', valText: '', side: 1, labelOff: 0.62 },
      W_('g0', 'g2', { id: 'wb1' }), W_('g2', 'B', { id: 'wb2' }) ];
    if (o.load && o.load.re !== undefined) parts.push({ id: 'ZL', type: 'Z', a: 'A', b: 'B', value: o.load, name: 'Z_L', valText: CH6.rect(o.load, 1).replace('-', '−') + ' Ω', side: 1 });
    if (o.load === 'meter') parts.push({ id: 'MET', type: 'VM', a: 'A', b: 'B', name: 'V_{oc}', valText: '', side: 1 });
    if (o.load === 'short') parts.push({ id: 'MET', type: 'A', a: 'A', b: 'B', side: 1 });
    if (o.test) parts.push({ id: 'Vt', type: 'VAC', a: 'A', b: 'B', amp: 1, phase: 0, name: 'V_{test}', valText: '1∠0° V', side: 1, color: '#9aa3c7' });
    return { ground: 'g0', mode: 'ac', w: 1, nodes: { ...nodes }, parts }; };
  const thev = load => ({ ground: 'b', mode: 'ac', w: 1, nodes: { t: [0, 0], A: [3.4, 0], b: [0, 3], B: [3.4, 3] },
    parts: [ { id: 'Vth', type: 'VAC', a: 't', b: 'b', amp: Cx.abs(Vth), phase: CH6.deg(Vth), name: 'V_{th}', valText: CH6.polTxt(Vth, 'V', 2, 2), side: -1 },
      { id: 'Zth', type: 'L', a: 't', b: 'A', value: 150, name: 'Z_{th}', valText: 'j150 Ω' }, W_('b', 'B', { id: 'wb' }),
      ...(load ? [{ id: 'ZL', type: 'Z', a: 'A', b: 'B', value: load, name: 'Z_L', valText: CH6.rect(load, 1).replace('-', '−') + ' Ω', side: 1 }] : []) ] });
  const nort = load => ({ ground: 'b', mode: 'ac', w: 1, nodes: { t: [0, 0], n: [2, 0], A: [3.8, 0], b: [0, 3], nb: [2, 3], B: [3.8, 3] },
    parts: [ { id: 'IN', type: 'IAC', a: 'b', b: 't', amp: Cx.abs(IN), phase: CH6.deg(IN), name: 'I_N', valText: CH6.polTxt(IN, 'A', 3, 2), side: -1 }, W_('t', 'n', { id: 'w1' }),
      { id: 'ZN', type: 'L', a: 'n', b: 'nb', value: 150, name: 'Z_N', valText: 'j150 Ω', side: 1 }, W_('n', 'A', { id: 'w2' }), W_('b', 'nb', { id: 'w3' }), W_('nb', 'B', { id: 'w4' }),
      ...(load ? [{ id: 'ZL', type: 'Z', a: 'A', b: 'B', value: load, name: 'Z_L', valText: CH6.rect(load, 1).replace('-', '−') + ' Ω', side: 1 }] : []) ] });
  return { V1, V2, ZC, ZL, Vth, Zth, IN, Isc, spec, thev, nort };
})();

/* ---------------- homework 1: three voltage sources in parallel branches ---------------- */
CH7C.hw1 = (() => {
  const V1 = P(10, -80), V2 = P(4, 0), V3 = P(2, -23), Z1 = cx(0, 30), Z2 = cx(55, 0), Z3 = cx(0, -20);
  /* mesh (instructor's 2018 solution): (55 + j30) Ix − 55 Iy = V1 − V2 ; −55 Ix + (55 − j20) Iy = V2 − V3 */
  const a11 = Cx.add(Z1, Z2), a12 = Cx.neg(Z2), a21 = Cx.neg(Z2), a22 = Cx.add(Z2, Z3), b1 = Cx.sub(V1, V2), b2 = Cx.sub(V2, V3);
  const D = det2(a11, a12, a21, a22), Dx = det2(b1, a12, b2, a22), Dy = det2(a11, b1, a21, b2), I1 = Cx.div(Dx, D), I2 = Cx.div(Dy, D);
  /* nodal shortcut: one unknown, the top node */
  const Vt = Cx.div(Cx.add(Cx.add(Cx.div(V1, Z1), Cx.div(V2, Z2)), Cx.div(V3, Z3)), Cx.add(Cx.add(Cx.inv(Z1), Cx.inv(Z2)), Cx.inv(Z3)));
  /* the answer printed on the slide comes from Hayt's solution manual, which used +2.2635 and +0.1045 for the real parts of V1 − V2, V1 − V3 */
  const manual = (() => { const m11 = Cx.add(Z1, Z2), m12 = cx(-55, 0), m21 = Z1, m22 = Cx.neg(Z3), r1 = cx(2.2635, -9.848), r2 = cx(0.1045, -9.0665); const d = det2(m11, m12, m21, m22);
    return { I1: Cx.div(det2(r1, m12, r2, m22), d), I2: Cx.div(det2(m11, r1, m21, r2), d) }; })();
  const spec = { ground: 'bM', mode: 'ac', w: 1,
    nodes: { tL: [0, 0], tM: [3.2, 0], tR: [6.4, 0], mL: [0, 1.9], mM: [3.2, 1.9], mR: [6.4, 1.9], bL: [0, 3.8], bM: [3.2, 3.8], bR: [6.4, 3.8] },
    parts: [ { id: 'Z1', type: 'L', a: 'tL', b: 'mL', value: 30, name: 'j30 Ω', valText: '', side: -1 }, { id: 'V1', type: 'VAC', a: 'mL', b: 'bL', amp: 10, phase: -80, name: 'V_1', valText: '10∠−80° V', side: -1 },
      { id: 'Z2', type: 'R', a: 'tM', b: 'mM', value: 55, name: '55 Ω', valText: '', side: 1 }, { id: 'V2', type: 'VAC', a: 'mM', b: 'bM', amp: 4, phase: 0, name: 'V_2', valText: '4∠0° V', side: 1 },
      { id: 'Z3', type: 'C', a: 'tR', b: 'mR', value: 0.05, name: '−j20 Ω', valText: '', side: 1 }, { id: 'V3', type: 'VAC', a: 'mR', b: 'bR', amp: 2, phase: -23, name: 'V_3', valText: '2∠−23° V', side: 1 },
      W_('tL', 'tM', { id: 'wI1' }), W_('tM', 'tR', { id: 'wI2' }), W_('bL', 'bM', { id: 'wb1' }), W_('bM', 'bR', { id: 'wb2' }) ] };
  return { V1, V2, V3, Z1, Z2, Z3, a11, a12, a21, a22, b1, b2, D, Dx, Dy, I1, I2, Vt, manual, spec };
})();

/* ---------------- homework 2: I_B ---------------- */
CH7C.hw2 = (() => {
  const I1 = P(5, -18), I2 = P(2, 5), Zt = cx(1, 3.8), ZC = cx(0, -4), ZL = cx(0, 2), R = 2;
  /* mesh (instructor's 2018 solution): Ix = −I1, Iw = −I2 known; mesh Iy (top), Iz (middle)
     (1 + j3.8) Iy + (−j4)(Iy − Iz) = 0           →  (1 − j0.2) Iy + j4 Iz = 0
     j2 (Iz − Ix) + (−j4)(Iz − Iy) + 2 (Iz − Iw) = 0  →  j4 Iy + (2 − j2) Iz = j2 Ix + 2 Iw */
  const Ix = Cx.neg(I1), Iw = Cx.neg(I2);
  const a11 = Cx.add(Zt, ZC), a12 = Cx.neg(ZC), a21 = Cx.neg(ZC), a22 = Cx.add(Cx.add(ZL, ZC), cx(R, 0)), b1 = cx(0), b2 = Cx.add(Cx.mul(ZL, Ix), Cx.scale(Iw, R));
  const D = det2(a11, a12, a21, a22), Dy = det2(b1, a12, b2, a22), Dz = det2(a11, b1, a21, b2), IB = Cx.div(Dy, D), Iz = Cx.div(Dz, D);
  const spec = { ground: 'Pb', mode: 'ac', w: 1,
    nodes: { s1t: [0, 1.6], s1b: [0, 3.6], P: [1.9, 1.6], Pb: [1.9, 3.6], Q: [5.3, 1.6], Qb: [5.3, 3.6], s2t: [7.2, 1.6], s2b: [7.2, 3.6], u1: [1.9, -0.7], um: [3.6, -0.7], u2: [5.3, -0.7] },
    parts: [ { id: 'I1', type: 'IAC', a: 's1t', b: 's1b', amp: 5, phase: -18, name: 'I_1', valText: '5∠−18° A', side: -1 }, W_('s1t', 'P', { id: 'w1' }),
      { id: 'L2', type: 'L', a: 'P', b: 'Pb', value: 2, name: 'j2 Ω', valText: '', side: 1 }, { id: 'C4', type: 'C', a: 'P', b: 'Q', value: 0.25, name: '−j4 Ω', valText: '' },
      { id: 'R2', type: 'R', a: 'Q', b: 'Qb', value: 2, name: '2 Ω', valText: '', side: -1 }, W_('Q', 's2t', { id: 'w2' }),
      { id: 'I2', type: 'IAC', a: 's2b', b: 's2t', amp: 2, phase: 5, name: 'I_2', valText: '2∠5° A', side: 1 },
      W_('P', 'u1', { id: 'w3' }), { id: 'L38', type: 'L', a: 'u1', b: 'um', value: 3.8, name: 'j3.8 Ω', valText: '' }, { id: 'R1', type: 'R', a: 'um', b: 'u2', value: 1, name: '1 Ω', valText: '' }, W_('u2', 'Q', { id: 'w4' }),
      W_('s1b', 'Pb', { id: 'wb1' }), W_('Pb', 'Qb', { id: 'wb2' }), W_('Qb', 's2b', { id: 'wb3' }) ] };
  return { I1, I2, Ix, Iw, Zt, ZC, ZL, R, a11, a12, a21, a22, b1, b2, D, Dy, Dz, IB, Iz, spec };
})();

/* ---------------- homework 3: v_x across the 1 Ω ---------------- */
CH7C.hw3 = w => {
  const Vs = P(4, 90), ZL = cx(0, w * 0.1), ZC = Cx.inv(cx(0, w * 0.89));      // 4 cos wt = 4 sin(wt + 90°)
  /* three clockwise meshes as in the instructor's solution: Ix (left: source, 2 Ω, 4.7 Ω, L), Iy (top right: 4.7 Ω, C, 2 Ω), Iz (bottom right: L, 2 Ω, 1 Ω)
     Ix: (6.7 + Z_L) Ix − 4.7 Iy − Z_L Iz = Vs ;  Iy: −4.7 Ix + (6.7 + Z_C) Iy − 2 Iz = 0 ;  Iz: −Z_L Ix − 2 Iy + (3 + Z_L) Iz = 0 */
  const M = [[Cx.add(cx(6.7, 0), ZL), cx(-4.7, 0), Cx.neg(ZL)], [cx(-4.7, 0), Cx.add(cx(6.7, 0), ZC), cx(-2, 0)], [Cx.neg(ZL), cx(-2, 0), Cx.add(cx(3, 0), ZL)]];
  const b = [Vs, cx(0), cx(0)]; const D = det3(M), Dz = det3(repl(M, b, 2)), Iz = Cx.div(Dz, D);
  const spec = { ground: 'B1', mode: 'ac', w,
    nodes: { T0: [0, 0], S1: [0, 2], B0: [0, 4], T1: [2.5, 0], M: [2.5, 2], B1: [2.5, 4], T2: [5.2, 0], N: [5.2, 2], B2: [5.2, 4] },
    parts: [ { id: 'R2a', type: 'R', a: 'T0', b: 'S1', value: 2, name: '2 Ω', valText: '', side: -1 }, { id: 'Vs', type: 'VAC', a: 'S1', b: 'B0', amp: 4, phase: 90, name: `4 cos ${w}t V`, valText: '4∠90° V', side: -1 },
      W_('T0', 'T1', { id: 'wt1' }), W_('T1', 'T2', { id: 'wt2' }), { id: 'R47', type: 'R', a: 'T1', b: 'M', value: 4.7, name: '4.7 Ω', valText: '', side: -1 },
      { id: 'L', type: 'L', a: 'M', b: 'B1', value: 0.1, name: '100 mH', valText: `j${CH6.fd(w * 0.1, 3)} Ω`, side: -1 },
      { id: 'C', type: 'C', a: 'T2', b: 'N', value: 0.89, name: '890 mF', valText: `−j${CH6.fd(1 / (w * 0.89), 4)} Ω`, side: 1 },
      { id: 'R2b', type: 'R', a: 'M', b: 'N', value: 2, name: '2 Ω', valText: '' }, { id: 'R1', type: 'R', a: 'N', b: 'B2', value: 1, name: '1 Ω', valText: '', side: -1 },
      W_('B0', 'B1', { id: 'wb1' }), W_('B1', 'B2', { id: 'wb2' }) ] };
  return { w, Vs, ZL, ZC, M, b, D, Dz, Iz, Vx: Iz, spec };
};

/* ---------------- extras from the 2018 lecture ---------------- */
/* Hayt Example 10.9: 1∠0° A into V1; 5 Ω and −j10 Ω from V1; −j5 Ω ∥ j10 Ω between V1 and V2; j5 Ω and 10 Ω from V2; 0.5∠−90° A out of V2 */
CH7C.x1 = (() => {
  /* class form: (0.2 + j0.2) V1 − j0.1 V2 = 1 ;  −j0.1 V1 + (0.1 − j0.1) V2 = j0.5 */
  const a11 = cx(0.2, 0.2), a12 = cx(0, -0.1), a21 = cx(0, -0.1), a22 = cx(0.1, -0.1), b1 = cx(1, 0), b2 = cx(0, 0.5);
  const D = det2(a11, a12, a21, a22), D1 = det2(b1, a12, b2, a22), D2 = det2(a11, b1, a21, b2), V1 = Cx.div(D1, D), V2 = Cx.div(D2, D);
  const spec = { ground: 'b2', mode: 'ac', w: 1,
    nodes: { t0: [0, 0], b0: [0, 3], t1: [1.3, 0], b1: [1.3, 3], t2: [2.6, 0], b2: [2.6, 3], t3: [3.5, 0], u3: [3.5, -1.15], t4: [5.5, 0], u4: [5.5, -1.15], t5: [6.4, 0], b5: [6.4, 3], t6: [7.7, 0], b6: [7.7, 3], t7: [9.0, 0], b7: [9.0, 3] },
    parts: [ { id: 'I1', type: 'IAC', a: 'b0', b: 't0', amp: 1, phase: 0, name: '1∠0° A', valText: '', side: -1 }, W_('t0', 't1', { id: 'w01' }),
      { id: 'R5', type: 'R', a: 't1', b: 'b1', value: 5, name: '5 Ω', valText: '', side: 1 }, W_('t1', 't2', { id: 'w12' }),
      { id: 'C10', type: 'C', a: 't2', b: 'b2', value: 0.1, name: '−j10 Ω', valText: '', side: 1 }, W_('t2', 't3', { id: 'w23' }),
      { id: 'Lp', type: 'L', a: 't3', b: 't4', value: 10, name: 'j10 Ω', valText: '', side: 1 }, W_('t3', 'u3', { id: 'wu3' }), { id: 'Cp', type: 'C', a: 'u3', b: 'u4', value: 0.2, name: '−j5 Ω', valText: '', side: -1 }, W_('u4', 't4', { id: 'wu4' }),
      W_('t4', 't5', { id: 'w45' }), { id: 'L5', type: 'L', a: 't5', b: 'b5', value: 5, name: 'j5 Ω', valText: '', side: 1 }, W_('t5', 't6', { id: 'w56' }),
      { id: 'R10', type: 'R', a: 't6', b: 'b6', value: 10, name: '10 Ω', valText: '', side: 1 }, W_('t6', 't7', { id: 'w67' }),
      { id: 'I2', type: 'IAC', a: 't7', b: 'b7', amp: 0.5, phase: -90, name: '0.5∠−90° A', valText: '', side: 1 },
      W_('b0', 'b1', { id: 'wb01' }), W_('b1', 'b2', { id: 'wb12' }), W_('b2', 'b5', { id: 'wb25' }), W_('b5', 'b6', { id: 'wb56' }), W_('b6', 'b7', { id: 'wb67' }) ] };
  return { a11, a12, a21, a22, b1, b2, D, D1, D2, V1, V2, spec, nodeV1: ['I1', 'R5', 'C10', 'Lp', 'Cp'], nodeV2: ['Lp', 'Cp', 'L5', 'R10', 'I2'] };
})();

/* I1 through −j5 Ω from the 100∠0° V source to the node V; 5 Ω (I2) and j5 Ω (I3) from V to the bottom */
CH7C.x2 = (() => {
  const Vs = cx(100, 0), ZC = cx(0, -5), R = 5, ZL = cx(0, 5);
  const V = Cx.div(Cx.div(Vs, ZC), Cx.add(Cx.add(Cx.inv(ZC), cx(1 / R, 0)), Cx.inv(ZL)));       // KCL at V
  const I1 = Cx.div(Cx.sub(Vs, V), ZC), I2 = Cx.scale(V, 1 / R), I3 = Cx.div(V, ZL);
  /* mesh (the next 2018 slide): (5 − j5) Ia − 5 Ib = 100 ;  −5 Ia + (5 + j5) Ib = 0 */
  const m11 = cx(5, -5), m12 = cx(-5, 0), m21 = cx(-5, 0), m22 = cx(5, 5), D = det2(m11, m12, m21, m22), Ia = Cx.div(det2(Vs, m12, cx(0), m22), D), Ib = Cx.div(det2(m11, Vs, m21, cx(0)), D);
  const spec = { ground: 'g', mode: 'ac', w: 1, nodes: { s: [0, 0], g: [0, 3], n: [3.2, 0], nb: [3.2, 3], m: [5.6, 0], mb: [5.6, 3] },
    parts: [ { id: 'Vs', type: 'VAC', a: 's', b: 'g', amp: 100, phase: 0, name: '100∠0° V', valText: '', side: -1 }, { id: 'C', type: 'C', a: 's', b: 'n', value: 0.2, name: '−j5 Ω', valText: '' },
      { id: 'R', type: 'R', a: 'n', b: 'nb', value: 5, name: '5 Ω', valText: '', side: -1 }, W_('n', 'm', { id: 'wnm' }), { id: 'L', type: 'L', a: 'm', b: 'mb', value: 5, name: 'j5 Ω', valText: '', side: 1 },
      W_('g', 'nb', { id: 'wb1' }), W_('nb', 'mb', { id: 'wb2' }) ] };
  return { Vs, ZC, R, ZL, V, I1, I2, I3, m11, m12, m21, m22, D, Ia, Ib, spec };
})();

/* Hayt Example 10.11: 1∠0° A into A (= V1); 4 − j2 Ω from A; −j10 Ω between A and B (= V2); 2 + j4 Ω from B; 0.5∠−90° A out of B */
CH7C.x3 = (() => {
  const Z1 = cx(4, -2), Z2 = cx(2, 4), ZL = cx(0, -10), Is1 = cx(1, 0), Is2 = P(0.5, -90);
  const V1oc = Cx.mul(Is1, Z1), V2oc = Cx.neg(Cx.mul(Is2, Z2)), Voc = Cx.sub(V1oc, V2oc), Zth = Cx.add(Z1, Z2);
  const I = Cx.div(Voc, Cx.add(Zth, ZL)), V1 = Cx.mul(Cx.sub(Is1, I), Z1), V2 = Cx.sub(V1, Cx.mul(I, ZL));
  const nodes = { s0: [0, 3], s1: [0, 0], A: [2.8, 0], Ab: [2.8, 3], B: [6.0, 0], Bb: [6.0, 3], t2: [9.0, 0], t2b: [9.0, 3], _padR: [10.9, 1.5] };   // labels between the branches; _padR: room for the right source label
  /* o: open (the −j10 Ω taken out), meter (voltmeter A–B), kill (current sources open), test (1∠0° V between A and B) */
  const spec = (o = {}) => { const parts = [
      o.kill ? { id: 'I1', type: 'O', a: 's0', b: 's1', label: false, ghost: 'I', side: 1 } : { id: 'I1', type: 'IAC', a: 's0', b: 's1', amp: 1, phase: 0, name: '1∠0° A', valText: '', side: 1 },
      W_('s1', 'A', { id: 'w1' }), { id: 'Z1', type: 'Z', a: 'A', b: 'Ab', value: Z1, name: '4 − j2 Ω', valText: '', side: 1 },
      { id: 'Z2', type: 'Z', a: 'B', b: 'Bb', value: Z2, name: '2 + j4 Ω', valText: '', side: 1 }, W_('B', 't2', { id: 'w2' }),
      o.kill ? { id: 'I2', type: 'O', a: 't2', b: 't2b', label: false, ghost: 'I', side: 1 } : { id: 'I2', type: 'IAC', a: 't2', b: 't2b', amp: 0.5, phase: -90, name: '0.5∠−90° A', valText: '', side: 1 },
      W_('s0', 'Ab', { id: 'wb1' }), W_('Ab', 'Bb', { id: 'wb2' }), W_('Bb', 't2b', { id: 'wb3' }) ];
    if (!o.open) parts.push({ id: 'ZL', type: 'Z', a: 'A', b: 'B', value: ZL, name: '−j10 Ω', valText: '' });
    if (o.meter) parts.push({ id: 'MET', type: 'VM', a: 'A', b: 'B', name: 'V_{oc}', valText: '' });
    if (o.test) parts.push({ id: 'Vt', type: 'VAC', a: 'A', b: 'B', amp: 1, phase: 0, name: 'V_{test}', valText: '1∠0° V', color: '#9aa3c7' });
    return { ground: 'Ab', mode: 'ac', w: 1, nodes: { ...nodes }, parts }; };
  const thev = () => ({ ground: 'n', mode: 'ac', w: 1, nodes: { p: [0, 0], A: [3.4, 0], n: [0, 3], B: [3.4, 3] },
    parts: [ { id: 'Vth', type: 'VAC', a: 'p', b: 'n', amp: Cx.abs(Voc), phase: CH6.deg(Voc), name: 'V_{th}', valText: '', side: -1 },
      { id: 'Zth', type: 'Z', a: 'p', b: 'A', value: Zth, name: 'Z_{th}', valText: '6 + j2 Ω' }, { id: 'ZL', type: 'Z', a: 'A', b: 'B', value: ZL, name: '−j10 Ω', valText: '', side: 1 }, W_('B', 'n', { id: 'wb' }) ] });
  return { Z1, Z2, ZL, Is1, Is2, V1oc, V2oc, Voc, Zth, I, V1, V2, spec, thev };
})();

/* Hayt Example 10.13: I_s into G = 0.2 S, −j0.1 S (L) and j0.3 S (C) in parallel; trueSrc false: I_s chosen so that V = 1∠0° V */
CH7C.pd13 = (() => {
  const G = 0.2, BL = 0.1, BC = 0.3, Y = cx(G, BC - BL), V = cx(1, 0), IR = cx(G, 0), IL = cx(0, -BL), IC = cx(0, BC), Ix = Cx.add(IL, IR), Is = Cx.add(IC, Ix), k = Cx.inv(Is);
  const spec = trueSrc => { const src = trueSrc ? cx(1, 0) : Is;
    return { ground: 'b0', mode: 'ac', w: 1, nodes: { t: [0, 0], t1: [2.1, 0], t2: [4.2, 0], t3: [6.3, 0], b0: [0, 3], b1: [2.1, 3], b2: [4.2, 3], b3: [6.3, 3] },
      parts: [ { id: 'Is', type: 'IAC', a: 'b0', b: 't', amp: Cx.abs(src), phase: CH6.deg(src), name: 'I_s', valText: trueSrc ? '1∠0° A' : '', side: -1 },
        { id: 'C', type: 'C', a: 't1', b: 'b1', value: BC, name: 'j0.3 S', valText: '', side: 1 }, { id: 'L', type: 'L', a: 't2', b: 'b2', value: 1 / BL, name: '−j0.1 S', valText: '', side: 1 },
        { id: 'R', type: 'R', a: 't3', b: 'b3', value: 1 / G, name: '0.2 S', valText: '', side: 1 },
        W_('t', 't1', { id: 'w1' }), W_('t1', 't2', { id: 'w2' }), W_('t2', 't3', { id: 'w3' }), W_('b0', 'b1', { id: 'wb1' }), W_('b1', 'b2', { id: 'wb2' }), W_('b2', 'b3', { id: 'wb3' }) ] }; };
  return { G, BL, BC, Y, V, IR, IL, IC, Ix, Is, k, spec };
})();

/* Hayt Practice 10.17: V_s → 2 Ω (V_1) → node N; j2 Ω (V_2) from N to ground; −j1 Ω and 2 Ω (V_R) in series from N to ground.
   V_s = 3 − j3 V is the source that makes I_C = 1∠0° A (the reference of the diagram) */
CH7C.pd17 = (() => {
  const IC = cx(1, 0), VR = Cx.scale(IC, 2), VC = Cx.mul(IC, cx(0, -1)), V2 = Cx.add(VR, VC), IL = Cx.div(V2, cx(0, 2)), I = Cx.add(IC, IL), V1 = Cx.scale(I, 2), Vs = Cx.add(V1, V2);
  const spec = { ground: 'g', mode: 'ac', w: 1, nodes: { s: [0, 0], n: [2.8, 0], g: [0, 3.2], nb: [2.8, 3.2], m: [5.2, 0], mm: [5.2, 1.6], mb: [5.2, 3.2] },
    parts: [ { id: 'Vs', type: 'VAC', a: 's', b: 'g', amp: Cx.abs(Vs), phase: CH6.deg(Vs), name: 'V_s', valText: '', side: -1 }, { id: 'R1', type: 'R', a: 's', b: 'n', value: 2, name: '2 Ω', valText: '' },
      { id: 'L', type: 'L', a: 'n', b: 'nb', value: 2, name: 'j2 Ω', valText: '', side: -1 }, W_('n', 'm', { id: 'wnm' }), { id: 'C', type: 'C', a: 'm', b: 'mm', value: 1, name: '−j1 Ω', valText: '', side: 1 },
      { id: 'R2', type: 'R', a: 'mm', b: 'mb', value: 2, name: '2 Ω', valText: '', side: 1 }, W_('g', 'nb', { id: 'wb1' }), W_('nb', 'mb', { id: 'wb2' }) ] };
  return { IC, VR, VC, V2, IL, I, V1, Vs, ratio: Cx.abs(Vs) / Cx.abs(V1), spec };
})();

/* ---------------- phasor diagrams (Hayt §10.8) ---------------- */
CH7C.pd = {
  /* Fig. 10.38: V1 = 6 + j8, V2 = 3 − j4, V1 + V2 = 9 + j4; I1 = (1 + j1) V1 */
  sum: { V1: cx(6, 8), V2: cx(3, -4) },
  /* Fig. 10.40: series j50 Ω, 10 Ω, −j50 Ω with I as the reference */
  series: { R: 10, XL: 50, XC: 50 },
  /* Example 10.13: parallel j0.3 S, −j0.1 S, 0.2 S with V = 1∠0° as the reference */
  parallel: { G: 0.2, BL: 0.1, BC: 0.3 }
};

global.CH7C = CH7C;
})(window);
