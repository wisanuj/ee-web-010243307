/* ch10.js — chapter 10: magnetic circuits and transformers (built Oct 2026).
   Builds on ch6.js (panels, waves, plane), ch8.js (Board, Prob, triangle, bars) and the circuit engine, which solves a magnetic
   equivalent circuit as a DC circuit: an mmf source F = Ni is a voltage source (At), a reluctance is a resistor (At/Wb) and the
   flux is the current (Wb), so the moving dots show the flux.
   1) materials: B–H curves of silicon sheet steel, cast steel and cast iron read from slide p. 7 (P. C. Sen Fig. 1.7). They pass through
      the readings that the slides, the class and P. C. Sen use: Si steel 1.225 T at 442 At/m; cast steel 510 At/m at 0.8 T,
      800 At/m at 1.1 T and 1000 At/m at 1.2 T. CH10.B(mat, H) (monotone cubic), CH10.H(mat, B) (inverted by bisection)
   2) drawings: CH10.core (iron pieces, air gaps, coils, mean flux paths with moving dots, dimensions), CH10.toroid, CH10.bh (B–H plane
      with curves, an operating point and a load line), CH10.loop (a hysteresis loop model), CH10.sci (6.463×10⁻⁴)
   3) CH10.MagBoard: a CH8.Board with the iron core across the top and the magnetic equivalent circuit + a side panel under it
   4) CH10.mtip: tooltips for magnetic equivalent circuits (At, Wb, At/Wb instead of V, A, Ω) */
(function (global) {
'use strict';
const CH10 = {};
const Cx = CK.Cx, COL = CH6.COL, T = CH6.text, fd = CH6.fd, MU0 = 4 * Math.PI * 1e-7;
const tt = p => (p ? (Array.isArray(p) ? MC.t(p[0], p[1]) : p) : '');
/* canvas text kept inside box b (labels beside a drawing on a phone-width canvas) */
const twid = (ctx, s, size, weight = '700') => { ctx.save(); ctx.font = `${weight} ${size}px ${/[ก-๙]/.test(s) ? '"IBM Plex Sans Thai"' : '"IBM Plex Mono"'}, monospace`; const w = ctx.measureText(String(s).replace(/_\{([^}]*)\}|_/g, '$1')).width; ctx.restore(); return w; };
const TB = (ctx, b, s, x, y, o = {}) => { if (!s) return; const w = twid(ctx, s, o.size || 12, o.weight || '700'); let x0 = o.align === 'right' ? x - w : o.align === 'left' ? x : x - w / 2;
  x0 = Math.max(b.x + 4, Math.min(b.x + b.w - 4 - w, x0)); T(ctx, s, x0, y, { ...o, align: 'left' }); };
CH10.MU0 = MU0;
CH10.COL = { iron: '#343b5a', ironEdge: '#8a93b8', lam: 'rgba(207,214,236,.07)', flux: '#5ad1ff', coil: '#ffa552', gap: 'rgba(90,209,255,.06)',
  mmf: '#ff7eb6', hi: 'rgba(255,126,182,.42)', path: 'rgba(90,209,255,.35)' };

/* 6.463×10⁻⁴ (canvas text) */
const SUP = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
CH10.sci = (x, d = 3) => { if (!isFinite(x)) return '—'; if (Math.abs(x) < 1e-15) return '0'; const e = Math.floor(Math.log10(Math.abs(x))), m = x / Math.pow(10, e);
  if (e >= -2 && e <= 3) return fd(x, Math.max(0, d - e)).replace('-', '−');
  return `${fd(m, d).replace('-', '−')}×10${String(e).split('').map(c => SUP[c]).join('')}`; };
/* 6.463\times10^{-4} (TeX) */
CH10.sciTex = (x, d = 3) => { if (Math.abs(x) < 1e-15) return '0'; const e = Math.floor(Math.log10(Math.abs(x))), m = x / Math.pow(10, e);
  if (e >= -2 && e <= 3) return fd(x, Math.max(0, d - e)); return `${fd(m, d)}\\times10^{${e}}`; };

/* =====================================================================================================================
   1) B–H curves */
const pchip = (xs, ys) => { const n = xs.length, h = [], d = [], m = new Array(n);
  for (let i = 0; i < n - 1; i++) { h[i] = xs[i + 1] - xs[i]; d[i] = (ys[i + 1] - ys[i]) / h[i]; }
  m[0] = d[0]; m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) { if (d[i - 1] * d[i] <= 0) { m[i] = 0; continue; } const w1 = 2 * h[i] + h[i - 1], w2 = h[i] + 2 * h[i - 1]; m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i]); }
  return x => { if (x <= xs[0]) return ys[0] + d[0] * (x - xs[0]); if (x >= xs[n - 1]) return ys[n - 1] + m[n - 1] * (x - xs[n - 1]);
    let i = 0; while (i < n - 2 && x > xs[i + 1]) i++; const t = (x - xs[i]) / h[i], t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h[i] * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h[i] * m[i + 1]; }; };
