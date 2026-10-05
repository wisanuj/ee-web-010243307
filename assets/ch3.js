/* ch3.js — chapter 3 in the problem-by-problem format (rebuilt Oct 2026): counting nodes and loops, Kirchhoff's current
   and voltage laws, combining sources and resistors, voltage and current division.
   Built on circuit.js (solver, topology(), loopWalk, walkNodes, polarity, refArrow, meshLoop, glow, netColor / netLetters),
   draw.js (DRAW.Plot) and lesson.js (LS.anim, LS.u).
   1) CH3.Topo    one circuit to count: node colours and letters, numbered branches, mesh rings, a bead walking each loop
   2) CH3.KCL     one node at a time: the currents written in the problem (purple, "?" for the unknown) and green-in /
                  orange-out arrows at the chosen node; the unknown branch only carries dots once it is solved
   3) CH3.KVL     a walker going round a loop clockwise, the trail it leaves and the potential along the walk
   4) CH3.Stages  a reduction step by step: the group to combine next glows amber, what was just formed glows pink
   5) CH3.Boxes   boxes with a given voltage and current: R = v/i and whether each box absorbs or delivers power
   6) CH3.VDiv, CH3.IDiv  live voltage and current dividers with proportional bars
   7) CH3.Parallel  two voltage sources in parallel (forbidden unless equal), each with a small internal resistance
   Every class draws through LS.anim and must call this.start() at the end of its constructor (LS.anim draws at once);
   set(...) changes what is shown and is called from the steppers' onStep. */
(function (global) {
'use strict';
const CH3 = {};
const PAL = CK.PAL, t = (th, en) => MC.t(th, en);
const NETCOL = ['#5ad1ff', '#ff7eb6', '#7ee787', '#c792ea', '#ffa552', '#f1f3f5', '#ff6b6b', '#ffd166'];
CH3.NETCOL = NETCOL;
const mk = s => new CK.Circuit({ ground: s.ground, nodes: s.nodes, parts: s.parts.map(q => ({ ...q })) });
const u3 = (x, n = 3) => LS.u(Math.abs(x) < 1e-12 ? 0 : x, n);
CH3.u = u3;

/* glow strokes under the given parts (drawn before the view so the parts sit on top) */
const glowParts = (v, ids, color, wide) => { const c = v.ctx; v.ckt.parts.forEach(p => { if (!ids.has(p.id)) return; const pts = v.path(p);
  c.save(); c.strokeStyle = color; c.lineWidth = wide || Math.max(10, v.u * 0.32); c.lineCap = 'round'; c.lineJoin = 'round';
  c.beginPath(); pts.forEach((q, i) => i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1])); c.stroke(); c.restore(); }); };
CH3.glowParts = glowParts;
/* small filled arrow from (x1, y1) to (x2, y2) */
const arrow = (c, x1, y1, x2, y2, col, w = 4) => { c.save(); c.strokeStyle = col; c.fillStyle = col; c.lineWidth = w; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
  const an = Math.atan2(y2 - y1, x2 - x1), hl = 11; c.beginPath(); c.moveTo(x2, y2); c.lineTo(x2 - hl * Math.cos(an - 0.5), y2 - hl * Math.sin(an - 0.5)); c.lineTo(x2 - hl * Math.cos(an + 0.5), y2 - hl * Math.sin(an + 0.5)); c.closePath(); c.fill(); c.restore(); };

class Sim {
  constructor(canvas, o) { this.canvas = canvas; this.o = Object.assign({ aspect: 0.6, aspectN: 0.8, minW: 300, narrowAt: 520 }, o); }
  start() { this.resize(); window.addEventListener('resize', () => this.resize()); LS.anim(this.canvas, dt => this.frame(dt)); return this; }
  resize() { const w = this.canvas.parentElement.clientWidth - 12; this.narrow = w < this.o.narrowAt;
    const r = CK.fit(this.canvas, this.narrow ? this.o.aspectN : this.o.aspect, this.o.minW); this.ctx = r.ctx; this.W = r.w; this.H = r.h; this.layout(); }
  layout() {}
  clear() { const c = this.ctx; c.fillStyle = PAL.bg; c.fillRect(0, 0, this.W, this.H); }
  /* margin around the circuit in grid units: a little wider on phones so outer labels stay on the canvas */
  fitView(v, box, base) { v.ctx = this.ctx; if (base !== undefined) v.o.pad = this.narrow ? base + (this.o.padN ?? 0.5) : base; v.fit(box); }
}

/* ---------------- 1) counting nodes, branches, meshes and loops ----------------
   spec: { nodes, parts, ground, labels (letters of the nodes in reading order), meshes: [[gx, gy, r?], …] (ring centres in grid units),
           speed, pad, aspect, aspectN, dots (false: no moving current) }
   set({ colors, letters, branches, meshes (number of rings), cycle (walk every loop in turn), loopK (one loop), dots }) */
