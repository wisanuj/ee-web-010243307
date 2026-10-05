/* ana.js — chapter 4: nodal and mesh analysis written out step by step in the class style.
   ANA.nodal(ckt, meta) writes KCL (ΣI_out = 0) at every non-reference node. A voltage source to the reference fixes that
     node; a voltage source between two unknown nodes makes a supernode: one KCL round both nodes + the constraint v₊ − v₋ = V.
   ANA.mesh(ckt, meta) finds the meshes from the drawing itself (the inner faces of the planar circuit graph) and writes KVL
     (ΣV = 0, clockwise, starting at the bottom-left corner as Hayt does). A current source on the outer edge of one mesh fixes
     that mesh current; a current source shared by two meshes joins them into a supermesh + the constraint i_a − i_b = I.
   Everything is exact (ALG.Frac): equations, LCD multipliers and answers, so the pages show fractions such as 108/17 and the
   tests compare them with the numeric solver in circuit.js.
   meta (nodal): { nv: {node: 'V_A' | {n, dx, dy}}, ref: 'V_E', order: [node…], series: [[id, id]], ell: {srcId: [cx, cy, rx, ry]}, extras }
   meta (mesh):  { meshes: [{n: 'I_1', at: [x, y], r}], extras }                                                                  */
(function (global) {
'use strict';
const ANA = {};
const ALG = global.ALG, F = ALG.F;
/* exact fraction of a part value: 1/3, 1/6, 0.25 … (ALG.Frac.of would round 1/3 to six decimals) */
const FX = x => { if (x instanceof ALG.Frac) return x; if (Number.isInteger(x)) return F(x);
  for (let d = 2; d <= 10000; d++) { const n = Math.round(x * d); if (Math.abs(x - n / d) < 1e-12 * Math.max(1, Math.abs(x))) return new ALG.Frac(n, d); } return F(x); };
ANA.FX = FX;
const tt = (th, en) => (global.MC ? global.MC.t(th, en) : en);
const tx = (s, d) => (global.MC ? global.MC.tex(s, d) : s);

/* ---------------- exact linear algebra ---------------- */
ANA.solve = (A, b) => {
  const n = b.length; const M = A.map((r, i) => [...r.map(F), F(b[i])]);
  for (let k = 0; k < n; k++) {
    let p = -1; for (let i = k; i < n; i++) if (!M[i][k].isZero) { p = i; break; }
    if (p < 0) return null; if (p !== k) [M[p], M[k]] = [M[k], M[p]];
    const piv = M[k][k]; for (let j = k; j <= n; j++) M[k][j] = M[k][j].div(piv);
    for (let i = 0; i < n; i++) if (i !== k && !M[i][k].isZero) { const f = M[i][k]; for (let j = k; j <= n; j++) M[i][j] = M[i][j].sub(f.mul(M[k][j])); }
  }
  return M.map(r => r[n]);
};
ANA.det = A => {
  const n = A.length; const M = A.map(r => r.map(F)); let d = F(1);
  for (let k = 0; k < n; k++) {
    let p = -1; for (let i = k; i < n; i++) if (!M[i][k].isZero) { p = i; break; }
    if (p < 0) return F(0); if (p !== k) { [M[p], M[k]] = [M[k], M[p]]; d = d.neg(); }
    d = d.mul(M[k][k]);
    for (let i = k + 1; i < n; i++) { const f = M[i][k].div(M[k][k]); for (let j = k; j < n; j++) M[i][j] = M[i][j].sub(f.mul(M[k][j])); }
  }
  return d;
};

/* ---------------- LaTeX helpers ---------------- */
const join = ts => ts.map((t, i) => (i ? (t.s < 0 ? ' - ' : ' + ') : (t.s < 0 ? '-' : '')) + t.b).join('') || '0';
const par = q => (q.sign < 0 ? `(${q.tex()})` : q.tex());
const dec = q => ALG.fmtDec(+q, 4);
const finiteDec = q => { let d = q.d; while (d % 2 === 0) d /= 2; while (d % 5 === 0) d /= 5; return d === 1; };
const lcmAll = qs => qs.reduce((L, q) => ALG.lcm(L, F(q).d), 1);
const lhsTex = (c, vars) => { const ts = []; c.forEach((q, i) => { if (q.isZero) return; const m = q.abs(); ts.push({ s: q.sign, b: (m.eq(1) ? '' : m.tex()) + vars[i] }); }); return join(ts); };
/* layout for the column the steps go into (CH4.problem sets ANA.colW to its width before each analysis; 0 = the window):
   a long sum wraps onto more lines once its KaTeX width passes the room left in the column, the answer chains of "what the
   problem asks" put every "= …" on its own row when one row would not fit, and a narrow column (under 600 px) gets \quad
   before equation labels and the collected system as a tight alignedat instead of a padded array. Widths are measured at
   16 px in display style; a phone draws the steps at about 0.8 of that size (ee.css), the desktop at the same size. */
ANA.colW = 0;
const colW = () => ANA.colW || global.innerWidth || 1200;
const NARROW = () => colW() < 600;
const AVAIL = () => (colW() - 64) / (global.matchMedia && global.matchMedia('(max-width: 480px)').matches ? 0.806 : 1);
const SEP = () => (NARROW() ? '\\quad' : '\\qquad');
const WC = new Map(); let meas = null;
const texW = s => { if (WC.has(s)) return WC.get(s); if (typeof katex === 'undefined' || typeof document === 'undefined' || !document.body) return 0;
  if (!meas) { meas = document.createElement('span'); meas.style.cssText = 'position:absolute;left:-9999px;top:0;visibility:hidden;white-space:nowrap;font-size:16px'; document.body.appendChild(meas); }
  let w = 0; try { meas.innerHTML = katex.renderToString('\\displaystyle ' + s); w = meas.getBoundingClientRect().width; } catch (e) {} WC.set(s, w); return w; };
ANA.texW = texW;
const row = (ts, rhs, tail = '', pre = '') => {
  const budget = Math.max(150, AVAIL() - 130), ws = ts.map(t => texW(t.b) + 20), end = texW(`= ${rhs}${tail}`) + 10;
  if (ts.length < 2 || texW(pre) + ws.reduce((a, b) => a + b, 0) + end <= budget) return `${pre}${join(ts)} &= ${rhs}${tail}`;
  const lines = []; let cur = [], cw = texW(pre);
  ts.forEach((t, i) => { if (cur.length && cw + ws[i] > budget) { lines.push(cur); cur = []; cw = 0; } cur.push(t); cw += ws[i]; });
  if (cur.length) { if (lines.length && cw + end > budget + 40 && cur.length > 1) { lines.push(cur.slice(0, -1)); cur = cur.slice(-1); } lines.push(cur); }
  return lines.map((L, k) => (k ? '{}' + L.map(t => (t.s < 0 ? ' - ' : ' + ') + t.b).join('') : pre + join(L)) + (k === lines.length - 1 ? ` &= ${rhs}${tail}` : '')).join(' \\\\ '); };
/* the collected system: ALG.texSystem (array, unknowns in columns) or, on a phone, the same columns in a tight alignedat */
const sysTex = (eqs, vars) => { if (!NARROW()) return ALG.texSystem(eqs, vars);
  const used = vars.map((_, i) => eqs.some(e => !e.c[i].isZero)), nu = used.filter(Boolean).length;
  const rows = eqs.map(e => { const cells = []; let first = true, k = 0;
    vars.forEach((v, i) => { if (!used[i]) return; const q = e.c[i], mag = q.abs(), term = q.isZero ? '' : `${mag.eq(1) ? '' : (mag.isInt ? String(mag.n) : mag.tex())}${v}`;
      if (k++ > 0) cells.push(q.isZero || first ? '' : (q.sign < 0 ? '{}-{}' : '{}+{}'));
      cells.push(q.isZero ? '' : (first && q.sign < 0 ? '-' : '') + term); if (!q.isZero) first = false; });
    cells.push('{}={}', e.r.tex(), e.label ? `\\quad ${e.label}` : ''); return cells.join(' & '); });
  return `\\begin{alignedat}{${nu + 1}} ${rows.join(' \\\\ ')} \\end{alignedat}`; };
/* blocks that cannot wrap (elimination stacks, determinants) are drawn a little smaller on a phone (ee.css .mstack) */
const tms = (s, d) => `<div class="mstack">${tx(s, d)}</div>`;
const lcdNote = K => (K.T3 && NARROW() ? `<div class="sub2">${tt(`ก่อนจัดรูป คูณตลอดด้วย ค.ร.น. ของตัวส่วน = ${K.L}`, `Before collecting terms, everything is multiplied by the LCD of the denominators, ${K.L}`)}</div>` : '');
const eqLine = (e, vars, col = '#1c7ed6') => `${lhsTex(e.c, vars)} &= ${e.r.tex()} ${SEP()} \\textcolor{${col}}{${e.label}}`;
const al = rows => `\\begin{aligned} ${rows.join(' \\\\ ')} \\end{aligned}`;
ANA.join = join; ANA.al = al; ANA.lhsTex = lhsTex; ANA.row = row; ANA.narrow = NARROW; ANA.sysTex = sysTex;
/* the "what the problem asks" lines: chains [lhs, p1, p2, …] (or a ready row string) → one aligned block, one row per chain
   (lhs = p1 = p2 = …), or one row per "= p" when the chain would not fit the column */
ANA.rows = chains => { const L = Math.max(0, ...chains.map(c => (typeof c === 'string' ? 0 : texW(c[0]))));   // the widest left side sets the "=" column
  return al(chains.map(c => typeof c === 'string' ? c : `${c[0]} &= ${c.slice(1).join(L + texW('= ' + c.slice(1).join(' = ')) + 30 > AVAIL() ? ' \\\\ &= ' : ' = ')}`)); };
/* "V_A" → canvas text pieces are handled in ch4ui.js; here only LaTeX names are used */
/* a value with unit, exact + decimal: 108/17 ≈ 6.3529 V */
ANA.val = (q, unit = '') => { q = F(q); return q.isInt ? `${q.n}${unit}` : `${q.tex()} \\approx ${dec(q)}${unit}`; };
ANA.box = (q, unit = '') => ALG.texBoxed(q, unit);
const UV = '\\,\\text{V}', UA = '\\,\\text{A}';

/* ---------------- solving the system (shared by both methods) ---------------- */
/* returns html for one step: elimination (2 unknowns, as page 1.1) or Cramer's rule (3+ unknowns, as page 1.2) */
ANA.solveHTML = (eqs, vars, unit) => {
  const n = vars.length;
  if (n === 1) { const e = eqs[0], c = e.c[0], val = e.r.div(c);
    return { sol: [val], html: `<div class="why">${tt('<b>สมการเดียว ตัวแปรเดียว</b>: หารด้วยสัมประสิทธิ์', '<b>One equation, one unknown</b>: divide by the coefficient')}</div>` +
      tx(al([`${lhsTex(e.c, vars)} &= ${e.r.tex()}`, c.eq(1) ? `${vars[0]} &= ${ANA.box(val, unit)}` : `${vars[0]} &= \\frac{${e.r.tex()}}{${c.tex()}} = ${ANA.box(val, unit)}`]), true) }; }
  if (n === 2) {
    const r = ALG.elim2(eqs[0], eqs[1], vars); if (!r.ok) return { sol: null, html: tt('ระบบสมการไม่มีคำตอบเดียว', 'The system has no unique solution') };
    const mtag = (m, l) => m === 1 ? l : m === -1 ? '−' + l : `${m < 0 ? '−' : ''}${Math.abs(m)}×${l}`;
    let h = `<div class="why">${tt('<b>แก้ระบบสมการ</b> ด้วยวิธีกำจัดตัวแปร (หน้า 1.1)', '<b>Solve the system</b> by elimination (page 1.1)')}</div>`;
    r.steps.forEach(st => {
      if (st.kind === 'combine') h += `<div class="sub2">${tt(`กำจัด \\(${vars[st.elim]}\\): `, `Eliminate \\(${vars[st.elim]}\\): `)}<b>${tx(st.op)}</b></div>` +
        tms(ALG.texStack([{ e: ALG.scale(st.a, st.m1), tag: mtag(st.m1, st.a.label) }, { e: ALG.scale(st.b, st.m2), tag: mtag(st.m2, st.b.label) }, { e: st.res, tag: '' }], vars, { cancel: st.elim }), true);
      else if (st.kind === 'solve') { const c = st.e.c[st.v]; h += tx(c.eq(1) ? `${vars[st.v]} = ${ANA.box(st.val, unit)}` : `${vars[st.v]} = \\frac{${st.e.r.tex()}}{${c.tex()}} = ${ANA.box(st.val, unit)}`, true); }
      else if (st.kind === 'back') h += `<div class="sub2">${tt(`แทนค่ากลับลงในสมการ ${st.e.label}`, `Substitute back into equation ${st.e.label}`)}</div>` + tms(st.chain(unit), true);
    });
    return { sol: r.sol, html: h };
  }
  const A = eqs.map(e => e.c), b = eqs.map(e => e.r); const D = ANA.det(A);
  if (D.isZero) return { sol: null, html: tt('ดีเทอร์มิแนนต์เป็นศูนย์', 'The determinant is zero') };
  const mat = (M, hl) => `\\begin{vmatrix} ${M.map(row => row.map((x, j) => j === hl ? `\\textcolor{#d6336c}{${x.tex()}}` : x.tex()).join(' & ')).join(' \\\\ ')} \\end{vmatrix}`;
  const sol = []; let rows = [`\\Delta &= ${mat(A, -1)} = ${D.tex()}`];
  vars.forEach((v, k) => { const Ak = A.map((r, i) => r.map((x, j) => j === k ? b[i] : x)); const Dk = ANA.det(Ak); const val = Dk.div(D); sol.push(val);
    rows.push(`\\Delta_{${k + 1}} &= ${mat(Ak, k)} = ${Dk.tex()}`, `${v} &= \\frac{\\Delta_{${k + 1}}}{\\Delta} = \\frac{${Dk.tex()}}{${D.tex()}} = ${ANA.box(val, unit)}`); });
  const bm = M => `\\begin{bmatrix} ${M.map(r => r.map(x => x.tex()).join(' & ')).join(' \\\\ ')} \\end{bmatrix}`;
  return { sol, html: `<div class="why">${tt('<b>แก้ระบบสมการ</b> ด้วยกฎของคราเมอร์ (หน้า 1.2): เมทริกซ์ A คูณเวกเตอร์ตัวแปร = B แล้วแทนคอลัมน์ทีละคอลัมน์ด้วย B (สีชมพู)', '<b>Solve the system</b> with Cramer\'s rule (page 1.2): matrix A times the unknowns = B, then replace one column at a time by B (pink)')}</div>` +
    tms(`${bm(A)} \\begin{bmatrix} ${vars.join(' \\\\ ')} \\end{bmatrix} = ${bm(b.map(x => [x]))}`, true) + tms(al(rows), true) };
};

/* ---------------- nodal analysis ---------------- */
ANA.nodal = (ckt, meta = {}) => {
  const T = ckt.topology({ loops: false }); const netOf = n => T.netOf[n];
  const ref = netOf(ckt.ground);
  const name = {}, tag = {};
  Object.entries(meta.nv || {}).forEach(([node, v]) => { const k = netOf(node); if (k === undefined) throw new Error('nodal: unknown node ' + node);
    const o = typeof v === 'string' ? { n: v } : v; name[k] = o.n; tag[k] = { node, dx: o.dx, dy: o.dy }; });
  if (meta.ref) name[ref] = meta.ref;
  if (!tag[ref]) tag[ref] = { node: ckt.ground, dx: meta.refDx, dy: meta.refDy };
  /* elements; series chains merged into one resistor whose middle node is not an unknown */
  const inChain = {}; (meta.series || []).forEach((ids, ci) => ids.forEach(id => { inChain[id] = ci; }));
  const els = [], mids = new Set(), chainDone = new Set();
  ckt.parts.forEach(p => {
    if (p.type === 'W' || p.type === 'A' || p.type === 'VM' || p.type === 'S' || p.topo === false) return;
    if (inChain[p.id] !== undefined) { const ci = inChain[p.id]; if (chainDone.has(ci)) return; chainDone.add(ci);
      const ids = meta.series[ci], ps = ids.map(id => ckt.part(id)); const cnt = {};
      ps.forEach(q => [netOf(q.a), netOf(q.b)].forEach(k => { cnt[k] = (cnt[k] || 0) + 1; }));
      const ends = Object.keys(cnt).filter(k => cnt[k] === 1).map(Number); Object.keys(cnt).filter(k => cnt[k] === 2).forEach(k => mids.add(+k));
      els.push({ id: ids.join('+'), ids, type: 'R', R: ps.reduce((s, q) => s.add(FX(q.value)), F(0)), na: ends[0], nb: ends[1], chain: ps }); return; }
    const na = netOf(p.a), nb = netOf(p.b); if (na === undefined || nb === undefined || na === nb) return;
    if (!['R', 'V', 'I'].includes(p.type)) throw new Error('nodal: unsupported part ' + p.id);
    els.push({ id: p.id, ids: [p.id], type: p.type, R: p.type === 'R' ? FX(p.value) : null, val: FX(p.value), na, nb, part: p });
  });
  /* nodes fixed by voltage sources from the reference (chains allowed) */
  const known = new Map([[ref, F(0)]]); const fixBy = {}; const vs = els.filter(e => e.type === 'V');
  for (let ch = true; ch;) { ch = false; vs.forEach(e => { const ka = known.has(e.na), kb = known.has(e.nb);
    if (ka && !kb) { known.set(e.nb, known.get(e.na).sub(e.val)); fixBy[e.nb] = e; ch = true; }
    else if (kb && !ka) { known.set(e.na, known.get(e.nb).add(e.val)); fixBy[e.na] = e; ch = true; } }); }
  const order = []; (meta.order || Object.keys(meta.nv || {})).forEach(node => { const k = netOf(node); if (!order.includes(k)) order.push(k); });
  const unknown = order.filter(k => k !== ref && !known.has(k) && !mids.has(k));
  T.nets.forEach(net => { const k = net.k; if (k === ref || known.has(k) || mids.has(k) || unknown.includes(k)) return; throw new Error('nodal: no name for node ' + net.nodes.join('/')); });
  /* supernodes: unknown nodes joined by voltage sources */
  const gp = {}; unknown.forEach(k => { gp[k] = k; }); const gf = k => { while (gp[k] !== k) k = gp[k] = gp[gp[k]]; return k; };
  const cons = vs.filter(e => !known.has(e.na) && !known.has(e.nb));
  cons.forEach(e => { const a = gf(e.na), b = gf(e.nb); if (a !== b) gp[a] = b; });
  const groups = []; unknown.forEach(k => { const r = gf(k); let g = groups.find(x => x.root === r); if (!g) groups.push(g = { root: r, nets: [], src: [] }); g.nets.push(k); });
  cons.forEach(e => groups.find(g => g.root === gf(e.na)).src.push(e));
  const vars = unknown.map(k => name[k]);
  const nm = k => name[k] ?? (known.has(k) ? known.get(k).tex() : '?');
  const nmVal = k => (known.has(k) ? known.get(k) : null);
  /* KCL terms for a set of nets S (currents leaving S) */
  const fromNode = (e, k) => { const ps = e.chain || [e.part]; for (const p of ps) { if (netOf(p.a) === k) return { id: p.id, from: p.a }; if (netOf(p.b) === k) return { id: p.id, from: p.b }; } return null; };
  const kclTerms = (S, skipV) => { const terms = [], internal = [];
    els.forEach(e => { const a = S.includes(e.na), b = S.includes(e.nb); if (a && b) { internal.push(e); return; } if (!a && !b) return;
      const p = a ? e.na : e.nb, q = a ? e.nb : e.na;
      if (e.type === 'R') terms.push({ kind: 'R', e, R: e.R, p, q, arrow: fromNode(e, p) });
      else if (e.type === 'I') terms.push({ kind: 'I', e, I: e.val, leaving: a, arrow: fromNode(e, p) });
      else if (!skipV) throw new Error('nodal: voltage source crosses a node boundary: ' + e.id); });
    return { terms, internal }; };
  const diff = (p, q, subst) => { if (!subst || !known.has(q)) return { t: `${nm(p)} - ${nm(q)}`, single: false };
    const kv = known.get(q); if (kv.isZero) return { t: nm(p), single: true }; return { t: kv.sign > 0 ? `${nm(p)} - ${kv.tex()}` : `${nm(p)} + ${kv.abs().tex()}`, single: false }; };
  const termR = (t, subst) => { const d = diff(t.p, t.q, subst); const G = F(1).div(t.R);
    if (t.R.isInt) return `\\frac{${d.t}}{${t.R.n}}`;
    if (G.isInt) return d.single ? `${G.n}${d.t}` : `${G.n}(${d.t})`;
    return `\\frac{${d.t}}{${finiteDec(t.R) ? dec(t.R) : t.R.tex()}}`; };
  const kclLines = terms => {
    const usesKnown = terms.some(t => t.kind === 'R' && known.has(t.q));
    const L = lcmAll([...terms.filter(t => t.kind === 'R').map(t => F(1).div(t.R)), ...terms.filter(t => t.kind === 'I').map(t => t.I)]);
    const T1 = terms.map(t => t.kind === 'R' ? { s: 1, b: termR(t, false) } : { s: t.leaving ? 1 : -1, b: par(t.I) });
    const T2 = usesKnown ? terms.map(t => t.kind === 'R' ? { s: 1, b: termR(t, true) } : { s: t.leaving ? 1 : -1, b: par(t.I) }) : null;
    let T3 = null;
    if (L > 1) T3 = terms.map(t => { if (t.kind === 'I') { const v = (t.leaving ? t.I : t.I.neg()).mul(L); return { s: v.sign || 1, b: v.abs().tex() }; }
      const m = F(L).div(t.R), d = diff(t.p, t.q, true), mt = m.eq(1) ? '' : m.tex(); return { s: 1, b: d.single ? `${mt}${d.t}` : `${mt}(${d.t})` }; });
    const c = unknown.map(() => F(0)); let k0 = F(0);
    const add = (net, g) => { const i = unknown.indexOf(net); if (i >= 0) c[i] = c[i].add(g); else k0 = k0.add(g.mul(known.get(net))); };
    terms.forEach(t => { if (t.kind === 'R') { const g = F(1).div(t.R); add(t.p, g); add(t.q, g.neg()); } else k0 = k0.add(t.leaving ? t.I : t.I.neg()); });
    return { T1, T2, T3, L, c: c.map(x => x.mul(L)), r: k0.mul(L).neg() };
  };
  const kclBlock = (K, e) => al([row(K.T1, '0'), ...(K.T2 ? [row(K.T2, '0')] : []), ...(K.T3 ? [row(K.T3, '0', NARROW() ? '' : ` ${SEP()} (\\times ${K.L})`)] : []), eqLine(e, vars)]);
  const Rtxt = e => e.chain ? e.chain.map(p => ALG.fmtDec(p.value, 4)).join(' + ') + ' Ω' : (e.part && e.part.name) || e.id;
  const elName = e => e.chain ? e.chain.map(p => p.name || p.id).join(' + ') : ((e.part && e.part.name) || e.id);
  /* ---- steps ---- */
  const steps = []; const eqs = []; let ne = 0;
  // 1. setup
  {
    const N = T.nets.length - mids.size; const knownList = [...known.keys()].filter(k => k !== ref);
    let h = `<div class="why">${tt('<b>เตรียม</b>: เลือกโนดอ้างอิง ตั้งชื่อแรงดันโนด และนับจำนวนสมการ', '<b>Set up</b>: choose the reference node, name the node voltages and count the equations')}</div><ul class="ul2">`;
    if (mids.size) (meta.series || []).forEach(ids => { const ps = ids.map(id => ckt.part(id)); h += `<li>${tt(`${ps.map(p => p.name).join(' กับ ')} อนุกรมกัน รวมเป็น <b>${ALG.fmtDec(ps.reduce((s, p) => s + p.value, 0), 4)} Ω</b> ก่อน โนดตรงกลางจึงไม่ต้องตั้งเป็นตัวแปร`, `${ps.map(p => p.name).join(' and ')} are in series: combine them first into <b>${ALG.fmtDec(ps.reduce((s, p) => s + p.value, 0), 4)} Ω</b>, so the node between them needs no variable`)}</li>`; });
    h += `<li>${tt(`จำนวนโนด <b>N = ${N}</b> → แรงดันโนดที่ต้องหา N − 1 = <b>${N - 1}</b> ตัว`, `Number of nodes <b>N = ${N}</b> → N − 1 = <b>${N - 1}</b> node voltages`)}</li>`;
    h += `<li>${tt(`โนดอ้างอิง (กราวด์) \\(${name[ref] ? name[ref] + ' = ' : ''}0\\ \\text{V}\\) เลือกโนดที่ต่อกับกิ่งมากที่สุด`, `Reference node (ground) \\(${name[ref] ? name[ref] + ' = ' : ''}0\\ \\text{V}\\): pick the node joined to the most branches`)}</li>`;
    knownList.forEach(k => { const e = fixBy[k]; h += `<li>${tt(`แหล่งจ่าย ${elName(e)} ต่อจากโนดที่รู้ค่าแล้ว จึงได้ <b>\\(${nm2(k)} = ${known.get(k).tex()}\\ \\text{V}\\)</b> ทันที ไม่ต้องเขียน KCL ที่โนดนี้`, `The ${elName(e)} source hangs from a node we already know, so <b>\\(${nm2(k)} = ${known.get(k).tex()}\\ \\text{V}\\)</b> at once: no KCL needed here`)}</li>`; });
    groups.filter(g => g.nets.length > 1).forEach(g => { h += `<li>${tt(`แหล่งจ่าย ${g.src.map(elName).join(', ')} อยู่ระหว่าง \\(${g.nets.map(nm).join('\\) กับ \\(')}\\) ซึ่งยังไม่รู้ค่าทั้งคู่ → <b>ซูเปอร์โนด</b> (KCL หนึ่งสมการ + สมการเงื่อนไข)`, `The ${g.src.map(elName).join(', ')} source sits between \\(${g.nets.map(nm).join('\\) and \\(')}\\), both unknown → a <b>supernode</b> (one KCL + a constraint)`)}</li>`; });
    const nk = groups.length, nc = cons.length;
    h += `<li>${tt(`ตัวแปร: \\(${vars.join(',\\ ')}\\) → ต้องการ <b>${vars.length} สมการ</b>${nc ? ` = KCL ${nk} + เงื่อนไข ${nc}` : ''}`, `Unknowns: \\(${vars.join(',\\ ')}\\) → we need <b>${vars.length} equation${vars.length > 1 ? 's' : ''}</b>${nc ? ` = ${nk} KCL + ${nc} constraint${nc > 1 ? 's' : ''}` : ''}`)}</li></ul>`;
    steps.push({ kind: 'setup', html: h, glow: [...knownList.map(k => fixBy[k].id), ...cons.map(e => e.id)], reveal: 'known' });
  }
  function nm2(k) { return name[k] || nm(k); }
  // 2. KCL per node / supernode
  let firstK = true;
  groups.forEach(g => {
    const S = g.nets; const { terms, internal } = kclTerms(S); const K = kclLines(terms);
    const e = ALG.eq(K.c, K.r, `(${++ne})`); eqs.push(e);
    const arrows = terms.map(t => t.arrow).filter(Boolean); const glow = terms.flatMap(t => t.e.ids);
    if (S.length === 1) {
      const why = firstK ? tt(`<b>KCL ที่โนด \\(${nm(S[0])}\\)</b>: \\(\\sum I_{out} = 0\\) กระแสที่ไหล<b>ออก</b>ผ่านตัวต้านทาน = (แรงดันโนดนี้ − แรงดันปลายอีกด้าน)/R แหล่งจ่ายกระแสใส่ค่าตรง ๆ: ชี้ออก +, ชี้เข้า −`, `<b>KCL at node \\(${nm(S[0])}\\)</b>: \\(\\sum I_{out} = 0\\). Current <b>leaving</b> through a resistor = (this node voltage − the far-end voltage)/R; a current source enters as its value: pointing out +, pointing in −`)
        : tt(`<b>KCL ที่โนด \\(${nm(S[0])}\\)</b>: \\(\\sum I_{out} = 0\\)`, `<b>KCL at node \\(${nm(S[0])}\\)</b>: \\(\\sum I_{out} = 0\\)`);
      firstK = false;
      steps.push({ kind: 'kcl', nets: S, html: `<div class="why">${why}</div>` + tx(kclBlock(K, e), true) + lcdNote(K) + (K.T2 ? `<div class="sub2">${tt('บรรทัดที่สองแทนค่าแรงดันโนดที่รู้แล้ว (โนดอ้างอิง = 0)', 'The second line puts in the node voltages already known (reference = 0)')}</div>` : ''), glow, arrows });
    } else {
      const cEqs = g.src.map(s => { const pos = s.na, negN = s.nb; const c = unknown.map(() => F(0)); c[unknown.indexOf(pos)] = F(1); c[unknown.indexOf(negN)] = F(-1); return { src: s, e: ALG.eq(c, s.val, `(${++ne})`) }; });
      cEqs.forEach(x => eqs.push(x.e));
      let h = `<div class="why">${tt(`<b>KCL รอบซูเปอร์โนด</b> (เส้นประสีเหลือง ล้อม \\(${S.map(nm).join(',\\ ')}\\) และแหล่งจ่าย): รวมกระแสที่ไหล<b>ออกจากเส้นประ</b> = 0 กระแสในแหล่งจ่ายแรงดันอยู่ข้างใน จึงไม่ต้องรู้ค่า`, `<b>KCL round the supernode</b> (yellow dashed line round \\(${S.map(nm).join(',\\ ')}\\) and the source): the currents <b>leaving the dashed line</b> add to zero. The current in the voltage source stays inside, so we never need it`)}</div>` + tx(kclBlock(K, e), true) + lcdNote(K);
      if (internal.filter(x => x.type !== 'V').length) h += `<div class="sub2">${tt(`${internal.filter(x => x.type !== 'V').map(elName).join(', ')} อยู่ภายในเส้นประทั้งสองปลาย: กระแสเข้าและออกหักล้างกัน จึงไม่ปรากฏในสมการ`, `${internal.filter(x => x.type !== 'V').map(elName).join(', ')} has both ends inside the dashed line: its current goes in and out, so it drops out`)}</div>`;
      h += `<div class="why" style="margin-top:8px">${tt('<b>สมการเงื่อนไข</b> (KVL ผ่านแหล่งจ่าย: ขั้ว + ลบขั้ว − = แรงดันแหล่งจ่าย)', '<b>Constraint equation</b> (KVL through the source: + side minus − side = source voltage)')}</div>` +
        tx(al(cEqs.map(x => `${nm(x.src.na)} - ${nm(x.src.nb)} &= ${x.src.val.tex()} ${SEP()} \\textcolor{#e8590c}{${x.e.label}}`)), true);
      // the instructor's route: KCL at each node with the unknown source current, then add (two-node supernodes)
      if (S.length === 2 && g.src.length === 1) {
        const s = g.src[0]; const a = s.na, b = s.nb; const Ta = kclTerms([a], true).terms, Tb = kclTerms([b], true).terms;
        const la = ([...Ta.map(t => t.kind === 'R' ? { s: 1, b: termR(t, true) } : { s: t.leaving ? 1 : -1, b: par(t.I) }), { s: 1, b: 'i_s' }]);
        const lb = ([...Tb.map(t => t.kind === 'R' ? { s: 1, b: termR(t, true) } : { s: t.leaving ? 1 : -1, b: par(t.I) }), { s: -1, b: 'i_s' }]);
        h += `<details class="alt"><summary>${tt('วิธีในเฉลยของอาจารย์: KCL ทีละโนดแล้วนำมารวมกัน', 'The route in the instructor\'s solutions: KCL at each node, then add')}</summary>` +
          `<div class="sub2">${tt(`ให้ \\(i_s\\) คือกระแสที่ไหลจากโนด \\(${nm(a)}\\) เข้าแหล่งจ่าย ${elName(s)} ไปโนด \\(${nm(b)}\\) (ไม่รู้ค่า)`, `Let \\(i_s\\) be the unknown current from node \\(${nm(a)}\\) through the ${elName(s)} source to node \\(${nm(b)}\\)`)}</div>` +
          tx(al([row(la, '0', '', `\\text{KCL } ${nm(a)}:\\quad `), row(lb, '0', '', `\\text{KCL } ${nm(b)}:\\quad `)]), true) +
          `<div class="sub2">${tt('บวกสองสมการ: \\(+i_s\\) กับ \\(-i_s\\) หักล้างกัน (และตัวต้านทานที่อยู่ระหว่างสองโนดก็หักล้างกัน) ได้สมการซูเปอร์โนดข้างบนพอดี', 'Add the two: \\(+i_s\\) and \\(-i_s\\) cancel (and so does any resistor between the two nodes), leaving exactly the supernode equation above')}</div></details>`;
      }
      steps.push({ kind: 'super', nets: S, src: g.src.map(s => s.id), html: h, glow, arrows, ell: g.src.map(s => (meta.ell || {})[s.id]).filter(Boolean) });
    }
  });
  // 3. system
  steps.push({ kind: 'system', html: `<div class="why">${tt(`<b>รวมเป็นระบบสมการ</b> ${vars.length} ตัวแปร (เรียงตัวแปรเป็นคอลัมน์)`, `<b>Collect the system</b> of ${vars.length} unknown${vars.length > 1 ? 's' : ''} (unknowns lined up in columns)`)}</div>` + tx(sysTex(eqs, vars), true) });
  // 4. solve
  const sv = ANA.solveHTML(eqs, vars, UV);
  steps.push({ kind: 'solve', html: sv.html });
  const sol = new Map(known); if (sv.sol) unknown.forEach((k, i) => sol.set(k, sv.sol[i]));
  // 5. answers
  const ansRows = [...unknown.map(k => `${nm(k)} &= ${ANA.box(sol.get(k), UV)}`), ...[...known.keys()].filter(k => k !== ref && name[k]).map(k => `${nm(k)} &= ${known.get(k).tex()}${UV}`)];
  steps.push({ kind: 'answer', solved: true, html: `<div class="why">${tt('<b>แรงดันโนดทุกจุด</b> (เทียบกับโนดอ้างอิง) ตอนนี้รู้แรงดันโนดแล้ว กระแสทุกกิ่งก็หาได้ด้วยกฎของโอห์ม: จุดเริ่มวิ่ง', '<b>Every node voltage</b> (relative to the reference). With the node voltages known, every branch current follows from Ohm\'s law: the dots start to run')}</div>` + tx(al(ansRows), true) });
  // 6. what the problem asks
  const S = { v: node => sol.get(netOf(node)), V: k => sol.get(k), name: node => name[netOf(node)], F, val: ANA.val, box: ANA.box, rows: ANA.rows, UV, UA };
  (meta.extras ? meta.extras(S) : []).forEach(x => steps.push({ kind: 'extra', solved: true, html: `<div class="why"><b>${tt(x.t[0], x.t[1])}</b></div>` + (x.note ? `<div class="sub2">${tt(x.note[0], x.note[1])}</div>` : '') + tx(x.tex, true), glow: x.glow || [] }));
  return { method: 'nodal', T, ref, name, tag, known, unknown, vars, groups, cons, eqs, sol, steps, netOf, els, S,
    solvedAt: steps.findIndex(s => s.kind === 'answer') + 1, unit: 'V' };
};

/* ---------------- planar faces of the drawing ---------------- */
const inPoly = (pt, poly) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j];
  if ((a[1] > pt[1]) !== (b[1] > pt[1]) && pt[0] < (b[0] - a[0]) * (pt[1] - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; };
ANA.inPoly = inPoly;
/* half-edges a→b and b→a for every part; the face to the right of each half-edge (screen coordinates, y down) is traced by
   turning as sharply right as possible at every node. Inner faces come out clockwise (positive shoelace area) = meshes. */
ANA.faces = ckt => {
  const P = n => ckt.nodes[n]; const H = [], out = {};
  ckt.parts.forEach(p => { if (p.type === 'VM' || (p.type === 'S' && !p.closed) || p.topo === false) return;
    const pts = [P(p.a), ...(p.pts || []), P(p.b)]; const h0 = { part: p, from: p.a, to: p.b, pts }, h1 = { part: p, from: p.b, to: p.a, pts: pts.slice().reverse() };
    h0.twin = h1; h1.twin = h0;
    [h0, h1].forEach(h => { h.ang = Math.atan2(h.pts[1][1] - h.pts[0][1], h.pts[1][0] - h.pts[0][0]); (out[h.from] = out[h.from] || []).push(h); H.push(h); }); });
  H.forEach(h => { const back = h.twin.ang; let best = h.twin, bd = Infinity;
    (out[h.to] || []).forEach(g => { if (g === h.twin) return; let d = back - g.ang; while (d <= 1e-9) d += 2 * Math.PI; while (d > 2 * Math.PI + 1e-9) d -= 2 * Math.PI; if (d < bd) { bd = d; best = g; } });
    h.next = best; });
  const faces = [], seen = new Set();
  H.forEach(h => { if (seen.has(h)) return; const f = { hs: [] }; let g = h; while (!seen.has(g)) { seen.add(g); g.face = f; f.hs.push(g); g = g.next; } faces.push(f); });
  faces.forEach(f => { const poly = []; f.hs.forEach(h => h.pts.slice(0, -1).forEach(q => poly.push(q))); f.poly = poly; let A = 0;
    for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length]; A += a[0] * b[1] - b[0] * a[1]; } f.area = A / 2; });
  return { faces, inner: faces.filter(f => f.area > 1e-9), H };
};
/* polygon shifted inward by d (poly clockwise on screen); used to draw a mesh or supermesh path just inside its boundary */
ANA.inset = (poly, d) => {
  const q = poly.filter((p, i) => { const r = poly[(i + 1) % poly.length]; return Math.hypot(p[0] - r[0], p[1] - r[1]) > 1e-9; }); const n = q.length; const out = [];
  for (let i = 0; i < n; i++) { const p0 = q[(i - 1 + n) % n], p1 = q[i], p2 = q[(i + 1) % n];
    const l1 = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) || 1, l2 = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) || 1;
    const n1 = [-(p1[1] - p0[1]) / l1, (p1[0] - p0[0]) / l1], n2 = [-(p2[1] - p1[1]) / l2, (p2[0] - p1[0]) / l2];
    const k = Math.max(0.2, 1 + n1[0] * n2[0] + n1[1] * n2[1]); out.push([p1[0] + (n1[0] + n2[0]) / k * d, p1[1] + (n1[1] + n2[1]) / k * d]); }
  return out;
};

