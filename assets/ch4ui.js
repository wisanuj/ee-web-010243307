/* ch4ui.js — chapter 4 in the problem-by-problem format (rebuilt Oct 2026): nodal, supernode, mesh and supermesh analysis.
   1) CH4.Prob     one problem on one canvas. The circuit comes from ch4_circuits.js and is analysed by ANA.nodal or ANA.mesh
                   (ana.js), whose steps feed LS.stepper one reveal each; set(k) shows what the first k steps have opened.
                   Nodal: every node coloured and tagged with its voltage ("?" until solved), yellow arrows for the currents
                   leaving the node in a KCL step, a dashed yellow ellipse round a supernode. Mesh: clockwise rings whose beads
                   spin with the answer, a marching dashed path round the mesh or supermesh being written, the current source
                   of a supermesh struck in red. The current dots run only once the system is solved.
   2) CH4.problem  wires one problem section of a page: Prob + "try it first" box + stepper (+ the matrix drill).
   3) CH4.drill    fill in the G or R matrix "by inspection" (CH4.nodalG, CH4.meshR).
   Also CH4.label / CH4.tag: canvas text with subscripts. Drawing goes through LS.anim (lesson.js). */
(function (global) {
'use strict';
const CH4 = {};
const F = ALG.F;
const NETCOL = ['#5ad1ff', '#ff7eb6', '#7ee787', '#c792ea', '#ffa552', '#f1f3f5', '#ff6b6b'];
const MESHCOL = ['#ff7eb6', '#5ad1ff', '#7ee787', '#ffa552', '#c792ea'];
const AMBER = '#ffd166';
CH4.NETCOL = NETCOL; CH4.MESHCOL = MESHCOL;
const hexA = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
const num = (q, d = 3) => ALG.fmtDec(+q, d).replace('-', '−');

/* ---------- canvas text with subscripts: "V_A = 5 V", "i_{12}" ---------- */
const segs = str => { const out = []; const re = /_(\{[^}]*\}|[^\s=])/g; let last = 0, m;
  while ((m = re.exec(str))) { if (m.index > last) out.push({ t: str.slice(last, m.index), sub: false }); out.push({ t: m[1].replace(/[{}]/g, ''), sub: true }); last = re.lastIndex; }
  if (last < str.length) out.push({ t: str.slice(last), sub: false }); return out; };
const fontOf = (size, weight) => `${weight || '600'} ${size}px "IBM Plex Mono", ui-monospace, Menlo, monospace`;
CH4.measure = (ctx, str, size = 13, weight) => { ctx.save(); let w = 0; segs(str).forEach(s => { ctx.font = fontOf(s.sub ? size * 0.74 : size, weight); w += ctx.measureText(s.t).width; }); ctx.restore(); return w; };
CH4.label = (ctx, str, x, y, o = {}) => {
  const size = o.size || 13, ss = segs(str); const w = CH4.measure(ctx, str, size, o.weight);
  let x0 = o.align === 'left' ? x : o.align === 'right' ? x - w : x - w / 2;
  ctx.save(); ctx.fillStyle = o.color || '#e8ecf7'; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  ss.forEach(s => { ctx.font = fontOf(s.sub ? size * 0.74 : size, o.weight); ctx.fillText(s.t, x0, y + (s.sub ? size * 0.3 : 0)); x0 += ctx.measureText(s.t).width; });
  ctx.restore(); return w; };
/* rounded tag box with text */
CH4.tag = (ctx, str, x, y, col, o = {}) => { const size = o.size || 13; const w = CH4.measure(ctx, str, size) + 14, h = size + 10;
  let x0 = o.align === 'left' ? x : o.align === 'right' ? x - w : x - w / 2; const y0 = y - h / 2;
  ctx.save(); ctx.fillStyle = 'rgba(15,18,32,.92)'; ctx.strokeStyle = col; ctx.lineWidth = o.hi ? 2.6 : 1.4; ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x0, y0, w, h, 6); else ctx.rect(x0, y0, w, h); ctx.fill(); ctx.stroke(); ctx.restore();
  CH4.label(ctx, str, x0 + 7, y, { size, color: col, align: 'left' }); return { x0, y0, w, h }; };
