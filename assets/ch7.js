/* ch7.js — chapter 7: AC circuit analysis (nodal, mesh, superposition, Thévenin/Norton, phasor diagrams).
   Builds on ch6.js (phasor plane, waveforms, Trio, quiz, sine-referenced clock) and ch7_circuits.js (the circuits).
   1) canvas overlays: killed-source ghosts, node tags, terminals A/B, the "looking into AB" arrow, crossed-out parts
   2) Grid: several AC circuits on one canvas (2 columns when wide, stacked on phones), each at its own ω on one shared clock;
      a panel with `sum: [k, …]` moves its dots with the sum of those panels' currents (superposition of different frequencies)
   3) small TeX helpers for the step lists */
(function (global) {
'use strict';
const CH7 = {};
const Cx = CK.Cx, cx = Cx.c, COL = CH6.COL, T = CH6.text, AMBER = '#ffd166', PINK = '#ff7eb6', RED = '#ff6b6b';
const tt = p => (p ? (Array.isArray(p) ? MC.t(p[0], p[1]) : p) : '');

/* =====================================================================================================================
   overlays */
const isVert = (v, p) => { const A = v.P(p.a), B = v.P(p.b); return Math.abs(B[1] - A[1]) > Math.abs(B[0] - A[0]); };
/* a source that has been killed: dashed circle and "0 V · short" / "0 A · open" (p.ghost = 'V' | 'I') */
CH7.ghost = (v, p) => {
  const A = v.P(p.a), B = v.P(p.b), u = v.u, ctx = v.ctx, mx = (A[0] + B[0]) / 2, my = (A[1] + B[1]) / 2, r = u * 0.42;
  ctx.save(); ctx.setLineDash([4, 4]); ctx.strokeStyle = 'rgba(255,209,102,.8)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(mx, my, r, 0, 2 * Math.PI); ctx.stroke(); ctx.restore();
  const t1 = p.ghost === 'V' ? '0 V' : '0 A', t2 = p.ghost === 'V' ? MC.t('ลัด', 'short') : MC.t('เปิด', 'open'), sz = Math.max(11.5, Math.min(13.5, u * 0.3)), side = p.ghostSide || p.side || 1;
  if (isVert(v, p)) { const x = mx + side * (r + 4), al = side > 0 ? 'left' : 'right'; T(ctx, t1, x, my - sz * 0.62, { align: al, color: AMBER, size: sz, weight: '700' }); T(ctx, t2, x, my + sz * 0.62, { align: al, color: AMBER, size: sz * 0.95 }); }
  else T(ctx, `${t1} · ${t2}`, mx, my - side * (r + sz * 0.8), { color: AMBER, size: sz, weight: '700' });
};
CH7.ghosts = v => v.ckt.parts.forEach(p => { if (p.ghost) CH7.ghost(v, p); });
CH7.terminals = (v, A, B, o = {}) => { const u = v.u, r = Math.max(4, u * 0.1), ctx = v.ctx;
  [[A, 'A'], [B, 'B']].forEach(([n, l]) => { if (!n) return; const [x, y] = v.P(n);
    ctx.save(); ctx.fillStyle = '#0f1220'; ctx.strokeStyle = o.color || '#e8ecf7'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, r, 0, 2 * Math.PI); ctx.fill(); ctx.stroke(); ctx.restore();
    T(ctx, l, x + (o.dx ?? 0.34) * u, y + (l === 'A' ? -1 : 1) * 0.3 * u, { color: o.color || '#e8ecf7', size: Math.max(13, u * 0.34), weight: '700' }); }); };
CH7.eye = (v, A, B, label, o = {}) => { const a = v.P(A), b = v.P(B), u = v.u, y = (a[1] + b[1]) / 2, x1 = a[0] + u * (o.far ?? 1.9), x2 = a[0] + u * 0.55, ctx = v.ctx;
  ctx.save(); ctx.strokeStyle = PINK; ctx.fillStyle = PINK; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x2, y); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x2, y); ctx.lineTo(x2 + 9, y - 6); ctx.lineTo(x2 + 9, y + 6); ctx.closePath(); ctx.fill(); ctx.restore();
  T(ctx, label, (x1 + x2) / 2, y - 14, { color: PINK, size: Math.max(13, u * 0.32), weight: '700' }); };
CH7.dead = (v, id) => { const p = v.ckt.part(id); if (!p) return; const A = v.P(p.a), B = v.P(p.b), x = (A[0] + B[0]) / 2, y = (A[1] + B[1]) / 2, r = v.u * 0.38, ctx = v.ctx;
  ctx.save(); ctx.strokeStyle = RED; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - r, y - r); ctx.lineTo(x + r, y + r); ctx.moveTo(x - r, y + r); ctx.lineTo(x + r, y - r); ctx.stroke(); ctx.restore(); };
/* a tag next to a node (node voltages such as V_1) */
CH7.nodeTag = (v, node, text, col = COL.purple, o = {}) => { const [x, y] = v.P(node); CH6.tag(v.ctx, text, x + (o.dx ?? 0.28) * v.u, y + (o.dy ?? -0.45) * v.u, col, { align: o.align || 'left', size: o.size || 13 }); };

/* =====================================================================================================================
   Grid: AC panels on one canvas.
   items: [{spec, title, sub, focus, pad, after(view, item), sum: [indices], dim}]   o: {clock, aspect, cols2At (px, default 700), view (extra View options), cell(ctx, box) for an extra
   cell after the panels, extra: {h(W) → px, draw(ctx, box)} for a full-width box under the grid, speed} */
