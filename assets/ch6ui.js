/* ch6ui.js — chapter 6 in the problem-by-problem format (rebuilt Oct 2026): sinusoids, effective value and phasors, the phasor
   relations of R, L and C, impedance. Built on ch6.js (plane, waves, Trio, toSine, clock), lesson.js (LS.stepper, LS.step,
   LS.withCol, LS.anim) and ch6_circuits.js (CH6C). Course convention: phasors use the sine reference and peak values.
   1) CH6.LagProb    two sinusoids rewritten one rule at a time into the sine form, then compared (page 6.1)
   2) CH6.PhasorProb one sinusoid ⇄ its phasor and its effective value; or an rms value → peak and peak-to-peak (page 6.2)
   3) CH6.ElemProb   one R, L or C with a given phasor: impedance → Ohm's law → which one leads (page 6.3)
   4) CH6.ZProb      practice 1: Z_AB by reduction stages, with a 1∠0° V test source whose current never changes (page 6.4)
   5) CH6.MeshProb   practice 2: i(t) by mesh analysis and Cramer's rule (page 6.4)
   6) CH6.HwProb     homework: I_s from the given I_C (page 6.4)
   7) CH6.problem    wires one problem section: canvas cv<n>, try-first box ask<n>, stepper st<n>, controls ctl<n>
   Every class has steps (for LS.stepper) and set(k) (what the first k steps have opened); the current dots run only once the
   circuit is solved. */
(function (global) {
'use strict';
const Cx = CK.Cx, cx = Cx.c, COL = CH6.COL, fd = CH6.fd;
const tt = p => (p ? (Array.isArray(p) ? MC.t(p[0], p[1]) : p) : '');
const t = (th, en) => MC.t(th, en);
const block = rows => `\\begin{aligned} ${rows.join(' \\\\ ')} \\end{aligned}`;
const pol = (z, d = 4, ad = 3) => CH6.pol(z, d, ad), rct = (z, d = 4) => CH6.rect(z, d);
const sg = (x, d = 3) => fd(x, d).replace('-', '−');
const bold = name => `\\mathbf{${name[0].toUpperCase()}}${name.slice(1)}`;          // v_1 → \mathbf{V}_1 (the phasor of v_1)
const plain = name => name.replace(/_\{?([^}]*)\}?/, '$1');                          // v_1 → v1 (canvas badges)
const step = (why, tex, note) => LS.step(why, tex, note);
/* V_eff, V_{1,eff}, I_{1,eff} */
const effName = (name, unit) => { const m = /_\{?([^}]*)\}?/.exec(name), L = unit === 'A' ? 'I' : 'V'; return m ? `${L}_{${m[1]},\\text{eff}}` : `${L}_{\\text{eff}}`; };

/* plane on the left and waveforms on the right (stacked on a phone) */
const twoBoxes = (cv, o = {}) => { const W = Math.max(300, Math.floor(cv.parentElement.clientWidth - 12)), B = { W };
  if (o.plane === false) { B.H = Math.round(Math.max(230, Math.min(380, W * 0.5))); B.wv = { x: 0, y: 34, w: W, h: B.H - 34 }; }
  else if (W >= 440) { B.H = Math.round(Math.max(270, Math.min(400, W * 0.5))); const pw = Math.round(W * 0.4); B.pl = { x: 0, y: 34, w: pw, h: B.H - 34 }; B.wv = { x: pw + 6, y: 34, w: W - pw - 6, h: B.H - 34 }; }
  else { const h1 = Math.round(W * 0.74), h2 = Math.round(Math.max(210, W * 0.62)); B.H = 34 + h1 + 6 + h2; B.pl = { x: 0, y: 34, w: W, h: h1 }; B.wv = { x: 0, y: 40 + h1, w: W, h: h2 }; }
  B.ctx = CK.setup(cv, W, B.H); return B; };
const clear = B => { B.ctx.fillStyle = CK.PAL.bg; B.ctx.fillRect(0, 0, B.W, B.H); };

/* =====================================================================================================================
   1) two sinusoids: o = { a, b (signals {A, Atex, fn, w, wTex, ph, name, unit}), colW } */
const RULE = { cos: ['กฎข้อ 1: เปลี่ยน cos เป็น sin ด้วย \\(\\cos x = \\sin(x + 90^\\circ)\\)', 'Rule 1: turn cos into sin with \\(\\cos x = \\sin(x + 90^\\circ)\\)'],
  neg: ['กฎข้อ 2: ทำแอมพลิจูดให้เป็นบวกด้วย \\(-\\sin x = \\sin(x \\pm 180^\\circ)\\) (เลือก ± ที่ทำให้มุมอยู่ในช่วง ±180°)', 'Rule 2: make the amplitude positive with \\(-\\sin x = \\sin(x \\pm 180^\\circ)\\) (pick the ± that keeps the angle within ±180°)'],
  wrap: ['ลดมุมให้อยู่ในช่วง −180° ถึง 180° (บวกหรือลบ 360° ได้ เพราะเป็นมุมเดียวกัน)', 'Bring the angle into −180° to 180° (adding or subtracting 360° gives the same angle)'] };
CH6.RULE = RULE;
const phasorTex = (r, s) => s.Atex ? `${s.Atex}\\angle{${fd(r.ang, 3)}^\\circ}` : CH6.polMA(r.mag, r.ang);
/* the steps that rewrite one signal into the sine form and read its phasor */
const toSineStep = (s, r, noPhasor) => { const why = r.uses.length ? r.uses.map(u => tt(RULE[u])).join(' · ') : t('เป็น sin และแอมพลิจูดเป็นบวกอยู่แล้ว ไม่ต้องแปลง', 'already a sine with a positive amplitude: nothing to change');
  return step(`<b>\\(${s.name}\\)</b>: ${why}`, block([...r.lines, ...(noPhasor ? [] : [`${bold(s.name)} &= ${phasorTex(r, s)}${s.Atex ? '' : `\\ \\text{${s.unit}}`}`])])); };
