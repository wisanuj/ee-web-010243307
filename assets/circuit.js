/* circuit.js — the circuit engine behind every animated page.
   1) A solver (modified nodal analysis, MNA) for DC, AC phasors and time-stepped transients.
      Wires, closed switches and ammeters are "shorts": their nodes are merged into one net first,
      the reduced circuit is solved exactly, then the current in every wire is recovered from KCL
      inside the net (Laplacian solve), so the dots on every wire obey KCL exactly.
   2) A canvas renderer that draws the schematic and animates the current as moving dots whose
      speed is proportional to the current (conventional current or electron flow).

   Part types (a, b are node names; drawing goes from a to b):
     W   wire (optional pts:[[x,y],...] corner points)        R   resistor   value Ω
     lamp  resistor drawn as a lamp, glows with power         S   switch     closed:true/false (click to toggle)
     A   ammeter (a short with a meter face)                  VM  voltmeter (open; shows Va − Vb)
     V   DC voltage source, + at a, value V, optional r (internal Ω)
     I   DC current source, pushes value A through itself from a to b (arrow a → b)
     VAC / IAC  sinusoidal sources: amp (peak), phase (deg); same polarity rules as V / I
     C   capacitor value F, optional v0     L   inductor value H, optional i0
     Z   fixed complex impedance {re, im} (AC only)            motor  DC motor: Ra (value) in series with back-emf `emf` (+ at a); `signs`, `angle`
     any part may set draw: 'box' | 'L' (a resistor drawn as a winding) | 'rheo' (rheostat)
     XF  ideal transformer: primary a–b, secondary c–d, n = N1/N2 (dots at a and c; put c below d for a dot at the lower end)
     dependent sources (diamond symbols), gain in `gain`:
       G  VCCS: pushes gain·(V_c − V_d) A through itself from a to b      E  VCVS: V_a − V_b = gain·(V_c − V_d)
       F  CCCS: pushes gain·I(ctrl) A from a to b                          H  CCVS: V_a − V_b = gain·I(ctrl)
       ctrl = id of a V/VAC/E/H/motor part (current from its a to b) or of a resistor
     any part may set draw: 'box' to be drawn as a plain rectangle (an "unknown element" as in Hayt's figures)
     O   open gap (no current): a source that has been switched off for superposition / Thevenin (chapter 5)
   Sign convention for results: I[id] is the current through the part from a to b. */