CH10.MAT = {
  si: { name: ['เหล็กแผ่นซิลิคอน', 'silicon sheet steel'], color: '#5ad1ff',
    H: [0, 25, 50, 75, 100, 125, 150, 200, 250, 300, 350, 400, 450, 500, 600, 700, 800, 900, 1000],
    B: [0, 0.17, 0.36, 0.56, 0.72, 0.82, 0.89, 0.99, 1.065, 1.12, 1.165, 1.2, 1.23, 1.25, 1.28, 1.3, 1.32, 1.333, 1.345] },
  cs: { name: ['เหล็กกล้าหล่อ', 'cast steel'], color: '#ffd166',
    H: [0, 100, 200, 250, 300, 350, 400, 450, 500, 550, 600, 650, 700, 750, 800, 900, 1000],
    B: [0, 0.105, 0.215, 0.3, 0.385, 0.49, 0.6, 0.7, 0.785, 0.85, 0.905, 0.955, 1.0, 1.05, 1.1, 1.155, 1.2] },
  ci: { name: ['เหล็กหล่อ', 'cast iron'], color: '#ff9b9b',
    H: [0, 200, 400, 600, 800, 1000], B: [0, 0.1, 0.195, 0.272, 0.343, 0.39] }
};
Object.values(CH10.MAT).forEach(m => { m.f = pchip(m.H, m.B); });
CH10.B = (mat, H) => { const m = CH10.MAT[mat]; return H >= 0 ? m.f(H) : -m.f(-H); };
CH10.H = (mat, B) => { if (B < 0) return -CH10.H(mat, -B); const m = CH10.MAT[mat]; let lo = 0, hi = 1000; while (m.f(hi) < B && hi < 1e7) hi *= 2;
  for (let k = 0; k < 80; k++) { const mid = (lo + hi) / 2; if (m.f(mid) < B) lo = mid; else hi = mid; } return (lo + hi) / 2; };

/* hysteresis loop model: two tanh branches shifted by ±Hc and lifted so that they meet at ±Hm (closed loop).
   rect: true gives the square loop of slide p. 16 (B = ±Bs, switching at ±Hc) */
CH10.loop = (o = {}) => { const Hm = o.Hm ?? 100, Hc = o.Hc ?? 20, a = o.a ?? 15, Bs = o.Bs ?? 1.4;
  if (o.rect) { const up = H => (H >= Hc ? Bs : -Bs), down = H => (H <= -Hc ? -Bs : Bs); return { up, down, Br: Bs, Hc, area: Hm >= Hc ? 4 * Hc * Bs : 0, Bmax: Bs, rect: true }; }
  const th = Math.tanh, d = (th((Hm + Hc) / a) - th((Hm - Hc) / a)) / 2;
  const up = H => Bs * (th((H - Hc) / a) + d), down = H => Bs * (th((H + Hc) / a) - d);
  let area = 0; const n = 400; for (let k = 0; k < n; k++) { const H = -Hm + (k + 0.5) * 2 * Hm / n; area += (down(H) - up(H)) * 2 * Hm / n; }
  return { up, down, Br: down(0), Hc: Math.max(0, Hc - a * Math.atanh(Math.min(0.999999, d))), area, Bmax: up(Hm) }; };

/* =====================================================================================================================
   2) drawings */
const dash = (ctx, pts, col, w = 1.4, d = [6, 5]) => { ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = w; ctx.setLineDash(d); ctx.beginPath(); pts.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.stroke(); ctx.restore(); };
const polyLen = pts => { let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return L; };
const polyAt = (pts, s) => { for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); if (s <= l || i === pts.length - 1) { const f = l ? Math.min(1, s / l) : 0; return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * f, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * f]; } s -= l; } return pts[0]; };
/* dots along a closed polyline: phase store st.ph[id] advances by v·dt (px/s, signed) */
CH10.dots = (ctx, pts, id, v, st, o = {}) => { const L = polyLen(pts); if (L < 2) return; st.ph = st.ph || {}; const sp = o.sp || 16;
  if (st.run !== false) st.ph[id] = ((st.ph[id] || 0) + v * (st.dt || 0)) % (L * 1000);
  let ph = ((st.ph[id] % sp) + sp) % sp; ctx.save(); ctx.fillStyle = o.color || CH10.COL.flux; if (o.alpha !== undefined) ctx.globalAlpha = o.alpha;
  for (let s = ph; s < L; s += sp) { const [x, y] = polyAt(pts, s); ctx.beginPath(); ctx.arc(x, y, o.r || 3.2, 0, 2 * Math.PI); ctx.fill(); } ctx.restore(); };
