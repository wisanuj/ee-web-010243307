/* ch12.js — chapter 12: AC machines, the three-phase induction machine (built Oct 2026).
   Builds on ch6.js (panels, text, waves, tags), ch8.js (labels, number formats), ch10.js (arrow heads) and ch11.js (CH11.plot).
   1) currents and mmf (slide p. 4): CH12.cur, CH12.mmf; three phases give 1.5 Fm cos(θ − ωt), a field that turns at 120 f/p rpm
   2) CH12.machine: cross-section of an induction machine: frame, slotted stator with the coil sides of phases a, b, c (⊙/⊗ by the sign
      of their current), the air-gap field as a coloured band with N and S marks, a squirrel-cage or wound rotor turning at its own speed with
      the bar currents induced by the slip, the phase-axis vectors and their resultant (2 poles), and a side view of the cage or the slip rings
   3) CH12.flow: power-flow diagram with any number of stages (input → stator losses → air gap → rotor copper loss → shaft → output)
   4) CH12.modes: where the power goes in the three modes of operation (supply, air gap, rotor heat, shaft)
   5) CH12.im(par, s): the per-phase equivalent circuit of P. C. Sen §5.7 solved for one slip (currents, torque, powers) */
(function (global) {
'use strict';
const CH12 = {};
const COL = CH6.COL, T = CH6.text, fd = CH6.fd, TWO_PI = 2 * Math.PI, D2R = Math.PI / 180;
const tt = p => (p ? (Array.isArray(p) ? MC.t(p[0], p[1]) : p) : '');
CH12.COL = { a: '#ff6b6b', b: '#ffd166', c: '#5ad1ff', N: '#ffa552', S: '#c792ea', frame: '#3b4266', core: '#343b5a', edge: '#8a93b8', rotor: '#2b3150', slot: '#151a2e',
  bar: '#d29a52', shaft: '#9aa3c7', hi: 'rgba(255,126,182,.42)', hiEdge: '#ff7eb6', res: '#e8ecf7', idle: '#5b6286' };
const C12 = CH12.COL, PH = ['a', 'b', 'c'];
const rad = n => n * TWO_PI / 60, rpm = w => w * 60 / TWO_PI;
CH12.rad = rad; CH12.rpm = rpm;
CH12.ns = (f, p) => 120 * f / p;

/* =====================================================================================================================
   1) slide p. 4: ia = Im cos ωt, ib = Im cos(ωt − 120°), ic = Im cos(ωt + 120°) (per unit of Im; seq = −1 swaps b and c).
   The windings' axes are at 0°, 120° and 240° (electrical), so the air-gap mmf of the energized phases at electrical angle θ is
   Σ i_k cos(θ − 120°k), which is 1.5 cos(θ − seq·ωt) when all three carry current */
CH12.cur = (wt, seq = 1) => [Math.cos(wt), Math.cos(wt - seq * TWO_PI / 3), Math.cos(wt + seq * TWO_PI / 3)];
CH12.mmf = (th, wt, seq = 1, on = [1, 1, 1]) => { const i = CH12.cur(wt, seq); let s = 0; for (let k = 0; k < 3; k++) if (on[k]) s += i[k] * Math.cos(th - k * TWO_PI / 3); return s; };
/* the resultant space vector of the energized phases (x, y in units of Fm) */
CH12.vec = (wt, seq = 1, on = [1, 1, 1]) => { const i = CH12.cur(wt, seq); let x = 0, y = 0; for (let k = 0; k < 3; k++) if (on[k]) { x += i[k] * Math.cos(k * TWO_PI / 3); y += i[k] * Math.sin(k * TWO_PI / 3); } return { x, y }; };

/* =====================================================================================================================
   2) the cross-section. o: { p (poles, 2–8), wt (ωt of the currents, rad), seq, on ([a, b, c] energized), field (true: air-gap band), vec (true:
   phase vectors + resultant, 2 poles only), trace ([[x, y]…] tips of the resultant, units of Fm), rotor ('cage' | 'wound'), rot (rotor angle,
   rad, CCW), slip (null: no rotor currents; else the slip, whose sign sets the bar currents), bars (false: no rotor conductors), sel (part id or null), labels (true), side (true:
   side view of the rotor), glowA (true: phase a's coil sides glow), title } */
CH12.PARTS = [['frame', ['โครง (เปลือกนอก)', 'frame (enclosure)']], ['stator', ['แกนสเตเตอร์', 'stator core']], ['winding', ['ขดลวดสเตเตอร์สามเฟส', 'three-phase stator winding']],
  ['gap', ['ช่องอากาศ', 'air gap']], ['rotor', ['แกนโรเตอร์', 'rotor core']], ['bars', ['ตัวนำของโรเตอร์', 'rotor conductors']], ['shaft', ['เพลา', 'shaft']]];
const hiFill = (ctx, on) => { if (!on) return; ctx.save(); ctx.fillStyle = C12.hi; ctx.fill(); ctx.strokeStyle = C12.hiEdge; ctx.lineWidth = 2.2; ctx.stroke(); ctx.restore(); };
const ring = (ctx, x, y, r1, r2) => { ctx.beginPath(); ctx.arc(x, y, r2, 0, TWO_PI); ctx.moveTo(x + r1, y); ctx.arc(x, y, r1, 0, TWO_PI, true); };   // two subpaths: no seam line
const mark = (ctx, x, y, r, out, col, alpha = 1) => { ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = '#10142a'; ctx.strokeStyle = col; ctx.lineWidth = Math.max(1.3, r * 0.26); ctx.beginPath(); ctx.arc(x, y, r, 0, TWO_PI); ctx.fill(); ctx.stroke();
  if (out === null) { ctx.restore(); return; } ctx.fillStyle = col; if (!out) { const k = r * 0.55; ctx.beginPath(); ctx.moveTo(x - k, y - k); ctx.lineTo(x + k, y + k); ctx.moveTo(x + k, y - k); ctx.lineTo(x - k, y + k); ctx.stroke(); }
  else { ctx.beginPath(); ctx.arc(x, y, r * 0.3, 0, TWO_PI); ctx.fill(); } ctx.restore(); };
CH12.mark = mark;
CH12.machine = (ctx, b, o = {}) => {
  CH6.bg(ctx, b); const top = 30, p = o.p || 2, pp = p / 2, wt = o.wt || 0, seq = o.seq || 1, on = o.on || [1, 1, 1], sel = o.sel || null, side = o.side !== false;
  const narrow = b.w < 1.25 * (b.h - top);
  const S = side ? (narrow ? Math.min((b.w - 24) / 2, (b.h - top - 20) / 2.62) : Math.min((b.w - 30) / 2.9, (b.h - top - 16) / 2)) : Math.min((b.w - 24) / 2, (b.h - top - 14) / 2);
  const cx = side && !narrow ? b.x + 14 + S : b.x + b.w / 2, cy = b.y + top + S + 2;
  const P = (r, a) => [cx + r * Math.cos(a), cy - r * Math.sin(a)];
  const rR = 0.5 * S, rS = 0.58 * S, iOf = CH12.cur(wt, seq), anyOn = on.some(Boolean);
  /* frame and stator core */
  ctx.save(); ring(ctx, cx, cy, 0.92 * S, S); ctx.fillStyle = C12.frame; ctx.fill(); ctx.strokeStyle = C12.edge; ctx.lineWidth = 1.2; ctx.stroke(); ctx.restore(); ring(ctx, cx, cy, 0.92 * S, S); hiFill(ctx, sel === 'frame');
  ctx.save(); ring(ctx, cx, cy, rS, 0.92 * S); ctx.fillStyle = C12.core; ctx.fill(); ctx.strokeStyle = 'rgba(207,214,236,.07)'; ctx.lineWidth = 1; for (let k = 1; k <= 4; k++) { ctx.beginPath(); ctx.arc(cx, cy, rS + (0.92 * S - rS) * k / 5, 0, TWO_PI); ctx.stroke(); } ctx.restore();
  ring(ctx, cx, cy, rS, 0.92 * S); hiFill(ctx, sel === 'stator');
  /* air gap and the field band */
  ctx.save(); ring(ctx, cx, cy, rR, rS); ctx.fillStyle = '#0d1022'; ctx.fill(); ctx.restore();
  if (o.field !== false && anyOn) { const nSeg = 180; for (let k = 0; k < nSeg; k++) { const a1 = TWO_PI * k / nSeg, a2 = TWO_PI * (k + 1) / nSeg, B = CH12.mmf(pp * (a1 + a2) / 2, wt, seq, on) / 1.5;
      ctx.save(); ctx.globalAlpha = Math.min(1, 0.1 + 0.8 * Math.abs(B)); ctx.fillStyle = B >= 0 ? C12.N : C12.S; ctx.beginPath(); ctx.arc(cx, cy, rS - 1, -a1, -a2, true); ctx.arc(cx, cy, rR + 1, -a2, -a1, false); ctx.closePath(); ctx.fill(); ctx.restore(); } }
  ring(ctx, cx, cy, rR, rS); hiFill(ctx, sel === 'gap');
  /* stator slots and coil sides: side x at α_x + 90° carries ⊙ for a positive current, x' at α_x − 90° carries ⊗ (electrical angles) */
  const cr = Math.max(4, 0.034 * S), conds = [];
  for (let k = 0; k < 3; k++) [1, -1].forEach(sg => { for (let m = 0; m < pp; m++) { const th = k * TWO_PI / 3 + sg * Math.PI / 2, a = (th + TWO_PI * m) / pp; conds.push({ k, sg, a }); } });
  conds.forEach(q => { const w = 0.07, [x1, y1] = P(rS - 1, q.a); ctx.save(); ctx.fillStyle = C12.slot; ctx.beginPath(); ctx.arc(cx, cy, 0.715 * S, -q.a - w, -q.a + w); ctx.arc(cx, cy, rS - 0.5, -q.a + w * 0.8, -q.a - w * 0.8, true); ctx.closePath(); ctx.fill(); ctx.restore(); void x1; void y1; });
  conds.forEach(q => { const [x, y] = P(0.65 * S, q.a), i = iOf[q.k], live = !!on[q.k], col = live ? C12[PH[q.k]] : C12.idle, v = q.sg * i;
    mark(ctx, x, y, cr, live && Math.abs(i) > 0.02 ? v > 0 : null, col, live ? 0.45 + 0.55 * Math.min(1, Math.abs(i)) : 0.7);
    if (o.glowA && q.k === 0) { ctx.save(); ctx.strokeStyle = C12.hiEdge; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(x, y, cr + 4, 0, TWO_PI); ctx.stroke(); ctx.restore(); } });
  if (sel === 'winding') conds.forEach(q => { const [x, y] = P(0.65 * S, q.a); ctx.beginPath(); ctx.arc(x, y, cr + 3, 0, TWO_PI); hiFill(ctx, true); });
  if (o.labels !== false && p <= 4) conds.forEach(q => { const [x, y] = P(0.795 * S, q.a); T(ctx, PH[q.k] + (q.sg < 0 ? '′' : ''), x, y, { color: on[q.k] ? C12[PH[q.k]] : C12.idle, size: Math.max(11, S * 0.07), weight: '700' }); });
  /* rotor: core, conductors (cage bars or a three-phase winding), currents induced by the slip */
  ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, rR, 0, TWO_PI); ctx.fillStyle = C12.rotor; ctx.fill(); ctx.strokeStyle = C12.edge; ctx.lineWidth = 1.2; ctx.stroke();
  ctx.strokeStyle = 'rgba(207,214,236,.07)'; for (let k = 1; k <= 3; k++) { ctx.beginPath(); ctx.arc(cx, cy, rR * (0.25 + 0.17 * k), 0, TWO_PI); ctx.stroke(); } ctx.restore();
  ctx.beginPath(); ctx.arc(cx, cy, rR, 0, TWO_PI); hiFill(ctx, sel === 'rotor');
  const rot = o.rot || 0, cage = (o.rotor || 'cage') === 'cage', br = Math.max(3.2, 0.026 * S), bars = [];
  if (cage) for (let k = 0; k < 20; k++) bars.push({ a: rot + TWO_PI * k / 20 });
  else for (let k = 0; k < 3; k++) [1, -1].forEach(sg => { for (let m = 0; m < pp; m++) bars.push({ a: rot + (k * TWO_PI / 3 + sg * Math.PI / 2 + TWO_PI * m) / pp, k, sg }); });
  if (o.bars !== false) bars.forEach(q => { const [x, y] = P(0.445 * S, q.a); let out = null, col = cage ? C12.bar : C12[PH[q.k]], al = cage ? 1 : 0.6;
    if (o.slip !== null && o.slip !== undefined && Math.abs(o.slip) > 1e-4 && anyOn) { const B = CH12.mmf(pp * q.a, wt, seq, on) / 1.5, e = Math.sign(o.slip) * B; if (Math.abs(e) > 0.12) out = e > 0; al = 0.35 + 0.65 * Math.min(1, Math.abs(B)); }
    mark(ctx, x, y, br, out, col, al); });
  if (sel === 'bars') bars.forEach(q => { const [x, y] = P(0.445 * S, q.a); ctx.beginPath(); ctx.arc(x, y, br + 3, 0, TWO_PI); hiFill(ctx, true); });
  /* N and S of the rotating field (where the band peaks), drawn inside the rotor when no vectors are shown */
  if (o.field !== false && anyOn && !(o.vec && p === 2)) { let best = 0, bv = -9; for (let j = 0; j < 360; j++) { const th = j * D2R, v = CH12.mmf(th, wt, seq, on); if (v > bv) { bv = v; best = th; } }
    if (bv > 0.05) for (let m = 0; m < p; m++) { const a = (best + Math.PI * m) / pp, [x, y] = P(0.33 * S, a); T(ctx, m % 2 ? 'S' : 'N', x, y, { color: m % 2 ? C12.S : C12.N, size: Math.max(12, S * (p > 4 ? 0.075 : 0.1)), weight: '700' }); } }
  /* shaft with a key mark that shows the rotor turning */
  ctx.save(); ctx.fillStyle = C12.shaft; ctx.beginPath(); ctx.arc(cx, cy, 0.085 * S, 0, TWO_PI); ctx.fill(); ctx.strokeStyle = '#10142a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx, cy); const [kx, ky] = P(0.085 * S, rot); ctx.lineTo(kx, ky); ctx.stroke(); ctx.restore();
  ctx.beginPath(); ctx.arc(cx, cy, 0.085 * S, 0, TWO_PI); hiFill(ctx, sel === 'shaft');
  /* phase-axis vectors and their resultant (2 poles) */
  if (o.vec && p === 2) { const L = 0.31 * S;
    for (let k = 0; k < 3; k++) { const a = k * TWO_PI / 3, [ax, ay] = P(0.49 * S, a), [bx2, by2] = P(0.49 * S, a + Math.PI); ctx.save(); ctx.strokeStyle = C12[PH[k]]; ctx.globalAlpha = 0.28; ctx.setLineDash([4, 5]); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(bx2, by2); ctx.lineTo(ax, ay); ctx.stroke(); ctx.restore(); }
    for (let k = 0; k < 3; k++) if (on[k]) { const a = k * TWO_PI / 3, v = iOf[k] * L; CH6.arrow(ctx, cx, cy, cx + v * Math.cos(a), cy - v * Math.sin(a), C12[PH[k]], 2.6); }
    (o.trace || []).forEach((q, j, A) => { ctx.save(); ctx.globalAlpha = 0.25 + 0.65 * j / Math.max(1, A.length); ctx.fillStyle = C12.res; ctx.beginPath(); ctx.arc(cx + q[0] * L, cy - q[1] * L, 2.4, 0, TWO_PI); ctx.fill(); ctx.restore(); });
    const r = CH12.vec(wt, seq, on); CH6.arrow(ctx, cx, cy, cx + r.x * L, cy - r.y * L, C12.res, 3.6); }
  /* side view of the rotor: the squirrel cage (bars between two end rings) or the wound rotor's slip rings and brushes */
  if (side) { const w = narrow ? Math.min(b.w - 40, 1.5 * S) : Math.min(b.x + b.w - (cx + S) - 34, 0.95 * S), h = narrow ? 0.42 * S : 0.62 * S;
    const sx = narrow ? b.x + (b.w - w) / 2 : cx + S + 20, sy = narrow ? cy + S + 0.14 * S : cy - h / 2;
    if (w > 60) { const ex = Math.min(0.12 * w, 18), dl = sx + 0.1 * w, dr = sx + (cage ? 0.9 : 0.58) * w, mid = sy + h / 2, rh = h * 0.36;
      ctx.save(); ctx.strokeStyle = C12.shaft; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(sx, mid); ctx.lineTo(sx + w, mid); ctx.stroke(); ctx.restore();
      if (cage) { ctx.save(); ctx.strokeStyle = C12.bar; ctx.lineWidth = 2.2; for (let k = 0; k < 9; k++) { const yy = mid - rh + 2 * rh * k / 8; ctx.beginPath(); ctx.moveTo(dl, yy); ctx.lineTo(dr, yy); ctx.stroke(); }
        [dl, dr].forEach(x => { ctx.beginPath(); ctx.ellipse(x, mid, ex, rh + 3, 0, 0, TWO_PI); ctx.lineWidth = 4; ctx.stroke(); }); ctx.restore();
        if (sel === 'bars') { ctx.beginPath(); ctx.rect(dl - ex - 4, mid - rh - 8, dr - dl + 2 * ex + 8, 2 * rh + 16); hiFill(ctx, true); }
        T(ctx, MC.t('กรงกระรอก (มองด้านข้าง)', 'squirrel cage (side view)'), sx + w / 2, sy + h + 12, { color: COL.muted, size: 12 }); }
      else { ctx.save(); ctx.fillStyle = C12.rotor; ctx.strokeStyle = C12.edge; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.rect(dl, mid - rh, dr - dl, 2 * rh); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,165,82,.6)'; for (let k = 1; k < 8; k++) { const x = dl + (dr - dl) * k / 8; ctx.beginPath(); ctx.moveTo(x, mid - rh); ctx.lineTo(x + 6, mid + rh); ctx.stroke(); } ctx.restore();
        const rx0 = dr + 0.08 * w, gap = (sx + w - rx0) / 3.3, rr = h * 0.2;
        for (let k = 0; k < 3; k++) { const x = rx0 + gap * (k + 0.3); ctx.save(); ctx.fillStyle = '#d29a52'; ctx.fillRect(x - 3, mid - rr, 6, 2 * rr); ctx.fillStyle = '#8b8d95'; ctx.fillRect(x - 4, mid - rr - 9, 8, 8); ctx.restore();
          ctx.save(); ctx.strokeStyle = C12[PH[k]]; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x, mid - rr - 9); ctx.lineTo(x, mid - rr - 18); ctx.stroke(); ctx.restore(); }
        if (sel === 'bars') { ctx.beginPath(); ctx.rect(dl - 4, mid - rh - 20, sx + w - dl, 2 * rh + 26); hiFill(ctx, true); }
        T(ctx, MC.t('โรเตอร์แบบพันขดลวดกับวงแหวนลื่น', 'wound rotor with slip rings'), sx + w / 2, sy + h + 12, { color: COL.muted, size: 12 }); } } }
  /* the tag of the part picked */
  if (sel && o.labels !== false) { const name = tt(CH12.PARTS.find(q => q[0] === sel)[1]), at = { frame: P(0.96 * S, 2.3), stator: P(0.86 * S, 2.6), winding: P(0.65 * S, Math.PI / 2 + 0.6), gap: P(0.54 * S, -0.75),
      rotor: P(0.24 * S, -1.2), bars: P(0.445 * S, -2.1), shaft: P(0.2 * S, 0.9) }[sel];
    if (at) { const w = CH8.textW(ctx, name, 12.5, '700') + 12, x = Math.max(b.x + 6 + w / 2, Math.min(b.x + b.w - 6 - w / 2, at[0])); CH6.tag(ctx, name, x, at[1], C12.hiEdge, { size: 12.5 }); } }
  if (o.title) T(ctx, tt(o.title), b.x + 10, b.y + 15, { align: 'left', color: COL.muted, size: 13 });
  return { cx, cy, S, P };
};

