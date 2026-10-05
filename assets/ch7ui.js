/* ch7ui.js — chapter 7 in the problem-by-problem format (rebuilt Oct 2026): nodal and mesh analysis, superposition, Thévenin and
   Norton, phasor diagrams. Built on ch6.js (Trio, plane, waves), ch7.js (Grid, overlays), lesson.js (LS.stepper, LS.step,
   LS.withCol) and ch7_circuits.js (CH7C). Course convention: phasors use the sine reference and peak values.
   1) CH7.Prob      one circuit + phasor plane + waveforms (CH6.Trio); the open steps decide the overlays, the phasors and when
                    the dots run
   2) CH7.GridProb  superposition panels on one canvas (CH7.Grid): the open steps decide which panels run and which is in focus
   3) CH7.Stages    a circuit that changes with the steps, with a second circuit beside it (the Thévenin / Norton equivalent)
   4) CH7.askZ      a "try first" box for one or more phasors, each pair of boxes checked as one complex number
   5) CH7.DEF       the problems: circuit, steps, overlays, try-first box and answer. Keys: ex1 ex2 hw1 hw2 hw3 x1 x2 (page 7.1),
                    ex3 ex4 (7.2), ex5 x3 (7.3), pd13 pd17 (7.4)
   6) CH7.problem   wires one problem section: canvas cv<n>, try-first box ask<n>, stepper st<n>, controls ctl<n> */