const arrowHead = (ctx, x, y, ang, col, sz = 8) => { ctx.save(); ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - sz * Math.cos(ang - 0.45), y - sz * Math.sin(ang - 0.45)); ctx.lineTo(x - sz * Math.cos(ang + 0.45), y - sz * Math.sin(ang + 0.45)); ctx.closePath(); ctx.fill(); ctx.restore(); };
CH10.arrowHead = arrowHead;
/* a dimension line a → b with arrow heads and text (grid units in, px out through P) */
const dim = (ctx, P, d, s) => { const A = P(...d.a), B = P(...d.b), col = d.color || COL.muted; ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.stroke(); ctx.restore();
  const ang = Math.atan2(B[1] - A[1], B[0] - A[0]); arrowHead(ctx, B[0], B[1], ang, col, 7); arrowHead(ctx, A[0], A[1], ang + Math.PI, col, 7);
  if (d.text) { const mx = (A[0] + B[0]) / 2, my = (A[1] + B[1]) / 2, vert = Math.abs(Math.sin(ang)) > 0.7, off = (d.off ?? 1) * 12;
    T(ctx, tt(d.text), vert ? mx + off : mx, vert ? my : my - off, { color: col, size: Math.max(11.5, Math.min(13.5, s * 0.5)), weight: '600', align: vert ? (off > 0 ? 'left' : 'right') : 'center' }); } };

/* iron core in box b. geo (grid units): { ext: [x0, y0, x1, y1], iron: [{id, x, y, w, h}], gaps: [{id, x, y, w, h, label}],
     coils: [{id, x, y, w, h, n (turns drawn), orient 'v' | 'h', lead 'left' | 'right' | 'top', cur (label at the lead arrow), dir (+1 current enters the
     first lead), name (e.g. 'N = 400')}], paths: [{id, pts}], dims: [{a, b, text, off}], labels: [{x, y, text, color, align, size}] }
   st: { flux: {pathId: value (signed)}, ref (|flux| for full dot speed), dots (bool), run, dt, ph (phase store), hi: Set of ids, title, vmax (px/s), color (flux colour) } */
