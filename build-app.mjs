// Builds app/index.html for the Weavers Yarn Tools Electron app by slicing
// the three tools (Yarn Calculator, Sett Advisor, Yarn Library) out of the
// full WeaversCanvas source. All ported code is verbatim; standalone
// adaptations live in the shell (tabs, shims, neutralizer CSS).
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = 'C:/Users/eldon/Workspace/uploads/weaverscanvas.html';
const OUT = join(__dirname, 'app', 'index.html');

const src = readFileSync(SRC, 'utf8').split('\n');

// ── Anchor-based slicing ──────────────────────────────────────────────────
// Slices are defined by content anchors, NOT line numbers, so edits to the
// WeaversCanvas source (adding/removing lines) can never shift them.
const findIdx = (anchor, from = 0) => {
    for (let i = from; i < src.length; i++) {
        if (src[i].includes(anchor)) return i;   // 0-based
    }
    throw new Error('anchor not found: ' + anchor);
};
const until = (startAnchor, endAnchor) => {
    const a = findIdx(startAnchor);
    const b = findIdx(endAnchor, a + 1);
    return src.slice(a, b).join('\n');
};
// From an anchor line through the line where CSS brace balance returns to
// zero `times` more times (collects one or more consecutive rules).
const cssRules = (startAnchor, times = 1) => {
    const a = findIdx(startAnchor);
    const out = [];
    let depth = 0, done = 0;
    for (let i = a; i < src.length && done < times; i++) {
        out.push(src[i]);
        for (const ch of src[i]) {
            if (ch === '{') depth++;
            else if (ch === '}') { depth--; if (depth === 0) { done++; if (done === times) break; } }
        }
    }
    return out.join('\n');
};
// From an anchor (or the <style> tag above it) through the block's </style>.
const styleBlock = (anchor) => {
    let a = findIdx(anchor);
    while (a > 0 && !/^\s*<style/.test(src[a])) a--;
    let b = a;
    while (b < src.length && !/^\s*<\/style>/.test(src[b])) b++;
    return src.slice(a, b + 1).join('\n');
};
// From a function anchor through the line before the next TOP-LEVEL
// function whose name does NOT start with `prefix` (top-level = no indent
// or the file's 4-space convention), stopping at any `</script>` boundary
// so nested helper script blocks can never be swallowed.
const untilForeignFunction = (startAnchor, prefix) => {
    const a = findIdx(startAnchor);
    for (let i = a + 1; i < src.length; i++) {
        if (/^\s*<\/script>/.test(src[i])) return src.slice(a, i).join('\n');
        const m = src[i].match(/^(?: {4})?function ([A-Za-z_$][\w$]*)/);
        if (m && !m[1].startsWith(prefix)) return src.slice(a, i).join('\n');
    }
    return src.slice(a).join('\n');
};

// ── CSS slices ────────────────────────────────────────────────────────────
// Some source slices include their own <style>/</style> wrappers — strip
// them so they can't break out of the shell's style blocks.
const stripStyle = (s) => s
    .replace(/^[ \t]*<style[^>]*>[ \t]*\r?\n?/m, '')
    .replace(/^[ \t]*<\/style>[ \t]*\r?\n?/m, '');
const cssRoot = until('--brand-blue:', '--workspace-bg:');
const cssBtn = cssRules('.btn {', 1) + '\n' + until('.btn-secondary {', '/* Danger');
const cssYc = stripStyle(styleBlock('.yc-row {'));            // .yc-* base rules
const cssYl = stripStyle(styleBlock('.yl-toolbar {'));        // .yl-* library rules
const cssYcTheme = stripStyle(styleBlock('<style id="yc-pastel-theme">'));  // theme overrides
const cssYcAddRemove = cssRules('#yarnCalcModal .yc-add-color {', 2);      // add + remove
const cssYlClose = cssRules('#yarnLibraryModal button.btn-on-dark {', 2);  // rule + hover
const cssYcClose = cssRules('#yarnCalcModal>div>div:first-child button.btn-on-dark {', 1);

