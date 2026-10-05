/* ch5.js — chapter 5 in the problem-by-problem format (rebuilt Oct 2026): superposition, Thévenin, Norton, source transformation,
   Δ–Y and maximum power transfer.
   1) CH5.exact(spec): exact DC solution in fractions (ALG.Frac): node voltages and part currents, so the pages can show 18/7 or 25/19
      and the tests can compare with the class answers. Wires merge nodes; an ammeter 'A' is a 0 V source (its current is an unknown);
      a floating group of nodes is pinned to 0 V.
   2) Circuit transforms: kill sources (V → short, I → open gap 'O'), add the load R_L between terminals A and B, a voltmeter or an
      ammeter at A–B, and the Thévenin / Norton equivalent circuits.
   3) Canvas overlays: ghost circles on killed sources, terminals A/B, the removed load, the "looking into AB" arrow, dead parts; and
      CH5.Panels, several small circuits on one canvas ("① + ② + ③ = all together").
   4) CH5.fit / CH5.step: display formulas that fit their column (a phone or a narrow column wraps instead of overflowing).
   5) One problem, one canvas, driven by LS.stepper through set(k) (lesson.js):
      CH5.SupProb  superposition: panels with one source left each, then the real circuit (page 5.1)
      CH5.TNProb   Thévenin / Norton: the class steps one stage at a time, ending with the load on the real circuit and on the
                   equivalent (pages 5.2–5.4; mode 'thev', 'nort' or 'both'; o.mp adds the maximum-power step)
      CH5.MPProb   maximum power: the real circuit with a load to slide beside its power curve (page 5.4)
      CH5.problem  wires one problem section of a page: canvas cv<n>, try-first box ask<n>, stepper st<n>, controls ctl<n>
   6) Demos with sliders: the equivalence demo with the terminal V–I line (page 5.2), source transformation (page 5.3), Δ–Y (page 5.2)
      and the lamp of maximum power (page 5.4). */
(function (global) {
'use strict';
const CH5 = {};
const F = ALG.F, FX = ANA.FX;
const tt = p => (p ? MC.t(p[0], p[1]) : '');
const AMBER = '#ffd166', PINK = '#ff7eb6', GREEN = '#7ee787', BLUE = '#5ad1ff', PURPLE = '#c792ea', ORANGE = '#ffa552', RED = '#ff6b6b';
CH5.COL = { AMBER, PINK, GREEN, BLUE, PURPLE, ORANGE, RED };

/* =====================================================================================================================
   exact DC solver */
CH5.exact = spec => {
  const ck = spec instanceof CK.Circuit ? spec : new CK.Circuit(spec);
  const names = Object.keys(ck.nodes), parts = ck.parts;
  const parent = {}; names.forEach(n => { parent[n] = n; });
  const find = n => { while (parent[n] !== n) { parent[n] = parent[parent[n]]; n = parent[n]; } return n; };
  parts.forEach(p => { if (p.type === 'W' || (p.type === 'S' && p.closed)) { const a = find(p.a), b = find(p.b); if (a !== b) parent[a] = b; } });
  const roots = [...new Set(names.map(find))], g = find(ck.ground);
  const adj = {}; roots.forEach(r => { adj[r] = []; });
  parts.forEach(p => { if (p.type !== 'R' && p.type !== 'V' && p.type !== 'A') return; const a = find(p.a), b = find(p.b); if (a !== b) { adj[a].push(b); adj[b].push(a); } });
  const seen = new Set(), pinned = new Set();
  const bfs = r0 => { const q = [r0]; seen.add(r0); while (q.length) { const v = q.shift(); adj[v].forEach(w => { if (!seen.has(w)) { seen.add(w); q.push(w); } }); } };
  pinned.add(g); bfs(g); roots.forEach(r => { if (!seen.has(r)) { pinned.add(r); bfs(r); } });
  const unk = roots.filter(r => !pinned.has(r)); const idx = {}; unk.forEach((r, i) => { idx[r] = i; });
  const vs = parts.filter(p => p.type === 'V' || p.type === 'A'); const N = unk.length + vs.length;
  const M = Array.from({ length: N }, () => new Array(N).fill(F(0))), b = new Array(N).fill(F(0));
  const ni = n => { const r = find(n); return r in idx ? idx[r] : -1; };
  parts.forEach(p => { const a = ni(p.a), c = ni(p.b);
    if (p.type === 'R') { const y = F(1).div(FX(p.value)); if (a >= 0) M[a][a] = M[a][a].add(y); if (c >= 0) M[c][c] = M[c][c].add(y); if (a >= 0 && c >= 0) { M[a][c] = M[a][c].sub(y); M[c][a] = M[c][a].sub(y); } }
    else if (p.type === 'I') { const I = FX(p.value); if (a >= 0) b[a] = b[a].sub(I); if (c >= 0) b[c] = b[c].add(I); } });
  vs.forEach((p, k) => { const r = unk.length + k, a = ni(p.a), c = ni(p.b);
    if (a >= 0) { M[a][r] = M[a][r].add(F(1)); M[r][a] = M[r][a].add(F(1)); } if (c >= 0) { M[c][r] = M[c][r].sub(F(1)); M[r][c] = M[r][c].sub(F(1)); }
    b[r] = p.type === 'A' ? F(0) : FX(p.value); });
  const x = N ? ANA.solve(M, b) : []; if (!x) return null;
  const V = n => { const r = find(n); return r in idx ? x[idx[r]] : F(0); };
  const I = {}; parts.forEach(p => { if (p.type === 'R') I[p.id] = V(p.a).sub(V(p.b)).div(FX(p.value)); else if (p.type === 'I') I[p.id] = FX(p.value); });
  vs.forEach((p, k) => { I[p.id] = x[unk.length + k]; });
  return { V, I: id => I[id] || F(0), Vab: id => { const p = ck.byId[id]; return V(p.a).sub(V(p.b)); }, ck };
};

/* =====================================================================================================================
   numbers in LaTeX: integer, finite decimal, or fraction ≈ decimal */
const finiteDec = q => { let d = q.d, k = 0, m = 0; while (d % 2 === 0) { d /= 2; k++; } while (d % 5 === 0) { d /= 5; m++; } return d === 1 && Math.max(k, m) <= 6; };
CH5.nm = (q, dec = 4) => { q = F(q); if (q.isInt) return String(q.n); if (finiteDec(q)) return ALG.fmtDec(+q, 6); return `${q.tex()} \\approx ${ALG.fmtDec(+q, dec)}`; };
const U = { V: '\\,\\text{V}', A: '\\,\\text{A}', mA: '\\,\\text{mA}', W: '\\,\\text{W}', mW: '\\,\\text{mW}', 'Ω': '\\,\\Omega', 'kΩ': '\\,\\text{k}\\Omega', '': '' };
CH5.U = U;
CH5.vl = (q, u = '') => `${CH5.nm(q)}${U[u] ?? u}`;
/* short decimal for sums: 0.2857 instead of 2/7 ≈ 0.2857 */
CH5.dec = (q, dec = 4) => { q = F(q); return q.isInt ? String(q.n) : finiteDec(q) ? ALG.fmtDec(+q, 6) : ALG.fmtDec(+q, dec); };
CH5.bx = (q, u = '') => `\\boxed{${CH5.vl(q, u)}}`;
/* plain text for the canvas: 4 significant figures with engineering prefix */
CH5.txt = (q, unit) => CK.eng(+q, unit, 4);

/* =====================================================================================================================
   circuit transforms */
CH5.clone = s => ({ ground: s.ground, A: s.A, B: s.B, nodes: { ...s.nodes }, parts: s.parts.map(p => ({ ...p })) });
CH5.kill = (s, keep = []) => { const c = CH5.clone(s);
  c.parts = c.parts.map(p => (p.type === 'V' && !keep.includes(p.id)) ? { ...p, type: 'W', ghost: 'V' } : (p.type === 'I' && !keep.includes(p.id)) ? { ...p, type: 'O', ghost: 'I', label: false } : p);
  return c; };
CH5.withLoad = (s, R, o = {}) => { const c = CH5.clone(s); c.parts.push({ id: 'RL', type: 'R', a: s.A, b: s.B, value: R, name: o.name ?? 'R_L', valText: o.valText ?? CK.eng(R, 'Ω', 4), side: 1, ...o.part }); return c; };
CH5.withMeter = (s, kind, o = {}) => { const c = CH5.clone(s); c.parts.push(kind === 'VM' ? { id: 'MET', type: 'VM', a: s.A, b: s.B, name: o.name ?? 'V_{oc}', valText: o.valText, side: 1 } : { id: 'MET', type: 'A', a: s.A, b: s.B, side: 1 }); return c; };
CH5.thevSpec = (Vth, Rth, o = {}) => ({ ground: 'b', A: 'A', B: 'B', nodes: { t: [0, 0], A: [3.2, 0], b: [0, 3], B: [3.2, 3] },
  parts: [{ id: 'Vth', type: 'V', a: 't', b: 'b', value: +Vth, name: 'V_{th}', valText: CH5.txt(Vth, 'V'), side: -1 }, { id: 'Rth', type: 'R', a: 't', b: 'A', value: +Rth, name: 'R_{th}', valText: CH5.txt(Rth, 'Ω'), side: 1 },
    { id: 'wb', type: 'W', a: 'b', b: 'B' }] });
CH5.nortSpec = (IN, RN) => ({ ground: 'b', A: 'A', B: 'B', nodes: { t: [0, 0], n: [1.9, 0], A: [3.6, 0], b: [0, 3], nb: [1.9, 3], B: [3.6, 3] },
  parts: [{ id: 'IN', type: 'I', a: 'b', b: 't', value: +IN, name: 'I_N', valText: CH5.txt(IN, 'A'), side: -1 }, { id: 'w1', type: 'W', a: 't', b: 'n' },
    { id: 'RN', type: 'R', a: 'n', b: 'nb', value: +RN, name: 'R_N', valText: CH5.txt(RN, 'Ω'), side: 1 }, { id: 'w2', type: 'W', a: 'n', b: 'A' }, { id: 'w3', type: 'W', a: 'b', b: 'nb' }, { id: 'w4', type: 'W', a: 'nb', b: 'B' }] });
/* set the load part of a live circuit: r = Infinity → open gap, r = 0 → wire, else a resistor */
CH5.setLoad = (c, r, id = 'RL') => { const p = c.part(id); if (!isFinite(r)) { p.type = 'O'; p.valText = MC.t('เปิดวงจร', 'open'); p.label = true; }
  else if (r <= 0) { p.type = 'W'; } else { p.type = p.lampType ? 'lamp' : 'R'; p.value = r; p.valText = CK.eng(r, 'Ω', 3); } };
/* V_oc, R_th and I_sc of a network whose terminals are spec.A, spec.B (exact) */
CH5.solveTN = s => {
  const e = CH5.exact(s); const voc = e.V(s.A).sub(e.V(s.B));
  const sc = CH5.withMeter(s, 'A'); const isc = CH5.exact(sc).I('MET');
  const k = CH5.kill(s); k.parts.push({ id: 'TEST', type: 'I', a: s.B, b: s.A, value: 1 }); const ek = CH5.exact(k); const rth = ek.V(s.A).sub(ek.V(s.B));
  return { voc, isc, rth };
};
/* asked quantity of a solved circuit: {kind:'I', id, from} current through a part from node `from`; {kind:'V', id, plus}; {kind:'Vn', node} */
CH5.ask = (e, spec, ask) => { const p = spec.parts.find(q => q.id === ask.id);
  if (ask.kind === 'Vn') return e.V(ask.node);
  if (ask.kind === 'V') { const v = e.V(p.a).sub(e.V(p.b)); return ask.plus === p.a ? v : v.neg(); }
  const i = e.I(ask.id); return (ask.from ?? p.a) === p.a ? i : i.neg(); };
/* superposition: exact partial responses, one source at a time */
CH5.superpose = (spec, srcs, ask) => ({ parts: srcs.map(id => CH5.ask(CH5.exact(CH5.kill(spec, [id])), spec, ask)), total: CH5.ask(CH5.exact(spec), spec, ask) });

/* =====================================================================================================================
   canvas overlays */
const isVert = (v, p) => { const A = v.P(p.a), B = v.P(p.b); return Math.abs(B[1] - A[1]) > Math.abs(B[0] - A[0]); };
CH5.ghost = (v, p) => {
  const A = v.P(p.a), B = v.P(p.b), u = v.u, ctx = v.ctx; const mx = (A[0] + B[0]) / 2, my = (A[1] + B[1]) / 2, r = u * 0.42;
  ctx.save(); ctx.setLineDash([4, 4]); ctx.strokeStyle = 'rgba(255,209,102,.8)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(mx, my, r, 0, 2 * Math.PI); ctx.stroke(); ctx.restore();
  const t1 = p.ghost === 'V' ? '0 V' : '0 A', t2 = p.ghost === 'V' ? MC.t('ลัด', 'short') : MC.t('เปิด', 'open'); const sz = Math.max(11.5, Math.min(13.5, u * 0.3)), side = p.ghostSide || p.side || 1;
  if (isVert(v, p)) { const x = mx + side * (r + 4), al = side > 0 ? 'left' : 'right'; v.text(t1, x, my - sz * 0.62, { align: al, color: AMBER, size: sz, weight: '700' }); v.text(t2, x, my + sz * 0.62, { align: al, color: AMBER, size: sz * 0.95 }); }
  else v.text(`${t1} · ${t2}`, mx, my - side * (r + sz * 0.8), { color: AMBER, size: sz, weight: '700' });
};
CH5.ghosts = v => v.ckt.parts.forEach(p => { if (p.ghost) CH5.ghost(v, p); });
CH5.terminals = (v, A, B, o = {}) => { const u = v.u, r = Math.max(4, u * 0.1), ctx = v.ctx;
  [[A, 'A'], [B, 'B']].forEach(([n, l]) => { if (!n) return; const [x, y] = v.P(n);
    ctx.save(); ctx.fillStyle = '#0f1220'; ctx.strokeStyle = o.color || '#e8ecf7'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, r, 0, 2 * Math.PI); ctx.fill(); ctx.stroke(); ctx.restore();
    v.text(l, x + (o.dx ?? 0.34) * u, y + (l === 'A' ? -1 : 1) * 0.3 * u, { color: o.color || '#e8ecf7', size: Math.max(13, u * 0.34), weight: '700' }); }); };
CH5.loadGhost = (v, A, B, o = {}) => { const a = v.P(A), b = v.P(B), u = v.u, ctx = v.ctx; const x = a[0], y0 = Math.min(a[1], b[1]) + u * 0.55, y1 = Math.max(a[1], b[1]) - u * 0.55;
  ctx.save(); ctx.setLineDash([5, 5]); ctx.strokeStyle = 'rgba(232,236,247,.45)'; ctx.lineWidth = 1.5; ctx.strokeRect(x - u * 0.24, y0, u * 0.48, y1 - y0); ctx.restore();
  v.text(o.name || 'R_L', x + u * 0.42, (y0 + y1) / 2 - 9, { align: 'left', color: '#9aa3c7', size: 12.5, weight: '700' });
  v.text(o.text || MC.t('ถอดออก', 'removed'), x + u * 0.42, (y0 + y1) / 2 + 9, { align: 'left', color: '#9aa3c7', size: 12 }); };
CH5.eye = (v, A, B, label, o = {}) => { const a = v.P(A), b = v.P(B), u = v.u; const y = (a[1] + b[1]) / 2, x1 = a[0] + u * (o.far ?? 1.9), x2 = a[0] + u * 0.55;
  const ctx = v.ctx; ctx.save(); ctx.strokeStyle = PINK; ctx.fillStyle = PINK; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x2, y); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x2, y); ctx.lineTo(x2 + 9, y - 6); ctx.lineTo(x2 + 9, y + 6); ctx.closePath(); ctx.fill(); ctx.restore();
  v.text(label, (x1 + x2) / 2, y - 14, { color: PINK, size: Math.max(13, u * 0.32), weight: '700' }); };