(function (global) {
'use strict';
const CK = {};

/* ---------------- numbers ---------------- */
const NUM = global.NUM || {};
NUM.fmt = (x, d = 3) => { if (x === null || x === undefined || Number.isNaN(x)) return '—'; if (!isFinite(x)) return x > 0 ? '∞' : '−∞';
  const s = Math.abs(x) < 1e-12 ? (0).toFixed(d) : (Math.abs(x) >= 1e5 || Math.abs(x) < 1e-3 ? x.toExponential(d - 1) : x.toFixed(d)); return s.replace('-', '−'); };
NUM.clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
global.NUM = NUM;
/* engineering format: CK.eng(0.0024,'A') → "2.40 mA" */
CK.eng = (x, unit = '', sig = 3) => {
  if (x === null || x === undefined || Number.isNaN(x)) return '—'; if (!isFinite(x)) return (x > 0 ? '∞' : '−∞') + ' ' + unit;
  const a = Math.abs(x); if (a < 1e-12) return '0 ' + unit;
  const pre = [[1e9, 'G'], [1e6, 'M'], [1e3, 'k'], [1, ''], [1e-3, 'm'], [1e-6, 'µ'], [1e-9, 'n'], [1e-12, 'p']];
  let p = pre.find(q => a >= q[0] * 0.9995) || pre[pre.length - 1];
  const v = x / p[0]; const d = Math.max(0, sig - 1 - Math.floor(Math.log10(Math.abs(v) + 1e-15)));
  let t = v.toFixed(Math.min(d, 4)); if (t.includes('.')) t = t.replace(/0+$/, '').replace(/\.$/, '');
  return t.replace('-', '−') + ' ' + p[1] + unit;
};

/* ---------------- complex numbers ---------------- */
const cx = (re, im = 0) => ({ re, im });
const Cx = {
  c: cx, add: (a, b) => cx(a.re + b.re, a.im + b.im), sub: (a, b) => cx(a.re - b.re, a.im - b.im),
  mul: (a, b) => cx(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re),
  div: (a, b) => { const d = b.re * b.re + b.im * b.im; return cx((a.re * b.re + a.im * b.im) / d, (a.im * b.re - a.re * b.im) / d); },
  scale: (a, k) => cx(a.re * k, a.im * k), conj: a => cx(a.re, -a.im), neg: a => cx(-a.re, -a.im),
  abs: a => Math.hypot(a.re, a.im), arg: a => Math.atan2(a.im, a.re), polar: (r, th) => cx(r * Math.cos(th), r * Math.sin(th)),
  inv: a => { const d = a.re * a.re + a.im * a.im; return cx(a.re / d, -a.im / d); },
  /* value at time t of the phasor P rotating at w: Re(P e^{jwt}) */
  inst: (P, w, t) => P.re * Math.cos(w * t) - P.im * Math.sin(w * t),
  fmt: (a, d = 3) => `${NUM.fmt(a.re, d)} ${a.im < 0 ? '−' : '+'} j${NUM.fmt(Math.abs(a.im), d)}`,
  fmtPolar: (a, d = 3, unit = '') => `${NUM.fmt(Math.hypot(a.re, a.im), d)}${unit ? ' ' + unit : ''} ∠ ${NUM.fmt(Math.atan2(a.im, a.re) * 180 / Math.PI, 1)}°`,
  /* "4.255 + j4.929" with trailing zeros trimmed */
  fmtRect: (a, d = 3) => { const f = x => { let s = (Math.abs(x) < 0.5 * Math.pow(10, -d) ? 0 : x).toFixed(d); if (s.includes('.')) s = s.replace(/0+$/, '').replace(/\.$/, ''); return s.replace('-', '−'); };
    return `${f(a.re)} ${a.im < 0 ? '−' : '+'} j${f(Math.abs(a.im))}`; }
};
CK.Cx = Cx;

/* dense complex linear solve A x = b (A as re/im arrays), partial pivoting; returns null if singular */
function csolve(Ar, Ai, br, bi) {
  const n = br.length;
  for (let k = 0; k < n; k++) {
    let p = k, best = -1;
    for (let i = k; i < n; i++) { const m = Ar[i][k] * Ar[i][k] + Ai[i][k] * Ai[i][k]; if (m > best) { best = m; p = i; } }
    if (best < 1e-30) return null;
    if (p !== k) { [Ar[p], Ar[k]] = [Ar[k], Ar[p]]; [Ai[p], Ai[k]] = [Ai[k], Ai[p]]; [br[p], br[k]] = [br[k], br[p]]; [bi[p], bi[k]] = [bi[k], bi[p]]; }
    const pr = Ar[k][k], pi = Ai[k][k], pd = pr * pr + pi * pi;
    for (let i = k + 1; i < n; i++) {
      const xr = Ar[i][k], xi = Ai[i][k]; if (xr === 0 && xi === 0) continue;
      const fr = (xr * pr + xi * pi) / pd, fi = (xi * pr - xr * pi) / pd;
      for (let j = k; j < n; j++) { const ar = Ar[k][j], ai = Ai[k][j]; Ar[i][j] -= fr * ar - fi * ai; Ai[i][j] -= fr * ai + fi * ar; }
      br[i] -= fr * br[k] - fi * bi[k]; bi[i] -= fr * bi[k] + fi * br[k];
    }
  }
  const xr = new Array(n).fill(0), xi = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let sr = br[i], si = bi[i];
    for (let j = i + 1; j < n; j++) { sr -= Ar[i][j] * xr[j] - Ai[i][j] * xi[j]; si -= Ar[i][j] * xi[j] + Ai[i][j] * xr[j]; }
    const pr = Ar[i][i], pi = Ai[i][i], pd = pr * pr + pi * pi; xr[i] = (sr * pr + si * pi) / pd; xi[i] = (si * pr - sr * pi) / pd;
  }
  return { re: xr, im: xi };
}
CK.csolve = csolve;

const SHORT_ALWAYS = { W: 1, A: 1 };
const GMIN = 1e-12;

/* ---------------- the circuit ---------------- */
class Circuit {
  constructor(spec) {
    this.nodes = spec.nodes;                      // name -> [x, y] in grid units
    this.ground = spec.ground || Object.keys(spec.nodes)[0];
    this.parts = spec.parts.map((p, i) => ({ ...p, id: p.id || (p.type + '_' + i) }));
    this.byId = {}; this.parts.forEach(p => { this.byId[p.id] = p; });
    this.mode = spec.mode || 'dc';                // 'dc' | 'ac' | 'tran'
    this.w = spec.w || 2 * Math.PI * 50;          // AC angular frequency (rad/s)
    this.t = 0; this.result = null;
    this.parts.forEach(p => { if (p.type === 'C') p.vc = p.v0 || 0; if (p.type === 'L') p.il = p.i0 || 0; });
  }
  part(id) { return this.byId[id]; }
  set(id, key, val) { const p = this.byId[id]; if (p) p[key] = val; return this; }
  isShort(p) {
    if (SHORT_ALWAYS[p.type]) return true;
    if (p.type === 'S') return !!p.closed;
    if (p.type === 'L' && this.mode === 'dc') return true;
    return false;
  }
  /* solve: mode 'dc', 'ac' (phasors at this.w) or one transient step of length dt ('tran') */
  solve(dt) {
    const mode = this.mode, parts = this.parts, names = Object.keys(this.nodes);
    // ---- 1. merge shorted nodes into nets (union-find) ----
    const parent = {}; names.forEach(n => { parent[n] = n; });
    const find = n => { while (parent[n] !== n) { parent[n] = parent[parent[n]]; n = parent[n]; } return n; };
    const shorts = [], others = [];
    for (const p of parts) { if (!(p.a in parent) || !(p.b in parent)) throw new Error('unknown node in ' + p.id);
      if (this.isShort(p)) { shorts.push(p); const ra = find(p.a), rb = find(p.b); if (ra !== rb) parent[ra] = rb; } else others.push(p); }
    const gRoot = find(this.ground); const netOf = {}; let nNet = 0; const netIdx = { [gRoot]: -1 };
    for (const n of names) { const r = find(n); if (!(r in netIdx)) netIdx[r] = nNet++; netOf[n] = netIdx[r]; }
    // ---- 2. build MNA over nets ----
    const extra = []; // parts needing a branch-current unknown
    for (const p of others) {
      if (p.type === 'V' || p.type === 'VAC' || p.type === 'motor' || p.type === 'E' || p.type === 'H') extra.push(p);
      if (p.type === 'XF') extra.push(p);
      if (p.type === 'C' && mode === 'dc') { /* open */ }
    }
    const xIdx = {}; extra.forEach((p, k) => { xIdx[p.id] = nNet + k; });
    const N = nNet + extra.length; const Ar = [], Ai = [], br = new Array(N).fill(0), bi = new Array(N).fill(0);
    for (let i = 0; i < N; i++) { Ar.push(new Array(N).fill(0)); Ai.push(new Array(N).fill(0)); }
    for (let i = 0; i < nNet; i++) Ar[i][i] += GMIN;
    const w = mode === 'ac' ? this.w : 0;
    const stampY = (na, nb, yr, yi) => { // admittance between nets na, nb (−1 = ground)
      if (na >= 0) { Ar[na][na] += yr; Ai[na][na] += yi; } if (nb >= 0) { Ar[nb][nb] += yr; Ai[nb][nb] += yi; }
      if (na >= 0 && nb >= 0) { Ar[na][nb] -= yr; Ai[na][nb] -= yi; Ar[nb][na] -= yr; Ai[nb][na] -= yi; } };
    const stampI = (na, nb, ir, ii) => { // current ir+j ii flowing from net na through the element to net nb (leaves na, enters nb)
      if (na >= 0) { br[na] -= ir; bi[na] -= ii; } if (nb >= 0) { br[nb] += ir; bi[nb] += ii; } };
    const t = this.t + (mode === 'tran' ? dt : 0);
    const val = p => (typeof p.fn === 'function') ? p.fn(t) : p.value;
    let error = null;
    others.forEach(p => {
      const na = netOf[p.a], nb = netOf[p.b];
      switch (p.type) {
        case 'R': case 'lamp': { const g = 1 / Math.max(val(p), 1e-9); stampY(na, nb, g, 0); break; }
        case 'S': case 'VM': stampY(na, nb, GMIN, 0); break; // open switch / ideal voltmeter
        case 'I': case 'IAC': {
          if (mode === 'ac' && p.type === 'IAC') { const P = Cx.polar(p.amp, (p.phase || 0) * Math.PI / 180); stampI(na, nb, P.re, P.im); }
          else if (mode === 'ac') { /* DC source is zero at w > 0 */ }
          else if (p.type === 'IAC') { stampI(na, nb, p.amp * Math.cos(this.w * t + (p.phase || 0) * Math.PI / 180), 0); }
          else stampI(na, nb, val(p), 0);
          break; }
        case 'C': {
          if (mode === 'ac') stampY(na, nb, 0, w * p.value);
          else if (mode === 'tran') { const g = p.value / dt; stampY(na, nb, g, 0); stampI(na, nb, -g * p.vc, 0); }
          else stampY(na, nb, GMIN, 0);
          break; }
        case 'L': {
          if (mode === 'ac') stampY(na, nb, 0, -1 / (w * p.value));
          else if (mode === 'tran') { const g = dt / p.value; stampY(na, nb, g, 0); stampI(na, nb, p.il, 0); }
          break; }
        case 'Z': { if (mode === 'ac') { const y = Cx.inv(p.value); stampY(na, nb, y.re, y.im); } else stampY(na, nb, 1 / Math.max(p.value.re, 1e-9), 0); break; }
      }
    });
    extra.forEach((p, k) => {
      const r = nNet + k;
      if (p.type === 'XF') {
        // v_ab = n v_cd ; i_c(into dot c, out of the secondary) = -n i_a.  Unknown: primary current i1 (into a).
        const na = netOf[p.a], nb = netOf[p.b], nc = netOf[p.c], nd = netOf[p.d], n = p.n;
        if (na >= 0) Ar[na][r] += 1; if (nb >= 0) Ar[nb][r] -= 1;            // i1 leaves node a into the winding
        if (nc >= 0) Ar[nc][r] -= n; if (nd >= 0) Ar[nd][r] += n;            // secondary current n*i1 leaves winding at c
        if (na >= 0) Ar[r][na] += 1; if (nb >= 0) Ar[r][nb] -= 1; if (nc >= 0) Ar[r][nc] -= n; if (nd >= 0) Ar[r][nd] += n;
        return; }
      const na = netOf[p.a], nb = netOf[p.b];
      // branch current x flows through the source from a to b (a is +) : node a loses x, node b gains x
      if (na >= 0) Ar[na][r] += 1; if (nb >= 0) Ar[nb][r] -= 1;
      if (na >= 0) Ar[r][na] += 1; if (nb >= 0) Ar[r][nb] -= 1;
      const rs = p.type === 'motor' ? p.value : (p.r || 0); Ar[r][r] -= rs;
      if (na === nb && rs === 0) { error = 'short'; Ar[r][r] -= 1e-3; } // shorted source: solve with 1 mΩ so the huge current shows
      if (p.type === 'E' || p.type === 'H') { // row r already holds V_a − V_b; subtract the controlling quantity
        if (p.type === 'E') { const nc = netOf[p.c], nd = netOf[p.d]; if (nc >= 0) Ar[r][nc] -= p.gain; if (nd >= 0) Ar[r][nd] += p.gain; }
        else { const cp = this.byId[p.ctrl]; if (cp && xIdx[cp.id] !== undefined) Ar[r][xIdx[cp.id]] -= p.gain;
          else if (cp && cp.type === 'R') { const nc = netOf[cp.a], nd = netOf[cp.b], g = p.gain / Math.max(val(cp), 1e-9); if (nc >= 0) Ar[r][nc] -= g; if (nd >= 0) Ar[r][nd] += g; } }
        return; }
      if (p.type === 'V') { if (mode !== 'ac') br[r] = val(p); }
      else if (p.type === 'motor') { if (mode !== 'ac') br[r] = p.emf || 0; }
      else if (p.type === 'VAC') { const ph = (p.phase || 0) * Math.PI / 180;
        if (mode === 'ac') { br[r] = p.amp * Math.cos(ph); bi[r] = p.amp * Math.sin(ph); } else br[r] = p.amp * Math.cos(this.w * t + ph); }
    });
    // dependent current sources: current gain·(control) leaves node a and enters node b
    const ctrlOf = p => { // returns {kind:'v', nc, nd, g} or {kind:'x', idx, g}
      if (p.type === 'G') return { kind: 'v', nc: netOf[p.c], nd: netOf[p.d], g: p.gain };
      const cp = this.byId[p.ctrl]; if (!cp) return null;
      if (xIdx[cp.id] !== undefined) return { kind: 'x', idx: xIdx[cp.id], g: p.gain };
      if (cp.type === 'R') return { kind: 'v', nc: netOf[cp.a], nd: netOf[cp.b], g: p.gain / Math.max(val(cp), 1e-9) };
      return null; };
    others.forEach(p => { if (p.type !== 'G' && p.type !== 'F') return; const na = netOf[p.a], nb = netOf[p.b]; const c = ctrlOf(p); if (!c) return;
      if (c.kind === 'v') { if (na >= 0) { if (c.nc >= 0) Ar[na][c.nc] += c.g; if (c.nd >= 0) Ar[na][c.nd] -= c.g; } if (nb >= 0) { if (c.nc >= 0) Ar[nb][c.nc] -= c.g; if (c.nd >= 0) Ar[nb][c.nd] += c.g; } }
      else { if (na >= 0) Ar[na][c.idx] += c.g; if (nb >= 0) Ar[nb][c.idx] -= c.g; } });
    const sol = N ? csolve(Ar, Ai, br, bi) : { re: [], im: [] };
    if (!sol) { this.result = { error: 'singular', V: {}, I: {} }; return this.result; }
    const Vnet = i => i < 0 ? cx(0) : cx(sol.re[i], sol.im[i]);
    const V = {}; names.forEach(n => { V[n] = Vnet(netOf[n]); });
    // ---- 3. element currents (a -> b) ----
    const I = {};
    others.forEach(p => {
      const vab = Cx.sub(V[p.a], V[p.b]);
      switch (p.type) {
        case 'R': case 'lamp': I[p.id] = Cx.scale(vab, 1 / Math.max(val(p), 1e-9)); break;
        case 'S': case 'VM': I[p.id] = Cx.scale(vab, GMIN); break;
        case 'I': I[p.id] = mode === 'ac' ? cx(0) : cx(val(p)); break;
        case 'IAC': I[p.id] = mode === 'ac' ? Cx.polar(p.amp, (p.phase || 0) * Math.PI / 180) : cx(p.amp * Math.cos(this.w * t + (p.phase || 0) * Math.PI / 180)); break;
        case 'C': I[p.id] = mode === 'ac' ? Cx.mul(vab, cx(0, w * p.value)) : mode === 'tran' ? cx(p.value / dt * (vab.re - p.vc)) : cx(0); break;
        case 'L': I[p.id] = mode === 'ac' ? Cx.mul(vab, cx(0, -1 / (w * p.value))) : cx(p.il + dt / p.value * vab.re); break;
        case 'Z': I[p.id] = mode === 'ac' ? Cx.div(vab, p.value) : cx(vab.re / Math.max(p.value.re, 1e-9)); break;
      }
    });
    extra.forEach((p, k) => { const x = cx(sol.re[nNet + k], sol.im[nNet + k]);
      if (p.type === 'XF') { I[p.id] = x; I[p.id + ':2'] = Cx.scale(x, -p.n); } else I[p.id] = x; });
    others.forEach(p => { if (p.type !== 'G' && p.type !== 'F') return; const c = ctrlOf(p); if (!c) { I[p.id] = cx(0); return; }
      if (c.kind === 'v') { const vc = c.nc < 0 ? cx(0) : cx(sol.re[c.nc], sol.im[c.nc]), vd = c.nd < 0 ? cx(0) : cx(sol.re[c.nd], sol.im[c.nd]); I[p.id] = Cx.scale(Cx.sub(vc, vd), c.g); }
      else I[p.id] = Cx.scale(cx(sol.re[c.idx], sol.im[c.idx]), c.g); });
    // ---- 4. currents in the shorts, from KCL inside each net ----
    const inj = {}; names.forEach(n => { inj[n] = cx(0); });
    const addInj = (n, z) => { inj[n] = Cx.add(inj[n], z); };
    others.forEach(p => { const i = I[p.id]; if (!i) return;
      if (p.type === 'XF') { addInj(p.a, Cx.neg(i)); addInj(p.b, i); const i2 = I[p.id + ':2']; addInj(p.c, Cx.neg(i2)); addInj(p.d, i2); }
      else { addInj(p.a, Cx.neg(i)); addInj(p.b, i); } });
    // in our convention a current I through an element from a to b leaves node a. inj[n] = net current arriving at n from elements,
    // which the shorts must carry away from n.
    const groups = {}; shorts.forEach(p => { const r = find(p.a); (groups[r] = groups[r] || []).push(p); });
    for (const r in groups) {
      const ws = groups[r]; const loc = {}; let m = 0; ws.forEach(p => { [p.a, p.b].forEach(n => { if (!(n in loc)) loc[n] = m++; }); });
      const nodesL = Object.keys(loc);
      if (m < 2) { ws.forEach(p => { I[p.id] = cx(0); }); continue; }
      const K = m - 1; const Lr = [], Li = []; const bR = new Array(K).fill(0), bI = new Array(K).fill(0);
      for (let i = 0; i < K; i++) { Lr.push(new Array(K).fill(0)); Li.push(new Array(K).fill(0)); }
      ws.forEach(p => { const i = loc[p.a], j = loc[p.b]; if (i === j) return;
        if (i < K) Lr[i][i] += 1; if (j < K) Lr[j][j] += 1; if (i < K && j < K) { Lr[i][j] -= 1; Lr[j][i] -= 1; } });
      for (let i = 0; i < K; i++) { const z = inj[nodesL[i]]; bR[i] = z.re; bI[i] = z.im; Lr[i][i] += 1e-12; }
      const s = csolve(Lr, Li, bR, bI); const phi = i => (i >= K || !s) ? cx(0) : cx(s.re[i], s.im[i]);
      ws.forEach(p => { I[p.id] = Cx.sub(phi(loc[p.a]), phi(loc[p.b])); });
    }
    this.result = { V, I, error, t, netOf, mode };
    return this.result;
  }
  /* advance a transient by dt: solve, then update capacitor voltages / inductor currents */
  step(dt) {
    const r = this.solve(dt); if (r.error === 'singular') return r;
    this.parts.forEach(p => {
      if (p.type === 'C') p.vc = r.V[p.a].re - r.V[p.b].re;
      if (p.type === 'L') p.il = r.I[p.id] ? r.I[p.id].re : p.il;
    });
    this.t += dt; return r;
  }
  /* readouts of the last result. In AC mode these are phasors {re, im}; in DC/tran use .re */
  V(n) { return this.result ? this.result.V[n] : cx(0); }
  Vab(id) { const p = this.byId[id]; return Cx.sub(this.V(p.a), this.V(p.b)); }
  I(id) { return (this.result && this.result.I[id]) || cx(0); }
  /* power absorbed by the part (DC/tran: instantaneous; AC: average, phasors are peak) */
  P(id) { const v = this.Vab(id), i = this.I(id); return this.mode === 'ac' ? 0.5 * (v.re * i.re + v.im * i.im) : v.re * i.re; }
  /* complex power absorbed by the part, S = P + jQ (chapter 8): AC ½·V·I* with the engine's peak phasors (= V_rms·I_rms*); DC/tran V·I */
  S(id) { const v = this.Vab(id), i = this.I(id); return this.mode === 'ac' ? cx(0.5 * (v.re * i.re + v.im * i.im), 0.5 * (v.im * i.re - v.re * i.im)) : cx(v.re * i.re, 0); }
}
CK.Circuit = Circuit;

/* ---------------- topology (chapter 3): nodes, elements, meshes, loops ----------------
   A node is every point joined by wire (wires, ammeters and closed switches merge points); every other part is an element.
   Open switches and voltmeters are not elements. An element whose two ends land on the same node is "shorted" (no current)
   and is left out of the counts, as the course does. Nodes are lettered A, B, C … in reading order (top row first, left to right). */
const isWireLike = p => p.type === 'W' || p.type === 'A' || (p.type === 'S' && !!p.closed);
const notElement = p => p.type === 'VM' || p.type === 'O' || (p.type === 'S' && !p.closed) || p.topo === false;
Circuit.prototype.topology = function (o = {}) {
  const names = Object.keys(this.nodes); const parent = {}; names.forEach(n => { parent[n] = n; });
  const find = n => { while (parent[n] !== n) { parent[n] = parent[parent[n]]; n = parent[n]; } return n; };
  this.parts.forEach(p => { if (isWireLike(p)) { const a = find(p.a), b = find(p.b); if (a !== b) parent[a] = b; } });
  const used = new Set(); this.parts.forEach(p => { if (!notElement(p)) { used.add(p.a); used.add(p.b); } });
  const groups = {}; names.filter(n => used.has(n)).forEach(n => { const r = find(n); (groups[r] = groups[r] || []).push(n); });
  const terminals = new Set(); this.parts.forEach(p => { if (!isWireLike(p) && !notElement(p)) { terminals.add(p.a); terminals.add(p.b); } });
  const nets = Object.values(groups).map(nodes => { const key = nodes.filter(n => terminals.has(n)); const pts = (key.length ? key : nodes).map(n => this.nodes[n]); const y = Math.min(...pts.map(q => q[1]));
    const x = Math.min(...pts.filter(q => Math.abs(q[1] - y) < 1e-9).map(q => q[0])); return { nodes, x, y }; });
  nets.sort((a, b) => (a.y - b.y) || (a.x - b.x));
  const netOf = {}; nets.forEach((net, k) => { net.k = k; net.label = (o.labels && o.labels[k]) || String.fromCharCode(65 + k); net.nodes.forEach(n => { netOf[n] = k; }); });
  const elements = [], shorted = [];
  this.parts.forEach(p => { if (isWireLike(p) || notElement(p)) return; const na = netOf[p.a], nb = netOf[p.b]; (na === nb ? shorted : elements).push({ part: p, na, nb }); });
  // connected components of the node graph
  const comp = nets.map((_, k) => k); const cf = k => { while (comp[k] !== k) k = comp[k] = comp[comp[k]]; return k; };
  elements.forEach(e => { const a = cf(e.na), b = cf(e.nb); if (a !== b) comp[a] = b; });
  const comps = new Set(nets.map((_, k) => cf(k))).size;
  const n = nets.length, b = elements.length;
  const loops = o.loops === false ? null : CK.cycles(n, elements.map((e, i) => ({ i, a: e.na, b: e.nb })));
  return { nets, netOf, elements, shorted, n, b, comps, meshes: b - n + comps, loops };
};
/* every simple cycle of an undirected multigraph (n vertices, edges {i, a, b}); each cycle once: {edges, verts} with verts[0] = verts[end] */
CK.cycles = (n, edges) => {
  const adj = Array.from({ length: n }, () => []); edges.forEach(e => { if (e.a !== e.b) { adj[e.a].push(e); adj[e.b].push(e); } });
  const seen = new Set(), out = [];
  for (let s = 0; s < n; s++) {
    const pathV = [s], pathE = [], onPath = new Set([s]);
    const dfs = v => {
      for (const e of adj[v]) {
        if (pathE.includes(e)) continue; const w = e.a === v ? e.b : e.a; if (w < s) continue;
        if (w === s) { const es = [...pathE, e]; const key = es.map(x => x.i).sort((p, q) => p - q).join(',');
          if (!seen.has(key)) { seen.add(key); out.push({ edges: es, verts: [...pathV, s] }); } continue; }
        if (onPath.has(w)) continue;
        onPath.add(w); pathV.push(w); pathE.push(e); dfs(w); pathE.pop(); pathV.pop(); onPath.delete(w);
      }
    };
    dfs(s);
  }
  out.sort((x, y) => x.edges.length - y.edges.length);
  return out;
};
/* shortest chain of wire-like parts from node `from` to node `to` (same node → []); returns [{part, from, to}] */
Circuit.prototype.wireRoute = function (from, to) {
  if (from === to) return [];
  const prev = { [from]: null }, q = [from];
  while (q.length) { const v = q.shift(); if (v === to) break;
    for (const p of this.parts) { if (!isWireLike(p)) continue; const w = p.a === v ? p.b : p.b === v ? p.a : null; if (w === null || w in prev) continue; prev[w] = { p, v }; q.push(w); } }
  if (!(to in prev)) return null;
  const segs = []; let v = to; while (prev[v]) { const { p, v: u } = prev[v]; segs.unshift({ part: p, from: u, to: v }); v = u; } return segs;
};
/* turn a cycle from topology().loops into an ordered walk [{part, from, to}] that also passes the connecting wires */
Circuit.prototype.loopWalk = function (loop, topo) {
  const segs = []; let cur = null, first = null;
  loop.edges.forEach((e, k) => { const el = topo.elements[e.i], p = el.part; const netFrom = loop.verts[k];
    const start = topo.netOf[p.a] === netFrom ? p.a : p.b, end = start === p.a ? p.b : p.a;
    if (cur !== null) segs.push(...(this.wireRoute(cur, start) || [])); else first = start;
    segs.push({ part: p, from: start, to: end }); cur = end; });
  segs.push(...(this.wireRoute(cur, first) || []));
  return segs;
};
/* an explicit walk through a list of node names; consecutive names must be joined by exactly one part */
Circuit.prototype.walkNodes = function (seq) {
  const segs = [];
  for (let k = 0; k + 1 < seq.length; k++) { const u = seq[k], v = seq[k + 1];
    const p = this.parts.find(q => (q.a === u && q.b === v) || (q.a === v && q.b === u)); if (!p) throw new Error(`no part between ${u} and ${v}`);
    segs.push({ part: p, from: u, to: v }); }
  return segs;
};

/* ---------------- dot flow along a polyline ---------------- */
class Flow {
  constructor(pts) { this.setPts(pts); this.phase = Math.random() * 18; }
  setPts(pts) { this.pts = pts; this.seg = []; let L = 0; for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); this.seg.push(l); L += l; } this.len = L; }
  at(s) { let i = 0; while (i < this.seg.length - 1 && s > this.seg[i]) { s -= this.seg[i]; i++; } const a = this.pts[i], b = this.pts[i + 1] || a, l = this.seg[i] || 1, f = Math.max(0, Math.min(1, s / l));
    return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]; }
  advance(v, dt) { this.phase += v * dt; }
  draw(ctx, o = {}) {
    if (this.len < 1) return; const sp = o.spacing || 18, r = o.r || 3.1; let ph = ((this.phase % sp) + sp) % sp;
    ctx.save(); ctx.fillStyle = o.color || '#ffd166'; if (o.glow) { ctx.shadowColor = o.color || '#ffd166'; ctx.shadowBlur = 6; }
    if (o.alpha !== undefined) ctx.globalAlpha = o.alpha;
    for (let s = ph; s < this.len; s += sp) { const [x, y] = this.at(s); ctx.beginPath(); ctx.arc(x, y, r, 0, 2 * Math.PI); ctx.fill(); }
    ctx.restore();
  }
}
CK.Flow = Flow;

