/* ch8.js — chapter 8: AC power and power factor.
   Builds on ch6.js (sine-referenced slow clock, phasor plane, waveforms, quiz) and ch8_circuits.js (the circuits).
   1) instantaneous values at the slow clock and p(t) curves with the absorbed (green) and returned (red) areas shaded
   2) Board: circuit with moving dots + a side panel (phasors, power triangle or power bars) + any number of waveform panels
   3) power triangle (one load, loads head to tail, before/after correction), power bars per element, an energy tank beside
      an inductor or capacitor, and an arrow that shows which way energy flows at this instant
   4) CH8.Prob (one problem on a Board, driven by the open step of its stepper), CH8.empty and CH8.wire, shared by ch8ui.js and ch9ui.js */
(function (global) {
'use strict';
const CH8 = {};
const Cx = CK.Cx, cx = Cx.c, COL = CH6.COL, T = CH6.text, fd = CH6.fd, D2R = Math.PI / 180;
const tt = p => (p ? (Array.isArray(p) ? MC.t(p[0], p[1]) : p) : '');
const GREEN = '#7ee787', RED = '#ff6b6b', AMBER = '#ffd166', PINK = '#ff7eb6', PURPLE = '#c792ea', ORANGE = '#ffa552';
/* colours of the power quantities: P green, Q purple, S pink, p(t) orange */
CH8.COL = { P: GREEN, Q: PURPLE, S: PINK, p: ORANGE, abs: 'rgba(126,231,135,.24)', ret: 'rgba(255,107,107,.26)', V: COL.V, I: COL.I };

/* =====================================================================================================================
   instantaneous values. A peak phasor z (sine reference) at clock phase ph (rad, = ωt) has the value |z| sin(ph + ∠z) */
CH8.at = (z, ph) => z.re * Math.sin(ph) + z.im * Math.cos(ph);
CH8.atDeg = (z, d) => CH8.at(z, d * D2R);
/* p(t) absorbed by a part of a solved circuit, as a function of ωt in degrees */
CH8.pOf = (c, id) => { const v = c.Vab(id), i = c.I(id); return d => CH8.atDeg(v, d) * CH8.atDeg(i, d); };
/* waveform sigs for one p(t): shaded absorbed/returned areas, the curve, and the average line P.
   o: {label, P, color, g (scale group), mag (scale: largest |p|), unit, avgLabel, w} */
CH8.pSigs = (f, o = {}) => { const g = o.g || 'p', mag = o.mag ?? 1, unit = o.unit ?? 'W', clear = 'rgba(0,0,0,0)';
  const s = [{ f: d => Math.max(f(d), 0), fill: CH8.COL.abs, color: clear, g, mag, w: 0.1 }, { f: d => Math.min(f(d), 0), fill: CH8.COL.ret, color: clear, g, mag, w: 0.1 },
    { f, color: o.color || ORANGE, label: o.label ?? 'p', unit, g, mag, w: o.w || 3 }];
  if (o.P !== undefined) s.push({ f: () => o.P, color: GREEN, dash: [7, 5], label: o.avgLabel ?? 'P', unit, g, mag, w: 2.2 });
  return s; };

/* =====================================================================================================================
   Board: circuit (dots) + side panel + waveform panels on one canvas.
   o: {side(ctx, box, board), waves: [{title (or title(board)), sigs(board), opts(board)}], after(view, board), T, pad, cktFrac, topAsp, waveAsp,
       waveMin, cktAspN, sideAspN, view (extra View options), shortSpec(spec) (phone labels; default CH6.shortLabels), dotSpeed,
       mid (layout for a column beside a solution: circuit on top, side panel + first wave panel side by side), midMin, cktAspM, rowAsp, rowMin,
       slimAt (side panels narrower than this get board.slim → short labels), wideAt (width from which the wide layout is used, default 760;
       a very wide circuit sets it high to keep the full-width circuit of the mid layout), badge(board) → [text, kind] (default: the clock state)} */
/* wide screens: invisible margin nodes so that the labels of the outermost vertical parts stay inside the circuit box
   (CH6.shortLabels does this on phones together with shorter labels) */
CH8.margins = (spec, pad = 1.2) => {
  const N = spec.nodes, xs = Object.values(N).map(q => q[0]), x0 = Math.min(...xs), x1 = Math.max(...xs), ys = Object.values(N).map(q => q[1]), ym = (Math.min(...ys) + Math.max(...ys)) / 2;
  const len = s => String(s ?? '').replace(/_\{([^}]*)\}/g, '$1').replace(/_/g, '').length; let needL = 0, needR = 0;
  spec.parts.forEach(p => { if (p.type === 'W' || p.label === false || p.hidden || !N[p.a] || !N[p.b] || Math.abs(N[p.a][0] - N[p.b][0]) > 1e-9) return;
    const v = typeof p.valText === 'string' ? p.valText : '', w = (p.labelOff || 0.62) + 0.24 * Math.max(len(p.name ?? ''), len(v)), x = N[p.a][0], side = p.side || 1;
    if (side > 0 && Math.abs(x - x1) < 1e-9) needR = Math.max(needR, w); if (side < 0 && Math.abs(x - x0) < 1e-9) needL = Math.max(needL, w); });
  const nodes = { ...N }; if (needR > pad) nodes._padR = [x1 + needR - pad, ym]; if (needL > pad) nodes._padL = [x0 - (needL - pad), ym];
  return { ...spec, nodes };
};
CH8.Board = class {
  constructor(cv, o = {}) { this.cv = typeof cv === 'string' ? document.getElementById(cv) : cv; this.o = o; this.clk = o.clock || CH6.clock({ T: o.T || 4 }); }
  set(spec, vo = {}) {
    this.spec = spec; this.vo = vo; const o = this.o;
    const sp = this.narrow ? (o.shortSpec ? o.shortSpec(spec) : CH6.shortLabels(spec, o.pad ?? 1.2)) : CH8.margins(spec, o.pad ?? 1.2);
    const c = new CK.Circuit(sp); c.solve(); this.ckt = c; const im = CH6.imax(c); this.imax = im;
    this.view = new CK.View(this.cv, c, Object.assign({ speed: (o.dotSpeed || 95) / Math.max(im, 1e-12), ground: false, showI: false, pad: o.pad ?? 1.2, tips: true,
      acPeak: true, acPower: true, dotRef: im, acTime: () => this.clk.at(c.w) }, o.view || {}, vo));
    if (this.ctx) { this.view.ctx = this.ctx; this.view.fit(this.box.ckt); }
    return c;
  }
  /* layouts: wide (W ≥ 760): circuit and side panel side by side, waves below · mid (o.mid, W ≥ midMin): circuit on top, the side
     panel and the first wave panel side by side below it (a simulation beside a solution column) · narrow: everything stacked.
     this.slim: the side panel is narrow (half of a mid layout), so its labels should be short */
  resize() {
    const o = this.o, W = Math.max(300, Math.floor(this.cv.parentElement.clientWidth - 12)), wide = W >= (o.wideAt ?? 760), mid = !wide && !!o.mid && W >= (o.midMin ?? 420), B = { waves: [] }, nW = (o.waves || []).length; let y;
    if (wide) { const top = Math.round(W * (o.topAsp ?? 0.4)), cw = o.side ? Math.round(W * (o.cktFrac ?? 0.52)) : W;
      B.ckt = { x: 0, y: 34, w: cw, h: top - 34 }; if (o.side) B.side = { x: cw + 6, y: 0, w: W - cw - 6, h: top }; y = top + 6;
      for (let k = 0; k < nW; k++) { const h = Math.max(o.waveMin ?? 170, Math.round(W * (o.waveAsp ?? 0.2))); B.waves.push({ x: 0, y, w: W, h }); y += h + 6; } }
    else if (mid) { const ch = Math.round(W * (o.cktAspM ?? 0.52)); B.ckt = { x: 0, y: 34, w: W, h: ch }; y = ch + 40;
      const pan = (o.side ? ['s'] : []).concat([...Array(nW).keys()]), rowH = Math.round(Math.max(o.rowMin ?? 230, W * (o.rowAsp ?? 0.48)));
      const put = (p, box) => { if (p === 's') B.side = box; else B.waves[p] = box; };
      if (pan.length >= 2) { const w2 = Math.floor((W - 6) / 2); put(pan[0], { x: 0, y, w: w2, h: rowH }); put(pan[1], { x: w2 + 6, y, w: W - w2 - 6, h: rowH }); y += rowH + 6; }
      else if (pan.length === 1) { put(pan[0], { x: 0, y, w: W, h: rowH }); y += rowH + 6; }
      pan.slice(2).forEach(p => { const h = Math.round(Math.max(o.waveMin ?? 170, W * 0.34)); put(p, { x: 0, y, w: W, h }); y += h + 6; }); }
    else { const ch = Math.round(W * (o.cktAspN ?? 0.72)); B.ckt = { x: 0, y: 34, w: W, h: ch }; y = ch + 40;
      if (o.side) { const h = Math.round(W * (o.sideAspN ?? 0.8)); B.side = { x: 0, y, w: W, h }; y += h + 6; }
      for (let k = 0; k < nW; k++) { const h = Math.round(Math.max(190, W * 0.6)); B.waves.push({ x: 0, y, w: W, h }); y += h + 6; } }
    this.W = W; this.H = y - 6; this.box = B; this.wide = wide; this.mid = mid; this.slim = !!(B.side && B.side.w < (o.slimAt ?? 360)); this.ctx = CK.setup(this.cv, W, this.H);
    const nw = W < 640; if (nw !== !!this.narrow) { this.narrow = nw; if (this.spec) this.set(this.spec, this.vo); }
    if (this.view) { this.view.ctx = this.ctx; this.view.fit(B.ckt); }
  }
  /* short labels wanted in the side panel and on the waves (phones, or a half-width panel) */
  get short() { return !!(this.narrow || this.slim); }
  frame(dt) {
    if (!this.ctx || !this.view) return; const ctx = this.ctx, o = this.o; this.clk.tick(dt);
    ctx.fillStyle = CK.PAL.bg; ctx.fillRect(0, 0, this.W, this.H);
    if (this.clk.run) this.view.advance(dt); this.view.draw(); if (o.after) o.after(this.view, this);
    if (this.box.side && o.side) o.side(ctx, this.box.side, this);
    (o.waves || []).forEach((w, k) => CH6.waves(ctx, this.box.waves[k], w.sigs(this), Object.assign({ now: this.clk.ph, title: tt(typeof w.title === 'function' ? w.title(this) : w.title) }, w.opts ? w.opts(this) : {})));
    const bd = o.badge ? o.badge(this) : null;   // [text, kind] from the page (e.g. "solved: the current flows"), else the clock state
    if (bd) CK.badge(ctx, tt(bd[0]), bd[1]); else CK.badge(ctx, this.clk.run ? MC.t(`▶ เล่นช้า: 1 รอบใช้ ${this.clk.T} วินาที`, `▶ slow motion: one cycle takes ${this.clk.T} s`) : MC.t('❚❚ หยุดชั่วคราว', '❚❚ paused'), this.clk.run ? 'ok' : 'wait');
  }
};

/* =====================================================================================================================
   text kept inside a box */
const textW = (ctx, s, size, weight = '') => { ctx.save(); ctx.font = `${weight} ${size}px ${/[ก-๙]/.test(s) ? '"IBM Plex Sans Thai"' : '"IBM Plex Mono"'}, monospace`.trim(); const w = ctx.measureText(String(s).replace(/_\{([^}]*)\}|_/g, '$1')).width; ctx.restore(); return w; };
CH8.textW = textW;
const lab = (ctx, s, x, y, align, col, size, b, weight = '700') => { const w = textW(ctx, s, size, weight); let xl = align === 'left' ? x : align === 'right' ? x - w : x - w / 2;
  xl = Math.max(b.x + 5, Math.min(b.x + b.w - 5 - w, xl)); const yy = Math.max(b.y + size, Math.min(b.y + b.h - size * 0.7, y)); T(ctx, s, xl, yy, { align: 'left', color: col, size, weight }); };