CH10.core = (ctx, b, geo, st = {}) => {
  CH6.bg(ctx, b); const top = st.top ?? 36, pad = 12, [x0, y0, x1, y1] = geo.ext;
  const s = Math.min((b.w - 2 * pad) / (x1 - x0), (b.h - top - pad) / (y1 - y0)), ox = b.x + (b.w - (x1 - x0) * s) / 2 - x0 * s, oy = b.y + top + (b.h - top - pad - (y1 - y0) * s) / 2 - y0 * s;
  const P = (x, y) => [ox + x * s, oy + y * s], R = r => { const [a, c] = P(r.x, r.y); return [a, c, r.w * s, r.h * s]; }, hi = st.hi || new Set();
  /* glow under highlighted pieces */
  [...(geo.iron || []), ...(geo.gaps || []), ...(geo.coils || [])].forEach(r => { if (!hi.has(r.id)) return; const [x, y, w, h] = R(r); ctx.save(); ctx.fillStyle = CH10.COL.hi; ctx.fillRect(x - 6, y - 6, w + 12, h + 12); ctx.restore(); });
  /* iron with lamination stripes */
  (geo.iron || []).forEach(r => { const [x, y, w, h] = R(r); ctx.save(); ctx.fillStyle = r.color || CH10.COL.iron; ctx.fillRect(x, y, w, h);
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip(); ctx.strokeStyle = CH10.COL.lam; ctx.lineWidth = 1; const stp = Math.max(5, s * 0.22);
    if (w >= h) for (let yy = y + stp; yy < y + h; yy += stp) { ctx.beginPath(); ctx.moveTo(x, yy); ctx.lineTo(x + w, yy); ctx.stroke(); }
    else for (let xx = x + stp; xx < x + w; xx += stp) { ctx.beginPath(); ctx.moveTo(xx, y); ctx.lineTo(xx, y + h); ctx.stroke(); }
    ctx.restore(); ctx.save(); ctx.strokeStyle = CH10.COL.ironEdge; ctx.lineWidth = 1.2; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1); ctx.restore(); });
  /* air gaps */
  (geo.gaps || []).forEach(g => { const [x, y, w, h] = R(g); ctx.save(); ctx.fillStyle = CH10.COL.gap; ctx.fillRect(x, y, w, h); ctx.strokeStyle = 'rgba(90,209,255,.55)'; ctx.setLineDash([3, 3]); ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1); ctx.restore();
    if (g.label) TB(ctx, b, tt(g.label), x + w + (g.lx ?? 8), y + h / 2 + (g.ly ?? 0), { align: 'left', color: CH10.COL.flux, size: Math.max(12, Math.min(14, s * 0.55)), weight: '700' }); });
  /* mean flux paths and dots */
  const ref = st.ref || Math.max(1e-30, ...Object.values(st.flux || {}).map(Math.abs));
  const fcol = st.color || CH10.COL.flux;   // st.color: another colour for the flux (a page that also plots a voltage in cyan)
  (geo.paths || []).forEach(p => { const pts = p.pts.map(q => P(q[0], q[1])); dash(ctx, pts, CH10.COL.path, 1.3);
    const f = (st.flux || {})[p.id] || 0; if (st.dots !== false && Math.abs(f) > 1e-30) CH10.dots(ctx, pts, p.id, (st.vmax || 70) * f / ref, st, { sp: Math.max(13, s * 0.85), r: Math.max(2.6, Math.min(3.6, s * 0.16)), color: fcol });
    if (p.label && Math.abs(f) > 1e-30 && st.dots !== false) { const q = P(...p.lpos); T(ctx, tt(p.label), q[0], q[1], { color: fcol, size: Math.max(12, Math.min(14, s * 0.55)), weight: '700', align: p.lalign || 'center' }); } });
  /* coils */
  (geo.coils || []).forEach(c => { const n = c.n || 5, col = c.color || CH10.COL.coil, lw = Math.max(2, s * 0.09), ext = 0.28;
    ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.lineCap = 'round';
    let A, B;
    if ((c.orient || 'v') === 'v') { const xl = c.x - ext, xr = c.x + c.w + ext, h = c.h / n;
      for (let k = 0; k < n; k++) { const yk = c.y + h * (k + 0.5), [ax, ay] = P(xl, yk - h * 0.35), [bx, by] = P(xr, yk + h * 0.35); ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke(); }
      const side = c.lead === 'right' ? xr : xl, L = c.lead === 'right' ? 1 : -1; A = [side, c.y + h * 0.15]; B = [side, c.y + c.h - h * 0.15];
      const ta = [side + L * (c.leadLen ?? 1.2), A[1]], tb = [side + L * (c.leadLen ?? 1.2), B[1]];
      [[A, ta], [B, tb]].forEach(([p, q]) => { const [px, py] = P(...p), [qx, qy] = P(...q); ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(qx, qy); ctx.stroke(); ctx.save(); ctx.fillStyle = CK.PAL.bg; ctx.strokeStyle = col; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(qx, qy, Math.max(3, s * 0.13), 0, 2 * Math.PI); ctx.fill(); ctx.stroke(); ctx.restore(); });
      ctx.restore();
      if (c.cur) { const [qx, qy] = P(ta[0] - L * 0.05 + (side - ta[0]) * 0.45, ta[1]), ang = (c.dir ?? 1) > 0 ? (L > 0 ? Math.PI : 0) : (L > 0 ? 0 : Math.PI); arrowHead(ctx, qx, qy, ang, COL.I, 9);
        TB(ctx, b, tt(c.cur), qx, qy - Math.max(11, s * 0.42), { color: COL.I, size: Math.max(12, Math.min(14, s * 0.55)), weight: '700' }); }
      if (c.name) { const [qx, qy] = P(side + L * (c.nameOff ?? 0.5), (A[1] + B[1]) / 2); TB(ctx, b, tt(c.name), qx, qy, { color: col, size: Math.max(12, Math.min(14, s * 0.55)), weight: '700', align: L > 0 ? 'left' : 'right' }); }
    } else { const yt = c.y - ext, yb = c.y + c.h + ext, w = c.w / n;
      for (let k = 0; k < n; k++) { const xk = c.x + w * (k + 0.5), [ax, ay] = P(xk - w * 0.35, yt), [bx, by] = P(xk + w * 0.35, yb); ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke(); }
      A = [c.x + w * 0.15, yt]; B = [c.x + c.w - w * 0.15, yt]; const ta = [A[0] - 0.6, yt - (c.leadLen ?? 1.0)], tb = [B[0] + 0.6, yt - (c.leadLen ?? 1.0)];
      [[A, ta], [B, tb]].forEach(([p, q]) => { const [px, py] = P(...p), [qx, qy] = P(...q); ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(qx, qy); ctx.stroke(); ctx.save(); ctx.fillStyle = CK.PAL.bg; ctx.strokeStyle = col; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(qx, qy, Math.max(3, s * 0.13), 0, 2 * Math.PI); ctx.fill(); ctx.stroke(); ctx.restore(); });
      ctx.restore();
      if (c.cur) { const [px, py] = P(...A), [qx, qy] = P(...ta), mx = (px + qx) / 2, my = (py + qy) / 2; arrowHead(ctx, mx, my, Math.atan2(py - qy, px - qx), COL.I, 9); T(ctx, tt(c.cur), mx - 12, my - 8, { color: COL.I, size: Math.max(12, Math.min(14, s * 0.55)), weight: '700', align: 'right' }); }
      if (c.name) { const [qx, qy] = P(c.x + c.w / 2, yt - (c.nameOff ?? 1.3)); T(ctx, tt(c.name), qx, qy, { color: col, size: Math.max(12, Math.min(14, s * 0.55)), weight: '700' }); } }
  });
  (geo.dims || []).forEach(d => dim(ctx, P, d, s));
  (geo.labels || []).forEach(l => { const [x, y] = P(l.x, l.y); TB(ctx, b, tt(l.text), x, y, { color: l.color || COL.ink, size: l.size || Math.max(12, Math.min(14, s * 0.55)), weight: l.weight || '700', align: l.align || 'center' }); });
  if (st.title) T(ctx, tt(st.title), b.x + b.w - 10, b.y + 15, { align: 'right', color: COL.muted, size: 13 });   // top right: the badge sits top left
  return { P, s };
};