CH5.dead = (v, id) => { const p = v.ckt.part(id); if (!p) return; const A = v.P(p.a), B = v.P(p.b), x = (A[0] + B[0]) / 2, y = (A[1] + B[1]) / 2, r = v.u * 0.38, ctx = v.ctx;
  ctx.save(); ctx.strokeStyle = RED; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - r, y - r); ctx.lineTo(x + r, y + r); ctx.moveTo(x - r, y + r); ctx.lineTo(x + r, y - r); ctx.stroke(); ctx.restore(); };
/* rounded tag with text (subscripts allowed) */
CH5.tag = (v, s, x, y, col, o = {}) => { const ctx = v.ctx, size = o.size || 13; ctx.save(); ctx.font = `600 ${size}px "IBM Plex Mono", monospace`; const w = ctx.measureText(s.replace(/[_{}]/g, '')).width + 16, h = size + 10; ctx.restore();
  const x0 = o.align === 'left' ? x : o.align === 'right' ? x - w : x - w / 2;
  ctx.save(); ctx.fillStyle = 'rgba(15,18,32,.92)'; ctx.strokeStyle = col; ctx.lineWidth = o.hi ? 2.4 : 1.4; ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x0, y - h / 2, w, h, 6); else ctx.rect(x0, y - h / 2, w, h); ctx.fill(); ctx.stroke(); ctx.restore();
  v.text(s, x0 + w / 2, y + 0.5, { color: col, size, weight: '600' }); return w; };
/* the asked quantity drawn on a view: arrow (current) or polarity (voltage) or node tag */
CH5.askMark = (v, ask, text, col = PINK) => { const p = ask.id ? v.ckt.part(ask.id) : null;
  if (ask.kind === 'I' && p) v.refArrow(p, ask.from ?? p.a, text, { side: ask.side || 'R', color: col, off: ask.off ?? 0.55 });
  else if (ask.kind === 'V' && p) v.polarity(p, ask.plus, { side: ask.side || 'D', text, color: col, textColor: col });
  else if (ask.kind === 'Vn') { const q = v.ckt.nodes[ask.node]; const [x, y] = v.P([q[0] + (ask.dx ?? 0.35), q[1] + (ask.dy ?? -0.5)]); CH5.tag(v, text, x, y, col, { align: ask.align || 'left' }); } };
CH5.frame = (ctx, b, col, w = 1.2) => { ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1, 10); else ctx.rect(b.x, b.y, b.w, b.h); ctx.stroke(); ctx.restore(); };
CH5.dim = (ctx, b, a = 0.5) => { ctx.save(); ctx.fillStyle = `rgba(15,18,32,${a})`; ctx.fillRect(b.x, b.y, b.w, b.h); ctx.restore(); };
const gridSize = spec => { const xs = Object.values(spec.nodes).map(q => q[0]), ys = Object.values(spec.nodes).map(q => q[1]); return { w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) }; };
CH5.gridSize = gridSize;
const fitCanvas = (cv, h) => { const w = Math.max(320, Math.floor(cv.parentElement.clientWidth - 12)); return { ctx: CK.setup(cv, w, h(w)), w, h: h(w) }; };
const ui = () => MC.ui;
/* two circuits on one canvas: side by side when wide, stacked when narrow (phones) */
CH5.two = (cv, hWide, hEach) => { const T = { narrow: false };
  T.layout = () => { const w0 = Math.max(320, Math.floor(cv.parentElement.clientWidth - 12)); T.narrow = w0 < 640;
    const r = fitCanvas(cv, w => T.narrow ? 2 * (hEach(w) + 36) : hWide(w)); T.W = r.w; T.H = r.h;
    if (T.narrow) { const h = T.H / 2; T.a = { x: 4, y: 36, w: T.W - 8, h: h - 40 }; T.b = { x: 4, y: h + 36, w: T.W - 8, h: h - 40 }; }
    else { T.a = { x: 4, y: 36, w: T.W / 2 - 8, h: T.H - 40 }; T.b = { x: T.W / 2 + 4, y: 36, w: T.W / 2 - 8, h: T.H - 40 }; }
    return { ctx: r.ctx, W: T.W, H: T.H, a: T.a, b: T.b }; };
  T.chrome = (ctx, la, lb, ka = 'ok') => { ctx.save(); ctx.strokeStyle = '#262c4a'; ctx.beginPath(); if (T.narrow) { ctx.moveTo(8, T.H / 2); ctx.lineTo(T.W - 8, T.H / 2); } else { ctx.moveTo(T.W / 2, 30); ctx.lineTo(T.W / 2, T.H - 6); } ctx.stroke(); ctx.restore();
    CK.badge(ctx, la, ka, 8, 6); if (T.narrow) CK.badge(ctx, lb, 'ok', 8, T.H / 2 + 6); else CK.badge(ctx, lb, 'ok', T.W / 2 + 8, 6); };
  return T; };

/* =====================================================================================================================
   panels: several small circuits on one canvas, "① + ② + ③ = all together" */