const nameTxt = n => n.replace(/\\,/g, '').replace(/\\Omega/g, 'Ω');

/* ---------- glow a list of parts in a colour (used for the struck current source) ---------- */
function glowParts(view, ids, col, wd) { const ctx = view.ctx; ids.forEach(id => { const p = view.ckt.part(id); if (!p) return; const pts = view.path(p);
  ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = wd || Math.max(10, view.u * 0.32); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); pts.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.stroke(); ctx.restore(); }); }
/* a cross over a part (the current source a supermesh must not cross) */
function crossPart(view, id, col) { const p = view.ckt.part(id); if (!p) return; const A = view.P(p.a), B = view.P(p.b); const x = (A[0] + B[0]) / 2, y = (A[1] + B[1]) / 2, r = view.u * 0.5; const ctx = view.ctx;
  ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - r, y - r); ctx.lineTo(x + r, y + r); ctx.moveTo(x - r, y + r); ctx.lineTo(x + r, y - r); ctx.stroke(); ctx.restore(); }
/* dashed path (grid coordinates), marching along its direction */
function marchPath(view, poly, col, t, closed = true) { if (!poly || poly.length < 2) return; const ctx = view.ctx; const pts = poly.map(q => view.P(q));
  ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.setLineDash([10, 7]); ctx.lineDashOffset = -t * 34; ctx.lineJoin = 'round'; ctx.beginPath();
  pts.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); if (closed) ctx.closePath(); ctx.stroke(); ctx.restore(); }
function marchEllipse(view, e, col, t) { const ctx = view.ctx; const [cx, cy] = view.P([e[0], e[1]]); const rx = e[2] * view.u, ry = e[3] * view.u;
  ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = 2.6; ctx.setLineDash([9, 7]); ctx.lineDashOffset = -t * 30; ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, 2 * Math.PI); ctx.stroke();
  ctx.fillStyle = hexA(col, 0.07); ctx.fill(); ctx.restore();
  const a = (e[4] ?? -90) * Math.PI / 180, lx = cx + (rx + 8) * Math.cos(a), ly = cy + (ry + 10) * Math.sin(a);
  view.text(MC.t('ซูเปอร์โนด', 'supernode'), lx, ly, { color: col, size: Math.max(12.5, view.u * 0.3), weight: '700', align: Math.cos(a) > 0.3 ? 'left' : Math.cos(a) < -0.3 ? 'right' : 'center' }); }

/* =====================================================================================================================
   1) one problem, one canvas
   new CH4.Prob(canvas, key, method, o): key = a circuit of ch4_circuits.js, method 'nodal' | 'mesh',
   o = { edit: {partId: {value…}} to draw a printed value instead of the corrected one, maxH, minW (px; the card then needs .hscroll) } */
