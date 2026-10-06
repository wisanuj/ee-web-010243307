/* ch2.js — chapter 2 building blocks for the problem-by-problem pages (needs circuit.js, draw.js, alg.js, lesson.js):
   CH2.Ladder     a ladder of SI prefixes: moving one rung moves the decimal point three places (Ex 1, Ex 2)
   CH2.Tube       a wire with charges crossing a cross-section, with i(t) (area shaded) and q(t) = area (Ex 5, exercise 3)
   CH2.Probe      a circuit coloured by potential, with a multimeter whose probes you drag onto a node or a wire
   CH2.Blob       a two-terminal element with polarity marks and voltmeters (slide p. 10, Ex 3)
   CH2.SourceLoad an ideal voltage source, a real battery or an ideal current source driving a load, with the V–I graph
   CH2.Dep        Hayt Example 2.2: a voltage-controlled voltage source
   CH2.Ohm        a source driving a resistor, with the i–v line and the moving operating point (Ex 4, Ex 7)
   CH2.Elem       one element with + / − marks and a current arrow: who supplies, who absorbs (Ex 6, homework 1)
   CH2.PowerCkt   a whole circuit with supply / absorb halos and a power-balance bar chart (homework 2, exercise 5) */
(function (global) {
'use strict';
const CH2 = {};
const t = (a, b) => MC.t(a, b), PAL = CK.PAL, fd = (x, n = 3) => ALG.fmtDec(x, n), um = s => String(s).replace(/-/g, '−');
const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹';
const sup = n => (n < 0 ? '⁻' : '') + String(Math.abs(n)).split('').map(c => SUP[+c]).join('');
/* a number for canvas text: plain decimals between 1e-4 and 1e6, otherwise m × 10ⁿ */
CH2.num = x => { const a = Math.abs(x); if (a === 0) return '0'; if (a >= 1e-4 && a < 1e6) { let s = (+x.toPrecision(6)).toString(); if (/e/.test(s)) s = x.toFixed(8); return um(s.includes('.') ? s.replace(/0+$/, '').replace(/\.$/, '') : s); }
  const e = Math.floor(Math.log10(a)), m = x / Math.pow(10, e); return `${um(+m.toPrecision(4))} × 10${sup(e)}`; };
const txt = (ctx, s, x, y, o = {}) => { ctx.font = `${o.weight || ''} ${o.size || 13}px ${/[ก-๙]/.test(s) ? '"IBM Plex Sans Thai"' : '"IBM Plex Mono"'}, monospace`.trim(); ctx.fillStyle = o.color || PAL.muted;
  ctx.textAlign = o.align || 'left'; ctx.textBaseline = o.base || 'middle'; ctx.fillText(s, x, y); };
CH2.txt = txt;
const arrow = (ctx, x1, y1, x2, y2, col, w = 2.4, hl = 10) => { const a = Math.atan2(y2 - y1, x2 - x1); ctx.save(); ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = w;
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2 - Math.cos(a) * hl * 0.6, y2 - Math.sin(a) * hl * 0.6); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x2 - hl * Math.cos(a - 0.42), y2 - hl * Math.sin(a - 0.42)); ctx.lineTo(x2 - hl * Math.cos(a + 0.42), y2 - hl * Math.sin(a + 0.42)); ctx.closePath(); ctx.fill(); ctx.restore(); };
CH2.arrow = arrow;
/* a canvas that is redrawn only when dirty (static pictures that change per step) */
class Static {
  constructor(canvas, aspect, aspectNarrow) { this.canvas = canvas; this.asp = aspect; this.aspN = aspectNarrow || aspect; this.dirty = true;
    this.resize(); window.addEventListener('resize', () => { this.resize(); this.dirty = true; }); if (document.fonts) document.fonts.ready.then(() => { this.dirty = true; }); }
  start() { LS.anim(this.canvas, dt => this.tick(dt)); return this; }   // subclasses call this once their own fields are set
  resize() { const w = this.canvas.parentElement.clientWidth - 12; const r = CK.fit(this.canvas, w < 480 ? this.aspN : this.asp, 260); this.ctx = r.ctx; this.W = r.w; this.H = r.h; this.narrow = r.w < 480; }
  tick() { if (!this.dirty) return; this.dirty = false; this.draw(); }
  redraw() { this.dirty = true; }
}

/* ---------------- 1) prefix ladder ----------------
   o: { rungs: [{e, sym}] from the largest unit down, value (in the base unit), from (e of the given unit), opts: [{e, text, label}] }
   set({at: e, show: [e…], marks: {optIndex: true|false}}) */
CH2.Ladder = class extends Static {
  constructor(canvas, o) { super(canvas, 0.62, 0.95); this.o = o; this.st = { at: null, show: [], marks: {} }; this.start(); }
  set(st) { this.st = Object.assign({ at: null, show: [], marks: {} }, st); this.redraw(); }
  draw() {
    const c = this.ctx, o = this.o, W = this.W, H = this.H, n = o.rungs.length; c.fillStyle = PAL.bg; c.fillRect(0, 0, W, H);
    const top = 56, gap = (H - top - 26) / (n - 1), x0 = this.narrow ? 70 : 96, x1 = W - 14, Y = i => top + i * gap, idx = e => o.rungs.findIndex(r => r.e === e);
    txt(c, t('บันไดคำนำหน้า: ขึ้นหนึ่งขั้น = เลื่อนจุดทศนิยมไปทางซ้าย', 'prefix ladder: one rung up = the decimal point moves left'), 10, 16, { size: this.narrow ? 11.5 : 13, color: PAL.muted });
    o.rungs.forEach((r, i) => { const y = Y(i), isFrom = r.e === o.from, isAt = r.e === this.st.at, shown = this.st.show.includes(r.e) || isFrom;
      c.save(); c.strokeStyle = isAt ? '#ff7eb6' : isFrom ? '#ffd166' : '#3a4366'; c.lineWidth = isAt || isFrom ? 3 : 1.6; c.beginPath(); c.moveTo(x0, y); c.lineTo(x1, y); c.stroke(); c.restore();
      txt(c, r.sym, x0 - 12, y - 8, { align: 'right', color: isFrom ? '#ffd166' : isAt ? '#ff7eb6' : PAL.ink, size: 16, weight: '700' });
      txt(c, `10${sup(r.e)}`, x0 - 12, y + 10, { align: 'right', size: 11.5 });
      if (shown) txt(c, `${CH2.num(o.value / Math.pow(10, r.e))} ${r.sym}`, x0 + 14, y - 11, { color: isFrom ? '#ffd166' : isAt ? '#ff7eb6' : PAL.ink, size: this.narrow ? 13.5 : 15.5, weight: '700' }); });
    /* options sit on their rungs; a mark appears once a step has checked them */
    (o.opts || []).forEach((op, k) => { const i = idx(op.e); if (i < 0) return; const same = o.opts.slice(0, k).filter(q => q.e === op.e).length, y = Y(i) + 13 + same * 17, m = this.st.marks[k];
      const s = `${op.label} ${op.text}${m === undefined ? '' : m ? ' ✓' : ' ✗'}`; txt(c, s, x1 - 4, y, { align: 'right', size: 13, weight: '600', color: m === undefined ? '#9aa3c7' : m ? '#7ee787' : '#ff6b6b' }); });
    /* the move from the given rung to the active one */
    if (this.st.at !== null && this.st.at !== o.from) { const i0 = idx(o.from), i1 = idx(this.st.at); if (i0 >= 0 && i1 >= 0) { const xa = x0 + 4 + (this.narrow ? 0 : 6), ya = Y(i0), yb = Y(i1);
      c.save(); c.strokeStyle = '#ff7eb6'; c.lineWidth = 2; c.setLineDash([5, 4]); c.beginPath(); c.moveTo(xa, ya); c.bezierCurveTo(xa - 46, ya, xa - 46, yb, xa, yb); c.stroke(); c.restore();
      arrow(c, xa - 8, yb + (yb > ya ? -2 : 2), xa, yb, '#ff7eb6', 2, 8);
      txt(c, `× 10${sup(o.from - this.st.at)}`, x0 + 14, (ya + yb) / 2, { color: '#ff7eb6', size: 13.5, weight: '700' }); } }
  }
};

/* ---------------- 2) charge in a wire ----------------
   wave: { i(t) A, q(t) C, T s, unit 1 | 1e-3, avg A }; o: { view() → {i: bool, q: false | true | t_max, avg: bool}, overlay(pI, pQ, tn, u), autoplay } */