/* ---------------- renderer ---------------- */
const PAL = { bg: '#0f1220', wire: '#8a93b8', ink: '#e8ecf7', muted: '#9aa3c7', grid: '#1b2038', conv: '#ffd166', elec: '#5ad1ff',
  sel: '#ff7eb6', good: '#7ee787', bad: '#ff6b6b', purple: '#c792ea', body: '#cfd6ec', lampOff: '#3a4160' };
CK.PAL = PAL;
const FONT = '"IBM Plex Mono", ui-monospace, Menlo, monospace', FONT_TH = '"IBM Plex Sans Thai", system-ui, sans-serif';
const SUB_RE = /_(\{[^}]*\}|[A-Za-z0-9]+)/, SUB_G = /_(\{[^}]*\}|[A-Za-z0-9]+)/g;

/* voltage → colour (blue low, grey middle, red high) */
CK.vColor = (f) => { f = Math.max(0, Math.min(1, f)); const lo = [70, 140, 255], mid = [150, 160, 190], hi = [255, 85, 85];
  const m = f < 0.5 ? lo.map((c, i) => c + (mid[i] - c) * f * 2) : mid.map((c, i) => c + (hi[i] - c) * (f - 0.5) * 2); return `rgb(${m.map(Math.round).join(',')})`; };

