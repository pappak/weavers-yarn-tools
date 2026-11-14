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
const slice = (a, b) => src.slice(a - 1, b).join('\n');

// ── CSS slices ────────────────────────────────────────────────────────────
// Some source slices include their own <style>/</style> wrappers — strip
// them so they can't break out of the shell's style blocks.
const stripStyle = (s) => s
    .replace(/^[ \t]*<style[^>]*>[ \t]*\r?\n?/m, '')
    .replace(/^[ \t]*<\/style>[ \t]*\r?\n?/m, '');
const cssRoot = slice(32, 78);        // :root brand/surface/text variables
const cssBtn = slice(161, 273);       // .btn family + legacy aliases
const cssYc = stripStyle(slice(1496, 1514));   // .yc-* base rules
const cssYl = stripStyle(slice(2223, 2259));   // .yl-* library rules
const cssYcTheme = stripStyle(slice(10668, 10754));   // #yarnCalcModal theme overrides
const cssYcAddRemove = slice(10815, 10829); // yc-add-color / yc-remove-color
const cssYlClose = slice(10844, 10857);     // library header close
const cssYcClose = slice(10888, 10893);     // yarn calc header close re-override

// ── HTML slices (kept verbatim, incl. modal wrappers) ─────────────────────
const htmlYc = slice(1352, 1494);     // #yarnCalcModal
const htmlSett = slice(10220, 10299); // #settAdvisorModal
const htmlYl = slice(1292, 1336);     // #yarnLibraryModal

// ── JS slices (verbatim) ─────────────────────────────────────────────────
const jsToast = slice(2891, 3085);    // toasts, escHtml, yc state + functions thru ycClear
const jsYcWeight = slice(3132, 3138); // ycWeightPreset
const jsYcRest = slice(3166, 3370);   // add/remove color, render rows, ycCalc, ycPrint
const jsSett = slice(9308, 9400);     // SA data, open/close, settCalc, applyBalanced
const jsYlA = slice(9462, 10041);     // YL data thru ylToggleFavorite
const jsYlB = slice(10058, 10071);    // ylSetView, ylUpdateTabs
const jsYlC = slice(10075, 10177);    // ylRender, ylApplySett, ylApplyYarnCalc

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
    return '<img class="yl-photo" loading="lazy" alt="" src="yarn-photos/yarn-' +
        String(i).padStart(3, '0') + '.png" onerror="this.remove()">';
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
  padding:14px 22px; display:flex; align-items:center; justify-content:space-between; gap:16px; flex-wrap:wrap; }
.wyt-brand { display:flex; align-items:center; gap:12px; }
.wyt-brand img { height:40px; width:auto; border-radius:8px; }
.wyt-brand .t1 { font-size:1.05em; font-weight:800; letter-spacing:0.03em; line-height:1.2; }
.wyt-brand .t2 { font-size:0.68em; opacity:0.75; letter-spacing:0.06em; }
.wyt-tabs { display:flex; gap:8px; flex-wrap:wrap; }
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
      <button class="wyt-tab active" data-tab="calc" onclick="showTab('calc')">🧶 Yarn Calculator</button>
      <button class="wyt-tab" data-tab="sett" onclick="showTab('sett')">📐 Sett Advisor</button>
      <button class="wyt-tab" data-tab="library" onclick="showTab('library')">📚 Yarn Library</button>
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