CH5.Panels = class {
  constructor(cv, o = {}) { this.cv = cv; this.o = o; this.items = []; this.ops = []; }
  set(items) { this.items = items; items.forEach(it => { it.view = new CK.View(this.cv, it.ckt, { speed: it.speed, minV: 5, ground: false, showI: false, pad: it.pad ?? 1.85, tips: true, dots: false }); }); this.resize(); }
  resize() {
    const n = this.items.length - 1; if (n < 1) return; const g0 = gridSize(this.items[0].spec); const asp = (g0.h + 2.6) / (g0.w + 2.6), titleH = 44, gap = 34, m = 6;
    const W = Math.max(320, Math.floor(this.cv.parentElement.clientWidth - 12)); const wide = W >= 560; this.boxes = []; this.ops = [];
    if (wide && n === 3) { const pw = Math.floor((W - 2 * m - gap) / 2), ph = Math.round(Math.min(pw * asp + titleH, 360)), y2 = m + ph + 30;
      this.boxes.push({ x: m, y: m, w: pw, h: ph }, { x: m + pw + gap, y: m, w: pw, h: ph }, { x: m, y: y2, w: pw, h: ph }, { x: m + pw + gap, y: y2, w: pw, h: ph });
      this.ops.push({ s: '+', x: m + pw + gap / 2, y: m + ph / 2 }, { s: '+', x: m + pw / 2, y: m + ph + 15 }, { s: '=', x: m + pw + gap / 2, y: y2 + ph / 2 }); this.H = y2 + ph + m; }
    else if (wide) { const pw = Math.floor((W - 2 * m - (n - 1) * gap) / n), ph = Math.round(Math.min(pw * asp + titleH, 330)), tw = Math.min(W - 2 * m - 60, Math.max(pw, Math.round(W * 0.46))), th = Math.round(Math.min(tw * asp + titleH, 360));
      for (let i = 0; i < n; i++) { this.boxes.push({ x: m + i * (pw + gap), y: m, w: pw, h: ph }); if (i) this.ops.push({ s: '+', x: m + i * (pw + gap) - gap / 2, y: m + ph / 2 }); }
      const tx = Math.round((W - tw) / 2); this.boxes.push({ x: tx, y: m + ph + 18, w: tw, h: th }); this.ops.push({ s: '=', x: tx - 26, y: m + ph + 18 + th / 2 }); this.H = m + ph + 18 + th + m; }
    else { const pw = W - 2 * m, ph = Math.round(pw * asp + titleH); let y = m;
      for (let i = 0; i <= n; i++) { if (i) { this.ops.push({ s: i === n ? '=' : '+', x: W / 2, y: y + 12 }); y += 26; } this.boxes.push({ x: m, y, w: pw, h: ph }); y += ph; } this.H = y + m; }
    this.ctx = CK.setup(this.cv, W, this.H); this.W = W;
    this.items.forEach((it, i) => { const b = this.boxes[i]; it.box = b; it.view.ctx = this.ctx; it.view.fit({ x: b.x + 2, y: b.y + titleH, w: b.w - 4, h: b.h - titleH - 4 }); });
  }
  draw(dt) {
    const ctx = this.ctx; if (!ctx) return; ctx.fillStyle = CK.PAL.bg; ctx.fillRect(0, 0, this.W, this.H);
    this.items.forEach(it => { const b = it.box, v = it.view;
      ctx.save(); ctx.fillStyle = '#121629'; ctx.fillRect(b.x, b.y, b.w, b.h); ctx.restore();
      v.o.dots = !!it.on; v.o.tips = !!it.on; v.o.glow = it.glow ? new Set(it.glow) : null; v.o.glowColor = 'rgba(255,126,182,.32)'; v.advance(dt); v.draw(); CH5.ghosts(v);
      const small = b.w < 460 && it.askLabel;   // a small panel: the name at the arrow, "name = value" at the end of the second line
      if (it.ask) CH5.askMark(v, it.ask, small ? it.askLabel : it.askText, it.on ? PINK : '#9aa3c7');
      if (it.after) it.after(v);
      v.text(it.title, b.x + 12, b.y + 15, { align: 'left', color: it.focus ? AMBER : '#e8ecf7', size: 13.5, weight: '700' });
      if (it.sub) v.text(it.sub, b.x + 12, b.y + 33, { align: 'left', color: '#9aa3c7', size: 12.5 });
      if (small) v.text(it.askText, b.x + b.w - 10, b.y + 33, { align: 'right', color: it.on ? PINK : '#9aa3c7', size: 13, weight: '700' });
      if (it.dim) CH5.dim(ctx, b, 0.45); CH5.frame(ctx, b, it.focus ? AMBER : '#2a3150', it.focus ? 2.4 : 1.2); });
    this.ops.forEach(o => { ctx.save(); ctx.fillStyle = '#1b2038'; ctx.strokeStyle = '#4a5578'; ctx.beginPath(); ctx.arc(o.x, o.y, 14, 0, 2 * Math.PI); ctx.fill(); ctx.stroke(); ctx.restore();
      this.items[0].view.text(o.s, o.x, o.y + 1, { color: AMBER, size: 20, weight: '700' }); });
  }
};

/* =====================================================================================================================
   4) formulas that fit their column: LS.fit, LS.fitIn, LS.step, LS.withCol, LS.texW and LS.onFonts live in lesson.js (shared with
   chapter 6); the CH5 names stay for the pages and tests.html (which loads lesson.js after this file, hence the wrappers) */
const withCol = (w, fn) => LS.withCol(w, fn), step = (why, tex, note) => LS.step(why, tex, note), block = rows => LS.block(rows);
CH5.fit = tex => LS.fit(tex); CH5.fitIn = (el, tex) => LS.fitIn(el, tex); CH5.texW = s => LS.texW(s); CH5.onFonts = fn => LS.onFonts(fn); CH5.step = step;
/* values with the unit a person would use: kΩ from 1000 Ω, mA under 0.1 A */
const ohm = q => (Math.abs(+q) >= 1000 ? CH5.vl(F(q).div(1000), 'kΩ') : CH5.vl(q, 'Ω'));
const amp = q => (!F(q).isZero && Math.abs(+q) < 0.1 ? CH5.vl(F(q).mul(1000), 'mA') : CH5.vl(q, 'A'));
CH5.ohm = ohm; CH5.amp = amp;

/* =====================================================================================================================
   5) one problem, one canvas: set(k) shows what the first k steps of LS.stepper have opened */
const PRIMES = ['′', '″', '‴'];
const askName = (d, i) => d.prime ? `${d.ask.name}${PRIMES[i]}` : `${d.ask.name.replace(/_(\w+)$/, '_{$1' + (i + 1) + '}')}`;
const askTex = (d, i) => d.prime ? `${d.ask.tex}${"'".repeat(i + 1)}` : `${d.ask.tex.replace(/_\{?(\w+)\}?$/, '_{$1' + (i + 1) + '}')}`;
CH5.askName = askName; CH5.askTex = askTex;
const CIRC = '①②③④';
const sub = s => s.replace(/_(\w+)/, '<sub>$1</sub>');

/* ---------------- superposition (page 5.1): new CH5.SupProb(canvas, key), CH5S[key] = { spec, srcs, ask, prime, steps: {srcId: {head, how, tex(S)}}, sumNote, extra(S) }
   Panels ①, ②, ③ keep one source each (the killed ones are dashed yellow circles), the last panel is the real circuit. The panel of the
   open step is framed in amber and the others dimmed; a panel's dots run once its step is open, the real circuit's once the sum is. */
CH5.SupProb = class {
  constructor(cv, key, o = {}) {
    const d = this.d = global.CH5S[key]; this.cv = cv; this.o = o; this.k = 0; this.colW = o.colW || 0;
    this.sol = CH5.superpose(d.spec, d.srcs, d.ask); const src = id => d.spec.parts.find(p => p.id === id);
    const items = d.srcs.map((id, i) => { const sp = CH5.kill(d.spec, [id]);
      const off = d.srcs.filter(x => x !== id).map(src).map(p => `${p.name} → ${p.type === 'V' ? MC.t('ลัด', 'short') : MC.t('เปิด', 'open')}`).join(', ');
      return { spec: sp, ckt: new CK.Circuit(sp), speed: d.speed, title: `${CIRC[i]} ${MC.t(`${src(id).name} ทำงานตัวเดียว`, `${src(id).name} acting alone`)}`, sub: off, ask: d.ask, pad: d.pad }; });
    items.push({ spec: d.spec, ckt: new CK.Circuit(d.spec), speed: d.speed, title: MC.t('วงจรจริง: แหล่งจ่ายทุกตัวพร้อมกัน', 'The real circuit: all sources on'),
      sub: `${d.ask.name} = ${d.srcs.map((_, i) => CIRC[i]).join(' + ')}`, ask: d.ask, pad: d.pad });
    items.forEach(it => it.ckt.solve());
    this.P = new CH5.Panels(cv); this.P.set(items); this.set(0);
    window.addEventListener('resize', () => this.P.resize()); LS.anim(cv, dt => this.P.draw(dt));
  }
  get unit() { return this.d.ask.kind === 'I' ? 'A' : 'V'; }
  fmt(q) { const u = this.unit; return (q.isZero || Math.abs(+q) >= 0.1) ? `${ALG.fmtDec(+q, 4).replace('-', '−')} ${u}` : CH5.txt(q, u); }
  get steps() { return this.list || (this.list = withCol(this.colW, () => {
    const d = this.d, sol = this.sol, n = d.srcs.length, nm = id => d.spec.parts.find(p => p.id === id).name, sum = d.srcs.map((_, i) => askTex(d, i)).join(' + ');
    const S2 = { p: sol.parts, total: sol.total, nm: CH5.nm, bx: CH5.bx, vl: CH5.vl, F };
    const out = [step(MC.t(`<b>นับแหล่งจ่ายอิสระ</b>: มี ${n} ตัว (${d.srcs.map(nm).join(', ')}) จึงแยกคิด ${n} ครั้งแล้วนำผลมารวมกัน · <b>ฆ่าแหล่งจ่าย</b>ที่ไม่ได้คิด: แหล่งจ่ายแรงดัน → ลัดวงจร (0 V) แหล่งจ่ายกระแส → เปิดวงจร (0 A)`,
      `<b>Count the independent sources</b>: there are ${n} (${d.srcs.map(nm).join(', ')}), so we work ${n} small problems and add the results · <b>Kill</b> the sources not in play: a voltage source → short circuit (0 V), a current source → open circuit (0 A)`), `${d.ask.tex} = ${sum}`)];
    d.srcs.forEach((id, i) => { const s = d.steps[id]; out.push(step(`<b>${CIRC[i]} ${tt(s.head)}</b> ${tt(s.how)}`, s.tex(S2))); });
    const vals = sol.parts.map(q => { const t = CH5.dec(q); return q.sign < 0 ? `(${t})` : t; }).join(' + ');
    out.push(step(MC.t('<b>รวมผล</b> (ใส่เครื่องหมายตามทิศหรือขั้วที่โจทย์กำหนด) แล้วเทียบกับวงจรจริงในภาพสุดท้าย: จุดในวงจรจริงวิ่งด้วยผลรวมพอดี', '<b>Add the results</b> (with the signs set by the direction or polarity in the problem) and compare with the real circuit in the last panel: its dots run at exactly the sum'),
      `${d.ask.tex} = ${sum} = ${vals} = ${CH5.bx(sol.total, this.unit)}`, d.sumNote ? tt(d.sumNote) : ''));
    (d.extra ? d.extra(S2) : []).forEach(x => out.push(step(`<b>${tt(x.t)}</b>`, x.tex, x.note ? tt(x.note) : '')));
    return out; })); }
  /* steps: 1 = count and kill, 2 … n + 1 = one source each, n + 2 = the sum, then the extras */
  set(k) { this.k = k; const d = this.d, n = d.srcs.length, cur = k < 2 ? -1 : Math.min(k - 2, n);
    this.P.items.forEach((it, i) => { const on = k >= n + 2 || (i < n && k >= i + 2);
      it.on = on; it.focus = k >= 2 && cur === i; it.dim = cur >= 0 && cur < n && cur !== i; it.glow = [d.ask.id];
      const val = i < n ? this.sol.parts[i] : this.sol.total; it.askLabel = i < n ? askName(d, i) : d.ask.name; it.askText = `${it.askLabel} = ${on ? this.fmt(val) : '?'}`; }); }
};

/* ---------------- Thévenin / Norton (pages 5.2–5.4): new CH5.TNProb(canvas, key, mode, o), CH5T[key] = { spec (terminals A, B), load, thev, nort },
   mode 'thev' | 'nort' | 'both' (Thévenin, then Norton); o.mp adds the maximum-power step. One stage per step, as in class:
   the problem → remove the load → a voltmeter reads V_oc (the parts used glow) or an ammeter shorts AB → the sources killed, looking
   into AB → the equivalent → the load on the real circuit and on the equivalent, side by side (or stacked on a phone): same current.
   The value each stage finds is written in the line under the badge. The dots run only in stages whose current is worked out. */