CH2.Tube = class {
  constructor(canvas, wave, o = {}) {
    this.canvas = canvas; this.w = wave; this.o = o; this.ref = 1; this.elec = false; this.speed = 1; this.t = 0; this.run = o.autoplay !== false; this.dots = [];
    this.resize(); window.addEventListener('resize', () => this.resize()); LS.anim(canvas, dt => this.frame(dt));
  }
  U() { return this.w.unit === 1e-3 ? { a: 'mA', c: 'mC', k: 1e3 } : { a: 'A', c: 'C', k: 1 }; }
  resize() { const w = this.canvas.parentElement.clientWidth - 12; const r = CK.fit(this.canvas, w < 480 ? 1.12 : 0.84, 280); this.ctx = r.ctx; this.W = r.w; this.H = r.h;
    const B = this.B = {}; B.tube = { x: this.W * 0.06, y: 50, w: this.W * 0.88, h: Math.max(54, this.H * 0.14) }; const top = B.tube.y + B.tube.h + 44, rest = this.H - top - 4;
    B.i = { x: 0, y: top, w: this.W, h: Math.round(rest / 2) - 3 }; B.q = { x: 0, y: top + B.i.h + 6, w: this.W, h: rest - B.i.h - 6 }; this.seed(); }
  seed() { this.dots = []; const n = Math.round(this.B.tube.w / 9); for (let k = 0; k < n; k++) this.dots.push({ x: Math.random() * this.B.tube.w, lane: Math.random() * 0.76 + 0.12 }); }
  maxI() { let m = 0; for (let k = 0; k <= 400; k++) m = Math.max(m, Math.abs(this.w.i(this.w.T * k / 400))); return m || 1; }
  qRange() { let lo = 0, hi = 0; for (let k = 0; k <= 400; k++) { const v = this.ref * this.w.q(this.w.T * k / 400); lo = Math.min(lo, v); hi = Math.max(hi, v); } const pad = (hi - lo) * 0.12 || 1e-3; return [lo - pad, hi + pad]; }
  drawTube(iNow) {
    const c = this.ctx, b = this.B.tube, r = b.h / 2, cx = b.x + b.w / 2, u = this.U();
    const g = c.createLinearGradient(0, b.y, 0, b.y + b.h); g.addColorStop(0, '#2a3150'); g.addColorStop(0.5, '#1a1f36'); g.addColorStop(1, '#2a3150');
    c.save(); c.fillStyle = g; c.strokeStyle = '#4a5478'; c.lineWidth = 1.5; c.beginPath(); c.ellipse(b.x, b.y + r, r * 0.35, r, 0, Math.PI / 2, Math.PI * 1.5); c.lineTo(b.x + b.w, b.y);
    c.ellipse(b.x + b.w, b.y + r, r * 0.35, r, 0, -Math.PI / 2, Math.PI / 2); c.lineTo(b.x, b.y + b.h); c.closePath(); c.fill(); c.stroke(); c.restore();
    const col = this.elec ? '#5ad1ff' : '#ffd166';
    c.save(); c.beginPath(); c.rect(b.x, b.y, b.w, b.h); c.clip();
    for (const d of this.dots) { const x = b.x + d.x, y = b.y + d.lane * b.h, near = Math.abs(x - cx) < 5;
      c.fillStyle = col; c.shadowColor = col; c.shadowBlur = near ? 14 : 5; c.beginPath(); c.arc(x, y, near ? 5.2 : 4, 0, 2 * Math.PI); c.fill();
      c.shadowBlur = 0; c.fillStyle = '#0f1220'; c.font = 'bold 8px "IBM Plex Mono", monospace'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(this.elec ? '−' : '+', x, y + 0.5); }
    c.restore();
    c.save(); c.fillStyle = 'rgba(255,126,182,.35)'; c.strokeStyle = '#ff7eb6'; c.lineWidth = 2; c.beginPath(); c.ellipse(cx, b.y + r, r * 0.32, r * 0.98, 0, 0, 2 * Math.PI); c.fill(); c.stroke(); c.restore();
    txt(c, t('หน้าตัด', 'cross-section'), cx, b.y + b.h + 14, { align: 'center', color: '#ff7eb6', size: 13, weight: '600' });
    const ay = b.y - 20, L = Math.min(140, b.w * 0.26), x1 = this.ref > 0 ? cx - L / 2 : cx + L / 2, x2 = this.ref > 0 ? cx + L / 2 : cx - L / 2;
    arrow(c, x1, ay, x2, ay, '#ff7eb6', 2.5, 11);
    txt(c, `i = ${um(fd(this.ref * iNow * u.k, 2))} ${u.a}`, this.ref > 0 ? x2 + 10 : x2 - 10, ay, { align: this.ref > 0 ? 'left' : 'right', color: '#ff7eb6', size: 15, weight: '700' });
    txt(c, t('ทิศอ้างอิง', 'reference'), this.ref > 0 ? x1 - 8 : x1 + 8, ay, { align: this.ref > 0 ? 'right' : 'left', size: 12.5 });
    txt(c, `t = ${fd(this.t, 2)} s`, b.x + 4, b.y + b.h + 30, { color: PAL.ink, size: 14, weight: '600' });
    txt(c, `q(t) = ${um(fd(this.ref * this.w.q(this.t) * u.k, 2))} ${u.c}`, cx + r * 0.5, b.y + b.h + 30, { color: '#7ee787', size: 14, weight: '600' });
  }
  drawPlots() {
    const w = this.w, u = this.U(), v = this.o.view ? this.o.view() : {}, N = 300, ts = [], is = [], qs = [];
    for (let k = 0; k <= N; k++) { const tt = w.T * k / N; ts.push(tt); is.push(this.ref * w.i(tt) * u.k); qs.push(this.ref * w.q(tt) * u.k); }
    const mi = this.maxI() * u.k, ilim = [Math.min(0, Math.min(...is)) - mi * 0.14, Math.max(0, Math.max(...is)) + mi * 0.14];
    const pI = new DRAW.Plot(this.ctx, this.B.i, { xlim: [0, w.T], ylim: ilim, title: `i(t)  [${u.a}]`, ml: 50 }); pI.frame();
    const tn = Math.min(this.t, w.T);
    if (v.i !== false) {
      for (let k = 0; k < 160; k++) { const t0 = tn * k / 160, t1 = tn * (k + 1) / 160, v0 = this.ref * w.i(t0) * u.k, v1 = this.ref * w.i(t1) * u.k;
        pI.polygon([[t0, 0], [t0, v0], [t1, v1], [t1, 0]], { fill: (v0 + v1) / 2 >= 0 ? '#7ee787' : '#ff6b6b', alpha: 0.35 }); }
      pI.line(ts, is, { color: '#ffd166', width: 2.2 });
      if (v.avg && w.avg !== undefined) pI.hline(this.ref * w.avg * u.k, { color: '#c792ea', dash: [5, 4], label: t(`ค่าเฉลี่ย ${fd(this.ref * w.avg, 2)} ${u.a}`, `average ${fd(this.ref * w.avg, 2)} ${u.a}`) });
      pI.marker(tn, this.ref * w.i(tn) * u.k, { type: 'dot', color: '#ffd166', r: 5, force: true });
    } else txt(this.ctx, 'i(t) = ?', pI.px + pI.pw / 2, pI.py + pI.ph / 2, { align: 'center', color: '#ffd166', size: 16, weight: '700' });
    pI.vline(tn, { color: '#ff7eb6', dash: [] });
    const ql = this.qRange().map(x => x * u.k);
    const pQ = new DRAW.Plot(this.ctx, this.B.q, { xlim: [0, w.T], ylim: ql, title: t(`q(t) = พื้นที่ใต้ i(t)  [${u.c}]`, `q(t) = area under i(t)  [${u.c}]`), xlabel: 't (s)', ml: 50 }); pQ.frame();
    if (v.q !== false) { const tmax = v.q === true || v.q === undefined ? w.T : v.q; const sel = ts.map((tt, k) => [tt, qs[k]]).filter(p => p[0] <= tmax + 1e-9);
      pQ.line(sel.map(p => p[0]), sel.map(p => p[1]), { color: '#7ee787', width: 2.2, alpha: 0.85 });
      if (tn <= tmax) pQ.marker(tn, this.ref * w.q(tn) * u.k, { type: 'dot', color: '#7ee787', r: 5, force: true }); }
    else txt(this.ctx, 'q(t) = ?', pQ.px + pQ.pw / 2, pQ.py + pQ.ph / 2, { align: 'center', color: '#7ee787', size: 16, weight: '700' });
    pQ.vline(tn, { color: '#ff7eb6', dash: [] });
    if (this.o.overlay) this.o.overlay(pI, pQ, tn, u);
  }
  frame(dt) {
    const w = this.w; if (this.run) { this.t += dt * this.speed; if (this.t >= w.T) { this.t = w.T; this.run = false; if (this.btn) this.btn.textContent = t('เล่นใหม่', 'Replay'); } }
    const iNow = w.i(this.t), k = 140 / this.maxI(), vv = (this.elec ? -1 : 1) * k * iNow * (this.run ? this.speed : 0), bw = this.B.tube.w;
    for (const d of this.dots) { d.x += vv * dt; d.x = ((d.x % bw) + bw) % bw; }
    const c = this.ctx; c.fillStyle = PAL.bg; c.fillRect(0, 0, this.W, this.H); this.drawTube(iNow); this.drawPlots();
  }
  /* play / pause / restart buttons, a time-speed slider and (optional) flip and electron toggles */
  controls(el, o = {}) { const ui = MC.ui;
    const rid = (o.id || 'tb') + 'run', b = ui.buttons(el, [{ id: rid, label: t('หยุด', 'Pause'), on: true, onclick: x => { if (this.t >= this.w.T) { this.t = 0; this.run = true; } else this.run = !this.run; x.textContent = this.run ? t('หยุด', 'Pause') : t('เล่นต่อ', 'Resume'); } },
      { label: t('เริ่มใหม่', 'Restart'), onclick: () => { this.t = 0; this.run = true; this.btn.textContent = t('หยุด', 'Pause'); } }]
      .concat(o.flip ? [{ label: t('กลับทิศอ้างอิง ⇄', 'Flip reference ⇄'), onclick: x => { this.ref = -this.ref; x.classList.toggle('on', this.ref < 0); } }] : [])
      .concat(o.elec ? [{ label: t('แสดงอิเล็กตรอน', 'Show electrons'), onclick: x => { this.elec = !this.elec; x.classList.toggle('on', this.elec); } }] : []));
    this.btn = b[rid];
    ui.slider(el, { id: (o.id || 'tb') + 'spd', label: t('ความเร็วเวลา', 'time speed'), min: 0.25, max: 4, step: 0.25, value: 1, fmt: v => `${v}×`, oninput: v => { this.speed = v; } });
    return b; }
};

