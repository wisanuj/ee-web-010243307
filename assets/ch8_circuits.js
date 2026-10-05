/* ch8_circuits.js — the circuits of chapter 8 (AC power and power factor), shared by the pages and tests.html.
   The engine works with peak phasors (amp = peak, sine reference). Problems stated in rms (Ex 11.8, Ex 11.9, the household
   problem) set amp = √2·V_rms and read the results back in rms; complex power is S = V_rms·I_rms* = ½·V·I* either way.
   Problems that give only impedances are drawn at ω = 1 rad/s (L = X_L, C = 1/|X_C|).
   CH8C.ex4    slide p. 7  (Hayt Example 11.4): two sources, j2 Ω, 2 Ω, −j2 Ω — average and reactive power of every element
   CH8C.ex8    slide p. 13 (Hayt Example 11.8) and the homework, slide p. 16 (Hayt Practice 11.8): 60∠0° V rms, 2 − j1 Ω and Z_L
   CH8C.ex9    slide p. 15 (Hayt Example 11.9): 50 kW motor at PF 0.8 lagging, 230 V rms, corrected to 0.95 lagging
   CH8C.house  2018 lecture, slide p. 19: a house on 220 V rms, 50 Hz with four appliances, PF corrected to 0.95 lagging
   CH8C.one / CH8C.par   generic loads: a source with a series R + jX load / with R and X in parallel */