/* =====================================================================================================================
   3) power-flow diagram with any number of stages. o: { Pin, stages: [{ losses: [{label, v, color}], label ([th, en], the group) }],
   names: [label per band segment], hide: [true: show "?" for that segment's value], cols (band colours), title, short, unit } */
CH12.flow = (ctx, b, o = {}) => {
  CH6.bg(ctx, b); const top = o.title ? 30 : 12, st = o.stages || [], sh = o.short, f = x => CH8.fmt(x, o.unit || 'W');
  const P = [Math.max(1e-9, o.Pin)]; st.forEach((g, k) => P.push(P[k] - g.losses.reduce((a, q) => a + (q.v || 0), 0)));
  const cols = o.cols || ['#5ad1ff', '#c792ea', '#ffa552', '#7ee787'], lossCols = [['#ff7eb6', '#ff9fc9'], ['#ff6b6b', '#ff9e9e'], ['#ffd166', '#ffe29a']];
  const legendH = sh ? 0 : 20, x0 = b.x + 14, x1 = b.x + b.w - 34, yB = b.y + b.h - 44 - legendH, yTip = b.y + top + 40, Hm = Math.max(22, Math.min(80, (yB - yTip) * 0.42));
  const th = v => Math.max(1.2, v / P[0] * Hm), Wd = x1 - x0, n = st.length, xs = [...Array(n)].map((_, k) => x0 + Wd * (k + 0.7) / (n + 0.9)), R0 = Math.max(9, Math.min(22, Wd * 0.035));
  /* the band: one segment per stage boundary, bottom edge on yB */
  ctx.save(); ctx.globalAlpha = 0.88; for (let k = 0; k <= n; k++) { const xa = k ? xs[k - 1] : x0, xb = k < n ? xs[k] : x1, t = th(P[k]); ctx.fillStyle = cols[Math.min(k, cols.length - 1)]; ctx.fillRect(xa, yB - t, xb - xa, t); }
  const tOut = th(P[n]); ctx.beginPath(); ctx.moveTo(x1, yB - tOut - 7); ctx.lineTo(x1 + 24, yB - tOut / 2); ctx.lineTo(x1, yB + 7); ctx.closePath(); ctx.fill(); ctx.restore();
  const lb = (txt, x, y, col, al, size) => CH8.lab(ctx, txt, x, y, al || 'center', col, size || (sh ? 11.5 : 12.5), b);
  st.forEach((g, gi) => { const yTop = yB - th(P[gi]), cxT = xs[gi], cyT = yTop - R0; let r = R0;
    g.losses.forEach((q, k) => { const t = th(q.v), col = q.color || lossCols[gi % 3][k % 2]; ctx.save(); ctx.globalAlpha = 0.9; ctx.fillStyle = col; ctx.beginPath();
      ctx.arc(cxT, cyT, r + t, Math.PI / 2, 0, true); ctx.lineTo(cxT + r + t, yTip); ctx.lineTo(cxT + r, yTip); ctx.lineTo(cxT + r, cyT); ctx.arc(cxT, cyT, r, 0, Math.PI / 2); ctx.closePath(); ctx.fill(); ctx.restore(); r += t; });
    const tw = r - R0, xm = cxT + R0 + tw / 2, aw = Math.max(12, tw + 10), col = lossCols[gi % 3][0]; ctx.save(); ctx.fillStyle = col; ctx.globalAlpha = 0.9; ctx.beginPath(); ctx.moveTo(xm, yTip - 13); ctx.lineTo(xm - aw / 2, yTip); ctx.lineTo(xm + aw / 2, yTip); ctx.closePath(); ctx.fill(); ctx.restore();
    const tot = g.losses.reduce((a, q) => a + q.v, 0), y = yTip + 6 + (gi % 2) * Math.min(42, (yB - yTip) * 0.28), x = xm + tw / 2 + 8, hid = g.losses.some(q => q.hide);
    if (!sh && g.label) lb(tt(g.label), x, y, col, 'left'); lb(hid ? '?' : f(tot), x, y + (sh || !g.label ? 0 : 17), col, 'left'); });
  /* values of the band segments, under the band */
  const names = o.names || [], hide = o.hide || [];
  for (let k = 0; k <= n; k++) { const xa = k ? xs[k - 1] : x0, xb = k < n ? xs[k] : x1, txt = `${names[k] || ''} = ${hide[k] ? '?' : f(P[k])}`, al = k === 0 ? 'left' : k === n ? 'right' : 'center';
    lb(txt, k === 0 ? x0 : k === n ? x1 + 20 : (xa + xb) / 2 + R0 * 0.6, yB + 15 + (k % 2 && n > 2 ? 16 : 0), cols[Math.min(k, cols.length - 1)], al); }
  if (o.eff !== false && !hide[n]) lb(`η = ${fd(100 * P[n] / P[0], 2)} %`, x1 + 20, yB + (n > 2 ? 15 : 32), '#e8ecf7', 'right');
  if (!sh) { let x = x0; st.forEach((g, gi) => g.losses.forEach((q, k) => { const txt = `${tt(q.label)} ${q.hide ? '?' : f(q.v)}`, col = q.color || lossCols[gi % 3][k % 2], w = CH8.textW(ctx, txt, 11.5, '600');
      if (x + w > b.x + b.w - 8) return; T(ctx, txt, x, b.y + b.h - 12, { align: 'left', color: col, size: 11.5, weight: '600' }); x += w + 16; })); }
  if (o.title) T(ctx, tt(o.title), b.x + 10, b.y + 15, { align: 'left', color: COL.muted, size: 13 });
  return { P };
};