CH6.toSineStep = toSineStep;
CH6.LagProb = class {
  constructor(cv, o) { this.cv = cv; this.o = o; this.colW = o.colW || 0; this.k = 0; this.clk = CH6.clock({ T: 4 });
    this.ra = CH6.toSine(o.a, o.a.name); this.rb = CH6.toSine(o.b, o.b.name); this.same = Math.abs(o.a.w - o.b.w) < 1e-9 * Math.max(1, o.a.w);
    this.d = CH6.lag(this.ra.ang, this.rb.ang); this.resize(); window.addEventListener('resize', () => this.resize()); LS.anim(cv, dt => this.frame(dt)); }
  get steps() { return this.list || (this.list = LS.withCol(this.colW, () => { const { a, b } = this.o, ra = this.ra, rb = this.rb, A = a.name, B = b.name, out = [toSineStep(a, ra), toSineStep(b, rb)];
    if (!this.same) { out.push(step(t('<b>กฎข้อ 3: ความถี่ต้องเท่ากัน</b>', '<b>Rule 3: the frequencies must be equal</b>'), `\\omega_1 = ${a.wTex ?? fd(a.w)} \\ne \\omega_2 = ${b.wTex ?? fd(b.w)}\\ \\text{rad/s}`,
      t('ความถี่ไม่เท่ากัน มุมต่างจึงเปลี่ยนไปตามเวลา เทียบเฟสกันไม่ได้', 'The frequencies differ, so the angle between them changes with time: the phases cannot be compared'))); return out; }
    out.push(step(t('<b>กฎข้อ 3: ความถี่เท่ากัน</b> จึงเทียบมุมได้', '<b>Rule 3: equal frequencies</b>, so the angles can be compared'), `\\omega_1 = \\omega_2 = ${a.wTex ?? fd(a.w)}\\ \\text{rad/s}`));
    const raw = ra.ang - rb.ang, d = this.d, wrapTxt = Math.abs(raw - d) > 1e-9 ? ` \\equiv ${fd(d, 3)}^\\circ` : '';
    const concl = Math.abs(d) < 1e-9 ? t(`\\(${A}\\) กับ \\(${B}\\) <b>เฟสเดียวกัน</b>`, `\\(${A}\\) and \\(${B}\\) are <b>in phase</b>`)
      : Math.abs(Math.abs(d) - 180) < 1e-9 ? t(`\\(${A}\\) กับ \\(${B}\\) <b>ตรงข้ามเฟส</b> (ต่างกัน 180°)`, `\\(${A}\\) and \\(${B}\\) are in <b>opposite phase</b> (180° apart)`)
      : d > 0 ? t(`<b>\\(${B}\\) ตามหลัง \\(${A}\\) อยู่ ${fd(d, 3)}°</b> หรือพูดว่า \\(${A}\\) นำหน้า \\(${B}\\) อยู่ ${fd(d, 3)}°`, `<b>\\(${B}\\) lags \\(${A}\\) by ${fd(d, 3)}°</b>, or \\(${A}\\) leads \\(${B}\\) by ${fd(d, 3)}°`)
      : t(`<b>\\(${B}\\) ตามหลัง \\(${A}\\) อยู่ ${CH6.num(d)}°</b> ค่าลบแปลว่าจริง ๆ แล้ว \\(${B}\\) <b>นำหน้า</b> \\(${A}\\) อยู่ ${fd(-d, 3)}°`, `<b>\\(${B}\\) lags \\(${A}\\) by ${CH6.num(d)}°</b>: the minus sign means \\(${B}\\) actually <b>leads</b> \\(${A}\\) by ${fd(-d, 3)}°`);
    out.push(step(t('<b>อ่านมุมต่าง</b> จากรูปไซน์ (มุมของตัวแรกลบมุมของตัวที่สอง) สามเหลี่ยมบนกราฟบอกว่าตัวไหนถึงยอดก่อน', '<b>Read the difference</b> from the sine forms (angle of the first minus angle of the second); the triangles on the graph show which peaks first'),
      `\\theta_{${A}} - \\theta_{${B}} = ${fd(ra.ang, 3)}^\\circ - (${fd(rb.ang, 3)}^\\circ) = ${fd(raw, 3)}^\\circ${wrapTxt}`, concl));
    return out; })); }
  set(k) { this.k = k; }
  resize() { this.B = twoBoxes(this.cv); }
  frame(dt) { const B = this.B; if (!B) return; this.clk.tick(dt); clear(B); const ctx = B.ctx, { a, b } = this.o, ra = this.ra, rb = this.rb, n = this.steps.length, k = this.k, gb = a.unit === b.unit ? 'a' : 'b';
    const vecs = []; if (k >= 1) vecs.push({ z: CH6.polar(ra.mag, ra.ang), color: COL.V, label: plain(a.name) }); if (k >= 2) vecs.push({ z: CH6.polar(rb.mag, rb.ang), color: COL.I, label: plain(b.name), g: gb });
    CH6.plane(ctx, B.pl, vecs, { title: k ? t('เฟเซอร์ที่ t = 0 (รูปไซน์)', 'phasors at t = 0 (sine form)') : t('ยังไม่ได้เขียนเฟเซอร์', 'no phasor written yet'), max: gb === 'a' ? { a: Math.max(ra.mag, rb.mag) } : { a: ra.mag, b: rb.mag },
      arcs: k >= n && this.same && vecs.length === 2 ? [{ a: 1, b: 0, color: COL.sig, r: 0.36 }] : [] });
    const unit = s => (s.Atex ? '' : s.unit);
    CH6.waves(ctx, B.wv, [{ mag: ra.mag, ang: ra.ang, color: COL.V, label: plain(a.name), unit: unit(a), peak: k >= n, noValue: !!a.Atex }, { mag: rb.mag, ang: rb.ang, color: COL.I, label: plain(b.name), unit: unit(b), g: gb, peak: k >= n, noValue: !!b.Atex }],
      { now: this.clk.ph, title: t('สัญญาณที่โจทย์ให้ ตาม ωt', 'the given signals against ωt') });
    const d = this.d, A = plain(a.name), Bn = plain(b.name);
    const msg = k >= n && this.same ? (Math.abs(d) < 1e-9 ? t(`${A} กับ ${Bn} เฟสเดียวกัน`, `${A} and ${Bn} in phase`) : d > 0 ? t(`${Bn} ตามหลัง ${A} ${fd(d, 2)}°`, `${Bn} lags ${A} by ${fd(d, 2)}°`) : t(`${Bn} นำหน้า ${A} ${fd(-d, 2)}°`, `${Bn} leads ${A} by ${fd(-d, 2)}°`))
      : t('แปลงเป็นรูปไซน์ก่อน แล้วค่อยเทียบมุม', 'rewrite as sines first, then compare');
    CK.badge(ctx, msg, k >= n ? 'ok' : 'wait'); }
};

/* =====================================================================================================================
   2) one sinusoid. o = { kind: 'toPhasor', s } | { kind: 'toTime', M, ang, w, wTex, name, unit } | { kind: 'rms', Veff, f, name, unit } */
