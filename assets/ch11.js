/* ch11.js — chapter 11: DC machines (built Oct 2026).
   Builds on ch6.js (panels, text, waves), ch8.js (Board, bars) and ch10.js (dots along a path, arrow heads, colours).
   1) CH11.machine: cross-section of a two-pole dc machine (yoke, poles with pole shoes, field coils, slotted armature with conductors) and an
      end view of the commutator with its brushes; one part can be highlighted; flux dots run through poles, air gap, armature and yoke
   2) CH11.coilView: the principle of the dc motor, coils turning between N and S with a commutator (or slip rings), the forces on the
      conductors; CH11.coilT gives the torque against the rotor angle
   3) CH11.flow: the power-flow diagram of slide 22 (input, copper losses, developed power, rotational losses, output) with widths ∝ power
   4) CH11.ts: torque–speed plane (curves, a load curve, operating points)
   5) CH11.GEN / CH11.model(type, T): steady state of the five motor connections of slides 17–21 for the type explorer (magnetic linearity) */
(function (global) {
'use strict';
const CH11 = {};
const COL = CH6.COL, T = CH6.text, fd = CH6.fd, TWO_PI = 2 * Math.PI;
const tt = p => (p ? (Array.isArray(p) ? MC.t(p[0], p[1]) : p) : '');
CH11.COL = { yoke: '#3b4266', pole: '#343b5a', edge: '#8a93b8', coil: '#ffa552', arm: '#2b3150', slot: '#151a2e', comm: '#d29a52', mica: '#1b1f33',
  brush: '#8b8d95', flux: '#5ad1ff', hi: 'rgba(255,126,182,.42)', hiEdge: '#ff7eb6', N: '#ff6b6b', S: '#5ad1ff', cin: '#ffd166' };
const C11 = CH11.COL;
const rad = n => n * TWO_PI / 60, rpm = w => w * 60 / TWO_PI;
CH11.rad = rad; CH11.rpm = rpm;

/* ⊗ (into the screen) or ⊙ (out of it) at (x, y), radius r */
const cond = (ctx, x, y, r, into, col = C11.cin) => { ctx.save(); ctx.fillStyle = '#10142a'; ctx.strokeStyle = col; ctx.lineWidth = Math.max(1.4, r * 0.28); ctx.beginPath(); ctx.arc(x, y, r, 0, TWO_PI); ctx.fill(); ctx.stroke();
  ctx.fillStyle = col; if (into) { const k = r * 0.55; ctx.beginPath(); ctx.moveTo(x - k, y - k); ctx.lineTo(x + k, y + k); ctx.moveTo(x + k, y - k); ctx.lineTo(x - k, y + k); ctx.stroke(); }
  else { ctx.beginPath(); ctx.arc(x, y, r * 0.3, 0, TWO_PI); ctx.fill(); } ctx.restore(); };
CH11.cond = cond;
const hiFill = (ctx, on) => { if (!on) return; ctx.save(); ctx.fillStyle = C11.hi; ctx.fill(); ctx.strokeStyle = C11.hiEdge; ctx.lineWidth = 2.2; ctx.stroke(); ctx.restore(); };
const sector = (ctx, x, y, r1, r2, a1, a2) => { ctx.beginPath(); ctx.arc(x, y, r2, a1, a2); ctx.arc(x, y, r1, a2, a1, true); ctx.closePath(); };   // canvas angles (y down)

/* =====================================================================================================================
   1) the machine cross-section. o: { sel: 'yoke' | 'pole' | 'field' | 'arm' | 'comm' | 'brush' | null, ang (rotor angle, rad, CCW), st (dot phase store
   with dt, run), flux (true: dots), labels (true), forces (true: tangential force arrows on the armature conductors) } */
CH11.PARTS = [['yoke', ['โครง (yoke)', 'yoke']], ['pole', ['ขั้วแม่เหล็กและปลายขั้ว', 'field pole and pole shoe']], ['field', ['ขดลวดสนาม', 'field winding']],
  ['arm', ['อาร์เมเจอร์ (แกนและขดลวด)', 'armature (core and winding)']], ['comm', ['คอมมิวเตเตอร์', 'commutator']], ['brush', ['แปรงถ่าน', 'brushes']]];
CH11.machine = (ctx, b, o = {}) => {
  CH6.bg(ctx, b); const top = 30, sel = o.sel || null, ang = o.ang || 0, st = o.st || {}, narrow = b.w < 1.25 * (b.h - top);
  /* machine scale S (yoke outer radius); the commutator end view sits to the right (wide) or below-right (narrow) */
  const S = narrow ? Math.min((b.w - 24) / 2, (b.h - top - 30) / 2.74) : Math.min((b.w - 30) / 2.95, (b.h - top - 16) / 2);   // narrow: room below for the end view and its label
  const cx = narrow ? b.x + b.w / 2 : b.x + 14 + S, cy = narrow ? b.y + top + S + 4 : b.y + top + (b.h - top - 10) / 2;
  const P = (x, y) => [cx + x * S, cy - y * S];
  /* yoke */
  const yoke = () => { ctx.beginPath(); ctx.arc(cx, cy, S, 0, TWO_PI); ctx.moveTo(cx + 0.86 * S, cy); ctx.arc(cx, cy, 0.86 * S, 0, TWO_PI, true); };   // a ring without a seam line
  ctx.save(); yoke(); ctx.fillStyle = C11.yoke; ctx.fill(); ctx.strokeStyle = C11.edge; ctx.lineWidth = 1.2; ctx.stroke(); ctx.restore();
  yoke(); hiFill(ctx, sel === 'yoke');
  /* poles: core from the yoke inwards, shoe spreading over ±42° */
  [-1, 1].forEach(sd => { const x0 = sd < 0 ? -0.875 : 0.62, w = 0.255, h = 0.17;
    const [px, py] = P(x0, h); ctx.save(); ctx.fillStyle = C11.pole; ctx.strokeStyle = C11.edge; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.rect(px, py, w * S, 2 * h * S); ctx.fill(); ctx.stroke(); ctx.restore();
    ctx.beginPath(); ctx.rect(px, py, w * S, 2 * h * S); hiFill(ctx, sel === 'pole');
    const c = sd < 0 ? Math.PI : 0, a = 42 * Math.PI / 180; ctx.save(); sector(ctx, cx, cy, 0.545 * S, 0.645 * S, c - a, c + a); ctx.fillStyle = C11.pole; ctx.fill(); ctx.strokeStyle = C11.edge; ctx.lineWidth = 1.2; ctx.stroke(); ctx.restore();
    sector(ctx, cx, cy, 0.545 * S, 0.645 * S, c - a, c + a); hiFill(ctx, sel === 'pole');
    const [lx, ly] = P(sd * 0.735, 0); T(ctx, sd < 0 ? 'N' : 'S', lx, ly, { color: sd < 0 ? C11.N : C11.S, size: Math.max(13, S * 0.13), weight: '700' });
    /* field coils above and below the pole core: ⊙ on top, ⊗ below (flux through both cores points to the right) */
    [1, -1].forEach(up => { const [qx, qy] = P(sd < 0 ? -0.845 : 0.655, up > 0 ? 0.31 : -0.17), cw = 0.19 * S, ch = 0.14 * S;
      ctx.save(); ctx.fillStyle = 'rgba(255,165,82,.25)'; ctx.strokeStyle = C11.coil; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.rect(qx, qy, cw, ch); ctx.fill(); ctx.stroke(); ctx.restore();
      ctx.beginPath(); ctx.rect(qx, qy, cw, ch); hiFill(ctx, sel === 'field');
      cond(ctx, qx + cw / 2, qy + ch / 2, Math.min(cw, ch) * 0.3, up < 0, C11.coil); }); });
  /* flux: two loops, N pole → armature → S pole → yoke (upper and lower) */
  const loop = up => { const s = up ? 1 : -1, pts = [P(-0.6, 0.1 * s), P(0.6, 0.1 * s), P(0.8, 0.1 * s), P(0.93 * Math.cos(0.12), 0.93 * Math.sin(0.12) * s)];
    for (let j = 1; j <= 40; j++) { const a = 0.12 + (Math.PI - 0.24) * j / 40; pts.push(P(0.93 * Math.cos(a), 0.93 * Math.sin(a) * s)); }
    pts.push(P(-0.8, 0.1 * s), P(-0.6, 0.1 * s)); return pts; };
  /* armature: slotted core, conductors (⊗ under N, ⊙ under S), shaft */
  const ra = 0.52 * S, ns = 16; ctx.save(); ctx.fillStyle = C11.arm; ctx.strokeStyle = C11.edge; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(cx, cy, ra, 0, TWO_PI); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = 'rgba(207,214,236,.07)'; for (let k = 1; k <= 4; k++) { ctx.beginPath(); ctx.arc(cx, cy, ra * (0.2 + 0.15 * k), 0, TWO_PI); ctx.stroke(); } ctx.restore();
  for (let k = 0; k < ns; k++) { const a = ang + TWO_PI * k / ns, ca = -a, w = 0.11; ctx.save(); sector(ctx, cx, cy, 0.41 * S, ra + 0.5, ca - w, ca + w); ctx.fillStyle = C11.slot; ctx.fill(); ctx.restore(); }
  ctx.beginPath(); ctx.arc(cx, cy, ra, 0, TWO_PI); hiFill(ctx, sel === 'arm');
  for (let k = 0; k < ns; k++) { const a = ang + TWO_PI * k / ns, x = Math.cos(a), y = Math.sin(a), [qx, qy] = P(0.465 * x, 0.465 * y);
    cond(ctx, qx, qy, Math.max(3.2, 0.032 * S), x < 0);
    if (o.forces && Math.abs(x) > 0.5) { const L = 0.13 * S * Math.abs(x); CH6.arrow(ctx, qx, qy, qx - y * L, qy - x * L, '#7ee787', 2); } }   // CCW tangent on screen: (−sin a, −cos a)
  ctx.save(); ctx.fillStyle = '#9aa3c7'; ctx.beginPath(); ctx.arc(cx, cy, 0.075 * S, 0, TWO_PI); ctx.fill(); ctx.restore();
  if (o.flux !== false) [true, false].forEach(up => { const pts = loop(up); ctx.save(); ctx.strokeStyle = 'rgba(90,209,255,.28)'; ctx.setLineDash([4, 5]); ctx.lineWidth = 1.2; ctx.beginPath(); pts.forEach((q, j) => j ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.stroke(); ctx.restore();
    CH10.dots(ctx, pts, up ? 'fu' : 'fd', 46, st, { sp: Math.max(13, S * 0.09), r: Math.max(2.2, S * 0.018), alpha: 0.85 }); });
  /* commutator end view with brushes */
  const ex = narrow ? cx + 0.66 * S : cx + 1.52 * S, ey = narrow ? cy + 1.36 * S : cy + 0.16 * S, rc = (narrow ? 0.2 : 0.26) * S, nseg = 8;
  T(ctx, MC.t('ปลายเพลา', 'shaft end'), ex, ey - rc - (narrow ? 0.22 : 0.3) * S - 14, { color: COL.muted, size: 12 });
  for (let k = 0; k < nseg; k++) { const d = TWO_PI / nseg, c1 = -(ang + (k + 1) * d) + 0.05, c2 = -(ang + k * d) - 0.05;   // segment k, mica gaps of 0.1 rad
    ctx.save(); sector(ctx, ex, ey, rc * 0.55, rc, c1, c2); ctx.fillStyle = C11.comm; ctx.fill(); ctx.restore(); }
  ctx.beginPath(); ctx.arc(ex, ey, rc, 0, TWO_PI); ctx.arc(ex, ey, rc * 0.55, TWO_PI, 0, true); hiFill(ctx, sel === 'comm');
  ctx.save(); ctx.fillStyle = '#9aa3c7'; ctx.beginPath(); ctx.arc(ex, ey, rc * 0.28, 0, TWO_PI); ctx.fill(); ctx.restore();
  [-1, 1].forEach(up => { const bw = rc * 0.5, bh = rc * 0.55, bx = ex - bw / 2, by = up < 0 ? ey - rc - bh : ey + rc;
    ctx.save(); ctx.fillStyle = C11.brush; ctx.strokeStyle = '#c8cad2'; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.rect(bx, by, bw, bh); ctx.fill(); ctx.stroke(); ctx.restore();
    ctx.beginPath(); ctx.rect(bx, by, bw, bh); hiFill(ctx, sel === 'brush');
    const ly = up < 0 ? by - rc * 0.35 : by + bh + rc * 0.35; ctx.save(); ctx.strokeStyle = '#c8cad2'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(ex, up < 0 ? by : by + bh); ctx.lineTo(ex, ly); ctx.lineTo(ex + rc * 0.9, ly); ctx.stroke(); ctx.restore();
    T(ctx, up < 0 ? '+' : '−', ex + rc * 0.9 + 8, ly, { color: up < 0 ? '#ff6b6b' : '#5ad1ff', size: 15, weight: '700' }); });
  /* labels around the drawing */
  if (o.labels !== false) { const name = id => tt(CH11.PARTS.find(p => p[0] === id)[1]);
    T(ctx, name('comm'), ex, ey + rc * 1.9 + 18, { color: sel === 'comm' ? C11.hiEdge : COL.muted, size: 12, weight: sel === 'comm' ? '700' : '600' });
    T(ctx, name('brush'), ex - rc * 0.45, ey - rc * 1.9 - 4, { align: 'right', color: sel === 'brush' ? C11.hiEdge : COL.muted, size: 12, weight: sel === 'brush' ? '700' : '600' });
    const at = { yoke: P(0.42, 0.93), pole: P(-0.5, -0.62), field: P(-0.62, 0.5), arm: P(0, -0.7) }[sel];
    if (at) { const w = CH8.textW(ctx, name(sel), 12.5, '700') + 12, x = Math.max(b.x + 6 + w / 2, Math.min(b.x + b.w - 6 - w / 2, at[0])); CH6.tag(ctx, name(sel), x, at[1], C11.hiEdge, { size: 12.5 }); } }
  return { cx, cy, S, P, ex, ey, rc };
};

/* =====================================================================================================================
   2) the principle: coils turning between N and S. phi = rotor angle (rad, CCW, 0 = coil side A on the right).
   With a commutator the side on the N half (left) always carries ⊗ (force down), the side on the S half ⊙ (force up): the torque of a coil is
   ∝ |cos φ| and never reverses. With slip rings side A keeps ⊗: the torque ∝ −cos φ reverses every half turn. Torques are per coil (max 1). */
CH11.coilT = (phi, n = 1, comm = true) => { let s = 0; for (let k = 0; k < n; k++) { const c = Math.cos(phi + k * Math.PI / n); s += comm ? Math.abs(c) : -c; } return s / n; };
CH11.coilView = (ctx, b, o = {}) => {
  CH6.bg(ctx, b); const top = 30, n = o.n || 1, comm = o.comm !== false, phi = o.phi || 0;
  const R = Math.min(b.w / 2 - 12, (b.h - top - 14) / 2), cx = b.x + b.w / 2, cy = b.y + top + (b.h - top - 8) / 2, r = 0.5 * R, gap = 0.7 * R;
  /* poles and field lines */
  [-1, 1].forEach(sd => { const x0 = sd < 0 ? Math.max(b.x + 6, cx - R) : cx + gap, w = sd < 0 ? cx - gap - x0 : Math.min(b.x + b.w - 6, cx + R) - cx - gap;
    ctx.save(); ctx.fillStyle = sd < 0 ? 'rgba(255,107,107,.22)' : 'rgba(90,209,255,.2)'; ctx.strokeStyle = sd < 0 ? C11.N : C11.S; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.rect(x0, cy - 0.62 * R, w, 1.24 * R); ctx.fill(); ctx.stroke(); ctx.restore();
    T(ctx, sd < 0 ? 'N' : 'S', x0 + w / 2, cy, { color: sd < 0 ? C11.N : C11.S, size: Math.max(14, R * 0.16), weight: '700' }); });
  for (let k = -2; k <= 2; k++) { const y = cy + k * 0.24 * R; ctx.save(); ctx.strokeStyle = 'rgba(90,209,255,.32)'; ctx.setLineDash([5, 5]); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(cx - gap + 4, y); ctx.lineTo(cx + gap - 4, y); ctx.stroke(); ctx.restore();
    CH10.arrowHead(ctx, cx + gap - 6, y, 0, 'rgba(90,209,255,.55)', 7); }
  T(ctx, 'B', cx + gap - 10, cy - 0.6 * R + 10, { color: C11.flux, size: 13, weight: '700', align: 'right' });
  ctx.save(); ctx.strokeStyle = 'rgba(154,163,199,.4)'; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.arc(cx, cy, r, 0, TWO_PI); ctx.stroke(); ctx.restore();
  /* commutator (2n segments turning with the coils) and the brushes on the neutral axis (top, bottom) */
  const rc = 0.15 * R; if (comm) { const d = Math.PI / n; ctx.save(); sector(ctx, cx, cy, rc * 0.5, rc, 0, TWO_PI); ctx.fillStyle = C11.comm; ctx.fill(); ctx.strokeStyle = C11.mica; ctx.lineWidth = Math.max(2.5, rc * 0.16);
      for (let k = 0; k < 2 * n; k++) { const a = phi + k * d; ctx.beginPath(); ctx.moveTo(cx + rc * 0.45 * Math.cos(a), cy - rc * 0.45 * Math.sin(a)); ctx.lineTo(cx + rc * 1.05 * Math.cos(a), cy - rc * 1.05 * Math.sin(a)); ctx.stroke(); } ctx.restore(); }
  else { ctx.save(); ctx.strokeStyle = C11.comm; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, rc, 0, TWO_PI); ctx.stroke(); ctx.beginPath(); ctx.arc(cx, cy, rc * 0.62, 0, TWO_PI); ctx.stroke(); ctx.restore(); }
  [-1, 1].forEach(up => { const bw = rc * 0.7, bh = rc * 0.75, by = up < 0 ? cy - rc - bh : cy + rc; ctx.save(); ctx.fillStyle = C11.brush; ctx.fillRect(cx - bw / 2, by, bw, bh); ctx.restore();
    T(ctx, up < 0 ? '+' : '−', cx + bw / 2 + 8, by + bh / 2, { color: up < 0 ? '#ff6b6b' : '#5ad1ff', size: 13, weight: '700', align: 'left' }); });
  /* coils: sides A (φ) and B (φ + π); forces vertical; the first coil bright, the others fainter */
  let tot = 0;
  for (let k = n - 1; k >= 0; k--) { const a = phi + k * Math.PI / n, xa = Math.cos(a), ya = Math.sin(a), A = [cx + r * xa, cy - r * ya], Bp = [cx - r * xa, cy + r * ya], main = k === 0, alpha = main ? 1 : 0.5;
    ctx.save(); ctx.globalAlpha = alpha; ctx.strokeStyle = C11.coil; ctx.lineWidth = main ? 3 : 2; ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(Bp[0], Bp[1]); ctx.stroke(); ctx.restore();
    const intoA = comm ? xa < 0 : true, sides = [[A, intoA], [Bp, !intoA]];
    sides.forEach(([q, into]) => { ctx.save(); ctx.globalAlpha = alpha; cond(ctx, q[0], q[1], Math.max(6, 0.07 * R), into); ctx.restore();
      if (main || n <= 2) { const L = 0.3 * R * (main ? 1 : 0.7); CH6.arrow(ctx, q[0], q[1] + (into ? 8 : -8), q[0], q[1] + (into ? L : -L), main ? '#7ee787' : 'rgba(126,231,135,.55)', main ? 2.6 : 1.8); } });
    if (main) { T(ctx, 'A', A[0] + (xa >= 0 ? 14 : -14), A[1] - 12, { color: COL.ink, size: 12.5, weight: '700' }); T(ctx, 'B', Bp[0] + (xa >= 0 ? -14 : 14), Bp[1] + 14, { color: COL.ink, size: 12.5, weight: '700' }); }
    tot += comm ? Math.abs(xa) : -xa; }
  const Tn = tot / n; T(ctx, `T ∝ ${fd(Tn, 2).replace('-', '−')}`, b.x + b.w - 10, b.y + 15, { align: 'right', color: Tn >= 0 ? '#7ee787' : '#ff6b6b', size: 13, weight: '700' });
  return { cx, cy, R, Tn };
};

/* =====================================================================================================================
   3) power-flow diagram (slide 22). o: { Pin, cu: [{label, v, color}], rot: [{label, v, color}], title, names: {in, d, out}, short, unit ('W') } */
CH11.flow = (ctx, b, o = {}) => {
  CH6.bg(ctx, b); const top = o.title ? 30 : 12, Pin = Math.max(1e-9, o.Pin), sum = a => a.reduce((s, q) => s + q.v, 0), groups = [o.cu || [], o.rot || []];
  const Pd = Pin - sum(groups[0]), Pout = Pd - sum(groups[1]), sh = o.short, f = x => CH8.fmt(x, o.unit || 'W');
  const legendH = sh ? 0 : 20, x0 = b.x + 14, x1 = b.x + b.w - 34, yB = b.y + b.h - 44 - legendH, yTip = b.y + top + 40, Hm = Math.max(24, Math.min(86, (yB - yTip) * 0.42));
  const th = P => Math.max(1.2, P / Pin * Hm), Wd = x1 - x0, xs = [x0 + 0.24 * Wd, x0 + 0.6 * Wd], R0 = Math.max(10, Math.min(26, Wd * 0.04)), cols = [['#ff7eb6', '#ff9fc9', '#ffc2dc'], ['#ffa552', '#ffc489']];
  /* the band: Pin, then Pd, then Pout (bottom edge on yB) */
  const tIn = th(Pin), tD = th(Pd), tOut = th(Pout); ctx.save(); ctx.globalAlpha = 0.88;
  ctx.fillStyle = '#5ad1ff'; ctx.fillRect(x0, yB - tIn, xs[0] - x0, tIn); ctx.fillStyle = '#c792ea'; ctx.fillRect(xs[0], yB - tD, xs[1] - xs[0], tD);
  ctx.fillStyle = '#7ee787'; ctx.fillRect(xs[1], yB - tOut, x1 - xs[1], tOut); ctx.beginPath(); ctx.moveTo(x1, yB - tOut - 7); ctx.lineTo(x1 + 24, yB - tOut / 2); ctx.lineTo(x1, yB + 7); ctx.closePath(); ctx.fill(); ctx.restore();
  /* each group: the top layer of the band turns up around a centre above the band, stripe by stripe, then runs up to an arrowhead */
  const tips = [];
  groups.forEach((g, gi) => { if (!g.length) return; const yTop = yB - (gi ? tD : tIn), cxT = xs[gi], cyT = yTop - R0; let r = R0;
    g.forEach((q, k) => { const t = th(q.v), col = q.color || cols[gi][k % cols[gi].length]; ctx.save(); ctx.globalAlpha = 0.9; ctx.fillStyle = col; ctx.beginPath();
      ctx.arc(cxT, cyT, r + t, Math.PI / 2, 0, true); ctx.lineTo(cxT + r + t, yTip); ctx.lineTo(cxT + r, yTip); ctx.lineTo(cxT + r, cyT); ctx.arc(cxT, cyT, r, 0, Math.PI / 2); ctx.closePath(); ctx.fill(); ctx.restore(); r += t; });
    const tw = r - R0, xm = cxT + R0 + tw / 2, aw = Math.max(12, tw + 10); ctx.save(); ctx.fillStyle = gi ? cols[1][0] : cols[0][0]; ctx.globalAlpha = 0.9; ctx.beginPath(); ctx.moveTo(xm, yTip - 13); ctx.lineTo(xm - aw / 2, yTip); ctx.lineTo(xm + aw / 2, yTip); ctx.closePath(); ctx.fill(); ctx.restore();
    tips.push({ x: xm + tw / 2 + 10, total: sum(g), label: (o.groupLabels || [['การสูญเสียในทองแดง', 'copper losses'], ['การสูญเสียจากการหมุน', 'rotational losses']])[gi], col: gi ? cols[1][0] : cols[0][0], gi }); });
  const lb = (txt, x, y, col, al, size) => CH8.lab(ctx, txt, x, y, al || 'center', col, size || (sh ? 11.5 : 12.5), b);
  /* group labels beside the rising arrows, the second one lower so that the two never meet */
  tips.forEach(q => { const y = yTip + 6 + q.gi * Math.min(46, (yB - yTip) * 0.3); if (!sh) lb(tt(q.label), q.x, y, q.col, 'left'); lb(f(q.total), q.x, y + (sh ? 0 : 17), q.col, 'left'); });
  const nm = o.names || {}; lb(`${nm.in ?? 'P_in'} = ${f(Pin)}`, x0, yB + 15, '#5ad1ff', 'left'); lb(`${nm.d ?? 'P_d'} = ${f(Pd)}`, (xs[0] + xs[1]) / 2 + R0, yB + 15, '#c792ea');
  lb(`${nm.out ?? 'P_out'} = ${f(Pout)}`, x1 + 20, yB + 15, '#7ee787', 'right'); lb(`η = ${fd(100 * Pout / Pin, 2)} %`, x1 + 20, yB + 32, '#e8ecf7', 'right');
  if (!sh) { let x = x0; groups.forEach((g, gi) => g.forEach((q, k) => { const txt = `${tt(q.label)} ${f(q.v)}`, col = q.color || cols[gi][k % cols[gi].length], w = CH8.textW(ctx, txt, 11.5, '600');
      if (x + w > b.x + b.w - 8) return; T(ctx, txt, x, b.y + b.h - 12, { align: 'left', color: col, size: 11.5, weight: '600' }); x += w + 16; })); }
  if (o.title) T(ctx, tt(o.title), b.x + 10, b.y + 15, { align: 'left', color: COL.muted, size: 13 });
  return { Pd, Pout, eff: Pout / Pin };
};

/* =====================================================================================================================
   4) torque–speed plane. o: { Tmax, nmax, curves: [{f: T → n (rpm), color, label, w, dash, faint}], load: {f: T → n, label, at (fraction of Tmax where the label sits)},
      ops: [{T, n, color, label}], title, short } */
CH11.ts = (ctx, b, o = {}) => {
  CH6.bg(ctx, b); const top = o.title ? 30 : 12, ml = 52, mr = 14, mb = 36, Tm = o.Tmax || 80, nm = o.nmax || 2500;
  const X = t => b.x + ml + (b.w - ml - mr) * t / Tm, Y = n => b.y + top + 6 + (b.h - top - mb - 6) * (1 - n / nm);
  const tStep = CH10.nice(Tm / 4), nStep = CH10.nice(nm / 5);
  ctx.save(); ctx.strokeStyle = COL.grid; ctx.lineWidth = 1; for (let t = 0; t <= Tm + 1e-9; t += tStep) { ctx.beginPath(); ctx.moveTo(X(t), Y(0)); ctx.lineTo(X(t), Y(nm)); ctx.stroke(); }
  for (let n = 0; n <= nm + 1e-9; n += nStep) { ctx.beginPath(); ctx.moveTo(X(0), Y(n)); ctx.lineTo(X(Tm), Y(n)); ctx.stroke(); }
  ctx.strokeStyle = COL.axis; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(X(0), Y(nm)); ctx.lineTo(X(0), Y(0)); ctx.lineTo(X(Tm), Y(0)); ctx.stroke(); ctx.restore();
  for (let t = 0; t <= Tm + 1e-9; t += tStep) T(ctx, fd(t, 0), X(t), Y(0) + 13, { color: COL.muted, size: 11.5 });
  for (let n = 0; n <= nm + 1e-9; n += nStep) T(ctx, fd(n, 0), X(0) - 6, Y(n), { align: 'right', color: COL.muted, size: 11.5 });
  T(ctx, 'T (N·m)', X(Tm), Y(0) + 28, { align: 'right', color: COL.ink, size: 12.5, weight: '600' }); T(ctx, 'n (rpm)', X(0) + 6, Y(nm) + 2, { align: 'left', color: COL.ink, size: 12.5, weight: '600' });
  ctx.save(); ctx.beginPath(); ctx.rect(X(0), Y(nm), X(Tm) - X(0), Y(0) - Y(nm)); ctx.clip();
  const draw = (f, col, w, dash, alpha) => { ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = w; ctx.globalAlpha = alpha; if (dash) ctx.setLineDash(dash); ctx.beginPath(); let pen = false;
    for (let j = 0; j <= 160; j++) { const t = Tm * (0.004 + 0.996 * j / 160), n = f(t); if (!isFinite(n)) { pen = false; continue; } const y = Y(Math.min(n, nm * 1.6)); pen ? ctx.lineTo(X(t), y) : ctx.moveTo(X(t), y); pen = true; } ctx.stroke(); ctx.restore(); };
  if (o.load) draw(o.load.f, '#e8ecf7', 2, [6, 5], 0.8);
  (o.curves || []).forEach(c => draw(c.f, c.color, c.w || 2.6, c.dash, c.faint ? 0.35 : 1));
  ctx.restore();
  /* curve labels at the right edge (or where the curve leaves the top) */
  (o.curves || []).forEach((c, k) => { if (!c.label || (o.short && c.faint)) return; let t = Tm * 0.97, n = c.f(t); if (n > nm) { let lo = 0.01, hi = Tm; for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; if (c.f(mid) > nm) lo = mid; else hi = mid; } t = hi; n = nm; }
    CH8.lab(ctx, tt(c.label), X(t) - 4, Y(n) - 10 - (k % 2) * 2, 'right', c.color, 12, b, '600'); });
  if (o.load && o.load.label) { const t = Tm * (o.load.at ?? 0.9), n = o.load.f(t); if (isFinite(n) && n < nm) CH8.lab(ctx, tt(o.load.label), X(t), Y(n) + 16, 'right', '#e8ecf7', 12, b, '600'); }
  (o.ops || []).forEach(p => { if (!isFinite(p.n)) return; const px = X(Math.min(p.T, Tm)), py = Y(Math.min(p.n, nm)); ctx.save(); ctx.strokeStyle = p.color || '#ff7eb6'; ctx.setLineDash([4, 4]); ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, Y(0)); ctx.moveTo(px, py); ctx.lineTo(X(0), py); ctx.stroke(); ctx.restore();
    ctx.save(); ctx.fillStyle = p.color || '#ff7eb6'; ctx.beginPath(); ctx.arc(px, py, 6, 0, TWO_PI); ctx.fill(); ctx.restore();
    if (p.label) CH6.tag(ctx, p.label, px > b.x + b.w * 0.6 ? px - 10 : px + 10, py - 16, p.color || '#ff7eb6', { align: px > b.x + b.w * 0.6 ? 'right' : 'left', size: 12 }); });
  if (o.title) T(ctx, tt(o.title), b.x + 10, b.y + 15, { align: 'left', color: COL.muted, size: 13 });
  return { X, Y };
};

