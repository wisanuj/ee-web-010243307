/* ch5_circuits.js — every circuit of chapter 5 with its class-style solution text (problem statements and warnings are on the pages).
   CH5S: superposition problems (page 5.1): spec, the independent sources in the order of the class solution, the asked
         quantity, and for each source "how" + the LaTeX of the partial response (the boxed value comes from the exact solver).
   CH5T: networks with terminals A, B for Thévenin / Norton (pages 5.2–5.4): load, and the class steps for V_oc, R_th, I_sc.
   CH5M: maximum-power problems (page 5.4) on a CH5T network: steps(x) → [{RL, head, how, tex, note, marks, curve, peak}].
   CH5X: exercise sheet 5.1 Ex.3, source transformation as CH3.Stages reduction stages (page 5.3).
   Text pairs are [Thai, English]. Every boxed number is computed by CH5.exact, so a wrong circuit would show at once. */
(function (global) {
'use strict';
const t2 = (th, en) => [th, en];
const W = (a, b, o = {}) => ({ type: 'W', a, b, ...o });
const R = (id, a, b, v, side = 1, o = {}) => ({ id, type: 'R', a, b, value: v, name: o.name || (v >= 1000 ? `${v / 1000} kΩ` : `${v} Ω`), valText: '', side, ...o });
const V = (id, a, b, v, side = 1, o = {}) => ({ id, type: 'V', a, b, value: v, name: o.name || `${v} V`, valText: '', side, ...o });
const I = (id, a, b, v, side = 1, o = {}) => ({ id, type: 'I', a, b, value: v, name: o.name || (Math.abs(v) < 1 ? `${+(v * 1000).toFixed(3)} mA` : `${v} A`), valText: '', side, ...o });
const S5 = {}, T5 = {};

/* =====================================================================================================================
   superposition */
/* Hayt Fig. 5.1 / slide p. 4: linearity demo */
S5.lin = { speed: 22, spec: { ground: 'ab', nodes: { tl: [0, 0], a: [2.4, 0], b: [5.4, 0], tr: [7.8, 0], bl: [0, 3], ab: [2.4, 3], bb: [5.4, 3], br: [7.8, 3] },
  parts: [I('Ia', 'bl', 'tl', 4, -1, { name: 'i_a' }), W('tl', 'a'), R('R2', 'a', 'ab', 2, 1), R('R5', 'a', 'b', 5, 1), R('R1', 'b', 'bb', 1, -1), W('b', 'tr'), I('Ib', 'br', 'tr', 2, 1, { name: 'i_b' }), W('bl', 'ab'), W('ab', 'bb'), W('bb', 'br')] },
  ask: { kind: 'Vn', node: 'a', name: 'v_1', tex: 'v_1', dx: -0.2, dy: -0.6, align: 'right' }, srcs: ['Ia', 'Ib'], prime: true };

/* Ex 1 = Hayt Example 5.1 */
S5.ex1 = { speed: 40, prime: true,
  spec: { ground: 'bm', nodes: { tl: [0, 0], tm: [3.8, 0], tr: [6.8, 0], bl: [0, 3], bm: [3.8, 3], br: [6.8, 3] },
    parts: [V('V3', 'tl', 'bl', 3, -1), R('R6', 'tl', 'tm', 6, 1), R('R9', 'tm', 'bm', 9, 1), W('tm', 'tr'), I('I2', 'br', 'tr', 2, 1), W('bl', 'bm'), W('bm', 'br')] },
  ask: { kind: 'I', id: 'R9', from: 'tm', side: 'L', name: 'i_x', tex: 'i_x' }, srcs: ['V3', 'I2'],
  steps: {
    V3: { head: t2('3 V ทำงานตัวเดียว (2 A → เปิดวงจร)', '3 V acting alone (2 A → open)'), how: t2('เหลือวงอนุกรมวงเดียว 3 V, 6 Ω, 9 Ω เขียน KVL รอบเมช (แบบในเฉลย)', 'a single series loop of 3 V, 6 Ω and 9 Ω remains; write KVL round the mesh (as in the class solution)'),
      tex: S => `\\begin{aligned} -3 + 6i_a + 9i_a &= 0 \\\\ i_x' = i_a &= \\frac{3}{6 + 9} = ${S.bx(S.p[0], 'A')} \\end{aligned}` },
    I2: { head: t2('2 A ทำงานตัวเดียว (3 V → ลัดวงจร)', '2 A acting alone (3 V → short)'), how: t2('6 Ω กับ 9 Ω ขนานกัน กระแส 2 A แบ่งเข้าสองกิ่ง ใช้ตัวแบ่งกระแส (ตัวเศษคือกิ่งตรงข้าม 6 Ω)', 'the 6 Ω and 9 Ω are in parallel and the 2 A splits between them; use the current divider (numerator = the other branch, 6 Ω)'),
      tex: S => `i_x'' = \\left(\\frac{6}{6 + 9}\\right)(2) = ${S.bx(S.p[1], 'A')}` } },
  extra: S => [{ t: t2('กับดัก: ห้ามบวกกำลัง', 'Trap: never add powers'), note: t2('กำลังแปรตามกำลังสองของกระแส จึงไม่เป็นเชิงเส้น ต้องรวมกระแสก่อนแล้วค่อยคิดกำลัง', 'Power goes with the square of the current, so it is not linear: add the currents first, then compute the power.'),
    tex: `\\begin{aligned} P_{9\\Omega} &= (i_x)^2(9) = (1)^2(9) = 9\\ \\text{W} \\\\ (i_x')^2(9) + (i_x'')^2(9) &= 0.36 + 5.76 = 6.12\\ \\text{W} \\;\\neq\\; 9\\ \\text{W} \\end{aligned}` }] };

/* Ex 2 = Hayt Practice 5.1 */
S5.ex2 = { speed: 40, prime: true,
  spec: { ground: 'b2', nodes: { tl: [0, 0], t1: [2.4, 0], t2: [5.4, 0], tr: [7.8, 0], m1: [2.4, 1.7], bl: [0, 3.4], b1: [2.4, 3.4], b2: [5.4, 3.4], br: [7.8, 3.4] },
    parts: [I('I2', 'bl', 'tl', 2, -1), W('tl', 't1'), R('R7', 't1', 'm1', 7, -1, { bodyLen: 0.9 }), R('R3', 'm1', 'b1', 3, -1, { bodyLen: 0.9 }), R('R15', 't1', 't2', 15, -1), R('R5', 't2', 'b2', 5, -1), W('t2', 'tr'), V('V35', 'tr', 'br', 3.5, 1), W('bl', 'b1'), W('b1', 'b2'), W('b2', 'br')] },
  ask: { kind: 'I', id: 'R15', from: 't1', side: 'U', name: 'i_x', tex: 'i_x' }, srcs: ['I2', 'V35'],
  steps: {
    I2: { head: t2('2 A ทำงานตัวเดียว (3.5 V → ลัดวงจร)', '2 A acting alone (3.5 V → short)'), how: t2('ลวดลัดของ 3.5 V ลัด 5 Ω ไปด้วย (ขีดฆ่า 5 Ω) 7 Ω + 3 Ω = 10 Ω ขนานกับ 15 Ω ใช้ตัวแบ่งกระแส', 'the short of the 3.5 V also shorts the 5 Ω (cross it out); 7 Ω + 3 Ω = 10 Ω is in parallel with the 15 Ω; use the current divider'),
      tex: S => `\\begin{aligned} 7 + 3 &= 10\\ \\Omega \\\\ i_x' &= \\left(\\frac{10}{10 + 15}\\right)(2) = ${S.bx(S.p[0], 'A')} \\end{aligned}` },
    V35: { head: t2('3.5 V ทำงานตัวเดียว (2 A → เปิดวงจร)', '3.5 V acting alone (2 A → open)'), how: t2('ในเฉลยใช้วิธีเมช: เมช \\(i_1\\) ผ่าน 3, 7, 15, 5 Ω และเมช \\(i_2\\) ผ่าน 5 Ω กับ 3.5 V (หรือเห็นทันทีว่า 3.5 V คร่อม 15 + 10 Ω อยู่ตรง ๆ)', 'the class solution uses meshes: \\(i_1\\) through 3, 7, 15 and 5 Ω, \\(i_2\\) through the 5 Ω and 3.5 V (or note at once that the 3.5 V sits directly across 15 + 10 Ω)'),
      tex: S => `\\begin{aligned} 3i_1 + 7i_1 + 15i_1 + 5(i_1 - i_2) &= 0 &&\\Rightarrow\\; 30i_1 - 5i_2 = 0 \\\\ 3.5 + 5(i_2 - i_1) &= 0 &&\\Rightarrow\\; -5i_1 + 5i_2 = -3.5 \\\\ 25i_1 &= -3.5 &&(1) + (2) \\\\ i_x'' = i_1 &= ${S.bx(S.p[1], 'A')} \\end{aligned}` } },
  sumNote: t2('Hayt ตอบ 660 mA ตรงกับเฉลยในห้อง', 'Hayt\'s answer is 660 mA, as in the class solution.') };

/* exercise sheet 5.1 Ex.1 */
S5.s1 = { speed: 26, prime: false,
  spec: { ground: 'qb', nodes: { tl: [0, 0], p: [2.6, 0], q: [5.4, 0], tr: [8, 0], bl: [0, 3.2], pb: [2.6, 3.2], qb: [5.4, 3.2], br: [8, 3.2] },
    parts: [V('V6', 'tl', 'bl', 6, -1), W('tl', 'p'), R('R6v', 'p', 'pb', 6000, -1), I('I8', 'q', 'p', 8, 1), R('R4v', 'qb', 'q', 4000, -1), R('R4h', 'q', 'tr', 4000, 1), V('V12', 'tr', 'br', 12, 1), W('bl', 'pb'), R('R6h', 'pb', 'qb', 6000, -1), W('qb', 'br')] },
  ask: { kind: 'I', id: 'R4v', from: 'qb', side: 'R', name: 'I_x', tex: 'I_x' }, srcs: ['V6', 'I8', 'V12'],
  steps: {
    V6: { head: t2('6 V ทำงานตัวเดียว (8 A → เปิด, 12 V → ลัด)', '6 V acting alone (8 A → open, 12 V → short)'), how: t2('ด้านขวาต่อกับด้านซ้ายผ่าน 6 kΩ ด้านล่างเพียงเส้นเดียว ไม่มีทางวนกลับ กระแสจาก 6 V จึงวนอยู่แค่ใน 6 kΩ ตั้ง', 'the right side joins the left only through the bottom 6 kΩ, a single wire with no way back, so the 6 V current stays in the vertical 6 kΩ'),
      tex: S => `I_{x1} = ${S.bx(S.p[0], 'A')}` },
    I8: { head: t2('8 A ทำงานตัวเดียว (6 V, 12 V → ลัด)', '8 A acting alone (6 V, 12 V → short)'), how: t2('ลวดลัดของ 6 V ลัด 6 kΩ ตั้งไปด้วย กระแส 8 A ไหลผ่าน 6 kΩ ล่าง แล้วแยกเข้า 4 kΩ ตั้ง กับ 4 kΩ นอน (ผ่านลวดลัดของ 12 V) ใช้ตัวแบ่งกระแส', 'the short of the 6 V also shorts the vertical 6 kΩ; the 8 A flows through the bottom 6 kΩ, then splits between the vertical 4 kΩ and the horizontal 4 kΩ (through the short of the 12 V); use the current divider'),
      tex: S => `I_{x2} = \\left(\\frac{4\\,\\text{k}}{4\\,\\text{k} + 4\\,\\text{k}}\\right)(8) = ${S.bx(S.p[1], 'A')}` },
    V12: { head: t2('12 V ทำงานตัวเดียว (6 V → ลัด, 8 A → เปิด)', '12 V acting alone (6 V → short, 8 A → open)'), how: t2('เหลือวงเดียว: 12 V → 4 kΩ นอน → 4 kΩ ตั้ง กระแสไหลลงผ่าน 4 kΩ ตั้ง สวนทิศลูกศร \\(I_x\\)', 'one loop is left: 12 V → horizontal 4 kΩ → vertical 4 kΩ; the current flows down through the vertical 4 kΩ, against the \\(I_x\\) arrow'),
      tex: S => `\\begin{aligned} I &= \\frac{V}{R_t} = \\frac{12}{4\\,\\text{k} + 4\\,\\text{k}} = 1.5\\ \\text{mA} \\\\ I_{x3} &= -I = ${S.bx(S.p[2].mul(1000), 'mA')} \\end{aligned}` } },
  sumNote: t2('ตรงกับเฉลย 3.9985 A', 'Matches the solution: 3.9985 A.') };

/* exercise sheet 5.1 Ex.2 */
S5.s2 = { speed: 50, prime: false,
  spec: { ground: 'qb', nodes: { tl: [0, 0], p: [2.6, 0], q: [5.4, 0], tr: [8, 0], bl: [0, 3.2], pb: [2.6, 3.2], qb: [5.4, 3.2], br: [8, 3.2] },
    parts: [R('R30', 'tl', 'p', 30, 1), R('R10', 'p', 'q', 10, -1), R('R20', 'q', 'tr', 20, 1), W('tl', 'bl'), V('V4', 'p', 'pb', 4, -1), R('R5', 'q', 'qb', 5, 1), V('V8', 'tr', 'br', 8, 1), I('I2', 'pb', 'bl', 2, -1), W('pb', 'qb'), W('qb', 'br')] },
  ask: { kind: 'I', id: 'R10', from: 'p', side: 'U', name: 'I_x', tex: 'I_x' }, srcs: ['I2', 'V4', 'V8'],
  steps: {
    I2: { head: t2('2 A ทำงานตัวเดียว (4 V, 8 V → ลัด)', '2 A acting alone (4 V, 8 V → short)'), how: t2('ลวดลัดของ 4 V ต่อปลายซ้ายของ 10 Ω ลงด้านล่างโดยตรง กระแส 2 A วนผ่าน 30 Ω แล้วกลับทางลวดลัดทั้งหมด (กิ่ง 10 Ω ขนานกับลวดลัด)', 'the short of the 4 V ties the left end of the 10 Ω straight to the bottom; the 2 A goes round through the 30 Ω and returns entirely through that short (the 10 Ω branch is in parallel with the short)'),
      tex: S => `I_{x1} = ${S.bx(S.p[0], 'A')}` },
    V4: { head: t2('4 V ทำงานตัวเดียว (2 A → เปิด, 8 V → ลัด)', '4 V acting alone (2 A → open, 8 V → short)'), how: t2('2 A เปิดวงจร 30 Ω จึงไม่มีกระแส ลวดลัดของ 8 V ทำให้ 20 Ω ขนานกับ 5 Ω', 'with the 2 A open the 30 Ω carries nothing; the short of the 8 V puts the 20 Ω in parallel with the 5 Ω'),
      tex: S => `\\begin{aligned} 5 \\parallel 20 &= \\frac{(5)(20)}{5 + 20} = 4\\ \\Omega \\\\ I_{x2} &= \\frac{4}{10 + 4} = ${S.bx(S.p[1], 'A')} \\end{aligned}` },
    V8: { head: t2('8 V ทำงานตัวเดียว (2 A → เปิด, 4 V → ลัด)', '8 V acting alone (2 A → open, 4 V → short)'), how: t2('เฉลยแปลงแหล่งจ่าย 8 V อนุกรม 20 Ω เป็น 0.4 A ขนาน 20 Ω (การแปลงแหล่งจ่าย หน้า 5.3) แล้ว 5 ∥ 20 = 4 Ω ใช้ตัวแบ่งกระแสหากระแสใน 10 Ω ซึ่งไหลจากขวาไปซ้าย', 'the solution turns the 8 V in series with 20 Ω into 0.4 A in parallel with 20 Ω (source transformation, page 5.3); then 5 ∥ 20 = 4 Ω and the current divider gives the 10 Ω current, flowing right to left'),
      tex: S => `\\begin{aligned} \\frac{8}{20} &= 0.4\\ \\text{A} \\\\ I_2 &= \\left(\\frac{4}{4 + 10}\\right)(0.4) = 0.1143\\ \\text{A} \\\\ I_{x3} &= -I_2 = ${S.bx(S.p[2], 'A')} \\end{aligned}` } },
  sumNote: t2('ตรงกับเฉลย 0.1714 A', 'Matches the solution: 0.1714 A.') };

/* homework 1 */
S5.hw1 = { speed: 40, prime: true,
  spec: { ground: 'qb', nodes: { tl: [0, 0], p: [2.6, 0], q: [5.2, 0], tr: [7.8, 0], bl: [0, 3.6], pb: [2.6, 3.6], qb: [5.2, 3.6], br: [7.8, 3.6] },
    parts: [V('V4L', 'tl', 'bl', 4, -1), R('R3', 'tl', 'p', 3, 1), I('I2', 'pb', 'p', 2, -1), R('R1', 'p', 'q', 1, 1), R('R5', 'q', 'qb', 5, 1), R('R2', 'q', 'tr', 2, 1), V('V4R', 'tr', 'br', 4, 1), W('bl', 'pb'), W('pb', 'qb'), W('qb', 'br')] },
  ask: { kind: 'V', id: 'R1', plus: 'p', side: 'D', name: 'v_x', tex: 'v_x' }, srcs: ['V4L', 'I2', 'V4R'],
  steps: {
    V4L: { head: t2('4 V ซ้ายทำงานตัวเดียว (2 A → เปิด, 4 V ขวา → ลัด)', 'left 4 V acting alone (2 A → open, right 4 V → short)'), how: t2('2 Ω ขนาน 5 Ω แล้วอนุกรมกับ 3 Ω และ 1 Ω ใช้ตัวแบ่งแรงดันที่ 1 Ω', 'the 2 Ω in parallel with the 5 Ω, in series with the 3 Ω and the 1 Ω; use the voltage divider on the 1 Ω'),
      tex: S => `\\begin{aligned} 2 \\parallel 5 &= \\frac{10}{7} \\approx 1.4286\\ \\Omega \\\\ v_x' &= \\left(\\frac{1}{1 + 3 + 1.4286}\\right)(4) = ${S.bx(S.p[0], 'V')} \\end{aligned}` },
    I2: { head: t2('2 A ทำงานตัวเดียว (4 V ทั้งสอง → ลัด)', '2 A acting alone (both 4 V → short)'), how: t2('2 A แบ่งเข้า 3 Ω (ลงด้านล่างผ่านลวดลัดซ้าย) กับ 1 Ω + (2 ∥ 5) Ω = 17/7 Ω', 'the 2 A splits between the 3 Ω (down through the left short) and 1 Ω + (2 ∥ 5) Ω = 17/7 Ω'),
      tex: S => `\\begin{aligned} I_{1\\Omega} &= \\left(\\frac{3}{3 + \\frac{17}{7}}\\right)(2) = \\frac{21}{19}\\ \\text{A} \\\\ v_x'' &= (1)\\left(\\frac{21}{19}\\right) = ${S.bx(S.p[1], 'V')} \\end{aligned}` },
    V4R: { head: t2('4 V ขวาทำงานตัวเดียว (4 V ซ้าย → ลัด, 2 A → เปิด)', 'right 4 V acting alone (left 4 V → short, 2 A → open)'), how: t2('ที่โนดขวาของ 1 Ω มอง 5 Ω ขนานกับ (1 + 3) Ω = 20/9 Ω แบ่งแรงดันกับ 2 Ω ได้ \\(v_y\\) แล้วกระแสไหลจากขวาไปซ้ายผ่าน 1 Ω (สวนขั้ว \\(v_x\\))', 'at the right node of the 1 Ω, the 5 Ω is in parallel with (1 + 3) Ω = 20/9 Ω; the divider with the 2 Ω gives \\(v_y\\), and the current then flows right to left through the 1 Ω (against the polarity of \\(v_x\\))'),
      tex: S => `\\begin{aligned} 5 \\parallel 4 &= \\frac{20}{9}\\ \\Omega \\\\ v_y &= \\left(\\frac{20/9}{20/9 + 2}\\right)(4) = \\frac{40}{19}\\ \\text{V} \\\\ v_x''' &= -\\left(\\frac{1}{1 + 3}\\right) v_y = ${S.bx(S.p[2], 'V')} \\end{aligned}` } },
  sumNote: t2('ตรงกับคำตอบในสไลด์ 1.316 V และวิธีทำในห้อง (0.7368 + 1.105 − 0.526)', 'Matches the slide answer 1.316 V and the in-class working (0.7368 + 1.105 − 0.526).') };

/* =====================================================================================================================
   Thévenin / Norton networks: spec with terminals A, B (the load is not part of spec) */
T5.ex3 = { speed: 60,
  spec: { ground: 'mb', A: 'A', B: 'B', nodes: { tl: [0, 0], m: [3, 0], A: [6, 0], bl: [0, 3], mb: [3, 3], B: [6, 3] },
    parts: [V('V9', 'tl', 'bl', 9, -1), R('R4a', 'tl', 'm', 4, 1), R('R5', 'm', 'A', 5, 1), R('R4b', 'm', 'mb', 4, 1), R('R6', 'bl', 'mb', 6, -1), W('mb', 'B')] },
  load: { R: 2, name: '2 Ω', label: '2 Ω', ask: { kind: 'I', from: 'A', side: 'R', text: 'i_{2Ω}' } },
  thev: { vocHow: t2('ถอด 2 Ω ออกแล้ว ไม่มีกระแสไหลผ่าน 5 Ω (ปลายเปิด) จึงไม่มีแรงดันตกคร่อม 5 Ω \\(V_{AB}\\) เท่ากับแรงดันคร่อม 4 Ω ตัวกลาง เขียน KVL รอบเมชซ้าย', 'with the 2 Ω removed, no current flows in the 5 Ω (its end is open), so it drops no voltage and \\(V_{AB}\\) equals the voltage across the middle 4 Ω; write KVL round the left mesh'),
    voc: S => `\\begin{aligned} -9 + 4I_x + 4I_x + 6I_x &= 0 \\\\ I_x &= \\frac{9}{14} \\approx 0.6429\\ \\text{A} \\\\ V_{AB} = V_{th} &= 4I_x = ${S.bx(S.voc, 'V')} \\end{aligned}`, vocGlow: ['V9', 'R4a', 'R4b', 'R6'],
    rthHow: t2('ฆ่าแหล่งจ่าย (9 V → ลัดวงจร) แล้วมองเข้าที่ขั้ว AB: 4 Ω กับ 6 Ω อนุกรมกันผ่านลวดลัด ขนานกับ 4 Ω ตัวกลาง แล้วอนุกรมกับ 5 Ω', 'kill the source (9 V → short) and look into AB: the 4 Ω and 6 Ω are in series through the short, in parallel with the middle 4 Ω, then in series with the 5 Ω'),
    rth: S => `\\begin{aligned} R_{th} &= \\left[(4 + 6) \\parallel 4\\right] + 5 = \\frac{(10)(4)}{10 + 4} + 5 \\\\ &= \\frac{20}{7} + 5 = ${S.bx(S.rth, 'Ω')} \\end{aligned}`, rthGlow: ['R4a', 'R5', 'R4b', 'R6'],
    loadHow: t2('ต่อ 2 Ω กลับที่ขั้ว AB ของวงจรสมมูล กลายเป็นวงจรอนุกรมวงเดียว', 'connect the 2 Ω back across AB of the equivalent: a single series loop'),
    load: S => `I_L = \\frac{V_{th}}{R_{th} + R_L} = \\frac{18/7}{55/7 + 2} = ${S.bx(S.IL, 'A')}` },
  nort: { iscHow: t2('ลัดวงจรขั้ว AB แล้วหากระแสที่ไหลผ่านลวดลัดจาก A ไป B ด้วยวิธีเมช (เมช \\(I_y\\) วิ่งผ่าน 5 Ω และลวดลัด)', 'short AB and find the current through the short from A to B by meshes (mesh \\(I_y\\) runs through the 5 Ω and the short)'),
    isc: S => `\\begin{aligned} -9 + 4I_x + 4(I_x - I_y) + 6I_x &= 0 &&\\Rightarrow\\; 14I_x - 4I_y = 9 \\\\ 5I_y + 4(I_y - I_x) &= 0 &&\\Rightarrow\\; -4I_x + 9I_y = 0 \\\\ I_{AB} = I_N = I_y &= ${S.bx(S.isc, 'A')} \\end{aligned}`, iscGlow: ['V9', 'R4a', 'R4b', 'R6', 'R5'],
    loadHow: t2('ต่อ 2 Ω ขนานกับ \\(R_N\\) ใช้ตัวแบ่งกระแส (ตัวเศษคือกิ่งตรงข้าม \\(R_N\\))', 'put the 2 Ω in parallel with \\(R_N\\) and use the current divider (numerator = the other branch, \\(R_N\\))'),
    load: S => `I_L = \\left(\\frac{R_N}{R_N + R_L}\\right) I_N = \\left(\\frac{55/7}{55/7 + 2}\\right)\\left(\\frac{18}{55}\\right) = ${S.bx(S.IL, 'A')}`, eqNote: t2('บันทึกในห้องใช้ \\(I_N\\) = 0.33 A, \\(R_N\\) = 7.86 Ω แล้วได้ \\(I_L\\) = 0.26 A เท่ากับวิธีเทวินิน', 'The in-class note uses \\(I_N\\) = 0.33 A and \\(R_N\\) = 7.86 Ω and gets \\(I_L\\) = 0.26 A, the same as Thévenin.') } };

T5.ex5 = { speed: 6000,
  spec: { ground: 'nb', A: 'A', B: 'B', nodes: { tl: [0, 0], m: [2.6, 0], n: [5.2, 0], A: [7.8, 0], bl: [0, 3], mb: [2.6, 3], nb: [5.2, 3], B: [7.8, 3] },
    parts: [V('V3', 'tl', 'bl', 3, -1), R('R2k', 'tl', 'm', 2000, 1), I('I7', 'm', 'mb', 0.007, 1), W('m', 'n'), R('R5k', 'n', 'nb', 5000, 1), R('R1k', 'n', 'A', 1000, 1), W('bl', 'mb'), W('mb', 'nb'), W('nb', 'B')] },
  load: null,
  thev: { vocHow: t2('ขั้ว AB เปิดอยู่ จึงไม่มีกระแสใน 1 kΩ \\(V_{AB}\\) เท่ากับแรงดันโนดบนกลาง \\(V_A\\) เขียน KCL ที่โนดนั้น (ΣI_out = 0) แบบในเฉลย', 'with AB open no current flows in the 1 kΩ, so \\(V_{AB}\\) equals the top-middle node voltage \\(V_A\\); write KCL there (ΣI_out = 0), as in the class solution'),
    voc: S => `\\begin{aligned} \\frac{V_A - 3}{2\\,\\text{k}} + 7\\,\\text{m} + \\frac{V_A}{5\\,\\text{k}} &= 0 \\\\ 5(V_A - 3) + 70 + 2V_A &= 0 \\qquad (\\times 10\\,\\text{k}) \\\\ V_{AB} = V_A &= ${S.bx(S.voc, 'V')} \\end{aligned}`, vocGlow: ['V3', 'R2k', 'I7', 'R5k'],
    rthHow: t2('ฆ่าแหล่งจ่าย: 3 V → ลัดวงจร, 7 mA → เปิดวงจร แล้ว 2 kΩ ขนาน 5 kΩ อนุกรมกับ 1 kΩ', 'kill the sources: 3 V → short, 7 mA → open; then 2 kΩ in parallel with 5 kΩ, in series with 1 kΩ'),
    rth: S => `R_{th} = (2\\,\\text{k} \\parallel 5\\,\\text{k}) + 1\\,\\text{k} = \\frac{10}{7}\\,\\text{k} + 1\\,\\text{k} = ${S.bx(S.rth.div(1000), 'kΩ')}`, rthGlow: ['R2k', 'R5k', 'R1k'] },
  nort: { iscHow: t2('ลัดวงจรขั้ว AB: 1 kΩ ต่อจากโนดบนกลางลงด้านล่าง เขียน KCL ที่โนดนั้นอีกครั้ง แล้ว \\(I_{sc} = V/1\\,\\text{k}\\)', 'short AB: the 1 kΩ now goes from the top-middle node to the bottom; write KCL there again, then \\(I_{sc} = V/1\\,\\text{k}\\)'),
    isc: S => `\\begin{aligned} \\frac{V - 3}{2\\,\\text{k}} + 7\\,\\text{m} + \\frac{V}{5\\,\\text{k}} + \\frac{V}{1\\,\\text{k}} &= 0 \\\\ 5(V - 3) + 70 + 2V + 10V &= 0 \\qquad (\\times 10\\,\\text{k}) \\\\ V &= -\\frac{55}{17}\\ \\text{V} \\\\ I_{sc} = I_N = \\frac{V}{1\\,\\text{k}} &= ${S.bx(S.isc.mul(1000), 'mA')} \\end{aligned}`, iscGlow: ['V3', 'R2k', 'I7', 'R5k', 'R1k'],
    eqNote: t2('Hayt ตอบ −7.857 V, −3.235 mA, 2.429 kΩ', 'Hayt\'s answers: −7.857 V, −3.235 mA, 2.429 kΩ.') } };

T5.s1 = { speed: 26,
  spec: { ground: 'nb', A: 'A', B: 'B', nodes: { tl: [0, 0], p: [2.4, 0], n: [4.8, 0], A: [7.2, 0], bl: [0, 3.4], pb: [2.4, 3.4], j: [4.8, 1.7], nb: [4.8, 3.4], B: [7.2, 3.4] },
    parts: [I('I4', 'tl', 'bl', 4, -1), R('R1kt', 'tl', 'p', 1000, 1), R('R1kv', 'p', 'pb', 1000, 1), W('p', 'n'), V('V2', 'n', 'j', 2, -1, { bodyLen: 0.9 }), R('R2k', 'j', 'nb', 2000, -1, { bodyLen: 0.9 }), V('V3', 'n', 'A', 3, 1), W('bl', 'pb'), W('pb', 'nb'), W('nb', 'B')] },
  load: null,
  thev: { vocHow: t2('ถอด \\(R_L\\): 3 V ปลายเปิดจึงไม่มีกระแส ใช้วิธีเมช แหล่งจ่าย 4 A อยู่บนขอบนอกของเมช \\(I_A\\) และชี้ลง (สวนทิศตามเข็ม) จึงได้ \\(I_A = -4\\) A ทันที', 'remove \\(R_L\\): the 3 V has an open end and carries nothing; by meshes, the 4 A is on the outer edge of mesh \\(I_A\\) and points down (against clockwise), so \\(I_A = -4\\) A at once'),
    voc: S => `\\begin{aligned} I_A &= -4\\ \\text{A} \\\\ 1\\,\\text{k}(I_B - I_A) + 2 + 2\\,\\text{k}\\,I_B &= 0 &&\\Rightarrow\\; 3000I_B = -4002 \\\\ I_B &= -1.334\\ \\text{A} \\\\ V_{AB} = V_{th} &= -3 + 2 + (2\\,\\text{k})(I_B) = ${S.bx(S.voc, 'V')} \\end{aligned}`, vocGlow: ['I4', 'R1kt', 'R1kv', 'V2', 'R2k', 'V3'],
    rthHow: t2('4 A → เปิดวงจร (1 kΩ ด้านบนอนุกรมกับวงจรเปิด จึงไม่มีผล ขีดฆ่าได้) 2 V และ 3 V → ลัดวงจร เหลือ 1 kΩ ขนาน 2 kΩ', '4 A → open (the top 1 kΩ is in series with the open, so it drops out: cross it out); 2 V and 3 V → short; what is left is 1 kΩ in parallel with 2 kΩ'),
    rth: S => `R_{th} = 1\\,\\text{k} \\parallel 2\\,\\text{k} = \\frac{(1\\,\\text{k})(2\\,\\text{k})}{1\\,\\text{k} + 2\\,\\text{k}} = ${S.bx(S.rth, 'Ω')}`, rthGlow: ['R1kv', 'R2k'], rthDead: ['R1kt'] },
  nort: { iscHow: t2('ลัดวงจรขั้ว AB ได้สามเมช: \\(I_1 = -4\\) A (แหล่งจ่ายบนขอบนอก) เมช \\(I_2\\) และเมช \\(I_3\\) ที่วิ่งผ่าน 3 V และลวดลัด', 'short AB: three meshes, \\(I_1 = -4\\) A (source on the outer edge), mesh \\(I_2\\), and mesh \\(I_3\\) through the 3 V and the short'),
    isc: S => `\\begin{aligned} I_1 &= -4\\ \\text{A} \\\\ 1\\,\\text{k}(I_2 - I_1) + 2 + 2\\,\\text{k}(I_2 - I_3) &= 0 &&\\Rightarrow\\; 3000I_2 - 2000I_3 = -4002 \\\\ 2\\,\\text{k}(I_3 - I_2) - 2 + 3 &= 0 &&\\Rightarrow\\; -2000I_2 + 2000I_3 = -1 \\\\ I_{AB} = I_N = I_3 &= ${S.bx(S.isc, 'A')} \\end{aligned}`, iscGlow: ['R1kv', 'V2', 'R2k', 'V3'] } };

T5.s3 = { speed: 50,
  spec: { ground: 'nb', A: 'A', B: 'B', nodes: { tl: [0, 0], n: [3, 0], A: [5.6, 0], bl: [0, 3.4], j: [3, 1.7], nb: [3, 3.4], B: [5.6, 3.4] },
    parts: [R('R6', 'tl', 'bl', 6, -1), V('V8', 'tl', 'n', 8, 1), V('V4', 'n', 'j', 4, 1, { bodyLen: 0.9 }), R('R4', 'j', 'nb', 4, 1, { bodyLen: 0.9 }), W('n', 'A'), W('bl', 'nb'), W('nb', 'B')] },
  load: null,
  thev: { vocHow: t2('ถอด \\(R_L\\) แล้วเหลือวงเดียว (6 Ω, 8 V, 4 V, 4 Ω) ตั้งกระแส \\(I\\) วนตามเข็มนาฬิกา แล้ว \\(V_{AB}\\) คือแรงดันคร่อมกิ่งกลาง', 'remove \\(R_L\\): one loop is left (6 Ω, 8 V, 4 V, 4 Ω); take \\(I\\) clockwise, then \\(V_{AB}\\) is the voltage across the middle branch'),
    voc: S => `\\begin{aligned} 6I + 8 + 4 + 4I &= 0 &&\\Rightarrow\\; I = -1.2\\ \\text{A} \\\\ V_{AB} = V_{th} &= 4 + 4I = 4 + 4(-1.2) = ${S.bx(S.voc, 'V')} \\end{aligned}`, vocGlow: ['R6', 'V8', 'V4', 'R4'],
    rthHow: t2('8 V และ 4 V → ลัดวงจร เหลือ 6 Ω ขนาน 4 Ω', '8 V and 4 V → short: 6 Ω in parallel with 4 Ω'),
    rth: S => `R_{th} = 6 \\parallel 4 = \\frac{(6)(4)}{6 + 4} = ${S.bx(S.rth, 'Ω')}`, rthGlow: ['R6', 'R4'] },
  nort: { iscHow: t2('ลัดวงจรขั้ว AB ได้สองเมช: เมชซ้าย (6 Ω, 8 V, กิ่งกลาง) และเมชขวา (กิ่งกลาง, ลวดลัด)', 'short AB: two meshes, the left one (6 Ω, 8 V, middle branch) and the right one (middle branch, the short)'),
    isc: S => `\\begin{aligned} 6I_1 + 8 + 4 + 4(I_1 - I_2) &= 0 &&\\Rightarrow\\; 10I_1 - 4I_2 = -12 \\\\ 4(I_2 - I_1) - 4 &= 0 &&\\Rightarrow\\; -4I_1 + 4I_2 = 4 \\\\ I_{AB} = I_N = I_2 &= ${S.bx(S.isc, 'A')} \\end{aligned}`, iscGlow: ['R6', 'V8', 'V4', 'R4'] } };

T5.s5 = { speed: 26,
  spec: { ground: 'mb', A: 'A', B: 'B', nodes: { t0: [0, 0], t1: [3.8, 0], L: [0, 1.8], m: [2.2, 1.8], j: [3.8, 1.8], A: [5.6, 1.8], g: [0, 4], mb: [2.2, 4], B: [5.6, 4] },
    parts: [I('I8', 't0', 't1', 8, 1), R('R15', 't1', 'j', 15, 1), W('t0', 'L'), R('R20', 'L', 'm', 20, -1), V('V40', 'L', 'g', 40, -1), R('R30', 'm', 'mb', 30, 1), R('R10', 'g', 'mb', 10, -1), W('m', 'j'), W('j', 'A'), W('mb', 'B')] },
  load: { R: 10, name: 'R_L = 10 Ω', short: 'R_L', label: '\\(R_L\\) = 10 Ω', ask: { kind: 'V', plus: 'A', side: 'R', text: 'V_L' } },
  thev: { vocHow: t2('ถอด \\(R_L\\): เมช \\(I_1\\) (บน) มีแหล่งจ่าย 8 A บนขอบนอกชี้ตามเข็มนาฬิกา จึงได้ \\(I_1 = 8\\) A ทันที แล้วเขียน KVL รอบเมช \\(I_2\\) (40 V, 20 Ω, 30 Ω, 10 Ω)', 'remove \\(R_L\\): mesh \\(I_1\\) (top) has the 8 A on its outer edge, pointing clockwise, so \\(I_1 = 8\\) A at once; then write KVL round mesh \\(I_2\\) (40 V, 20 Ω, 30 Ω, 10 Ω)'),
    voc: S => `\\begin{aligned} I_1 &= 8\\ \\text{A} \\\\ -40 + 20(I_2 - I_1) + 30I_2 + 10I_2 &= 0 &&\\Rightarrow\\; 60I_2 = 200 \\\\ I_2 &= \\frac{10}{3} \\approx 3.333\\ \\text{A} \\\\ V_{AB} = V_{th} &= 30\\,I_2 = ${S.bx(S.voc, 'V')} \\end{aligned}`, vocGlow: ['I8', 'R15', 'R20', 'V40', 'R30', 'R10'],
    rthHow: t2('8 A → เปิดวงจร (15 Ω อนุกรมกับวงจรเปิด ขีดฆ่า) 40 V → ลัดวงจร: (20 + 10) Ω ขนาน 30 Ω', '8 A → open (the 15 Ω is in series with the open: cross it out); 40 V → short: (20 + 10) Ω in parallel with 30 Ω'),
    rth: S => `R_{th} = (20 + 10) \\parallel 30 = 30 \\parallel 30 = ${S.bx(S.rth, 'Ω')}`, rthGlow: ['R20', 'R10', 'R30'], rthDead: ['R15'],
    loadHow: t2('ต่อ \\(R_L\\) = 10 Ω ที่ขั้ว AB ของวงจรสมมูล แล้วใช้ตัวแบ่งแรงดัน', 'connect \\(R_L\\) = 10 Ω across AB of the equivalent and use the voltage divider'),
    load: S => `V_L = \\left(\\frac{R_L}{R_L + R_{th}}\\right) V_{th} = \\left(\\frac{10}{10 + 15}\\right)(100) = ${S.bx(S.VL, 'V')}` },
  nort: { iscHow: t2('ลัดวงจรขั้ว AB ซึ่งลัด 30 Ω ไปด้วย (ขีดฆ่า 30 Ω) แล้วเมช \\(I_2\\) วิ่งผ่านลวดลัด', 'short AB, which also shorts the 30 Ω (cross it out); mesh \\(I_2\\) then runs through the short'),
    isc: S => `\\begin{aligned} I_1 &= 8\\ \\text{A} \\\\ -40 + 20(I_2 - I_1) + 10I_2 &= 0 &&\\Rightarrow\\; 30I_2 = 200 \\\\ I_{AB} = I_N = I_2 &= ${S.bx(S.isc, 'A')} \\end{aligned}`, iscGlow: ['I8', 'R15', 'R20', 'V40', 'R10'], iscDead: ['R30'],
    loadHow: t2('ต่อ \\(R_L\\) = 10 Ω ขนานกับ \\(R_N\\) ใช้ตัวแบ่งกระแส แล้ว \\(V_L = I_L R_L\\)', 'put \\(R_L\\) = 10 Ω in parallel with \\(R_N\\), use the current divider, then \\(V_L = I_L R_L\\)'),
    load: S => `\\begin{aligned} I_L &= \\left(\\frac{R_N}{R_N + R_L}\\right) I_N = \\left(\\frac{15}{15 + 10}\\right)\\left(\\frac{20}{3}\\right) = 4\\ \\text{A} \\\\ V_L &= I_L R_L = (4)(10) = ${S.bx(S.VL, 'V')} \\end{aligned}` } };

T5.hw2 = { speed: 160,
  spec: { ground: 'sb', A: 'A', B: 'B', nodes: { tl: [0, 0], l: [2, 0], r: [4.6, 0], s: [6.6, 0], A: [8.4, 0], bl: [0, 3.6], lb: [2, 3.6], j: [4.6, 1.8], rb: [4.6, 3.6], sb: [6.6, 3.6], B: [8.4, 3.6] },
    parts: [I('I300', 'bl', 'tl', 0.3, -1), W('tl', 'l'), R('R7k', 'l', 'lb', 7000, 1), R('R5k', 'l', 'r', 5000, 1), R('R1k', 'r', 'j', 1000, -1, { bodyLen: 0.9 }), V('V25', 'j', 'rb', 2.5, -1, { bodyLen: 0.9 }), W('r', 's'), R('R6k', 's', 'sb', 6000, 1), W('s', 'A'), W('bl', 'lb'), W('lb', 'rb'), W('rb', 'sb'), W('sb', 'B')] },
  load: null,
  thev: { vocHow: t2('ถอด \\(R_L\\) แล้วใช้วิธีโนด: โนดอ้างอิงด้านล่าง ไม่รู้ค่าสองโนด \\(V_1\\) (บนซ้าย) และ \\(V_2\\) (= A)', 'remove \\(R_L\\) and use nodal analysis: reference at the bottom, two unknown nodes \\(V_1\\) (top left) and \\(V_2\\) (= A)'),
    voc: S => `\\begin{aligned} -0.3 + \\frac{V_1}{7\\,\\text{k}} + \\frac{V_1 - V_2}{5\\,\\text{k}} &= 0 &&\\Rightarrow\\; 12V_1 - 7V_2 = 10500 \\\\ \\frac{V_2 - V_1}{5\\,\\text{k}} + \\frac{V_2 - 2.5}{1\\,\\text{k}} + \\frac{V_2}{6\\,\\text{k}} &= 0 &&\\Rightarrow\\; -6V_1 + 41V_2 = 75 \\\\ V_{AB} = V_{th} = V_2 &= ${S.bx(S.voc, 'V')} \\end{aligned}`, vocGlow: ['I300', 'R7k', 'R5k', 'R1k', 'V25', 'R6k'],
    rthHow: t2('300 mA → เปิดวงจร (7 kΩ อนุกรมกับ 5 kΩ) 2.5 V → ลัดวงจร: (5 k + 7 k) ขนาน 1 k ขนาน 6 k', '300 mA → open (the 7 kΩ ends up in series with the 5 kΩ); 2.5 V → short: (5 k + 7 k) ∥ 1 k ∥ 6 k'),
    rth: S => `\\begin{aligned} R_{th} &= (5\\,\\text{k} + 7\\,\\text{k}) \\parallel 1\\,\\text{k} \\parallel 6\\,\\text{k} \\\\ &= \\frac{1}{\\frac{1}{12\\,\\text{k}} + \\frac{1}{1\\,\\text{k}} + \\frac{1}{6\\,\\text{k}}} = ${S.bx(S.rth, 'Ω')} \\end{aligned}`, rthGlow: ['R7k', 'R5k', 'R1k', 'R6k'] },
  nort: { iscHow: t2('วิธีลัดด้วยการแปลงแหล่งจ่าย (ส่วนที่ 1): 300 mA ขนาน 7 kΩ → 2100 V อนุกรม 7 kΩ รวมกับ 5 kΩ แล้วแปลงกลับเป็นแหล่งจ่ายกระแสขนาน 12 kΩ ส่วน 2.5 V อนุกรม 1 kΩ → 2.5 mA ขนาน 1 kΩ เมื่อลัดวงจรขั้ว AB กระแสของแหล่งจ่ายกระแสที่ขนานกันทั้งหมดไหลผ่านลวดลัด', 'shortcut with source transformation (Part 1): 300 mA ∥ 7 kΩ → 2100 V in series with 7 kΩ, add the 5 kΩ and turn it back into a current source in parallel with 12 kΩ; 2.5 V in series with 1 kΩ → 2.5 mA ∥ 1 kΩ. With AB shorted, all the parallel source currents flow through the short'),
    isc: S => `\\begin{aligned} (0.3)(7\\,\\text{k}) &= 2100\\ \\text{V} &&\\rightarrow\\; \\frac{2100}{7\\,\\text{k} + 5\\,\\text{k}} = 0.175\\ \\text{A} \\\\ \\frac{2.5}{1\\,\\text{k}} &= 0.0025\\ \\text{A} \\\\ I_N &= 0.175 + 0.0025 = ${S.bx(S.isc, 'A')} \\end{aligned}`, iscGlow: ['I300', 'R7k', 'R5k', 'R1k', 'V25'],
    eqNote: t2('ตรวจ: \\(I_N R_N\\) = (0.1775)(800) = 142 V = \\(V_{th}\\)', 'Check: \\(I_N R_N\\) = (0.1775)(800) = 142 V = \\(V_{th}\\).') } };

/* maximum power: Hayt Practice 5.10 (left resistor 2 kΩ in Hayt and in class; the 2025 handout prints 5 kΩ) */
T5.ex6 = { speed: 2400,
  spec: { ground: 'bm', A: 'A', B: 'B', nodes: { tl: [0, 0], tm: [3, 0], A: [6, 0], mm: [3, 1.7], bl: [0, 3.4], bm: [3, 3.4], B: [6, 3.4] },
    parts: [R('Rl', 'tl', 'bl', 2000, -1), V('V20', 'tl', 'tm', 20, 1), V('V40', 'tm', 'A', 40, 1), V('V30', 'tm', 'mm', 30, 1, { bodyLen: 0.9 }), R('R2k', 'mm', 'bm', 2000, 1, { bodyLen: 0.9 }), W('bl', 'bm'), W('bm', 'B')] } };

/* =====================================================================================================================
   maximum power worked examples (page 5.4) */
const M5 = {};
const kO = (S, q) => S.vl(q.div(1000), 'kΩ'), mA = (S, q) => S.vl(q.mul(1000), 'mA');
M5.ex6 = { net: 'ex6', lname: 'R_out', RL0: 3000,
  variants: [{ label: t2('2 kΩ (Hayt / ในห้อง)', '2 kΩ (Hayt / in class)'), set: { Rl: 2000 } }, { label: t2('5 kΩ (ฉบับแจก 2568)', '5 kΩ (2025 handout)'), set: { Rl: 5000 } }],
  steps: S => { const Rl = S.spec.parts.find(p => p.id === 'Rl').value / 1000; const e = S.exact(S.withLoad(S.spec, 3000)); const Iy = e.I('RL'); const P3 = Iy.mul(Iy).mul(3000);
    const Ix0 = S.F(-50).div(S.F(Rl * 1000 + 2000)); const Vx = Ix0.mul(2000); const I = S.voc.div(S.rth.mul(2)); const Pm = S.voc.mul(S.voc).div(S.rth.mul(4));
    const st = [{ RL: 3000, head: t2('(a) \\(R_{out}\\) = 3 kΩ', '(a) \\(R_{out}\\) = 3 kΩ'), how: t2('วิธีเมช (แบบในเฉลย): เมช \\(I_x\\) ซ้าย และเมช \\(I_y\\) ขวาที่วิ่งลงผ่าน \\(R_{out}\\)', 'mesh analysis (as in the class solution): mesh \\(I_x\\) on the left and mesh \\(I_y\\) on the right, running down through \\(R_{out}\\)'),
      tex: `\\begin{aligned} ${Rl}\\,\\text{k}\\,I_x + 20 + 30 + 2\\,\\text{k}(I_x - I_y) &= 0 &&\\Rightarrow\\; ${Rl + 2}\\,\\text{k}\\,I_x - 2\\,\\text{k}\\,I_y = -50 \\\\ 40 + 3\\,\\text{k}\\,I_y + 2\\,\\text{k}(I_y - I_x) - 30 &= 0 &&\\Rightarrow\\; -2\\,\\text{k}\\,I_x + 5\\,\\text{k}\\,I_y = -10 \\\\ I_y &= ${mA(S, Iy)} \\\\ P_{3\\text{k}} = I_y^2\\,(3\\,\\text{k}) &= ${S.bx(P3.mul(1000), 'mW')} \\end{aligned}` },
      { curve: true, head: t2('(b) หาวงจรสมมูลเทวินินที่ขั้วของ \\(R_{out}\\)', '(b) The Thévenin equivalent at the terminals of \\(R_{out}\\)'), how: t2('ถอด \\(R_{out}\\) เหลือเมช \\(I_x\\) วงเดียว แล้ว \\(V_{AB}\\) หาจาก KVL ผ่าน 30 V และ 40 V · ฆ่าแหล่งจ่ายทั้งสามได้ \\(R_{th}\\)', 'remove \\(R_{out}\\): only mesh \\(I_x\\) is left; \\(V_{AB}\\) follows from KVL through the 30 V and 40 V; killing the three sources gives \\(R_{th}\\)'),
        tex: `\\begin{aligned} ${Rl}\\,\\text{k}\\,I_x + 20 + 30 + 2\\,\\text{k}\\,I_x &= 0 &&\\Rightarrow\\; I_x = ${mA(S, Ix0)} \\\\ V_x = 2\\,\\text{k}\\,I_x &= ${S.vl(Vx, 'V')} \\\\ V_{AB} = V_{th} &= -40 + 30 + V_x = ${S.bx(S.voc, 'V')} \\\\ R_{th} &= ${Rl}\\,\\text{k} \\parallel 2\\,\\text{k} = ${S.bx(S.rth.div(1000), 'kΩ')} \\end{aligned}` },
      { RL: +S.rth, peak: true, head: t2('กำลังสูงสุด: \\(R_{out} = R_{th}\\)', 'Maximum power: \\(R_{out} = R_{th}\\)'), how: t2('ต่อ \\(R_{out}\\) เท่ากับ \\(R_{th}\\) ที่วงจรสมมูล กระแสคือ \\(V_{th}/(2R_{th})\\)', 'make \\(R_{out}\\) equal to \\(R_{th}\\) on the equivalent; the current is \\(V_{th}/(2R_{th})\\)'),
        tex: `\\begin{aligned} R_{out} &= R_{th} = ${kO(S, S.rth)} \\\\ I &= \\frac{V_{th}}{R_{th} + R_{out}} = ${mA(S, I)} \\\\ P_{max} &= I^2 R_{out} = \\frac{V_{th}^2}{4R_{th}} = ${S.bx(Pm.mul(1000), 'mW')} \\end{aligned}`, marks: [{ r: 3000, color: '#ffa552' }] }];
    if (Rl === 2) { const a = 0.02, bq = 2 * 0.02 * +S.rth - (+S.voc) * (+S.voc), cq = 0.02 * (+S.rth) * (+S.rth); const dsc = Math.sqrt(bq * bq - 4 * a * cq); const r1 = (-bq + dsc) / (2 * a), r2 = (-bq - dsc) / (2 * a);
      st.push({ RL: r2, head: t2('(c) ท้าทาย (Hayt): \\(R_{out}\\) ค่าใดได้ 20 mW พอดี', '(c) Challenge (Hayt): which \\(R_{out}\\) gets exactly 20 mW?'), how: t2('ตั้ง \\(P = V_{th}^2 R/(R_{th} + R)^2\\) = 20 mW ได้สมการกำลังสอง มีสองคำตอบ อยู่สองข้างของยอดเส้นโค้ง', 'set \\(P = V_{th}^2 R/(R_{th} + R)^2\\) = 20 mW: a quadratic with two answers, one on each side of the peak'),
        tex: `\\begin{aligned} 0.02(1000 + R)^2 &= 1225R \\\\ 0.02R^2 - 1185R + 20000 &= 0 \\\\ R &= \\boxed{${ALG.fmtDec(r1 / 1000, 2)}\\,\\text{k}\\Omega} \\;\\text{or}\\; \\boxed{${ALG.fmtDec(r2, 2)}\\ \\Omega} \\end{aligned}`, note: t2('Hayt ตอบ 59.2 kΩ และ 16.88 Ω (ค่าแรกอยู่นอกกราฟด้านขวา)', 'Hayt\'s answers: 59.2 kΩ and 16.88 Ω (the first lies off the graph to the right)'), marks: [{ r: r2, color: '#ffa552' }] }); }
    return st; } };
M5.ex5 = { net: 'ex5', RL0: 6000,
  steps: S => { const I = S.voc.div(S.rth.mul(2)), Pm = S.voc.mul(S.voc).div(S.rth.mul(4));
    return [{ curve: true, head: t2('วงจรสมมูลเทวินินจาก Ex 5 (หน้า 5.3)', 'The Thévenin equivalent from Ex 5 (page 5.3)'), how: '', tex: `\\begin{aligned} V_{th} &= ${S.vl(S.voc, 'V')} \\\\ R_{th} &= ${kO(S, S.rth)} \\end{aligned}` },
      { RL: +S.rth, peak: true, head: t2('ตั้ง \\(R_L = R_{th}\\)', 'Set \\(R_L = R_{th}\\)'), how: t2('เครื่องหมายลบของ \\(V_{th}\\) ไม่มีผลต่อกำลัง เพราะยกกำลังสอง', 'the minus sign of \\(V_{th}\\) does not matter: it is squared'),
        tex: `\\begin{aligned} R_L &= R_{th} = ${kO(S, S.rth)} \\\\ I &= \\frac{V_{th}}{2R_{th}} = ${mA(S, I)} \\\\ P_{max} &= \\frac{V_{th}^2}{4R_{th}} = \\frac{(55/7)^2}{4\\,(17000/7)} = ${S.bx(Pm.mul(1000), 'mW')} \\end{aligned}` }]; } };
M5.s5 = { net: 's5', RL0: 10,
  steps: S => { const IL = S.voc.div(S.rth.mul(2)), Pm = IL.mul(IL).mul(S.rth); const I10 = S.voc.div(S.rth.add(10)), P10 = I10.mul(I10).mul(10);
    return [{ curve: true, head: t2('วงจรสมมูลเทวินินจาก Ex.5 (หน้า 5.2)', 'The Thévenin equivalent from Ex.5 (page 5.2)'), how: '', tex: `\\begin{aligned} V_{th} &= ${S.vl(S.voc, 'V')} \\\\ R_{th} &= ${S.vl(S.rth, 'Ω')} \\end{aligned}` },
      { RL: +S.rth, peak: true, head: t2('กำลังสูงสุดเมื่อ \\(R_L = R_{th}\\) (จาก \\(dP_L/dR_L = 0\\))', 'Maximum power when \\(R_L = R_{th}\\) (from \\(dP_L/dR_L = 0\\))'), how: '',
        tex: `\\begin{aligned} R_L &= R_{th} = ${S.vl(S.rth, 'Ω')} \\\\ I_L &= \\frac{V_{th}}{R_{th} + R_L} = \\frac{100}{15 + 15} = \\frac{10}{3}\\ \\text{A} \\\\ P_L &= I_L^2 R_L = \\left(\\frac{10}{3}\\right)^2(15) = ${S.bx(Pm, 'W')} \\end{aligned}`, note: t2('ตรงกับเฉลย 166.6667 W', 'Matches the solution: 166.6667 W.') },
      { RL: 10, head: t2('เทียบกับ \\(R_L\\) = 10 Ω ของ Ex.5', 'Compare with the \\(R_L\\) = 10 Ω of Ex.5'), how: t2('โหลดที่ไม่เท่า \\(R_{th}\\) ได้กำลังน้อยกว่าเสมอ', 'a load other than \\(R_{th}\\) always gets less'),
        tex: `P_{10\\Omega} = I_L^2 R_L = (${S.vl(I10)})^2(10) = ${S.vl(P10, 'W')} \\;<\\; ${S.vl(Pm, 'W')}`, marks: [{ r: +S.rth, color: '#7ee787' }] }]; } };

/* =====================================================================================================================
   source transformation: exercise sheet 5.1 Ex.3 (only in the solutions file): find i in the 13 MΩ after turning the circuit into
   resistors and voltage sources. The class route: 12 V + 3 MΩ → 4 µA ∥ 3 MΩ; 4 µA up and 5 µA down → 1 µA down; 3 M ∥ 2 M = 1.2 MΩ;
   1 µA ∥ 1.2 MΩ → 1.2 V (+ at the bottom) + 1.2 MΩ; one loop with the 13 MΩ and the 7 V gives i = −41/71 µA ≈ −0.5775 µA.
   Each stage is a CH3.Stages stage: group = the parts to combine next (amber), born = the parts just formed (pink). */
const X5 = {};
const rail = (xs, ys = 3) => { const nodes = {}; xs.forEach((x, k) => { nodes['t' + k] = [x, 0]; nodes['b' + k] = [x, ys]; }); return nodes; };
const bot = n => Array.from({ length: n - 1 }, (_, k) => W('b' + k, 'b' + (k + 1)));
const uA = v => `${+(v * 1e6).toFixed(3)} µA`, MO = v => `${+(v / 1e6).toFixed(3)} MΩ`;
const R13 = (a, b) => R('R13', a, b, 13e6, 1, { name: '13 MΩ' }), V7 = (a, b) => V('V7', a, b, 7, 1);
const iRef = from => [{ id: 'R13', from, text: 'i', side: 'D' }];
X5.st3 = { speed: 4e6, stages: [
  { ground: 'b0', nodes: rail([0, 2.6, 4.8, 7.8]), refs: iRef('t2'), group: ['V12', 'R3M'],
    parts: [V('V12', 't0', 'b0', 12, -1), R('R3M', 't0', 't1', 3e6, 1, { name: '3 MΩ' }), I('I5', 't1', 'b1', 5e-6, 1, { name: uA(5e-6) }), W('t1', 't2'), R('R2M', 't2', 'b2', 2e6, 1, { name: '2 MΩ' }),
      R13('t2', 't3'), V7('t3', 'b3'), ...bot(4)] },
  { ground: 'b0', nodes: rail([0, 2, 4, 6.2, 9.2]), refs: iRef('t3'), born: ['I4', 'R3p'], group: ['I4', 'I5'],
    parts: [I('I4', 'b0', 't0', 4e-6, -1, { name: uA(4e-6) }), W('t0', 't1'), R('R3p', 't1', 'b1', 3e6, 1, { name: '3 MΩ' }), W('t1', 't2'), I('I5', 't2', 'b2', 5e-6, 1, { name: uA(5e-6) }), W('t2', 't3'),
      R('R2M', 't3', 'b3', 2e6, 1, { name: '2 MΩ' }), R13('t3', 't4'), V7('t4', 'b4'), ...bot(5)] },
  { ground: 'b0', nodes: rail([0, 2, 4.2, 7.2]), refs: iRef('t2'), born: ['I1'], group: ['R3p', 'R2M'],
    parts: [I('I1', 't0', 'b0', 1e-6, -1, { name: uA(1e-6) }), W('t0', 't1'), R('R3p', 't1', 'b1', 3e6, 1, { name: '3 MΩ' }), W('t1', 't2'), R('R2M', 't2', 'b2', 2e6, 1, { name: '2 MΩ' }),
      R13('t2', 't3'), V7('t3', 'b3'), ...bot(4)] },
  { ground: 'b0', nodes: rail([0, 2, 5]), refs: iRef('t1'), born: ['R12'], group: ['I1', 'R12'],
    parts: [I('I1', 't0', 'b0', 1e-6, -1, { name: uA(1e-6) }), W('t0', 't1'), R('R12', 't1', 'b1', 1.2e6, 1, { name: MO(1.2e6) }), R13('t1', 't2'), V7('t2', 'b2'), ...bot(3)] },
  { ground: 'b0', nodes: { t0: [0, 0], t1: [2.4, 0], t2: [5.4, 0], b0: [0, 3], b2: [5.4, 3] }, refs: iRef('t1'), born: ['V1', 'R12s'],
    parts: [V('V1', 'b0', 't0', 1.2, -1, { name: '1.2 V' }), R('R12s', 't0', 't1', 1.2e6, 1, { name: MO(1.2e6) }), R13('t1', 't2'), V7('t2', 'b2'), W('b0', 'b2')] }] };

global.CH5S = S5; global.CH5T = T5; global.CH5M = M5; global.CH5X = X5;
})(window);
