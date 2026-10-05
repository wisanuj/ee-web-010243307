/* ch9_circuits.js — the circuits of chapter 9 (polyphase circuits), shared by the pages and tests.html.
   rms convention (Hayt ch. 12 footnote 1 and slide p. 7): every voltage and current of this chapter is an rms value. The engine works
   with peak phasors, so sources set amp = √2·V_rms and views use acPeak: false. The problems give impedances only, so ω = 1 rad/s.
   Node names follow the instructor's note: source terminals a, b, c, n (lower case), load terminals A, B, C, N (upper case).
   CH9C.phases(Vp, th, seq)  phase voltages [V_an, V_bn, V_cn] (seq = +1 positive abc, −1 negative cba)
   CH9C.lines(V)             line voltages [V_ab, V_bc, V_ca]
   CH9C.perPhase(o)          the per-phase method from P, PF and V_L for a Y or Δ load (slide pp. 14, 18, homework)
   CH9C.src(o)  / yy(o) / yd(o)   specs: source with voltmeters (page 9.1), Y–Y system (9.2), Y source with a Δ load (9.3)
   CH9C.ex1 (slide p. 13, Hayt Ex 12.2) · ex2 (p. 14, Hayt Ex 12.3) · ex3 (p. 18, Hayt Ex 12.5) · q2017 (2017 quiz = Hayt Ex 12.6) · hw (p. 20) */