/* =====================================================================================================================
   generic xy plot. o: { x: [x0, x1], y: [y0, y1], xl, yl, curves: [{f, color, w, dash, n (samples, 200)}] (f may return NaN for a gap), lines: [{pts: [[x, y], …], color, w, dash}],
   xbands: [{x0, x1, color, label, text}] (shaded vertical ranges with a label at the top, e.g. the modes of operation)
   (data, e.g. a time history), hlines: [{y, color, label}] (dashed levels), pts: [{x, y, color, label}], bands: [{y0, y1, color, label}]
   (shaded horizontal regions, e.g. Ia > 0 motor, Ia < 0 generator), title, xt, yt (tick steps), xfmt (tick text) } */
CH11.plot = (ctx, b, o = {}) => {
  CH6.bg(ctx, b); const top = o.title ? 30 : 12, ml = 54, mr = 14, mb = 36, [x0, x1] = o.x, [y0, y1] = o.y;
  const X = x => b.x + ml + (b.w - ml - mr) * (x - x0) / (x1 - x0), Y = y => b.y + top + 6 + (b.h - top - mb - 6) * (1 - (y - y0) / (y1 - y0));
  (o.xbands || []).forEach(q => { const xa = X(Math.max(x0, Math.min(x1, q.x0))), xb = X(Math.max(x0, Math.min(x1, q.x1))); ctx.save(); ctx.fillStyle = q.color; ctx.fillRect(xa, Y(y1), xb - xa, Y(y0) - Y(y1)); ctx.restore();
    if (q.label && xb - xa > 30) CH8.lab(ctx, tt(q.label), (xa + xb) / 2, Y(y1) + 13, 'center', q.text || COL.muted, 12, { x: xa, y: b.y, w: xb - xa, h: b.h }, '600'); });
  (o.bands || []).forEach(q => { const ya = Y(Math.min(y1, Math.max(y0, q.y1))), yb = Y(Math.max(y0, Math.min(y1, q.y0))); ctx.save(); ctx.fillStyle = q.color; ctx.fillRect(X(x0), ya, X(x1) - X(x0), yb - ya); ctx.restore();
    if (q.label) T(ctx, tt(q.label), X(x0) + 8, (ya + yb) / 2, { align: 'left', color: q.text || COL.muted, size: 12.5, weight: '600' }); });
  const xs = o.xt || CH10.nice((x1 - x0) / 5), ys = o.yt || CH10.nice((y1 - y0) / 5);
  ctx.save(); ctx.strokeStyle = COL.grid; ctx.lineWidth = 1; for (let x = Math.ceil(x0 / xs) * xs; x <= x1 + 1e-9; x += xs) { ctx.beginPath(); ctx.moveTo(X(x), Y(y0)); ctx.lineTo(X(x), Y(y1)); ctx.stroke(); }
  for (let y = Math.ceil(y0 / ys) * ys; y <= y1 + 1e-9; y += ys) { ctx.beginPath(); ctx.moveTo(X(x0), Y(y)); ctx.lineTo(X(x1), Y(y)); ctx.stroke(); }
  ctx.strokeStyle = COL.axis; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(X(x0), Y(y1)); ctx.lineTo(X(x0), Y(y0)); ctx.stroke(); const yz = y0 < 0 && y1 > 0 ? 0 : y0; ctx.beginPath(); ctx.moveTo(X(x0), Y(yz)); ctx.lineTo(X(x1), Y(yz)); ctx.stroke(); ctx.restore();
  for (let x = Math.ceil(x0 / xs - 1e-9) * xs; x <= x1 + 1e-9; x += xs) T(ctx, o.xfmt ? o.xfmt(x) : fd(x, 0), X(x), Y(y0) + 13, { color: COL.muted, size: 11.5 });
  for (let y = Math.ceil(y0 / ys) * ys; y <= y1 + 1e-9; y += ys) T(ctx, fd(y, 0).replace('-', '−'), X(x0) - 6, Y(y), { align: 'right', color: COL.muted, size: 11.5 });
  if (o.xl) T(ctx, tt(o.xl), X(x1), Y(y0) + 28, { align: 'right', color: COL.ink, size: 12.5, weight: '600' }); if (o.yl) T(ctx, tt(o.yl), X(x0) + 6, Y(y1) + 2, { align: 'left', color: COL.ink, size: 12.5, weight: '600' });
  ctx.save(); ctx.beginPath(); ctx.rect(X(x0), Y(y1), X(x1) - X(x0), Y(y0) - Y(y1)); ctx.clip();
  (o.hlines || []).forEach(q => { ctx.save(); ctx.strokeStyle = q.color || COL.muted; ctx.lineWidth = 1.4; ctx.setLineDash([6, 5]); ctx.beginPath(); ctx.moveTo(X(x0), Y(q.y)); ctx.lineTo(X(x1), Y(q.y)); ctx.stroke(); ctx.restore(); });
  (o.curves || []).forEach(c => { ctx.save(); ctx.strokeStyle = c.color; ctx.lineWidth = c.w || 2.6; if (c.dash) ctx.setLineDash(c.dash); ctx.beginPath(); let pen = false;
    const N = c.n || 200; for (let j = 0; j <= N; j++) { const x = x0 + (x1 - x0) * j / N, y = c.f(x); if (!isFinite(y)) { pen = false; continue; } pen ? ctx.lineTo(X(x), Y(y)) : ctx.moveTo(X(x), Y(y)); pen = true; } ctx.stroke(); ctx.restore(); });
  (o.lines || []).forEach(c => { if (!c.pts || c.pts.length < 2) return; ctx.save(); ctx.strokeStyle = c.color; ctx.lineWidth = c.w || 2.6; if (c.dash) ctx.setLineDash(c.dash); ctx.beginPath();
    c.pts.forEach((q, j) => j ? ctx.lineTo(X(q[0]), Y(q[1])) : ctx.moveTo(X(q[0]), Y(q[1]))); ctx.stroke(); ctx.restore(); });
  ctx.restore();
  (o.hlines || []).forEach(q => { if (q.label && q.y >= y0 && q.y <= y1) CH8.lab(ctx, tt(q.label), X(x1) - 4, Y(q.y) - 9, 'right', q.color || COL.muted, 12, b, '600'); });
  (o.pts || []).forEach(p => { const px = X(p.x), py = Y(Math.max(y0, Math.min(y1, p.y))); ctx.save(); ctx.fillStyle = p.color || '#ff7eb6'; ctx.beginPath(); ctx.arc(px, py, 6, 0, TWO_PI); ctx.fill(); ctx.restore();
    if (p.label) CH6.tag(ctx, p.label, px > b.x + b.w * 0.62 ? px - 10 : px + 10, py - 16, p.color || '#ff7eb6', { align: px > b.x + b.w * 0.62 ? 'right' : 'left', size: 12 }); });
  if (o.title) T(ctx, tt(o.title), b.x + 10, b.y + 15, { align: 'left', color: COL.muted, size: 13 });
  return { X, Y };
};