CH8.lab = lab;
/* default number formats for power quantities: 25 W, 21.07 kVAR */
CH8.fmt = (x, unit) => { const a = Math.abs(x); if (a < 1e-9) return `0 ${unit}`; if (a >= 1e4) return `${fd(x / 1000, 2).replace('-', '−')} k${unit}`; return `${fd(x, a >= 100 ? 1 : 2).replace('-', '−')} ${unit}`; };
CH8.cfmt = (z, unit = 'VA') => { const re = CH8.fmt(z.re, '').trim(), im = CH8.fmt(Math.abs(z.im), '').trim(), k = Math.max(Math.abs(z.re), Math.abs(z.im)) >= 1e4;
  const r = k ? `${fd(z.re / 1000, 2).replace('-', '−')}` : re, i = k ? `${fd(Math.abs(z.im) / 1000, 2)}` : im; return `${r} ${z.im < 0 ? '−' : '+'} j${i} ${k ? 'k' : ''}${unit}`; };

/* =====================================================================================================================
   power triangle(s): P to the right, Q up, S along the hypotenuse.
   o: {title, segs: [{S, from, color, label, legs (P and Q legs, default true), w, dash, arc (angle at the start), pl, ql (leg labels),
       lpos (label side, see the code)}], max: {P, Q, Qn} (fixed scale), quad (lagging/leading hints), mr (right margin, px)} */