/* toroid in box b. o: { r1, r2 (inner, outer radius, any unit), coil: [from°, to°] (on the ring, counter-clockwise from +x), turns, gap (° width at +x, 0 = none),
   flux (value), ref, dots, st (phase store, run, dt), labels: {N, i, r}, title, sq (square cross section: no shading), hiGap, hiPath } */
CH10.toroid = (ctx, b, o = {}) => {
  CH6.bg(ctx, b); const top = o.top ?? 36, st = o.st || {}, cx0 = b.x + b.w * (o.cxf ?? 0.5), cy0 = b.y + top + (b.h - top - 10) / 2;
  const Rmax = Math.max(30, Math.min(b.w * (o.wf ?? 0.36), (b.h - top - 14) / 2 - 8)), k = Rmax / (o.r2 || 1), r1 = (o.r1 || 0.6) * k, r2 = (o.r2 || 1) * k, rm = (r1 + r2) / 2;
  const gap = (o.gap || 0) * Math.PI / 180;
  /* ring */
  ctx.save(); ctx.fillStyle = CH10.COL.iron; ctx.beginPath(); ctx.arc(cx0, cy0, r2, gap / 2, 2 * Math.PI - gap / 2); ctx.arc(cx0, cy0, r1, 2 * Math.PI - gap / 2, gap / 2, true); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = CH10.COL.ironEdge; ctx.lineWidth = 1.3; ctx.stroke(); ctx.restore();
  if (gap > 0) { ctx.save(); if (o.hiGap) { ctx.fillStyle = CH10.COL.hi; ctx.beginPath(); ctx.arc(cx0, cy0, r2 + 6, -gap, gap); ctx.arc(cx0, cy0, r1 - 6, gap, -gap, true); ctx.closePath(); ctx.fill(); }
    ctx.strokeStyle = 'rgba(90,209,255,.6)'; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(cx0 + r1 * Math.cos(gap / 2), cy0 - r1 * Math.sin(gap / 2)); ctx.lineTo(cx0 + r2 * Math.cos(gap / 2), cy0 - r2 * Math.sin(gap / 2));
    ctx.moveTo(cx0 + r1 * Math.cos(gap / 2), cy0 + r1 * Math.sin(gap / 2)); ctx.lineTo(cx0 + r2 * Math.cos(gap / 2), cy0 + r2 * Math.sin(gap / 2)); ctx.stroke(); ctx.restore();
    if (o.gapLabel) { const s0 = tt(o.gapLabel), w = twid(ctx, s0, 13); if (cx0 + r2 + 10 + w <= b.x + b.w - 4) T(ctx, s0, cx0 + r2 + 10, cy0, { align: 'left', color: CH10.COL.flux, size: 13, weight: '700' });
      else CH6.tag(ctx, s0, b.x + b.w - 6, cy0 + Math.min(34, (r2 - r1) + 18), CH10.COL.flux, { align: 'right', size: 12 }); } }
  /* mean path and dots */
  const pts = []; for (let j = 0; j <= 96; j++) { const a = -j / 96 * 2 * Math.PI; pts.push([cx0 + rm * Math.cos(a), cy0 + rm * Math.sin(a)]); }
  if (o.hiPath) { ctx.save(); ctx.strokeStyle = CH10.COL.hi; ctx.lineWidth = Math.max(8, (r2 - r1) * 0.5); ctx.beginPath(); ctx.arc(cx0, cy0, rm, 0, 2 * Math.PI); ctx.stroke(); ctx.restore(); }
  dash(ctx, pts, CH10.COL.path, 1.3);
  const f = o.flux || 0, ref = o.ref || Math.abs(f) || 1; if (o.dots !== false && Math.abs(f) > 1e-30) CH10.dots(ctx, pts, 'tor', (st.vmax || 70) * f / ref, st, { sp: 15, r: 3.2 });
  /* coil turns across the ring */
  const [a0, a1] = (o.coil || [130, 230]).map(d => d * Math.PI / 180), n = o.turns || 12;
  ctx.save(); ctx.strokeStyle = CH10.COL.coil; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
  for (let j = 0; j < n; j++) { const a = a0 + (a1 - a0) * (j + 0.5) / n; const c = Math.cos(a), s2 = Math.sin(a); ctx.beginPath(); ctx.moveTo(cx0 + (r1 - 5) * c, cy0 - (r1 - 5) * s2); ctx.lineTo(cx0 + (r2 + 5) * c, cy0 - (r2 + 5) * s2); ctx.stroke(); }
  const la = [a0, a1].map(a => [cx0 + (r2 + 5) * Math.cos(a), cy0 - (r2 + 5) * Math.sin(a)]), lx = cx0 - r2 - 34;
  la.forEach(([x, y]) => { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(lx, y); ctx.stroke(); ctx.save(); ctx.fillStyle = CK.PAL.bg; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(lx, y, 4, 0, 2 * Math.PI); ctx.fill(); ctx.stroke(); ctx.restore(); });
  ctx.restore();
  const lb = o.labels || {};
  if (lb.i) { const y = la[1][1], x = lx + 16; arrowHead(ctx, x + 6, y, 0, COL.I, 9); T(ctx, tt(lb.i), x, y + 15, { color: COL.I, size: 13, weight: '700' }); }
  if (lb.N) { const txt = tt(lb.N); ctx.save(); ctx.font = '700 13px "IBM Plex Mono", monospace'; const w = ctx.measureText(txt).width; ctx.restore();
    if (lx - 8 - w >= b.x + 6) T(ctx, txt, lx - 8, (la[0][1] + la[1][1]) / 2, { align: 'right', color: CH10.COL.coil, size: 13, weight: '700' });
    else T(ctx, txt, Math.max(b.x + 6, lx - 6), la[0][1] - 15, { align: 'left', color: CH10.COL.coil, size: 13, weight: '700' }); }
  if (lb.r) { const a = -0.62; ctx.save(); ctx.strokeStyle = COL.muted; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(cx0, cy0); ctx.lineTo(cx0 + rm * Math.cos(a), cy0 - rm * Math.sin(a)); ctx.stroke(); ctx.restore();
    arrowHead(ctx, cx0 + rm * Math.cos(a), cy0 - rm * Math.sin(a), Math.atan2(-Math.sin(a), Math.cos(a)), COL.muted, 7); CH6.tag(ctx, tt(lb.r), cx0 + rm * 0.45 * Math.cos(a), cy0 - rm * 0.45 * Math.sin(a), COL.muted, { size: 12 }); }   // on a dark patch over the line
  if (lb.phi && Math.abs(f) > 1e-30 && o.dots !== false) { const a = -Math.PI / 4; T(ctx, tt(lb.phi), cx0 + (r2 + 12) * Math.cos(a), cy0 - (r2 + 12) * Math.sin(a), { align: 'left', color: CH10.COL.flux, size: 14, weight: '700' }); }   // outside the ring, lower right
  ctx.save(); ctx.fillStyle = COL.muted; ctx.beginPath(); ctx.arc(cx0, cy0, 2.5, 0, 2 * Math.PI); ctx.fill(); ctx.restore();
  if (o.title) T(ctx, tt(o.title), b.x + b.w - 10, b.y + 15, { align: 'right', color: COL.muted, size: 13 });
  return { cx: cx0, cy: cy0, r1, r2, rm };
};

