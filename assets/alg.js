/* alg.js — exact arithmetic and LaTeX builders for chapter 1:
   rationals (Frac), linear equations, step-by-step elimination / substitution, determinants (with the Sarrus terms
   in the same order as the course slides), Cramer's rule, and parsing/formatting of complex numbers. */
(function (global) {
'use strict';
const ALG = {};

/* ---------------- rationals ---------------- */
const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) { [a, b] = [b, a % b]; } return a || 1; };
const lcm = (a, b) => Math.abs(a * b) / gcd(a, b);
ALG.gcd = gcd; ALG.lcm = lcm;
class Frac {
  constructor(n, d = 1) { if (d < 0) { n = -n; d = -d; } const g = gcd(n, d); this.n = n / g; this.d = d / g; if (this.n === 0) this.d = 1; }
  static of(x) { if (x instanceof Frac) return x; if (Number.isInteger(x)) return new Frac(x, 1);
    // decimals with up to 6 places become exact fractions
    const s = 1e6; return new Frac(Math.round(x * s), s); }
  add(b) { b = Frac.of(b); return new Frac(this.n * b.d + b.n * this.d, this.d * b.d); }
  sub(b) { b = Frac.of(b); return new Frac(this.n * b.d - b.n * this.d, this.d * b.d); }
  mul(b) { b = Frac.of(b); return new Frac(this.n * b.n, this.d * b.d); }
  div(b) { b = Frac.of(b); return new Frac(this.n * b.d, this.d * b.n); }
  neg() { return new Frac(-this.n, this.d); }
  abs() { return new Frac(Math.abs(this.n), this.d); }
  get isZero() { return this.n === 0; } get isInt() { return this.d === 1; } get sign() { return Math.sign(this.n); }
  eq(b) { b = Frac.of(b); return this.n === b.n && this.d === b.d; }
  valueOf() { return this.n / this.d; }
  toString() { return this.d === 1 ? String(this.n) : `${this.n}/${this.d}`; }
  /* LaTeX: integer, or \frac (sign in front) */
  tex() { if (this.d === 1) return String(this.n); return (this.n < 0 ? '-' : '') + `\\tfrac{${Math.abs(this.n)}}{${this.d}}`; }
}
ALG.Frac = Frac;
const F = x => Frac.of(x);
ALG.F = F;
/* number for display: exact fraction plus decimal when not an integer */
ALG.texNum = (q, dec = 4) => { q = F(q); if (q.isInt) return String(q.n); const v = +q; return `${q.tex()} \\approx ${fmtDec(v, dec)}`; };
function fmtDec(v, dec = 4) { let s = v.toFixed(dec); if (s.includes('.')) s = s.replace(/0+$/, '').replace(/\.$/, ''); if (s === '-0') s = '0'; return s; }
ALG.fmtDec = fmtDec;