CH8.triangle = (ctx, b, o = {}) => {
  CH6.bg(ctx, b); const top = o.title ? 30 : 10, segs = o.segs || [];
  const pts = [cx(0)]; segs.forEach(s => { const f = s.from || cx(0); pts.push(f, Cx.add(f, s.S), Cx.add(f, cx(s.S.re, 0))); });
  let x1 = Math.max(...pts.map(p => p.re)), y0 = Math.min(0, ...pts.map(p => p.im)), y1 = Math.max(0, ...pts.map(p => p.im));
  if (o.max) { x1 = Math.max(x1, o.max.P || 0); y1 = Math.max(y1, o.max.Q || 0); y0 = Math.min(y0, -(o.max.Qn || 0)); }
  const spanX = Math.max(x1, 1e-9); let spanY = y1 - y0; if (spanY < spanX * 0.18) { const add = spanX * 0.18 - spanY; y1 += add / 2; y0 -= add / 2; spanY = y1 - y0; }
  const ml = 34, mr = o.mr ?? 26, mt = top + 18, mb = 26, s = Math.min((b.w - ml - mr) / spanX, (b.h - mt - mb) / spanY);
  const ox = b.x + ml + ((b.w - ml - mr) - spanX * s) * 0.3, oy = b.y + mt + ((b.h - mt - mb) - spanY * s) / 2 + y1 * s;
  const P = z => [ox + z.re * s, oy - z.im * s];
  /* axes and the lagging/leading halves */
  ctx.save(); ctx.strokeStyle = COL.axis; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(b.x + 8, oy); ctx.lineTo(b.x + b.w - 8, oy); ctx.moveTo(ox, b.y + top + 4); ctx.lineTo(ox, b.y + b.h - 6); ctx.stroke(); ctx.restore();
  lab(ctx, 'P (W)', b.x + b.w - 10, oy + 14, 'right', COL.ink, 13, b, '600');
  if (ox - b.x > 80) lab(ctx, 'Q (VAR)', ox - 8, b.y + top + 12, 'right', COL.ink, 13, b, '600'); else lab(ctx, 'Q (VAR)', ox + 8, b.y + top + 12, 'left', COL.ink, 13, b, '600');
  if (o.quad !== false) { if (y1 > spanY * 0.12) lab(ctx, MC.t('Q > 0 · ตามหลัง (โหลดเหนี่ยวนำ)', 'Q > 0 · lagging (inductive)'), b.x + b.w - 10, oy - 12, 'right', 'rgba(199,146,234,.75)', 12, b, '600');
    if (-y0 > spanY * 0.12) lab(ctx, MC.t('Q < 0 · นำหน้า (โหลดตัวเก็บประจุ)', 'Q < 0 · leading (capacitive)'), b.x + b.w - 10, oy + 30, 'right', 'rgba(90,209,255,.75)', 12, b, '600'); }
  if (o.title) T(ctx, o.title, b.x + 10, b.y + 15, { align: 'left', color: COL.muted, size: 13 });
  segs.forEach(sg => { const f = sg.from || cx(0), e = Cx.add(f, sg.S), m = Cx.add(f, cx(sg.S.re, 0)), A = P(f), E = P(e), M = P(m), col = sg.color || PINK;
    if (sg.legs !== false) {
      if (Math.abs(sg.S.re) * s > 2) { ctx.save(); ctx.strokeStyle = GREEN; ctx.lineWidth = 2.2; ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(M[0], M[1]); ctx.stroke(); ctx.restore(); }
      if (Math.abs(sg.S.im) * s > 2) { ctx.save(); ctx.strokeStyle = PURPLE; ctx.lineWidth = 2.2; ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.moveTo(M[0], M[1]); ctx.lineTo(E[0], E[1]); ctx.stroke(); ctx.restore(); }
      if (sg.pl !== '') lab(ctx, sg.pl ?? `P = ${CH8.fmt(sg.S.re, 'W')}`, (A[0] + M[0]) / 2, A[1] + (sg.S.im >= 0 ? 15 : -12), 'center', GREEN, 13, b);
      if (sg.ql !== '' && Math.abs(sg.S.im) * s > 2) lab(ctx, sg.ql ?? `Q = ${CH8.fmt(sg.S.im, 'VAR')}`, M[0] + 8, (M[1] + E[1]) / 2, 'left', PURPLE, 13, b); }
    CH6.arrow(ctx, A[0], A[1], E[0], E[1], col, sg.w || 3.4, sg.dash);
    if (sg.label) { const dx = E[0] - A[0], dy = E[1] - A[1], L = Math.hypot(dx, dy) || 1, side = sg.lpos ?? 1, nx = dy / L * -side, ny = -dx / L * -side;
      lab(ctx, sg.label, (A[0] + E[0]) / 2 + nx * 16, (A[1] + E[1]) / 2 + ny * 16, nx < -0.3 ? 'right' : nx > 0.3 ? 'left' : 'center', col, 13.5, b); }
    if (sg.arc && Cx.abs(sg.S) * s > 20) { const a = Math.atan2(sg.S.im, sg.S.re), r = Math.min(46, Cx.abs(sg.S) * s * 0.3); ctx.save(); ctx.strokeStyle = AMBER; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(A[0], A[1], r, 0, -a, a > 0); ctx.stroke(); ctx.restore();
      lab(ctx, sg.arcText ?? `${fd(a / D2R, 2).replace('-', '−')}°`, A[0] + (r + 8) * Math.cos(a / 2), A[1] - (r + 8) * Math.sin(a / 2) + (a < 0 ? 6 : 0), 'left', AMBER, 13, b); } });
  return { P, ox, oy, s };
};

