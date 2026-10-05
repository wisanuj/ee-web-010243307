/* ch6.js — chapter 6: sinusoids, effective (rms) value, phasors, phasor relations of R, L, C, impedance and admittance.
   Course convention (slides p. 9): a phasor uses the SINE reference and the PEAK value,  v(t) = Vm sin(ωt + θ)  ⇄  V = Vm∠θ.
   The engine (circuit.js) solves phasors without caring which reference is meant. Animations run its clock a quarter period
   behind (CH6.clock().at(ω) = (ωt − 90°)/ω) so that dots and traces follow Vm sin(ωt + θ), and views set acPeak so that
   tooltips show peak phasors, as the slides write them.
   1) numbers: angle wrap, polar / rectangular TeX, rule-by-rule rewriting of a sinusoid into the sine form (slide p. 5)
   2) canvas pieces: a phasor plane (rotating arrows, shadows on the imaginary axis, angle arcs), waveforms over ωt, a slow clock
   3) Trio: circuit with moving dots + phasor plane + waveforms on one canvas (side by side when wide, stacked on phones)
   4) quiz rows (angles compared modulo 360°, phasors compared as complex numbers so −10∠60° and 10∠−120° both count) */
(function (global) {
'use strict';
const CH6 = {};
const Cx = CK.Cx, cx = Cx.c;
const tt = p => (p ? (Array.isArray(p) ? MC.t(p[0], p[1]) : p) : '');
const COL = { V: '#5ad1ff', I: '#ffd166', ref: '#7ee787', sig: '#ff7eb6', purple: '#c792ea', orange: '#ffa552', red: '#ff6b6b',
  ink: '#e8ecf7', muted: '#9aa3c7', grid: '#262c4a', axis: '#6b7399', panel: '#121629', frame: '#2a3150' };
CH6.COL = COL;

/* =====================================================================================================================
   numbers */
const fd = (x, d = 4) => { const s = ALG.fmtDec(Math.abs(x) < 0.5 * Math.pow(10, -d) ? 0 : x, d); return s === '-0' ? '0' : s; };
CH6.fd = fd;
/* angle in degrees reduced to (−180°, 180°] */
CH6.wrap = a => { a = ((a % 360) + 360) % 360; if (a > 180 + 1e-9) a -= 360; return Math.abs(a) < 1e-9 ? 0 : a; };
CH6.deg = z => Math.atan2(z.im, z.re) * 180 / Math.PI;
CH6.polar = (m, a) => cx(m * Math.cos(a * Math.PI / 180), m * Math.sin(a * Math.PI / 180));
/* TeX: 2.0616\angle{13.964^\circ} ;  4.2549 + j4.9288 ;  -j0.4 */
CH6.pol = (z, d = 4, ad = 3) => `${fd(Cx.abs(z), d)}\\angle{${fd(CH6.wrap(CH6.deg(z)), ad)}^\\circ}`;
CH6.polMA = (m, a, d = 4, ad = 3) => `${fd(m, d)}\\angle{${fd(a, ad)}^\\circ}`;
CH6.rect = (z, d = 4) => { const re = fd(z.re, d), im = fd(Math.abs(z.im), d);
  if (re === '0' && im !== '0') return `${z.im < 0 ? '-' : ''}j${im}`; if (im === '0') return re; return `${re} ${z.im < 0 ? '-' : '+'} j${im}`; };
/* canvas text: 2.062 A ∠ 13.96° */
CH6.polTxt = (z, unit = '', d = 3, ad = 2) => `${fd(Cx.abs(z), d)}${unit ? ' ' + unit : ''} ∠ ${fd(CH6.wrap(CH6.deg(z)), ad).replace('-', '−')}°`;
CH6.num = x => fd(x, 4).replace('-', '−');

/* ---------------- sinusoids:  s = {A, fn: 'sin'|'cos', w, wTex?, ph (deg), Atex?} ---------------- */
const argTex = (s, ph) => `${s.wTex ? s.wTex + (/\\[a-zA-Z]+$/.test(s.wTex) ? ' ' : '') : fd(s.w)}t${Math.abs(ph) < 1e-9 ? '' : (ph < 0 ? ' - ' : ' + ') + fd(Math.abs(ph), 3) + '^\\circ'}`;
const ampTex = (s, A) => s.Atex ? (A < 0 ? '-' : '') + s.Atex : fd(A);
CH6.argTex = argTex;
CH6.sigTex = (s, o = {}) => { const A = o.A ?? s.A, fn = o.fn ?? s.fn, ph = o.ph ?? s.ph; return `${ampTex(s, A)}\\${fn}(${argTex(s, ph)})`; };
/* value of the sinusoid at phase ωt = x (rad) */
CH6.sigAt = (s, x) => s.A * (s.fn === 'cos' ? Math.cos : Math.sin)(x + s.ph * Math.PI / 180);
/* rewrite in the sine form with a positive amplitude, one identity per row (slide p. 5: same function, positive amplitude).
   Returns {mag, ang, lines: TeX rows for an aligned block, uses: ['cos', 'neg', 'wrap']} */
CH6.toSine = (s, name = 'v') => {
  let A = s.A, ph = s.ph; const L = [`${name}(t) &= ${CH6.sigTex(s)}`], uses = [];
  const row = (A2, p2) => CH6.sigTex(s, { A: A2, fn: 'sin', ph: p2 });
  if (s.fn === 'cos') { L.push(`&= ${ampTex(s, A)}\\sin(${argTex(s, ph)} + 90^\\circ)`); ph += 90; L.push(`&= ${row(A, ph)}`); uses.push('cos'); }
  if (A < 0) { const sh = ph > 0 ? -180 : 180; L.push(`&= ${ampTex(s, -A)}\\sin(${argTex(s, ph)} ${sh < 0 ? '-' : '+'} 180^\\circ)`); A = -A; ph += sh; L.push(`&= ${row(A, ph)}`); uses.push('neg'); }
  const w = CH6.wrap(ph); if (Math.abs(w - ph) > 1e-9) { ph = w; L.push(`&= ${row(A, ph)}`); uses.push('wrap'); }
  return { mag: A, ang: ph, lines: L, uses };
};
/* angle by which i lags v (phases in degrees), reduced to (−180°, 180°] */
CH6.lag = (angV, angI) => CH6.wrap(angV - angI);

/* =====================================================================================================================
   canvas pieces */
const T = (ctx, s, x, y, o) => CK.View.prototype.text.call({ ctx }, s, x, y, o);
CH6.text = T;
const textW = (ctx, s, size, weight = '') => { ctx.save(); ctx.font = `${weight} ${size}px "IBM Plex Mono", monospace`.trim(); const w = ctx.measureText(String(s).replace(/_\{([^}]*)\}|_/g, '$1')).width; ctx.restore(); return w; };
const arrow = (ctx, x0, y0, x1, y1, col, w = 3, dash) => { const L = Math.hypot(x1 - x0, y1 - y0); if (L < 1.5) return; const a = Math.atan2(y1 - y0, x1 - x0), hl = Math.min(13, Math.max(7, L * 0.28));
  ctx.save(); ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round'; if (dash) ctx.setLineDash(dash);
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1 - Math.cos(a) * hl * 0.6, y1 - Math.sin(a) * hl * 0.6); ctx.stroke(); ctx.setLineDash([]);
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1 - hl * Math.cos(a - 0.42), y1 - hl * Math.sin(a - 0.42)); ctx.lineTo(x1 - hl * Math.cos(a + 0.42), y1 - hl * Math.sin(a + 0.42)); ctx.closePath(); ctx.fill(); ctx.restore(); };
CH6.arrow = arrow;
const bg = (ctx, b) => { ctx.save(); ctx.fillStyle = COL.panel; ctx.fillRect(b.x, b.y, b.w, b.h); ctx.strokeStyle = COL.frame; ctx.lineWidth = 1; ctx.strokeRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1); ctx.restore(); };
CH6.bg = bg;
/* label inside a box: keeps the text within [x0, x1] */
const label = (ctx, s, x, y, align, col, size, b) => { const w = textW(ctx, s, size, '700'); let xl = align === 'left' ? x : align === 'right' ? x - w : x - w / 2;
  xl = Math.max(b.x + 4, Math.min(b.x + b.w - 4 - w, xl)); const yy = Math.max(b.y + size, Math.min(b.y + b.h - size * 0.7, y)); T(ctx, s, xl, yy, { align: 'left', color: col, size, weight: '700' }); };

