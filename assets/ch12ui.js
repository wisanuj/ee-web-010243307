/* ch12ui.js — chapter 12 in the problem-by-problem format (built Oct 2026): AC machines, the three-phase induction machine.
   Built on ch12.js (machine cross-section, power flow, equivalent-circuit model), ch12_circuits.js (CH12C numbers and the per-phase
   equivalent circuit), ch8.js (CH8.Prob, bars, empty), ch11.js (CH11.plot) and lesson.js.
   Most problems here have no circuit, so CH12.Pic runs a stepper with a drawing instead of a CH8.Board (same steps/ask/answer/badge
   interface; draw(ctx, box, k, self, dt) paints the canvas). The equivalent-circuit problem (ex54) runs on CH8.Prob.
   CH12.DEF: rmf (page 12.1), ex51 p51 (12.2), ex52 p57 ex54 (12.3) · CH12.problem(n, key) wires a section like CH8.problem */
(function (global) {
'use strict';
const CH12 = global.CH12, C = global.CH12C, COL = CH6.COL, fd = CH6.fd, R = String.raw, D2R = Math.PI / 180;
const t = (th, en) => MC.t(th, en);
const step = (why, tex, note) => LS.step(why, tex, note), block = rows => LS.block(rows);
const near = (x, a, tol) => Math.abs(x - a) <= (tol ?? Math.max(2e-3, 0.005 * Math.abs(a)));
const num = (label, ans, o = {}) => ({ label, w: o.w || 5, ok: x => near(x, ans, o.tol) });
const GREEN = '#7ee787', PINK = '#ff7eb6', AMBER = '#ffd166', PURPLE = '#c792ea', ORANGE = '#ffa552', CY = '#5ad1ff', RED = '#ff6b6b';
const big = (x, d = 1) => fd(x, d).replace(/^(-?\d+)(\d{3})/, '$1\\,$2');   // 11\,190 in TeX
const PHC = [CH12.COL.a, CH12.COL.b, CH12.COL.c];
/* two panels side by side (wide) or stacked */
const split = (b, wide, frac = 0.5, gap = 6) => { if (wide) { const w1 = Math.round(b.w * frac) - gap / 2; return [{ x: b.x, y: b.y, w: w1, h: b.h }, { x: b.x + w1 + gap, y: b.y, w: b.w - w1 - gap, h: b.h }]; }
  const h1 = Math.round(b.h * frac) - gap / 2; return [{ x: b.x, y: b.y, w: b.w, h: h1 }, { x: b.x, y: b.y + h1 + gap, w: b.w, h: b.h - h1 - gap }]; };
CH12.split = split;

/* =====================================================================================================================
   CH12.Pic: one problem on a plain canvas. o = { draw(ctx, box, k, self, dt), steps(self), badge(k, self) → [[th, en], kind], asp(W) → H,
   init(self) (state in self.st), onSet(k, self), ask, answer } */
CH12.Pic = class {
  constructor(cv, o) { this.cv = cv; this.o = o; this.k = 0; this.st = {}; this.colW = o.colW || 0; if (o.init) o.init(this);
    this.pane = CH10.pane(cv, W => (o.asp ? o.asp(W) : W >= 560 ? W * 0.56 : W * 1.3)); LS.anim(cv, dt => this.frame(dt)); }
  get wide() { return this.pane.W >= 560; }
  get short() { return this.pane.W < 640; }
  frame(dt) { const { ctx, W, H } = this.pane; this.dt = dt; ctx.fillStyle = CK.PAL.bg; ctx.fillRect(0, 0, W, H); this.o.draw(ctx, { x: 0, y: 0, w: W, h: H }, this.k, this, dt);
    const bd = this.o.badge ? this.o.badge(this.k, this) : null; if (bd) CK.badge(ctx, t(bd[0][0], bd[0][1]), bd[1]); }
  set(k) { this.k = k; if (this.o.onSet) this.o.onSet(k, this); }
  get steps() { return this.list || (this.list = LS.withCol(this.colW, () => this.o.steps(this))); }
  refresh() { this.list = null; if (this.stepper) this.stepper.refresh(true); }
};
CH12.wire = (n, d, o = {}) => {
  const $ = id => document.getElementById(id), colW = $('st' + n).clientWidth;
  const sim = d.ckt ? new CH8.Prob($('cv' + n), { ...d, colW }) : new CH12.Pic($('cv' + n), { ...d, colW });
  const ask = o.ask || d.ask; if (ask && $('ask' + n)) LS.ask($('ask' + n), ask(sim));
  const answer = o.answer || (d.answer ? () => d.answer(sim) : undefined);
  sim.stepper = LS.stepper($('st' + n), { steps: () => sim.steps, answer, hint: o.hint || d.hint, onStep: k => sim.set(k) });
  LS.onFonts(() => { sim.colW = $('st' + n).clientWidth; sim.list = null; sim.stepper.refresh(true); });
  LS.watchWidth($('st' + n), w => { sim.colW = w; sim.list = null; sim.stepper.refresh(true); });
  return sim;
};
const DEF = {};

/* =====================================================================================================================
   page 12.1: slide p. 4, three-phase currents in three windings 120° apart make a field of constant size that turns (P. C. Sen §5.2) */
const RMF = k => ({ on: k <= 0 ? [0, 0, 0] : k === 1 ? [1, 0, 0] : k === 2 ? [1, 1, 0] : [1, 1, 1], seq: k === 5 ? -1 : 1, p: k >= 6 ? 4 : 2 });
DEF.rmf = { init: s => { s.st.wt = 0.3; s.st.trace = []; }, onSet: (k, s) => { s.st.trace = []; },
  draw: (ctx, b, k, s, dt) => { const c = RMF(k), st = s.st, wide = s.wide, [b1, b2] = split(b, wide, wide ? 0.5 : 0.56); st.wt += dt * 0.9;
    if (c.p === 2 && k >= 1) { const v = CH12.vec(st.wt, c.seq, c.on); st.trace.push([v.x, v.y]); if (st.trace.length > 140) st.trace.shift(); }
    CH12.machine(ctx, b1, { p: c.p, wt: st.wt, seq: c.seq, on: c.on, vec: c.p === 2, trace: st.trace, rotor: 'cage', bars: false, side: false, labels: true, title: s.short ? '' : t(`สเตเตอร์ ${c.p} ขั้ว`, `${c.p}-pole stator`) });
    const sigs = []; [0, 1, 2].forEach(j => { if (!c.on[j]) return; const sh = j === 0 ? 0 : j === 1 ? -c.seq * 120 : c.seq * 120; sigs.push({ f: d => Math.cos((d + sh) * D2R), color: PHC[j], label: ['i_a', 'i_b', 'i_c'][j], mag: 1, g: 'i', w: 2.2 }); });
    if (k >= 2) sigs.push({ f: d => { const v = CH12.vec(d * D2R, c.seq, c.on); return Math.hypot(v.x, v.y); }, color: '#e8ecf7', label: '|F|/F_m', mag: 1.6, g: 'i', w: 2, dash: [6, 4] });
    if (!sigs.length) return CH8.empty(ctx, b2, ['ยังไม่มีกระแสในขดลวด', 'no current in the windings yet']);
    CH6.waves(ctx, b2, sigs, { now: st.wt, span: 720, title: s.short ? '' : t('กระแสสามเฟสตามเวลา', 'three-phase currents against time'), max: { i: 1.6 } }); },
  badge: k => k <= 0 ? [['ยังไม่จ่ายกระแส', 'no current yet'], 'wait'] : k === 1 ? [['เฟส a: สนามพัลส์ ไม่หมุน', 'phase a: a pulsating field'], 'wait'] : k === 2 ? [['สองเฟส: หมุน แต่ขนาดไม่คงที่', 'two phases: turns, size not constant'], 'wait']
    : k === 5 ? [['สลับ b กับ c: หมุนกลับทิศ', 'b and c swapped: turns back'], 'ok'] : k >= 6 ? [['4 ขั้ว: ช้าลงครึ่งหนึ่ง', '4 poles: half the speed'], 'ok'] : [['สามเฟส: สนามหมุน ขนาด 1.5 Fm', 'three phases: a turning field, 1.5 Fm'], 'ok'],
  steps: () => [step(t('<b>เฟส a เฟสเดียว</b>: กระแส \\(i_a = I_m\\cos\\omega t\\) ในขดลวด a–a′ (N รอบ) สร้างแรงเคลื่อนแม่เหล็ก (magnetomotive force, mmf) ตามแกนของเฟส a ซึ่งกระจายแบบไซน์รอบช่องอากาศ เมื่อ \\(F_m = NI_m\\) แถบสีในช่องอากาศคือสนามแม่เหล็ก (ส้ม = N ม่วง = S)', '<b>Phase a alone</b>: the current \\(i_a = I_m\\cos\\omega t\\) in the coil a–a′ (N turns) makes a magnetomotive force (mmf) along phase a\'s axis, distributed as a sine round the air gap, with \\(F_m = NI_m\\). The coloured band in the air gap is the field (orange = N, purple = S)'),
      block([R`F_a(\theta, t) &= Ni_a\cos\theta = F_m\cos\omega t\,\cos\theta`]), t('สนามนี้<b>พัลส์</b>อยู่กับที่: ลูกศรสีแดงยืดหดและกลับทิศตามกระแส แต่ไม่หมุน', 'This field <b>pulsates</b> in place: the red arrow grows, shrinks and reverses with the current, but does not turn.')),
    step(t('<b>เพิ่มเฟส b</b>: ขดลวดของเฟส b วางห่างจากเฟส a 120° และกระแสของมันตามหลัง 120° ลัพธ์ของสองเฟส (ลูกศรสีขาว) เริ่มหมุน แต่ขนาดไม่คงที่ ปลายลูกศรวาดเป็นวงรี', '<b>Add phase b</b>: its coil is 120° away from phase a and its current lags by 120°. The resultant of the two phases (white arrow) starts to turn, but its size changes: its tip draws an ellipse'),
      block([R`F_b(\theta, t) &= F_m\cos(\omega t - 120^\circ)\cos(\theta - 120^\circ)`])),
    step(t('<b>ครบสามเฟส</b>: เพิ่ม \\(F_c\\) (แกนที่ 240° = −120°) แล้วใช้ \\(\\cos A\\cos B = \\tfrac12[\\cos(A - B) + \\cos(A + B)]\\) กับทุกพจน์ พจน์ \\(\\cos(\\theta + \\omega t - \\ldots)\\) สามพจน์ห่างกัน 120° รวมกันเป็นศูนย์', '<b>All three phases</b>: add \\(F_c\\) (axis at 240° = −120°) and use \\(\\cos A\\cos B = \\tfrac12[\\cos(A - B) + \\cos(A + B)]\\) on every term. The three \\(\\cos(\\theta + \\omega t - \\ldots)\\) terms are 120° apart and add up to zero'),
      block([R`F_c(\theta, t) &= F_m\cos(\omega t + 120^\circ)\cos(\theta + 120^\circ)`, R`F_a + F_b + F_c &= \tfrac32F_m\cos(\theta - \omega t) + 0`, R`F(\theta, t) &= \boxed{\tfrac32F_m\cos(\theta - \omega t)}`])),
    step(t('<b>สนามแม่เหล็กหมุน</b> (rotating magnetic field): ยอดของ \\(F\\) อยู่ที่ \\(\\theta = \\omega t\\) จึงเคลื่อนรอบช่องอากาศด้วยความเร็วเชิงมุม \\(\\omega\\) คงที่ และมีขนาด \\(1.5F_m\\) ไม่เปลี่ยน ปลายลูกศรวาดเป็นวงกลม เส้นประในกราฟคือ \\(|F|/F_m = 1.5\\) ตลอดเวลา เครื่อง 2 ขั้วหมุนหนึ่งรอบต่อหนึ่งคาบ', '<b>The rotating magnetic field</b>: the peak of \\(F\\) is at \\(\\theta = \\omega t\\), so it travels round the air gap at the steady angular speed \\(\\omega\\), always \\(1.5F_m\\) in size. The arrow\'s tip draws a circle, and the dashed line in the graph stays at \\(|F|/F_m = 1.5\\). A 2-pole machine\'s field makes one turn per cycle'),
      block([R`\theta_\text{peak} &= \omega t`, R`n &= 60f = 60(50) = 3000\ \text{rpm}\quad(2\ \text{poles}, 50\ \text{Hz})`])),
    step(t('<b>สลับสายสองเฟส</b>: สลับสายของเฟส b กับ c ลำดับเฟสกลับเป็น a–c–b ยอดของสนามอยู่ที่ \\(\\theta = -\\omega t\\) สนามจึงหมุนกลับทิศ มอเตอร์ก็หมุนกลับทิศตาม (ใช้ในการเบรกแบบ plugging หน้า 12.3)', '<b>Swap two supply leads</b>: swapping phases b and c reverses the sequence to a–c–b; the field\'s peak is at \\(\\theta = -\\omega t\\), so the field turns the other way, and so does the motor (used for plugging, page 12.3)'),
      block([R`i_b &= I_m\cos(\omega t + 120^\circ),\quad i_c = I_m\cos(\omega t - 120^\circ)`, R`F(\theta, t) &= \tfrac32F_m\cos(\theta + \omega t)`])),
    step(t('<b>เครื่อง p ขั้ว</b>: ขดลวดของแต่ละเฟสวางซ้ำ p/2 ชุดรอบสเตเตอร์ มุมทางไฟฟ้าจึงเป็น p/2 เท่าของมุมทางกล สนามหมุนทางกลช้าลง p/2 เท่า ได้ความเร็วซิงโครนัส (synchronous speed) ของสไลด์หน้า 4', '<b>A p-pole machine</b>: each phase winding is repeated p/2 times round the stator, so electrical angles are p/2 times the mechanical ones and the field turns p/2 times slower: the synchronous speed of slide p. 4'),
      block([R`\omega_m &= \frac{\omega}{p/2} = \frac{2\omega}{p}`, R`n_s &= \frac{2}{p}f(60) = \boxed{\frac{120f}{p}}`, R`n_s &= \frac{120(50)}{4} = 1500\ \text{rpm}\quad(4\ \text{poles})`]))],
  ask: () => ({ fields: [num('|F|/F<sub>m</sub> =', 1.5, { tol: 0.01 }), num(t('n<sub>s</sub> 4 ขั้ว 50 Hz (rpm) =', 'n<sub>s</sub>, 4 poles, 50 Hz (rpm) ='), 1500, { tol: 1, w: 6 })],
    check: v => near(v[0], 3, 0.01) ? t('3 คือผลรวมของค่าสูงสุดของสามเฟส แต่ยอดของแต่ละเฟสไม่มาพร้อมกัน ลัพธ์จึงเป็น 1.5 เท่า', '3 adds the three peaks, but the phases do not peak together, so the resultant is 1.5 times.') : near(v[1], 3000, 1) ? t('3000 rpm คือของเครื่อง 2 ขั้ว: ใช้ p = 4 ในสูตร 120f/p', '3000 rpm is for 2 poles: put p = 4 in 120f/p.') : '' }),
  answer: () => t('ลัพธ์ \\(F = 1.5F_m\\cos(\\theta - \\omega t)\\): ขนาด 1.5 เท่าของ \\(F_m\\) คงที่ หมุนด้วย ω · 4 ขั้ว 50 Hz: \\(n_s = 1500\\) rpm (P. C. Sen หัวข้อ 5.2 ได้ผลเดียวกัน)', 'The resultant \\(F = 1.5F_m\\cos(\\theta - \\omega t)\\): a steady 1.5 times \\(F_m\\), turning at ω · 4 poles, 50 Hz: \\(n_s = 1500\\) rpm (as in P. C. Sen, section 5.2).') };

/* =====================================================================================================================
   page 12.2: the rotor behind (or ahead of) the field. A machine drawing whose rotor turns at n while the field turns at n_s (both slowed
   down by the same factor), and a side panel per step */
const W_VIS = 0.45;   // mechanical rad/s of the field on screen
const turn = (st, dt, p, nOverNs) => { st.wt = (st.wt || 0) + dt * W_VIS * p / 2; st.rot = (st.rot || 0) + dt * W_VIS * nOverNs; };
const machineAt = (ctx, b, s, o) => CH12.machine(ctx, b, Object.assign({ p: 4, wt: s.st.wt, rot: s.st.rot, rotor: 'wound', side: false, labels: false }, o));
const E1 = C.ex51;
DEF.ex51 = { init: s => { s.st.wt = 0; s.st.rot = 0; },
  draw: (ctx, b, k, s, dt) => { const wide = s.wide, [b1, b2] = split(b, wide, wide ? 0.5 : 0.56), sh = s.short; turn(s.st, dt, 4, E1.n / E1.ns);
    machineAt(ctx, b1, s, { slip: k >= 1 ? E1.s : null, title: sh ? '' : t('n = 1710 rpm, n_s = 1800 rpm', 'n = 1710 rpm, n_s = 1800 rpm') });
    if (k < 1) return CH8.empty(ctx, b2, ['เครื่อง 4 ขั้ว 60 Hz สลิป 0.05', 'four poles, 60 Hz, slip 0.05']);
    const bars = (items, title, max) => CH8.bars(ctx, b2, items, { title: sh ? '' : title, fmt: v => fd(v, 0), sub: !sh, max });
    if (k === 1) return bars([{ label: 'n_s', v: E1.ns, color: CY, sub: t('สนาม', 'field') }, { label: 'n', v: E1.n, color: GREEN, sub: t('โรเตอร์', 'rotor') }], t('ความเร็ว (rpm)', 'speeds (rpm)'), 2000);
    if (k === 2) return bars([{ label: 'n_s', v: E1.ns, color: CY, sub: t('สเตเตอร์', 'stator') }, { label: t('สนามในช่องอากาศ', 'air-gap field'), v: E1.ns, color: PURPLE, sub: '= n_s' }, { label: 'n', v: E1.n, color: GREEN, sub: t('โรเตอร์', 'rotor') }], t('ความเร็ว (rpm)', 'speeds (rpm)'), 2000);
    if (k === 3) return CH11.plot(ctx, b2, { x: [0, 500], y: [-1.3, 1.3], xt: 100, yt: 1, xl: 't (ms)', yl: t('กระแส (ต่อหน่วย)', 'current (per unit)'), title: sh ? '' : t('กระแสสเตเตอร์ 60 Hz กับกระแสโรเตอร์ 3 Hz', 'stator current 60 Hz, rotor current 3 Hz'),
      curves: [{ f: x => Math.sin(2 * Math.PI * 60 * x / 1000), color: 'rgba(90,209,255,.55)', w: 1.4, n: 1200 }, { f: x => Math.sin(2 * Math.PI * 3 * x / 1000), color: AMBER, w: 3 }] });
    if (k === 4) return bars([{ label: 'n_s', v: E1.ns, color: CY }, { label: 'n', v: E1.n, color: GREEN }, { label: 'n_s − n', v: E1.slipRpm, color: PINK, sub: t('สลิป', 'slip rpm') }], t('ความเร็ว (rpm)', 'speeds (rpm)'), 2000);
    if (k === 5) return bars([{ label: t('เทียบโรเตอร์', 'vs rotor'), v: E1.rel.rotor, color: PINK, sub: 's n_s' }, { label: t('เทียบสเตเตอร์', 'vs stator'), v: E1.rel.stator, color: CY, sub: 'n + s n_s' }, { label: t('เทียบสนาม', 'vs field'), v: 0, color: PURPLE, sub: t('สนามสเตเตอร์', 'stator field') }], t('ความเร็วของสนามโรเตอร์ (rpm)', 'rotor field speed (rpm)'), 2000);
    CH8.bars(ctx, b2, [{ label: 'E_1', v: E1.E1, color: CY, sub: 'V/√3' }, { label: 'E_2', v: E1.E2, color: PURPLE, sub: t('นิ่ง', 'standstill') }, { label: 'E_2s', v: E1.E2s, color: AMBER, sub: 's E_2' }], { title: sh ? '' : t('แรงดันต่อเฟส (V)', 'voltage per phase (V)'), fmt: v => fd(v, v < 10 ? 2 : 1), sub: !sh, max: 300 }); },
  badge: k => k >= 1 ? [['โรเตอร์ช้ากว่าสนาม 5 %', 'rotor 5 % behind the field'], 'ok'] : [['หาความเร็วและสลิป', 'find the speeds and the slip'], 'wait'],
  steps: () => [step(t('<b>(a) ความเร็วซิงโครนัสและความเร็วมอเตอร์</b>: สนามหมุนด้วย \\(n_s = 120f/p\\) (สไลด์หน้า 4) และสลิป \\(s = (n_s - n)/n_s\\) (สไลด์หน้า 7) จึงได้ \\(n = (1 - s)n_s\\)', '<b>(a) Synchronous speed and motor speed</b>: the field turns at \\(n_s = 120f/p\\) (slide p. 4), and the slip \\(s = (n_s - n)/n_s\\) (slide p. 7) gives \\(n = (1 - s)n_s\\)'),
      block([R`n_s &= \frac{120(60)}{4} = \boxed{1800\ \text{rpm}}`, R`n &= (1 - 0.05)(1800) = \boxed{1710\ \text{rpm}}`])),
    step(t('<b>(b) ความเร็วของสนามในช่องอากาศ</b>: สนามที่สเตเตอร์สร้างหมุนด้วยความเร็วซิงโครนัส สนามลัพธ์ในช่องอากาศจึงหมุนด้วยความเร็วเดียวกัน', '<b>(b) Speed of the air-gap field</b>: the field made by the stator turns at the synchronous speed, and so does the resultant field in the air gap'),
      block([R`n_\text{gap} &= n_s = \boxed{1800\ \text{rpm}}`])),
    step(t('<b>(c) ความถี่ของวงจรโรเตอร์</b>: ตัวนำของโรเตอร์ถูกสนามแซงด้วยความเร็ว \\(n_s - n\\) แรงดันในโรเตอร์จึงมีความถี่ \\(f_2 = sf_1\\) (สไลด์หน้า 7) แผงข้างภาพเทียบกระแสโรเตอร์ 3 Hz กับกระแสสเตเตอร์ 60 Hz', '<b>(c) Frequency of the rotor circuit</b>: the field overtakes the rotor conductors at \\(n_s - n\\), so the rotor voltage has the frequency \\(f_2 = sf_1\\) (slide p. 7). The side panel compares the 3 Hz rotor current with the 60 Hz stator current'),
      block([R`f_2 &= sf_1 = (0.05)(60) = \boxed{3\ \text{Hz}}`])),
    step(t('<b>(d) ความเร็วสลิป</b> (slip rpm) คือความเร็วที่สนามแซงโรเตอร์', '<b>(d) Slip rpm</b>: how fast the field overtakes the rotor'),
      block([R`n_s - n &= sn_s = (0.05)(1800) = \boxed{90\ \text{rpm}}`])),
    step(t('<b>(e) ความเร็วของสนามโรเตอร์</b>: กระแสในโรเตอร์มีความถี่ \\(f_2\\) จึงสร้างสนามที่หมุน \\(120f_2/p = sn_s\\) เทียบกับตัวโรเตอร์ บวกกับความเร็วของโรเตอร์เองได้ความเร็วเทียบสเตเตอร์ สนามโรเตอร์จึงหมุนไปพร้อมสนามสเตเตอร์ (นิ่งเมื่อเทียบกัน) ซึ่งทำให้เกิดแรงบิดคงที่', '<b>(e) Speed of the rotor field</b>: the rotor currents at \\(f_2\\) make a field turning at \\(120f_2/p = sn_s\\) relative to the rotor; adding the rotor\'s own speed gives its speed relative to the stator. So the rotor field moves with the stator field (at rest relative to it), which gives a steady torque'),
      block([R`\text{(i)}\ \ \text{rotor:}\quad & \frac{120f_2}{p} = \frac{120(3)}{4} = \boxed{90\ \text{rpm}}`, R`\text{(ii)}\ \ \text{stator:}\quad & 1710 + 90 = \boxed{1800\ \text{rpm}}`, R`\text{(iii)}\ \ \text{stator field:}\quad & 1800 - 1800 = \boxed{0\ \text{rpm}}`])),
    step(t('<b>(f) แรงดันเหนี่ยวนำในโรเตอร์ขณะหมุน</b>: ถือว่าแรงดันเหนี่ยวนำในสเตเตอร์เท่ากับแรงดันที่จ่ายต่อเฟส ขณะโรเตอร์อยู่นิ่ง \\(E_1/E_2 = N_1/N_2\\) (สไลด์หน้า 6) และขณะหมุน ทั้งความถี่และแรงดันลดลงตามสลิป \\(E_{2s} = sE_2\\)', '<b>(f) Rotor voltage at the operating speed</b>: take the stator induced voltage equal to the applied voltage per phase. At standstill \\(E_1/E_2 = N_1/N_2\\) (slide p. 6); running, the frequency and the voltage both shrink with the slip, \\(E_{2s} = sE_2\\)'),
      block([R`E_1 &= \frac{460}{\sqrt3} = ${fd(E1.E1, 1)}\ \text{V},\quad E_2 = 0.5E_1 = ${fd(E1.E2, 1)}\ \text{V}`, R`E_{2s} &= sE_2 = (0.05)(${fd(E1.E2, 1)}) = \boxed{${fd(E1.E2s, 2)}\ \text{V/phase}}`]))],
  ask: () => ({ fields: [num('n (rpm) =', E1.n, { tol: 0.5 }), num('f<sub>2</sub> (Hz) =', E1.f2, { tol: 0.01 }), num(t('สลิป rpm =', 'slip rpm ='), E1.slipRpm, { tol: 0.5 }), num('E<sub>2s</sub> (V) =', E1.E2s, { tol: 0.03 })],
    check: v => near(v[3], 0.05 * 0.5 * 460, 0.1) ? t('ใช้แรงดันต่อเฟส \\(460/\\sqrt3\\) ไม่ใช่แรงดันสาย 460 V', 'Use the phase voltage \\(460/\\sqrt3\\), not the 460 V line voltage.') : near(v[3], 0.5 * E1.E1, 0.3) ? t('นั่นคือแรงดันขณะโรเตอร์อยู่นิ่ง: ขณะหมุนต้องคูณด้วย s', 'That is the standstill voltage: running, multiply by s.') : '' }),
  answer: () => t('(a) 1800 rpm, 1710 rpm (b) 1800 rpm (c) 3 Hz (d) 90 rpm (e) 90, 1800, 0 rpm (f) 6.64 V ต่อเฟส ตรงกับ P. C. Sen Example 5.1 · ไม่มีเฉลยในห้อง', '(a) 1800 rpm, 1710 rpm (b) 1800 rpm (c) 3 Hz (d) 90 rpm (e) 90, 1800, 0 rpm (f) 6.64 V per phase, as in P. C. Sen Example 5.1 · no class solution.') };

const P1 = C.p51, caseOf = k => (k >= 1 ? P1.cases[Math.min(k, 5) - 1] : { n: 0, s: 1, V: P1.E2, f2: P1.f });
DEF.p51 = { init: s => { s.st.wt = 0; s.st.rot = 0; },
  draw: (ctx, b, k, s, dt) => { const wide = s.wide, [b1, b2] = split(b, wide, wide ? 0.48 : 0.54), sh = s.short, q = caseOf(k); turn(s.st, dt, 4, q.n / P1.ns);
    machineAt(ctx, b1, s, { slip: q.s, title: sh ? '' : `n = ${fd(q.n, 0).replace('-', '−')} rpm` });
    const pk = Math.SQRT2 * q.V, ref = Math.SQRT2 * P1.E2;
    CH11.plot(ctx, b2, { x: [0, 200], y: [-700, 700], xt: 50, yt: 350, xl: 't (ms)', yl: 'v (V)', title: sh ? '' : t(`แรงดันระหว่างวงแหวนลื่น: ${fd(q.V, 0)} V, ${fd(q.f2, 0)} Hz`, `slip-ring voltage: ${fd(q.V, 0)} V, ${fd(q.f2, 0)} Hz`),
      curves: [{ f: x => ref * Math.sin(2 * Math.PI * P1.f * x / 1000), color: 'rgba(154,163,199,.45)', w: 1.2, n: 1200 }, { f: x => (q.s < 0 ? -1 : 1) * pk * Math.sin(2 * Math.PI * q.f2 * x / 1000), color: AMBER, w: 2.6, n: 1200 }],
      hlines: [{ y: pk, color: AMBER, label: sh ? '' : t(`ค่ายอด √2 × ${fd(q.V, 0)} V`, `peak √2 × ${fd(q.V, 0)} V`) }] }); },
  badge: k => { const q = caseOf(k); return k < 1 ? [['โรเตอร์นิ่ง: 230 V, 60 Hz', 'standstill: 230 V, 60 Hz'], 'wait'] : q.s < 0 ? [['s < 0: เครื่องกำเนิด', 's < 0: generating'], 'ok'] : q.s > 1 ? [['s > 1: หมุนสวนสนาม', 's > 1: against the field'], 'ok'] : Math.abs(q.s) < 1e-9 ? [['s = 0: ไม่มีแรงดัน', 's = 0: no voltage'], 'ok'] : [['0 < s < 1: มอเตอร์', '0 < s < 1: motoring'], 'ok']; },
  steps: () => { const st = (txt, q, tag) => step(txt, block([R`s &= \frac{n_s - n}{n_s} = \frac{1800 - (${fd(q.n, 0)})}{1800} = ${fd(q.s, 2)}`, R`V &= |s|(230) = \boxed{${fd(q.V, 0)}\ \text{V}},\quad f_2 = |s|(60) = \boxed{${fd(q.f2, 0)}\ \text{Hz}}`]), tag);
    const c = P1.cases;
    return [st(t('<b>(a) 1620 rpm ทิศเดียวกับสนาม</b>: ที่โรเตอร์อยู่นิ่ง (s = 1) วัดได้ 230 V ที่ 60 Hz เมื่อหมุน ทั้งแรงดันและความถี่เป็น \\(|s|\\) เท่า (\\(E_{2s} = sE_2\\), \\(f_2 = sf_1\\)) ความเร็วซิงโครนัส \\(n_s = 120(60)/4 = 1800\\) rpm', '<b>(a) 1620 rpm with the field</b>: at standstill (s = 1) the slip rings show 230 V at 60 Hz; turning, both the voltage and the frequency are \\(|s|\\) times as much (\\(E_{2s} = sE_2\\), \\(f_2 = sf_1\\)), with \\(n_s = 120(60)/4 = 1800\\) rpm'), c[0]),
      st(t('<b>(b) 1620 rpm สวนทางสนาม</b>: ความเร็วติดลบ สนามแซงโรเตอร์เร็วกว่าตอนนิ่ง สลิปจึงเกิน 1 (ย่านเบรกแบบ plugging หน้า 12.3)', '<b>(b) 1620 rpm against the field</b>: the speed is negative and the field overtakes the rotor faster than at standstill, so the slip exceeds 1 (the plugging range, page 12.3)'), c[1]),
      st(t('<b>(c) 1800 rpm ทิศเดียวกับสนาม</b>: โรเตอร์หมุนพร้อมสนามพอดี ตัวนำไม่ตัดฟลักซ์ จึงไม่มีแรงดัน (และมอเตอร์จริงไม่มีแรงบิดที่จุดนี้ สไลด์หน้า 7)', '<b>(c) 1800 rpm with the field</b>: the rotor keeps pace with the field, its conductors cut no flux, so there is no voltage (and a real motor has no torque here, slide p. 7)'), c[2]),
      st(t('<b>(d) 1800 rpm สวนทางสนาม</b>: สนามแซงด้วยความเร็วสองเท่าของ \\(n_s\\) แรงดันและความถี่จึงเป็นสองเท่าของตอนนิ่ง', '<b>(d) 1800 rpm against the field</b>: the field overtakes at twice \\(n_s\\), so the voltage and the frequency are twice their standstill values'), c[3]),
      st(t('<b>(e) 3600 rpm ทิศเดียวกับสนาม</b>: โรเตอร์แซงสนาม สลิปติดลบ (ย่านเครื่องกำเนิด หน้า 12.3) ขนาดแรงดันและความถี่คิดจาก \\(|s|\\) ส่วนลำดับเฟสของแรงดันกลับข้าง (เส้นสีส้มในกราฟเริ่มที่ค่าลบ)', '<b>(e) 3600 rpm with the field</b>: the rotor overtakes the field and the slip is negative (the generating range, page 12.3). The size of the voltage and the frequency come from \\(|s|\\); the phase sequence is reversed (the orange curve starts negative)'), c[4], t('ทั้งห้ากรณีใช้สูตรเดียว: แรงดันระหว่างวงแหวนลื่นเป็นสัดส่วนกับความเร็วที่สนามแซงตัวนำของโรเตอร์ \\(|n_s - n|\\) นี่คือหลักของเครื่องเปลี่ยนเฟสและเปลี่ยนความถี่ (สไลด์หน้า 6)', 'All five cases use one rule: the slip-ring voltage is proportional to how fast the field passes the rotor conductors, \\(|n_s - n|\\). This is the principle of the phase shifter and the frequency changer (slide p. 6).'))]; },
  ask: () => ({ fields: [num(t('(a) V (V) =', '(a) V (V) ='), P1.cases[0].V, { tol: 0.5 }), num(t('(b) f<sub>2</sub> (Hz) =', '(b) f<sub>2</sub> (Hz) ='), P1.cases[1].f2, { tol: 0.5 }), num(t('(d) V (V) =', '(d) V (V) ='), P1.cases[3].V, { tol: 0.5 }), num(t('(e) f<sub>2</sub> (Hz) =', '(e) f<sub>2</sub> (Hz) ='), P1.cases[4].f2, { tol: 0.5 })],
    check: v => near(v[1], 6, 0.5) ? t('ทิศสวนสนาม ความเร็วต้องใส่เป็นค่าลบ: s = (1800 + 1620)/1800 = 1.9', 'Against the field the speed is negative: s = (1800 + 1620)/1800 = 1.9.') : near(v[3], -60, 0.5) ? t('ความถี่ใช้ขนาด |s|: 60 Hz ส่วนเครื่องหมายบอกลำดับเฟส', 'The frequency uses |s|: 60 Hz; the sign tells the phase sequence.') : '' }),
  answer: () => t('(a) 23 V, 6 Hz (b) 437 V, 114 Hz (c) 0 V, 0 Hz (d) 460 V, 120 Hz (e) 230 V, 60 Hz (ลำดับเฟสกลับ) · โจทย์ใหม่ของพิมพ์ครั้งที่ 3 ไม่มีในคู่มือเฉลยซึ่งเป็นพิมพ์ครั้งที่ 2', '(a) 23 V, 6 Hz (b) 437 V, 114 Hz (c) 0 V, 0 Hz (d) 460 V, 120 Hz (e) 230 V, 60 Hz (sequence reversed) · new in the 3rd edition, not in the solution manual (2nd edition).') };

/* =====================================================================================================================
   page 12.3: power flow. The drawing is a CH12.flow diagram whose values appear as the steps find them (band widths are always true) */
const X2 = C.ex52;
const flowBox = (b, s) => ({ x: b.x, y: b.y + (s.short ? 34 : 4), w: b.w, h: b.h - (s.short ? 34 : 4) });
DEF.ex52 = { asp: W => W >= 560 ? W * 0.5 : W * 0.78,
  draw: (ctx, b, k, s) => { const sh = s.short;
    CH12.flow(ctx, flowBox(b, s), { Pin: X2.Pag, short: sh, title: sh ? '' : t('การไหลของกำลังในโรเตอร์ (P. C. Sen รูป 5.23a)', 'power flow in the rotor (P. C. Sen Fig. 5.23a)'), cols: [PURPLE, ORANGE, GREEN],
      stages: [{ label: ['การสูญเสียในทองแดงของโรเตอร์', 'rotor copper loss'], losses: [{ label: 'P_2', v: X2.P2, hide: k < 5 }] }, { label: ['ลมและแรงเสียดทาน', 'windage and friction'], losses: [{ label: t('ลม/เสียดทาน', 'windage'), v: X2.Pfw }] }],
      names: ['P_ag', 'P_mech', 'P_out'], hide: [k < 4, k < 2, k < 1], eff: false }); },
  badge: k => k >= 3 ? [['s = 0.04', 's = 0.04'], 'ok'] : k >= 1 ? [['เริ่มจากเพลา: 15 hp', 'start at the shaft: 15 hp'], 'ok'] : [['หากำลังทีละส่วน', 'find the powers one by one'], 'wait'],
  steps: () => [step(t('<b>กำลังออกที่เพลา</b>: มอเตอร์จ่ายกำลังเต็มพิกัด 15 hp (1 hp = 746 W)', '<b>Output power at the shaft</b>: the motor delivers its full 15 hp (1 hp = 746 W)'), block([R`P_{out} &= 15(746) = ${big(X2.Pout, 0)}\ \text{W}`])),
    step(t('<b>(a) กำลังกลที่พัฒนาได้</b>: กำลังกลส่วนหนึ่งเสียไปกับลมและแรงเสียดทาน 750 W ก่อนถึงเพลา', '<b>(a) Mechanical power developed</b>: part of it goes to windage and friction (750 W) before the shaft'), block([R`P_{mech} &= P_{out} + P_{fw} = ${big(X2.Pout, 0)} + 750 = \boxed{${big(X2.Pmech, 0)}\ \text{W}}`])),
    step(t('<b>สลิป</b>: ความเร็วซิงโครนัสของเครื่อง 4 ขั้ว 60 Hz คือ 1800 rpm (สไลด์หน้า 11)', '<b>The slip</b>: a four-pole 60 Hz machine has a synchronous speed of 1800 rpm (slide p. 11)'), block([R`n_s &= \frac{120(60)}{4} = 1800\ \text{rpm}`, R`s &= \frac{1800 - 1728}{1800} = 0.04`])),
    step(t('<b>(b) กำลังในช่องอากาศ</b> (air-gap power): กำลังที่ข้ามช่องอากาศเข้าโรเตอร์แบ่งเป็น \\(P_{ag} : P_2 : P_{mech} = 1 : s : 1 - s\\) (P. C. Sen หัวข้อ 5.7 สอดคล้องกับ \\(P_{mech} = T\\omega_s(1 - s)\\) ในสไลด์หน้า 11)', '<b>(b) Air-gap power</b>: the power crossing the air gap into the rotor divides as \\(P_{ag} : P_2 : P_{mech} = 1 : s : 1 - s\\) (P. C. Sen, section 5.7; it matches \\(P_{mech} = T\\omega_s(1 - s)\\) on slide p. 11)'),
      block([R`P_{ag} &= \frac{P_{mech}}{1 - s} = \frac{${big(X2.Pmech, 0)}}{0.96} = \boxed{${big(X2.Pag, 1)}\ \text{W}}`])),
    step(t('<b>(c) การสูญเสียในทองแดงของโรเตอร์</b> คือส่วน s ของกำลังในช่องอากาศ', '<b>(c) Rotor copper loss</b>: the fraction s of the air-gap power'), block([R`P_2 &= sP_{ag} = (0.04)(${big(X2.Pag, 1)}) = \boxed{${fd(X2.P2, 1)}\ \text{W}}`, R`P_{ag} - P_2 &= ${big(X2.Pmech, 0)}\ \text{W} = P_{mech}\ \ \checkmark`]),
      t('มอเตอร์ที่สลิปต่ำ (4 %) เสียกำลังในโรเตอร์เพียง 4 % ของกำลังที่ข้ามช่องอากาศ ถ้าสลิปสูง ความร้อนในโรเตอร์จะมาก', 'At a low slip (4 %) only 4 % of the air-gap power is lost in the rotor; a high slip heats the rotor a lot.'))],
  ask: () => ({ fields: [num('P<sub>mech</sub> (W) =', X2.Pmech, { tol: 2 }), num('P<sub>ag</sub> (W) =', X2.Pag, { tol: 3 }), num('P<sub>2</sub> (W) =', X2.P2, { tol: 1 })],
    check: v => near(v[1], X2.Pout / (1 - X2.s), 3) ? t('ต้องบวกลมและแรงเสียดทานก่อน: \\(P_{ag} = P_{mech}/(1 - s)\\) ไม่ใช่ \\(P_{out}/(1 - s)\\)', 'Add the windage first: \\(P_{ag} = P_{mech}/(1 - s)\\), not \\(P_{out}/(1 - s)\\).') : near(v[2], X2.s * X2.Pmech, 1) ? t('\\(P_2 = sP_{ag}\\) ไม่ใช่ \\(sP_{mech}\\)', '\\(P_2 = sP_{ag}\\), not \\(sP_{mech}\\).') : '' }),
  answer: () => t('(a) 11 940 W (b) 12 437.5 W (c) 497.5 W ตรงกับ P. C. Sen Example 5.2 · ไม่มีเฉลยในห้อง', '(a) 11 940 W (b) 12 437.5 W (c) 497.5 W, as in P. C. Sen Example 5.2 · no class solution.') };

const X7 = C.p57;
DEF.p57 = { asp: W => W >= 560 ? W * 0.52 : W * 0.82,
  draw: (ctx, b, k, s) => { const sh = s.short;
    CH12.flow(ctx, flowBox(b, s), { Pin: X7.Pin, short: sh, title: sh ? '' : t('การไหลของกำลังของมอเตอร์เหนี่ยวนำ (P. C. Sen รูป 5.23a)', 'power flow of the induction motor (P. C. Sen Fig. 5.23a)'), cols: [CY, PURPLE, ORANGE, GREEN],
      stages: [{ label: ['การสูญเสียในสเตเตอร์', 'stator losses'], losses: [{ label: t('แกน', 'core'), v: X7.Pcore }, { label: t('ทองแดงสเตเตอร์', 'stator copper'), v: X7.Pst }] },
        { label: ['ทองแดงโรเตอร์', 'rotor copper'], losses: [{ label: 'P_2', v: X7.P2 }] }, { label: ['ลมและแรงเสียดทาน', 'windage and friction'], losses: [{ label: t('ลม/เสียดทาน', 'windage'), v: X7.Pfw }] }],
      names: ['P_in', 'P_ag', 'P_mech', 'P_out'], hide: [k < 1, k < 2, k < 3, k < 4], eff: k >= 4 });
    if (k >= 5) { const x = b.x + b.w - 10, y0 = b.y + (sh ? 50 : 46); CH6.tag(ctx, `n = ${fd(X7.n, 1)} rpm`, x, y0, GREEN, { align: 'right', size: 12 }); if (k >= 6) CH6.tag(ctx, `T_out = ${fd(X7.Tout, 2)} N·m`, x, y0 + 24, AMBER, { align: 'right', size: 12 }); } },
  badge: k => k >= 4 ? [['η = 84.10 %', 'η = 84.10 %'], 'ok'] : k >= 1 ? [['เริ่มจากกำลังเข้า', 'start from the input power'], 'ok'] : [['หากำลังทีละส่วน', 'find the powers one by one'], 'wait'],
  steps: () => [step(t('<b>กำลังเข้าสามเฟส</b>: สไลด์หน้า 11 ให้ \\(P = VI\\cos\\theta\\) ต่อเฟส เมื่อคิดครบสามเฟสด้วยค่าสาย (บทที่ 9) ได้ \\(\\sqrt3V_LI_L\\cos\\theta\\)', '<b>Three-phase input power</b>: slide p. 11 gives \\(P = VI\\cos\\theta\\) per phase; for all three phases in line values (chapter 9) it is \\(\\sqrt3V_LI_L\\cos\\theta\\)'),
      block([R`P_{in} &= \sqrt3(460)(25)(0.9) = ${big(X7.Pin, 1)}\ \text{W}`])),
    step(t('<b>(a) กำลังในช่องอากาศ</b>: หักการสูญเสียในแกนและในทองแดงของสเตเตอร์ (P. C. Sen รวมการสูญเสียในแกนไว้ด้านสเตเตอร์)', '<b>(a) Air-gap power</b>: take off the core loss and the stator copper loss (P. C. Sen puts the core loss on the stator side)'),
      block([R`P_{ag} &= ${big(X7.Pin, 1)} - 900 - 1100 = \boxed{${big(X7.Pag, 1)}\ \text{W}}`])),
    step(t('<b>(b) กำลังกลที่พัฒนาได้</b>: หักการสูญเสียในทองแดงของโรเตอร์', '<b>(b) Mechanical power developed</b>: take off the rotor copper loss'), block([R`P_{mech} &= ${big(X7.Pag, 1)} - 550 = \boxed{${big(X7.Pmech, 1)}\ \text{W}}`])),
    step(t('<b>(c)–(d) กำลังออกและประสิทธิภาพ</b>: \\(P_{out} = P_{mech} - P_{rot}\\) (สไลด์หน้า 11 เขียน \\(P_{rotor}\\) ดูหมายเหตุด้านล่าง)', '<b>(c)–(d) Output power and efficiency</b>: \\(P_{out} = P_{mech} - P_{rot}\\) (slide p. 11 writes \\(P_{rotor}\\); see the note below)'),
      block([R`P_{out} &= ${big(X7.Pmech, 1)} - 300 = ${big(X7.Pout, 1)}\ \text{W} = \boxed{${fd(X7.hp, 2)}\ \text{hp}}`, R`\eta &= \frac{${big(X7.Pout, 1)}}{${big(X7.Pin, 1)}} = \boxed{${fd(100 * X7.eff, 2)}\,\%}`]),
      t('เครื่องพิกัด 20 kW แต่ที่สภาวะนี้ให้กำลังออกเพียง 15.08 kW', 'A 20 kW machine, but at this condition it gives only 15.08 kW.')),
    step(t('<b>Problem 5.8 (a)–(b) ความเร็ว</b>: สลิปหาได้จาก \\(P_2 = sP_{ag}\\)', '<b>Problem 5.8 (a)–(b) The speed</b>: the slip follows from \\(P_2 = sP_{ag}\\)'),
      block([R`n_s &= \frac{120(60)}{4} = 1800\ \text{rpm}`, R`s &= \frac{P_2}{P_{ag}} = \frac{550}{${big(X7.Pag, 1)}} = ${fd(X7.s, 5)}`, R`n &= (1 - s)n_s = \boxed{${fd(X7.n, 1)}\ \text{rpm}}`])),
    step(t('<b>Problem 5.8 (c)–(d) แรงบิด</b>: แรงบิดที่พัฒนาได้ใช้ \\(P_{ag}/\\omega_s = P_{mech}/\\omega_m\\) และแรงบิดออกใช้ \\(T_{out} = P_{out}/\\omega_r = 60P_{out}/(2\\pi n_r)\\) (สไลด์หน้า 11)', '<b>Problem 5.8 (c)–(d) The torques</b>: the developed torque is \\(P_{ag}/\\omega_s = P_{mech}/\\omega_m\\), the output torque \\(T_{out} = P_{out}/\\omega_r = 60P_{out}/(2\\pi n_r)\\) (slide p. 11)'),
      block([R`T_d &= \frac{${big(X7.Pag, 1)}}{2\pi(1800)/60} = \boxed{${fd(X7.Td, 2)}\ \text{N}{\cdot}\text{m}}`, R`T_{out} &= \frac{60(${big(X7.Pout, 1)})}{2\pi(${fd(X7.n, 1)})} = \boxed{${fd(X7.Tout, 2)}\ \text{N}{\cdot}\text{m}}`]))],
  ask: () => ({ fields: [num('P<sub>ag</sub> (W) =', X7.Pag, { tol: 3 }), num('η (%) =', 100 * X7.eff, { tol: 0.06 }), num('n (rpm) =', X7.n, { tol: 0.3 }), num('T<sub>out</sub> (N·m) =', X7.Tout, { tol: 0.06 })],
    check: v => near(v[0], X7.Pin - X7.Pst, 3) ? t('ลืมการสูญเสียในแกน 900 W: P. C. Sen หักก่อนถึงช่องอากาศ', 'You left out the 900 W core loss: P. C. Sen takes it off before the air gap.') : near(v[3], X7.Pout / X7.ws, 0.1) ? t('แรงบิดออกใช้ความเร็วจริงของโรเตอร์ \\(\\omega_r\\) ไม่ใช่ \\(\\omega_s\\)', 'The output torque uses the real rotor speed \\(\\omega_r\\), not \\(\\omega_s\\).') : '' }),
  answer: () => t(`(a) ${fd(X7.Pag, 1)} W (b) ${fd(X7.Pmech, 1)} W (c) ${fd(X7.hp, 2)} hp (d) ${fd(100 * X7.eff, 2)} % · 5.8: 1800 rpm, ${fd(X7.n, 1)} rpm, ${fd(X7.Td, 2)} N·m, ${fd(X7.Tout, 2)} N·m · โจทย์ใหม่ของพิมพ์ครั้งที่ 3 ไม่มีในคู่มือเฉลย`, `(a) ${fd(X7.Pag, 1)} W (b) ${fd(X7.Pmech, 1)} W (c) ${fd(X7.hp, 2)} hp (d) ${fd(100 * X7.eff, 2)} % · 5.8: 1800 rpm, ${fd(X7.n, 1)} rpm, ${fd(X7.Td, 2)} N·m, ${fd(X7.Tout, 2)} N·m · new in the 3rd edition, not in the solution manual.`) };

/* P. C. Sen Example 5.4 (b): the per-phase equivalent circuit at full load, on the circuit engine (rms values) */
const X4 = C.ex54, M4 = X4.m, deg = z => Math.atan2(z.im, z.re) / D2R, mag = z => Math.hypot(z.re, z.im);
let SP4A, SP4B;   // built on first use: the load resistance shows "? Ω" until step 1 finds the slip
DEF.ex54 = { ckt: true, spec: k => k >= 1 ? (SP4B || (SP4B = C.eqc({ s: X4.s }))) : (SP4A || (SP4A = C.eqc({ s: X4.s, rlText: '? Ω' }))), solvedAt: 3, pad: 1.3, cktAspM: 0.42, rowAsp: 0.5, wideAt: 1e9, dotSpeed: 85,
  view: { acPeak: false, acPower: true },
  glow: k => k === 1 ? ['R2', 'RL'] : k === 2 ? ['R1', 'X1', 'Xm', 'X2'] : k === 4 ? ['RL'] : null,
  badge: k => k >= 3 ? [[`I1 = ${fd(mag(M4.I1), 2)} A, PF ${fd(M4.pf, 3)}`, `I1 = ${fd(mag(M4.I1), 2)} A, PF ${fd(M4.pf, 3)}`], 'ok'] : [['วงจรสมมูลต่อเฟส', 'per-phase equivalent circuit'], 'wait'],
  side: (ctx, b, bd, k) => { const sh = bd.short; if (k < 3) return CH8.empty(ctx, b, ['ความต้านทาน R′₂(1 − s)/s แทนภาระทางกล: กำลังในตัวนี้ × 3 = กำลังกล', 'the resistance R′₂(1 − s)/s stands for the mechanical load: 3 × its power = the mechanical power']);
    const Im = { re: M4.I1.re - M4.I2.re, im: M4.I1.im - M4.I2.im };
    if (k === 3) return CH8.bars(ctx, b, [{ label: 'I_1', v: mag(M4.I1), color: AMBER, sub: t('สาย', 'line') }, { label: 'I_m', v: mag(Im), color: PURPLE, sub: 'jX_m' }, { label: 'I′_2', v: mag(M4.I2), color: GREEN, sub: t('โรเตอร์', 'rotor') }], { title: sh ? t('กระแส (A)', 'current (A)') : t('กระแสต่อเฟส (A rms)', 'current per phase (A rms)'), fmt: v => fd(v, 2), sub: !sh });
    CH12.flow(ctx, b, { Pin: M4.Pin, short: sh, title: sh ? '' : t('การไหลของกำลัง (สามเฟส)', 'power flow (three phases)'), cols: [CY, PURPLE, ORANGE, GREEN],
      stages: [{ label: ['ทองแดงสเตเตอร์', 'stator copper'], losses: [{ label: '3I²R_1', v: M4.Pst }] }, { label: ['ทองแดงโรเตอร์', 'rotor copper'], losses: [{ label: 'P_2', v: M4.P2, hide: k < 5 }] }, { label: ['การหมุน', 'rotational'], losses: [{ label: 'P_rot', v: 1700 }] }],
      names: ['P_in', 'P_ag', 'P_mech', 'P_out'], hide: [k < 5, false, k < 5, k < 5], eff: k >= 5 }); },
  steps: () => [step(t('<b>สลิปและความต้านทานด้านโรเตอร์</b>: ที่ 1740 rpm สลิปคือ \\(s = 60/1800\\) ด้านโรเตอร์ของวงจรสมมูลคือ \\(R′_2/s\\) ซึ่งแยกได้เป็น \\(R′_2\\) (ความร้อนในโรเตอร์) กับ \\(R′_2(1 - s)/s\\) ที่แทนกำลังกล (P. C. Sen รูป 5.13d)', '<b>The slip and the rotor-side resistance</b>: at 1740 rpm the slip is \\(s = 60/1800\\). The rotor side of the equivalent circuit is \\(R′_2/s\\), split into \\(R′_2\\) (heat in the rotor) and \\(R′_2(1 - s)/s\\), which stands for the mechanical power (P. C. Sen Fig. 5.13d)'),
      block([R`s &= \frac{1800 - 1740}{1800} = ${fd(X4.s, 5)}`, R`\frac{R′_2}{s} &= \frac{0.2}{${fd(X4.s, 5)}} = 6\ \Omega = 0.2 + ${fd(X4.RL, 1)}`]),
      t('P. C. Sen ปัด s เป็น 0.0333 จึงได้ \\(R′_2/s = 6.01\\ \\Omega\\)', 'P. C. Sen rounds s to 0.0333 and gets \\(R′_2/s = 6.01\\ \\Omega\\).')),
    step(t('<b>อิมพีแดนซ์เข้า</b>: \\(jX_m\\) ขนานกับกิ่งโรเตอร์ แล้วอนุกรมกับ \\(R_1 + jX_1\\) (บทที่ 7)', '<b>Input impedance</b>: \\(jX_m\\) in parallel with the rotor branch, in series with \\(R_1 + jX_1\\) (chapter 7)'),
      block([R`Z_p &= \frac{(j30)(6 + j0.5)}{6 + j30.5} = ${fd(M4.Zp.re, 4)} + j${fd(M4.Zp.im, 4)}\ \Omega`, R`Z_1 &= 0.25 + j0.5 + Z_p = \boxed{${fd(mag(M4.Z1), 4)}\angle ${fd(deg(M4.Z1), 2)}^\circ\ \Omega}`])),
    step(t('<b>กระแสสายและตัวประกอบกำลัง</b>: แรงดันต่อเฟส \\(460/\\sqrt3\\) (จุดเริ่มวิ่ง)', '<b>Line current and power factor</b>: the phase voltage is \\(460/\\sqrt3\\) (the dots start)'),
      block([R`I_1 &= \frac{${fd(X4.par.V, 2)}\angle 0^\circ}{${fd(mag(M4.Z1), 4)}\angle ${fd(deg(M4.Z1), 2)}^\circ} = \boxed{${fd(mag(M4.I1), 3)}\angle ${fd(deg(M4.I1), 2)}^\circ\ \text{A}}`, R`\text{PF} &= \cos ${fd(deg(M4.Z1), 2)}^\circ = \boxed{${fd(M4.pf, 4)}\ \text{lagging}}`])),
    step(t('<b>แรงบิด</b>: กระแสโรเตอร์ได้จากตัวแบ่งกระแส (บทที่ 3) กำลังในช่องอากาศคือกำลังใน \\(R′_2/s\\) ทั้งสามเฟส และ \\(T = P_{ag}/\\omega_s\\)', '<b>The torque</b>: the rotor current follows from the current divider (chapter 3); the air-gap power is the power in \\(R′_2/s\\) for all three phases, and \\(T = P_{ag}/\\omega_s\\)'),
      block([R`I′_2 &= I_1\frac{j30}{6 + j30.5} = ${fd(mag(M4.I2), 3)}\ \text{A}`, R`P_{ag} &= 3(${fd(mag(M4.I2), 3)})^2(6) = ${big(M4.Pag, 1)}\ \text{W}`, R`T &= \frac{${big(M4.Pag, 1)}}{188.5} = \boxed{${fd(M4.T, 2)}\ \text{N}{\cdot}\text{m}}`])),
    step(t('<b>กำลังและประสิทธิภาพ</b>: \\(P_2 = sP_{ag}\\), \\(P_{mech} = (1 - s)P_{ag}\\), \\(P_{out} = P_{mech} - P_{rot}\\) และ \\(P_{in} = 3V_1I_1\\cos\\theta\\)', '<b>Powers and efficiency</b>: \\(P_2 = sP_{ag}\\), \\(P_{mech} = (1 - s)P_{ag}\\), \\(P_{out} = P_{mech} - P_{rot}\\) and \\(P_{in} = 3V_1I_1\\cos\\theta\\)'),
      block([R`P_2 &= ${fd(M4.P2, 1)}\ \text{W},\quad P_{mech} = ${big(M4.Pmech, 1)}\ \text{W}`, R`P_{out} &= ${big(M4.Pmech, 1)} - 1700 = ${big(M4.Pout, 1)}\ \text{W}`, R`P_{in} &= 3(${fd(X4.par.V, 2)})(${fd(mag(M4.I1), 3)})(${fd(M4.pf, 4)}) = ${big(M4.Pin, 1)}\ \text{W}`, R`\eta &= \frac{${big(M4.Pout, 1)}}{${big(M4.Pin, 1)}} = \boxed{${fd(100 * M4.Pout / M4.Pin, 2)}\,\%}`]),
      t('P. C. Sen ได้ 87.5 % เพราะปัดตัวประกอบกำลังเป็น 0.94 (\\(P_{in} = 32\\,022\\) W) ประสิทธิภาพภายใน \\(1 - s = 96.7\\,\\%\\) คือส่วนของกำลังในช่องอากาศที่กลายเป็นกำลังกล', 'P. C. Sen gets 87.5 % because it rounds the power factor to 0.94 (\\(P_{in} = 32\\,022\\) W). The internal efficiency \\(1 - s = 96.7\\,\\%\\) is the share of the air-gap power that becomes mechanical power.'))],
  ask: () => ({ fields: [num('|I<sub>1</sub>| (A) =', mag(M4.I1), { tol: 0.1 }), num('PF =', M4.pf, { tol: 0.003 }), num('T (N·m) =', M4.T, { tol: 0.3 }), num('η (%) =', 100 * M4.Pout / M4.Pin, { tol: 0.1 })],
    check: v => near(v[2], 3 * mag(M4.I2) ** 2 * X4.RL / M4.ws, 0.3) ? t('นั่นคือ \\(P_{mech}/\\omega_s\\): แรงบิดใช้ \\(P_{ag}/\\omega_s\\) (หรือ \\(P_{mech}/\\omega_m\\))', 'That is \\(P_{mech}/\\omega_s\\): the torque is \\(P_{ag}/\\omega_s\\) (or \\(P_{mech}/\\omega_m\\)).') : near(v[3], 87.5, 0.05) ? t('87.5 % มาจากการปัด PF เป็น 0.94 ค่าแม่นคือ 87.24 %', '87.5 % comes from rounding the PF to 0.94; the exact value is 87.24 %.') : '' }),
  answer: () => t(`\\(I_1 = ${fd(mag(M4.I1), 2)}\\) A, PF ${fd(M4.pf, 3)} ตามหลัง, T = ${fd(M4.T, 2)} N·m, η = ${fd(100 * M4.Pout / M4.Pin, 2)} % · P. C. Sen Example 5.4(b) ได้ 42.754 A, 0.94, 163.11 N·m, 87.5 % จากการปัดเลขระหว่างทาง`, `\\(I_1 = ${fd(mag(M4.I1), 2)}\\) A, PF ${fd(M4.pf, 3)} lagging, T = ${fd(M4.T, 2)} N·m, η = ${fd(100 * M4.Pout / M4.Pin, 2)} % · P. C. Sen Example 5.4(b) gets 42.754 A, 0.94, 163.11 N·m, 87.5 % from rounding on the way.`) };

CH12.DEF = DEF;
CH12.problem = (n, key, o = {}) => CH12.wire(n, DEF[key], o);
})(window);