/* ---------------- 3) probes on a circuit coloured by potential ---------------- */
/* the multimeter's two probes are dragged (mouse or finger) onto a node or anywhere along a wire, which is all one node; a probe let go
   away from the circuit goes back to where it was. S.red / S.black hold the node each probe touches (a page may set them, e.g. after a
   quiz answer, and the probe follows); tip[k] = {node, x, y} is where its needle touches, in grid units (a wire may be touched anywhere) */
const segProj = (x, y, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy || 1, f = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / L2)), px = a[0] + f * dx, py = a[1] + f * dy;
  return { d: Math.hypot(x - px, y - py), pt: [px, py] }; };
const PROBE = { red: { lead: '#ff6b6b', body: '#e5484d', edge: '#ffc2c2', dir: [-0.39, 0.92] }, black: { lead: '#cfd6ec', body: '#262b36', edge: '#cfd6ec', dir: [0.39, 0.92] } };
/* probe size in px from the circuit scale u: metal needle N, handle end L (where the lead leaves), handle width w (smaller on phones) */
const probeSize = u => { const L = Math.max(30, Math.min(46, u * 0.78)), f = L / 46; return { N: 12 * f, L, w: 10.5 * f }; };
CH2.Probe = class {
  constructor(canvas, panel) {
    this.canvas = canvas; this.S = { V1: 12, R1: 3, red: 'A', black: 'C' }; this.tip = {}; this.drag = null;
    this.ckt = new CK.Circuit({ ground: 'G', nodes: { A: [0, 0], B: [3.6, 0], C: [7.2, 0], G: [0, 3.2], Gm: [3.6, 3.2], Gr: [7.2, 3.2] },
      parts: [{ id: 'V1', name: 'V₁', type: 'V', a: 'A', b: 'G', value: 12, battery: true, side: -1 }, { id: 'R1', name: 'R₁', type: 'R', a: 'A', b: 'B', value: 3 },
        { id: 'R2', name: 'R₂', type: 'R', a: 'B', b: 'Gm', value: 6, side: -1 }, { id: 'R3', name: 'R₃', type: 'R', a: 'B', b: 'C', value: 3 },
        { id: 'R4', name: 'R₄', type: 'R', a: 'C', b: 'Gr', value: 3, side: 1 }, { type: 'W', a: 'G', b: 'Gm' }, { type: 'W', a: 'Gm', b: 'Gr' }] });
    this.ckt.solve();
    this.view = new CK.View(canvas, this.ckt, { speed: 26, ground: true, showI: true, potential: true, pad: 1.5, meter: false });   // its own multimeter
    MC.drag(canvas, { hit: p => this.grab(p), move: (k, p) => this.move(k, p), up: k => this.drop(k) });
    canvas.addEventListener('mousemove', e => { if (!this.drag && this.grabAt(this.view.pos(e))) canvas.style.cursor = 'grab'; });   // after the view's own cursor
    this.resize(); window.addEventListener('resize', () => this.resize()); LS.anim(canvas, dt => this.frame(dt));
    if (panel) this.controls(panel);
  }
  lab(n) { return { A: 'A', B: 'B', C: 'C', G: 'G', Gm: 'G', Gr: 'G' }[n]; }
  V(n) { return this.ckt.V(n).re; }
  resize() { const w = this.canvas.parentElement.clientWidth - 12, narrow = w < 480; const r = CK.fit(this.canvas, narrow ? 1.05 : 0.74, 280); this.view.ctx = r.ctx; this.W = r.w; this.H = r.h; this.narrow = narrow;
    const cw = narrow ? r.w : Math.round(r.w * 0.74); this.view.fit({ x: 0, y: 30, w: cw, h: Math.round((r.h - 34) * (narrow ? 0.5 : 0.68)) });
    this.lad = narrow ? { x: 6, y: Math.round(r.h * 0.56), w: Math.round(r.w * 0.4), h: Math.round(r.h * 0.42) } : { x: cw + 6, y: 30, w: r.w - cw - 12, h: r.h - 44 };
    this.meter = narrow ? { x: Math.round(r.w * 0.5), y: Math.round(r.h * 0.66) } : { x: Math.round(cw / 2 - 75), y: r.h - 92 }; }
  /* where probe k touches, in px; a probe whose node was changed from outside jumps to that node */
  tipPx(k) { let q = this.tip[k]; if (!q || q.node !== this.S[k]) { const [x, y] = this.ckt.nodes[this.S[k]]; q = this.tip[k] = { node: this.S[k], x, y }; } return this.view.P([q.x, q.y]); }
  grabAt([x, y]) { const L = probeSize(this.view.u).L; for (const k of ['red', 'black']) { const [tx, ty] = this.tipPx(k), [ux, uy] = PROBE[k].dir; if (segProj(x, y, [tx, ty], [tx + ux * L, ty + uy * L]).d < 20) return k; } return null; }
  /* the node under a probe tip at (x, y) px: a node within reach first, else the nearest point of a wire */
  snapAt(x, y) { const v = this.view; let best = null, bd = Math.max(18, v.u * 0.32);
    for (const n in this.ckt.nodes) { const [px, py] = v.P(n), d = Math.hypot(px - x, py - y); if (d < bd) { bd = d; best = { node: n, px: [px, py] }; } }
    if (best) return best; bd = Math.max(12, v.u * 0.2);
    this.ckt.parts.forEach(p => { if (p.type !== 'W') return; const pts = v.path(p); for (let i = 1; i < pts.length; i++) { const q = segProj(x, y, pts[i - 1], pts[i]); if (q.d < bd) { bd = q.d; best = { node: p.a, px: q.pt }; } } });
    return best; }
  grab(p) { const k = this.grabAt([p.x, p.y]); if (!k) return null; const [tx, ty] = this.tipPx(k);
    this.drag = { k, dx: tx - p.x, dy: ty - p.y, from: this.S[k], at: [tx, ty], snap: null }; this.canvas.style.cursor = 'grabbing'; return k; }
  move(k, p) { const d = this.drag; if (!d) return; const x = p.x + d.dx, y = p.y + d.dy, s = this.snapAt(x, y), v = this.view; d.snap = s; d.at = s ? s.px : [x, y];
    this.S[k] = s ? s.node : d.from; this.tip[k] = { node: this.S[k], x: (d.at[0] - v.ox) / v.u, y: (d.at[1] - v.oy) / v.u }; v.hover = null; }
  drop(k) { const d = this.drag; if (!d) return; if (!d.snap) { const [x, y] = this.ckt.nodes[d.from]; this.S[k] = d.from; this.tip[k] = { node: d.from, x, y }; }
    this.drag = null; this.canvas.style.cursor = ''; }
  drawProbes() { const c = this.view.ctx, mw = 150, mh = 80, mx = this.meter.x, my = this.meter.y, rd = this.V(this.S.red) - this.V(this.S.black), d = this.drag, Z = probeSize(this.view.u);
    ['black', 'red'].forEach(k => { const P = PROBE[k], [x, y] = this.tipPx(k), [ux, uy] = P.dir, hx = x + ux * Z.L, hy = y + uy * Z.L, sx = mx + 40 + (k === 'red' ? 0 : 70), sy = my;
      c.save(); c.lineCap = 'round'; c.strokeStyle = P.lead; c.lineWidth = 3; c.globalAlpha = 0.9; c.beginPath(); c.moveTo(sx, sy); c.bezierCurveTo(sx, sy - 60, hx + ux * 50, hy + uy * 50, hx, hy); c.stroke(); c.globalAlpha = 1;
      c.strokeStyle = '#e8ecf4'; c.lineWidth = 2.6; c.beginPath(); c.moveTo(x, y); c.lineTo(x + ux * Z.N, y + uy * Z.N); c.stroke();   // metal needle
      [[P.edge, Z.w + 2.5], [P.body, Z.w]].forEach(([col, w]) => { c.strokeStyle = col; c.lineWidth = w; c.beginPath(); c.moveTo(x + ux * (Z.N + 1), y + uy * (Z.N + 1)); c.lineTo(hx, hy); c.stroke(); });
      const held = d && d.k === k; if (!held || d.snap) { c.strokeStyle = P.lead; c.lineWidth = 2; c.beginPath(); c.arc(x, y, held ? 9 : 5.5, 0, 2 * Math.PI); c.stroke(); }   // touching a node
      c.restore(); });
    c.save(); c.fillStyle = '#ffcc33'; c.strokeStyle = '#2b2b2b'; c.lineWidth = 2; c.beginPath(); if (c.roundRect) c.roundRect(mx, my, mw, mh, 10); else c.rect(mx, my, mw, mh); c.fill(); c.stroke();
    c.fillStyle = '#c9d8b6'; c.fillRect(mx + 10, my + 10, mw - 20, 34); c.strokeStyle = '#4b5a3c'; c.strokeRect(mx + 10, my + 10, mw - 20, 34);
    c.fillStyle = '#1b2614'; c.font = '600 22px "IBM Plex Mono", monospace'; c.textAlign = 'right'; c.textBaseline = 'middle'; c.fillText(`${rd < -1e-9 ? '−' : ''}${Math.abs(rd).toFixed(2)} V`, mx + mw - 16, my + 28);
    c.font = '600 12.5px "IBM Plex Mono", monospace'; c.textAlign = 'center'; c.fillStyle = '#2b2b2b'; c.fillText(`V${this.lab(this.S.red)}${this.lab(this.S.black)} = V${this.lab(this.S.red)} − V${this.lab(this.S.black)}`, mx + mw / 2, my + 60); c.restore(); }
  drawLadder() { const c = this.view.ctx, b = this.lad, vmax = Math.max(1, this.S.V1), y0 = b.y + b.h - 12, y1 = b.y + 24, Y = v => y0 - (v / vmax) * (y0 - y1);
    c.save(); c.fillStyle = '#161a2f'; c.fillRect(b.x, b.y, b.w, b.h); c.restore(); this.view.text(t('ศักย์ (V)', 'potential (V)'), b.x + b.w / 2, b.y + 10, { color: PAL.muted, size: 12.5 });
    const xl = b.x + b.w * 0.3; c.save(); const g = c.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, CK.vColor(0)); g.addColorStop(0.5, CK.vColor(0.5)); g.addColorStop(1, CK.vColor(1)); c.fillStyle = g; c.fillRect(xl - 4, y1, 8, y0 - y1); c.restore();
    for (let v = 0; v <= vmax + 1e-9; v += vmax > 12 ? 4 : 2) this.view.text(`${v}`, xl - 10, Y(v), { align: 'right', color: PAL.muted, size: 11.5 });
    ['A', 'B', 'C', 'G'].forEach(n => { const v = this.V(n), yy = Y(v); c.save(); c.fillStyle = CK.vColor(v / vmax); c.beginPath(); c.arc(xl, yy, 6, 0, 2 * Math.PI); c.fill(); c.restore(); this.view.text(`${n} ${fd(v, 2)} V`, xl + 12, yy, { align: 'left', color: PAL.ink, size: 13, weight: '600' }); });
    const yr = Y(this.V(this.S.red)), yb = Y(this.V(this.S.black)), xb = b.x + b.w - 12;
    c.save(); c.strokeStyle = '#ff7eb6'; c.lineWidth = 2; c.beginPath(); c.moveTo(xb - 8, yb); c.lineTo(xb, yb); c.lineTo(xb, yr); c.lineTo(xb - 8, yr); c.stroke(); c.restore(); }
  frame(dt) { const c = this.view.ctx; c.fillStyle = PAL.bg; c.fillRect(0, 0, this.W, this.H); this.view.advance(dt); this.view.o.vRange = [0, Math.max(1, this.S.V1)]; this.view.draw(); this.drawLadder(); this.drawProbes();
    ['A', 'B', 'C'].forEach(n => { const [x, y] = this.view.P(n); this.view.text(n, x - 12, y - 14, { color: '#ffffff', size: 15.5, weight: '700' }); });
    CK.badge(c, t('ลากปลายโพรบไปแตะโนดหรือลวด', 'drag a probe onto a node or wire'), 'ok'); if (this.onFrame) this.onFrame(); }
  controls(el) { const ui = MC.ui;
    ui.html(el, t('ลากโพรบสีแดง (+) และสีดำ (COM) ไปแตะโนดหรือลวดเส้นที่ต้องการวัด (ลวดเส้นเดียวกันคือโนดเดียวกัน แตะตรงไหนก็ได้) ถ้าปล่อยห่างจากวงจร โพรบจะกลับที่เดิม',
      'Drag the red (+) and black (COM) probes onto the node or wire you want to measure (a wire is one node, so touch it anywhere). Let go away from the circuit and the probe goes back.'), 'simnote');
    ui.buttons(el, [{ label: t('สลับโพรบ ⇄', 'Swap probes ⇄'), cls: 'on', onclick: () => { [this.S.red, this.S.black] = [this.S.black, this.S.red]; [this.tip.red, this.tip.black] = [this.tip.black, this.tip.red]; } }]);
    const box = ui.html(el, '', 'ctl');
    ui.slider(box, { id: 'prV1', label: 'V₁', min: 0, max: 24, step: 1, value: 12, fmt: v => `${v} V`, oninput: v => { this.S.V1 = v; this.ckt.set('V1', 'value', v); this.ckt.solve(); } });
    ui.slider(box, { id: 'prR1', label: 'R₁', min: 1, max: 12, step: 1, value: 3, fmt: v => `${v} Ω`, oninput: v => { this.S.R1 = v; this.ckt.set('R1', 'value', v); this.ckt.solve(); } }); }
};