/* text on a dark rounded patch, readable over curves */
CH6.tag = (ctx, s, x, y, col, o = {}) => { const size = o.size || 12.5, w = textW(ctx, s, size, '700') + 12, h = size + 8, x0 = o.align === 'left' ? x : o.align === 'right' ? x - w : x - w / 2;
  ctx.save(); ctx.fillStyle = 'rgba(15,18,32,.88)'; ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x0, y - h / 2, w, h, 5); else ctx.rect(x0, y - h / 2, w, h); ctx.fill(); ctx.stroke(); ctx.restore();
  T(ctx, s, x0 + w / 2, y + 0.5, { color: col, size, weight: '700' }); return w; };

/* slow clock of one canvas: ph = ωt of the animation (rad). Default: one cycle every T seconds whatever the real ω.
   at(ω): engine time for sine-referenced dots — Re(P e^{jω·at}) = Re(P e^{j(ph − 90°)}) = Im(P e^{j·ph}) = |P| sin(ph + ∠P) */
CH6.clock = (o = {}) => ({ ph: o.ph ?? 0, run: true, T: o.T ?? 4, rate: o.rate || null, base: o.base || null,
  tick(dt) { if (this.run) this.ph += dt * (this.rate ? this.rate() : 2 * Math.PI / this.T); },
  /* with base set, ph = base·t is one shared time for circuits at different ω (superposition of frequencies, chapter 7) */
  at(w) { return this.base ? this.ph / this.base - Math.PI / (2 * w) : (this.ph - Math.PI / 2) / w; } });