CH5.TNProb = class {
  constructor(cv, key, mode, o = {}) {
    const d = this.d = global.CH5T[key]; this.cv = cv; this.key = key; this.mode = mode; this.o = o; this.k = 0; this.colW = o.colW || 0;
    const T = this.T = CH5.solveTN(d.spec), RL = this.RL = d.load ? d.load.R : +T.rth, ln = d.load ? d.load.name : 'R_L';
    const mk = (spec, pad) => { const c = new CK.Circuit(spec); c.solve(); return { spec, c, pad: pad ?? 1.5, v: new CK.View(cv, c, { speed: d.speed, minV: 5, ground: false, showI: false, pad: pad ?? 1.5, tips: false, dots: false }) }; };
    const thS = CH5.thevSpec(T.voc, T.rth), noS = CH5.nortSpec(T.isc, T.rth);
    this.V = { prob: d.load ? mk(CH5.withLoad(d.spec, d.load.R, { name: ln, valText: '' })) : mk(CH5.clone(d.spec)), bare: mk(CH5.clone(d.spec)),
      voc: mk(CH5.withMeter(d.spec, 'VM', { name: 'V_{oc}', valText: '' })), isc: mk(CH5.withMeter(d.spec, 'A')), dead: mk(CH5.kill(d.spec)),
      eqT: mk(thS, 1.6), eqN: mk(noS, 1.6), fullL: mk(CH5.withLoad(d.spec, RL, { name: ln, valText: '' })),
      eqL: mk(CH5.withLoad(mode === 'nort' ? noS : thS, RL, { name: ln, valText: '' }), 1.6) };
    this.stages = ['prob', 'bare', ...(mode === 'thev' ? ['voc', 'dead', 'eqT'] : mode === 'nort' ? ['isc', 'dead', 'eqN'] : ['voc', 'dead', 'eqT', 'isc', 'eqN']), ...(d.load ? ['load'] : []), ...(o.mp ? ['max'] : [])];
    this.resize(); window.addEventListener('resize', () => this.resize()); LS.anim(cv, dt => this.frame(dt));
  }
  get stage() { return this.stages[Math.min(this.k, this.stages.length - 1)]; }
  get two() { return this.stage === 'load' || this.stage === 'max'; }
  set(k) { const was = this.two; this.k = k; if (this.two !== was) this.resize(); }
  vals() { const T = this.T, R = FX(this.RL), IL = T.voc.div(T.rth.add(R)); return { voc: T.voc, rth: T.rth, isc: T.isc, IL, VL: IL.mul(R), nm: CH5.nm, bx: CH5.bx, vl: CH5.vl, F, FX }; }
  get steps() { return this.list || (this.list = withCol(this.colW, () => {
    const d = this.d, T = this.T, x = this.vals(), nt = this.mode === 'nort', out = [];
    this.stages.slice(1).forEach((s, i) => { const H = (th, en) => MC.t(`<b>ขั้นที่ ${i + 1} · ${th}</b> `, `<b>Step ${i + 1} · ${en}</b> `);
      if (s === 'bare') out.push(step(H('ถอดโหลดออก', 'Remove the load') + (d.load ? MC.t(`ถอด ${d.load.label} ออกจากวงจร`, `take ${d.load.label} out of the circuit`) : MC.t('โจทย์ถามวงจรสมมูลที่ขั้ว A–B จึงไม่มีโหลดให้ถอด', 'the problem asks for the equivalent at A–B, so there is no load to remove')) +
        MC.t(' แล้วทำเครื่องหมายขั้ว A และ B ส่วนที่เหลือคือ "เครือข่าย A" ที่จะถูกแทนด้วยวงจรสมมูล', ' and mark terminals A and B. What is left is "network A", the part the equivalent will replace')));
      else if (s === 'voc') out.push(step(H('หาแรงดันวงจรเปิด \\(V_{AB} = V_{oc} = V_{th}\\)', 'Find the open-circuit voltage \\(V_{AB} = V_{oc} = V_{th}\\)') + tt(d.thev.vocHow), d.thev.voc(x)));
      else if (s === 'isc') out.push(step(H('ลัดวงจรขั้ว AB แล้วหากระแส \\(I_{AB} = I_{sc} = I_N\\)', 'Short terminals AB and find the current \\(I_{AB} = I_{sc} = I_N\\)') + tt(d.nort.iscHow), d.nort.isc(x)));
      else if (s === 'dead') out.push(step(H(nt ? 'หา \\(R_N = R_{th}\\)' : 'ฆ่าแหล่งจ่ายแล้วหา \\(R_{th}\\)', nt ? 'Find \\(R_N = R_{th}\\)' : 'Kill the sources and find \\(R_{th}\\)') + tt(d.thev.rthHow), d.thev.rth(x)));
      else if (s === 'eqT') out.push(step(H('เขียนวงจรสมมูลเทวินิน', 'Draw the Thévenin equivalent') + MC.t('แหล่งจ่ายแรงดัน \\(V_{th}\\) อนุกรมกับ \\(R_{th}\\)', 'a voltage source \\(V_{th}\\) in series with \\(R_{th}\\)'),
        block([`V_{th} &= ${CH5.vl(T.voc, 'V')}`, `R_{th} &= ${ohm(T.rth)}`]), d.thev.eqNote ? tt(d.thev.eqNote) : ''));
      else if (s === 'eqN') out.push(step(H('เขียนวงจรสมมูลนอร์ตัน', 'Draw the Norton equivalent') + MC.t('แหล่งจ่ายกระแส \\(I_N\\) ขนานกับ \\(R_N\\) และตรวจด้วย \\(I_N R_N = V_{th}\\) (การแปลงแหล่งจ่าย)', 'a current source \\(I_N\\) in parallel with \\(R_N\\), checked with \\(I_N R_N = V_{th}\\) (source transformation)'),
        block([`I_N &= ${amp(T.isc)}`, `R_N &= R_{th} = ${ohm(T.rth)}`, `I_N R_N &= ${CH5.vl(T.isc.mul(T.rth), 'V')} = V_{th}`]), d.nort.eqNote ? tt(d.nort.eqNote) : ''));
      else if (s === 'load') { const m = nt ? d.nort : d.thev; out.push(step(H('ต่อโหลดกลับ', 'Reconnect the load') + tt(m.loadHow), m.load(x),
        MC.t('ในภาพ วงจรจริงกับวงจรสมมูลต่อโหลดตัวเดียวกัน และได้กระแสเท่ากันพอดี', 'In the drawing the real circuit and the equivalent carry the same load and get exactly the same current'))); }
      else if (s === 'max') { const pm = T.voc.mul(T.voc).div(T.rth.mul(4)); out.push(step(H('กำลังสูงสุด', 'Maximum power') + MC.t('ตั้ง \\(R_L = R_{th}\\) (หน้า 5.4) แล้ว \\(P_{max} = V_{th}^2/(4R_{th})\\)', 'set \\(R_L = R_{th}\\) (page 5.4); then \\(P_{max} = V_{th}^2/(4R_{th})\\)'),
        block([`R_L &= R_{th} = ${ohm(T.rth)}`, `P_{max} &= \\frac{V_{th}^2}{4R_{th}} = \\frac{(${CH5.dec(T.voc)})^2}{4(${CH5.dec(T.rth)})} = ${CH5.bx(pm, 'W')}`]),
        MC.t('ในภาพ ทั้งวงจรจริงและวงจรสมมูลต่อ \\(R_L = R_{th}\\) และได้กำลังเท่ากัน', 'In the drawing both the real circuit and the equivalent carry \\(R_L = R_{th}\\) and get the same power'))); }
    });
    return out; })); }
  resize() {
    const d = this.d, g = gridSize(d.spec), W = Math.max(this.o.minW || 300, Math.floor(this.cv.parentElement.clientWidth - 12)); this.narrow = W < 640;
    const top = 64, asp = (g.h + 3) / (g.w + 3.2), h1 = Math.round(Math.max(this.narrow ? 170 : 230, Math.min(520, (W - 8) * asp)));
    const H = !this.two ? h1 + top : this.narrow ? Math.round(2 * Math.min(420, (W - 8) * asp) + top + 56) : Math.round(Math.max(230, Math.min(480, (W * 0.56 - 8) * asp)) + top + 30);
    this.ctx = CK.setup(this.cv, W, H); this.W = W; this.H = H;
    const rm = this.narrow ? 46 : Math.round(Math.min(110, Math.max(56, W * 0.1))), lm = this.narrow ? 16 : 26, pad = o => o.pad + (this.narrow ? 0.55 : 0);   // side labels ("300 mA") need more room when the circuit is small
    const fit = (o, b) => { o.v.ctx = this.ctx; o.v.o.pad = pad(o); o.v.fit(b); };
    ['prob', 'bare', 'voc', 'isc', 'dead'].forEach(k => fit(this.V[k], { x: 4 + lm, y: top, w: W - 8 - rm - lm, h: h1 - 4 }));
    ['eqT', 'eqN'].forEach(k => fit(this.V[k], { x: W * 0.16, y: top, w: W * 0.62, h: h1 - 4 }));
    if (this.narrow) { const h = (H - top - 56) / 2; this.L = { x: 4 + lm, y: top, w: W - 8 - rm - lm, h }; this.R = { x: W * 0.12, y: top + h + 52, w: W * 0.66, h }; this.split = top + h + 26; }
    else { this.L = { x: 4 + lm, y: top, w: W * 0.56 - 8 - rm * 0.6 - lm, h: H - top - 30 }; this.R = { x: W * 0.56 + 4, y: top, w: W * 0.44 - 8 - rm * 0.6, h: H - top - 30 }; this.split = W * 0.56; }
    fit(this.V.fullL, this.L); fit(this.V.eqL, this.R);
  }
  frame(dt) {
    const c = this.ctx; if (!c) return; const d = this.d, T = this.T, V = this.V, s = this.stage, A = d.spec.A, B = d.spec.B, nt = this.mode === 'nort';
    c.fillStyle = CK.PAL.bg; c.fillRect(0, 0, this.W, this.H);
    const show = (o, live, f) => { o.v.o.dots = live; o.v.o.tips = live; o.v.advance(dt); o.v.draw(); if (f) f(o.v); };
    const far = v => Math.max(0.9, Math.min(1.9, (this.W - 8 - v.P(A)[0]) / v.u));
    let note = '', col = AMBER;
    if (s === 'prob') show(V.prob, false, v => { CH5.terminals(v, A, B); if (d.load && d.load.ask) CH5.askMark(v, { ...d.load.ask, id: 'RL' }, d.load.ask.text, PINK); });
    else if (s === 'bare') show(V.bare, false, v => { CH5.terminals(v, A, B); CH5.loadGhost(v, A, B, { name: d.load ? (d.load.short || d.load.name) : 'R_L', text: d.load ? MC.t('ถอดออก', 'removed') : MC.t('ไม่มีโหลด', 'no load') }); });
    else if (s === 'voc') { const o = V.voc; o.v.o.glow = new Set(d.thev.vocGlow || []); o.v.o.glowColor = 'rgba(255,193,77,.32)';
      show(o, true, v => { CH5.terminals(v, A, B); (d.thev.vocDead || []).forEach(id => CH5.dead(v, id)); }); note = `V_{oc} = V_{th} = ${CH5.txt(T.voc, 'V')}`; }
    else if (s === 'isc') { const o = V.isc; o.v.o.glow = new Set(d.nort.iscGlow || []); o.v.o.glowColor = 'rgba(255,193,77,.32)';
      show(o, true, v => { CH5.terminals(v, A, B); (d.nort.iscDead || []).forEach(id => CH5.dead(v, id)); }); note = `I_{sc} = I_N = ${CH5.txt(T.isc, 'A')}  (A → B)`; }
    else if (s === 'dead') { const o = V.dead; o.v.o.glow = new Set(d.thev.rthGlow || []); o.v.o.glowColor = 'rgba(126,231,135,.30)';
      show(o, false, v => { CH5.ghosts(v); CH5.terminals(v, A, B); (d.thev.rthDead || []).forEach(id => CH5.dead(v, id)); CH5.eye(v, A, B, '', { far: far(v) }); });
      note = `${nt ? 'R_N = R_{th}' : 'R_{th}'} = ${CH5.txt(T.rth, 'Ω')}  ${MC.t('(มองเข้าที่ AB)', '(looking into AB)')}`; col = PINK; }
    else if (s === 'eqT' || s === 'eqN') { show(V[s], true, v => CH5.terminals(v, 'A', 'B'));
      note = s === 'eqT' ? `V_{th} = ${CH5.txt(T.voc, 'V')},  R_{th} = ${CH5.txt(T.rth, 'Ω')}` : `I_N = ${CH5.txt(T.isc, 'A')},  R_N = ${CH5.txt(T.rth, 'Ω')}`; col = GREEN; }
    else { show(V.fullL, true, v => CH5.terminals(v, A, B)); show(V.eqL, true, v => CH5.terminals(v, 'A', 'B'));
      c.save(); c.strokeStyle = '#262c4a'; c.beginPath(); if (this.narrow) { c.moveTo(8, this.split); c.lineTo(this.W - 8, this.split); } else { c.moveTo(this.split, 70); c.lineTo(this.split, this.H - 6); } c.stroke(); c.restore();
      const volt = d.load && d.load.ask && d.load.ask.kind === 'V', q = cc => s === 'max' ? `P_L = ${CK.eng(cc.P('RL'), 'W', 4)}` : volt ? `V_L = ${CK.eng(cc.Vab('RL').re, 'V', 4)}` : `I_L = ${CK.eng(cc.I('RL').re, 'A', 4)}`;
      const t1 = `${MC.t('วงจรจริง', 'real circuit')}: ${q(V.fullL.c)}`, t2 = `${MC.t('วงจรสมมูล', 'equivalent')}: ${q(V.eqL.c)}`, st = { align: 'left', color: GREEN, size: 13, weight: '600' };
      if (this.narrow) { V.fullL.v.text(t1, 10, this.split - 12, st); V.eqL.v.text(t2, 10, this.H - 12, st); } else { V.fullL.v.text(t1, 10, this.H - 14, st); V.eqL.v.text(t2, this.split + 10, this.H - 14, st); }
      note = s === 'max' ? `R_L = R_{th} = ${CH5.txt(T.rth, 'Ω')}` : `${d.load.short || d.load.name} ${MC.t('ต่อกลับ', 'back on')}`; col = GREEN; }
    if (note) V.prob.v.text(note, 12, 50, { align: 'left', color: col, size: 14, weight: '700' });
    const n = i => i + 1, lab = { prob: MC.t('โจทย์', 'the problem'), bare: MC.t('ถอดโหลด', 'remove the load'), voc: MC.t('วัดแรงดันวงจรเปิด', 'open-circuit voltage'), isc: MC.t('ลัดวงจร AB วัดกระแส', 'short AB, read the current'),
      dead: MC.t('ฆ่าแหล่งจ่าย มองเข้าที่ AB', 'kill the sources, look into AB'), eqT: MC.t('วงจรสมมูลเทวินิน', 'Thévenin equivalent'), eqN: MC.t('วงจรสมมูลนอร์ตัน', 'Norton equivalent'),
      load: MC.t('ต่อโหลดกลับ', 'reconnect the load'), max: MC.t('กำลังสูงสุด', 'maximum power') }[s];
    CK.badge(c, this.k ? `${MC.t('ขั้นที่', 'step')} ${n(this.k - 1)} · ${lab}` : lab, this.k >= this.stages.length - 1 ? 'ok' : 'wait');
  }
};