CH3.Topo = class extends Sim {
  constructor(canvas, spec) { super(canvas, { aspect: spec.aspect || 0.62, aspectN: spec.aspectN || 0.86 }); this.spec = spec;
    this.S = { colors: false, letters: false, branches: false, meshes: 0, cycle: false, loopK: -1, dots: spec.dots !== false }; this.lt = 0;
    this.build(); this.start(); }
  build() { const s = this.spec; this.ckt = mk(s); this.ckt.solve(); this.retopo();
    this.view = new CK.View(this.canvas, this.ckt, { speed: s.speed || 30, ground: false, showI: false, pad: s.pad ?? 1.45, tips: false,
      onToggle: () => { this.ckt.solve(); this.retopo(); if (this.onToggle) this.onToggle(this); } }); }
  retopo() { this.T = this.ckt.topology({ labels: this.spec.labels }); this.walkK = -1; }
  layout() { this.fitView(this.view, { x: 0, y: 36, w: this.W, h: this.H - 40 }, this.spec.pad ?? 1.45); this.walkK = -1; }
  set(o) { const re = ('cycle' in o && o.cycle !== this.S.cycle) || ('loopK' in o && o.loopK !== this.S.loopK); Object.assign(this.S, o); if (re) { this.lt = 0; this.walkK = -1; } }
  loopNow() { const n = this.T.loops.length; if (!n) return -1; if (this.S.loopK >= 0) return this.S.loopK % n; return this.S.cycle ? Math.floor(this.lt / 2.6) % n : -1; }
  walkFor(k) { if (this.walkK === k && this.walk) return this.walk; const segs = this.ckt.loopWalk(this.T.loops[k], this.T), pts = [];
    segs.forEach(sg => { let q = this.view.path(sg.part); if (sg.from !== sg.part.a) q = q.slice().reverse(); q.forEach((pt, i) => { if (!(i === 0 && pts.length)) pts.push(pt); }); });
    this.walk = new CK.Flow(pts); this.walkIds = new Set(segs.map(sg => sg.part.id)); this.walkK = k; return this.walk; }
  loopText(k) { const L = this.T.loops[k]; return L.verts.map(v => this.T.nets[v].label).join(' → '); }
  /* list of every loop as TeX-free text (for the step body) */
  loopList() { return this.T.loops.map((L, k) => `${k + 1}) ${this.loopText(k)}`); }
  branchTag(p, num) { const v = this.view, A = v.P(p.a), B = v.P(p.b), u = v.u, vert = Math.abs(B[1] - A[1]) > Math.abs(B[0] - A[0]), side = p.side || 1;
    const off = (this.spec.tagOff || 0.66) * u, x = (A[0] + B[0]) / 2 + (vert ? -side * off : 0), y = (A[1] + B[1]) / 2 + (vert ? 0 : side * off), r = Math.max(9, u * 0.2), c = this.ctx;
    c.save(); c.fillStyle = '#ffa552'; c.beginPath(); c.arc(x, y, r, 0, 2 * Math.PI); c.fill(); c.restore();
    v.text(String(num), x, y + 0.5, { color: '#10131f', size: Math.max(11, r * 1.15), weight: '700' }); }
  msg(k) { const S = this.S, T = this.T;
    if (k >= 0) return t(`ลูปที่ ${k + 1} จาก ${T.loops.length}: ${this.loopText(k)}`, `Loop ${k + 1} of ${T.loops.length}: ${this.loopText(k)}`);
    if (S.meshes) return t(`เมช m = b − n + 1 = ${T.b} − ${T.n} + 1 = ${T.meshes}`, `Meshes m = b − n + 1 = ${T.b} − ${T.n} + 1 = ${T.meshes}`);
    if (S.branches) return t(`กิ่ง b = ${T.b} (อุปกรณ์ ${T.b} ตัว)`, `Branches b = ${T.b} (${T.b} elements)`);
    if (S.colors || S.letters) return t(`โนด n = ${T.n} (${T.n} สี)`, `Nodes n = ${T.n} (${T.n} colours)`);
    return t('ลองนับเองก่อน แล้วกดเปิดเฉลย', 'Count it yourself first, then open the steps'); }
  frame(dt) {
    const S = this.S, v = this.view, T = this.T; this.lt += dt; this.clear();
    v.o.netColor = S.colors ? (n => T.netOf[n] === undefined ? PAL.wire : NETCOL[T.netOf[n] % NETCOL.length]) : null;
    v.o.netLetters = S.letters ? T : null; v.o.dots = S.dots;
    const k = this.loopNow(); if (k >= 0) { this.walkFor(k); v.o.glow = this.walkIds; v.o.glowColor = 'rgba(126,231,135,.34)'; } else v.o.glow = null;
    v.advance(dt); v.draw();
    if (S.branches) T.elements.forEach((e, i) => this.branchTag(e.part, i + 1));
    (this.spec.meshes || []).slice(0, S.meshes).forEach((m, i) => v.meshLoop(m[0], m[1], m[2] || 0.5, { label: String(i + 1), color: '#c792ea' }));
    if (k >= 0) { this.walk.advance(85, dt); this.walk.draw(this.ctx, { color: '#7ee787', r: Math.max(4, v.u * 0.1), spacing: Math.max(60, this.walk.len / 3), glow: true }); }
    T.shorted.forEach(e => { const p = e.part, A = v.P(p.a), B = v.P(p.b); v.text(t('ถูกลัด: ไม่นับ', 'shorted: not counted'), (A[0] + B[0]) / 2, (A[1] + B[1]) / 2 - v.u * 0.78, { color: '#ff6b6b', size: 13.5, weight: '700' }); });
    CK.badge(this.ctx, this.msg(k), (S.colors || S.letters || S.branches || S.meshes || k >= 0) ? 'ok' : 'wait');
  }
};

