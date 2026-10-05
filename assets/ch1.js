/* ch1.js — chapter 1 building blocks for the problem-by-problem pages (needs circuit.js, alg.js, lesson.js):
   1) CH1.Mesh: the two- and three-window resistor circuits of pages 1.1–1.2; the current flows only once the equations are solved
   2) step lists for the stepper (LS.stepper): 2×2 elimination and substitution, 2×2 Cramer, and 3×3 Cramer in the order of the
      slides, with the six Sarrus diagonals lit one at a time
   3) CH1.Plane: a small complex plane (draggable points, scenes that redraw per step, short animations)
   4) CH1.AC: an AC source driving R, L, C, R+L or R+C, with phasors that spin and an oscilloscope trace */
(function (global) {
'use strict';
const CH1 = {};
const tx = (s, d) => MC.tex(s, d), t = (a, b) => MC.t(a, b);
const tn = x => ALG.fmtN(x).replace(/−/g, '-');            // TeX number (ASCII minus)
const fmtI = v => (v < 0 ? '−' : '') + CK.eng(Math.abs(v), 'A');

/* ---------------- 1) the mesh circuits ---------------- */
CH1.spec2 = S => ({ ground: 'g', nodes: { a: [0, 0], b: [4.6, 0], c: [9.2, 0], g: [0, 3.2], e: [4.6, 3.2], f: [9.2, 3.2] },
  parts: [{ id: 'V1', name: 'V₁', type: 'V', a: 'a', b: 'g', value: S.V1, side: -1 }, { id: 'R1', name: 'R₁', type: 'R', a: 'a', b: 'b', value: S.R1 },
    { id: 'R2', name: 'R₂', type: 'R', a: 'b', b: 'c', value: S.R2 }, { id: 'R3', name: 'R₃', type: 'R', a: 'b', b: 'e', value: S.R3, side: -1, iAt: 0.9 },
    { id: 'V2', name: 'V₂', type: 'V', a: 'c', b: 'f', value: S.V2, side: 1 }, { type: 'W', a: 'g', b: 'e' }, { type: 'W', a: 'e', b: 'f' }] });
CH1.spec3 = S => ({ ground: 'g', nodes: { a: [0, 0], b: [3.8, 0], c: [7.6, 0], d: [11.4, 0], g: [0, 3.2], e: [3.8, 3.2], f: [7.6, 3.2], h: [11.4, 3.2] },
  parts: [{ id: 'V1', name: 'V₁', type: 'V', a: 'a', b: 'g', value: S.V1, side: -1 }, { id: 'R1', name: 'R₁', type: 'R', a: 'a', b: 'b', value: S.R1 },
    { id: 'R2', name: 'R₂', type: 'R', a: 'b', b: 'c', value: S.R2 }, { id: 'R3', name: 'R₃', type: 'R', a: 'c', b: 'd', value: S.R3 },
    { id: 'R4', name: 'R₄', type: 'R', a: 'b', b: 'e', value: S.R4, side: -1, iAt: 0.9 }, { id: 'R5', name: 'R₅', type: 'R', a: 'c', b: 'f', value: S.R5, side: -1, iAt: 0.9 },
    { id: 'V2', name: 'V₂', type: 'V', a: 'd', b: 'h', value: S.V2, side: 1 }, { type: 'W', a: 'g', b: 'e' }, { type: 'W', a: 'e', b: 'f' }, { type: 'W', a: 'f', b: 'h' }] });
/* the mesh (KVL) equations as numbers: A·I = B */
CH1.sys2 = S => ({ A: [[S.R1 + S.R3, -S.R3], [-S.R3, S.R2 + S.R3]], B: [S.V1, -S.V2] });
CH1.sys3 = S => ({ A: [[S.R1 + S.R4, -S.R4, 0], [-S.R4, S.R2 + S.R4 + S.R5, -S.R5], [0, -S.R5, S.R3 + S.R5]], B: [S.V1, 0, -S.V2] });

CH1.Mesh = class {
  /* o: { n: 2 | 3, values, wait / ok: badge text } */
  constructor(canvas, o = {}) {
    this.canvas = canvas; this.o = o; this.n = o.n || 2;
    this.S = Object.assign(this.n === 2 ? { V1: 12, V2: 10, R1: 3, R2: 4, R3: 2 } : { V1: 10, V2: 15, R1: 1, R2: 3, R3: 6, R4: 2, R5: 1 }, o.values || {});
    this.solved = false; this.fade = 0; this.spin = [0, 0, 0];
    this.ckt = new CK.Circuit(this.n === 2 ? CH1.spec2(this.S) : CH1.spec3(this.S)); this.ckt.solve();
    this.view = new CK.View(canvas, this.ckt, { speed: this.n === 2 ? 26 : 22, ground: false, showI: false, dots: true, fade: 0, pad: 1.3, tips: false });
    this.resize(); window.addEventListener('resize', () => this.resize());
    LS.anim(canvas, dt => this.frame(dt));
  }
  set(vals) { Object.assign(this.S, vals); Object.keys(vals).forEach(k => this.ckt.set(k, 'value', this.S[k])); this.ckt.solve(); }
  setSolved(v) { if (v && !this.solved) this.fade = 0.001; this.solved = v; if (!v) this.fade = 0; }
  I(k) { return this.ckt.I(['R1', 'R2', 'R3'][k]).re; }
  resize() { const w = this.canvas.parentElement.clientWidth - 12; const r = CK.fit(this.canvas, w < 480 ? 0.62 : this.n === 2 ? 0.5 : 0.44, 280);
    this.view.o.pad = w < 480 ? (this.n === 2 ? 1.75 : 1.6) : 1.3; this.view.ctx = r.ctx; this.W = r.w; this.H = r.h; this.view.fit({ x: 0, y: 32, w: r.w, h: r.h - 34 }); }
  frame(dt) {
    const v = this.view, ctx = v.ctx; ctx.fillStyle = CK.PAL.bg; ctx.fillRect(0, 0, this.W, this.H);
    if (this.solved && this.fade < 1) this.fade = Math.min(1, this.fade + dt * 1.6); v.o.fade = this.fade; v.o.tips = this.solved;
    if (this.solved) v.advance(dt);
    const cxs = this.n === 2 ? [2.1, 7.1] : [1.8, 5.7, 9.5], rg = this.n === 2 ? 0.66 : 0.55;
    cxs.forEach((x, k) => { const I = this.I(k); if (this.solved) this.spin[k] += dt * 0.9 * I;
      v.meshLoop(x, 1.6, rg, { label: ['I₁', 'I₂', 'I₃'][k], value: this.solved ? '= ' + fmtI(I) : '= ?', color: '#c792ea', spin: this.solved ? this.spin[k] : null,
        dash: this.solved ? null : [5, 4], valueColor: this.solved && I < 0 ? '#ff7eb6' : '#c792ea' }); });
    v.draw();
    CK.badge(ctx, this.solved ? (this.o.ok || t('✓ แก้สมการแล้ว: กระแสไหล', '✓ Solved: current flowing')) : (this.o.wait || t('? ยังไม่รู้กระแส: เปิดเฉลยให้ครบทุกขั้น', '? Currents unknown: open every step')), this.solved ? 'ok' : 'wait');
  }
  /* readout rows (kv html) */
  readout() {
    const ui = MC.ui; if (!this.solved) return ui.kv((this.n === 2 ? ['I₁', 'I₂'] : ['I₁', 'I₂', 'I₃']).map(k => [k, '?']));
    const c = this.ckt, ids = this.n === 2 ? ['R1', 'R2', 'R3'] : ['R1', 'R2', 'R3', 'R4', 'R5'];
    const PV = -c.P('V1') - c.P('V2'), PR = ids.reduce((s, id) => s + c.P(id), 0);
    const rows = this.n === 2 ? [['I₁', fmtI(this.I(0))], ['I₂', fmtI(this.I(1))], ['I_R₃ = I₁ − I₂', fmtI(c.I('R3').re)]]
      : [['I₁', fmtI(this.I(0))], ['I₂', fmtI(this.I(1))], ['I₃', fmtI(this.I(2))], ['I_R₄ = I₁ − I₂', fmtI(c.I('R4').re)], ['I_R₅ = I₂ − I₃', fmtI(c.I('R5').re)]];
    rows.push([t('แหล่งจ่ายให้ / ตัวต้านทานใช้', 'sources give / resistors use'), `${CK.eng(PV, 'W')} / ${CK.eng(PR, 'W')} ${Math.abs(PV - PR) < 1e-6 ? '✓' : '✗'}`]);
    return ui.kv(rows);
  }
};

/* ---------------- 2a) 2×2 elimination / substitution steps ---------------- */
const mtag = (m, l) => m === 1 ? l : m === -1 ? '−' + l : `${m < 0 ? '−' : ''}${Math.abs(m)}×${l}`;
function lin2Step(st, E, V, U, o) {
  const al = rows => `\\begin{aligned} ${rows.join(' \\\\ ')} \\end{aligned}`;
  const eqA = e => ALG.texEq(e, V).replace(' = ', ' &= ');
  switch (st.kind) {
    case 'combine': { const v = V[st.elim];
      return { why: t(`<b>กำจัด \\(${v}\\)</b>: คูณแล้วรวมสองสมการ ให้พจน์ของ \\(${v}\\) หักล้างกันพอดี &nbsp;${tx(st.op)}`, `<b>Eliminate \\(${v}\\)</b>: scale and add the two equations so the \\(${v}\\) terms cancel exactly &nbsp;${tx(st.op)}`),
        tex: ALG.texStack([{ e: ALG.scale(st.a, st.m1), tag: mtag(st.m1, '(1)') }, { e: ALG.scale(st.b, st.m2), tag: mtag(st.m2, '(2)') }, { e: st.res, tag: '(3)' }], V, { cancel: st.elim }) }; }
    case 'solve': { const c = st.e.c[st.v];
      return { why: t('<b>เหลือตัวแปรเดียว</b>: หารทั้งสองข้างด้วยสัมประสิทธิ์', '<b>One unknown left</b>: divide both sides by its coefficient'),
        tex: al([eqA(st.e), c.eq(1) ? `${V[st.v]} &= ${ALG.texBoxed(st.val, U)}` : `${V[st.v]} &= \\frac{${st.e.r.tex()}}{${c.tex()}} = ${ALG.texBoxed(st.val, U)}`]) }; }
    case 'back': return { why: t(`<b>แทนค่ากลับ</b>ลงในสมการ ${st.e.label} เพื่อหาอีกตัว`, `<b>Substitute back</b> into equation ${st.e.label} to find the other one`), tex: st.chain(U) };
    case 'isolate': { const c = st.A.c[st.v]; const cT = c.eq(1) ? '' : c.eq(-1) ? '-' : c.tex();
      return { why: t(`จากสมการ ${st.from} <b>ย้ายข้างให้ \\(${V[st.v]}\\) อยู่ตัวเดียว</b>`, `From equation ${st.from}, <b>make \\(${V[st.v]}\\) the subject</b>`),
        tex: al([eqA(st.A), `${cT}${V[st.v]} &= ${st.moved}`, `${V[st.v]} &= ${st.expr}`]) }; }
    case 'plug': { const B = st.B; let lhs = '', first = true;
      B.c.forEach((q, i) => { if (q.isZero) return; const mag = q.abs(); const coef = mag.eq(1) ? '' : mag.tex();
        const body = i === st.v ? `${coef}\\left(${st.expr}\\right)` : `${coef}${V[i]}`;
        lhs += first ? (q.sign < 0 ? '-' : '') + body : (q.sign < 0 ? ' - ' : ' + ') + body; first = false; });
      const coT = st.co.eq(1) ? '' : st.co.tex();
      return { why: t(`<b>แทน \\(${V[st.v]}\\) ลงในสมการ ${st.into}</b> แล้วจัดรูป จะเหลือ \\(${V[st.o]}\\) ตัวเดียว`, `<b>Put \\(${V[st.v]}\\) into equation ${st.into}</b> and tidy up: only \\(${V[st.o]}\\) is left`),
        tex: al([`${lhs} &= ${B.r.tex()}`, `${st.expandedTex} &= ${B.r.tex()}`, `${coT}${V[st.o]} &= ${ALG.texMinus(B.r, st.kconst)} = ${st.rr.tex()}`]) }; }
    case 'solveSub': return { why: t('<b>หารทั้งสองข้าง</b>ด้วยสัมประสิทธิ์', '<b>Divide both sides</b> by the coefficient'),
        tex: al([`${V[st.o]} &= \\frac{${st.rr.tex()}}{${st.co.tex()}} = ${ALG.texBoxed(st.val, U)}`]) };
    case 'backSub': return { why: t(`<b>นำ \\(${V[st.o]}\\) ไปแทน</b>ในนิพจน์ของ \\(${V[st.v]}\\) จากขั้นที่ 1`, `<b>Put \\(${V[st.o]}\\) into</b> the expression for \\(${V[st.v]}\\) from step 1`),
        tex: al([`${V[st.v]} &= ${st.expr.replace(V[st.o], `(${st.valO.tex()})`)}`, `&= ${ALG.texBoxed(st.val, U)}`]) };
    case 'check': { const s = st.sol;
      const row = (e, lab) => { const used = e.c.map((q, i) => ({ q, i })).filter(x => !x.q.isZero);
        const subst = used.map((x, k) => `${k ? (x.q.sign < 0 ? ' - ' : ' + ') : (x.q.sign < 0 ? '-' : '')}${x.q.abs().eq(1) ? '' : x.q.abs().tex()}(${s[x.i].tex()})`).join('');
        const prods = ALG.texTerms(used.map(x => [x.q.mul(s[x.i]), '']));
        return `\\text{${lab}}\\quad ${subst} &= ${prods} = ${e.c[0].mul(s[0]).add(e.c[1].mul(s[1])).tex()} \\;\\checkmark`; };
      return { why: o.flow ? t('<b>ตรวจคำตอบ</b>: แทนทั้งสองค่ากลับลงในสมการทั้งสอง ต้องเป็นจริงทั้งคู่ แล้ว… <b>กระแสเริ่มไหลในวงจร</b>', '<b>Check</b>: put both values back into both equations; both must hold, and then… <b>the current starts to flow</b>')
          : t('<b>ตรวจคำตอบ</b>: แทนทั้งสองค่ากลับลงในสมการทั้งสอง ต้องเป็นจริงทั้งคู่', '<b>Check</b>: put both values back into both equations; both must hold'),
        tex: al([row(E[0], '(1)'), row(E[1], '(2)')]) }; }
    case 'singular': return { body: `<div class="badbox">${t('สองสมการนี้ไม่เป็นอิสระต่อกัน (ดีเทอร์มิแนนต์เป็นศูนย์) จึงไม่มีคำตอบเดียว', 'These equations are not independent (zero determinant), so there is no unique answer')}</div>` };
  }
  return { body: '' };
}
/* E1, E2 from ALG.eq; method 'elim' | 'subst'; o: {unit (TeX), flow (check step mentions the current)} */
CH1.lin2Steps = (E1, E2, V, method, o = {}) => {
  const r = method === 'subst' ? ALG.subst2(E1, E2, V) : ALG.elim2(E1, E2, V); const U = o.unit ?? '\\,\\text{A}';
  const steps = r.steps.map(st => lin2Step(st, [E1, E2], V, U, o)); if (r.ok) steps.push(lin2Step({ kind: 'check', sol: r.sol }, [E1, E2], V, U, o));
  return { steps, sol: r.sol, ok: r.ok };
};

/* ---------------- 2b) Cramer's rule ---------------- */
const GREEN = '#2f9e44';
const g = x => `\\textcolor{${GREEN}}{${x}}`;
/* 2×2: A [[a,b],[c,d]], B [b1,b2], V names; o.unit */
CH1.cramer2Steps = (A, B, V, o = {}) => {
  const U = o.unit ?? ''; const [[a, b], [c, d]] = A; const D = a * d - b * c, D1 = B[0] * d - b * B[1], D2 = a * B[1] - B[0] * c;
  const bm = M => `\\begin{bmatrix} ${M.map(r => r.join(' & ')).join(' \\\\ ')} \\end{bmatrix}`, vm = M => `\\begin{vmatrix} ${M.map(r => r.join(' & ')).join(' \\\\ ')} \\end{vmatrix}`;
  const p = x => `(${tn(x)})`, q = (n, dd) => { const f = new ALG.Frac(Math.round(n), Math.round(dd)); return f.isInt ? String(f.n) : `${f.tex()} \\approx ${ALG.fmtDec(+f, 4)}`; };
  const steps = [
    { why: t('<b>เขียนระบบสมการในรูปเมทริกซ์</b> \\(A\\mathbf{x} = B\\): สัมประสิทธิ์อยู่ใน \\(A\\) ค่าทางขวาของเครื่องหมายเท่ากับอยู่ใน \\(B\\)', '<b>Write the system as a matrix equation</b> \\(A\\mathbf{x} = B\\): the coefficients go in \\(A\\), the right-hand sides in \\(B\\)'),
      tex: `${bm(A.map(r => r.map(tn)))}${bm(V.map(v => [v]))} = ${bm(B.map(x => [tn(x)]))}` },
    { why: t('<b>ดีเทอร์มิแนนต์หลัก</b> \\(\\Delta\\): ผลคูณเส้นทแยงลง ลบ ผลคูณเส้นทแยงขึ้น', '<b>Main determinant</b> \\(\\Delta\\): the down-diagonal product minus the up-diagonal product'),
      tex: `\\Delta = ${vm(A.map(r => r.map(tn)))} = ${p(a)}${p(d)} - ${p(b)}${p(c)} = ${tn(D)}` }];
  if (Math.abs(D) < 1e-12) { steps.push({ body: `<div class="badbox">${t('<b>Δ = 0</b> หารด้วยศูนย์ไม่ได้ กฎของคราเมอร์ใช้ไม่ได้', '<b>Δ = 0</b>: you cannot divide by zero, so Cramer\'s rule cannot be used')}</div>` }); return { steps, D }; }
  steps.push({ why: t(`<b>\\(\\Delta_1\\)</b>: นำ \\(B\\) ไปแทน<b>คอลัมน์ที่ 1</b> (สีเขียว) แล้วหาดีเทอร์มิแนนต์`, `<b>\\(\\Delta_1\\)</b>: put \\(B\\) in place of <b>column 1</b> (green), then take the determinant`),
      tex: `\\Delta_1 = ${vm([[g(tn(B[0])), tn(b)], [g(tn(B[1])), tn(d)]])} = ${p(B[0])}${p(d)} - ${p(b)}${p(B[1])} = ${tn(D1)}` },
    { why: t(`<b>\\(\\Delta_2\\)</b>: นำ \\(B\\) ไปแทน<b>คอลัมน์ที่ 2</b>`, `<b>\\(\\Delta_2\\)</b>: put \\(B\\) in place of <b>column 2</b>`),
      tex: `\\Delta_2 = ${vm([[tn(a), g(tn(B[0]))], [tn(c), g(tn(B[1]))]])} = ${p(a)}${p(B[1])} - ${p(B[0])}${p(c)} = ${tn(D2)}` },
    { why: t('<b>หาร</b>แต่ละ \\(\\Delta_i\\) ด้วย \\(\\Delta\\)', '<b>Divide</b> each \\(\\Delta_i\\) by \\(\\Delta\\)'),
      tex: `\\begin{aligned} ${V[0]} &= \\frac{\\Delta_1}{\\Delta} = \\frac{${tn(D1)}}{${tn(D)}} = \\boxed{${q(D1, D)}${U}} \\\\ ${V[1]} &= \\frac{\\Delta_2}{\\Delta} = \\frac{${tn(D2)}}{${tn(D)}} = \\boxed{${q(D2, D)}${U}} \\end{aligned}` });
  return { steps, D, D1, D2, x: [D1 / D, D2 / D] };
};

/* 3×3 pieces: a matrix as an HTML grid (column hl highlighted), and the Sarrus picture */
CH1.matHTML = (M, o = {}) => { const m = M[0].length; let h = `<div class="mat" style="grid-template-columns:repeat(${m},auto)">`;
  M.forEach(r => r.forEach((x, c) => { h += `<span class="${o.hl === c ? 'hlb' + (o.fly ? ' fly' : '') : ''}">${typeof x === 'string' ? x : ALG.fmtN(x)}</span>`; })); return h + '</div>'; };
CH1.sarrusSVG = (M, hlCol, active) => {
  const cw = 64, rh = 34, x0 = 18, y0 = 22, w = x0 * 2 + cw * 5, h = y0 + rh * 3 + 6;
  const css = getComputedStyle(document.documentElement), ink = css.getPropertyValue('--ink').trim() || '#222', muted = css.getPropertyValue('--muted').trim() || '#666', good = '#2f9e44', bad = '#e03131';
  const T = ALG.sarrus(M).terms; let s = `<svg class="sarrus" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Sarrus">`;
  const cell = (r, c) => [x0 + cw * c + cw / 2, y0 + rh * r + rh / 2];
  T.forEach((tm, k) => { const up = tm.s < 0, c0 = up ? k - 3 : k; const pts = up ? [[2, c0], [1, c0 + 1], [0, c0 + 2]] : [[0, c0], [1, c0 + 1], [2, c0 + 2]];
    const on = active === k, done = active > k || active >= 6; const [ax, ay] = cell(...pts[0]), [bx, by] = cell(...pts[2]);
    s += `<line x1="${ax}" y1="${ay}" x2="${bx}" y2="${by}" stroke="${up ? bad : good}" stroke-width="${on ? 16 : 10}" stroke-linecap="round" opacity="${on ? 0.95 : done ? 0.28 : 0.1}"/>`; });
  const act = active >= 0 && active < 6 ? T[active] : null; const actCells = act ? (act.s > 0 ? [[0, active], [1, active + 1], [2, active + 2]] : [[2, active - 3], [1, active - 2], [0, active - 1]]) : [];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 5; c++) { const [x, y] = cell(r, c), src = c % 3, copied = c >= 3, isAct = actCells.some(([rr, cc]) => rr === r && cc === c);
    s += `<text x="${x}" y="${y + 5}" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="${isAct ? 17 : 15}" font-weight="${isAct ? 700 : 500}" fill="${copied ? muted : (hlCol === src ? good : ink)}" opacity="${copied ? 0.75 : 1}">${ALG.fmtN(M[r][src])}</text>`; }
  const bx0 = x0 + 4, bx1 = x0 + cw * 3 - 4, by0 = y0 - 2, by1 = y0 + rh * 3 + 2;
  s += `<path d="M${bx0},${by0} L${bx0},${by1} M${bx1},${by0} L${bx1},${by1}" fill="none" stroke="${ink}" stroke-width="2"/>`;
  s += `<rect x="${x0 + cw * 3 + 4}" y="${by0}" width="${cw * 2 - 8}" height="${by1 - by0}" fill="none" stroke="${muted}" stroke-dasharray="4 4" rx="6"/>`;
  s += `<text x="${x0 + cw * 4}" y="14" text-anchor="middle" font-size="12.5" fill="${muted}" font-family="IBM Plex Sans Thai, sans-serif">${t('คัดลอกสองคอลัมน์แรก', 'copy of columns 1–2')}</text>`;
  return s + '</svg>';
};
CH1.termsHTML = (M, active) => {
  const { terms, det } = ALG.sarrus(M); const p = x => `(${ALG.fmtN(x)})`;
  const items = terms.map((tm, k) => `<span class="t ${tm.s > 0 ? 'p' : 'm'} ${active === k ? 'on' : ''}" style="${active >= 0 && active < k ? 'opacity:.25' : ''}">${tm.s > 0 ? '+' : '−'}${tm.f.map(p).join('')}</span>`).join(' ');
  const vals = terms.map(tm => tm.v); const sum = active >= 6 || active < 0 ? ` = ${vals.map((v, k) => (k ? (v < 0 ? ' − ' : ' + ') : (v < 0 ? '−' : '')) + ALG.fmtN(Math.abs(v))).join('')} = <b>${ALG.fmtN(det)}</b>` : '';
  return `<div class="terms">${items}${sum}</div>`;
};
/* light the six diagonals one by one inside the step element li */
function playSarrus(li, M, col) {
  (li._timers || []).forEach(clearTimeout); li._timers = [];
  const s = li.querySelector('.sar'), tt = li.querySelector('.ter'); if (!s || !tt) return;
  s.innerHTML = CH1.sarrusSVG(M, col, -1); tt.innerHTML = CH1.termsHTML(M, -1);
  for (let a = 0; a <= 6; a++) li._timers.push(setTimeout(() => { s.innerHTML = CH1.sarrusSVG(M, col, a); tt.innerHTML = CH1.termsHTML(M, a); }, 350 + a * 650));
}
/* 3×3 in the order of the slides: Step 1 A and B, Step 2 A1–A3, Step 3 the four determinants, Step 4 divide, then check.
   o: { unit (TeX), tags (show "slide Step n"), notes: {D, D1, D2, D3: html under that step}, flow (check step mentions the current) } */
CH1.cramer3Steps = (A, B, V, o = {}) => {
  const U = o.unit ?? ''; const D = ALG.det3(A); const Ai = [0, 1, 2].map(i => ALG.replaceCol(A, B, i)), Ds = Ai.map(M => ALG.det3(M));
  const tag = n => o.tags ? ` <span class="pill purple">${t('สไลด์ Step', 'slide Step')} ${n}</span>` : '';
  const vcol = `<div class="mat" style="grid-template-columns:auto">${V.map(v => `<span>${tx(v)}</span>`).join('')}</div>`;
  const lab = s => `<div class="matlabel">${s}</div>`;
  const steps = [{ why: t(`<b>เขียน \\(A\\) และ \\(B\\)</b>: สัมประสิทธิ์ของตัวแปรเรียงเป็นแถวใน \\(A\\) ค่าทางขวาเรียงเป็น \\(B\\) (ช่องว่างคือสัมประสิทธิ์ 0)${tag(1)}`, `<b>Write \\(A\\) and \\(B\\)</b>: each equation's coefficients form a row of \\(A\\), the right-hand sides form \\(B\\) (a missing term has coefficient 0)${tag(1)}`),
    body: `<div class="matrow"><div>${lab('A')}${CH1.matHTML(A)}</div><span class="op">·</span><div>${lab('x')}${vcol}</div><span class="op">=</span><div>${lab('B')}${CH1.matHTML(B.map(x => [x]))}</div></div>` }];
  const detStep = (M, i, d) => ({ why: (i < 0 ? t(`<b>หา \\(\\Delta = \\det A\\)</b> ด้วยวิธีซาร์รัส: คัดลอกสองคอลัมน์แรกไปต่อท้าย เส้นทแยงลง (เขียว) เป็นบวก เส้นทแยงขึ้น (แดง) เป็นลบ${tag(3)}`, `<b>Find \\(\\Delta = \\det A\\)</b> by Sarrus' rule: copy the first two columns to the right; down diagonals (green) are plus, up diagonals (red) are minus${tag(3)}`)
      : t(`<b>หา \\(\\Delta_${i + 1} = \\det A_${i + 1}\\)</b> แบบเดียวกัน (คอลัมน์ที่ ${i + 1} คือ \\(B\\))${tag(3)}`, `<b>Find \\(\\Delta_${i + 1} = \\det A_${i + 1}\\)</b> the same way (column ${i + 1} is \\(B\\))${tag(3)}`)),
    body: `<div class="matrow"><div>${lab(i < 0 ? 'A' : 'A' + '₁₂₃'[i])}${CH1.matHTML(M, { hl: i >= 0 ? i : null })}</div><div style="flex:1;min-width:250px"><div class="sar">${CH1.sarrusSVG(M, i, 6)}</div><div class="ter">${CH1.termsHTML(M, 6)}</div>
      <button type="button" class="btn" data-replay style="font-size:13.5px;padding:3px 9px">${t('⟲ เล่นเส้นทแยงซ้ำ', '⟲ Replay the diagonals')}</button></div></div>` +
      tx(`${i < 0 ? '\\Delta' : `\\Delta_${i + 1}`} = \\boxed{${tn(d)}}`, true) + ((o.notes || {})[i < 0 ? 'D' : 'D' + (i + 1)] || ''),
    onShow: (li, anim) => { if (anim) playSarrus(li, M, i); const b = li.querySelector('[data-replay]'); if (b) b.addEventListener('click', () => playSarrus(li, M, i)); } });
  if (Math.abs(D) < 1e-12) { steps.push(detStep(A, -1, D)); steps.push({ body: `<div class="badbox">${t('<b>Δ = 0</b> หารด้วยศูนย์ไม่ได้ กฎของคราเมอร์ใช้ไม่ได้ ระบบนี้ไม่มีคำตอบเดียว (ไม่มีคำตอบเลยหรือมีไม่จำกัด) เพราะมีสมการหนึ่งที่สร้างได้จากสมการอื่น', '<b>Δ = 0</b>: you cannot divide by zero, so Cramer\'s rule fails. The system has no unique answer (none, or infinitely many), because one equation can be built from the others.')}</div>` }); return { steps, D, ok: false }; }
  steps.push({ why: t(`<b>สร้าง \\(A_1, A_2, A_3\\)</b>: นำ \\(B\\) ไปแทนคอลัมน์ที่ 1, 2 และ 3 ของ \\(A\\) ทีละคอลัมน์ (สีเขียว)${tag(2)}`, `<b>Build \\(A_1, A_2, A_3\\)</b>: put \\(B\\) in place of column 1, 2 and 3 of \\(A\\), one at a time (green)${tag(2)}`),
    body: `<div class="matrow">${Ai.map((M, i) => `<div>${lab('A' + '₁₂₃'[i])}${CH1.matHTML(M, { hl: i, fly: true })}</div>`).join('')}</div>` });
  steps.push(detStep(A, -1, D)); Ai.forEach((M, i) => steps.push(detStep(M, i, Ds[i])));
  const q = (n, d) => { const isI = x => Math.abs(x - Math.round(x)) < 1e-9; if (isI(n) && isI(d)) { const f = new ALG.Frac(Math.round(n), Math.round(d)); return f.isInt ? String(f.n) : ALG.fmtDec(+f, 4); } return ALG.fmtDec(n / d, 4); };
  const xs = Ds.map(d => d / D);
  steps.push({ why: t(`<b>หาร</b>แต่ละ \\(\\Delta_i\\) ด้วย \\(\\Delta\\)${tag(4)}`, `<b>Divide</b> each \\(\\Delta_i\\) by \\(\\Delta\\)${tag(4)}`),
    tex: `\\begin{aligned} ${[0, 1, 2].map(i => `${V[i]} &= \\frac{\\Delta_${i + 1}}{\\Delta} = \\frac{${tn(Ds[i])}}{${tn(D)}} = \\boxed{${q(Ds[i], D)}${U}}`).join(' \\\\ ')} \\end{aligned}` });
  const rows = A.map((r, i) => { const lhs = r.reduce((s, a, j) => s + a * xs[j], 0);
    return `${r.map((a, j) => `${j ? (a < 0 ? '-' : '+') : (a < 0 ? '-' : '')}${ALG.fmtN(Math.abs(a))}(${ALG.fmtDec(xs[j], 4)})`).join('')} &= ${ALG.fmtDec(lhs, 4)} \\;${Math.abs(lhs - B[i]) < 1e-6 ? '\\checkmark' : '\\times'}`; });
  steps.push({ why: o.flow ? t('<b>ตรวจคำตอบ</b>: แทนกลับในทั้งสามสมการ ถูกครบ… <b>กระแสเริ่มไหลในวงจร</b>', '<b>Check</b>: substitute into all three equations; all hold… <b>and the current starts to flow</b>') : t('<b>ตรวจคำตอบ</b>: แทนกลับในทั้งสามสมการ ทางซ้ายต้องได้ค่าทางขวาทุกสมการ', '<b>Check</b>: substitute into all three equations; each left side must equal its right side'),
    tex: `\\begin{aligned} ${rows.join(' \\\\ ')} \\end{aligned}` });
  return { steps, D, Ds, x: xs, ok: true };
};

/* ---------------- 3) the complex plane ---------------- */
const PC = { grid: '#1e2440', axis: '#6b7399', ink: '#e8ecf7', muted: '#9aa3c7', z1: '#ffd166', z2: '#5ad1ff', res: '#ff7eb6', good: '#7ee787', bad: '#ff6b6b', purple: '#c792ea' };
CH1.PC = PC;
CH1.Plane = class {
  /* o: { R: axis range, aspect, minW, scene(p, e) (e = eased progress 0..1 of the current animation),
          drag: { pts: () => ({id: z}), move(id, z), snap (grid step) } } */
  constructor(canvas, o = {}) {
    this.canvas = canvas; this.o = o; this.R = o.R || 5; this.e = 1; this.dur = 1; this.dirty = true;
    this.resize(); window.addEventListener('resize', () => { this.resize(); this.dirty = true; });
    if (o.drag) MC.drag(canvas, {
      hit: p => { const pts = o.drag.pts(); let best = null, bd = 18; Object.entries(pts).forEach(([id, z]) => { const [x, y] = this.P(z), d = Math.hypot(p.x - x, p.y - y); if (d < bd) { bd = d; best = id; } }); return best; },
      move: (id, p) => { let z = this.fromP(p.x, p.y); const q = o.drag.snap ?? (this.R <= 3 ? 0.1 : this.R <= 12 ? 0.5 : 1); if (q) z = ALG.cx(Math.round(z.re / q) * q, Math.round(z.im / q) * q);
        o.drag.move(id, z); this.dirty = true; },
      up: id => { if (o.drag.up) o.drag.up(id); this.dirty = true; } });
    LS.anim(canvas, dt => this.frame(dt)); if (document.fonts) document.fonts.ready.then(() => { this.dirty = true; });
  }
  resize() { const w = this.canvas.parentElement.clientWidth - 12; const r = CK.fit(this.canvas, this.o.aspect || (w < 480 ? 0.96 : 0.72), this.o.minW || 260); this.ctx = r.ctx; this.W = r.w; this.H = r.h; this.fs = r.w < 480 ? 0.88 : 1; this.layout(); }
  layout() { this.cx0 = this.W / 2; this.cy0 = this.H / 2; this.sc = Math.min(this.W, this.H) / 2 / this.R * 0.9; }
  setR(R) { this.R = R; this.layout(); this.dirty = true; }
  fit(zs, min = 2) { const m = Math.max(min / 1.25, ...zs.filter(z => isFinite(z.re) && isFinite(z.im)).map(z => Math.max(Math.abs(z.re), Math.abs(z.im)))); const nice = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 30, 40, 50, 60, 80, 100];
    this.setR(nice.find(v => v >= m * 1.25) || Math.ceil(m * 1.25)); }
  play(sec = 1.1) { this.e = 0; this.dur = sec; this.dirty = true; }
  redraw() { this.dirty = true; }
  frame(dt) { if (this.e < 1) { this.e = Math.min(1, this.e + dt / this.dur); this.dirty = true; } if (!this.dirty) return; this.dirty = false; this.draw(); }
  draw() { this.grid(); if (this.o.scene) this.o.scene(this, 1 - Math.pow(1 - this.e, 3)); }
  P(z) { return [this.cx0 + z.re * this.sc, this.cy0 - z.im * this.sc]; }
  fromP(x, y) { return ALG.cx((x - this.cx0) / this.sc, (this.cy0 - y) / this.sc); }
  text(s, x, y, o = {}) { const c = this.ctx; c.font = `${o.weight || ''} ${((o.size || 13) * (this.fs || 1)).toFixed(1)}px ${/[ก-๙]/.test(s) ? '"IBM Plex Sans Thai"' : '"IBM Plex Mono"'}, monospace`.trim();
    c.fillStyle = o.color || PC.muted; c.textAlign = o.align || 'left'; c.textBaseline = o.base || 'middle';
    if (o.halo !== false) { c.save(); c.lineWidth = 4; c.strokeStyle = 'rgba(15,18,32,.85)'; c.strokeText(s, x, y); c.restore(); } c.fillText(s, x, y); }
  grid() {
    const c = this.ctx, W = this.W, H = this.H; c.fillStyle = CK.PAL.bg; c.fillRect(0, 0, W, H);
    const raw = this.R / 4, m = Math.pow(10, Math.floor(Math.log10(raw))), n = raw / m, st = (n < 1.5 ? 1 : n < 3 ? 2 : n < 7 ? 5 : 10) * m;
    const xr = W / 2 / this.sc, yr = H / 2 / this.sc; c.lineWidth = 1;
    const lab = v => ALG.fmtDec(v, 2).replace('-', '−');
    for (let v = -Math.ceil(xr / st) * st; v <= xr + 1e-9; v += st) { const x = this.cx0 + v * this.sc; c.strokeStyle = Math.abs(v) < 1e-9 ? PC.axis : PC.grid; c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke();
      if (Math.abs(v) > 1e-9) this.text(lab(v), x, this.cy0 + 12, { align: 'center', size: 11.5, halo: false }); }
    for (let v = -Math.ceil(yr / st) * st; v <= yr + 1e-9; v += st) { const y = this.cy0 - v * this.sc; c.strokeStyle = Math.abs(v) < 1e-9 ? PC.axis : PC.grid; c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke();
      if (Math.abs(v) > 1e-9) this.text(this.o.j === false ? lab(v) : (v < 0 ? '−j' : 'j') + lab(Math.abs(v)), this.cx0 - 6, y, { align: 'right', size: 11.5, halo: false }); }
    this.text(this.o.xLab || 'Re', W - 8, this.cy0 - 12, { align: 'right', color: PC.ink, size: 14, weight: '600' }); this.text(this.o.yLab || 'Im', this.cx0 + 8, 13, { color: PC.ink, size: 14, weight: '600' });
  }
  /* the straight line a·x + b·y = c across the whole plot (for x–y plots with o.j = false) */
  line(a, b, c, col, o = {}) { const ctx = this.ctx, xr = this.W / 2 / this.sc, yr = this.H / 2 / this.sc; let p1, p2;
    if (Math.abs(b) >= Math.abs(a)) { p1 = ALG.cx(-xr, (c + a * xr) / b); p2 = ALG.cx(xr, (c - a * xr) / b); } else { p1 = ALG.cx((c + b * yr) / a, -yr); p2 = ALG.cx((c - b * yr) / a, yr); }
    const [x1, y1] = this.P(p1), [x2, y2] = this.P(p2); ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = o.width || 3; ctx.globalAlpha = o.alpha ?? 1; if (o.dash) ctx.setLineDash(o.dash);
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.restore(); }
  vec(z0, z1, col, o = {}) { const c = this.ctx, [x0, y0] = this.P(z0), [x1, y1] = this.P(z1), L = Math.hypot(x1 - x0, y1 - y0); if (L < 2) return;
    const a = Math.atan2(y1 - y0, x1 - x0), hl = Math.min(13, L * 0.35);
    c.save(); c.strokeStyle = col; c.fillStyle = col; c.lineWidth = o.width || 2.8; c.globalAlpha = o.alpha ?? 1; if (o.dash) c.setLineDash(o.dash);
    c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1 - Math.cos(a) * hl * 0.6, y1 - Math.sin(a) * hl * 0.6); c.stroke(); c.setLineDash([]);
    c.beginPath(); c.moveTo(x1, y1); c.lineTo(x1 - hl * Math.cos(a - 0.4), y1 - hl * Math.sin(a - 0.4)); c.lineTo(x1 - hl * Math.cos(a + 0.4), y1 - hl * Math.sin(a + 0.4)); c.closePath(); c.fill(); c.restore(); }
  dot(z, col, label, o = {}) { const c = this.ctx, [x, y] = this.P(z); c.save(); c.fillStyle = col; c.strokeStyle = '#0f1220'; c.lineWidth = 2; c.beginPath(); c.arc(x, y, o.r || 6.5, 0, 2 * Math.PI); c.fill(); c.stroke(); c.restore();
    if (label) { const right = x < this.W * 0.62; this.text(label, x + (right ? 11 : -11), y + (o.below ? 16 : -14), { color: col, size: o.size || 14, weight: '700', align: right ? 'left' : 'right' }); } }
  /* angle arc at the origin from a0 to a1 (degrees, counter-clockwise positive), radius r px, with an arrow head and optional label */
  arc(a0, a1, col, o = {}) { const c = this.ctx, r = o.r || 40, A0 = a0 * Math.PI / 180, A1 = a1 * Math.PI / 180; if (Math.abs(a1 - a0) < 0.3) return;
    c.save(); c.strokeStyle = col; c.fillStyle = col; c.lineWidth = o.width || 2.2; c.globalAlpha = o.alpha ?? 1; if (o.dash) c.setLineDash(o.dash);
    c.beginPath(); c.arc(this.cx0, this.cy0, r, -A0, -A1, A1 > A0); c.stroke(); c.setLineDash([]);
    const ex = this.cx0 + r * Math.cos(A1), ey = this.cy0 - r * Math.sin(A1), dir = A1 > A0 ? 1 : -1, tx_ = -Math.sin(A1) * dir, ty_ = -Math.cos(A1) * dir;
    c.beginPath(); c.moveTo(ex + tx_ * 7, ey + ty_ * 7); c.lineTo(ex - ty_ * 4.5, ey + tx_ * 4.5); c.lineTo(ex + ty_ * 4.5, ey - tx_ * 4.5); c.closePath(); c.fill(); c.restore();
    if (o.label) { const am = (A0 + A1) / 2, rr = r + (o.lr || 14); this.text(o.label, this.cx0 + rr * Math.cos(am), this.cy0 - rr * Math.sin(am), { color: col, size: o.size || 13.5, weight: '700', align: Math.cos(am) > 0.25 ? 'left' : Math.cos(am) < -0.25 ? 'right' : 'center' }); } }
  /* dashed drop lines from z to both axes, labelled with a and b */
  proj(z, col, o = {}) { const c = this.ctx, [x, y] = this.P(z), [x0, y0] = this.P(ALG.cx(0, 0));
    c.save(); c.setLineDash([4, 4]); c.strokeStyle = col; c.globalAlpha = 0.7; c.lineWidth = 1.4; c.beginPath();
    if (o.a !== false) { c.moveTo(x, y); c.lineTo(x, y0); } if (o.b !== false) { c.moveTo(x, y); c.lineTo(x0, y); } c.stroke(); c.restore();
    if (o.a !== false && o.aLab) this.text(o.aLab, x, y0 + (z.im >= 0 ? 26 : -14), { align: 'center', color: col, size: 13, weight: '600' });
    if (o.b !== false && o.bLab) this.text(o.bLab, (x + x0) / 2, y + (z.im >= 0 ? -11 : 14), { align: 'center', color: col, size: 13, weight: '600' }); } // b sits on the side of the drop line away from the arrow
  /* text at a complex position, offset in px */
  label(s, z, col, o = {}) { const [x, y] = this.P(z); this.text(s, x + (o.dx || 0), y + (o.dy || 0), { color: col, size: o.size || 13.5, weight: o.weight || '600', align: o.align || 'left' }); }
  note(s, col, o = {}) { const L = (o.line || 0) * 21; this.text(s, o.right ? this.W - 10 : 10, o.top ? 14 + L : this.H - 14 - L, { color: col || PC.res, size: o.size || 13.5, weight: '600', align: o.right ? 'right' : 'left' }); }
};