// ── HTML slices (kept verbatim, incl. modal wrappers) ─────────────────────
const htmlYc = until('<div id="yarnCalcModal"', '<style');
const htmlYl = until('YARN LIBRARY MODAL', '<style');
const htmlSett = until('SETT ADVISOR MODAL', '<style');

// ── JS slices (verbatim) ─────────────────────────────────────────────────
const jsToast = until('// ── Toast notifications', 'function openYarnCalc');   // toasts, escHtml, yc state thru ycClear
const jsYcWeight = until('function ycWeightPreset', 'function ycSyncFromLoom');
const jsYcRest = untilForeignFunction('function ycAddColor', 'yc');            // add/remove, render, ycCalc, ycPrint
const jsSett = until('const SA_PRESETS', "document.addEventListener('DOMContentLoaded'");
const jsYlA = until('const YL_COLORS', 'function openYarnLibrary');            // YL data thru ylToggleFavorite
const jsYlB = until('function ylSetView', 'function closeYarnLibrary');        // ylSetView, ylUpdateTabs
const jsYlC = untilForeignFunction('function ylRender', 'yl');                 // ylRender, ylApplySett, ylApplyYarnCalc

// appVersion fallback inside ycPrint → local constant
const APP_VERSION = 'v1.0.0';
const fix = (s) => s.replace(
    /document\.getElementById\('appVersion'\)\?\.textContent \|\| ''/g,
    `'${APP_VERSION}'`
);

// ── Yarn photos: copy crops into the app and emit an existence map ───────
const PHOTOS_SRC = join(__dirname, 'chart-crops');
const PHOTOS_OUT = join(__dirname, 'app', 'yarn-photos');
mkdirSync(PHOTOS_OUT, { recursive: true });
let photoIndices = [];
if (existsSync(PHOTOS_SRC)) {
    for (const f of readdirSync(PHOTOS_SRC).sort()) {
        const m = f.match(/^yarn-(\d+)\.png$/);
        if (!m) continue;
        writeFileSync(join(PHOTOS_OUT, f), readFileSync(join(PHOTOS_SRC, f)));
        photoIndices.push(parseInt(m[1], 10));
    }
}
const photoSet = new Set(photoIndices);
const patchYlBody = (s) => s.replace(
    `'<div class="yl-body">' +`,
    `'<div class="yl-body">' + yarnPhotoTag(idxInAll) +`
) + `

// Photo strips cropped from the Master Yarn Chart 2014 pages.
const YL_PHOTO_SET = new Set(${JSON.stringify(photoIndices)});
function yarnPhotoTag(i) {
    if (!YL_PHOTO_SET.has(i)) return '';
    return '<img class="yl-photo" loading="lazy" alt="" title="Click to enlarge" src="yarn-photos/yarn-' +
        String(i).padStart(3, '0') + '.png" onerror="this.remove()" onclick="ylZoomPhoto(' + i + ', event)" style="cursor:zoom-in;">';
}`;


