/* ch9.js — chapter 9: polyphase (three-phase) circuits.
   Builds on ch6.js (clock, phasor plane, waveforms, quiz), ch8.js (Board, power triangle) and ch9_circuits.js (the circuits).
   1) phase colours (a red, b yellow, c blue, line voltages purple) and phasor sets for CH6.plane
   2) circuit overlays: terminal letters (a b c n at the source, A B C N at the load, as in the instructor's note), part tags
   3) a two-pole three-phase generator: a rotor magnet turning inside three coils 120° apart, each coil lit by its own voltage */
(function (global) {
'use strict';
const CH9 = {};
const Cx = CK.Cx, cx = Cx.c, COL = CH6.COL, T = CH6.text, fd = CH6.fd, D2R = Math.PI / 180;
CH9.COL = { a: '#ff6b6b', b: '#ffd166', c: '#5ad1ff', L: '#c792ea', n: '#9aa3c7', S: '#ff7eb6', P: '#7ee787' };
CH9.K = ['a', 'b', 'c'];

/* phasor-plane vectors of a three-phase set: list of complex values, names (TeX-like labels), group, style */
CH9.set = (Z, names, o = {}) => Z.map((z, k) => ({ z, color: o.colors ? o.colors[k] : CH9.COL[CH9.K[k]], label: names[k], g: o.g || 'v', w: o.w || 3, dash: o.dash, lx: o.lx, ly: o.ly }));

/* phones: impedances show their names only (the values are in the panel) — use as a Board's shortSpec */
CH9.short = sp => { const nodes = { ...sp.nodes }; delete nodes._padR; delete nodes._padL; return { ...sp, nodes, parts: sp.parts.map(p => p.type === 'Z' ? { ...p, valText: '' } : p) }; };
/* terminal letters next to nodes: map {node: [dx, dy] (grid units)} — the letter is the node name unless o.text[node] is given */
CH9.letters = (v, map, o = {}) => { const u = v.u, sz = Math.max(13, u * 0.36);
  Object.entries(map).forEach(([n, [dx, dy]]) => { if (!v.ckt.nodes[n]) return; const [x, y] = v.P(n); T(v.ctx, (o.text && o.text[n]) || n, x + dx * u, y + dy * u, { color: o.color || '#ff7eb6', size: sz, weight: '700' }); }); };
/* text beside the middle of a part (offset in grid units) */
CH9.partTag = (v, id, text, o = {}) => { const p = v.ckt.part(id); if (!p) return; const A = v.P(p.a), B = v.P(p.b), u = v.u;
  T(v.ctx, text, (A[0] + B[0]) / 2 + (o.dx || 0) * u, (A[1] + B[1]) / 2 + (o.dy || 0) * u, { color: o.color || COL.ink, size: o.size || Math.max(12, u * 0.3), weight: o.weight || '700', align: o.align || 'center' }); };

/* generator in box b.  o: {alpha (rotor angle, rad, counter-clockwise), e: [ea, eb, ec] in −1..1, title, values: [text a, b, c]} */
CH9.generator = (ctx, b, o = {}) => {
  CH6.bg(ctx, b); const top = o.title ? 30 : 10, cx0 = b.x + b.w / 2, cy0 = b.y + top + 8 + (b.h - top - 18) / 2, R = Math.max(40, Math.min(b.w / 2 - (o.values ? 78 : 50), (b.h - top - 18) / 2 - 40));   // room for the coil values beside the ring
  if (o.title) T(ctx, o.title, b.x + 10, b.y + 15, { align: 'left', color: COL.muted, size: 13 });
  /* stator ring */
  ctx.save(); ctx.fillStyle = '#1b2140'; ctx.beginPath(); ctx.arc(cx0, cy0, R, 0, 2 * Math.PI); ctx.arc(cx0, cy0, R * 0.74, 0, 2 * Math.PI, true); ctx.fill();
  ctx.strokeStyle = '#3a4370'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(cx0, cy0, R, 0, 2 * Math.PI); ctx.stroke(); ctx.beginPath(); ctx.arc(cx0, cy0, R * 0.74, 0, 2 * Math.PI); ctx.stroke(); ctx.restore();
  /* coils at 90°, 210°, 330°: a coil glows when the rotor's N pole points at it */
  const e = o.e || [0, 0, 0];
  CH9.K.forEach((k, i) => { const ph = (90 + 120 * i) * D2R, col = CH9.COL[k], x = cx0 + R * 0.87 * Math.cos(ph), y = cy0 - R * 0.87 * Math.sin(ph), w = R * 0.42, h = R * 0.2, v = e[i];
    ctx.save(); ctx.translate(x, y); ctx.rotate(-ph + Math.PI / 2);
    ctx.fillStyle = '#121629'; ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.globalAlpha = 0.18 + 0.82 * Math.abs(v); ctx.fillStyle = col; ctx.fillRect(-w / 2, -h / 2, w, h); ctx.globalAlpha = 1;
    ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.strokeRect(-w / 2, -h / 2, w, h);
    ctx.strokeStyle = 'rgba(15,18,32,.55)'; ctx.lineWidth = 1.2; for (let s = 1; s < 6; s++) { const xx = -w / 2 + s * w / 6; ctx.beginPath(); ctx.moveTo(xx, -h / 2); ctx.lineTo(xx, h / 2); ctx.stroke(); }
    ctx.restore();
    const lx = cx0 + (R + 18) * Math.cos(ph), ly = cy0 - (R + 18) * Math.sin(ph);
    T(ctx, k, lx, ly, { color: col, size: 16, weight: '700' });
    if (o.values) T(ctx, o.values[i], lx + (Math.cos(ph) > 0.3 ? 14 : Math.cos(ph) < -0.3 ? -14 : 0), ly + (i === 0 ? -18 : 18), { color: col, size: 12.5, weight: '600', align: Math.cos(ph) > 0.3 ? 'left' : Math.cos(ph) < -0.3 ? 'right' : 'center' }); });
  /* rotor: a bar magnet, N half red, S half blue */
  const a = o.alpha || 0, L = R * 0.62, H = R * 0.24;
  ctx.save(); ctx.translate(cx0, cy0); ctx.rotate(-a);
  ctx.fillStyle = '#d94c4c'; ctx.fillRect(0, -H / 2, L, H); ctx.fillStyle = '#3d7fd9'; ctx.fillRect(-L, -H / 2, L, H);
  ctx.strokeStyle = '#e8ecf7'; ctx.lineWidth = 1.5; ctx.strokeRect(-L, -H / 2, 2 * L, H);
  ctx.fillStyle = '#fff'; ctx.font = `700 ${Math.round(H * 0.7)}px "IBM Plex Mono", monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('N', L * 0.72, 1); ctx.fillText('S', -L * 0.72, 1);
  ctx.restore();
  ctx.save(); ctx.fillStyle = '#e8ecf7'; ctx.beginPath(); ctx.arc(cx0, cy0, 4, 0, 2 * Math.PI); ctx.fill(); ctx.restore();
  /* rotation arrow */
  const dir = o.dir || 1, r2 = R * 0.5, a0 = Math.PI * 0.15, a1 = Math.PI * 0.6;
  ctx.save(); ctx.strokeStyle = '#7ee787'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx0, cy0, r2 + R * 0.08, -a1, -a0); ctx.stroke();
  const tipA = dir > 0 ? -a1 : -a0, tx = cx0 + (r2 + R * 0.08) * Math.cos(tipA), ty = cy0 + (r2 + R * 0.08) * Math.sin(tipA), tang = tipA + (dir > 0 ? -Math.PI / 2 : Math.PI / 2);
  ctx.fillStyle = '#7ee787'; ctx.beginPath(); ctx.moveTo(tx + 8 * Math.cos(tang), ty + 8 * Math.sin(tang)); ctx.lineTo(tx + 6 * Math.cos(tang + 2.2), ty + 6 * Math.sin(tang + 2.2)); ctx.lineTo(tx + 6 * Math.cos(tang - 2.2), ty + 6 * Math.sin(tang - 2.2)); ctx.closePath(); ctx.fill(); ctx.restore();
  T(ctx, 'ω', cx0 + (r2 + R * 0.2) * Math.cos(-Math.PI * 0.37), cy0 + (r2 + R * 0.2) * Math.sin(-Math.PI * 0.37), { color: '#7ee787', size: 15, weight: '700' });
};

global.CH9 = CH9;
})(window);