/* =====================================================================================================================
   5) the five connections in steady state (magnetic linearity, no armature reaction, no rotational loss) for the type explorer.
   All five pass through one rated point: 40 N·m at the shunt motor's rated speed; the shunt motor runs at 1500 rpm at no load. */
CH11.GEN = (() => { const Vt = 220, Ra = 0.4, Rse = 0.2, Rf = 110, If = Vt / Rf, Tr = 40, n0 = 1500, KFs = Vt / rad(n0), Ias = Tr / KFs, wr = (Vt - Ias * Ra) / KFs;
  const R2 = Ra + Rse, xr = (Vt + Math.sqrt(Vt * Vt - 4 * wr * Tr * R2)) / (2 * wr), Iar = Tr / xr, alpha = 0.7;
  /* the short shunt gets its own field constants so that it too passes through (Tr, wr): its shunt field sees Vt − IL·Rse and its series field carries IL */
  const fS = I => (Vt - I * Rse) / (Rf + Rse), gS = I => Vt - (I + fS(I)) * Rse - I * Ra - wr * Tr / I; let lo = 5, hi = 200; for (let k = 0; k < 100; k++) { const m = (lo + hi) / 2; if (gS(m) < 0) lo = m; else hi = m; }
  const IaS = (lo + hi) / 2, xS = Tr / IaS, fs = fS(IaS);
  return { Vt, Ra, Rse, Rf, If, Tr, n0, KFs, wr, nr: rpm(wr), xr, Iar, Ksr: xr / Iar, KfC: alpha * xr / If, KsC: (1 - alpha) * xr / Iar, KfS: alpha * xS / fs, KsS: (1 - alpha) * xS / (IaS + fs), alpha, Vf: 100, RfSep: 100 / If }; })();