/* B–H plane in box b. o: { mats: ['si', 'cs', 'ci'], hi: 'si', Hmax (1000), Bmax (1.4), op: {H, B, color, label: [hLabel, bLabel]}, line: {B0, H0} (load line),
   lin: {mu (H/m), color, label} (straight line B = μH), title, short, names (curve names, default true) } */
CH10.bh = (ctx, b, o = {}) => {
  CH6.bg(ctx, b); const top = o.title ? 30 : 12, ml = 46, mr = 12, mb = 36, Hm = o.Hmax ?? 1000, Bm = o.Bmax ?? 1.4, pw = b.w - ml - mr, ph = b.h - top - mb - 6;
  const X = H => b.x + ml + pw * H / Hm, Y = B => b.y + top + 6 + ph * (1 - B / Bm);
  const hs = Hm <= 300 ? 50 : Hm <= 600 ? 100 : 200, bs = Bm <= 0.8 ? 0.1 : 0.2;
  ctx.save(); ctx.strokeStyle = COL.grid; ctx.lineWidth = 1; for (let H = 0; H <= Hm + 1e-9; H += hs) { ctx.beginPath(); ctx.moveTo(X(H), Y(0)); ctx.lineTo(X(H), Y(Bm)); ctx.stroke(); }
  for (let B = 0; B <= Bm + 1e-9; B += bs) { ctx.beginPath(); ctx.moveTo(X(0), Y(B)); ctx.lineTo(X(Hm), Y(B)); ctx.stroke(); }
  ctx.strokeStyle = COL.axis; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(X(0), Y(Bm)); ctx.lineTo(X(0), Y(0)); ctx.lineTo(X(Hm), Y(0)); ctx.stroke(); ctx.restore();
  for (let H = 0; H <= Hm + 1e-9; H += hs) if (!(o.short && (H / hs) % 2)) T(ctx, fd(H, 0), X(H), Y(0) + 13, { color: COL.muted, size: 11.5 });
  for (let B = 0; B <= Bm + 1e-9; B += bs) T(ctx, fd(B, 1), X(0) - 6, Y(B), { align: 'right', color: COL.muted, size: 11.5 });
  T(ctx, 'H (At/m)', X(Hm), Y(0) + 28, { align: 'right', color: COL.ink, size: 12.5, weight: '600' }); T(ctx, 'B (T)', X(0) + 6, Y(Bm) + 2, { align: 'left', color: COL.ink, size: 12.5, weight: '600' });
  (o.mats || []).forEach(k => { const m = CH10.MAT[k], on = !o.hi || o.hi === k; ctx.save(); ctx.strokeStyle = m.color; ctx.globalAlpha = on ? 1 : 0.35; ctx.lineWidth = on ? 2.6 : 1.5; ctx.beginPath();
    for (let j = 0; j <= 120; j++) { const H = Hm * j / 120, B = Math.min(Bm, CH10.B(k, H)); j ? ctx.lineTo(X(H), Y(B)) : ctx.moveTo(X(H), Y(B)); } ctx.stroke(); ctx.restore();
    if (o.names !== false && (on || !o.short)) { const H = Hm * 0.97, B = Math.min(Bm, CH10.B(k, H)); T(ctx, tt(m.name), X(H), Y(B) - 10, { align: 'right', color: m.color, size: 12, weight: '600' }); } });
  if (o.lin) { const B1 = o.lin.mu * Hm; ctx.save(); ctx.strokeStyle = o.lin.color || COL.purple; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(X(0), Y(0)); const He = B1 > Bm ? Bm / o.lin.mu : Hm; ctx.lineTo(X(He), Y(o.lin.mu * He)); ctx.stroke(); ctx.restore();
    if (o.lin.label) T(ctx, tt(o.lin.label), X(He * 0.85) + 10, Y(o.lin.mu * He * 0.85) + 2, { align: 'left', color: o.lin.color || COL.purple, size: 12.5, weight: '600' }); }   // right of the line
  if (o.line) { const { B0, H0 } = o.line; ctx.save(); ctx.strokeStyle = COL.orange; ctx.lineWidth = 2; ctx.setLineDash([7, 5]); ctx.beginPath(); ctx.moveTo(X(0), Y(Math.min(B0, Bm))); ctx.lineTo(X(Math.min(H0, Hm)), Y(Math.max(0, B0 * (1 - Math.min(H0, Hm) / H0)))); ctx.stroke(); ctx.restore(); }
  if (o.op) { const { H, B } = o.op, col = o.op.color || '#ff7eb6', px = X(Math.min(H, Hm)), py = Y(Math.min(B, Bm));
    ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = 1.3; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, Y(0)); ctx.moveTo(px, py); ctx.lineTo(X(0), py); ctx.stroke(); ctx.restore();
    ctx.save(); ctx.fillStyle = col; ctx.beginPath(); ctx.arc(px, py, 5.5, 0, 2 * Math.PI); ctx.fill(); ctx.restore();
    const lab = o.op.label || [`H = ${fd(H, 1)}`, `B = ${fd(B, 3)} T`];
    if (lab[0]) T(ctx, tt(lab[0]), Math.min(px + 4, b.x + b.w - 8), Y(0) - 10, { align: px > b.x + b.w * 0.7 ? 'right' : 'left', color: col, size: 12.5, weight: '700' });
    if (lab[1]) T(ctx, tt(lab[1]), X(0) + 6, py - 10, { align: 'left', color: col, size: 12.5, weight: '700' }); }
  if (o.title) T(ctx, tt(o.title), b.x + 10, b.y + 15, { align: 'left', color: COL.muted, size: 13 });
  return { X, Y };
};