/* =====================================================================================================================
   power bars of the elements around a zero line.
   items: [{label, v (bar), avg (diamond, optional), color, sub}]   o: {title, max, unit, sum (Σ of v at the top right), fmt, note} */
CH8.bars = (ctx, b, items, o = {}) => {
  CH6.bg(ctx, b); const top = o.title ? 34 : 12, n = items.length, mb = o.sub === false ? 30 : 46, ml = 8, mr = 8, ph = b.h - top - mb, y0 = b.y + top + ph / 2;
  const max = o.max || Math.max(1e-9, ...items.map(it => Math.max(Math.abs(it.v), Math.abs(it.avg ?? 0))));
  const cw = (b.w - ml - mr) / n, bw = Math.min(44, cw * 0.46), Y = v => y0 - v / max * ph * 0.46, f = o.fmt || (v => fd(v, Math.abs(max) >= 100 ? 0 : Math.abs(max) >= 10 ? 1 : 2).replace('-', '−'));
  ctx.save(); ctx.strokeStyle = COL.grid; ctx.lineWidth = 1; [-1, -0.5, 0.5, 1].forEach(k => { ctx.beginPath(); ctx.moveTo(b.x + ml, Y(k * max)); ctx.lineTo(b.x + b.w - mr, Y(k * max)); ctx.stroke(); });
  ctx.strokeStyle = COL.axis; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(b.x + ml, y0); ctx.lineTo(b.x + b.w - mr, y0); ctx.stroke(); ctx.restore();
  if (o.title) T(ctx, o.title, b.x + 10, b.y + 15, { align: 'left', color: COL.muted, size: 13 });
  if (o.note) lab(ctx, o.note, b.x + 10, b.y + top - 6, 'left', COL.muted, 12, b, '');
  items.forEach((it, k) => { const xc = b.x + ml + cw * (k + 0.5), col = it.color || AMBER, yv = Y(it.v);
    ctx.save(); ctx.fillStyle = col; ctx.globalAlpha = 0.78; ctx.fillRect(xc - bw / 2, Math.min(y0, yv), bw, Math.abs(yv - y0)); ctx.restore();
    if (it.avg !== undefined && it.avg !== null) { const ya = Y(it.avg); ctx.save(); ctx.strokeStyle = '#e8ecf7'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(xc - bw / 2 - 5, ya); ctx.lineTo(xc + bw / 2 + 5, ya); ctx.stroke();
      ctx.fillStyle = '#e8ecf7'; ctx.beginPath(); ctx.moveTo(xc + bw / 2 + 5, ya); ctx.lineTo(xc + bw / 2 + 11, ya - 5); ctx.lineTo(xc + bw / 2 + 17, ya); ctx.lineTo(xc + bw / 2 + 11, ya + 5); ctx.closePath(); ctx.fill(); ctx.restore(); }
    const vt = it.text ?? f(it.v), up = it.v >= 0; T(ctx, vt, xc, up ? Math.max(b.y + top + 6, yv - 10) : Math.min(b.y + top + ph - 4, yv + 12), { color: col, size: 12.5, weight: '700' });
    T(ctx, it.label, xc, b.y + b.h - mb + 14, { color: COL.ink, size: cw < 62 ? 11.5 : 12.5, weight: '600' });
    if (it.sub && o.sub !== false) T(ctx, it.sub, xc, b.y + b.h - mb + 31, { color: COL.muted, size: cw < 62 ? 11 : 12 }); });
  if (o.sum) { const s = items.reduce((a, it) => a + it.v, 0); lab(ctx, `Σ = ${f(Math.abs(s) < max * 1e-9 ? 0 : s)}${o.unit ? ' ' + o.unit : ''}`, b.x + b.w - 10, b.y + 15, 'right', GREEN, 13.5, b); }
};