/* =====================================================================================================================
   4) the three modes (slide p. 9, P. C. Sen Fig. 5.23): supply ⇄ air gap ⇄ shaft, with the rotor copper loss always leaving as heat.
   o: { Pag, P2, Pmech, s, short } (three-phase totals in W; signs as in P. C. Sen: Pag < 0 means power from rotor to stator) */
const band = (ctx, x1, y, x2, w, col) => { const dir = Math.sign(x2 - x1) || 1, hl = Math.min(16, Math.abs(x2 - x1) * 0.4), hw = w / 2 + 7; ctx.save(); ctx.fillStyle = col; ctx.globalAlpha = 0.86; ctx.beginPath();
  ctx.moveTo(x1, y - w / 2); ctx.lineTo(x2 - dir * hl, y - w / 2); ctx.lineTo(x2 - dir * hl, y - hw); ctx.lineTo(x2, y); ctx.lineTo(x2 - dir * hl, y + hw); ctx.lineTo(x2 - dir * hl, y + w / 2); ctx.lineTo(x1, y + w / 2); ctx.closePath(); ctx.fill(); ctx.restore(); };
CH12.band = band;
CH12.modes = (ctx, b, o = {}) => {
  CH6.bg(ctx, b); const sh = o.short, f = x => CH8.fmt(Math.abs(x), 'W'), s = o.s;
  const mode = s < 0 ? ['เครื่องกำเนิด (s < 0)', 'generating (s < 0)', '#5ad1ff'] : s > 1 ? ['เบรกแบบ plugging (s > 1)', 'plugging (s > 1)', '#ff7eb6'] : Math.abs(s) < 1e-9 ? ['ความเร็วซิงโครนัส (s = 0)', 'synchronous speed (s = 0)', COL.muted] : ['มอเตอร์ (0 < s ≤ 1)', 'motoring (0 < s ≤ 1)', '#7ee787'];
  T(ctx, MC.t(mode[0], mode[1]), b.x + 10, b.y + 15, { align: 'left', color: mode[2], size: 13, weight: '700' });
  const top = b.y + 34, bot = b.y + b.h - 12, bw = Math.min(b.w * 0.24, 130), bh = Math.min(56, (bot - top) * 0.36), my = top + (bot - top) * 0.42;
  const xs = [b.x + 12, b.x + b.w / 2 - bw / 2, b.x + b.w - 12 - bw], names = [['สาย 3 เฟส (สเตเตอร์)', '3φ supply (stator)'], ['ช่องอากาศ / โรเตอร์', 'air gap / rotor'], ['เพลา (เครื่องกระแสตรง)', 'shaft (dc machine)']];
  if (sh) names.splice(0, 3, ['สาย 3 เฟส', '3φ supply'], ['โรเตอร์', 'rotor'], ['เพลา', 'shaft']);
  xs.forEach((x, k) => { ctx.save(); ctx.fillStyle = 'rgba(15,18,32,.9)'; ctx.strokeStyle = ['#5ad1ff', '#c792ea', '#7ee787'][k]; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.roundRect(x, my - bh / 2, bw, bh, 8); ctx.fill(); ctx.stroke(); ctx.restore();
    const lines = tt(names[k]).split(' / '); lines.forEach((l, j) => T(ctx, l, x + bw / 2, my + (j - (lines.length - 1) / 2) * 15, { color: ['#5ad1ff', '#c792ea', '#7ee787'][k], size: sh ? 11.5 : 12.5, weight: '700' })); });
  const PREF = Math.max(1, o.ref || 60000), wOf = P => 3 + 20 * Math.min(1, Math.abs(P) / PREF), g1a = xs[0] + bw + 6, g1b = xs[1] - 6, g2a = xs[1] + bw + 6, g2b = xs[2] - 6;
  if (Math.abs(o.Pag) > 1) band(ctx, o.Pag > 0 ? g1a : g1b, my, o.Pag > 0 ? g1b : g1a, wOf(o.Pag), '#c792ea');
  if (Math.abs(o.Pmech) > 1) band(ctx, o.Pmech > 0 ? g2a : g2b, my, o.Pmech > 0 ? g2b : g2a, wOf(o.Pmech), '#7ee787');
  CH8.lab(ctx, `P_ag ${f(o.Pag)}`, (g1a + g1b) / 2, my - bh / 2 - 12, 'center', '#c792ea', sh ? 11.5 : 12.5, b);
  CH8.lab(ctx, `P_mech ${f(o.Pmech)}`, (g2a + g2b) / 2, my - bh / 2 - 12, 'center', '#7ee787', sh ? 11.5 : 12.5, b);
  /* rotor copper loss: always out of the rotor as heat */
  const hx = xs[1] + bw / 2, hy = my + bh / 2 + 4; if (Math.abs(o.P2) > 1) CH6.arrow(ctx, hx, hy, hx, Math.min(bot - 14, hy + 30), '#ff6b6b', 2 + 8 * Math.min(1, Math.abs(o.P2) / PREF));
  CH8.lab(ctx, sh ? `P_2 ${f(o.P2)}` : MC.t(`ความร้อนในโรเตอร์ P_2 = ${f(o.P2)}`, `rotor heat P_2 = ${f(o.P2)}`), hx, Math.min(bot - 2, hy + 44), 'center', '#ff6b6b', sh ? 11.5 : 12.5, b);
};