/* ---------------- 4) a two-terminal element with polarity marks ----------------
   st: { marks: [{plus: 'A'|'B', text, col}], meters: [{red: 'A'|'B', value: number|null, col}], high: 'A'|'B'|null, note } */
CH2.Blob = class extends Static {
  constructor(canvas, st) { super(canvas, 0.62, 0.9); this.st = st || { marks: [], meters: [] }; this.start(); }
  set(st) { this.st = Object.assign({ marks: [], meters: [], high: null }, st); this.redraw(); }
  draw() {
    const c = this.ctx, W = this.W, H = this.H, st = this.st; c.fillStyle = PAL.bg; c.fillRect(0, 0, W, H);
    const bx = W * (this.narrow ? 0.58 : 0.56), by = H * 0.42, s = Math.min(W * 0.2, H * 0.34), yA = by - s * 0.62, yB = by + s * 0.62, xT = W * (this.narrow ? 0.2 : 0.24);
    /* blob */
    c.save(); c.fillStyle = '#f8c9d3'; c.strokeStyle = '#e8ecf7'; c.lineWidth = 2.5; c.beginPath();
    c.moveTo(bx - s * 0.5, by - s); c.bezierCurveTo(bx + s * 0.4, by - s * 1.15, bx + s * 1.05, by - s * 0.6, bx + s * 0.85, by); c.bezierCurveTo(bx + s * 1.05, by + s * 0.7, bx + s * 0.4, by + s * 1.15, bx - s * 0.5, by + s);
    c.bezierCurveTo(bx - s * 0.18, by + s * 0.55, bx - s * 0.18, by - s * 0.55, bx - s * 0.5, by - s); c.closePath(); c.fill(); c.stroke(); c.restore();
    txt(c, t('อุปกรณ์', 'element'), bx + s * 0.35, by, { align: 'center', color: '#5a2a35', size: 14, weight: '600' });
    /* terminals */
    [['A', yA], ['B', yB]].forEach(([n, y]) => { const hi = st.high === n;
      c.save(); c.strokeStyle = '#e8ecf7'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(xT, y); c.lineTo(bx - s * 0.32, y); c.stroke();
      if (hi) { c.shadowColor = '#ffd166'; c.shadowBlur = 18; } c.fillStyle = hi ? '#ffd166' : PAL.bg; c.beginPath(); c.arc(xT, y, 7, 0, 2 * Math.PI); c.fill(); c.shadowBlur = 0; c.stroke(); c.restore();
      txt(c, n, xT - 14, y, { align: 'right', color: hi ? '#ffd166' : PAL.ink, size: 18, weight: '700' }); });
    /* polarity marks, one column per voltage */
    (st.marks || []).forEach((m, k) => { const x = xT + 34 + k * 46, col = m.col || '#ff7eb6';
      txt(c, m.plus === 'A' ? '+' : '−', x, yA + 22, { align: 'center', color: col, size: 22, weight: '700' }); txt(c, m.plus === 'A' ? '−' : '+', x, yB - 22, { align: 'center', color: col, size: 22, weight: '700' });
      txt(c, m.text, x, by, { align: 'center', color: col, size: this.narrow ? 13 : 15, weight: '700' }); });
    /* voltmeters along the bottom */
    (st.meters || []).forEach((m, k) => { const mw = 128, mh = 60, mx = 10 + k * (mw + 14), my = H - mh - 10, col = m.col || '#ff7eb6';
      [['red', '#ff6b6b'], ['black', '#cfd6ec']].forEach(([key, lc], j) => { const y = m[key] === 'A' ? yA : yB, sx = mx + 34 + j * 60;
        c.save(); c.strokeStyle = lc; c.lineWidth = 2.6; c.globalAlpha = 0.85; c.beginPath(); c.moveTo(sx, my); c.bezierCurveTo(sx, my - 40, xT - 30 - k * 8, y + (j ? 30 : -30), xT - 7, y); c.stroke(); c.restore(); });
      c.save(); c.fillStyle = '#ffcc33'; c.strokeStyle = col; c.lineWidth = 2.5; c.beginPath(); if (c.roundRect) c.roundRect(mx, my, mw, mh, 9); else c.rect(mx, my, mw, mh); c.fill(); c.stroke();
      c.fillStyle = '#c9d8b6'; c.fillRect(mx + 8, my + 8, mw - 16, 28); c.fillStyle = '#1b2614'; c.font = '600 19px "IBM Plex Mono", monospace'; c.textAlign = 'right'; c.textBaseline = 'middle';
      c.fillText(m.value === null || m.value === undefined ? '? V' : `${m.value < 0 ? '−' : ''}${Math.abs(m.value)} V`, mx + mw - 14, my + 22);
      c.font = '600 12px "IBM Plex Mono", monospace'; c.textAlign = 'center'; c.fillStyle = '#2b2b2b'; c.fillText(m.caption || `V${m.red}${m.black}`, mx + mw / 2, my + 48); c.restore(); });
    if (st.note) txt(c, st.note, W - 10, 18, { align: 'right', color: '#ffd166', size: this.narrow ? 12.5 : 14, weight: '700' });
  }
};