/* ---------------- 2) KCL at one node ----------------
   spec: { nodes, parts, ground, vals: {id: current a→b} when the numbers cannot come from real parts (no dots then),
           refs: [{id, from, text, side, at, off, ask, key, solvedText}] the currents written in the problem; ask marks an unknown:
           it reads "text = ?" and its part carries no dots until solved, then solvedText. labels (node letters), letters (default true),
           letterNodes (grid nodes that carry a letter), speed, pad, aspect }
   set({ sel: node letter or null, io (green-in / orange-out arrows at sel), solved: true | [keys of the solved unknowns], letters }) */
CH3.KCL = class extends Sim {
  constructor(canvas, spec) { super(canvas, { aspect: spec.aspect || 0.56, aspectN: spec.aspectN || 0.8 }); this.spec = spec;
    this.S = { sel: null, io: false, solved: false, letters: spec.letters !== false }; this.build(); this.set({}); this.start(); }
  build() { const s = this.spec; this.ckt = mk(s); this.real = !s.vals; if (this.real) this.ckt.solve();
    this.T = this.ckt.topology({ labels: s.labels, loops: false });
    this.view = new CK.View(this.canvas, this.ckt, { speed: s.speed || 26, ground: false, showI: false, pad: s.pad ?? 1.55, tips: false, dots: this.real, letterNodes: s.letterNodes }); }
  layout() { this.fitView(this.view, { x: 0, y: 36, w: this.W, h: this.H - 40 }, this.spec.pad ?? 1.55); }
  cur(id) { return this.real ? this.ckt.I(id).re : (this.spec.vals[id] ?? 0); }
  net(L) { if (L === null || L === undefined) return null; const k = this.T.nets.findIndex(n => n.label === L); return k < 0 ? null : k; }
  isSolved(r) { const s = this.S.solved; return s === true || (Array.isArray(s) && s.includes(r.key || r.id)); }
  anySolved() { const s = this.S.solved; return s === true || (Array.isArray(s) && s.length > 0); }
  set(o) { Object.assign(this.S, o); if (this.real) (this.spec.refs || []).forEach(r => { if (!r.ask) return; const p = this.ckt.part(r.id); if (p) p.noDots = !this.isSolved(r); }); }
  nodeCurrents(k) { return this.T.elements.filter(e => e.na === k || e.nb === k).map(e => { const I = this.cur(e.part.id); return { p: e.part, into: (e.nb === k ? I : 0) - (e.na === k ? I : 0) }; }); }
  ioArrows(k) {
    const c = this.ctx, v = this.view, u = v.u, asks = (this.spec.refs || []).filter(r => r.ask);
    this.nodeCurrents(k).forEach(({ p, into }) => { if (Math.abs(into) < 1e-9) return; const atA = this.T.netOf[p.a] === k; const tN = atA ? p.a : p.b, oN = atA ? p.b : p.a;
      const Tp = v.P(tN), Op = v.P(oN), dx = Tp[0] - Op[0], dy = Tp[1] - Op[1], L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
      const m = [Tp[0] - ux * u * 0.66, Tp[1] - uy * u * 0.66], dir = into > 0 ? 1 : -1, al = u * 0.24, col = into > 0 ? '#7ee787' : '#ffa552';
      arrow(c, m[0] - ux * al * dir, m[1] - uy * al * dir, m[0] + ux * al * dir, m[1] + uy * al * dir, col);
      const r = asks.find(x => x.id === p.id), hide = !!r && !this.isSolved(r), vert = Math.abs(uy) > 0.7, lab = hide ? '?' : CK.eng(Math.abs(into), 'A');
      const sd = p.label === false ? 1 : (p.side || 1);   // keep clear of the part's own label: the other side of it
      v.text(lab, m[0] + (vert ? -sd * u * 0.36 : 0), m[1] + (vert ? 0 : sd * u * 0.34), { color: col, size: 14, weight: '700', align: vert ? (sd > 0 ? 'right' : 'left') : 'center' }); });
  }
  frame(dt) {
    const S = this.S, v = this.view, T = this.T, s = this.spec; this.clear(); const k = this.net(S.sel);
    v.o.netLetters = S.letters ? T : null;
    if (k !== null) { glowParts(v, new Set(this.ckt.parts.filter(p => p.type === 'W' && T.netOf[p.a] === k).map(p => p.id)), 'rgba(90,209,255,.40)');
      const c = this.ctx; for (const n in this.ckt.nodes) if (T.netOf[n] === k) { const [x, y] = v.P(n); c.save(); c.fillStyle = 'rgba(90,209,255,.45)'; c.beginPath(); c.arc(x, y, Math.max(7, v.u * 0.17), 0, 2 * Math.PI); c.fill(); c.restore(); } }
    v.advance(dt); v.draw();
    (s.refs || []).forEach(r => { const p = this.ckt.part(r.id), sol = r.ask && this.isSolved(r); const txt = r.ask ? (sol ? (r.solvedText || r.text) : `${r.text} = ?`) : r.text;
      v.refArrow(p, r.from, txt, { side: r.side, at: r.at, off: r.off ?? 0.55, color: r.ask ? (sol ? '#7ee787' : '#ff7eb6') : '#c792ea' }); });
    if (k !== null && S.io) this.ioArrows(k);
    CK.badge(this.ctx, k !== null ? t(`โนด ${T.nets[k].label}: ΣI เข้า = ΣI ออก`, `Node ${T.nets[k].label}: ΣI in = ΣI out`) : (this.anySolved() ? t('หาได้แล้ว', 'solved') : t('ลองหาเองก่อน', 'Try it yourself first')), k !== null || this.anySolved() ? 'ok' : 'wait');
  }
};

