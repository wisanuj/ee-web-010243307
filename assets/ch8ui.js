/* ch8ui.js — chapter 8 in the problem-by-problem format (rebuilt Oct 2026): average power, complex power, the power factor and
   its correction. Built on ch8.js (Board, triangle, bars, pSigs), ch6.js (plane, waves, clock), lesson.js (LS.stepper, LS.step,
   LS.withCol) and ch8_circuits.js (CH8C). Peak phasors on page 8.1 (and the slide p. 7 circuit), effective values elsewhere.
   1) CH8.Prob     one circuit on a CH8.Board (circuit + side panel + wave panels); the open steps decide the glow, the overlays,
                   the side panel (phasors, power bars or power triangles), the waves and when the dots run
   2) CH8.DEF      the problems: ex4 (page 8.1, slide p. 7), ex4q (8.2, slide p. 7 continued as in class), ex8 hw (8.3, slides
                   pp. 13, 16), ex9 house (8.4, slide p. 15 and the 2018 slide p. 19)
   3) CH8.problem  wires one problem section: canvas cv<n>, try-first box ask<n>, stepper st<n>, controls ctl<n> */
(function (global) {
'use strict';
const CH8 = global.CH8, Cx = CK.Cx, cx = Cx.c, COL = CH6.COL, fd = CH6.fd, R = String.raw, C8 = CH8.COL;
const t = (th, en) => MC.t(th, en), tt = p => (p ? (Array.isArray(p) ? MC.t(p[0], p[1]) : p) : '');
const step = (why, tex, note) => LS.step(why, tex, note), block = rows => LS.block(rows);
const P = (z, d = 4, ad = 2) => CH6.pol(z, d, ad), RC = (z, d = 4) => CH6.rect(z, d), PT = (z, u, d = 4, ad = 2) => CH6.polTxt(z, u, d, ad);
const sg = (x, d = 2) => fd(x, d).replace('-', '−');
const memo = f => { const m = new Map(); return k => { if (!m.has(k)) m.set(k, f(k)); return m.get(k); }; };
const GREEN = '#7ee787', PINK = '#ff7eb6', PURPLE = '#c792ea', AMBER = '#ffd166', ORANGE = '#ffa552', RT2 = Math.SQRT2, D2R = Math.PI / 180;
const GLOW = 'rgba(255,126,182,.4)';
const rms = z => Cx.scale(z, 1 / RT2);
/* thousands with a thin space in TeX: 21\,065.79 */
const big = (x, d = 2) => { const s = fd(Math.abs(x), d), [i, f] = s.split('.'), g = i.replace(/\B(?=(\d{3})+(?!\d))/g, '\\,'); return (x < 0 ? '-' : '') + g + (f ? '.' + f : ''); };
/* a number checked within 0.5 % (or tol) */
const near = (x, a, tol) => Math.abs(x - a) <= (tol ?? Math.max(2e-3, 0.005 * Math.abs(a)));
const num = (label, ans, o = {}) => ({ label, w: o.w || 5, ok: x => near(x, typeof ans === 'function' ? ans() : ans, o.tol) });
const lagW = S => Math.abs(S.im) < 1e-9 * Math.max(1, Cx.abs(S)) ? '' : S.im > 0 ? t('ตามหลัง', 'lagging') : t('นำหน้า', 'leading');
const pfTex = (S, d = 4) => { const l = lagW(S); return `${fd(CH8C.pf(S), d)}${l ? `\\ \\text{${l}}` : ''}`; };
const pfTxt = (S, d = 4) => { const l = lagW(S); return `${fd(CH8C.pf(S), d)}${l ? ' ' + l : ''}`; };
/* a muted message in the middle of an empty panel, broken into lines */
const wrap = (ctx, s, maxW, size) => { const out = []; let cur = '';
  String(s).split(' ').forEach(w => { const tst = cur ? `${cur} ${w}` : w; if (cur && CH8.textW(ctx, tst, size) > maxW) { out.push(cur); cur = w; } else cur = tst; }); if (cur) out.push(cur); return out; };
const empty = (ctx, b, msg) => { CH6.bg(ctx, b); const L = wrap(ctx, tt(msg), b.w - 36, 13);
  L.forEach((l, i) => CH6.text(ctx, l, b.x + b.w / 2, b.y + b.h / 2 + (i - (L.length - 1) / 2) * 19, { color: COL.muted, size: 13 })); };
const loop = (v, x, y, r, label, o = {}) => v.meshLoop(x, y, r, { label, color: COL.purple, spin: null, ...o });

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
      view: Object.assign({ glowColor: GLOW }, o.view || {}), shortSpec: o.shortSpec ? sp => o.shortSpec(sp, self) : undefined,
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

/* =====================================================================================================================
   2) the problems */
const DEF = {};
const E4 = memo(ph => CH8C.ex4.make(ph)), E8 = CH8C.ex8, E9 = CH8C.ex9, H = CH8C.house;
const S4 = memo(ph => E4(ph).spec());
/* the largest |p(t)| of the parts of a solved circuit: the common scale of the power bars and the p(t) graph */
const pMax = (c, ids) => Math.max(1e-9, ...ids.map(id => Math.abs(c.P(id)) + 0.5 * Cx.abs(c.Vab(id)) * Cx.abs(c.I(id)))) * 1.05;
const iWave = (z, color, label, o = {}) => ({ mag: Cx.abs(z), ang: CH6.deg(z), color, label, unit: 'A', g: 'i', w: 2.4, ...o });

/* ---------------- page 8.1: slide p. 7 (Hayt Example 11.4), the average power of every element ---------------- */
DEF.ex4 = { init: s => { s.st.ph = 0; }, spec: (k, s) => S4(s.st.ph), solvedAt: 3, pad: 1.45, cktAspM: 0.5, view: { acPower: 'P' },
  glow: k => k === 1 ? ['Vl', 'L', 'R', 'wb1'] : k === 2 ? ['R', 'C', 'Vr', 'wb2'] : k === 5 ? ['L', 'R', 'C'] : k === 6 ? ['Vl', 'Vr'] : null,
  after: (v, k) => { if (k >= 1 && k <= 3) loop(v, 1.5, 2.1, 0.5, 'I_1'); if (k >= 2 && k <= 3) loop(v, 4.5, 2.1, 0.5, 'I_2'); },
  side: (ctx, b, bd, k, s) => { const E = E4(s.st.ph), c = bd.ckt, sh = bd.short;
    if (k < 3) return empty(ctx, b, ['ยังไม่มีกระแส: เขียนสมการเมชก่อน', 'no currents yet: write the mesh equations first']);
    if (k === 3) return CH6.plane(ctx, b, [{ z: E.I1, color: COL.I, label: 'I_1' }, { z: E.I2, color: PURPLE, label: 'I_2' }], { title: t('กระแสเมช (ค่ายอด)', 'mesh currents (peak)') });
    if (k === 4) return CH6.plane(ctx, b, [{ z: E.IR, color: GREEN, label: 'I_R', lmid: 1 }, { z: E.IC, from: E.IR, color: PINK, label: 'I_C', lmid: -1 }, { z: E.IL, color: COL.I, label: 'I_L', w: 3.6 }],
      { title: sh ? t('I_L = I_R + I_C', 'I_L = I_R + I_C') : t('KCL ที่โนดกลาง: I_L = I_R + I_C', 'KCL at the middle node: I_L = I_R + I_C') });
    const ids = k >= 6 ? ['Vl', 'L', 'R', 'C', 'Vr'] : ['L', 'R', 'C'], ph = bd.clk.ph, max = pMax(c, ['Vl', 'L', 'R', 'C', 'Vr']);
    const lab = { Vl: sh ? '20V' : '20∠0° V', L: sh ? 'L' : 'j2 Ω', R: sh ? 'R' : '2 Ω', C: sh ? 'C' : '−j2 Ω', Vr: sh ? '10V' : `10∠${s.st.ph}° V` };
    const col = { Vl: COL.V, L: PURPLE, R: GREEN, C: PINK, Vr: AMBER };
    CH8.bars(ctx, b, ids.map(id => ({ label: lab[id], v: CH8.at(c.Vab(id), ph) * CH8.at(c.I(id), ph), avg: c.P(id), color: col[id], sub: `P = ${sg(c.P(id), 1)}` })),
      { title: sh ? t('p(t) · ◆ = P', 'p(t) · ◆ = P') : t('p(t) ขณะนี้ (+ รับ, − จ่าย) · ◆ = ค่าเฉลี่ย P', 'p(t) now (+ takes, − gives) · ◆ = average P'), max, sum: k >= 6, unit: 'W', sub: !sh }); },
  waves: [{ title: (bd, k) => k < 3 ? t('ยังไม่มีรูปคลื่น', 'no waveform yet') : k < 5 ? t('กระแส (ค่ายอด)', 'currents (peak)') : bd.short ? 'p_R, p_L, p_C' : t('p_R ≥ 0 · p_L, p_C เฉลี่ยเป็นศูนย์', 'p_R ≥ 0 · p_L, p_C average zero'),
    sigs: (bd, k, s) => { const E = E4(s.st.ph), c = bd.ckt; if (k < 3) return [];
      if (k < 5) return [iWave(E.IL, COL.I, 'i_L'), iWave(E.IR, GREEN, 'i_R'), iWave(E.IC, PINK, 'i_C')];
      const max = pMax(c, ['Vl', 'L', 'R', 'C', 'Vr']), f = id => CH8.pOf(c, id);
      return [{ f: f('L'), color: PURPLE, label: 'p_L', unit: 'W', g: 'p', mag: max, w: 2.2 }, { f: f('C'), color: PINK, label: 'p_C', unit: 'W', g: 'p', mag: max, w: 2.2 },
        ...CH8.pSigs(f('R'), { P: c.P('R'), label: 'p_R', color: GREEN, mag: max, avgLabel: 'P_R' })]; } }],
  controls: (el, s) => MC.ui.buttons(el, [{ label: t('กลับขั้วแหล่งจ่ายขวา (10∠180° V)', 'Flip the right source (10∠180° V)'), onclick: b => { s.st.ph = s.st.ph ? 0 : 180; b.classList.toggle('on', !!s.st.ph); s.refresh(); } }]),
  steps: s => { const E = E4(s.st.ph), fl = !!s.st.ph, b2 = fl ? '10' : '-10', sgn = fl ? '-' : '+';
    const aL = CH6.wrap(0 - CH6.deg(E.I1)), aR = CH6.wrap(s.st.ph - CH6.deg(E.I2)), pr = E.SrAbs.re;
    return [step(t('<b>กฎแรงดันของเคียร์ชอฟฟ์ (KVL) รอบเมช \\(\\mathbf{I}_1\\)</b> ตามเข็มนาฬิกา เริ่มที่มุมล่างซ้ายเหมือนในห้อง (ชิ้นส่วนของเมชนี้เรืองแสง) แหล่งจ่ายเป็นเฟเซอร์ค่ายอด', '<b>Kirchhoff\'s voltage law (KVL) around mesh \\(\\mathbf{I}_1\\)</b>, clockwise from the bottom-left corner as in class (the parts of this mesh glow). The sources are peak phasors.'),
        block([R`-20\angle 0^\circ + j2\,\mathbf{I}_1 + 2(\mathbf{I}_1 - \mathbf{I}_2) &= 0`, R`(2 + j2)\,\mathbf{I}_1 - 2\,\mathbf{I}_2 &= 20 \qquad (1)`])),
      step(t('<b>KVL รอบเมช \\(\\mathbf{I}_2\\)</b>', '<b>KVL around mesh \\(\\mathbf{I}_2\\)</b>'),
        block([R`2(\mathbf{I}_2 - \mathbf{I}_1) - j2\,\mathbf{I}_2 ${sgn} 10\angle 0^\circ &= 0`, R`-2\,\mathbf{I}_1 + (2 - j2)\,\mathbf{I}_2 &= ${b2} \qquad (2)`])),
      step(t('<b>กฎของคราเมอร์</b> (เหมือนบทที่ 7) จุดเริ่มวิ่งเมื่อได้กระแสเมช', '<b>Cramer\'s rule</b> (as in chapter 7); the dots start once the mesh currents are known'),
        block([R`\Delta &= (2 + j2)(2 - j2) - (-2)(-2) = ${RC(E.D)}`, R`\Delta_{I_1} &= (20)(2 - j2) - (-2)(${b2}) = ${RC(E.D1)}`, R`\Delta_{I_2} &= (2 + j2)(${b2}) - (-2)(20) = ${RC(E.D2)}`,
          R`\mathbf{I}_1 &= \frac{\Delta_{I_1}}{\Delta} = ${RC(E.I1)}\ \text{A}`, R`\mathbf{I}_2 &= \frac{\Delta_{I_2}}{\Delta} = ${RC(E.I2)}\ \text{A}`])),
      step(t('<b>กระแสของแต่ละอุปกรณ์</b> (ระนาบ: \\(\\mathbf{I}_L = \\mathbf{I}_R + \\mathbf{I}_C\\) คือ KCL ที่โนดกลาง)', '<b>The current of each element</b> (the plane: \\(\\mathbf{I}_L = \\mathbf{I}_R + \\mathbf{I}_C\\) is KCL at the middle node)'),
        block([R`\mathbf{I}_L &= \mathbf{I}_1 = ${P(E.I1)}\ \text{A}`, R`\mathbf{I}_C &= \mathbf{I}_2 = ${P(E.I2)}\ \text{A}`, R`\mathbf{I}_R &= \mathbf{I}_1 - \mathbf{I}_2 = ${RC(E.IR)} = ${P(E.IR)}\ \text{A}`])),
      step(t('<b>กำลังเฉลี่ยของอุปกรณ์พาสซีฟ</b> \\(P = \\tfrac12|\\mathbf{V}_m||\\mathbf{I}_m|\\cos(\\theta-\\phi)\\) (เฟเซอร์ค่ายอด จึงมี ½) แท่งด้านข้างคือ \\(p(t)\\) ขณะนี้ ◆ คือค่าเฉลี่ย', '<b>Average power of the passive elements</b>, \\(P = \\tfrac12|\\mathbf{V}_m||\\mathbf{I}_m|\\cos(\\theta-\\phi)\\) (peak phasors, so a ½). The bars show \\(p(t)\\) now; ◆ is the average.'),
        block([R`\mathbf{V}_R &= \mathbf{I}_R R = ${P(E.VR)}\ \text{V}`, R`P_R &= \tfrac12(${fd(Cx.abs(E.VR), 4)})(${fd(Cx.abs(E.IR), 4)})\cos 0^\circ = \boxed{${fd(E.SR.re, 4)}\ \text{W}}`, R`P_L &= \tfrac12|\mathbf{V}_L||\mathbf{I}_L|\cos 90^\circ = \boxed{0}`, R`P_C &= \tfrac12|\mathbf{V}_C||\mathbf{I}_C|\cos(-90^\circ) = \boxed{0}`]),
        t('ในห้องเขียน \\(P_R = \\tfrac{(10)(5)}{2}\\cos(-90^\\circ - (-90^\\circ)) = 25\\) W เพราะ \\(\\mathbf{V}_R\\) กับ \\(\\mathbf{I}_R\\) มีมุมเดียวกัน', 'The class wrote \\(P_R = \\tfrac{(10)(5)}{2}\\cos(-90^\\circ - (-90^\\circ)) = 25\\) W, since \\(\\mathbf{V}_R\\) and \\(\\mathbf{I}_R\\) have the same angle.')),
      step(t('<b>กำลังเฉลี่ยของแหล่งจ่าย</b>: \\(\\mathbf{I}_1\\) ไหลออกจากขั้ว + ของแหล่งจ่ายซ้าย จึงเป็นกำลังที่<b>จ่าย</b> ส่วน \\(\\mathbf{I}_2\\) ไหลเข้าขั้ว + ของแหล่งจ่ายขวา จึงเป็นกำลังที่<b>รับ</b> (ถ้าได้ค่าบวก)', '<b>Average power of the sources</b>: \\(\\mathbf{I}_1\\) leaves the + terminal of the left source, so this is power <b>supplied</b>; \\(\\mathbf{I}_2\\) enters the + terminal of the right source, so this is power <b>absorbed</b> (if positive).'),
        block([R`P_{\text{20 V}} &= \tfrac12(20)(${fd(Cx.abs(E.I1), 4)})\cos(${fd(aL, 2)}^\circ) = \boxed{${fd(E.SlDel.re, 4)}\ \text{W}}`, R`P_{\text{10 V}} &= \tfrac12(10)(${fd(Cx.abs(E.I2), 4)})\cos(${fd(aR, 2)}^\circ) = \boxed{${fd(pr, 4)}\ \text{W}}`]),
        fl ? t('ผลเป็นลบแปลว่าแหล่งจ่ายขวา<b>จ่าย</b>กำลัง (ไม่ได้รับ)', 'A negative result means the right source <b>supplies</b> power (it does not absorb).')
          : t('แหล่งจ่ายซ้ายจ่าย 50 W ส่วนแหล่งจ่ายขวา<b>รับ</b> 25 W เหมือนแบตเตอรี่ที่ถูกชาร์จ', 'The left source supplies 50 W; the right source <b>absorbs</b> 25 W, like a battery being charged.')),
      step(t('<b>ตรวจสมดุลกำลัง</b>: กำลังที่จ่ายออก = กำลังที่รับเข้า (แท่ง \\(p(t)\\) รวมกันเป็นศูนย์ทุกขณะ Σ = 0)', '<b>Check the power balance</b>: power supplied = power absorbed (the \\(p(t)\\) bars add to zero at every instant, Σ = 0)'),
        block([R`${fd(E.SlDel.re, 4)} &= \underbrace{${fd(E.SR.re, 4)}}_{R} + \underbrace{0}_{L} + \underbrace{0}_{C} ${pr >= 0 ? '+' : '-'} \underbrace{${fd(Math.abs(pr), 4)}}_{\text{10 V}}\ \ \checkmark`]))]; },
  ask: s => ({ fields: [num('P<sub>R</sub> (W) =', () => E4(s.st.ph).SR.re), num(t('P ที่ 20 V จ่าย (W) =', 'P supplied by 20 V (W) ='), () => E4(s.st.ph).SlDel.re), num(t('P ที่ 10 V รับ (W) =', 'P absorbed by 10 V (W) ='), () => E4(s.st.ph).SrAbs.re)],
    check: v => near(v[0], 2 * E4(s.st.ph).SR.re) || near(v[1], 2 * E4(s.st.ph).SlDel.re) ? t('เฟเซอร์ในวงจรนี้เป็นค่ายอด อย่าลืม ½ ใน \\(P = \\tfrac12 V_m I_m\\cos(\\theta-\\phi)\\)', 'The phasors here are peak values: do not forget the ½ in \\(P = \\tfrac12 V_m I_m\\cos(\\theta-\\phi)\\).') : '' }),
  answer: s => { const E = E4(s.st.ph); return s.st.ph ? t(`\\(P_R = ${fd(E.SR.re, 2)}\\) W, \\(P_L = P_C = 0\\) และเมื่อกลับขั้ว แหล่งจ่ายทั้งสองจ่าย ${fd(E.SlDel.re, 2)} W และ ${fd(-E.SrAbs.re, 2)} W`, `\\(P_R = ${fd(E.SR.re, 2)}\\) W, \\(P_L = P_C = 0\\), and with the source flipped both sources supply: ${fd(E.SlDel.re, 2)} W and ${fd(-E.SrAbs.re, 2)} W.`)
    : t('\\(P_R = 25\\) W, \\(P_L = P_C = 0\\), แหล่งจ่าย 20 V จ่าย 50 W และแหล่งจ่าย 10 V <b>รับ</b> 25 W ตรงกับเฉลยในห้องและ Hayt Example 11.4', '\\(P_R = 25\\) W, \\(P_L = P_C = 0\\); the 20 V source supplies 50 W and the 10 V source <b>absorbs</b> 25 W, as in the class solution and Hayt Example 11.4.'); } };

/* ---------------- page 8.2: slide p. 7 continued as in class: Q_L, Q_C, S of the 20 V source and its PF ---------------- */
const E40 = E4(0), S40 = S4(0);
DEF.ex4q = { spec: S40, solvedAt: 0, pad: 1.45, cktAspM: 0.5,
  glow: k => k === 2 ? ['C'] : k === 3 ? ['L'] : k === 4 ? ['R', 'Vr'] : k === 5 || k === 6 ? ['Vl'] : null,
  side: (ctx, b, bd, k) => { const c = bd.ckt, sh = bd.short;
    const sR = c.S('R'), sL = c.S('L'), sC = c.S('C'), sVr = c.S('Vr'), sDel = Cx.neg(c.S('Vl'));
    if (k < 2) return empty(ctx, b, ['ยังไม่มีกำลังเชิงซ้อน: หาแรงดันของแต่ละอุปกรณ์ก่อน', 'no complex power yet: find the voltage of each element first']);
    const lab = (n, S) => sh ? n : `${n} = ${CH8.cfmt(S)}`, segs = [];
    if (k < 7) {   /* each element's S drawn from the origin (a fan), in the order the steps find them */
      segs.push({ S: sC, color: PINK, label: lab('S_C', sC), legs: false, w: 2.8, lpos: 1 });
      if (k >= 3) segs.push({ S: sL, color: PURPLE, label: lab('S_L', sL), legs: false, w: 2.8, lpos: 1 });
      if (k >= 4) segs.push({ S: sR, color: GREEN, label: lab('S_R', sR), legs: false, w: 2.8, lpos: -1 }, { S: sVr, color: AMBER, label: lab('S_10V', sVr), legs: false, w: 2.8, lpos: -1 });
      if (k >= 5) segs.push({ S: sDel, color: COL.V, label: lab('S_20V', sDel), legs: false, w: 3.6, dash: [9, 5], arc: k >= 6, arcText: `${sg(CH6.deg(sDel), 2)}°`, lpos: 1 });
      return CH8.triangle(ctx, b, { title: sh ? t('S ของแต่ละตัว', 'S of each element') : t('S ของแต่ละอุปกรณ์ (จากจุดกำเนิด)', 'S of each element (from the origin)'), quad: false, segs, max: { P: 50, Q: 125, Qn: 50 } }); }
    /* the last step: head to tail (order R, L, 10 V, C keeps L and C on different lines) and the S sent by the 20 V source */
    let f = cx(0); [[sR, GREEN, 'S_R', 1], [sL, PURPLE, 'S_L', -1], [sVr, AMBER, 'S_10V', -1], [sC, PINK, 'S_C', -1]].forEach(([S, color, n, lpos]) => { segs.push({ S, from: f, color, label: n, legs: false, w: 2.8, lpos }); f = Cx.add(f, S); });
    CH8.triangle(ctx, b, { title: sh ? t('ต่อหัวต่อหาง = S_20V', 'head to tail = S_20V') : t('ต่อหัวต่อหาง = S ที่แหล่งจ่าย 20 V ส่ง', 'head to tail = S sent by 20 V'), quad: false,
      segs: [{ S: sDel, color: COL.V, label: lab('S_20V', sDel), w: 4, dash: [9, 5], legs: false, lpos: 1 }, ...segs] }); },
  waves: [{ title: (bd, k) => k < 2 ? t('ยังไม่มีรูปคลื่น', 'no waveform yet') : bd.short ? 'p_C, p_L' : t('p_C และ p_L แกว่งด้วยขนาด |Q| พอดี', 'p_C and p_L swing with amplitude exactly |Q|'),
    sigs: (bd, k) => { const c = bd.ckt; if (k < 2) return []; const m = 0.5 * Math.max(Cx.abs(c.Vab('L')) * Cx.abs(c.I('L')), Cx.abs(c.Vab('C')) * Cx.abs(c.I('C'))) * 1.08, s = [];
      const band = (q, col, lab) => [{ f: () => q, color: col, dash: [2, 4], g: 'p', mag: m, w: 1.5, label: lab, unit: 'VAR' }, { f: () => -q, color: col, dash: [2, 4], g: 'p', mag: m, w: 1.5 }];
      s.push({ f: CH8.pOf(c, 'C'), color: PINK, label: 'p_C', unit: 'W', g: 'p', mag: m, w: 2.6 }, ...band(Math.abs(c.S('C').im), 'rgba(255,126,182,.7)', '|Q_C|'));
      if (k >= 3) s.push({ f: CH8.pOf(c, 'L'), color: PURPLE, label: 'p_L', unit: 'W', g: 'p', mag: m, w: 2.6 }, ...band(Math.abs(c.S('L').im), 'rgba(199,146,234,.7)', '|Q_L|'));
      return s; } }],
  steps: () => { const E = E40, a = -CH6.deg(E.I1), Ve = 20 / RT2, Ie = Cx.abs(E.I1) / RT2;
    return [step(t('<b>แรงดันและกระแสของแต่ละอุปกรณ์</b> จากหน้า 8.1 ข้อ 1 (เฟเซอร์ค่ายอด ตามเฉลยในห้อง)', '<b>The voltage and current of each element</b>, from page 8.1, problem 1 (peak phasors, as in class)'),
        block([R`\mathbf{V}_R &= \mathbf{I}_R R = (${P(E.IR)})(2) = ${P(E.VR)}\ \text{V}`, R`\mathbf{V}_L &= \mathbf{I}_L(j2) = (${P(E.IL)})(j2) = ${P(E.VL)}\ \text{V}`, R`\mathbf{V}_C &= \mathbf{I}_C(-j2) = (${P(E.IC)})(-j2) = ${P(E.VC)}\ \text{V}`])),
      step(t('<b>กำลังรีแอกทีฟของตัวเก็บประจุ</b> (สไลด์หน้า 9–10) มุม \\(\\theta - \\phi = -135^\\circ - (-45^\\circ) = -90^\\circ\\)', '<b>Reactive power of the capacitor</b> (slides pp. 9–10), with \\(\\theta - \\phi = -135^\\circ - (-45^\\circ) = -90^\\circ\\)'),
        block([R`Q_C &= \tfrac12|\mathbf{V}_C||\mathbf{I}_C|\sin(\theta - \phi)`, R`&= \tfrac12(${fd(Cx.abs(E.VC), 2)})(${fd(Cx.abs(E.IC), 3)})\sin(-90^\circ)`, R`&= \boxed{${fd(E.SC.im, 4)}\ \text{VAR}}`]),
        t('\\(\\sin(-90^\\circ) = -1\\): ตัวเก็บประจุมี \\(Q\\) ติดลบเสมอ กราฟ \\(p_C\\) แกว่งขึ้นลงด้วยขนาด \\(|Q_C| = 50\\) พอดี', '\\(\\sin(-90^\\circ) = -1\\): a capacitor always has a negative \\(Q\\). The graph of \\(p_C\\) swings with amplitude exactly \\(|Q_C| = 50\\).')),
      step(t(`<b>กำลังรีแอกทีฟของตัวเหนี่ยวนำ</b> มุม \\(\\theta - \\phi = ${fd(CH6.deg(E.VL), 2)}^\\circ - (${fd(CH6.deg(E.IL), 2)}^\\circ) = 90^\\circ\\)`, `<b>Reactive power of the inductor</b>, with \\(\\theta - \\phi = ${fd(CH6.deg(E.VL), 2)}^\\circ - (${fd(CH6.deg(E.IL), 2)}^\\circ) = 90^\\circ\\)`),
        block([R`Q_L &= \tfrac12|\mathbf{V}_L||\mathbf{I}_L|\sin(\theta - \phi)`, R`&= \tfrac12(${fd(Cx.abs(E.VL), 2)})(${fd(Cx.abs(E.IL), 2)})\sin 90^\circ`, R`&= \boxed{${fd(E.SL.im, 4)}\ \text{VAR}}`]),
        t('ในห้องเขียน \\(Q_L = 124\\) VAR เพราะ \\(\\tfrac12(22.36)(11.18) = 124.99\\) ถูกปัดลง <b>ค่าที่ถูกคือ 125 VAR</b> (\\(\\tfrac12|\\mathbf{I}_L|^2X_L = \\tfrac12(125)(2) = 125\\) พอดี)', 'The class wrote \\(Q_L = 124\\) VAR because \\(\\tfrac12(22.36)(11.18) = 124.99\\) was rounded down. <b>The correct value is 125 VAR</b> (\\(\\tfrac12|\\mathbf{I}_L|^2X_L = \\tfrac12(125)(2) = 125\\) exactly).')),
      step(t('<b>กำลังเชิงซ้อนของตัวต้านทานและของแหล่งจ่าย 10 V</b>: ตัวต้านทานมีแต่ \\(P\\) และ \\(\\mathbf{I}_2\\) ไหลเข้าขั้ว + ของแหล่งจ่าย 10 V จึงเป็นกำลังที่มันรับ', '<b>Complex power of the resistor and of the 10 V source</b>: the resistor has only \\(P\\), and \\(\\mathbf{I}_2\\) enters the + terminal of the 10 V source, so this is the power it takes'),
        block([R`\mathbf{S}_R &= P_R + jQ_R = ${RC(E.SR, 3)}\ \text{VA}`, R`\mathbf{S}_{\text{10 V}} &= \tfrac12\mathbf{V}\mathbf{I}_2^* = \tfrac12(10)(${P(Cx.conj(E.I2))})`, R`&= ${RC(E.SrAbs, 3)}\ \text{VA}`])),
      step(t('<b>กำลังเชิงซ้อนที่แหล่งจ่าย 20 V ส่ง</b> ในห้องแปลงเป็นค่ายังผลแล้วใช้ \\(\\mathbf{S} = \\mathbf{V}_{\\text{rms}}\\mathbf{I}^*_{\\text{rms}}\\)', '<b>Complex power sent by the 20 V source</b>: the class converts to effective values and uses \\(\\mathbf{S} = \\mathbf{V}_{\\text{rms}}\\mathbf{I}^*_{\\text{rms}}\\)'),
        block([R`\mathbf{S}_{\text{20 V}} &= \Big(\tfrac{20}{\sqrt2}\angle 0^\circ\Big)\Big(\tfrac{${fd(Cx.abs(E.I1), 4)}}{\sqrt2}\angle{${fd(a, 2)}^\circ}\Big)`, R`&= ${fd(Ve * Ie, 3)}\angle{${fd(a, 2)}^\circ} = \boxed{${RC(E.SlDel, 3)}\ \text{VA}}`]),
        t('ในห้องได้ \\(111.8\\angle 63.4^\\circ = 50.08 + j99.96\\) VA เพราะปัดมุมเป็น 63.4° ค่าแม่นคือ \\(50 + j100\\) VA', 'The class got \\(111.8\\angle 63.4^\\circ = 50.08 + j99.96\\) VA by rounding the angle to 63.4°; the exact value is \\(50 + j100\\) VA.')),
      step(t('<b>ตัวประกอบกำลังของแหล่งจ่าย 20 V</b> (หน้า 8.3 อธิบายเพิ่ม)', '<b>Power factor of the 20 V source</b> (page 8.3 explains more)'),
        block([R`\text{PF} &= \cos(\theta - \phi) = \cos\big(0^\circ - (${fd(CH6.deg(E.I1), 2)}^\circ)\big)`, R`&= \boxed{${pfTex(E.SlDel, 3)}}`]),
        t('\\(Q = +100\\) VAR เป็นบวก: วงจรที่แหล่งจ่าย 20 V มองเห็นเป็นแบบเหนี่ยวนำ กระแสตามหลังแรงดัน', '\\(Q = +100\\) VAR is positive: the circuit seen by the 20 V source is inductive, the current lags the voltage.')),
      step(t('<b>ตรวจการคงตัวของกำลังเชิงซ้อน</b>: \\(\\mathbf{S}\\) ที่ส่งออก = ผลรวมของ \\(\\mathbf{S}\\) ที่ทุกตัวรับ ทั้งส่วนจริงและส่วนจินตภาพ (ภาพ: ลูกศรต่อหัวต่อหางไปปิดที่ \\(\\mathbf{S}_{\\text{20 V}}\\))', '<b>Check the conservation of complex power</b>: the \\(\\mathbf{S}\\) sent = the sum of the \\(\\mathbf{S}\\) taken, real and imaginary parts alike (picture: the arrows head to tail close on \\(\\mathbf{S}_{\\text{20 V}}\\))'),
        block([R`\mathbf{S}_{\text{20 V}} &= \mathbf{S}_R + \mathbf{S}_L + \mathbf{S}_C + \mathbf{S}_{\text{10 V}}`, R`${RC(E.SlDel, 2)} &= ${RC(E.SR, 2)} + j${fd(E.SL.im, 2)} - j${fd(-E.SC.im, 2)} + (${RC(E.SrAbs, 2)})\ \ \checkmark`]))]; },
  ask: () => ({ fields: [num('Q<sub>C</sub> (VAR) =', E40.SC.im), num('Q<sub>L</sub> (VAR) =', E40.SL.im), num('P<sub>20V</sub> (W) =', E40.SlDel.re), num('Q<sub>20V</sub> (VAR) =', E40.SlDel.im)],
    check: v => near(v[1], 124, 0.6) ? t('124 VAR คือค่าที่ปัดเศษในห้อง ค่าแม่นคือ 125 VAR', '124 VAR is the rounded class value; the exact value is 125 VAR.') : near(v[0], 50) ? t('\\(Q_C\\) ต้องติดลบ (\\(\\sin(-90^\\circ) = -1\\))', '\\(Q_C\\) must be negative (\\(\\sin(-90^\\circ) = -1\\)).') : '' }),
  answer: () => t('\\(Q_C = -50\\) VAR, \\(Q_L = 125\\) VAR, \\(\\mathbf{S}_{\\text{20 V}} = 50 + j100\\) VA และตัวประกอบกำลังของแหล่งจ่าย 20 V = 0.447 ตามหลัง', '\\(Q_C = -50\\) VAR, \\(Q_L = 125\\) VAR, \\(\\mathbf{S}_{\\text{20 V}} = 50 + j100\\) VA, and the power factor of the 20 V source is 0.447 lagging.') };

/* ---------------- page 8.3: slide p. 13 (Hayt Example 11.8) and the homework, slide p. 16 (Hayt Practice 11.8) ---------------- */
const X8 = E8.ex, XH = E8.hw, SP8 = E8.spec(E8.Z2, { name: '1 + j5 Ω' }), SPH = E8.spec(E8.ZHW);
const vsWave = (bd, r) => [{ mag: 60 * RT2, ang: 0, color: COL.V, label: 'v_s', unit: 'V', g: 'v', peak: true, w: 2.6 }, { mag: Cx.abs(r.I) * RT2, ang: CH6.deg(r.I), color: COL.I, label: 'i', unit: 'A', g: 'i', peak: true, w: 2.6 }];
/* the two load triangles head to tail and their sum */
const tri8 = (ctx, b, bd, r, upto, title) => { const sh = bd.short, lab = (n, S) => sh ? n : `${n} = ${CH8.cfmt(S)}`, segs = [];
  if (upto >= 1) segs.push({ S: r.S1, color: COL.V, label: lab('S_1', r.S1), legs: false, w: 3, lpos: 1 });
  if (upto >= 2) segs.push({ S: r.S2, from: r.S1, color: AMBER, label: lab('S_2', r.S2), legs: false, w: 3, lpos: -1 });
  if (upto >= 3) segs.push({ S: r.S, color: PINK, label: lab('S_s', r.S), w: 3.8, arc: true, lpos: -1, pl: sh ? '' : `P = ${CH8.fmt(r.S.re, 'W')}`, ql: sh ? '' : `Q = ${CH8.fmt(r.S.im, 'VAR')}` });
  CH8.triangle(ctx, b, { title, quad: false, segs, max: { P: Math.max(r.S.re, r.S1.re + r.S2.re), Q: Math.max(0, r.S1.im + r.S2.im, r.S.im), Qn: Math.max(0, -r.S1.im) } }); };
DEF.ex8 = { spec: SP8, solvedAt: 1, pad: 1.4, cktAspM: 0.46, vo: () => ({ acPeak: false }), glow: k => k === 2 ? ['Z1', 'ZL'] : k === 5 ? ['Vs'] : null,
  after: (v, k) => { if (k === 1) loop(v, 2.2, 1.5, 0.55, 'I_A'); },
  side: (ctx, b, bd, k) => { const r = X8, sh = bd.short;
    if (k < 2) return empty(ctx, b, k < 1 ? ['ยังไม่มีกระแส: เขียน KVL รอบวงก่อน', 'no current yet: write KVL around the loop first'] : ['ได้กระแสแล้ว ต่อไปหาแรงดันของโหลดแต่ละตัว', 'the current is known; next the voltage of each load']);
    if (k === 2) return CH6.plane(ctx, b, [{ z: r.V1, color: COL.V, label: 'V_1', lmid: 1 }, { z: r.V2, from: r.V1, color: AMBER, label: 'V_2', lmid: -1 }, { z: cx(60), color: COL.ref, label: 'V_s', w: 3.4 }],
      { title: sh ? t('V_1 + V_2 = V_s', 'V_1 + V_2 = V_s') : t('KVL: V_1 + V_2 = V_s (ค่ายังผล)', 'KVL: V_1 + V_2 = V_s (effective)') });
    tri8(ctx, b, bd, r, k - 2, sh ? t(`S_1 + S_2 = S_s${k >= 6 ? ' · PF 0.6' : ''}`, `S_1 + S_2 = S_s${k >= 6 ? ' · PF 0.6' : ''}`) : t(`ต่อหัวต่อหาง${k >= 6 ? ' · PF 0.6 ตามหลัง' : ''}`, `head to tail${k >= 6 ? ' · PF 0.6 lagging' : ''}`)); },
  waves: [{ title: (bd, k) => k < 1 ? t('ยังไม่มีรูปคลื่น', 'no waveform yet') : bd.short ? (k >= 6 ? t('i ตามหลัง v', 'i lags v') : 'v_s, i') : k >= 6 ? t('ยอดของ i มาหลัง v อยู่ 53.13°: ตามหลัง', 'i peaks 53.13° after v: lagging') : t('แรงดันแหล่งจ่ายและกระแส', 'source voltage and current'),
    sigs: (bd, k) => k < 1 ? [] : vsWave(bd, X8) }],
  steps: () => { const r = X8;
    return [step(t('<b>KVL รอบวงเดียว</b> (ในห้องใช้วิธีเมช กระแส \\(\\mathbf{I}_A\\)) แรงดันในวงจรนี้เป็นค่ายังผล', '<b>KVL around the single loop</b> (the class uses mesh analysis with \\(\\mathbf{I}_A\\)); the values in this circuit are effective'),
        block([R`-60\angle 0^\circ + \mathbf{I}_A(2 - j1) + \mathbf{I}_A(1 + j5) &= 0`, R`\mathbf{I}_A &= \frac{60\angle 0^\circ}{3 + j4} = \boxed{${P(r.I, 4, 2)}\ \text{A rms}}`])),
      step(t('<b>แรงดันของโหลดแต่ละตัว</b> (ระนาบ: \\(\\mathbf{V}_1 + \\mathbf{V}_2 = \\mathbf{V}_s\\))', '<b>The voltage of each load</b> (the plane: \\(\\mathbf{V}_1 + \\mathbf{V}_2 = \\mathbf{V}_s\\))'),
        block([R`\mathbf{V}_1 &= \mathbf{I}Z_1 = (${P(r.I, 4, 2)})(2 - j1)`, R`&= ${P(r.V1, 4, 2)}\ \text{V}`, R`\mathbf{V}_2 &= \mathbf{I}Z_2 = (${P(r.I, 4, 2)})(1 + j5)`, R`&= ${P(r.V2, 4, 2)}\ \text{V}`])),
      step(t('<b>กำลังเชิงซ้อนของโหลดที่ 1</b> \\(\\mathbf{S} = \\mathbf{V}\\mathbf{I}^*\\) (ค่ายังผล จึงไม่มี ½)', '<b>Complex power of load 1</b>, \\(\\mathbf{S} = \\mathbf{V}\\mathbf{I}^*\\) (effective values, so no ½)'),
        block([R`\mathbf{S}_1 &= \mathbf{V}_1\mathbf{I}^* = (${P(r.V1, 4, 2)})(${P(Cx.conj(r.I), 4, 2)})`, R`&= ${P(r.S1, 2, 2)} = ${RC(r.S1, 2)}\ \text{VA}`, R`P_1 &= \boxed{${fd(r.P1, 2)}\ \text{W}}`]),
        t('ในห้องได้ \\(321.96\\angle{-26.56^\\circ} = 287.91 - j143.95\\) VA จากการปัดเศษ ค่าแม่นคือ \\(|\\mathbf{I}|^2Z_1 = 144(2 - j1) = 288 - j144\\) VA · \\(Q_1 < 0\\): โหลด \\(2 - j1\\ \\Omega\\) เป็นแบบตัวเก็บประจุ', 'The class got \\(321.96\\angle{-26.56^\\circ} = 287.91 - j143.95\\) VA from rounding; the exact value is \\(|\\mathbf{I}|^2Z_1 = 144(2 - j1) = 288 - j144\\) VA · \\(Q_1 < 0\\): the \\(2 - j1\\ \\Omega\\) load is capacitive.')),
      step(t('<b>กำลังเชิงซ้อนของโหลดที่ 2</b> (ภาพ: \\(\\mathbf{S}_2\\) ต่อจากปลายของ \\(\\mathbf{S}_1\\))', '<b>Complex power of load 2</b> (picture: \\(\\mathbf{S}_2\\) starts at the tip of \\(\\mathbf{S}_1\\))'),
        block([R`\mathbf{S}_2 &= \mathbf{V}_2\mathbf{I}^* = (${P(r.V2, 4, 2)})(${P(Cx.conj(r.I), 4, 2)})`, R`&= ${P(r.S2, 2, 2)} = ${RC(r.S2, 2)}\ \text{VA}`, R`P_2 &= \boxed{${fd(r.P2, 2)}\ \text{W}}`])),
      step(t('<b>กำลังปรากฏที่แหล่งจ่ายส่ง</b> และตรวจว่า \\(\\mathbf{S}_1 + \\mathbf{S}_2 = \\mathbf{S}_s\\) (ภาพ: ลูกศรสีชมพูปิดสามเหลี่ยม)', '<b>Apparent power supplied by the source</b>, and the check \\(\\mathbf{S}_1 + \\mathbf{S}_2 = \\mathbf{S}_s\\) (picture: the pink arrow closes the triangle)'),
        block([R`\mathbf{S}_s &= \mathbf{V}_s\mathbf{I}^* = (60\angle 0^\circ)(${P(Cx.conj(r.I), 4, 2)})`, R`&= ${P(r.S, 2, 2)} = ${RC(r.S, 2)}\ \text{VA}`, R`|\mathbf{S}_s| &= \boxed{${fd(r.Sap, 2)}\ \text{VA}}`, R`\mathbf{S}_1 + \mathbf{S}_2 &= ${RC(Cx.add(r.S1, r.S2), 2)} = \mathbf{S}_s\ \ \checkmark`]),
        t('กำลังปรากฏ<b>บวกกันตรง ๆ ไม่ได้</b>: \\(|\\mathbf{S}_1| + |\\mathbf{S}_2| = 322 + 734 \\ne 720\\) VA ต้องบวกเป็นจำนวนเชิงซ้อน', 'Apparent powers <b>do not simply add</b>: \\(|\\mathbf{S}_1| + |\\mathbf{S}_2| = 322 + 734 \\ne 720\\) VA; add them as complex numbers.')),
      step(t('<b>ตัวประกอบกำลังของโหลดรวม</b> (สไลด์หน้า 11–12)', '<b>Power factor of the combined loads</b> (slides pp. 11–12)'),
        block([R`\text{PF} &= \frac{P}{|\mathbf{S}|} = \frac{${fd(r.S.re, 0)}}{${fd(r.Sap, 0)}} = \cos(${fd(CH6.deg(r.S), 2)}^\circ)`, R`&= \boxed{${pfTex(r.S, 1)}}`]),
        t('\\(Q = +576\\) VAR เป็นบวก (\\(Q_L > |Q_C|\\)) สามเหลี่ยมอยู่ในควอดรันต์ที่ 1 จึง<b>ตามหลัง</b> และกราฟ: ยอดของ \\(i\\) มาหลัง \\(v\\)', '\\(Q = +576\\) VAR is positive (\\(Q_L > |Q_C|\\)): the triangle is in the first quadrant, so <b>lagging</b>; on the graph \\(i\\) peaks after \\(v\\).'))]; },
  ask: () => ({ fields: [num('P<sub>1</sub> (W) =', X8.P1), num('P<sub>2</sub> (W) =', X8.P2), num('|S| (VA) =', X8.Sap), num('PF =', CH8C.pf(X8.S), { tol: 0.002 })],
    check: v => near(v[2], Cx.abs(X8.S1) + Cx.abs(X8.S2), 2) ? t('กำลังปรากฏบวกกันตรง ๆ ไม่ได้ ต้องบวก \\(\\mathbf{S}_1 + \\mathbf{S}_2\\) เป็นจำนวนเชิงซ้อนก่อน', 'Apparent powers do not add directly: add \\(\\mathbf{S}_1 + \\mathbf{S}_2\\) as complex numbers first.') : '' }),
  answer: () => t('\\(P_1 = 288\\) W, \\(P_2 = 144\\) W, \\(|\\mathbf{S}_s| = 720\\) VA และ PF = 0.6 ตามหลัง ตรงกับเฉลยในห้องและ Hayt Example 11.8', '\\(P_1 = 288\\) W, \\(P_2 = 144\\) W, \\(|\\mathbf{S}_s| = 720\\) VA and PF = 0.6 lagging, as in the class solution and Hayt Example 11.8.') };

DEF.hw = { spec: SPH, solvedAt: 2, pad: 1.4, cktAspM: 0.46, vo: () => ({ acPeak: false }), glow: k => k === 1 ? ['Z1', 'ZL'] : null,
  side: (ctx, b, bd, k) => { const r = XH, sh = bd.short;
    if (k < 3) return empty(ctx, b, k < 2 ? ['ยังไม่มีกระแส', 'no current yet'] : ['ได้กระแสแล้ว ต่อไปหากำลังเชิงซ้อน', 'the current is known; next the complex power']);
    tri8(ctx, b, bd, r, 3, sh ? 'S_1 + S_2 = S' : t(`ต่อหัวต่อหาง${k >= 4 ? ' · PF 0.9965 นำหน้า' : ''}`, `head to tail${k >= 4 ? ' · PF 0.9965 leading' : ''}`)); },
  waves: [{ title: (bd, k) => k < 2 ? t('ยังไม่มีรูปคลื่น', 'no waveform yet') : bd.short ? (k >= 4 ? t('i นำหน้า v', 'i leads v') : 'v_s, i') : k >= 4 ? t('ยอดของ i มาก่อน v อยู่ 4.76°: นำหน้า', 'i peaks 4.76° before v: leading') : t('แรงดันแหล่งจ่ายและกระแส', 'source voltage and current'),
    sigs: (bd, k) => k < 2 ? [] : vsWave(bd, XH) }],
  steps: () => { const r = XH;
    return [step(t('<b>อิมพีแดนซ์รวม</b> (โหลดสองตัวอนุกรมกัน)', '<b>Total impedance</b> (the two loads are in series)'), block([R`Z &= (2 - j1) + 10 = ${RC(r.Z, 2)}`, R`&= ${P(r.Z, 4, 2)}\ \Omega`])),
      step(t('<b>กระแส</b> (ค่ายังผล)', '<b>The current</b> (effective)'), block([R`\mathbf{I}_s &= \frac{60\angle 0^\circ}{${P(r.Z, 4, 2)}} = ${P(r.I, 4, 2)}\ \text{A rms}`])),
      step(t('<b>กำลังเชิงซ้อนที่แหล่งจ่ายส่ง</b> (ภาพ: \\(\\mathbf{S}_1\\) ชี้ลงมากกว่าที่ \\(\\mathbf{S}_2\\) ดึงขึ้น)', '<b>Complex power sent by the source</b> (picture: \\(\\mathbf{S}_1\\) points down and \\(\\mathbf{S}_2\\) adds nothing upwards)'),
        block([R`\mathbf{S} &= \mathbf{V}\mathbf{I}^* = (60)(${P(Cx.conj(r.I), 4, 2)})`, R`&= ${RC(r.S, 2)}\ \text{VA}`])),
      step(t('<b>ตัวประกอบกำลังของโหลดรวม</b>', '<b>Power factor of the combined loads</b>'),
        block([R`\text{PF} &= \frac{P}{|\mathbf{S}|} = \cos(${fd(CH6.deg(r.S), 2)}^\circ)`, R`&= \frac{12}{\sqrt{145}} = \boxed{${pfTex(r.S, 4)}}`]),
        t('\\(Q < 0\\): ส่วนจินตภาพของ \\(Z\\) เป็นลบ โหลดรวมเป็นแบบตัวเก็บประจุ จึง<b>นำหน้า</b> · คำตอบของ Hayt Practice 11.8 คือ 0.9966 นำหน้า · ข้อนี้ไม่มีเฉลยในห้อง', '\\(Q < 0\\): the imaginary part of \\(Z\\) is negative, the combined load is capacitive, so <b>leading</b> · Hayt\'s answer to Practice 11.8 is 0.9966 leading · there is no class solution for this one.'))]; },
  ask: () => ({ fields: [num('PF =', XH.PF, { tol: 0.0006 }), num(t('θ − φ (°, ลบเมื่อนำหน้า) =', 'θ − φ (°, negative if leading) ='), CH6.deg(XH.S), { tol: 0.06, w: 4.5 })],
    check: v => near(v[1], -CH6.deg(XH.S), 0.06) ? t('มุมต้องติดลบ: โหลดรวมเป็นแบบตัวเก็บประจุ (นำหน้า)', 'The angle must be negative: the combined load is capacitive (leading).') : '' }),
  answer: () => t('PF = \\(12/\\sqrt{145} = 0.9965\\) นำหน้า (มุม −4.76°)', 'PF = \\(12/\\sqrt{145} = 0.9965\\) leading (angle −4.76°).') };

/* ---------------- page 8.4: slide p. 15 (Hayt Example 11.9), a capacitor for the motor ---------------- */
const S9 = memo(key => { const [f, on] = key.split('|'); return E9.spec(E9.Cfor(E9.Qc, +f), +f, on === '1'); });
const cur9 = c => { const on = c.part('Sw').closed; return { I: c.I('wI'), Im: c.I('M'), Ic: on ? c.I('C') : cx(0), S: Cx.neg(c.S('Vs')), Sm: c.S('M'), Sc: on ? c.S('C') : cx(0) }; };
DEF.ex9 = { init: s => { s.st.f = 50; }, spec: (k, s) => S9(`${s.st.f}|${k >= 4 ? 1 : 0}`), solvedAt: 0, pad: 1.35, cktAspM: 0.5, vo: () => ({ acPeak: false }),
  glow: k => k === 4 ? ['C', 'Sw'] : k === 6 ? ['wI'] : null,
  tick: (dt, s) => { const m = s.B.ckt && s.B.ckt.part('M'); if (m && s.B.clk.run) m.angle = (m.angle || 0) + dt * 5; },
  badge: k => k >= 4 ? [['ต่อตัวเก็บประจุแล้ว', 'capacitor connected'], 'ok'] : [['มอเตอร์อย่างเดียว', 'the motor alone'], 'wait'],
  side: (ctx, b, bd, k) => { const sh = bd.short, S1 = E9.S1, Sn = E9.Snew, Qc = cx(0, E9.Qc), segs = [];
    if (k < 1) return empty(ctx, b, ['รู้ P = 50 kW และ PF = 0.8 ตามหลัง: หามุมและ Q ก่อน', 'P = 50 kW and PF = 0.8 lagging are given: find the angle and Q first']);
    segs.push({ S: S1, color: COL.V, label: sh ? 'S_1' : t(`S_1 มอเตอร์ = ${CH8.cfmt(S1)}`, `S_1 motor = ${CH8.cfmt(S1)}`), legs: k < 4, arc: k < 2, arcText: '36.87°', dash: k >= 4 ? [8, 5] : null, w: 3, lpos: -1, pl: sh ? '' : undefined, ql: sh ? '' : undefined });
    if (k >= 2) segs.push({ S: Sn, color: PINK, label: sh ? 'S' : (k >= 4 ? `S = ${CH8.cfmt(Sn)}` : t('S ที่ต้องการ', 'S wanted')), arc: true, arcText: '18.19°', w: 3.4, dash: k < 4 ? [6, 5] : null, legs: false, lpos: 1 });
    if (k >= 3) segs.push({ S: Qc, from: S1, color: PURPLE, label: sh ? 'Q_C' : `Q_C = ${CH8.fmt(E9.Qc, 'VAR')}`, legs: false, w: 3, lpos: -1 });
    CH8.triangle(ctx, b, { title: k >= 4 ? t(`สามเหลี่ยมกำลัง · PF = ${pfTxt(Sn, 2)}`, `power triangle · PF = ${pfTxt(Sn, 2)}`) : t('สามเหลี่ยมกำลัง (สไลด์ปี 2561 หน้า 17)', 'power triangle (2018 slide p. 17)'), segs, max: { P: S1.re, Q: S1.im }, quad: false, mr: sh ? 40 : 120 }); },
  waves: [{ title: (bd, k) => bd.short ? 'i = i_1 + i_2' : k >= 6 ? t('กระแสในสายลดลง 15.8 % ทั้งที่ i_1 ของมอเตอร์เท่าเดิม', 'the line current drops 15.8 % while the motor current i_1 stays') : t('กระแสในสาย i = i_1 + i_2 (สเกลคงที่)', 'line current i = i_1 + i_2 (fixed scale)'),
    sigs: bd => { const { I, Im, Ic } = cur9(bd.ckt), s = [iWave(Im, COL.V, 'i_1', { w: 2.2 })]; if (Cx.abs(Ic) > 1e-6) s.push(iWave(Ic, PURPLE, 'i_2', { w: 2.2 }));
      s.push(iWave(I, COL.I, 'i', { w: 3.4, peak: true })); return s; },
    opts: bd => ({ w: bd.ckt.w, max: { i: Cx.abs(cur9(bd.ckt).Im) * 1.05 } }) }],
  controls: (el, s) => MC.ui.radio(el, [{ id: 'f9_50', label: t('50 Hz (ในห้อง ระบบไฟฟ้าไทย)', '50 Hz (class, the Thai grid)'), on: true }, { id: 'f9_60', label: t('60 Hz (เฉลยของ Hayt)', '60 Hz (Hayt\'s solution)') }], id => { s.st.f = +id.slice(3); s.refresh(); }),
  steps: s => { const f = s.st.f, C = E9.Cfor(E9.Qc, f), th1 = E9.th1 / D2R, th2 = Math.acos(0.95) / D2R;
    return [step(t('<b>มุมและกำลังรีแอกทีฟเดิม</b> ของมอเตอร์ \\((\\theta-\\phi) = \\cos^{-1}\\text{PF}\\) (สไลด์ปี 2561 หน้า 18)', '<b>The old angle and reactive power</b> of the motor, \\((\\theta-\\phi) = \\cos^{-1}\\text{PF}\\) (2018 slide p. 18)'),
        block([R`(\theta - \phi)_{\text{old}} &= \cos^{-1}(0.8) = ${fd(th1, 2)}^\circ`, R`Q_{\text{old}} &= P\tan(\theta - \phi)_{\text{old}} = 50\,000\tan ${fd(th1, 2)}^\circ`, R`&= ${big(E9.S1.im)}\ \text{VAR}`]),
        t('ภาพ: \\(\\mathbf{S}_1 = 50 + j37.5\\) kVA ของมอเตอร์ (จุดวิ่งในมอเตอร์และในสายเท่ากัน)', 'Picture: the motor\'s \\(\\mathbf{S}_1 = 50 + j37.5\\) kVA (the dots in the motor and in the line move alike).')),
      step(t('<b>มุมและกำลังรีแอกทีฟที่ต้องการ</b> (PF ใหม่ 0.95 ตามหลัง \\(P\\) เท่าเดิม)', '<b>The angle and reactive power wanted</b> (new PF 0.95 lagging, the same \\(P\\))'),
        block([R`(\theta - \phi)_{\text{new}} &= \cos^{-1}(0.95) = ${fd(th2, 2)}^\circ`, R`Q_{\text{new}} &= 50\,000\tan ${fd(th2, 2)}^\circ = ${big(E9.Snew.im)}\ \text{VAR}`])),
      step(t('<b>กำลังรีแอกทีฟที่อุปกรณ์แก้ต้องรับ</b> (ภาพ: \\(Q_C\\) ชี้ลงจากปลายของ \\(\\mathbf{S}_1\\))', '<b>The reactive power the corrective device must take</b> (picture: \\(Q_C\\) points down from the tip of \\(\\mathbf{S}_1\\))'),
        block([R`Q_C &= Q_{\text{new}} - Q_{\text{old}}`, R`&= P\big[\tan(\theta - \phi)_{\text{new}} - \tan(\theta - \phi)_{\text{old}}\big]`, R`&= \boxed{${big(E9.Qc)}\ \text{VAR}}`]),
        t(`ติดลบ แปลว่าต้องใช้<b>ตัวเก็บประจุ</b> · ในห้องได้ \\(-21\\,057.01\\) VAR เพราะปัดมุมเป็น 18.19° และ 36.86° ก่อนหา tan`, 'Negative, so a <b>capacitor</b> is needed · the class got \\(-21\\,057.01\\) VAR by rounding the angles to 18.19° and 36.86° before taking tan.')),
      step(t(`<b>ค่าตัวเก็บประจุ</b> ที่ ${f} Hz: \\(|Q_C| = |V_{\\text{rms}}|^2/|X_C| = 2\\pi f C\\,|V_{\\text{rms}}|^2\\) (สวิตช์ในภาพต่อแล้ว)`, `<b>The capacitance</b> at ${f} Hz: \\(|Q_C| = |V_{\\text{rms}}|^2/|X_C| = 2\\pi f C\\,|V_{\\text{rms}}|^2\\) (the switch in the picture is now closed)`),
        block([R`C &= \frac{|Q_C|}{2\pi f\,|V_{\text{rms}}|^2} = \frac{${big(-E9.Qc)}}{2\pi(${f})(230)^2}`, R`&= \boxed{${f === 50 ? fd(C * 1e3, 3) + R`\ \text{mF}` : fd(C * 1e6, 1) + R`\ \mu\text{F}`}}`]),
        f === 50 ? t('ในห้องได้ 1.267 mF จากมุมที่ปัดเศษ · ถ้าใช้ 60 Hz ตามเฉลยของ Hayt จะได้ 1056 µF (เลือกได้ใต้ภาพ)', 'The class got 1.267 mF from the rounded angles · at 60 Hz, as in Hayt\'s solution, it is 1056 µF (choose under the picture).')
          : t('ตรงกับเฉลยของ Hayt (1056 µF ที่ 60 Hz) · ในห้องใช้ 50 Hz ได้ 1.267 mF', 'This matches Hayt\'s solution (1056 µF at 60 Hz) · the class uses 50 Hz and gets 1.267 mF.')),
      step(t('<b>ตรวจด้วยวิธีของ Hayt</b>: หากำลังเชิงซ้อน กระแส และอิมพีแดนซ์ของอุปกรณ์แก้', '<b>Check with Hayt\'s route</b>: the complex power, current and impedance of the corrective device'),
        block([R`\mathbf{S}_2 &= \mathbf{S} - \mathbf{S}_1 = ${RC(Cx.scale(E9.S2, 1e-3), 2)}\ \text{kVA}`, R`\mathbf{I}_2 &= \Big(\frac{\mathbf{S}_2}{\mathbf{V}}\Big)^* = ${RC(E9.I2, 2)}\ \text{A}`, R`Z_2 &= \frac{230}{${RC(E9.I2, 2)}} = ${RC(E9.Z2, 3)}\ \Omega`, R`C &= \frac{1}{\omega|X_2|} = ${f === 50 ? fd(C * 1e3, 3) + R`\ \text{mF}` : fd(C * 1e6, 1) + R`\ \mu\text{F}`}\ \ \checkmark`])),
      step(t('<b>กระแสในสายก่อนและหลังแก้</b> (แรงดันคงที่ \\(I = P/(V\\cdot\\text{PF})\\)) กราฟใช้สเกลคงที่', '<b>The line current before and after</b> (fixed voltage, \\(I = P/(V\\cdot\\text{PF})\\)); the graph keeps one scale'),
        block([R`I_{\text{old}} &= \frac{50\,000}{(230)(0.8)} = ${fd(E9.Iold, 2)}\ \text{A}`, R`I_{\text{new}} &= \frac{50\,000}{(230)(0.95)} = ${fd(E9.Inew, 2)}\ \text{A}`, R`&\quad (${t('ลดลง', 'down')}\ ${fd((1 - E9.Inew / E9.Iold) * 100, 1)}\,\%)`]),
        t('มอเตอร์ได้กำลังเท่าเดิม (กระแส \\(I_1\\) ของมอเตอร์ยังเป็น 271.74 A) แต่สายจากการไฟฟ้าส่งกระแสน้อยลง', 'The motor gets the same power (its current \\(I_1\\) is still 271.74 A), but the line from the utility carries less current.'))]; },
  ask: s => ({ fields: [num(t(`C ที่ ${s.st.f} Hz (mF) =`, `C at ${s.st.f} Hz (mF) =`), () => E9.Cfor(E9.Qc, s.st.f) * 1e3, { tol: 0.002 })],
    check: v => near(v[0], E9.Cfor(E9.Qc, s.st.f === 50 ? 60 : 50) * 1e3, 0.002) ? t('ค่านี้เป็นของอีกความถี่หนึ่ง ดูความถี่ที่เลือกใต้ภาพ', 'That is the value for the other frequency: check the frequency chosen under the picture.') : '' }),
  answer: s => s.st.f === 50 ? t('ต่อตัวเก็บประจุ \\(C = 1.268\\) mF ขนานกับมอเตอร์ (ที่ 50 Hz, \\(Q_C = -21.07\\) kVAR) กระแสในสายลดจาก 271.74 A เหลือ 228.83 A', 'Connect \\(C = 1.268\\) mF in parallel with the motor (at 50 Hz, \\(Q_C = -21.07\\) kVAR); the line current drops from 271.74 A to 228.83 A.')
    : t('ต่อตัวเก็บประจุ \\(C = 1056\\ \\mu\\)F ขนานกับมอเตอร์ (ที่ 60 Hz ตาม Hayt)', 'Connect \\(C = 1056\\ \\mu\\)F in parallel with the motor (at 60 Hz, as Hayt does).') };

/* ---------------- page 8.4: the house of the 2018 slides, p. 19 ---------------- */
const HC = H.all.C, HCOL = [COL.V, ORANGE, AMBER, GREEN], HF = 2 * Math.PI * H.f;
/* which appliances are connected at step k: one more at each of steps 1–4, all of them (that are switched on) from step 5;
   the capacitor from step 6 unless the reader clicked its switch */
const onAt = (k, s) => H.list.map((a, i) => !!s.st.on[i] && (k >= 5 || i < k));
const capAt = (k, s) => s.st.cap ?? k >= 6;
const SH = memo(key => { const [m, c, sh] = key.split('|'); return H.spec([...m].map(x => x === '1'), c === '1' ? HC : 0, { short: sh === '1' }); });
const hKey = (k, s, sh) => `${onAt(k, s).map(x => +x).join('')}|${+capAt(k, s)}|${+!!sh}`;
const hTot = (k, s) => { const r = H.calc(onAt(k, s)), Sc = capAt(k, s) ? cx(0, -HF * HC * H.V * H.V) : cx(0), S = Cx.add(r.S, Sc); return { r, Sc, S, I: Cx.abs(S) / H.V }; };
DEF.house = { init: s => { s.st.on = [true, true, true, true]; s.st.cap = null; s.st.h = 10; s.st.d = 30; s.st.rate = 2.5; },
  spec: (k, s) => SH(hKey(k, s, false)), shortSpec: (sp, s) => CH6.shortLabels(SH(hKey(s.k, s, true)), 1.25),
  solvedAt: 0, pad: 1.25, wideAt: 1e9, cktAspM: 0.42, rowAsp: 0.4, cktAspN: 0.62, vo: () => ({ acPeak: false }),
  view: { onToggle: p => { const s = DEF.house._s; if (!s) return; if (p.id === 'SC') s.st.cap = p.closed; else if (/^S\d$/.test(p.id)) s.st.on[+p.id[1]] = p.closed; s.build(true); if (s._met) s._met(); } },
  onSet: (k, s) => { s.st.cap = null; if (s._met) s._met(); },
  glow: k => k >= 1 && k <= 4 ? [H.list[k - 1].id] : k === 6 ? ['C', 'SC'] : null,
  badge: (k, s) => [capAt(k, s) ? ['ต่อตัวเก็บประจุแล้ว', 'capacitor connected'] : ['ไม่มีตัวเก็บประจุ', 'no capacitor'], capAt(k, s) ? 'ok' : 'wait'],
  side: (ctx, b, bd, k, s) => { const sh = bd.short, on = onAt(k, s), T = hTot(k, s), segs = []; let f = cx(0);
    H.list.forEach((a, i) => { if (!on[i]) return; segs.push({ S: a.Sc, from: f, color: HCOL[i], label: String(i + 1), legs: false, w: 2.6, lpos: -1 }); f = Cx.add(f, a.Sc); });
    if (!segs.length) return empty(ctx, b, ['ยังไม่มีอุปกรณ์ที่ต่ออยู่', 'no appliance connected yet']);
    if (Cx.abs(T.Sc) > 1) segs.push({ S: T.Sc, from: f, color: PURPLE, label: sh ? 'Q_C' : `Q_C = ${CH8.fmt(T.Sc.im, 'VAR')}`, legs: false, w: 2.8, lpos: -1 });
    if (k >= 5) segs.push({ S: T.S, color: PINK, label: sh ? 'S' : `S = ${CH8.cfmt(T.S)}`, arc: true, w: 3.4, lpos: 1, pl: '', ql: '' });
    CH8.triangle(ctx, b, { title: sh ? t(`PF = ${pfTxt(T.S, 3)}`, `PF = ${pfTxt(T.S, 3)}`) : t(`S ของอุปกรณ์ต่อหัวต่อหาง · PF = ${pfTxt(T.S, 3)}`, `appliance S head to tail · PF = ${pfTxt(T.S, 3)}`), segs, max: { P: 5780, Q: 4764 }, quad: false, mr: sh ? 40 : 110 }); },
  waves: [{ title: (bd, k, s) => bd.short ? t('กระแสในสาย', 'line current') : capAt(k, s) ? t('กระแสในสาย: เส้นประ = ก่อนต่อ C', 'line current: dashed = before C') : t('กระแสในสายของบ้าน', 'the house line current'),
    sigs: (bd, k, s) => { const c = bd.ckt, I = c.I('wt0'), T = hTot(k, s), out = [];
      if (capAt(k, s)) { const r = T.r, Ib = r.S.re > 0 || r.S.im > 0 ? Cx.conj(Cx.scale(r.S, RT2 / H.V)) : cx(0); out.push(iWave(Ib, 'rgba(154,163,199,.85)', t('ก่อน', 'before'), { dash: [6, 5], w: 2 })); }
      out.push(iWave(I, COL.I, 'i', { w: 3.2, peak: true })); return out; },
    opts: bd => ({ w: bd.ckt.w, max: { i: H.all.I * RT2 * 1.06 } }) }],
  controls: (el, s) => { DEF.house._s = s;
    const ui = MC.ui, btns = ui.buttons(el, [...H.list.map((a, i) => ({ id: 'hap' + i, label: `${i + 1} · ${MC.t(a.th, a.en)}`, on: true, onclick: () => { s.st.on[i] = !s.st.on[i]; s.build(true); s._met(); } })),
      { id: 'hall', label: t('เปิดครบทุกตัว', 'All on'), onclick: () => { s.st.on = [true, true, true, true]; s.build(true); s._met(); } }]);
    btns.hap0.parentElement.style.gridColumn = '1 / -1';   // .ctl is a grid of narrow cells: the buttons and the readout take whole rows
    const sl = (id, label, min, max, st, key, fmt) => ui.slider(el, { id, label, min, max, step: st, value: s.st[key], fmt, oninput: v => { s.st[key] = v; s._met(); } });
    sl('hh', t('ชั่วโมงต่อวัน', 'hours per day'), 1, 24, 1, 'h', v => `${v} h`); sl('hd', t('จำนวนวัน', 'days'), 1, 31, 1, 'd', v => `${v}`); sl('hr', t('บาทต่อหน่วย', 'baht per unit'), 1, 6, 0.05, 'rate', v => fd(v, 2));
    const met = ui.metrics(el); met.style.gridColumn = '1 / -1';
    s._met = () => { const T = hTot(s.k, s), b = H.bill(T.r.P, s.st.h, s.st.d, s.st.rate); H.list.forEach((a, i) => btns['hap' + i].classList.toggle('on', !!s.st.on[i]));
      met.innerHTML = ui.kv([['P', `${fd(T.r.P, 2)} W`], ['Q', `${fd(T.S.im, 2)} VAR`], ['|S|', `${fd(Cx.abs(T.S), 2)} VA`], ['PF', Cx.abs(T.S) > 1 ? pfTxt(T.S) : '−'], [t('กระแสในสาย', 'line current'), `${fd(T.I, 3)} A rms`],
        [t('ค่าไฟฟ้า', 'bill'), `${fd(b.kWh, 1)} kWh · ${fd(b.baht, 2)} ${t('บาท', 'baht')}`]]); };
    s._met(); },
  steps: () => { const r = H.all, L = H.list, b = H.bill(r.P), t1 = Math.acos(r.PF) / D2R, t2 = Math.acos(0.95) / D2R;
    return [step(t('<b>1 · ตู้เย็น</b> 5 A ที่ 220 V, PF 0.8 ตามหลัง (อุปกรณ์ที่กำลังคิดเรืองแสง)', '<b>1 · Fridge</b>: 5 A at 220 V, PF 0.8 lagging (the appliance being worked out glows)'),
        block([R`|\mathbf{S}_1| &= 220 \times 5 = 1100\ \text{VA}`, R`(\theta - \phi)_1 &= \cos^{-1}(0.8) = 36.87^\circ`, R`P_1 &= 1100(0.8) = ${fd(L[0].P, 0)}\ \text{W}`, R`Q_1 &= 1100\sin 36.87^\circ = ${fd(L[0].Q, 0)}\ \text{VAR}`])),
      step(t('<b>2 · เตาไฟฟ้า</b> 1000 W (ตัวต้านทาน)', '<b>2 · Stove</b>: 1000 W (a resistance)'), block([R`P_2 &= 1000\ \text{W}, \qquad Q_2 = 0`])),
      step(t('<b>3 · หลอดไฟ</b> 40 W PF 0.6 ตามหลัง จำนวน 10 ดวง', '<b>3 · Lamps</b>: ten 40 W lamps at PF 0.6 lagging'),
        block([R`P_3 &= 40 \times 10 = 400\ \text{W}`, R`(\theta - \phi)_3 &= \cos^{-1}(0.6) = 53.13^\circ`, R`Q_3 &= 400\tan 53.13^\circ = ${fd(L[2].Q, 2)}\ \text{VAR}`]),
        t('เฉลยปี 2561 เขียนหน่วยของ \\(Q_3\\) เป็น VA ที่ถูกคือ VAR', 'The 2018 solution writes the unit of \\(Q_3\\) as VA; it should be VAR.')),
      step(t('<b>4 · เครื่องปรับอากาศ</b> 5000 VA PF 0.7 ตามหลัง', '<b>4 · Air conditioner</b>: 5000 VA at PF 0.7 lagging'),
        block([R`P_4 &= 5000(0.7) = 3500\ \text{W}`, R`Q_4 &= \sqrt{5000^2 - 3500^2} = ${fd(L[3].Q, 2)}\ \text{VAR}`])),
      step(t('<b>ก) ค่ารวม</b>: กำลังเชิงซ้อนของอุปกรณ์ที่ต่อขนานบวกกันได้ (ภาพ: สามเหลี่ยมต่อหัวต่อหาง)', '<b>(a) Totals</b>: the complex powers of parallel appliances add (picture: the triangles head to tail)'),
        block([R`P &= 880 + 1000 + 400 + 3500 = \boxed{${fd(r.P, 0)}\ \text{W}}`, R`Q &= 660 + 0 + 533.33 + 3570.71`, R`&= \boxed{${fd(r.Q, 2)}\ \text{VAR}}`, R`|\mathbf{S}| &= \sqrt{${fd(r.P, 0)}^2 + ${fd(r.Q, 2)}^2} = \boxed{${fd(r.Sap, 2)}\ \text{VA}}`,
          R`\text{PF} &= \frac{${fd(r.P, 0)}}{${fd(r.Sap, 2)}} = \boxed{${fd(r.PF, 4)}\ \text{${t('ตามหลัง', 'lagging')}}}`, R`I &= \frac{${fd(r.Sap, 2)}}{220} = \boxed{${fd(r.I, 3)}\ \text{A rms}}`])),
      step(t('<b>ข) แก้ PF เป็น 0.95 ตามหลัง</b> ด้วยสูตรของสไลด์หน้า 18 (ตัวเก็บประจุต่อเข้าในภาพแล้ว)', '<b>(b) Correct the PF to 0.95 lagging</b> with the formula of slide p. 18 (the capacitor is now connected in the picture)'),
        block([R`(\theta - \phi)_{\text{old}} &= \cos^{-1}(${fd(r.PF, 4)}) = ${fd(t1, 2)}^\circ`, R`(\theta - \phi)_{\text{new}} &= \cos^{-1}(0.95) = ${fd(t2, 2)}^\circ`, R`Q_C &= ${fd(r.P, 0)}\big[\tan ${fd(t2, 2)}^\circ - \tan ${fd(t1, 2)}^\circ\big]`, R`&= \boxed{${fd(r.Qc, 2)}\ \text{VAR}}`,
          R`C &= \frac{|Q_C|}{2\pi f\,V_{\text{rms}}^2} = \frac{${fd(-r.Qc, 2)}}{2\pi(50)(220)^2}`, R`&= \boxed{${fd(r.C * 1e6, 2)}\ \mu\text{F}}`]),
        t('เฉลยปี 2561 ได้ \\(Q_C = -2863.67\\) VAR และ \\(C = 188.33\\ \\mu\\)F เพราะปัดมุมเป็น 39.493° และ 18.195° ก่อนหา tan ค่าแม่นคือ −2864.25 VAR และ 188.37 µF', 'The 2018 solution has \\(Q_C = -2863.67\\) VAR and \\(C = 188.33\\ \\mu\\)F because the angles were rounded to 39.493° and 18.195° before taking tan; the exact values are −2864.25 VAR and 188.37 µF.')),
      step(t('<b>ข) กระแสรวมหลังแก้</b> (\\(P\\) เท่าเดิม) กราฟ: เส้นประคือกระแสก่อนต่อตัวเก็บประจุ', '<b>(b) The total current after the correction</b> (the same \\(P\\)); graph: the dashed line is the current before the capacitor'),
        block([R`|\mathbf{S}|_{\text{new}} &= \frac{${fd(r.P, 0)}}{0.95} = ${fd(r.SapNew, 2)}\ \text{VA}`, R`I_{\text{new}} &= \frac{${fd(r.SapNew, 2)}}{220} = ${fd(r.Inew, 3)}\ \text{A rms}`, R`\Delta I &= ${fd(r.I, 3)} - ${fd(r.Inew, 3)} = ${fd(r.drop, 3)}\ \text{A}`, R`&= \boxed{${fd(r.dropPct, 2)}\,\%}`])),
      step(t('<b>ค) ค่าไฟฟ้า</b>: มิเตอร์นับพลังงาน (kWh) จาก \\(P\\) ใช้ 10 ชั่วโมงต่อวัน 30 วัน หน่วยละ 2.50 บาท', '<b>(c) The bill</b>: the meter counts energy (kWh) from \\(P\\); 10 hours a day, 30 days, 2.50 baht per unit'),
        block([R`W &= (${fd(r.P, 0)}\ \text{W})(10\ \text{h})(30) = \boxed{${fd(b.kWh, 0)}\ \text{kWh}}`, R`\text{${t('ค่าไฟ', 'bill')}} &= 1734 \times 2.50 = \boxed{${fd(b.baht, 0)}\ \text{${t('บาท', 'baht')}}}`]),
        t('การแก้ PF <b>ไม่ได้ลดค่าไฟฟ้าของบ้าน</b> เพราะ \\(P\\) เท่าเดิม แต่ลดกระแสในสายไฟ ผู้ใช้รายใหญ่ที่ถูกคิดค่าปรับตาม PF จึงได้ประโยชน์ทางค่าไฟฟ้าโดยตรง (Hayt §11.5)', 'Correcting the PF <b>does not lower the house bill</b>, because \\(P\\) is unchanged; it lowers the current in the wiring. Large customers who pay PF charges are the ones who save money directly (Hayt §11.5).'))]; },
  ask: () => ({ fields: [num('P (W) =', H.all.P), num('Q (VAR) =', H.all.Q), num('PF =', H.all.PF, { tol: 0.0006 }), num('C (µF) =', H.all.C * 1e6, { tol: 0.06 })],
    check: v => near(v[3], 188.33, 0.006) ? t('188.33 µF คือค่าในเฉลยที่ปัดมุม ค่าแม่นคือ 188.37 µF', '188.33 µF is the value from rounded angles; the exact value is 188.37 µF.') : '' }),
  answer: () => t('ก) \\(P = 5780\\) W, \\(Q = 4764.04\\) VAR, \\(|\\mathbf{S}| = 7490.29\\) VA, PF = 0.7717 ตามหลัง, \\(I = 34.047\\) A · ข) \\(C = 188.37\\ \\mu\\)F กระแสลดลง 6.391 A (18.77 %) · ค) 1734 kWh ค่าไฟฟ้า 4335 บาท', '(a) \\(P = 5780\\) W, \\(Q = 4764.04\\) VAR, \\(|\\mathbf{S}| = 7490.29\\) VA, PF = 0.7717 lagging, \\(I = 34.047\\) A · (b) \\(C = 188.37\\ \\mu\\)F, the current drops by 6.391 A (18.77 %) · (c) 1734 kWh, a bill of 4335 baht.') };
CH8.DEF = DEF;

/* =====================================================================================================================
   3) wiring of one problem section */
CH8.problem = (n, key, o = {}) => {
  const $ = id => document.getElementById(id), d = DEF[key];
  const sim = new CH8.Prob($('cv' + n), { ...d, colW: $('st' + n).clientWidth });
  if ($('ctl' + n)) sim.controls($('ctl' + n));
  const ask = o.ask || d.ask; if (ask && $('ask' + n)) LS.ask($('ask' + n), ask(sim));
  const answer = o.answer || (d.answer ? () => d.answer(sim) : undefined);
  sim.stepper = LS.stepper($('st' + n), { steps: () => sim.steps, answer, hint: o.hint || d.hint, onStep: k => sim.set(k) });
  LS.onFonts(() => { sim.colW = $('st' + n).clientWidth; sim.list = null; sim.stepper.refresh(true); });
  LS.watchWidth($('st' + n), w => { sim.colW = w; sim.list = null; sim.stepper.refresh(true); });
  return sim;
};
})(window);