// ── Raleway fonts: bundle locally, fall back to Google Fonts link ────────
let fontsCss = '';
let fontsLink = '<link href="https://fonts.googleapis.com/css2?family=Raleway:wght@400;500;600;700;800&display=swap" rel="stylesheet">';
try {
    const cssUrl = 'https://fonts.googleapis.com/css2?family=Raleway:wght@400;500;600;700;800&display=swap';
    const res = await fetch(cssUrl, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36' } });
    const css = await res.text();
    const faces = [];
    const re = /@font-face\s*{([^}]+)}/g;
    let m;
    mkdirSync(join(__dirname, 'app', 'fonts'), { recursive: true });
    let i = 0;
    while ((m = re.exec(css)) !== null) {
        const block = m[1];
        const urlM = block.match(/url\((https:[^)]+\.woff2)\)/);
        const wM = block.match(/font-weight:\s*(\d+)/);
        const styM = block.match(/font-style:\s*(\w+)/);
        if (!urlM) continue;
        const weight = wM ? wM[1] : '400';
        const style = styM ? styM[1] : 'normal';
        if (style !== 'normal') continue;   // keep upright faces only
        const fname = `raleway-${weight}-${i++}.woff2`;
        const bin = Buffer.from(await (await fetch(urlM[1])).arrayBuffer());
        writeFileSync(join(__dirname, 'app', 'fonts', fname), bin);
        faces.push(`@font-face{font-family:'Raleway';font-style:normal;font-weight:${weight};font-display:swap;src:url(fonts/${fname}) format('woff2');}`);
    }
    if (faces.length >= 4) {
        fontsCss = faces.join('\n');
        fontsLink = '';
        console.log('Bundled', faces.length, 'Raleway faces locally');
    }
} catch (e) {
    console.log('Font bundling failed, using Google Fonts link:', e.message);
}