/* phasor plane in box b.
   vecs: [{z, color, label, from (start point, for head-to-tail sums), g (scale group: quantities in different units get their
          own scale), dash, w, proj: false (no shadow), lmid: ±1 (label beside the middle of the arrow, on its left/right)}]
   o: {rot (rad: every arrow turned by ωt), title, proj (dashed line from each tip to the imaginary axis: the value of a sine),
       arcs: [{a, b, color, text, r}] (angle from vecs[a] to vecs[b]), max: {group: magnitude}, circle (false: no circle),
       cx, cy, R (centre and radius in px, to line the plane up with a waveform)} */
CH6.plane = (ctx, b, vecs, o = {}) => {
  bg(ctx, b); const top = o.title ? 30 : 10;
  const cx0 = o.cx ?? b.x + b.w / 2, cy0 = o.cy ?? b.y + top + (b.h - top - 6) / 2, R = o.R ?? Math.max(28, Math.min(b.w / 2 - 22, (b.h - top - 6) / 2 - 18));
  ctx.save(); ctx.strokeStyle = COL.grid; ctx.lineWidth = 1; if (o.circle !== false) { ctx.beginPath(); ctx.arc(cx0, cy0, R, 0, 2 * Math.PI); ctx.stroke(); }
  ctx.strokeStyle = COL.axis; ctx.beginPath(); ctx.moveTo(b.x + 10, cy0); ctx.lineTo(b.x + b.w - 10, cy0); ctx.moveTo(cx0, b.y + top); ctx.lineTo(cx0, b.y + b.h - 8); ctx.stroke(); ctx.restore();
  T(ctx, 'Re', b.x + b.w - 12, cy0 - 11, { align: 'right', color: COL.ink, size: 13, weight: '600' }); T(ctx, 'Im', cx0 + 8, b.y + top + 8, { align: 'left', color: COL.ink, size: 13, weight: '600' });
  if (o.title) T(ctx, o.title, b.x + 10, b.y + 15, { align: 'left', color: COL.muted, size: 13 });
  const mx = {}; vecs.forEach(v => { const g = v.g || 'a'; mx[g] = Math.max(mx[g] || 0, Cx.abs(v.z), Cx.abs(Cx.add(v.from || cx(0), v.z)), v.from ? Cx.abs(v.from) : 0); });
  if (o.max) Object.assign(mx, o.max);
  const e = cx(Math.cos(o.rot || 0), Math.sin(o.rot || 0));
  const P = (z, g) => { const s = R / Math.max(mx[g || 'a'] || 1e-12, 1e-12); const q = Cx.mul(z, e); return [cx0 + q.re * s, cy0 - q.im * s]; };
  const pts = vecs.map(v => { const f = v.from || cx(0); return { v, a: P(f, v.g), b: P(Cx.add(f, v.z), v.g) }; });
  if (o.proj) pts.forEach(({ v, b: q }) => { if (v.proj === false || Cx.abs(v.z) < 1e-12) return; ctx.save(); ctx.setLineDash([4, 4]); ctx.strokeStyle = v.color; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(q[0], q[1]); ctx.lineTo(cx0, q[1]); ctx.stroke(); ctx.restore();
    ctx.save(); ctx.fillStyle = v.color; ctx.beginPath(); ctx.arc(cx0, q[1], 4, 0, 2 * Math.PI); ctx.fill(); ctx.restore(); });
  (o.arcs || []).forEach(ar => { const A = vecs[ar.a], B = vecs[ar.b]; if (!A || !B || Cx.abs(A.z) < 1e-12 || Cx.abs(B.z) < 1e-12) return;
    const za = Cx.mul(A.z, e), zb = Cx.mul(B.z, e); const a1 = Math.atan2(za.im, za.re); let d = Math.atan2(zb.im, zb.re) - a1; while (d > Math.PI) d -= 2 * Math.PI; while (d <= -Math.PI) d += 2 * Math.PI;
    if (Math.abs(d) < 0.01) return; const rr = R * (ar.r || 0.3); ctx.save(); ctx.strokeStyle = ar.color || COL.sig; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx0, cy0, rr, -a1, -(a1 + d), d > 0); ctx.stroke(); ctx.restore();
    const am = a1 + d / 2; const txt = ar.text ?? `${fd(Math.abs(d) * 180 / Math.PI, 1)}°`; label(ctx, txt, cx0 + (rr + 16) * Math.cos(am), cy0 - (rr + 16) * Math.sin(am), 'center', ar.color || COL.sig, 13, b); });
  pts.forEach(({ v, a, b: q }) => arrow(ctx, a[0], a[1], q[0], q[1], v.color, v.w || 3.2, v.dash));
  pts.forEach(({ v, a, b: q }) => { if (!v.label) return; const dx = q[0] - a[0], dy = q[1] - a[1], L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
    if (v.lmid) { const nx = uy, ny = -ux, s = v.lmid; const x = (a[0] + q[0]) / 2 + nx * 16 * s, y = (a[1] + q[1]) / 2 + ny * 16 * s; // beside the middle of the arrow
      label(ctx, v.label, x, y, nx * s > 0.3 ? 'left' : nx * s < -0.3 ? 'right' : 'center', v.color, v.size || 14, b); return; }
    label(ctx, v.label, q[0] + ux * 13 + (v.lx || 0), q[1] + uy * 13 + (v.ly || 0), ux > 0.3 ? 'left' : ux < -0.3 ? 'right' : 'center', v.color, v.size || 14, b); });
  return { cx: cx0, cy: cy0, R, P };
};