/* ---------------- 5) source and load ----------------  kind: 'V' ideal voltage source, 'B' real battery (r = 1 Ω), 'I' ideal current source */
CH2.SourceLoad = class {
  constructor(canvas, kind, panel) {
    this.canvas = canvas; this.kind = kind; this.RL = 6; this.open = false; this.short = false; this.build(); this.resize();
    window.addEventListener('resize', () => this.resize()); LS.anim(canvas, dt => this.frame(dt)); if (panel) this.controls(panel); }
  build() { const RLv = this.short ? 1e-3 : this.open ? 1e7 : this.RL, parts = [], nodes = { a: [0, 0], g: [0, 3.2], t: [3.4, 0], h: [3.4, 3.2] }; if (this.kind === 'B') nodes.m = [0, 1.6];
    if (this.kind === 'V') parts.push({ id: 'S', name: t('แหล่งจ่าย', 'source'), type: 'V', a: 'a', b: 'g', value: 12, side: -1, valText: '12 V' });
    if (this.kind === 'B') { parts.push({ id: 'S', name: 'E = 12 V', type: 'V', a: 'm', b: 'g', value: 12, side: -1, valText: '', battery: true }); parts.push({ id: 'Ri', name: 'r = 1 Ω', type: 'R', a: 'a', b: 'm', value: 1, side: -1, valText: '' }); }
    if (this.kind === 'I') parts.push({ id: 'S', name: t('แหล่งจ่าย', 'source'), type: 'I', a: 'g', b: 'a', value: 2, side: -1, valText: '2 A' });
    parts.push({ type: 'W', a: 'a', b: 't' }); parts.push({ id: 'RL', name: 'R_L', type: 'R', a: 't', b: 'h', value: RLv, side: 1, showI: false, valText: this.short ? '0 Ω' : this.open ? '∞' : CK.eng(this.RL, 'Ω') }); parts.push({ type: 'W', a: 'h', b: 'g' });
    this.ckt = new CK.Circuit({ ground: 'g', nodes, parts }); this.ckt.solve(); this.view = new CK.View(this.canvas, this.ckt, { speed: 16, ground: false, showI: true, pad: 2.0 }); if (this.W) { this.view.ctx = this.ctx; this.view.fit(this.B.ckt); } }
  resize() { const w = this.canvas.parentElement.clientWidth - 12, narrow = w < 480; const r = CK.fit(this.canvas, narrow ? 1.1 : 0.56, 280); this.ctx = r.ctx; this.W = r.w; this.H = r.h;
    this.B = narrow ? { ckt: { x: 0, y: 6, w: r.w, h: Math.round(r.h * 0.48) }, plot: { x: 0, y: Math.round(r.h * 0.5), w: r.w, h: r.h - Math.round(r.h * 0.5) - 4 } }
      : { ckt: { x: 0, y: 6, w: Math.round(r.w * 0.42), h: r.h - 12 }, plot: { x: Math.round(r.w * 0.44), y: 6, w: r.w - Math.round(r.w * 0.44) - 6, h: r.h - 12 } };
    this.view.ctx = this.ctx; this.view.fit(this.B.ckt); }
  frame(dt) { const c = this.ctx; c.fillStyle = PAL.bg; c.fillRect(0, 0, this.W, this.H); this.view.advance(dt); this.view.draw();
    const V = this.ckt.V('a').re - this.ckt.V('g').re, I = this.ckt.I('RL').re;
    const p = new DRAW.Plot(c, this.B.plot, { xlim: [0, 14], ylim: [0, 30], title: t('ลักษณะ V–I ของแหล่งจ่าย และเส้นโหลด', 'source V–I curve and load line'), xlabel: 'I (A)', ylabel: 'V (V)' }); p.frame();
    if (this.kind === 'V') p.line([0, 14], [12, 12], { color: '#5ad1ff', width: 2.5 }); if (this.kind === 'B') p.line([0, 12], [12, 0], { color: '#5ad1ff', width: 2.5 }); if (this.kind === 'I') p.line([2, 2], [0, 30], { color: '#5ad1ff', width: 2.5 });
    const RL = this.short ? 0 : this.open ? 1e9 : this.RL; p.line([0, 14], [0, 14 * RL], { color: '#ffd166', width: 1.8, dash: [6, 4] });
    if (isFinite(V) && isFinite(I) && V < 1e5) p.marker(Math.min(I, 14), Math.min(V, 30), { type: 'dot', color: '#ff7eb6', r: 7, force: true });
    p.legend([{ label: t('แหล่งจ่าย', 'source'), color: '#5ad1ff' }, { label: t('โหลด V = R_L I', 'load V = R_L I'), color: '#ffd166', dash: [6, 4] }]);
    let warn = ''; if (this.kind === 'V' && this.short) warn = t('⚠ ลัดวงจรแหล่งจ่ายแรงดันอุดมคติ: กระแสต้องเป็นอนันต์', '⚠ Ideal voltage source shorted: the current would be infinite');
    if (this.kind === 'I' && this.open) warn = t('⚠ เปิดวงจรแหล่งจ่ายกระแสอุดมคติ: แรงดันต้องเป็นอนันต์', '⚠ Ideal current source opened: the voltage would be infinite');
    if (warn) { c.save(); c.fillStyle = 'rgba(192,57,43,.92)'; c.fillRect(8, 8, this.W - 16, 26); c.restore(); this.view.text(warn, this.W / 2, 21, { color: '#fff', size: 13.5, weight: '600' }); }
    if (this.met) this.met.innerHTML = MC.ui.kv([[t('แรงดันที่ขั้ว V', 'terminal voltage V'), warn && this.kind === 'I' ? '∞' : CK.eng(V, 'V')], [t('กระแส I', 'current I'), warn && this.kind === 'V' ? '∞' : CK.eng(I, 'A')], [t('กำลังที่โหลดได้', 'load power'), warn ? '∞' : CK.eng(V * I, 'W')]]); }
  controls(el) { const ui = MC.ui, rl = v => Math.round(Math.pow(10, -0.3 + v / 100 * 2.3) * 10) / 10; this.RL = rl(50); this.build();
    ui.slider(el, { id: 'sl' + this.kind, label: 'R_L', min: 0, max: 100, step: 1, value: 50, fmt: v => CK.eng(rl(v), 'Ω'), oninput: v => { this.RL = rl(v); this.open = this.short = false; this.build(); } });
    ui.buttons(el, [{ label: t('ลัดวงจร (R_L = 0)', 'Short (R_L = 0)'), onclick: () => { this.short = true; this.open = false; this.build(); } }, { label: t('เปิดวงจร (R_L = ∞)', 'Open (R_L = ∞)'), onclick: () => { this.open = true; this.short = false; this.build(); } }]);
    this.met = ui.metrics(el); }
};