/* =====================================================================================================================
   circuit overlays */
/* energy tank beside a part: frac (0..1) of its peak stored energy. o: {dx, dy (grid units from the part's middle), h, color, label} */
CH8.tank = (v, id, frac, o = {}) => { const p = v.ckt.part(id); if (!p) return; const A = v.P(p.a), B = v.P(p.b), u = v.u, ctx = v.ctx, col = o.color || PURPLE;
  const x = (A[0] + B[0]) / 2 + (o.dx ?? -0.85) * u, y = (A[1] + B[1]) / 2 + (o.dy ?? 0) * u, h = (o.h ?? 1.25) * u, w = Math.max(11, 0.27 * u), fh = h * Math.max(0, Math.min(1, frac));
  ctx.save(); ctx.fillStyle = 'rgba(15,18,32,.85)'; ctx.fillRect(x - w / 2, y - h / 2, w, h); ctx.fillStyle = col; ctx.globalAlpha = 0.8; ctx.fillRect(x - w / 2, y + h / 2 - fh, w, fh);
  ctx.globalAlpha = 1; ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.strokeRect(x - w / 2, y - h / 2, w, h); ctx.restore();
  T(ctx, o.label || 'w', x, y - h / 2 - Math.max(9, u * 0.22), { color: col, size: Math.max(12, u * 0.3), weight: '700' }); };