/* waveforms over ωt in degrees (optionally with the time in ms underneath).
   sigs: [{mag, ang (deg), color, label, unit, g (scale group), w, dash, peak (mark the first positive peak)}]
   o: {span (deg, default 720), now (rad, cursor), title, w (rad/s: adds a time axis in ms), values (default true), max: {group: value},
       Y (v, g) → px (vertical map, to share the scale of a phasor plane), marks: [{deg, text, color}], pos (values ≥ 0: axis at the bottom)}
   a sig may give f(deg) instead of mag/ang (any curve, e.g. a power), and fill (colour under the curve) */
CH6.waves = (ctx, b, sigs, o = {}) => {
  bg(ctx, b); const span = o.span || 720, ml = 16, mr = 16, mt = o.title ? 32 : 14, mb = o.w ? 42 : 26;
  const x0 = b.x + ml, pw = b.w - ml - mr, y0 = b.y + mt, ph = b.h - mt - mb, ym = o.pos ? y0 + ph * 0.94 : y0 + ph / 2; const X = d => x0 + pw * d / span;
  const per = pw / (span / 90), lab = per < 34 ? 360 : per < 52 ? 180 : 90;
  ctx.save(); ctx.lineWidth = 1;
  for (let d = 0; d <= span + 1e-9; d += 90) { ctx.strokeStyle = d % 360 === 0 ? '#323a5e' : COL.grid; ctx.beginPath(); ctx.moveTo(X(d), y0); ctx.lineTo(X(d), y0 + ph); ctx.stroke();
    if (d % lab === 0) { T(ctx, `${d}°`, X(d), y0 + ph + 12, { color: COL.muted, size: 12, align: d === 0 ? 'left' : d === span ? 'right' : 'center' });
      if (o.w) { const ms = d * Math.PI / 180 / o.w * 1000, v = ms >= 100 ? fd(ms, 0) : ms >= 10 ? fd(ms, 1) : fd(ms, 2);
        T(ctx, d === span ? `${v} ms` : v, X(d), y0 + ph + 29, { color: '#8f98bd', size: 11.5, align: d === 0 ? 'left' : d === span ? 'right' : 'center' }); } } }
  ctx.strokeStyle = COL.axis; ctx.beginPath(); ctx.moveTo(x0, ym); ctx.lineTo(x0 + pw, ym); ctx.stroke(); ctx.restore();
  T(ctx, 'ωt', x0 + pw - 2, ym - 10, { align: 'right', color: COL.ink, size: 13, weight: '600' });
  const mx = {}; sigs.forEach(s => { const g = s.g || 'a'; mx[g] = Math.max(mx[g] || 0, Math.abs(s.mag)); }); if (o.max) Object.assign(mx, o.max);
  const Y = o.Y || ((v, g) => ym - v / Math.max(mx[g || 'a'] || 1e-12, 1e-12) * ph * (o.pos ? 0.82 : 0.44));
  sigs.forEach(s => { if (s.fill) { ctx.save(); ctx.fillStyle = s.fill; ctx.beginPath(); ctx.moveTo(X(0), ym); for (let k = 0; k <= 240; k++) { const d = span * k / 240; ctx.lineTo(X(d), Y(s.f ? s.f(d) : s.mag * Math.sin((d + s.ang) * Math.PI / 180), s.g)); } ctx.lineTo(X(span), ym); ctx.closePath(); ctx.fill(); ctx.restore(); } });
  sigs.forEach(s => { ctx.save(); ctx.strokeStyle = s.color; ctx.lineWidth = s.w || 2.4; if (s.dash) ctx.setLineDash(s.dash); ctx.beginPath();
    for (let k = 0; k <= 240; k++) { const d = span * k / 240; const v = s.f ? s.f(d) : s.mag * Math.sin((d + s.ang) * Math.PI / 180); const y = Y(v, s.g); k ? ctx.lineTo(X(d), y) : ctx.moveTo(X(d), y); } ctx.stroke(); ctx.restore(); });
  sigs.forEach(s => { if (!s.peak || s.f || Math.abs(s.mag) < 1e-12) return; const d = ((90 - s.ang) % 360 + 360) % 360; const px = X(d), py = Y(Math.abs(s.mag), s.g);
    ctx.save(); ctx.setLineDash([3, 4]); ctx.strokeStyle = s.color; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, ym); ctx.stroke(); ctx.restore();
    ctx.save(); ctx.fillStyle = s.color; ctx.beginPath(); ctx.moveTo(px, py - 4); ctx.lineTo(px - 6, py - 13); ctx.lineTo(px + 6, py - 13); ctx.closePath(); ctx.fill(); ctx.restore(); });
  (o.marks || []).forEach(m => { const px = X(m.deg); ctx.save(); ctx.strokeStyle = m.color || COL.muted; ctx.setLineDash(m.dash || [2, 3]); ctx.beginPath(); ctx.moveTo(px, y0); ctx.lineTo(px, y0 + ph); ctx.stroke(); ctx.restore(); if (m.text) T(ctx, m.text, px + 4, y0 + 12, { align: 'left', color: m.color || COL.muted, size: 12.5, weight: '600' }); });
  let cur = null;
  if (o.now !== undefined && o.now !== null) { cur = ((o.now * 180 / Math.PI) % span + span) % span; const px = X(cur);
    ctx.save(); ctx.strokeStyle = 'rgba(232,236,247,.55)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(px, y0); ctx.lineTo(px, y0 + ph); ctx.stroke(); ctx.restore();
    sigs.forEach(s => { const v = s.f ? s.f(cur) : s.mag * Math.sin((cur + s.ang) * Math.PI / 180); ctx.save(); ctx.fillStyle = s.color; ctx.beginPath(); ctx.arc(px, Y(v, s.g), 4.2, 0, 2 * Math.PI); ctx.fill(); ctx.restore(); }); }
  if (o.title) T(ctx, o.title, b.x + 10, b.y + 15, { align: 'left', color: COL.muted, size: 13 });
  if (o.values !== false) { let lx = b.x + b.w - 10; const ly = b.y + 15; [...sigs].reverse().forEach(s => { if (!s.label) return;
    const v = cur === null ? null : (s.f ? s.f(cur) : s.mag * Math.sin((cur + s.ang) * Math.PI / 180)); const txt = s.label + (v === null || s.noValue ? '' : ` = ${fd(v, Math.abs(s.mag) >= 100 ? 0 : Math.abs(s.mag) >= 10 ? 1 : Math.abs(s.mag) >= 1 ? 2 : 3).replace('-', '−')}${s.unit ? ' ' + s.unit : ''}`);
    const w = textW(ctx, txt, 13, '600'); if (lx - w < b.x + (o.title ? textW(ctx, o.title, 13) + 24 : 10)) return; T(ctx, txt, lx, ly, { align: 'right', color: s.color, size: 13, weight: '600' }); lx -= w + 18; }); }
  return { X, Y, x0, pw, y0, ph, ym };
};