CH4.Prob = class {
  constructor(canvas, key, method, o = {}) {
    const C = global.CH4C[key]; this.canvas = canvas; this.C = C; this.key = key; this.method = method; this.o = o;
    this.ckt = new CK.Circuit({ ground: C.ground, nodes: C.nodes, parts: C.parts.map(q => ({ ...q, ...((o.edit || {})[q.id] || {}) })) }); this.ckt.solve();
    const A = this.A = method === 'nodal' ? ANA.nodal(this.ckt, C.nodal) : ANA.mesh(this.ckt, C.mesh);
    this.k = 0; this.t = 0; this.spin = {}; this.netCol = {};
    if (method === 'nodal') { let i = 0; [...A.unknown, ...[...A.known.keys()].filter(k => k !== A.ref)].forEach(k => { this.netCol[k] = NETCOL[i++ % NETCOL.length]; }); }
    this.view = new CK.View(canvas, this.ckt, { speed: C.speed, ground: method === 'nodal', showI: false, pad: C.pad ?? 1.75, tips: false, dots: false });
    this.resize(); window.addEventListener('resize', () => this.resize()); LS.anim(canvas, dt => this.frame(dt));
  }
  /* the worked solution for LS.stepper (one ANA step per reveal) and how far it is open */
  get steps() { return this.A.steps.map(s => ({ body: s.html })); }
  get solved() { return this.k >= this.A.solvedAt; }
  set(k) { this.k = k; }
  resize() {
    const C = this.C, xs = Object.values(C.nodes).map(p => p[0]), ys = Object.values(C.nodes).map(p => p[1]);
    const w = Math.max(this.o.minW || 300, Math.floor(this.canvas.parentElement.clientWidth - 12)); this.narrow = w < 520;   // minW + .sim.hscroll: wide circuits scroll sideways on a phone
    const pad = (C.pad ?? 1.75) + (this.narrow ? (C.padN ?? 0.35) : 0); this.view.o.pad = pad;
    /* on a phone the node tags and mesh rings show the names only and the values go into a two-column list under the badge */
    this.legend = this.narrow ? (this.method === 'nodal' ? this.nodeOrder().length : this.A.meshes.length) : 0;
    const gw = Math.max(...xs) - Math.min(...xs) + 2 * pad, gh = Math.max(...ys) - Math.min(...ys) + 2 * pad, top = 40 + (this.legend ? Math.ceil(this.legend / 2) * 21 + 4 : 0);
    const h = Math.round(Math.max(250, Math.min(this.o.maxH || 620, (w - 8) * gh / gw + top + 4)));
    this.ctx = CK.setup(this.canvas, w, h); this.W = w; this.H = h; this.view.ctx = this.ctx; this.view.fit({ x: 4, y: top, w: w - 8, h: h - top - 4 });
  }
  frame(dt) {
    const v = this.view, A = this.A, C = this.C, c = this.ctx, mesh = this.method === 'mesh'; if (!c) return; this.t += dt;
    const st = this.k > 0 ? A.steps[this.k - 1] : null, sol = this.solved;
    c.fillStyle = CK.PAL.bg; c.fillRect(0, 0, this.W, this.H);
    v.o.dots = sol; v.o.tips = sol;
    if (!mesh) v.o.netColor = n => { const k = A.netOf(n); return k === undefined || k === A.ref ? CK.PAL.wire : this.netCol[k] || CK.PAL.wire; };
    v.o.glow = st && st.glow && st.glow.length ? new Set(st.glow) : null;
    v.o.glowColor = !st ? null : st.kind === 'super' ? 'rgba(255,209,102,.30)' : mesh && st.kind === 'kvl' ? hexA(MESHCOL[st.color % MESHCOL.length], 0.30) : 'rgba(255,193,77,.32)';
    v.advance(dt); v.draw();
    (C.pol || []).forEach(p => v.polarity(this.ckt.part(p.id), p.plus, { side: p.side, text: p.text, color: '#ff7eb6' }));
    (C.refs || []).forEach(r => v.refArrow(this.ckt.part(r.id), r.from, r.text, { side: r.side, color: '#ff7eb6' }));
    if (mesh) this.drawMesh(st, sol, dt); else this.drawNodal(st, sol);
    CK.badge(c, sol ? MC.t('แก้สมการแล้ว: กระแสไหล', 'solved: the current flows') : MC.t('ยังไม่ได้แก้สมการ: กระแสยังไม่ไหล', 'not solved yet: no current'), sol ? 'ok' : 'wait');
  }
  nodeOrder() { const A = this.A; return [...A.unknown, ...[...A.known.keys()].filter(k => k !== A.ref)].filter(k => A.name[k]); }
  nodeText(k, sol) { const A = this.A, nm = nameTxt(A.name[k]); if (k === A.ref) return `${nm} = 0`;
    if (A.known.has(k)) return this.k >= 1 ? `${nm} = ${num(A.known.get(k))} V` : `${nm} = ?`; return sol ? `${nm} = ${num(A.sol.get(k))} V` : `${nm} = ?`; }
  arrowSide(p) { const a = this.ckt.nodes[p.a], b = this.ckt.nodes[p.b]; const vert = Math.abs(b[1] - a[1]) > Math.abs(b[0] - a[0]); const s = p.side || 1; return vert ? (s > 0 ? 'L' : 'R') : (s > 0 ? 'D' : 'U'); }
  drawNodal(st, sol) {
    const v = this.view, A = this.A;
    if (st && st.kind === 'super') (st.ell || []).forEach(e => marchEllipse(v, e, AMBER, this.t));
    if (st && (st.kind === 'kcl' || st.kind === 'super')) (st.arrows || []).forEach(a => { const p = this.ckt.part(a.id); v.refArrow(p, a.from, null, { side: this.arrowSide(p), color: AMBER, off: 0.42 }); });
    const focus = st && st.nets ? st.nets : [], size = Math.max(12, Math.min(14.5, v.u * 0.27));
    Object.keys(A.name).map(Number).forEach(k => { const tg = A.tag[k]; if (!tg) return; const p = this.ckt.nodes[tg.node];
      const [x, y] = v.P([p[0] + (tg.dx ?? 0.45), p[1] + (tg.dy ?? -0.45)]), isRef = k === A.ref;
      const txt = this.legend && !isRef ? nameTxt(A.name[k]) : (!isRef && A.known.has(k) && this.k < 1 ? nameTxt(A.name[k]) : this.nodeText(k, sol));
      CH4.tag(this.ctx, txt, x, y, isRef ? CK.PAL.muted : (this.netCol[k] || CK.PAL.ink), { size, hi: focus.includes(k) }); });
    if (this.legend) this.nodeOrder().forEach((k, i) => CH4.label(this.ctx, this.nodeText(k, sol), 10 + (i % 2) * (this.W / 2), 50 + Math.floor(i / 2) * 21,
      { size: 13, color: this.netCol[k] || CK.PAL.ink, align: 'left', weight: focus.includes(k) ? '700' : '600' }));
  }
  drawMesh(st, sol, dt) {
    const v = this.view, A = this.A;
    if (st && st.outline) marchPath(v, ANA.inset(st.outline, 0.3), st.kind === 'super' ? AMBER : MESHCOL[st.color % MESHCOL.length], this.t);
    if (st && st.kind === 'super') (st.src || []).forEach(id => { glowParts(v, [id], 'rgba(255,107,107,.35)'); crossPart(v, id, '#ff6b6b'); });
    const focus = st && st.ms ? st.ms : [];
    A.meshes.forEach(m => { const col = MESHCOL[m.idx % MESHCOL.length], r = m.r || 0.56, known = A.known.has(m);
      const val = known && this.k >= 1 ? A.known.get(m) : sol ? A.sol.get(m) : null;
      let spin = null; if (sol && val !== null) { const w = NUM.clamp((v.o.speed || 30) * (+val) / Math.max(10, r * v.u), -7, 7); this.spin[m.n] = (this.spin[m.n] || 0) + w * dt; spin = this.spin[m.n]; }
      v.meshLoop(m.at[0], m.at[1], r, { color: col, spin, alpha: focus.length && !focus.includes(m) ? 0.45 : 0.95 });
      const [x, y] = v.P(m.at), sz = Math.max(12.5, Math.min(15, v.u * 0.3)), vt = val === null ? '= ?' : `${num(val)} A`;
      if (this.legend) { CH4.label(this.ctx, nameTxt(m.n), x, y, { size: sz, color: col, weight: '700' });
        CH4.label(this.ctx, `${nameTxt(m.n)} = ${val === null ? '?' : vt}`, 10 + (m.idx % 2) * (this.W / 2), 50 + Math.floor(m.idx / 2) * 21, { size: 13, color: col, align: 'left', weight: focus.includes(m) ? '700' : '600' }); return; }
      CH4.label(this.ctx, nameTxt(m.n), x, y - sz * 0.5, { size: sz, color: col, weight: '700' });
      CH4.label(this.ctx, vt, x, y + sz * 0.62, { size: sz * 0.82, color: col, weight: '600' }); });
  }
};