/* ---------------- 6) Hayt Example 2.2: a voltage-controlled voltage source ---------------- */
CH2.Dep = class {
  constructor(canvas) { this.canvas = canvas; this.known = false; this.fade = 0;
    this.ckt = new CK.Circuit({ ground: 'g', nodes: { a: [0, 0], b: [3, 0], g: [0, 3], h: [3, 3], c: [6, 0], d: [6, 3], e: [9, 0], f: [9, 3] },
      parts: [{ id: 'Vs', name: 'V_s', type: 'V', a: 'a', b: 'g', value: 6, side: -1 }, { id: 'R1', name: 'R₁', type: 'R', a: 'a', b: 'b', value: 1000 },
        { id: 'R2', name: 'R₂', type: 'R', a: 'b', b: 'h', value: 1000, side: -1, valText: '1 kΩ', showI: false }, { type: 'W', a: 'h', b: 'g' },
        { id: 'E', name: '5v₂', type: 'E', a: 'c', b: 'd', gain: 5, c: 'b', d: 'h', side: 1, valText: '', showI: false }, { type: 'W', a: 'c', b: 'e' },
        { id: 'RL', name: 'R_L', type: 'R', a: 'e', b: 'f', value: 100, side: 1 }, { type: 'W', a: 'f', b: 'd' }] }); this.ckt.solve();
    this.view = new CK.View(canvas, this.ckt, { speed: 900, ground: false, showI: false, pad: 1.4 });
    this.resize(); window.addEventListener('resize', () => this.resize()); LS.anim(canvas, dt => this.frame(dt)); }
  resize() { const w = this.canvas.parentElement.clientWidth - 12; const r = CK.fit(this.canvas, w < 480 ? 0.7 : 0.5, 280); this.ctx = r.ctx; this.W = r.w; this.H = r.h; this.view.ctx = r.ctx; this.view.fit({ x: 0, y: 30, w: r.w, h: r.h - 60 }); }
  frame(dt) { const c = this.ctx; c.fillStyle = PAL.bg; c.fillRect(0, 0, this.W, this.H); if (this.known && this.fade < 1) this.fade = Math.min(1, this.fade + dt * 1.6); this.view.o.fade = this.known ? this.fade : 0; this.view.advance(dt); this.view.draw();
    const [x1, y1] = this.view.P([3.5, 0.8]), [x2, y2] = this.view.P([5.5, 0.8]); c.save(); c.setLineDash([6, 5]); c.strokeStyle = '#c792ea'; c.lineWidth = 2; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); c.restore();
    arrow(c, x2 - 10, y2, x2, y2, '#c792ea', 2, 9); this.view.text(t('ควบคุม', 'controls'), (x1 + x2) / 2, y1 - 12, { color: '#c792ea', size: 13, weight: '600' });
    const v2 = this.ckt.Vab('R2').re, vL = this.ckt.Vab('RL').re, yb = this.view.P([0, 3])[1] + 24;
    this.view.text(`v₂ = ${fd(v2, 2)} V`, this.view.P([1.5, 3])[0], yb, { color: '#ff7eb6', size: 14.5, weight: '700' });
    this.view.text(this.known ? `v_L = 5v₂ = ${fd(vL, 2)} V` : 'v_L = ?', this.view.P([7.5, 3])[0], yb, { color: '#ff7eb6', size: 14.5, weight: '700' });
    CK.badge(c, this.known ? t('✓ หา v_L แล้ว', '✓ v_L found') : t('? v_L ยังไม่รู้', '? v_L unknown'), this.known ? 'ok' : 'wait'); }
  setKnown(v) { if (v && !this.known) this.fade = 0.001; this.known = v; }
  set(k, v) { this.ckt.set(k, 'value', v); this.ckt.solve(); }
};

/* ---------------- 7) a source and a resistor with the i–v line ----------------
   o: { v(t) or i0 (current source), R, vmax, T (loop time), label, known (show the current), mult } */
CH2.Ohm = class {
  constructor(canvas, o = {}) { this.canvas = canvas; this.o = Object.assign({ R: 1000, vmax: 12, mult: 1, known: true }, o); this.tt = 0; this.trail = []; this.fade = this.o.known ? 1 : 0;
    const isI = this.o.i0 !== undefined;
    this.ckt = new CK.Circuit({ ground: 'g', nodes: { a: [0, 0], b: [4.2, 0], g: [0, 3], h: [4.2, 3] },
      parts: [isI ? { id: 'Vs', name: 'I_s', type: 'I', a: 'g', b: 'a', value: this.o.i0, side: 1, valText: '' } : { id: 'Vs', name: 'v(t)', type: 'V', a: 'a', b: 'g', value: 1, side: 1, valText: '' }, { type: 'W', a: 'a', b: 'b' },
        { id: 'R', name: 'R', type: 'R', a: 'b', b: 'h', value: this.o.R, side: 1 }, { type: 'W', a: 'h', b: 'g' }] });
    this.view = new CK.View(canvas, this.ckt, { speed: 7500, ground: false, showI: true, pad: 2.5, fade: this.fade, minV: this.o.minV ?? 16 });
    this.resize(); window.addEventListener('resize', () => this.resize()); LS.anim(canvas, dt => this.frame(dt)); }
  resize() { const w = this.canvas.parentElement.clientWidth - 12, narrow = w < 480; const r = CK.fit(this.canvas, narrow ? 1.08 : 0.56, 280); this.ctx = r.ctx; this.W = r.w; this.H = r.h;
    this.B = narrow ? { ckt: { x: 0, y: 30, w: r.w, h: Math.round(r.h * 0.45) - 30 }, plot: { x: 0, y: Math.round(r.h * 0.47), w: r.w, h: r.h - Math.round(r.h * 0.47) - 4 } }
      : { ckt: { x: 0, y: 30, w: Math.round(r.w * 0.42), h: r.h - 36 }, plot: { x: Math.round(r.w * 0.43), y: 6, w: r.w - Math.round(r.w * 0.43) - 6, h: r.h - 12 } };
    this.view.ctx = this.ctx; this.view.fit(this.B.ckt); }
  vNow() { return this.o.i0 !== undefined ? this.o.i0 * this.o.R : this.o.v(this.tt); }
  setKnown(v) { if (v && !this.o.known) this.fade = 0.001; this.o.known = v; this.trail = []; }
  frame(dt) { const o = this.o; this.tt += dt; if (o.T && this.tt > o.T) { this.tt = 0; this.trail = []; }
    if (o.i0 === undefined) this.ckt.set('Vs', 'value', o.v(this.tt)); this.ckt.set('R', 'value', o.R); this.ckt.solve();
    const v = this.ckt.Vab('R').re, i = this.ckt.I('R').re; if (o.known && this.fade < 1) this.fade = Math.min(1, this.fade + dt * 1.6);
    if (o.known) { this.trail.push([v, i]); if (this.trail.length > 90) this.trail.shift(); }
    this.view.o.speed = 7500 * o.mult; this.view.o.fade = o.known ? this.fade : 0; this.view.o.showI = o.known; this.view.o.tips = o.known; this.view.advance(dt);
    const c = this.ctx; c.fillStyle = PAL.bg; c.fillRect(0, 0, this.W, this.H); this.view.draw();
    const sv = Math.abs(v) < 0.01 ? 4 : 2; this.view.text(o.vHide ? 'v = ?' : `v = ${um(fd(v, sv))} V`, this.view.P([2.1, 3])[0], this.view.P([2.1, 3])[1] + 28, { color: '#5ad1ff', size: 14.5, weight: '600' });
    const vmax = o.vmax, imax = vmax / o.R * 1.15, sc = imax < 1e-4 ? [1e6, 'µA'] : imax < 0.1 ? [1e3, 'mA'] : [1, 'A'];
    const p = new DRAW.Plot(c, this.B.plot, { xlim: [-vmax, vmax], ylim: [-imax * sc[0], imax * sc[0]], title: t(`i–v ของตัวต้านทาน (ความชัน G = ${CK.eng(1 / o.R, 'S')})`, `resistor i–v (slope G = ${CK.eng(1 / o.R, 'S')})`), xlabel: 'v (V)', ylabel: `i (${sc[1]})`, ml: 52 });
    p.frame(); p.line([-vmax, vmax], [-vmax / o.R * sc[0], vmax / o.R * sc[0]], { color: '#5ad1ff', width: 2.4 });
    this.trail.forEach((q, k) => p.marker(q[0], q[1] * sc[0], { type: 'dot', color: `rgba(255,126,182,${(k / this.trail.length) * 0.5})`, r: 3, force: true }));
    if (o.known) p.marker(v, i * sc[0], { type: 'dot', color: '#ff7eb6', r: 7, force: true }); else p.vline(v, { color: '#ff7eb6', dash: [5, 4], label: 'i = ?' });
    CK.badge(c, o.known ? `R = ${CK.eng(o.R, 'Ω')} · i = ${CK.eng(i, 'A')}` : `R = ${CK.eng(o.R, 'Ω')} · i = ?`, o.known ? 'ok' : 'wait');
    if (this.onFrame) this.onFrame(v, i); }
};

/* ---------------- 8) one element: who supplies, who absorbs ----------------
   d: { kind 'box'|'res'|'ind'|'isrc'|'blob'|'dep', orient 'h'|'v', plus: 'a'|'b' (a = left/top end), vText, iText, iFrom: 'a'|'b' (where the drawn arrow starts),
        iSign: ±1 (sign of the written current), P (absorbed, W), Ptext, depText }; set({k}) where k = how far the reasoning has gone (1 A/B, 2 in/out, 3 answer) */