class View {
  /* canvas: <canvas>; ckt: Circuit; o: { aspect, flow:'conv'|'elec', speed (px/s per ampere), minV (slowest visible dot speed, px/s), showI, showV, potential, labels, onClick(part|node), box:{x,y,w,h},
     acTime (clock for AC dots), acPeak (AC readouts as peak phasors, as chapter 6 writes them, instead of rms),
     acPower (tooltips add P and Q of the part, chapter 8; 'P': P only), tip(part, circuit) → tooltip lines instead of V, I, P (chapter 10) } */
  constructor(canvas, ckt, o = {}) {
    this.canvas = canvas; this.ckt = ckt; this.o = Object.assign({ flow: 'conv', showI: true, showV: false, potential: false, labels: true, dots: true, aspect: 0.62, slow: 1 }, o);
    this.flows = {}; this.hover = null; this.sel = null; this.t = 0; this.tip = null;
    this.ctx = canvas.getContext('2d');
    canvas.addEventListener('mousemove', e => this.onMove(e)); canvas.addEventListener('mouseleave', () => { this.hover = null; });
    canvas.addEventListener('click', e => this.onClick(e));
  }
  /* grid → px transform for the given box (default: whole canvas) */
  fit(box) {
    this.box = box; const xs = [], ys = []; const N = this.ckt.nodes;
    Object.values(N).forEach(([x, y]) => { xs.push(x); ys.push(y); });
    this.ckt.parts.forEach(p => (p.pts || []).forEach(([x, y]) => { xs.push(x); ys.push(y); }));
    const pad = this.o.pad ?? 1.1; const x0 = Math.min(...xs) - pad, x1 = Math.max(...xs) + pad, y0 = Math.min(...ys) - pad, y1 = Math.max(...ys) + pad;
    const s = Math.min(box.w / (x1 - x0), box.h / (y1 - y0)); this.u = s;
    this.ox = box.x + (box.w - (x1 - x0) * s) / 2 - x0 * s; this.oy = box.y + (box.h - (y1 - y0) * s) / 2 - y0 * s;
    this.flows = {};
    this.ckt.parts.forEach(p => { const path = this.path(p); if (path) { const f = new Flow(path); this.flows[p.id] = f; }
      if (p.type === 'XF') this.flows[p.id + ':2'] = new Flow([this.P(p.c), this.P(p.d)]); });
  }
  P(n) { const [x, y] = Array.isArray(n) ? n : this.ckt.nodes[n]; return [this.ox + x * this.u, this.oy + y * this.u]; }
  path(p) {
    if (p.type === 'XF') return [this.P(p.a), this.P(p.b)];
    const pts = [this.P(p.a)]; (p.pts || []).forEach(q => pts.push(this.P(q))); pts.push(this.P(p.b)); return pts;
  }
  ampScale() { return this.o.speed ?? 60; }
  /* advance the animation by real time dt (s). For AC: instantaneous current at the view's clock. */
  advance(dt) {
    const c = this.ckt, r = c.result; if (!r) return; this.t += dt;
    const sc = this.ampScale() * (this.o.flow === 'elec' ? -1 : 1);
    for (const id in this.flows) {
      const i = this.instI(id); let v = sc * i; v = Math.max(-420, Math.min(420, v));
      if (this.o.minV && Math.abs(i) > 1e-9 && Math.abs(v) < this.o.minV) v = Math.sign(v) * this.o.minV; // tiny currents still crawl visibly
      this.flows[id].advance(v, dt);
    }
  }
  /* instantaneous current used for the animation */
  instI(id) { const c = this.ckt, z = (c.result && c.result.I[id]) || cx(0); return c.mode === 'ac' ? Cx.inst(z, c.w, this.acTime()) : z.re; }
  instV(n) { const c = this.ckt, z = (c.result && c.result.V[n]) || cx(0); return c.mode === 'ac' ? Cx.inst(z, c.w, this.acTime()) : z.re; }
  acTime() { return this.o.acTime ? this.o.acTime() : this.t; }
  acK() { return this.o.acPeak ? 1 : 1 / Math.SQRT2; } // AC readout factor: peak (chapter 6) or rms
  /* ---------- drawing ---------- */
  draw() {
    const ctx = this.ctx, c = this.ckt; const u = this.u;
    let vmin = Infinity, vmax = -Infinity;
    if (this.o.potential) { if (this.o.vRange) { [vmin, vmax] = this.o.vRange; } else Object.keys(c.nodes).forEach(n => { const v = c.mode === 'ac' ? Cx.abs(c.V(n)) : this.instV(n); vmin = Math.min(vmin, v); vmax = Math.max(vmax, v); });
      if (c.mode === 'ac' && !this.o.vRange) { vmin = -vmax; } if (vmax - vmin < 1e-9) { vmax = vmin + 1; } }
    const vcol = n => this.o.netColor ? this.o.netColor(n) : this.o.potential ? CK.vColor((this.instV(n) - vmin) / (vmax - vmin)) : PAL.wire;
    this.vmin = vmin; this.vmax = vmax;
    // glow under highlighted parts (loops, nodes, groups being combined)
    if (this.o.glow && this.o.glow.size) { const ctx = this.ctx; c.parts.forEach(p => { if (!this.o.glow.has(p.id)) return; const pts = this.path(p);
      ctx.save(); ctx.strokeStyle = this.o.glowColor || 'rgba(255,126,182,.45)'; ctx.lineWidth = Math.max(10, this.u * 0.32); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); pts.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.stroke(); ctx.restore(); }); }
    // wires & element leads
    c.parts.forEach(p => { if (!p.hidden) this.drawPart(p, vcol); });
    // junction dots
    const deg = {}; c.parts.forEach(p => { [p.a, p.b, p.c, p.d].forEach(n => { if (n) deg[n] = (deg[n] || 0) + 1; }); });
    for (const n in c.nodes) { if ((deg[n] || 0) >= 3) { const [x, y] = this.P(n); ctx.beginPath(); ctx.arc(x, y, Math.max(3, u * 0.07), 0, 2 * Math.PI); ctx.fillStyle = vcol(n); ctx.fill(); } }
    // ground symbol
    if (this.o.ground !== false) this.drawGround(c.ground);
    // node letters at every point of each node (the course labels all points joined by wire with the same letter)
    if (this.o.netLetters) { const T = this.o.netLetters; const ctx = this.ctx; const r = Math.max(9, this.u * 0.2);
      for (const n in c.nodes) { const k = T.netOf[n]; if (k === undefined) continue; if (this.o.letterNodes && !this.o.letterNodes.includes(n)) continue;
        const [x, y] = this.P(n); const col = this.o.netColor ? this.o.netColor(n) : PAL.purple;
        ctx.save(); ctx.fillStyle = '#0f1220'; ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x - r * 1.05, y - r * 1.05, r, 0, 2 * Math.PI); ctx.fill(); ctx.stroke(); ctx.restore();
        this.text(T.nets[k].label, x - r * 1.05, y - r * 1.05 + 0.5, { color: col, size: Math.max(12, r * 1.15), weight: '700' }); } }
    // node labels
    if (this.o.nodeLabels) for (const n in this.o.nodeLabels) { const [x, y] = this.P(n); const L = this.o.nodeLabels[n];
      const txt = typeof L === 'string' ? L : L.text; const dx = (L.dx ?? 0.25) * u, dy = (L.dy ?? -0.25) * u;
      this.text(txt, x + dx, y + dy, { color: L.color || PAL.purple, size: Math.max(11.5, u * 0.32), weight: '700' }); }
    // flowing dots
    if (this.o.dots) {
      const col = this.o.dotColor || (this.o.flow === 'elec' ? PAL.elec : PAL.conv);   // dotColor: flux dots of a magnetic circuit (chapter 10)
      const iref = Math.abs(this.o.dotRef || 0);
      for (const id in this.flows) {
        const p = c.byId[id.split(':')[0]]; if (!p || p.noDots) continue; if (p.type === 'VM') continue; if (p.type === 'S' && !p.closed) continue;
        const iv = Math.abs(c.mode === 'ac' ? Cx.abs(c.I(id)) : this.instI(id)); if (iv < (this.o.dotMin ?? 1e-6)) continue;
        const alpha = (iref ? Math.max(0.35, Math.min(1, iv / iref)) : 1) * (this.o.fade ?? 1); if (alpha <= 0.01) continue;
        this.flows[id].draw(ctx, { color: col, r: Math.max(2.4, u * 0.075), spacing: Math.max(14, u * 0.42), glow: true, alpha });
      }
    }
    // current labels
    if (this.o.showI) c.parts.forEach(p => { if (p.showI === false || (this.o.showI !== 'all' && !p.showI && (p.type === 'W' || p.type === 'S'))) return; if (p.type === 'VM') return; this.drawILabel(p); });
    // hover tooltip
    if (this.hover && this.o.tips !== false) this.drawTip(this.hover);
    if (c.result && c.result.error === 'short') this.banner(MCt('⚠ ลัดวงจร: แหล่งจ่ายแรงดันถูกต่อคร่อมด้วยลวด', '⚠ Short circuit: a voltage source is shorted by a wire'));
  }
  text(s, x, y, o = {}) { const ctx = this.ctx; s = String(s); const face = /[ก-๙]/.test(s) ? FONT_TH : FONT, size = o.size || 12;
    ctx.font = `${o.weight || ''} ${size}px ${face}`.trim(); ctx.fillStyle = o.color || PAL.ink;
    if (!SUB_RE.test(s)) { ctx.textAlign = o.align || 'center'; ctx.textBaseline = o.base || 'middle'; ctx.fillText(s, x, y); return; }
    // "R_L", "V_{th} = 2 V": the word after '_' is drawn as a subscript
    const segs = []; let last = 0; s.replace(SUB_G, (m, g, i) => { if (i > last) segs.push([s.slice(last, i), 0]); segs.push([g.replace(/[{}]/g, ''), 1]); last = i + m.length; return m; });
    if (last < s.length) segs.push([s.slice(last), 0]);
    const fnt = sub => `${o.weight || ''} ${sub ? size * 0.74 : size}px ${face}`.trim();
    let w = 0; segs.forEach(([t, sub]) => { ctx.font = fnt(sub); w += ctx.measureText(t).width; });
    let x0 = (o.align === 'left' || o.align === 'start') ? x : (o.align === 'right' || o.align === 'end') ? x - w : x - w / 2;
    ctx.textAlign = 'left'; ctx.textBaseline = o.base || 'middle';
    segs.forEach(([t, sub]) => { ctx.font = fnt(sub); ctx.fillText(t, x0, y + (sub ? size * 0.3 : 0)); x0 += ctx.measureText(t).width; }); }
  banner(s) { const ctx = this.ctx, b = this.box; ctx.save(); ctx.fillStyle = 'rgba(192,57,43,.9)'; ctx.fillRect(b.x + 8, b.y + 8, b.w - 16, 28); this.text(s, b.x + b.w / 2, b.y + 22, { color: '#fff', size: 14.5, weight: '600' }); ctx.restore(); }
  stroke(pts, color, w) { const ctx = this.ctx; ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); pts.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.stroke(); ctx.restore(); }
  drawGround(n) { if (!n) return; const ctx = this.ctx, u = this.u; const [x, y] = this.P(n); const g = this.o.groundAt ? this.P(this.o.groundAt) : [x, y];
    const s = u * 0.28; ctx.save(); ctx.strokeStyle = PAL.wire; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(g[0], g[1]); ctx.lineTo(g[0], g[1] + s);
    for (let k = 0; k < 3; k++) { const w = s * (1 - k * 0.32); ctx.moveTo(g[0] - w, g[1] + s + k * s * 0.33); ctx.lineTo(g[0] + w, g[1] + s + k * s * 0.33); } ctx.stroke(); ctx.restore(); }
  /* part geometry: leads + body centred between a and b */
  drawPart(p, vcol) {
    const ctx = this.ctx, u = this.u; const lw = Math.max(2, u * 0.055); const hi = this.hover === p || this.sel === p || p.highlight;
    if (p.type === 'W' || p.type === 'A') { const pts = this.path(p); const ca = vcol(p.a);
      this.stroke(pts, hi ? PAL.sel : ca, hi ? lw + 1.5 : lw);
      if (p.type === 'A') { const [x, y] = this.mid(pts); this.meterFace(x, y, 'A', CK.eng(this.ckt.mode === 'ac' ? Cx.abs(this.ckt.I(p.id)) * this.acK() : this.ckt.I(p.id).re, 'A'), hi); }
      return; }
    if (p.type === 'XF') { this.drawXF(p, vcol, hi); return; }
    const [ax, ay] = this.P(p.a), [bx, by] = this.P(p.b); const L = Math.hypot(bx - ax, by - ay); const ang = Math.atan2(by - ay, bx - ax);
    const body = Math.min(L * 0.7, u * (p.bodyLen || (p.type === 'R' ? 1.1 : p.type === 'L' ? 1.2 : 0.95)));
    const m1 = (L - body) / 2;
    const e1 = [ax + Math.cos(ang) * m1, ay + Math.sin(ang) * m1], e2 = [ax + Math.cos(ang) * (L - m1), ay + Math.sin(ang) * (L - m1)];
    this.stroke([[ax, ay], e1], hi ? PAL.sel : vcol(p.a), lw); this.stroke([e2, [bx, by]], hi ? PAL.sel : vcol(p.b), lw);
    ctx.save(); ctx.translate((ax + bx) / 2, (ay + by) / 2); ctx.rotate(ang);
    const col = hi ? PAL.sel : (p.color || PAL.body); const h = body / 2;
    ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const sym = this.symbols[p.draw || p.type]; if (sym) sym.call(this, ctx, p, h, u, lw, col);
    ctx.restore();
    if (this.o.labels && p.label !== false) this.drawLabel(p, ang, (ax + bx) / 2, (ay + by) / 2, h);
  }
  mid(pts) { // middle point along polyline
    let L = 0; const seg = []; for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(l); L += l; }
    let s = L / 2, i = 0; while (i < seg.length - 1 && s > seg[i]) { s -= seg[i]; i++; } const a = pts[i], b = pts[i + 1], f = seg[i] ? s / seg[i] : 0; return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]; }
  meterFace(x, y, letter, reading, hi) { const ctx = this.ctx, u = this.u, r = u * 0.3;
    ctx.save(); ctx.fillStyle = '#161a2f'; ctx.strokeStyle = hi ? PAL.sel : PAL.good; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, r, 0, 2 * Math.PI); ctx.fill(); ctx.stroke();
    this.text(letter, x, y + 1, { color: PAL.good, size: Math.max(11, u * 0.3), weight: '700' }); ctx.restore();
    if (reading) { const w = Math.max(64, reading.length * u * 0.15 + 12), hh = Math.max(18, u * 0.36); ctx.save(); ctx.fillStyle = 'rgba(10,14,28,.92)'; ctx.strokeStyle = PAL.good; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.rect(x - w / 2, y + r + 4, w, hh); ctx.fill(); ctx.stroke(); this.text(reading, x, y + r + 4 + hh / 2 + 1, { color: PAL.good, size: Math.max(11, u * 0.25), weight: '600' }); ctx.restore(); } }
  drawLabel(p, ang, cx_, cy_, h) {
    const u = this.u; const vertical = Math.abs(Math.sin(ang)) > 0.7; const side = p.side || 1; const off = (p.labelOff || 0.62) * u;
    let lx = cx_, ly = cy_, align = 'center';
    if (vertical) { lx = cx_ + side * off; align = side > 0 ? 'left' : 'right'; } else { ly = cy_ - side * off; }
    const name = p.name ?? p.id.replace(/_\d+$/, ''); const v = p.valText !== undefined ? (typeof p.valText === 'function' ? p.valText(p) : p.valText) : this.valueText(p);
    const sz = Math.max(11.5, u * 0.31);
    if (vertical) { this.text(name, lx, ly - sz * 0.62, { align, color: PAL.ink, size: sz, weight: '600' }); if (v) this.text(v, lx, ly + sz * 0.62, { align, color: PAL.muted, size: sz * 0.92 }); }
    else { const yy = side > 0 ? ly - sz * 0.6 : ly + sz * 0.6; this.text(v ? `${name}  ${v}` : name, lx, yy, { align, color: PAL.ink, size: sz, weight: '600' }); }
  }
  valueText(p) {
    switch (p.type) { case 'R': case 'lamp': return CK.eng(p.value, 'Ω'); case 'V': return CK.eng(p.value, 'V'); case 'I': return CK.eng(p.value, 'A');
      case 'C': return CK.eng(p.value, 'F'); case 'L': return CK.eng(p.value, 'H'); case 'VAC': return CK.eng(p.amp, 'V') + (p.phase ? ` ∠${p.phase}°` : '');
      case 'IAC': return CK.eng(p.amp, 'A') + (p.phase ? ` ∠${p.phase}°` : ''); case 'Z': return Cx.fmt(p.value, 1) + ' Ω'; case 'motor': return 'Ra ' + CK.eng(p.value, 'Ω');
      case 'G': return `${p.gain} v`; case 'F': return `${p.gain} i`; case 'E': return `${p.gain} v`; case 'H': return `${p.gain} i`;
      case 'VM': return CK.eng(this.ckt.mode === 'ac' ? Cx.abs(this.ckt.Vab(p.id)) * this.acK() : this.ckt.Vab(p.id).re, 'V'); default: return ''; }
  }
  drawILabel(p) {
    const c = this.ckt; const z = c.I(p.id); const mag = c.mode === 'ac' ? Cx.abs(z) : z.re; if (Math.abs(mag) < 1e-9 && !p.showI) return;
    const pts = this.path(p); const [mx, my] = this.mid(pts);
    const a = pts[0], b = pts[pts.length - 1]; let dx = b[0] - a[0], dy = b[1] - a[1];
    if (pts.length > 2) { const k = Math.floor((pts.length - 1) / 2); dx = pts[k + 1][0] - pts[k][0]; dy = pts[k + 1][1] - pts[k][1]; }
    const L = Math.hypot(dx, dy) || 1; dx /= L; dy /= L; let sgn = (c.mode === 'ac' ? 1 : Math.sign(mag)) || 1; if (this.o.flow === 'elec' && c.mode !== 'ac') sgn = -sgn;
    const u = this.u; const vertical = Math.abs(dy) > 0.7;
    // screen-space side: elements put the current label opposite to the name label; wires/switches use p.side directly
    const side = (p.type === 'W' || p.type === 'S') ? (p.side || 1) : -(p.side || 1);
    const nx = vertical ? side : 0, ny = vertical ? 0 : -side; const off = u * (p.iOff || 0.42);
    let px = mx + nx * off, py = my + ny * off;
    if (p.type !== 'W' && p.type !== 'S') { const f = u * 0.95 * (p.iAt ?? 1); px += dx * f; py += dy * f; }
    const al = u * 0.3; const ctx = this.ctx; const col = this.o.flow === 'elec' ? PAL.elec : PAL.conv;
    ctx.save(); ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 2;
    const x1 = px - dx * al * sgn, y1 = py - dy * al * sgn, x2 = px + dx * al * sgn, y2 = py + dy * al * sgn;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); const an = Math.atan2(y2 - y1, x2 - x1), hl = 7;
    ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x2 - hl * Math.cos(an - 0.45), y2 - hl * Math.sin(an - 0.45)); ctx.lineTo(x2 - hl * Math.cos(an + 0.45), y2 - hl * Math.sin(an + 0.45)); ctx.closePath(); ctx.fill(); ctx.restore();
    const val = c.mode === 'ac' ? (this.o.acPeak ? CK.eng(Cx.abs(z), 'A') + ' ∠ ' + NUM.fmt(Cx.arg(z) * 180 / Math.PI, 1) + '°' : CK.eng(Cx.abs(z) / Math.SQRT2, 'A') + ' rms') : CK.eng(Math.abs(mag), 'A');
    const txt = p.iText ? p.iText(val, mag) : (p.iName ? p.iName + ' = ' : '') + val; const sz = Math.max(11, u * 0.28);
    if (vertical) this.text(txt, px + nx * 6, py, { align: nx >= 0 ? 'left' : 'right', color: col, size: sz, weight: '600' });
    else this.text(txt, px, py + ny * u * 0.28, { color: col, size: sz, weight: '600' });
  }
  drawXF(p, vcol, hi) {
    const ctx = this.ctx, u = this.u, lw = Math.max(2, u * 0.055); const A = this.P(p.a), B = this.P(p.b), Cc = this.P(p.c), D = this.P(p.d);
    const col = hi ? PAL.sel : PAL.body; const turns = (x, ya, yb, dir, nT) => { const y0 = Math.min(ya, yb), h = Math.abs(yb - ya) / nT; if (h < 0.5) return; ctx.beginPath(); ctx.moveTo(x, y0);
      for (let k = 0; k < nT; k++) ctx.arc(x, y0 + h * (k + 0.5), h / 2, -Math.PI / 2, Math.PI / 2, dir < 0); ctx.stroke(); };
    ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = lw;
    const n1 = Math.round(NUM.clamp(4 * Math.sqrt(p.n), 2, 8)), n2 = Math.round(NUM.clamp(4 / Math.sqrt(p.n), 2, 8));
    turns(A[0], A[1], B[1], 1, n1); turns(Cc[0], Cc[1], D[1], -1, n2);
    const xm = (A[0] + Cc[0]) / 2; ctx.lineWidth = lw * 0.9; ctx.strokeStyle = PAL.muted;
    [-0.09, 0.09].forEach(d => { ctx.beginPath(); ctx.moveTo(xm + d * u, Math.min(A[1], Cc[1]) - 0.1 * u); ctx.lineTo(xm + d * u, Math.max(B[1], D[1]) + 0.1 * u); ctx.stroke(); });
    const s1 = Math.sign(B[1] - A[1]) || 1, s2 = Math.sign(D[1] - Cc[1]) || 1;   // the dot sits inside each winding, next to its dotted terminal (a, c)
    ctx.fillStyle = PAL.ink; [[A[0] + 0.32 * u, A[1] + 0.12 * u * s1], [Cc[0] - 0.32 * u, Cc[1] + 0.12 * u * s2]].forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, Math.max(2.5, u * 0.06), 0, 2 * Math.PI); ctx.fill(); });
    ctx.restore();
    this.text(p.name || `${p.n} : 1`, xm, Math.min(A[1], Cc[1]) - 0.35 * u, { color: PAL.ink, size: Math.max(11.5, u * 0.31), weight: '600' });
  }
  /* ---------- interaction ---------- */
  pick(x, y) {
    let best = null, bd = Math.max(9, this.u * 0.22);
    this.ckt.parts.forEach(p => { const pts = p.type === 'XF' ? [this.P(p.a), this.P(p.d)] : this.path(p);
      for (let i = 1; i < pts.length; i++) { const d = segDist(x, y, pts[i - 1], pts[i]); if (d < bd || (best && best.type === 'W' && p.type !== 'W' && d < bd + 4)) { bd = d; best = p; } } });
    return best;
  }
  pickNode(x, y) { let best = null, bd = Math.max(10, this.u * 0.2); for (const n in this.ckt.nodes) { const [px, py] = this.P(n); const d = Math.hypot(px - x, py - y); if (d < bd) { bd = d; best = n; } } return best; }
  pos(e) { const r = this.canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
  onMove(e) { const [x, y] = this.pos(e); this.hover = this.pick(x, y); this.canvas.style.cursor = this.hover && (this.hover.type === 'S' || this.o.onClick) ? 'pointer' : 'default'; this.mx = x; this.my = y; }
  onClick(e) { const [x, y] = this.pos(e); const n = this.pickNode(x, y); const p = this.pick(x, y);
    if (p && p.type === 'S' && !(n && this.o.nodeFirst)) { p.closed = !p.closed; if (this.o.onToggle) this.o.onToggle(p); return; }
    if (this.o.onClick) this.o.onClick(n && this.o.nodeFirst ? { node: n } : p ? { part: p } : n ? { node: n } : null); }
  drawTip(p) {
    if (p.type === 'W' && !this.o.wireTips) return; const c = this.ckt, ac = c.mode === 'ac';
    if (this.o.tip) { const L = this.o.tip(p, c); if (L && L.length) this.tipBox(L); return; }   // o.tip(part, circuit) → lines (first line = title)
    const v = c.Vab(p.id), i = c.I(p.id); const lines = [];
    const name = p.name ?? p.id.replace(/_\d+$/, '');
    lines.push(name + (p.type === 'S' ? (p.closed ? MCt('  (ปิดวงจร: คลิกเพื่อเปิด)', '  (closed: click to open)') : MCt('  (เปิดวงจร: คลิกเพื่อปิด)', '  (open: click to close)')) : ''));
    /* acPower (chapter 8): average and reactive power of the part; a source that sends power out says "delivers" */
    const pw = () => { const s = c.S(p.id), del = ['VAC', 'IAC'].includes(p.type) && s.re < -1e-12, z = del ? Cx.neg(s) : s;
      lines.push((del ? MCt('จ่าย: ', 'delivers: ') : MCt('ดูดกลืน: ', 'absorbs: ')) + `P = ${CK.eng(z.re, 'W')}` + (this.o.acPower === 'P' ? '' : `, Q = ${CK.eng(z.im, 'VAR')}`)); };
    const zl = () => { if (['R', 'L', 'C', 'Z', 'lamp'].includes(p.type) && Cx.abs(i) > 1e-12) lines.push('Z = V/I = ' + Cx.fmtRect(Cx.div(v, i)) + ' Ω'); };
    if (ac && this.o.acPeak) { lines.push('V = ' + Cx.fmtPolar(v, 3, 'V')); lines.push('I = ' + Cx.fmtPolar(i, 3, 'A')); zl();
      if (this.o.acPower && p.type !== 'W') pw();
      lines.push(MCt('(เฟเซอร์ค่ายอด อ้างอิงฟังก์ชันไซน์)', '(peak phasors, sine reference)')); }
    else if (ac) { lines.push('V = ' + Cx.fmtPolar(Cx.scale(v, 1 / Math.SQRT2), 3, 'V rms')); lines.push('I = ' + Cx.fmtPolar(Cx.scale(i, 1 / Math.SQRT2), 3, 'A rms'));
      if (this.o.acPower) { zl(); if (p.type !== 'W') pw(); } else if (p.type !== 'W') lines.push('P = ' + CK.eng(c.P(p.id), 'W')); }
    else { lines.push('V = ' + CK.eng(v.re, 'V')); lines.push('I = ' + CK.eng(i.re, 'A')); if (p.type !== 'W' && p.type !== 'S') { const P = c.P(p.id); lines.push((P >= 0 ? MCt('ดูดกลืน P = ', 'absorbs P = ') : MCt('จ่าย P = ', 'delivers P = ')) + CK.eng(Math.abs(P), 'W')); } }
    this.tipBox(lines);
  }
  tipBox(lines) {
    const ctx = this.ctx; ctx.save(); ctx.font = `13.5px ${FONT_TH}`; const w = Math.max(...lines.map(s => ctx.measureText(s).width)) + 18, h = lines.length * 19 + 10;
    let x = this.mx + 14, y = this.my + 14; if (x + w > this.box.x + this.box.w) x = this.mx - w - 10; if (y + h > this.box.y + this.box.h) y = this.my - h - 10;
    ctx.fillStyle = 'rgba(10,14,28,.94)'; ctx.strokeStyle = PAL.sel; ctx.lineWidth = 1; ctx.beginPath(); ctx.rect(x, y, w, h); ctx.fill(); ctx.stroke();
    lines.forEach((s, k) => this.text(s, x + 9, y + 14 + k * 19, { align: 'left', color: k ? PAL.ink : PAL.sel, size: 13.5, weight: k ? '' : '600' })); ctx.restore();
  }
}
function segDist(x, y, a, b) { const dx = b[0] - a[0], dy = b[1] - a[1]; const L2 = dx * dx + dy * dy || 1; let t = ((x - a[0]) * dx + (y - a[1]) * dy) / L2; t = Math.max(0, Math.min(1, t)); return Math.hypot(x - a[0] - t * dx, y - a[1] - t * dy); }
const MCt = (th, en) => (global.MC ? global.MC.t(th, en) : th);