/* =====================================================================================================================
   2) one problem section of a page: canvas cv<n>, "try first" box ask<n>, stepper st<n>, matrix drill dr<n>
   o = { edit, maxH, ask: sim => LS.ask options, answer: html, hint, drill: true (a collapsed "by inspection" box in dr<n>) } */
const RULE = { G: () => MC.t('ใช้ได้เมื่อไม่มีแหล่งจ่ายแรงดันอยู่ระหว่างสองโนดที่ยังไม่รู้ค่า: <b>แนวทแยง \\(G_{kk}\\)</b> = ผลรวมความนำ \\(1/R\\) ทุกตัวที่ต่อกับโนด k · <b>นอกแนวทแยง \\(G_{kj}\\)</b> = −(ความนำที่ต่อตรงระหว่างโนด k กับ j) · <b>ด้านขวา \\(i_k\\)</b> = กระแสของแหล่งจ่ายที่ชี้เข้าโนด k (ชี้ออกติดลบ) บวก \\(V/R\\) ของตัวต้านทานที่ต่อไปยังโนดที่รู้แรงดันแล้ว ตอบเป็นเศษส่วนได้ เช่น <code>1/4</code> หรือ <code>-0.25</code>',
    'Works when no voltage source sits between two unknown nodes: <b>diagonal \\(G_{kk}\\)</b> = the sum of the conductances \\(1/R\\) touching node k · <b>off-diagonal \\(G_{kj}\\)</b> = −(the conductance joining node k directly to node j) · <b>right side \\(i_k\\)</b> = the source current pointing into node k (pointing out is negative), plus \\(V/R\\) for each resistor to a node whose voltage is already known. Fractions are fine, e.g. <code>1/4</code> or <code>-0.25</code>.'),
  R: () => MC.t('ใช้ได้เมื่อไม่มีแหล่งจ่ายกระแสอยู่ระหว่างสองเมชที่ยังไม่รู้ค่า: <b>แนวทแยง \\(R_{kk}\\)</b> = ผลรวมความต้านทานรอบเมช k · <b>นอกแนวทแยง \\(R_{kj}\\)</b> = −(ความต้านทานที่เมช k กับ j ใช้ร่วมกัน) · <b>ด้านขวา \\(v_k\\)</b> = แรงดันของแหล่งจ่ายที่ดันกระแสไปตามเข็มนาฬิการอบเมช k (ดันสวนติดลบ) บวก R × กระแสของเมชข้างเคียงที่รู้ค่าแล้ว',
    'Works when no current source sits between two unknown meshes: <b>diagonal \\(R_{kk}\\)</b> = the total resistance round mesh k · <b>off-diagonal \\(R_{kj}\\)</b> = −(the resistance shared by meshes k and j) · <b>right side \\(v_k\\)</b> = the source voltages pushing clockwise round mesh k (pushing against it is negative), plus R × each neighbouring mesh current that is already known.') };