/* ---------------- maximum power (page 5.4): new CH5.MPProb(canvas, key), CH5M[key] = { net (a key of CH5T), lname, RL0, variants, steps(x) → [{RL, head, how, tex, note, marks, curve, peak}] }
   The real circuit with a load to slide beside the P_L(R_L) plot. Before the Thévenin step only the powers measured in the real circuit
   show (a trail of dots as R_L moves); a step with curve: true draws the curve the equivalent predicts, and the measured circle sits on it;
   peak: true adds R_L = R_th and P_max. A step with RL moves the load there; variants (Ex 6: 2 kΩ or 5 kΩ) rebuild the circuit. */
CH5.MPProb = class {
  constructor(cv, key, o = {}) { this.cv = cv; this.d = global.CH5M[key]; this.net = global.CH5T[this.d.net]; this.o = o; this.vi = 0; this.k = 0; this.colW = o.colW || 0;
    this.build(); window.addEventListener('resize', () => this.resize()); LS.anim(cv, dt => this.frame(dt)); }
  build() { const d = this.d, va = d.variants ? d.variants[this.vi] : null, spec = this.spec || (this.spec = CH5.clone(this.net.spec)), name = val => CK.eng(val, 'Ω');
    if (va) Object.entries(va.set).forEach(([id, val]) => { const p = spec.parts.find(q => q.id === id); p.value = val; p.name = name(val); });
    const T = this.T = CH5.solveTN(spec); this.list = null; this.trail = []; this.curve = false; this.peak = false;
    this.raw = d.steps({ voc: T.voc, rth: T.rth, isc: T.isc, nm: CH5.nm, bx: CH5.bx, vl: CH5.vl, F, FX, exact: CH5.exact, spec, withLoad: CH5.withLoad, va });
    this.RL0 = d.RL0 || 3 * +T.rth;
    if (!this.c) { this.c = new CK.Circuit(CH5.withLoad(spec, this.RL0, { name: d.lname || 'R_L' })); this.v = new CK.View(this.cv, this.c, { speed: this.net.speed, minV: 5, ground: false, showI: false, pad: 1.5, tips: true }); }
    else if (va) Object.entries(va.set).forEach(([id, val]) => { this.c.set(id, 'value', val); this.c.part(id).name = name(val); });
    if (this.sl) { this.sl.el.max = 6 * +T.rth; this.sl.el.step = +T.rth / 200; }
    this.setRL(this.RL0); this.resize(); }
  get steps() { return this.list || (this.list = withCol(this.colW, () => this.raw.map(s => step(`<b>${tt(s.head)}</b> ${tt(s.how)}`, s.tex, s.note ? tt(s.note) : '')))); }
  set(k) { this.k = k; const open = this.raw.slice(0, k); this.curve = open.some(s => s.curve); this.peak = open.some(s => s.peak);
    const last = [...open].reverse().find(s => s.RL); this.setRL(last ? last.RL : this.RL0); }
  setRL(r) { const T = this.T; this.RL = Math.max(+T.rth * 1e-3, r); this.c.set('RL', 'value', this.RL); this.c.part('RL').valText = CK.eng(this.RL, 'Ω', 4); this.c.solve();
    if (this.sl) this.sl.set(Math.min(this.RL, +this.sl.el.max)); this.trail.push([this.RL, this.c.P('RL')]); if (this.trail.length > 90) this.trail.shift(); this.readout(); }
  readout() { if (!this.ro) return; const T = this.T, rows = [[sub(this.d.lname || 'R_L'), CK.eng(this.RL, 'Ω', 4)], [MC.t('P ที่วัดได้ในวงจรจริง', 'P measured in the real circuit'), CK.eng(this.c.P('RL'), 'W', 4)]];
    if (this.curve) rows.push([sub('V_th'), CH5.txt(T.voc, 'V')], [sub('R_th'), CH5.txt(T.rth, 'Ω')]); if (this.peak) rows.push([sub('P_max'), CK.eng(+T.voc * +T.voc / (4 * +T.rth), 'W', 4)]);
    this.ro.innerHTML = MC.ui.kv(rows); }
  /* the slider, "R_L = R_th" and the variant buttons, in the .ctl box under the canvas; the readout goes under it */
  controls(el) { const ui = MC.ui, d = this.d;
    if (d.variants) ui.radio(el, d.variants.map((x, i) => ({ id: `${el.id}_v${i}`, label: tt(x.label), on: i === 0 })), id => { this.vi = +id.slice(-1); this.build(); if (this.stepper) this.stepper.refresh(true); });
    this.sl = ui.slider(el, { id: el.id + '_rl', label: sub(d.lname || 'R_L'), min: 0, max: 6 * +this.T.rth, step: +this.T.rth / 200, value: this.RL, fmt: x => CK.eng(Math.max(x, 1e-6), 'Ω', 3), oninput: x => this.setRL(x) });
    ui.buttons(el, [{ label: `${(d.lname || 'R_L')} = R_th`, onclick: () => this.setRL(+this.T.rth) }]);
    this.ro = document.createElement('div'); this.ro.className = 'readout metrics'; el.after(this.ro); this.readout(); }
  resize() { const g = gridSize(this.spec), W = Math.max(300, Math.floor(this.cv.parentElement.clientWidth - 12)), wide = W >= 700, asp = (g.h + 3) / (g.w + 3.4);
    const hc = Math.round(Math.max(210, Math.min(400, (wide ? W * 0.5 : W) * asp))) + 36, H = wide ? Math.max(hc, 340) : hc + 290;
    this.ctx = CK.setup(this.cv, W, H); this.W = W; this.H = H;
    const rm = 66;   // room on the right of the circuit for the load's name and value
    this.B = wide ? { c: { x: 4, y: 36, w: W * 0.5 - 8 - rm, h: H - 40 }, p: { x: W * 0.5 + 4, y: 6, w: W * 0.5 - 10, h: H - 12 } } : { c: { x: 4, y: 36, w: W - 8 - rm, h: hc - 40 }, p: { x: 6, y: hc + 4, w: W - 12, h: 280 } };
    this.v.ctx = this.ctx; this.v.fit(this.B.c); }
  frame(dt) { const c = this.ctx; if (!c) return; const T = this.T, rth = +T.rth, pm = +T.voc * +T.voc / (4 * rth), st = this.raw[this.k - 1];
    c.fillStyle = CK.PAL.bg; c.fillRect(0, 0, this.W, this.H); this.v.advance(dt); this.v.draw(); CH5.terminals(this.v, this.spec.A, this.spec.B);
    const ur = rth >= 1000 ? { k: 1e-3, u: 'kΩ' } : { k: 1, u: 'Ω' }, up = pm < 1 ? { k: 1000, u: 'mW' } : { k: 1, u: 'W' };
    CH5.prPlot(c, this.B.p, { Vth: +T.voc, Rth: rth, RL: this.RL, P: this.c.P('RL'), xmax: Math.max(6 * rth, 1.15 * Math.min(this.RL, 12 * rth)), kx: ur.k, unitR: ur.u, ky: up.k, unitP: up.u,
      curve: this.curve, peak: this.peak, trail: this.curve ? [] : this.trail, marks: (st && st.marks) || [],
      title: this.curve ? MC.t('P_L: วัดจริง (○) กับเส้นจากวงจรสมมูล', 'P_L: measured (○) vs the equivalent') : MC.t('P_L ที่วัดได้ในวงจรจริง', 'P_L measured in the real circuit') });
    CK.badge(c, this.peak ? MC.t('กำลังสูงสุดเมื่อ R_L = R_th', 'maximum power at R_L = R_th') : this.curve ? MC.t('ได้วงจรสมมูลแล้ว', 'equivalent found') : MC.t('เลื่อนโหลดแล้วดูกำลัง', 'slide the load, watch the power'), this.peak ? 'ok' : 'wait'); }
};

/* ---------------- one problem section of a page: canvas cv<n>, try-first box ask<n>, stepper st<n>, controls ctl<n> (maximum power)
   kind 'sup' | 'thev' | 'nort' | 'both' | 'mp'; o = { ask: sim => LS.ask options, answer: html | () => html, hint, mp (Thévenin/Norton: add the
   maximum-power step), minW (px; the card then needs .hscroll) }. The steps are fitted to the width of their own column. */