CH2.Elem = class {
  constructor(canvas, d) { this.canvas = canvas; this.d = d; this.k = 0; this.phase = 0; this.resize(); window.addEventListener('resize', () => this.resize()); LS.anim(canvas, dt => this.frame(dt)); if (document.fonts) document.fonts.ready.then(() => this.resize()); }
  resize() { const w = this.canvas.parentElement.clientWidth - 12; const r = CK.fit(this.canvas, w < 480 ? 0.86 : 0.6, 260); this.ctx = r.ctx; this.W = r.w; this.H = r.h; this.narrow = r.w < 480; }
  set(k) { this.k = k; }
  frame(dt) { const c = this.ctx, d = this.d, W = this.W, H = this.H, v = d.orient === 'v'; c.fillStyle = PAL.bg; c.fillRect(0, 0, W, H); if (!d.kind) return;
    const cx = W * 0.5, cy = H * 0.5, L = v ? H * 0.36 : Math.min(W * 0.34, 210), s = Math.min(W, H) * 0.13;
    const A = v ? [cx, cy - L] : [cx - L, cy], B = v ? [cx, cy + L] : [cx + L, cy], ends = { a: A, b: B };
    /* actual current: the written value along its arrow; negative = the other way */
    const flowFromA = (d.iFrom === 'a') === (d.iSign > 0); this.phase += dt * 60 * (flowFromA ? 1 : -1);
    const P = d.P, sup = P < 0, showP = this.k >= 3;
    if (showP) { const col = sup ? '126,231,135' : '255,107,107', rr = s * 2.6; const g = c.createRadialGradient(cx, cy, rr * 0.2, cx, cy, rr); g.addColorStop(0, `rgba(${col},.5)`); g.addColorStop(1, `rgba(${col},0)`); c.save(); c.fillStyle = g; c.beginPath(); c.arc(cx, cy, rr, 0, 2 * Math.PI); c.fill(); c.restore(); }
    /* leads */
    c.save(); c.strokeStyle = PAL.wire; c.lineWidth = 2.6; c.beginPath(); c.moveTo(A[0], A[1]); c.lineTo(B[0], B[1]); c.stroke(); c.restore();
    /* moving dots along the leads (outside the body) */
    const seg = (p0, p1) => { const n = 4; for (let k = 0; k < n; k++) { const f = (((this.phase / 60 + k / n) % 1) + 1) % 1, x = p0[0] + (p1[0] - p0[0]) * f, y = p0[1] + (p1[1] - p0[1]) * f; c.save(); c.fillStyle = '#ffd166'; c.shadowColor = '#ffd166'; c.shadowBlur = 8; c.beginPath(); c.arc(x, y, 4.2, 0, 2 * Math.PI); c.fill(); c.restore(); } };
    const inA = v ? [cx, cy - s * 1.15] : [cx - s * 1.3, cy], inB = v ? [cx, cy + s * 1.15] : [cx + s * 1.3, cy];
    seg(A, inA); seg(inB, B);
    /* body */
    c.save(); c.strokeStyle = '#e8ecf7'; c.fillStyle = PAL.bg; c.lineWidth = 2.6;
    if (d.kind === 'box') { c.fillStyle = '#c5c3e8'; c.fillRect(cx - s, cy - s * 0.9, 2 * s, 1.8 * s); c.strokeRect(cx - s, cy - s * 0.9, 2 * s, 1.8 * s); }
    if (d.kind === 'res') { c.fillRect(cx - s * 1.3, cy - s * 0.4, 2.6 * s, 0.8 * s); c.beginPath(); c.moveTo(cx - s * 1.3, cy); for (let k = 0; k < 6; k++) c.lineTo(cx - s * 1.1 + k * s * 0.44, cy + (k % 2 ? s * 0.38 : -s * 0.38)); c.lineTo(cx + s * 1.3, cy); c.stroke(); }
    if (d.kind === 'ind') { c.fillRect(cx - s * 1.3, cy - s * 0.5, 2.6 * s, 0.6 * s); c.beginPath(); c.moveTo(cx - s * 1.3, cy); for (let k = 0; k < 4; k++) c.arc(cx - s * 1.3 + s * 0.325 * (2 * k + 1), cy, s * 0.325, Math.PI, 0, false); c.stroke(); }
    if (d.kind === 'isrc' || d.kind === 'blob') { c.beginPath(); c.arc(cx, cy, s, 0, 2 * Math.PI); c.fill(); c.stroke(); }
    if (d.kind === 'blob') { c.strokeStyle = '#e64980'; c.lineWidth = 1.8; c.beginPath(); c.ellipse(cx, cy, s * 0.42, s, 0, 0, 2 * Math.PI); c.stroke(); }
    if (d.kind === 'dep') { c.beginPath(); c.moveTo(cx, cy - s); c.lineTo(cx + s, cy); c.lineTo(cx, cy + s); c.lineTo(cx - s, cy); c.closePath(); c.fill(); c.stroke(); }
    if (d.kind === 'isrc' || d.kind === 'dep') { const up = d.srcUp !== false; c.strokeStyle = '#e8ecf7'; c.lineWidth = 2.4; c.beginPath(); c.moveTo(cx, cy + s * 0.55 * (up ? 1 : -1)); c.lineTo(cx, cy - s * 0.35 * (up ? 1 : -1)); c.stroke();
      c.fillStyle = '#e8ecf7'; c.beginPath(); const tip = cy - s * 0.6 * (up ? 1 : -1); c.moveTo(cx, tip); c.lineTo(cx - s * 0.2, tip + s * 0.3 * (up ? 1 : -1)); c.lineTo(cx + s * 0.2, tip + s * 0.3 * (up ? 1 : -1)); c.closePath(); c.fill(); }
    c.restore();
    /* terminals */
    [A, B].forEach(p => { c.save(); c.fillStyle = PAL.bg; c.strokeStyle = '#e8ecf7'; c.lineWidth = 2; c.beginPath(); c.arc(p[0], p[1], 6, 0, 2 * Math.PI); c.fill(); c.stroke(); c.restore(); });
    /* + / − marks, voltage text, A/B names once step 1 is open */
    const pl = ends[d.plus], mi = ends[d.plus === 'a' ? 'b' : 'a'], side = v ? [1, 0] : [0, -1], off = s * 1.05, fs = this.narrow ? 0.9 : 1;
    const markAt = (p, toward, sgn) => { const x = p[0] + (toward[0] - p[0]) * 0.22 + side[0] * off, y = p[1] + (toward[1] - p[1]) * 0.22 + side[1] * off; txt(c, sgn, x, y, { align: 'center', color: '#ff7eb6', size: 22 * fs, weight: '700' }); return [x, y]; };
    const pp = markAt(pl, mi, '+'); markAt(mi, pl, '−');
    if (d.vText) { const x = v ? cx + side[0] * off * 1.7 : cx, y = v ? cy : cy + side[1] * off * 1.15; txt(c, d.vText, x, y, { align: v ? 'left' : 'center', color: '#ff7eb6', size: 15 * fs, weight: '700' }); }
    if (this.k >= 1) { const q = (p, other, name) => { if (v) txt(c, name, p[0] - 13, p[1], { align: 'right', color: '#5ad1ff', size: 17 * fs, weight: '700' }); else txt(c, name, p[0], p[1] + 24, { align: 'center', color: '#5ad1ff', size: 17 * fs, weight: '700' }); };
      q(pl, mi, 'A (+)'); q(mi, pl, 'B (−)'); }
    /* the written current arrow (purple) on the other side */
    const iside = [-side[0], -side[1]], p0 = ends[d.iFrom], p1 = ends[d.iFrom === 'a' ? 'b' : 'a'], mid = [(p0[0] * 0.62 + p1[0] * 0.38), (p0[1] * 0.62 + p1[1] * 0.38)];
    const ux = (p1[0] - p0[0]) / (2 * L), uy = (p1[1] - p0[1]) / (2 * L), al = s * 0.75, ax = mid[0] + iside[0] * s * 1.0, ay = mid[1] + iside[1] * s * 1.0;
    const enters = (d.iFrom === d.plus) === (d.iSign > 0); const glow = this.k >= 2;
    if (glow) { c.save(); c.shadowColor = enters ? '#ff6b6b' : '#7ee787'; c.shadowBlur = 14; arrow(c, ax - ux * al, ay - uy * al, ax + ux * al, ay + uy * al, '#c792ea', 3, 11); c.restore(); }
    else arrow(c, ax - ux * al, ay - uy * al, ax + ux * al, ay + uy * al, '#c792ea', 2.6, 10);
    txt(c, d.iText, ax + iside[0] * 16, ay + iside[1] * 16 + (v ? 0 : 0), { align: v ? 'right' : 'center', color: '#c792ea', size: 14.5 * fs, weight: '700' });
    if (d.depText) txt(c, d.depText, cx - s * 1.25, cy, { align: 'right', color: '#e8ecf7', size: 13.5 * fs, weight: '600' });
    if (this.k >= 2) txt(c, enters ? t('กระแสจริงไหลเข้าขั้ว +', 'the real current enters +') : t('กระแสจริงไหลออกจากขั้ว +', 'the real current leaves +'), 10, H - 14, { color: enters ? '#ff6b6b' : '#7ee787', size: 13.5 * fs, weight: '700' });
    if (showP) txt(c, `${sup ? t('จ่าย', 'supplies') : t('รับ', 'absorbs')}  P_abs = ${d.Ptext}`, W - 10, 18, { align: 'right', color: sup ? '#7ee787' : '#ff6b6b', size: 15 * fs, weight: '700' });
    else CK.badge(c, t('? จ่ายหรือรับ', '? supply or absorb'), 'wait');
  }
};

/* ---------------- 9) a whole circuit: supply / absorb halos and the power-balance bars ----------------
   spec: {ground, nodes, parts, els: [{id, tag, plus, v, ref: {from, val | txt}, lab, refY, labY, refShow}]}; focus (index), shown (Set of indices), sumShown */