/* element symbols, drawn in a local frame: x along a → b, body from −h to +h */
View.prototype.symbols = {
  R(ctx, p, h, u) { const z = u * 0.17, n = 6; ctx.beginPath(); ctx.moveTo(-h, 0); for (let k = 0; k < n; k++) ctx.lineTo(-h + (k + 0.5) * (2 * h / n), (k % 2 ? 1 : -1) * z); ctx.lineTo(h, 0); ctx.stroke(); },
  lamp(ctx, p, h, u, lw) { const r = Math.min(h, u * 0.36); const c = this.ckt; const P = Math.abs(c.mode === 'ac' ? c.P(p.id) : c.Vab(p.id).re * c.I(p.id).re); const f = NUM.clamp(P / (p.rated || 1), 0, 1.6);
    ctx.beginPath(); ctx.moveTo(-h, 0); ctx.lineTo(-r, 0); ctx.moveTo(r, 0); ctx.lineTo(h, 0); ctx.stroke();
    if (f > 0.01) { const g = ctx.createRadialGradient(0, 0, r * 0.2, 0, 0, r * (1.4 + 1.6 * f)); g.addColorStop(0, `rgba(255,225,120,${Math.min(0.95, 0.35 + 0.6 * f)})`); g.addColorStop(1, 'rgba(255,200,80,0)');
      ctx.save(); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r * (1.4 + 1.6 * f), 0, 2 * Math.PI); ctx.fill(); ctx.restore(); }
    ctx.save(); ctx.fillStyle = f > 0.01 ? `rgba(255,230,140,${Math.min(1, 0.25 + f * 0.7)})` : '#161a2f'; ctx.beginPath(); ctx.arc(0, 0, r, 0, 2 * Math.PI); ctx.fill(); ctx.stroke();
    const k = r * 0.7; ctx.beginPath(); ctx.moveTo(-k, -k); ctx.lineTo(k, k); ctx.moveTo(-k, k); ctx.lineTo(k, -k); ctx.stroke(); ctx.restore(); },
  S(ctx, p, h, u, lw) { const r = Math.max(2.5, u * 0.07); ctx.beginPath(); ctx.arc(-h, 0, r, 0, 2 * Math.PI); ctx.arc(h, 0, r, 0, 2 * Math.PI); ctx.fill();
    const a = p.closed ? 0 : -0.5; ctx.beginPath(); ctx.moveTo(-h, 0); ctx.lineTo(-h + 2 * h * Math.cos(a), 2 * h * Math.sin(a)); ctx.stroke(); },
  V(ctx, p, h, u) { const r = Math.min(h, u * 0.4); if (p.battery) { const g = u * 0.09; ctx.beginPath(); ctx.moveTo(-h, 0); ctx.lineTo(-g, 0); ctx.moveTo(g, 0); ctx.lineTo(h, 0);
      ctx.moveTo(-g, -u * 0.36); ctx.lineTo(-g, u * 0.36); ctx.stroke(); ctx.save(); ctx.lineWidth *= 1.8; ctx.beginPath(); ctx.moveTo(g, -u * 0.18); ctx.lineTo(g, u * 0.18); ctx.stroke(); ctx.restore();
      this.signs(ctx, -g - u * 0.18, g + u * 0.18, u); return; }
    ctx.beginPath(); ctx.moveTo(-h, 0); ctx.lineTo(-r, 0); ctx.moveTo(r, 0); ctx.lineTo(h, 0); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, r, 0, 2 * Math.PI); ctx.stroke(); this.signs(ctx, -r * 0.5, r * 0.5, u); },
  VAC(ctx, p, h, u) { const r = Math.min(h, u * 0.4); ctx.beginPath(); ctx.moveTo(-h, 0); ctx.lineTo(-r, 0); ctx.moveTo(r, 0); ctx.lineTo(h, 0); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, r, 0, 2 * Math.PI); ctx.stroke();
    ctx.save(); ctx.rotate(-Math.atan2(Math.sin(0), 1)); ctx.beginPath(); for (let k = 0; k <= 20; k++) { const s = -r * 0.55 + k / 20 * r * 1.1; const y = -Math.sin(k / 20 * 2 * Math.PI) * r * 0.3; k ? ctx.lineTo(y, s) : ctx.moveTo(y, s); } ctx.stroke(); ctx.restore();
    this.signs(ctx, -r * 1.35, r * 1.35, u, true); },
  I(ctx, p, h, u) { const r = Math.min(h, u * 0.4); ctx.beginPath(); ctx.moveTo(-h, 0); ctx.lineTo(-r, 0); ctx.moveTo(r, 0); ctx.lineTo(h, 0); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, r, 0, 2 * Math.PI); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-r * 0.6, 0); ctx.lineTo(r * 0.45, 0); ctx.stroke(); ctx.beginPath(); ctx.moveTo(r * 0.62, 0); ctx.lineTo(r * 0.2, -r * 0.3); ctx.lineTo(r * 0.2, r * 0.3); ctx.closePath(); ctx.fill(); },
  IAC(ctx, p, h, u, lw, col) { View.prototype.symbols.I.call(this, ctx, p, h, u, lw, col); },
  C(ctx, p, h, u) { const g = u * 0.1, s = u * 0.34; ctx.beginPath(); ctx.moveTo(-h, 0); ctx.lineTo(-g, 0); ctx.moveTo(g, 0); ctx.lineTo(h, 0); ctx.moveTo(-g, -s); ctx.lineTo(-g, s); ctx.moveTo(g, -s); ctx.lineTo(g, s); ctx.stroke();
    if (this.ckt.mode === 'tran' || p.showCharge) { const q = NUM.clamp((p.vc || 0) / (p.vmax || 10), -1, 1); ctx.save(); ctx.fillStyle = q >= 0 ? 'rgba(255,107,107,.75)' : 'rgba(90,209,255,.75)'; ctx.fillRect(-g - u * 0.07, -s * Math.abs(q), u * 0.06, 2 * s * Math.abs(q)); ctx.fillStyle = q >= 0 ? 'rgba(90,209,255,.75)' : 'rgba(255,107,107,.75)'; ctx.fillRect(g + u * 0.01, -s * Math.abs(q), u * 0.06, 2 * s * Math.abs(q)); ctx.restore(); } },
  L(ctx, p, h, u) { const n = 4, r = h / n; ctx.beginPath(); ctx.moveTo(-h, 0); for (let k = 0; k < n; k++) ctx.arc(-h + r * (2 * k + 1), 0, r, Math.PI, 0, false); ctx.stroke(); },
  Z(ctx, p, h, u) { const s = u * 0.2; ctx.beginPath(); ctx.rect(-h, -s, 2 * h, 2 * s); ctx.stroke(); },
  O(ctx, p, h, u) { const r = Math.max(2.6, u * 0.075), g = Math.min(h * 0.55, u * 0.32); ctx.beginPath(); ctx.moveTo(-h, 0); ctx.lineTo(-g, 0); ctx.moveTo(g, 0); ctx.lineTo(h, 0); ctx.stroke();
    ctx.save(); ctx.fillStyle = '#0f1220'; [-g, g].forEach(x => { ctx.beginPath(); ctx.arc(x, 0, r, 0, 2 * Math.PI); ctx.fill(); ctx.stroke(); }); ctx.restore(); },
  box(ctx, p, h, u) { const s = Math.min(h * 0.75, u * 0.34), w = Math.min(h, u * 0.42); ctx.beginPath(); ctx.moveTo(-h, 0); ctx.lineTo(-w, 0); ctx.moveTo(w, 0); ctx.lineTo(h, 0); ctx.stroke();
    ctx.save(); ctx.fillStyle = '#161a2f'; ctx.beginPath(); ctx.rect(-w, -s, 2 * w, 2 * s); ctx.fill(); ctx.stroke(); ctx.restore(); },
  G(ctx, p, h, u) { this.diamond(ctx, h, u, 'arrow'); }, F(ctx, p, h, u) { this.diamond(ctx, h, u, 'arrow'); },
  E(ctx, p, h, u) { this.diamond(ctx, h, u, 'pm'); }, H(ctx, p, h, u) { this.diamond(ctx, h, u, 'pm'); },
  VM(ctx, p, h, u) { ctx.beginPath(); ctx.moveTo(-h, 0); ctx.lineTo(-u * 0.3, 0); ctx.moveTo(u * 0.3, 0); ctx.lineTo(h, 0); ctx.stroke(); ctx.save(); ctx.rotate(-ctx.getTransform ? 0 : 0); ctx.restore();
    ctx.save(); ctx.fillStyle = '#161a2f'; ctx.strokeStyle = PAL.good; ctx.beginPath(); ctx.arc(0, 0, u * 0.3, 0, 2 * Math.PI); ctx.fill(); ctx.stroke(); ctx.restore(); },
  /* DC machine armature: back emf (+ at a, signs drawn when p.signs) with a rotor bar turned by p.angle (pages animate it) */
  motor(ctx, p, h, u) { const r = Math.min(h, u * 0.42); ctx.beginPath(); ctx.moveTo(-h, 0); ctx.lineTo(-r, 0); ctx.moveTo(r, 0); ctx.lineTo(h, 0); ctx.stroke(); ctx.save(); ctx.fillStyle = '#161a2f'; ctx.beginPath(); ctx.arc(0, 0, r, 0, 2 * Math.PI); ctx.fill(); ctx.stroke();
    const ang = p.angle || 0, k = p.signs ? 0.3 : 0.7; ctx.strokeStyle = PAL.purple; ctx.beginPath(); ctx.moveTo(Math.cos(ang) * r * k, Math.sin(ang) * r * k); ctx.lineTo(-Math.cos(ang) * r * k, -Math.sin(ang) * r * k); ctx.stroke(); ctx.restore();
    if (p.signs) this.signs(ctx, -r * 0.64, r * 0.64, u, true); },
  /* rheostat: a resistor with a diagonal arrow through it (field-circuit control resistance) */
  rheo(ctx, p, h, u) { View.prototype.symbols.R.call(this, ctx, p, h, u); const a = u * 0.3, hl = Math.max(6, u * 0.16), x1 = -h * 0.7, y1 = a, x2 = h * 0.7, y2 = -a, an = Math.atan2(y2 - y1, x2 - x1);
    ctx.save(); ctx.lineWidth = Math.max(1.5, ctx.lineWidth * 0.75); ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x2 - hl * Math.cos(an - 0.45), y2 - hl * Math.sin(an - 0.45)); ctx.lineTo(x2 - hl * Math.cos(an + 0.45), y2 - hl * Math.sin(an + 0.45)); ctx.closePath(); ctx.fill(); ctx.restore(); }
};
/* mesh-current ring: clockwise arc arrow centred at grid point (gx, gy) with radius rg (grid units).
   o: { label, value (text under the label), color, spin (phase in rad for moving beads, or null), dash, alpha } */