/* ---------------- 3) KVL walker ----------------
   spec: { nodes, parts, ground, vals: {id: v(+ mark) − v(other end)} when the numbers cannot come from real parts,
           labels: { id: { plus, sym (TeX), txt (canvas), side, src (sources: no extra marks), name, extra, at } },
           loops: [{ nodes: [grid nodes of the walk, back to the start], unknown: id, th, en }], refs, speed, pad, aspect }
   set({ loop, upto (elements passed on this loop), solved: [loop indices whose unknown is found], hide: [ids whose value stays "?"], dots }) */
CH3.KVL = class extends Sim {
  constructor(canvas, spec) { super(canvas, { aspect: spec.aspect || 0.9, aspectN: spec.aspectN || 1.2 }); this.spec = spec;
    this.S = { loop: 0, upto: 0, solved: new Set(), hide: new Set(), dots: spec.dots !== false }; this.s = 0; this.build(); this.start(); }
  build() { const sp = this.spec; this.ckt = mk(sp); this.real = !sp.vals; if (this.real) this.ckt.solve();
    this.view = new CK.View(this.canvas, this.ckt, { speed: sp.speed || 10, ground: false, showI: false, dots: false, labels: false, pad: sp.pad ?? 1.75, tips: false }); }
  layout() { const top = Math.round(this.H * 0.6); this.B = { ckt: { x: 0, y: 36, w: this.W, h: top - 38 }, plot: { x: 0, y: top + 4, w: this.W, h: this.H - top - 8 } };
    this.fitView(this.view, this.B.ckt, this.spec.pad ?? 1.75); this.mkLoop(); }
  value(id) { if (!this.real) return this.spec.vals[id]; const L = this.spec.labels[id], p = this.ckt.part(id), other = L.plus === p.a ? p.b : p.a; return this.ckt.V(L.plus).re - this.ckt.V(other).re; }
  mkLoop() { const lp = this.spec.loops[this.S.loop], segs = this.ckt.walkNodes(lp.nodes), pts = [], els = []; let acc = 0;
    segs.forEach(sg => { let q = this.view.path(sg.part); if (sg.from !== sg.part.a) q = q.slice().reverse(); let len = 0; for (let i = 1; i < q.length; i++) len += Math.hypot(q[i][0] - q[i - 1][0], q[i][1] - q[i - 1][1]);
      const L = this.spec.labels[sg.part.id]; if (L) els.push({ id: sg.part.id, s0: acc, s1: acc + len, sign: sg.from === L.plus ? 1 : -1, L });
      q.forEach((pt, i) => { if (!(i === 0 && pts.length)) pts.push(pt); }); acc += len; });
    this.segs = segs; this.els = els; this.path = new CK.Flow(pts); this.total = acc; this.s = Math.min(this.s, this.target()); }
  set(o) { const ch = 'loop' in o && o.loop !== this.S.loop; Object.assign(this.S, o); if (o.solved) this.S.solved = new Set(o.solved); if (o.hide) this.S.hide = new Set(o.hide); if (ch && this.view.u) { this.s = 0; this.mkLoop(); } }
  target() { const n = this.els ? this.els.length : 0, j = Math.min(this.S.upto, n); if (!n || j === 0) return 0; if (j >= n) return this.total; return this.els[j - 1].s1; }
  isUnknown(id) { return this.spec.loops[this.S.loop].unknown === id; }
  known(id) { const k = this.spec.loops.findIndex(l => l.unknown === id); return k < 0 || this.S.solved.has(k); }
  potentialAt(s) { let v = 0; for (const e of this.els) { if (s <= e.s0) break; const f = Math.min(1, (s - e.s0) / Math.max(1, e.s1 - e.s0)); v -= e.sign * this.value(e.id) * f; } return v; }
  frame(dt) {
    const sp = this.spec, v = this.view, c = this.ctx; this.clear();
    const T = this.target(); if (this.s < T) this.s = Math.min(T, this.s + 240 * dt); else if (this.s > T) this.s = T;
    v.o.dots = this.real && this.S.dots;
    glowParts(v, new Set(this.segs.map(sg => sg.part.id)), 'rgba(126,231,135,.13)');
    v.advance(dt); v.draw();
    for (const id in sp.labels) { const L = sp.labels[id], part = this.ckt.part(id), unk = !this.known(id) || this.S.hide.has(id), here = this.isUnknown(id);
      const val = /[a-z]/i.test(L.sym) && !unk ? ` = ${u3(this.value(id), 2)} V` : '';
      const text = unk ? `${L.txt} = ?` : L.txt + val, nm = [L.name, L.extra].filter(Boolean).join('  ');
      v.polarity(part, L.plus, { side: L.side, text, at: L.at, color: unk ? '#ff7eb6' : (here ? '#7ee787' : '#5ad1ff'), marks: !L.src });
      if (nm) { const A = v.P(part.a), Bp = v.P(part.b), opp = { L: [1, 0], R: [-1, 0], U: [0, 1], D: [0, -1] }[L.nameSide || L.side];
        v.text(nm, (A[0] + Bp[0]) / 2 + opp[0] * v.u * 0.58, (A[1] + Bp[1]) / 2 + opp[1] * v.u * 0.52, { color: '#cfd6ec', size: 13, weight: '600', align: opp[0] > 0 ? 'left' : opp[0] < 0 ? 'right' : 'center' }); } }
    (sp.refs || []).forEach(r => v.refArrow(this.ckt.part(r.id), r.from, r.text, { side: r.side, at: r.at, off: r.off ?? 0.5 }));
    // trail and walker
    const trail = []; const N = 90; for (let k = 0; k <= N; k++) trail.push(this.path.at(this.s * k / N));
    c.save(); c.strokeStyle = 'rgba(126,231,135,.78)'; c.lineWidth = Math.max(5, v.u * 0.14); c.lineCap = 'round'; c.lineJoin = 'round'; c.beginPath(); trail.forEach((q, i) => i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1])); c.stroke(); c.restore();
    const [wx, wy] = this.path.at(this.s), [ax, ay] = this.path.at(Math.min(this.total, this.s + 6)), ang = Math.atan2(ay - wy, ax - wx) || 0;
    c.save(); c.translate(wx, wy); c.rotate(ang); c.fillStyle = '#7ee787'; c.shadowColor = '#7ee787'; c.shadowBlur = 12; c.beginPath(); c.moveTo(13, 0); c.lineTo(-9, -9); c.lineTo(-4, 0); c.lineTo(-9, 9); c.closePath(); c.fill(); c.restore();
    this.plot();
    const lp = sp.loops[this.S.loop];
    CK.badge(c, t(`${lp.th} · เดินตามเข็มนาฬิกา`, `${lp.en} · walking clockwise`), 'ok');
  }
  plot() {
    const b = this.B.plot, N = 220, xs = [], ys = []; for (let k = 0; k <= N; k++) { const s = this.total * k / N; xs.push(s); ys.push(this.potentialAt(s)); }
    let lo = Math.min(0, ...ys), hi = Math.max(0, ...ys); const pad = (hi - lo) * 0.16 || 1; lo -= pad; hi += pad;
    const pl = new DRAW.Plot(this.ctx, b, { xlim: [0, this.total], ylim: [lo, hi], title: this.narrow ? t('ศักย์ระหว่างเดิน [V]', 'potential along the walk [V]') : t('ศักย์ระหว่างเดิน เทียบกับจุดเริ่ม [V]', 'potential along the walk, relative to the start [V]'), ml: 52, xfmt: () => '' });
    pl.frame({ nx: 1 });
    this.els.forEach(e => { const unk = !this.known(e.id); pl.band(e.s0, e.s1, { color: unk ? '#ff7eb6' : '#5ad1ff', alpha: 0.09 });
      pl.text((e.s0 + e.s1) / 2, lo, e.L.name || e.L.txt, { dy: -8, align: 'center', size: 12, color: unk ? '#ff7eb6' : '#9aa3c7' }); });
    pl.hline(0, { color: '#6b7399', dash: [3, 3] });
    // walked part in green; the unknown's stretch is dashed pink until it is found (the walk must come back to 0)
    const seg = (a, b, o) => { if (b <= a) return; const xs = [], ys = [], M = Math.max(2, Math.round(80 * (b - a) / this.total)); for (let k = 0; k <= M; k++) { const s = a + (b - a) * k / M; xs.push(s); ys.push(this.potentialAt(s)); } pl.line(xs, ys, o); };
    const green = { color: '#7ee787', width: 2.6 }, pink = { color: '#ff7eb6', width: 2.6, dash: [6, 5] }; let a = 0;
    this.els.filter(e => !this.known(e.id)).forEach(e => { seg(a, Math.min(this.s, e.s0), green); seg(e.s0, Math.min(this.s, e.s1), pink); a = e.s1; });
    seg(a, this.s, green);
    pl.marker(this.s, this.potentialAt(this.s), { type: 'dot', color: '#7ee787', r: 5, force: true });
  }
};

