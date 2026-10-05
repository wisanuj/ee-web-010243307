/* ch11_circuits.js — the problems of chapter 11 (DC machines), shared by the pages and tests.html.
   A DC machine is drawn as its armature circuit: Ra (a resistor) in series with the back emf Eb (engine part 'motor', value 0, emf = Eb,
   + at a). Field windings are resistors drawn as windings (draw: 'L'), the field rheostat Rfx is draw: 'rheo'. The engine solves the
   currents for a given Eb; the mechanical side (speed, torque) is worked out by the pages from Eb = KΦω and T = KΦIa.
   Problems (sources: 2025 handout "Electrical Engineering (Chapter 11)" and P. C. Sen, Principles of Electric Machines, 3rd ed., ch. 4):
     rev     (11.1, P. C. Sen Problem 4.25: motor or generator on a 240 V line)
     lapwave (11.2, P. C. Sen Example 4.1: lap and wave windings)     start (11.2 demo, P. C. Sen Example 4.10: starting current)
     fan     (11.3, P. C. Sen Example 4.9: series motor driving a fan)
     ex1 ex2 ex3 (11.4, handout slides 26–28: long-shunt compound, shunt, short-shunt compound) */
(function (global) {
'use strict';
const W_ = (a, b, o = {}) => ({ type: 'W', a, b, ...o }), TWO_PI = 2 * Math.PI, rad = n => n * TWO_PI / 60;
const fd = (x, d) => CH6.fd(x, d);
const CH11C = { rad, rpm: w => w * 60 / TWO_PI, HP: 746 };

/* ---------------- the numbers ---------------- */
/* P. C. Sen Problem 4.25 (3rd ed.; Problem 4.23 in the solution manual): a dc machine across a 240 V line at 1200 rpm generates 230 V, Ia = 40 A */
CH11C.rev = (() => { const Vt = 240, Ea = 230, n = 1200, Ia = 40, Ra = (Vt - Ea) / Ia, w = rad(n), Pd = Ea * Ia, T = Pd / w, KF = Ea / w;
  return { Vt, Ea, n, Ia, Ra, w, Pcu: Ia * Ia * Ra, Pd, Pin: Vt * Ia, T, KF, nNL: n * Vt / Ea, nNL09: n * Vt / Ea * 0.9 }; })();
/* P. C. Sen Example 4.1: four poles, armature radius 12.5 cm, length 25 cm, poles cover 75 % of the periphery, 33 coils × 7 turns, 0.75 T, 1000 rpm,
   coil current 100 A. Lap: a = p = 4; wave: a = 2. (The book rounds Φ to 0.0276 Wb: 212.5 V, 811.8 N·m.) */
CH11C.lapwave = (() => { const p = 4, r = 0.125, l = 0.25, cover = 0.75, coils = 33, turns = 7, B = 0.75, n = 1000, Icoil = 100;
  const Z = 2 * coils * turns, Ap = TWO_PI * r * l * cover / p, Phi = Ap * B, w = rad(n);
  const wind = a => { const Ka = Z * p / (TWO_PI * a), Ea = Ka * Phi * w, Ia = a * Icoil, T = Ka * Phi * Ia; return { a, Ka, Ea, Ia, T, P: Ea * Ia }; };
  return { p, r, l, cover, coils, turns, B, n, Icoil, Z, Ap, Phi, w, lap: wind(p), wave: wind(2), book: { Phi: 0.0276, EaLap: 212.5, T: 811.8, EaWave: 425 } }; })();
/* P. C. Sen Example 4.10 (the starting demo): 10 kW, 100 V, 1000 rpm, Ra = 0.1 Ω; rated current 100 A; start limited to 2 × rated.
   box: the starter-box resistances of part (c), the handle moved each time Ia falls back to the rated 100 A (0.4, 0.15, 0.025, 0 Ω) */
CH11C.start = (() => { const Vt = 100, Ra = 0.1, P = 10e3, n = 1000, Ir = P / Vt, Eb = Vt - Ir * Ra, KF = Eb / rad(n), Rst = Vt / (2 * Ir) - Ra, box = [Rst];
  for (let k = 0; k < 6 && box[k] > 0; k++) { const Ea = Vt - Ir * (Ra + box[k]); box.push(Math.max(0, (Vt - Ea) / (2 * Ir) - Ra)); }
  return { Vt, Ra, P, n, Ir, Eb, KF, Tr: KF * Ir, Istart: Vt / Ra, Rst, box, wNL: Vt / KF }; })();
/* P. C. Sen Example 4.9: 220 V, 7 hp series motor driving a fan (T ∝ n²): 25 A at 300 rpm with Rae = 0; Ra = 0.6 Ω, Rsr = 0.4 Ω; then 200 rpm by Rae */
CH11C.fan = (() => { const Vt = 220, Ia = 25, n = 300, Ra = 0.6, Rsr = 0.4, Ea = Vt - Ia * (Ra + Rsr), P = Ea * Ia, w = rad(n), T = P / w, Ksr = T / (Ia * Ia);
  const n2 = 200, T2 = T * (n2 / n) ** 2, Ia2 = Math.sqrt(T2 / Ksr), Ea2 = Ksr * Ia2 * rad(n2), Rae = (Vt - Ea2) / Ia2 - Ra - Rsr;
  return { Vt, Ia, n, Ra, Rsr, Ea, P, w, T, Ksr, n2, T2, Ia2, Ea2, Rae, P2: Ea2 * Ia2, hp: P / 746, hp2: Ea2 * Ia2 / 746 }; })();
/* handout slide 26, Ex1: long-shunt compound motor, 25 hp, 230 V, Rsh = 115 Ω, Rse = 0.03 Ω, Ra = 0.18 Ω, rotational losses 1088 W, IL = 92 A */
CH11C.ex1 = (() => { const Vt = 230, Rsh = 115, Rse = 0.03, Ra = 0.18, Prot = 1088, IL = 92, hp = 25, Ish = Vt / Rsh, Ia = IL - Ish, Eb = Vt - Ia * (Ra + Rse);
  const Pin = Vt * IL, Pa = Ia * Ia * Ra, Pse = Ia * Ia * Rse, Psh = Ish * Ish * Rsh, Pcu = Pa + Pse + Psh, Pd = Eb * Ia, Pout = Pd - Prot;
  return { Vt, Rsh, Rse, Ra, Prot, IL, hp, Ish, Ia, Eb, Pin, Pa, Pse, Psh, Pcu, Pd, Pout, eff: Pout / Pin, Prated: hp * 746 }; })();
/* handout slide 27, Ex2: 300 V shunt motor, Rsh = 150 Ω, Ra = 0.2 Ω, IL = 36 A, core losses 210 W, friction 100 W, 1500 rpm */
CH11C.ex2 = (() => { const Vt = 300, Rsh = 150, Ra = 0.2, IL = 36, Pcore = 210, Pfr = 100, n = 1500, Ish = Vt / Rsh, Ia = IL - Ish, Eb = Vt - Ia * Ra;
  const Pin = Vt * IL, Pa = Ia * Ia * Ra, Psh = Ish * Ish * Rsh, Pcu = Pa + Psh, Pd = Eb * Ia, Prot = Pcore + Pfr, Pout = Pd - Prot, w = rad(n);
  return { Vt, Rsh, Ra, IL, Pcore, Pfr, n, Ish, Ia, Eb, Pin, Pa, Psh, Pcu, Pd, Prot, Pout, eff: Pout / Pin, w, Td: Pd / w, Ts: Pout / w }; })();
/* handout slide 28, Ex3: 240 V short-shunt compound motor, Rse = 0.09 Ω, Rsh = 80 Ω, Ra = 0.11 Ω, IL = 15 A, core losses 210 W, friction 100 W, 1500 rpm */
CH11C.ex3 = (() => { const Vt = 240, Rse = 0.09, Rsh = 80, Ra = 0.11, IL = 15, Pcore = 210, Pfr = 100, n = 1500, Vsh = Vt - IL * Rse, Ish = Vsh / Rsh, Ia = IL - Ish, Eb = Vsh - Ia * Ra;
  const Pin = Vt * IL, Pse = IL * IL * Rse, Psh = Ish * Ish * Rsh, Pa = Ia * Ia * Ra, Pcu = Pse + Psh + Pa, Pd = Eb * Ia, Prot = Pcore + Pfr, Pout = Pd - Prot, w = rad(n);
  return { Vt, Rse, Rsh, Ra, IL, Pcore, Pfr, n, Vsh, Ish, Ia, Eb, Pin, Pse, Psh, Pa, Pcu, Pd, Prot, Pout, eff: Pout / Pin, w, Td: Pd / w, Ts: Pout / w }; })();

/* ---------------- motor circuits laid out as the handout's figures (slides 17–21) ---------------- */
/* type: 'sep' | 'shunt' | 'series' | 'short' | 'long'.
   o: { Vt, Vf (sep), Ra, Eb (emf), Rsh (one shunt resistance) or Rfw + Rfx, Rse, ebText (label of Eb, e.g. '? V'), names: {…} overrides,
        val: false (names only), angle (rotor bar) } */
CH11C.motor = (type, o = {}) => {
  const Vt = o.Vt ?? 220, Ra = o.Ra ?? 0.5, Eb = o.Eb ?? 0, Rse = o.Rse ?? 0.3, nm = { Vt: 'V_t', Vf: 'V_f', Ra: 'R_a', Eb: 'E_b', Rse: 'R_ser', Rsh: 'R_sh', Rfw: 'R_fw', Rfx: 'R_fx', ...(o.names || {}) };
  const v = (x, u) => (o.val === false ? '' : `${fd(x, Math.abs(x) >= 100 ? 1 : Math.abs(x) >= 1 ? 2 : 3)} ${u}`);
  const ebText = o.ebText ?? v(Eb, 'V'), parts = [], nodes = {};
  const shunt = (a, b, mid) => { /* one shunt resistance, or the winding Rfw and the rheostat Rfx in series (a → mid → b) */
    if (o.Rsh !== undefined) parts.push({ id: 'Rsh', type: 'R', a, b, value: o.Rsh, name: nm.Rsh, valText: v(o.Rsh, 'Ω'), side: -1, draw: 'L' });
    else { parts.push({ id: 'Rfw', type: 'R', a, b: mid, value: o.Rfw ?? 80, name: nm.Rfw, valText: v(o.Rfw ?? 80, 'Ω'), side: -1, draw: 'L' },
      { id: 'Rfx', type: 'R', a: mid, b, value: o.Rfx ?? 30, name: nm.Rfx, valText: v(o.Rfx ?? 30, 'Ω'), side: -1, draw: 'rheo' }); } };
  const arm = (top, mid, bot, side = 1) => { parts.push({ id: 'Ra', type: 'R', a: top, b: mid, value: Ra, name: nm.Ra, valText: v(Ra, 'Ω'), side },
    { id: 'M', type: 'motor', a: mid, b: bot, value: 0, emf: Eb, name: nm.Eb, valText: ebText, side, signs: true, angle: o.angle || 0 }); };
  const src = (a, b) => parts.push({ id: 'Vt', type: 'V', a, b, value: Vt, name: nm.Vt, valText: v(Vt, 'V'), side: 1 });
  if (type === 'sep') {
    Object.assign(nodes, { f0: [0, 0.6], f1: [1.9, 0.6], f2: [1.9, 2.5], f3: [1.9, 3.4], f4: [0, 3.4], a0: [3.5, 0.6], a1: [3.5, 1.9], a2: [3.5, 3.4], t0: [5.7, 0.6], t1: [5.7, 3.4] });
    parts.push({ id: 'Vf', type: 'V', a: 'f0', b: 'f4', value: o.Vf ?? 100, name: nm.Vf, valText: v(o.Vf ?? 100, 'V'), side: -1, battery: true }, W_('f0', 'f1', { id: 'wf1' }));
    if (o.Rsh !== undefined) parts.push({ id: 'Rsh', type: 'R', a: 'f1', b: 'f3', value: o.Rsh, name: nm.Rsh, valText: v(o.Rsh, 'Ω'), side: 1, draw: 'L' });
    else parts.push({ id: 'Rfw', type: 'R', a: 'f1', b: 'f2', value: o.Rfw ?? 80, name: nm.Rfw, valText: v(o.Rfw ?? 80, 'Ω'), side: 1, draw: 'L' },
      { id: 'Rfx', type: 'R', a: 'f2', b: 'f3', value: o.Rfx ?? 20, name: nm.Rfx, valText: v(o.Rfx ?? 20, 'Ω'), side: 1, draw: 'rheo' });
    parts.push(W_('f3', 'f4', { id: 'wf2' }), W_('a0', 't0', { id: 'wa1' }), W_('a2', 't1', { id: 'wa2' }));
    arm('a0', 'a1', 'a2'); src('t0', 't1');
    return { mode: 'dc', ground: 't1', nodes, parts }; }
  if (type === 'series') {   /* o.Rae: an external resistance in the line (speed control, P. C. Sen Example 4.9) */
    const ext = o.Rae !== undefined, xr = ext ? 6.2 : 4.6;
    Object.assign(nodes, { a0: [0, 0], s0: [0.9, 0], s1: [3.3, 0], r0: [xr, 0], aA: [0, 1.8], a4: [0, 3.6], r4: [xr, 3.6] });
    parts.push(W_('a0', 's0', { id: 'w1' }), { id: 'Rse', type: 'R', a: 's0', b: 's1', value: Rse, name: nm.Rse, valText: v(Rse, 'Ω'), side: -1, draw: 'L' }, W_('a4', 'r4', { id: 'w3' }));
    if (ext) { nodes.s2 = [3.7, 0]; nodes.s3 = [5.8, 0]; parts.push(W_('s1', 's2', { id: 'w2' }), { id: 'Rae', type: 'R', a: 's2', b: 's3', value: Math.max(o.Rae, 1e-6), name: nm.Rae ?? 'R_ae', valText: o.raeText ?? v(o.Rae, 'Ω'), side: -1 }, W_('s3', 'r0', { id: 'w4' })); }
    else parts.push(W_('s1', 'r0', { id: 'w2' }));
    arm('a0', 'aA', 'a4', -1); src('r0', 'r4');
    return { mode: 'dc', ground: 'r4', nodes, parts }; }
  if (type === 'shunt') {
    Object.assign(nodes, { t0: [0, 0], m0: [2.5, 0], r0: [5, 0], fA: [0, 2.3], b0: [0, 3.8], mA: [2.5, 1.7], m4: [2.5, 3.8], r4: [5, 3.8] });
    parts.push(W_('t0', 'm0', { id: 'w1' }), W_('m0', 'r0', { id: 'w2' }), W_('b0', 'm4', { id: 'w3' }), W_('m4', 'r4', { id: 'w4' }));
    shunt('t0', 'b0', 'fA'); arm('m0', 'mA', 'm4'); src('r0', 'r4');
    return { mode: 'dc', ground: 'r4', nodes, parts }; }
  if (type === 'short') {
    Object.assign(nodes, { t0: [0, 0], m0: [2.5, 0], s0: [3.1, 0], s1: [5.1, 0], r0: [5.8, 0], fA: [0, 2.3], b0: [0, 3.8], mA: [2.5, 1.7], m4: [2.5, 3.8], r4: [5.8, 3.8] });
    parts.push(W_('t0', 'm0', { id: 'w1' }), W_('m0', 's0', { id: 'w2' }), { id: 'Rse', type: 'R', a: 's0', b: 's1', value: Rse, name: nm.Rse, valText: v(Rse, 'Ω'), side: 1, draw: 'L' }, W_('s1', 'r0', { id: 'w5' }),
      W_('b0', 'm4', { id: 'w3' }), W_('m4', 'r4', { id: 'w4' }));
    shunt('t0', 'b0', 'fA'); arm('m0', 'mA', 'm4'); src('r0', 'r4');
    return { mode: 'dc', ground: 'r4', nodes, parts }; }
  /* long shunt: the shunt field across the terminals, the series field in the armature branch */
  Object.assign(nodes, { t0: [0, 0], m0: [2.5, 0], r0: [5, 0], fA: [0, 2.4], b0: [0, 4.4], mS: [2.5, 1.45], mA: [2.5, 2.75], m4: [2.5, 4.4], r4: [5, 4.4] });
  parts.push(W_('t0', 'm0', { id: 'w1' }), W_('m0', 'r0', { id: 'w2' }), W_('b0', 'm4', { id: 'w3' }), W_('m4', 'r4', { id: 'w4' }),
    { id: 'Rse', type: 'R', a: 'm0', b: 'mS', value: Rse, name: nm.Rse, valText: v(Rse, 'Ω'), side: 1, draw: 'L' });
  shunt('t0', 'b0', 'fA'); arm('mS', 'mA', 'm4'); src('r0', 'r4');
  return { mode: 'dc', ground: 'r4', nodes, parts };
};

/* the armature alone on a dc line: Vt, Ra and Eb (P. C. Sen Problem 4.25). o: { Vt, Ra, Eb, raText, ebText, vtName } */
CH11C.arm = (o = {}) => { const Vt = o.Vt ?? 240, Ra = o.Ra ?? 0.25, Eb = o.Eb ?? 230;
  return { mode: 'dc', ground: 't1', nodes: { t0: [0, 0], t1: [0, 3.4], a0: [3.2, 0], aA: [3.2, 1.7], a4: [3.2, 3.4] },
    parts: [{ id: 'Vt', type: 'V', a: 't0', b: 't1', value: Vt, name: o.vtName ?? 'V_t', valText: `${fd(Vt, 0)} V`, side: -1 }, W_('t0', 'a0', { id: 'w1' }), W_('a4', 't1', { id: 'w2' }),
      { id: 'Ra', type: 'R', a: 'a0', b: 'aA', value: Ra, name: 'R_a', valText: o.raText ?? `${fd(Ra, 2)} Ω`, side: 1 },
      { id: 'M', type: 'motor', a: 'aA', b: 'a4', value: 0, emf: Eb, name: 'E_a', valText: o.ebText ?? `${fd(Eb, 1)} V`, side: 1, signs: true }] }; };

/* the armature behind a switch and a starter box (P. C. Sen Example 4.10): Vt, switch SW, starting resistance Rae (rheostat), Ra and Ea.
   o: { Vt, Ra, Rae, Ea, on (switch closed) } */
CH11C.starter = (o = {}) => { const Vt = o.Vt ?? 100, Ra = o.Ra ?? 0.1, Rae = o.Rae ?? 0.4, Ea = o.Ea ?? 0;
  return { mode: 'dc', ground: 't1', nodes: { t0: [0, 0], t1: [0, 3.4], r0: [1.5, 0], r1: [3.4, 0], a0: [4.6, 0], aA: [4.6, 1.7], a4: [4.6, 3.4] },
    parts: [{ id: 'Vt', type: 'V', a: 't0', b: 't1', value: Vt, name: 'V_t', valText: `${fd(Vt, 0)} V`, side: -1 },
      { id: 'SW', type: 'S', a: 't0', b: 'r0', closed: !!o.on, name: 'S' },
      { id: 'Rae', type: 'R', a: 'r0', b: 'r1', value: Math.max(Rae, 1e-6), name: 'R_ae', valText: `${fd(Rae, 3)} Ω`, side: -1, draw: 'rheo' },
      W_('r1', 'a0', { id: 'w1' }), W_('a4', 't1', { id: 'w2' }),
      { id: 'Ra', type: 'R', a: 'a0', b: 'aA', value: Ra, name: 'R_a', valText: `${fd(Ra, 2)} Ω`, side: 1 },
      { id: 'M', type: 'motor', a: 'aA', b: 'a4', value: 0, emf: Ea, name: 'E_a', valText: `${fd(Ea, 1)} V`, side: 1, signs: true }] }; };

/* armature with a parallel paths between the brushes (P. C. Sen Example 4.1), each path an emf e with a small resistance, feeding a load
   that draws Ia: a = 4 (lap) or 2 (wave). o: { r, eName, loadName, iText (label of the load current, e.g. '? A') } */
CH11C.paths = (a, e, Ia, o = {}) => { const r = o.r ?? 0.002, nodes = { lp: [1.9 * (a - 1) + 2.4, 0], lq: [1.9 * (a - 1) + 2.4, 3.6] }, parts = [];
  for (let k = 0; k < a; k++) { const x = 1.9 * k; nodes['t' + k] = [x, 0]; nodes['m' + k] = [x, 1.5]; nodes['b' + k] = [x, 3.6];
    parts.push({ id: 'E' + k, type: 'V', a: 't' + k, b: 'm' + k, value: e, name: k ? '' : (o.eName ?? 'e'), valText: k ? '' : `${fd(e, 1)} V`, side: 1, label: k === 0 },
      { id: 'r' + k, type: 'R', a: 'm' + k, b: 'b' + k, value: r, name: '', valText: '', side: 1, label: false, draw: 'L' });
    if (k) parts.push(W_('t' + (k - 1), 't' + k, { id: 'wt' + k }), W_('b' + (k - 1), 'b' + k, { id: 'wb' + k })); }
  const RL = (e - Ia / a * r) / Ia;
  parts.push(W_('t' + (a - 1), 'lp', { id: 'wtl' }), W_('b' + (a - 1), 'lq', { id: 'wbl' }), { id: 'RL', type: 'R', a: 'lp', b: 'lq', value: RL, name: o.loadName ?? 'load', valText: o.iText ?? `${fd(Ia, 0)} A`, side: 1 });
  return { mode: 'dc', ground: 'lq', nodes, parts }; };

global.CH11C = CH11C;
})(window);