/* ---------------- linear equations ---------------- */
/* eq = { c: [Frac...], r: Frac, label: '(1)' } ; vars = ['x','y'] or ['I_1','I_2'] */
ALG.eq = (c, r, label) => ({ c: c.map(F), r: F(r), label });
ALG.combine = (e1, m1, e2, m2, label) => ({ c: e1.c.map((x, i) => x.mul(m1).add(e2.c[i].mul(m2))), r: e1.r.mul(m1).add(e2.r.mul(m2)), label });
ALG.scale = (e, m) => ({ c: e.c.map(x => x.mul(m)), r: e.r.mul(m), label: e.label });
/* one equation as LaTeX, e.g. -x + y + 2z = 1 */
ALG.texEq = (e, vars, o = {}) => {
  let s = '', first = true;
  e.c.forEach((q, i) => { if (q.isZero) return; const mag = q.abs(); const coef = mag.eq(1) ? '' : (mag.isInt ? String(mag.n) : mag.tex());
    const term = (o.col && o.col[i] ? `\\textcolor{${o.col[i]}}{${coef}${vars[i]}}` : `${coef}${vars[i]}`);
    s += first ? (q.sign < 0 ? '-' : '') + term : (q.sign < 0 ? ' - ' : ' + ') + term; first = false; });
  if (first) s = '0';
  return s + ' = ' + e.r.tex() + (o.label && e.label ? `\\qquad ${e.label}` : '');
};
/* aligned rows for an elimination step: rows = [{e, tag}], hline before the last row. cancel = variable index to strike */
ALG.texStack = (rows, vars, o = {}) => {
  const n = vars.length; const used = vars.map((_, i) => rows.some(r => !r.e.c[i].isZero));
  let colspec = ''; for (let i = 0; i < n; i++) if (used[i]) colspec += 'rr'; colspec += 'cr' + 'l';
  const lines = rows.map((row, k) => {
    const cells = []; let first = true;
    for (let i = 0; i < n; i++) { if (!used[i]) continue; const q = row.e.c[i];
      if (q.isZero) { cells.push('', ''); continue; }
      const mag = q.abs(); const coef = mag.eq(1) ? '' : (mag.isInt ? String(mag.n) : mag.tex()); let term = `${coef}${vars[i]}`;
      const isLast = k === rows.length - 1 && !o.noLine; const strike = o.cancel === i && !isLast;
      if (strike) term = `\\textcolor{#d6336c}{\\cancel{${term}}}`; else if (o.hi && o.hi[i]) term = `\\textcolor{${o.hi[i]}}{${term}}`;
      cells.push(first ? (q.sign < 0 ? '-' : '') : (q.sign < 0 ? '-' : '+'), term); first = false; }
    cells.push('=', row.e.r.tex(), row.tag ? `\\quad ${row.tag.replace(/×/g, '\\times ').replace(/−/g, '-')}` : '');
    return (k === rows.length - 1 && rows.length > 1 && !o.noLine ? '\\hline ' : '') + cells.join(' & ');
  });
  return `\\begin{array}{${colspec}} ${lines.join(' \\\\ ')} \\end{array}`;
};
/* a system of equations with the unknowns lined up in columns: rows = [eq...] (labels from eq.label) */
ALG.texSystem = (eqs, vars, o = {}) => ALG.texStack(eqs.map(e => ({ e, tag: o.labels === false ? '' : (e.label || '') })), vars, { ...o, noLine: true });
/* signed sum of terms [[Frac|number, 'x' or ''], ...] → "-2I_1 - 36 + 15I_1" (zero terms skipped) */
ALG.texTerms = terms => { let s = ''; terms.forEach(([q, v]) => { q = F(q); if (q.isZero) return; const mag = q.abs(); const coef = (mag.eq(1) && v) ? '' : mag.tex();
    s += s ? (q.sign < 0 ? ' - ' : ' + ') + coef + v : (q.sign < 0 ? '-' : '') + coef + v; }); return s || '0'; };
/* "a - b" with the sign of b folded in: texMinus(12, 10) → "12 - 10", texMinus(12, -10) → "12 + 10" */
ALG.texMinus = (a, b) => { a = F(a); b = F(b); if (b.isZero) return a.tex(); return `${a.tex()} ${b.sign < 0 ? '+' : '-'} ${b.abs().tex()}`; };
/* boxed final value with an optional unit (LaTeX), e.g. ALG.texBoxed(F(-1), '\\,\\text{A}') */
ALG.texBoxed = (q, unit = '') => { q = F(q); const v = q.isInt ? String(q.n) : `${q.tex()} \\approx ${fmtDec(+q, 4)}`; return `\\boxed{${v}${unit}}`; };
/* "2×(1) − (4)" style label for m1·(e1) + m2·(e2) */
ALG.opLabel = (m1, l1, m2, l2) => { const part = (m, l, first) => { const a = Math.abs(+m); const k = a === 1 ? '' : (F(a).isInt ? a : F(a).tex()) + '\\times';
    return (first ? (+m < 0 ? '-' : '') : (+m < 0 ? ' - ' : ' + ')) + k + l; }; return part(m1, l1, true) + part(m2, l2, false); };