/* =====================================================================================================================
   3) MagBoard: the iron core across the top, the magnetic equivalent circuit (engine) and a side panel under it, waves below.
   Extra options over CH8.Board: core(ctx, box, board), cktTitle (text or board → text), coreAsp (core height / width, two-column), coreAspN
   (phones), twoAt (width from which the circuit and the side panel sit side by side, default 520), cktFrac, rowAsp, rowMin, cktAspN, sideAspN,
   noCkt (no circuit panel). board.dt holds the last frame time (for the dots in the core). */
CH10.MagBoard = class extends CH8.Board {
  resize() {
    const o = this.o, W = Math.max(300, Math.floor(this.cv.parentElement.clientWidth - 12)), two = W >= (o.twoAt ?? 520), B = { waves: [] }, nW = (o.waves || []).length;
    const ch = Math.round(W * (two ? (o.coreAsp ?? 0.44) : (o.coreAspN ?? 0.78))); B.core = { x: 0, y: 0, w: W, h: ch }; let y = ch + 6;
    const hasCkt = !o.noCkt, hasSide = !!o.side;
    if (two) { const h = Math.round(Math.max(o.rowMin ?? 230, W * (o.rowAsp ?? 0.44)));
      if (hasCkt && hasSide) { const cw = Math.round((W - 6) * (o.cktFrac ?? 0.5)); B.cktPanel = { x: 0, y, w: cw, h }; B.side = { x: cw + 6, y, w: W - cw - 6, h }; }
      else if (hasCkt) B.cktPanel = { x: 0, y, w: W, h }; else if (hasSide) B.side = { x: 0, y, w: W, h };
      if (hasCkt || hasSide) y += h + 6; }
    else { if (hasCkt) { const h = Math.round(W * (o.cktAspN ?? 0.66)); B.cktPanel = { x: 0, y, w: W, h }; y += h + 6; }
      if (hasSide) { const h = Math.round(W * (o.sideAspN ?? 0.8)); B.side = { x: 0, y, w: W, h }; y += h + 6; } }
    for (let k = 0; k < nW; k++) { const h = Math.round(Math.max(o.waveMin ?? 180, W * (two ? (o.waveAsp ?? 0.28) : 0.62))); B.waves.push({ x: 0, y, w: W, h }); y += h + 6; }
    B.ckt = B.cktPanel ? { x: B.cktPanel.x + 4, y: B.cktPanel.y + 26, w: B.cktPanel.w - 8, h: B.cktPanel.h - 30 } : { x: -9999, y: 0, w: 10, h: 10 };
    this.W = W; this.H = y - 6; this.box = B; this.two = two; this.wide = false; this.mid = two; this.slim = !!(B.side && B.side.w < (o.slimAt ?? 360));
    this.ctx = CK.setup(this.cv, W, this.H);
    const nw = W < 640; if (nw !== !!this.narrow) { this.narrow = nw; if (this.spec) this.set(this.spec, this.vo); }
    if (this.view) { this.view.ctx = this.ctx; this.view.fit(B.ckt); }
  }
  frame(dt) {
    if (!this.ctx || !this.view) return; const ctx = this.ctx, o = this.o; this.clk.tick(dt); this.dt = dt;
    ctx.fillStyle = CK.PAL.bg; ctx.fillRect(0, 0, this.W, this.H);
    if (o.core) o.core(ctx, this.box.core, this);
    if (this.box.cktPanel) { const p = this.box.cktPanel; CH6.bg(ctx, p); const ttl = tt(typeof o.cktTitle === 'function' ? o.cktTitle(this) : o.cktTitle);
      if (ttl) T(ctx, ttl, p.x + 10, p.y + 14, { align: 'left', color: COL.muted, size: 13 });
      if (this.clk.run) this.view.advance(dt); this.view.draw(); if (o.after) o.after(this.view, this); }
    if (this.box.side && o.side) o.side(ctx, this.box.side, this);
    (o.waves || []).forEach((w, k) => { const bx = this.box.waves[k]; if (!bx) return; if (w.draw) { w.draw(ctx, bx, this); return; }
      CH6.waves(ctx, bx, w.sigs(this), Object.assign({ now: this.clk.ph, title: tt(typeof w.title === 'function' ? w.title(this) : w.title) }, w.opts ? w.opts(this) : {})); });
    const bd = o.badge ? o.badge(this) : null;
    if (bd) CK.badge(ctx, tt(bd[0]), bd[1]); else CK.badge(ctx, this.clk.run ? MC.t(`▶ เล่นช้า: 1 รอบใช้ ${this.clk.T} วินาที`, `▶ slow motion: one cycle takes ${this.clk.T} s`) : MC.t('❚❚ หยุดชั่วคราว', '❚❚ paused'), this.clk.run ? 'ok' : 'wait');
  }
};
/* phones keep the magnetic circuit as it is (short names already) */
CH10.keep = sp => sp;
/* a demo canvas sized to its card, height = hOf(width); re-fitted on window resize only (not every frame) */
CH10.pane = (cv, hOf) => { const p = { cv }; p.fit = () => { p.W = Math.max(300, Math.floor(cv.parentElement.clientWidth - 12)); p.H = Math.round(hOf(p.W)); p.ctx = CK.setup(cv, p.W, p.H); };
  p.fit(); window.addEventListener('resize', p.fit); return p; };