/* which way energy flows at this instant, drawn above the wire from node `from` to node `to`: green → when p > 0, red ← when p < 0 */
CH8.flow = (v, from, to, p, o = {}) => { const A = v.P(from), B = v.P(to), u = v.u, ctx = v.ctx, y = A[1] - (o.off ?? 0.6) * u, xm = (A[0] + B[0]) / 2 + (o.dx ?? 0) * u;
  const len = Math.min(Math.abs(B[0] - A[0]) * 0.42, 1.6 * u), pos = p >= 0, col = pos ? GREEN : RED, dir = (pos ? 1 : -1) * Math.sign(B[0] - A[0] || 1);
  if (Math.abs(p) > (o.eps ?? 1e-9)) CH6.arrow(ctx, xm - dir * len / 2, y, xm + dir * len / 2, y, col, 3.2);
  T(ctx, o.text ? o.text(p) : `p = ${fd(p, 2).replace('-', '−')} W`, xm, y - Math.max(13, 0.36 * u), { color: col, size: Math.max(12.5, u * 0.3), weight: '700' }); };

/* =====================================================================================================================
   1) one circuit on a CH8.Board. o = { spec (object, or (k, self) → spec; return the same object for the same variant), steps(self),
      solvedAt (k from which the dots run, default 0), glow(k, self) → part ids, after(view, k, self), side(ctx, box, board, k, self),
      waves: [{ title(board, k, self), sigs(board, k, self), opts(board, k, self) }], badge(k, self) → [text, kind], vo(self) (extra View
      options for set), shortSpec(spec, self), tick(dt, self), init(self) (state in self.st), controls(el, self), onSet(k, self),
      layout: pad, cktFrac, topAsp, cktAspM, rowAsp, rowMin, cktAspN, sideAspN, waveAsp, waveMin, midMin } */