// ── Shell ────────────────────────────────────────────────────────────────
const shellCss = `
/* ═══ Tab shell ═══ */
* { box-sizing: border-box; }
body { margin:0; font-family:'Raleway',sans-serif; background:var(--bg); color:var(--text); }
.wyt-header { background:linear-gradient(135deg,var(--brand-purple),var(--brand-blue)); color:white;
  padding:14px 22px 16px; display:flex; flex-direction:column; align-items:center; justify-content:center;
  gap:10px; flex-wrap:wrap; }
.wyt-brand { display:flex; align-items:center; gap:12px; }
.wyt-brand img { height:40px; width:auto; border-radius:8px; }
.wyt-brand .t1 { font-size:1.05em; font-weight:800; letter-spacing:0.03em; line-height:1.2; }
.wyt-brand .t2 { font-size:0.68em; opacity:0.75; letter-spacing:0.06em; }
.wyt-tabs { display:flex; gap:8px; justify-content:center; flex-wrap:wrap; }
.wyt-tab { padding:10px 20px; border-radius:9px; border:1px solid rgba(255,255,255,0.35);
  background:rgba(255,255,255,0.14); color:white; font-family:'Raleway',sans-serif;
  font-size:13px; font-weight:700; letter-spacing:0.04em; cursor:pointer; transition:background 0.12s; }
.wyt-tab:hover { background:rgba(255,255,255,0.24); }
.wyt-tab.active { background:white; color:var(--brand-purple); border-color:white; }
.wyt-main { padding:20px; max-width:1180px; margin:0 auto; }
.tab-page { display:none; }
.tab-page.active { display:block; animation:wyt-fade 0.15s ease-out; }
@keyframes wyt-fade { from { opacity:0.4; } to { opacity:1; } }
.wyt-footer { text-align:center; font-size:0.72em; color:var(--text-muted); padding:18px 0 26px; }

/* Yarn photo strips (cropped from the chart) */
.yl-photo { display:block; width:100%; height:38px; object-fit:cover; object-position:center;
  border-radius:4px; margin:0 0 8px; background:#2e2e34; }

/* Yarn photo zoom lightbox */
#_ylZoom .wyt-zoom-card { background:white; border-radius:12px; padding:18px 22px 16px; max-width:700px;
  box-shadow:0 20px 60px rgba(0,0,0,0.5); text-align:center; font-family:'Raleway',sans-serif; }
#_ylZoom .wyt-zoom-img { width:640px; max-width:82vw; border-radius:8px; display:block; background:#2e2e34; }
#_ylZoom .wyt-zoom-name { margin-top:12px; font-weight:800; font-size:1.05em; color:var(--brand-blue); }
#_ylZoom .wyt-zoom-meta { font-size:0.8em; color:var(--text-muted); margin-top:3px; }
#_ylZoom .wyt-zoom-close { background:var(--brand-purple); color:white; border:none; border-radius:9px;
  padding:9px 22px; font-family:'Raleway',sans-serif; font-weight:700; font-size:12px;
  letter-spacing:0.04em; cursor:pointer; margin-top:14px; }
#_ylZoom .wyt-zoom-close:hover { background:var(--brand-purple-hover); }
.yl-photo { cursor:zoom-in; }

/* ═══ Modal neutralizer: modals become page sections ═══ */
.tab-page [id$="Modal"] {
  display:block !important; position:static !important; inset:auto !important;
  z-index:auto !important; background:transparent !important; padding:0 !important;
  margin:0 !important; align-items:stretch !important; justify-content:flex-start !important;
  max-height:none !important; overflow:visible !important;
}
.tab-page [id$="Modal"] > div {
  max-width:none !important; width:100% !important; margin:0 !important;
  max-height:none !important; box-shadow:none !important; border-radius:12px;
}
.tab-page [id$="Modal"] .modal-shell-fix {
  display:flex; flex-direction:column; max-height:none !important;
}
/* ═══ Hide loom-only controls (no loom in the standalone app) ═══ */
[onclick*="ycLoadCurrentPattern"], [onclick*="ycSyncFromLoom"], [onclick*="ycSyncColors"],
[onclick="closeYarnCalc()"], [onclick="closeSettAdvisor()"], [onclick="closeYarnLibrary()"],
[title="Close yarn calculator"], [title="Close notes"] { display:none !important; }
/* Spacer rows that lost their buttons */
#yc_colorRows + .btn-secondary[style*="margin-left:6px"] { margin-left:0 !important; }
`;

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Weavers Yarn Tools</title>
${fontsLink}
<style>
${fontsCss}
</style>
<style>
:root {
${cssRoot}
/* Present in WeaversCanvas but outside the sliced block — the library's
   "Use for Yarn Calc" button and the calculator's cost figure need them. */
--success: #2e7d32;
--success-text: #1b5e20;
--danger: #cc0033;
}
</style>
<style>
${cssBtn}
</style>
<style>
${cssYc}
${cssYl}
</style>
<style>
${cssYcTheme}
</style>
<style>
${cssYcAddRemove}
${cssYlClose}
${cssYcClose}
</style>
<style>
${shellCss}
</style>
</head>
<body>
  <header class="wyt-header">
    <div class="wyt-brand">
      <img src="icon.png" alt="">
      <div>
        <div class="t1">Weavers Yarn Tools</div>
        <div class="t2">YARN CALCULATOR · SETT ADVISOR · YARN LIBRARY — ${APP_VERSION}</div>
      </div>
    </div>
    <nav class="wyt-tabs">
      <button class="wyt-tab" data-tab="library" onclick="showTab('library')">📚 Yarn Library</button>
      <button class="wyt-tab" data-tab="sett" onclick="showTab('sett')">📐 Sett Advisor</button>
      <button class="wyt-tab active" data-tab="calc" onclick="showTab('calc')">🧶 Yarn Calculator</button>
    </nav>
  </header>

  <main class="wyt-main">
    <section class="tab-page active" id="page-calc">
${htmlYc}
    </section>
    <section class="tab-page" id="page-sett">
${htmlSett}
    </section>
    <section class="tab-page" id="page-library">
${htmlYl}
    </section>
  </main>

  <footer class="wyt-footer">
    Yarn data courtesy of Handwoven Magazine — Master Yarn Chart, 2014 · WeaversCanvas tools by Eldon · ${APP_VERSION}
  </footer>

<script>
${fix(jsToast)}
${fix(jsYcWeight)}
${fix(jsYcRest)}
${fix(jsSett)}
${fix(jsYlA)}
${fix(jsYlB)}
${fix(patchYlBody(jsYlC))}