CH11.model = (type, Tq, G = CH11.GEN) => {
  const T0 = Math.max(Tq, 1e-6); let Ia, If = 0, IL, Eb, x;
  if (type === 'sep' || type === 'shunt') { x = G.KFs; If = type === 'sep' ? G.Vf / G.RfSep : G.Vt / G.Rf; Ia = T0 / x; Eb = G.Vt - Ia * G.Ra; IL = type === 'sep' ? Ia : Ia + If; }
  else if (type === 'series') { Ia = Math.sqrt(T0 / G.Ksr); x = G.Ksr * Ia; Eb = G.Vt - Ia * (G.Ra + G.Rse); IL = Ia; }
  else if (type === 'long') { If = G.Vt / G.Rf; const a = G.KsC, bb = G.KfC * If; Ia = (-bb + Math.sqrt(bb * bb + 4 * a * T0)) / (2 * a); x = bb + a * Ia; Eb = G.Vt - Ia * (G.Ra + G.Rse); IL = Ia + If; }
  else { /* short shunt: the shunt field across the armature, the series field carries IL */
    const st = I => { const f = (G.Vt - I * G.Rse) / (G.Rf + G.Rse), L = I + f; return { f, L, x: G.KfS * f + G.KsS * L }; };
    let lo = 0, hi = 2000; for (let k = 0; k < 90; k++) { const mid = (lo + hi) / 2; if (st(mid).x * mid < T0) lo = mid; else hi = mid; }
    Ia = (lo + hi) / 2; const s = st(Ia); If = s.f; IL = s.L; x = s.x; Eb = G.Vt - IL * G.Rse - Ia * G.Ra; }
  const w = Eb / x; return { type, T: Tq, Ia, If, IL, Eb, x, w, n: rpm(w) };
};

global.CH11 = CH11;
})(window);
