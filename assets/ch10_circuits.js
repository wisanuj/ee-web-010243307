/* ch10_circuits.js — the problems of chapter 10 (magnetic circuits and transformers), shared by the pages and tests.html.
   Magnetic equivalent circuits are DC circuits for the engine: an mmf source F = Ni is a voltage source (value in At, + where the flux leaves),
   a reluctance is a resistor (At/Wb) and the flux is the current (Wb). Transformer circuits are AC with rms values (amp = √2·V_rms).
   Problems (sources: 2023 magnetic-circuits handout, 2017 slides, the 2021 review sheet, 2025 transformer handout):
     toroid  (10.1, handout slide 20 quiz = P. C. Sen Ex 1.5)   cast    (10.1, review sheet 3 = P. C. Sen P1.9)
     ex102   (10.2, handout slide 14 = P. C. Sen Ex 1.4)        relay   (10.2, 2017 Example 10.1 = P. C. Sen Ex 1.1)
     thick   (10.2, review sheet 2 = P. C. Sen P1.2, N = 300)   twin    (10.2, 2017 Example 10.2 = review sheet 4 = P. C. Sen Ex 1.3)
     uplate  (10.2, review sheet 1: a U core over a bottom plate, two 0.025 m air gaps)
     sine    (10.3, 2017 Example 10.4 = P. C. Sen Ex 1.6)
     speaker (10.4, transformer slide 9 = P. C. Sen Ex 2.1)     s220    (10.4, transformer slide 16)
     hayt    (10.5, transformer slide 15 = Hayt Example 13.7) */