CH6.PhasorProb = class {
  constructor(cv, o) { this.cv = cv; this.o = o; this.colW = o.colW || 0; this.k = 0; this.clk = CH6.clock({ T: 4 });
    if (o.kind === 'toPhasor') { this.r = CH6.toSine(o.s, o.s.name); this.M = this.r.mag; this.ang = this.r.ang; this.w = o.s.w; this.name = o.s.name; this.unit = o.s.unit; }
    else if (o.kind === 'toTime') { this.M = o.M; this.ang = o.ang; this.w = o.w; this.name = o.name; this.unit = o.unit; }
    else { this.M = o.Veff * Math.SQRT2; this.ang = 0; this.w = 2 * Math.PI * o.f; this.name = o.name || 'v'; this.unit = o.unit || 'V'; }
    this.eff = this.M / Math.SQRT2; this.resize(); window.addEventListener('resize', () => this.resize()); LS.anim(cv, dt => this.frame(dt)); }
  get steps() { return this.list || (this.list = LS.withCol(this.colW, () => { const o = this.o, u = this.unit, N = this.name, M = this.M, Mt = fd(M, 4), At = fd(this.ang, 3);
    const effStep = step(t('<b>ค่ายังผล</b> ของคลื่นไซน์คือค่ายอดหารด้วย \\(\\sqrt2\\) (สไลด์หน้า 8)', '<b>The effective value</b> of a sinusoid is the peak divided by \\(\\sqrt2\\) (slide p. 8)'),
      `${effName(N, u)} = \\frac{${Mt}}{\\sqrt2} = \\boxed{${fd(this.eff, 4)}\\ \\text{${u}}}`);
    if (o.kind === 'toPhasor') return [toSineStep(o.s, this.r, true),
      step(t('<b>อ่านเฟเซอร์</b>: ขนาดคือแอมพลิจูด มุมคือมุมเฟสของรูปไซน์ (\\(\\omega\\) ไม่อยู่ในเฟเซอร์)', '<b>Read the phasor</b>: its size is the amplitude and its angle the phase of the sine form (\\(\\omega\\) is not part of the phasor)'),
        `${bold(N)} = \\boxed{${Mt}\\angle{${At}^\\circ}\\ \\text{${u}}}`, t('ลูกศรในภาพคือเฟเซอร์นี้ ความสูงของปลายลูกศรเท่ากับค่าของคลื่นที่ \\(\\omega t = 0\\)', 'The arrow in the drawing is this phasor; the height of its tip equals the value of the wave at \\(\\omega t = 0\\)')), effStep];
    if (o.kind === 'toTime') return [step(t('<b>เขียนฟังก์ชันเวลา</b>: เฟเซอร์ของวิชานี้อ้างอิงฟังก์ชันไซน์และค่ายอด จึงใส่ขนาดเป็นแอมพลิจูดและมุมเป็นมุมเฟส ส่วน \\(\\omega\\) มาจากโจทย์', '<b>Write the time function</b>: this course\'s phasor refers to the sine and the peak value, so the size is the amplitude, the angle is the phase, and \\(\\omega\\) comes from the problem'),
        `${bold(N)} = ${Mt}\\angle{${At}^\\circ} \\;\\Longrightarrow\\; ${N}(t) = \\boxed{${Mt}\\sin(${o.wTex ?? fd(o.w)}t ${this.ang < 0 ? '-' : '+'} ${fd(Math.abs(this.ang), 3)}^\\circ)\\ \\text{${u}}}`), effStep];
    const Vm = this.M, w = this.w;
    return [step(t('<b>ค่ายอด</b>: ตัวเลขที่บอกไฟบ้านคือค่ายังผล คูณด้วย \\(\\sqrt2\\) ได้ค่ายอด', '<b>The peak</b>: the number quoted for the mains is the effective value; multiply by \\(\\sqrt2\\) for the peak'), `V_m = V_{eff}\\sqrt2 = ${o.Veff}\\sqrt2 = \\boxed{${fd(Vm, 2)}\\ \\text{V}}`),
      step(t('<b>ค่ายอดถึงยอด</b> คือระยะจากยอดบวกถึงยอดลบ', '<b>The peak-to-peak value</b> is the distance from the positive to the negative peak'), `V_{p\\text{-}p} = 2V_m = 2(${fd(Vm, 2)}) = \\boxed{${fd(2 * Vm, 2)}\\ \\text{V}}`),
      step(t('<b>ฟังก์ชันเวลา</b>: ความถี่เชิงมุมจาก \\(\\omega = 2\\pi f\\) (สไลด์หน้า 3)', '<b>The time function</b>: the angular frequency from \\(\\omega = 2\\pi f\\) (slide p. 3)'),
        block([`\\omega &= 2\\pi f = 2\\pi(${o.f}) = ${fd(w, 2)}\\ \\text{rad/s}`, `v(t) &= \\boxed{${fd(Vm, 2)}\\sin(${fd(w, 2)}t)\\ \\text{V}}`]),
        t(`คาบ \\(T = 1/f = ${fd(1000 / o.f, 3)}\\) ms ดูแกนเวลาใต้กราฟ`, `The period is \\(T = 1/f = ${fd(1000 / o.f, 3)}\\) ms; see the time axis under the graph`))]; })); }
  set(k) { this.k = k; }
  resize() { this.B = twoBoxes(this.cv, { plane: this.o.kind !== 'rms' }); }
  frame(dt) { const B = this.B; if (!B) return; this.clk.tick(dt); clear(B); const ctx = B.ctx, o = this.o, k = this.k, n = this.steps.length, N = plain(this.name), u = this.unit;
    if (B.pl) { const show = o.kind === 'toTime' || k >= 2; CH6.plane(ctx, B.pl, show ? [{ z: CH6.polar(this.M, this.ang), color: COL.sig, label: `${N.toUpperCase()} = ${fd(this.M, 3)} ∠ ${sg(this.ang, 2)}°` }] : [],
      { title: show ? t('เฟเซอร์ (ค่ายอด, รูปไซน์)', 'phasor (peak, sine form)') : t('ยังไม่ได้เขียนเฟเซอร์', 'no phasor written yet'), max: { a: this.M } }); }
    const wave = o.kind !== 'toTime' || k >= 1;
    const wv = CH6.waves(ctx, B.wv, wave ? [{ mag: this.M, ang: this.ang, color: COL.sig, label: N, unit: u, peak: o.kind === 'rms' ? k >= 1 : k >= n }] : [],
      { now: this.clk.ph, w: o.kind === 'rms' && k >= 3 ? this.w : undefined, max: { a: this.M * (o.kind === 'rms' ? 1.2 : 1) }, title: wave ? t(`${N}(t) ตาม ωt`, `${N}(t) against ωt`) : t('ยังไม่ได้เขียนฟังก์ชันเวลา', 'no time function written yet') });
    /* a level line with its tag placed over a trough of the curve (tag above the line) or a crest (below the axis), clear of the curve */
    const at = (top, last) => { const d0 = (((top ? 270 : 90) - this.ang) % 360 + 360) % 360, ds = [d0, d0 + 360].filter(d => d <= 720); return ds[last ? ds.length - 1 : 0]; };
    const hl = (v, col, txt, dash, d) => { const y = wv.Y(v, 'a'); ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = 1.6; ctx.setLineDash(dash || [6, 4]); ctx.beginPath(); ctx.moveTo(wv.x0, y); ctx.lineTo(wv.x0 + wv.pw, y); ctx.stroke(); ctx.restore();
      if (txt) CH6.tag(ctx, txt, Math.max(wv.x0 + 70, Math.min(wv.x0 + wv.pw - 70, wv.X(d))), y - 12, col, { size: 12 }); };
    if (wave && (o.kind === 'rms' || k >= n)) hl(this.eff, COL.ref, `${o.kind === 'rms' ? 'V' : N.toUpperCase()}_eff = ${fd(this.eff, 3)} ${u}`, null, at(true, true));
    if (o.kind === 'rms') { if (k >= 1) { hl(this.M, COL.V, `V_m = ${fd(this.M, 1)} V`, [2, 3], at(true, false)); hl(-this.M, COL.V, `−V_m`, [2, 3], at(false, true)); }
      if (k >= 2) { const x = wv.x0 + wv.pw * 0.08, y1 = wv.Y(this.M, 'a'), y2 = wv.Y(-this.M, 'a'); CH6.arrow(ctx, x, (y1 + y2) / 2, x, y1 + 2, COL.orange, 2); CH6.arrow(ctx, x, (y1 + y2) / 2, x, y2 - 2, COL.orange, 2);
        CH6.tag(ctx, `V_{p-p} = ${fd(2 * this.M, 1)} V`, x + 8, (y1 + y2) / 2 + 14, COL.orange, { align: 'left', size: 12 }); } }
    CK.badge(ctx, k >= n ? t('เสร็จแล้ว: เทียบค่าในภาพกับคำตอบ', 'done: compare the drawing with the answer') : t('▶ เล่นช้า: 1 รอบใช้ 4 วินาที', '▶ slow motion: one cycle per 4 s'), k >= n ? 'ok' : 'wait'); }
};