CH4.problem = (n, key, method, o = {}) => {
  const $ = id => document.getElementById(id);
  ANA.colW = $('st' + n).clientWidth;                      // the steps are laid out for the width of their own column
  const sim = new CH4.Prob($('cv' + n), key, method, o);
  ANA.colW = 0;
  if (o.ask && $('ask' + n)) LS.ask($('ask' + n), o.ask(sim));
  sim.stepper = LS.stepper($('st' + n), { steps: sim.steps, answer: o.answer, hint: o.hint, onStep: k => sim.set(k) });
  if (o.drill && $('dr' + n)) { const box = $('dr' + n), kind = method === 'nodal' ? 'G' : 'R';
    box.innerHTML = `<details class="orig drillbox"><summary>${kind === 'G' ? MC.t('ทางลัด: เขียนเมทริกซ์ความนำ G โดยการดู (ไม่ต้องเขียน KCL ทีละพจน์)', 'Shortcut: write the conductance matrix G by inspection (no term-by-term KCL)') : MC.t('ทางลัด: เขียนเมทริกซ์ความต้านทาน R โดยการดู (ไม่ต้องเขียน KVL ทีละพจน์)', 'Shortcut: write the resistance matrix R by inspection (no term-by-term KVL)')}</summary><div class="sub2">${RULE[kind]()}</div><div class="dd"></div></details>`;
    MC.renderMath(box); CH4.drill(box.querySelector('.dd'), () => ({ ok: true, A: sim.A, kind })).render(); }
  return sim;
};