/* a round number at or above x (axis tops) */
CH10.nice = x => { if (!(x > 0)) return 1; const e = Math.pow(10, Math.floor(Math.log10(x))); return [1, 2, 2.5, 5, 10].map(m => m * e).find(v => v >= x * 0.999); };
/* view options for a magnetic equivalent circuit: cyan flux dots, At/Wb tooltips, tiny fluxes still move */
CH10.mview = { dotColor: '#5ad1ff', dotMin: 1e-15, tip: (p, c) => CH10.mtip(p, c), acPeak: false, acPower: false };

/* =====================================================================================================================
   4) tooltips of a magnetic equivalent circuit: V = mmf source (At), R = reluctance (At/Wb), current = flux (Wb) */
CH10.mtip = (p, c) => { const name = p.name ?? p.id, phi = Math.abs(c.I(p.id).re);
  /* four significant figures: the solver's 1e-12 S node leak moves the fifth one in circuits of 10⁷ At/Wb */
  if (p.type === 'V') return [name, `F = ${fd(p.value, 2)} At`, `Φ = ${CH10.sci(phi, 3)} Wb`];
  if (p.type === 'R') return [name, `ℛ = ${CH10.sci(p.value, 4)} At/Wb`, `Φ = ${CH10.sci(phi, 3)} Wb`, MC.t(`mmf ที่ใช้ = ${fd(phi * p.value, 1)} At`, `mmf drop = ${fd(phi * p.value, 1)} At`)];
  if (p.type === 'W') return null; return [name]; };

global.CH10 = CH10;
})(window);