/* ---------------- mesh analysis ---------------- */
ANA.mesh = (ckt, meta = {}) => {
  const G = ANA.faces(ckt); const T = ckt.topology({ loops: false });
  const meshes = (meta.meshes || []).map((m, idx) => { const f = G.inner.filter(f => inPoly(m.at, f.poly)).sort((a, b) => a.area - b.area)[0];
    if (!f) throw new Error('mesh: no mesh at ' + m.at); if (f.mesh) throw new Error('mesh: two names for one mesh at ' + m.at); f.mesh = { ...m, idx, f }; return f.mesh; });
  G.inner.forEach(f => { if (!f.mesh) throw new Error('mesh: unnamed mesh near ' + JSON.stringify(f.poly[0])); });
  const meshOf = h => (h.face && h.face.mesh) || null;
  const isEl = p => !['W', 'A', 'S'].includes(p.type);
  const pn = p => p.name || p.id;
  /* a current source on the outer edge fixes its mesh */
  const known = new Map(), why = new Map();
  G.inner.forEach(f => f.hs.forEach(h => { const p = h.part; if (p.type !== 'I' || meshOf(h.twin)) return; const along = h.from === p.a;
    known.set(f.mesh, F(along ? p.value : -p.value)); why.set(f.mesh, { kind: 'edge', p, along }); }));
  /* current sources shared by two meshes (taken once, along the arrow): i_m − i_o = I */
  const shared = []; G.H.forEach(h => { const p = h.part; if (p.type !== 'I' || h.from !== p.a) return; const m = meshOf(h), o = meshOf(h.twin); if (m && o) shared.push({ p, m, o }); });
  for (let ch = true; ch;) { ch = false; shared.forEach(s => { const km = known.has(s.m), ko = known.has(s.o);
    if (km && !ko) { known.set(s.o, known.get(s.m).sub(FX(s.p.value))); why.set(s.o, { kind: 'via', s }); ch = true; }
    else if (ko && !km) { known.set(s.m, known.get(s.o).add(FX(s.p.value))); why.set(s.m, { kind: 'via', s }); ch = true; } }); }
  const unknown = meshes.filter(m => !known.has(m)); const vars = unknown.map(m => m.n);
  const gp = new Map(unknown.map(m => [m, m])); const gf = m => { while (gp.get(m) !== m) m = gp.get(m); return m; };
  const cons = shared.filter(s => !known.has(s.m) && !known.has(s.o));
  cons.forEach(s => { const a = gf(s.m), b = gf(s.o); if (a !== b) gp.set(a, b); });
  const groups = []; unknown.forEach(m => { const r = gf(m); let g = groups.find(x => x.root === r); if (!g) groups.push(g = { root: r, ms: [], src: [] }); g.ms.push(m); });
  cons.forEach(s => groups.find(g => g.root === gf(s.m)).src.push(s));
  /* boundary of a set of faces, clockwise, starting at its bottom-left node */
  const P = n => ckt.nodes[n];
  const boundary = fs => { const set = new Set(fs); const inB = h => set.has(h.face) && !set.has(h.twin.face);
    const all = []; fs.forEach(f => f.hs.forEach(h => { if (inB(h)) all.push(h); }));
    let start = all[0]; all.forEach(h => { const a = P(h.from), b = P(start.from); if (a[1] > b[1] + 1e-9 || (Math.abs(a[1] - b[1]) < 1e-9 && a[0] < b[0] - 1e-9)) start = h; });
    const seq = []; let h = start;
    for (let k = 0; k <= all.length + 2; k++) { seq.push(h); let g = h.next, n = 0; while (!inB(g) && n++ < 60) g = g.twin.next; h = g; if (h === start) break; }
    const poly = []; seq.forEach(x => x.pts.slice(0, -1).forEach(q => poly.push(q)));
    return { seq, poly }; };
  const coefTex = (R, body, single) => { if (R.isInt) return `${R.n}${single ? '' : '('}${body}${single ? '' : ')'}`; const Gc = F(1).div(R);
    if (Gc.isInt) return `\\frac{${body}}{${Gc.n}}`; return `${finiteDec(R) ? dec(R) : R.tex()}${single ? '' : '('}${body}${single ? '' : ')'}`; };
  const kvl = seq => { const terms = [];
    seq.forEach(h => { const p = h.part; if (!isEl(p)) return; const m = h.face.mesh, o = meshOf(h.twin);
      if (p.type === 'R') terms.push({ kind: 'R', R: FX(p.value), m, o, p });
      else if (p.type === 'V') terms.push({ kind: 'V', V: FX(p.value), s: h.from === p.a ? 1 : -1, p });
      else throw new Error('mesh: element on a mesh boundary not supported here: ' + p.id); });
    const usesKnown = terms.some(t => t.kind === 'R' && t.o && known.has(t.o));
    const L = lcmAll([...terms.filter(t => t.kind === 'R').map(t => t.R), ...terms.filter(t => t.kind === 'V').map(t => t.V)]);
    const body = (t, subst) => { if (!t.o) return { b: t.m.n, single: true }; if (subst && known.has(t.o)) { const kv = known.get(t.o); return { b: kv.isZero ? t.m.n : kv.sign > 0 ? `${t.m.n} - ${kv.tex()}` : `${t.m.n} + ${kv.abs().tex()}`, single: kv.isZero }; } return { b: `${t.m.n} - ${t.o.n}`, single: false }; };
    const line = subst => terms.map(t => { if (t.kind === 'V') return { s: t.s, b: t.V.tex() }; const x = body(t, subst); return { s: 1, b: coefTex(t.R, x.b, x.single) }; });
    const T1 = line(false), T2 = usesKnown ? line(true) : null;
    let T3 = null;
    if (L > 1) T3 = terms.map(t => { if (t.kind === 'V') { const v = t.V.mul(L); return { s: t.s, b: v.tex() }; } const m = t.R.mul(L), x = body(t, true), mt = m.eq(1) ? '' : m.tex(); return { s: 1, b: x.single ? `${mt}${x.b}` : `${mt}(${x.b})` }; });
    const c = unknown.map(() => F(0)); let k0 = F(0);
    const add = (mm, r) => { const i = unknown.indexOf(mm); if (i >= 0) c[i] = c[i].add(r); else k0 = k0.add(r.mul(known.get(mm))); };
    terms.forEach(t => { if (t.kind === 'V') k0 = k0.add(t.V.mul(t.s)); else { add(t.m, t.R); if (t.o) add(t.o, t.R.neg()); } });
    return { terms, T1, T2, T3, L, c: c.map(x => x.mul(L)), r: k0.mul(L).neg() };
  };
  const kvlBlock = (K, e) => al([row(K.T1, '0'), ...(K.T2 ? [row(K.T2, '0')] : []), ...(K.T3 ? [row(K.T3, '0', NARROW() ? '' : ` ${SEP()} (\\times ${K.L})`)] : []), eqLine(e, vars)]);
  const steps = [], eqs = []; let ne = 0;
  // 1. setup
  {
    let h = `<div class="why">${tt('<b>เตรียม</b>: นับเมช ตั้งกระแสเมชตามเข็มนาฬิกา และดูแหล่งจ่ายกระแส', '<b>Set up</b>: count the meshes, give each a clockwise mesh current, and look at the current sources')}</div><ul class="ul2">`;
    h += `<li>${tt(`กิ่ง B = ${T.b}, โนด N = ${T.n} → จำนวนเมช <b>M = B − N + 1 = ${T.meshes}</b> (ช่องว่างในรูปวงจรที่ไม่มีลูปอื่นอยู่ข้างใน)`, `Branches B = ${T.b}, nodes N = ${T.n} → number of meshes <b>M = B − N + 1 = ${T.meshes}</b> (the window panes of the drawing)`)}</li>`;
    h += `<li>${tt(`กระแสเมช \\(${meshes.map(m => m.n).join(',\\ ')}\\) วนตามเข็มนาฬิกาทุกตัว กิ่งที่อยู่ระหว่างสองเมชมีกระแสเป็น<b>ผลต่าง</b>ของกระแสเมชสองตัว`, `Mesh currents \\(${meshes.map(m => m.n).join(',\\ ')}\\), all clockwise. A branch shared by two meshes carries the <b>difference</b> of the two mesh currents`)}</li>`;
    meshes.filter(m => known.has(m)).forEach(m => { const w = why.get(m);
      if (w.kind === 'edge') h += `<li>${tt(`แหล่งจ่าย ${pn(w.p)} อยู่บนขอบนอกของเมช \\(${m.n}\\) เพียงเมชเดียว ${w.along ? 'และชี้ตามทิศของ' : 'แต่ชี้สวนทิศของ'} \\(${m.n}\\) → <b>\\(${m.n} = ${known.get(m).tex()}\\ \\text{A}\\)</b> ไม่ต้องเขียน KVL รอบเมชนี้`, `The ${pn(w.p)} source lies on the outer edge of mesh \\(${m.n}\\) only and points ${w.along ? 'with' : 'against'} \\(${m.n}\\) → <b>\\(${m.n} = ${known.get(m).tex()}\\ \\text{A}\\)</b>, no KVL for this mesh`)}</li>`;
      else h += `<li>${tt(`แหล่งจ่าย ${pn(w.s.p)} อยู่ระหว่างเมชที่รู้ค่าแล้วกับ \\(${m.n}\\) → <b>\\(${m.n} = ${known.get(m).tex()}\\ \\text{A}\\)</b>`, `The ${pn(w.s.p)} source sits between a known mesh and \\(${m.n}\\) → <b>\\(${m.n} = ${known.get(m).tex()}\\ \\text{A}\\)</b>`)}</li>`; });
    groups.filter(g => g.ms.length > 1).forEach(g => { h += `<li>${tt(`แหล่งจ่าย ${g.src.map(s => pn(s.p)).join(', ')} อยู่ระหว่างเมช \\(${g.ms.map(m => m.n).join('\\) กับ \\(')}\\) → รวมเป็น<b>ซูเปอร์เมช</b> (KVL รอบนอกหนึ่งสมการ + สมการเงื่อนไข)`, `The ${g.src.map(s => pn(s.p)).join(', ')} source is shared by meshes \\(${g.ms.map(m => m.n).join('\\) and \\(')}\\) → join them into a <b>supermesh</b> (one KVL round the outside + a constraint)`)}</li>`; });
    h += `<li>${tt(`ตัวแปร: \\(${vars.join(',\\ ')}\\) → ต้องการ <b>${vars.length} สมการ</b>${cons.length ? ` = KVL ${groups.length} + เงื่อนไข ${cons.length}` : ''}`, `Unknowns: \\(${vars.join(',\\ ')}\\) → we need <b>${vars.length} equation${vars.length > 1 ? 's' : ''}</b>${cons.length ? ` = ${groups.length} KVL + ${cons.length} constraint${cons.length > 1 ? 's' : ''}` : ''}`)}</li></ul>`;
    steps.push({ kind: 'setup', html: h, glow: [...[...why.values()].map(w => (w.p || w.s.p).id), ...cons.map(s => s.p.id)], reveal: 'known' });
  }
  // 2. KVL per mesh / supermesh
  let firstK = true;
  groups.forEach(g => {
    const fs = g.ms.map(m => m.f); const B = boundary(fs); const K = kvl(B.seq);
    const e = ALG.eq(K.c, K.r, `(${++ne})`); eqs.push(e);
    const glow = K.terms.map(t => t.p.id);
    if (g.ms.length === 1) {
      const m = g.ms[0];
      const why = firstK ? tt(`<b>KVL รอบเมช \\(${m.n}\\)</b>: \\(\\sum V = 0\\) เดินตามเข็มนาฬิกาเริ่มที่มุมล่างซ้าย ตัวต้านทาน: R×(กระแสเมชนี้ − กระแสเมชข้างเคียง) แหล่งจ่ายแรงดัน: เข้าขั้ว + ก่อน เขียน +V เข้าขั้ว − ก่อน เขียน −V`, `<b>KVL round mesh \\(${m.n}\\)</b>: \\(\\sum V = 0\\), walking clockwise from the bottom-left corner. Resistor: R × (this mesh current − the neighbouring mesh current). Voltage source: enter at + first, write +V; enter at − first, write −V`)
        : tt(`<b>KVL รอบเมช \\(${m.n}\\)</b>: \\(\\sum V = 0\\)`, `<b>KVL round mesh \\(${m.n}\\)</b>: \\(\\sum V = 0\\)`);
      firstK = false;
      steps.push({ kind: 'kvl', ms: [m], html: `<div class="why">${why}</div>` + tx(kvlBlock(K, e), true) + lcdNote(K) + (K.T2 ? `<div class="sub2">${tt('บรรทัดที่สองแทนกระแสเมชที่รู้ค่าแล้ว', 'The second line puts in the mesh currents already known')}</div>` : ''), glow, outline: B.poly, color: m.idx });
    } else {
      const cEqs = g.src.map(s => { const c = unknown.map(() => F(0)); c[unknown.indexOf(s.m)] = F(1); c[unknown.indexOf(s.o)] = F(-1); return { s, e: ALG.eq(c, FX(s.p.value), `(${++ne})`) }; });
      cEqs.forEach(x => eqs.push(x.e));
      const inside = []; fs.forEach(f => f.hs.forEach(h => { if (fs.includes(h.twin.face) && isEl(h.part) && h.part.type !== 'I' && h.from === h.part.a) inside.push(pn(h.part)); }));
      let h = `<div class="why">${tt(`<b>KVL รอบซูเปอร์เมช</b> \\(${g.ms.map(m => m.n).join(' + ')}\\) (เส้นประสีเหลือง): เดินรอบขอบนอกของสองเมชรวมกัน <b>ไม่ผ่านแหล่งจ่ายกระแส</b> เพราะไม่รู้แรงดันคร่อมมัน`, `<b>KVL round the supermesh</b> \\(${g.ms.map(m => m.n).join(' + ')}\\) (yellow dashed path): walk the outer edge of the two meshes together, <b>never through the current source</b>, whose voltage we do not know`)}</div>` + tx(kvlBlock(K, e), true) + lcdNote(K);
      if (inside.length) h += `<div class="sub2">${tt(`${inside.join(', ')} อยู่ในกิ่งเดียวกับแหล่งจ่ายกระแส (ภายในซูเปอร์เมช) จึงไม่อยู่บนทางเดิน`, `${inside.join(', ')} sits in the current-source branch (inside the supermesh), so it is not on the path`)}</div>`;
      h += `<div class="why" style="margin-top:8px">${tt('<b>สมการเงื่อนไข</b>: กระแสในกิ่งของแหล่งจ่าย = ผลต่างของกระแสเมชสองข้าง (เมชที่วนตามลูกศรเป็นตัวตั้ง)', '<b>Constraint equation</b>: the current in the source branch = the difference of the two mesh currents (the mesh running with the arrow comes first)')}</div>` + tx(al(cEqs.map(x => `${x.s.m.n} - ${x.s.o.n} &= ${FX(x.s.p.value).tex()} ${SEP()} \\textcolor{#e8590c}{${x.e.label}}`)), true);
      steps.push({ kind: 'super', ms: g.ms, html: h, glow, outline: B.poly, src: g.src.map(s => s.p.id), color: -1 });
    }
  });
  steps.push({ kind: 'system', html: `<div class="why">${tt(`<b>รวมเป็นระบบสมการ</b> ${vars.length} ตัวแปร`, `<b>Collect the system</b> of ${vars.length} unknown${vars.length > 1 ? 's' : ''}`)}</div>` + tx(sysTex(eqs, vars), true) });
  const sv = ANA.solveHTML(eqs, vars, UA);
  steps.push({ kind: 'solve', html: sv.html });
  const sol = new Map(known); if (sv.sol) unknown.forEach((m, i) => sol.set(m, sv.sol[i]));
  const ansRows = meshes.map(m => known.has(m) ? `${m.n} &= ${known.get(m).tex()}${UA}` : `${m.n} &= ${ANA.box(sol.get(m), UA)}`);
  steps.push({ kind: 'answer', solved: true, html: `<div class="why">${tt('<b>กระแสเมชทุกตัว</b> ค่าติดลบแปลว่าวนทวนเข็มนาฬิกาจริง กระแสในกิ่งที่ใช้ร่วม = ผลต่างของกระแสเมช: จุดเริ่มวิ่ง', '<b>Every mesh current</b>. A negative value means it really circulates anticlockwise. A shared branch carries the difference of its mesh currents: the dots start to run')}</div>` + tx(al(ansRows), true) });
  const byName = n => meshes.find(m => m.n === n);
  const S = { i: n => sol.get(byName(n)), F, val: ANA.val, box: ANA.box, rows: ANA.rows, UV, UA };
  (meta.extras ? meta.extras(S) : []).forEach(x => steps.push({ kind: 'extra', solved: true, html: `<div class="why"><b>${tt(x.t[0], x.t[1])}</b></div>` + (x.note ? `<div class="sub2">${tt(x.note[0], x.note[1])}</div>` : '') + tx(x.tex, true), glow: x.glow || [] }));
  return { method: 'mesh', T, G, meshes, known, unknown, vars, groups, cons, eqs, sol, steps, S, boundary,
    solvedAt: steps.findIndex(s => s.kind === 'answer') + 1, unit: 'A' };
};

global.ANA = ANA;
})(window);