/* =====================================================================================================================
   3) "by inspection" matrices */
/* nodal: G v = i  (G_kk = sum of conductances at node k, G_kj = −conductance between k and j, i_k = source current into k) */
CH4.nodalG = A => { const U = A.unknown; const G = U.map(() => U.map(() => F(0))), b = U.map(() => F(0));
  A.els.forEach(e => { const ia = U.indexOf(e.na), ib = U.indexOf(e.nb);
    if (e.type === 'R') { const g = F(1).div(e.R); if (ia >= 0) G[ia][ia] = G[ia][ia].add(g); if (ib >= 0) G[ib][ib] = G[ib][ib].add(g);
      if (ia >= 0 && ib >= 0) { G[ia][ib] = G[ia][ib].sub(g); G[ib][ia] = G[ib][ia].sub(g); }
      if (ia >= 0 && ib < 0 && A.known.has(e.nb)) b[ia] = b[ia].add(g.mul(A.known.get(e.nb))); if (ib >= 0 && ia < 0 && A.known.has(e.na)) b[ib] = b[ib].add(g.mul(A.known.get(e.na))); }
    else if (e.type === 'I') { if (ia >= 0) b[ia] = b[ia].sub(e.val); if (ib >= 0) b[ib] = b[ib].add(e.val); } });
  return { M: G, b }; };
/* mesh: R i = v  (R_kk = total resistance round mesh k, R_kj = −shared resistance, v_k = source voltage rises along mesh k) */
CH4.meshR = A => { const U = A.unknown; const R = U.map(() => U.map(() => F(0))), v = U.map(() => F(0));
  A.G.H.forEach(h => { const p = h.part, m = h.face.mesh; if (!m) return; const i = U.indexOf(m); if (i < 0) return; const o = h.twin.face.mesh;
    if (p.type === 'R') { const r = ANA.FX(p.value); R[i][i] = R[i][i].add(r); if (o) { const j = U.indexOf(o); if (j >= 0) R[i][j] = R[i][j].sub(r); else v[i] = v[i].add(r.mul(A.known.get(o))); } }
    else if (p.type === 'V') v[i] = v[i].sub(ANA.FX(p.value).mul(h.from === p.a ? 1 : -1)); });
  return { M: R, b: v }; };