/* =====================================================================================================================
   3) one element. o = { el: 'R'|'L'|'C', value (Ω, H or F), w, given: 'V'|'I', M, ang, sub (subscript of the names, e.g. 'R'),
                         Ztex (the impedance as the class gave it, e.g. 'j2': the first step starts from it), unitI ('mA' to draw i in mA) } */
CH6.ElemProb = class {
  constructor(cv, o) { this.cv = cv; this.o = o; this.colW = o.colW || 0; this.k = 0;
    const el = o.el, Z = el === 'R' ? cx(o.value, 0) : el === 'L' ? cx(0, o.w * o.value) : cx(0, -1 / (o.w * o.value)); this.Z = Z;
    const G = CH6.polar(o.M, o.ang); this.G = G; this.U = o.given === 'I' ? Cx.mul(Z, G) : Cx.div(G, Z);   // the unknown phasor
    this.V = o.given === 'V' ? G : this.U; this.I = o.given === 'I' ? G : this.U;
    const part = el === 'R' ? { id: 'X', type: 'R', value: o.value, name: 'R', valText: `${fd(o.value, 3)} Ω` } : el === 'L' ? { id: 'X', type: 'L', value: o.value, name: `L = ${fd(o.value, 3)} H`, valText: `j${fd(Z.im, 3)} Ω` }
      : { id: 'X', type: 'C', value: o.value, name: `C = ${fd(o.value, 4)} F`, valText: `−j${fd(-Z.im, 3)} Ω` };
    const src = o.given === 'V' ? { id: 'src', type: 'VAC', a: 's', b: 'g', amp: o.M, phase: o.ang, name: `V_${o.sub}`, valText: `${fd(o.M, 3)}∠${sg(o.ang, 2)}° V`, side: -1 }
      : { id: 'src', type: 'IAC', a: 'g', b: 's', amp: o.M, phase: o.ang, name: `I_${o.sub}`, valText: `${fd(o.M, 3)}∠${sg(o.ang, 2)}° A`, side: -1 };
    const self = this;
    this.T = new CH6.Trio(cv, { T: 4, mid: true, midMin: 400, cktFrac: 0.5,
      vecs: () => { const out = []; const gV = { z: self.V, color: COL.V, label: `V_${o.sub}` }, gI = { z: self.I, color: COL.I, label: `I_${o.sub}`, g: 'i' };
        if (o.given === 'V' || self.solved) out.push(gV); if (o.given === 'I' || self.solved) out.push(gI); return out; },
      planeOpts: () => ({ arcs: self.k >= self.steps.length && el !== 'R' ? [{ a: 1, b: 0, color: COL.sig, r: 0.34 }] : [] }),   // from I (index 1) to V (index 0)
      sigs: () => { const out = [], sV = { mag: Cx.abs(self.V), ang: CH6.deg(self.V), color: COL.V, label: `v_${o.sub}`, unit: 'V', peak: self.k >= self.steps.length },
        sI = { mag: Cx.abs(self.I) * (o.unitI === 'mA' ? 1000 : 1), ang: CH6.deg(self.I), color: COL.I, label: `i_${o.sub}`, unit: o.unitI || 'A', g: 'i', peak: self.k >= self.steps.length };
        if (o.given === 'V' || self.solved) out.push(sV); if (o.given === 'I' || self.solved) out.push(sI); return out; },
      after: v => { const p = v.ckt.part('X'); v.polarity(p, 'e', { side: 'L', text: `v_${o.sub}`, color: COL.V }); v.refArrow(p, 'e', `i_${o.sub}`, { side: 'R', color: COL.I, at: 0.16, off: 0.42 }); },
      badge: () => self.solved ? [t('แก้แล้ว: กระแสไหล', 'solved: the current flows'), 'ok'] : [t('ยังไม่ได้หาค่าที่ถาม', 'the unknown is not found yet'), 'wait'],
      waveTitle: tr => tr.box.wave && tr.box.wave.w < 340 ? ['v(t) และ i(t)', 'v(t) and i(t)'] : ['v(t) และ i(t) (แต่ละเส้นใช้สเกลของตัวเอง)', 'v(t) and i(t) (each on its own scale)'] });
    this.T.resize(); this.T.set({ ground: 'g', mode: 'ac', w: o.w, nodes: { s: [0, 0], e: [3.2, 0], g: [0, 3], h: [3.2, 3] }, parts: [src, { type: 'W', a: 's', b: 'e' }, { ...part, a: 'e', b: 'h', side: 1, labelOff: 0.95 }, { type: 'W', a: 'h', b: 'g' }] });
    window.addEventListener('resize', () => this.T.resize()); LS.anim(cv, dt => { this.T.view.o.dots = this.solved; this.T.view.o.tips = this.solved; this.T.frame(dt); }); }
  get solved() { return this.k >= 2; }
  get steps() { return this.list || (this.list = LS.withCol(this.colW, () => { const o = this.o, Z = this.Z, s = o.sub, el = o.el, zp = `${fd(Cx.abs(Z), 4)}\\angle{${fd(CH6.deg(Z), 0)}^\\circ}`;
    const zTex = el === 'R' ? `Z_R = R = ${fd(o.value, 4)}\\ \\Omega` : el === 'L' ? `Z_L = j\\omega L = j(${fd(o.w)})(${fd(o.value)}) = j${fd(Z.im, 4)}\\ \\Omega = ${zp}\\ \\Omega`
      : `Z_C = \\frac{-j}{\\omega C} = \\frac{-j}{(${fd(o.w)})(${fd(o.value)})} = -j${fd(-Z.im, 4)}\\ \\Omega = ${zp}\\ \\Omega`;
    const zWhy = el === 'R' ? t('<b>อิมพีแดนซ์ของตัวต้านทาน</b> คือความต้านทานเอง ไม่ขึ้นกับความถี่ (มุม 0°)', '<b>The impedance of a resistor</b> is just its resistance, whatever the frequency (angle 0°)')
      : el === 'L' ? t('<b>อิมพีแดนซ์ของตัวเหนี่ยวนำ</b> \\(j\\omega L\\) (สไลด์หน้า 11): ขนาด \\(\\omega L\\) มุม +90°', '<b>The impedance of an inductor</b> \\(j\\omega L\\) (slide p. 11): size \\(\\omega L\\), angle +90°')
      : t('<b>อิมพีแดนซ์ของตัวเก็บประจุ</b> \\(1/(j\\omega C) = -j/(\\omega C)\\) (สไลด์หน้า 12): ขนาด \\(1/(\\omega C)\\) มุม −90°', '<b>The impedance of a capacitor</b> \\(1/(j\\omega C) = -j/(\\omega C)\\) (slide p. 12): size \\(1/(\\omega C)\\), angle −90°');
    const G = this.G, U = this.U, gp = `${fd(o.M, 4)}\\angle{${fd(o.ang, 3)}^\\circ}`;
    const ohm = o.given === 'I' ? `\\mathbf{V}_{${s}} = Z_{${s}}\\,\\mathbf{I}_{${s}} = (${zp})(${gp}) = \\boxed{${pol(U)}\\ \\text{V}}` : `\\mathbf{I}_{${s}} = \\frac{\\mathbf{V}_{${s}}}{Z_{${s}}} = \\frac{${gp}}{${zp}} = \\boxed{${pol(U)}\\ \\text{A}}`;
    const dAng = CH6.wrap(CH6.deg(this.V) - CH6.deg(this.I));
    const concl = el === 'R' ? t('<b>เฟสเดียวกัน</b>: แรงดันกับกระแสถึงยอดพร้อมกัน', '<b>In phase</b>: the voltage and the current peak together')
      : el === 'L' ? t(`<b>\\(\\mathbf{V}_{${s}}\\) นำหน้า \\(\\mathbf{I}_{${s}}\\) อยู่ 90°</b> (กระแสตามหลังแรงดัน)`, `<b>\\(\\mathbf{V}_{${s}}\\) leads \\(\\mathbf{I}_{${s}}\\) by 90°</b> (the current lags the voltage)`)
      : t(`<b>\\(\\mathbf{I}_{${s}}\\) นำหน้า \\(\\mathbf{V}_{${s}}\\) อยู่ 90°</b> (แรงดันตามหลังกระแส)`, `<b>\\(\\mathbf{I}_{${s}}\\) leads \\(\\mathbf{V}_{${s}}\\) by 90°</b> (the voltage lags the current)`);
    const zStep = o.Ztex ? step(t(`<b>อิมพีแดนซ์ที่โจทย์ให้</b> เขียนในรูปเชิงขั้ว: \\(j = 1\\angle 90^\\circ\\) และ \\(-j = 1\\angle{-90^\\circ}\\) (ในห้องเขียน \\(X_${el} = ${o.Ztex}\\ \\Omega\\))`, `<b>The impedance given</b>, in polar form: \\(j = 1\\angle 90^\\circ\\) and \\(-j = 1\\angle{-90^\\circ}\\) (the class wrote \\(X_${el} = ${o.Ztex}\\ \\Omega\\))`),
        `Z_${s} = ${o.Ztex}\\ \\Omega = ${zp}\\ \\Omega`, t(`ถ้าโจทย์ให้ค่าอุปกรณ์กับความถี่แทน: \\(${zTex}\\) (ภาพจำลองใช้ค่านี้)`, `Had the problem given the element and the frequency instead: \\(${zTex}\\) (the simulation uses these values)`)) : step(zWhy, zTex);
    return [zStep,
      step(o.given === 'I' ? t('<b>กฎของโอห์มแบบเฟเซอร์</b>: คูณในรูปเชิงขั้ว (ขนาดคูณกัน มุมบวกกัน)', '<b>Ohm\'s law for phasors</b>: multiply in polar form (sizes multiply, angles add)') : t('<b>กฎของโอห์มแบบเฟเซอร์</b>: หารในรูปเชิงขั้ว (ขนาดหารกัน มุมลบกัน)', '<b>Ohm\'s law for phasors</b>: divide in polar form (sizes divide, angles subtract)'), ohm,
        t('เมื่อหาค่าได้แล้ว จุดในสายไฟเริ่มวิ่ง และกราฟของค่าที่หาได้ขึ้นมา', 'With the unknown found, the dots in the wire start and its graph appears')),
      step(t('<b>เทียบมุม</b>: มุมของ V ลบมุมของ I คือมุมของ Z เสมอ', '<b>Compare the angles</b>: the angle of V minus the angle of I is always the angle of Z'), `\\theta_V - \\theta_I = ${fd(CH6.deg(this.V), 3)}^\\circ - (${fd(CH6.deg(this.I), 3)}^\\circ) = ${fd(dAng, 3)}^\\circ = \\angle Z_{${s}}`, concl)]; })); }
  set(k) { this.k = k; }
};

