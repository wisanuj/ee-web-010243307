/* ch4_circuits.js — every circuit of chapter 4 (slides, exercise sheet Ex_Ch4, homework), drawn on a grid.
   Each circuit carries both a nodal description (names of the node voltages) and a mesh description (names and ring positions of
   the mesh currents), so ANA.nodal and ANA.mesh can both run on it: the pages use one of them, page 4.4 compares the two.
   title/q/warn are per method: { nodal: [th, en], mesh: [th, en] }. extras(S) = what the problem asks, from the exact solution. */
(function (global) {
'use strict';
const W = (a, b, o = {}) => ({ type: 'W', a, b, ...o });
const R = (id, a, b, v, side = 1, o = {}) => ({ id, type: 'R', a, b, value: v, name: `${v} Ω`, valText: '', side, ...o });
const I = (id, a, b, v, side = 1, o = {}) => ({ id, type: 'I', a, b, value: v, name: `${String(v).replace('-', '−')} A`, valText: '', side, ...o });
const V = (id, a, b, v, side = 1, o = {}) => ({ id, type: 'V', a, b, value: v, name: `${v} V`, valText: '', side, ...o });
const t2 = (th, en) => [th, en];
const C = {};

/* ---------- Ex 1 = Hayt Practice 4.1 ---------- */
C.ex1 = { speed: 26, ground: 'g',
  title: { nodal: t2('Ex 1 (หน้า 5)', 'Ex 1 (p. 5)'), mesh: t2('Ex 1 ด้วยเมช', 'Ex 1 by mesh') },
  q: { nodal: t2('Ex 1 (สไลด์บทที่ 4 หน้า 5 · Hayt Practice 4.1): จงหาแรงดันโนด \\(v_1\\) และ \\(v_2\\)', 'Ex 1 (chapter 4 slides p. 5 · Hayt Practice 4.1): find the node voltages \\(v_1\\) and \\(v_2\\).') },
  nodes: { tl: [0, 0], n1: [1.6, 0], n2: [4.8, 0], tr: [6.4, 0], m: [1.6, 1.7], bl: [0, 3.4], b1: [1.6, 3.4], g: [3.2, 3.4], b2: [4.8, 3.4], br: [6.4, 3.4] },
  parts: [ I('I5', 'tl', 'bl', 5, -1), W('tl', 'n1'), R('R2', 'n1', 'm', 2, 1, { bodyLen: 0.9 }), R('R3', 'm', 'b1', 3, 1, { bodyLen: 0.9 }), R('R15', 'n1', 'n2', 15, 1),
    R('R4', 'n2', 'b2', 4, -1), W('n2', 'tr'), I('I2', 'br', 'tr', 2, 1), W('bl', 'b1'), W('b1', 'g'), W('g', 'b2'), W('b2', 'br') ],
  nodal: { nv: { n1: { n: 'v_1', dx: -0.15, dy: -0.5 }, n2: { n: 'v_2', dx: 0.15, dy: -0.5 } }, ref: 'v_3', series: [['R2', 'R3']],
    extras: S => [{ t: t2('กระแสที่ไหลลงผ่าน 2 Ω + 3 Ω (ในเฉลยเรียก I₂)', 'Current flowing down through 2 Ω + 3 Ω (called I₂ in the class notes)'), glow: ['R2', 'R3'],
      note: t2('ค่าติดลบ: กระแสจริงไหลขึ้น ดูจุดในกิ่งนี้', 'Negative: the real current flows up, as the dots in this branch show'),
      tex: S.rows([['I_2', '\\frac{v_1 - v_3}{5}', `\\frac{${S.v('n1').tex()} - 0}{5}`, S.box(S.v('n1').div(5), S.UA)]]) }] },
  mesh: { meshes: [{ n: 'i_1', at: [0.8, 1.7] }, { n: 'i_2', at: [3.2, 1.9] }, { n: 'i_3', at: [5.6, 1.7] }],
    extras: S => [{ t: t2('แรงดันโนด v₁ จากกระแสเมช', 'Node voltage v₁ from the mesh currents'), glow: ['R2', 'R3'],
      tex: S.rows([['v_1', '5(i_1 - i_2)', `5\\left(${S.i('i_1').tex()} - (${S.i('i_2').tex()})\\right)`, S.box(S.i('i_1').sub(S.i('i_2')).mul(5), S.UV)]]) }] } };

/* ---------- Ex 2 (nodal) = Ex 8 (mesh) = Hayt Practice 4.2 ---------- */
C.ex2 = { speed: 22, ground: 'bB',
  title: { nodal: t2('Ex 2 (หน้า 6)', 'Ex 2 (p. 6)'), mesh: t2('Ex 8 (หน้า 16)', 'Ex 8 (p. 16)') },
  q: { nodal: t2('Ex 2 (หน้า 6 · Hayt Practice 4.2): จงหาแรงดันคร่อมแหล่งจ่ายกระแสแต่ละตัว', 'Ex 2 (p. 6 · Hayt Practice 4.2): find the voltage across each current source.'),
       mesh: t2('Ex 8 (หน้า 16): วงจรเดียวกับ Ex 2 คราวนี้ใช้การวิเคราะห์แบบเมช หาแรงดันคร่อมแหล่งจ่ายกระแสแต่ละตัว', 'Ex 8 (p. 16): the circuit of Ex 2 again, now by mesh analysis: find the voltage across each current source.') },
  nodes: { tl: [0, 0], tc: [3.2, 0], A: [0, 2], B: [1.6, 2], C: [3.2, 2], Cr: [4.8, 2], bl: [0, 5.6], bB: [1.6, 5.6], bC: [3.2, 5.6], br: [4.8, 5.6] },
  parts: [ W('tl', 'A'), R('R2', 'tl', 'tc', 2, 1), W('tc', 'C'), R('R1', 'A', 'B', 1, 1), R('R4', 'B', 'C', 4, 1), I('I3', 'A', 'bl', 3, -1),
    R('R3', 'B', 'bB', 3, -1), R('R5', 'C', 'bC', 5, -1), W('C', 'Cr'), I('I7', 'br', 'Cr', 7, 1), W('bl', 'bB'), W('bB', 'bC'), W('bC', 'br') ],
  nodal: { nv: { A: { n: 'V_A', dx: -0.55, dy: -0.15 }, B: { n: 'V_B', dx: 0.5, dy: 0.5 }, C: { n: 'V_C', dx: 0.6, dy: -0.45 } }, ref: 'V_D',
    extras: S => [{ t: t2('แรงดันคร่อมแหล่งจ่าย 3 A (ขั้ว + ด้านบน)', 'Voltage across the 3 A source (+ at the top)'), glow: ['I3'],
      tex: `v_{3A} = V_A - V_D = ${S.box(S.v('A'), S.UV)}` },
    { t: t2('แรงดันคร่อมแหล่งจ่าย 7 A (ขั้ว + ด้านบน)', 'Voltage across the 7 A source (+ at the top)'), glow: ['I7'],
      note: t2('Hayt ตอบ 5.235 V และ 11.47 V', 'Hayt\'s answers: 5.235 V and 11.47 V'), tex: `v_{7A} = V_C - V_D = ${S.box(S.v('C'), S.UV)}` }] },
  mesh: { meshes: [{ n: 'I_A', at: [0.8, 4.65], r: 0.5 }, { n: 'I_B', at: [1.6, 0.95], r: 0.44 }, { n: 'I_C', at: [2.4, 4.65], r: 0.5 }, { n: 'I_D', at: [4.0, 4.65], r: 0.5 }],
    extras: S => { const A = S.i('I_A'), B = S.i('I_B'), Cc = S.i('I_C'), D = S.i('I_D'); const vcd = Cc.sub(D).mul(5), vad = A.sub(B).add(A.sub(Cc).mul(3));
      return [{ t: t2('แรงดันคร่อมแหล่งจ่าย 7 A = แรงดันคร่อม 5 Ω (ขนานกัน)', 'Voltage across the 7 A source = voltage across the 5 Ω (in parallel)'), glow: ['I7', 'R5'],
        tex: S.rows([['V_{CD}', '5(I_C - I_D)', `5\\left(${Cc.tex()} - (${D.tex()})\\right)`, S.box(vcd, S.UV)]]) },
      { t: t2('แรงดันคร่อมแหล่งจ่าย 3 A: KVL รอบเมช A โดยมี V_AD เป็นตัวไม่ทราบค่า', 'Voltage across the 3 A source: KVL round mesh A with V_AD as the unknown'), glow: ['I3', 'R1', 'R3'],
        tex: `\\begin{gathered} -V_{AD} + 1(I_A - I_B) + 3(I_A - I_C) = 0 \\\\ ${S.rows([['V_{AD}', '(I_A - I_B) + 3(I_A - I_C)', `${A.sub(B).tex()} + 3\\left(${A.sub(Cc).tex()}\\right)`, S.box(vad, S.UV)]])} \\end{gathered}` }]; } } };

/* ---------- Ex 3 (nodal) = Ex 7 (mesh) = Hayt Example 4.7 ---------- */
C.ex3 = { speed: 60, ground: 'bm',
  title: { nodal: t2('Ex 3 (หน้า 7)', 'Ex 3 (p. 7)'), mesh: t2('Ex 7 (หน้า 15)', 'Ex 7 (p. 15)') },
  q: { nodal: t2('Ex 3 (หน้า 7 · Hayt Example 4.7): จงหากำลังที่แหล่งจ่าย 2 V จ่าย', 'Ex 3 (p. 7 · Hayt Example 4.7): find the power supplied by the 2 V source.'),
       mesh: t2('Ex 7 (หน้า 15): วงจรเดียวกับ Ex 3 หากำลังที่แหล่งจ่าย 2 V จ่าย ด้วยการวิเคราะห์แบบเมช', 'Ex 7 (p. 15): the circuit of Ex 3, power supplied by the 2 V source, now by mesh analysis.') },
  warn: { nodal: t2('สไลด์ฉบับแจกพิมพ์ตัวต้านทานซ้ายบนเป็น 5 Ω แต่ในห้องแก้เป็น 4 Ω (ตรงกับ Ex 7 และ Hayt Example 4.7) หน้านี้ใช้ 4 Ω', 'The handout prints the top-left resistor as 5 Ω; in class it was corrected to 4 Ω (as in Ex 7 and Hayt Example 4.7). This page uses 4 Ω.') },
  nodes: { A: [0, 0], B: [2.8, 0], Cn: [5.6, 0], D: [2.8, 2.2], bl: [0, 4.4], bm: [2.8, 4.4], br: [5.6, 4.4] },
  parts: [ V('V5', 'A', 'bl', 5, -1), R('R4', 'A', 'B', 4, 1), R('R5', 'B', 'Cn', 5, 1), R('R2', 'B', 'D', 2, 1), V('V2', 'bm', 'D', 2, 1), V('V1', 'Cn', 'br', 1, 1),
    W('bl', 'bm'), W('bm', 'br') ],
  nodal: { nv: { A: { n: 'V_A', dx: -0.5, dy: -0.45 }, B: { n: 'V_B', dy: -0.55 }, Cn: { n: 'V_C', dx: 0.5, dy: -0.45 }, D: { n: 'V_D', dx: -0.75, dy: 0 } }, ref: 'V_E',
    extras: S => { const i2 = S.v('B').sub(S.v('D')).div(2); return [{ t: t2('กระแสลงผ่าน 2 Ω แล้วไหลผ่านแหล่งจ่าย 2 V จากขั้ว − ไปขั้ว +', 'Current down through the 2 Ω, then through the 2 V source from − to +'), glow: ['R2', 'V2'],
      tex: S.rows([['I_2', '\\frac{V_B - V_D}{2}', `\\frac{${S.v('B').tex()} - (${S.v('D').tex()})}{2}`, S.box(i2, S.UA)]]) },
    { t: t2('กำลังที่แหล่งจ่าย 2 V จ่าย (กระแสออกจากขั้ว +)', 'Power supplied by the 2 V source (current leaves its + terminal)'), glow: ['V2'],
      tex: S.rows([['P_{supp,\\,2V}', '(2)(I_2)', `(2)\\left(${i2.tex()}\\right)`, S.box(i2.mul(2), '\\,\\text{W}')]]) }]; } },
  mesh: { meshes: [{ n: 'i_1', at: [1.4, 2.2] }, { n: 'i_2', at: [4.2, 2.2] }],
    extras: S => [{ t: t2('กระแสที่ออกจากขั้ว + ของแหล่งจ่าย 2 V คือ i₁ − i₂ ดังนั้นกำลังที่จ่าย', 'The current leaving the + terminal of the 2 V source is i₁ − i₂, so the power supplied is'), glow: ['V2', 'R2'],
      tex: S.rows([['P_{supp,\\,2V}', '2(i_1 - i_2)', `2\\left(${S.i('i_1').tex()} - (${S.i('i_2').tex()})\\right)`, S.box(S.i('i_1').sub(S.i('i_2')).mul(2), '\\,\\text{W}')]]) }] } };

/* ---------- exercise sheet Ex.1 (nodal) = Ex.2 (mesh) ---------- */
C.sx1 = { speed: 9, ground: 'bB',
  title: { nodal: t2('แบบฝึกหัด Ex.1', 'Exercise Ex.1'), mesh: t2('แบบฝึกหัด Ex.2', 'Exercise Ex.2') },
  q: { nodal: t2('แบบฝึกหัด Ex.1: ใช้การวิเคราะห์แบบโนด หาแรงดันคร่อมตัวต้านทาน 2 Ω และกระแสในตัวต้านทาน 20 Ω', 'Exercise Ex.1: use nodal analysis to find the voltage across the 2 Ω resistor and the current in the 20 Ω resistor.'),
       mesh: t2('แบบฝึกหัด Ex.2 (วงจรเดียวกับ Ex.1): ใช้การวิเคราะห์แบบเมช หากำลังที่แหล่งจ่าย 12 V และแหล่งจ่าย 9 A ดูดกลืน', 'Exercise Ex.2 (the circuit of Ex.1): use mesh analysis to find the power absorbed by the 12 V source and by the 9 A source.') },
  warn: { mesh: t2('เฉลยเขียนสมการ (1) เป็น 11I₂ − 2I₃ − 5I₄ = 0 และเวกเตอร์ด้านขวาเป็น [0, 12, 0] ที่ถูกคือ = 36 เพราะ I₁ = 9 A (4 × 9 ย้ายข้าง) ส่วนคำตอบ I₂, I₃, I₄ ในเฉลยถูกต้องแล้ว', 'The solution writes equation (1) as 11I₂ − 2I₃ − 5I₄ = 0 with right-hand side [0, 12, 0]; it should be = 36, because I₁ = 9 A (4 × 9 moved across). The answers I₂, I₃, I₄ in the solution are correct.') },
  nodes: { t0l: [0, 0], t0r: [4.4, 0], t1l: [0, 1.6], t1r: [4.4, 1.6], A: [0, 3.4], B: [2.2, 3.4], Cn: [4.4, 3.4], D: [0, 5.2], bl: [0, 7.6], bB: [2.2, 7.6], br: [4.4, 7.6] },
  parts: [ I('I9', 't0l', 't0r', 9, 1), W('t0l', 't1l'), W('t1l', 'A'), W('t0r', 't1r'), W('t1r', 'Cn'), R('R4t', 't1l', 't1r', 4, 1), R('R2', 'A', 'B', 2, -1), R('R5', 'B', 'Cn', 5, -1),
    R('R4l', 'A', 'D', 4, -1), V('V12', 'D', 'bl', 12, -1), R('R100', 'B', 'bB', 100, 1), R('R20', 'Cn', 'br', 20, 1), W('bl', 'bB'), W('bB', 'br') ],
  nodal: { nv: { A: { n: 'V_A', dx: -0.75, dy: -0.25 }, B: { n: 'V_B', dy: -0.5 }, Cn: { n: 'V_C', dx: 0.75, dy: -0.25 }, D: { n: 'V_D', dx: -0.75, dy: 0 } }, ref: 'V_E',
    extras: S => [{ t: t2('แรงดันคร่อม 2 Ω', 'Voltage across the 2 Ω'), glow: ['R2'], tex: S.rows([['V_{2\\Omega}', 'V_B - V_A', `${S.v('B').tex()} - ${S.v('A').tex()}`, S.box(S.v('B').sub(S.v('A')), S.UV)]]) },
      { t: t2('กระแสใน 20 Ω (ไหลลง)', 'Current in the 20 Ω (flowing down)'), glow: ['R20'], tex: S.rows([['I_{20\\Omega}', '\\frac{V_C - V_E}{20}', `\\frac{${S.v('Cn').tex()}}{20}`, S.box(S.v('Cn').div(20), S.UA)]]) }] },
  mesh: { meshes: [{ n: 'I_1', at: [3.4, 0.8] }, { n: 'I_2', at: [2.2, 2.5] }, { n: 'I_3', at: [1.1, 6.4] }, { n: 'I_4', at: [3.3, 6.4] }],
    extras: S => { const i1 = S.i('I_1'), i2 = S.i('I_2'), i3 = S.i('I_3'); const vx = i2.sub(i1).mul(4);
      return [{ t: t2('กำลังที่แหล่งจ่าย 12 V ดูดกลืน: I₃ ไหลขึ้นผ่านแหล่งจ่าย กระแสที่เข้าขั้ว + จึงเป็น −I₃', 'Power absorbed by the 12 V source: I₃ flows up through it, so the current entering its + terminal is −I₃'), glow: ['V12'],
        tex: S.rows([['P_{abs,\\,12V}', '(12)(-I_3)', `(12)\\left(${i3.neg().tex()}\\right)`, S.box(i3.neg().mul(12), '\\,\\text{W}')]]) },
      { t: t2('กำลังที่แหล่งจ่าย 9 A ดูดกลืน: แรงดันคร่อม (+ ทางซ้าย) = แรงดันคร่อม 4 Ω ที่ขนานกัน', 'Power absorbed by the 9 A source: its voltage (+ on the left) equals that of the 4 Ω in parallel'), glow: ['I9', 'R4t'],
        tex: S.rows([['V_x', '4(I_2 - I_1)', `4\\left(${i2.tex()} - 9\\right)`, S.val(vx, S.UV)], ['P_{abs,\\,9A}', 'V_x (9)', S.box(vx.mul(9), '\\,\\text{W}')]]) }]; } } };

/* ---------- exercise sheet Ex.6 (nodal) ---------- */
C.sx6 = { speed: 26, ground: 'bB',
  title: { nodal: t2('แบบฝึกหัด Ex.6', 'Exercise Ex.6'), mesh: t2('แบบฝึกหัด Ex.6 ด้วยเมช', 'Exercise Ex.6 by mesh') },
  q: { nodal: t2('แบบฝึกหัด Ex.6: ใช้การวิเคราะห์แบบโนด หากระแส \\(I_x\\) และแรงดัน \\(V_x\\)', 'Exercise Ex.6: use nodal analysis to find the current \\(I_x\\) and the voltage \\(V_x\\).') },
  nodes: { tl: [0, 0], tr: [6, 0], A: [0, 2.2], B: [3, 2.2], Cn: [6, 2.2], bl: [0, 4.8], bB: [3, 4.8], bC: [6, 4.8] },
  parts: [ R('R100', 'tl', 'tr', 100, -1), W('tl', 'A'), W('tr', 'Cn'), V('V75', 'A', 'bl', 75, -1), R('R25a', 'A', 'B', 25, -1), R('R10', 'B', 'Cn', 10, -1),
    R('R50', 'B', 'bB', 50, 1), R('R25b', 'Cn', 'bC', 25, 1), W('bl', 'bB'), W('bB', 'bC') ],
  pol: [{ id: 'R25a', plus: 'A', text: 'Vₓ', side: 'U' }], refs: [{ id: 'R10', from: 'Cn', text: 'Iₓ', side: 'U' }],
  nodal: { nv: { A: { n: 'V_A', dx: -0.6, dy: -0.4 }, B: { n: 'V_B', dx: 0.55, dy: 0.45 }, Cn: { n: 'V_C', dx: 0.65, dy: 0.45 } }, ref: 'V_D',
    extras: S => [{ t: t2('แรงดัน Vₓ คร่อม 25 Ω (+ ทางซ้าย)', 'Voltage Vₓ across the 25 Ω (+ on the left)'), glow: ['R25a'], tex: S.rows([['V_x', 'V_A - V_B', `75 - ${S.v('B').tex()}`, S.box(S.v('A').sub(S.v('B')), S.UV)]]) },
      { t: t2('กระแส Iₓ ใน 10 Ω (ลูกศรชี้ซ้าย จาก C ไป B)', 'Current Iₓ in the 10 Ω (arrow to the left, from C to B)'), glow: ['R10'],
        note: t2('ค่าติดลบ: กระแสจริงไหลไปทางขวา', 'Negative: the real current flows to the right'), tex: S.rows([['I_x', '\\frac{V_C - V_B}{10}', `\\frac{${S.v('Cn').tex()} - ${S.v('B').tex()}}{10}`, S.box(S.v('Cn').sub(S.v('B')).div(10), S.UA)]]) }] },
  mesh: { meshes: [{ n: 'i_1', at: [1.5, 3.5] }, { n: 'i_2', at: [4.5, 3.5] }, { n: 'i_3', at: [1.5, 1.05] }] } };

/* ---------- homework 1 (nodal) ---------- */
C.hw1 = { speed: 8, ground: 'b1',
  title: { nodal: t2('การบ้านข้อ 1', 'Homework 1'), mesh: t2('การบ้านข้อ 1 ด้วยเมช', 'Homework 1 by mesh') },
  q: { nodal: t2('การบ้านข้อ 1 (หน้า 20): ใช้การวิเคราะห์แบบโนด หา \\(v_1 - v_2\\)', 'Homework 1 (p. 20): with nodal analysis, find \\(v_1 - v_2\\).') },
  nodes: { tl: [0, 0], n1: [1.6, 0], n2: [3.8, 0], tr: [5.4, 0], m: [1.6, 2], bl: [0, 4], b1: [1.6, 4], b2: [3.8, 4], br: [5.4, 4] },
  parts: [ I('I2', 'bl', 'tl', 2, -1), W('tl', 'n1'), R('R1', 'n1', 'n2', 1, 1), R('R5', 'n1', 'm', 5, 1, { bodyLen: 0.9 }), R('R4', 'm', 'b1', 4, 1, { bodyLen: 0.9 }),
    R('R2', 'n2', 'b2', 2, -1), W('n2', 'tr'), I('I15', 'br', 'tr', 15, 1), W('bl', 'b1'), W('b1', 'b2'), W('b2', 'br') ],
  nodal: { nv: { n1: { n: 'v_1', dx: -0.2, dy: -0.5 }, n2: { n: 'v_2', dx: 0.2, dy: -0.5 } }, series: [['R5', 'R4']],
    extras: S => [{ t: t2('สิ่งที่โจทย์ถาม', 'What the problem asks'), glow: ['R1'], note: t2('ตรงกับเฉลยในสไลด์: v₁ = 27 V, v₂ = 28 V', 'Matches the slide answer: v₁ = 27 V, v₂ = 28 V'),
      tex: `v_1 - v_2 = ${S.v('n1').tex()} - ${S.v('n2').tex()} = ${S.box(S.v('n1').sub(S.v('n2')), S.UV)}` }] },
  mesh: { meshes: [{ n: 'i_1', at: [0.8, 2] }, { n: 'i_2', at: [2.7, 2] }, { n: 'i_3', at: [4.6, 2] }] } };

/* ---------- Ex 5 = Hayt Practice 4.4 (supernode) ---------- */
C.ex5 = { speed: 8, ground: 'g',
  title: { nodal: t2('Ex 5 (หน้า 11)', 'Ex 5 (p. 11)'), mesh: t2('Ex 5 ด้วยเมช', 'Ex 5 by mesh') },
  q: { nodal: t2('Ex 5 (หน้า 11 · Hayt Practice 4.4): จงหาแรงดันคร่อมแหล่งจ่ายกระแสแต่ละตัว', 'Ex 5 (p. 11 · Hayt Practice 4.4): find the voltage across each current source.') },
  nodes: { L0: [1.6, 0], R0: [5.6, 0], L: [1.6, 1.6], Rn: [5.6, 1.6], Ls: [0, 1.6], Rs: [7.2, 1.6], bs: [0, 4.2], bL: [1.6, 4.2], g: [3.6, 4.2], bR: [5.6, 4.2], bRs: [7.2, 4.2] },
  parts: [ R('R13', 'L0', 'R0', 1 / 3, 1, { name: '1/3 Ω' }), W('L0', 'L'), W('R0', 'Rn'), V('V5', 'L', 'Rn', 5, -1), W('Ls', 'L'), W('Rn', 'Rs'),
    I('I4', 'bs', 'Ls', 4, -1), R('R12', 'L', 'bL', 1 / 2, 1, { name: '1/2 Ω' }), R('R16', 'Rn', 'bR', 1 / 6, -1, { name: '1/6 Ω' }), I('I9', 'bRs', 'Rs', 9, 1),
    W('bs', 'bL'), W('bL', 'g'), W('g', 'bR'), W('bR', 'bRs') ],
  nodal: { nv: { L: { n: 'v_1', dx: -0.55, dy: 0.5 }, Rn: { n: 'v_2', dx: 0.55, dy: 0.5 } }, ref: 'v_3', ell: { V5: [3.6, 0.85, 2.9, 1.35, -150] },
    extras: S => [{ t: t2('แรงดันคร่อมแหล่งจ่าย 4 A (ขั้ว + ด้านบน)', 'Voltage across the 4 A source (+ at the top)'), glow: ['I4'], tex: `v_{4A} = v_1 - v_3 = ${S.box(S.v('L'), S.UV)}` },
      { t: t2('แรงดันคร่อมแหล่งจ่าย 9 A (ขั้ว + ด้านบน)', 'Voltage across the 9 A source (+ at the top)'), glow: ['I9'], note: t2('Hayt ตอบ 5.375 V และ 375 mV', 'Hayt\'s answers: 5.375 V and 375 mV'), tex: `v_{9A} = v_2 - v_3 = ${S.box(S.v('Rn'), S.UV)}` }] },
  mesh: { meshes: [{ n: 'i_1', at: [0.8, 2.9] }, { n: 'i_2', at: [3.6, 3.0] }, { n: 'i_3', at: [3.6, 0.8] }, { n: 'i_4', at: [6.4, 2.9] }] } };

/* ---------- Ex 4 = Hayt Example 4.5 (supernode) and exercise sheet Ex.4 (its variant) ---------- */
function hayt45(R12, plusAt2) {
  return { nodes: { t1: [1.6, 0], t3: [8.4, 0], m1: [1.6, 1.4], m2: [4.8, 1.4], n1: [1.6, 2.8], n2: [4.8, 2.8], n3: [8.4, 2.8], s1: [0, 2.8], s3: [10, 2.8], bs1: [0, 5.6], b2: [4.8, 5.6], b3: [8.4, 5.6], bs3: [10, 5.6] },
    parts: [ R('R4', 't1', 't3', 4, 1), W('t1', 'm1'), W('m1', 'n1'), W('t3', 'n3'), I('Im3', 'm2', 'm1', -3, 1), W('m2', 'n2'), R('R12', 'n1', 'n2', R12, -1),
      plusAt2 ? V('V22', 'n2', 'n3', 22, -1) : V('V22', 'n3', 'n2', 22, -1), R('R1', 'n2', 'b2', 1, 1), R('R5', 'n3', 'b3', 5, -1), W('s1', 'n1'), I('Im8', 'bs1', 's1', -8, -1),
      W('n3', 's3'), I('Im25', 's3', 'bs3', -25, 1), W('bs1', 'b2'), W('b2', 'b3'), W('b3', 'bs3') ] };
}
C.ex4 = { speed: 3, ground: 'b2', ...hayt45(3, false),
  title: { nodal: t2('Ex 4 (หน้า 10)', 'Ex 4 (p. 10)'), mesh: t2('Ex 4 ด้วยเมช', 'Ex 4 by mesh') },
  q: { nodal: t2('Ex 4 (หน้า 10 · Hayt Example 4.5): จงหาแรงดันโนด \\(v_1\\) (แหล่งจ่าย 22 V มาแทนตัวต้านทาน 7 Ω ของ Hayt Example 4.2)', 'Ex 4 (p. 10 · Hayt Example 4.5): find the node voltage \\(v_1\\) (the 22 V source replaces the 7 Ω resistor of Hayt Example 4.2).') },
  nodal: { nv: { n1: { n: 'v_1', dx: -0.4, dy: 0.5 }, n2: { n: 'v_2', dx: 0.45, dy: -0.45 }, n3: { n: 'v_3', dx: 0.5, dy: -0.45 } }, ref: 'v_4', refDx: 0.75, refDy: 0.4, ell: { V22: [6.6, 2.8, 2.45, 0.85] },
    extras: S => [{ t: t2('สิ่งที่โจทย์ถาม', 'What the problem asks'), glow: [], note: t2('Hayt ตอบ v₁ = 1.071 V', 'Hayt\'s answer: v₁ = 1.071 V'), tex: `v_1 = ${S.box(S.v('n1'), S.UV)}` }] },
  mesh: { meshes: [{ n: 'i_1', at: [2.4, 4.2] }, { n: 'i_2', at: [3.2, 2.1] }, { n: 'i_3', at: [6.6, 0.9] }, { n: 'i_4', at: [6.6, 4.4] }, { n: 'i_5', at: [9.2, 4.2] }] } };
C.sx4 = { speed: 3, ground: 'b2', ...hayt45(6, true),
  title: { nodal: t2('แบบฝึกหัด Ex.4', 'Exercise Ex.4'), mesh: t2('แบบฝึกหัด Ex.4 ด้วยเมช', 'Exercise Ex.4 by mesh') },
  q: { nodal: t2('แบบฝึกหัด Ex.4: ใช้การวิเคราะห์แบบโนด หากระแส \\(I_x\\) โดยให้ \\(V_4\\) เป็นโนดอ้างอิง (วงจรคล้าย Ex 4 แต่เป็น 6 Ω และขั้ว + ของ 22 V อยู่ทาง \\(V_2\\))', 'Exercise Ex.4: with \\(V_4\\) as the reference, use nodal analysis to find the current \\(I_x\\) (like Ex 4, but with 6 Ω and the + of the 22 V on the \\(V_2\\) side).') },
  warn: { nodal: t2('เฉลยเขียน V₂ = 17.8833 V ที่ถูกคือ 17.8333 V (= V₃ + 22) ส่วนคำตอบ Iₓ = 4.4 A ถูกต้อง', 'The solution writes V₂ = 17.8833 V; it should be 17.8333 V (= V₃ + 22). The answer Iₓ = 4.4 A is correct.') },
  refs: [{ id: 'R4', from: 't3', text: 'Iₓ', side: 'D' }],
  nodal: { nv: { n1: { n: 'V_1', dx: -0.4, dy: 0.5 }, n2: { n: 'V_2', dx: 0.45, dy: -0.45 }, n3: { n: 'V_3', dx: 0.5, dy: -0.45 } }, ref: 'V_4', ell: { V22: [6.6, 2.8, 2.45, 0.85] },
    extras: S => [{ t: t2('กระแส Iₓ ใน 4 Ω (ลูกศรจาก V₃ ไป V₁)', 'Current Iₓ in the 4 Ω (arrow from V₃ to V₁)'), glow: ['R4'],
      tex: S.rows([['I_x', '\\frac{V_3 - V_1}{4}', `\\frac{${S.v('n3').tex()} - (${S.v('n1').tex()})}{4}`, S.box(S.v('n3').sub(S.v('n1')).div(4), S.UA)]]) }] },
  mesh: { meshes: [{ n: 'i_1', at: [2.4, 4.2] }, { n: 'i_2', at: [3.2, 2.1] }, { n: 'i_3', at: [6.6, 0.9] }, { n: 'i_4', at: [6.6, 4.4] }, { n: 'i_5', at: [9.2, 4.2] }] } };

/* ---------- homework 2 (nodal, supernode) = homework 3 (mesh, supermesh) ---------- */
C.hw2 = { speed: 30, ground: 'bm', pad: 2.3,
  title: { nodal: t2('การบ้านข้อ 2', 'Homework 2'), mesh: t2('การบ้านข้อ 3', 'Homework 3') },
  q: { nodal: t2('การบ้านข้อ 2 (หน้า 21): หาแรงดันโนดทั้งสี่ตัว', 'Homework 2 (p. 21): find all four node voltages.'),
       mesh: t2('การบ้านข้อ 3 (หน้า 22): วงจรเดียวกับข้อ 2 ใช้ซูเปอร์เมชหากระแสเมชทุกตัว', 'Homework 3 (p. 22): the circuit of homework 2; use the supermesh to find every mesh current.') },
  warn: { nodal: t2('ฉบับแจกพิมพ์ตัวต้านทานซ้ายล่างเป็น 11 Ω แต่คำตอบในสไลด์ (v₃ = −1.909 V) ได้จาก 1 Ω และในห้องแก้เป็น 1 Ω หน้านี้ใช้ 1 Ω (ถ้าเป็น 11 Ω จะได้ v₁ = −5 V, v₃ = −11 V)', 'The handout prints the bottom-left resistor as 11 Ω, but the slide answer (v₃ = −1.909 V) needs 1 Ω, and it was corrected to 1 Ω in class. This page uses 1 Ω (with 11 Ω: v₁ = −5 V, v₃ = −11 V).'),
          mesh: t2('ใช้ 1 Ω ตามที่แก้ในห้อง (ฉบับแจกพิมพ์ 11 Ω) สไลด์ไม่มีคำตอบของข้อนี้ ตรวจได้จากข้อ 2: v₄ = 2(i_z − i_y) และ v₃ = −(1)i_z', 'Uses 1 Ω as corrected in class (the handout prints 11 Ω). The slides give no answer here; check against homework 2: v₄ = 2(i_z − i_y) and v₃ = −(1)i_z.') },
  nodes: { tl: [0, 0], tm: [3.2, 0], tr: [6.4, 0], ml: [0, 2.4], mm: [3.2, 2.4], rs: [6.4, 2.4], bl: [0, 4.8], bm: [3.2, 4.8], br: [6.4, 4.8] },
  parts: [ V('V6', 'tl', 'ml', 6, -1), R('R10', 'tl', 'tm', 10, 1), W('tm', 'tr'), R('R4', 'tm', 'mm', 4, 1), I('I2', 'ml', 'mm', 2, -1), V('V5', 'tr', 'rs', 5, 1), W('rs', 'br'),
    R('R1', 'ml', 'bl', 1, -1), R('R2', 'mm', 'bm', 2, 1), W('bl', 'bm'), W('bm', 'br') ],
  nodal: { nv: { tl: { n: 'v_1', dx: 0.45, dy: -0.5 }, tm: { n: 'v_2', dx: 0.5, dy: -0.5 }, ml: { n: 'v_3', dx: 0.55, dy: 0.55 }, mm: { n: 'v_4', dx: -0.6, dy: 0.5 } }, ell: { V6: [0, 1.2, 0.85, 1.75, 155] },
    extras: S => [{ t: t2('ตรวจคำตอบ', 'Check'), glow: ['V6'], note: t2('ตรงกับเฉลยในสไลด์: 4.091, 5, −1.909, 4.333 V', 'Matches the slide answers: 4.091, 5, −1.909, 4.333 V'),
      tex: S.rows([['v_1 - v_3', `${S.v('tl').tex()} - (${S.v('ml').tex()})`, `${S.v('tl').sub(S.v('ml')).tex()}\\ \\text{V} \\;\\checkmark`]]) }] },
  mesh: { meshes: [{ n: 'i_x', at: [1.6, 0.95] }, { n: 'i_y', at: [5.0, 2.4] }, { n: 'i_z', at: [1.6, 3.75] }],
    extras: S => [{ t: t2('ตรวจกับการบ้านข้อ 2 (แบบโนด)', 'Check against homework 2 (nodal)'), glow: ['R2', 'R1'],
      tex: S.rows([['v_4', '2(i_z - i_y)', `2\\left(${S.i('i_z').tex()} - (${S.i('i_y').tex()})\\right)`, `${S.val(S.i('i_z').sub(S.i('i_y')).mul(2), S.UV)} \\;\\checkmark`], ['v_3', '-(1)\\,i_z', `${S.val(S.i('i_z').neg(), S.UV)} \\;\\checkmark`]]) }] } };

/* ---------- mesh introduction = Hayt Fig. 4.15/4.16 ---------- */
C.hm = { speed: 16, ground: 'bm',
  title: { nodal: t2('รูปแนะนำเมชด้วยโนด', 'Mesh intro by nodal'), mesh: t2('รูปแนะนำเมช (หน้า 12)', 'Mesh intro (p. 12)') },
  q: { mesh: t2('วงจรแนะนำการวิเคราะห์แบบเมช (สไลด์หน้า 12 · Hayt รูป 4.15–4.16): หากระแสเมช \\(i_1\\) และ \\(i_2\\)', 'The mesh-analysis introduction circuit (slides p. 12 · Hayt Figs. 4.15–4.16): find the mesh currents \\(i_1\\) and \\(i_2\\).') },
  nodes: { tl: [0, 0], tm: [3.4, 0], tr: [6.8, 0], bl: [0, 3], bm: [3.4, 3], br: [6.8, 3] },
  parts: [ V('V42', 'tl', 'bl', 42, -1), R('R6', 'tl', 'tm', 6, 1), R('R4', 'tm', 'tr', 4, 1), R('R3', 'tm', 'bm', 3, 1), V('V10', 'br', 'tr', 10, 1), W('bl', 'bm'), W('bm', 'br') ],
  nodal: { nv: { tl: 'v_A', tm: { n: 'v_B', dy: -0.5 }, tr: 'v_C' } },
  mesh: { meshes: [{ n: 'i_1', at: [1.6, 1.5] }, { n: 'i_2', at: [5.2, 1.5] }],
    extras: S => [{ t: t2('กระแสลงผ่าน 3 Ω = ผลต่างของกระแสเมช', 'Current down through the 3 Ω = the difference of the mesh currents'), glow: ['R3'], tex: `I_{3\\Omega} = i_1 - i_2 = ${S.i('i_1').tex()} - ${S.i('i_2').tex()} = ${S.box(S.i('i_1').sub(S.i('i_2')), S.UA)}` }] } };

/* ---------- Ex 6 = Hayt Practice 4.6 ---------- */
C.ex6 = { speed: 150, ground: 'bm',
  title: { nodal: t2('Ex 6 ด้วยโนด', 'Ex 6 by nodal'), mesh: t2('Ex 6 (หน้า 14)', 'Ex 6 (p. 14)') },
  q: { mesh: t2('Ex 6 (หน้า 14 · Hayt Practice 4.6): หา \\(i_1\\) และ \\(i_2\\)', 'Ex 6 (p. 14 · Hayt Practice 4.6): find \\(i_1\\) and \\(i_2\\).') },
  nodes: { tl: [0, 0], tm: [3.4, 0], tr: [6.8, 0], mm: [3.4, 1.6], bl: [0, 3.2], bm: [3.4, 3.2], br: [6.8, 3.2] },
  parts: [ V('V6', 'tl', 'bl', 6, -1), R('R14', 'tl', 'tm', 14, 1), R('R10', 'tm', 'tr', 10, 1), R('R5a', 'tm', 'mm', 5, 1, { bodyLen: 0.9 }), R('R5b', 'mm', 'bm', 5, 1, { bodyLen: 0.9 }),
    V('V5', 'tr', 'br', 5, 1), W('bl', 'bm'), W('bm', 'br') ],
  nodal: { nv: { tl: 'v_A', tm: { n: 'v_B', dy: -0.5 }, tr: 'v_C' }, series: [['R5a', 'R5b']] },
  mesh: { meshes: [{ n: 'i_1', at: [1.6, 1.6] }, { n: 'i_2', at: [5.2, 1.6] }],
    extras: S => [{ t: t2('เทียบกับคำตอบของ Hayt', 'Compare with Hayt\'s answer'), glow: [], note: t2('Hayt ตอบ +184.2 mA และ −157.9 mA', 'Hayt\'s answers: +184.2 mA and −157.9 mA'),
      tex: S.rows([['i_1', S.val(S.i('i_1').mul(1000), '\\,\\text{mA}')], ['i_2', S.val(S.i('i_2').mul(1000), '\\,\\text{mA}')]]) }] } };

/* ---------- supermesh introduction = Hayt Example 4.11 ---------- */
C.h411 = { speed: 10, ground: 'bm',
  title: { nodal: t2('ตัวอย่างซูเปอร์เมชด้วยโนด', 'Supermesh example by nodal'), mesh: t2('ตัวอย่างซูเปอร์เมช (หน้า 17)', 'Supermesh example (p. 17)') },
  q: { mesh: t2('ตัวอย่างซูเปอร์เมช (สไลด์หน้า 17 · Hayt Example 4.11): หากระแสเมชทั้งสามตัว', 'The supermesh example (slides p. 17 · Hayt Example 4.11): find the three mesh currents.') },
  nodes: { tl: [0, 0], tm: [3.2, 0], tr: [6.4, 0], mm: [3.2, 1.8], mr: [6.4, 1.8], lm: [3.2, 3.6], bl: [0, 5.4], bm: [3.2, 5.4], br: [6.4, 5.4] },
  parts: [ V('V7', 'tl', 'bl', 7, -1), W('tl', 'tm'), W('tm', 'tr'), R('R1a', 'tm', 'mm', 1, -1), I('I7', 'mm', 'lm', 7, -1), R('R2a', 'lm', 'bm', 2, -1), R('R3', 'mm', 'mr', 3, -1),
    R('R2b', 'tr', 'mr', 2, 1), R('R1b', 'mr', 'br', 1, 1), W('bl', 'bm'), W('bm', 'br') ],
  nodal: { nv: { tl: 'v_1', mm: { n: 'v_2', dx: 0.5, dy: -0.4 }, mr: { n: 'v_3', dx: 0.55, dy: -0.4 }, lm: { n: 'v_4', dx: 0.5, dy: 0 } } },
  mesh: { meshes: [{ n: 'i_1', at: [1.3, 2.7], r: 0.52 }, { n: 'i_2', at: [4.8, 0.9] }, { n: 'i_3', at: [4.8, 3.7] }],
    extras: S => [{ t: t2('เทียบกับ Hayt', 'Compare with Hayt'), glow: [], note: t2('Hayt ตอบ i₁ = 9 A, i₂ = 2.5 A, i₃ = 2 A', 'Hayt\'s answers: i₁ = 9 A, i₂ = 2.5 A, i₃ = 2 A'),
      tex: `i_1 - i_3 = ${S.i('i_1').tex()} - ${S.i('i_3').tex()} = ${S.i('i_1').sub(S.i('i_3')).tex()}\\ \\text{A} \\;\\checkmark` }] } };

/* ---------- Ex 9 = Hayt Practice 4.9 ---------- */
C.ex9 = { speed: 30, ground: 'bm',
  title: { nodal: t2('Ex 9 ด้วยโนด', 'Ex 9 by nodal'), mesh: t2('Ex 9 (หน้า 19)', 'Ex 9 (p. 19)') },
  q: { mesh: t2('Ex 9 (หน้า 19 · Hayt Practice 4.9): หากระแส \\(i_1\\) (= กระแสเมช \\(I_x\\) ซึ่งไหลขึ้นผ่านแหล่งจ่าย 10 V)', 'Ex 9 (p. 19 · Hayt Practice 4.9): find the current \\(i_1\\) (= the mesh current \\(I_x\\), flowing up through the 10 V source).') },
  warn: { mesh: t2('ฉบับแจกพิมพ์แหล่งจ่ายเป็น 6 V แต่ Hayt (Practice 4.9 ตอบ −1.93 A) และในห้องใช้ 10 V หน้านี้ใช้ 10 V (ถ้าเป็น 6 V จะได้ i₁ = −2.2 A)', 'The handout prints the source as 6 V, but Hayt (Practice 4.9, answer −1.93 A) and the class use 10 V. This page uses 10 V (with 6 V, i₁ = −2.2 A).') },
  nodes: { tl: [0, 0], tm: [2.6, 0], tr: [5.8, 0], mm: [2.6, 2.2], mr: [5.8, 2.2], bl: [0, 4.4], bm: [2.6, 4.4], br: [5.8, 4.4] },
  parts: [ V('V10', 'tl', 'bl', 10, -1), W('tl', 'tm'), R('R4', 'tm', 'mm', 4, -1), R('R5', 'tm', 'tr', 5, 1), R('R9', 'tr', 'mr', 9, 1), R('R10', 'mm', 'mr', 10, -1),
    I('I3', 'bm', 'mm', 3, -1), R('R1', 'mr', 'br', 1, 1), R('R7', 'bm', 'br', 7, -1), W('bl', 'bm') ],
  nodal: { nv: { tl: 'v_1', tr: { n: 'v_2', dx: 0.5, dy: -0.4 }, mm: { n: 'v_3', dx: 0.5, dy: -0.4 }, mr: { n: 'v_4', dx: 0.55, dy: -0.4 }, br: { n: 'v_5', dx: 0.5, dy: 0.4 } } },
  mesh: { meshes: [{ n: 'I_x', at: [1.3, 2.2] }, { n: 'I_y', at: [4.2, 1.0], r: 0.46 }, { n: 'I_z', at: [4.2, 3.62] }],
    extras: S => [{ t: t2('สิ่งที่โจทย์ถาม', 'What the problem asks'), glow: ['V10'], note: t2('Hayt ตอบ −1.93 A: กระแสจริงไหลลงผ่านแหล่งจ่าย 10 V', 'Hayt\'s answer is −1.93 A: the real current flows down through the 10 V source'),
      tex: `i_1 = I_x = ${S.box(S.i('I_x'), S.UA)}` }] } };

/* ---------- exercise sheet Ex.5 (diamond drawn as a rectangle) ---------- */
C.sx5 = { speed: 26, ground: 'Cn',
  title: { nodal: t2('แบบฝึกหัด Ex.5 ด้วยโนด', 'Exercise Ex.5 by nodal'), mesh: t2('แบบฝึกหัด Ex.5', 'Exercise Ex.5') },
  q: { mesh: t2('แบบฝึกหัด Ex.5: ใช้การวิเคราะห์แบบเมช หา \\(I_1\\), \\(I_2\\), \\(I_3\\) และ \\(V_x\\)', 'Exercise Ex.5: use mesh analysis to find \\(I_1\\), \\(I_2\\), \\(I_3\\) and \\(V_x\\).') },
  warn: { mesh: t2('รูปเพชรของโจทย์ถูกวาดใหม่เป็นรูปสี่เหลี่ยม จุดต่อเหมือนเดิมทุกจุด ขั้วของแหล่งจ่ายตามเฉลย (10 V ขั้ว + อยู่ทางโนดบน, 5 V ขั้ว + อยู่ทางโนดขวา)', 'The diamond of the sheet is redrawn as a rectangle with every connection unchanged. Source polarities follow the solution (10 V with + towards the top node, 5 V with + towards the right node).') },
  nodes: { tl: [0, 0], tm: [3.4, 0], tr: [6.8, 0], L: [0, 2.4], Cn: [3.4, 2.4], Rn: [6.8, 2.4], bl: [0, 4.8], X: [3.4, 4.8], br: [6.8, 4.8] },
  parts: [ V('V10', 'tl', 'L', 10, -1), W('tl', 'tm'), W('tm', 'tr'), I('I4a', 'tm', 'Cn', 4, -1), R('R10', 'tr', 'Rn', 10, 1), R('R5', 'L', 'Cn', 5, -1), V('V5', 'Rn', 'Cn', 5, -1),
    W('L', 'bl'), R('R2', 'bl', 'X', 2, -1), I('I4b', 'X', 'br', 4, -1), W('br', 'Rn') ],
  pol: [{ id: 'R10', plus: 'tr', text: 'Vₓ', side: 'L' }],
  nodal: { nv: { tl: 'v_T', L: { n: 'v_L', dx: -0.55, dy: 0 }, Rn: { n: 'v_R', dx: 0.55, dy: 0 }, X: { n: 'v_X', dy: 0.5 } } },
  mesh: { meshes: [{ n: 'I_1', at: [3.4, 3.7] }, { n: 'I_2', at: [1.7, 1.25], r: 0.5 }, { n: 'I_3', at: [5.3, 1.25], r: 0.48 }],
    extras: S => [{ t: t2('แรงดัน Vₓ คร่อม 10 Ω (+ ด้านบน) I₃ ไหลลงผ่าน 10 Ω', 'Voltage Vₓ across the 10 Ω (+ at the top); I₃ flows down through it'), glow: ['R10'],
      tex: S.rows([['V_x', '10\\,I_3', `10\\left(${S.i('I_3').tex()}\\right)`, S.box(S.i('I_3').mul(10), S.UV)]]) }] } };

/* ---------- exercise sheet Ex.7 ---------- */
C.sx7 = { speed: 20, ground: 'bm',
  title: { nodal: t2('แบบฝึกหัด Ex.7 ด้วยโนด', 'Exercise Ex.7 by nodal'), mesh: t2('แบบฝึกหัด Ex.7', 'Exercise Ex.7') },
  q: { mesh: t2('แบบฝึกหัด Ex.7: ใช้การวิเคราะห์แบบเมช หากระแสเมช \\(i_1\\), \\(i_2\\), \\(i_3\\) และแรงดัน \\(V_x\\)', 'Exercise Ex.7: use mesh analysis to find the mesh currents \\(i_1\\), \\(i_2\\), \\(i_3\\) and the voltage \\(V_x\\).') },
  nodes: { tl: [0, 0], tm: [3.2, 0], tr: [6.4, 0], mm: [3.2, 1.8], mr: [6.4, 1.8], lm: [3.2, 3.4], bl: [0, 5], bm: [3.2, 5], br: [6.4, 5] },
  parts: [ V('V8', 'tl', 'bl', 8, -1), W('tl', 'tm'), W('tm', 'tr'), R('R2a', 'tm', 'mm', 2, 1), I('I4', 'mm', 'lm', 4, -1), R('R1', 'lm', 'bm', 1, -1), R('R4', 'mm', 'mr', 4, -1),
    R('R2b', 'tr', 'mr', 2, 1), R('R8', 'mr', 'br', 8, 1), W('bl', 'bm'), W('bm', 'br') ],
  pol: [{ id: 'R2a', plus: 'tm', text: 'Vₓ', side: 'L' }],
  nodal: { nv: { tl: 'v_1', mm: { n: 'v_2', dx: 0.5, dy: -0.4 }, mr: { n: 'v_3', dx: 0.55, dy: -0.4 }, lm: { n: 'v_4', dx: 0.5, dy: 0 } } },
  mesh: { meshes: [{ n: 'i_1', at: [1.45, 2.5] }, { n: 'i_2', at: [4.8, 3.5] }, { n: 'i_3', at: [5.1, 0.9] }],
    extras: S => [{ t: t2('แรงดัน Vₓ คร่อม 2 Ω ตัวกลาง (+ ด้านบน): กระแสลง = i₁ − i₃', 'Voltage Vₓ across the middle 2 Ω (+ at the top): the downward current is i₁ − i₃'), glow: ['R2a'],
      tex: S.rows([['V_x', '2(i_1 - i_3)', `2\\left(${S.i('i_1').tex()} - ${S.i('i_3').tex()}\\right)`, S.box(S.i('i_1').sub(S.i('i_3')).mul(2), S.UV)]]) }] } };

/* ---------- exercise sheet Ex.3 (conductances in mho) ---------- */
C.sx3 = { speed: 26, ground: 'bB',
  title: { nodal: t2('แบบฝึกหัด Ex.3 ด้วยโนด', 'Exercise Ex.3 by nodal'), mesh: t2('แบบฝึกหัด Ex.3', 'Exercise Ex.3') },
  q: { mesh: t2('แบบฝึกหัด Ex.3: ใช้การวิเคราะห์แบบเมช หากำลังที่อุปกรณ์แต่ละตัวดูดกลืน (ค่าที่ให้เป็นความนำ หน่วย ℧ = S ความต้านทาน R = 1/G)', 'Exercise Ex.3: use mesh analysis to find the power absorbed by each element (the values are conductances in ℧ = S, so R = 1/G).') },
  warn: { mesh: t2('ข้อนี้ไม่มีเฉลยในโฟลเดอร์ หน้านี้คำนวณให้ และตรวจด้วยผลรวมกำลังทั้งวงจร = 0', 'There is no solution for this one in the folder; this page works it out and checks it with the total power = 0.') },
  nodes: { tl: [0, 0], tc: [4.4, 0], A: [0, 2], B: [2.2, 2], Cn: [4.4, 2], bl: [0, 4.6], bB: [2.2, 4.6], bC: [4.4, 4.6] },
  parts: [ W('tl', 'A'), R('G2', 'tl', 'tc', 0.5, 1, { name: '2 ℧' }), W('tc', 'Cn'), R('G1', 'A', 'B', 1, 1, { name: '1 ℧' }), I('I5', 'Cn', 'B', 5, 1), I('I2', 'A', 'bl', 2, -1),
    R('G4m', 'B', 'bB', 0.25, -1, { name: '4 ℧' }), R('G4r', 'Cn', 'bC', 0.25, 1, { name: '4 ℧' }), W('bl', 'bB'), W('bB', 'bC') ],
  nodal: { nv: { A: { n: 'v_A', dx: -0.55, dy: -0.3 }, B: { n: 'v_B', dx: 0.5, dy: 0.5 }, Cn: { n: 'v_C', dx: 0.6, dy: -0.4 } } },
  mesh: { meshes: [{ n: 'i_1', at: [1.1, 3.9] }, { n: 'i_2', at: [2.2, 1.0] }, { n: 'i_3', at: [3.3, 3.9] }],
    extras: S => { const i1 = S.i('i_1'), i2 = S.i('i_2'), i3 = S.i('i_3'); const F = S.F; const W_ = '\\,\\text{W}';
      const pG2 = i2.mul(i2).div(2), pG1 = i2.sub(i1).mul(i2.sub(i1)), pG4m = i1.sub(i3).mul(i1.sub(i3)).div(4), pG4r = i3.mul(i3).div(4);
      const vA = i1.sub(i2).add(i1.sub(i3).div(4)), p2 = vA.mul(2);           // 2 A source: + at the top, 2 A enters at the top
      const vB = i1.sub(i3).div(4), vC = i3.div(4); const p5 = vC.sub(vB).mul(5);    // 5 A source: enters at C, leaves at B
      const tot = pG2.add(pG1).add(pG4m).add(pG4r).add(p2).add(p5);
      return [{ t: t2('กำลังของตัวต้านทาน: P = i²R = i²/G (กระแสในกิ่ง = ผลต่างของกระแสเมช)', 'Resistor powers: P = i²R = i²/G (branch current = difference of mesh currents)'), glow: ['G2', 'G1', 'G4m', 'G4r'],
        tex: S.rows([['P_{2\\mho}', '\\frac{(i_2)^2}{2}', `\\frac{(${i2.tex()})^2}{2}`, S.val(pG2, W_)], ['P_{1\\mho}', '\\frac{(i_2 - i_1)^2}{1}', `(${i2.sub(i1).tex()})^2`, S.val(pG1, W_)],
          ['P_{4\\mho,\\,\\text{mid}}', '\\frac{(i_1 - i_3)^2}{4}', `\\frac{(${i1.sub(i3).tex()})^2}{4}`, S.val(pG4m, W_)], ['P_{4\\mho,\\,\\text{right}}', '\\frac{(i_3)^2}{4}', `\\frac{(${i3.tex()})^2}{4}`, S.val(pG4r, W_)]]) },
      { t: t2('กำลังของแหล่งจ่ายกระแส: หาแรงดันคร่อมด้วย KVL แล้ว P_abs = V × (กระแสที่เข้าขั้ว +)', 'Current-source powers: get the voltage by KVL, then P_abs = V × (current entering the + terminal)'), glow: ['I2', 'I5'],
        tex: S.rows([['V_{2A}', '(i_1 - i_2) + \\frac{i_1 - i_3}{4}', S.val(vA, S.UV)], ['P_{2A}', 'V_{2A}(2)', S.box(p2, W_)],
          ['V_{5A}', 'V_C - V_B', '\\frac{i_3}{4} - \\frac{i_1 - i_3}{4}', S.val(vC.sub(vB), S.UV)], ['P_{5A}', 'V_{5A}(5)', S.box(p5, W_)]]) },
      { t: t2('ตรวจ: ผลรวมกำลังทั้งวงจรต้องเป็นศูนย์', 'Check: the powers of the whole circuit must add to zero'), glow: [],
        tex: S.rows([['\\sum P', [pG2, pG1, pG4m, pG4r, p2, p5].map(q => q.tex()).join(' + ').replace(/\+ -/g, '- '), `${tot.tex()} \\;\\checkmark`]]) }]; } } };

global.CH4C = C;
})(window);