// ═══ Standalone shims: tabs replace modals ═══
function showTab(name) {
    document.querySelectorAll('.wyt-tab').forEach(b =>
        b.classList.toggle('active', b.dataset.tab === name));
    document.querySelectorAll('.tab-page').forEach(s =>
        s.classList.toggle('active', s.id === 'page-' + name));
    if (name === 'calc' && typeof ycFetchRates === 'function') { try { ycFetchRates(); } catch (e) {} }
    if (name === 'sett' && typeof settCalc === 'function') { try { settCalc(); } catch (e) {} }
    if (name === 'library' && typeof ylRender === 'function') { try { ylRender(); } catch (e) {} }
}
function openYarnCalc() { showTab('calc'); }
function openSettAdvisor() { showTab('sett'); }
function openYarnLibrary() { showTab('library'); }
function closeYarnCalc() { showTab('calc'); }
function closeSettAdvisor() { showTab('sett'); }
function closeYarnLibrary() { showTab('library'); }

// ── Yarn photo lightbox: click a strip to see it enlarged ──
function ylZoomPhoto(i, ev) {
    if (ev) { ev.preventDefault(); ev.stopPropagation(); }
    const y = (typeof YL_YARNS !== 'undefined') ? YL_YARNS[i] : null;
    let host = document.getElementById('_ylZoom');
    if (!host) {
        host = document.createElement('div');
        host.id = '_ylZoom';
        host.setAttribute('role', 'dialog');
        document.body.appendChild(host);
    }
    const name = (y && y[1]) ? escHtml(y[1]) : 'Yarn';
    const meta = [
        (y && y[0]) ? escHtml(y[0]) : '',
        (y && y[2]) ? y[2].toLocaleString() + ' yd/lb' + (y[3] ? ' (' + y[3].toLocaleString() + ' m/kg)' : '') : '',
        (y && y[4]) ? y[4] + ', ' + y[5] + ', ' + y[6] + ' EPI' : '',
        (y && y[7]) ? escHtml(y[7]) : ''
    ].filter(Boolean).join(' · ');
    host.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.78);z-index:100000;display:flex;align-items:center;justify-content:center;padding:24px;';
    host.innerHTML = '<div class="wyt-zoom-card">' +
        '<img class="wyt-zoom-img" src="yarn-photos/yarn-' + String(i).padStart(3, '0') + '.png" alt="">' +
        '<div class="wyt-zoom-name">' + name + '</div>' +
        '<div class="wyt-zoom-meta">' + meta + '</div>' +
        '<button class="wyt-zoom-close" type="button">Close</button>' +
    '</div>';
    const close = () => { host.style.display = 'none'; };
    host.onclick = (e) => { if (e.target === host) close(); };
    host.querySelector('.wyt-zoom-close').onclick = close;
    if (!host.dataset.esc) {
        host.dataset.esc = '1';
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && host.style.display !== 'none') host.style.display = 'none';
        });
    }
}

window.addEventListener('DOMContentLoaded', () => {
    try { if (typeof ylLoadFavorites === 'function') ylLoadFavorites(); } catch (e) {}
    try {
        const sel = document.getElementById('yl_filter');
        if (sel && !sel.options.length) {
            YL_FAMILIES.forEach(f => {
                const o = document.createElement('option');
                o.value = f.id; o.textContent = f.label;
                sel.appendChild(o);
            });
        }
        if (sel) sel.value = _ylFilter;
    } catch (e) {}
    try { if (typeof ycRenderColorRows === 'function') ycRenderColorRows(); } catch (e) {}
    try { if (typeof ycCalc === 'function') ycCalc(); } catch (e) {}
    try { if (typeof settCalc === 'function') settCalc(); } catch (e) {}
    try { if (typeof ylUpdateTabs === 'function') ylUpdateTabs(); } catch (e) {}
    try { if (typeof ylRender === 'function') ylRender(); } catch (e) {}
    showTab('calc');
});
</script>
</body>
</html>
`;

mkdirSync(join(__dirname, 'app'), { recursive: true });
writeFileSync(OUT, html);
console.log('Wrote', OUT, (html.length / 1024).toFixed(0) + ' KB');
