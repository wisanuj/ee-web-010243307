/* ch11ui.js — chapter 11 in the problem-by-problem format (built Oct 2026): DC machines.
   Built on ch11.js (drawings, models), ch11_circuits.js (CH11C numbers and motor circuits), ch8.js (CH8.Prob, CH8.wire, bars) and lesson.js.
   The armature is drawn as Ra in series with the back emf (engine part 'motor'); its rotor bar turns while current flows.
   CH11.DEF: rev (page 11.1), lapwave (11.2), fan (11.3), ex1 ex2 ex3 (11.4) · CH11.problem(n, key) wires a section like CH8.problem */
(function (global) {
'use strict';
const CH11 = global.CH11, C = global.CH11C, COL = CH6.COL, fd = CH6.fd, R = String.raw;
const t = (th, en) => MC.t(th, en);
const step = (why, tex, note) => LS.step(why, tex, note), block = rows => LS.block(rows);
const near = (x, a, tol) => Math.abs(x - a) <= (tol ?? Math.max(2e-3, 0.005 * Math.abs(a)));
const num = (label, ans, o = {}) => ({ label, w: o.w || 5, ok: x => near(x, ans, o.tol) });
const GREEN = '#7ee787', PINK = '#ff7eb6', AMBER = '#ffd166', PURPLE = '#c792ea', ORANGE = '#ffa552', CY = '#5ad1ff';
const big = (x, d = 1) => fd(x, d).replace(/^(\d+)(\d{3})/, '$1\\,$2');   // 10\,800 in TeX
/* the rotor bar of the armature symbol turns at a visual speed ∝ the machine speed (n in rpm, or k → n) once the circuit is solved */
const spin = n => (dt, s) => { const p = s.ckt && s.ckt.part('M'); if (p && s.solved) p.angle = (p.angle || 0) + dt * Math.PI * Math.min(2, (typeof n === 'function' ? n(s.k) : n) / 1500); };
const LAY = { pad: 1.15, wideAt: 1e9, cktAspM: 0.5, rowAsp: 0.44, dotSpeed: 85, view: { acPeak: false } };
const DEF = {};

/* =====================================================================================================================
   page 11.1: P. C. Sen Problem 4.25, a dc machine across a 240 V line at 1200 rpm generating 230 V with Ia = 40 A */
const RV = C.rev, SP_RV0 = C.arm({ Vt: 240, Ra: RV.Ra, Eb: 230, raText: '? Ω', vtName: 'V_t' }), SP_RV1 = C.arm({ Vt: 240, Ra: RV.Ra, Eb: 230, vtName: 'V_t' }), SP_RV5 = C.arm({ Vt: 240, Ra: RV.Ra, Eb: 240, ebText: '240 V', vtName: 'V_t' });
const rvPlot = (ctx, b, bd, k) => { const sh = bd.short, I = n => (RV.Vt - RV.KF * C.rad(n)) / RV.Ra, pts = [];
  pts.push(k >= 5 ? { x: RV.nNL, y: 0, label: sh ? '1252' : t('ไม่มีโหลด 1252 rpm', 'no load 1252 rpm'), color: AMBER } : { x: 1200, y: 40, label: sh ? '40 A' : '1200 rpm, 40 A', color: PINK });
  CH11.plot(ctx, b, { x: [900, 1500], y: [-200, 200], xt: 100, yt: 100, xl: 'n (rpm)', yl: 'I_a (A)', title: sh ? '' : t('กระแสอาร์เมเจอร์ตามความเร็ว (V_t, Φ คงที่)', 'armature current against speed (V_t, Φ fixed)'),
    bands: [{ y0: 0, y1: 200, color: 'rgba(126,231,135,.08)', label: sh ? t('มอเตอร์', 'motor') : t('I_a > 0: มอเตอร์', 'I_a > 0: motor'), text: GREEN }, { y0: -200, y1: 0, color: 'rgba(90,209,255,.08)', label: sh ? t('เครื่องกำเนิด', 'generator') : t('I_a < 0: เครื่องกำเนิด', 'I_a < 0: generator'), text: CY }],
    curves: k >= 2 ? [{ f: I, color: PURPLE, w: 2.4 }] : [], pts }); };
DEF.rev = { ...LAY, spec: k => k >= 5 ? SP_RV5 : k >= 2 ? SP_RV1 : SP_RV0, solvedAt: 1, tick: spin(k => k >= 5 ? RV.nNL : 1200),
  glow: k => k === 2 ? ['Ra'] : k === 3 ? ['Ra', 'M'] : k === 4 ? ['M'] : null,
  badge: k => k >= 5 ? [['ไม่มีโหลด: Ea = Vt, กระแสเป็นศูนย์', 'no load: Ea = Vt, no current'], 'wait'] : k >= 1 ? [['กระแสจากสายเข้าเครื่อง: มอเตอร์', 'line → machine: a motor'], 'ok'] : [['มอเตอร์หรือเครื่องกำเนิด?', 'motor or generator?'], 'wait'],
  side: (ctx, b, bd, k) => { const sh = bd.short;
    if (k === 3 || k === 4) return CH8.bars(ctx, b, [{ label: 'V_{t}I_{a}', v: RV.Pin, color: CY, sub: t('จากสาย', 'from line') }, { label: 'E_{a}I_{a}', v: RV.Pd, color: GREEN, sub: t('แปลงเป็นกล', 'to mechanical') }, { label: 'I_a²R_a', v: RV.Pcu, color: PINK, sub: t('ความร้อน', 'heat') }],
      { title: sh ? t('กำลัง (W)', 'power (W)') : t('กำลัง (W): 9600 = 9200 + 400', 'power (W): 9600 = 9200 + 400'), fmt: v => fd(v, 0), sub: !sh });
    rvPlot(ctx, b, bd, k); },
  steps: () => [step(t('<b>(a) มอเตอร์หรือเครื่องกำเนิด</b>: แรงเคลื่อนไฟฟ้าที่เครื่องสร้าง \\(E_a = 230\\) V ต่ำกว่าแรงดันสาย 240 V กระแสจึงไหลจากสายเข้าเครื่อง (จุดเริ่มวิ่ง) เครื่องรับพลังงานไฟฟ้าแล้วให้พลังงานกล คือ<b>มอเตอร์</b> (สไลด์หน้า 3)', '<b>(a) Motor or generator</b>: the voltage the machine generates, \\(E_a = 230\\) V, is below the 240 V line, so current flows from the line into the machine (the dots start); it takes electrical energy and gives mechanical energy: a <b>motor</b> (slide p. 3)'),
      block([R`I_a &= \frac{V_t - E_a}{R_a} > 0 \quad (V_t > E_a)`]), t('ถ้าเครื่องถูกขับให้หมุนเร็วจน \\(E_a > V_t\\) กระแสจะไหลกลับออกสู่สาย เครื่องเดียวกันจะเป็นเครื่องกำเนิด (กราฟข้างภาพ ด้านล่างเส้นศูนย์)', 'If the machine were driven faster, so that \\(E_a > V_t\\), the current would flow back into the line and the same machine would be a generator (the graph beside, below the zero line).')),
    step(t('<b>(b) ความต้านทานของวงจรอาร์เมเจอร์</b> จากกฎแรงดันของเคียร์ชอฟฟ์ \\(V_t = E_a + I_aR_a\\)', '<b>(b) The armature-circuit resistance</b> from Kirchhoff\'s voltage law, \\(V_t = E_a + I_aR_a\\)'),
      block([R`R_a &= \frac{V_t - E_a}{I_a} = \frac{240 - 230}{40} = \boxed{0.25\ \Omega}`])),
    step(t('<b>(c) กำลังสูญเสียในอาร์เมเจอร์และกำลังแม่เหล็กไฟฟ้า</b> (electromagnetic power, \\(P_d = E_aI_a\\)) ซึ่งคือส่วนที่แปลงเป็นกำลังกล (สไลด์หน้า 22)', '<b>(c) The loss in the armature and the electromagnetic power</b>, \\(P_d = E_aI_a\\), the part converted to mechanical power (slide p. 22)'),
      block([R`I_a^2R_a &= (40)^2(0.25) = \boxed{400\ \text{W}}`, R`P_d &= E_aI_a = (230)(40) = \boxed{9200\ \text{W}}`, R`V_tI_a &= 9600\ \text{W} = 9200 + 400\ \ \checkmark`])),
    step(t('<b>(d) แรงบิดแม่เหล็กไฟฟ้า</b> จาก \\(P_d = T\\omega_m\\) (สไลด์หน้า 3: \\(vi = T\\omega\\))', '<b>(d) The electromagnetic torque</b> from \\(P_d = T\\omega_m\\) (slide p. 3: \\(vi = T\\omega\\))'),
      block([R`\omega_m &= \frac{2\pi(1200)}{60} = ${fd(RV.w, 2)}\ \text{rad/s}`, R`T &= \frac{P_d}{\omega_m} = \frac{9200}{${fd(RV.w, 2)}} = \boxed{${fd(RV.T, 2)}\ \text{N}{\cdot}\text{m}}`]),
      t('คู่มือเฉลยของ P. C. Sen ปัด \\(\\omega_m\\) เป็น 125.7 rad/s ได้ 73.19 N·m', 'P. C. Sen\'s solution manual rounds \\(\\omega_m\\) to 125.7 rad/s and gets 73.19 N·m.')),
    step(t('<b>(e) ปลดโหลดออก</b>: กระแสเกือบเป็นศูนย์ แรงดันตกคร่อม \\(R_a\\) หายไป \\(E_a\\) จึงเท่ากับ \\(V_t\\) และเมื่อฟลักซ์คงที่ \\(E_a = K\\phi\\omega_m\\) แปรตามความเร็ว (สไลด์หน้า 16)', '<b>(e) The load thrown off</b>: the current falls to almost zero, the drop across \\(R_a\\) vanishes, so \\(E_a = V_t\\); with the flux fixed, \\(E_a = K\\phi\\omega_m\\) follows the speed (slide p. 16)'),
      block([R`E_a &= V_t = \boxed{240\ \text{V}}`, R`n &= 1200\times\frac{240}{230} = \boxed{${fd(RV.nNL, 1)}\ \text{rpm}}`]),
      t('ข้อ (e)(ii) ของตำราคิดฟลักซ์ที่ลดลง 10 % เพราะปฏิกิริยาอาร์เมเจอร์ (armature reaction) ได้ 1127 rpm ซึ่งเกินขอบเขตของวิชานี้', 'Part (e)(ii) of the book takes a 10 % flux reduction from armature reaction and gets 1127 rpm, beyond this course.'))],
  ask: () => ({ fields: [num('R<sub>a</sub> (Ω) =', RV.Ra), num('P<sub>d</sub> (W) =', RV.Pd), num('T (N·m) =', RV.T, { tol: 0.15 }), num(t('n ไม่มีโหลด (rpm) =', 'no-load n (rpm) ='), RV.nNL, { tol: 1.5, w: 6 })],
    check: v => near(v[2], RV.Pin / RV.w, 0.3) ? t('ใช้ \\(V_tI_a\\) ไม่ได้: กำลังที่แปลงเป็นกลคือ \\(E_aI_a\\) (หัก \\(I_a^2R_a\\) แล้ว)', '\\(V_tI_a\\) is not it: the power converted is \\(E_aI_a\\) (after \\(I_a^2R_a\\)).') : near(v[3], 1200 * 230 / 240, 1.5) ? t('กลับด้าน: ไม่มีโหลด \\(E_a\\) ขึ้นเป็น 240 V ความเร็วจึงสูงขึ้น', 'Upside down: at no load \\(E_a\\) rises to 240 V, so the speed goes up.') : '' }),
  answer: () => t('(a) มอเตอร์ (b) 0.25 Ω (c) 400 W และ 9200 W (d) 73.2 N·m (e) 240 V, 1252 rpm ตรงกับคู่มือเฉลยของ P. C. Sen · ไม่มีเฉลยในห้อง', '(a) a motor (b) 0.25 Ω (c) 400 W and 9200 W (d) 73.2 N·m (e) 240 V, 1252 rpm, as in P. C. Sen\'s solution manual · there is no class solution.') };

/* =====================================================================================================================
   page 11.2: P. C. Sen Example 4.1, the same armature lap-wound (a = 4) and wave-wound (a = 2) */
const LW = C.lapwave, lwSpec = (a, iText) => C.paths(a, LW[a === 4 ? 'lap' : 'wave'].Ea, LW[a === 4 ? 'lap' : 'wave'].Ia, { eName: 'e', loadName: t('โหลด', 'load'), iText });
let SP_LAP, SP_WAVE5, SP_WAVE6;   // built on first use (MC.t needs the page language); the wave current is "? A" until step 6 finds it
DEF.lapwave = { ...LAY, cktAspM: 0.46, spec: k => k >= 6 ? (SP_WAVE6 || (SP_WAVE6 = lwSpec(2))) : k >= 5 ? (SP_WAVE5 || (SP_WAVE5 = lwSpec(2, '? A'))) : (SP_LAP || (SP_LAP = lwSpec(4))), solvedAt: 3,
  glow: k => k === 2 ? ['E0', 'E1', 'E2', 'E3'] : k === 4 ? ['RL'] : k === 5 ? ['E0', 'E1'] : k === 6 ? ['RL'] : null,
  badge: k => k >= 5 ? [['พันแบบเวฟ: 2 ทางขนาน', 'wave winding: 2 parallel paths'], 'ok'] : k >= 3 ? [['พันแบบแลป: 4 ทางขนาน', 'lap winding: 4 parallel paths'], 'ok'] : [['ยังไม่ได้หาแรงเคลื่อนไฟฟ้า', 'emf not found yet'], 'wait'],
  side: (ctx, b, bd, k) => { const sh = bd.short, g = 6, w = Math.floor((b.w - g) / 2), b1 = { x: b.x, y: b.y, w, h: b.h }, b2 = { x: b.x + w + g, y: b.y, w: b.w - w - g, h: b.h };
    if (k < 3) return CH8.empty(ctx, b, ['ขดลวดชุดเดียวกัน พันได้สองแบบ: แลป (ทางขนาน = จำนวนขั้ว) และเวฟ (2 ทางขนานเสมอ)', 'the same coils, wound two ways: lap (paths = poles) and wave (always 2 paths)']);
    const q = on => (on ? undefined : '?');   // not found yet
    CH8.bars(ctx, b1, [{ label: t('แลป', 'lap'), v: LW.lap.Ea, color: CY, sub: 'A = 4' }, { label: t('เวฟ', 'wave'), v: k >= 5 ? LW.wave.Ea : 0, text: q(k >= 5), color: PURPLE, sub: 'A = 2' }], { title: 'E_a (V)', fmt: v => fd(v, 1), sub: !sh, max: 450 });
    CH8.bars(ctx, b2, [{ label: t('แลป', 'lap'), v: k >= 4 ? LW.lap.Ia : 0, text: q(k >= 4), color: AMBER, sub: '4 × 100 A' }, { label: t('เวฟ', 'wave'), v: k >= 6 ? LW.wave.Ia : 0, text: q(k >= 6), color: ORANGE, sub: '2 × 100 A' }], { title: 'I_a (A)', fmt: v => fd(v, 0), sub: !sh, max: 420 }); },
  steps: () => [step(t('<b>จำนวนตัวนำและฟลักซ์ต่อขั้ว</b>: ขดลวด 33 ขด ขดละ 7 รอบ รอบหนึ่งมีตัวนำ 2 เส้น ขั้วครอบคลุม 75 % ของเส้นรอบวงอาร์เมเจอร์ แบ่งเป็น 4 ขั้ว', '<b>Conductors and flux per pole</b>: 33 coils of 7 turns, two conductors per turn; the poles cover 75 % of the armature periphery, shared by 4 poles'),
      block([R`Z &= 2\times33\times7 = 462`, R`A_p &= \frac{2\pi(0.125)(0.25)(0.75)}{4} = ${fd(LW.Ap, 5)}\ \text{m}^2`, R`\phi &= A_pB = (${fd(LW.Ap, 5)})(0.75) = ${fd(LW.Phi, 5)}\ \text{Wb}`])),
    step(t('<b>ค่าคงที่ของเครื่องแบบพันแลป</b> (lap winding): จำนวนทางขนาน A เท่ากับจำนวนขั้ว P (สไลด์หน้า 16 ซึ่งพิมพ์ว่า A = Z ดูหมายเหตุ)', '<b>The machine constant, lap winding</b>: the number of parallel paths A equals the number of poles P (slide p. 16, which prints A = Z; see the note)'),
      block([R`K &= \frac{PZ}{2\pi A} = \frac{(4)(462)}{2\pi(4)} = ${fd(LW.lap.Ka, 2)}`])),
    step(t('<b>แรงเคลื่อนไฟฟ้าที่ 1000 rpm</b> \\(E = K\\phi\\omega_m\\) (สไลด์หน้า 16) เท่ากับแรงเคลื่อนไฟฟ้าของทางขนานแต่ละทาง (จุดเริ่มวิ่ง)', '<b>The emf at 1000 rpm</b>, \\(E = K\\phi\\omega_m\\) (slide p. 16), the emf of each parallel path (the dots start)'),
      block([R`\omega_m &= \frac{2\pi(1000)}{60} = ${fd(LW.w, 2)}\ \text{rad/s}`, R`E_a &= (${fd(LW.lap.Ka, 2)})(${fd(LW.Phi, 5)})(${fd(LW.w, 2)}) = \boxed{${fd(LW.lap.Ea, 1)}\ \text{V}}`])),
    step(t('<b>กระแสในขดลวด แรงบิด และกำลัง</b> เมื่อ \\(I_a = 400\\) A: กระแสแยกเข้า 4 ทางขนานเท่า ๆ กัน', '<b>Coil current, torque and power</b> at \\(I_a = 400\\) A: the current divides equally among the 4 paths'),
      block([R`I_\text{coil} &= \frac{I_a}{A} = \frac{400}{4} = \boxed{100\ \text{A}}`, R`T &= K\phi I_a = (${fd(LW.lap.Ka, 2)})(${fd(LW.Phi, 5)})(400) = \boxed{${fd(LW.lap.T, 1)}\ \text{N}{\cdot}\text{m}}`, R`P &= E_aI_a = \boxed{${fd(LW.lap.P / 1000, 2)}\ \text{kW}} = T\omega_m`])),
    step(t('<b>พันแบบเวฟ</b> (wave winding): ทางขนานเหลือ 2 ทาง แต่ละทางมีรอบอนุกรมมากขึ้นเป็นสองเท่า แรงเคลื่อนไฟฟ้าจึงเป็นสองเท่า', '<b>Wave winding</b>: only 2 parallel paths, each with twice as many turns in series, so the emf doubles'),
      block([R`K &= \frac{(4)(462)}{2\pi(2)} = ${fd(LW.wave.Ka, 2)}`, R`E_a &= (${fd(LW.wave.Ka, 2)})(${fd(LW.Phi, 5)})(${fd(LW.w, 2)}) = \boxed{${fd(LW.wave.Ea, 1)}\ \text{V}}`])),
    step(t('<b>กระแส แรงบิด และกำลังของแบบเวฟ</b>: ขดลวดรับกระแสได้ 100 A เท่าเดิม', '<b>Current, torque and power, wave winding</b>: the coils carry the same 100 A'),
      block([R`I_a &= AI_\text{coil} = 2(100) = \boxed{200\ \text{A}}`, R`T &= (${fd(LW.wave.Ka, 2)})(${fd(LW.Phi, 5)})(200) = \boxed{${fd(LW.wave.T, 1)}\ \text{N}{\cdot}\text{m}}`, R`P &= (${fd(LW.wave.Ea, 1)})(200) = \boxed{${fd(LW.wave.P / 1000, 2)}\ \text{kW}}`]),
      t('ขดลวดชุดเดียวกันให้กำลังและแรงบิดเท่ากัน แบบแลปได้กระแสสูงแรงดันต่ำ แบบเวฟได้แรงดันสูงกระแสต่ำ · P. C. Sen ปัด \\(\\phi\\) เป็น 0.0276 Wb จึงได้ 212.5 V, 425 V และ 811.8 N·m', 'The same coils give the same power and torque: lap gives high current at low voltage, wave high voltage at low current · P. C. Sen rounds \\(\\phi\\) to 0.0276 Wb and gets 212.5 V, 425 V and 811.8 N·m.'))],
  ask: () => ({ fields: [num(t('K (แลป) =', 'K (lap) ='), LW.lap.Ka), num(t('E<sub>a</sub> แลป (V) =', 'lap E<sub>a</sub> (V) ='), LW.lap.Ea, { tol: 0.6 }), num('T (N·m) =', LW.lap.T, { tol: 2 }), num(t('E<sub>a</sub> เวฟ (V) =', 'wave E<sub>a</sub> (V) ='), LW.wave.Ea, { tol: 1.2 })],
    check: v => near(v[0], LW.Z * 4 / (2 * Math.PI * LW.Z), 0.01) ? t('A = Z ในสไลด์คือที่พิมพ์ผิด แบบแลป A เท่ากับจำนวนขั้ว (4)', 'A = Z on the slide is a misprint: for a lap winding A equals the number of poles (4).') : near(v[1], LW.lap.Ea * 60 / (2 * Math.PI), 2) ? t('ต้องแปลง rpm เป็น rad/s ก่อน: \\(\\omega_m = 2\\pi N/60\\)', 'Convert rpm to rad/s first: \\(\\omega_m = 2\\pi N/60\\).') : '' }),
  answer: () => t('แลป: K = 73.53, E<sub>a</sub> = 212.6 V, I<sub>coil</sub> = 100 A, T = 812 N·m, P = 85.0 kW · เวฟ: K = 147.06, E<sub>a</sub> = 425 V, I<sub>a</sub> = 200 A, T = 812 N·m, P = 85.0 kW ตรงกับ P. C. Sen Example 4.1', 'Lap: K = 73.53, E<sub>a</sub> = 212.6 V, I<sub>coil</sub> = 100 A, T = 812 N·m, P = 85.0 kW · wave: K = 147.06, E<sub>a</sub> = 425 V, I<sub>a</sub> = 200 A, T = 812 N·m, P = 85.0 kW, as in P. C. Sen Example 4.1.') };

/* =====================================================================================================================
   page 11.3: P. C. Sen Example 4.9, a 220 V series motor driving a fan (T ∝ n²); speed down to 200 rpm with an armature resistance */
const FN = C.fan, fanSpec = (Eb, Rae, raeText, ebText) => C.motor('series', { Vt: 220, Ra: FN.Ra, Rse: FN.Rsr, Eb, Rae, raeText, ebText, names: { Rse: 'R_sr', Eb: 'E_a' } });
const SP_FN0 = fanSpec(FN.Ea, 0, '0 Ω', '? V'), SP_FN1 = fanSpec(FN.Ea, 0, '0 Ω'), SP_FN3 = fanSpec(FN.Ea2, FN.Rae, '? Ω', '? V'), SP_FN5 = fanSpec(FN.Ea2, FN.Rae);
const nOf = (Tq, Rae) => C.rpm(220 / Math.sqrt(FN.Ksr * Tq) - (FN.Ra + FN.Rsr + Rae) / FN.Ksr);
DEF.fan = { ...LAY, spec: k => k >= 5 ? SP_FN5 : k >= 3 ? SP_FN3 : k >= 1 ? SP_FN1 : SP_FN0, solvedAt: 1, tick: spin(k => k >= 3 ? 200 : 300),
  glow: k => k === 1 ? ['Ra', 'Rse'] : k === 3 ? ['Rae'] : k === 5 ? ['Rae', 'M'] : null,
  badge: k => k >= 5 ? [['Rae = 7 Ω: 200 rpm, 16.67 A', 'Rae = 7 Ω: 200 rpm, 16.67 A'], 'ok'] : k >= 3 ? [['200 rpm: ต้องเพิ่ม Rae เท่าไร?', '200 rpm: how much Rae?'], 'wait'] : k >= 1 ? [['Rae = 0: 300 rpm, 25 A', 'Rae = 0: 300 rpm, 25 A'], 'ok'] : [['มอเตอร์อนุกรมขับพัดลม', 'series motor driving a fan'], 'wait'],
  side: (ctx, b, bd, k) => { const sh = bd.short, ops = [];
    if (k >= 2) ops.push({ T: FN.T, n: 300, label: sh ? '300' : '300 rpm, 155.2 N·m', color: PINK });
    if (k >= 5) ops.push({ T: FN.T2, n: 200, label: sh ? '200' : '200 rpm, 69.0 N·m', color: AMBER });
    CH11.ts(ctx, b, { Tmax: 200, nmax: 600, short: sh, title: sh ? '' : t('แรงบิด–ความเร็ว: มอเตอร์ และพัดลม (T ∝ n²)', 'torque–speed: motor and fan (T ∝ n²)'),
      curves: [{ f: Tq => nOf(Tq, 0), color: CY, label: 'R_ae = 0' }].concat(k >= 3 ? [{ f: Tq => nOf(Tq, FN.Rae), color: PURPLE, label: 'R_ae = 7 Ω', dash: k >= 5 ? null : [6, 4] }] : []),
      load: { f: Tq => 300 * Math.sqrt(Tq / FN.T), label: t('พัดลม', 'fan'), at: 0.32 }, ops }); },
  steps: () => [step(t('<b>(a) แรงเคลื่อนไฟฟ้าต้านกลับ</b>: มอเตอร์อนุกรม กระแส 25 A ไหลผ่านทั้ง \\(R_a\\) และขดลวดสนามอนุกรม \\(R_{sr}\\) (สไลด์หน้า 19) ยังไม่มีความต้านทานภายนอก (จุดเริ่มวิ่ง)', '<b>(a) The back emf</b>: in a series motor the 25 A flows through both \\(R_a\\) and the series field \\(R_{sr}\\) (slide p. 19); no external resistance yet (the dots start)'),
      block([R`E_a &= V_t - I_a(R_a + R_{sr}) = 220 - 25(0.6 + 0.4)`, R`&= \boxed{195\ \text{V}}`])),
    step(t('<b>กำลังที่ส่งให้พัดลมและแรงบิด</b> (ไม่คิดการสูญเสียจากการหมุน)', '<b>Power to the fan and the torque</b> (rotational loss neglected)'),
      block([R`P &= E_aI_a = (195)(25) = \boxed{${big(FN.P, 0)}\ \text{W}} = ${fd(FN.hp, 2)}\ \text{hp}`, R`\omega_m &= \frac{2\pi(300)}{60} = ${fd(FN.w, 3)}\ \text{rad/s}`, R`T &= \frac{P}{\omega_m} = \boxed{${fd(FN.T, 1)}\ \text{N}{\cdot}\text{m}}`]),
      t('P. C. Sen เขียน 4880 W (ปัดขึ้น) ได้ 6.54 hp และ 155.2 N·m', 'P. C. Sen writes 4880 W (rounded up), 6.54 hp and 155.2 N·m.')),
    step(t('<b>(b) แรงบิดที่พัดลมต้องการที่ 200 rpm</b>: แรงบิดของพัดลมแปรตามกำลังสองของความเร็ว (เส้นประในกราฟ)', '<b>(b) The torque the fan needs at 200 rpm</b>: a fan\'s torque follows the square of the speed (the dashed curve)'),
      block([R`T_{200} &= \left(\frac{200}{300}\right)^2(${fd(FN.T, 1)}) = \boxed{${fd(FN.T2, 2)}\ \text{N}{\cdot}\text{m}}`])),
    step(t('<b>กระแสที่ 200 rpm</b>: ในมอเตอร์อนุกรม ฟลักซ์แปรตามกระแส (ถือว่าแม่เหล็กเป็นเชิงเส้น) แรงบิดจึงแปรตาม \\(I_a^2\\)', '<b>The current at 200 rpm</b>: in a series motor the flux follows the current (magnetic linearity), so the torque follows \\(I_a^2\\)'),
      block([R`T &= K_{sr}I_a^2 \Rightarrow K_{sr} = \frac{${fd(FN.T, 1)}}{25^2} = ${fd(FN.Ksr, 4)}`, R`I_a &= \sqrt{\frac{${fd(FN.T2, 2)}}{${fd(FN.Ksr, 4)}}} = \boxed{${fd(FN.Ia2, 2)}\ \text{A}}`])),
    step(t('<b>ความต้านทานที่ต้องเพิ่ม</b>: \\(E_a = K_{sr}I_a\\omega_m\\) แล้วใช้กฎแรงดันของเคียร์ชอฟฟ์รอบวงจร (\\(R_{ae}\\) ปรากฏในวงจร)', '<b>The resistance to add</b>: \\(E_a = K_{sr}I_a\\omega_m\\), then Kirchhoff\'s voltage law round the circuit (\\(R_{ae}\\) appears in the circuit)'),
      block([R`E_a &= (${fd(FN.Ksr, 4)})(${fd(FN.Ia2, 2)})\left(\frac{2\pi(200)}{60}\right) = ${fd(FN.Ea2, 2)}\ \text{V}`, R`R_{ae} &= \frac{V_t - E_a}{I_a} - (R_a + R_{sr}) = \frac{220 - ${fd(FN.Ea2, 2)}}{${fd(FN.Ia2, 2)}} - 1.0`, R`&= \boxed{${fd(FN.Rae, 2)}\ \Omega}`, R`P &= E_aI_a = \boxed{${big(FN.P2, 0)}\ \text{W}} = ${fd(FN.hp2, 2)}\ \text{hp}`]),
      t('กำลังที่พัดลมได้ลดจาก 4875 W เหลือ 1444 W ส่วนต่างระหว่างกำลังจากสาย (220 × 16.67 = 3667 W) กับ 1444 W กลายเป็นความร้อนใน \\(R_{ae}\\) และขดลวด การคุมความเร็วแบบนี้จึงสิ้นเปลือง', 'The fan\'s power drops from 4875 W to 1444 W; the difference between the line power (220 × 16.67 = 3667 W) and 1444 W turns into heat in \\(R_{ae}\\) and the windings, so this kind of speed control is wasteful.'))],
  ask: () => ({ fields: [num('E<sub>a</sub> (V) =', FN.Ea), num('T (N·m) =', FN.T, { tol: 0.3 }), num('I<sub>a</sub> 200 rpm (A) =', FN.Ia2, { tol: 0.05, w: 6 }), num('R<sub>ae</sub> (Ω) =', FN.Rae, { tol: 0.05 })],
    check: v => near(v[2], 25 * (200 / 300) ** 2, 0.05) ? t('แรงบิดแปรตาม \\(I_a^2\\) กระแสจึงแปรตามความเร็ว (ไม่ใช่กำลังสอง)', 'The torque follows \\(I_a^2\\), so the current follows the speed (not its square).') : near(v[0], 220 - 25 * 0.6, 0.5) ? t('ลืมขดลวดสนามอนุกรม: กระแส 25 A ไหลผ่าน \\(R_{sr}\\) ด้วย', 'You left out the series field: the 25 A flows through \\(R_{sr}\\) too.') : '' }),
  answer: () => t('(a) E<sub>a</sub> = 195 V, P = 4875 W (6.54 hp), T = 155.2 N·m (b) T = 69.0 N·m, I<sub>a</sub> = 16.67 A, R<sub>ae</sub> = 7 Ω, P = 1444 W (1.94 hp) ตรงกับ P. C. Sen Example 4.9', '(a) E<sub>a</sub> = 195 V, P = 4875 W (6.54 hp), T = 155.2 N·m (b) T = 69.0 N·m, I<sub>a</sub> = 16.67 A, R<sub>ae</sub> = 7 Ω, P = 1444 W (1.94 hp), as in P. C. Sen Example 4.9.') };

/* =====================================================================================================================
   page 11.4: handout slides 26–28. Each circuit uses the true Eb (so the currents are right) but labels it "? V" until the step that finds it */
const E1 = C.ex1, E2 = C.ex2, E3 = C.ex3;
const SPEC = {}, exSpec = (type, E, shown) => SPEC[type + shown] || (SPEC[type + shown] = C.motor(type, { Vt: E.Vt, Ra: E.Ra, Rse: E.Rse, Rsh: E.Rsh, Eb: E.Eb, ebText: shown ? `${fd(E.Eb, E === E3 ? 2 : 1)} V` : '? V', names: { Rsh: 'R_sh', Rse: 'R_se' } }));   // one object per variant
const curBars = (ctx, b, bd, rows, title) => CH8.bars(ctx, b, rows, { title: bd.short ? t('กระแส (A)', 'current (A)') : title, fmt: v => fd(v, 2), sub: !bd.short });
const flowOf = (ctx, b, bd, E, cu, rot) => CH11.flow(ctx, b, { Pin: E.Pin, cu, rot, short: bd.short, title: bd.short ? '' : t('การไหลของกำลัง (สไลด์หน้า 22)', 'power flow (slide p. 22)') });
const powBars = (ctx, b, bd, E) => CH8.bars(ctx, b, [{ label: 'P_in', v: E.Pin, color: CY, sub: 'V_{t}I_{L}' }, { label: 'P_cu', v: E.Pcu, color: PINK, sub: t('ทองแดง', 'copper') }, { label: 'P_d', v: E.Pd, color: PURPLE, sub: 'E_{b}I_{a}' }],
  { title: bd.short ? t('กำลัง (W)', 'power (W)') : t('กำลัง (W): P_in = P_cu + P_d', 'power (W): P_in = P_cu + P_d'), fmt: v => fd(v, 1), sub: !bd.short });

DEF.ex1 = { ...LAY, spec: k => exSpec('long', E1, k >= 2), solvedAt: 1, tick: spin(1500),
  glow: k => k === 1 ? ['Rsh'] : k === 2 ? ['Ra', 'Rse', 'M'] : null,
  side: (ctx, b, bd, k) => { if (k < 1) return CH8.empty(ctx, b, ['ต่อแบบลองชันต์: ขดลวดชันต์คร่อมขั้วสาย ขดลวดอนุกรมอยู่ในกิ่งอาร์เมเจอร์', 'long shunt: the shunt field across the line terminals, the series field in the armature branch']);
    if (k < 3) return curBars(ctx, b, bd, [{ label: 'I_L', v: E1.IL, color: AMBER, sub: t('จากสาย', 'line') }, { label: 'I_sh', v: E1.Ish, color: ORANGE, sub: 'V_t/R_sh' }, { label: 'I_a', v: E1.Ia, color: CY, sub: '= I_se' }], t('กระแส (A): I_L = I_sh + I_a', 'current (A): I_L = I_sh + I_a'));
    if (k < 4) return powBars(ctx, b, bd, E1);
    flowOf(ctx, b, bd, E1, [{ label: 'I_a²R_a', v: E1.Pa }, { label: 'I_a²R_se', v: E1.Pse }, { label: 'I_sh²R_sh', v: E1.Psh }], [{ label: t('การหมุน', 'rotational'), v: E1.Prot }]); },
  steps: () => [step(t('<b>กระแสในแต่ละกิ่ง</b>: ขดลวดชันต์ต่อคร่อมแรงดันสาย 230 V ทั้งหมด ส่วนที่เหลือไหลผ่านขดลวดอนุกรมและอาร์เมเจอร์ (สไลด์หน้า 21) จุดเริ่มวิ่ง', '<b>The branch currents</b>: the shunt field sits across the whole 230 V line; the rest flows through the series field and the armature (slide p. 21); the dots start'),
      block([R`I_{sh} &= \frac{V_t}{R_{sh}} = \frac{230}{115} = 2\ \text{A}`, R`I_a &= I_{se} = I_L - I_{sh} = 92 - 2 = \boxed{90\ \text{A}}`])),
    step(t('<b>แรงเคลื่อนไฟฟ้าต้านกลับ</b> จากกฎแรงดันรอบกิ่งอาร์เมเจอร์ (\\(E_b\\) ปรากฏบนวงจร)', '<b>The back emf</b> from Kirchhoff\'s voltage law round the armature branch (\\(E_b\\) appears on the circuit)'),
      block([R`E_b &= V_t - I_a(R_a + R_{se}) = 230 - 90(0.18 + 0.03)`, R`&= \boxed{${fd(E1.Eb, 1)}\ \text{V}}`])),
    step(t('<b>กำลังเข้า การสูญเสียในทองแดง และกำลังที่พัฒนา</b> (developed power, สไลด์หน้า 22–23)', '<b>Input power, copper losses and developed power</b> (slides pp. 22–23)'),
      block([R`P_{in} &= V_tI_L = (230)(92) = ${big(E1.Pin, 0)}\ \text{W}`, R`I_a^2R_a &= (90)^2(0.18) = ${big(E1.Pa, 0)}\ \text{W}`, R`I_a^2R_{se} &= (90)^2(0.03) = ${fd(E1.Pse, 0)}\ \text{W}`, R`I_{sh}^2R_{sh} &= (2)^2(115) = ${fd(E1.Psh, 0)}\ \text{W}`,
        R`P_d &= E_bI_a = (${fd(E1.Eb, 1)})(90) = ${big(E1.Pd, 0)}\ \text{W}`]), t(`ตรวจ: \\(${big(E1.Pin, 0)} - ${big(E1.Pcu, 0)} = ${big(E1.Pd, 0)}\\) W`, `Check: \\(${big(E1.Pin, 0)} - ${big(E1.Pcu, 0)} = ${big(E1.Pd, 0)}\\) W`)),
    step(t('<b>กำลังออกและประสิทธิภาพ</b>: หักการสูญเสียจากการหมุน 1088 W (สไลด์หน้า 24) แผงข้างภาพแสดงการไหลของกำลังครบทุกส่วน', '<b>Output power and efficiency</b>: take off the 1088 W of rotational losses (slide p. 24); the side panel shows the whole power flow'),
      block([R`P_{out} &= P_d - P_{rot} = ${big(E1.Pd, 0)} - ${big(E1.Prot, 0)} = ${big(E1.Pout, 0)}\ \text{W}`, R`\eta &= \frac{P_{out}}{P_{in}} = \frac{${big(E1.Pout, 0)}}{${big(E1.Pin, 0)}} = \boxed{${fd(100 * E1.eff, 2)}\,\%}`]),
      t(`25 hp คือพิกัดของมอเตอร์ ที่โหลดนี้กำลังออก ${big(E1.Pout, 0)} W = ${fd(E1.Pout / 746, 1)} hp ถ้าเอา 25 hp (18 650 W) เป็นกำลังออกจะได้ 88.1 % ซึ่งไม่ตรงกับการสูญเสียที่โจทย์ให้`, `25 hp is the motor's rating; at this load the output is ${big(E1.Pout, 0)} W = ${fd(E1.Pout / 746, 1)} hp. Taking 25 hp (18 650 W) as the output would give 88.1 %, which does not agree with the losses given.`))],
  ask: () => ({ fields: [num('E<sub>b</sub> (V) =', E1.Eb, { tol: 0.15 }), num('η (%) =', 100 * E1.eff, { tol: 0.06 })],
    check: v => near(v[1], 100 * E1.Prated / E1.Pin, 0.15) ? t('25 hp คือพิกัด ไม่ใช่กำลังออกที่โหลดนี้: ใช้ \\(P_{out} = P_{in} - \\) การสูญเสียทั้งหมด', '25 hp is the rating, not the output at this load: use \\(P_{out} = P_{in} -\\) all the losses.') : near(v[0], 230 - 92 * 0.21, 0.2) ? t('ใช้ \\(I_L\\) ไม่ได้: ขดลวดชันต์แยกกระแสไป 2 A ก่อน \\(I_a = 90\\) A', '\\(I_L\\) is not it: the shunt field takes 2 A first, \\(I_a = 90\\) A.') : '' }),
  answer: () => t(`\\(I_a = 90\\) A, \\(E_b = ${fd(E1.Eb, 1)}\\) V, การสูญเสียรวม ${big(E1.Pcu + E1.Prot, 0)} W, \\(\\eta = ${fd(100 * E1.eff, 2)}\\,\\%\\) · ฉบับแจกไม่มีเฉลย`, `\\(I_a = 90\\) A, \\(E_b = ${fd(E1.Eb, 1)}\\) V, total losses ${big(E1.Pcu + E1.Prot, 0)} W, \\(\\eta = ${fd(100 * E1.eff, 2)}\\,\\%\\) · the handout has no solution.`) };

DEF.ex2 = { ...LAY, spec: k => exSpec('shunt', E2, k >= 2), solvedAt: 1, tick: spin(1500),
  glow: k => k === 1 ? ['Rsh'] : k === 2 ? ['Ra', 'M'] : null,
  side: (ctx, b, bd, k) => { if (k < 1) return CH8.empty(ctx, b, ['มอเตอร์ชันต์: ขดลวดสนามต่อขนานกับอาร์เมเจอร์คร่อมแรงดันสาย', 'shunt motor: the field in parallel with the armature across the line']);
    if (k < 3) return curBars(ctx, b, bd, [{ label: 'I_L', v: E2.IL, color: AMBER, sub: t('จากสาย', 'line') }, { label: 'I_sh', v: E2.Ish, color: ORANGE, sub: 'V_t/R_sh' }, { label: 'I_a', v: E2.Ia, color: CY, sub: 'I_L − I_sh' }], t('กระแส (A): I_L = I_sh + I_a', 'current (A): I_L = I_sh + I_a'));
    if (k < 4) return powBars(ctx, b, bd, E2);
    flowOf(ctx, b, bd, E2, [{ label: 'I_a²R_a', v: E2.Pa }, { label: 'I_sh²R_sh', v: E2.Psh }], [{ label: t('แกน', 'core'), v: E2.Pcore }, { label: t('แรงเสียดทาน', 'friction'), v: E2.Pfr }]); },
  steps: () => [step(t('<b>กระแสในแต่ละกิ่ง</b>: ขดลวดชันต์คร่อมแรงดันสาย (สไลด์หน้า 18) จุดเริ่มวิ่ง', '<b>The branch currents</b>: the shunt field sits across the line (slide p. 18); the dots start'),
      block([R`I_{sh} &= \frac{V_t}{R_{sh}} = \frac{300}{150} = 2\ \text{A}`, R`I_a &= I_L - I_{sh} = 36 - 2 = \boxed{34\ \text{A}}`])),
    step(t('<b>1. แรงเคลื่อนไฟฟ้าต้านกลับ</b> (\\(E_b\\) ปรากฏบนวงจร)', '<b>1. The back emf</b> (\\(E_b\\) appears on the circuit)'),
      block([R`E_b &= V_t - I_aR_a = 300 - 34(0.2) = \boxed{${fd(E2.Eb, 1)}\ \text{V}}`])),
    step(t('<b>กำลังเข้า การสูญเสียในทองแดง และกำลังที่พัฒนา</b>', '<b>Input power, copper losses and developed power</b>'),
      block([R`P_{in} &= V_tI_L = (300)(36) = ${big(E2.Pin, 0)}\ \text{W}`, R`I_a^2R_a &= (34)^2(0.2) = ${fd(E2.Pa, 1)}\ \text{W}`, R`I_{sh}^2R_{sh} &= (2)^2(150) = 600\ \text{W}`, R`P_d &= E_bI_a = (${fd(E2.Eb, 1)})(34) = ${big(E2.Pd, 1)}\ \text{W}`]),
      t(`ตรวจ: \\(${big(E2.Pin, 0)} - ${fd(E2.Pcu, 1)} = ${big(E2.Pd, 1)}\\) W`, `Check: \\(${big(E2.Pin, 0)} - ${fd(E2.Pcu, 1)} = ${big(E2.Pd, 1)}\\) W`)),
    step(t('<b>2. ประสิทธิภาพ</b>: การสูญเสียจากการหมุน = การสูญเสียในแกน + แรงเสียดทาน (สไลด์หน้า 24)', '<b>2. The efficiency</b>: rotational losses = core losses + friction (slide p. 24)'),
      block([R`P_{rot} &= 210 + 100 = 310\ \text{W}`, R`P_{out} &= ${big(E2.Pd, 1)} - 310 = ${big(E2.Pout, 1)}\ \text{W}`, R`\eta &= \frac{${big(E2.Pout, 1)}}{${big(E2.Pin, 0)}} = \boxed{${fd(100 * E2.eff, 2)}\,\%}`])),
    step(t('<b>3–4. แรงบิดที่พัฒนาและแรงบิดที่เพลา</b>: \\(P = T\\omega_m\\) (สไลด์หน้า 22)', '<b>3–4. Developed and shaft torque</b>: \\(P = T\\omega_m\\) (slide p. 22)'),
      block([R`\omega_m &= \frac{2\pi(1500)}{60} = ${fd(E2.w, 2)}\ \text{rad/s}`, R`T_d &= \frac{P_d}{\omega_m} = \frac{${big(E2.Pd, 1)}}{${fd(E2.w, 2)}} = \boxed{${fd(E2.Td, 2)}\ \text{N}{\cdot}\text{m}}`, R`T_s &= \frac{P_{out}}{\omega_m} = \frac{${big(E2.Pout, 1)}}{${fd(E2.w, 2)}} = \boxed{${fd(E2.Ts, 2)}\ \text{N}{\cdot}\text{m}}`]),
      t('ผลต่าง \\(T_d - T_s\\) = 1.97 N·m คือแรงบิดที่ใช้ไปกับการสูญเสียจากการหมุน (310 W ÷ 157.08 rad/s)', 'The difference \\(T_d - T_s\\) = 1.97 N·m is the torque used by the rotational losses (310 W ÷ 157.08 rad/s).'))],
  ask: () => ({ fields: [num('E<sub>b</sub> (V) =', E2.Eb, { tol: 0.1 }), num('η (%) =', 100 * E2.eff, { tol: 0.06 }), num('T<sub>d</sub> (N·m) =', E2.Td, { tol: 0.06 }), num('T<sub>s</sub> (N·m) =', E2.Ts, { tol: 0.06 })],
    check: v => near(v[0], 300 - 36 * 0.2, 0.1) ? t('ใช้ \\(I_L\\) ไม่ได้: กระแสอาร์เมเจอร์คือ \\(I_L - I_{sh} = 34\\) A', '\\(I_L\\) is not it: the armature current is \\(I_L - I_{sh} = 34\\) A.') : near(v[2], 9968.8 / 1500, 0.1) ? t('ต้องแปลง rpm เป็น rad/s: \\(\\omega_m = 2\\pi(1500)/60\\)', 'Convert rpm to rad/s: \\(\\omega_m = 2\\pi(1500)/60\\).') : '' }),
  answer: () => t(`1. \\(E_b = ${fd(E2.Eb, 1)}\\) V 2. \\(\\eta = ${fd(100 * E2.eff, 2)}\\,\\%\\) 3. \\(T_d = ${fd(E2.Td, 2)}\\) N·m 4. \\(T_s = ${fd(E2.Ts, 2)}\\) N·m · ฉบับแจกไม่มีเฉลย`, `1. \\(E_b = ${fd(E2.Eb, 1)}\\) V 2. \\(\\eta = ${fd(100 * E2.eff, 2)}\\,\\%\\) 3. \\(T_d = ${fd(E2.Td, 2)}\\) N·m 4. \\(T_s = ${fd(E2.Ts, 2)}\\) N·m · the handout has no solution.`) };

DEF.ex3 = { ...LAY, spec: k => exSpec('short', E3, k >= 3), solvedAt: 2, tick: spin(1500),
  glow: k => k === 1 ? ['Rse'] : k === 2 ? ['Rsh'] : k === 3 ? ['Ra', 'M'] : null,
  side: (ctx, b, bd, k) => { if (k < 2) return CH8.empty(ctx, b, ['ต่อแบบช็อตชันต์: ขดลวดชันต์คร่อมขั้วอาร์เมเจอร์โดยตรง กระแสสายทั้งหมดไหลผ่านขดลวดอนุกรม', 'short shunt: the shunt field directly across the armature, the whole line current through the series field']);
    if (k < 4) return curBars(ctx, b, bd, [{ label: 'I_L', v: E3.IL, color: AMBER, sub: '= I_se' }, { label: 'I_sh', v: E3.Ish, color: ORANGE, sub: 'V_sh/R_sh' }, { label: 'I_a', v: E3.Ia, color: CY, sub: 'I_L − I_sh' }], t('กระแส (A): I_L = I_sh + I_a', 'current (A): I_L = I_sh + I_a'));
    if (k < 5) return powBars(ctx, b, bd, E3);
    flowOf(ctx, b, bd, E3, [{ label: 'I_L²R_se', v: E3.Pse }, { label: 'I_sh²R_sh', v: E3.Psh }, { label: 'I_a²R_a', v: E3.Pa }], [{ label: t('แกน', 'core'), v: E3.Pcore }, { label: t('แรงเสียดทาน', 'friction'), v: E3.Pfr }]); },
  steps: () => [step(t('<b>แรงดันคร่อมขดลวดชันต์และอาร์เมเจอร์</b>: ช็อตชันต์ (สไลด์หน้า 20) กระแสสาย 15 A ทั้งหมดไหลผ่านขดลวดอนุกรมก่อน', '<b>The voltage across the shunt field and the armature</b>: in a short shunt (slide p. 20) the whole 15 A line current flows through the series field first'),
      block([R`V_{sh} &= V_t - I_LR_{se} = 240 - 15(0.09) = ${fd(E3.Vsh, 2)}\ \text{V}`])),
    step(t('<b>กระแสในขดลวดชันต์และอาร์เมเจอร์</b> (จุดเริ่มวิ่ง)', '<b>The shunt and armature currents</b> (the dots start)'),
      block([R`I_{sh} &= \frac{V_{sh}}{R_{sh}} = \frac{${fd(E3.Vsh, 2)}}{80} = ${fd(E3.Ish, 4)}\ \text{A}`, R`I_a &= I_L - I_{sh} = \boxed{${fd(E3.Ia, 4)}\ \text{A}}`])),
    step(t('<b>1. แรงเคลื่อนไฟฟ้าต้านกลับ</b> (\\(E_b\\) ปรากฏบนวงจร)', '<b>1. The back emf</b> (\\(E_b\\) appears on the circuit)'),
      block([R`E_b &= V_{sh} - I_aR_a = ${fd(E3.Vsh, 2)} - (${fd(E3.Ia, 4)})(0.11)`, R`&= \boxed{${fd(E3.Eb, 2)}\ \text{V}}`])),
    step(t('<b>กำลังเข้า การสูญเสียในทองแดง และกำลังที่พัฒนา</b>', '<b>Input power, copper losses and developed power</b>'),
      block([R`P_{in} &= V_tI_L = (240)(15) = ${big(E3.Pin, 0)}\ \text{W}`, R`I_L^2R_{se} &= (15)^2(0.09) = ${fd(E3.Pse, 2)}\ \text{W}`, R`I_{sh}^2R_{sh} &= (${fd(E3.Ish, 4)})^2(80) = ${fd(E3.Psh, 2)}\ \text{W}`, R`I_a^2R_a &= (${fd(E3.Ia, 4)})^2(0.11) = ${fd(E3.Pa, 2)}\ \text{W}`,
        R`P_d &= E_bI_a = ${big(E3.Pd, 2)}\ \text{W}`]), t(`ตรวจ: \\(${big(E3.Pin, 0)} - ${fd(E3.Pcu, 2)} = ${big(E3.Pd, 2)}\\) W ขดลวดชันต์กินกำลังมากที่สุด เพราะกระแสโหลดเพียง 15 A`, `Check: \\(${big(E3.Pin, 0)} - ${fd(E3.Pcu, 2)} = ${big(E3.Pd, 2)}\\) W. The shunt field takes the most, because the load current is only 15 A.`)),
    step(t('<b>2. ประสิทธิภาพ</b>', '<b>2. The efficiency</b>'),
      block([R`P_{out} &= ${big(E3.Pd, 2)} - 310 = ${big(E3.Pout, 2)}\ \text{W}`, R`\eta &= \frac{${big(E3.Pout, 2)}}{${big(E3.Pin, 0)}} = \boxed{${fd(100 * E3.eff, 2)}\,\%}`])),
    step(t('<b>3–4. แรงบิดที่พัฒนาและแรงบิดที่เพลา</b>', '<b>3–4. Developed and shaft torque</b>'),
      block([R`T_d &= \frac{P_d}{\omega_m} = \frac{${big(E3.Pd, 2)}}{${fd(E3.w, 2)}} = \boxed{${fd(E3.Td, 2)}\ \text{N}{\cdot}\text{m}}`, R`T_s &= \frac{P_{out}}{\omega_m} = \frac{${big(E3.Pout, 2)}}{${fd(E3.w, 2)}} = \boxed{${fd(E3.Ts, 2)}\ \text{N}{\cdot}\text{m}}`]))],
  ask: () => ({ fields: [num('E<sub>b</sub> (V) =', E3.Eb, { tol: 0.08 }), num('η (%) =', 100 * E3.eff, { tol: 0.08 }), num('T<sub>d</sub> (N·m) =', E3.Td, { tol: 0.04 }), num('T<sub>s</sub> (N·m) =', E3.Ts, { tol: 0.04 })],
    check: v => near(v[0], 240 - 12 * (0.11 + 0.09), 0.08) ? t('นั่นคือการต่อแบบลองชันต์: ช็อตชันต์ขดลวดชันต์คร่อมอาร์เมเจอร์ ไม่ใช่คร่อมสาย', 'That is the long-shunt connection: in a short shunt the shunt field sits across the armature, not the line.') : near(v[0], 240 - E3.Ia * 0.11, 0.08) ? t('ลืมแรงดันตกคร่อมขดลวดอนุกรม \\(I_LR_{se} = 1.35\\) V', 'You left out the drop across the series field, \\(I_LR_{se} = 1.35\\) V.') : '' }),
  answer: () => t(`1. \\(E_b = ${fd(E3.Eb, 2)}\\) V 2. \\(\\eta = ${fd(100 * E3.eff, 2)}\\,\\%\\) 3. \\(T_d = ${fd(E3.Td, 2)}\\) N·m 4. \\(T_s = ${fd(E3.Ts, 2)}\\) N·m · ฉบับแจกไม่มีเฉลย`, `1. \\(E_b = ${fd(E3.Eb, 2)}\\) V 2. \\(\\eta = ${fd(100 * E3.eff, 2)}\\,\\%\\) 3. \\(T_d = ${fd(E3.Td, 2)}\\) N·m 4. \\(T_s = ${fd(E3.Ts, 2)}\\) N·m · the handout has no solution.`) };

CH11.DEF = DEF;
CH11.problem = (n, key, o = {}) => CH8.wire(n, DEF[key], o);
})(window);