/* =====================================================================================================================
   Trio: circuit (dots) + phasor plane + waveforms on one canvas.
   o: {vecs(trio) → plane vectors, sigs(trio) → waveforms, after(view, trio) overlay on the circuit, planeOpts(trio), waveOpts(trio),
       planeTitle, waveTitle ([th, en], or trio → [th, en]), noPlane, noWave, T (seconds per cycle), pad, cktFrac, topAsp, waveAsp,
       mid (from midMin = 520 px: circuit across the top, plane and waveforms side by side under it — for a problem column, chapter 6),
       badge(trio) → [text, 'ok'|'wait'] instead of the playback badge, minW (px: a wide circuit keeps this width and its card scrolls sideways)} */
/* phones: one short label per part (the impedance for L, C, Z; no value line for sources), so labels do not collide, and
   invisible margin nodes left/right so that the labels of the outermost vertical parts stay on the canvas (pad = the view's pad) */
CH6.shortLabels = (spec, pad = 1.2) => {
  const parts = spec.parts.map(p => { if (typeof p.valText !== 'string' || !p.valText) return p;
    if (/Ω/.test(p.valText) && (p.type === 'L' || p.type === 'C' || p.type === 'Z')) return { ...p, name: p.valText, valText: '' };
    if (p.type === 'VAC' || p.type === 'IAC' || p.type === 'V' || p.type === 'I') return { ...p, valText: '' }; return p; });
  const N = spec.nodes, xs = Object.values(N).map(q => q[0]), x0 = Math.min(...xs), x1 = Math.max(...xs), ys = Object.values(N).map(q => q[1]), ym = (Math.min(...ys) + Math.max(...ys)) / 2;
  const len = s => String(s ?? '').replace(/_\{([^}]*)\}/g, '$1').replace(/_/g, '').length; let needL = 0, needR = 0;
  parts.forEach(p => { if (p.type === 'W' || p.label === false || p.hidden || !N[p.a] || !N[p.b] || Math.abs(N[p.a][0] - N[p.b][0]) > 1e-9) return;
    const w = (p.labelOff || 0.62) + 0.31 * Math.max(len(p.name ?? ''), len(p.valText)), x = N[p.a][0], side = p.side || 1;
    if (side > 0 && Math.abs(x - x1) < 1e-9) needR = Math.max(needR, w); if (side < 0 && Math.abs(x - x0) < 1e-9) needL = Math.max(needL, w); });
  const nodes = { ...N }; if (needR > pad) nodes._padR = [x1 + needR - pad, ym]; if (needL > pad) nodes._padL = [x0 - (needL - pad), ym];
  return { ...spec, nodes, parts };
};
CH6.Trio = class {
  constructor(cv, o = {}) { this.cv = typeof cv === 'string' ? document.getElementById(cv) : cv; this.o = o; this.clk = o.clock || CH6.clock({ T: o.T || 4 }); this.spin = o.spin ?? true; }
  set(spec, vo = {}) {
    this.spec = spec; this.vo = vo; const c = new CK.Circuit(this.narrow ? CH6.shortLabels(spec, this.o.pad ?? 1.2) : spec); c.solve(); this.ckt = c; let imax = 0;
    c.parts.forEach(p => { if (p.type !== 'VM' && p.type !== 'O') imax = Math.max(imax, Cx.abs(c.I(p.id))); }); this.imax = imax;
    this.view = new CK.View(this.cv, c, Object.assign({ speed: (this.o.dotSpeed || 95) / Math.max(imax, 1e-12), ground: false, showI: false, pad: this.o.pad ?? 1.2, tips: true,
      acPeak: true, dotRef: imax, acTime: () => this.clk.at(c.w) }, vo));
    if (this.ctx) { this.view.ctx = this.ctx; this.view.fit(this.box.ckt); }
    return c;
  }
  resize() {
    const o = this.o, W = Math.max(o.minW || 320, Math.floor(this.cv.parentElement.clientWidth - 12)), wide = W >= 760, B = {}; let H;   // minW: the card then needs .hscroll
    const hasP = !o.noPlane, hasW = !o.noWave;
    if (wide) { const top = Math.round(W * (o.topAsp ?? 0.4)), cw = hasP ? Math.round(W * (o.cktFrac ?? 0.56)) : W;
      B.ckt = { x: 0, y: 34, w: cw, h: top - 34 }; if (hasP) B.ph = { x: cw + 6, y: 0, w: W - cw - 6, h: top };
      let y = top + 6; if (hasW) { const h = Math.max(190, Math.round(W * (o.waveAsp ?? 0.22))); B.wave = { x: 0, y, w: W, h }; y += h; } H = y; }
    else if (o.mid && W >= (o.midMin ?? 520)) { const ch = Math.round(W * (o.cktAspM ?? 0.42)); B.ckt = { x: 0, y: 34, w: W, h: ch - 34 }; const y = ch + 6, h = Math.round(Math.max(220, Math.min(330, W * 0.42))), pw = hasW ? Math.round(W * 0.42) : W;
      if (hasP) B.ph = { x: 0, y, w: pw, h }; if (hasW) B.wave = { x: hasP ? pw + 6 : 0, y, w: hasP ? W - pw - 6 : W, h }; H = y + h; }
    else { const ch = Math.round(W * (o.cktAspN ?? 0.72)); B.ckt = { x: 0, y: 34, w: W, h: ch }; let y = ch + 40;
      if (hasP) { const h = Math.round(W * 0.84); B.ph = { x: 0, y, w: W, h }; y += h + 6; }
      if (hasW) { const h = Math.round(Math.max(200, W * 0.64)); B.wave = { x: 0, y, w: W, h }; y += h; } H = y; }
    this.W = W; this.H = H; this.box = B; this.wide = wide; this.ctx = CK.setup(this.cv, W, H);
    const nw = W < 640; if (nw !== !!this.narrow) { this.narrow = nw; if (this.spec) this.set(this.spec, this.vo); }
    if (this.view) { this.view.ctx = this.ctx; this.view.fit(B.ckt); }
  }
  frame(dt) {
    if (!this.ctx || !this.view) return; const ctx = this.ctx, o = this.o; this.clk.tick(dt);
    ctx.fillStyle = CK.PAL.bg; ctx.fillRect(0, 0, this.W, this.H);
    if (this.clk.run) this.view.advance(dt); this.view.draw(); if (o.after) o.after(this.view, this);
    if (this.box.ph) CH6.plane(ctx, this.box.ph, o.vecs ? o.vecs(this) : [], Object.assign({ rot: this.spin ? this.clk.ph : 0, proj: this.spin,
      title: this.spin ? MC.t('เฟเซอร์หมุนด้วย ωt (ค่ายอด)', 'phasors turning with ωt (peak)') : MC.t('เฟเซอร์ที่ t = 0 (ค่ายอด)', 'phasors at t = 0 (peak)') }, o.planeOpts ? o.planeOpts(this) : {}));
    if (this.box.wave) CH6.waves(ctx, this.box.wave, o.sigs ? o.sigs(this) : [], Object.assign({ now: this.clk.ph, title: tt(typeof o.waveTitle === 'function' ? o.waveTitle(this) : o.waveTitle) || MC.t('รูปคลื่นตามเวลา', 'waveforms in time') }, o.waveOpts ? o.waveOpts(this) : {}));
    const bd = o.badge ? o.badge(this) : null;
    CK.badge(ctx, bd ? bd[0] : this.clk.run ? MC.t(`▶ เล่นช้า: 1 รอบใช้ ${this.clk.T} วินาที`, `▶ slow motion: one cycle takes ${this.clk.T} s`) : MC.t('❚❚ หยุดชั่วคราว', '❚❚ paused'), bd ? bd[1] : this.clk.run ? 'ok' : 'wait');
  }
};
/* playback buttons for a clock (and the spin switch of a trio) */
CH6.playBtns = (panel, clk, trio) => MC.ui.buttons(panel, [
  { label: MC.t('หยุด', 'Pause'), on: true, onclick: el => { clk.run = !clk.run; el.textContent = clk.run ? MC.t('หยุด', 'Pause') : MC.t('เล่นต่อ', 'Resume'); el.classList.toggle('on', clk.run); } },
  ...(trio ? [{ label: MC.t('เฟเซอร์หมุน', 'Phasors spin'), on: trio.spin, onclick: el => { trio.spin = !trio.spin; el.classList.toggle('on', trio.spin); } }] : []),
  { label: MC.t('ช้าลง', 'Slower'), onclick: () => { clk.T = Math.min(16, clk.T * 2); } }, { label: MC.t('เร็วขึ้น', 'Faster'), onclick: () => { clk.T = Math.max(1, clk.T / 2); } }]);