(function (global) {
'use strict';
const Cx = CK.Cx, cx = Cx.c; const W_ = (a, b, o = {}) => ({ type: 'W', a, b, ...o });
const det2 = (a, b, c, d) => Cx.sub(Cx.mul(a, d), Cx.mul(b, c));
const RT2 = Math.SQRT2, D2R = Math.PI / 180;
/* complex power from rms phasors (S = V I*) and from peak phasors (S = ½ V I*) */
const Srms = (V, I) => Cx.mul(V, Cx.conj(I)), Spk = (V, I) => Cx.scale(Cx.mul(V, Cx.conj(I)), 0.5);
const pf = S => Cx.abs(S) > 1e-12 ? S.re / Cx.abs(S) : 1;
const CH8C = { det2, Srms, Spk, pf, RT2 };

/* ---------------- slide p. 7 (Hayt Example 11.4) ---------------- */
/* make(phR): the same circuit with the right source at 10∠phR° (phR = 180 flips it) */
CH8C.ex4 = (() => { const make = (phR = 0) => {
  const Vl = cx(20), Vr = CH6.polar(10, phR), ZL = cx(0, 2), R = 2, ZC = cx(0, -2);
  /* clockwise meshes, KVL from the bottom-left corner as in class: (2 + j2) I1 − 2 I2 = 20 ; −2 I1 + (2 − j2) I2 = −10 */
  const a11 = Cx.add(ZL, cx(R)), a12 = cx(-R), a21 = cx(-R), a22 = Cx.add(cx(R), ZC), b1 = Vl, b2 = Cx.neg(Vr);
  const D = det2(a11, a12, a21, a22), D1 = det2(b1, a12, b2, a22), D2 = det2(a11, b1, a21, b2);
  const I1 = Cx.div(D1, D), I2 = Cx.div(D2, D), IR = Cx.sub(I1, I2), IL = I1, IC = I2;
  const VR = Cx.scale(IR, R), VL = Cx.mul(IL, ZL), VC = Cx.mul(IC, ZC);
  /* peak phasors: S = ½ V I*. The left source sends I1 out of its + terminal (delivers); I2 enters the + of the right one (absorbs) */
  const SR = Spk(VR, IR), SL = Spk(VL, IL), SC = Spk(VC, IC), SlDel = Spk(Vl, I1), SrAbs = Spk(Vr, I2);
  const spec = () => ({ ground: 'gl', mode: 'ac', w: 1,
    nodes: { tl: [0, 0], tm: [3, 0], tr: [6, 0], gl: [0, 3], gm: [3, 3], gr: [6, 3] },
    parts: [ { id: 'Vl', type: 'VAC', a: 'tl', b: 'gl', amp: 20, phase: 0, name: '20∠0° V', valText: '', side: -1 },
      { id: 'L', type: 'L', a: 'tl', b: 'tm', value: 2, name: 'j2 Ω', valText: '' },
      { id: 'R', type: 'R', a: 'tm', b: 'gm', value: R, name: '2 Ω', valText: '', side: 1, labelOff: 0.5 },
      { id: 'C', type: 'C', a: 'tm', b: 'tr', value: 0.5, name: '−j2 Ω', valText: '' },
      { id: 'Vr', type: 'VAC', a: 'tr', b: 'gr', amp: 10, phase: phR, name: `10∠${phR}° V`, valText: '', side: 1 },
      W_('gl', 'gm', { id: 'wb1' }), W_('gm', 'gr', { id: 'wb2' }) ] });
  return { phR, Vl, Vr, ZL, R, ZC, a11, a12, a21, a22, b1, b2, D, D1, D2, I1, I2, IR, IL, IC, VR, VL, VC, SR, SL, SC, SlDel, SrAbs, spec }; };
  const e = make(0); e.make = make; return e;
})();

/* ---------------- slide p. 13 (Hayt Example 11.8) and the homework (Practice 11.8) ---------------- */
CH8C.ex8 = (() => {
  const Vrms = 60, Z1 = cx(2, -1), Z2 = cx(1, 5), ZHW = cx(10, 0);
  const calc = ZL => { const Z = Cx.add(Z1, ZL), I = Cx.div(cx(Vrms), Z), V1 = Cx.mul(I, Z1), V2 = Cx.mul(I, ZL);
    const S1 = Srms(V1, I), S2 = Srms(V2, I), S = Srms(cx(Vrms), I);
    return { ZL, Z, I, V1, V2, S1, S2, S, P1: S1.re, P2: S2.re, Sap: Cx.abs(S), PF: pf(S), lag: S.im > 1e-12, lead: S.im < -1e-12 }; };
  /* o.name: the label of the second load (slide p. 13 writes "1 + j5 Ω"; the homework calls it Z_L and gives its value) */
  const spec = (ZL, o = {}) => ({ ground: 'g', mode: 'ac', w: 1, nodes: { s: [0, 0], a: [4.4, 0], b: [4.4, 3], g: [0, 3] },
    parts: [ { id: 'Vs', type: 'VAC', a: 's', b: 'g', amp: Vrms * RT2, phase: 0, name: '60∠0° V rms', valText: '', side: -1 },
      { id: 'Z1', type: 'Z', a: 's', b: 'a', value: Z1, name: '2 − j1 Ω', valText: '', bodyLen: 1.5 },
      { id: 'ZL', type: 'Z', a: 'a', b: 'b', value: ZL, name: o.name ?? 'Z_L', valText: o.name ? '' : `${CH6.rect(ZL, 2).replace('-', '−')} Ω`, side: 1, bodyLen: 1.3 },
      W_('b', 'g', { id: 'wb' }) ] });
  return { Vrms, Z1, Z2, ZHW, calc, spec, ex: calc(Z2), hw: calc(ZHW) };
})();

/* ---------------- slide p. 15 (Hayt Example 11.9): power factor correction ---------------- */
CH8C.ex9 = (() => {
  const P = 50e3, pf1 = 0.8, V = 230, pf2 = 0.95;
  const th1 = Math.acos(pf1), S1 = cx(P, P * Math.tan(th1));           // 50 + j37.5 kVA
  const Zm = Cx.div(cx(V * V), Cx.conj(S1));                           // S = |V|²/Z*  →  Z = |V|²/S*  = 0.67712 + j0.50784 Ω
  /* target PF (lag = true: lagging) → new total S and the reactive power the corrective device must take */
  const need = (pfNew, lag = true) => { const th2 = Math.acos(pfNew) * (lag ? 1 : -1), Snew = cx(P, P * Math.tan(th2)); return { th2, Snew, Qc: Snew.im - S1.im }; };
  const Cfor = (Qc, f) => -Qc / (2 * Math.PI * f * V * V);              // Q_C = −ωC V²  →  C = −Q_C/(ωV²)
  const n = need(pf2), C50 = Cfor(n.Qc, 50), C60 = Cfor(n.Qc, 60);
  /* the class rounds the angles to 18.19° and 36.86° before taking tan */
  const QcClass = P * (Math.tan(18.19 * D2R) - Math.tan(36.86 * D2R)), C50Class = -QcClass / (2 * Math.PI * 50 * V * V);
  /* Hayt's route: I2* = S2/V, Z2 = V/I2 */
  const S2 = cx(0, n.Qc), I2 = Cx.conj(Cx.div(S2, cx(V))), Z2 = Cx.div(cx(V), I2);
  /* the circuit: source, motor (impedance Zm) and a switched capacitor C in parallel */
  const solveC = (C, f) => { const w = 2 * Math.PI * f, Im = Cx.div(cx(V), Zm), Ic = C > 0 ? Cx.mul(cx(0, w * C), cx(V)) : cx(0), I = Cx.add(Im, Ic), S = Srms(cx(V), I);
    return { w, Im, Ic, I, S, Sm: Srms(cx(V), Im), Sc: Srms(cx(V), Ic), PF: pf(S) }; };
  const spec = (C, f, on = true) => ({ ground: 'g', mode: 'ac', w: 2 * Math.PI * f,
    nodes: { s: [0, 0], m: [3.2, 0], k: [6.4, 0], k2: [6.4, 1.25], g: [0, 3.2], mb: [3.2, 3.2], kb: [6.4, 3.2] },
    parts: [ { id: 'Vs', type: 'VAC', a: 's', b: 'g', amp: V * RT2, phase: 0, name: '230 V rms', valText: `${f} Hz`, side: -1, showI: false },
      W_('s', 'm', { id: 'wI', showI: true, iName: 'I' }), W_('m', 'k', { id: 'wk' }),
      { id: 'M', type: 'Z', draw: 'motor', a: 'm', b: 'mb', value: Zm, name: 'S_1', valText: MC.t('มอเตอร์', 'motor'), side: 1, iName: 'I_1', bodyLen: 1.1 },
      { id: 'Sw', type: 'S', a: 'k', b: 'k2', closed: on && C > 0, label: false, showI: false },
      { id: 'C', type: 'C', a: 'k2', b: 'kb', value: Math.max(C, 1e-12), name: 'C', valText: C > 0 ? CK.eng(C, 'F') : '', side: 1, iName: 'I_2' },
      W_('kb', 'mb', { id: 'wb1' }), W_('mb', 'g', { id: 'wb2' }) ] });
  return { P, pf1, pf2, V, th1, S1, Zm, need, Cfor, Snew: n.Snew, Qc: n.Qc, th2: n.th2, C50, C60, QcClass, C50Class, S2, I2, Z2, solveC, spec,
    Iold: P / pf1 / V, Inew: P / pf2 / V };
})();

/* ---------------- 2018 lecture, slide p. 19: the house ---------------- */
CH8C.house = (() => {
  const V = 220, f = 50;
  /* each appliance as given on the slide → P and Q (lagging loads, Q > 0) */
  const list = [
    { id: 'fr', th: 'ตู้เย็น', en: 'Fridge', given: ['5 A rms, PF = 0.8 ตามหลัง', '5 A rms, PF = 0.8 lagging'], S: V * 5, pf: 0.8 },
    { id: 'st', th: 'เตาไฟฟ้า', en: 'Stove', given: ['P = 1000 W (Q = 0)', 'P = 1000 W (Q = 0)'], P: 1000, pf: 1 },
    { id: 'lp', th: 'หลอดไฟ ×10', en: 'Lamps ×10', given: ['40 W, PF = 0.6 ตามหลัง, 10 ดวง', '40 W, PF = 0.6 lagging, 10 lamps'], P: 40 * 10, pf: 0.6 },
    { id: 'ac', th: 'แอร์', en: 'Air con', given: ['S = 5000 VA, PF = 0.7 ตามหลัง', 'S = 5000 VA, PF = 0.7 lagging'], S: 5000, pf: 0.7 } ];
  list.forEach(a => { if (a.S === undefined) a.S = a.P / a.pf; if (a.P === undefined) a.P = a.S * a.pf; a.Q = Math.sqrt(Math.max(a.S * a.S - a.P * a.P, 0));
    a.Sc = cx(a.P, a.Q); a.Z = Cx.div(cx(V * V), Cx.conj(a.Sc)); a.ang = Math.acos(a.pf) / D2R; });
  /* totals for the appliances that are on; correction to pfNew (lagging) */
  const calc = (on = list.map(() => true), pfNew = 0.95) => { const S = list.reduce((s, a, k) => on[k] ? Cx.add(s, a.Sc) : s, cx(0));
    const Sap = Cx.abs(S), PF = pf(S), I = Sap / V, thNew = Math.acos(pfNew), Qc = S.re > 0 ? S.re * Math.tan(thNew) - S.im : 0;
    const C = Qc < 0 ? -Qc / (2 * Math.PI * f * V * V) : 0, SapNew = Qc < 0 ? S.re / pfNew : Sap, Inew = SapNew / V;
    return { S, P: S.re, Q: S.im, Sap, PF, I, Qc, C, SapNew, Inew, drop: I - Inew, dropPct: I > 0 ? (I - Inew) / I * 100 : 0 }; };
  /* the bill: P (W) × hours a day × days ÷ 1000 → kWh (units) × baht per unit */
  const bill = (P, h = 10, d = 30, rate = 2.5) => { const kWh = P * h * d / 1000; return { kWh, baht: kWh * rate }; };
  /* o.short (phones): branches packed closer, one-character names, no value lines */
  const spec = (on = list.map(() => true), C = 0, o = {}) => { const dx = o.short ? 1.7 : 2.3, X = list.map((a, k) => dx * (k + 1)), XC = dx * 5;
    const nodes = { s: [0, 0], g: [0, 3.4] }, parts = [
      { id: 'Vs', type: 'VAC', a: 's', b: 'g', amp: V * RT2, phase: 0, name: o.short ? '220 V' : '220 V rms', valText: o.short ? '' : '50 Hz', side: -1 } ];
    let prevT = 's', prevB = 'g';
    list.forEach((a, k) => { const x = X[k], t = 't' + k, m = 'm' + k, b = 'b' + k; nodes[t] = [x, 0]; nodes[m] = [x, 1.25]; nodes[b] = [x, 3.4];
      parts.push(W_(prevT, t, { id: 'wt' + k }), W_(prevB, b, { id: 'wb' + k }),
        { id: 'S' + k, type: 'S', a: t, b: m, closed: !!on[k], label: false },
        { id: a.id, type: 'Z', draw: 'box', a: m, b, value: a.Z, name: o.short ? String(k + 1) : MC.t(a.th, a.en), valText: '', side: 1, bodyLen: 1.2 });
      prevT = t; prevB = b; });
    if (o.cap !== false) { nodes.tc = [XC, 0]; nodes.mc = [XC, 1.25]; nodes.bc = [XC, 3.4];
      parts.push(W_(prevT, 'tc', { id: 'wtc' }), W_(prevB, 'bc', { id: 'wbc' }), { id: 'SC', type: 'S', a: 'tc', b: 'mc', closed: C > 0, label: false },
        { id: 'C', type: 'C', a: 'mc', b: 'bc', value: Math.max(C, 1e-12), name: 'C', valText: C > 0 && !o.short ? CK.eng(C, 'F') : '', side: 1 }); }
    return { ground: 'g', mode: 'ac', w: 2 * Math.PI * f, nodes, parts }; };
  return { V, f, list, calc, bill, spec, all: calc() };
})();

/* ---------------- generic loads ----------------
   one({amp, phase, R, X, rms}): source on the left, series R + jX on the right (R and X may be 0; X > 0 inductor, X < 0 capacitor) at ω = 1
   par({amp, phase, R, X, useR, useX}): source with an R branch and an X branch in parallel at ω = 1 */
const reac = (id, a, b, X, o = {}) => X > 0 ? { id, type: 'L', a, b, value: X, name: `j${CH6.fd(X, 2)} Ω`, valText: '', ...o }
  : { id, type: 'C', a, b, value: 1 / Math.abs(X), name: `−j${CH6.fd(Math.abs(X), 2)} Ω`, valText: '', ...o };
CH8C.one = (o = {}) => { const amp = o.amp ?? 10, ph = o.phase ?? 0, R = o.R ?? 0, X = o.X ?? 0, xl = 3.4;
  const nodes = { s: [0, 0], a: [xl, 0], g: [0, 3], b: [xl, 3] }, parts = [
    { id: 'Vs', type: 'VAC', a: 's', b: 'g', amp, phase: ph, name: o.srcName || 'v_s', valText: o.srcVal ?? '', side: -1 }, W_('s', 'a', { id: 'wt' }), W_('b', 'g', { id: 'wb' }) ];
  if (Math.abs(R) > 1e-9 && Math.abs(X) > 1e-9) { nodes.m = [xl, 1.5]; parts.push({ id: 'R', type: 'R', a: 'a', b: 'm', value: R, name: `${CH6.fd(R, 2)} Ω`, valText: '', side: 1 }, reac('X', 'm', 'b', X, { side: 1 })); }
  else if (Math.abs(X) > 1e-9) parts.push(reac('X', 'a', 'b', X, { side: 1 }));
  else parts.push({ id: 'R', type: 'R', a: 'a', b: 'b', value: Math.max(R, 1e-6), name: `${CH6.fd(R, 2)} Ω`, valText: '', side: 1 });
  return { ground: 'g', mode: 'ac', w: 1, nodes, parts }; };
CH8C.par = (o = {}) => { const amp = o.amp ?? 10, ph = o.phase ?? 0, R = o.R ?? 10, X = o.X ?? 10, useR = o.useR !== false, useX = o.useX !== false;
  const nodes = { s: [0, 0], g: [0, 3], r: [2.8, 0], rb: [2.8, 3], x: [5.6, 0], xb: [5.6, 3] }, parts = [
    { id: 'Vs', type: 'VAC', a: 's', b: 'g', amp, phase: ph, name: o.srcName || 'v_s', valText: o.srcVal ?? '', side: -1 },
    W_('s', 'r', { id: 'wt1' }), W_('g', 'rb', { id: 'wb1' }) ];
  if (useR) parts.push({ id: 'R', type: 'R', a: 'r', b: 'rb', value: R, name: `${CH6.fd(R, 2)} Ω`, valText: '', side: 1 });
  if (useX) parts.push(W_('r', 'x', { id: 'wt2' }), W_('rb', 'xb', { id: 'wb2' }), reac('X', 'x', 'xb', X, { side: 1 }));
  return { ground: 'g', mode: 'ac', w: 1, nodes, parts }; };

global.CH8C = CH8C;
})(window);
