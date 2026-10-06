/* ch12_circuits.js — the problems of chapter 12 (AC machines: the three-phase induction machine), shared by the pages and tests.html.
   Sources: 2025 handout "Electrical Engineering (Chapter 12)" (11 slides; its footer and example number say "Chapter 13", copied from the
   textbook layout) and P. C. Sen, Principles of Electric Machines and Power Electronics, 3rd ed., chapter 5 (sections 5.1–5.5 and 5.7).
     ex51  (12.2, slide p. 8 "Example 13.1" = P. C. Sen Example 5.1: speeds, rotor frequency, slip rpm, rotor voltage)
     p51   (12.2, P. C. Sen Problem 5.1: slip-ring voltage and frequency at five speeds)
     ex52  (12.3, slide p. 10 = P. C. Sen Example 5.2: mechanical power, air-gap power, rotor copper loss)
     p57   (12.3, P. C. Sen Problems 5.7 and 5.8: power flow from the input current to the output torque)
     ex54  (12.3, P. C. Sen Example 5.4: the per-phase equivalent circuit at full load; also the machine of the three-modes demo) */
(function (global) {
'use strict';
const W_ = (a, b, o = {}) => ({ type: 'W', a, b, ...o }), TWO_PI = 2 * Math.PI, rad = n => n * TWO_PI / 60, RT3 = Math.sqrt(3), RT2 = Math.SQRT2;
const fd = (x, d) => CH6.fd(x, d);
const CH12C = { rad, HP: 746 };

/* slide p. 8 = P. C. Sen Example 5.1: 3φ, 460 V, 100 hp, 60 Hz, four poles, slip 0.05, stator-to-rotor turns ratio 1 : 0.5 */
CH12C.ex51 = (() => { const V = 460, f = 60, p = 4, s = 0.05, ratio = 0.5, ns = 120 * f / p, n = (1 - s) * ns, E1 = V / RT3, E2 = ratio * E1;
  return { V, f, p, s, ratio, ns, n, f2: s * f, slipRpm: s * ns, rel: { rotor: s * ns, stator: ns, field: 0 }, E1, E2, E2s: s * E2 }; })();
/* P. C. Sen Problem 5.1: 3φ, 460 V, 60 Hz, 4 poles, Y wound rotor, 230 V between the slip rings at standstill; driven by a dc motor at
   (a) 1620 rpm with the field, (b) 1620 rpm against it, (c) 1800 with, (d) 1800 against, (e) 3600 with. Voltage |s|·230 V, frequency |s|·60 Hz */
CH12C.p51 = (() => { const f = 60, p = 4, E2 = 230, ns = 120 * f / p, speeds = [1620, -1620, 1800, -1800, 3600];
  return { f, p, E2, ns, cases: speeds.map(n => { const s = (ns - n) / ns; return { n, s, V: Math.abs(s) * E2, f2: Math.abs(s) * f }; }) }; })();
/* slide p. 10 = P. C. Sen Example 5.2: 3φ, 15 hp, 460 V, four poles, 60 Hz, 1728 rpm at full output, windage and friction 750 W */
CH12C.ex52 = (() => { const hp = 15, f = 60, p = 4, n = 1728, Pfw = 750, ns = 120 * f / p, s = (ns - n) / ns, Pout = hp * 746, Pmech = Pout + Pfw, Pag = Pmech / (1 - s);
  return { hp, f, p, n, Pfw, ns, s, Pout, Pmech, Pag, P2: s * Pag }; })();
/* P. C. Sen Problems 5.7 + 5.8: 3φ, 460 V, 60 Hz, 20 kW, four poles; draws 25 A at PF 0.9 lagging; core 900 W, stator copper 1100 W,
   rotor copper 550 W, friction and windage 300 W */
CH12C.p57 = (() => { const V = 460, I = 25, pf = 0.9, Pcore = 900, Pst = 1100, P2 = 550, Pfw = 300, f = 60, p = 4, ns = 120 * f / p, ws = rad(ns);
  const Pin = RT3 * V * I * pf, Pag = Pin - Pcore - Pst, Pmech = Pag - P2, Pout = Pmech - Pfw, s = P2 / Pag, n = (1 - s) * ns, wm = (1 - s) * ws;
  return { V, I, pf, Pcore, Pst, P2, Pfw, f, p, ns, ws, Pin, Pag, Pmech, Pout, hp: Pout / 746, eff: Pout / Pin, s, n, wm, Td: Pag / ws, Tout: Pout / wm }; })();
/* P. C. Sen Example 5.4: 3φ, 460 V, 1740 rpm, 60 Hz, four-pole wound-rotor motor; R1 = 0.25, R2' = 0.2, X1 = X2' = 0.5, Xm = 30 Ω; rotational
   losses 1700 W. Exact slip 1/30 (the book rounds to 0.0333, so R2'/s = 6.01 Ω, I = 42.754 A; it also rounds the PF to 0.94: η = 87.5 %) */
CH12C.par54 = { V: 460 / RT3, R1: 0.25, X1: 0.5, R2: 0.2, X2: 0.5, Xm: 30, p: 4, f: 60, Prot: 1700 };
CH12C.ex54 = (() => { const par = CH12C.par54, n = 1740, ns = 120 * par.f / par.p, s = (ns - n) / ns, m = CH12.im(par, s), st = CH12.im(par, 1);
  return { par, n, ns, s, R2s: par.R2 / s, RL: par.R2 * (1 - s) / s, m, Z: m.Z1, I1: m.I1, I2: m.I2, Ist: st.I1, Tst: st.T, book: { I: 42.754, eff: 87.5, Ist: 245.9, Tst: 185.2, Tmax: 431.68, sTmax: 0.1963 } }; })();

/* the per-phase equivalent circuit for the engine (rms values: the source amplitude is √2·V, views use acPeak: false). Impedances are
   given directly (type 'Z' drawn as coils) on ω = 1 rad/s, so the dots move slowly. o: { par, s, names, rlText } */
CH12C.eqc = (o = {}) => { const par = o.par || CH12C.par54, s = o.s ?? (1 / 30), RL = par.R2 * (1 - s) / s;
  const nodes = { s1: [0, 0], n1: [1.9, 0], m1: [3.8, 0], r1: [5.7, 0], r2: [7.6, 0], s0: [0, 3.2], m0: [3.8, 3.2], r0: [7.6, 3.2] };
  const parts = [{ id: 'V1', type: 'VAC', a: 's1', b: 's0', amp: par.V * RT2, phase: 0, name: 'V_1', valText: `${fd(par.V, 1)} V`, side: -1 },
    { id: 'R1', type: 'R', a: 's1', b: 'n1', value: par.R1, name: 'R_1', valText: `${fd(par.R1, 2)} Ω`, side: 1 },
    { id: 'X1', type: 'Z', a: 'n1', b: 'm1', value: { re: 0, im: par.X1 }, name: 'jX_1', valText: `j${fd(par.X1, 2)} Ω`, side: 1, draw: 'L' },
    { id: 'Xm', type: 'Z', a: 'm1', b: 'm0', value: { re: 0, im: par.Xm }, name: 'jX_m', valText: `j${fd(par.Xm, 1)} Ω`, side: 1, draw: 'L' },
    { id: 'X2', type: 'Z', a: 'm1', b: 'r1', value: { re: 0, im: par.X2 }, name: 'jX′_2', valText: `j${fd(par.X2, 2)} Ω`, side: 1, draw: 'L' },
    { id: 'R2', type: 'R', a: 'r1', b: 'r2', value: par.R2, name: 'R′_2', valText: `${fd(par.R2, 2)} Ω`, side: 1 },
    { id: 'RL', type: 'R', a: 'r2', b: 'r0', value: RL, name: (o.names && o.names.RL) || 'R′_2(1−s)/s', valText: o.rlText ?? `${fd(RL, 3)} Ω`, side: 1 },
    W_('s0', 'm0', { id: 'w1' }), W_('m0', 'r0', { id: 'w2' })];
  return { mode: 'ac', w: 1, ground: 's0', nodes, parts }; };

global.CH12C = CH12C;
})(window);