(function (global) {
'use strict';
const Cx = CK.Cx, cx = Cx.c; const W_ = (a, b, o = {}) => ({ type: 'W', a, b, ...o });
const RT2 = Math.SQRT2, RT3 = Math.sqrt(3), D2R = Math.PI / 180, pol = (m, a) => CH6.polar(m, a);
const CH9C = { RT3 };

CH9C.phases = (Vp, th = 0, seq = 1) => [0, 1, 2].map(k => pol(Vp, th - seq * 120 * k));
CH9C.lines = V => [Cx.sub(V[0], V[1]), Cx.sub(V[1], V[2]), Cx.sub(V[2], V[0])];
/* line currents of a Δ from its phase currents: I_aA = I_AB − I_CA, I_bB = I_BC − I_AB, I_cC = I_CA − I_BC */
CH9C.deltaLines = Ip => [Cx.sub(Ip[0], Ip[2]), Cx.sub(Ip[1], Ip[0]), Cx.sub(Ip[2], Ip[1])];

/* per-phase method. o: {conn: 'Y' | 'D', VL, P (total W), pf, lead (bool)}  →  every quantity of one phase (rms) */
CH9C.perPhase = (o = {}) => { const Y = o.conn !== 'D', VL = o.VL, Vp = Y ? VL / RT3 : VL, Pp = o.P / 3, th = Math.acos(o.pf) / D2R * (o.lead ? -1 : 1);
  const Ip = Pp / (Vp * o.pf), IL = Y ? Ip : RT3 * Ip, Zm = Vp / Ip, Z = pol(Zm, th), Sp = pol(Vp * Ip, th);
  return { Y, VL, Vp, Pp, th, Ip, IL, Zm, Z, Sp, S: Cx.scale(Sp, 3), Sap: 3 * Vp * Ip, Vsrc: VL / RT3 }; };

/* polar label of an impedance: 100∠60° Ω */
CH9C.zp = z => `${CH6.fd(Cx.abs(z), 2)}∠${CH6.fd(CH6.deg(z), 2).replace('-', '−')}° Ω`;

/* ---------------- layouts ----------------
   Y source: n in the middle, a upper left, b upper right, c below (Hayt Figs. 12.11–12.18) */
const SRC = { n: [2.0, 2.6], a: [0.5, 1.1], b: [3.5, 1.1], c: [2.0, 4.7] };
const srcParts = (V, o = {}) => ['a', 'b', 'c'].map((k, i) => ({ id: 'V' + k, type: 'VAC', a: k, b: 'n', amp: Cx.abs(V[i]) * RT2, phase: CH6.deg(V[i]),
  name: `V_{${k}n}`, valText: '', label: false, showI: false, ...(o.src || {}) }));

/* source alone with two voltmeters (V_ab between the a and b lines, V_bn between the b line and the neutral) */
CH9C.src = (o = {}) => { const V = CH9C.phases(o.Vp ?? 100, o.th ?? 0, o.seq ?? 1), m = o.meters || ['ab', 'bn'];
  const nodes = { ...SRC, _padL: [-1.3, 2.6], ma: [5.4, -0.4], tA: [8.4, -0.4], mb1: [5.4, 1.1], mb2: [6.9, 1.1], tB: [8.4, 1.1], mn: [6.9, 2.6], tN: [8.4, 2.6], tC: [8.4, 4.7] };
  const parts = [...srcParts(V),
    W_('a', 'ma', { id: 'la1', pts: [[0.5, -0.4]] }), W_('ma', 'tA', { id: 'la2' }), W_('b', 'mb1', { id: 'lb1' }), W_('mb1', 'mb2', { id: 'lb2' }), W_('mb2', 'tB', { id: 'lb3' }),
    W_('n', 'mn', { id: 'ln1' }), W_('mn', 'tN', { id: 'ln2' }), W_('c', 'tC', { id: 'lc' }),
    { id: 'Mab', type: 'VM', a: 'ma', b: 'mb1', name: 'V_{ab}', side: 1, labelOff: 0.45 },
    { id: 'Mbn', type: 'VM', a: 'mb2', b: 'mn', name: 'V_{bn}', side: 1, labelOff: 0.45 } ];
  return { ground: 'n', mode: 'ac', w: 1, nodes, parts, V }; };

/* Y source + Y load. o: {Vp, th, seq, Z (all phases) or ZA, ZB, ZC, neutral: true (closed switch) | false (open switch) | 'wire' (a plain wire) | 'none' (no neutral drawn),
   zt (z → label text), zText: false (no values), zLabels: false (no labels)} */
CH9C.yy = (o = {}) => { const V = CH9C.phases(o.Vp ?? 200, o.th ?? 0, o.seq ?? 1), Z = o.Z ?? pol(100, 60), ZA = o.ZA ?? Z, ZB = o.ZB ?? Z, ZC = o.ZC ?? Z;
  const nodes = { ...SRC, A: [6.5, 1.1], B: [9.5, 1.1], N: [8.0, 2.6], C: [8.0, 4.7] }, zt = o.zt || (z => `${CH6.rect(z, 2).replace('-', '−')} Ω`);
  const parts = [...srcParts(V),
    W_('a', 'A', { id: 'wa', pts: [[0.5, -0.2], [6.5, -0.2]] }), W_('b', 'B', { id: 'wb', pts: [[3.5, 0.45], [9.5, 0.45]] }), W_('c', 'C', { id: 'wc' }),
    { id: 'ZA', type: 'Z', a: 'A', b: 'N', value: ZA, name: 'Z_A', valText: o.zText === false ? '' : zt(ZA), label: o.zLabels !== false, side: -1, bodyLen: 0.95 },
    { id: 'ZB', type: 'Z', a: 'B', b: 'N', value: ZB, name: 'Z_B', valText: o.zText === false ? '' : zt(ZB), label: o.zLabels !== false, side: 1, bodyLen: 0.95 },
    { id: 'ZC', type: 'Z', a: 'C', b: 'N', value: ZC, name: 'Z_C', valText: o.zText === false ? '' : zt(ZC), label: o.zLabels !== false, side: 1, bodyLen: 0.95 } ];
  if (o.zLabels !== false && o.zText !== false) { nodes._padR = [11.0, 2.6]; nodes._padL = [-1.3, 2.6]; }   // room for Z_B's label and the source value tags
  if (o.neutral === 'wire') parts.push(W_('N', 'n', { id: 'wn' }));   // a plain neutral wire, as the slides draw it
  else if (o.neutral !== 'none') { nodes.s1 = [4.6, 2.6]; nodes.s2 = [5.6, 2.6];
    parts.push(W_('N', 's2', { id: 'wn' }), { id: 'Sn', type: 'S', a: 's2', b: 's1', closed: o.neutral !== false, label: false }, W_('s1', 'n', { id: 'wn2' })); }
  return { ground: 'n', mode: 'ac', w: 1, nodes, parts, V }; };

/* Y source + Δ load (Hayt Fig. 12.18): Z_AB on top, Z_BC and Z_CA on the slanted sides */
CH9C.yd = (o = {}) => { const V = CH9C.phases(o.Vp ?? 300 / RT3, o.th ?? 0, o.seq ?? 1), Z = o.Z ?? pol(180, Math.acos(0.8) / D2R), ZAB = o.ZAB ?? Z, ZBC = o.ZBC ?? Z, ZCA = o.ZCA ?? Z;
  const nodes = { ...SRC, A: [6.5, 1.1], B: [9.5, 1.1], C: [8.0, 4.0] }, zt = o.zt || (z => `${CH6.rect(z, 2).replace('-', '−')} Ω`);
  const parts = [...srcParts(V),
    W_('a', 'A', { id: 'wa', pts: [[0.5, -0.2], [6.5, -0.2]] }), W_('b', 'B', { id: 'wb', pts: [[3.5, 0.45], [9.5, 0.45]] }), W_('c', 'C', { id: 'wc', pts: [[8.0, 4.7]] }),
    { id: 'ZAB', type: 'Z', a: 'A', b: 'B', value: ZAB, name: 'Z_{AB}', valText: o.zText === false ? '' : zt(ZAB), label: o.zLabels !== false, side: -1, bodyLen: 1.0 },
    { id: 'ZBC', type: 'Z', a: 'B', b: 'C', value: ZBC, name: 'Z_{BC}', valText: o.zText === false ? '' : zt(ZBC), label: o.zLabels !== false, side: 1, bodyLen: 1.0 },
    { id: 'ZCA', type: 'Z', a: 'C', b: 'A', value: ZCA, name: 'Z_{CA}', valText: o.zText === false ? '' : zt(ZCA), label: o.zLabels !== false, side: -1, bodyLen: 1.0 } ];
  if (o.zLabels !== false && o.zText !== false) { nodes._padR = [11.2, 2.6]; nodes._padL = [-1.3, 2.6]; }   // room for the slanted labels and the source value tags
  return { ground: 'n', mode: 'ac', w: 1, nodes, parts, V }; };

/* ---------------- the problems ---------------- */
/* slide p. 13 (Hayt Example 12.2): 200∠0° V rms, (+) sequence, Z_p = 100∠60° Ω, three wires */
CH9C.ex1 = (() => { const Vp = 200, Z = pol(100, 60), V = CH9C.phases(Vp, 0, 1), VL = CH9C.lines(V), I = V.map(v => Cx.div(v, Z));
  const S = V.map((v, k) => Cx.mul(v, Cx.conj(I[k]))), St = S.reduce((s, z) => Cx.add(s, z), cx(0));
  return { Vp, Z, V, VL, I, S, St, In: I.reduce((s, z) => Cx.add(s, z), cx(0)) }; })();
/* slide p. 14 (Hayt Example 12.3): V_L = 300 V, Y load, 1200 W at 0.8 leading */
CH9C.ex2 = CH9C.perPhase({ conn: 'Y', VL: 300, P: 1200, pf: 0.8, lead: true });
/* slide p. 18 (Hayt Example 12.5): V_L = 300 V, Δ load, 1200 W at 0.8 lagging; the 2017 class solution took 300 V as a peak value */
CH9C.ex3 = (() => { const r = CH9C.perPhase({ conn: 'D', VL: 300, P: 1200, pf: 0.8 }), IpPk = 400 / (300 / RT2 * 0.8), IpCls = 2.36;
  return { ...r, cls: { Ip: IpPk, IpShown: IpCls, Z: pol(300 / IpCls, 36.86), Zconsistent: pol(300 / RT2 / IpPk, Math.acos(0.8) / D2R), IL: RT3 * IpPk } }; })();
/* 2017 quiz (Hayt Example 12.6): the same as Ex 3 with a Y load; the class answer 4.0824 A also took 300 V as a peak value */
CH9C.q2017 = (() => { const r = CH9C.perPhase({ conn: 'Y', VL: 300, P: 1200, pf: 0.8 }); return { ...r, cls: { Vp: 300 / RT3 / RT2, IL: 400 / (300 / RT3 / RT2 * 0.8) } }; })();
/* homework p. 20: V_bn = 220 V rms in negative sequence, 3000 W to a Y load at 0.95 lagging */
CH9C.hw = (() => { const r = CH9C.perPhase({ conn: 'Y', VL: 220 * RT3, P: 3000, pf: 0.95 }), V = CH9C.phases(220, 0, -1); return { ...r, V }; })();

global.CH9C = CH9C;
})(window);
