/* ch10ui.js — chapter 10 in the problem-by-problem format (built Oct 2026): magnetic circuits and transformers.
   Built on ch10.js (MagBoard, core and toroid drawings, B–H curves), ch10_circuits.js (CH10C numbers, geometries and specs), ch8.js (CH8.Prob,
   CH8.wire, bars, triangle) and lesson.js. Magnetic problems run on CH10.MagBoard: the iron core with its flux dots on top, the magnetic
   equivalent circuit (the engine, flux = current) and a side panel under it. Transformer problems are AC with rms values.
   CH10.DEF: toroid cast (page 10.1), ex102 relay thick twin (10.2), sine (10.3), speaker s220 (10.4), hayt (10.5)
   CH10.problem(n, key) wires a section like CH8.problem */
(function (global) {
'use strict';
const CH10 = global.CH10, C = global.CH10C, G = C.G, Cx = CK.Cx, cx = Cx.c, COL = CH6.COL, fd = CH6.fd, R = String.raw, MU0 = CH10.MU0, RT2 = Math.SQRT2;
const t = (th, en) => MC.t(th, en);
const step = (why, tex, note) => LS.step(why, tex, note), block = rows => LS.block(rows);
const S = (x, d = 4) => CH10.sciTex(x, d), sc = (x, d = 4) => CH10.sci(x, d);
const near = (x, a, tol) => Math.abs(x - a) <= (tol ?? Math.max(2e-3, 0.005 * Math.abs(a)));
const num = (label, ans, o = {}) => ({ label, w: o.w || 5, ok: x => near(x, ans, o.tol) });
const CY = CH10.COL.flux, PINK = '#ff7eb6', AMBER = '#ffd166', GREEN = '#7ee787', PURPLE = '#c792ea';
const magBadge = at => k => k >= at ? [['แก้แล้ว: ฟลักซ์ไหลในแกน', 'solved: the flux flows in the core'], 'ok'] : [['ยังไม่ได้หาฟลักซ์', 'flux not found yet'], 'wait'];
/* common options of a magnetic problem on the MagBoard */
/* (CH8.Prob passes cktFrac and rowAsp itself, so they sit at the top level; the MagBoard-only options go in boardOpts) */
const MAG = (at, o = {}) => ({ Board: CH10.MagBoard, view: CH10.mview, shortSpec: sp => CH8.margins(sp, o.pad ?? 0.9), pad: o.pad ?? 0.9, solvedAt: at, badge: magBadge(at), dotSpeed: 80,
  cktFrac: o.cktFrac ?? 0.5, rowAsp: o.rowAsp ?? 0.44, boardOpts: { cktTitle: o.cktTitle ?? ['วงจรสมมูลแม่เหล็ก', 'magnetic equivalent circuit'], coreAsp: o.coreAsp ?? 0.44, coreAspN: o.coreAspN ?? 0.78 } });
/* the core drawing of a problem: geo (object or (k, self) → geo), flux(k, self, board) → {path: value}, hi(k) → ids that glow, title(k, board) */
const core = (geo, flux, o = {}) => (ctx, b, bd, k, s) => { const st = s.st.fx || (s.st.fx = {}); st.dt = bd.dt; st.run = bd.clk.run;
  CH10.core(ctx, b, typeof geo === 'function' ? geo(k, s) : geo, Object.assign(st, { flux: flux(k, s, bd), dots: s.solved, ref: o.ref ? o.ref(k, s) : undefined, hi: new Set((o.hi && o.hi(k)) || []), title: o.title ? o.title(k, bd) : '', color: o.color })); };
const tor = (o, flux) => (ctx, b, bd, k, s) => { const st = s.st.fx || (s.st.fx = {}); st.dt = bd.dt; st.run = bd.clk.run; const q = typeof o === 'function' ? o(k, s, bd) : o;
  CH10.toroid(ctx, b, Object.assign({}, q, { flux: flux(k, s, bd), dots: s.solved, st })); };
const mmfBars = (ctx, b, bd, items, title) => CH8.bars(ctx, b, items, { title: bd.short ? 'mmf (At)' : title, unit: 'At', sum: true, fmt: v => fd(v, 1), sub: !bd.short });
const DEF = {};

/* =====================================================================================================================
   page 10.1: handout slide 20 (quiz), the toroid on silicon sheet steel */
const TO = C.toroid, SP_TO = C.series(TO.N * TO.i, [{ id: 'R', name: 'ℛ_core', value: TO.R }], { fText: `${fd(TO.N * TO.i, 0)} At` });
DEF.toroid = { ...MAG(3), spec: SP_TO,
  core: tor({ r1: 20, r2: 25, turns: 14, labels: { N: 'N = 250', i: 'i = 2.5 A', r: 'r = 22.5 cm', phi: 'Φ' }, wf: 0.3, cxf: 0.56 }, () => TO.Phi),
  glow: k => k === 2 ? ['F'] : k === 5 ? ['R'] : null,
  side: (ctx, b, bd, k) => { const sh = bd.short;
    if (k < 2) return CH10.bh(ctx, b, { mats: ['si'], hi: 'si', title: sh ? '' : t('เส้นโค้ง B–H ของเหล็กแผ่นซิลิคอน (สไลด์หน้า 7)', 'B–H curve of silicon sheet steel (slide p. 7)'), short: sh, names: false });
    CH10.bh(ctx, b, { mats: ['si'], hi: 'si', short: sh, names: false, title: sh ? '' : k >= 3 ? t('อ่านค่า B ที่ H = 442.1 At/m', 'read B at H = 442.1 At/m') : t('H = 442.1 At/m: ลากขึ้นไปหาเส้นโค้ง', 'H = 442.1 At/m: go up to the curve'),
      op: { H: TO.H, B: k >= 3 ? TO.B : 0, label: ['H = 442.1', k >= 3 ? 'B ≈ 1.225 T' : ''] } }); },
  steps: () => [step(t('<b>ความยาวเส้นทางเฉลี่ยและพื้นที่หน้าตัด</b> หน้าตัดเป็นวงกลมเส้นผ่านศูนย์กลาง \\(25 - 20 = 5\\) cm', '<b>Mean path length and cross-sectional area</b>: the cross section is a circle of diameter \\(25 - 20 = 5\\) cm'),
      block([R`r &= \frac{20 + 25}{2} = 22.5\ \text{cm}`, R`l &= 2\pi r = 2\pi(0.225) = ${fd(TO.l, 4)}\ \text{m}`, R`A &= \pi(0.025)^2 = ${S(TO.A, 4)}\ \text{m}^2`])),
    step(t('<b>H จากกฎวงจรของแอมแปร์</b> (Ampère\'s circuit law, สไลด์หน้า 8): \\(Hl = Ni\\) (เส้นโค้งข้างภาพจำลองแสดงตำแหน่ง H)', '<b>H from Ampère\'s circuit law</b> (slide p. 8): \\(Hl = Ni\\) (the curve beside the simulation marks H)'),
      block([R`H &= \frac{Ni}{l} = \frac{(250)(2.5)}{${fd(TO.l, 4)}}`, R`&= \boxed{${fd(TO.H, 1)}\ \text{At/m}}`])),
    step(t('<b>อ่าน B จากเส้นโค้ง B–H</b> ของเหล็กแผ่นซิลิคอน (สไลด์หน้า 7): แกนเป็นเหล็ก ใช้ \\(B = \\mu_0 H\\) ไม่ได้ และ \\(\\mu\\) ของเหล็กไม่คงที่ (ฟลักซ์เริ่มไหลในภาพจำลอง)', '<b>Read B from the B–H curve</b> of silicon sheet steel (slide p. 7): the core is iron, so \\(B = \\mu_0 H\\) does not apply and the iron\'s \\(\\mu\\) is not constant (the flux starts in the simulation)'),
      block([R`B &\approx \boxed{1.225\ \text{T}}`]), t('ในห้องอ่านได้ 1.225 T เท่ากับ P. C. Sen (Example 1.5)', 'The class read 1.225 T, the same as P. C. Sen (Example 1.5).')),
    step(t('<b>ฟลักซ์และฟลักซ์คล้อง</b> (ถือว่า B ทั่วหน้าตัดเท่ากับที่รัศมีเฉลี่ย)', '<b>Flux and flux linkage</b> (taking B over the whole cross section equal to its value at the mean radius)'),
      block([R`\Phi &= BA = (1.225)(${S(TO.A, 4)}) = ${S(TO.Phi, 4)}\ \text{Wb}`, R`\lambda &= N\Phi = (250)(${S(TO.Phi, 4)}) = ${fd(TO.lam, 4)}\ \text{Wb-turn}`])),
    step(t('<b>ความเหนี่ยวนำ</b> (สไลด์หน้า 13) และตรวจด้วยรีลักแตนซ์ \\(L = N^2/\\mathcal{R}\\)', '<b>The inductance</b> (slide p. 13), checked with the reluctance \\(L = N^2/\\mathcal{R}\\)'),
      block([R`L &= \frac{\lambda}{i} = \frac{${fd(TO.lam, 4)}}{2.5} = \boxed{${fd(TO.L, 4)}\ \text{H}}`, R`\mu &= \frac{B}{H} = ${S(TO.mu, 4)}\ \text{H/m}\ \ (\mu_r = ${fd(TO.mur, 0)})`, R`\mathcal{R} &= \frac{l}{\mu A} = ${S(TO.R, 4)}\ \text{At/Wb}`, R`L &= \frac{N^2}{\mathcal{R}} = \frac{250^2}{${S(TO.R, 4)}} = ${fd(TO.Lr, 4)}\ \text{H}\ \ \checkmark`]))],
  ask: () => ({ fields: [num(t('B (T) =', 'B (T) ='), TO.B, { tol: 0.03 }), num('L (H) =', TO.L, { tol: 0.006 })],
    check: v => v[0] < 0.01 ? t('แกนเป็นเหล็ก ห้ามใช้ \\(B = \\mu_0 H\\) ต้องอ่าน B จากเส้นโค้ง B–H', 'The core is iron: do not use \\(B = \\mu_0 H\\); read B from the B–H curve.') : '' }),
  answer: () => t('\\(H = 442.1\\) At/m, \\(B \\approx 1.225\\) T, \\(L \\approx 0.240\\) H ตรงกับเฉลยในห้อง (0.240 H) และ P. C. Sen Example 1.5', '\\(H = 442.1\\) At/m, \\(B \\approx 1.225\\) T, \\(L \\approx 0.240\\) H, as in the class solution (0.240 H) and P. C. Sen Example 1.5.') };

/* review sheet 3 (P. C. Sen P1.9): the cast steel toroid, then a 2 mm air gap */
const CS = C.cast, RcCS = CS.Fc / CS.Phi, RgCS = CS.Fg / CS.Phi;
const SP_CS0 = C.series(CS.Fc, [{ id: 'Rc', name: 'ℛ_c', value: RcCS }], { fText: `${fd(CS.Fc, 1)} At` }), SP_CS1 = C.series(CS.Fc + CS.Fg, [{ id: 'Rc', name: 'ℛ_c', value: RcCS }, { id: 'Rg', name: 'ℛ_g', value: RgCS }], { fText: `${fd(CS.Fc + CS.Fg, 1)} At` });
DEF.cast = { ...MAG(2), spec: k => k >= 4 ? SP_CS1 : SP_CS0,
  core: tor((k) => ({ r1: 6, r2: 10, turns: 12, gap: k >= 4 ? 7 : 0, gapLabel: k >= 4 ? 'l_g = 2 mm' : '', hiGap: k === 4, labels: { N: 'N = 200', i: 'i', r: 'r = 8 cm', phi: 'Φ' }, wf: 0.3, cxf: 0.52 }), () => 1),
  glow: k => k === 4 ? ['Rg'] : null,
  side: (ctx, b, bd, k) => { const sh = bd.short;
    if (k >= 4) return mmfBars(ctx, b, bd, [{ label: t('เหล็ก', 'iron'), v: CS.Fc, color: CY, sub: 'H_c l_c' }, { label: t('ช่องอากาศ', 'air gap'), v: CS.Fg, color: PINK, sub: 'H_g l_g' }], t('mmf ที่ต้องใช้ (At)', 'mmf needed (At)'));
    CH10.bh(ctx, b, { mats: ['cs'], hi: 'cs', short: sh, names: false, title: sh ? '' : t('เส้นโค้ง B–H ของเหล็กกล้าหล่อ', 'B–H curve of cast steel'), op: k >= 2 ? { H: CS.H, B: CS.B, label: ['H ≈ 1000', 'B = 1.2 T'] } : null }); },
  steps: () => [step(t('<b>ความยาวเส้นทางเฉลี่ยและพื้นที่หน้าตัด</b> รัศมีใน 6 cm รัศมีนอก 10 cm หน้าตัดวงกลมรัศมี 2 cm', '<b>Mean path length and cross-sectional area</b>: inner radius 6 cm, outer 10 cm, a circular cross section of radius 2 cm'),
      block([R`l_c &= 2\pi\frac{6 + 10}{2}\times10^{-2} = ${fd(CS.l, 4)}\ \text{m}`, R`A &= \pi(0.02)^2 = ${S(CS.A, 4)}\ \text{m}^2`])),
    step(t('<b>(a) อ่าน H ของเหล็กกล้าหล่อที่ B = 1.2 T</b> แล้วหา mmf และกระแส (ฟลักซ์เริ่มไหลในภาพจำลอง)', '<b>(a) Read H of cast steel at B = 1.2 T</b>, then the mmf and the current (the flux starts in the simulation)'),
      block([R`H_c &\approx 1000\ \text{At/m}`, R`F &= H_c l_c = (1000)(${fd(CS.l, 4)}) = ${fd(CS.Fc, 1)}\ \text{At}`, R`i &= \frac{F}{N} = \frac{${fd(CS.Fc, 1)}}{200} = \boxed{${fd(CS.i, 3)}\ \text{A}}`])),
    step(t('<b>(b) ฟลักซ์ในแกน</b> (ถือว่า B สม่ำเสมอทั่วหน้าตัด)', '<b>(b) The core flux</b> (uniform B over the cross section)'),
      block([R`\Phi &= BA = (1.2)(${S(CS.A, 4)}) = \boxed{${S(CS.Phi, 4)}\ \text{Wb}}`])),
    step(t('<b>(c) เจาะช่องอากาศ 2 mm</b>: ในอากาศ \\(\\mu = \\mu_0\\) จึงต้องใช้ H สูงมากเพื่อให้ได้ B เท่าเดิม (สไลด์หน้า 11 ซึ่งอยู่ในหน้า 10.2)', '<b>(c) A 2 mm air gap</b>: in air \\(\\mu = \\mu_0\\), so a very large H is needed for the same B (slide p. 11, on page 10.2)'),
      block([R`H_g &= \frac{B}{\mu_0} = \frac{1.2}{4\pi\times10^{-7}} = ${S(CS.B / MU0, 4)}\ \text{At/m}`, R`F_g &= H_g l_g = (${S(CS.B / MU0, 4)})(0.002) = ${fd(CS.Fg, 1)}\ \text{At}`])),
    step(t('<b>mmf รวมและกระแสใหม่</b> (เหล็กยังต้องการ \\(H_c = 1000\\) At/m เพราะ B เท่าเดิม)', '<b>Total mmf and the new current</b> (the iron still needs \\(H_c = 1000\\) At/m, B being the same)'),
      block([R`Ni &= H_c l_c + H_g l_g = ${fd(CS.Fc, 1)} + ${fd(CS.Fg, 1)}`, R`i &= \frac{${fd(CS.Fc + CS.Fg, 1)}}{200} = \boxed{${fd(CS.ig, 2)}\ \text{A}}`]),
      t(`ช่องอากาศยาวเพียง 2 mm แต่ใช้ mmf ถึง ${fd(100 * CS.Fg / (CS.Fc + CS.Fg), 0)} % กระแสจึงเพิ่ม ${fd(CS.ratio, 1)} เท่า (P. C. Sen คิดความยาวเหล็ก 0.503 m เท่าเดิม ถ้าหัก 2 mm ออก \\(H_cl_c\\) ลดเพียง 2 At)`, `The gap is only 2 mm long but takes ${fd(100 * CS.Fg / (CS.Fc + CS.Fg), 0)} % of the mmf, so the current grows ${fd(CS.ratio, 1)} times (P. C. Sen keeps the iron length at 0.503 m; removing the 2 mm lowers \\(H_cl_c\\) by only 2 At).`))],
  ask: () => ({ fields: [num(t('(a) i (A) =', '(a) i (A) ='), CS.i, { tol: 0.03 }), num(t('(b) Φ (mWb) =', '(b) Φ (mWb) ='), CS.Phi * 1e3, { tol: 0.015 }), num(t('(c) i (A) =', '(c) i (A) ='), CS.ig, { tol: 0.1 })],
    check: v => near(v[2], CS.Fg / CS.N, 0.1) ? t('ลืม mmf ของเหล็ก: ต้องรวม \\(H_cl_c\\) กับ \\(H_gl_g\\)', 'You left out the iron: add \\(H_cl_c\\) and \\(H_gl_g\\).') : '' }),
  answer: () => t('(a) 2.51 A (b) \\(1.51\\times10^{-3}\\) Wb (c) 12.06 A ตรงกับเฉลยของ P. C. Sen Problem 1.9 · ข้อนี้ไม่มีเฉลยในห้อง', '(a) 2.51 A (b) \\(1.51\\times10^{-3}\\) Wb (c) 12.06 A, as in P. C. Sen\'s solution to Problem 1.9 · there is no class solution.') };

/* =====================================================================================================================
   page 10.2: handout slide 14 (Example 10.2): a core with an air gap */
const E2 = C.ex102, SP_E2 = C.series(E2.F, [{ id: 'Rc', name: 'ℛ_c', value: E2.Rc }, { id: 'Rg', name: 'ℛ_g', value: E2.Rg }]);
const GE2 = G.rect({ W: 12, H: 9, t: 2, gap: 0.7, gapLabel: 'l_g = 1 mm', turns: 5, cur: 'i = 1 A', name: 'N = 400', phiLabel: 'Φ', mL: 5, mR: 4.4,
  labels: [{ x: 6, y: 4.6, text: 'l_c = 50 cm', color: '#9aa3c7', size: 13 }] });
DEF.ex102 = { ...MAG(4), spec: SP_E2, core: core(GE2, () => ({ m: E2.Phi }), { hi: k => k === 1 ? ['coil'] : k === 2 ? ['top', 'bot', 'left', 'rightA', 'rightB'] : k === 3 ? ['gap'] : null }),
  glow: k => k === 1 ? ['F'] : k === 2 ? ['Rc'] : k === 3 ? ['Rg'] : null,
  side: (ctx, b, bd, k) => { const sh = bd.short;
    if (k < 2) return CH8.empty(ctx, b, ['แหล่ง mmf ขับฟลักซ์ผ่านรีลักแตนซ์สองตัวที่ต่ออนุกรม', 'the mmf source drives the flux through two reluctances in series']);
    if (k < 4) return CH8.bars(ctx, b, [{ label: 'ℛ_c', v: E2.Rc / 1e3, color: CY, sub: t('เหล็ก 50 cm', 'iron 50 cm') }, { label: 'ℛ_g', v: k >= 3 ? E2.Rg / 1e3 : 0, color: PINK, sub: t('อากาศ 1 mm', 'air 1 mm') }],
      { title: sh ? 'ℛ (×10³ At/Wb)' : t('รีลักแตนซ์ (×10³ At/Wb)', 'reluctance (×10³ At/Wb)'), fmt: v => fd(v, 1), sub: !sh });
    mmfBars(ctx, b, bd, [{ label: 'F_c', v: E2.Fc, color: CY, sub: 'Φℛ_c' }, { label: 'F_g', v: E2.Fg, color: PINK, sub: 'Φℛ_g' }], t('mmf ที่ใช้ในแต่ละช่วง', 'mmf used by each part')); },
  steps: () => [step(t('<b>mmf ของขดลวด</b> (ขดลวดเรืองแสง)', '<b>The mmf of the coil</b> (the coil glows)'), block([R`F &= Ni = (400)(1.0) = 400\ \text{At}`])),
    step(t('<b>รีลักแตนซ์ของแกนเหล็ก</b> \\(\\mathcal{R} = l/(\\mu A)\\) (สไลด์หน้า 9)', '<b>The reluctance of the iron core</b>, \\(\\mathcal{R} = l/(\\mu A)\\) (slide p. 9)'),
      block([R`\mathcal{R}_c &= \frac{l_c}{\mu_r\mu_0A_c} = \frac{0.5}{(3000)(4\pi\times10^{-7})(15\times10^{-4})}`, R`&= ${fd(E2.Rc, 2)}\ \text{At/Wb}`])),
    step(t('<b>รีลักแตนซ์ของช่องอากาศ</b> (\\(\\mu_r = 1\\)) สั้นกว่าเหล็ก 500 เท่า แต่รีลักแตนซ์มากกว่า 6 เท่า', '<b>The reluctance of the air gap</b> (\\(\\mu_r = 1\\)): 500 times shorter than the iron, yet 6 times the reluctance'),
      block([R`\mathcal{R}_g &= \frac{l_g}{\mu_0A_g} = \frac{1\times10^{-3}}{(4\pi\times10^{-7})(15\times10^{-4})}`, R`&= ${fd(E2.Rg, 2)}\ \text{At/Wb}`])),
    step(t('<b>(a) ฟลักซ์และความหนาแน่นฟลักซ์ในช่องอากาศ</b>: ฟลักซ์เดียวกันผ่านทั้งเหล็กและอากาศ (วงจรอนุกรม \\(F = \\Phi(\\mathcal{R}_c + \\mathcal{R}_g)\\)) ฟลักซ์เริ่มไหล', '<b>(a) Flux and flux density in the air gap</b>: the same flux crosses the iron and the air (a series circuit, \\(F = \\Phi(\\mathcal{R}_c + \\mathcal{R}_g)\\)); the flux starts'),
      block([R`\Phi &= \frac{F}{\mathcal{R}_c + \mathcal{R}_g} = \frac{400}{${fd(E2.R, 2)}} = \boxed{${S(E2.Phi, 4)}\ \text{Wb}}`, R`B_g &= \frac{\Phi}{A_g} = \frac{${S(E2.Phi, 4)}}{15\times10^{-4}} = \boxed{${fd(E2.B, 4)}\ \text{T}}`]),
      t(`แผงข้างภาพ: mmf ส่วนใหญ่ (${fd(E2.Fg, 1)} จาก 400 At) ใช้ไปกับช่องอากาศ`, `The side panel: most of the mmf (${fd(E2.Fg, 1)} of 400 At) is used by the air gap.`)),
    step(t('<b>(b) ความเหนี่ยวนำ</b> \\(L = N^2/\\mathcal{R}\\) (สไลด์หน้า 13) ตรวจด้วย \\(L = \\lambda/i\\)', '<b>(b) The inductance</b>, \\(L = N^2/\\mathcal{R}\\) (slide p. 13), checked with \\(L = \\lambda/i\\)'),
      block([R`L &= \frac{N^2}{\mathcal{R}_c + \mathcal{R}_g} = \frac{400^2}{${fd(E2.R, 2)}} = \boxed{${fd(E2.L, 4)}\ \text{H}}`, R`L &= \frac{N\Phi}{i} = \frac{(400)(${S(E2.Phi, 4)})}{1.0} = ${fd(E2.lam, 4)}\ \text{H}\ \ \checkmark`]),
      t('เฉลยในห้องปี 2566 เขียน \\(L = 0.25\\) H ซึ่งตัดทศนิยมทิ้ง ค่าที่ถูกคือ 0.2585 H หรือปัดเป็น 0.26 H (P. C. Sen: 258.52 mH)', 'The 2023 class solution writes \\(L = 0.25\\) H, which drops the decimals; the value is 0.2585 H, or 0.26 H rounded (P. C. Sen: 258.52 mH).'))],
  ask: () => ({ fields: [num(t('Φ (×10⁻⁴ Wb) =', 'Φ (×10⁻⁴ Wb) ='), E2.Phi * 1e4), num('B<sub>g</sub> (T) =', E2.B), num('L (H) =', E2.L, { tol: 0.0015 })],
    check: v => near(v[0], 400 / E2.Rc * 1e4, 0.1) ? t('ลืมช่องอากาศ: ฟลักซ์ต้องผ่าน \\(\\mathcal{R}_c + \\mathcal{R}_g\\)', 'You left out the air gap: the flux must cross \\(\\mathcal{R}_c + \\mathcal{R}_g\\).') : near(v[2], 0.25, 0.0005) ? t('0.25 H คือค่าที่ตัดทศนิยมในห้อง ค่าที่ได้จริงคือ 0.2585 H', '0.25 H is the truncated class value; the result is 0.2585 H.') : '' }),
  answer: () => t('\\(\\Phi = 6.46\\times10^{-4}\\) Wb, \\(B_g = 0.431\\) T, \\(L = 0.2585\\) H ตรงกับ P. C. Sen Example 1.4 (เฉลยในห้อง: 0.43 T และ 0.25 H)', '\\(\\Phi = 6.46\\times10^{-4}\\) Wb, \\(B_g = 0.431\\) T, \\(L = 0.2585\\) H, as in P. C. Sen Example 1.4 (class solution: 0.43 T and 0.25 H).') };

/* 2017 Example 10.1 (P. C. Sen Ex 1.1): the relay. The area is not given, so the circuit carries one unit of flux and the tooltips show mmf */
const RY = C.relay, rTip = (p, c) => { const name = p.name ?? p.id, phi = Math.abs(c.I(p.id).re);
  if (p.type === 'V') return [name, `F = ${fd(p.value, 1)} At`, t('B = 0.8 T (ไม่ได้ให้พื้นที่ จึงหา Φ ไม่ได้)', 'B = 0.8 T (no area given, so no Φ)')];
  if (p.type === 'R') return [name, t(`mmf ที่ใช้ = ${fd(phi * p.value, 1)} At`, `mmf drop = ${fd(phi * p.value, 1)} At`)]; return null; };
const SP_RY = C.series(RY.F, [{ id: 'Rc', name: 'ℛ_c', value: RY.Fc }, { id: 'Rg1', name: 'ℛ_g', value: RY.Fg / 2 }, { id: 'Rg2', name: 'ℛ_g', value: RY.Fg / 2 }], { fText: `${fd(RY.F, 1)} At` }),
  SP_RY0 = C.series(RY.Fc, [{ id: 'Rc', name: 'ℛ_c', value: RY.Fc }], { fText: `${fd(RY.Fc, 1)} At` });
const GRY = closed => { const g = G.relay(); if (closed) { g.gaps = []; g.iron = g.iron.map(r => r.id === 'arm' ? { ...r, x: 9 } : r); g.paths[0].pts = [[1, 1], [10, 1], [10, 8], [1, 8], [1, 1]]; g.labels = g.labels.slice(0, 1).map(l => ({ ...l, x: 11.5 })); } g.coils[0].name = 'N = 500'; return g; };
const GRY0 = GRY(false), GRY1 = GRY(true);
DEF.relay = { ...MAG(3), view: { ...CH10.mview, tip: rTip }, spec: k => k >= 5 ? SP_RY0 : SP_RY, core: core(k => k >= 5 ? GRY1 : GRY0, () => ({ m: 1 }), { hi: k => k === 2 ? ['g1', 'g2'] : null }),
  glow: k => k === 1 ? ['Rc'] : k === 2 ? ['Rg1', 'Rg2'] : null,
  side: (ctx, b, bd, k) => { const sh = bd.short;
    if (k >= 3 && k !== 4) return mmfBars(ctx, b, bd, [{ label: t('เหล็ก', 'iron'), v: RY.Fc, color: CY, sub: 'H_c l_c' }, { label: t('ช่องอากาศ', 'air gaps'), v: k >= 5 ? 0 : RY.Fg, color: PINK, sub: '2 B l_g/μ_0' }], k >= 5 ? t('ไม่มีช่องอากาศ', 'no air gap') : t('mmf ที่ใช้ (At)', 'mmf used (At)'));
    CH10.bh(ctx, b, { mats: ['cs'], hi: 'cs', short: sh, names: false, title: sh ? '' : t('เหล็กกล้าหล่อ: B = 0.8 T', 'cast steel: B = 0.8 T'), op: k >= 1 ? { H: RY.Hc, B: RY.B, label: ['H ≈ 510', 'B = 0.8 T'] } : null,
      lin: k === 4 ? { mu: RY.mu, label: 'μ = B/H', color: PURPLE } : null }); },
  steps: () => [step(t('<b>ช่องอากาศเล็กมาก ไม่คิดการแผ่ของฟลักซ์ (fringing)</b>: B ในเหล็กเท่ากับในช่องอากาศ 0.8 T อ่าน H ของเหล็กกล้าหล่อจากเส้นโค้ง (สไลด์หน้า 7)', '<b>The gaps are small, so fringing is neglected</b>: B is 0.8 T in the iron and in the gaps; read H of cast steel from the curve (slide p. 7)'),
      block([R`H_c &\approx 510\ \text{At/m}`, R`F_c &= H_cl_c = (510)(0.36) = ${fd(RY.Fc, 1)}\ \text{At}`])),
    step(t('<b>mmf ของช่องอากาศสองช่อง</b> (ช่องละ 1.5 mm ในอากาศ \\(H_g = B/\\mu_0\\))', '<b>The mmf of the two gaps</b> (1.5 mm each; in air \\(H_g = B/\\mu_0\\))'),
      block([R`F_g &= \frac{B}{\mu_0}(2l_g) = \frac{0.8}{4\pi\times10^{-7}}(2)(1.5\times10^{-3})`, R`&= ${fd(RY.Fg, 1)}\ \text{At}`])),
    step(t('<b>(a) กระแสในขดลวด</b> (ฟลักซ์เริ่มไหล)', '<b>(a) The coil current</b> (the flux starts)'),
      block([R`F &= F_c + F_g = ${fd(RY.Fc, 1)} + ${fd(RY.Fg, 1)} = ${fd(RY.F, 1)}\ \text{At}`, R`i &= \frac{F}{N} = \frac{${fd(RY.F, 1)}}{500} = \boxed{${fd(RY.i, 2)}\ \text{A}}`]),
      t(`ช่องอากาศยาวรวมเพียง 3 mm เทียบกับเหล็ก 360 mm แต่ใช้ mmf ถึง ${fd(100 * RY.share, 0)} %`, `The gaps total only 3 mm against 360 mm of iron, yet take ${fd(100 * RY.share, 0)} % of the mmf.`)),
    step(t('<b>(b) ความซึมซาบ (permeability) ของแกน</b> คือความชันของเส้นตรงจากจุดกำเนิดถึงจุดทำงานบนเส้นโค้ง', '<b>(b) The permeability of the core</b>: the slope of the line from the origin to the operating point on the curve'),
      block([R`\mu_c &= \frac{B}{H_c} = \frac{0.8}{510} = \boxed{${S(RY.mu, 4)}\ \text{H/m}}`, R`\mu_r &= \frac{\mu_c}{\mu_0} = \boxed{${fd(RY.mur, 0)}}`]), t('P. C. Sen ปัด \\(\\mu_c\\) เป็น \\(1.57\\times10^{-3}\\) จึงได้ \\(\\mu_r = 1250\\)', 'P. C. Sen rounds \\(\\mu_c\\) to \\(1.57\\times10^{-3}\\) and gets \\(\\mu_r = 1250\\).')),
    step(t('<b>(c) ไม่มีช่องอากาศ</b> (ชิ้นเหล็กแนบสนิท) ต้องการ mmf เฉพาะของเหล็ก', '<b>(c) No air gap</b> (the armature closed): only the iron needs mmf'),
      block([R`i &= \frac{F_c}{N} = \frac{${fd(RY.Fc, 1)}}{500} = \boxed{${fd(RY.i0, 3)}\ \text{A}}`]), t(`น้อยกว่าเมื่อมีช่องอากาศ ${fd(RY.i / RY.i0, 1)} เท่า`, `${fd(RY.i / RY.i0, 1)} times less than with the gaps.`))],
  ask: () => ({ fields: [num(t('(a) i (A) =', '(a) i (A) ='), RY.i, { tol: 0.03 }), num('μ<sub>r</sub> =', RY.mur, { tol: 15 }), num(t('(c) i (A) =', '(c) i (A) ='), RY.i0, { tol: 0.005 })],
    check: v => near(v[0], (RY.Fc + RY.Fg / 2) / RY.N, 0.03) ? t('รถไฟฟ้ามีช่องอากาศสองช่อง: ใช้ \\(2l_g\\)', 'The relay has two gaps: use \\(2l_g\\).') : '' }),
  answer: () => t('(a) 4.19 A (b) \\(\\mu_c = 1.57\\times10^{-3}\\) H/m, \\(\\mu_r \\approx 1250\\) (c) 0.367 A ตรงกับ P. C. Sen Example 1.1 · ข้อนี้มีในสไลด์ปี 2560 แต่ไม่มีเฉลยในห้อง', '(a) 4.19 A (b) \\(\\mu_c = 1.57\\times10^{-3}\\) H/m, \\(\\mu_r \\approx 1250\\) (c) 0.367 A, as in P. C. Sen Example 1.1 · it is in the 2017 slides, with no class solution.') };

/* review sheet 2 (P. C. Sen P1.2): thick and thin sides */
const TK = C.thick, SP_TK = C.series(TK.F, [{ id: 'RT', name: 'ℛ_thick', value: TK.RT }, { id: 'RN', name: 'ℛ_thin', value: TK.RN }], { fText: '300 At' });
const GTK = (() => { const g = G.thick(); g.coils[0].name = 'N = 300'; g.coils[0].cur = 'i = 1 A'; return g; })();
DEF.thick = { ...MAG(3), spec: SP_TK, core: core(GTK, () => ({ m: TK.Phi })),
  glow: k => k === 2 ? ['RT', 'RN'] : null,
  side: (ctx, b, bd, k) => { const sh = bd.short;
    if (k < 2) return CH8.empty(ctx, b, ['ช่วงหนาและช่วงบางต่ออนุกรมกัน ฟลักซ์เดียวกันไหลผ่านทั้งสองช่วง', 'the thick and the thin parts are in series: one flux runs through both']);
    if (k < 4) return CH8.bars(ctx, b, [{ label: t('ขาหนา', 'thick'), v: TK.RT / 1e3, color: CY, sub: '70 cm, 150 cm²' }, { label: t('ขาบาง', 'thin'), v: TK.RN / 1e3, color: PINK, sub: '80 cm, 100 cm²' }],
      { title: sh ? 'ℛ (×10³ At/Wb)' : t('รีลักแตนซ์ (×10³ At/Wb)', 'reluctance (×10³ At/Wb)'), fmt: v => fd(v, 2), sub: !sh });
    CH8.bars(ctx, b, [{ label: t('ขาหนา', 'thick'), v: TK.BT, color: CY, sub: 'Φ/150 cm²' }, { label: t('ขาบาง', 'thin'), v: TK.BN, color: PINK, sub: 'Φ/100 cm²' }], { title: sh ? 'B (T)' : t('ความหนาแน่นฟลักซ์ (T)', 'flux density (T)'), fmt: v => fd(v, 4), sub: !sh }); },
  steps: () => [step(t('<b>ความยาวเส้นทางเฉลี่ยและพื้นที่หน้าตัดของแต่ละช่วง</b> (ลึก 10 cm เส้นทางเฉลี่ยผ่านกลางเนื้อเหล็ก)', '<b>Mean path length and area of each part</b> (10 cm deep; the mean path runs through the middle of the iron)'),
      block([R`l_\text{thick} &= 2(25 + 10) = 70\ \text{cm}`, R`A_\text{thick} &= 15\times10 = 150\ \text{cm}^2`, R`l_\text{thin} &= 2(25 + 15) = 80\ \text{cm}`, R`A_\text{thin} &= 10\times10 = 100\ \text{cm}^2`])),
    step(t('<b>รีลักแตนซ์ของสองช่วง</b> ต่ออนุกรมกันรอบแกน', '<b>The reluctances of the two parts</b>, in series around the core'),
      block([R`\mathcal{R}_\text{thick} &= \frac{0.70}{(2000)(4\pi\times10^{-7})(0.015)} = ${fd(TK.RT, 1)}\ \text{At/Wb}`, R`\mathcal{R}_\text{thin} &= \frac{0.80}{(2000)(4\pi\times10^{-7})(0.010)} = ${fd(TK.RN, 1)}\ \text{At/Wb}`, R`\mathcal{R} &= ${fd(TK.R, 1)}\ \text{At/Wb}`])),
    step(t('<b>(a) ฟลักซ์ในแกน</b> (ฟลักซ์เริ่มไหล)', '<b>(a) The core flux</b> (the flux starts)'), block([R`\Phi &= \frac{Ni}{\mathcal{R}} = \frac{(300)(1)}{${fd(TK.R, 1)}} = \boxed{${S(TK.Phi, 4)}\ \text{Wb}}`])),
    step(t('<b>(b) ความหนาแน่นฟลักซ์</b>: ฟลักซ์เดียวกันไหลผ่านทุกช่วง ช่วงที่บางกว่าจึงมี B สูงกว่า', '<b>(b) The flux densities</b>: the same flux runs through every part, so the thinner part has the higher B'),
      block([R`B_\text{thick} &= \frac{\Phi}{A_\text{thick}} = \frac{${S(TK.Phi, 4)}}{0.015} = \boxed{${fd(TK.BT, 4)}\ \text{T}}`, R`B_\text{thin} &= \frac{\Phi}{A_\text{thin}} = \frac{${S(TK.Phi, 4)}}{0.010} = \boxed{${fd(TK.BN, 4)}\ \text{T}}`]),
      t('ทั้งสองค่าต่ำกว่า 1 T มาก จึงถือว่า \\(\\mu_r = 2000\\) คงที่ได้ · เฉลยของ P. C. Sen (Problem 1.2) ใช้ 500 รอบ จึงได้ฟลักซ์ 9.92 mWb', 'Both are well below 1 T, so a constant \\(\\mu_r = 2000\\) is fair · P. C. Sen\'s solution (Problem 1.2) uses 500 turns and gets 9.92 mWb.'))],
  ask: () => ({ fields: [num(t('Φ (mWb) =', 'Φ (mWb) ='), TK.Phi * 1e3), num('B<sub>thick</sub> (T) =', TK.BT), num('B<sub>thin</sub> (T) =', TK.BN)],
    check: v => near(v[0], 500 / TK.R * 1e3, 0.02) ? t('โจทย์ในแผ่นทบทวนใช้ N = 300 รอบ (ไม่ใช่ 500)', 'The review sheet uses N = 300 turns (not 500).') : '' }),
  answer: () => t('\\(\\Phi = 5.95\\times10^{-3}\\) Wb, \\(B_\\text{thick} = 0.397\\) T, \\(B_\\text{thin} = 0.595\\) T · ไม่มีเฉลยในห้อง', '\\(\\Phi = 5.95\\times10^{-3}\\) Wb, \\(B_\\text{thick} = 0.397\\) T, \\(B_\\text{thin} = 0.595\\) T · there is no class solution.') };

/* 2017 Example 10.2 = review sheet 4 (P. C. Sen Ex 1.3): two coils, a gap in the centre leg */
const TW = C.twin, SP_TW = C.twinSpec();
DEF.twin = { ...MAG(5, { cktFrac: 0.52 }), spec: SP_TW, core: core(G.twin(), () => ({ p1: TW.P1, p2: TW.P2, pc: TW.Pg }), { hi: k => k === 1 ? ['c1', 'c2'] : k === 3 ? ['gap', 'cA', 'cB'] : null }),
  glow: k => k === 1 ? ['F1', 'F2'] : k === 2 ? ['Ro1', 'Ro2'] : k === 3 ? ['Rbe', 'Rg'] : null,
  side: (ctx, b, bd, k) => { const sh = bd.short;
    if (k < 5) return CH8.empty(ctx, b, ['ฟลักซ์ของสองขดลวดมารวมกันในขาตรงกลาง เหมือนกระแสเมชสองวงที่ใช้กิ่งร่วมกัน', 'the fluxes of the two coils meet in the centre leg, like two mesh currents sharing a branch']);
    CH8.bars(ctx, b, [{ label: 'Φ_1', v: TW.P1 * 1e4, color: CY, sub: t('ขาซ้าย', 'left leg') }, { label: 'Φ_2', v: TW.P2 * 1e4, color: CY, sub: t('ขาขวา', 'right leg') }, { label: 'Φ_g', v: TW.Pg * 1e4, color: PINK, sub: t('ขากลาง', 'centre') }],
      { title: sh ? 'Φ (×10⁻⁴ Wb)' : t('ฟลักซ์ (×10⁻⁴ Wb): Φ_g = Φ_1 + Φ_2', 'flux (×10⁻⁴ Wb): Φ_g = Φ_1 + Φ_2'), fmt: v => fd(v, 3), sub: !sh }); },
  steps: () => [step(t('<b>mmf ของสองขดลวด</b> (500 รอบ 10 A ทั้งคู่)', '<b>The mmfs of the two coils</b> (500 turns at 10 A each)'), block([R`F_1 &= N_1I_1 = (500)(10) = 5000\ \text{At}`, R`F_2 &= N_2I_2 = 5000\ \text{At}`])),
    step(t('<b>รีลักแตนซ์ของขาด้านนอก</b>: เส้นทาง b-a-f-e ยาว 3 × 52 cm หน้าตัด 2 × 2 cm (สมมาตรกับ b-c-d-e)', '<b>The reluctance of an outer path</b>: b-a-f-e is 3 × 52 cm long with a 2 × 2 cm cross section (b-c-d-e is the same by symmetry)'),
      block([R`\mathcal{R}_{bafe} &= \frac{3(0.52)}{(1200)(4\pi\times10^{-7})(4\times10^{-4})}`, R`&= ${S(TW.Ro, 4)}\ \text{At/Wb} = \mathcal{R}_{bcde}`])),
    step(t('<b>ขาตรงกลาง</b>: เหล็ก 52 − 0.5 = 51.5 cm กับช่องอากาศ 0.5 cm', '<b>The centre leg</b>: 52 − 0.5 = 51.5 cm of iron and a 0.5 cm gap'),
      block([R`\mathcal{R}_{be} &= \frac{0.515}{(1200)(4\pi\times10^{-7})(4\times10^{-4})} = ${S(TW.Rbe, 4)}\ \text{At/Wb}`, R`\mathcal{R}_g &= \frac{0.005}{(4\pi\times10^{-7})(4\times10^{-4})} = ${S(TW.Rg, 4)}\ \text{At/Wb}`])),
    step(t('<b>สมการลูปสองวง</b> เหมือนวิธีเมชของบทที่ 4: \\(\\Phi_1\\) วนซ้าย \\(\\Phi_2\\) วนขวา ขากลางมี \\(\\Phi_1 + \\Phi_2\\)', '<b>Two loop equations</b>, like the mesh method of chapter 4: \\(\\Phi_1\\) around the left, \\(\\Phi_2\\) around the right, \\(\\Phi_1 + \\Phi_2\\) in the centre leg'),
      block([R`\Phi_1(\mathcal{R}_{bafe} + \mathcal{R}_{be} + \mathcal{R}_g) + \Phi_2(\mathcal{R}_{be} + \mathcal{R}_g) &= F_1`, R`\Phi_1(${S(TW.a, 4)}) + \Phi_2(${S(TW.b, 4)}) &= 5000`, R`\Phi_1(${S(TW.b, 4)}) + \Phi_2(${S(TW.a, 4)}) &= 5000`]),
      t('P. C. Sen พิมพ์ \\(\\mathcal{R}_{be} = 0.82\\times10^6\\) และสัมประสิทธิ์ 13.34, 10.76 ซึ่งคลาดไปเล็กน้อย ค่าที่คำนวณได้คือ \\(0.854\\times10^6\\) แต่คำตอบสุดท้ายของ P. C. Sen ถูก', 'P. C. Sen prints \\(\\mathcal{R}_{be} = 0.82\\times10^6\\) and the coefficients 13.34, 10.76, slightly off; the value is \\(0.854\\times10^6\\), but P. C. Sen\'s final answer is right.')),
    step(t('<b>แก้สมการ</b>: สองวงสมมาตร \\(\\Phi_1 = \\Phi_2\\) (ฟลักซ์เริ่มไหล วงจรสมมูลให้ค่าเดียวกัน)', '<b>Solve</b>: the two loops are symmetric, \\(\\Phi_1 = \\Phi_2\\) (the flux starts; the equivalent circuit gives the same values)'),
      block([R`\Phi_1 = \Phi_2 &= \frac{5000}{${S(TW.a, 4)} + ${S(TW.b, 4)}} = ${S(TW.P1, 4)}\ \text{Wb}`])),
    step(t('<b>ฟลักซ์ ความหนาแน่นฟลักซ์ และความเข้มสนามในช่องอากาศ</b>', '<b>Flux, flux density and field intensity in the air gap</b>'),
      block([R`\Phi_g &= \Phi_1 + \Phi_2 = \boxed{${S(TW.Pg, 4)}\ \text{Wb}}`, R`B_g &= \frac{\Phi_g}{A_g} = \frac{${S(TW.Pg, 4)}}{4\times10^{-4}} = \boxed{${fd(TW.Bg, 4)}\ \text{T}}`, R`H_g &= \frac{B_g}{\mu_0} = \boxed{${S(TW.Hg, 4)}\ \text{At/m}}`]))],
  ask: () => ({ fields: [num(t('Φ<sub>g</sub> (×10⁻⁴ Wb) =', 'Φ<sub>g</sub> (×10⁻⁴ Wb) ='), TW.Pg * 1e4), num('B<sub>g</sub> (T) =', TW.Bg), num(t('H<sub>g</sub> (×10⁵ At/m) =', 'H<sub>g</sub> (×10⁵ At/m) ='), TW.Hg * 1e-5)],
    check: v => near(v[0], TW.P1 * 1e4, 0.02) ? t('นั่นคือ \\(\\Phi_1\\) ขาตรงกลางมี \\(\\Phi_1 + \\Phi_2\\)', 'That is \\(\\Phi_1\\); the centre leg carries \\(\\Phi_1 + \\Phi_2\\).') : '' }),
  answer: () => t('\\(\\Phi_g = 4.13\\times10^{-4}\\) Wb, \\(B_g = 1.034\\) T, \\(H_g = 8.22\\times10^5\\) At/m ตรงกับ P. C. Sen Example 1.3', '\\(\\Phi_g = 4.13\\times10^{-4}\\) Wb, \\(B_g = 1.034\\) T, \\(H_g = 8.22\\times10^5\\) At/m, as in P. C. Sen Example 1.3.') };

/* =====================================================================================================================
   page 10.3: 2017 Example 10.4 (P. C. Sen Ex 1.6), a coil on a 120 V, 60 Hz supply */
const SN = C.sine, SP_SN = { mode: 'ac', w: SN.w, ground: 'b0', nodes: { t0: [0, 0], b0: [0, 3], t1: [4, 0], b1: [4, 3] },
  parts: [{ id: 'Vs', type: 'VAC', a: 't0', b: 'b0', amp: SN.V * RT2, phase: 90, name: 'v', valText: '120 V, 60 Hz', side: -1 }, { type: 'W', id: 'w1', a: 't0', b: 't1' },
    { id: 'L', type: 'L', a: 't1', b: 'b1', value: SN.L, name: 'L = N²/ℛ', valText: `${fd(SN.L, 4)} H`, side: 1 }, { type: 'W', id: 'w2', a: 'b1', b: 'b0' }] };
DEF.sine = { ...MAG(2, { cktTitle: ['วงจรไฟฟ้า: ขดลวดคือตัวเหนี่ยวนำ', 'electric circuit: the coil is an inductor'] }), view: { acPeak: false, acPower: false }, shortSpec: undefined, spec: SP_SN, dotSpeed: 90,
  core: core(G.rect({ W: 11, H: 9, t: 2, turns: 6, cur: 'i', name: 'N = 200', phiLabel: 'Φ', mL: 5 }), (k, s, bd) => ({ m: Math.sin(bd.clk.ph) }), { ref: () => 1, color: PURPLE, title: (k, bd) => bd.short ? '' : t('ฟลักซ์สลับ (สีม่วง): Φ = Φmax sin ωt', 'alternating flux (purple): Φ = Φmax sin ωt') }),
  side: (ctx, b, bd, k) => { const sh = bd.short, V = CH6.polar(SN.V, 90), I = CH6.polar(SN.im / RT2, 0), F = CH6.polar(SN.Pm, 0);
    if (k < 2) return CH8.empty(ctx, b, ['แรงดันไซน์ทำให้ฟลักซ์เป็นไซน์ ขนาด Φmax = E/(4.44 f N)', 'a sinusoidal voltage makes a sinusoidal flux of Φmax = E/(4.44 f N)']);
    const vec = [{ z: V, color: COL.V, label: 'V', g: 'v' }]; if (k >= 4) vec.push({ z: I, color: COL.I, label: 'I', g: 'i', w: 3 }); vec.push({ z: F, color: PURPLE, label: 'Φ', g: 'f', w: 3.4 });   // Φ on top of the longer I
    CH6.plane(ctx, b, vec, { title: sh ? t('V นำ Φ 90°', 'V leads Φ by 90°') : k >= 4 ? t('เฟเซอร์ (คนละสเกล): V นำหน้า Φ และ I อยู่ 90°', 'phasors (own scales): V leads Φ and I by 90°') : t('เฟเซอร์ (คนละสเกล): V นำหน้า Φ อยู่ 90°', 'phasors (own scales): V leads Φ by 90°'),
      arcs: [{ a: vec.length - 1, b: 0, color: GREEN, r: 0.3, text: '90°' }], max: { f: SN.Pm * 1.6 } }); },
  waves: [{ title: (bd, k) => bd.short ? '' : k >= 4 ? t('e, i และ Φ (Φ กับ i เฟสเดียวกัน)', 'e, i and Φ (Φ and i in phase)') : t('แรงดัน e และฟลักซ์ Φ (คนละสเกล)', 'voltage e and flux Φ (own scales)'),
    sigs: (bd, k) => { if (k < 1) return []; const s = [{ mag: SN.Em, ang: 90, color: COL.V, label: 'e', unit: 'V', g: 'v', w: 2.4 }, { mag: SN.Pm * 1e3, ang: 0, color: PURPLE, label: 'Φ', unit: 'mWb', g: 'f', w: 2.6 }];
      if (k >= 4) s.push({ mag: SN.im, ang: 0, color: COL.I, label: 'i', unit: 'A', g: 'i', w: 2.6, peak: true }); return s; }, opts: () => ({ max: { f: SN.Pm * 1e3 * 1.6 } }) }],
  steps: () => [step(t('<b>สมการแรงดันเหนี่ยวนำ</b> (สไลด์ปี 2560 หน้า 22): \\(E_{rms} = 4.44fN\\Phi_{max}\\) โดย 120 V เป็นค่ายังผล', '<b>The induced-voltage equation</b> (2017 slide p. 22): \\(E_{rms} = 4.44fN\\Phi_{max}\\), with 120 V an rms value'),
      block([R`\Phi_{max} &= \frac{E_{rms}}{4.44fN} = \frac{120}{(4.44)(60)(200)}`, R`&= \boxed{${S(SN.Pm, 4)}\ \text{Wb}}`])),
    step(t('<b>(a) ความหนาแน่นฟลักซ์</b>: ใช้ฟลักซ์เป็นตัวอ้างอิง \\(\\Phi = \\Phi_{max}\\sin\\omega t\\) แบบเดียวกับสไลด์ (ฟลักซ์เริ่มไหล)', '<b>(a) The flux density</b>: take the flux as the reference, \\(\\Phi = \\Phi_{max}\\sin\\omega t\\), as the slide does (the flux starts)'),
      block([R`B_{max} &= \frac{\Phi_{max}}{A} = \frac{${S(SN.Pm, 4)}}{20\times10^{-4}} = ${fd(SN.Bm, 4)}\ \text{T}`, R`B &= \boxed{${fd(SN.Bm, 3)}\sin(2\pi60t)\ \text{T}}`])),
    step(t('<b>H สูงสุดของแกน</b> (แกนเชิงเส้น \\(\\mu_r = 2500\\))', '<b>The peak H of the core</b> (a linear core, \\(\\mu_r = 2500\\))'),
      block([R`\mu &= (2500)(4\pi\times10^{-7}) = ${S(SN.mu, 4)}\ \text{H/m}`, R`H_{max} &= \frac{B_{max}}{\mu} = ${fd(SN.Hm, 2)}\ \text{At/m}`])),
    step(t('<b>(b) กระแสในขดลวด</b> จาก \\(Hl = Ni\\): กระแสเฟสเดียวกับฟลักซ์ (กราฟ)', '<b>(b) The coil current</b> from \\(Hl = Ni\\): the current is in phase with the flux (graph)'),
      block([R`i_{max} &= \frac{H_{max}l}{N} = \frac{(${fd(SN.Hm, 2)})(1.0)}{200} = ${fd(SN.im, 4)}\ \text{A}`, R`i &= \boxed{${fd(SN.im, 3)}\sin(2\pi60t)\ \text{A}}`])),
    step(t('<b>ตรวจด้วยความเหนี่ยวนำ</b> (หน้า 10.2): ขดลวดคือตัวเหนี่ยวนำ \\(L = N^2/\\mathcal{R}\\) แรงดันนำหน้ากระแส 90°', '<b>Check with the inductance</b> (page 10.2): the coil is an inductor, \\(L = N^2/\\mathcal{R}\\); the voltage leads the current by 90°'),
      block([R`\mathcal{R} &= \frac{l}{\mu A} = ${fd(SN.R, 1)}\ \text{At/Wb}`, R`L &= \frac{N^2}{\mathcal{R}} = ${fd(SN.L, 4)}\ \text{H}`, R`I_{rms} &= \frac{120}{\omega L} = \frac{120}{${fd(SN.XL, 2)}} = ${fd(SN.V / SN.XL, 4)}\ \text{A}`, R`i_{max} &= \sqrt2(${fd(SN.V / SN.XL, 4)}) = ${fd(RT2 * SN.V / SN.XL, 4)}\ \text{A}\ \ \checkmark`]),
      t('ต่างจากขั้นที่ 4 ในหลักที่สี่เพราะสไลด์ใช้ 4.44 แทน \\(\\sqrt2\\pi = 4.443\\) · แรงดัน \\(e = N\\,d\\Phi/dt = E_{max}\\cos\\omega t = E_{max}\\sin(\\omega t + 90^\\circ)\\)', 'It differs from step 4 in the fourth digit because the slide uses 4.44 for \\(\\sqrt2\\pi = 4.443\\) · the voltage \\(e = N\\,d\\Phi/dt = E_{max}\\cos\\omega t = E_{max}\\sin(\\omega t + 90^\\circ)\\).'))],
  ask: () => ({ fields: [num(t('Φ<sub>max</sub> (mWb) =', 'Φ<sub>max</sub> (mWb) ='), SN.Pm * 1e3, { tol: 0.012 }), num('B<sub>max</sub> (T) =', SN.Bm, { tol: 0.006 }), num('i<sub>max</sub> (A) =', SN.im, { tol: 0.01 })],
    check: v => near(v[0], SN.cls.Pm * 1e3, 0.012) || near(v[1], SN.cls.Bm, 0.006) ? t('นั่นคือการหาร 120 V ด้วย \\(\\sqrt2\\) อีกครั้ง (ถือเป็นค่ายอด) แต่ 120 V คือค่ายังผลอยู่แล้ว', 'That divides 120 V by \\(\\sqrt2\\) once more (as a peak value), but 120 V is already rms.') : '' }),
  answer: () => t('\\(\\Phi_{max} = 2.25\\times10^{-3}\\) Wb, \\(B = 1.126\\sin(2\\pi60t)\\) T, \\(i = 1.79\\sin(2\\pi60t)\\) A ตรงกับ P. C. Sen Example 1.6 (เฉลยในห้องปี 2560 ถือ 120 V เป็นค่ายอด จึงได้ 1.59 mWb, 0.79 T)', '\\(\\Phi_{max} = 2.25\\times10^{-3}\\) Wb, \\(B = 1.126\\sin(2\\pi60t)\\) T, \\(i = 1.79\\sin(2\\pi60t)\\) A, as in P. C. Sen Example 1.6 (the 2017 class solution takes 120 V as a peak value and gets 1.59 mWb, 0.79 T).') };

/* =====================================================================================================================
   page 10.4: transformer slide 9 (Ex 1, P. C. Sen Ex 2.1): the speaker, without and with a 1 : 3 transformer */
const SPK = C.speaker, SP_SPK0 = C.xfSpec({ Vs: 10, Rs: 1, direct: true, load: { type: 'R', value: 9 }, loadName: t('ลำโพง 9 Ω', 'speaker 9 Ω'), srcText: '10 V', rsName: '1 Ω' }),
  SP_SPK1 = C.xfSpec({ Vs: 10, Rs: 1, n: 1 / 3, load: { type: 'R', value: 9 }, loadName: t('ลำโพง 9 Ω', 'speaker 9 Ω'), srcText: '10 V', rsName: '1 Ω', xfName: '1 : 3' });
const spkP = c => { const pr = id => c.P(id); return { Ps: pr('Rs'), Pl: pr('ZL') }; };
DEF.speaker = { spec: k => k >= 2 ? SP_SPK1 : SP_SPK0, solvedAt: 1, pad: 1.3, cktAspM: 0.42, view: { acPeak: false }, wideAt: 1e9,
  glow: k => k === 2 ? ['XF'] : k === 3 ? ['ZL'] : null,
  badge: k => k >= 2 ? [['ใส่หม้อแปลง 1 : 3', 'with the 1 : 3 transformer'], 'ok'] : [['ต่อลำโพงตรง', 'speaker connected directly'], 'wait'],
  side: (ctx, b, bd, k) => { const sh = bd.short; if (k < 1) return CH8.empty(ctx, b, ['ความต้านทานภายใน 1 Ω ของแหล่งจ่ายกินกำลังไปด้วย', 'the 1 Ω inside the source also takes power']);
    const p = spkP(bd.ckt); CH8.bars(ctx, b, [{ label: t('ลำโพง', 'speaker'), v: p.Pl, color: GREEN, sub: k >= 2 ? '25 W' : '9 W' }, { label: t('ภายในแหล่งจ่าย', 'inside source'), v: p.Ps, color: PINK, sub: '1 Ω' }],
      { title: sh ? 'P (W)' : t('กำลังเฉลี่ย (W)', 'average power (W)'), max: 26, fmt: v => fd(v, 1), sub: !sh }); },
  waves: [{ title: (bd, k) => bd.short ? '' : k >= 2 ? t('v₁ (ปฐมภูมิ) และ v₂ (ลำโพง) = 3 v₁', 'v₁ (primary) and v₂ (speaker) = 3 v₁') : t('แรงดันที่ลำโพง', 'voltage across the speaker'),
    sigs: (bd, k) => { if (k < 1) return []; const c = bd.ckt, vL = c.Vab('ZL'); const s = [{ mag: Cx.abs(vL), ang: CH6.deg(vL), color: GREEN, label: k >= 2 ? 'v_2' : 'v_L', unit: 'V', g: 'v', w: 2.6 }];
      if (k >= 2) { const v1 = c.Vab('XF'); s.unshift({ mag: Cx.abs(v1), ang: CH6.deg(v1), color: COL.V, label: 'v_1', unit: 'V', g: 'v', w: 2.2 }); } return s; } }],
  steps: () => [step(t('<b>(a) ไม่มีหม้อแปลง</b>: วงจรอนุกรมธรรมดา (จุดเริ่มวิ่ง)', '<b>(a) No transformer</b>: a plain series circuit (the dots start)'),
      block([R`I &= \frac{10}{1 + 9} = 1\ \text{A}`, R`P &= I^2R_2 = (1)^2(9) = \boxed{9\ \text{W}}`])),
    step(t('<b>(b) ใส่หม้อแปลง 1 : 3</b>: อัตราส่วนรอบ \\(a = N_1/N_2\\) (สไลด์หน้า 5)', '<b>(b) The 1 : 3 transformer</b>: turns ratio \\(a = N_1/N_2\\) (slide p. 5)'), block([R`a &= \frac{N_1}{N_2} = \frac13`])),
    step(t('<b>โอนอิมพีแดนซ์ของลำโพงไปด้านปฐมภูมิ</b> \\(Z_1 = a^2Z_2\\) (สไลด์หน้า 7–8)', '<b>Transfer the speaker to the primary side</b>, \\(Z_1 = a^2Z_2\\) (slides pp. 7–8)'),
      block([R`R_2' &= a^2R_2 = \left(\tfrac13\right)^2(9) = 1\ \Omega`]), t('เท่ากับความต้านทานภายในของแหล่งจ่ายพอดี: เงื่อนไขการส่งกำลังสูงสุดของบทที่ 5', 'Exactly the internal resistance of the source: the maximum power transfer condition of chapter 5.')),
    step(t('<b>กระแสและแรงดันด้านปฐมภูมิ</b>', '<b>Current and voltage on the primary side</b>'), block([R`I_1 &= \frac{10}{1 + 1} = 5\ \text{A}`, R`V_1 &= I_1R_2' = 5\ \text{V}`])),
    step(t('<b>กำลังที่ลำโพงได้</b> (หม้อแปลงอุดมคติไม่มีการสูญเสีย กำลังเข้า = กำลังออก)', '<b>The power the speaker takes</b> (an ideal transformer has no losses: power in = power out)'),
      block([R`P &= I_1^2R_2' = (5)^2(1) = \boxed{25\ \text{W}}`, R`&= V_2I_2 = \Big(\frac{5}{1/3}\Big)\Big(\tfrac13\cdot5\Big) = (15)(1.667) = 25\ \text{W}`]), t('มากกว่าการต่อตรง 2.8 เท่า', '2.8 times more than the direct connection.'))],
  ask: () => ({ fields: [num(t('(a) P (W) =', '(a) P (W) ='), SPK.P0), num(t('(b) P (W) =', '(b) P (W) ='), SPK.P)],
    check: v => near(v[1], 10 * 10 / (1 + 81), 0.05) ? t('ใช้ \\(a = 3\\) กลับข้าง: \\(a = N_1/N_2 = 1/3\\) จึงได้ \\(a^2R_2 = 1\\ \\Omega\\)', 'You used \\(a = 3\\), the wrong way round: \\(a = N_1/N_2 = 1/3\\), so \\(a^2R_2 = 1\\ \\Omega\\).') : '' }),
  answer: () => t('(a) 9 W (b) 25 W ตรงกับเฉลยในห้องและ P. C. Sen Example 2.1', '(a) 9 W (b) 25 W, as in the class solution and P. C. Sen Example 2.1.') };

/* transformer slide 16: ideal 220/110 V transformer feeding 3 + j4 Ω */
const S2 = C.s220, SP_S2 = C.xfSpec({ Vs: 220, n: 2, load: { type: 'Z', value: cx(3, 4) }, loadName: 'Z_L', loadText: '3 + j4 Ω', srcText: '220 V rms', xfName: '220/110 V' });
DEF.s220 = { ...MAG(2, { cktTitle: ['วงจรไฟฟ้า', 'electric circuit'] }), view: { acPeak: false, acPower: true }, shortSpec: undefined, spec: SP_S2, dotSpeed: 90,
  badge: k => k >= 2 ? [['แก้แล้ว: กระแสไหล', 'solved: the current flows'], 'ok'] : [['ยังไม่ได้แก้วงจร', 'not solved yet'], 'wait'],
  core: core(G.xf({ name1: 'N_1', name2: 'N_2', cur1: 'I_1', cur2: 'I_2' }), (k, s, bd) => ({ m: Math.sin(bd.clk.ph - Math.PI / 2) }), { ref: () => 1, title: (k, bd) => bd.short ? '' : t('220/110 V: ฟลักซ์สลับในแกนเดียวกัน', '220/110 V: one alternating flux in the core') }),
  glow: k => k === 2 ? ['ZL'] : k === 3 ? ['XF'] : null,
  side: (ctx, b, bd, k) => { const sh = bd.short; if (k < 4) return CH8.empty(ctx, b, ['หม้อแปลงอุดมคติ: กำลังเชิงซ้อนเข้าเท่ากับที่ออก', 'an ideal transformer: the complex power in equals the power out']);
    CH8.triangle(ctx, b, { title: sh ? 'S_in' : t('กำลังเชิงซ้อนด้านเข้า S_in', 'complex power in, S_in'), quad: false, segs: [{ S: S2.S, color: PINK, label: sh ? '|S|' : `|S| = ${fd(Cx.abs(S2.S), 0)} VA`, arc: true, lpos: -1, pl: sh ? '' : 'P = 1452 W', ql: sh ? '' : 'Q = 1936 VAR' }] }); },
  steps: () => [step(t('<b>อัตราส่วนรอบ</b> จากแรงดันพิกัด', '<b>The turns ratio</b> from the rated voltages'), block([R`a &= \frac{V_1}{V_2} = \frac{220}{110} = 2`])),
    step(t('<b>กระแสด้านโหลด</b> (ด้านทุติยภูมิ \\(V_2 = 110\\angle 0^\\circ\\) V ค่ายังผล)', '<b>The load current</b> (secondary side, \\(V_2 = 110\\angle 0^\\circ\\) V rms)'),
      block([R`\mathbf{I}_2 &= \frac{\mathbf{V}_2}{Z_L} = \frac{110\angle 0^\circ}{3 + j4} = \frac{110\angle 0^\circ}{5\angle 53.13^\circ}`, R`&= ${CH6.pol(S2.I2, 4, 2)}\ \text{A}`])),
    step(t('<b>กระแสด้านเข้า</b> \\(I_1 = I_2/a\\) (สไลด์หน้า 6) หรือโอนโหลดไปด้านปฐมภูมิ', '<b>The input current</b>, \\(I_1 = I_2/a\\) (slide p. 6), or transfer the load to the primary'),
      block([R`\mathbf{I}_{in} &= \frac{\mathbf{I}_2}{a} = \boxed{${CH6.pol(S2.I1, 4, 2)}\ \text{A}}`, R`Z_{in} &= a^2Z_L = 12 + j16\ \Omega \Rightarrow \mathbf{I}_{in} = \frac{220}{20\angle 53.13^\circ}\ \checkmark`])),
    step(t('<b>กำลังเชิงซ้อนด้านเข้า</b> \\(\\mathbf{S} = \\mathbf{V}\\mathbf{I}^*\\) (บทที่ 8)', '<b>The input complex power</b>, \\(\\mathbf{S} = \\mathbf{V}\\mathbf{I}^*\\) (chapter 8)'),
      block([R`\mathbf{S}_{in} &= (220\angle 0^\circ)(11\angle 53.13^\circ) = ${CH6.pol(S2.S, 4, 2)}\ \text{VA}`, R`&= ${CH6.rect(S2.S, 1)}\ \text{VA}`, R`S_{in} &= \boxed{2420\ \text{VA}},\ P_{in} = \boxed{1452\ \text{W}},\ Q_{in} = \boxed{1936\ \text{VAR}}`])),
    step(t('<b>ตรวจ</b>: หม้อแปลงอุดมคติ กำลังเชิงซ้อนเข้าเท่ากับที่ออก', '<b>Check</b>: in an ideal transformer the complex power in equals the power out'),
      block([R`\mathbf{V}_2\mathbf{I}_2^* &= (110)(22\angle 53.13^\circ) = 2420\angle 53.13^\circ\ \text{VA}\ \ \checkmark`]))],
  ask: () => ({ fields: [num('S<sub>in</sub> (VA) =', 2420), num('P<sub>in</sub> (W) =', 1452), num('Q<sub>in</sub> (VAR) =', 1936), num('|I<sub>in</sub>| (A) =', 11), num('a =', 2, { w: 3 })],
    check: v => near(v[3], 22, 0.05) ? t('22 A คือกระแสด้านโหลด ด้านเข้าคือ \\(I_2/a = 11\\) A', '22 A is the load current; the input current is \\(I_2/a = 11\\) A.') : near(v[4], 0.5, 0.01) ? t('\\(a = V_1/V_2 = 2\\) (ด้านแรงสูงหารด้วยด้านแรงต่ำ)', '\\(a = V_1/V_2 = 2\\).') : '' }),
  answer: () => t('\\(S_{in} = 2420\\angle 53.13^\\circ\\) VA, \\(P_{in} = 1452\\) W, \\(Q_{in} = 1936\\) VAR, \\(I_{in} = 11\\angle{-53.13^\\circ}\\) A, \\(a = 2\\) ตรงกับคำตอบที่เขียนบนสไลด์ในห้อง', '\\(S_{in} = 2420\\angle 53.13^\\circ\\) VA, \\(P_{in} = 1452\\) W, \\(Q_{in} = 1936\\) VAR, \\(I_{in} = 11\\angle{-53.13^\\circ}\\) A, \\(a = 2\\), as written on the class slide.') };

/* =====================================================================================================================
   page 10.5: transformer slide 15 (Hayt Example 13.7): 1 : 10 with the secondary dot at the bottom */
const HY = C.hayt, SP_HY = C.xfSpec({ Vs: 50, Rs: 100, n: 0.1, dot2: 'bottom', load: { type: 'R', value: 10e3 }, loadName: '10 kΩ', srcText: '50 V rms', rsName: '100 Ω', xfName: '1 : 10' });
DEF.hayt = { spec: SP_HY, solvedAt: 2, pad: 1.3, cktAspM: 0.42, view: { acPeak: false }, wideAt: 1e9,
  glow: k => k === 1 ? ['XF'] : k === 3 ? ['ZL'] : null,
  after: (v, k) => { if (k < 3) return; const [x, y] = v.P([6.0, 1.5]); CH6.tag(v.ctx, 'V_2 = 250∠180° V', x, y, '#c792ea', { size: 12 }); },   // inside the secondary loop
  side: (ctx, b, bd, k) => { const sh = bd.short; if (k < 2) return CH8.empty(ctx, b, ['จุดบนขดลวดบอกขั้วที่มีแรงดันเฟสเดียวกัน', 'the dots mark the terminals whose voltages are in phase']);
    const vec = [{ z: cx(HY.V1), color: COL.V, label: 'V_1', g: 'v', w: 2.6 }, { z: cx(HY.I1), color: COL.I, label: 'I_1', g: 'i', w: 2.6, dash: [6, 4] }];
    if (k >= 3) vec.push({ z: cx(HY.V2 / 10), color: PURPLE, label: sh ? 'V_2' : 'V_2/10', g: 'v', w: 2.6 }); if (k >= 4) vec.push({ z: cx(HY.I2 * 10), color: GREEN, label: sh ? 'I_2' : '10 I_2', g: 'i', w: 2.6, dash: [6, 4] });
    CH6.plane(ctx, b, vec, { title: sh ? t('V₂ ตรงข้าม V₁', 'V₂ opposite V₁') : t('V₂ และ I₂ ตรงข้ามกับ V₁, I₁ (ย่อขนาดให้เทียบกันได้)', 'V₂ and I₂ opposite V₁, I₁ (scaled to compare)'), max: { v: HY.V1 * 1.05, i: HY.I1 * 1.75 } }); },   // currents shorter than voltages so the collinear arrows stay apart
  waves: [{ title: (bd, k) => bd.short ? '' : k >= 3 ? t('v₁ และ v₂/10: กลับเฟสกัน', 'v₁ and v₂/10: opposite phase') : t('v₁', 'v₁'),
    sigs: (bd, k) => { if (k < 2) return []; const s = [{ mag: HY.V1 * RT2, ang: 0, color: COL.V, label: 'v_1', unit: 'V', g: 'v', w: 2.6 }];
      if (k >= 3) s.push({ mag: HY.V1 * RT2, ang: 180, color: PURPLE, label: 'v_2/10', unit: 'V', g: 'v', w: 2.6 }); return s; } }],
  steps: () => [step(t('<b>อัตราส่วนรอบและอิมพีแดนซ์ที่สะท้อนไปด้านปฐมภูมิ</b> (หม้อแปลงเรืองแสง)', '<b>Turns ratio and the impedance reflected to the primary</b> (the transformer glows)'),
      block([R`a &= \frac{N_1}{N_2} = \frac{1}{10}`, R`Z_1 &= a^2Z_2 = \left(\tfrac{1}{10}\right)^2(10\ \text{k}\Omega) = 100\ \Omega`])),
    step(t('<b>กระแสและแรงดันด้านปฐมภูมิ</b> (ค่ายังผล จุดเริ่มวิ่ง)', '<b>Current and voltage on the primary side</b> (rms; the dots start)'),
      block([R`\mathbf{I}_1 &= \frac{50\angle 0^\circ}{100 + 100} = \boxed{0.25\angle 0^\circ\ \text{A}}`, R`\mathbf{V}_1 &= \mathbf{I}_1Z_1 = \boxed{25\angle 0^\circ\ \text{V}}`])),
    step(t('<b>(a) V₂: ดูจุดขั้ว</b> (สไลด์หน้า 10–12): ด้านปฐมภูมิจุดอยู่บนและ + ของ V₁ อยู่บน แต่ด้านทุติยภูมิ<b>จุดอยู่ล่าง</b> ขณะที่ + ของ V₂ อยู่บน', '<b>(a) V₂: read the dots</b> (slides pp. 10–12): on the primary the dot and the + of V₁ are both at the top, but on the secondary <b>the dot is at the bottom</b> while V₂ is marked + at the top'),
      block([R`|\mathbf{V}_2| &= \frac{|\mathbf{V}_1|}{a} = 250\ \text{V}`, R`\mathbf{V}_2 &= -\frac{\mathbf{V}_1}{a} = \boxed{250\angle 180^\circ\ \text{V}} = -250\ \text{V}`])),
    step(t('<b>(b) I₂</b>: I₁ ไหลเข้าจุดด้านบน I₂ ตามเข็มนาฬิกาไหลเข้าจุดด้านล่าง mmf ของสองขดลวดจึงต้องหักล้างกัน \\(N_1I_1 + N_2I_2 = 0\\)', '<b>(b) I₂</b>: I₁ enters the top dot and the clockwise I₂ enters the bottom dot, so the two mmfs must cancel, \\(N_1I_1 + N_2I_2 = 0\\)'),
      block([R`\mathbf{I}_2 &= -a\mathbf{I}_1 = -\tfrac{1}{10}(0.25) = \boxed{0.025\angle 180^\circ\ \text{A}}`]), t('ตรวจ: \\(\\mathbf{V}_2 = (10\\ \\text{k}\\Omega)\\mathbf{I}_2 = -250\\) V ✓', 'Check: \\(\\mathbf{V}_2 = (10\\ \\text{k}\\Omega)\\mathbf{I}_2 = -250\\) V ✓')),
    step(t('<b>(c) กำลังเฉลี่ยในตัวต้านทาน 10 kΩ</b> (เครื่องหมายลบสองตัวคูณกันเป็นบวก)', '<b>(c) Average power in the 10 kΩ resistor</b> (the two minus signs cancel)'),
      block([R`P &= |\mathbf{V}_2||\mathbf{I}_2|\cos(180^\circ - 180^\circ) = (250)(0.025)`, R`&= \boxed{6.25\ \text{W}} = I_1^2(100)\ \ \checkmark`]),
      t('เฉลยในห้องเขียน \\(\\mathbf{V}_2 = 250\\angle 0^\\circ\\) V และ \\(\\mathbf{I}_2 = 0.025\\angle 0^\\circ\\) A โดยไม่ได้ดูจุดขั้ว ขนาดและกำลัง 6.25 W ถูก (Hayt Example 13.7 ให้เฉพาะขนาด)', 'The class solutions write \\(\\mathbf{V}_2 = 250\\angle 0^\\circ\\) V and \\(\\mathbf{I}_2 = 0.025\\angle 0^\\circ\\) A without reading the dots; the sizes and the 6.25 W are right (Hayt Example 13.7 gives sizes only).'))],
  ask: () => { const ok = (x, v) => Math.abs(v[1] * Math.cos(v[2] * Math.PI / 180) - HY.V2) < 1.5 && Math.abs(v[1] * Math.sin(v[2] * Math.PI / 180)) < 1.5;
    return { fields: [num('V<sub>1</sub> (V) =', 25), { label: t('V<sub>2</sub>: ขนาด (V) =', 'V<sub>2</sub>: size (V) ='), ok, w: 4.5 }, { label: t('มุม (°) =', 'angle (°) ='), ok, w: 4 }, num('P (W) =', 6.25)],
      check: v => near(v[1], 250, 1) && near(((v[2] % 360) + 360) % 360, 0, 1) ? t('ขนาดถูก แต่ดูจุดขั้ว: จุดด้านทุติยภูมิอยู่ล่าง ขณะที่ + ของ V₂ อยู่บน จึงได้ \\(-250\\) V (มุม 180°)', 'The size is right, but read the dots: the secondary dot is at the bottom while V₂ is + at the top, so \\(-250\\) V (angle 180°).') : '' }; },
  answer: () => t('\\(\\mathbf{V}_1 = 25\\angle 0^\\circ\\) V, \\(\\mathbf{V}_2 = 250\\angle 180^\\circ\\) V, \\(\\mathbf{I}_1 = 0.25\\angle 0^\\circ\\) A, \\(\\mathbf{I}_2 = 0.025\\angle 180^\\circ\\) A, \\(P = 6.25\\) W (Hayt Example 13.7: 250 mA, 25 mA, 6.25 W)', '\\(\\mathbf{V}_1 = 25\\angle 0^\\circ\\) V, \\(\\mathbf{V}_2 = 250\\angle 180^\\circ\\) V, \\(\\mathbf{I}_1 = 0.25\\angle 0^\\circ\\) A, \\(\\mathbf{I}_2 = 0.025\\angle 180^\\circ\\) A, \\(P = 6.25\\) W (Hayt Example 13.7: 250 mA, 25 mA, 6.25 W).') };

CH10.DEF = DEF;
CH10.problem = (n, key, o = {}) => CH8.wire(n, DEF[key], o);
})(window);