View.prototype.meshLoop = function (gx, gy, rg, o = {}) {
  const ctx = this.ctx, u = this.u; const [x, y] = this.P([gx, gy]); const r = rg * u; const col = o.color || PAL.purple;
  ctx.save(); ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = Math.max(1.6, u * 0.04); ctx.globalAlpha = o.alpha ?? 0.95;
  if (o.dash) ctx.setLineDash(o.dash);
  const a0 = -Math.PI * 0.62, a1 = a0 + Math.PI * 1.62; ctx.beginPath(); ctx.arc(x, y, r, a0, a1); ctx.stroke(); ctx.setLineDash([]);
  const ex = x + r * Math.cos(a1), ey = y + r * Math.sin(a1), tx = -Math.sin(a1), ty = Math.cos(a1), hl = Math.max(7, u * 0.18);
  ctx.beginPath(); ctx.moveTo(ex + tx * hl * 0.6, ey + ty * hl * 0.6); ctx.lineTo(ex - tx * hl * 0.5 + ty * hl * 0.5, ey - ty * hl * 0.5 - tx * hl * 0.5);
  ctx.lineTo(ex - tx * hl * 0.5 - ty * hl * 0.5, ey - ty * hl * 0.5 + tx * hl * 0.5); ctx.closePath(); ctx.fill();
  if (o.spin !== undefined && o.spin !== null) { const n = 6; for (let k = 0; k < n; k++) { const a = o.spin + k * 2 * Math.PI / n; ctx.beginPath(); ctx.arc(x + r * Math.cos(a), y + r * Math.sin(a), Math.max(2.6, u * 0.07), 0, 2 * Math.PI); ctx.fill(); } }
  ctx.restore();
  const sz = Math.max(12, u * 0.36);
  if (o.label) this.text(o.label, x, y - (o.value ? sz * 0.55 : 0), { color: col, size: sz, weight: '700' });
  if (o.value) this.text(o.value, x, y + sz * 0.6, { color: o.valueColor || col, size: sz * 0.82, weight: '600' });
};
/* polarity marks of a labelled voltage: '+' near the end at node `plus`, '−' near the other end, and a text label beside the part.
   side: 'L','R','U','D' (screen direction away from the part). o: {color, text, at (0..1 position of the text along the part), off} */