/* =====================================================================================================================
   4) practice 1 (slide p. 17): Z_AB of the ladder at 5 rad/s, by reduction; a 1∠0° V test source (grey, not part of the problem)
      drives terminals AB, so the same current flowing at every stage shows that each smaller circuit is equivalent */
CH6.ZProb = class {
  constructor(cv, o) { this.cv = cv; this.o = o; this.colW = o.colW || 0; this.k = 0; this.P = global.CH6C.p1; this.st = -1; this.clk = CH6.clock({ T: 4 }); this.Itest = Cx.inv(this.P.Zab);
    this.resize(); window.addEventListener('resize', () => this.resize()); LS.anim(cv, dt => this.frame(dt)); }
  stageOf(k) { return Math.max(0, Math.min(3, k - 1)); }
  build() { const P = this.P, i = this.stageOf(this.k), st = P.stages[i]; this.st = i; let spec = { ...st, nodes: { ...st.nodes }, parts: st.parts.map(p => ({ ...p })) };
    if (this.narrow) { spec = CH6.shortLabels(spec, 1.15); spec.parts.forEach(p => { if (p.id === 'R6') p.side = 1; });
      if (spec.nodes._padR) spec.nodes._padR = [spec.nodes._padR[0] + 0.7, spec.nodes._padR[1]]; }   // long Z values at the right edge (a phone font is wider than 0.31 units a letter)
    else if (spec.parts.some(p => p.id === 'Za' || p.id === 'Zb')) spec.nodes._padR = [5.5 + 2.6, 1.5];   // room for the name and value of Z_a, Z_b at the right edge
    this.ckt = new CK.Circuit(spec); this.ckt.solve();
    this.view = new CK.View(this.cv, this.ckt, { speed: 95 / Cx.abs(this.Itest), ground: false, showI: false, pad: 1.15, tips: false, acPeak: true, acTime: () => this.clk.at(P.w), dotRef: Cx.abs(this.Itest),
      glowColor: 'rgba(255,126,182,.4)' });
    if (this.ctx) { this.view.ctx = this.ctx; this.view.fit(this.box); } }
  set(k) { this.k = k; if (this.stageOf(k) !== this.st) this.build(); }
  resize() { const W = Math.max(300, Math.floor(this.cv.parentElement.clientWidth - 12)), H = Math.round(Math.max(240, Math.min(400, W * (W >= 600 ? 0.46 : 0.72)))), nw = W < 600;
    this.W = W; this.H = H; this.box = { x: 0, y: 58, w: W, h: H - 62 }; this.ctx = CK.setup(this.cv, W, H); if (nw !== this.narrow || !this.view) { this.narrow = nw; this.build(); } else { this.view.ctx = this.ctx; this.view.fit(this.box); } }
  frame(dt) { if (!this.ctx || !this.view) return; this.clk.tick(dt); const ctx = this.ctx, v = this.view, n = 4, done = this.k >= n; ctx.fillStyle = CK.PAL.bg; ctx.fillRect(0, 0, this.W, this.H);
    v.o.tips = done; const grp = this.P.stages[this.st].group; v.o.glow = this.k >= 1 && this.k < 4 && grp ? new Set(grp) : null; if (this.clk.run) v.advance(dt); v.draw();
    const r = Math.max(4, v.u * 0.1); [['A', 'A'], ['B', 'B']].forEach(([nd, l]) => { const [x, y] = v.P(nd); ctx.save(); ctx.fillStyle = '#0f1220'; ctx.strokeStyle = '#e8ecf7'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, r, 0, 2 * Math.PI); ctx.fill(); ctx.stroke(); ctx.restore();
      CH6.text(ctx, l, x + v.u * 0.3, y + (l === 'A' ? -1 : 1) * v.u * 0.3, { color: '#e8ecf7', size: Math.max(13, v.u * 0.34), weight: '700' }); });
    (this.P.stages[this.st].born || []).forEach(id => { const p = this.ckt.part(id); if (!p || this.k < 2) return; const A = v.P(p.a), B = v.P(p.b); CH6.tag(ctx, t('ใหม่', 'new'), (A[0] + B[0]) / 2 - v.u * 0.5, (A[1] + B[1]) / 2, COL.ref, { align: 'right', size: 12 }); });
    const cur = done ? CH6.polTxt(this.Itest, 'A', 4, 2) : '?';
    CH6.text(ctx, t(`กระแสทดสอบ = ${cur} (เท่ากันทุกขั้น)`, this.W < 520 ? `I_test = ${cur} (every stage)` : `test current = ${cur} (the same at every stage)`), 10, 48, { align: 'left', color: COL.I, size: 13, weight: '700' });
    CK.badge(ctx, this.k ? t(`ขั้นที่ ${this.k} จาก ${n}`, `step ${this.k} of ${n}`) : t('วงจรเดิม + แหล่งจ่ายทดสอบ 1∠0° V', 'the original circuit + a 1∠0° V test source'), done ? 'ok' : 'wait'); }
  get steps() { return this.list || (this.list = LS.withCol(this.colW, () => { const P = this.P, num = Cx.mul(cx(10, 0), P.Zb), den = Cx.add(cx(10, 0), P.Zb);
    return [step(t('<b>แปลงอุปกรณ์ทุกตัวเป็นอิมพีแดนซ์</b> ที่ \\(\\omega = 5\\) rad/s (ตัวต้านทานเหมือนเดิม) แล้วเขียนลำดับการรวมแบบในห้อง: 6 Ω กับ \\(Z_{C2}\\) ต่อคร่อมโนดคู่เดียวกันจึงขนานกัน', '<b>Turn every element into an impedance</b> at \\(\\omega = 5\\) rad/s (resistors stay the same), then write the order of combination as the class did: 6 Ω and \\(Z_{C2}\\) sit across the same pair of nodes, so they are in parallel'),
        block([`Z_{C1} &= \\frac{-j}{\\omega C_1} = \\frac{-j}{(5)(200\\times 10^{-3})} = -j1\\ \\Omega`, `Z_{L1} &= j\\omega L_1 = j(5)(2) = j10\\ \\Omega`, `Z_{C2} &= \\frac{-j}{\\omega C_2} = \\frac{-j}{(5)(500\\times 10^{-3})} = -j0.4\\ \\Omega`, `Z_{AB} &= [(Z_{C2} \\parallel 6) + Z_{C1} + Z_{L1}] \\parallel 10`])),
      step(t('<b>6 Ω ขนานกับ \\(-j0.4\\ \\Omega\\)</b>: ผลคูณหารผลบวก แล้วคูณเศษและส่วนด้วยคอนจูเกตของส่วน', '<b>6 Ω in parallel with \\(-j0.4\\ \\Omega\\)</b>: product over sum, then multiply top and bottom by the conjugate of the bottom'),
        block([`Z_a &= \\frac{(6)(-j0.4)}{6 - j0.4} = \\frac{-j2.4}{6 - j0.4}\\cdot\\frac{6 + j0.4}{6 + j0.4} = \\frac{0.96 - j14.4}{36.16}`, `&= \\boxed{${rct(P.Za)}\\ \\Omega}`])),
      step(t('<b>\\(Z_a\\), \\(Z_{C1}\\) และ \\(Z_{L1}\\) อนุกรมกัน</b> (กระแสเดียวกันไหลผ่าน): บวกส่วนจริงกับส่วนจริง ส่วนจินตภาพกับส่วนจินตภาพ', '<b>\\(Z_a\\), \\(Z_{C1}\\) and \\(Z_{L1}\\) are in series</b> (one current through all three): add real to real and imaginary to imaginary'),
        block([`Z_b &= Z_a + Z_{C1} + Z_{L1} = (${rct(P.Za)}) + (-j1) + (j10)`, `&= \\boxed{${rct(P.Zb)}\\ \\Omega}`])),
      step(t('<b>10 Ω ขนานกับ \\(Z_b\\)</b>: หารในรูปเชิงขั้ว (ขนาดหาร มุมลบ)', '<b>10 Ω in parallel with \\(Z_b\\)</b>: divide in polar form (sizes divide, angles subtract)'),
        block([`Z_{AB} &= \\frac{(10)(${rct(P.Zb)})}{10 + ${rct(P.Zb)}} = \\frac{${rct(num)}}{${rct(den)}} = \\frac{${pol(num)}}{${pol(den)}}`, `&= \\boxed{${rct(P.Zab)}\\ \\Omega} = ${pol(P.Zab)}\\ \\Omega`]),
        t('ส่วนจินตภาพเป็นบวก <b>วงจรนี้จึงเป็นแบบตัวเหนี่ยวนำที่ 5 rad/s</b> และกระแสทดสอบ \\(1\\angle 0^\\circ / Z_{AB}\\) เท่ากันทุกขั้น', 'The imaginary part is positive, so <b>the network is inductive at 5 rad/s</b>, and the test current \\(1\\angle 0^\\circ / Z_{AB}\\) is the same at every stage'))]; })); }
};