/* ---------------- 4) the AC circuit with phasors and an oscilloscope ---------------- */
/* Course rule: SINE reference with PEAK phasors, v(t) = Vm sin(ωt + θ) ⇄ V = Vm∠θ, so the value at time t is
   Im[P e^{jωt}] = |P| sin(ωt + ∠P), the height of the spinning arrow's tip (its shadow on the imaginary axis). */
CH1.sv = (P, w, tt) => P.re * Math.sin(w * tt) + P.im * Math.cos(w * tt);
CH1.AC = class {
  /* o: { load: 'R'|'L'|'C'|'RL'|'RC', Vm (peak), f, R, L, C, slow, known (current found yet), parts (show V_R and V_X phasors) }
     The engine's values are cosine based (Re[z e^{jωt}]), so its clock runs a quarter period behind: acTime = t − (π/2)/ω. */
  constructor(canvas, o = {}) {
    this.canvas = canvas; this.S = Object.assign({ load: 'RL', Vm: 220, f: 50, R: 30, L: 0.4 / Math.PI, C: 1 / (2 * Math.PI * 50 * 40), slow: 100, run: true, known: false, parts: false }, o);
    this.tc = 0; this.fade = this.S.known ? 1 : 0; this.box = {}; this.build(); this.resize();
    window.addEventListener('resize', () => this.resize()); LS.anim(canvas, dt => this.frame(dt));
  }
  build() { const S = this.S, L = S.load, nodes = { a: [0, 0], b: [3.4, 0], g: [0, 3], h: [3.4, 3] }, parts = [];
    parts.push({ id: 'Vs', name: 'v(t)', type: 'VAC', a: 'a', b: 'g', amp: S.Vm, phase: 0, side: 1, valText: `${S.Vm} sin ωt V` });
    if (L === 'RL' || L === 'RC') parts.push({ id: 'R', name: 'R', type: 'R', a: 'a', b: 'b', value: S.R }); else parts.push({ type: 'W', a: 'a', b: 'b' });
    if (L === 'R') parts.push({ id: 'R', name: 'R', type: 'R', a: 'b', b: 'h', value: S.R, side: 1 });
    if (L === 'L' || L === 'RL') parts.push({ id: 'X', name: 'L', type: 'L', a: 'b', b: 'h', value: S.L, side: 1 });
    if (L === 'C' || L === 'RC') parts.push({ id: 'X', name: 'C', type: 'C', a: 'b', b: 'h', value: S.C, side: 1 });
    parts.push({ type: 'W', a: 'h', b: 'g' });
    this.ckt = new CK.Circuit({ ground: 'g', mode: 'ac', w: 2 * Math.PI * S.f, nodes, parts }); this.ckt.solve();
    this.view = new CK.View(this.canvas, this.ckt, { speed: 17, ground: false, showI: false, pad: 1.25, acPeak: true, acTime: () => this.tc - Math.PI / 2 / this.ckt.w, tips: this.S.known, fade: this.fade });
    if (this.W) { this.view.ctx = this.ctx; this.view.fit(this.box.ckt); } }
  set(vals) { Object.assign(this.S, vals); this.build(); }
  setKnown(v) { if (v && !this.S.known) this.fade = 0.001; this.S.known = v; if (!v) this.fade = 0; this.view.o.tips = v; }
  resize() { const w = this.canvas.parentElement.clientWidth - 12, narrow = w < 440; const r = CK.fit(this.canvas, narrow ? 1.45 : 0.78, 280); this.ctx = r.ctx; this.W = r.w; this.H = r.h; const W = r.w, H = r.h;
    if (narrow) { const h1 = Math.round(H * 0.36), h2 = Math.round(H * 0.34); this.box.ckt = { x: 0, y: 32, w: W, h: h1 - 32 }; this.box.ph = { x: 0, y: h1, w: W, h: h2 }; this.box.plot = { x: 0, y: h1 + h2 + 4, w: W, h: H - h1 - h2 - 6 }; }
    else { const top = Math.round(H * 0.6); this.box.ckt = { x: 0, y: 32, w: Math.round(W * 0.47), h: top - 32 }; this.box.ph = { x: Math.round(W * 0.47), y: 4, w: W - Math.round(W * 0.47), h: top - 4 }; this.box.plot = { x: 0, y: top + 6, w: W, h: H - top - 8 }; }
    this.view.ctx = this.ctx; this.view.fit(this.box.ckt); }
  phasors() { const I = this.ckt.I('Vs'); return { V: ALG.cx(this.S.Vm, 0), I: ALG.cx(-I.re, -I.im) }; } // peak phasors; the source current a→g is minus the loop current
  vx() { const S = this.S, w = 2 * Math.PI * S.f; return S.load === 'RL' ? ALG.cx(0, w * S.L) : S.load === 'RC' ? ALG.cx(0, -1 / (w * S.C)) : null; }
  txt(s, x, y, o = {}) { const c = this.ctx; c.font = `${o.weight || ''} ${o.size || 12}px ${/[ก-๙]/.test(s) ? '"IBM Plex Sans Thai"' : '"IBM Plex Mono"'}, monospace`.trim(); c.fillStyle = o.color || PC.muted; c.textAlign = o.align || 'left'; c.textBaseline = o.base || 'middle'; c.fillText(s, x, y); }
  arrow(x0, y0, x1, y1, col, w = 3, alpha = 1) { const c = this.ctx, L = Math.hypot(x1 - x0, y1 - y0); if (L < 2) return; const a = Math.atan2(y1 - y0, x1 - x0), hl = Math.min(12, L * 0.3);
    c.save(); c.globalAlpha = alpha; c.strokeStyle = col; c.fillStyle = col; c.lineWidth = w; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1 - Math.cos(a) * hl * 0.6, y1 - Math.sin(a) * hl * 0.6); c.stroke();
    c.beginPath(); c.moveTo(x1, y1); c.lineTo(x1 - hl * Math.cos(a - 0.4), y1 - hl * Math.sin(a - 0.4)); c.lineTo(x1 - hl * Math.cos(a + 0.4), y1 - hl * Math.sin(a + 0.4)); c.closePath(); c.fill(); c.restore(); }
  iref() { return Math.max(8, ALG.cabs(this.phasors().I) * 1.05); }
  drawPhasor() {
    const c = this.ctx, b = this.box.ph, cxp = b.x + b.w * 0.5, cyp = b.y + b.h * 0.53, R = Math.min(b.w, b.h) * 0.38;
    c.save(); c.strokeStyle = PC.grid; c.lineWidth = 1; c.beginPath(); c.arc(cxp, cyp, R, 0, 2 * Math.PI); c.stroke();
    c.strokeStyle = PC.axis; c.beginPath(); c.moveTo(b.x + 8, cyp); c.lineTo(b.x + b.w - 8, cyp); c.moveTo(cxp, b.y + 20); c.lineTo(cxp, b.y + b.h - 6); c.stroke(); c.restore();
    this.txt('Re', b.x + b.w - 10, cyp - 10, { align: 'right', color: PC.ink, size: 13, weight: '600' }); this.txt('Im', cxp + 6, b.y + 24, { color: PC.ink, size: 13, weight: '600' });
    this.txt(t('ระนาบเชิงซ้อน: เฟเซอร์', 'complex plane: phasors'), b.x + 8, b.y + 12, { size: 12.5 });
    const { V, I } = this.phasors(), w = this.ckt.w, rot = w * this.tc, e = ALG.cx(Math.cos(rot), Math.sin(rot));
    const Vr = ALG.cmul(V, e), Ir = ALG.cmul(I, e), vs = R / ALG.cabs(V), is = R / this.iref();
    const Vp = [cxp + Vr.re * vs, cyp - Vr.im * vs], Ip = [cxp + Ir.re * is, cyp - Ir.im * is], known = this.S.known, fa = this.fade;
    /* shadows on the imaginary axis: the tip's height is the value at this instant (sine reference) */
    const shadow = (p, col, alpha) => { c.save(); c.globalAlpha = alpha; c.setLineDash([4, 4]); c.lineWidth = 1.3; c.strokeStyle = col; c.beginPath(); c.moveTo(p[0], p[1]); c.lineTo(cxp, p[1]); c.stroke();
      c.setLineDash([]); c.fillStyle = col; c.beginPath(); c.arc(cxp, p[1], 4.5, 0, 2 * Math.PI); c.fill(); c.restore(); };
    shadow(Vp, PC.z2, 1); if (known) shadow(Ip, PC.z1, fa);
    /* V_R and V_X head to tail (scaled like V) */
    if (known && this.S.parts && this.vx()) { const VR = ALG.cmul(ALG.cmul(I, ALG.cx(this.S.R, 0)), e), VX = ALG.cmul(ALG.cmul(I, this.vx()), e);
      const p1 = [cxp + VR.re * vs, cyp - VR.im * vs], p2 = [p1[0] + VX.re * vs, p1[1] - VX.im * vs];
      this.arrow(cxp, cyp, p1[0], p1[1], PC.purple, 2.4, 0.95); this.arrow(p1[0], p1[1], p2[0], p2[1], PC.good, 2.4, 0.95);
      this.view.text('V_R', (cxp + p1[0]) / 2 + 8, (cyp + p1[1]) / 2 + 12, { color: PC.purple, size: 14, weight: '700', align: 'left' }); this.view.text(this.S.load === 'RL' ? 'V_L' : 'V_C', (p1[0] + p2[0]) / 2 + 10, (p1[1] + p2[1]) / 2, { color: PC.good, size: 14, weight: '700', align: 'left' }); }
    this.arrow(cxp, cyp, Vp[0], Vp[1], PC.z2, 3.2); this.txt('V', Vp[0] + 8, Vp[1] - 8, { color: PC.z2, size: 15.5, weight: '700' });
    if (known) { this.arrow(cxp, cyp, Ip[0], Ip[1], PC.z1, 3.2, fa); this.txt('I', Ip[0] + 8, Ip[1] + 10, { color: PC.z1, size: 15.5, weight: '700' });
      const a1 = Math.atan2(Vr.im, Vr.re), a2 = Math.atan2(Ir.im, Ir.re); let d = a2 - a1; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
      if (Math.abs(d) > 0.02) { c.save(); c.strokeStyle = PC.res; c.lineWidth = 2; c.beginPath(); c.arc(cxp, cyp, R * 0.3, -a1, -(a1 + d), d > 0); c.stroke(); c.restore();
        const am = a1 + d / 2; this.txt(`${LS.u(d * 180 / Math.PI, 1)}°`, cxp + R * 0.45 * Math.cos(am), cyp - R * 0.45 * Math.sin(am), { color: PC.res, size: 13.5, weight: '600', align: 'center' }); }
      this.txt(d < -0.02 ? t('I ตามหลัง V', 'I lags V') : d > 0.02 ? t('I นำหน้า V', 'I leads V') : t('I กับ V เฟสเดียวกัน', 'I in phase with V'), b.x + b.w - 8, b.y + b.h - 10, { align: 'right', color: PC.res, size: 13.5, weight: '600' }); }
    else this.txt(t('I = ? (ยังไม่ได้คำนวณ)', 'I = ? (not found yet)'), b.x + b.w - 8, b.y + b.h - 10, { align: 'right', color: PC.z1, size: 13.5, weight: '600' });
  }
  drawPlot() {
    const c = this.ctx, b = this.box.plot; c.save(); c.fillStyle = '#161a2f'; c.fillRect(b.x, b.y, b.w, b.h); c.restore();
    const ml = 10, mr = 10, pw = b.w - ml - mr, ph = b.h - 30, x0 = b.x + ml, y0 = b.y + 20, ym = y0 + ph / 2, T = 1 / this.S.f, win = 2 * T;
    c.save(); c.strokeStyle = PC.grid; c.lineWidth = 1; for (let k = 0; k <= 8; k++) { const x = x0 + pw * k / 8; c.beginPath(); c.moveTo(x, y0); c.lineTo(x, y0 + ph); c.stroke(); }
    c.strokeStyle = PC.axis; c.beginPath(); c.moveTo(x0, ym); c.lineTo(x0 + pw, ym); c.stroke(); c.restore();
    const { V, I } = this.phasors(), w = this.ckt.w, vs = ph / 2 * 0.9 / ALG.cabs(V), is = ph / 2 * 0.9 / this.iref();
    const trace = (P, sc, col, alpha) => { c.save(); c.globalAlpha = alpha; c.beginPath(); c.rect(x0, y0 - 4, pw, ph + 8); c.clip(); c.strokeStyle = col; c.lineWidth = 2.2; c.beginPath();
      for (let k = 0; k <= 240; k++) { const tt = this.tc - win + win * k / 240, y = ym - CH1.sv(P, w, tt) * sc, x = x0 + pw * k / 240; k ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke(); c.restore(); };
    trace(V, vs, PC.z2, 1); if (this.S.known) trace(I, is, PC.z1, this.fade);
    const vNow = CH1.sv(V, w, this.tc), iNow = CH1.sv(I, w, this.tc);
    this.txt(`v(t) = ${LS.u(vNow, 0)} V`, x0 + 4, b.y + 10, { color: PC.z2, size: 13, weight: '600' });
    this.txt(this.S.known ? `i(t) = ${LS.u(iNow, 2)} A` : 'i(t) = ?', x0 + Math.min(150, pw * 0.42), b.y + 10, { color: PC.z1, size: 13, weight: '600' });
    if (pw > 420) this.txt(t(`2 คาบล่าสุด · ช้าลง ${this.S.slow} เท่า`, `last 2 periods · ${this.S.slow}× slow`), x0 + pw, b.y + 10, { align: 'right', size: 12 });
  }
  frame(dt) {
    const S = this.S; if (S.run) this.tc += dt / S.slow; if (S.known && this.fade < 1) this.fade = Math.min(1, this.fade + dt * 1.5); this.view.o.fade = S.known ? this.fade : 0;
    const c = this.ctx; c.fillStyle = CK.PAL.bg; c.fillRect(0, 0, this.W, this.H);
    if (S.run) this.view.advance(dt); this.view.draw(); this.drawPhasor(); this.drawPlot();
    CK.badge(c, !S.known ? t('? ยังไม่รู้กระแส: หา I = V/Z ก่อน', '? Current unknown: find I = V/Z first') : S.run ? t(`▶ ${S.f} Hz ช้าลง ${S.slow} เท่า`, `▶ ${S.f} Hz, ${S.slow}× slow`) : t('❚❚ หยุดชั่วคราว', '❚❚ paused'), S.known ? 'ok' : 'wait');
  }
};

global.CH1 = CH1;
})(window);