/* integer multipliers that eliminate variable v from e1, e2: m1·e1 + m2·e2 has zero coefficient on v */
ALG.elimMult = (e1, e2, v) => { const a = e1.c[v], b = e2.c[v];
  // make both integer first
  const den = lcm(a.d, b.d); const A = a.n * (den / a.d), B = b.n * (den / b.d); const g = gcd(A, B);
  let m1 = B / g, m2 = -A / g; if (m1 < 0) { m1 = -m1; m2 = -m2; } return [m1, m2]; };
/* solve one-variable equation coef·x = r */
ALG.solveOne = e => { const i = e.c.findIndex(q => !q.isZero); return { v: i, val: e.r.div(e.c[i]) }; };
/* back-substitution text: put known values into e, solve for the remaining unknown */
ALG.backSub = (e, vars, known) => {
  // LaTeX of e with known values in brackets
  let s = '', first = true, rest = F(0), u = -1;
  e.c.forEach((q, i) => { if (q.isZero) return; const mag = q.abs(); const coef = mag.eq(1) ? '' : (mag.isInt ? String(mag.n) : mag.tex());
    const term = known[i] !== undefined ? `${coef === '' ? '' : coef}(${F(known[i]).tex()})` : `${coef}${vars[i]}`;
    s += first ? (q.sign < 0 ? '-' : '') + term : (q.sign < 0 ? ' - ' : ' + ') + term; first = false;
    if (known[i] !== undefined) rest = rest.add(q.mul(known[i])); else u = i; });
  const lhs = s + ' = ' + e.r.tex();
  if (u < 0) return { tex: lhs, v: -1 };
  const cu = e.c[u]; const rhs = e.r.sub(rest); const val = rhs.div(cu);
  const cuTex = cu.eq(1) ? '' : (cu.eq(-1) ? '-' : cu.tex());
  const mid = cuTex + vars[u] + ' = ' + rhs.tex();
  // aligned chain:  lhs &= r  \\  c·u &= r − rest = rhs  \\  u &= rhs/c = val
  const chain = unit => { const L = [`${s} &= ${e.r.tex()}`];
    if (!rest.isZero || !cu.eq(1)) L.push(`${cuTex}${vars[u]} &= ${rest.isZero ? rhs.tex() : `${ALG.texMinus(e.r, rest)} = ${rhs.tex()}`}`);
    if (!cu.eq(1)) L.push(`${vars[u]} &= \\frac{${rhs.tex()}}{${cu.tex()}} = ${ALG.texBoxed(val, unit)}`); else L[L.length - 1] = L[L.length - 1].replace(/ = ([^=]*)$/, (m, g) => ` = ${ALG.texBoxed(val, unit)}`);
    return `\\begin{aligned} ${L.join(' \\\\ ')} \\end{aligned}`; };
  return { tex: lhs, mid, v: u, val, chain };
};
/* full 2×2 elimination: returns steps [{kind, ...}] */
ALG.elim2 = (E1, E2, vars) => {
  const steps = [];
  // eliminate the variable that needs the smaller multipliers
  const cost = v => { const [m1, m2] = ALG.elimMult(E1, E2, v); return Math.abs(m1) + Math.abs(m2); };
  const v = cost(0) <= cost(1) ? 0 : 1; const keep = 1 - v;
  const [m1, m2] = ALG.elimMult(E1, E2, v); const E3 = ALG.combine(E1, m1, E2, m2, '(3)');
  steps.push({ kind: 'combine', m1, m2, a: E1, b: E2, res: E3, elim: v, op: ALG.opLabel(m1, '(1)', m2, '(2)') });
  if (E3.c[keep].isZero) { steps.push({ kind: 'singular', res: E3 }); return { steps, ok: false }; }
  const s1 = ALG.solveOne(E3); steps.push({ kind: 'solve', e: E3, v: s1.v, val: s1.val });
  // back-substitute into the simpler original equation (one with a non-zero coefficient on v, smaller numbers)
  const pick = [E1, E2].filter(e => !e.c[v].isZero).sort((a, b) => (Math.abs(+a.c[0]) + Math.abs(+a.c[1])) - (Math.abs(+b.c[0]) + Math.abs(+b.c[1])))[0];
  const known = {}; known[keep] = s1.val; const bs = ALG.backSub(pick, vars, known);
  steps.push({ kind: 'back', e: pick, v: bs.v, val: bs.val, tex: bs.tex, mid: bs.mid, chain: bs.chain });
  const sol = []; sol[keep] = s1.val; sol[v] = bs.val;
  return { steps, ok: true, sol };
};
/* 2×2 substitution: isolate the variable with the smallest |coefficient| */
ALG.subst2 = (E1, E2, vars) => {
  let best = null; [[E1, E2, '(1)', '(2)'], [E2, E1, '(2)', '(1)']].forEach(([A, B, la, lb]) => [0, 1].forEach(v => { const q = A.c[v]; if (q.isZero) return; const sc = Math.abs(+q) + (q.isInt ? 0 : 5);
    if (!best || sc < best.sc) best = { A, B, la, lb, v, sc }; }));
  const { A, B, la, lb, v } = best; const o = 1 - v;
  // v = (r_A - c_Ao · o) / c_Av
  const k0 = A.r.div(A.c[v]), k1 = A.c[o].div(A.c[v]).neg(); // v = k0 + k1·o
  const expr = linTex(k0, k1, vars[o]);
  // substitute into B: c_Bv (k0 + k1 o) + c_Bo o = r_B
  const co = B.c[v].mul(k1).add(B.c[o]); const rr = B.r.sub(B.c[v].mul(k0));
  // isolate:  c_v v = r − c_o o  →  v = expr
  const moved = ALG.texTerms([[A.r, ''], [A.c[o].neg(), vars[o]]]);
  // plug: c_Bo o + c_Bv (expr) = r_B  →  c_Bo o + c_Bv k0 + c_Bv k1 o = r_B  →  co o = r_B − c_Bv k0
  const expanded = (o < v ? [[B.c[o], vars[o]], [B.c[v].mul(k0), ''], [B.c[v].mul(k1), vars[o]]] : [[B.c[v].mul(k0), ''], [B.c[v].mul(k1), vars[o]], [B.c[o], vars[o]]]);
  const steps = [{ kind: 'isolate', from: la, v, expr, A, moved },
                 { kind: 'plug', into: lb, v, o, B, expr, co, rr, expandedTex: ALG.texTerms(expanded), kconst: B.c[v].mul(k0) }];
  if (co.isZero) { steps.push({ kind: 'singular' }); return { steps, ok: false }; }
  const valO = rr.div(co); steps.push({ kind: 'solveSub', o, val: valO, co, rr });
  const valV = k0.add(k1.mul(valO)); steps.push({ kind: 'backSub', v, o, k0, k1, valO, val: valV, expr });
  const sol = []; sol[v] = valV; sol[o] = valO; return { steps, ok: true, sol };
};
function linTex(k0, k1, name) { // k0 + k1·name
  let s = ''; if (!k0.isZero) s = k0.tex();
  if (!k1.isZero) { const mag = k1.abs(); const coef = mag.eq(1) ? '' : mag.tex(); s += (s ? (k1.sign < 0 ? ' - ' : ' + ') : (k1.sign < 0 ? '-' : '')) + coef + name; }
  return s || '0';
}
ALG.linTex = linTex;