/* =====================================================================================================================
   5) the per-phase equivalent circuit (P. C. Sen Fig. 5.13e without Rc): V1 — R1 + jX1 — jXm ∥ (R2/s + jX2).
   par: { V (per-phase rms), R1, X1, R2, X2, Xm, p, f, Prot }; returns three-phase totals */
const cx = (re, im = 0) => ({ re, im }), cadd = (a, b) => cx(a.re + b.re, a.im + b.im), cmul = (a, b) => cx(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re);
const cdiv = (a, b) => { const d = b.re * b.re + b.im * b.im; return cx((a.re * b.re + a.im * b.im) / d, (a.im * b.re - a.re * b.im) / d); }, cabs = a => Math.hypot(a.re, a.im);
CH12.im = (par, s) => {
  const ws = rad(CH12.ns(par.f, par.p)), V = cx(par.V), Zm = cx(0, par.Xm), sx = Math.abs(s) < 1e-9 ? 1e-9 : s, Z2 = cx(par.R2 / sx, par.X2);
  const Zp = cdiv(cmul(Zm, Z2), cadd(Zm, Z2)), Z1 = cadd(cx(par.R1, par.X1), Zp), I1 = cdiv(V, Z1), I2 = cmul(I1, cdiv(Zm, cadd(Zm, Z2)));
  const Pag = 3 * cabs(I2) ** 2 * par.R2 / sx, P2 = 3 * cabs(I2) ** 2 * par.R2, Pmech = (1 - s) * Pag, Pin = 3 * par.V * (I1.re), Pst = 3 * cabs(I1) ** 2 * par.R1;
  return { s, ws, Z1, I1, I2, Zp, Pin, Pst, Pag, P2, Pmech, T: Pag / ws, pf: Math.cos(Math.atan2(Z1.im, Z1.re)), n: (1 - s) * CH12.ns(par.f, par.p), Pout: Pmech - (par.Prot || 0) };
};

global.CH12 = CH12;
})(window);
