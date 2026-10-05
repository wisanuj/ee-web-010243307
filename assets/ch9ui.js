/* ch9ui.js — chapter 9 in the problem-by-problem format (rebuilt Oct 2026): three-phase sources, Y–Y, delta loads, three-phase power.
   Built on ch8.js (Board, CH8.Prob, CH8.wire, triangle), ch9.js (phase colours, letters, part tags), ch6.js (plane, waves) and
   ch9_circuits.js (CH9C). Every value of this chapter is rms (slide p. 7, Hayt ch. 12 footnote): sources set amp = √2·V_rms and the
   views read rms (acPeak: false); CH9C returns rms phasors, the solver returns peak ones.
   CH9.ov: terminal letters, value tags and line-current tags for the page demos
   CH9.DEF: p45 vab1 vab2 (page 9.1: slide pp. 4–5 and the two 2017 in-class problems), ex1 ex2 q17 (9.2: slides pp. 13, 14 and the
   2017 quiz), ex3 (9.3: slide p. 18), hw (9.4: slide p. 20) · CH9.problem(n, key) wires a section like CH8.problem */
(function (global) {
'use strict';
const CH9 = global.CH9, Cx = CK.Cx, cx = Cx.c, COL = CH6.COL, fd = CH6.fd, R = String.raw, C9 = CH9.COL;
const t = (th, en) => MC.t(th, en);
const step = (why, tex, note) => LS.step(why, tex, note), block = rows => LS.block(rows);
const P = (z, d = 4, ad = 2) => CH6.pol(z, d, ad), RC = (z, d = 4) => CH6.rect(z, d), PT = (z, u, d = 3, ad = 1) => CH6.polTxt(z, u, d, ad);
const RT2 = Math.SQRT2, RT3 = Math.sqrt(3), D2R = Math.PI / 180, GREEN = '#7ee787', K = ['a', 'b', 'c'], KU = ['A', 'B', 'C'];
const rms = z => Cx.scale(z, 1 / RT2), pk = z => Cx.scale(z, RT2);
const near = (x, a, tol) => Math.abs(x - a) <= (tol ?? Math.max(2e-3, 0.005 * Math.abs(a)));
const num = (label, ans, o = {}) => ({ label, w: o.w || 5, ok: x => near(x, typeof ans === 'function' ? ans() : ans, o.tol) });
/* a phasor answered as size + angle, checked as one complex number (so −10∠60° = 10∠−120°) */
const sameZ = (m, a, M, A) => Math.hypot(m * Math.cos(a * D2R) - M * Math.cos(A * D2R), m * Math.sin(a * D2R) - M * Math.sin(A * D2R)) <= Math.max(1e-3, 0.005 * Math.abs(M));
const phasor = (name, z, unit, i) => { const ok = (x, v) => sameZ(v[2 * i], v[2 * i + 1], Cx.abs(z), CH6.deg(z));
  return [{ label: `${name}: ${t(`ขนาด (${unit}) =`, `size (${unit}) =`)}`, ok, w: 4.5 }, { label: t('มุม (°) =', 'angle (°) ='), ok, w: 4 }]; };
/* circuit overlays: terminal letters (lower case at the source, upper case at the load) and value tags */
const LET_SRC = { a: [-0.35, 0.05], b: [0.35, 0.05], c: [-0.35, 0.15], n: [-0.42, 0] }, LET_Y = { A: [-0.38, 0], B: [0.38, 0], C: [-0.38, 0.1], N: [0.4, -0.05] }, LET_D = { A: [-0.38, 0.05], B: [0.38, 0.05], C: [-0.38, 0.2] };
const tag = (v, txt, x, y, col) => { const [px, py] = v.P([x, y]); CH6.tag(v.ctx, txt, px, py, col, { size: Math.max(11.5, Math.min(13, v.u * 0.3)) }); };
const lineTags = (v, bd, I, In) => { const val = z => bd.short ? '' : ` = ${PT(rms(z), 'A', 2, 0)}`;
  tag(v, `I_{aA}${val(I[0])}`, 3.5, -0.62, C9.a); tag(v, `I_{bB}${val(I[1])}`, bd.short ? 7.6 : 8.0, 0.05, C9.b); tag(v, `I_{cC}${val(I[2])}`, 5.0, 5.12, C9.c);
  if (In !== undefined) tag(v, `I_{Nn}${bd.short ? '' : ` = ${Cx.abs(In) < 1e-9 ? '0' : PT(rms(In), 'A', 2, 0)}`}`, 3.4, 3.05, '#e8ecf7'); };
const srcTags = (v, bd) => { if (bd.short) return; const V = ['Va', 'Vb', 'Vc'].map(id => rms(v.ckt.Vab(id)));
  CH9.partTag(v, 'Va', PT(V[0], 'V', 0, 0), { dx: -0.5, dy: 0.5, align: 'right', color: C9.a }); CH9.partTag(v, 'Vb', PT(V[1], 'V', 0, 0), { dx: 0.5, dy: 0.55, align: 'left', color: C9.b });
  CH9.partTag(v, 'Vc', PT(V[2], 'V', 0, 0), { dx: 0.45, dy: 0, align: 'left', color: C9.c }); };
const NAMES = [['a', 'b'], ['b', 'c'], ['c', 'a']];
const vWave = (z, col, label, o = {}) => ({ mag: Cx.abs(z) * RT2, ang: CH6.deg(z), color: col, label, unit: 'V', g: 'v', w: 2.2, ...o });
const iWave = (z, col, label, o = {}) => ({ mag: Cx.abs(z) * RT2, ang: CH6.deg(z), color: col, label, unit: 'A', g: 'i', w: 2.2, ...o });

/* =====================================================================================================================
   page 9.1: line voltages of a Y source. The plane shows the phase voltages and builds V_xy = V_xn + (−V_yn) head to tail */
const linePlane = (ctx, b, bd, V, show, o = {}) => { const vecs = CH9.set(V, ['V_{an}', 'V_{bn}', 'V_{cn}'], { w: 2.2 }), arcs = [];
  show.forEach(k => { const i = k, j = (k + 1) % 3, [x, y] = NAMES[k], VL = Cx.sub(V[i], V[j]);
    vecs.push({ z: Cx.neg(V[j]), from: V[i], color: C9[K[j]], dash: [6, 4], w: 2, g: 'v', label: show.length === 1 && !bd.short ? `−V_{${y}n}` : '', lmid: -1 }, { z: VL, color: C9.L, label: `V_{${x}${y}}`, w: 3.4, g: 'v' });
    if (o.arcs) arcs.push({ a: i, b: vecs.length - 1, color: GREEN, r: 0.24 + 0.05 * arcs.length, text: arcs.length ? '' : `${o.seq > 0 ? '+' : '−'}30°` }); });
  const m = Math.max(...V.map(Cx.abs)) * (show.length ? RT3 : 1) * 1.04;
  CH6.plane(ctx, b, vecs, { title: o.title, max: { v: m }, arcs }); };
/* a Y source with two voltmeters (V_ab and V_bn), as on slide p. 4 */
const LAY = { wideAt: 1e9, cktAspM: 0.44, rowAsp: 0.42 };
const srcDef = (Vp, th, seq, lines, o = {}) => ({ ...LAY, spec: CH9C.src({ Vp, th, seq }), solvedAt: 0, pad: 1.2, view: { acPeak: false, acPower: false },
  badge: () => [[`แหล่งจ่ายวาย ${Vp} V ลำดับ${seq > 0 ? 'บวก' : 'ลบ'}`, `Y source ${Vp} V, ${seq > 0 ? 'positive' : 'negative'} sequence`], 'ok'],
  after: (v, k, s) => { CH9.letters(v, LET_SRC); CH9.letters(v, { tA: [0.35, 0], tB: [0.35, 0], tN: [0.35, 0], tC: [0.35, 0] }, { text: { tA: 'A', tB: 'B', tN: 'N', tC: 'C' }, color: '#e8ecf7' });
    const V = CH9C.phases(Vp, th, seq), lab = i => s.B.short ? '' : ` = ${PT(V[i], '', 1, 0).replace(' ∠ ', '∠')}`;
    CH9.partTag(v, 'Va', `V_{an}${lab(0)}`, { dx: -0.45, dy: 0.55, align: 'right', color: C9.a }); CH9.partTag(v, 'Vb', `V_{bn}${lab(1)}`, { dx: 0.5, dy: 0.5, align: 'left', color: C9.b });
    CH9.partTag(v, 'Vc', `V_{cn}${lab(2)}`, { dx: 0.5, dy: 0, align: 'left', color: C9.c }); },
  side: (ctx, b, bd, k) => { const V = CH9C.phases(Vp, th, seq), sh = lines(k);
    const nm = sh.length === 1 ? NAMES[sh[0]] : null, one = nm ? `V_${nm[0]}${nm[1]} = V_${nm[0]}n + (−V_${nm[1]}n)` : '';
    linePlane(ctx, b, bd, V, sh, { arcs: o.arcsAt ? k >= o.arcsAt : true, seq, title: nm ? (bd.short ? one : t(`${one} ต่อหัวต่อหาง`, `${one}, head to tail`)) : sh.length ? t('แรงดันสายทั้งสาม (ค่ายังผล)', 'all three line voltages (rms)') : t('แรงดันเฟส (ค่ายังผล)', 'phase voltages (rms)') }); },
  waves: [{ title: (bd, k) => bd.short ? '' : lines(k).length ? t('แรงดันเฟสและแรงดันสาย (ค่ายอด)', 'phase and line voltages (peak)') : t('แรงดันเฟส (ค่ายอด = ค่ายังผล × √2)', 'phase voltages (peak = rms × √2)'),
    sigs: (bd, k) => { const V = CH9C.phases(Vp, th, seq), L = CH9C.lines(V), s = V.map((z, i) => vWave(z, C9[K[i]], `v_{${K[i]}n}`, { w: 2 }));
      lines(k).forEach(i => s.push(vWave(L[i], C9.L, `v_{${NAMES[i].join('')}}`, { w: 3.2, peak: true }))); return s; },
    opts: () => ({ max: { v: Vp * RT2 * RT3 * 1.03 } }) }] });
const DEF = {};

/* slide pp. 4–5: V_ab of the source V_an = 100∠0°, positive sequence */
DEF.p45 = { ...srcDef(100, 0, 1, k => k >= 4 ? [0, 1, 2] : k >= 2 ? [0] : [], { arcsAt: 4 }),
  steps: () => { const V = CH9C.phases(100, 0, 1), L = CH9C.lines(V);
    return [step(t('<b>แรงดันเฟสที่โจทย์ให้</b> (สไลด์หน้า 4) ลำดับเฟสบวก: มุมลดลงทีละ 120°', '<b>The phase voltages given</b> (slide p. 4), positive sequence: the angle drops 120° each time'),
        block([R`\mathbf{V}_{an} &= 100\angle 0^\circ\ \text{V}`, R`\mathbf{V}_{bn} &= 100\angle{-120^\circ}\ \text{V}`, R`\mathbf{V}_{cn} &= 100\angle{-240^\circ}\ \text{V}`])),
      step(t('<b>สัญกรณ์ตัวห้อยคู่</b>: \\(\\mathbf{V}_{ab}\\) คือแรงดันของจุด a เทียบกับจุด b เดินจาก a ผ่าน n ไปถึง b ตามกฎแรงดันของเคียร์ชอฟฟ์ (KVL) (ภาพ: เส้นประคือ \\(-\\mathbf{V}_{bn}\\))', '<b>Double-subscript notation</b>: \\(\\mathbf{V}_{ab}\\) is the voltage of point a with respect to point b; walk from a through n to b by Kirchhoff\'s voltage law (KVL) (picture: the dashed arrow is \\(-\\mathbf{V}_{bn}\\))'),
        block([R`\mathbf{V}_{ab} &= \mathbf{V}_{an} + \mathbf{V}_{nb}`, R`&= \mathbf{V}_{an} - \mathbf{V}_{bn}`])),
      step(t('<b>แทนค่าแล้วลบเป็นจำนวนเชิงซ้อน</b> (สไลด์หน้า 5)', '<b>Substitute and subtract as complex numbers</b> (slide p. 5)'),
        block([R`\mathbf{V}_{ab} &= 100\angle 0^\circ - 100\angle{-120^\circ}`, R`&= 100 - (-50 - j86.6)`, R`&= 150 + j86.6`, R`&= \boxed{${P(L[0], 4, 2)}\ \text{V}}`]),
        t('โวลต์มิเตอร์ตัวบนในภาพอ่าน 173 V (173.2 ปัดเป็นเลขนัยสำคัญสามตัว) และตัวล่าง (แรงดันเฟส \\(V_{bn}\\)) อ่าน 100 V', 'The upper voltmeter in the picture reads 173 V (173.2 to three significant figures) and the lower one (the phase voltage \\(V_{bn}\\)) reads 100 V.')),
      step(t('<b>ขนาดและมุมเทียบกับแรงดันเฟส</b> (สไลด์หน้า 9–10): ลำดับบวก \\(\\mathbf{V}_{ab}\\) นำหน้า \\(\\mathbf{V}_{an}\\) อยู่ 30°', '<b>Size and angle compared with the phase voltage</b> (slides pp. 9–10): in positive sequence \\(\\mathbf{V}_{ab}\\) leads \\(\\mathbf{V}_{an}\\) by 30°'),
        block([R`\frac{|\mathbf{V}_{ab}|}{|\mathbf{V}_{an}|} &= \frac{173.2}{100} = \sqrt3`, R`V_L &= \sqrt3\,V_p`]),
        t(`อีกสองตัว: \\(\\mathbf{V}_{bc} = ${P(L[1], 1, 0)}\\) V และ \\(\\mathbf{V}_{ca} = ${P(L[2], 1, 0)}\\) V (สไลด์หน้า 9 เขียน \\(\\angle{-210^\\circ}\\) ซึ่งคือมุมเดียวกัน)`, `The other two: \\(\\mathbf{V}_{bc} = ${P(L[1], 1, 0)}\\) V and \\(\\mathbf{V}_{ca} = ${P(L[2], 1, 0)}\\) V (slide p. 9 writes \\(\\angle{-210^\\circ}\\), the same angle).`))]; },
  ask: () => ({ fields: phasor('V<sub>ab</sub>', CH9C.lines(CH9C.phases(100, 0, 1))[0], 'V', 0),
    check: v => sameZ(v[0], v[1], 100 * RT3, -150) ? t('นั่นคือ \\(\\mathbf{V}_{bn} - \\mathbf{V}_{an}\\) กลับข้าง: ตัวห้อยตัวแรกคือขั้วบวก \\(\\mathbf{V}_{ab} = \\mathbf{V}_{an} - \\mathbf{V}_{bn}\\)', 'That is \\(\\mathbf{V}_{bn} - \\mathbf{V}_{an}\\), the wrong way round: the first subscript is the + terminal, \\(\\mathbf{V}_{ab} = \\mathbf{V}_{an} - \\mathbf{V}_{bn}\\).')
    : sameZ(v[0], v[1], 100 * RT3, -30) ? t('นั่นคือคำตอบของลำดับ<b>ลบ</b> โจทย์นี้เป็นลำดับบวก \\(\\mathbf{V}_{bn} = 100\\angle{-120^\\circ}\\)', 'That is the <b>negative</b>-sequence answer; this one is positive sequence, \\(\\mathbf{V}_{bn} = 100\\angle{-120^\\circ}\\).') : '' }),
  answer: () => t('\\(\\mathbf{V}_{ab} = 173.2\\angle 30^\\circ\\) V \\(= 100\\sqrt3\\angle 30^\\circ\\) ตรงกับสไลด์หน้า 5 และที่ผู้สอนเขียนในห้อง', '\\(\\mathbf{V}_{ab} = 173.2\\angle 30^\\circ\\) V \\(= 100\\sqrt3\\angle 30^\\circ\\), as on slide p. 5 and in the class notes.') };

/* the 2017 in-class problems: negative sequence with V_an = 120∠0°, positive sequence with V_an = 10∠30° */
const lineSteps = (Vp, th, seq, cls) => { const V = CH9C.phases(Vp, th, seq), L = CH9C.lines(V), pv = z => P(z, 4, 0);
  const one = (k, why) => { const [x, y] = NAMES[k], i = k, j = (k + 1) % 3, d = Cx.sub(V[i], V[j]);
    return step(why, block([R`\mathbf{V}_{${x}${y}} &= \mathbf{V}_{${x}n} - \mathbf{V}_{${y}n}`, R`&= ${pv(V[i])} - ${pv(V[j])}`, R`&= ${RC(d, 2)} = \boxed{${P(d, 4, 2)}\ \text{V}}`])); };
  return [step(seq > 0 ? t('<b>แรงดันเฟสลำดับบวก</b>: \\(\\mathbf{V}_{bn}\\) และ \\(\\mathbf{V}_{cn}\\) ตามหลัง \\(\\mathbf{V}_{an}\\) อยู่ 120° และ 240°', '<b>Positive-sequence phase voltages</b>: \\(\\mathbf{V}_{bn}\\) and \\(\\mathbf{V}_{cn}\\) lag \\(\\mathbf{V}_{an}\\) by 120° and 240°')
        : t('<b>แรงดันเฟสลำดับลบ</b>: \\(\\mathbf{V}_{bn}\\) <b>นำหน้า</b> \\(\\mathbf{V}_{an}\\) อยู่ 120° (สไลด์หน้า 8)', '<b>Negative-sequence phase voltages</b>: \\(\\mathbf{V}_{bn}\\) <b>leads</b> \\(\\mathbf{V}_{an}\\) by 120° (slide p. 8)'),
      block([R`\mathbf{V}_{an} &= ${pv(V[0])}\ \text{V}`, R`\mathbf{V}_{bn} &= ${pv(V[1])}\ \text{V}`, R`\mathbf{V}_{cn} &= ${pv(V[2])}\ \text{V}`])),
    one(0, t('<b>\\(\\mathbf{V}_{ab}\\)</b> จากผลต่างของแรงดันเฟส (ภาพ: ต่อหัวต่อหาง)', '<b>\\(\\mathbf{V}_{ab}\\)</b> from the difference of phase voltages (picture: head to tail)')),
    one(1, t('<b>\\(\\mathbf{V}_{bc}\\)</b> แบบเดียวกัน', '<b>\\(\\mathbf{V}_{bc}\\)</b> the same way')),
    one(2, t('<b>\\(\\mathbf{V}_{ca}\\)</b>: ตัวห้อยตัวแรก (c) คือขั้วบวก จึงเป็น \\(\\mathbf{V}_{cn} - \\mathbf{V}_{an}\\)', '<b>\\(\\mathbf{V}_{ca}\\)</b>: the first subscript (c) is the + terminal, so it is \\(\\mathbf{V}_{cn} - \\mathbf{V}_{an}\\)')),
    step(seq > 0 ? t('<b>ตรวจรูปแบบ</b>: ลำดับบวก แรงดันสายยาว \\(\\sqrt3\\) เท่าและ<b>นำหน้า</b>แรงดันเฟสตัวแรกของมัน 30°', '<b>Check the pattern</b>: in positive sequence each line voltage is \\(\\sqrt3\\) times longer and <b>leads</b> its first phase voltage by 30°')
        : t('<b>ตรวจรูปแบบ</b>: ลำดับลบ แรงดันสายยาว \\(\\sqrt3\\) เท่าแต่<b>ตามหลัง</b>แรงดันเฟสตัวแรกของมัน 30° (สูตร \\(\\sqrt3V_p\\angle 30^\\circ\\) ของสไลด์หน้า 9 ใช้ไม่ได้)', '<b>Check the pattern</b>: in negative sequence each line voltage is \\(\\sqrt3\\) times longer but <b>lags</b> its first phase voltage by 30° (the \\(\\sqrt3V_p\\angle 30^\\circ\\) formula of slide p. 9 does not apply)'),
      block([R`V_L &= \sqrt3\,(${Vp}) = ${fd(Vp * RT3, 4)}\ \text{V}`, R`\angle\mathbf{V}_{ab} - \angle\mathbf{V}_{an} &= ${seq > 0 ? '+' : '-'}30^\circ`]), cls)]; };
DEF.vab1 = { ...srcDef(120, 0, -1, k => k >= 5 ? [0, 1, 2] : k >= 2 ? [k - 2] : [], { arcsAt: 2 }),
  steps: () => lineSteps(120, 0, -1, t('ในห้องเขียน 207.84 (\\(120\\sqrt3 = 207.846\\)) และ \\(\\angle{-30^\\circ}, \\angle 90^\\circ, \\angle{-150^\\circ}\\) ตรงกัน', 'The class wrote 207.84 (\\(120\\sqrt3 = 207.846\\)) with \\(\\angle{-30^\\circ}, \\angle 90^\\circ, \\angle{-150^\\circ}\\): the same answer.')),
  ask: () => ({ fields: phasor('V<sub>bc</sub>', CH9C.lines(CH9C.phases(120, 0, -1))[1], 'V', 0),
    check: v => sameZ(v[0], v[1], 120 * RT3, -90) ? t('นั่นคือคำตอบของลำดับ<b>บวก</b> โจทย์นี้เป็นลำดับลบ \\(\\mathbf{V}_{bn} = 120\\angle 120^\\circ\\)', 'That is the <b>positive</b>-sequence answer; this one is negative sequence, \\(\\mathbf{V}_{bn} = 120\\angle 120^\\circ\\).') : '' }),
  answer: () => t('\\(\\mathbf{V}_{ab} = 207.85\\angle{-30^\\circ}\\), \\(\\mathbf{V}_{bc} = 207.85\\angle 90^\\circ\\), \\(\\mathbf{V}_{ca} = 207.85\\angle{-150^\\circ}\\) V ตรงกับที่ผู้สอนทำในห้อง', '\\(\\mathbf{V}_{ab} = 207.85\\angle{-30^\\circ}\\), \\(\\mathbf{V}_{bc} = 207.85\\angle 90^\\circ\\), \\(\\mathbf{V}_{ca} = 207.85\\angle{-150^\\circ}\\) V, as worked in class.') };
DEF.vab2 = { ...srcDef(10, 30, 1, k => k >= 5 ? [0, 1, 2] : k >= 2 ? [k - 2] : [], { arcsAt: 2 }),
  steps: () => lineSteps(10, 30, 1, t('บันทึกในห้อง: <b>ฝั่งแหล่งจ่ายใช้ตัวพิมพ์เล็กทั้งหมด (a, b, c, n) ฝั่งโหลดใช้ตัวพิมพ์ใหญ่ (A, B, C, N)</b> หน้า 9.2–9.4 ใช้ตามนี้', 'The class note: <b>the source side uses lower-case letters (a, b, c, n) and the load side upper case (A, B, C, N)</b>; pages 9.2–9.4 follow it.')),
  ask: () => ({ fields: phasor('V<sub>ca</sub>', CH9C.lines(CH9C.phases(10, 30, 1))[2], 'V', 0),
    check: v => sameZ(v[0], v[1], 10 * RT3, 0) ? t('นั่นคือ \\(\\mathbf{V}_{ac} = \\mathbf{V}_{an} - \\mathbf{V}_{cn}\\) กลับข้าง', 'That is \\(\\mathbf{V}_{ac} = \\mathbf{V}_{an} - \\mathbf{V}_{cn}\\), the wrong way round.') : '' }),
  answer: () => t('\\(\\mathbf{V}_{bn} = 10\\angle{-90^\\circ}\\), \\(\\mathbf{V}_{cn} = 10\\angle 150^\\circ\\) V และ \\(\\mathbf{V}_{ab} = 17.32\\angle 60^\\circ\\), \\(\\mathbf{V}_{bc} = 17.32\\angle{-60^\\circ}\\), \\(\\mathbf{V}_{ca} = 17.32\\angle 180^\\circ\\) V ตรงกับที่ผู้สอนทำในห้อง', '\\(\\mathbf{V}_{bn} = 10\\angle{-90^\\circ}\\), \\(\\mathbf{V}_{cn} = 10\\angle 150^\\circ\\) V and \\(\\mathbf{V}_{ab} = 17.32\\angle 60^\\circ\\), \\(\\mathbf{V}_{bc} = 17.32\\angle{-60^\\circ}\\), \\(\\mathbf{V}_{ca} = 17.32\\angle 180^\\circ\\) V, as worked in class.') };

/* =====================================================================================================================
   page 9.2: Y–Y */
/* an impedance that the problem asks for shows "? Ω" until the step that finds it (same layout, so the circuit does not jump) */
const hideZ = (mk, at) => { const a = mk(() => '? Ω'), b = mk(CH9C.zp); return k => k >= at ? b : a; };
const E1 = CH9C.ex1, Z1 = E1.Z, SY1 = CH9C.yy({ Vp: 200, Z: Z1, neutral: 'wire', zt: CH9C.zp });
const yyState = c => { const I = ['wa', 'wb', 'wc'].map(id => c.I(id)), wn = c.part('wn'), sw = c.part('Sn'), In = wn && (!sw || sw.closed) ? c.I('wn') : undefined; return { I, In }; };
DEF.ex1 = { ...LAY, spec: SY1, solvedAt: 2, pad: 1.15, shortSpec: sp => CH9.short(sp), vo: () => ({ acPeak: false }),
  glow: k => k === 2 ? ['ZA', 'ZB', 'ZC'] : k === 3 ? ['wn'] : null,
  after: (v, k, s) => { CH9.letters(v, LET_SRC); CH9.letters(v, LET_Y, { color: '#e8ecf7' }); srcTags(v, s.B); if (k >= 2) { const { I, In } = yyState(v.ckt); lineTags(v, s.B, I, In); } },
  side: (ctx, b, bd, k) => { const sh = bd.short;
    if (k < 1) return CH8.empty(ctx, b, ['แหล่งจ่าย 200∠0° V rms ลำดับบวก กับโหลดวายสมดุล 100∠60° Ω', 'a 200∠0° V rms positive-sequence source and a balanced Y load of 100∠60° Ω']);
    if (k === 3) { let f = cx(0); const vecs = E1.I.map((z, i) => { const v = { z, from: f, color: C9[K[i]], label: `I_{${K[i]}${KU[i]}}`, g: 'i', w: 2.8, lmid: 1 }; f = Cx.add(f, z); return v; });
      return CH6.plane(ctx, b, vecs, { title: sh ? t('ผลรวม = 0', 'sum = 0') : t('I_aA + I_bB + I_cC ต่อหัวต่อหาง: ปิดพอดี = I_Nn = 0', 'I_aA + I_bB + I_cC head to tail: it closes, I_Nn = 0') }); }
    if (k >= 4) { let f = cx(0); const segs = E1.S.slice(0, k >= 5 ? 3 : 1).map((S, i) => { const g = { S, from: f, color: C9[K[i]], label: sh ? KU[i] : `S_${KU[i]} = ${CH8.cfmt(S)}`, legs: false, w: 2.8, lpos: -1 }; f = Cx.add(f, S); return g; });
      if (k >= 5) segs.push({ S: E1.St, color: C9.S, label: 'S', arc: true, w: 3.6, dash: [9, 6], lpos: 1, pl: sh ? '' : undefined, ql: sh ? '' : undefined });
      return CH8.triangle(ctx, b, { title: k >= 5 ? (sh ? 'S = 3S_A' : t('S_A + S_B + S_C = S รวม', 'S_A + S_B + S_C = total S')) : t('กำลังเชิงซ้อนของเฟส A', 'complex power of phase A'), segs, quad: false, max: { P: 600, Q: 1039.23 } }); }
    const vecs = [...CH9.set(E1.V, ['V_{an}', 'V_{bn}', 'V_{cn}'], { w: 2.6 })];
    if (k === 1) vecs.push(...CH9.set(E1.VL, ['V_{ab}', 'V_{bc}', 'V_{ca}'], { w: 1.8, colors: [C9.L, C9.L, C9.L] }));
    if (k >= 2) vecs.push(...CH9.set(E1.I, ['I_{AN}', 'I_{BN}', 'I_{CN}'], { g: 'i', dash: [6, 4], w: 2.6 }));
    CH6.plane(ctx, b, vecs, { title: k >= 2 ? (sh ? t('V ทึบ · I ประ', 'V solid · I dashed') : t('แรงดันเส้นทึบ กระแสเส้นประ (ค่ายังผล)', 'voltages solid, currents dashed (rms)')) : t('แรงดันเฟสและแรงดันสาย', 'phase and line voltages'),
      arcs: k >= 2 ? [{ a: 0, b: 3, color: GREEN, r: 0.24, text: '60°' }] : [] }); },
  waves: [{ title: (bd, k) => bd.short ? '' : k >= 5 ? t('กำลังแต่ละเฟส (สี) · รวม 600 W คงที่ (ขาว)', 'phase powers (colour) · total 600 W (white)') : k >= 2 ? t('กระแสสายและ i_Nn (ค่ายอด)', 'line currents and i_Nn (peak)') : t('แรงดันเฟส (ค่ายอด)', 'phase voltages (peak)'),
    sigs: (bd, k) => { const c = bd.ckt;
      if (k >= 5) { const f = ['ZA', 'ZB', 'ZC'].map(id => CH8.pOf(c, id)), tot = d => f[0](d) + f[1](d) + f[2](d), mag = 1200 * 1.04;
        return [...f.map((g, i) => ({ f: g, color: C9[K[i]], label: `p_${KU[i]}`, unit: 'W', g: 'p', mag, w: 2 })), { f: tot, color: '#e8ecf7', label: 'p', unit: 'W', g: 'p', mag, w: 3.6 }]; }
      if (k >= 2) { const { I, In } = yyState(c); return [...I.map((z, i) => iWave(rms(z), C9[K[i]], `i_{${K[i]}${KU[i]}}`, { w: 2.4 })), iWave(rms(In || cx(0)), '#e8ecf7', 'i_{Nn}', { w: 3, dash: [6, 4] })]; }
      return E1.V.map((z, i) => vWave(z, C9[K[i]], `v_{${K[i]}n}`)); } }],
  steps: () => { const V = E1.V, L = E1.VL, I = E1.I, S = E1.S;
    return [step(t('<b>ขั้นที่ 1 (ตามเฉลยในห้อง): หาแรงดันเฟสและแรงดันสายทั้งหมดจากฝั่งแหล่งจ่าย</b> ลำดับบวก ค่ายังผล', '<b>Step 1 (as in class): find every phase and line voltage from the source side</b>, positive sequence, rms'),
        block([R`\mathbf{V}_{an} &= 200\angle 0^\circ\ \text{V}`, R`\mathbf{V}_{bn} &= 200\angle{-120^\circ}\ \text{V}`, R`\mathbf{V}_{cn} &= 200\angle 120^\circ\ \text{V}`, R`\mathbf{V}_{ab} &= \mathbf{V}_{an} - \mathbf{V}_{bn} = 200\sqrt3\angle 30^\circ`, R`&= ${P(L[0], 2, 0)}\ \text{V}`, R`\mathbf{V}_{bc} &= ${P(L[1], 2, 0)}\ \text{V}`, R`\mathbf{V}_{ca} &= ${P(L[2], 2, 0)}\ \text{V}`])),
      step(t('<b>กระแสเฟส</b>: แรงดันคร่อมโหลดแต่ละเฟสคือแรงดันเฟสของแหล่งจ่าย (ชิ้นส่วนโหลดเรืองแสง จุดเริ่มวิ่ง)', '<b>Phase currents</b>: each load phase sees the source phase voltage (the load glows, the dots start)'),
        block([R`\mathbf{I}_{AN} &= \frac{\mathbf{V}_{AN}}{Z_A} = \frac{200\angle 0^\circ}{100\angle 60^\circ} = \boxed{${P(I[0], 4, 0)}\ \text{A}}`, R`\mathbf{I}_{BN} &= \frac{200\angle{-120^\circ}}{100\angle 60^\circ} = \boxed{${P(I[1], 4, 0)}\ \text{A}}`, R`\mathbf{I}_{CN} &= \frac{200\angle 120^\circ}{100\angle 60^\circ} = \boxed{${P(I[2], 4, 0)}\ \text{A}}`])),
      step(t('<b>กระแสสาย = กระแสเฟส</b> (โหลดวาย) และกระแสในสายนิวทรัลเป็นศูนย์ (สไลด์หน้า 12: จุดในนิวทรัลไม่ขยับ)', '<b>Line currents = phase currents</b> (Y load), and the neutral current is zero (slide p. 12: the neutral dots do not move)'),
        block([R`\mathbf{I}_{aA} &= \mathbf{I}_{AN} = 2\angle{-60^\circ}\ \text{A}`, R`\mathbf{I}_{bB} &= \mathbf{I}_{BN} = 2\angle{-180^\circ}\ \text{A}`, R`\mathbf{I}_{cC} &= \mathbf{I}_{CN} = 2\angle 60^\circ\ \text{A}`, R`\mathbf{I}_{Nn} &= \mathbf{I}_{aA} + \mathbf{I}_{bB} + \mathbf{I}_{cC} = 0`])),
      step(t('<b>กำลังเชิงซ้อนของแต่ละเฟส</b> \\(\\mathbf{S} = \\mathbf{V}\\mathbf{I}^*\\) (ค่ายังผล)', '<b>Complex power of each phase</b>, \\(\\mathbf{S} = \\mathbf{V}\\mathbf{I}^*\\) (rms)'),
        block([R`\mathbf{S}_A &= \mathbf{V}_{AN}\mathbf{I}_{AN}^* = (200\angle 0^\circ)(2\angle 60^\circ)`, R`&= 400\angle 60^\circ = ${RC(S[0], 2)}\ \text{VA}`, R`\mathbf{S}_B &= \mathbf{S}_C = \mathbf{S}_A`])),
      step(t('<b>กำลังรวมของโหลด</b> (กราฟ: กำลังขณะใด ๆ ของแต่ละเฟสแกว่ง แต่ผลรวมคงที่ 600 W)', '<b>Total power of the load</b> (graph: each phase\'s instantaneous power swings, but the total stays at 600 W)'),
        block([R`\mathbf{S} &= \mathbf{S}_A + \mathbf{S}_B + \mathbf{S}_C = ${P(E1.St, 4, 0)}\ \text{VA}`, R`\Sigma P &= \boxed{${fd(E1.St.re, 2)}\ \text{W}}`, R`\Sigma Q &= \boxed{${fd(E1.St.im, 2)}\ \text{VAR}}`]),
        t('ตรงกับเฉลยในห้อง (ΣP = 600 W, ΣQ = 1039.23 VAR) และ Hayt Example 12.2 · Hayt เขียน \\(\\mathbf{V}_{ca} = 346\\angle{-210^\\circ}\\) และ \\(\\mathbf{I}_{cC} = 2\\angle{-300^\\circ}\\) ซึ่งคือมุมเดียวกับ 150° และ 60°', 'This matches the class solution (ΣP = 600 W, ΣQ = 1039.23 VAR) and Hayt Example 12.2 · Hayt writes \\(\\mathbf{V}_{ca} = 346\\angle{-210^\\circ}\\) and \\(\\mathbf{I}_{cC} = 2\\angle{-300^\\circ}\\), the same angles as 150° and 60°.'))]; },
  ask: () => ({ fields: [...phasor('I<sub>aA</sub>', E1.I[0], 'A', 0), num('ΣP (W) =', E1.St.re)],
    check: v => near(v[2], 2 * E1.St.re) || near(v[2], 1200) ? t('\\(\\mathbf{S}_A = 400\\angle 60^\\circ\\) VA ส่วนจริงคือ 200 W ต่อเฟส รวม 600 W (1200 คือขนาดของ \\(\\mathbf{S}\\))', '\\(\\mathbf{S}_A = 400\\angle 60^\\circ\\) VA has a real part of 200 W per phase, 600 W in all (1200 is the size of \\(\\mathbf{S}\\)).') : '' }),
  answer: () => t('กระแสเฟส = กระแสสาย = \\(2\\angle{-60^\\circ}\\), \\(2\\angle{-180^\\circ}\\), \\(2\\angle 60^\\circ\\) A · แรงดันสาย 346.41 V · \\(P = 600\\) W, \\(Q = 1039.23\\) VAR', 'Phase currents = line currents = \\(2\\angle{-60^\\circ}\\), \\(2\\angle{-180^\\circ}\\), \\(2\\angle 60^\\circ\\) A · line voltages 346.41 V · \\(P = 600\\) W, \\(Q = 1039.23\\) VAR.') };

/* slide p. 14 (Hayt Example 12.3, 0.8 leading) and the 2017 quiz (Hayt Example 12.6, 0.8 lagging): current and impedance from the power */
const fromPower = (r, lead, o = {}) => ({ ...LAY, spec: hideZ(zt => CH9C.yy({ Vp: r.Vsrc, Z: r.Z, neutral: 'wire', zt }), 3), solvedAt: 2, pad: 1.15, shortSpec: sp => CH9.short(sp), vo: () => ({ acPeak: false }),
  glow: k => k === 3 ? ['ZA', 'ZB', 'ZC'] : null,
  after: (v, k, s) => { CH9.letters(v, LET_SRC); CH9.letters(v, LET_Y, { color: '#e8ecf7' }); if (k >= 2) { const { I, In } = yyState(v.ckt); lineTags(v, s.B, I, In); } },
  side: (ctx, b, bd, k) => { const Sp = r.Sp, sh = bd.short;
    if (k < 1) return CH8.empty(ctx, b, ['รู้แรงดันสาย 300 V กำลังรวม 1200 W และ PF 0.8: เริ่มจากหนึ่งเฟส', 'known: 300 V line voltage, 1200 W in all, PF 0.8; start from one phase']);
    CH8.triangle(ctx, b, { title: sh ? t('หนึ่งเฟส', 'one phase') : t(`สามเหลี่ยมกำลังของหนึ่งเฟส · PF 0.8 ${lead ? 'นำหน้า' : 'ตามหลัง'}`, `power triangle of one phase · PF 0.8 ${lead ? 'leading' : 'lagging'}`), max: { Q: Math.abs(Sp.im), Qn: Math.abs(Sp.im) }, quad: false,
      segs: [{ S: Sp, color: C9.S, label: sh ? 'S_p' : `S_p = ${CH8.cfmt(Sp)}`, arc: true, lpos: Sp.im >= 0 ? -1 : 1, pl: sh ? '' : undefined, ql: sh ? '' : undefined }] }); },
  waves: [{ title: (bd, k) => bd.short ? '' : k >= 2 ? (lead ? t('i_AN นำหน้า v_AN อยู่ 36.87° (ตัวเก็บประจุ)', 'i_AN leads v_AN by 36.87° (capacitive)') : t('i_AN ตามหลัง v_AN อยู่ 36.87° (เหนี่ยวนำ)', 'i_AN lags v_AN by 36.87° (inductive)')) : t('ยังไม่มีกระแส', 'no current yet'),
    sigs: (bd, k) => { if (k < 2) return []; const c = bd.ckt, v = rms(c.Vab('ZA')), i = rms(c.I('ZA')); return [vWave(v, C9.L, 'v_{AN}', { w: 2.6, peak: true }), iWave(i, C9.a, 'i_{AN}', { w: 2.6, peak: true })]; } }],
  steps: () => [step(t('<b>แรงดันเฟสของโหลดวายและกำลังต่อเฟส</b> (300 V คือแรงดันสาย ค่ายังผล)', '<b>The phase voltage of the Y load and the power per phase</b> (300 V is the line voltage, rms)'),
      block([R`V_p &= \frac{V_L}{\sqrt3} = \frac{300}{\sqrt3} = ${fd(r.Vp, 3)}\ \text{V}`, R`P_p &= \frac{1200}{3} = 400\ \text{W}`])),
    step(t('<b>กระแสสาย</b> จาก \\(P_p = V_pI_L\\cos\\theta\\) (โหลดวาย: กระแสสาย = กระแสเฟส จุดเริ่มวิ่ง)', '<b>The line current</b> from \\(P_p = V_pI_L\\cos\\theta\\) (Y load: line current = phase current; the dots start)'),
      block([R`400 &= (${fd(r.Vp, 3)})\,I_L\,(0.8)`, R`I_L &= \boxed{${fd(r.IL, 4)}\ \text{A}}`])),
    step(t(`<b>อิมพีแดนซ์ต่อเฟส</b>: ขนาดจาก \\(V_p/I_L\\) มุมจากตัวประกอบกำลัง (${lead ? 'นำหน้า มุมติดลบ' : 'ตามหลัง มุมเป็นบวก'})`, `<b>The per-phase impedance</b>: size from \\(V_p/I_L\\), angle from the power factor (${lead ? 'leading, negative angle' : 'lagging, positive angle'})`),
      block([R`|Z_p| &= \frac{${fd(r.Vp, 3)}}{${fd(r.IL, 4)}} = ${fd(r.Zm, 3)}\ \Omega`, R`\theta &= ${lead ? '-' : '+'}\cos^{-1}0.8 = ${fd(r.th, 2)}^\circ`, R`Z_p &= \boxed{${fd(r.Zm, 2)}\angle{${fd(r.th, 2)}^\circ}\ \Omega} = ${RC(r.Z, 2)}\ \Omega`])),
    step(t('<b>ตรวจด้วยกำลังรวม</b> (วงจรในภาพใช้ \\(Z_p\\) ที่ได้ ชี้เมาส์ที่โหลดเพื่อดูกำลัง)', '<b>Check with the total power</b> (the circuit uses the \\(Z_p\\) found; hover over a load to see its power)'),
      block([R`\sqrt3\,V_LI_L\cos\theta &= \sqrt3(300)(${fd(r.IL, 4)})(0.8)`, R`&= 1200\ \text{W}\ \ \checkmark`]), o.note)],
  ask: () => ({ fields: [num('I<sub>L</sub> (A) =', r.IL), num('|Z<sub>p</sub>| (Ω) =', r.Zm), num(t('มุมของ Z<sub>p</sub> (°) =', 'angle of Z<sub>p</sub> (°) ='), r.th, { tol: 0.05, w: 4.5 })],
    check: v => near(v[0], 400 / (300 / RT3 / RT2 * 0.8), 0.01) ? t('4.08 A มาจากการหาร 300 V ด้วย \\(\\sqrt2\\) อีกครั้ง แต่ 300 V เป็นค่ายังผลอยู่แล้ว', '4.08 A comes from dividing 300 V by \\(\\sqrt2\\) once more, but 300 V is already rms.') : near(v[0], 400 / (300 * 0.8), 0.01) ? t('1.667 A ใช้ 300 V เป็นแรงดันเฟส แต่โหลดวายมี \\(V_p = V_L/\\sqrt3\\)', '1.667 A uses 300 V as the phase voltage, but a Y load has \\(V_p = V_L/\\sqrt3\\).') : near(v[2], -r.th, 0.05) ? t(`มุมต้อง${lead ? 'ติดลบ (นำหน้า)' : 'เป็นบวก (ตามหลัง)'}`, `The angle must be ${lead ? 'negative (leading)' : 'positive (lagging)'}.`) : '' }),
  answer: () => t(`\\(I_L = ${fd(r.IL, 3)}\\) A และ \\(Z_p = ${fd(r.Zm, 0)}\\angle{${fd(r.th, 2)}^\\circ}\\ \\Omega\\) ตรงกับ Hayt Example ${lead ? '12.3' : '12.6'}`, `\\(I_L = ${fd(r.IL, 3)}\\) A and \\(Z_p = ${fd(r.Zm, 0)}\\angle{${fd(r.th, 2)}^\\circ}\\ \\Omega\\), as in Hayt Example ${lead ? '12.3' : '12.6'}.`) });
DEF.ex2 = fromPower(CH9C.ex2, true);
DEF.q17 = fromPower(CH9C.q2017, false, { note: t('เฉลยในห้องปี 2560 ได้ 4.0824 A เพราะหาร \\(173.205\\) ด้วย \\(\\sqrt2\\) อีกครั้ง (คำอธิบายอยู่กับเฉลยในห้องด้านล่าง)', 'The 2017 class solution got 4.0824 A by dividing \\(173.205\\) by \\(\\sqrt2\\) once more (explained with the class solution below).') });

/* =====================================================================================================================
   page 9.3: slide p. 18 (Hayt Example 12.5), a delta load */
const E3 = CH9C.ex3, SD3 = hideZ(zt => CH9C.yd({ Vp: 300 / RT3, Z: E3.Z, zt }), 4), PH = ['AB', 'BC', 'CA'];
DEF.ex3 = { ...LAY, spec: SD3, solvedAt: 2, pad: 1.1, shortSpec: sp => CH9.short(sp), vo: () => ({ acPeak: false }),
  glow: k => k === 1 ? ['ZAB'] : k === 2 ? ['ZAB', 'ZBC', 'ZCA'] : k === 3 ? ['wa', 'wb', 'wc'] : null,
  after: (v, k, s) => { CH9.letters(v, LET_SRC); CH9.letters(v, LET_D, { color: '#e8ecf7' }); if (k >= 3) lineTags(v, s.B, yyState(v.ckt).I); },
  side: (ctx, b, bd, k) => { const sh = bd.short;
    if (k < 1) return CH8.empty(ctx, b, ['โหลดเดลตา: แต่ละเฟสต่อคร่อมสายสองเส้น แรงดันเฟส = แรงดันสาย 300 V', 'delta load: each phase sits across two lines, so its voltage is the 300 V line voltage']);
    if (k < 3) return CH8.triangle(ctx, b, { title: sh ? t('หนึ่งเฟส', 'one phase') : t('สามเหลี่ยมกำลังของหนึ่งเฟส · 0.8 ตามหลัง', 'power triangle of one phase · 0.8 lagging'), max: { Q: Math.abs(E3.Sp.im), Qn: 0 }, quad: false,
      segs: [{ S: E3.Sp, color: C9.S, label: sh ? 'S_p' : `S_p = ${CH8.cfmt(E3.Sp)}`, arc: true, lpos: -1, pl: sh ? '' : undefined, ql: sh ? '' : undefined }] });
    const c = bd.ckt, Ip = PH.map(p => rms(c.I('Z' + p))), IL = rms(c.I('wa'));
    CH6.plane(ctx, b, [{ z: rms(c.Vab('ZAB')), color: C9.L, label: 'V_{AB}', g: 'v', w: 2.2 }, { z: Ip[0], color: C9.a, label: 'I_{AB}', g: 'i', w: 2.6 }, { z: Ip[2], color: C9.c, label: 'I_{CA}', g: 'i', w: 1.8 },
      { z: Cx.neg(Ip[2]), from: Ip[0], color: C9.c, label: sh ? '' : '−I_{CA}', g: 'i', dash: [6, 4], w: 2.2, lmid: 1 }, { z: IL, color: '#ff9b9b', label: 'I_{aA}', g: 'i', w: 3.8 }],
      { title: sh ? 'I_aA = I_AB − I_CA' : t('I_aA = I_AB + (−I_CA): ยาว √3 เท่า ตามหลัง 30°', 'I_aA = I_AB + (−I_CA): √3 times longer, 30° behind'), max: { i: Cx.abs(IL) * 1.04 }, arcs: [{ a: 1, b: 4, color: GREEN, r: 0.26, text: '30°' }] }); },
  waves: [{ title: (bd, k) => bd.short ? '' : k >= 3 ? t('i_aA = i_AB − i_CA (ค่ายอด)', 'i_aA = i_AB − i_CA (peak)') : k >= 2 ? t('กระแสเฟส i_AB และ i_CA (ค่ายอด)', 'phase currents i_AB and i_CA (peak)') : t('ยังไม่มีกระแส', 'no current yet'),
    sigs: (bd, k) => { if (k < 2) return []; const c = bd.ckt, s = [iWave(rms(c.I('ZAB')), C9.a, 'i_{AB}'), iWave(rms(c.I('ZCA')), C9.c, 'i_{CA}')];
      if (k >= 3) s.push(iWave(rms(c.I('wa')), '#ff9b9b', 'i_{aA}', { w: 3.4, peak: true })); return s; } }],
  steps: () => [step(t('<b>หนึ่งเฟสของเดลตา</b>: แรงดันคร่อม = แรงดันสาย, กำลัง = 1200/3, มุมจากตัวประกอบกำลัง (ค่ายังผลทั้งหมด)', '<b>One phase of the delta</b>: the voltage across it is the line voltage, power 1200/3, angle from the power factor (all rms)'),
      block([R`V_p &= V_L = 300\ \text{V}`, R`P_p &= \frac{1200}{3} = 400\ \text{W}`, R`\theta &= \cos^{-1}0.8 = +36.87^\circ\ (\text{${t('ตามหลัง', 'lagging')}})`])),
    step(t('<b>กระแสเฟส</b> จาก \\(P_p = V_LI_p\\cos\\theta\\) (จุดเริ่มวิ่งในทั้งสามเฟส)', '<b>The phase current</b> from \\(P_p = V_LI_p\\cos\\theta\\) (the dots start in all three phases)'),
      block([R`400 &= (300)\,I_p\,(0.8)`, R`I_p &= ${fd(E3.Ip, 4)}\ \text{A}`])),
    step(t('<b>กระแสสาย</b> (สิ่งที่โจทย์ถาม): ที่มุม A กระแสเฟสสองตัวมาพบกัน \\(\\mathbf{I}_{aA} = \\mathbf{I}_{AB} - \\mathbf{I}_{CA}\\) ยาวกว่า \\(\\sqrt3\\) เท่า (ภาพ)', '<b>The line current</b> (what the problem asks): two phase currents meet at corner A, \\(\\mathbf{I}_{aA} = \\mathbf{I}_{AB} - \\mathbf{I}_{CA}\\), \\(\\sqrt3\\) times longer (picture)'),
      block([R`I_L &= \sqrt3\,I_p = \sqrt3(${fd(E3.Ip, 4)})`, R`&= \boxed{${fd(E3.IL, 4)}\ \text{A}}`])),
    step(t('<b>อิมพีแดนซ์ต่อเฟส</b>', '<b>The phase impedance</b>'),
      block([R`Z_p &= \frac{V_L}{I_p}\angle\theta = \frac{300}{${fd(E3.Ip, 4)}}\angle{36.87^\circ}`, R`&= \boxed{${fd(E3.Zm, 2)}\angle{36.87^\circ}\ \Omega} = ${RC(E3.Z, 2)}\ \Omega`]),
      t('ตรงกับ Hayt Example 12.5 (\\(I_p = 1.667\\) A, \\(I_L = 2.89\\) A, \\(Z_p = 180\\angle 36.9^\\circ\\ \\Omega\\)) · เฉลยในห้องปี 2560 ต่างไปสองจุด (คำอธิบายอยู่กับเฉลยในห้องด้านล่าง)', 'This matches Hayt Example 12.5 (\\(I_p = 1.667\\) A, \\(I_L = 2.89\\) A, \\(Z_p = 180\\angle 36.9^\\circ\\ \\Omega\\)) · the 2017 class solution differs in two places (explained with the class solution below).'))],
  ask: () => ({ fields: [num('I<sub>L</sub> (A) =', E3.IL), num('|Z<sub>p</sub>| (Ω) =', E3.Zm)],
    check: v => near(v[0], E3.Ip, 0.01) ? t('1.667 A คือกระแสเฟส โจทย์ถามกระแสสาย คูณ \\(\\sqrt3\\)', '1.667 A is the phase current; the problem asks for the line current: multiply by \\(\\sqrt3\\).') : near(v[0], 2.36, 0.02) ? t('2.36 A มาจากการถือ 300 V เป็นค่ายอด (หารด้วย \\(\\sqrt2\\))', '2.36 A comes from taking 300 V as a peak value (dividing by \\(\\sqrt2\\)).') : near(v[1], 127.12, 0.2) ? t('127.12 Ω เอาแรงดันค่ายอดหารกระแสค่ายังผล (เฉลยปี 2560)', '127.12 Ω divides a peak voltage by an rms current (the 2017 solution).') : '' }),
  answer: () => t('\\(I_L = 2.887\\) A (\\(I_p = 1.667\\) A) และ \\(Z_p = 180\\angle 36.87^\\circ\\ \\Omega = 144 + j108\\ \\Omega\\)', '\\(I_L = 2.887\\) A (\\(I_p = 1.667\\) A) and \\(Z_p = 180\\angle 36.87^\\circ\\ \\Omega = 144 + j108\\ \\Omega\\).') };

/* =====================================================================================================================
   page 9.4: the homework of slide p. 20, V_bn = 220 V rms in negative sequence, 3000 W to a Y load at 0.95 lagging */
const HW = CH9C.hw, SHW = hideZ(zt => CH9C.yy({ Vp: 220, seq: -1, Z: HW.Z, neutral: 'wire', zt }), 4);
DEF.hw = { ...LAY, spec: SHW, solvedAt: 3, pad: 1.15, shortSpec: sp => CH9.short(sp), vo: () => ({ acPeak: false }),
  glow: k => k === 4 ? ['ZA', 'ZB', 'ZC'] : null,
  after: (v, k, s) => { CH9.letters(v, LET_SRC); CH9.letters(v, LET_Y, { color: '#e8ecf7' }); srcTags(v, s.B); if (k >= 3) { const { I, In } = yyState(v.ckt); lineTags(v, s.B, I, In); } },
  side: (ctx, b, bd, k) => { const sh = bd.short, S = HW.S;
    if (k < 1) return CH8.empty(ctx, b, ['ลำดับลบ: V_bn นำหน้า V_an อยู่ 120° แต่ขนาดของทุกค่าไม่เปลี่ยน', 'negative sequence: V_bn leads V_an by 120°, but no size changes']);
    if (k === 1) return CH6.plane(ctx, b, CH9.set(HW.V, ['V_{an}', 'V_{bn}', 'V_{cn}'], { w: 2.6 }), { title: sh ? t('ลำดับลบ', 'negative sequence') : t('แรงดันเฟส ลำดับลบ (ค่ายังผล)', 'phase voltages, negative sequence (rms)') });
    CH8.triangle(ctx, b, { title: sh ? t('กำลังรวม', 'total power') : t('สามเหลี่ยมของกำลังรวม · PF 0.95 ตามหลัง', 'triangle of the total power · PF 0.95 lagging'), max: { Q: S.im * 1.6 }, quad: false,
      segs: [{ S, color: C9.S, label: sh ? 'S' : `S = ${CH8.cfmt(S)}`, arc: true, lpos: -1, pl: sh ? '' : undefined, ql: sh ? '' : undefined }] }); },
  waves: [{ title: (bd, k) => bd.short ? '' : k >= 3 ? t('v_AN กับ i_AN ห่างกัน θ = 18.19°', 'v_AN and i_AN are θ = 18.19° apart') : t('ยังไม่มีกระแส', 'no current yet'),
    sigs: (bd, k) => { if (k < 3) return []; const c = bd.ckt; return [vWave(rms(c.Vab('ZA')), C9.L, 'v_{AN}', { w: 2.6, peak: true }), iWave(rms(c.I('ZA')), C9.a, 'i_{AN}', { w: 2.6, peak: true })]; } }],
  steps: () => { const V = HW.V;
    return [step(t('<b>แรงดันเฟส</b>: ระบบสมดุลมีแรงดันเฟสขนาดเท่ากันทุกตัว โจทย์ให้ \\(\\mathbf{V}_{bn}\\) จึงได้ \\(V_p = 220\\) V ลำดับลบเปลี่ยนเฉพาะมุม (ภาพ)', '<b>The phase voltage</b>: every phase voltage of a balanced system has the same size, so \\(\\mathbf{V}_{bn}\\) gives \\(V_p = 220\\) V; negative sequence only changes the angles (picture)'),
        block([R`V_p &= |\mathbf{V}_{bn}| = 220\ \text{V}`, R`V_L &= \sqrt3(220) = ${fd(HW.VL, 2)}\ \text{V}`]),
        t(`ถ้าให้ \\(\\mathbf{V}_{an} = ${P(V[0], 3, 0)}\\) จะได้ \\(\\mathbf{V}_{bn} = ${P(V[1], 3, 0)}\\) และ \\(\\mathbf{V}_{cn} = ${P(V[2], 3, 0)}\\) V`, `Taking \\(\\mathbf{V}_{an} = ${P(V[0], 3, 0)}\\) gives \\(\\mathbf{V}_{bn} = ${P(V[1], 3, 0)}\\) and \\(\\mathbf{V}_{cn} = ${P(V[2], 3, 0)}\\) V.`)),
      step(t('<b>กำลังต่อเฟสและมุมของโหลด</b> (ภาพ: สามเหลี่ยมของกำลังรวม)', '<b>Power per phase and the load angle</b> (picture: the triangle of the total power)'),
        block([R`P_p &= \frac{3000}{3} = 1000\ \text{W}`, R`\theta &= \cos^{-1}0.95 = ${fd(HW.th, 2)}^\circ\ (\text{${t('ตามหลัง', 'lagging')}})`])),
      step(t('<b>กระแสสาย</b> (โหลดวาย กระแสสาย = กระแสเฟส จุดเริ่มวิ่ง)', '<b>The line current</b> (Y load: line current = phase current; the dots start)'),
        block([R`I_L &= I_p = \frac{1000}{(220)(0.95)}`, R`&= \boxed{${fd(HW.IL, 4)}\ \text{A}}`])),
      step(t('<b>อิมพีแดนซ์ของแต่ละเฟส</b>', '<b>The impedance of each phase</b>'),
        block([R`Z_p &= \frac{220}{${fd(HW.IL, 4)}}\angle{${fd(HW.th, 2)}^\circ}`, R`&= \boxed{${fd(HW.Zm, 2)}\angle{${fd(HW.th, 2)}^\circ}\ \Omega} = ${RC(HW.Z, 2)}\ \Omega`])),
      step(t('<b>ตรวจด้วยสูตรกำลังรวม</b> \\(P = \\sqrt3V_LI_L\\cos\\theta\\)', '<b>Check with the total-power formula</b> \\(P = \\sqrt3V_LI_L\\cos\\theta\\)'),
        block([R`\sqrt3(${fd(HW.VL, 2)})(${fd(HW.IL, 4)})(0.95) &= 3000\ \text{W}\ \ \checkmark`]),
        t('ไม่มีเฉลยในเอกสาร (ฉบับแจกปี 2564 เรียกข้อนี้ว่า Quiz)', 'There is no solution in the handouts (the 2021 handout calls this a quiz).'))]; },
  ask: () => ({ fields: [num('I<sub>L</sub> (A) =', HW.IL), num('|Z<sub>p</sub>| (Ω) =', HW.Zm), num(t('มุม (°) =', 'angle (°) ='), HW.th, { tol: 0.05, w: 4 })],
    check: v => near(v[0], 3000 / (220 * 0.95), 0.05) ? t('14.35 A ใช้กำลังรวมทั้ง 3000 W กับเฟสเดียว ต้องหารด้วย 3 ก่อน', '14.35 A uses the whole 3000 W in one phase: divide by 3 first.') : near(v[0], 1000 / (220 / RT3 * 0.95), 0.05) ? t('ใช้ \\(220/\\sqrt3\\) ผิด: 220 V คือแรงดันเฟส \\(V_{bn}\\) อยู่แล้ว', 'Dividing 220 by \\(\\sqrt3\\) is wrong: 220 V is already the phase voltage \\(V_{bn}\\).') : '' }),
  answer: () => t('\\(I_L = 4.785\\) A และ \\(Z_p = 45.98\\angle 18.19^\\circ\\ \\Omega = 43.68 + j14.36\\ \\Omega\\)', '\\(I_L = 4.785\\) A and \\(Z_p = 45.98\\angle 18.19^\\circ\\ \\Omega = 43.68 + j14.36\\ \\Omega\\).') };

CH9.DEF = DEF;
/* the overlays, shared with the demos on the pages */
CH9.ov = { LET_SRC, LET_Y, LET_D, tag, lineTags, srcTags, yyState };
CH9.problem = (n, key, o = {}) => CH8.wire(n, DEF[key], o);
})(window);