CH7.Grid = class {
  constructor(cv, o = {}) { this.cv = typeof cv === 'string' ? document.getElementById(cv) : cv; this.o = o; this.clk = o.clock || CH6.clock({ T: 4 }); this.items = []; }
  set(items) {
    this.items = items.map(it => { const c = new CK.Circuit(it.spec); c.solve(); return { ...it, ckt: c }; });
    let im = 0; this.items.forEach(it => { if (!it.sum) im = Math.max(im, CH6.imax(it.ckt)); });
    this.items.forEach(it => {
      const v = new CK.View(this.cv, it.ckt, Object.assign({ speed: (this.o.speed || 90) / Math.max(im, 1e-9), ground: false, showI: false, pad: it.pad ?? 1.5, tips: !it.sum, acPeak: true,
        acTime: () => this.clk.at(it.ckt.w), dotMin: it.sum ? -1 : 1e-9, meter: !it.sum }, this.o.view || {}));   // a sum panel has no single circuit to measure
      if (it.sum) { const src = it.sum.map(k => this.items[k]); v.instI = id => src.reduce((s, q) => s + (q.ckt.result && q.ckt.result.I[id] ? Cx.inst(q.ckt.result.I[id], q.ckt.w, this.clk.at(q.ckt.w)) : 0), 0); }
      it.view = v; });
    this.resize();
  }
  resize() {
    if (!this.items.length) return; const W = Math.max(320, Math.floor(this.cv.parentElement.clientWidth - 12)), wide = W >= (this.o.cols2At ?? 700), m = 4, gap = 10, titleH = 42;
    const n = this.items.length + (this.o.cell ? 1 : 0), asp = this.o.aspect ?? 0.6; this.boxes = []; let y = m;
    if (wide) { const cw = Math.floor((W - 2 * m - gap) / 2), ch = Math.round(cw * asp + titleH);
      for (let k = 0; k < n; k++) { const r = Math.floor(k / 2), c = k % 2; this.boxes.push({ x: m + c * (cw + gap), y: m + r * (ch + gap), w: cw, h: ch }); }
      y = m + Math.ceil(n / 2) * (ch + gap); }
    else { const cw = W - 2 * m, ch = Math.round(cw * asp + titleH); for (let k = 0; k < n; k++) { this.boxes.push({ x: m, y, w: cw, h: ch }); y += ch + gap; } }
    if (this.o.extra) { const h = Math.round(this.o.extra.h(W)); this.extraBox = { x: m, y, w: W - 2 * m, h }; y += h + m; } else this.extraBox = null;
    this.W = W; this.H = y; this.narrow = !wide; this.ctx = CK.setup(this.cv, W, this.H);
    this.items.forEach((it, k) => { const b = this.boxes[k]; it.box = b; it.view.ctx = this.ctx; it.view.fit({ x: b.x + 2, y: b.y + titleH, w: b.w - 4, h: b.h - titleH - 4 }); });
    this.cellBox = this.o.cell ? this.boxes[this.items.length] : null;
  }
  frame(dt) {
    const ctx = this.ctx; if (!ctx) return; this.clk.tick(dt); ctx.fillStyle = CK.PAL.bg; ctx.fillRect(0, 0, this.W, this.H);
    this.items.forEach(it => { const b = it.box, v = it.view;
      ctx.save(); ctx.fillStyle = '#121629'; ctx.fillRect(b.x, b.y, b.w, b.h); ctx.restore();
      if (this.clk.run) v.advance(dt); v.draw(); CH7.ghosts(v); if (it.after) it.after(v, it);
      T(ctx, tt(it.title), b.x + 12, b.y + 15, { align: 'left', color: it.focus ? AMBER : '#e8ecf7', size: 13.5, weight: '700' });
      if (it.sub) T(ctx, tt(it.sub), b.x + 12, b.y + 33, { align: 'left', color: '#9aa3c7', size: 12.5 });
      if (it.dim) { ctx.save(); ctx.fillStyle = 'rgba(15,18,32,.5)'; ctx.fillRect(b.x, b.y, b.w, b.h); ctx.restore(); }
      ctx.save(); ctx.strokeStyle = it.focus ? AMBER : '#2a3150'; ctx.lineWidth = it.focus ? 2.4 : 1.2; ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1, 10); else ctx.rect(b.x, b.y, b.w, b.h); ctx.stroke(); ctx.restore(); });
    if (this.cellBox) this.o.cell(ctx, this.cellBox, this);
    if (this.extraBox) this.o.extra.draw(ctx, this.extraBox, this);
  }
};

/* =====================================================================================================================
   TeX helpers: complex numbers with units for the step lists */
CH7.P = (z, d = 4, ad = 3) => CH6.pol(z, d, ad);
CH7.R = (z, d = 4) => CH6.rect(z, d);
/* engineering-ish decimal for tiny coefficients: 1.25\times10^{-3} */
CH7.sci = (x, d = 4) => { if (x === 0) return '0'; const e = Math.floor(Math.log10(Math.abs(x))); if (e >= -2 && e < 6) return CH6.fd(x, d); const m = x / Math.pow(10, e); return `${CH6.fd(m, 4)}\\times 10^{${e}}`; };
CH7.rsci = z => { const re = Math.abs(z.re) < 1e-15 ? 0 : z.re, im = Math.abs(z.im) < 1e-15 ? 0 : z.im;
  if (!im) return CH7.sci(re); if (!re) return `${im < 0 ? '-' : ''}j${CH7.sci(Math.abs(im))}`; return `${CH7.sci(re)} ${im < 0 ? '-' : '+'} j${CH7.sci(Math.abs(im))}`; };

global.CH7 = CH7;
})(window);