CH2.PowerCkt = class {
  constructor(canvas, spec) { this.canvas = canvas; this.spec = spec; this.focus = -1; this.shown = new Set(); this.sumShown = false;
    this.ckt = new CK.Circuit({ ground: spec.ground, nodes: spec.nodes, parts: spec.parts.map(q => ({ ...q, name: '', valText: '', label: false })) }); this.ckt.solve();
    this.view = new CK.View(canvas, this.ckt, { speed: 12, ground: false, showI: false, labels: false, pad: 2.1 });
    this.resize(); window.addEventListener('resize', () => this.resize()); LS.anim(canvas, dt => this.frame(dt)); }
  resize() { const r = CK.fit(this.canvas, 0.72, 540); this.ctx = r.ctx; this.W = r.w; this.H = r.h; const top = Math.round(r.h * 0.68);   // at least 540 px wide: on phones the card scrolls sideways (class hscroll)
    this.B = { ckt: { x: 0, y: 30, w: r.w, h: top - 30 }, bars: { x: 6, y: top + 4, w: r.w - 12, h: r.h - top - 8 } }; this.view.ctx = this.ctx; this.view.fit(this.B.ckt); }
  P(e) { return this.ckt.P(e.id); }
  geom(e) { const v = this.view, p = this.ckt.part(e.id), A = v.P(p.a), Bp = v.P(p.b), mx = (A[0] + Bp[0]) / 2, my = (A[1] + Bp[1]) / 2, dx = Bp[0] - A[0], dy = Bp[1] - A[1], L = Math.hypot(dx, dy) || 1;
    const out = { L: [-1, 0], R: [1, 0], U: [0, -1], D: [0, 1] }[e.lab], first = (A[1] < Bp[1] - 1 || (Math.abs(A[1] - Bp[1]) <= 1 && A[0] < Bp[0])) ? A : Bp, last = first === A ? Bp : A;
    return { p, A, Bp, mx, my, ux: dx / L, uy: dy / L, u: v.u, out, at: f => [first[0] + (last[0] - first[0]) * f, first[1] + (last[1] - first[1]) * f] }; }
  frame(dt) {
    const c = this.ctx, els = this.spec.els, v = this.view; c.fillStyle = PAL.bg; c.fillRect(0, 0, this.W, this.H); v.advance(dt);
    const Pmax = Math.max(1e-9, ...els.map(e => Math.abs(this.P(e))));
    els.forEach((e, k) => { if (!this.shown.has(k)) return; const g = this.geom(e), P = this.P(e); if (Math.abs(P) < 1e-9) return; const r = g.u * (0.45 + 0.55 * Math.sqrt(Math.abs(P) / Pmax)), col = P < 0 ? '126,231,135' : '255,107,107';
      const grd = c.createRadialGradient(g.mx, g.my, r * 0.2, g.mx, g.my, r); grd.addColorStop(0, `rgba(${col},.55)`); grd.addColorStop(1, `rgba(${col},0)`); c.save(); c.fillStyle = grd; c.beginPath(); c.arc(g.mx, g.my, r, 0, 2 * Math.PI); c.fill(); c.restore(); });
    if (this.focus >= 0) { const g = this.geom(els[this.focus]); c.save(); c.strokeStyle = '#ff7eb6'; c.lineWidth = 2; c.setLineDash([6, 4]); c.beginPath(); c.arc(g.mx, g.my, g.u * 0.95, 0, 2 * Math.PI); c.stroke(); c.restore(); }
    v.draw();
    els.forEach((e, k) => { const g = this.geom(e), [ox, oy] = g.out, u = g.u, sel = k === this.focus;
      if (g.p.type !== 'V') { const pAtA = e.plus === g.p.a, off = u * 0.42; [[0.2, pAtA ? '+' : '−'], [0.8, pAtA ? '−' : '+']].forEach(([f, sg]) => { const x = g.A[0] + (g.Bp[0] - g.A[0]) * f + ox * off, y = g.A[1] + (g.Bp[1] - g.A[1]) * f + oy * off; v.text(sg, x, y, { color: '#ff7eb6', size: Math.max(13, u * 0.36), weight: '700' }); }); }
      const [lx0, ly0] = g.at(e.labY ?? 0.5), tx_ = lx0 + ox * u * 0.95, ty_ = ly0 + oy * u * 0.95, tr = Math.max(11, u * 0.27);
      const cxT = tx_ + (ox !== 0 ? ox * tr : 0), cyT = ty_ + (oy !== 0 ? oy * tr * 0.6 : -tr * 1.25);
      c.save(); c.fillStyle = sel ? '#ff7eb6' : '#2a3150'; c.strokeStyle = '#ff7eb6'; c.lineWidth = 1.5; c.beginPath(); c.arc(cxT, cyT, tr, 0, 2 * Math.PI); c.fill(); c.stroke(); c.restore();
      v.text(String(k + 1), cxT, cyT + 1, { color: sel ? '#0f1220' : '#ffffff', size: Math.max(12, u * 0.3), weight: '700' });
      if (e.v !== null && e.v !== undefined) v.text(`${e.v} V`, ox !== 0 ? tx_ + ox * tr * 2.3 : tx_, oy !== 0 ? ty_ + oy * tr * 1.9 : ty_ + tr * 0.3, { color: '#e8ecf7', size: Math.max(12, u * 0.3), weight: '600', align: ox > 0 ? 'left' : ox < 0 ? 'right' : 'center' });
      if (e.refShow !== false && (e.ref.val !== null || e.ref.txt)) { const inx = -ox, iny = -oy, s = e.ref.from === g.p.a ? 1 : -1, al = u * 0.32, [rx0, ry0] = g.at(e.refY ?? 0.5), cx0 = rx0 + inx * u * 0.48, cy0 = ry0 + iny * u * 0.48;
        arrow(c, cx0 - g.ux * al * s, cy0 - g.uy * al * s, cx0 + g.ux * al * s, cy0 + g.uy * al * s, '#c792ea', 2.4, 9);
        v.text(e.ref.txt || um(`${e.ref.val} A`), inx !== 0 ? cx0 + inx * u * 0.42 : cx0, iny !== 0 ? cy0 + iny * u * 0.42 : cy0, { color: '#c792ea', size: Math.max(11.5, u * 0.27), weight: '700', align: inx > 0 ? 'left' : inx < 0 ? 'right' : 'center' }); } });
    /* bars */
    const b = this.B.bars, Ps = els.map(e => this.P(e)), midY = b.y + b.h / 2 + 6, hh = b.h / 2 - 26; c.save(); c.fillStyle = '#161a2f'; c.fillRect(b.x, b.y, b.w, b.h); c.strokeStyle = '#3a4160'; c.beginPath(); c.moveTo(b.x + 86, midY); c.lineTo(b.x + b.w - 8, midY); c.stroke(); c.restore();
    v.text(t('จ่าย ↑', 'supply ↑'), b.x + 44, midY - hh / 2, { color: '#7ee787', size: 13, weight: '600' }); v.text(t('รับ ↓', 'absorb ↓'), b.x + 44, midY + hh / 2, { color: '#ff6b6b', size: 13, weight: '600' });
    const n = els.length, slot = (b.w - 96) / (n + 1);
    els.forEach((e, k) => { const x = b.x + 92 + slot * (k + 0.5), on = this.shown.has(k), h = on ? Math.abs(Ps[k]) / Pmax * hh : 0, s = Ps[k] < 0;
      c.save(); c.fillStyle = s ? '#7ee787' : '#ff6b6b'; c.globalAlpha = k === this.focus ? 1 : 0.8; if (s) c.fillRect(x - slot * 0.28, midY - h, slot * 0.56, h); else c.fillRect(x - slot * 0.28, midY, slot * 0.56, h); c.restore();
      v.text(String(k + 1), x, b.y + 10, { color: '#e8ecf7', size: 14, weight: '700' });
      if (on) v.text(`${s ? '+' : '−'}${fd(Math.abs(Ps[k]), 1)} W`, x, s ? midY - h - 9 : midY + h + 10, { color: s ? '#7ee787' : '#ff6b6b', size: 12, weight: '600' }); else v.text('?', x, midY - 10, { color: '#9aa3c7', size: 15, weight: '700' }); });
    const x = b.x + 92 + slot * (n + 0.5), sS = Ps.filter(p => p < 0).reduce((a, p) => a - p, 0), sA = Ps.filter(p => p > 0).reduce((a, p) => a + p, 0);
    v.text('Σ', x, b.y + 10, { color: '#e8ecf7', size: 14, weight: '700' }); v.text(this.sumShown ? `${fd(sS, 1)} = ${fd(sA, 1)}` : '?', x, midY - 10, { color: '#ffd166', size: 12.5, weight: '700' }); if (this.sumShown) v.text('W ✓', x, midY + 10, { color: '#ffd166', size: 12.5, weight: '700' });
    CK.badge(c, this.focus >= 0 ? t(`กำลังคิดอุปกรณ์ ${this.focus + 1}`, `working on part ${this.focus + 1}`) : t('กระแสจริงวิ่งอยู่ · เปิดเฉลยทีละอุปกรณ์', 'real current running · open the parts one by one'), this.focus >= 0 ? 'ok' : 'wait');
  }
  /* for the step text: voltage across (+ over −) and the current entering the + terminal */
  info(k) { const e = this.spec.els[k], p = this.ckt.part(e.id), vPlus = this.ckt.V(e.plus).re - this.ckt.V(e.plus === p.a ? p.b : p.a).re, i = this.ckt.I(e.id).re;
    return { P: this.ckt.P(e.id), vPlus, iIn: e.plus === p.a ? i : -i, type: p.type }; }
};

global.CH2 = CH2;
})(window);