View.prototype.polarity = function (p, plus, o = {}) {
  const A = this.P(p.a), B = this.P(p.b); const u = this.u; const side = { L: [-1, 0], R: [1, 0], U: [0, -1], D: [0, 1] }[o.side || 'U'];
  const off = (o.off ?? 0.42) * u, col = o.color || '#5ad1ff', sz = Math.max(13, u * 0.34);
  const plusAtA = plus === p.a; const L = Math.hypot(B[0] - A[0], B[1] - A[1]); const body = Math.min(L * 0.7, u * 1.1); const f0 = 0.5 - body / L / 2 - 0.02, f1 = 0.5 + body / L / 2 + 0.02;
  const pt = f => [A[0] + (B[0] - A[0]) * f + side[0] * off, A[1] + (B[1] - A[1]) * f + side[1] * off];
  const [x0, y0] = pt(Math.max(0.08, f0)), [x1, y1] = pt(Math.min(0.92, f1));
  if (o.marks !== false) { this.text(plusAtA ? '+' : '−', x0, y0, { color: col, size: sz, weight: '700' }); this.text(plusAtA ? '−' : '+', x1, y1, { color: col, size: sz, weight: '700' }); }
  if (o.text) { const [tx, ty] = pt(o.at ?? 0.5); const far = (o.textOff ?? 0.45) * u; const X = tx + side[0] * far, Y = ty + side[1] * far;
    this.text(o.text, X, Y, { color: o.textColor || col, size: Math.max(12.5, u * 0.31), weight: '700', align: side[0] > 0 ? 'left' : side[0] < 0 ? 'right' : 'center' }); }
};
/* reference arrow of a labelled current (as written in a problem): beside part p, pointing from node `from` to the other end.
   o: {side 'L','R','U','D', off (grid units), color, at (0..1 along the part)} */