CH8.Prob = class {
  constructor(cv, o) { this.cv = cv; this.o = o; this.k = 0; this.colW = o.colW || 0; this.st = {}; if (o.init) o.init(this); const self = this;
    this.B = new CH8.Board(cv, { T: 4, mid: true, midMin: o.midMin ?? 420, cktAspM: o.cktAspM, rowAsp: o.rowAsp, rowMin: o.rowMin, pad: o.pad ?? 1.35,
      cktFrac: o.cktFrac ?? 0.52, topAsp: o.topAsp ?? 0.42, wideAt: o.wideAt, cktAspN: o.cktAspN, sideAspN: o.sideAspN, waveAsp: o.waveAsp, waveMin: o.waveMin, dotSpeed: o.dotSpeed,
      view: Object.assign({ glowColor: 'rgba(255,126,182,.4)' }, o.view || {}), shortSpec: o.shortSpec ? sp => o.shortSpec(sp, self) : undefined,
      side: o.side ? (ctx, b, bd) => o.side(ctx, b, bd, self.k, self) : undefined,
      waves: (o.waves || []).map(w => ({ title: bd => (w.title ? w.title(bd, self.k, self) : ''), sigs: bd => w.sigs(bd, self.k, self), opts: w.opts ? bd => w.opts(bd, self.k, self) : undefined })),
      after: v => { if (o.after) o.after(v, self.k, self); },
      badge: () => o.badge ? o.badge(self.k, self) : self.solved ? [['แก้แล้ว: กระแสไหล', 'solved: the current flows'], 'ok'] : [['ยังไม่ได้แก้วงจร', 'not solved yet'], 'wait'] });
    this.B.resize(); this.build(true); window.addEventListener('resize', () => this.B.resize());
    LS.anim(cv, dt => { const v = this.B.view; if (!v) return; v.o.dots = this.solved; v.o.tips = this.solved; const g = o.glow ? o.glow(this.k, this) : null;
      v.o.glow = g && g.length ? new Set(g) : null; if (o.tick) o.tick(dt, this); this.B.frame(dt); }); }
  get solved() { return this.k >= (this.o.solvedAt ?? 0); }
  get ckt() { return this.B.ckt; }
  build(force) { const sp = typeof this.o.spec === 'function' ? this.o.spec(this.k, this) : this.o.spec;
    if (force || sp !== this.spec) { this.spec = sp; this.B.set(sp, this.o.vo ? this.o.vo(this) : {}); } }
  set(k) { this.k = k; if (this.o.onSet) this.o.onSet(k, this); this.build(); }
  refresh() { this.list = null; this.build(true); if (this.stepper) this.stepper.refresh(true); }
  get steps() { return this.list || (this.list = LS.withCol(this.colW, () => this.o.steps(this))); }
  controls(el) { if (this.o.controls) this.o.controls(el, this); }
};

/* a muted message in the middle of an empty panel, broken into lines that fit */
CH8.empty = (ctx, b, msg) => { CH6.bg(ctx, b); const s = tt(msg), out = []; let cur = '';
  String(s).split(' ').forEach(w => { const t2 = cur ? `${cur} ${w}` : w; if (cur && textW(ctx, t2, 13) > b.w - 36) { out.push(cur); cur = w; } else cur = t2; }); if (cur) out.push(cur);
  out.forEach((l, i) => T(ctx, l, b.x + b.w / 2, b.y + b.h / 2 + (i - (out.length - 1) / 2) * 19, { color: COL.muted, size: 13 })); };
/* wires one problem section: canvas cv<n>, controls ctl<n>, try-first box ask<n>, stepper st<n> (re-measured when fonts load or the column resizes) */
CH8.wire = (n, d, o = {}) => {
  const $ = id => document.getElementById(id);
  const sim = new CH8.Prob($('cv' + n), { ...d, colW: $('st' + n).clientWidth });
  if ($('ctl' + n)) sim.controls($('ctl' + n));
  const ask = o.ask || d.ask; if (ask && $('ask' + n)) LS.ask($('ask' + n), ask(sim));
  const answer = o.answer || (d.answer ? () => d.answer(sim) : undefined);
  sim.stepper = LS.stepper($('st' + n), { steps: () => sim.steps, answer, hint: o.hint || d.hint, onStep: k => sim.set(k) });
  LS.onFonts(() => { sim.colW = $('st' + n).clientWidth; sim.list = null; sim.stepper.refresh(true); });
  LS.watchWidth($('st' + n), w => { sim.colW = w; sim.list = null; sim.stepper.refresh(true); });
  return sim;
};

global.CH8 = CH8;
})(window);