/* =====================================================================================================================
   5) practice 2 (slide p. 18): vs = 40 sin 3000t V; mesh analysis with Cramer's rule, then i(t) */
CH6.MeshProb = class {
  constructor(cv, o) { this.cv = cv; this.o = o; this.colW = o.colW || 0; this.k = 0; this.P = global.CH6C.p2; const self = this;
    this.T = new CH6.Trio(cv, { T: 4, mid: true, midMin: 400, cktAspM: 0.55, pad: 1.65,
      vecs: tr => { const c = tr.ckt, out = [{ z: cx(40, 0), color: COL.V, label: 'V_s' }]; if (self.solved) out.push({ z: c.I('R1'), color: COL.I, label: 'I_1', g: 'i' }, { z: c.I('C'), color: COL.purple, label: 'I_2', g: 'i' }); return out; },
      planeOpts: () => ({ arcs: self.solved ? [{ a: 1, b: 0, color: COL.sig, r: 0.36, text: '36.87°' }] : [] }),
      sigs: tr => { const I = tr.ckt.I('R1'), out = [{ mag: 40, ang: 0, color: COL.V, label: 'v_s', unit: 'V', peak: self.solved }]; if (self.solved) out.push({ mag: Cx.abs(I) * 1000, ang: CH6.deg(I), color: COL.I, label: 'i', unit: 'mA', g: 'i', peak: true }); return out; },
      after: (v, tr) => { const y = tr.narrow ? 2.15 : 1.5, r = tr.narrow ? 0.42 : 0.58; v.meshLoop(1.8, y, r, { label: 'I_1', value: '= i', color: COL.purple, spin: null }); v.meshLoop(6.0, y, r, { label: 'I_2', color: COL.purple, spin: null }); },
      badge: () => self.solved ? [t('แก้ระบบสมการแล้ว: กระแสไหล', 'system solved: the current flows'), 'ok'] : [t('ยังไม่ได้แก้ระบบสมการ', 'the system is not solved yet'), 'wait'],
      waveTitle: ['vₛ(t) และ i(t)', 'vₛ(t) and i(t)'] });
    this.T.resize(); this.T.set(this.P.spec); window.addEventListener('resize', () => this.T.resize()); LS.anim(cv, dt => { this.T.view.o.dots = this.solved; this.T.view.o.tips = this.solved; this.T.frame(dt); }); }
  get solved() { return this.k >= 4; }
  set(k) { this.k = k; }
  get steps() { return this.list || (this.list = LS.withCol(this.colW, () => { const P = this.P, M = t('เมช', 'mesh');
    return [step(t('<b>เฟเซอร์ของแหล่งจ่ายและอิมพีแดนซ์</b> ที่ \\(\\omega = 3000\\) rad/s', '<b>The source phasor and the impedances</b> at \\(\\omega = 3000\\) rad/s'),
        block([`v_s(t) &= 40\\sin 3000t\\ \\text{V} \\;\\Longrightarrow\\; \\mathbf{V}_s = 40\\angle 0^\\circ\\ \\text{V}`, `Z_L &= j\\omega L = j(3000)\\left(\\tfrac13\\right) = j1000\\ \\Omega`, `Z_C &= \\frac{-j}{\\omega C} = \\frac{-j}{(3000)\\left(\\tfrac16\\times 10^{-6}\\right)} = -j2000\\ \\Omega`])),
      step(t('<b>กฎแรงดันของเคียร์ชอฟฟ์ (Kirchhoff\'s voltage law, KVL) รอบเมชทั้งสอง</b> ตามเข็มนาฬิกา ตัวเหนี่ยวนำอยู่ร่วมกันจึงมีกระแส \\(\\mathbf{I}_1 - \\mathbf{I}_2\\)', '<b>Kirchhoff\'s voltage law (KVL) round both meshes</b>, clockwise; the inductor is shared, so it carries \\(\\mathbf{I}_1 - \\mathbf{I}_2\\)'),
        block([`\\text{${M} 1:}\\ \\ -40\\angle 0^\\circ + 1500\\,\\mathbf{I}_1 + j1000(\\mathbf{I}_1 - \\mathbf{I}_2) &= 0`, `(1500 + j1000)\\,\\mathbf{I}_1 - j1000\\,\\mathbf{I}_2 &= 40\\angle 0^\\circ \\quad (1)`, `\\text{${M} 2:}\\ \\ 1000\\,\\mathbf{I}_2 - j2000\\,\\mathbf{I}_2 + j1000(\\mathbf{I}_2 - \\mathbf{I}_1) &= 0`, `-j1000\\,\\mathbf{I}_1 + (1000 - j1000)\\,\\mathbf{I}_2 &= 0 \\quad (2)`])),
      step(t('<b>กฎของคราเมอร์</b> กับสัมประสิทธิ์เชิงซ้อน (หน้า 1.4)', '<b>Cramer\'s rule</b> with complex coefficients (page 1.4)'),
        block([`\\Delta &= (1500 + j1000)(1000 - j1000) - (-j1000)^2`, `&= (2\\,500\\,000 - j500\\,000) + 1\\,000\\,000 = 3\\,500\\,000 - j500\\,000`, `\\Delta_1 &= (40)(1000 - j1000) - (-j1000)(0) = 40\\,000 - j40\\,000`, `\\Delta_2 &= (1500 + j1000)(0) - (40)(-j1000) = j40\\,000`])),
      step(t('<b>หารในรูปเชิงขั้ว</b> แล้วแปลงกลับเป็นฟังก์ชันไซน์', '<b>Divide in polar form</b>, then turn it back into a sinusoid'),
        block([`\\mathbf{I}_1 &= \\frac{\\Delta_1}{\\Delta} = \\frac{${pol(P.D1, 1, 3)}}{${pol(P.D, 1, 3)}} = \\boxed{${pol(P.I1, 4, 3)}\\ \\text{A}}`, `i(t) &= \\boxed{16\\sin(3000t - 36.87^\\circ)\\ \\text{mA}}`]),
        t('กระแสตามหลังแรงดันของแหล่งจ่าย 36.87° เพราะวงจรที่แหล่งจ่ายเห็นเป็นแบบตัวเหนี่ยวนำ', 'The current lags the source voltage by 36.87°, because the circuit the source sees is inductive')),
      step(t('<b>ตรวจด้วยวิธีที่สั้นกว่า</b>: อิมพีแดนซ์สมมูลที่แหล่งจ่ายมองเห็น (อนุกรม–ขนาน)', '<b>Check with a shorter route</b>: the equivalent impedance the source sees (series–parallel)'),
        block([`Z_{eq} &= 1500 + j1000 \\parallel (1000 - j2000) = 1500 + ${rct(P.Zp)}`, `&= ${rct(P.Zeq)} = ${pol(P.Zeq, 1, 2)}\\ \\Omega`, `\\mathbf{I} &= \\frac{40\\angle 0^\\circ}{${pol(P.Zeq, 1, 2)}} = ${pol(P.I1, 4, 2)}\\ \\text{A}`]))]; })); }
};