/* ---------------- determinants and Cramer ---------------- */
ALG.det2 = m => m[0][0] * m[1][1] - m[0][1] * m[1][0];
/* Sarrus terms in the slide order: +a11a22a33 +a12a23a31 +a13a21a32 −a31a22a13 −a32a23a11 −a33a21a12 */
ALG.sarrus = m => {
  const T = [[+1, [0, 0], [1, 1], [2, 2]], [+1, [0, 1], [1, 2], [2, 0]], [+1, [0, 2], [1, 0], [2, 1]],
             [-1, [2, 0], [1, 1], [0, 2]], [-1, [2, 1], [1, 2], [0, 0]], [-1, [2, 2], [1, 0], [0, 1]]];
  const terms = T.map(([s, ...idx]) => ({ s, idx, f: idx.map(([r, c]) => m[r][c]), v: s * idx.reduce((p, [r, c]) => p * m[r][c], 1) }));
  return { terms, det: terms.reduce((a, t) => a + t.v, 0) };
};
ALG.det3 = m => ALG.sarrus(m).det;
ALG.replaceCol = (A, b, i) => A.map((row, r) => row.map((x, c) => c === i ? b[r] : x));
ALG.fmtN = (x, dec = 4) => { if (Math.abs(x - Math.round(x)) < 1e-9) return String(Math.round(x)).replace('-', '−'); return fmtDec(x, dec).replace('-', '−'); };