/* ---------------- 4) reduction stages ----------------
   spec: { stages: [{ nodes, parts, ground, group: [ids to combine next], born: [ids just formed], pols: [{id, plus, text, side}], refs: [{id, from, text, side, at}] }],
           quant: { th, en, get: ckt => number, unit, sig }, badge: (k, ckt, shown) => text (replaces the stage / value badge), speed, pad, aspect }
   Stages may repeat one circuit with different glows (a step-by-step highlight on the original circuit).
   set(k): show stage k (0 = the original circuit). reveal(on): show the asked value and the moving current (after the last step) */
CH3.Stages = class extends Sim {
  constructor(canvas, spec) { super(canvas, { aspect: spec.aspect || 0.56, aspectN: spec.aspectN || 0.82 }); this.spec = spec; this.k = 0; this.shown = false; this.build(); this.start(); }
  build() { const st = this.spec.stages[this.k]; this.ckt = mk({ ground: st.ground || this.spec.ground || Object.keys(st.nodes)[0], nodes: st.nodes, parts: st.parts }); this.ckt.solve();
    this.view = new CK.View(this.canvas, this.ckt, { speed: this.spec.speed || 20, ground: false, showI: false, pad: this.spec.pad ?? 1.6, tips: false }); if (this.W) this.layout(); }
  layout() { this.fitView(this.view, { x: 0, y: 36, w: this.W, h: this.H - 40 }, this.spec.pad ?? 1.6); }
  set(k) { k = Math.max(0, Math.min(this.spec.stages.length - 1, k)); if (k !== this.k) { this.k = k; this.build(); } }
  reveal(on) { this.shown = on; }
  frame(dt) {
    this.clear(); const st = this.spec.stages[this.k], v = this.view, last = this.spec.stages.length - 1;
    if (st.group) glowParts(v, new Set(st.group), 'rgba(255,209,102,.40)');
    v.o.glow = st.born ? new Set(st.born) : null; v.o.glowColor = 'rgba(255,126,182,.5)'; v.o.dots = this.shown;
    v.advance(dt); v.draw();
    (st.pols || []).forEach(q => v.polarity(this.ckt.part(q.id), q.plus, { side: q.side, text: q.text, at: q.at, color: '#5ad1ff' }));
    (st.refs || []).forEach(r => v.refArrow(this.ckt.part(r.id), r.from, r.text, { side: r.side, at: r.at, off: r.off ?? 0.5 }));
    const q = this.spec.quant, name = this.k === 0 ? t('วงจรเดิม', 'original circuit') : t(`ขั้นที่ ${this.k} จาก ${last}`, `stage ${this.k} of ${last}`);
    const val = q ? (this.shown ? `${t(q.th, q.en)} = ${CK.eng(q.get(this.ckt), q.unit, q.sig || 3)}${this.k < last ? t(' (เท่าเดิม)', ' (unchanged)') : ''}` : `${t(q.th, q.en)} = ?`) : '';
    CK.badge(this.ctx, this.spec.badge ? this.spec.badge(this.k, this.ckt, this.shown) : val ? `${name} · ${val}` : name, this.shown ? 'ok' : 'wait');
  }
};