/* =====================================================================================================================
   6) homework (slide p. 20): I_C = 2∠28° A at ω = 2 rad/s; the right-hand part fixes I_s whatever V_s is (slider in ctl<n>) */
CH6.HwProb = class {
  constructor(cv, o) { this.cv = cv; this.o = o; this.colW = o.colW || 0; this.k = 0; this.H = global.CH6C.hw; this.Vs = 5; const self = this;
    this.T = new CH6.Trio(cv, { T: 4, mid: true, midMin: 400, cktAspM: 0.55, pad: 1.6,
      vecs: tr => { const c = tr.ckt, IR2 = c.I('R2'), IC = c.I('C'), k = self.k, out = [];
        if (k >= 4) out.push({ z: IR2, color: COL.V, label: 'I_{R2}' }, { z: IC, from: IR2, color: COL.purple, label: 'I_C', lmid: -1 }, { z: Cx.add(IR2, IC), color: COL.I, label: 'I_s', w: 3.6 });
        else { out.push({ z: IC, color: COL.purple, label: 'I_C' }); if (k >= 2) out.push({ z: c.Vab('C'), color: COL.ref, label: 'V_C', g: 'v' }); if (k >= 3) out.push({ z: IR2, color: COL.V, label: 'I_{R2}' }); }
        return out; },
      sigs: tr => { const c = tr.ckt, IR2 = c.I('R2'), IC = c.I('C'), Is = Cx.add(IR2, IC), out = [{ mag: Cx.abs(IC), ang: CH6.deg(IC), color: COL.purple, label: 'i_C', unit: 'A' }];
        if (self.k >= 3) out.unshift({ mag: Cx.abs(IR2), ang: CH6.deg(IR2), color: COL.V, label: 'i_{R2}', unit: 'A' }); if (self.k >= 4) out.push({ mag: Cx.abs(Is), ang: CH6.deg(Is), color: COL.I, label: 'i_s', unit: 'A', w: 3, peak: true }); return out; },
      after: v => { const c = v.ckt; v.refArrow(c.part('R2'), 'r', 'I_{R2}', { side: 'L', color: COL.V, off: 0.5, at: 0.3 }); v.refArrow(c.part('C'), 'c', 'I_C', { side: 'R', color: COL.purple, off: 0.5, at: 0.18 }); v.polarity(c.part('C'), 'c', { side: 'L', text: 'V_C', color: COL.ref, off: 0.45 }); },
      badge: () => self.k >= 4 ? [t('ได้ Iₛ แล้ว: กระแสไหล', 'Iₛ found: the current flows'), 'ok'] : [t('ยังไม่ได้หา Iₛ', 'Iₛ not found yet'), 'wait'],
      waveTitle: ['iₛ = i_R2 + i_C ทุกขณะ', 'iₛ = i_R2 + i_C at every instant'] });
    this.T.resize(); this.T.set(this.H.spec(this.Vs)); window.addEventListener('resize', () => this.T.resize()); LS.anim(cv, dt => { const on = this.k >= 4; this.T.view.o.dots = on; this.T.view.o.tips = on; this.T.frame(dt); }); }
  set(k) { this.k = k; }
  controls(el) { MC.ui.slider(el, { id: el.id + '_vs', label: t('V<sub>s</sub> (โจทย์ไม่ได้ให้)', 'V<sub>s</sub> (not given)'), min: 0, max: 10, step: 0.5, value: this.Vs, fmt: v => `${fd(v, 1)}∠0° V`, oninput: v => { this.Vs = v; this.T.set(this.H.spec(v)); } }); }
  get steps() { return this.list || (this.list = LS.withCol(this.colW, () => { const H = this.H;
    return [step(t('<b>อิมพีแดนซ์ของตัวเก็บประจุ 1 F</b> ที่ \\(\\omega = 2\\) rad/s', '<b>The impedance of the 1 F capacitor</b> at \\(\\omega = 2\\) rad/s'), `Z_C = \\frac{1}{j\\omega C} = \\frac{-j}{(2)(1)} = -j0.5\\ \\Omega = 0.5\\angle{-90^\\circ}\\ \\Omega`),
      step(t('<b>แรงดันคร่อมตัวเก็บประจุ</b> (\\(\\mathbf{I}_C\\) ไหลเข้าขั้ว + ของ \\(\\mathbf{V}_C\\))', '<b>The voltage across the capacitor</b> (\\(\\mathbf{I}_C\\) enters the + terminal of \\(\\mathbf{V}_C\\))'), `\\mathbf{V}_C = Z_C\\,\\mathbf{I}_C = (0.5\\angle{-90^\\circ})(2\\angle 28^\\circ) = ${pol(H.VC, 4, 2)}\\ \\text{V}`),
      step(t('<b>ตัวต้านทาน 2 Ω ขนานกับตัวเก็บประจุ</b> จึงมีแรงดัน \\(\\mathbf{V}_C\\) เท่ากัน', '<b>The 2 Ω resistor is in parallel with the capacitor</b>, so it has the same voltage \\(\\mathbf{V}_C\\)'), `\\mathbf{I}_{R2} = \\frac{\\mathbf{V}_C}{2} = ${pol(H.IR2, 4, 2)}\\ \\text{A}`),
      step(t('<b>กฎกระแสที่โนดขวาบน</b>: บวกเฟเซอร์ในรูปคาร์ทีเซียน (หน้า 6.2 ส่วน B)', '<b>KCL at the top-right node</b>: add the phasors in Cartesian form (page 6.2, section B)'),
        block([`\\mathbf{I}_s &= \\mathbf{I}_{R2} + \\mathbf{I}_C = 0.5\\angle{-62^\\circ} + 2\\angle 28^\\circ`, `&= (${rct(H.IR2)}) + (${rct(H.IC)}) = ${rct(H.Is)}`, `&= \\boxed{${pol(H.Is, 4, 3)}\\ \\text{A}}`, `i_s(t) &= \\boxed{2.062\\sin(2t + 13.96^\\circ)\\ \\text{A}}`]),
        t('ลูกศร \\(\\mathbf{I}_{R2}\\) กับ \\(\\mathbf{I}_C\\) ตั้งฉากกัน ผลรวมจึงยาว \\(\\sqrt{0.5^2 + 2^2} = 2.062\\) A ไม่ใช่ 2.5 A', 'The arrows \\(\\mathbf{I}_{R2}\\) and \\(\\mathbf{I}_C\\) are perpendicular, so the sum is \\(\\sqrt{0.5^2 + 2^2} = 2.062\\) A long, not 2.5 A'))]; })); }
};