View.prototype.refArrow = function (p, from, text, o = {}) {
  const A = this.P(p.a), B = this.P(p.b), u = this.u; const side = { L: [-1, 0], R: [1, 0], U: [0, -1], D: [0, 1] }[o.side || 'R'];
  const sgn = from === p.a ? 1 : -1; const dx = B[0] - A[0], dy = B[1] - A[1], L = Math.hypot(dx, dy) || 1; const ux = dx / L * sgn, uy = dy / L * sgn;
  const f = o.at ?? 0.5, off = (o.off ?? 0.5) * u; const mx = A[0] + dx * f + side[0] * off, my = A[1] + dy * f + side[1] * off; const al = u * 0.3, col = o.color || '#c792ea';
  const x1 = mx - ux * al, y1 = my - uy * al, x2 = mx + ux * al, y2 = my + uy * al; const ctx = this.ctx;
  ctx.save(); ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  const an = Math.atan2(y2 - y1, x2 - x1), hl = Math.max(8, u * 0.2); ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x2 - hl * Math.cos(an - 0.45), y2 - hl * Math.sin(an - 0.45)); ctx.lineTo(x2 - hl * Math.cos(an + 0.45), y2 - hl * Math.sin(an + 0.45)); ctx.closePath(); ctx.fill(); ctx.restore();
  if (text) { const vertical = Math.abs(dy) > Math.abs(dx); const tx = vertical ? mx + side[0] * u * 0.18 + (side[0] === 0 ? u * 0.18 : 0) : mx, ty = vertical ? my : my + side[1] * u * 0.32 + (side[1] === 0 ? -u * 0.32 : 0);
    this.text(text, tx, ty, { color: col, size: Math.max(12.5, u * 0.31), weight: '700', align: vertical ? (side[0] < 0 ? 'right' : 'left') : 'center' }); }
};
/* diamond body for dependent sources: kind 'arrow' (current, a → b) or 'pm' (voltage, + at a) */
View.prototype.diamond = function (ctx, h, u, kind) {
  const r = Math.min(h, u * 0.42); ctx.beginPath(); ctx.moveTo(-h, 0); ctx.lineTo(-r, 0); ctx.moveTo(r, 0); ctx.lineTo(h, 0); ctx.stroke();
  ctx.save(); ctx.fillStyle = '#161a2f'; ctx.beginPath(); ctx.moveTo(-r, 0); ctx.lineTo(0, -r); ctx.lineTo(r, 0); ctx.lineTo(0, r); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
  if (kind === 'arrow') { ctx.beginPath(); ctx.moveTo(-r * 0.5, 0); ctx.lineTo(r * 0.3, 0); ctx.stroke(); ctx.beginPath(); ctx.moveTo(r * 0.5, 0); ctx.lineTo(r * 0.12, -r * 0.24); ctx.lineTo(r * 0.12, r * 0.24); ctx.closePath(); ctx.fill(); }
  else this.signs(ctx, -r * 0.45, r * 0.45, u, true);
};
/* +/− marks: at local x positions xp (plus) and xm (minus), drawn upright */
View.prototype.signs = function (ctx, xp, xm, u, small) {
  const s = u * (small ? 0.09 : 0.11); const m = ctx.getTransform(); const ang = Math.atan2(m.b, m.a);
  const draw = (x, plus) => { ctx.save(); ctx.translate(x, 0); ctx.rotate(-ang); ctx.lineWidth = Math.max(1.5, u * 0.04); ctx.beginPath(); ctx.moveTo(-s, 0); ctx.lineTo(s, 0); if (plus) { ctx.moveTo(0, -s); ctx.lineTo(0, s); } ctx.stroke(); ctx.restore(); };
  draw(xp, true); draw(xm, false);
};
CK.View = View;

/* status badge in the top-left corner of a canvas: kind 'ok' (green) or 'wait' (amber) */
CK.badge = (ctx, msg, kind = 'wait', x = 8, y = 6) => {
  const ok = kind === 'ok'; ctx.save(); ctx.font = `600 14.5px ${FONT_TH}`; const w = ctx.measureText(msg).width + 20;
  ctx.fillStyle = ok ? 'rgba(126,231,135,.16)' : 'rgba(255,209,102,.14)'; ctx.strokeStyle = ok ? '#7ee787' : '#ffd166'; ctx.lineWidth = 1;
  ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, 27, 6); else ctx.rect(x, y, w, 27); ctx.fill(); ctx.stroke();
  ctx.fillStyle = ok ? '#7ee787' : '#ffd166'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(msg, x + 10, y + 14); ctx.restore();
};
/* ---------------- canvas sizing + loop helpers ---------------- */
CK.setup = (canvas, w, h) => { const dpr = Math.min(window.devicePixelRatio || 1, 2.5); canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
  canvas.style.width = w + 'px'; canvas.style.height = h + 'px'; const ctx = canvas.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); return ctx; };
CK.fit = (canvas, aspect = 0.62, minW = 300) => { const w = Math.max(minW, Math.floor(canvas.parentElement.clientWidth - 12)); const h = Math.round(w * aspect); return { ctx: CK.setup(canvas, w, h), w, h }; };
/* requestAnimationFrame loop: fn(dt seconds). Returns {pause, resume, running} */
CK.loop = fn => { let last = null, run = true;
  const step = ts => { if (last === null) last = ts; const dt = Math.min(0.05, Math.max(0, (ts - last) / 1000)); last = ts; fn(run ? dt : 0, run); };
  const f = ts => { requestAnimationFrame(f); step(ts); };
  requestAnimationFrame(f);
  // a hidden page gets no animation frames: keep a slow timer so canvases still draw (first paint, printing, background tabs)
  const tick = () => { if (document.hidden) step(performance.now()); setTimeout(tick, 250); }; setTimeout(tick, 0);
  return { pause() { run = false; }, resume() { run = true; }, toggle() { run = !run; return run; }, get running() { return run; } }; };

global.CK = CK;
})(window);
