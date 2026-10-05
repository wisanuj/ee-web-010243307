/* shell.js — page chrome shared by every stop: language (TH/EN), reading theme, top bar, prev/next links,
   visited-marking for the roadmap, KaTeX auto-render, small UI builders and an animation loop.
   Load in <head> (not deferred) so the theme and language apply before first paint.
   Bilingual convention: static HTML uses data-l="th" / data-l="en" blocks (CSS hides the other);
   script strings use t('ไทย', 'English'). Switching the language reloads the page. */
(function () {
'use strict';
const THEMES = { paper: ['กระดาษ', 'Paper'], warm: ['ครีม', 'Warm'], blue: ['ฟ้าอ่อน', 'Soft blue'], dark: ['มืด', 'Dark'] };
const KEY = 'ee-theme', VKEY = 'ee-visited', LKEY = 'ee-lang';
let lang = 'th'; try { const s = localStorage.getItem(LKEY); if (s === 'en' || s === 'th') lang = s; } catch (e) {}
document.documentElement.dataset.lang = lang; document.documentElement.lang = lang;
function initialTheme() { try { const s = localStorage.getItem(KEY); if (s && THEMES[s]) return s; } catch (e) {}
  return (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'paper'; }
let theme = initialTheme(); document.documentElement.dataset.theme = theme;

const MC = { THEMES, get theme() { return theme; }, get lang() { return lang; } };
MC.t = (th, en) => (lang === 'en' && en !== undefined && en !== null) ? en : th;
window.t = MC.t;
MC.setLang = l => { if (l !== 'th' && l !== 'en') return; try { localStorage.setItem(LKEY, l); } catch (e) {} location.reload(); };
MC.setTheme = t => { if (!THEMES[t]) return; theme = t; document.documentElement.dataset.theme = t; try { localStorage.setItem(KEY, t); } catch (e) {}
  const sel = document.getElementById('mc-theme-select'); if (sel) sel.value = t; };
MC.file = () => { const p = decodeURIComponent(location.pathname.split('/').pop() || ''); return p || 'index.html'; };
MC.live = () => (window.STOPS || []).filter(s => !s.soon);
MC.here = () => MC.live().find(s => s.file === MC.file());
MC.visited = () => { try { return JSON.parse(localStorage.getItem(VKEY) || '{}'); } catch (e) { return {}; } };
MC.markVisited = file => { const v = MC.visited(); v[file] = Date.now(); try { localStorage.setItem(VKEY, JSON.stringify(v)); } catch (e) {} };
MC.resetVisited = () => { try { localStorage.removeItem(VKEY); } catch (e) {} };
MC.stopTitle = s => MC.t(s.title, s.en);
MC.stageName = st => (window.STAGES && window.STAGES[st]) ? MC.t(window.STAGES[st].short, window.STAGES[st].short_en) : '';

function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function topbar() {
  const el = document.getElementById('mc-top'); if (!el) return; const here = MC.here();
  el.innerHTML = `<a class="hub" href="index.html">← ${MC.t('แผนที่การเรียน', 'Roadmap')}</a>` +
    (here ? `<span class="crumb">· ${MC.t('บทที่', 'Chapter')} ${here.ch} · ${MC.t('หน้า', 'page')} ${here.step}</span>` : '') +
    `<span class="spacer"></span>` +
    `<span class="langsw" role="group" aria-label="language"><button type="button" class="${lang === 'th' ? 'on' : ''}" data-lang="th">ไทย</button><button type="button" class="${lang === 'en' ? 'on' : ''}" data-lang="en">EN</button></span>` +
    `<label class="theme">${MC.t('ธีมการอ่าน', 'Theme')} <select id="mc-theme-select" aria-label="theme">${Object.entries(THEMES).map(([k, v]) => `<option value="${k}"${k === theme ? ' selected' : ''}>${MC.t(v[0], v[1])}</option>`).join('')}</select></label>`;
  el.querySelector('#mc-theme-select').addEventListener('change', e => MC.setTheme(e.target.value));
  el.querySelectorAll('.langsw button').forEach(b => b.addEventListener('click', () => { if (b.dataset.lang !== lang) MC.setLang(b.dataset.lang); }));
}
function navbar() {
  const el = document.getElementById('mc-nav'); if (!el) return; const stops = MC.live(); const here = MC.here(); if (!here) return;
  const i = stops.indexOf(here); const prev = stops[i - 1], next = stops[i + 1]; const S = MC.t('หน้า', 'Page');
  el.innerHTML = (prev ? `<a class="navlink prev" href="${prev.file}">← ${S} ${prev.step}: ${esc(MC.stopTitle(prev))}</a>` : '<span></span>') +
    (next ? `<a class="navlink next" href="${next.file}">${S} ${next.step}: ${esc(MC.stopTitle(next))} →</a>` : `<a class="navlink next" href="index.html">${MC.t('กลับไปแผนที่การเรียน', 'Back to the roadmap')} →</a>`);
}
function pageTitle() { const t = document.querySelector('title'); if (t && lang === 'en' && t.dataset.en) document.title = t.dataset.en; }
const MATH_OPTS = { delimiters: [{ left: '$$', right: '$$', display: true }, { left: '\\(', right: '\\)', display: false }], throwOnError: false };
MC.renderMath = el => { if (typeof renderMathInElement === 'function') renderMathInElement(el || document.body, MATH_OPTS); };
MC.tex = (s, display) => { if (typeof katex !== 'undefined') { try { return katex.renderToString(s, { displayMode: !!display, throwOnError: false }); } catch (e) {} } return esc(s); };
/* convention strip of the AC pages, <div class="conv" data-mag="peak|rms"></div>: the course writes every sinusoid with sin
   (Vm sin(ωt + θ) ⇄ Vm∠θ, also for textbook problems given with cos); data-mag says whether phasor sizes are peak or rms values */
function convBox() { document.querySelectorAll('.conv[data-mag]').forEach(el => { const rms = el.dataset.mag === 'rms';
  el.innerHTML = `<span class="ct">${MC.t('แบบแผนของหน้านี้', 'Convention on this page')}</span>` +
    `<span class="cf">${MC.t('อ้างอิง sin', 'Sine reference')}: \\(v(t) = V_m\\sin(\\omega t + \\theta) \\;\\Longleftrightarrow\\; \\mathbf{V} = ${rms ? '\\tfrac{V_m}{\\sqrt2}' : 'V_m'}\\angle\\theta\\)</span>` +
    `<span class="cm">${rms ? MC.t('ขนาดของเฟเซอร์ = ค่ายังผล (root mean square, rms)', 'phasor size = rms (effective) value') : MC.t('ขนาดของเฟเซอร์ = ค่ายอด', 'phasor size = peak value')}</span>` +
    `<span class="cx">${MC.t('โจทย์ที่ให้มาเป็น cos (เช่นจากตำรา Hayt) <b>ต้องแปลงเป็น sin ก่อน</b>เขียนเฟเซอร์: \\(\\cos x = \\sin(x + 90^\\circ)\\) · ถ้าโจทย์ให้เฟเซอร์มาเลย ให้อ่านกลับเป็นฟังก์ชัน sin และเขียนคำตอบในโดเมนเวลาด้วย sin', 'A problem given with cos (e.g. from the Hayt textbook) <b>must be turned into sin first</b>, before writing the phasor: \\(\\cos x = \\sin(x + 90^\\circ)\\). A phasor given directly is read back as a sine, and time-domain answers are written with sin.')}</span>`; }); }
document.addEventListener('DOMContentLoaded', () => { pageTitle(); topbar(); navbar(); const here = MC.here(); if (here) MC.markVisited(here.file); convBox(); MC.renderMath(); document.dispatchEvent(new Event('mc:ready')); });

/* ---------- small UI builders for the control panel ---------- */
const ui = {};
ui.h2 = (parent, text) => { const h = document.createElement('h2'); h.textContent = text; parent.appendChild(h); return h; };
ui.slider = (parent, spec) => {
  const d = document.createElement('div'); d.className = 'slider-block';
  d.innerHTML = `<div class="row"><label for="${spec.id}">${spec.label}</label><span class="val" id="${spec.id}-val"></span></div>` +
    `<input type="range" id="${spec.id}" min="${spec.min}" max="${spec.max}" step="${spec.step}" value="${spec.value}">`;
  parent.appendChild(d); const inp = d.querySelector('input'), val = d.querySelector('.val');
  const fmt = spec.fmt || (v => NUM.fmt(v, spec.dec ?? 2) + (spec.unit ? ' ' + spec.unit : ''));
  const show = () => { val.textContent = fmt(parseFloat(inp.value)); }; show();
  inp.addEventListener('input', () => { show(); if (spec.oninput) spec.oninput(parseFloat(inp.value)); });
  return { get: () => parseFloat(inp.value), set: v => { inp.value = v; show(); }, el: inp, block: d };
};
ui.buttons = (parent, list) => {
  const d = document.createElement('div'); d.className = 'toggles'; parent.appendChild(d); const out = {};
  list.forEach(b => { const el = document.createElement('button'); el.type = 'button'; el.className = 'btn' + (b.on ? ' on' : '') + (b.cls ? ' ' + b.cls : '');
    if (b.id) el.id = b.id; el.textContent = b.label; if (b.title) el.title = b.title; el.addEventListener('click', () => b.onclick && b.onclick(el)); d.appendChild(el); if (b.id) out[b.id] = el; });
  return out;
};
ui.radio = (parent, list, onchange) => {
  const btns = ui.buttons(parent, list.map(b => ({ ...b, onclick: el => { Object.values(btns).forEach(x => x.classList.remove('on')); el.classList.add('on'); onchange(b.id); } })));
  return { set: id => { Object.values(btns).forEach(x => x.classList.toggle('on', x.id === id)); }, btns };
};
ui.status = (parent, id) => { const d = document.createElement('div'); d.className = 'status'; if (id) d.id = id; parent.appendChild(d); return d; };
ui.setStatus = (el, pill, text, kind) => { el.innerHTML = `<span class="pill ${kind || ''}">${pill}</span> ${text}`; };
ui.metrics = (parent, id) => { const d = document.createElement('div'); d.className = 'metrics'; if (id) d.id = id; parent.appendChild(d); return d; };
ui.html = (parent, html, cls) => { const d = document.createElement('div'); if (cls) d.className = cls; d.innerHTML = html; parent.appendChild(d); return d; };
ui.kv = rows => rows.map(([k, v]) => `<div class="kv"><span class="k">${k}</span><code>${v}</code></div>`).join('');
/* standard run/pause button label pair */
ui.runLabel = running => running ? MC.t('หยุด', 'Pause') : MC.t('เล่นต่อ', 'Resume');
MC.ui = ui;

/* ---------- animation loop with fixed physics step ---------- */
MC.loop = (step, draw, opts = {}) => {
  let last = null, acc = 0, running = opts.running ?? true, raf = 0, speed = opts.speed || 1; const dt = opts.dt || 0.001, maxFrame = 0.05;
  function frame(ts) { raf = requestAnimationFrame(frame); if (last === null) last = ts; let el = (ts - last) / 1000; last = ts; if (el > maxFrame) el = maxFrame;
    if (running) { acc += el * speed; let n = 0; while (acc >= dt && n < 4000) { step(dt); acc -= dt; n++; } } draw(); }
  raf = requestAnimationFrame(frame);
  return { pause: () => { running = false; }, resume: () => { running = true; last = null; acc = 0; }, toggle: () => { running = !running; last = null; acc = 0; return running; },
    get running() { return running; }, setSpeed: s => { speed = s; }, get speed() { return speed; }, stop: () => cancelAnimationFrame(raf) };
};
MC.pointer = (canvas, ev) => { const r = canvas.getBoundingClientRect(); const t = ev.touches ? ev.touches[0] : ev; return { x: t.clientX - r.left, y: t.clientY - r.top }; };
MC.drag = (canvas, handlers) => {
  let active = null; const down = ev => { const p = MC.pointer(canvas, ev); const id = handlers.hit(p); if (id !== null && id !== undefined) { active = id; ev.preventDefault(); handlers.move(active, p); } };
  const move = ev => { if (active === null) return; ev.preventDefault(); handlers.move(active, MC.pointer(canvas, ev)); };
  const up = () => { if (active !== null && handlers.up) handlers.up(active); active = null; };
  canvas.addEventListener('mousedown', down); window.addEventListener('mousemove', move); window.addEventListener('mouseup', up);
  canvas.addEventListener('touchstart', down, { passive: false }); window.addEventListener('touchmove', move, { passive: false }); window.addEventListener('touchend', up);
};
window.MC = MC;
})();