/* ---------------- 5) boxes with given v and i: resistance and power ----------------
   spec: { nodes, parts (boxes: {id, type 'R', draw 'box'}; wires), els: [{ id, name, plus, v, iIn (current into the + terminal), lab (side of the
           voltage text), vText, ref: {from, text, side, at} }], pad, aspect }
   set({ focus: index or -1, shown: [indices whose R and P are shown] }) */
CH3.Boxes = class extends Sim {
  constructor(canvas, spec) { super(canvas, { aspect: spec.aspect || 0.62, aspectN: spec.aspectN || 0.9 }); this.spec = spec; this.S = { focus: -1, shown: [] };
    this.ckt = mk({ ground: spec.ground || Object.keys(spec.nodes)[0], nodes: spec.nodes, parts: spec.parts.map(p => ({ ...p, name: '', valText: '', label: false })) });
    this.view = new CK.View(canvas, this.ckt, { ground: false, showI: false, dots: false, labels: false, pad: spec.pad ?? 1.9, tips: false }); this.start(); }
  layout() { const tb = Math.max(Math.round(this.H * 0.28), 19 * this.spec.els.length + 14); this.tb = { x: 8, y: this.H - tb, w: this.W - 16, h: tb - 6 };
    this.fitView(this.view, { x: 0, y: 36, w: this.W, h: this.H - 40 - tb }, this.spec.pad ?? 1.9); }
  set(o) { Object.assign(this.S, o); }
  frame() {
    const v = this.view, c = this.ctx, sp = this.spec; this.clear();
    sp.els.forEach((e, i) => { if (!this.S.shown.includes(i)) return; const p = this.ckt.part(e.id), A = v.P(p.a), B = v.P(p.b), x = (A[0] + B[0]) / 2, y = (A[1] + B[1]) / 2, P = e.v * e.iIn;
      c.save(); c.fillStyle = P >= 0 ? 'rgba(255,107,107,.28)' : 'rgba(126,231,135,.28)'; c.beginPath(); c.arc(x, y, v.u * 0.62, 0, 2 * Math.PI); c.fill(); c.restore(); });
    v.draw();
    sp.els.forEach((e, i) => { const p = this.ckt.part(e.id), A = v.P(p.a), B = v.P(p.b), x = (A[0] + B[0]) / 2, y = (A[1] + B[1]) / 2, foc = this.S.focus === i;
      v.text(e.name, x, y + 1, { color: foc ? '#ffd166' : '#e8ecf7', size: Math.max(13, v.u * 0.34), weight: '700' });
      v.polarity(p, e.plus, { side: e.lab, text: e.vText || `${u3(e.v, 2)} V`, color: foc ? '#ffd166' : '#5ad1ff' });
      if (e.ref) v.refArrow(p, e.ref.from, e.ref.text, { side: e.ref.side, at: e.ref.at, off: e.ref.off ?? 0.55, color: foc ? '#ffd166' : '#c792ea' }); });
    // results table under the circuit: one line per box already worked out
    const b = this.tb; c.save(); c.fillStyle = '#161a2f'; c.fillRect(b.x, b.y, b.w, b.h); c.restore(); const lh = Math.min(20, (b.h - 8) / sp.els.length);
    sp.els.forEach((e, i) => { const y = b.y + 6 + lh * (i + 0.5), P = e.v * e.iIn, R = e.v / e.iIn, sh = this.S.shown.includes(i), x1 = b.x + 10, x2 = b.x + b.w * 0.2, x3 = b.x + b.w * 0.58;
      v.text(t(`กล่อง ${e.name}`, `box ${e.name}`), x1, y, { color: this.S.focus === i ? '#ffd166' : '#cfd6ec', size: 12.5, weight: '700', align: 'left' });
      v.text(sh ? `R = ${u3(R, 3)} Ω` : 'R = ?', x2, y, { color: '#e8ecf7', size: 12.5, weight: '600', align: 'left' });
      v.text(sh ? (P >= 0 ? t(`รับ ${u3(P, 2)} W`, `absorbs ${u3(P, 2)} W`) : t(`จ่าย ${u3(-P, 2)} W`, `delivers ${u3(-P, 2)} W`)) : '', x3, y, { color: P >= 0 ? '#ff6b6b' : '#7ee787', size: 12.5, weight: '700', align: 'left' }); });
    const sh = this.S.shown.map(i => sp.els[i]); const del = sh.filter(e => e.v * e.iIn < 0).reduce((a, e) => a - e.v * e.iIn, 0), abs = sh.filter(e => e.v * e.iIn >= 0).reduce((a, e) => a + e.v * e.iIn, 0);
    CK.badge(c, sh.length ? t(`จ่ายรวม ${u3(del, 2)} W · รับรวม ${u3(abs, 2)} W`, `delivered ${u3(del, 2)} W · absorbed ${u3(abs, 2)} W`) : t('กล่องแต่ละใบ: R = v/i และรับหรือจ่ายกำลัง', 'each box: R = v/i, and does it absorb or deliver?'), sh.length === sp.els.length ? 'ok' : 'wait');
  }
};