/* largest current in a solved circuit (for dot speeds) */
CH6.imax = c => c.parts.reduce((m, p) => (p.type === 'VM' || p.type === 'O') ? m : Math.max(m, Cx.abs(c.I(p.id))), 0);

/* =====================================================================================================================
   quiz rows.  rows: [{q (HTML), fields: [{key, lab, ans, ang (compare modulo 360°), tol, unit}], cz (optional complex answer:
   the fields 'm' and 'a' are read as m∠a and compared as one phasor), work (HTML for "show working")}] */
CH6.quiz = (el, rows, o = {}) => {
  el = typeof el === 'string' ? document.getElementById(el) : el; const id0 = o.id || el.id || 'qz', score = {};
  el.innerHTML = `<div class="score" id="${id0}_s"></div><div class="quiz">` + rows.map((r, k) => `<div class="qrow${o.wide ? ' wide' : ''}"><div class="q">${r.q}</div><div class="ins">${r.fields.map(f =>
    `<label>${f.lab} <input id="${id0}_${k}_${f.key}" inputmode="decimal" autocomplete="off" aria-label="${f.aria || f.key}"></label>${f.unit ? ' ' + f.unit : ''}`).join(' ')}</div>` +
    `<div class="toggles"><button type="button" class="btn on" data-k="${k}">${MC.t('ตรวจ', 'Check')}</button><span class="res" id="${id0}_${k}_res"></span></div>` +
    (r.work ? `<details><summary>${MC.t('ดูวิธีทำ', 'Show working')}</summary>${r.work}</details>` : '') + '</div>').join('') + '</div>';
  const num = id => { const v = document.getElementById(id).value.trim().replace(/−/g, '-').replace(',', '.'); return v === '' ? NaN : Number(v); };
  const near = (x, y, tol) => Math.abs(x - y) <= (tol ?? Math.max(0.011, 0.006 * Math.abs(y)));
  const mark = (id, ok) => { const e = document.getElementById(id); e.classList.remove('ok', 'no'); e.classList.add(ok ? 'ok' : 'no'); };
  const check = k => { const r = rows[k]; let ok = true;
    if (r.cz) { const m = num(`${id0}_${k}_m`), a = num(`${id0}_${k}_a`); const z = CH6.polar(m, a); const good = isFinite(m) && isFinite(a) && Cx.abs(Cx.sub(z, r.cz)) <= Math.max(0.011, 0.006 * Cx.abs(r.cz));
      mark(`${id0}_${k}_m`, good); mark(`${id0}_${k}_a`, good); if (!good) ok = false; }
    r.fields.forEach(f => { if (r.cz && (f.key === 'm' || f.key === 'a')) return; const id = `${id0}_${k}_${f.key}`, x = num(id);
      const good = isFinite(x) && (f.ang ? Math.abs(CH6.wrap(x - f.ans)) <= (f.tol ?? 0.6) : near(x, f.ans, f.tol)); mark(id, good); if (!good) ok = false; });
    document.getElementById(`${id0}_${k}_res`).innerHTML = ok ? '<span class="pill good">✓</span>' : `<span class="pill bad">✗</span> ${MC.t('ลองอีกครั้ง', 'try again')}`;
    score[k] = ok; const n = Object.values(score).filter(Boolean).length;
    document.getElementById(id0 + '_s').innerHTML = MC.t(`ถูกแล้ว <b>${n}</b> จาก ${rows.length} ข้อ`, `<b>${n}</b> of ${rows.length} correct`); };
  el.querySelectorAll('button[data-k]').forEach(b => b.addEventListener('click', () => check(+b.dataset.k)));
  el.querySelectorAll('input').forEach(inp => inp.addEventListener('keydown', e => { if (e.key === 'Enter') check(+inp.id.slice(id0.length + 1).split('_')[0]); }));
  MC.renderMath(el);
};

/* fit a canvas to its card: returns {ctx, W, H} with H = h(W) */
CH6.fit = (cv, h) => { const W = Math.max(320, Math.floor(cv.parentElement.clientWidth - 12)); const H = Math.round(h(W)); return { ctx: CK.setup(cv, W, H), W, H }; };

global.CH6 = CH6;
})(window);