(function (global) {
'use strict';
const CH7 = global.CH7, Cx = CK.Cx, cx = Cx.c, COL = CH6.COL, fd = CH6.fd, R = String.raw, AMBER = '#ffd166';
const t = (th, en) => MC.t(th, en), tt = p => (p ? (Array.isArray(p) ? MC.t(p[0], p[1]) : p) : '');
const step = (why, tex, note) => LS.step(why, tex, note), block = rows => LS.block(rows);
const P = (z, d = 4, ad = 2) => CH6.pol(z, d, ad), RC = (z, d = 4) => CH6.rect(z, d), PT = (z, u, d = 4, ad = 2) => CH6.polTxt(z, u, d, ad);
const memo = f => { const m = new Map(); return k => { if (!m.has(k)) m.set(k, f(k)); return m.get(k); }; };
/* head-to-tail polygon of phasors [z, label, colour] */
const poly = (items, g) => { let s = cx(0); return items.map(([z, label, color]) => { const v = { z, from: s, color, label, lmid: 1, g, w: 3 }; s = Cx.add(s, z); return v; }); };
const wave = (z, color, label, unit, o = {}) => ({ mag: Cx.abs(z), ang: CH6.deg(z), color, label, unit, peak: true, ...o });
const mA = (z, color, label, o = {}) => ({ mag: Cx.abs(z) * 1000, ang: CH6.deg(z), color, label, unit: 'mA', peak: true, ...o });
const vm = (a, b, c, d) => R`{\begin{vmatrix} ${a} & ${b} \\ ${c} & ${d} \end{vmatrix}}`;          // braced: LS.fit does not cut inside
const bm = (a, b) => R`{\begin{bmatrix} ${a} \\ ${b} \end{bmatrix}}`;
const loop = (v, x, y, r, label, o = {}) => v.meshLoop(x, y, r, { label, color: COL.purple, spin: null, ...o });
const GLOW = 'rgba(255,126,182,.4)';
/* canvas text width in the faces of circuit.js (Thai text uses the Thai face); subscripts measured as normal letters */
const FONT = '"IBM Plex Mono", ui-monospace, Menlo, monospace', FONT_TH = '"IBM Plex Sans Thai", system-ui, sans-serif';
const textW = (ctx, s, size, weight = '') => { s = String(s); ctx.save(); ctx.font = `${weight} ${size}px ${/[ก-๙]/.test(s) ? FONT_TH : FONT}`.trim(); const w = ctx.measureText(s.replace(/_\{([^}]*)\}|_/g, '$1')).width; ctx.restore(); return w; };
/* a tag kept inside the canvas (x is where the tag starts for 'left', ends for 'right') */
const tagIn = (ctx, txt, x, y, col, align = 'left', size = 12.5) => { const W = ctx.canvas.clientWidth || 9999, w = textW(ctx, txt, size, '700') + 12;
  let x0 = align === 'left' ? x : align === 'right' ? x - w : x - w / 2; x0 = Math.max(4, Math.min(W - 4 - w, x0)); CH6.tag(ctx, txt, x0, y, col, { align: 'left', size }); };
/* text broken at spaces into lines no wider than maxW */
const wrapText = (ctx, s, maxW, size, weight) => { const out = []; let cur = '';
  String(s).split(' ').forEach(w => { const tst = cur ? `${cur} ${w}` : w; if (cur && textW(ctx, tst, size, weight) > maxW) { out.push(cur); cur = w; } else cur = tst; }); if (cur) out.push(cur); return out; };
/* m∠a and M∠A as one complex number (so −10∠60° = 10∠−120°) */
const sameZ = (m, a, M, A) => Math.hypot(m * Math.cos(a * Math.PI / 180) - M * Math.cos(A * Math.PI / 180), m * Math.sin(a * Math.PI / 180) - M * Math.sin(A * Math.PI / 180)) <= Math.max(1e-4, 0.005 * Math.abs(M));

/* =====================================================================================================================
   1) one circuit on a Trio. o = { spec (object, or (k, self) → spec; return the same object for the same variant), steps(self),
      solvedAt (k from which the dots run), vecs(ckt, k, self), sigs(ckt, k, self), planeOpts(ckt, k, self), planeTitle(k, self),
      waveTitle(k, self), after(view, k, self), glow(k, self) → part ids, badge(k, self) → [text, kind], pad, midMin, cktAspM, minW,
      init(self) (state in self.st), controls(el, self) } */
CH7.Prob = class {
  constructor(cv, o) { this.cv = cv; this.o = o; this.k = 0; this.colW = o.colW || 0; this.st = {}; if (o.init) o.init(this); const self = this;
    this.T = new CH6.Trio(cv, { T: 4, mid: true, midMin: o.midMin ?? 400, cktAspM: o.cktAspM, pad: o.pad ?? 1.4, minW: o.minW,
      vecs: () => self.vecs(), sigs: () => self.sigs(),
      planeOpts: () => { const ttl = o.planeTitle ? tt(o.planeTitle(self.k, self)) : '';
        return Object.assign({ circle: false }, ttl ? { title: ttl } : self.vecs().length ? {} : { title: t('ยังไม่มีเฟเซอร์', 'no phasor yet') }, o.planeOpts ? o.planeOpts(self.T.ckt, self.k, self) : {}); },
      after: v => { if (o.after) o.after(v, self.k, self); },
      badge: () => o.badge ? o.badge(self.k, self) : self.solved ? [t('แก้แล้ว: กระแสไหล', 'solved: the current flows'), 'ok'] : [t('ยังไม่ได้แก้วงจร', 'not solved yet'), 'wait'],
      waveTitle: () => o.waveTitle ? o.waveTitle(self.k, self) : self.sigs().length ? ['คำตอบตามเวลา (แกน ωt)', 'the answers in time (ωt axis)'] : ['ยังไม่มีรูปคลื่น', 'no waveform yet'] });
    this.T.spin = false; this.T.resize(); this.build(); window.addEventListener('resize', () => this.T.resize());
    LS.anim(cv, dt => { const v = this.T.view; if (!v) return; v.o.dots = this.solved; v.o.tips = this.solved; const g = o.glow ? o.glow(this.k, this) : null; v.o.glow = g && g.length ? new Set(g) : null; this.T.frame(dt); }); }
  vecs() { return this.o.vecs && this.T.ckt ? this.o.vecs(this.T.ckt, this.k, this) : []; }
  sigs() { return this.o.sigs && this.T.ckt ? this.o.sigs(this.T.ckt, this.k, this) : []; }
  get solved() { return this.k >= (this.o.solvedAt ?? 1e9); }
  build(force) { const sp = typeof this.o.spec === 'function' ? this.o.spec(this.k, this) : this.o.spec; if (force || sp !== this.spec) { this.spec = sp; this.T.set(sp, { glowColor: GLOW }); } }
  set(k) { this.k = k; this.build(); }
  /* after a control changed the variant: new circuit, new steps (the open count is kept) */
  refresh() { this.list = null; this.build(true); if (this.stepper) this.stepper.refresh(true); }
  get steps() { return this.list || (this.list = LS.withCol(this.colW, () => this.o.steps(this))); }
  controls(el) { if (this.o.controls) this.o.controls(el, this); }
};

/* =====================================================================================================================
   2) superposition panels. o = { items() → [{spec, title, sub (text or (k, self) → text), sum: [panel indices], after(view, k, self)}],
      state(k, self) → {run: [panels whose dots run], focus: panel, dim: [panels]}, steps(self), cell(ctx, box, grid, k, self),
      extra: {h(W), draw(ctx, box, grid, k, self)}, clock() → CH6.clock, aspect, speed, init(self), controls(el, self) } */
CH7.GridProb = class {
  constructor(cv, o) { this.cv = cv; this.o = o; this.k = 0; this.colW = o.colW || 0; this.st = {}; if (o.init) o.init(this); const self = this;
    this.G = new CH7.Grid(cv, { aspect: o.aspect ?? 0.6, cols2At: o.cols2At ?? 520, clock: o.clock ? o.clock() : undefined, speed: o.speed,
      cell: o.cell ? (ctx, b, g) => o.cell(ctx, b, g, self.k, self) : undefined, extra: o.extra ? { h: o.extra.h, draw: (ctx, b, g) => o.extra.draw(ctx, b, g, self.k, self) } : undefined });
    this.items = o.items(); this.G.set(this.items.map(it => ({ spec: it.spec, title: it.title, sum: it.sum, pad: it.pad, after: it.after ? v => it.after(v, self.k, self) : undefined })));
    this.apply(); window.addEventListener('resize', () => this.G.resize()); LS.anim(cv, dt => this.G.frame(dt)); }
  apply() { const s = this.o.state(this.k, this);
    this.G.items.forEach((it, i) => { const run = (s.run || []).includes(i), sub = this.items[i].sub; it.focus = s.focus === i; it.dim = (s.dim || []).includes(i);
      it.view.o.dots = run; it.view.o.tips = run && !it.sum; it.sub = typeof sub === 'function' ? sub(this.k, this) : sub; }); }
  set(k) { this.k = k; this.apply(); }
  get steps() { return this.list || (this.list = LS.withCol(this.colW, () => this.o.steps(this))); }
  controls(el) { if (this.o.controls) this.o.controls(el, this); }
};

/* =====================================================================================================================
   3) stages with an optional second circuit. o = { stage(k, self) → {left, right, title, rightTitle, rightSub: [lines under the right circuit], lines: [[text, colour]],
      after(vL, vR, ctx, self), tl: [A, B] (terminal nodes, default ['A', 'B'])}, steps(self), pad, stack (always one above the other), init(self), controls(el, self) }.
   Side by side from 540 px (left 58 %), stacked on phones; with no right circuit the right box lists what has been found so far. */
CH7.Stages = class {
  constructor(cv, o) { this.cv = cv; this.o = o; this.k = 0; this.colW = o.colW || 0; this.st = {}; if (o.init) o.init(this); this.clk = CH6.clock({ T: 4 });
    this.build(); window.addEventListener('resize', () => this.resize()); LS.anim(cv, dt => this.frame(dt)); }
  build() { const s = this.o.stage(this.k, this); this.S = s; const cl = new CK.Circuit(s.left); cl.solve(); const cr = s.right ? new CK.Circuit(s.right) : null; if (cr) cr.solve();
    const im = Math.max(CH6.imax(cl), cr ? CH6.imax(cr) : 0), vo = { speed: 95 / Math.max(im, 1e-9), ground: false, showI: false, pad: this.o.pad ?? 1.45, tips: true, acPeak: true, acTime: () => this.clk.at(1) };
    this.VL = new CK.View(this.cv, cl, vo); this.VR = cr ? new CK.View(this.cv, cr, vo) : null; this.resize(); }
  resize() { const W = Math.max(300, Math.floor(this.cv.parentElement.clientWidth - 12)), two = !!this.VR; let a, b, H;
    if (W >= 540 && !this.o.stack) { H = Math.round(Math.max(300, W * 0.44)); const wa = Math.round(W * 0.58); a = { x: 0, y: 40, w: wa, h: H - 44 }; b = { x: wa + 8, y: 40, w: W - wa - 8, h: H - 44 }; }
    else { const h1 = Math.round(W * (this.o.stack && W >= 540 ? 0.5 : 0.72)); a = { x: 0, y: 40, w: W, h: h1 }; b = { x: 0, y: h1 + 84, w: W, h: two ? Math.round(W * (this.o.stack ? 0.45 : 0.62)) : 130 }; H = b.y + b.h + 4; }
    const sub = (this.S && this.S.rightSub || []).length;
    this.L = { W, H, a, b, ctx: CK.setup(this.cv, W, H) }; this.VL.ctx = this.L.ctx; this.VL.fit(a); if (this.VR) { this.VR.ctx = this.L.ctx; this.VR.fit({ x: b.x, y: b.y, w: b.w, h: b.h - 4 - 16 * sub }); } }
  frame(dt) { const L = this.L, s = this.S; if (!L) return; this.clk.tick(dt); const ctx = L.ctx, tl = s.tl || ['A', 'B']; ctx.fillStyle = CK.PAL.bg; ctx.fillRect(0, 0, L.W, L.H);
    [L.a, L.b].forEach(b => { ctx.save(); ctx.fillStyle = '#121629'; ctx.fillRect(b.x, b.y - 36, b.w, b.h + 36); ctx.strokeStyle = '#2a3150'; ctx.strokeRect(b.x + 0.5, b.y - 35.5, b.w - 1, b.h + 35); ctx.restore(); });
    if (this.clk.run) { this.VL.advance(dt); if (this.VR) this.VR.advance(dt); }
    this.VL.draw(); CH7.ghosts(this.VL); CH7.terminals(this.VL, tl[0], tl[1]);
    if (this.VR) { this.VR.draw(); CH7.terminals(this.VR, 'A', 'B'); }
    if (s.after) s.after(this.VL, this.VR, ctx, this);
    CH6.text(ctx, tt(s.title), L.a.x + 10, L.a.y - 18, { align: 'left', color: AMBER, size: 14, weight: '700' });
    if (this.VR) { CH6.text(ctx, tt(s.rightTitle), L.b.x + 10, L.b.y - 18, { align: 'left', color: COL.ref, size: 14, weight: '700' });
      (s.rightSub || []).forEach((ln, i, a) => CH6.text(ctx, tt(ln), L.b.x + 10, L.b.y + L.b.h - 8 - (a.length - 1 - i) * 16, { align: 'left', color: '#9aa3c7', size: 12.5 })); }
    else { let y = L.b.y - 8; (s.lines || []).forEach(([txt, c], i) => { const wt = i ? '600' : ''; wrapText(ctx, tt(txt), L.b.w - 28, 14.5, wt).forEach(ln => { CH6.text(ctx, ln, L.b.x + 16, y, { align: 'left', color: c || COL.ink, size: 14.5, weight: wt }); y += 20; }); y += 8; }); } }
  set(k) { this.k = k; this.build(); }
  refresh() { this.list = null; this.build(); if (this.stepper) this.stepper.refresh(true); }
  get steps() { return this.list || (this.list = LS.withCol(this.colW, () => this.o.steps(this))); }
  controls(el) { if (this.o.controls) this.o.controls(el, this); }
};
/* current tag beside a node of a stage view */
const tagAt = (v, node, txt, col, dx, dy, align = 'left') => { const [x, y] = v.P(node); tagIn(v.ctx, txt, x + v.u * dx, y + v.u * dy, col, align); };

/* =====================================================================================================================
   4) try first: items = [[label (HTML), z or () → z, unit]]; traps = [[item, size, angle | null (size alone), message]] */
CH7.askZ = (items, traps = []) => { const Z = it => typeof it[1] === 'function' ? it[1]() : it[1], fields = [];
  items.forEach((it, i) => { const ok = (x, v) => sameZ(v[2 * i], v[2 * i + 1], Cx.abs(Z(it)), CH6.deg(Z(it)));
    fields.push({ label: `${it[0]}: ${t(`ขนาด (${it[2]}) =`, `size (${it[2]}) =`)}`, ok, w: 4.5 }, { label: t('มุม (°) =', 'angle (°) ='), ok, w: 4 }); });
  return { fields, check: v => { const tr = traps.find(([i, m, a]) => a == null ? Math.abs(Math.abs(v[2 * i]) - m) <= Math.max(0.01, 0.004 * m) : sameZ(v[2 * i], v[2 * i + 1], m, a)); return tr ? tr[3] : ''; } }; };

/* =====================================================================================================================
   5) the problems */
const E1 = CH7C.ex1, E4 = CH7C.ex4, T5 = CH7C.ex5, H1 = CH7C.hw1, H2 = CH7C.hw2, X1 = CH7C.x1, X2 = CH7C.x2, X3 = CH7C.x3, D13 = CH7C.pd13, D17 = CH7C.pd17;
const H3 = memo(w => CH7C.hw3(w)), E1S = E1.spec({ y: true });
const ZCONV = () => block([R`Z_L &= \frac{1}{Y_L} = \frac{1}{-j25\times10^{-3}} = j40\ \Omega`, R`R &= \frac{1}{G} = \frac{1}{40\times10^{-3}} = 25\ \Omega`, R`Z_C &= \frac{1}{Y_C} = \frac{1}{j50\times10^{-3}} = -j20\ \Omega`]);
const e1tags = v => { CH7.nodeTag(v, 'v1', 'v_1', COL.purple, { dx: -0.85 }); CH7.nodeTag(v, 'v2', 'v_2'); v.drawGround('g1'); };
const DEF = {};

/* ---------------- Ex 1: nodal (slide p. 4, Hayt Practice 10.12) ---------------- */
DEF.ex1 = { spec: E1S, solvedAt: 5, pad: 1.3,
  glow: k => k === 2 ? ['I1', 'w1', 'C', 'L', 'I2', 'wt1'] : k === 3 ? ['L', 'R', 'I2', 'wt2'] : null,
  after: e1tags,
  vecs: (c, k) => k >= 6 ? poly([[Cx.neg(E1.Is1), '−I_{s1}', COL.V], [E1.Is2, 'I_{s2}', COL.purple], [c.I('C'), 'I_C', COL.ref], [c.I('L'), 'I_L', COL.I]])
    : k >= 5 ? [{ z: c.V('v1'), color: COL.V, label: 'V_1' }, { z: c.V('v2'), color: COL.I, label: 'V_2' }] : [],
  planeTitle: k => k >= 6 ? ['KCL ที่ v₁: รูปปิด', 'KCL at v₁: it closes'] : null,
  sigs: (c, k) => k >= 5 ? [wave(c.V('v1'), COL.V, 'v_1', 'V'), wave(c.V('v2'), COL.I, 'v_2', 'V')] : [],
  steps: () => { const IC = Cx.div(E1.V1, E1.ZC), IL = Cx.div(Cx.sub(E1.V1, E1.V2), E1.ZL), sum = Cx.add(Cx.add(Cx.sub(E1.Is2, E1.Is1), IC), IL);
    return [step(t('<b>แปลงแอดมิตแตนซ์เป็นอิมพีแดนซ์</b> ด้วย \\(Z = 1/Y\\) เหมือนในห้อง (ค่าในรูปเป็นมิลลิซีเมนส์ mS จะใช้แอดมิตแตนซ์ตรง ๆ ก็ได้ ผลเท่ากัน)', '<b>Turn the admittances into impedances</b> with \\(Z = 1/Y\\), as in class (the figure gives millisiemens, mS; using the admittances directly gives the same result)'), ZCONV(),
        t('โจทย์ไม่ได้ให้ ω จึงทำงานกับอิมพีแดนซ์ตรง ๆ (ภาพจำลองวาดที่ ω = 1 rad/s)', 'No ω is given, so we work with the impedances directly (the simulation is drawn at ω = 1 rad/s)')),
      step(t('<b>KCL ที่โนด \\(v_1\\)</b> (ผลรวมกระแสที่ไหลออก = 0 กิ่งที่ต่อกับโนดนี้เรืองแสงในภาพ): แหล่งจ่าย 20 mA ไหลเข้าจึงติดลบ ส่วน 50∠−90° mA ไหลออกไปทางขวา', '<b>KCL at node \\(v_1\\)</b> (the currents leaving add to zero; the branches at this node glow in the picture): the 20 mA source flows in, so it is negative; the 50∠−90° mA flows out to the right'),
        block([R`(-0.02\angle 0^\circ) + (0.05\angle{-90^\circ}) + \frac{V_1}{-j20} + \frac{V_1 - V_2}{j40} &= 0`, R`j0.05\,V_1 - j0.025\,(V_1 - V_2) &= 0.02 + j0.05`, R`j0.025\,V_1 + j0.025\,V_2 &= 0.02 + j0.05 \qquad (1)`])),
      step(t('<b>KCL ที่โนด \\(v_2\\)</b>: กระแส 50∠−90° mA ไหลเข้าโนดนี้จึงติดลบ', '<b>KCL at node \\(v_2\\)</b>: the 50∠−90° mA flows into this node, so it is negative'),
        block([R`-(0.05\angle{-90^\circ}) + \frac{V_2 - V_1}{j40} + \frac{V_2}{25} &= 0`, R`-j0.025\,(V_2 - V_1) + 0.04\,V_2 &= -j0.05`, R`j0.025\,V_1 + (0.04 - j0.025)\,V_2 &= -j0.05 \qquad (2)`])),
      step(t('<b>กฎของคราเมอร์</b> กับสัมประสิทธิ์เชิงซ้อน (หน้า 1.4)', '<b>Cramer\'s rule</b> with complex coefficients (page 1.4)'),
        block([R`\Delta &= ${vm('j0.025', 'j0.025', 'j0.025', '0.04 - j0.025')} = ${CH7.rsci(E1.D)}`, R`\Delta_{V_1} &= ${vm('0.02 + j0.05', 'j0.025', '-j0.05', '0.04 - j0.025')} = ${CH7.rsci(E1.D1)}`, R`\Delta_{V_2} &= ${vm('j0.025', '0.02 + j0.05', 'j0.025', '-j0.05')} = ${CH7.rsci(E1.D2)}`])),
      step(t('<b>หารในรูปเชิงขั้ว</b>', '<b>Divide in polar form</b>'), block([R`V_1 &= \frac{\Delta_{V_1}}{\Delta} = \boxed{${P(E1.V1)}\ \text{V}}`, R`V_2 &= \frac{\Delta_{V_2}}{\Delta} = \boxed{${P(E1.V2)}\ \text{V}}`]),
        t('เมื่อได้แรงดันโนดแล้ว จุดในวงจรเริ่มวิ่ง และลูกศร \\(\\mathbf{V}_1\\), \\(\\mathbf{V}_2\\) ขึ้นบนระนาบ', 'With the node voltages found, the dots start and the arrows \\(\\mathbf{V}_1\\), \\(\\mathbf{V}_2\\) appear on the plane')),
      step(t('<b>ตรวจด้วยแผนภาพเฟเซอร์</b>: กระแสที่ไหลออกจากโนด \\(v_1\\) ต้องรวมกันได้ศูนย์ ต่อลูกศรหัวต่อหางแล้วต้องกลับมาที่จุดเริ่มพอดี', '<b>Check with a phasor diagram</b>: the currents leaving node \\(v_1\\) must add to zero, so drawn head to tail they must come back to the start'),
        block([R`I_C &= \frac{V_1}{-j20} = ${P(IC)}\ \text{A}`, R`I_L &= \frac{V_1 - V_2}{j40} = ${P(IL)}\ \text{A}`, R`-I_{s1} + I_{s2} + I_C + I_L &= ${RC(sum)}`]),
        t('รูปปิดบนระนาบคือแผนภาพเฟเซอร์ของ KCL ที่โนดนี้ (หัวข้อของหน้า 7.4)', 'The closed figure on the plane is the phasor diagram of KCL at this node (the topic of page 7.4)'))]; },
  ask: () => CH7.askZ([['V<sub>1</sub>', E1.V1, 'V'], ['V<sub>2</sub>', E1.V2, 'V']]),
  answer: () => t(`\\(\\mathbf{V}_1 = ${P(E1.V1)}\\) V และ \\(\\mathbf{V}_2 = ${P(E1.V2)}\\) V ตรงกับเฉลยในห้อง (1.062∠23.3° V, 1.593∠−49.969° V) และ Hayt Practice 10.12 โจทย์ไม่ได้ให้ ω จึงตอบเป็นเฟเซอร์`,
    `\\(\\mathbf{V}_1 = ${P(E1.V1)}\\) V and \\(\\mathbf{V}_2 = ${P(E1.V2)}\\) V, as in class (1.062∠23.3° V, 1.593∠−49.969° V) and in Hayt Practice 10.12. No ω is given, so the answers stay as phasors.`) };

/* ---------------- Ex 2: mesh (slide p. 5) ---------------- */
DEF.ex2 = { spec: E1S, solvedAt: 3, pad: 1.3,
  glow: k => k === 3 ? ['C', 'L', 'R'] : null,
  after: (v, k) => { e1tags(v); if (k >= 2) { loop(v, 1.15, 2.2, 0.48, 'i_1'); loop(v, 3.6, 2.2, 0.5, 'i_3'); loop(v, 3.6, 0.5, 0.42, 'i_2'); } },
  vecs: (c, k) => k >= 5 ? poly([[Cx.neg(E1.V1), 'Z_C(i_3 − i_1)', COL.ref], [Cx.sub(E1.V1, E1.V2), 'Z_L(i_3 − i_2)', COL.I], [E1.V2, '25 i_3', COL.V]])
    : k >= 4 ? [{ z: c.V('v1'), color: COL.V, label: 'V_1' }, { z: c.V('v2'), color: COL.I, label: 'V_2' }]
    : k >= 3 ? [{ z: E1.i1, color: COL.V, label: 'i_1' }, { z: E1.i2, color: COL.purple, label: 'i_2' }, { z: E1.i3, color: COL.I, label: 'i_3' }] : [],
  planeTitle: k => k >= 5 ? ['KVL รอบ i₃: รูปปิด', 'KVL round i₃: closes'] : null,
  sigs: (c, k) => k >= 4 ? [wave(c.V('v1'), COL.V, 'v_1', 'V'), wave(c.V('v2'), COL.I, 'v_2', 'V')] : k >= 3 ? [mA(E1.i1, COL.V, 'i_1'), mA(E1.i2, COL.purple, 'i_2'), mA(E1.i3, COL.I, 'i_3')] : [],
  steps: () => [step(t('<b>อิมพีแดนซ์ของแต่ละตัว</b> (เหมือน Ex 1)', '<b>The impedances</b> (as in Ex 1)'), ZCONV()),
    step(t('<b>กำหนดกระแสเมชตามเข็มนาฬิกา</b> แหล่งจ่ายกระแสอยู่บนขอบนอกของเมช \\(i_1\\) และ \\(i_2\\) จึงรู้ค่าทันที (ลูกศรไปทางเดียวกับเมช)', '<b>Clockwise mesh currents.</b> The current sources sit on the outer edges of meshes \\(i_1\\) and \\(i_2\\), so those are known at once (the arrows run the same way as the meshes)'),
      block([R`i_1 &= 0.02\angle 0^\circ\ \text{A}`, R`i_2 &= 0.05\angle{-90^\circ}\ \text{A} = -j0.05\ \text{A}`])),
    step(t('<b>KVL รอบเมช \\(i_3\\)</b> (ตัวเก็บประจุมีกระแส \\(i_3 - i_1\\) ตัวเหนี่ยวนำมีกระแส \\(i_3 - i_2\\))', '<b>KVL around mesh \\(i_3\\)</b> (the capacitor carries \\(i_3 - i_1\\), the inductor \\(i_3 - i_2\\))'),
      block([R`(-j20)(i_3 - i_1) + j40\,(i_3 - i_2) + 25\,i_3 &= 0`, R`(25 + j20)\,i_3 &= -j20\,(0.02) + j40\,(-j0.05) = 2 - j0.4`, R`i_3 &= \frac{2 - j0.4}{25 + j20} = \frac{${P(E1.num)}}{${P(E1.den)}} = \boxed{${P(E1.i3)}\ \text{A}}`]),
      t('รู้กระแสเมชครบสามวงแล้ว จุดในวงจรจึงเริ่มวิ่ง', 'All three mesh currents are known, so the dots start')),
    step(t('<b>แรงดันโนดจากกระแสเมช</b>: \\(v_1\\) คร่อมตัวเก็บประจุ \\(v_2\\) คร่อมตัวต้านทาน', '<b>Node voltages from the mesh currents</b>: \\(v_1\\) is across the capacitor, \\(v_2\\) across the resistor'),
      block([R`V_1 &= (i_1 - i_3)(-j20) = (0.02 - ${P(E1.i3)})(-j20) = \boxed{${P(E1.V1)}\ \text{V}}`, R`V_2 &= 25\,i_3 = (25)(${P(E1.i3)}) = \boxed{${P(E1.V2)}\ \text{V}}`])),
    step(t('<b>ตรวจด้วยแผนภาพเฟเซอร์</b>: แรงดันตกรอบเมช \\(i_3\\) ต่อหัวต่อหางต้องปิดพอดี (KVL)', '<b>Check with a phasor diagram</b>: the voltage drops around mesh \\(i_3\\), drawn head to tail, must close (KVL)'),
      block([R`Z_C(i_3 - i_1) &= -V_1 = ${P(Cx.neg(E1.V1))}\ \text{V}`, R`Z_L(i_3 - i_2) &= V_1 - V_2 = ${P(Cx.sub(E1.V1, E1.V2))}\ \text{V}`, R`25\,i_3 &= V_2 = ${P(E1.V2)}\ \text{V}`]))],
  ask: () => CH7.askZ([['i<sub>3</sub>', E1.i3, 'A']]),
  answer: () => t(`ได้ \\(\\mathbf{V}_1 = ${P(E1.V1)}\\) V และ \\(\\mathbf{V}_2 = ${P(E1.V2)}\\) V เท่ากับวิธีโนดทุกหลัก และตรงกับเฉลยในห้อง <b>วิธีเมชใช้สมการเดียว</b> เพราะแหล่งจ่ายกระแสสองตัวกำหนดกระแสเมชให้แล้วสองวง ส่วนวิธีโนดต้องแก้สองสมการ`,
    `\\(\\mathbf{V}_1 = ${P(E1.V1)}\\) V and \\(\\mathbf{V}_2 = ${P(E1.V2)}\\) V, the same as the nodal answer to every digit and as in class. <b>Mesh needs one equation</b>, because the two current sources fix two of the three mesh currents; nodal needs two.`) };

/* ---------------- homework 1 (slide p. 10, Hayt Problem 10.50) ---------------- */
DEF.hw1 = { spec: H1.spec, solvedAt: 4, pad: 1.7,
  after: (v, k) => { const c = v.ckt; v.refArrow(c.part('wI1'), 'tL', 'I_1', { side: 'U', color: COL.I, off: 0.42 }); v.refArrow(c.part('wI2'), 'tM', 'I_2', { side: 'U', color: COL.I, off: 0.42 });
    if (k >= 1) { loop(v, 1.6, 1.9, 0.55, 'I_x'); loop(v, 4.8, 1.9, 0.55, 'I_y'); } if (k >= 5) CH7.nodeTag(v, 'tM', 'V_T', COL.purple, { dy: 0.45 }); },
  vecs: (c, k) => k >= 5 ? poly([[Cx.neg(c.I('wI1')), '−I_1', COL.I], [c.I('Z2'), 'I_{55}', COL.ref], [c.I('wI2'), 'I_2', COL.V]])
    : k >= 4 ? [{ z: c.I('wI1'), color: COL.I, label: 'I_1' }, { z: c.I('wI2'), color: COL.V, label: 'I_2' }] : [],
  planeTitle: k => k >= 5 ? ['KCL โนดบน: รูปปิด', 'KCL at top: closes'] : null,
  sigs: (c, k) => k >= 4 ? [wave(c.I('wI1'), COL.I, 'i_1', 'A'), wave(c.I('wI2'), COL.V, 'i_2', 'A')] : [],
  steps: () => [step(t('<b>กำหนดเมช \\(I_x\\) (ซ้าย) และ \\(I_y\\) (ขวา)</b> ตามเข็มนาฬิกา ตามเฉลยของผู้สอน จะได้ \\(\\mathbf{I}_1 = I_x\\) และ \\(\\mathbf{I}_2 = I_y\\) เตรียมผลต่างของแหล่งจ่ายในรูปคาร์ทีเซียน', '<b>Clockwise meshes \\(I_x\\) (left) and \\(I_y\\) (right)</b>, as in the instructor\'s solution, so \\(\\mathbf{I}_1 = I_x\\) and \\(\\mathbf{I}_2 = I_y\\); first the source differences in Cartesian form'),
      block([R`\mathbf{V}_1 - \mathbf{V}_2 &= (1.7365 - j9.8481) - 4 = ${P(H1.b1, 3, 2)}\ \text{V}`, R`\mathbf{V}_2 - \mathbf{V}_3 &= 4 - (1.8410 - j0.7815) = ${P(H1.b2, 3, 2)}\ \text{V}`])),
    step(t('<b>KVL รอบเมช \\(I_x\\) และ \\(I_y\\)</b> (ตัวต้านทาน 55 Ω อยู่ร่วมกันจึงมีกระแส \\(I_x - I_y\\))', '<b>KVL around meshes \\(I_x\\) and \\(I_y\\)</b> (the shared 55 Ω carries \\(I_x - I_y\\))'),
      block([R`-\mathbf{V}_1 + j30\,I_x + 55\,(I_x - I_y) + \mathbf{V}_2 &= 0`, R`(55 + j30)\,I_x - 55\,I_y &= \mathbf{V}_1 - \mathbf{V}_2 \quad (1)`, R`-\mathbf{V}_2 + 55\,(I_y - I_x) - j20\,I_y + \mathbf{V}_3 &= 0`, R`-55\,I_x + (55 - j20)\,I_y &= \mathbf{V}_2 - \mathbf{V}_3 \quad (2)`]),
      t('ทางขวาของ (1) และ (2) คือผลต่างที่คำนวณไว้ในขั้นที่ 1', 'The right sides of (1) and (2) are the differences found in step 1')),
    step(t('<b>กฎของคราเมอร์</b>', '<b>Cramer\'s rule</b>'), block([R`\Delta &= (55 + j30)(55 - j20) - (-55)(-55) = ${RC(H1.D, 3)}`, R`\Delta_{I_x} &= (${P(H1.b1, 3, 2)})(55 - j20) - (-55)(${P(H1.b2, 3, 2)}) = ${RC(H1.Dx, 3)}`, R`\Delta_{I_y} &= (55 + j30)(${P(H1.b2, 3, 2)}) - (-55)(${P(H1.b1, 3, 2)}) = ${RC(H1.Dy, 3)}`])),
    step(t('<b>คำตอบ</b>', '<b>The answer</b>'), block([R`\mathbf{I}_1 &= I_x = \frac{\Delta_{I_x}}{\Delta} = \boxed{${P(H1.I1)}\ \text{A}}`, R`\mathbf{I}_2 &= I_y = \frac{\Delta_{I_y}}{\Delta} = \boxed{${P(H1.I2)}\ \text{A}}`])),
    step(t('<b>ตรวจด้วยวิธีโนด</b>: ทุกกิ่งต่อคร่อมโนดคู่เดียวกัน จึงมีโนดที่ไม่รู้ค่าโนดเดียว (โนดบน \\(V_T\\)) ใช้ KCL สมการเดียว', '<b>Check by nodal analysis</b>: every branch sits across the same pair of nodes, so there is one unknown node (the top node \\(V_T\\)) and one KCL equation'),
      block([R`\frac{V_T - \mathbf{V}_1}{j30} + \frac{V_T - \mathbf{V}_2}{55} + \frac{V_T - \mathbf{V}_3}{-j20} &= 0 \;\Rightarrow\; V_T = ${P(H1.Vt, 4, 2)}\ \text{V}`, R`\mathbf{I}_1 &= \frac{\mathbf{V}_1 - V_T}{j30} = ${P(H1.I1)}\ \text{A}`, R`\mathbf{I}_2 &= \frac{V_T - \mathbf{V}_3}{-j20} = ${P(H1.I2)}\ \text{A}`]),
      t('ได้เท่ากัน ภาพระนาบแสดง KCL ที่โนดบนเป็นรูปปิด', 'The same; the plane shows KCL at the top node as a closed figure'))],
  ask: () => CH7.askZ([['I<sub>1</sub>', H1.I1, 'A'], ['I<sub>2</sub>', H1.I2, 'A']], [[0, 0.71, 28.12, t('นั่นคือคำตอบที่พิมพ์ในสไลด์ ซึ่งคิดด้วยมุม +80° และ +23° (ดูกล่องเตือน)', 'That is the answer printed on the slide, which used the angles +80° and +23° (see the warning box)')]]),
  answer: () => t(`\\(\\mathbf{I}_1 = ${P(H1.I1)}\\) A และ \\(\\mathbf{I}_2 = ${P(H1.I2)}\\) A ตรงกับคำตอบที่ผู้สอนแก้ในห้อง (0.61∠−156.595° A, 0.534∠−136.354° A)`,
    `\\(\\mathbf{I}_1 = ${P(H1.I1)}\\) A and \\(\\mathbf{I}_2 = ${P(H1.I2)}\\) A, as the instructor corrected in class (0.61∠−156.595° A, 0.534∠−136.354° A).`) };

/* ---------------- homework 2 (slide p. 11, Hayt Problem 10.53) ---------------- */
const hw2N = (() => { const YPQ = Cx.add(Cx.inv(H2.ZC), Cx.inv(H2.Zt)), a11 = Cx.add(Cx.inv(H2.ZL), YPQ), a22 = Cx.add(cx(0.5, 0), YPQ), b1 = Cx.neg(H2.I1), b2 = H2.I2;
  const D = CH7C.det2(a11, Cx.neg(YPQ), Cx.neg(YPQ), a22); return { YPQ, a11, a22, VP: Cx.div(CH7C.det2(b1, Cx.neg(YPQ), b2, a22), D), VQ: Cx.div(CH7C.det2(a11, b1, Cx.neg(YPQ), b2), D) }; })();
DEF.hw2 = { spec: H2.spec, solvedAt: 4, pad: 1.75,
  after: (v, k, s) => { v.refArrow(v.ckt.part('R1'), 'um', 'I_B', { side: 'D', color: COL.I, off: 0.4 });
    if (k >= 1 && k < 5) { const n = s.T.narrow; loop(v, 0.95, 2.6, 0.4, 'I_x'); loop(v, 3.6, n ? 2.8 : 2.65, n ? 0.36 : 0.45, 'I_z'); loop(v, 3.6, n ? 0.25 : 0.5, n ? 0.32 : 0.42, 'I_y'); loop(v, 6.25, 2.6, 0.4, 'I_w'); }
    if (k >= 5) { CH7.nodeTag(v, 'P', 'V_P', COL.purple, { dx: -1.1, dy: 0.42 }); CH7.nodeTag(v, 'Q', 'V_Q', COL.purple, { dx: 0.25, dy: 0.42 }); v.drawGround('Pb'); } },
  vecs: (c, k) => k >= 5 ? poly([[H2.I1, 'I_1', COL.purple], [c.I('L2'), 'I_{j2}', COL.ref], [c.I('C4'), 'I_{P→Q}', COL.V], [c.I('R1'), 'I_B', COL.I]])
    : k >= 4 ? [{ z: c.I('R1'), color: COL.I, label: 'I_y = I_B' }, { z: H2.Iz, color: COL.V, label: 'I_z' }, { z: H2.Ix, color: COL.purple, label: 'I_x' }, { z: H2.Iw, color: COL.ref, label: 'I_w' }] : [],
  planeTitle: k => k >= 5 ? ['KCL ที่ P: รูปปิด', 'KCL at P: closes'] : null,
  sigs: (c, k) => k >= 4 ? [wave(c.I('R1'), COL.I, 'i_B', 'A'), wave(H2.I1, COL.purple, 'i_1', 'A', { w: 1.6, peak: false }), wave(H2.I2, COL.ref, 'i_2', 'A', { w: 1.6, peak: false })] : [],
  steps: () => [step(t('<b>เมชสี่วงตามเข็มนาฬิกา</b> ตามเฉลยของผู้สอน แหล่งจ่ายกระแสบนขอบนอกให้ค่าทันที แต่ลูกศรสวนทางกับเมชจึงติดลบ และ \\(\\mathbf{I}_B = I_y\\)', '<b>Four clockwise meshes</b>, as in the instructor\'s solution. The current sources on the outer edges fix two of them, with a minus sign because their arrows run against the meshes; \\(\\mathbf{I}_B = I_y\\)'),
      block([R`I_x &= -\mathbf{I}_1 = -5\angle{-18^\circ}\ \text{A}`, R`I_w &= -\mathbf{I}_2 = -2\angle 5^\circ\ \text{A}`])),
    step(t('<b>KVL รอบเมช \\(I_y\\) (บน) และ \\(I_z\\) (กลาง)</b>', '<b>KVL around meshes \\(I_y\\) (top) and \\(I_z\\) (middle)</b>'),
      block([R`(1 + j3.8)\,I_y + (-j4)(I_y - I_z) &= 0`, R`(1 - j0.2)\,I_y + j4\,I_z &= 0 \quad (1)`, R`j2\,(I_z - I_x) + (-j4)(I_z - I_y) + 2\,(I_z - I_w) &= 0`, R`j4\,I_y + (2 - j2)\,I_z &= j2\,I_x + 2\,I_w \quad (2)`]),
      t(`ทางขวาของ (2) คือ \\(j2(-5\\angle{-18^\\circ}) + 2(-2\\angle 5^\\circ) = ${P(H2.b2, 3, 2)}\\)`, `The right side of (2) is \\(j2(-5\\angle{-18^\\circ}) + 2(-2\\angle 5^\\circ) = ${P(H2.b2, 3, 2)}\\)`)),
    step(t('<b>กฎของคราเมอร์</b> (ต้องการแค่ \\(I_y\\))', '<b>Cramer\'s rule</b> (only \\(I_y\\) is needed)'), block([R`\Delta &= (1 - j0.2)(2 - j2) - (j4)(j4) = ${RC(H2.D, 3)}`, R`\Delta_{I_y} &= (0)(2 - j2) - (j4)(${P(H2.b2, 3, 2)}) = ${P(H2.Dy, 3, 3)}`])),
    step(t('<b>คำตอบ</b>', '<b>The answer</b>'), block([R`\mathbf{I}_B &= I_y = \frac{\Delta_{I_y}}{\Delta} = \frac{${P(H2.Dy, 3, 3)}}{${RC(H2.D, 3)}} = \boxed{${P(H2.IB, 4, 3)}\ \text{A}}`])),
    step(t('<b>ตรวจด้วยวิธีโนด</b>: โนด P (ซ้าย) และ Q (ขวา) โนดล่างเป็นโนดอ้างอิง กิ่งบนคือ \\(1 + j3.8\\ \\Omega\\) อนุกรมกัน \\(Y_{PQ}\\) คือแอดมิตแตนซ์รวมระหว่าง P กับ Q เขียน KCL ที่ P และ Q (สองสมการ) แล้วแก้ด้วยกฎของคราเมอร์', '<b>Check by nodal analysis</b>: nodes P (left) and Q (right) with the bottom node as reference; the top branch is \\(1 + j3.8\\ \\Omega\\) in series, and \\(Y_{PQ}\\) is the total admittance between P and Q. Write KCL at P and Q (two equations) and solve by Cramer\'s rule'),
      block([R`Y_{PQ} &= \frac{1}{-j4} + \frac{1}{1 + j3.8} = ${RC(hw2N.YPQ, 4)}\ \text{S}`, R`V_P &= ${P(hw2N.VP, 4, 2)}\ \text{V}`, R`V_Q &= ${P(hw2N.VQ, 4, 2)}\ \text{V}`, R`\mathbf{I}_B &= \frac{V_P - V_Q}{1 + j3.8} = ${P(H2.IB, 4, 3)}\ \text{A}`]),
      t('ได้เท่ากัน ภาพระนาบแสดง KCL ที่โนด P เป็นรูปปิด', 'The same; the plane shows KCL at node P as a closed figure'))],
  ask: () => CH7.askZ([['I<sub>B</sub>', H2.IB, 'A']]),
  answer: () => t(`\\(\\mathbf{I}_B = ${P(H2.IB, 4, 3)}\\) A ตรงกับเฉลยในห้อง (2.732∠152.102° A) และ Hayt (2.73∠152° A)`, `\\(\\mathbf{I}_B = ${P(H2.IB, 4, 3)}\\) A, as in class (2.732∠152.102° A) and in Hayt (2.73∠152° A).`) };

/* ---------------- homework 3 (slide p. 12, Hayt Problem 10.55): ω = 20 (Hayt, 2018 slides) or 2 (the 2025 handout) ---------------- */
const sar = M => { const prod = ix => ix.reduce((p, [r, c]) => Cx.mul(p, M[r][c]), cx(1));
  return { plus: [0, 1, 2].map(k => prod([[0, k], [1, (k + 1) % 3], [2, (k + 2) % 3]])).reduce(Cx.add, cx(0)), minus: [[[2, 0], [1, 1], [0, 2]], [[2, 1], [1, 2], [0, 0]], [[2, 2], [1, 0], [0, 1]]].map(prod).reduce(Cx.add, cx(0)) }; };
DEF.hw3 = { init: s => { s.st.w = 20; }, spec: (k, s) => H3(s.st.w).spec, solvedAt: 4, pad: 1.7,
  after: (v, k) => { if (k >= 2) { loop(v, 1.25, 2.0, 0.55, 'I_x'); loop(v, 3.85, 1.0, 0.45, 'I_y'); loop(v, 3.85, 3.0, 0.45, 'I_z'); } v.polarity(v.ckt.part('R1'), 'N', { side: 'R', text: 'v_x', color: COL.I, textColor: COL.I }); },
  vecs: (c, k, s) => k >= 4 ? [{ z: H3(s.st.w).Vs, color: COL.V, label: 'V_s' }, { z: c.Vab('R1'), color: COL.I, label: 'V_x', g: 'x' }] : [],
  planeTitle: k => k >= 4 ? ['เฟเซอร์ (คนละสเกล)', 'phasors (own scales)'] : null,
  sigs: (c, k) => k >= 4 ? [{ mag: 4, ang: 90, color: COL.V, label: 'v_s', unit: 'V', peak: true }, wave(c.Vab('R1'), COL.I, 'v_x', 'V', { g: 'x' })] : [],
  steps: s => { const w = s.st.w, H = H3(w), M = H.M, S = sar(M), zl = fd(w * 0.1, 3), zc = fd(1 / (w * 0.89), 4);
    return [step(t(`<b>เปลี่ยนเป็นเฟเซอร์อ้างอิงไซน์</b> ที่ \\(\\omega = ${w}\\) rad/s`, `<b>Phasors (sine reference)</b> at \\(\\omega = ${w}\\) rad/s`),
        block([R`v_s &= 4\cos ${w}t = 4\sin(${w}t + 90^\circ) \;\Rightarrow\; \mathbf{V}_s = 4\angle 90^\circ\ \text{V}`, R`Z_L &= j\omega L = j(${w})(100\times10^{-3}) = j${zl}\ \Omega`, R`Z_C &= \frac{-j}{\omega C} = \frac{-j}{(${w})(890\times10^{-3})} = -j${zc}\ \Omega`])),
      step(t(`<b>KVL รอบเมชทั้งสาม</b> (ตามเข็มนาฬิกา ตามเฉลยของผู้สอน) เช่นเมช \\(I_x\\): \\(-4\\angle 90^\\circ + 2I_x + 4.7(I_x - I_y) + Z_L(I_x - I_z) = 0\\) จัดรูปทั้งสามเมชได้`, `<b>KVL around the three meshes</b> (clockwise, as in the instructor's solution), e.g. mesh \\(I_x\\): \\(-4\\angle 90^\\circ + 2I_x + 4.7(I_x - I_y) + Z_L(I_x - I_z) = 0\\). Collected, the three meshes give`),
        block([R`(6.7 + j${zl})I_x - 4.7I_y - j${zl}I_z &= 4\angle 90^\circ`, R`-4.7I_x + (6.7 - j${zc})I_y - 2I_z &= 0`, R`-j${zl}I_x - 2I_y + (3 + j${zl})I_z &= 0`]),
        t('เมช \\(I_y\\): \\(4.7(I_y - I_x) + Z_C I_y + 2(I_y - I_z) = 0\\) · เมช \\(I_z\\): \\(2(I_z - I_y) + 1\\cdot I_z + Z_L(I_z - I_x) = 0\\)', 'Mesh \\(I_y\\): \\(4.7(I_y - I_x) + Z_C I_y + 2(I_y - I_z) = 0\\) · mesh \\(I_z\\): \\(2(I_z - I_y) + 1\\cdot I_z + Z_L(I_z - I_x) = 0\\)')),
      step(t('<b>ดีเทอร์มิแนนต์ 3×3 ด้วยกฎของซาร์รัส</b> (หน้า 1.2): ผลรวมพจน์บวกลบผลรวมพจน์ลบ', '<b>The 3×3 determinant by the rule of Sarrus</b> (page 1.2): the sum of the plus terms minus the sum of the minus terms'),
        block([R`\Delta &= (${RC(S.plus, 4)}) - (${RC(S.minus, 4)}) = ${RC(H.D, 4)}`, R`\Delta_{I_z} &= ${RC(H.Dz, 4)}`]),
        t('\\(\\Delta_{I_z}\\) ใช้เมทริกซ์เดิมที่แทนคอลัมน์ที่สามด้วย \\((4\\angle 90^\\circ,\\ 0,\\ 0)\\)', '\\(\\Delta_{I_z}\\) uses the same matrix with its third column replaced by \\((4\\angle 90^\\circ,\\ 0,\\ 0)\\)')),
      step(t('<b>\\(v_x\\) คือแรงดันคร่อม 1 Ω</b> ซึ่งมีกระแส \\(I_z\\)', '<b>\\(v_x\\) is the voltage across the 1 Ω</b>, which carries \\(I_z\\)'),
        block([R`I_z &= \frac{\Delta_{I_z}}{\Delta} = ${P(H.Iz, 4, 2)}\ \text{A}`, R`\mathbf{V}_x &= (1)\,I_z = ${P(H.Iz, 4, 2)}\ \text{V}`, R`v_x(t) &= \boxed{${fd(Cx.abs(H.Iz), 3)}\sin(${w}t + ${fd(CH6.deg(H.Iz), 2)}^\circ)\ \text{V}}`]))]; },
  controls: (el, s) => MC.ui.radio(el, [{ id: el.id + '_20', label: t('ω = 20 rad/s (Hayt, สไลด์ 2561)', 'ω = 20 rad/s (Hayt, 2018 slides)'), on: true }, { id: el.id + '_2', label: t('ω = 2 rad/s (ตามฉบับแจก 2568)', 'ω = 2 rad/s (as in the 2025 handout)') }],
    id => { s.st.w = id.endsWith('_2') ? 2 : 20; s.refresh(); }),
  ask: s => CH7.askZ([['V<sub>x</sub>', () => H3(s.st.w).Iz, 'V']]),
  answer: s => { const H = H3(s.st.w); return s.st.w === 20
    ? t(`\\(v_x(t) = ${fd(Cx.abs(H.Iz), 3)}\\sin(20t + ${fd(CH6.deg(H.Iz), 2)}^\\circ)\\) V Hayt ตอบในรูป cos: \\(1.14\\cos(20t + 12^\\circ) = 1.14\\sin(20t + 102^\\circ)\\) V ตรงกัน (ต่างกันแค่การปัดเศษ)`, `\\(v_x(t) = ${fd(Cx.abs(H.Iz), 3)}\\sin(20t + ${fd(CH6.deg(H.Iz), 2)}^\\circ)\\) V. Hayt answers in cos form, \\(1.14\\cos(20t + 12^\\circ) = 1.14\\sin(20t + 102^\\circ)\\) V, which matches (up to rounding).`)
    : t(`\\(v_x(t) = ${fd(Cx.abs(H.Iz), 3)}\\sin(2t + ${fd(CH6.deg(H.Iz), 2)}^\\circ)\\) V ค่านี้ใช้ \\(4\\cos 2t\\) V ตามที่ฉบับแจกพิมพ์`, `\\(v_x(t) = ${fd(Cx.abs(H.Iz), 3)}\\sin(2t + ${fd(CH6.deg(H.Iz), 2)}^\\circ)\\) V, for \\(4\\cos 2t\\) V as the handout prints it.`); } };

/* ---------------- extra 1 from the 2018 lecture (Hayt Example 10.9) ---------------- */
DEF.x1 = { spec: X1.spec, solvedAt: 4, pad: 1.3, minW: 600,
  glow: k => k === 1 ? X1.nodeV1 : k === 2 ? X1.nodeV2 : null,
  after: v => { CH7.nodeTag(v, 't1', 'V_1', COL.purple, { dx: -0.1, dy: -0.5 }); CH7.nodeTag(v, 't6', 'V_2', COL.purple, { dx: -0.1, dy: -0.5 }); v.drawGround('b2'); },
  vecs: (c, k) => k >= 4 ? [{ z: c.V('t1'), color: COL.V, label: 'V_1' }, { z: c.V('t6'), color: COL.I, label: 'V_2' }] : [],
  sigs: (c, k) => k >= 4 ? [wave(c.V('t1'), COL.V, 'v_1', 'V'), wave(c.V('t6'), COL.I, 'v_2', 'V')] : [],
  steps: () => [step(t('<b>KCL ที่โนด \\(V_1\\)</b> (ผลรวมกระแสที่ไหลออก = 0) ตามเฉลยในห้อง แหล่งจ่าย 1∠0° A ไหลเข้าจึงติดลบ', '<b>KCL at node \\(V_1\\)</b> (the currents leaving add to zero), as in the class solution; the 1∠0° A source flows in, so it is negative'),
      block([R`-1\angle 0^\circ + \frac{V_1}{5} + \frac{V_1}{-j10} + \frac{V_1 - V_2}{-j5} + \frac{V_1 - V_2}{j10} &= 0`, R`-1 + 0.2V_1 + j0.1V_1 + j0.2(V_1 - V_2) - j0.1(V_1 - V_2) &= 0`, R`(0.2 + j0.2)\,V_1 - j0.1\,V_2 &= 1 \qquad (1)`])),
    step(t('<b>KCL ที่โนด \\(V_2\\)</b>: แหล่งจ่าย 0.5∠−90° A ไหลออกจากโนดลงล่าง ในห้องเขียนเป็น \\(-j0.5\\)', '<b>KCL at node \\(V_2\\)</b>: the 0.5∠−90° A source takes current out of the node downwards; the class wrote it as \\(-j0.5\\)'),
      block([R`\frac{V_2 - V_1}{-j5} + \frac{V_2 - V_1}{j10} + \frac{V_2}{j5} + \frac{V_2}{10} + 0.5\angle{-90^\circ} &= 0`, R`j0.2(V_2 - V_1) - j0.1(V_2 - V_1) - j0.2V_2 + 0.1V_2 &= j0.5`, R`-j0.1\,V_1 + (0.1 - j0.1)\,V_2 &= j0.5 \qquad (2)`])),
    step(t('<b>กฎของคราเมอร์</b> (ตัวเลขเหมือนในห้องทุกตัว)', '<b>Cramer\'s rule</b> (every number as in class)'),
      block([R`\Delta &= ${vm('0.2 + j0.2', '-j0.1', '-j0.1', '0.1 - j0.1')} = ${RC(X1.D)}`, R`\Delta_{V_1} &= ${vm('1', '-j0.1', 'j0.5', '0.1 - j0.1')} = ${RC(X1.D1)}`, R`\Delta_{V_2} &= ${vm('0.2 + j0.2', '1', '-j0.1', 'j0.5')} = ${RC(X1.D2)}`])),
    step(t('<b>แรงดันโนดและฟังก์ชันเวลา</b> (อ้างอิงไซน์ ω ไม่ได้กำหนดจึงเขียน ωt)', '<b>The node voltages and the time functions</b> (sine reference; ω is not given, so we write ωt)'),
      block([R`\mathbf{V}_1 &= \frac{\Delta_{V_1}}{\Delta} = ${RC(X1.V1)} = ${P(X1.V1)}\ \text{V}`, R`\mathbf{V}_2 &= \frac{\Delta_{V_2}}{\Delta} = ${RC(X1.V2)} = ${P(X1.V2)}\ \text{V}`, R`v_1(t) &= \boxed{${fd(Cx.abs(X1.V1), 3)}\sin(\omega t ${CH6.deg(X1.V1) < 0 ? '-' : '+'} ${fd(Math.abs(CH6.deg(X1.V1)), 2)}^\circ)\ \text{V}}`, R`v_2(t) &= \boxed{${fd(Cx.abs(X1.V2), 3)}\sin(\omega t + ${fd(CH6.deg(X1.V2), 2)}^\circ)\ \text{V}}`]))],
  ask: () => CH7.askZ([['V<sub>1</sub>', X1.V1, 'V'], ['V<sub>2</sub>', X1.V2, 'V']]),
  answer: () => t(`\\(\\mathbf{V}_1 = 1 - j2 = ${P(X1.V1)}\\) V และ \\(\\mathbf{V}_2 = -2 + j4 = ${P(X1.V2)}\\) V ตรงกับเฉลยในห้อง (2.236∠−63.4°, 4.47∠116.56°) Hayt ตอบในรูป cos: \\(2.24\\cos(\\omega t - 63.4^\\circ)\\) และ \\(4.47\\cos(\\omega t + 116.6^\\circ)\\) V วิชานี้อ่านเฟเซอร์ด้วย sin จึงเขียน sin ที่มุมเดียวกัน`,
    `\\(\\mathbf{V}_1 = 1 - j2 = ${P(X1.V1)}\\) V and \\(\\mathbf{V}_2 = -2 + j4 = ${P(X1.V2)}\\) V, as in class (2.236∠−63.4°, 4.47∠116.56°). Hayt answers in cos form, \\(2.24\\cos(\\omega t - 63.4^\\circ)\\) and \\(4.47\\cos(\\omega t + 116.6^\\circ)\\) V; this course reads phasors with sin, so it writes sin at the same angles.`) };

/* ---------------- extra 2 from the 2018 lecture: I1, I2, I3 ---------------- */
DEF.x2 = { spec: X2.spec, solvedAt: 1, pad: 1.4,
  after: (v, k) => { const c = v.ckt; v.refArrow(c.part('C'), 's', 'I_1', { side: 'U', color: COL.I, off: 0.42 }); v.refArrow(c.part('R'), 'n', 'I_2', { side: 'L', color: COL.V, off: 0.45, at: 0.22 }); v.refArrow(c.part('L'), 'm', 'I_3', { side: 'R', color: COL.ref, off: 0.45, at: 0.22 });
    CH7.nodeTag(v, 'n', 'V', COL.purple, { dx: 0.2, dy: -0.5 }); v.drawGround('nb'); if (k >= 4) { loop(v, 1.6, 1.5, 0.55, 'I_a'); loop(v, 4.4, 1.5, 0.5, 'I_b'); } },
  vecs: (c, k) => k >= 3 ? [{ z: X2.I1, color: COL.I, label: 'I_1', w: 3.6 }, { z: X2.I2, color: COL.V, label: 'I_2' }, { z: X2.I3, from: X2.I2, color: COL.ref, label: 'I_3', lmid: -1 }]
    : k >= 2 ? [{ z: X2.I1, color: COL.I, label: 'I_1' }, { z: X2.I2, color: COL.V, label: 'I_2' }, { z: X2.I3, color: COL.ref, label: 'I_3' }]
    : k >= 1 ? [{ z: X2.Vs, color: COL.sig, label: 'V_s' }, { z: X2.V, color: COL.purple, label: 'V' }] : [],
  planeTitle: k => k >= 3 ? ['KCL: I₂ + I₃ = I₁', 'KCL: I₂ + I₃ = I₁'] : null,
  sigs: (c, k) => k >= 2 ? [wave(X2.I1, COL.I, 'i_1', 'A'), wave(X2.I2, COL.V, 'i_2', 'A'), wave(X2.I3, COL.ref, 'i_3', 'A')] : k >= 1 ? [wave(X2.Vs, COL.sig, 'v_s', 'V'), wave(X2.V, COL.purple, 'v', 'V')] : [],
  steps: () => [step(t('<b>มีโนดที่ไม่รู้ค่าโนดเดียว</b> (โนดทางขวาของตัวเก็บประจุ เรียก \\(V\\)) ให้โนดล่างเป็นโนดอ้างอิง แล้วเขียน KCL (ผลรวมกระแสที่ไหลออก = 0)', '<b>There is one unknown node</b> (right of the capacitor, call it \\(V\\)); take the bottom node as reference and write KCL (the currents leaving add to zero)'),
      block([R`\frac{V - 100\angle 0^\circ}{-j5} + \frac{V}{5} + \frac{V}{j5} &= 0`, R`j0.2\,(V - 100) + 0.2\,V - j0.2\,V &= 0`, R`0.2\,V &= j20 \;\Rightarrow\; V = \boxed{${RC(X2.V)}\ \text{V}} = ${P(X2.V)}\ \text{V}`]),
      t('ได้แรงดันโนดแล้ว กระแสทุกกิ่งจึงรู้ค่า จุดในวงจรเริ่มวิ่ง', 'With the node voltage, every branch current is known, so the dots start')),
    step(t('<b>กระแสในกิ่งจากกฎของโอห์ม</b>', '<b>The branch currents from Ohm\'s law</b>'),
      block([R`\mathbf{I}_1 &= \frac{100\angle 0^\circ - V}{-j5} = \frac{100 - j100}{-j5} = ${RC(X2.I1)} = \boxed{${P(X2.I1)}\ \text{A}}`, R`\mathbf{I}_2 &= \frac{V}{5} = \boxed{${P(X2.I2)}\ \text{A}}`, R`\mathbf{I}_3 &= \frac{V}{j5} = \boxed{${P(X2.I3)}\ \text{A}}`])),
    step(t('<b>ตรวจด้วย KCL</b>: \\(\\mathbf{I}_1\\) ต้องเท่ากับ \\(\\mathbf{I}_2 + \\mathbf{I}_3\\) (ลูกศรต่อหัวต่อหางบนระนาบ)', '<b>Check with KCL</b>: \\(\\mathbf{I}_1\\) must equal \\(\\mathbf{I}_2 + \\mathbf{I}_3\\) (the head-to-tail arrows on the plane)'),
      block([R`\mathbf{I}_2 + \mathbf{I}_3 &= ${RC(X2.I2)} + ${RC(X2.I3)} = ${RC(Cx.add(X2.I2, X2.I3))} = \mathbf{I}_1\ \checkmark`]),
      t('สังเกตว่า \\(|\\mathbf{I}_1| = 28.28\\) A แต่ \\(|\\mathbf{I}_2| + |\\mathbf{I}_3| = 40\\) A ขนาดบวกตรง ๆ ไม่ได้ เพราะ \\(\\mathbf{I}_2\\) กับ \\(\\mathbf{I}_3\\) ทำมุมกัน 90°', 'Note that \\(|\\mathbf{I}_1| = 28.28\\) A while \\(|\\mathbf{I}_2| + |\\mathbf{I}_3| = 40\\) A: sizes do not simply add, because \\(\\mathbf{I}_2\\) and \\(\\mathbf{I}_3\\) are 90° apart')),
    step(t('<b>ตรวจด้วยวิธีเมช</b> (สไลด์ถัดไปของปี 2561 ถามวงจรเดียวกันด้วยวิธีเมช): เมช \\(I_a\\) ซ้าย \\(I_b\\) ขวา ตามเข็มนาฬิกา', '<b>Check by mesh analysis</b> (the next 2018 slide asks the same circuit by meshes): clockwise meshes \\(I_a\\) (left) and \\(I_b\\) (right)'),
      block([R`(5 - j5)I_a - 5I_b &= 100`, R`-5I_a + (5 + j5)I_b &= 0`, R`\Delta &= (5 - j5)(5 + j5) - 25 = ${RC(X2.D)}`, R`I_a &= \frac{100(5 + j5)}{25} = ${RC(X2.Ia)} = \mathbf{I}_1`, R`I_b &= \frac{(5)(100)}{25} = ${RC(X2.Ib)} = \mathbf{I}_3`, R`\mathbf{I}_2 &= I_a - I_b = ${RC(Cx.sub(X2.Ia, X2.Ib))}`]))],
  ask: () => CH7.askZ([['V', X2.V, 'V'], ['I<sub>1</sub>', X2.I1, 'A']]),
  answer: () => t(`\\(\\mathbf{I}_1 = ${P(X2.I1)}\\) A, \\(\\mathbf{I}_2 = ${P(X2.I2)}\\) A และ \\(\\mathbf{I}_3 = ${P(X2.I3)}\\) A (สไลด์ไม่มีเฉลย ตรวจแล้วทั้งวิธีโนดและวิธีเมช)`, `\\(\\mathbf{I}_1 = ${P(X2.I1)}\\) A, \\(\\mathbf{I}_2 = ${P(X2.I2)}\\) A and \\(\\mathbf{I}_3 = ${P(X2.I3)}\\) A (the slides give no answer; checked by both nodal and mesh analysis).`) };

/* ---------------- Ex 3: superposition, one ω (slide p. 6, Hayt Practice 10.14) ---------------- */
const E3M = Math.max(Cx.abs(E1.sup1.V1), Cx.abs(E1.V1), Cx.abs(E1.sup2.V1));
DEF.ex3 = { kind: 'grid', aspect: 0.62,
  items: () => { const lab = (p, z) => `${p} = ${PT(z, 'V')}`;
    return [{ spec: E1.spec({ k2: true }), title: ['① มีแค่ 20∠0° mA', '① only 20∠0° mA'], sub: k => k >= 2 ? lab('V_1′', E1.sup1.V1) : 'V_1′ = ?', after: v => CH7.nodeTag(v, 'v1', 'v_1′', COL.purple, { dx: -1.0 }) },
      { spec: E1.spec({ k1: true }), title: ['② มีแค่ 50∠−90° mA', '② only 50∠−90° mA'], sub: k => k >= 3 ? lab('V_1″', E1.sup2.V1) : 'V_1″ = ?', after: v => CH7.nodeTag(v, 'v1', 'v_1″', COL.purple, { dx: -1.0 }) },
      { spec: E1.spec(), sum: [0, 1], title: ['① + ② = วงจรจริง (Ex 1)', '① + ② = the real circuit (Ex 1)'], sub: k => k >= 4 ? lab('V_1', E1.V1) : 'V_1 = V_1′ + V_1″ = ?', after: v => CH7.nodeTag(v, 'v1', 'v_1', COL.purple, { dx: -0.85 }) }]; },
  state: k => ({ run: k >= 4 ? [0, 1, 2] : k >= 3 ? [0, 1] : k >= 2 ? [0] : [], focus: k >= 4 ? 2 : k >= 3 ? 1 : k >= 2 ? 0 : -1, dim: k === 2 ? [1, 2] : k === 3 ? [2] : [] }),
  cell: (ctx, b, g, k) => { const v = []; if (k >= 2) v.push({ z: E1.sup1.V1, color: COL.V, label: 'V_1′' }); if (k >= 3) v.push({ z: E1.sup2.V1, from: E1.sup1.V1, color: COL.purple, label: 'V_1″', lmid: -1 });
    if (k >= 4) v.push({ z: E1.V1, color: COL.I, label: 'V_1', w: 3.6 });
    CH6.plane(ctx, b, v, { rot: g.clk.ph, proj: false, max: { a: E3M }, title: v.length ? t('เฟเซอร์ต่อหัวต่อหาง (ω เดียวกัน)', 'head to tail (one ω)') : t('ยังไม่มีผลย่อย', 'no partial answer yet') }); },
  steps: () => [step(t('<b>ฆ่าแหล่งจ่ายทีละตัว</b> (แหล่งจ่ายกระแสเปิดวงจร วงกลมประในภาพ) แล้วเขียน KCL แบบ Ex 1 <b>สัมประสิทธิ์ทางซ้ายเหมือนเดิม</b> เปลี่ยนแค่ค่าทางขวา', '<b>Kill one source at a time</b> (a current source opens: the dashed circles) and write KCL as in Ex 1: <b>the left-side coefficients stay the same</b>; only the right-hand side changes'),
        block([R`\text{①}\quad j0.025V_1' + j0.025V_2' &= 0.02`, R`j0.025V_1' + (0.04 - j0.025)V_2' &= 0`, R`\text{②}\quad j0.025V_1'' + j0.025V_2'' &= j0.05`, R`j0.025V_1'' + (0.04 - j0.025)V_2'' &= -j0.05`]),
        t('ทางขวาของ ① + ② คือ \\((0.02 + j0.05,\\ -j0.05)\\) เท่ากับทางขวาของ Ex 1 พอดี', 'The right sides of ① + ② add to \\((0.02 + j0.05,\\ -j0.05)\\), exactly the right side of Ex 1')),
      step(t('<b>① แหล่งจ่าย 20∠0° mA ตัวเดียว</b>: \\(\\Delta\\) เดียวกับ Ex 1 (\\(1.25\\times10^{-3} + j1\\times10^{-3}\\))', '<b>① the 20∠0° mA source alone</b>: the same \\(\\Delta\\) as Ex 1 (\\(1.25\\times10^{-3} + j1\\times10^{-3}\\))'),
        block([R`V_1' &= \frac{${vm('0.02', 'j0.025', '0', '0.04 - j0.025')}}{\Delta} = ${RC(E1.sup1.V1)} = \boxed{${P(E1.sup1.V1)}\ \text{V}}`])),
      step(t('<b>② แหล่งจ่าย 50∠−90° mA ตัวเดียว</b>', '<b>② the 50∠−90° mA source alone</b>'),
        block([R`V_1'' &= \frac{${vm('j0.05', 'j0.025', '-j0.05', '0.04 - j0.025')}}{\Delta} = ${RC(E1.sup2.V1)} = \boxed{${P(E1.sup2.V1)}\ \text{V}}`])),
      step(t('<b>รวมผล</b>: ทั้งสองเป็นเฟเซอร์ที่ ω เดียวกัน จึงบวกกันได้ (บวกในรูปคาร์ทีเซียน) วงจรจริงวิ่งด้วยผลรวมของ ① กับ ②', '<b>Add</b>: both are phasors at the same ω, so they add (in Cartesian form); the real circuit runs with the sum of ① and ②'),
        block([R`V_1 &= V_1' + V_1'' = (${RC(E1.sup1.V1)}) + (${RC(E1.sup2.V1)})`, R`&= ${RC(E1.V1)} = \boxed{${P(E1.V1)}\ \text{V}}`]))],
  ask: () => CH7.askZ([["V<sub>1</sub>′", E1.sup1.V1, 'V'], ["V<sub>1</sub>″", E1.sup2.V1, 'V']]),
  answer: () => t(`\\(\\mathbf{V}_1 = ${P(E1.V1)}\\) V เท่ากับคำตอบของ Ex 1 ทุกหลัก และผลย่อยตรงกับ Hayt Practice 10.14 (0.1951 − j0.556 V, 0.780 + j0.976 V)`, `\\(\\mathbf{V}_1 = ${P(E1.V1)}\\) V, the same as Ex 1 to every digit; the partial responses match Hayt Practice 10.14 (0.1951 − j0.556 V, 0.780 + j0.976 V).`) };

/* ---------------- Ex 4: three sources, two frequencies (slide p. 7) ---------------- */
const VL4 = E4.parts.map(p => p.VL);
const v4At = d => { const x = d * Math.PI / 180; return { a: Cx.abs(VL4[0]) * Math.sin(2 * x + CH6.deg(VL4[0]) * Math.PI / 180), b: Cx.abs(VL4[1]) * Math.sin(x + CH6.deg(VL4[1]) * Math.PI / 180) }; };
DEF.ex4 = { kind: 'grid', aspect: 0.5, speed: 70, clock: () => CH6.clock({ T: 6, base: 100 }), init: s => { s.st.wrong = false; },
  items: () => { const pol = (v, n) => v.polarity(v.ckt.part('L'), 'd', { side: 'L', text: n, color: COL.I, textColor: COL.I });
    return [{ spec: E4.spec(['is1'], 200), title: ['① มีแค่ iₛ₁ = 2∠90° A (ω = 200)', '① only iₛ₁ = 2∠90° A (ω = 200)'], sub: k => k >= 2 ? `Z_L = j1 Ω · V_L′ = ${PT(VL4[0], 'V', 2, 0)}` : 'V_L′ = ?', after: v => pol(v, 'v_L′') },
      { spec: E4.spec(['is2'], 100), title: ['② มีแค่ iₛ₂ = 1∠90° A (ω = 100)', '② only iₛ₂ = 1∠90° A (ω = 100)'], sub: k => k >= 3 ? `Z_L = j0.5 Ω · V_L″ = ${PT(VL4[1], 'V', 2, 0)}` : 'V_L″ = ?', after: v => pol(v, 'v_L″') },
      { spec: E4.spec(['vs3'], 200), title: ['③ มีแค่ vₛ₃ = 2∠0° V (ω = 200)', '③ only vₛ₃ = 2∠0° V (ω = 200)'], sub: k => k >= 4 ? ['ไม่มีวงปิด: V_L‴ = 0', 'no closed loop: V_L‴ = 0'] : 'V_L‴ = ?', after: v => pol(v, 'v_L‴') },
      { spec: E4.spec(['is1', 'is2', 'vs3'], 200), sum: [0, 1, 2], title: ['① + ② + ③ = วงจรจริง', '① + ② + ③ = the real circuit'], sub: k => k >= 5 ? ['จุดวิ่งด้วยผลรวม ①–③', 'dots = sum of ①–③'] : ['รอรวมผล', 'waiting for the sum'],
        after: v => v.polarity(v.ckt.part('L'), 'd', { side: 'L', text: 'v_L(t)', color: COL.I, textColor: COL.I }) }]; },
  state: k => ({ run: k >= 5 ? [0, 1, 2, 3] : k >= 4 ? [0, 1, 2] : k >= 3 ? [0, 1] : k >= 2 ? [0] : [], focus: k >= 5 ? 3 : k >= 4 ? 2 : k >= 3 ? 1 : k >= 2 ? 0 : -1, dim: k >= 2 && k < 5 ? [3] : [] }),
  extra: { h: W => Math.max(220, W * 0.3), draw: (ctx, b, g, k, s) => { const sigs = [];
    if (k >= 2) sigs.push({ f: d => v4At(d).a, mag: 2.5, color: COL.V, label: 'v_L′ (200 rad/s)', unit: 'V', w: 1.8 });
    if (k >= 3) sigs.push({ f: d => v4At(d).b, mag: 2.5, color: COL.purple, label: 'v_L″ (100 rad/s)', unit: 'V', w: 1.8 });
    if (k >= 5) sigs.push({ f: d => v4At(d).a + v4At(d).b, mag: 2.5, color: COL.I, label: 'v_L', unit: 'V', w: 3.2 });
    if (s.st.wrong) sigs.push({ f: d => 2.5 * Math.sin(2 * d * Math.PI / 180 + Math.PI), mag: 2.5, color: '#ff6b6b', label: t('ผิด: 2.5∠180°', 'wrong: 2.5∠180°'), unit: 'V', w: 2, dash: [6, 5] });
    CH6.waves(ctx, b, sigs, { now: g.clk.ph, w: 100, max: { a: 2.5 }, title: b.w < 560 ? t('แกนนอน 100t: v_L ไม่ใช่คลื่นไซน์', 'x axis 100t: v_L is not a sine') : t('แกนนอน 100t (องศา) และเวลา: v_L = v_L′ + v_L″ ไม่ใช่คลื่นไซน์', 'x axis: 100t (degrees) and time: v_L = v_L′ + v_L″ is not a sine wave') }); } },
  steps: () => [step(t('<b>เปลี่ยนเป็นเฟเซอร์อ้างอิงไซน์ พร้อมความถี่ของแต่ละตัว</b> (ในห้องเขียน ω₁ = 200, ω₂ = 100, ω₃ = 200)', '<b>Turn each source into a sine-referenced phasor with its own frequency</b> (the class wrote ω₁ = 200, ω₂ = 100, ω₃ = 200)'),
      block([R`i_{s1} &= 2\cos 200t = 2\sin(200t + 90^\circ)`, R`\mathbf{I}_{s1} &= 2\angle 90^\circ\ \text{A}\quad (\omega_1 = 200)`, R`i_{s2} &= 1\cos 100t = 1\sin(100t + 90^\circ)`, R`\mathbf{I}_{s2} &= 1\angle 90^\circ\ \text{A}\quad (\omega_2 = 100)`, R`v_{s3} &= 2\sin 200t`, R`\mathbf{V}_{s3} &= 2\angle 0^\circ\ \text{V}\quad (\omega_3 = 200)`]),
      t('ความถี่ไม่เท่ากัน จึงแก้วงจรรวมด้วยเฟเซอร์ครั้งเดียวไม่ได้ ต้องซ้อนทับทีละแหล่งจ่าย (ในห้องเขียนไว้ที่หน้าสารบัญว่า f₁ ≠ f₂)', 'The frequencies differ, so the whole circuit cannot be solved with phasors in one go: superpose one source at a time (the class noted f₁ ≠ f₂ on the outline slide)')),
    step(t('<b>① \\(i_{s1}\\) ตัวเดียว</b> (\\(i_{s2}\\) เปิดวงจร \\(v_{s3}\\) ลัดวงจร): กระแส \\(\\mathbf{I}_{s1}\\) ทั้งหมดไหลผ่าน L', '<b>① \\(i_{s1}\\) alone</b> (\\(i_{s2}\\) open, \\(v_{s3}\\) shorted): all of \\(\\mathbf{I}_{s1}\\) flows through L'),
      block([R`Z_{L1} &= j\omega_1 L = j(200)(5\times10^{-3}) = j1\ \Omega`, R`\mathbf{V}_L' &= \mathbf{I}_{s1} Z_{L1} = (2\angle 90^\circ)(1\angle 90^\circ) = \boxed{${P(VL4[0], 2, 0)}\ \text{V}}`])),
    step(t('<b>② \\(i_{s2}\\) ตัวเดียว</b>: ต้องคำนวณ \\(Z_L\\) ใหม่ที่ 100 rad/s', '<b>② \\(i_{s2}\\) alone</b>: \\(Z_L\\) must be recomputed at 100 rad/s'),
      block([R`Z_{L2} &= j\omega_2 L = j(100)(5\times10^{-3}) = j0.5\ \Omega`, R`\mathbf{V}_L'' &= \mathbf{I}_{s2} Z_{L2} = (1\angle 90^\circ)(0.5\angle 90^\circ) = \boxed{${P(VL4[1], 2, 0)}\ \text{V}}`])),
    step(t('<b>③ \\(v_{s3}\\) ตัวเดียว</b>: แหล่งจ่ายกระแสทั้งสองเปิดวงจร ไม่มีวงปิดให้กระแสไหล', '<b>③ \\(v_{s3}\\) alone</b>: both current sources are open, so there is no closed loop for a current'), R`\mathbf{V}_L''' = 0`),
    step(t('<b>แปลงแต่ละผลย่อยเป็นฟังก์ชันเวลาด้วยความถี่ของมันเอง แล้วจึงบวก</b> (บวกเฟเซอร์ต่างความถี่ไม่ได้)', '<b>Turn each partial response into a time function with its own frequency, then add</b> (phasors of different frequencies cannot be added)'),
      block([R`v_L(t) &= v_L' + v_L'' + v_L'''`, R`&= 2\sin(200t + 180^\circ) + 0.5\sin(100t + 180^\circ)\ \text{V}`, R`&= -2\sin 200t - 0.5\sin 100t\ \text{V}`]),
      t('ตรวจอีกทางด้วย KCL: \\(i_L = i_{s1} + i_{s2}\\) จึง \\(v_L = L\\,di_L/dt = (5\\times10^{-3})(-400\\sin 200t - 100\\sin 100t)\\) ได้ผลเดียวกัน', 'A second check with KCL: \\(i_L = i_{s1} + i_{s2}\\), so \\(v_L = L\\,di_L/dt = (5\\times10^{-3})(-400\\sin 200t - 100\\sin 100t)\\), the same result'))],
  controls: (el, s) => MC.ui.buttons(el, [{ label: t('บวกเฟเซอร์ผิด ๆ (เทียบ)', 'add phasors wrongly (compare)'), onclick: b => { s.st.wrong = !s.st.wrong; b.classList.toggle('on', s.st.wrong); } }]),
  ask: () => CH7.askZ([['200 rad/s', VL4[0], 'V'], ['100 rad/s', VL4[1], 'V']], [[0, 2.5, 180, t('2.5∠180° คือการบวกเฟเซอร์ต่างความถี่ ซึ่งทำไม่ได้', '2.5∠180° adds phasors of different frequencies, which is not allowed')]]),
  answer: () => t('\\(v_L(t) = 2\\sin(200t + 180^\\circ) + 0.5\\sin(100t + 180^\\circ)\\) V ตรงกับคำตอบสุดท้ายในห้อง กราฟสีเหลืองใต้ภาพไม่ใช่คลื่นไซน์', '\\(v_L(t) = 2\\sin(200t + 180^\\circ) + 0.5\\sin(100t + 180^\\circ)\\) V, as the final answer in class; the yellow graph under the panels is not a sine wave.') };

/* ---------------- Ex 5: Thévenin and Norton (slide p. 8) ---------------- */
const IL5 = zl => Cx.div(T5.Vth, Cx.add(T5.Zth, zl));
const LOADS5 = [[cx(100, 0), '100 Ω'], [cx(50, -80), '50 − j80 Ω'], [cx(150, 150), '150 + j150 Ω']];
const noVal = sp => ({ ...sp, parts: sp.parts.map(p => (p.id === 'Vth' || p.id === 'IN') ? { ...p, valText: '' } : p) });
DEF.ex5 = { kind: 'stages', pad: 1.8, init: s => { s.st.zl = LOADS5[0][0]; },
  stage: (k, s) => { const zl = s.st.zl, ILt = `I_L = ${PT(IL5(zl), 'A', 3, 1)}`;
    const found = [[['ได้แล้ว:', 'found so far:'], COL.muted], [k >= 2 ? `V_th = ${PT(T5.Vth, 'V', 2, 2)}` : 'V_th = ?', k >= 2 ? COL.V : COL.muted], [k >= 3 ? 'Z_th = j150 Ω' : 'Z_th = ?', k >= 3 ? COL.I : COL.muted]];
    const loadTag = (vL, vR) => { tagAt(vL, 'B', ILt, AMBER, 0.7, 0.62, 'right'); if (vR) tagAt(vR, 'B', ILt, AMBER, 0.7, 0.62, 'right'); };
    if (k === 0) return { left: T5.spec({ load: zl }), title: ['วงจรจริงต่อโหลด Z_L', 'the real circuit with its load Z_L'], lines: [[['เป้าหมาย: แทนวงจรทางซ้าย', 'Goal: replace the circuit on the left'], COL.ink], [['ด้วยแหล่งจ่าย 1 ตัว + อิมพีแดนซ์ 1 ตัว', 'by 1 source + 1 impedance'], COL.ink], [['ที่ให้กระแสใน Z_L เท่าเดิม', 'that drives the same current in Z_L'], COL.muted]], after: vL => loadTag(vL) };
    if (k === 1) return { left: T5.spec(), title: ['1 · ถอดโหลด ขั้ว A–B เปิด', '1 · remove the load, A–B open'], lines: found };
    if (k === 2) return { left: T5.spec({ load: 'meter' }), title: ['2 · วัดแรงดันวงจรเปิด = V_th', '2 · the open-circuit voltage = V_th'], lines: found,
      after: vL => tagAt(vL, 'A', `V_oc = ${PT(vL.ckt.Vab('MET'), 'V', 2, 2)}`, COL.V, 0.6, -0.55) };
    if (k === 3) return { left: T5.spec({ kill: true, test: true }), title: ['3 · ลัดวงจรแหล่งจ่าย หา Z_th', '3 · short the sources, find Z_th'], lines: found,
      after: vL => { CH7.dead(vL, 'R'); CH7.eye(vL, 'A', 'B', 'Z_th', { far: 2.2 }); const I = Cx.neg(vL.ckt.I('Vt')); tagAt(vL, 'B', `Z_th = 1/I = ${RC(Cx.div(cx(1, 0), I), 1)} Ω`, COL.I, -3.6, 0.62); } };
    if (k === 4) return { left: T5.spec({ load: zl }), right: noVal(T5.thev(zl)), title: ['4 · วงจรสมมูลเทวินิน', '4 · the Thévenin equivalent'], rightTitle: ['เทวินิน + โหลดเดิม', 'Thévenin + the same load'], rightSub: [`V_th = ${PT(T5.Vth, 'V', 2, 2)}`, 'Z_th = j150 Ω'], after: loadTag };
    return { left: T5.spec({ load: zl }), right: noVal(T5.nort(zl)), title: ['5 · วงจรสมมูลนอร์ตัน', '5 · the Norton equivalent'], rightTitle: ['นอร์ตัน + โหลดเดิม', 'Norton + the same load'], rightSub: [`I_N = ${PT(T5.IN, 'A', 4, 2)}`, 'Z_N = j150 Ω'], after: loadTag }; },
  steps: s => [step(t('<b>ถอดโหลด \\(Z_L\\) ออก</b> เหลือขั้ว A–B เปิดอยู่ ใช้โนดล่างเป็นโนดอ้างอิง (\\(V_4 = 0\\)) แหล่งจ่ายแรงดันกำหนดแรงดันโนดซ้ายและโนดกลางไว้แล้ว', '<b>Remove the load \\(Z_L\\)</b>, leaving A–B open. Take the bottom node as reference (\\(V_4 = 0\\)); the voltage sources already fix the left and middle node voltages'),
      block([R`V_1 &= 100\angle 0^\circ\ \text{V}`, R`V_2 &= 100\angle 90^\circ\ \text{V}`, R`V_3 &= V_A = \;?`])),
    step(t('<b>KCL ที่โนด \\(V_3\\)</b> (ไม่มีกระแสออกทางขั้ว A เพราะเปิดวงจร) คูณตลอดด้วย \\(-j300\\) โวลต์มิเตอร์ในภาพอ่านค่าเดียวกัน', '<b>KCL at node \\(V_3\\)</b> (no current leaves through the open terminal A); multiply through by \\(-j300\\). The voltmeter in the picture reads the same value'),
      block([R`\frac{V_3 - V_1}{-j300} + \frac{V_3 - V_2}{j100} &= 0`, R`(V_3 - 100\angle 0^\circ) - 3(V_3 - 100\angle 90^\circ) &= 0`, R`V_3 &= \frac{300\angle 90^\circ - 100\angle 0^\circ}{2}`, R`&= ${RC(T5.Vth, 2)} = ${P(T5.Vth, 2, 2)}\ \text{V}`, R`\mathbf{V}_{th} &= V_3 - V_4 = \boxed{${P(T5.Vth, 2, 2)}\ \text{V}}`]),
      t('\\(\\mathbf{V}_{th} = \\mathbf{V}_{AB}\\) คือแรงดันระหว่าง A กับ B ขณะเปิดวงจร', '\\(\\mathbf{V}_{th} = \\mathbf{V}_{AB}\\), the voltage between A and B with the terminals open')),
    step(t('<b>ฆ่าแหล่งจ่ายแรงดันทั้งสอง</b> (ลัดวงจร): ปลายทั้งสองของ 200 Ω ไปอยู่ที่ B จึงไม่มีผล (กากบาทในภาพ) ที่เหลือคือ −j300 Ω ขนานกับ j100 Ω ระหว่าง A กับ B', '<b>Kill both voltage sources</b> (short them): both ends of the 200 Ω land on B, so it drops out (the cross in the picture); what remains is −j300 Ω in parallel with j100 Ω between A and B'),
      R`Z_{th} = \frac{(-j300)(j100)}{-j300 + j100} = \frac{30\,000}{-j200} = \boxed{j150\ \Omega} = 150\angle 90^\circ\ \Omega`,
      t('แหล่งจ่ายทดสอบ 1∠0° V (สีเทา) ที่ A–B ให้กระแส \\(1/Z_{th}\\) ตรวจได้ในภาพ', 'A 1∠0° V test source (grey) at A–B draws \\(1/Z_{th}\\); check it in the picture')),
    step(t('<b>วงจรสมมูลเทวินิน</b>: \\(\\mathbf{V}_{th}\\) อนุกรม \\(Z_{th}\\) ต่อโหลดกลับเข้าไป กระแสในโหลดเท่ากับวงจรจริง (เลือกโหลดอื่นใต้ภาพได้)', '<b>The Thévenin equivalent</b>: \\(\\mathbf{V}_{th}\\) in series with \\(Z_{th}\\), with the load put back; the load current equals that of the real circuit (pick another load under the picture)'),
      R`\mathbf{I}_L = \frac{\mathbf{V}_{th}}{Z_{th} + Z_L} = \frac{${P(T5.Vth, 2, 2)}}{j150 + (${RC(s.st.zl, 0)})} = ${P(IL5(s.st.zl), 4, 2)}\ \text{A}`),
    step(t('<b>วงจรสมมูลนอร์ตัน</b>: \\(\\mathbf{I}_N = \\mathbf{V}_{th}/Z_{th}\\) ขนาน \\(Z_N = Z_{th}\\) ตรวจได้จากกระแสลัดวงจรที่ AB ของวงจรจริง', '<b>The Norton equivalent</b>: \\(\\mathbf{I}_N = \\mathbf{V}_{th}/Z_{th}\\) in parallel with \\(Z_N = Z_{th}\\); check it with the short-circuit current at AB of the real circuit'),
      block([R`\mathbf{I}_N &= \frac{\mathbf{V}_{th}}{Z_{th}} = \frac{${P(T5.Vth, 2, 2)}}{150\angle 90^\circ} = \boxed{${P(T5.IN, 4, 2)}\ \text{A}}`, R`\mathbf{I}_{sc} &= \frac{100\angle 0^\circ}{-j300} + \frac{100\angle 90^\circ}{j100} = j0.3333 + 1 = ${P(T5.Isc, 4, 2)}\ \text{A}\ \checkmark`]))],
  controls: (el, s) => MC.ui.radio(el, LOADS5.map(([z, lab], i) => ({ id: `${el.id}_z${i}`, label: t(`โหลด ${lab}`, `load ${lab}`), on: i === 0 })), id => { s.st.zl = LOADS5[+id.slice(-1)][0]; s.refresh(); }),
  ask: () => CH7.askZ([['V<sub>th</sub>', T5.Vth, 'V'], ['Z<sub>th</sub>', T5.Zth, 'Ω']]),
  answer: () => t(`\\(\\mathbf{V}_{th} = ${P(T5.Vth, 2, 2)}\\) V, \\(Z_{th} = j150\\ \\Omega\\) ตรงกับเฉลยในห้อง และ \\(\\mathbf{I}_N = ${P(T5.IN, 4, 2)}\\) A (ในห้องขีดฆ่าส่วนนอร์ตันไว้ หน้านี้ทำต่อให้)`, `\\(\\mathbf{V}_{th} = ${P(T5.Vth, 2, 2)}\\) V and \\(Z_{th} = j150\\ \\Omega\\), as in class, and \\(\\mathbf{I}_N = ${P(T5.IN, 4, 2)}\\) A (the Norton part was struck out in class; this page completes it).`) };

/* ---------------- extra 3 from the 2018 lecture (Hayt Example 10.11): Thévenin seen by the −j10 Ω ---------------- */
DEF.x3 = { kind: 'stages', pad: 1.6, stack: true,
  stage: k => { const found = [[['ได้แล้ว:', 'found so far:'], COL.muted], [k >= 1 ? `V_th = V_oc = ${RC(X3.Voc, 2)} V` : 'V_th = ?', k >= 1 ? COL.V : COL.muted], [k >= 2 ? `Z_th = ${RC(X3.Zth, 1)} Ω` : 'Z_th = ?', k >= 2 ? COL.I : COL.muted]];
    const i1 = v => v.refArrow(v.ckt.part('Z1'), 'A', 'I_1', { side: 'R', color: COL.I, off: 0.55, at: 0.15 });
    if (k === 0) return { left: X3.spec(), title: ['วงจรของโจทย์ (A = V₁, B = V₂)', 'the circuit (A = V₁, B = V₂)'], lines: [[['เป้าหมาย: แทนทุกอย่างรอบ −j10 Ω', 'Goal: replace everything around the −j10 Ω'], COL.ink], [['ด้วยแหล่งจ่าย + อิมพีแดนซ์ แล้วหา V₁', 'by a source + an impedance, then find V₁'], COL.muted]], after: v => i1(v) };
    if (k === 1) return { left: X3.spec({ open: true, meter: true }), title: ['1 · ถอด −j10 Ω วัดแรงดันวงจรเปิด', '1 · take out the −j10 Ω, measure V_oc'], lines: found, after: v => tagAt(v, 'B', `V_oc = ${PT(v.ckt.Vab('MET'), 'V', 3, 2)}`, COL.V, -1.6, -1.15) };
    if (k === 2) return { left: X3.spec({ open: true, kill: true, test: true }), title: ['2 · เปิดวงจรแหล่งจ่ายกระแส หา Z_th', '2 · open the current sources, find Z_th'], lines: found,
      after: v => { const I = Cx.neg(v.ckt.I('Vt')); tagAt(v, 'B', `Z_th = 1/I = ${RC(Cx.div(cx(1, 0), I), 1)} Ω`, COL.I, -1.6, -1.15); } };
    return { left: X3.spec(), right: X3.thev(), title: k >= 4 ? [`4 · V₁ = ${PT(X3.V1, 'V', 3, 2)}`, `4 · V₁ = ${PT(X3.V1, 'V', 3, 2)}`] : ['3 · วงจรจริง', '3 · the real circuit'], rightTitle: ['เทวินิน + −j10 Ω', 'Thévenin + −j10 Ω'],
      rightSub: [`V_th = ${PT(X3.Voc, 'V', 3, 2)}`, `Z_th = ${RC(X3.Zth, 1)} Ω`, [`I ใน −j10 Ω = ${PT(X3.I, 'A', 4, 1)}`, `I in −j10 Ω = ${PT(X3.I, 'A', 4, 1)}`]], after: vL => { if (k >= 4) i1(vL); } }; },
  steps: () => [step(t('<b>ถอด −j10 Ω ออก แล้วหาแรงดันวงจรเปิด</b> \\(\\mathbf{V}_{oc} = \\mathbf{V}_A - \\mathbf{V}_B\\) เมื่อไม่มีกระแสผ่านระหว่าง A กับ B แหล่งจ่ายแต่ละตัวไหลผ่านอิมพีแดนซ์ของฝั่งตัวเองทั้งหมด', '<b>Take out the −j10 Ω and find the open-circuit voltage</b> \\(\\mathbf{V}_{oc} = \\mathbf{V}_A - \\mathbf{V}_B\\). With no current between A and B, each source sends all its current through the impedance on its own side'),
      block([R`\mathbf{V}_A &= (1\angle 0^\circ)(4 - j2) = ${RC(X3.V1oc)}\ \text{V}`, R`\mathbf{V}_B &= -(0.5\angle{-90^\circ})(2 + j4) = ${RC(X3.V2oc)}\ \text{V}`, R`\mathbf{V}_{th} &= \mathbf{V}_A - \mathbf{V}_B = \boxed{${RC(X3.Voc)}\ \text{V}} = ${P(X3.Voc, 4, 2)}\ \text{V}`]),
      t('แหล่งจ่าย 0.5∠−90° A ดึงกระแสออกจากโนด B ลงล่าง จึงมีเครื่องหมายลบ', 'The 0.5∠−90° A source pulls current out of node B downwards, hence the minus sign')),
    step(t('<b>ฆ่าแหล่งจ่ายกระแส</b> (เปิดวงจร): มองจาก A ไป B ผ่าน \\(4 - j2\\) ลงโนดล่าง แล้วขึ้น \\(2 + j4\\) อนุกรมกัน', '<b>Kill the current sources</b> (open them): looking from A to B, the path goes down \\(4 - j2\\) to the bottom node and up \\(2 + j4\\), in series'),
      R`Z_{th} = (4 - j2) + (2 + j4) = \boxed{${RC(X3.Zth)}\ \Omega}`),
    step(t('<b>ต่อ −j10 Ω กลับเข้าวงจรสมมูล</b> กระแสจาก A ไป B ผ่าน −j10 Ω เท่ากันทั้งสองวงจร', '<b>Put the −j10 Ω back on the equivalent</b>: the current from A to B through the −j10 Ω is the same in both circuits'),
      R`\mathbf{I} = \frac{\mathbf{V}_{th}}{Z_{th} - j10} = \frac{${RC(X3.Voc)}}{${RC(Cx.add(X3.Zth, X3.ZL))}} = ${RC(X3.I)} = ${P(X3.I, 4, 2)}\ \text{A}`),
    step(t('<b>หา \\(\\mathbf{V}_1\\)</b>: กระแส 1∠0° A แยกเป็น \\(\\mathbf{I}\\) ที่ไปทาง −j10 Ω กับ \\(\\mathbf{I}_1\\) ที่ลง \\(4 - j2\\ \\Omega\\)', '<b>Find \\(\\mathbf{V}_1\\)</b>: the 1∠0° A splits into \\(\\mathbf{I}\\) towards the −j10 Ω and \\(\\mathbf{I}_1\\) down the \\(4 - j2\\ \\Omega\\)'),
      block([R`\mathbf{I}_1 &= 1\angle 0^\circ - \mathbf{I} = ${RC(Cx.sub(X3.Is1, X3.I))}\ \text{A}`, R`\mathbf{V}_1 &= \mathbf{I}_1 (4 - j2) = ${RC(X3.V1)} = \boxed{${P(X3.V1, 4, 2)}\ \text{V}}`]),
      t('เท่ากับ \\(\\mathbf{V}_1\\) ของโจทย์เพิ่มเติมข้อ 6 ในหน้า 7.1 เพราะเป็นวงจรเดียวกันที่แปลงแหล่งจ่ายแล้ว (Hayt ทำต่อจากตัวอย่าง 10.9)', 'The same \\(\\mathbf{V}_1\\) as extra problem 6 on page 7.1, because this is the same circuit after source transformations (Hayt continues from Example 10.9)'))],
  ask: () => CH7.askZ([['V<sub>1</sub>', X3.V1, 'V']]),
  answer: () => t(`\\(\\mathbf{V}_{th} = ${RC(X3.Voc)}\\) V, \\(Z_{th} = ${RC(X3.Zth)}\\ \\Omega\\) และ \\(\\mathbf{V}_1 = ${RC(X3.V1)} = ${P(X3.V1, 4, 2)}\\) V ตรงกับ Hayt (สไลด์ไม่มีเฉลย)`, `\\(\\mathbf{V}_{th} = ${RC(X3.Voc)}\\) V, \\(Z_{th} = ${RC(X3.Zth)}\\ \\Omega\\) and \\(\\mathbf{V}_1 = ${RC(X3.V1)} = ${P(X3.V1, 4, 2)}\\) V, as in Hayt (the slides give no answer).`) };

/* ---------------- phasor diagram 1: Hayt Example 10.13 (parallel, V = 1∠0° as the reference) ---------------- */
const D13S = memo(tr => D13.spec(tr));
DEF.pd13 = { spec: k => D13S(k >= 7), solvedAt: 1, pad: 1.5,
  badge: k => [k ? t(`วาดแล้ว ${k} จาก 7 ขั้น`, `drawn: step ${k} of 7`) : t('เริ่มจากตัวอ้างอิง V', 'start from the reference V'), k >= 7 ? 'ok' : 'wait'],
  vecs: (c, k) => { const V = c.V('t'), IR = c.I('R'), IL = c.I('L'), IC = c.I('C'), Ix = Cx.add(IL, IR), Is = Cx.add(IC, Ix), out = [];
    if (k >= 1) out.push({ z: V, color: COL.sig, label: 'V', g: 'v', dash: [6, 4], w: 2 }); if (k >= 2) out.push({ z: IR, color: COL.V, label: 'I_R' }); if (k >= 3) out.push({ z: IL, from: IR, color: COL.purple, label: 'I_L', lmid: 1 });
    if (k >= 4) out.push({ z: Ix, color: COL.orange, label: 'I_x', w: 2.4 }); if (k >= 5) out.push({ z: IC, from: Ix, color: COL.ref, label: 'I_C', lmid: -1 }); if (k >= 6) out.push({ z: Is, color: COL.I, label: 'I_s', w: 3.6 }); return out; },
  planeOpts: (c, k) => k >= 6 ? { arcs: [{ a: 3, b: 5, color: AMBER, r: 0.3 }] } : {},
  planeTitle: k => k >= 7 ? ['หมุนและย่อขยายทั้งรูป', 'turned and rescaled'] : k ? ['แผนภาพเฟเซอร์', 'phasor diagram'] : null,
  sigs: (c, k) => k >= 6 ? [wave(c.I('R'), COL.V, 'i_R', 'A', { w: 1.8, peak: false }), wave(c.I('L'), COL.purple, 'i_L', 'A', { w: 1.8, peak: false }), wave(c.I('C'), COL.ref, 'i_C', 'A', { w: 1.8, peak: false }), wave(c.I('Is'), COL.I, 'i_s', 'A', { w: 3 })] : [],
  waveTitle: k => k >= 6 ? ['i_R + i_L + i_C = i_s ทุกขณะ', 'i_R + i_L + i_C = i_s at every instant'] : ['ยังไม่มีรูปคลื่น', 'no waveform yet'],
  steps: () => { const k3 = Cx.inv(D13.Is), d = (a, b) => CH6.wrap(CH6.deg(a) - CH6.deg(b));
    return [step(t('<b>เลือกตัวอ้างอิง</b>: ทุกกิ่งขนานกันจึงมีแรงดันเดียวกัน ให้ \\(\\mathbf{V} = 1\\angle 0^\\circ\\) V ไปก่อน (เส้นประบนแกนจริง)', '<b>Choose the reference</b>: all branches are in parallel and share one voltage, so let \\(\\mathbf{V} = 1\\angle 0^\\circ\\) V for now (the dashed arrow on the real axis)'), R`\mathbf{V} = 1\angle 0^\circ\ \text{V}`),
      step(t('<b>กระแสในตัวต้านทาน</b> เฟสเดียวกับ \\(\\mathbf{V}\\)', '<b>The resistor current</b>, in phase with \\(\\mathbf{V}\\)'), R`\mathbf{I}_R = (0.2)(1\angle 0^\circ) = 0.2\angle 0^\circ\ \text{A}`),
      step(t('<b>กระแสในตัวเหนี่ยวนำ</b> ตามหลัง \\(\\mathbf{V}\\) 90° วาดต่อจากปลาย \\(\\mathbf{I}_R\\)', '<b>The inductor current</b>, 90° behind \\(\\mathbf{V}\\), drawn from the tip of \\(\\mathbf{I}_R\\)'), R`\mathbf{I}_L = (-j0.1)(1\angle 0^\circ) = 0.1\angle{-90^\circ}\ \text{A}`),
      step(t('<b>ผลรวม \\(\\mathbf{I}_x = \\mathbf{I}_L + \\mathbf{I}_R\\)</b> คือลูกศรจากจุดเริ่มถึงปลาย \\(\\mathbf{I}_L\\)', '<b>The sum \\(\\mathbf{I}_x = \\mathbf{I}_L + \\mathbf{I}_R\\)</b> is the arrow from the start to the tip of \\(\\mathbf{I}_L\\)'), R`\mathbf{I}_x = 0.2 - j0.1 = ${P(D13.Ix, 4, 2)}\ \text{A}`),
      step(t('<b>กระแสในตัวเก็บประจุ</b> นำหน้า \\(\\mathbf{V}\\) 90° วาดต่อจากปลาย \\(\\mathbf{I}_x\\)', '<b>The capacitor current</b>, 90° ahead of \\(\\mathbf{V}\\), drawn from the tip of \\(\\mathbf{I}_x\\)'), R`\mathbf{I}_C = (j0.3)(1\angle 0^\circ) = 0.3\angle 90^\circ\ \text{A}`),
      step(t('<b>กระแสของแหล่งจ่าย</b> \\(\\mathbf{I}_s = \\mathbf{I}_C + \\mathbf{I}_x\\) แล้วอ่านมุมจากแผนภาพ', '<b>The source current</b> \\(\\mathbf{I}_s = \\mathbf{I}_C + \\mathbf{I}_x\\), then read the angles off the diagram'),
        block([R`\mathbf{I}_s &= j0.3 + (0.2 - j0.1) = ${RC(D13.Is)} = ${P(D13.Is, 4, 2)}\ \text{A}`, R`\angle\mathbf{I}_s - \angle\mathbf{I}_R &= ${fd(d(D13.Is, D13.IR), 2)}^\circ, \qquad \angle\mathbf{I}_s - \angle\mathbf{I}_C = ${fd(d(D13.Is, D13.IC), 2)}^\circ`, R`\angle\mathbf{I}_s - \angle\mathbf{I}_x &= 45^\circ - (${fd(CH6.deg(D13.Ix), 2)}^\circ) = \boxed{${fd(d(D13.Is, D13.Ix), 2)}^\circ}`]),
        t('Hayt: \\(\\mathbf{I}_s\\) นำหน้า \\(\\mathbf{I}_R\\) 45° นำหน้า \\(\\mathbf{I}_C\\) −45° (คือตามหลัง 45°) และนำหน้า \\(\\mathbf{I}_x\\) 71.6°', 'Hayt: \\(\\mathbf{I}_s\\) leads \\(\\mathbf{I}_R\\) by 45°, \\(\\mathbf{I}_C\\) by −45° (that is, lags it by 45°) and \\(\\mathbf{I}_x\\) by 71.6°')),
      step(t('<b>แหล่งจ่ายจริงคือ 1∠0° A</b>: ทุกเฟเซอร์คูณด้วยจำนวนเชิงซ้อนตัวเดียวกัน ภาพทั้งภาพจึงหมุนและย่อขยายพร้อมกัน มุมระหว่างเฟเซอร์คงเดิม (Hayt รูป 10.41)', '<b>The true source is 1∠0° A</b>: every phasor is multiplied by the same complex number, so the whole picture turns and rescales together while the angles between phasors stay the same (Hayt Fig. 10.41)'),
        block([R`\frac{1\angle 0^\circ}{\mathbf{I}_s} &= \frac{1}{${P(D13.Is, 4, 2)}} = ${P(k3, 4, 2)}`, R`\mathbf{V} &= (1\angle 0^\circ)(${P(k3, 4, 2)}) = ${P(k3, 4, 2)}\ \text{V}`]))]; },
  ask: () => ({ fields: [{ label: t('|I<sub>s</sub>| เมื่อ V = 1∠0° (A) =', '|I<sub>s</sub>| with V = 1∠0° (A) ='), ok: x => Math.abs(x - Cx.abs(D13.Is)) <= 0.002, w: 4.5 }, { label: t('I<sub>s</sub> นำหน้า I<sub>x</sub> (°) =', 'I<sub>s</sub> leads I<sub>x</sub> by (°) ='), ok: x => Math.abs(CH6.wrap(x - (45 - CH6.deg(D13.Ix)))) <= 0.6, w: 4 }] }),
  answer: () => t(`\\(\\mathbf{I}_s = ${P(D13.Is, 4, 2)}\\) A เมื่อ \\(\\mathbf{V} = 1\\angle 0^\\circ\\) V และ \\(\\mathbf{I}_s\\) นำหน้า \\(\\mathbf{I}_x\\) อยู่ 71.57° ตรงกับ Hayt Example 10.13`, `\\(\\mathbf{I}_s = ${P(D13.Is, 4, 2)}\\) A when \\(\\mathbf{V} = 1\\angle 0^\\circ\\) V, and \\(\\mathbf{I}_s\\) leads \\(\\mathbf{I}_x\\) by 71.57°, as in Hayt Example 10.13.`) };

/* ---------------- phasor diagram 2: Hayt Practice 10.17 (I_C = 1∠0° as the reference) ---------------- */
DEF.pd17 = { spec: D17.spec, solvedAt: 1, pad: 1.5,
  badge: k => [k ? t(`วาดแล้ว ${k} จาก 6 ขั้น`, `drawn: step ${k} of 6`) : t('เริ่มจากตัวอ้างอิง I_C', 'start from the reference I_C'), k >= 6 ? 'ok' : 'wait'],
  after: (v, k) => { const c = v.ckt; v.polarity(c.part('R1'), 's', { side: 'U', text: 'V_1', color: COL.V, textColor: COL.V }); v.polarity(c.part('L'), 'n', { side: 'L', text: 'V_2', color: COL.ref, textColor: COL.ref });
    v.polarity(c.part('R2'), 'mm', { side: 'L', text: 'V_R', color: COL.purple, textColor: COL.purple }); v.refArrow(c.part('C'), 'm', 'I_C', { side: 'R', color: COL.I, off: 0.45, at: 0.2 }); },
  vecs: (c, k) => { const o = [];
    if (k >= 1) o.push({ z: D17.IC, color: COL.I, label: 'I_C', g: 'i' });
    if (k >= 1 && k <= 2) o.push({ z: D17.VR, color: COL.purple, label: 'V_R' }, { z: D17.VC, from: D17.VR, color: '#9aa3c7', label: 'V_C', lmid: 1 });
    if (k >= 2) o.push({ z: D17.V2, color: COL.ref, label: 'V_2', w: k >= 6 ? 2.4 : 3.2 });
    if (k === 3) o.push({ z: D17.IL, color: COL.orange, label: 'I_L', g: 'i' });
    if (k >= 4) o.push({ z: D17.IL, from: D17.IC, color: COL.orange, label: 'I_L', g: 'i', lmid: 1 }, { z: D17.I, color: COL.I, label: 'I', g: 'i', w: 3.6 });
    if (k === 5) o.push({ z: D17.V1, color: COL.V, label: 'V_1' });
    if (k >= 6) o.push({ z: D17.V1, from: D17.V2, color: COL.V, label: 'V_1', lmid: -1 }, { z: D17.Vs, color: COL.sig, label: 'V_s', w: 3.6 }); return o; },
  planeTitle: k => k ? ['แผนภาพเฟเซอร์', 'phasor diagram'] : null,
  sigs: (c, k) => k >= 6 ? [wave(D17.Vs, COL.sig, 'v_s', 'V', { w: 3 }), wave(D17.V1, COL.V, 'v_1', 'V', { w: 1.8 }), wave(D17.V2, COL.ref, 'v_2', 'V', { w: 1.8 })] : [],
  waveTitle: k => k >= 6 ? ['v_1 + v_2 = v_s ทุกขณะ', 'v_1 + v_2 = v_s at every instant'] : ['ยังไม่มีรูปคลื่น', 'no waveform yet'],
  steps: () => [step(t('<b>ให้กระแสในกิ่งขวาสุดเป็นตัวอ้างอิง</b> \\(\\mathbf{I}_C = 1\\angle 0^\\circ\\) A (ภาพจำลองใช้ \\(\\mathbf{V}_s = 3 - j3\\) V ซึ่งให้ค่านี้พอดี)', '<b>Take the current in the rightmost branch as the reference</b>, \\(\\mathbf{I}_C = 1\\angle 0^\\circ\\) A (the simulation uses \\(\\mathbf{V}_s = 3 - j3\\) V, which gives exactly this)'),
      block([R`\mathbf{V}_R &= (2)(1\angle 0^\circ) = 2\ \text{V}`, R`\mathbf{V}_C &= (-j1)(1\angle 0^\circ) = -j1\ \text{V}`])),
    step(t('<b>แรงดันคร่อมกิ่งขวา</b> = แรงดันคร่อม j2 Ω (ขนานกัน)', '<b>The voltage across the right branch</b> = the voltage across the j2 Ω (they are in parallel)'), R`\mathbf{V}_2 = \mathbf{V}_R + \mathbf{V}_C = ${RC(D17.V2)} = ${P(D17.V2, 4, 2)}\ \text{V}`),
    step(t('<b>กระแสในตัวเหนี่ยวนำ</b>', '<b>The inductor current</b>'), R`\mathbf{I}_L = \frac{\mathbf{V}_2}{j2} = ${RC(D17.IL)} = ${P(D17.IL, 4, 2)}\ \text{A}`),
    step(t('<b>กระแสรวม</b> (KCL ที่โนด): ต่อ \\(\\mathbf{I}_L\\) จากปลาย \\(\\mathbf{I}_C\\)', '<b>The total current</b> (KCL at the node): \\(\\mathbf{I}_L\\) drawn from the tip of \\(\\mathbf{I}_C\\)'), R`\mathbf{I} = \mathbf{I}_C + \mathbf{I}_L = ${RC(D17.I)} = ${P(D17.I, 4, 2)}\ \text{A}`),
    step(t('<b>แรงดันคร่อม 2 Ω ตัวแรก</b> เฟสเดียวกับ \\(\\mathbf{I}\\)', '<b>The voltage across the first 2 Ω</b>, in phase with \\(\\mathbf{I}\\)'), R`\mathbf{V}_1 = 2\,\mathbf{I} = ${RC(D17.V1)} = ${P(D17.V1, 4, 2)}\ \text{V}`),
    step(t('<b>แรงดันของแหล่งจ่าย</b> (KVL): ต่อ \\(\\mathbf{V}_1\\) จากปลาย \\(\\mathbf{V}_2\\) แล้วหาอัตราส่วน', '<b>The source voltage</b> (KVL): \\(\\mathbf{V}_1\\) drawn from the tip of \\(\\mathbf{V}_2\\), then the ratio'),
      block([R`\mathbf{V}_s &= \mathbf{V}_1 + \mathbf{V}_2 = ${RC(D17.Vs)} = ${P(D17.Vs, 4, 2)}\ \text{V}`, R`\frac{|\mathbf{V}_s|}{|\mathbf{V}_1|} &= \frac{${fd(Cx.abs(D17.Vs), 4)}}{${fd(Cx.abs(D17.V1), 4)}} = \boxed{${fd(D17.ratio, 3)}}`]),
      t('อัตราส่วนไม่ขึ้นกับตัวอ้างอิงที่เลือก แหล่งจ่ายจริงค่าใดก็ได้เพียงหมุนและย่อขยายทั้งภาพ', 'The ratio does not depend on the reference chosen: any real source only turns and rescales the whole picture'))],
  ask: () => ({ fields: [{ label: t('|V<sub>s</sub>| / |V<sub>1</sub>| =', '|V<sub>s</sub>| / |V<sub>1</sub>| ='), ok: x => Math.abs(x - D17.ratio) <= 0.01, w: 4.5 }] }),
  answer: () => t(`\\(|\\mathbf{V}_s|/|\\mathbf{V}_1| = ${fd(D17.ratio, 3)}\\) ตรงกับ Hayt (1.90)`, `\\(|\\mathbf{V}_s|/|\\mathbf{V}_1| = ${fd(D17.ratio, 3)}\\), as in Hayt (1.90).`) };

CH7.DEF = DEF;

/* =====================================================================================================================
   6) one problem section: canvas cv<n>, try-first box ask<n>, stepper st<n>, controls ctl<n>; o = { ask, answer, hint } override the DEF */
CH7.problem = (n, key, o = {}) => {
  const $ = id => document.getElementById(id), d = DEF[key], C = { prob: CH7.Prob, grid: CH7.GridProb, stages: CH7.Stages }[d.kind || 'prob'];
  const sim = new C($('cv' + n), { ...d, colW: $('st' + n).clientWidth });
  if ($('ctl' + n)) sim.controls($('ctl' + n));
  const ask = o.ask || d.ask; if (ask && $('ask' + n)) LS.ask($('ask' + n), ask(sim));
  const answer = o.answer || (d.answer ? () => d.answer(sim) : undefined);
  sim.stepper = LS.stepper($('st' + n), { steps: () => sim.steps, answer, hint: o.hint || d.hint, onStep: k => sim.set(k) });
  LS.onFonts(() => { sim.colW = $('st' + n).clientWidth; sim.list = null; sim.stepper.refresh(true); });
  LS.watchWidth($('st' + n), w => { sim.colW = w; sim.list = null; sim.stepper.refresh(true); });
  return sim;
};

})(window);