/* ---------------- 6) live voltage divider and current divider ---------------- */
CH3.VDiv = class extends Sim {
  constructor(canvas, o = {}) { super(canvas, { aspect: 0.6, aspectN: 0.82 }); this.S = Object.assign({ V: 10, R1: 2, R2: 8 }, o);
    this.ckt = new CK.Circuit({ ground: 'g', nodes: { a: [0, 0], b: [3, 0], c: [3, 3], g: [0, 3] },
      parts: [{ id: 'Vs', type: 'V', a: 'a', b: 'g', value: this.S.V, name: 'v', valText: '', side: -1 }, { id: 'R1', type: 'R', a: 'a', b: 'b', value: this.S.R1, name: 'R₁', valText: '' },
        { id: 'R2', type: 'R', a: 'b', b: 'c', value: this.S.R2, name: 'R₂', valText: '', side: 1 }, { type: 'W', a: 'c', b: 'g' }] });
    this.view = new CK.View(canvas, this.ckt, { speed: 30, ground: false, showI: true, pad: 1.1, tips: false }); this.set({}); this.start(); }
  set(o) { Object.assign(this.S, o); this.ckt.set('Vs', 'value', this.S.V).set('R1', 'value', this.S.R1).set('R2', 'value', this.S.R2); this.ckt.solve(); }
  layout() { this.fitView(this.view, { x: 0, y: 34, w: this.W * 0.62, h: this.H - 40 }); }
  frame(dt) { this.clear(); const v = this.view; v.advance(dt); v.draw();
    v.polarity(this.ckt.part('R1'), 'a', { side: 'U', text: 'v₁', color: '#ff7eb6', textOff: 0.2 }); v.polarity(this.ckt.part('R2'), 'b', { side: 'R', text: 'v₂', color: '#5ad1ff', textOff: 0.2 });
    const v1 = this.ckt.Vab('R1').re, v2 = this.ckt.Vab('R2').re, V = this.S.V || 1e-9, x = this.W * (this.narrow ? 0.6 : 0.68), w = Math.min(56, this.W * 0.09), top = 54, bot = this.H - 26, h = bot - top, h1 = h * v1 / V, c = this.ctx;
    c.save(); c.fillStyle = '#ff7eb6'; c.fillRect(x, top, w, h1); c.fillStyle = '#5ad1ff'; c.fillRect(x, top + h1, w, h - h1); c.strokeStyle = '#e8ecf7'; c.lineWidth = 1.5; c.strokeRect(x, top, w, h); c.restore();
    v.text(`v = ${u3(V, 2)} V`, x + w / 2, top - 12, { color: '#e8ecf7', size: 13, weight: '700' });
    v.text(`v₁ = ${u3(v1, 2)} V`, x + w + 8, top + h1 / 2 - 9, { align: 'left', color: '#ff7eb6', size: 14, weight: '700' }); v.text(`${u3(100 * v1 / V, 1)} %`, x + w + 8, top + h1 / 2 + 10, { align: 'left', color: '#ff7eb6', size: 12.5 });
    v.text(`v₂ = ${u3(v2, 2)} V`, x + w + 8, top + h1 + (h - h1) / 2 - 9, { align: 'left', color: '#5ad1ff', size: 14, weight: '700' }); v.text(`${u3(100 * v2 / V, 1)} %`, x + w + 8, top + h1 + (h - h1) / 2 + 10, { align: 'left', color: '#5ad1ff', size: 12.5 });
    CK.badge(c, this.narrow ? t('ตัวแบ่งแรงดัน', 'Voltage divider') : t('ตัวแบ่งแรงดัน: R ใหญ่ได้แรงดันมาก', 'Voltage divider: the larger R takes more voltage'), 'ok'); }
};
CH3.IDiv = class extends Sim {
  constructor(canvas, o = {}) { super(canvas, { aspect: 0.6, aspectN: 0.86 }); this.S = Object.assign({ I: 0.9, R1: 9, R2: 72 }, o);
    this.ckt = new CK.Circuit({ ground: 'g', nodes: { a: [0, 0], b: [2.4, 0], c: [4.6, 0], g: [0, 3], gb: [2.4, 3], gc: [4.6, 3] },
      parts: [{ id: 'Is', type: 'I', a: 'g', b: 'a', value: this.S.I, name: 'i', valText: '', side: -1 }, { type: 'W', a: 'a', b: 'b' }, { type: 'W', a: 'b', b: 'c' },
        { id: 'R1', type: 'R', a: 'b', b: 'gb', value: this.S.R1, name: 'R₁', valText: '', side: 1 }, { id: 'R2', type: 'R', a: 'c', b: 'gc', value: this.S.R2, name: 'R₂', valText: '', side: 1 }, { type: 'W', a: 'g', b: 'gb' }, { type: 'W', a: 'gb', b: 'gc' }] });
    this.view = new CK.View(canvas, this.ckt, { speed: 90, ground: false, showI: true, pad: 1.1, tips: false }); this.set({}); this.start(); }
  set(o) { Object.assign(this.S, o); this.ckt.set('Is', 'value', this.S.I).set('R1', 'value', this.S.R1).set('R2', 'value', this.S.R2); this.ckt.solve(); this.view.o.speed = 80 / Math.max(this.S.I, 0.05); }
  layout() { this.fitView(this.view, { x: 0, y: 34, w: this.W, h: (this.H - 40) * 0.66 }); }
  frame(dt) { this.clear(); const v = this.view; v.advance(dt); v.draw();
    const i1 = this.ckt.I('R1').re, i2 = this.ckt.I('R2').re, I = this.S.I || 1e-9, x0 = 24, x1 = this.W - 24, y = this.H * 0.74, h = 24, w1 = (x1 - x0) * i1 / I, c = this.ctx;
    c.save(); c.fillStyle = '#7ee787'; c.fillRect(x0, y, w1, h); c.fillStyle = '#ffa552'; c.fillRect(x0 + w1, y, x1 - x0 - w1, h); c.strokeStyle = '#e8ecf7'; c.lineWidth = 1.5; c.strokeRect(x0, y, x1 - x0, h); c.restore();
    v.text(`i = ${CK.eng(I, 'A')}`, (x0 + x1) / 2, y - 12, { color: '#e8ecf7', size: 13, weight: '700' });
    v.text(`i₁ = ${CK.eng(i1, 'A')} (${u3(100 * i1 / I, 1)} %)`, x0, y + h + 16, { align: 'left', color: '#7ee787', size: 13.5, weight: '700' });
    v.text(`i₂ = ${CK.eng(i2, 'A')} (${u3(100 * i2 / I, 1)} %)`, x1, y + h + 16, { align: 'right', color: '#ffa552', size: 13.5, weight: '700' });
    CK.badge(c, this.narrow ? t('ตัวแบ่งกระแส', 'Current divider') : t('ตัวแบ่งกระแส: R เล็กได้กระแสมาก', 'Current divider: the smaller R takes more current'), 'ok'); }
};