CH5.problem = (n, kind, key, o = {}) => {
  const $ = id => document.getElementById(id), cv = $('cv' + n), oo = { ...o, colW: $('st' + n).clientWidth };
  const sim = kind === 'sup' ? new CH5.SupProb(cv, key, oo) : kind === 'mp' ? new CH5.MPProb(cv, key, oo) : new CH5.TNProb(cv, key, kind, oo);
  if (kind === 'mp' && $('ctl' + n)) sim.controls($('ctl' + n));
  if (o.ask && $('ask' + n)) LS.ask($('ask' + n), o.ask(sim));
  sim.stepper = LS.stepper($('st' + n), { steps: () => sim.steps, answer: o.answer, hint: o.hint, onStep: k => sim.set(k) });
  CH5.onFonts(() => { sim.colW = $('st' + n).clientWidth; sim.list = null; sim.stepper.refresh(true); });
  LS.watchWidth($('st' + n), w => { sim.colW = w; sim.list = null; sim.stepper.refresh(true); });
  return sim;
};

/* =====================================================================================================================
   equivalence demo (page 5.2, section A): real network + R_L beside its Thévenin (or Norton) equivalent + R_L, and the terminal V–I line.
   The circuits are built once per network; moving the slider only changes R_L and re-solves, so the dots keep flowing. */
CH5.equivDemo = o => {
  const D = global.CH5T; const S = { key: o.start || o.keys[0], s: 0 };
  const cv = document.getElementById(o.cv), panel = document.getElementById(o.panel); let d, T, net, eq, vN, vE, ctx, W = 0, H = 0; const B = {};
  const RL = () => { const r = +T.rth; return S.s <= -2.99 ? 0 : S.s >= 2.99 ? Infinity : r * Math.pow(10, S.s); };
  function build() { d = D[S.key]; T = CH5.solveTN(d.spec); S.s = d.load ? Math.log10(d.load.R / +T.rth) : 0; sl.set(S.s);
    net = new CK.Circuit(CH5.withLoad(d.spec, 1)); eq = new CK.Circuit(CH5.withLoad(o.norton ? CH5.nortSpec(T.isc, T.rth) : CH5.thevSpec(T.voc, T.rth), 1));
    vN = new CK.View(cv, net, { speed: d.speed, minV: 5, ground: false, showI: false, pad: 1.5, tips: true }); vE = new CK.View(cv, eq, { speed: d.speed, minV: 5, ground: false, showI: false, pad: 1.6, tips: true });
    update(); resize(); }
  function update() { const r = RL(); [net, eq].forEach(c => { CH5.setLoad(c, r); c.solve(); }); readout(); }
  function resize() { if (!d) return; const g = gridSize(d.spec); const w0 = Math.max(320, Math.floor(cv.parentElement.clientWidth - 12)); B.narrow = w0 < 640;
    if (B.narrow) { const hN = Math.round(w0 * (g.h + 3) / (g.w + 4.5)), hE = Math.round(w0 * 0.5); const r = fitCanvas(cv, () => 34 + hN + 34 + hE + 262); ctx = r.ctx; W = r.w; H = r.h;
      B.n = { x: 4, y: 34, w: W - 8, h: hN }; B.e = { x: W * 0.12, y: 34 + hN + 34, w: W * 0.76, h: hE }; B.plot = { x: 6, y: H - 254, w: W - 12, h: 248 }; }
    else { const r = fitCanvas(cv, w => Math.round(Math.max(300, Math.min(420, w * 0.6 * (g.h + 3) / (g.w + 4.5)))) + 260); ctx = r.ctx; W = r.w; H = r.h;
      const top = H - 260; B.n = { x: 4, y: 34, w: W * 0.58 - 8, h: top - 38 }; B.e = { x: W * 0.58 + 4, y: 34, w: W * 0.42 - 8, h: top - 38 }; B.plot = { x: 6, y: top + 8, w: W - 12, h: 246 }; }
    vN.ctx = ctx; vE.ctx = ctx; vN.fit(B.n); vE.fit(B.e); }
  function readout() { const a = net.I('RL').re, b = eq.I('RL').re, va = net.Vab('RL').re, vb = eq.Vab('RL').re;
    const rr = RL(); out.innerHTML = ui().kv([['R_L', !isFinite(rr) ? MC.t('เปิดวงจร (∞)', 'open (∞)') : rr <= 0 ? MC.t('ลัดวงจร (0)', 'short (0)') : CK.eng(rr, 'Ω', 4)], [MC.t('I_L วงจรจริง', 'I_L real'), CK.eng(a, 'A', 4)], [MC.t('I_L วงจรสมมูล', 'I_L equivalent'), CK.eng(b, 'A', 4)], [MC.t('V_L วงจรจริง', 'V_L real'), CK.eng(va, 'V', 4)], [MC.t('V_L วงจรสมมูล', 'V_L equivalent'), CK.eng(vb, 'V', 4)],
      ['V_th = V_oc', CH5.txt(T.voc, 'V')], ['R_th', CH5.txt(T.rth, 'Ω')], ['I_N = I_sc', CH5.txt(T.isc, 'A')]]); }
  function frame(dt) { if (!ctx || !d) return; ctx.fillStyle = CK.PAL.bg; ctx.fillRect(0, 0, W, H);
    vN.advance(dt); vE.advance(dt); vN.draw(); vE.draw(); CH5.terminals(vN, d.spec.A, d.spec.B); CH5.terminals(vE, 'A', 'B');
    const eqLab = o.norton ? MC.t('สมมูลนอร์ตัน + R_L ตัวเดียวกัน', 'Norton equivalent + the same R_L') : MC.t('สมมูลเทวินิน + R_L ตัวเดียวกัน', 'Thévenin equivalent + the same R_L');
    ctx.save(); ctx.strokeStyle = '#262c4a'; ctx.beginPath(); if (B.narrow) { ctx.moveTo(8, B.e.y - 32); ctx.lineTo(W - 8, B.e.y - 32); } else { ctx.moveTo(W * 0.58, 30); ctx.lineTo(W * 0.58, B.plot.y - 6); } ctx.stroke(); ctx.restore();
    CK.badge(ctx, MC.t('วงจรจริง + R_L', 'real network + R_L'), 'ok', 8, 6); if (B.narrow) CK.badge(ctx, eqLab, 'ok', 8, B.e.y - 28); else CK.badge(ctx, eqLab, 'ok', W * 0.58 + 8, 6);
    plotVI(); }
  function plotVI() { const voc = +T.voc, isc = +T.isc; const mA = Math.abs(isc) < 0.5; const k = mA ? 1000 : 1;
    const xs = [0, isc * k].sort((a, b) => a - b), ys = [0, voc].sort((a, b) => a - b); const xr = xs[1] - xs[0] || 1, yr = ys[1] - ys[0] || 1;
    const p = new DRAW.Plot(ctx, B.plot, { xlim: [xs[0] - 0.12 * xr, xs[1] + 0.12 * xr], ylim: [ys[0] - 0.16 * yr, ys[1] + 0.16 * yr], title: B.narrow ? MC.t('เส้น V–I ที่ขั้ว AB (เส้นเดียวกันทั้งสองวงจร)', 'V–I line at AB (one line for both)') : MC.t('เส้นลักษณะ V–I ที่ขั้ว AB: วงจรจริงกับวงจรสมมูลมีเส้นเดียวกัน', 'terminal V–I line at AB: the real network and its equivalent share one line'), xlabel: `I_L (${mA ? 'mA' : 'A'})`, ylabel: 'V_L (V)', ml: 60, mr: B.narrow ? 12 : 250 });
    p.frame(); p.line([0, isc * k], [voc, 0], { color: BLUE, width: 2.4 });
    const r = RL(); const iL = net.I('RL').re, vL = net.Vab('RL').re; const ext = Math.max(Math.abs(xs[0]), Math.abs(xs[1])) * 2 * (Math.sign(isc) || 1);
    if (!isFinite(r)) p.line([0, 0], [-1e9, 1e9], { color: ORANGE, width: 1.6, dash: [6, 4] }); else p.line([0, ext], [0, ext / k * r], { color: ORANGE, width: 1.6, dash: [6, 4] });
    p.marker(isc * k, 0, { type: 'dot', r: 4.5, color: '#e8ecf7' }); p.marker(0, voc, { type: 'dot', r: 4.5, color: '#e8ecf7' });
    p.text(0, voc, `  V_oc = ${CH5.txt(T.voc, 'V')}`, { color: BLUE, size: 12.5, dy: voc >= 0 ? -7 : 16 }); p.text(isc * k, 0, `I_sc = ${CH5.txt(T.isc, 'A')}`, { color: BLUE, size: 12.5, align: isc >= 0 ? 'right' : 'left', dx: isc >= 0 ? 4 : -4, dy: voc >= 0 ? 17 : -9 });
    p.marker(iL * k, vL, { type: 'o', r: 7, color: PINK, width: 2.6 }); p.marker(eq.I('RL').re * k, eq.Vab('RL').re, { type: 'dot', r: 3, color: GREEN });
    const items = [{ label: MC.t('แหล่งจ่าย: V = V_th − R_th·I', 'source: V = V_th − R_th·I'), color: BLUE }, { label: MC.t('โหลด: V = R_L·I', 'load: V = R_L·I'), color: ORANGE, dash: [6, 4] }, { label: MC.t('จุดทำงาน: จริง ○ สมมูล •', 'real ○  equivalent •'), color: PINK }];
    if (B.narrow) return; items.forEach((it, i) => { const y = p.py + 18 + i * 22, x = p.px + p.pw + 14; DRAW.line(ctx, x, y - 4, x + 16, y - 4, { color: it.color, width: 2.5, dash: it.dash }); DRAW.text(ctx, it.label, x + 22, y, { size: 12.5, color: it.color, th: /[ก-๙]/.test(it.label) }); }); }
  if (o.keys.length > 1) { ui().h2(panel, MC.t('เครือข่าย', 'Network')); ui().radio(panel, o.keys.map(k => ({ id: `${o.cv}_${k}`, label: k, on: k === S.key })), id => { S.key = id.slice(o.cv.length + 1); build(); }); }
  ui().h2(panel, MC.t('ความต้านทานโหลด', 'Load resistance'));
  const sl = ui().slider(panel, { id: o.cv + '_rl', label: 'R_L / R_th', min: -3, max: 3, step: 0.01, value: 0, fmt: v => (v <= -2.99 ? MC.t('≈ ลัดวงจร', '≈ short') : v >= 2.99 ? MC.t('≈ เปิดวงจร', '≈ open') : `× ${ALG.fmtDec(Math.pow(10, v), 3)}`), oninput: v => { S.s = v; update(); } });
  ui().buttons(panel, [{ label: MC.t('ลัดวงจร', 'short'), onclick: () => { S.s = -3; sl.set(-3); update(); } }, { label: 'R_L = R_th', onclick: () => { S.s = 0; sl.set(0); update(); } },
    { label: MC.t('ตามโจทย์', 'as given'), onclick: () => { S.s = d.load ? Math.log10(d.load.R / +T.rth) : 0; sl.set(S.s); update(); } }, { label: MC.t('เปิดวงจร', 'open'), onclick: () => { S.s = 3; sl.set(3); update(); } }]);
  const out = ui().metrics(panel);
  ui().html(panel, MC.t('เลื่อน R_L แล้วดูว่า <b>กระแสและแรงดันที่โหลดเท่ากันทุกค่า</b> ทั้งที่วงจรซ้ายมีอุปกรณ์มากกว่ามาก จุดทำงานวิ่งอยู่บนเส้นตรงเส้นเดียว ปลายเส้นคือ V_oc (เปิดวงจร) และ I_sc (ลัดวงจร)', 'Slide R_L and see that <b>the load current and voltage are equal for every value</b>, though the left circuit has many more parts. The operating point moves on one straight line whose ends are V_oc (open circuit) and I_sc (short circuit).'), 'hint');
  return { build, resize, frame };
};