(function (global) {
'use strict';
const Cx = CK.Cx, cx = Cx.c, MU0 = 4 * Math.PI * 1e-7, RT2 = Math.SQRT2, W_ = (a, b, o = {}) => ({ type: 'W', a, b, ...o });
const CH10C = { MU0 };
const rel = (l, mur, A) => l / (mur * MU0 * A);

/* ---------------- the numbers ---------------- */
/* handout slide 20 (quiz): 250 turns on silicon sheet steel, radii 20 and 25 cm, circular cross section, 2.5 A */
CH10C.toroid = (() => { const N = 250, i = 2.5, r1 = 0.20, r2 = 0.25, rm = (r1 + r2) / 2, l = 2 * Math.PI * rm, rc = (r2 - r1) / 2, A = Math.PI * rc * rc;
  const H = N * i / l, B = 1.225, Phi = B * A, lam = N * Phi, L = lam / i, mu = B / H, R = l / (mu * A);
  return { N, i, r1, r2, rm, l, rc, A, H, B, Phi, lam, L, mu, mur: mu / MU0, R, Lr: N * N / R }; })();
/* review sheet 3 (P. C. Sen P1.9): cast steel toroid, 200 turns, radii 6 and 10 cm, circular cross section, B = 1.2 T; then a 2 mm air gap */
CH10C.cast = (() => { const N = 200, r1 = 0.06, r2 = 0.10, rm = (r1 + r2) / 2, l = 2 * Math.PI * rm, rc = (r2 - r1) / 2, A = Math.PI * rc * rc, B = 1.2, H = 1000, lg = 2e-3;
  const Fc = H * l, i = Fc / N, Phi = B * A, Fg = B / MU0 * lg, ig = (Fc + Fg) / N;
  return { N, r1, r2, rm, l, rc, A, B, H, lg, Fc, i, Phi, Fg, ig, ratio: ig / i }; })();
/* handout slide 14 (Example 10.2): N 400, lc 50 cm, lg 1 mm, A 15 cm², μr 3000, i 1 A */
CH10C.ex102 = (() => { const N = 400, i = 1, lc = 0.5, lg = 1e-3, A = 15e-4, mur = 3000, F = N * i, Rc = rel(lc, mur, A), Rg = rel(lg, 1, A), R = Rc + Rg, Phi = F / R, B = Phi / A, L = N * N / R;
  return { N, i, lc, lg, A, mur, F, Rc, Rg, R, Phi, B, L, lam: N * Phi, Fc: Phi * Rc, Fg: Phi * Rg, Hc: Phi * Rc / lc, Hg: B / MU0, Lcls: 0.25 }; })();
/* 2017 Example 10.1 (P. C. Sen Ex 1.1): relay, 500 turns, lc 360 mm, two 1.5 mm gaps, 0.8 T, cast steel */
CH10C.relay = (() => { const N = 500, lc = 0.36, lg = 1.5e-3, B = 0.8, Hc = 510, Fc = Hc * lc, Fg = B / MU0 * 2 * lg, F = Fc + Fg, i = F / N, mu = B / Hc;
  return { N, lc, lg, B, Hc, Fc, Fg, F, i, mu, mur: mu / MU0, i0: Fc / N, share: Fg / F }; })();
/* review sheet 2 (P. C. Sen P1.2): two sides 15 cm wide, two 10 cm, window 25 × 25 cm, depth 10 cm, μr 2000, N 300, i 1 A */
CH10C.thick = (() => { const N = 300, i = 1, mur = 2000, d = 0.10, lT = 2 * (0.25 + 0.10), lN = 2 * (0.25 + 0.15), AT = 0.15 * d, AN = 0.10 * d;
  const RT = rel(lT, mur, AT), RN = rel(lN, mur, AN), R = RT + RN, Phi = N * i / R;
  return { N, i, mur, d, lT, lN, AT, AN, RT, RN, R, Phi, BT: Phi / AT, BN: Phi / AN, F: N * i }; })();
/* review sheet 1: a U core (10 cm wide, 5 cm high, 1 cm bars) over a bottom plate (10 × 0.5 cm), all 1 cm deep, μr 10 000, N 100, i 1 A, and two
   0.025 m air gaps as labelled (the figure draws them about as thin as the plate; the instructor confirmed 0.025 m on 6 Oct 2026). Mean paths run
   through the middle of the iron: the U core 2(5 − 0.5) + (10 − 1) = 18 cm, the plate 10 − 1 = 9 cm between the leg centres; gap area = leg face */
CH10C.uplate = (() => { const N = 100, i = 1, mur = 1e4, d = 0.01, t = 0.01, W = 0.1, H = 0.05, tp = 0.005, lg = 0.025;
  const lU = 2 * (H - t / 2) + (W - t), lp = W - t, AU = t * d, Ap = tp * d, RU = rel(lU, mur, AU), Rp = rel(lp, mur, Ap), Rg = rel(lg, 1, AU), R = RU + Rp + 2 * Rg, Phi = N * i / R;
  return { N, i, mur, d, t, W, H, tp, lg, lU, lp, AU, Ap, RU, Rp, Rg, R, Phi, F: N * i, BU: Phi / AU, Bp: Phi / Ap, gapShare: 2 * Rg / R, Bq: MU0 * N * i / (2 * lg) }; })();
/* 2017 Example 10.2 = review sheet 4 (P. C. Sen Ex 1.3): two 500-turn coils at 10 A, μr 1200, 2 × 2 cm cross section, 0.5 cm centre gap */
CH10C.twin = (() => { const F1 = 5000, F2 = 5000, mur = 1200, A = 4e-4, lo = 3 * 0.52, lbe = 0.52 - 0.005, lg = 0.005;
  const Ro = rel(lo, mur, A), Rbe = rel(lbe, mur, A), Rg = rel(lg, 1, A), Rm = Rbe + Rg;
  /* loop equations: Φ1(Ro + Rm) + Φ2 Rm = F1,  Φ1 Rm + Φ2(Ro + Rm) = F2 */
  const a = Ro + Rm, b = Rm, D = a * a - b * b, P1 = (F1 * a - F2 * b) / D, P2 = (F2 * a - F1 * b) / D, Pg = P1 + P2, Bg = Pg / A;
  return { F1, F2, mur, A, lo, lbe, lg, Ro, Rbe, Rg, Rm, a, b, D, P1, P2, Pg, Bg, Hg: Bg / MU0 }; })();
/* 2017 Example 10.4 (P. C. Sen Ex 1.6): 120 V rms, 60 Hz, 200 turns, l 100 cm, A 20 cm², μr 2500 */
CH10C.sine = (() => { const V = 120, f = 60, N = 200, l = 1, A = 20e-4, mur = 2500, w = 2 * Math.PI * f, Pm = V / (4.44 * f * N), Bm = Pm / A, mu = mur * MU0, Hm = Bm / mu, im = Hm * l / N;
  const R = l / (mu * A), L = N * N / R, cls = { Pm: V / Math.SQRT2 / (4.44 * f * N) }; cls.Bm = cls.Pm / A; cls.im = cls.Pm * R / N;
  return { V, f, N, l, A, mur, w, Pm, Bm, mu, Hm, im, R, L, XL: w * L, Em: N * w * Pm, cls }; })();
/* transformer slide 9 (P. C. Sen Ex 2.1): 10 V source with 1 Ω, 9 Ω speaker, then a 1 : 3 transformer */
CH10C.speaker = (() => { const Vs = 10, Rs = 1, R2 = 9, a = 1 / 3, I0 = Vs / (Rs + R2), P0 = I0 * I0 * R2, Rp = a * a * R2, I1 = Vs / (Rs + Rp), P = I1 * I1 * Rp;
  return { Vs, Rs, R2, a, I0, P0, Rp, I1, P, V1: I1 * Rp, I2: a * I1, V2: I1 * Rp / a }; })();
/* transformer slide 16: ideal 220/110 V, 50 Hz, load 3 + j4 Ω */
CH10C.s220 = (() => { const V1 = 220, V2 = 110, a = V1 / V2, ZL = cx(3, 4), I2 = Cx.div(cx(V2), ZL), I1 = Cx.scale(I2, 1 / a), S = Cx.mul(cx(V1), Cx.conj(I1));
  return { V1, V2, a, ZL, I2, I1, S, Zin: Cx.scale(ZL, a * a) }; })();
/* transformer slide 15 (Hayt Example 13.7): 50 V rms, 100 Ω, 1 : 10, 10 kΩ; secondary dot at the lower terminal, V2 marked + at the top */
CH10C.hayt = (() => { const Vs = 50, R1 = 100, a = 0.1, RL = 10e3, Rp = a * a * RL, I1 = Vs / (R1 + Rp), V1 = I1 * Rp, V2 = -V1 / a, I2 = -a * I1;
  return { Vs, R1, a, RL, Rp, I1, V1, V2, I2, P: V2 * I2 }; })();

/* ---------------- core geometries (grid units) for CH10.core ---------------- */
const G = {};
/* a rectangular core with a coil on the left leg and (optionally) a gap in the right leg: outer W × H, bar thickness t */
G.rect = (o = {}) => { const W = o.W ?? 12, H = o.H ?? 9, t = o.t ?? 2, tv = o.tv ?? t, g = o.gap ?? 0, gy = (H - g) / 2;
  const iron = [{ id: 'top', x: 0, y: 0, w: W, h: t }, { id: 'bot', x: 0, y: H - t, w: W, h: t }, { id: 'left', x: 0, y: t, w: tv, h: H - 2 * t }];
  const gaps = []; if (g > 0) { iron.push({ id: 'rightA', x: W - tv, y: t, w: tv, h: gy - t }, { id: 'rightB', x: W - tv, y: gy + g, w: tv, h: H - t - gy - g }); gaps.push({ id: 'gap', x: W - tv, y: gy, w: tv, h: g, label: o.gapLabel }); }
  else iron.push({ id: 'right', x: W - tv, y: t, w: tv, h: H - 2 * t });
  const path = { id: 'm', pts: [[tv / 2, t / 2], [W - tv / 2, t / 2], [W - tv / 2, H - t / 2], [tv / 2, H - t / 2], [tv / 2, t / 2]], label: o.phiLabel, lpos: [W / 2, t + 0.9] };
  const coils = [{ id: 'coil', x: 0, y: t + 0.5, w: tv, h: H - 2 * t - 1, n: o.turns ?? 5, lead: 'left', cur: o.cur, dir: 1, name: o.name, leadLen: 1.4, nameOff: 1.9 }];
  if (o.coil2) coils.push({ id: 'coil2', x: W - tv, y: t + 0.5, w: tv, h: H - 2 * t - 1, n: o.turns2 ?? 5, lead: 'right', cur: o.cur2, dir: o.dir2 ?? -1, name: o.name2, leadLen: 1.4, nameOff: 1.9 });
  return { ext: [-(o.mL ?? 4.2), -0.6, W + (o.mR ?? (g ? 3.2 : 1)), H + 0.6], iron, gaps, coils, paths: [path], dims: o.dims || [], labels: o.labels || [] }; };
G.ex102 = () => G.rect({ W: 12, H: 9, t: 2, gap: 0.7, gapLabel: 'l_g', turns: 5, cur: 'i', name: 'N', phiLabel: 'Φ', mL: 4.6,
  labels: [{ x: 6, y: 4.6, text: 'l_c', color: '#9aa3c7', size: 13 }] });
/* relay (P. C. Sen Fig. E1.1): a C-core with the coil, an armature across two gaps */
G.relay = () => { const t = 2, g = 0.7, W = 9, H = 9;
  return { ext: [-4.6, -0.6, W + g + t + 4.4, H + 0.6],   // room for the armature label
    iron: [{ id: 'top', x: 0, y: 0, w: W, h: t }, { id: 'bot', x: 0, y: H - t, w: W, h: t }, { id: 'left', x: 0, y: t, w: t, h: H - 2 * t }, { id: 'arm', x: W + g, y: 0, w: t, h: H, color: '#3d3550' }],
    gaps: [{ id: 'g1', x: W, y: 0, w: g, h: t, label: '', }, { id: 'g2', x: W, y: H - t, w: g, h: t }],
    coils: [{ id: 'coil', x: 0, y: t + 0.5, w: t, h: H - 2 * t - 1, n: 5, lead: 'left', cur: 'i', dir: 1, name: 'N', leadLen: 1.4, nameOff: 1.9 }],
    paths: [{ id: 'm', pts: [[1, 1], [W + g + 1, 1], [W + g + 1, H - 1], [1, H - 1], [1, 1]], label: 'Φ', lpos: [W / 2, t + 0.9] }],
    labels: [{ x: W + g + t + 0.5, y: H / 2, text: ['ชิ้นเหล็ก', 'armature'], color: '#c792ea', size: 12.5, align: 'left' }, { x: W + g / 2, y: -0.4 + 0, text: 'l_g', color: '#5ad1ff', size: 12.5 }], dims: [] }; };
/* review sheet 2: thick legs (15 cm) and thin bars (10 cm), window 25 cm (units of 5 cm) */
G.thick = () => { const tv = 3, t = 2, W = 3 + 5 + 3, H = 2 + 5 + 2;
  return { ext: [-4.6, -0.6, W + 1, H + 0.6],
    iron: [{ id: 'top', x: 0, y: 0, w: W, h: t }, { id: 'bot', x: 0, y: H - t, w: W, h: t }, { id: 'left', x: 0, y: t, w: tv, h: H - 2 * t }, { id: 'right', x: W - tv, y: t, w: tv, h: H - 2 * t }],
    gaps: [], coils: [{ id: 'coil', x: 0, y: t + 0.5, w: tv, h: H - 2 * t - 1, n: 5, lead: 'left', cur: 'i', dir: 1, name: 'N', leadLen: 1.3, nameOff: 1.8 }],
    paths: [{ id: 'm', pts: [[tv / 2, t / 2], [W - tv / 2, t / 2], [W - tv / 2, H - t / 2], [tv / 2, H - t / 2], [tv / 2, t / 2]], label: 'Φ', lpos: [W / 2, t + 0.9] }],
    labels: [{ x: W / 2, y: H / 2, text: '25 × 25 cm', color: '#9aa3c7', size: 12.5 }], dims: [] }; };
/* review sheet 1, to scale in cm: the U core (1 cm bars), two 2.5 cm air gaps under its legs, the 0.5 cm bottom plate, the coil on the top bar */
G.uplate = (o = {}) => { const W = 10, H = 5, t = 1, g = 2.5, tp = 0.5, yp = H + g;
  return { ext: [-1.6, -2.4, W + 1.6, yp + tp + 1.3],
    iron: [{ id: 'top', x: 0, y: 0, w: W, h: t }, { id: 'left', x: 0, y: t, w: t, h: H - t }, { id: 'right', x: W - t, y: t, w: t, h: H - t }, { id: 'plate', x: 0, y: yp, w: W, h: tp }],
    gaps: [{ id: 'g1', x: 0, y: H, w: t, h: g, label: o.gapLabel ?? 'l_g' }, { id: 'g2', x: W - t, y: H, w: t, h: g }],   // the label sits in the open space between the legs
    coils: [{ id: 'coil', x: 3, y: 0, w: 4, h: t, n: 5, orient: 'h', cur: o.cur ?? 'i', dir: 1, name: o.name ?? 'N', leadLen: 0.9, nameOff: 1.5 }],
    paths: [{ id: 'm', pts: [[t / 2, t / 2], [W - t / 2, t / 2], [W - t / 2, yp + tp / 2], [t / 2, yp + tp / 2], [t / 2, t / 2]], label: 'Φ', lpos: [W / 2, 1.75] }],
    labels: o.labels || [], dims: [] }; };
/* 2017 Example 10.2: three legs, a coil on each outer leg, a gap in the centre leg (drawn thicker than 2 cm for clarity) */
G.twin = (o = {}) => { const t = 1.6, w = 10, W = 3 * t + 2 * w, H = 2 * t + w, cx0 = t + w, g = o.gap ?? 0.7, gy = (H - g) / 2;
  const iron = [{ id: 'top', x: 0, y: 0, w: W, h: t }, { id: 'bot', x: 0, y: H - t, w: W, h: t }, { id: 'left', x: 0, y: t, w: t, h: H - 2 * t }, { id: 'right', x: W - t, y: t, w: t, h: H - 2 * t }];
  const gaps = []; if (g > 0) { iron.push({ id: 'cA', x: cx0, y: t, w: t, h: gy - t }, { id: 'cB', x: cx0, y: gy + g, w: t, h: H - t - gy - g }); gaps.push({ id: 'gap', x: cx0, y: gy, w: t, h: g, label: o.gapLabel ?? 'l_g' }); }
  else iron.push({ id: 'centre', x: cx0, y: t, w: t, h: H - 2 * t });
  const xL = t / 2, xC = cx0 + t / 2, xR = W - t / 2, yT = t / 2, yB = H - t / 2;
  return { ext: [-4.4, -0.8, W + 4.4, H + 0.6], iron, gaps,
    coils: [{ id: 'c1', x: 0, y: t + 1.5, w: t, h: H - 2 * t - 3, n: 5, lead: 'left', cur: o.cur1 ?? 'I_1', dir: 1, name: 'N_1', leadLen: 1.3, nameOff: 1.8 },
      { id: 'c2', x: W - t, y: t + 1.5, w: t, h: H - 2 * t - 3, n: 5, lead: 'right', cur: o.cur2 ?? 'I_2', dir: 1, name: 'N_2', leadLen: 1.3, nameOff: 1.8 }],
    /* the flux leaves each coil upwards, runs along the top to b, down the centre leg to e and back along the bottom (as the equivalent circuit) */
    paths: [{ id: 'p1', pts: [[xC, yB], [xL, yB], [xL, yT], [xC, yT]], label: 'Φ_1', lpos: [w * 0.45, t + 1.1] },
      { id: 'p2', pts: [[xC, yB], [xR, yB], [xR, yT], [xC, yT]], label: 'Φ_2', lpos: [W - w * 0.45, t + 1.1] },
      { id: 'pc', pts: [[xC, yT], [xC, yB]], label: o.pcLabel ?? 'Φ_g', lpos: [xC + 1.3, H * 0.3], lalign: 'left' }],
    labels: [{ x: xC - 0.4, y: -0.45, text: 'b', color: '#9aa3c7', size: 12 }, { x: xC - 0.4, y: H + 0.4, text: 'e', color: '#9aa3c7', size: 12 }], dims: [] }; };
/* two-winding transformer core: primary on the left leg, secondary on the right leg */
G.xf = (o = {}) => { const g = G.rect({ W: o.W ?? 13, H: o.H ?? 9, t: 2, turns: o.n1 ?? 5, cur: o.cur1 ?? 'i_1', name: o.name1 ?? 'N_1', coil2: true, turns2: o.n2 ?? 5, cur2: o.cur2 ?? 'i_2', dir2: o.dir2 ?? -1, name2: o.name2 ?? 'N_2', phiLabel: 'Φ', mL: 4.4, mR: 4.4 });
  g.labels = (o.labels || []); return g; };
CH10C.G = G;

/* ---------------- magnetic equivalent circuits (DC specs) ---------------- */
/* one mmf source (left, + at the top) and reluctances in series down the right side. rs: [{id, name, value}] */
CH10C.series = (F, rs, o = {}) => { const n = rs.length, h = o.h ?? 3, step = h / n, nodes = { t0: [0, 0], b0: [0, h], t1: [3.2, 0], b1: [3.2, h] };
  for (let k = 1; k < n; k++) nodes['m' + k] = [3.2, step * k];
  const parts = [{ id: 'F', type: 'V', a: 't0', b: 'b0', value: F, name: o.fName ?? 'F = Ni', valText: o.fText ?? `${CH6.fd(F, 2)} At`, side: -1 },
    W_('t0', 't1', { id: 'wt' }), W_('b1', 'b0', { id: 'wb' })];
  rs.forEach((r, k) => parts.push({ id: r.id, type: 'R', a: k ? 'm' + k : 't1', b: k < n - 1 ? 'm' + (k + 1) : 'b1', value: r.value, name: r.name, valText: r.valText ?? '', side: 1 }));
  return { mode: 'dc', ground: 'b0', nodes, parts }; };
/* two sources on the outer branches, the centre branch holding one or more reluctances (2017 Example 10.2) */
CH10C.twinSpec = (o = {}) => { const T = CH10C.twin, F1 = o.F1 ?? T.F1, F2 = o.F2 ?? T.F2, Ro = o.Ro ?? T.Ro, Rbe = o.Rbe ?? T.Rbe, Rg = o.Rg ?? T.Rg;
  const nodes = { a0: [0, 0], a1: [0, 3.4], b: [3.2, 0], m: [3.2, 1.7], e: [3.2, 3.4], c0: [6.4, 0], c1: [6.4, 3.4] };
  const parts = [{ id: 'F1', type: 'V', a: 'a0', b: 'a1', value: F1, name: 'F_1', valText: `${CH6.fd(F1, 0)} At`, side: -1 },
    { id: 'Ro1', type: 'R', a: 'a0', b: 'b', value: Ro, name: 'ℛ_bafe', valText: '', side: 1 },
    { id: 'Rbe', type: 'R', a: 'b', b: 'm', value: Rbe, name: 'ℛ_be', valText: '', side: 1 },
    { id: 'Rg', type: 'R', a: 'm', b: 'e', value: Rg, name: 'ℛ_g', valText: '', side: 1 },
    { id: 'Ro2', type: 'R', a: 'c0', b: 'b', value: Ro, name: 'ℛ_bcde', valText: '', side: 1 },
    { id: 'F2', type: 'V', a: 'c0', b: 'c1', value: F2, name: 'F_2', valText: `${CH6.fd(F2, 0)} At`, side: 1 },
    W_('a1', 'e', { id: 'w1' }), W_('c1', 'e', { id: 'w2' })];
  return { mode: 'dc', ground: 'e', nodes, parts }; };
/* one source, a series reluctance, then two parallel branches (the parallel-path demo of page 10.2) */
CH10C.parSpec = (F, R0, Ra, Rb, o = {}) => { const nodes = { t0: [0, 0], b0: [0, 3.2], t1: [2.6, 0], t2: [5.2, 0], b1: [2.6, 3.2], b2: [5.2, 3.2] };
  const parts = [{ id: 'F', type: 'V', a: 't0', b: 'b0', value: F, name: 'F = Ni', valText: `${CH6.fd(F, 0)} At`, side: -1 },
    { id: 'R0', type: 'R', a: 't0', b: 't1', value: R0, name: o.n0 ?? 'ℛ_1', valText: '', side: 1 },
    { id: 'Ra', type: 'R', a: 't1', b: 'b1', value: Ra, name: o.na ?? 'ℛ_2', valText: '', side: -1 },
    W_('t1', 't2', { id: 'wt' }), { id: 'Rb', type: 'R', a: 't2', b: 'b2', value: Rb, name: o.nb ?? 'ℛ_3', valText: '', side: 1 },
    W_('b2', 'b1', { id: 'wb2' }), W_('b1', 'b0', { id: 'wb' })];
  return { mode: 'dc', ground: 'b0', nodes, parts }; };

/* ---------------- transformer circuits (AC, rms) ---------------- */
/* source (amp = √2·Vrms) with an optional series resistance, an ideal transformer n = N1/N2 and a load (R or Z).
   o: { Vs, Rs, n, load: {type 'R' | 'Z', value}, loadName, loadText, dot2 'top' | 'bottom', srcName, srcText, xfName, direct (no transformer) } */
CH10C.xfSpec = (o = {}) => { const Vs = o.Vs ?? 10, n = o.n ?? 1, dot2 = o.dot2 ?? 'top', direct = !!o.direct;
  const nodes = { s0: [0, 3], s1: [0, 0], p1: [3, 0], p0: [3, 3] }, parts = [];
  parts.push({ id: 'Vs', type: 'VAC', a: 's1', b: 's0', amp: Vs * RT2, phase: o.ph ?? 0, name: o.srcName ?? 'V_s', valText: o.srcText ?? `${CH6.fd(Vs, 1)} V rms`, side: -1 });
  if (o.Rs) parts.push({ id: 'Rs', type: 'R', a: 's1', b: 'p1', value: o.Rs, name: o.rsName ?? `${CH6.fd(o.Rs, 0)} Ω`, valText: '', side: 1 }); else parts.push(W_('s1', 'p1', { id: 'w1' }));
  const load = o.load || { type: 'R', value: 9 };
  if (direct) { nodes.l1 = [6, 0]; nodes.l0 = [6, 3]; parts.push(W_('p1', 'l1', { id: 'w2' }), W_('l0', 'p0', { id: 'w3' }), W_('p0', 's0', { id: 'w4' }));
    parts.push({ id: 'ZL', type: load.type, a: 'l1', b: 'l0', value: load.value, name: o.loadName ?? 'R_L', valText: o.loadText ?? '', side: 1, draw: o.loadDraw }); }
  else { nodes.q1 = [4.6, 0]; nodes.q0 = [4.6, 3]; nodes.l1 = [7.4, 0]; nodes.l0 = [7.4, 3];
    parts.push(W_('p0', 's0', { id: 'w4' }));
    parts.push({ id: 'XF', type: 'XF', a: 'p1', b: 'p0', c: dot2 === 'top' ? 'q1' : 'q0', d: dot2 === 'top' ? 'q0' : 'q1', n, name: o.xfName ?? '' });
    parts.push(W_('q1', 'l1', { id: 'w5' }), W_('l0', 'q0', { id: 'w6' }));
    parts.push({ id: 'ZL', type: load.type, a: 'l1', b: 'l0', value: load.value, name: o.loadName ?? 'R_L', valText: o.loadText ?? '', side: 1, draw: o.loadDraw }); }
  return { mode: 'ac', w: 1, ground: 's0', nodes, parts }; };
/* polarity test (transformer slides 11–12): supply on winding 1–2, terminals 2 and 4 joined, voltmeters V12, V34, V13. dot2: '3' or '4' */
CH10C.polSpec = (o = {}) => { const V = o.V ?? 100, n = o.n ?? 10, d3 = (o.dot2 ?? '3') === '3';
  const nodes = { s0: [0, 3.4], s1: [0, 0.4], t1: [2.4, 0.4], t2: [2.4, 3.4], t3: [4.4, 0.4], t4: [4.4, 3.4], m1: [2.4, -1.2], m3: [4.4, -1.2], k3: [6.6, 0.4], k4: [6.6, 3.4] };
  nodes.u1 = [-1.8, 0.4]; nodes.u0 = [-1.8, 3.4]; nodes._padL = [-4.8, 1.9]; nodes._padR = [8.8, 1.9];   // room for the meter labels and readings
  const parts = [{ id: 'Vs', type: 'VAC', a: 's1', b: 's0', amp: V * RT2, name: '1φ', valText: '', side: 1 },
    W_('s1', 't1', { id: 'w1' }), W_('s0', 't2', { id: 'w2' }), W_('s1', 'u1', { id: 'wu1' }), W_('s0', 'u0', { id: 'wu0' }),
    { id: 'V12', type: 'VM', a: 'u1', b: 'u0', name: 'V_12', side: -1, labelOff: 0.45 },
    { id: 'XF', type: 'XF', a: 't1', b: 't2', c: d3 ? 't3' : 't4', d: d3 ? 't4' : 't3', n, name: `${n} : 1` },
    W_('t2', 't4', { id: 'w24', pts: [[2.4, 4.4], [4.4, 4.4]] }),
    W_('t1', 'm1', { id: 'w1m' }), W_('t3', 'm3', { id: 'w3m' }),
    { id: 'V13', type: 'VM', a: 'm1', b: 'm3', name: 'V_13', side: 1, labelOff: 0.45 },
    W_('t3', 'k3', { id: 'w3k' }), W_('t4', 'k4', { id: 'w4k' }),
    { id: 'V34', type: 'VM', a: 'k3', b: 'k4', name: 'V_34', side: 1, labelOff: 0.45 }];
  return { mode: 'ac', w: 1, ground: 's0', nodes, parts }; };
/* two transformers in parallel feeding a load (transformer slide 13); each secondary has a small winding resistance r. wrong: the second
   secondary reversed, so the two secondary voltages aid around the loop of the two secondaries and only r1 + r2 limits the current */
CH10C.parXfSpec = (o = {}) => { const V = o.V ?? 220, n = o.n ?? 2, r = o.r ?? 0.2, RL = o.RL ?? 10, wrong = !!o.wrong;
  const nodes = { s1: [0, 0], s0: [0, 6], j0: [0.8, 6], a1: [2.4, 0], a0: [2.4, 2], b1: [2.4, 4], b0: [2.4, 6], c1: [4, 0], c0: [4, 2], d1: [4, 4], d0: [4, 6],
    e1: [5.6, 0], f1: [5.6, 4], o1: [6.4, 0], k1: [6.4, 4], k0: [7.2, 2], o0: [7.2, 6], l1: [8.6, 0], l0: [8.6, 6] };
  const parts = [{ id: 'Vs', type: 'VAC', a: 's1', b: 's0', amp: V * RT2, name: '1φ', valText: `${V} V`, side: -1 },
    W_('s1', 'a1', { id: 'w1' }), W_('a1', 'b1', { id: 'w2', pts: [[1.6, 0], [1.6, 4]] }), W_('s0', 'j0', { id: 'w3' }), W_('j0', 'b0', { id: 'w3b' }), W_('a0', 'j0', { id: 'w4', pts: [[0.8, 2]] }),
    { id: 'X1', type: 'XF', a: 'a1', b: 'a0', c: 'c1', d: 'c0', n, name: 'T_1' },
    { id: 'X2', type: 'XF', a: 'b1', b: 'b0', c: wrong ? 'd0' : 'd1', d: wrong ? 'd1' : 'd0', n, name: 'T_2' },
    { id: 'r1', type: 'R', a: 'c1', b: 'e1', value: r, name: 'r', valText: '', side: 1 }, { id: 'r2', type: 'R', a: 'd1', b: 'f1', value: r, name: 'r', valText: '', side: 1 },
    W_('e1', 'o1', { id: 'w5' }), W_('o1', 'k1', { id: 'w6' }), W_('f1', 'k1', { id: 'w7' }),
    W_('c0', 'k0', { id: 'w8' }), W_('d0', 'o0', { id: 'w9' }), W_('o0', 'k0', { id: 'w10' }),
    W_('o1', 'l1', { id: 'w11' }), W_('o0', 'l0', { id: 'w12' }),
    { id: 'RL', type: 'R', a: 'l1', b: 'l0', value: RL, name: 'Load', valText: `${RL} Ω`, side: 1 }];
  return { mode: 'ac', w: 1, ground: 's0', nodes, parts }; };

global.CH10C = CH10C;
})(window);