/* ---------------- 7) two voltage sources in parallel (each with a small internal resistance r) ---------------- */
CH3.Parallel = class extends Sim {
  constructor(canvas, o = {}) { super(canvas, { aspect: 0.52, aspectN: 0.8 }); this.S = Object.assign({ V2: 5, r: 0.05 }, o);
    this.ckt = new CK.Circuit({ ground: 'b0', nodes: { t0: [0, 0], t1: [3, 0], t2: [6, 0], b0: [0, 3], b1: [3, 3], b2: [6, 3] },
      parts: [{ id: 'V1', type: 'V', a: 't0', b: 'b0', value: 10, r: this.S.r, name: '10 V', valText: '', side: -1 }, { id: 'V2', type: 'V', a: 't1', b: 'b1', value: this.S.V2, r: this.S.r, name: 'V₂', valText: '', side: 1 },
        { id: 'RL', type: 'R', a: 't2', b: 'b2', value: 10, name: '10 Ω', valText: '', side: 1 }, { type: 'W', a: 't0', b: 't1' }, { type: 'W', a: 't1', b: 't2' }, { type: 'W', a: 'b0', b: 'b1' }, { type: 'W', a: 'b1', b: 'b2' }] });
    this.view = new CK.View(canvas, this.ckt, { speed: 3, ground: false, showI: true, pad: 1.4, tips: false }); this.set({}); this.start(); }
  set(o) { Object.assign(this.S, o); this.ckt.set('V2', 'value', this.S.V2); this.ckt.solve(); }
  circ() { return -this.ckt.I('V2').re; }   // current pushed out of the + of the second source (negative: forced in)
  layout() { this.fitView(this.view, { x: 0, y: 36, w: this.W, h: this.H - 40 }); }
  frame(dt) { this.clear(); const v = this.view; v.advance(dt); v.draw(); const I = this.circ(), ok = Math.abs(this.S.V2 - 10) < 1e-9;
    CK.badge(this.ctx, ok ? t('V₂ = 10 V: ต่อขนานได้ ไม่มีกระแสวน', 'V₂ = 10 V: allowed, no circulating current') : t(`ผิดกฎแรงดัน: กระแสวน ${CK.eng(Math.abs(I), 'A')}`, `breaks KVL: ${CK.eng(Math.abs(I), 'A')} circulates`), ok ? 'ok' : 'wait'); }
};

global.CH3 = CH3;
})(window);