/* =====================================================================================================================
   source transformation demo (page 5.3, section A): v_s in series with R_s  ⇄  i_s = v_s/R_s in parallel with R_s */
CH5.srcDemo = o => {
  const cv = document.getElementById(o.cv), panel = document.getElementById(o.panel); const S = { vs: 12, rs: 4, rl: 8 }; let ctx, W = 0, H = 0;
  const a = new CK.Circuit({ ground: 'b', nodes: { t: [0, 0], A: [3.4, 0], b: [0, 3], B: [3.4, 3] }, parts: [{ id: 'Vs', type: 'V', a: 't', b: 'b', value: 1, name: 'v_s', side: -1 }, { id: 'Rs', type: 'R', a: 't', b: 'A', value: 1, name: 'R_s', side: 1 }, { id: 'wb', type: 'W', a: 'b', b: 'B' }, { id: 'RL', type: 'R', a: 'A', b: 'B', value: 1, name: 'R_L', side: 1 }] });
  const b = new CK.Circuit({ ground: 'b', nodes: { t: [0, 0], n: [1.9, 0], A: [3.6, 0], b: [0, 3], nb: [1.9, 3], B: [3.6, 3] }, parts: [{ id: 'Is', type: 'I', a: 'b', b: 't', value: 1, name: 'i_s', side: -1 }, { id: 'w1', type: 'W', a: 't', b: 'n' }, { id: 'Rs', type: 'R', a: 'n', b: 'nb', value: 1, name: 'R_s', side: 1 }, { id: 'w2', type: 'W', a: 'n', b: 'A' }, { id: 'w3', type: 'W', a: 'b', b: 'nb' }, { id: 'w4', type: 'W', a: 'nb', b: 'B' }, { id: 'RL', type: 'R', a: 'A', b: 'B', value: 1, name: 'R_L', side: 1 }] });
  const va = new CK.View(cv, a, { speed: 22, minV: 5, ground: false, showI: true, pad: 1.4, tips: true }), vb = new CK.View(cv, b, { speed: 22, minV: 5, ground: false, showI: true, pad: 1.4, tips: true });
  function update() { const is = S.vs / S.rs;
    a.set('Vs', 'value', S.vs).set('Rs', 'value', S.rs); a.part('Vs').valText = CK.eng(S.vs, 'V', 3); a.part('Rs').valText = CK.eng(S.rs, 'Ω', 3); CH5.setLoad(a, S.rl);
    b.set('Is', 'value', is).set('Rs', 'value', S.rs); b.part('Is').valText = CK.eng(is, 'A', 3); b.part('Rs').valText = CK.eng(S.rs, 'Ω', 3); CH5.setLoad(b, S.rl);
    a.solve(); b.solve();
    out.innerHTML = ui().kv([['i_s = v_s / R_s', CK.eng(is, 'A', 4)], [MC.t('I_L ซ้าย / ขวา', 'I_L left / right'), `${CK.eng(a.I('RL').re, 'A', 4)} / ${CK.eng(b.I('RL').re, 'A', 4)}`], [MC.t('V_L ซ้าย / ขวา', 'V_L left / right'), `${CK.eng(a.Vab('RL').re, 'V', 4)} / ${CK.eng(b.Vab('RL').re, 'V', 4)}`],
      [MC.t('P ใน R_s ซ้าย / ขวา', 'P in R_s left / right'), `${CK.eng(a.P('Rs'), 'W', 3)} / ${CK.eng(b.P('Rs'), 'W', 3)}`]]); }
  const two = CH5.two(cv, w => Math.round(Math.max(250, Math.min(380, w * 0.42))), w => Math.round(w * 0.62));
  function resize() { const L = two.layout(); ctx = L.ctx; W = L.W; H = L.H; va.ctx = ctx; vb.ctx = ctx; va.fit(L.a); vb.fit(L.b); }
  function frame(dt) { if (!ctx) return; ctx.fillStyle = CK.PAL.bg; ctx.fillRect(0, 0, W, H); va.advance(dt); vb.advance(dt); va.draw(); vb.draw(); CH5.terminals(va, 'A', 'B'); CH5.terminals(vb, 'A', 'B');
    const short = two.narrow || two.W < 900;   // the long names need half of a wide canvas
    two.chrome(ctx, short ? MC.t('v_s อนุกรม R_s', 'v_s in series with R_s') : MC.t('แหล่งจ่ายแรงดันจริง: v_s อนุกรม R_s', 'practical voltage source: v_s in series with R_s'), short ? MC.t('i_s ขนาน R_s', 'i_s in parallel with R_s') : MC.t('แหล่งจ่ายกระแสจริง: i_s ขนาน R_s', 'practical current source: i_s in parallel with R_s')); }
  ui().h2(panel, MC.t('แหล่งจ่าย', 'Source'));
  ui().slider(panel, { id: o.cv + '_vs', label: 'v_s', min: 1, max: 24, step: 1, value: S.vs, fmt: v => `${v} V`, oninput: v => { S.vs = v; update(); } });
  ui().slider(panel, { id: o.cv + '_rs', label: 'R_s', min: 1, max: 20, step: 1, value: S.rs, fmt: v => `${v} Ω`, oninput: v => { S.rs = v; update(); } });
  ui().h2(panel, MC.t('โหลด', 'Load'));
  const sl = ui().slider(panel, { id: o.cv + '_rl', label: 'R_L', min: 0, max: 60, step: 0.5, value: S.rl, fmt: v => (v >= 60 ? MC.t('เปิดวงจร', 'open') : v <= 0 ? MC.t('ลัดวงจร', 'short') : `${v} Ω`), oninput: v => { S.rl = v <= 0 ? 0 : v >= 60 ? Infinity : v; update(); } });
  ui().buttons(panel, [{ label: MC.t('ลัดวงจร', 'short'), onclick: () => { sl.set(0); S.rl = 0; update(); } }, { label: 'R_L = R_s', onclick: () => { sl.set(S.rs); S.rl = S.rs; update(); } }, { label: MC.t('เปิดวงจร', 'open'), onclick: () => { sl.set(60); S.rl = Infinity; update(); } }]);
  const out = ui().metrics(panel);
  ui().html(panel, MC.t('สองวงจรให้ <b>กระแสและแรงดันที่โหลดเท่ากันทุกค่า</b> แต่ <b>ข้างในไม่เหมือนกัน</b>: กด "เปิดวงจร" แล้ววงจรซ้ายไม่มีกระแสใน R_s เลย ส่วนวงจรขวามี i_s ไหลวนอยู่ใน R_s ตลอด จึงสมมูลกันเฉพาะ "ที่ขั้ว"', 'The two circuits give <b>the same load current and voltage for every load</b>, yet <b>the insides differ</b>: press "open" and the left R_s carries nothing while the right one keeps i_s circulating. They are equivalent only "at the terminals".'), 'hint');
  update();
  return { resize, frame };
};

/* =====================================================================================================================
   Δ–Y demo (page 5.2, section B): Hayt Example 5.12, a bridge with no series or parallel pair */
CH5.dyDemo = o => {
  const cv = document.getElementById(o.cv), panel = document.getElementById(o.panel); const S = { a: 1, b: 4, c: 3, Vs: 10 }; let ctx, W = 0, H = 0;
  const base = () => ({ ground: 'sb', nodes: { st: [0, 0], T: [3, 0], L: [1.5, 2], R: [4.5, 2], Bt: [3, 4], sb: [0, 4] },
    parts: [{ id: 'Vs', type: 'V', a: 'st', b: 'sb', value: S.Vs, name: `${S.Vs} V`, valText: '', side: -1 }, { id: 'w1', type: 'W', a: 'st', b: 'T' }, { id: 'w2', type: 'W', a: 'sb', b: 'Bt' },
      { id: 'R2', type: 'R', a: 'L', b: 'Bt', value: 2, name: '2 Ω', valText: '', side: -1, bodyLen: 0.9 }, { id: 'R5', type: 'R', a: 'R', b: 'Bt', value: 5, name: '5 Ω', valText: '', side: 1, bodyLen: 0.9 }] });
  const sum = () => S.a + S.b + S.c, yT = () => S.a * S.b / sum(), yL = () => S.a * S.c / sum(), yR = () => S.b * S.c / sum(); const fmt = x => `${ALG.fmtDec(x, 3)} Ω`;
  const sd = base(); sd.parts.push({ id: 'Ra', type: 'R', a: 'T', b: 'L', value: 1, side: -1, bodyLen: 0.9, valText: '' }, { id: 'Rb', type: 'R', a: 'T', b: 'R', value: 1, side: 1, bodyLen: 0.9, valText: '' }, { id: 'Rc', type: 'R', a: 'L', b: 'R', value: 1, side: -1, bodyLen: 0.9, valText: '' });
  const sy = base(); sy.nodes.Y = [3, 1.25]; sy.parts.push({ id: 'RT', type: 'R', a: 'T', b: 'Y', value: 1, label: false, bodyLen: 0.7, color: GREEN }, { id: 'RLy', type: 'R', a: 'L', b: 'Y', value: 1, label: false, bodyLen: 0.7, color: GREEN }, { id: 'RRy', type: 'R', a: 'R', b: 'Y', value: 1, label: false, bodyLen: 0.7, color: GREEN });
  const c1 = new CK.Circuit(sd), c2 = new CK.Circuit(sy);
  const v1 = new CK.View(cv, c1, { speed: 16, minV: 5, ground: false, showI: false, pad: 1.7, tips: true }), v2 = new CK.View(cv, c2, { speed: 16, minV: 5, ground: false, showI: false, pad: 1.7, tips: true });
  v1.o.glow = new Set(['Ra', 'Rb', 'Rc']); v1.o.glowColor = 'rgba(255,193,77,.30)'; v2.o.glow = new Set(['RT', 'RLy', 'RRy']); v2.o.glowColor = 'rgba(126,231,135,.30)';
  function update() { [['Ra', S.a], ['Rb', S.b], ['Rc', S.c]].forEach(([id, r]) => { c1.set(id, 'value', r); c1.part(id).name = fmt(r); });
    [['RT', yT()], ['RLy', yL()], ['RRy', yR()]].forEach(([id, r]) => c2.set(id, 'value', r)); c1.solve(); c2.solve();
    const rin1 = S.Vs / -c1.I('Vs').re, rin2 = S.Vs / -c2.I('Vs').re;
    out.innerHTML = ui().kv([['R_in (Δ)', fmt(rin1)], ['R_in (Y)', fmt(rin2)], [MC.t('I ใน 2 Ω (Δ / Y)', 'I in 2 Ω (Δ / Y)'), `${CK.eng(c1.I('R2').re, 'A', 4)} / ${CK.eng(c2.I('R2').re, 'A', 4)}`], [MC.t('I ใน 5 Ω (Δ / Y)', 'I in 5 Ω (Δ / Y)'), `${CK.eng(c1.I('R5').re, 'A', 4)} / ${CK.eng(c2.I('R5').re, 'A', 4)}`]]);
    if (o.live) { const s = sum(), lv = document.getElementById(o.live); lv.innerHTML = MC.tex(CH5.fitIn(lv, `\\begin{aligned} R_T &= \\frac{(${S.a})(${S.b})}{${S.a} + ${S.b} + ${S.c}} = ${ALG.fmtDec(yT(), 4)}\\ \\Omega \\\\ R_L &= \\frac{(${S.a})(${S.c})}{${s}} = ${ALG.fmtDec(yL(), 4)}\\ \\Omega \\\\ R_R &= \\frac{(${S.b})(${S.c})}{${s}} = ${ALG.fmtDec(yR(), 4)}\\ \\Omega \\end{aligned}`), true) +
      MC.tex(CH5.fitIn(lv, `R_{in} = \\left[(R_L + 2) \\parallel (R_R + 5)\\right] + R_T = ${ALG.fmtDec(rin2, 4)}\\ \\Omega`), true); } }
  const two = CH5.two(cv, w => Math.round(Math.max(270, Math.min(400, w * 0.44))), w => Math.round(w * 0.78)); CH5.onFonts(() => update());
  function resize() { const L = two.layout(); ctx = L.ctx; W = L.W; H = L.H; v1.ctx = ctx; v2.ctx = ctx; v1.fit(L.a); v2.fit(L.b); }
  const lab = (t, val, gx, gy, al) => { const [x, y] = v2.P([gx, gy]); const sz = Math.max(11.5, Math.min(13.5, v2.u * 0.3)); v2.text(t, x, y - sz * 0.6, { align: al, color: GREEN, size: sz, weight: '700' }); v2.text(val, x, y + sz * 0.6, { align: al, color: GREEN, size: sz * 0.95 }); };
  function frame(dt) { if (!ctx) return; ctx.fillStyle = CK.PAL.bg; ctx.fillRect(0, 0, W, H); v1.advance(dt); v2.advance(dt); v1.draw(); v2.draw();
    lab('R_T', fmt(yT()), 3.22, 0.5, 'left'); lab('R_L', fmt(yL()), 1.95, 1.05, 'right'); lab('R_R', fmt(yR()), 4.05, 1.05, 'left');
    two.chrome(ctx, MC.t('เดลตา (Δ) ด้านบน 3 ตัวที่เรืองแสง', 'the upper delta (Δ): the 3 glowing'), MC.t('แปลงเป็นสตาร์ (Y): กระแสใน 2 Ω, 5 Ω เท่าเดิม', 'as a wye (Y): same currents in 2 Ω and 5 Ω'), 'wait'); }
  ui().h2(panel, MC.t('เดลตาด้านบน', 'Upper delta'));
  const sa = ui().slider(panel, { id: o.cv + '_a', label: MC.t('T–L (ซ้ายบน)', 'T–L (top left)'), min: 1, max: 12, step: 1, value: S.a, fmt: v => `${v} Ω`, oninput: v => { S.a = v; update(); } });
  const sb = ui().slider(panel, { id: o.cv + '_b', label: MC.t('T–R (ขวาบน)', 'T–R (top right)'), min: 1, max: 12, step: 1, value: S.b, fmt: v => `${v} Ω`, oninput: v => { S.b = v; update(); } });
  const sc = ui().slider(panel, { id: o.cv + '_c', label: MC.t('L–R (กลาง)', 'L–R (middle)'), min: 1, max: 12, step: 1, value: S.c, fmt: v => `${v} Ω`, oninput: v => { S.c = v; update(); } });
  ui().buttons(panel, [{ label: MC.t('ค่าของ Hayt (1, 4, 3 Ω)', 'Hayt values (1, 4, 3 Ω)'), onclick: () => { S.a = 1; S.b = 4; S.c = 3; sa.set(1); sb.set(4); sc.set(3); update(); } }]);
  const out = ui().metrics(panel);
  update();
  return { resize, frame };
};