/* parse a typed number: 3, -0.25, 1/4, −1/2 */
CH4.parse = s => { if (s === null || s === undefined) return null; s = String(s).trim().replace(/−/g, '-').replace(/\s+/g, ''); if (!s) return null;
  const m = s.match(/^([+-]?\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/); if (m) { const d = parseFloat(m[2]); return d ? parseFloat(m[1]) / d : null; }
  const v = parseFloat(s); return isFinite(v) && /^[+-]?(\d+\.?\d*|\.\d+)$/.test(s) ? v : null; };
const close = (x, q) => { const e = +q; return Math.abs(x - e) <= Math.max(0.002, 0.005 * Math.abs(e)); };
/* fill-in drill: el = container, get() → { A, kind: 'G'|'R', ok, why } */
CH4.drill = (el, get) => {
  function render() {
    const d = get(); if (!d.ok) { el.innerHTML = `<div class="warnbox">${d.why}</div>`; return; }
    const A = d.A, sys = d.kind === 'G' ? CH4.nodalG(A) : CH4.meshR(A); const n = A.vars.length; const lab = d.kind === 'G' ? 'G' : 'R', rhs = d.kind === 'G' ? 'i' : 'v';
    let h = `<div class="drill"><div class="dgrid" style="grid-template-columns:repeat(${n},auto) 22px auto 22px auto">`;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) h += `<input class="mi" data-i="${i}" data-j="${j}" aria-label="${lab}${i + 1}${j + 1}" placeholder="${lab}${i + 1}${j + 1}">`;
      h += `<span class="dop">${i === Math.floor((n - 1) / 2) ? '·' : ''}</span><span class="dvar">${MC.tex(A.vars[i])}</span><span class="dop">${i === Math.floor((n - 1) / 2) ? '=' : ''}</span>`;
      h += `<input class="mi" data-i="${i}" data-j="b" aria-label="${rhs}${i + 1}" placeholder="${rhs}${i + 1}">`;
    }
    h += `</div><div class="toggles"><button type="button" class="btn on" data-act="check">${MC.t('ตรวจ', 'Check')}</button><button type="button" class="btn" data-act="show">${MC.t('เฉลย', 'Show answer')}</button><button type="button" class="btn" data-act="clear">${MC.t('ล้าง', 'Clear')}</button></div><div class="dres"></div></div>`;
    el.innerHTML = h;
    const val = (i, j) => j === 'b' ? sys.b[i] : sys.M[i][j];
    const res = el.querySelector('.dres');
    el.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
      const act = b.dataset.act; const ins = [...el.querySelectorAll('input.mi')];
      if (act === 'clear') { ins.forEach(x => { x.value = ''; x.classList.remove('ok', 'no'); }); res.innerHTML = ''; return; }
      if (act === 'show') ins.forEach(x => { const q = val(+x.dataset.i, x.dataset.j === 'b' ? 'b' : +x.dataset.j); x.value = q.isInt ? String(q.n) : `${q.n}/${q.d}`; x.classList.remove('no'); x.classList.add('ok'); });
      let good = 0; ins.forEach(x => { const q = val(+x.dataset.i, x.dataset.j === 'b' ? 'b' : +x.dataset.j); const v = CH4.parse(x.value); const ok = v !== null && close(v, q); x.classList.toggle('ok', ok); x.classList.toggle('no', !ok && x.value.trim() !== ''); if (ok) good++; });
      // rows × L = the class equations
      const rows = A.vars.map((_, i) => { const e = A.eqs[i]; const L = sys.M[i][i].isZero ? F(1) : e.c[i].div(sys.M[i][i]); return { L, e }; });
      res.innerHTML = `<div class="${good === ins.length ? 'answer' : 'warnbox'}">${MC.t(`ถูก ${good} จาก ${ins.length} ช่อง`, `${good} of ${ins.length} correct`)}${good === ins.length ? ' ✓' : ''}</div>` +
        (good === ins.length ? `<div class="sub2" style="margin-top:6px">${d.kind === 'G' ? MC.t('เทียบกับสมการในขั้นที่ทำมา: คูณแต่ละแถวด้วย L (ค.ร.น. ของตัวส่วน) ก็ได้สมการเดียวกันกับที่เขียนจาก KCL', 'Compare with the equations from the steps: multiply each row by L (the LCD) and you get exactly the equation written from KCL') : MC.t('เทียบกับสมการในขั้นที่ทำมา: แถวเดียวกันทุกตัว เพราะการเขียน KVL ทีละพจน์ก็คือการรวมค่าตามกฎนี้', 'Compare with the equations from the steps: identical rows, because writing KVL term by term adds up exactly these numbers')}</div>` +
          MC.tex(`\\begin{aligned} ${rows.map(({ L, e }, i) => `\\text{${MC.t('แถว', 'row')} ${i + 1}} \\times ${L.tex()}: \\quad ${ANA.lhsTex(e.c, A.vars)} &= ${e.r.tex()}`).join(' \\\\ ')} \\end{aligned}`, true) : '');
    }));
  }
  return { render };
};

global.CH4 = CH4;
})(window);