/* ---------------- complex numbers ---------------- */
const cx = (re, im = 0) => ({ re, im });
ALG.cx = cx;
ALG.cadd = (a, b) => cx(a.re + b.re, a.im + b.im);
ALG.csub = (a, b) => cx(a.re - b.re, a.im - b.im);
ALG.cmul = (a, b) => cx(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re);
ALG.cdiv = (a, b) => { const d = b.re * b.re + b.im * b.im; return cx((a.re * b.re + a.im * b.im) / d, (a.im * b.re - a.re * b.im) / d); };
ALG.cabs = a => Math.hypot(a.re, a.im);
ALG.cargd = a => Math.atan2(a.im, a.re) * 180 / Math.PI;
ALG.cpolar = (r, deg) => cx(r * Math.cos(deg * Math.PI / 180), r * Math.sin(deg * Math.PI / 180));
/* parse "3+j2", "1-j", "-j", "j110", "2j", "3∠25", "3<25", "10∠-120°", "220" (comma decimal not accepted) */
ALG.cparse = str => {
  if (str === null || str === undefined) return null; let s = String(str).replace(/\s+/g, '').replace(/°/g, '').replace(/−/g, '-').replace(/i/g, 'j');
  if (!s) return null;
  const pol = s.match(/^([+-]?[\d.]+(?:e[+-]?\d+)?)(?:∠|<|@|\/_)([+-]?[\d.]+(?:e[+-]?\d+)?)$/i);
  if (pol) { const r = parseFloat(pol[1]), a = parseFloat(pol[2]); if (!isFinite(r) || !isFinite(a)) return null; return ALG.cpolar(r, a); }
  // cartesian: split into signed terms
  const terms = s.match(/[+-]?[^+-]+/g); if (!terms || terms.join('') !== s) return null; let re = 0, im = 0;
  for (let t of terms) {
    let sign = 1; if (t[0] === '+') t = t.slice(1); else if (t[0] === '-') { sign = -1; t = t.slice(1); }
    if (t.includes('j')) { const num = t.replace('j', '').replace('*', ''); const v = num === '' ? 1 : parseFloat(num); if (!isFinite(v) || !/^[\d.]*$/.test(num)) return null; im += sign * v; }
    else { if (!/^[\d.]+(e\d+)?$/i.test(t)) return null; re += sign * parseFloat(t); }
  }
  return cx(re, im);
};
ALG.cfmt = (z, dec = 3) => { const r = fmtDec(z.re, dec), i = fmtDec(Math.abs(z.im), dec); const ii = Math.abs(z.im) < 5e-13 ? '0' : i;
  return `${r === '-0' ? '0' : r} ${z.im < 0 && ii !== '0' ? '−' : '+'} j${ii}`.replace(/^-/, '−'); };
ALG.cfmtPolar = (z, dec = 3, adec = 2) => `${fmtDec(ALG.cabs(z), dec)} ∠ ${fmtDec(ALG.cargd(z), adec).replace('-', '−')}°`;
ALG.ctex = (z, dec = 3) => { const r = fmtDec(z.re, dec), i = fmtDec(Math.abs(z.im), dec); return `${r} ${z.im < 0 ? '-' : '+'} j${i}`; };
ALG.ctexPolar = (z, dec = 3, adec = 2) => `${fmtDec(ALG.cabs(z), dec)}\\angle{${fmtDec(ALG.cargd(z), adec)}}^\\circ`;

global.ALG = ALG;
})(window);