/* "try first" box for a phasor answer M∠A, checked as one complex number (−10∠60° and 10∠−120° both count).
   o = { eff: true (a third box for the effective value), traps: [[size, angle (null: any angle), message]] for known slips } */
const sameZ = (m, a, M, A) => Math.hypot(m * Math.cos(a * Math.PI / 180) - M * Math.cos(A * Math.PI / 180), m * Math.sin(a * Math.PI / 180) - M * Math.sin(A * Math.PI / 180)) <= Math.max(1e-4, 0.005 * Math.abs(M));
CH6.sameZ = sameZ;
CH6.askPh = (nm, M, A, u, o = {}) => () => { const near = (x, y) => Math.abs(x - y) <= Math.max(0.01, 0.004 * Math.abs(y)), ok = (x, v) => sameZ(v[0], v[1], M, A);
  const fields = [{ label: `${nm}: ${t(`ขนาด (${u}) =`, `size (${u}) =`)}`, ok, w: 4.5 }, { label: t('มุม (°) =', 'angle (°) ='), ok, w: 4 }];
  if (o.eff) fields.push({ label: t(`ค่ายังผล (${u}) =`, `effective (${u}) =`), ok: x => near(x, M / Math.SQRT2), w: 4.5 });
  const hit = (v, m, a) => a == null ? Math.abs(Math.abs(v[0]) - m) <= Math.max(0.01, 0.004 * m) : sameZ(v[0], v[1], m, a);   // angle null: the size alone
  return { fields, check: v => { const tr = (o.traps || []).find(([m, a]) => hit(v, m, a)); if (tr) return tr[2];
    return o.eff && near(v[2], M * Math.SQRT2) ? t('ค่ายังผลคือค่ายอดหารด้วย √2 ไม่ใช่คูณ', 'The effective value is the peak divided by √2, not multiplied') : ''; } }; };

/* =====================================================================================================================
   7) one problem section of a page: canvas cv<n>, try-first box ask<n>, stepper st<n>, controls ctl<n>.
   kind 'lag' | 'phasor' | 'elem' | 'z' | 'mesh' | 'hw'; spec = the class options; o = { ask: sim => LS.ask options, answer, hint } */
CH6.problem = (n, kind, spec, o = {}) => {
  const $ = id => document.getElementById(id), C = { lag: CH6.LagProb, phasor: CH6.PhasorProb, elem: CH6.ElemProb, z: CH6.ZProb, mesh: CH6.MeshProb, hw: CH6.HwProb }[kind];
  const sim = new C($('cv' + n), { ...spec, colW: $('st' + n).clientWidth });
  if (sim.controls && $('ctl' + n)) sim.controls($('ctl' + n));
  if (o.ask && $('ask' + n)) LS.ask($('ask' + n), o.ask(sim));
  sim.stepper = LS.stepper($('st' + n), { steps: () => sim.steps, answer: o.answer, hint: o.hint, onStep: k => sim.set(k) });
  LS.onFonts(() => { sim.colW = $('st' + n).clientWidth; sim.list = null; sim.stepper.refresh(true); });
  LS.watchWidth($('st' + n), w => { sim.colW = w; sim.list = null; sim.stepper.refresh(true); });
  return sim;
};

})(window);