/* =====================================================================================================================
   maximum power transfer (page 5.4, section A): V_th, R_th and a lamp load; P_L(R_L) curve and efficiency.
   prPlot options: curve / peak (default true) draw the predicted curve and R_L = R_th, P_max; trail = measured [R_L, P] points */
CH5.pCurve = (Vth, Rth, xmax, n = 240) => { const xs = [], ys = [], es = []; for (let i = 1; i <= n; i++) { const r = xmax * i / n; xs.push(r); ys.push(Vth * Vth * r / Math.pow(Rth + r, 2)); es.push(r / (r + Rth)); } return { xs, ys, es }; };
CH5.prPlot = (ctx, box, o) => { const { Vth, Rth, RL, P } = o; const xmax = o.xmax ?? 6 * Rth, pm = Vth * Vth / (4 * Rth); const cu = CH5.pCurve(Vth, Rth, xmax); const k = o.kx || 1, unitR = o.unitR || 'Ω', ky = o.ky || 1, unitP = o.unitP || 'W';
  const p = new DRAW.Plot(ctx, box, { xlim: [0, xmax * k], ylim: [0, pm * ky * 1.2], title: o.title, xlabel: `R_L (${unitR})`, ylabel: `P_L (${unitP})`, ml: 58, mr: o.eta ? 44 : 14 });
  const curve = o.curve !== false, peak = o.peak !== false;
  p.frame(); if (peak) p.vline(Rth * k, { color: GREEN, label: 'R_L = R_th' }); if (curve) p.line(cu.xs.map(x => x * k), cu.ys.map(y => y * ky), { color: AMBER, width: 2.6 });
  if (o.eta) { p.line(cu.xs.map(x => x * k), cu.es.map(e => e * pm * ky * 1.2), { color: BLUE, width: 1.6, dash: [6, 4] }); for (let j = 0; j <= 4; j++) DRAW.text(ctx, `${j * 25}%`, p.px + p.pw + 4, p.toY(j * 0.25 * pm * ky * 1.2) + 4, { size: 11, color: BLUE }); }
  if (peak) p.hline(pm * ky, { color: GREEN, label: `P_max = ${CK.eng(pm, 'W', 4)}`, labelLeft: true });
  (o.trail || []).forEach(([r, w]) => { if (r <= xmax) p.marker(r * k, w * ky, { type: 'dot', r: 2.6, color: 'rgba(255,126,182,.55)' }); });
  if (RL !== undefined && RL !== null) p.marker(Math.min(RL, xmax) * k, (P ?? Vth * Vth * RL / Math.pow(Rth + RL, 2)) * ky, { type: 'o', r: 7, color: PINK, width: 2.6, force: true });
  (o.marks || []).forEach(m => p.marker(m.r * k, Vth * Vth * m.r / Math.pow(Rth + m.r, 2) * ky, { type: 'dot', r: 4.5, color: m.color || '#e8ecf7' }));
  if (o.eta) p.legend([{ label: 'P_L', color: AMBER }, { label: 'η = R_L/(R_L + R_th)', color: BLUE, dash: [6, 4] }], { x: p.px + p.pw - 6, y: p.py + 30 });
  return p; };
CH5.mpDemo = o => {
  const cv = document.getElementById(o.cv), panel = document.getElementById(o.panel); const S = { V: 12, R: 6, f: 1 }; let ctx, W = 0, H = 0; const B = {};
  const RL = () => Math.max(1e-3, S.R * S.f), pmax = () => S.V * S.V / (4 * S.R);
  const c = new CK.Circuit({ ground: 'b', nodes: { t: [0, 0], A: [3.2, 0], b: [0, 3], B: [3.2, 3] }, parts: [{ id: 'V', type: 'V', a: 't', b: 'b', value: 1, name: 'V_{th}', side: -1 }, { id: 'R', type: 'R', a: 't', b: 'A', value: 1, name: 'R_{th}', side: 1 }, { id: 'w', type: 'W', a: 'b', b: 'B' }, { id: 'RL', type: 'lamp', a: 'A', b: 'B', value: 1, name: 'R_L', side: 1 }] });
  const v = new CK.View(cv, c, { speed: 26, minV: 5, ground: false, showI: true, pad: 1.5, tips: true });
  function update() { const r = RL(); c.set('V', 'value', S.V).set('R', 'value', S.R).set('RL', 'value', r); c.part('V').valText = `${S.V} V`; c.part('R').valText = `${S.R} Ω`; c.part('RL').valText = CK.eng(r, 'Ω', 3); c.part('RL').rated = pmax(); c.solve();
    const i = c.I('RL').re, p = c.P('RL'), eta = r / (r + S.R);
    out.innerHTML = ui().kv([['R_L', CK.eng(r, 'Ω', 4)], ['I_L', CK.eng(i, 'A', 4)], ['V_L', CK.eng(c.Vab('RL').re, 'V', 4)], ['P_L', CK.eng(p, 'W', 4)], ['P_max = V_th²/(4R_th)', CK.eng(pmax(), 'W', 4)], [MC.t('P_L / P_max', 'P_L / P_max'), `${ALG.fmtDec(100 * p / pmax(), 1)} %`], [MC.t('ประสิทธิภาพ η', 'efficiency η'), `${ALG.fmtDec(100 * eta, 1)} %`]]); }
  function resize() { const w0 = Math.max(320, Math.floor(cv.parentElement.clientWidth - 12)), wide = w0 >= 720; B.wide = wide; const r = fitCanvas(cv, w => wide ? Math.round(Math.max(300, Math.min(400, w * 0.4))) : Math.round(w * 0.6 + 280)); ctx = r.ctx; W = r.w; H = r.h;
    if (wide) { B.c = { x: 4, y: 36, w: W * 0.36, h: H - 40 }; B.p = { x: W * 0.38, y: 6, w: W * 0.62 - 8, h: H - 12 }; } else { B.c = { x: 4, y: 36, w: W - 8, h: W * 0.6 - 40 }; B.p = { x: 6, y: W * 0.6 + 4, w: W - 12, h: 270 }; }
    v.ctx = ctx; v.fit(B.c); }
  function frame(dt) { if (!ctx) return; ctx.fillStyle = CK.PAL.bg; ctx.fillRect(0, 0, W, H); v.advance(dt); v.draw(); CH5.terminals(v, 'A', 'B');
    CK.badge(ctx, MC.t('หลอดสว่างที่สุดเมื่อ R_L = R_th', 'the lamp is brightest when R_L = R_th'), Math.abs(S.f - 1) < 0.02 ? 'ok' : 'wait', 8, 6);
    CH5.prPlot(ctx, B.p, { Vth: S.V, Rth: S.R, RL: RL(), P: c.P('RL'), eta: true, title: B.wide ? MC.t('กำลังที่โหลด P_L และประสิทธิภาพ η เทียบกับ R_L', 'load power P_L and efficiency η versus R_L') : MC.t('P_L และ η เทียบกับ R_L', 'P_L and η versus R_L') }); }
  ui().h2(panel, MC.t('แหล่งจ่าย (วงจรสมมูลเทวินิน)', 'Source (Thévenin equivalent)'));
  ui().slider(panel, { id: o.cv + '_v', label: 'V_th', min: 1, max: 24, step: 1, value: S.V, fmt: x => `${x} V`, oninput: x => { S.V = x; update(); } });
  ui().slider(panel, { id: o.cv + '_r', label: 'R_th', min: 1, max: 20, step: 1, value: S.R, fmt: x => `${x} Ω`, oninput: x => { S.R = x; update(); } });
  ui().h2(panel, MC.t('โหลด', 'Load'));
  const sl = ui().slider(panel, { id: o.cv + '_rl', label: 'R_L / R_th', min: 0, max: 6, step: 0.01, value: S.f, fmt: x => `× ${ALG.fmtDec(x, 2)}`, oninput: x => { S.f = x; update(); } });
  ui().buttons(panel, [{ label: 'R_L = R_th', cls: 'on', onclick: () => { S.f = 1; sl.set(1); update(); } }, { label: 'R_L = R_th / 4', onclick: () => { S.f = 0.25; sl.set(0.25); update(); } }, { label: 'R_L = 4 R_th', onclick: () => { S.f = 4; sl.set(4); update(); } }]);
  const out = ui().metrics(panel);
  update();
  return { resize, frame };
};

global.CH5 = CH5;
})(window);
