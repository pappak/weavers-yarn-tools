// Master Yarn Chart photo extractor.
// Decodes the 9 chart page screenshots, finds the yarn photo strips, and
// crops them to sequential PNGs matching the YL_YARNS database order
// (column-major: col1 top->bottom, col2, col3, col4; pages in file order).
// No external deps: PNG decode via zlib inflate + manual unfilter.
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'fs';
import { inflateSync, deflateSync } from 'zlib';
import { join } from 'path';

const SRC = 'C:/Users/eldon/Workspace/weavers-yarn-tools/chart-pages';
const OUT = 'C:/Users/eldon/Workspace/weavers-yarn-tools/chart-crops';
mkdirSync(OUT, { recursive: true });

// ── Minimal PNG decode (8-bit, color types 0/2/6, no interlace) ──────────
function decodePNG(buf) {
    let pos = 8; // skip signature
    let W = 0, H = 0, colorType = 0, bitDepth = 0;
    const idat = [];
    while (pos < buf.length) {
        const len = buf.readUInt32BE(pos);
        const type = buf.toString('ascii', pos + 4, pos + 8);
        const data = buf.subarray(pos + 8, pos + 8 + len);
        if (type === 'IHDR') {
            W = data.readUInt32BE(0); H = data.readUInt32BE(4);
            bitDepth = data[8]; colorType = data[9];
            if (bitDepth !== 8) throw new Error('bitDepth ' + bitDepth + ' unsupported');
            if (data[12] !== 0) throw new Error('interlaced PNG unsupported');
        } else if (type === 'IDAT') { idat.push(data); }
        pos += 12 + len;
        if (type === 'IEND') break;
    }
    const ch = colorType === 6 ? 4 : colorType === 2 ? 3 : colorType === 0 ? 1 : -1;
    if (ch < 0) throw new Error('colorType ' + colorType + ' unsupported');
    const raw = inflateSync(Buffer.concat(idat));
    const stride = W * ch;
    const out = Buffer.alloc(W * H * ch);
    // Unfilter
    let p = 0;
    for (let y = 0; y < H; y++) {
        const f = raw[p++];
        const row = y * stride;
        for (let x = 0; x < stride; x++) {
            const v = raw[p++];
            const a = x >= ch ? out[row + x - ch] : 0;
            const b = y > 0 ? out[row - stride + x] : 0;
            const c = (x >= ch && y > 0) ? out[row - stride + x - ch] : 0;
            let val;
            if (f === 0) val = v;
            else if (f === 1) val = v + a;
            else if (f === 2) val = v + b;
            else if (f === 3) val = v + ((a + b) >> 1);
            else {
                const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c);
                val = v + ((pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c));
            }
            out[row + x] = val & 0xff;
        }
    }
    return { W, H, ch, data: out };
}

// ── Minimal PNG encode (RGBA in, color type 2) ───────────────────────────
const CRC_TABLE = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
        t[n] = c >>> 0;
    }
    return t;
})();
function crc32(buf) {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
    return Buffer.concat([len, td, crc]);
}
function encodePNG(img, W, H) { // img: RGBA
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
    ihdr[8] = 8; ihdr[9] = 2; // 8-bit RGB
    const stride = W * 3;
    const raw = Buffer.alloc((stride + 1) * H);
    for (let y = 0; y < H; y++) {
        raw[y * (stride + 1)] = 0; // filter none
        for (let x = 0; x < W; x++) {
            const si = (y * W + x) * 4, di = y * (stride + 1) + 1 + x * 3;
            raw[di] = img[si]; raw[di + 1] = img[si + 1]; raw[di + 2] = img[si + 2];
        }
    }
    return Buffer.concat([
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        chunk('IHDR', ihdr),
        chunk('IDAT', deflateSync(raw, { level: 6 })),
        chunk('IEND', Buffer.alloc(0))
    ]);
}

// ── Detection helpers ────────────────────────────────────────────────────
function isPhotoPixel(img, W, i) { // i = pixel index*ch assumed RGBA/RGB
    const r = img[i * 4], g = img[i * 4 + 1], b = img[i * 4 + 2];
    const lum = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
    const gray = Math.abs(r - g) < 30 && Math.abs(g - b) < 32;
    return gray && lum > 0.04 && lum < 0.968;   // catches near-white photo backdrops (<=~245)
}

// ── Main ─────────────────────────────────────────────────────────────────
const pages = readdirSync(SRC).filter(f => f.endsWith('.png')).sort();
let globalIdx = 0;
for (const f of pages) {
    const { W, H, ch, data } = decodePNG(readFileSync(join(SRC, f)));
    const at = (x, y) => y * W + x;

    // x-histogram
    const colHist = new Int32Array(W);
    for (let y = 0; y < H; y += 2) {
        for (let x = 0; x < W; x++) {
            if (isPhotoPixel(data, W, at(x, y))) colHist[x]++;
        }
    }
    let max = 0;
    for (let x = 0; x < W; x++) if (colHist[x] > max) max = colHist[x];
    let lo = -1, hi = -1;
    const loHi = Math.max(3, max * 0.15);
    // Skip the outer 30px on each side: some screenshots carry a dark
    // window-edge strip there that is not chart content.
    for (let x = 30; x < W - 30; x++) if (colHist[x] > loHi) { if (lo < 0) lo = x; hi = x; }

    // interior gutters = runs of near-zero inside the span, not touching the edges
    const gutThresh = Math.max(2, max * 0.06);
    const gutters = [];
    let g0 = -1;
    for (let x = lo; x <= hi + 1; x++) {
        const inG = x <= hi && colHist[x] <= gutThresh;
        if (inG && g0 < 0) g0 = x;
        if (!inG && g0 >= 0) {
            // interior only: not flush with the span edges
            if (x - g0 >= 12 && g0 > lo + 6 && x < hi - 6) gutters.push([g0, x]);
            g0 = -1;
        }
    }
    // pick the 3 widest interior gutters as split points
    let ranges = [];
    if (gutters.length >= 3) {
        const s = gutters.slice().sort((a, b) => (b[1] - b[0]) - (a[1] - a[0])).slice(0, 3)
            .map(g => Math.floor((g[0] + g[1]) / 2)).sort((a, b) => a - b);
        ranges = [[lo, s[0]], [s[0], s[1]], [s[1], s[2]], [s[2], hi + 1]];
    } else if (gutters.length >= 1) {
        // fewer than 3 interior gutters: use every interior gutter as a divider
        const s = gutters.map(g => Math.floor((g[0] + g[1]) / 2)).sort((a, b) => a - b);
        ranges = [];
        let prev = lo;
        for (const sp of s) { ranges.push([prev, sp]); prev = sp; }
        ranges.push([prev, hi + 1]);
    } else {
        const colW = Math.floor((hi - lo + 1) / 4);
        for (let i = 0; i < 4; i++) ranges.push([lo + i * colW, i === 3 ? hi + 1 : lo + (i + 1) * colW]);
    }

    const pageCounts = [];
    const DEBUG = process.env.WYT_DEBUG === '1';
    function detectColumn(xa, xb) {
        let t0 = -1, t1 = -1;
        const tLo = Math.max(3, max * 0.04);   // gentle: keeps thin photo/text columns intact
        for (let x = xa; x < xb; x++) if (colHist[x] > tLo) { if (t0 < 0) t0 = x; t1 = x; }
        if (t0 < 0) { t0 = xa; t1 = xb; }
        const cw = t1 - t0 + 1;
        // Row classification via longest consecutive photographic run:
        //   band row = solid photo strip (run >= 72% of column width)
        //   text row = scattered glyphs (some hits, short runs)
        const bandRows = new Uint8Array(H);
        const textRows = new Uint8Array(H);
        for (let y = 0; y < H; y++) {
            let run = 0, best = 0, hit = 0;
            for (let x = t0; x <= t1; x++) {
                if (isPhotoPixel(data, W, at(x, y))) { run++; if (run > best) best = run; hit++; }
                else run = 0;
            }
            if (best >= cw * 0.72) bandRows[y] = 1;
            else if (hit >= cw * 0.05) textRows[y] = 1;
        }
        const bands = [];
        let b0 = -1;
        for (let y = 0; y < H; y++) {
            if (bandRows[y]) {
                if (b0 < 0) b0 = y;
            } else {
                if (b0 >= 0) {
                    if (y - b0 >= 10 && y - b0 <= 170) bands.push([b0, y]);
                    b0 = -1;
                }
            }
        }
        if (DEBUG) console.log('    col ' + xa + '-' + xb + ' bands: ' + JSON.stringify(bands));
        // Merge bands separated by tiny gaps (a light row inside one photo
        // splits a single strip into two fragments).
        const merged = [];
        for (const b of bands) {
            const prev = merged[merged.length - 1];
            if (prev && b[0] - prev[1] <= 14 && (b[1] - prev[0]) <= 70) prev[1] = b[1];
            else merged.push([b[0], b[1]]);
        }
        // ── text bands: group text rows into blocks ──
        // Every DB entry has a text block, so text bands are ground truth for
        // the entry count; photos pair to their nearest text band. A text
        // band with no nearby photo means the chart printed a blank box.
        // Text lines inside one block can be separated by up to ~7 white
        // rows, so the block-split threshold must exceed that.
        const textBands = [];
        let tB0 = -1; let tLast = -1;
        for (let y = 0; y < H; y++) {
            if (textRows[y]) {
                if (tB0 < 0) tB0 = y;
                tLast = y;
            } else if (tB0 >= 0 && y - tLast > 9) {
                if (tLast - tB0 >= 7) textBands.push([tB0, tLast + 1]);
                tB0 = -1;
            }
        }
        if (tB0 >= 0 && tLast - tB0 >= 7) textBands.push([tB0, tLast + 1]);

        // Filter header/footer zones: drop text bands entirely above the
        // first photo (chart title/intro) and below the last photo (footer)
        const firstPhoto = merged.length ? merged[0][0] : 0;
        const lastPhoto = merged.length ? merged[merged.length - 1][1] : H;
        const texts = textBands.filter(tb => tb[1] > firstPhoto - 6 && tb[0] < lastPhoto + 40);

        // Order-aware pairing: walk texts and photos together so pairings
        // never cross. A text that finds no photo is either (a) a fragment
        // of the previous entry's text (sits immediately below it) or (b) a
        // chart blank (a full entry slot with no photo in the source).
        // Fragments are dropped; blanks consume a DB index.
        const isFragment = (ti) => {
            if (ti === 0) return false;
            const gap = texts[ti][0] - texts[ti - 1][1];
            return gap >= 0 && gap <= 30;
        };
        let pi = 0;
        let blanks = 0, fragments = 0;
        const emit = [];   // {textIdx, photoIdx or -1}
        for (let ti = 0; ti < texts.length; ti++) {
            const tc = (texts[ti][0] + texts[ti][1]) / 2;
            // advance past photos that are clearly above this text
            while (pi < merged.length && ((merged[pi][0] + merged[pi][1]) / 2) < tc - 130) pi++;
            let take = -1;
            if (pi < merged.length) {
                const pc = (merged[pi][0] + merged[pi][1]) / 2;
                if (Math.abs(pc - tc) <= 130) take = pi;
            }
            if (take >= 0) {
                emit.push([ti, take]);
                pi = take + 1;
            } else if (isFragment(ti)) {
                fragments++;
            } else {
                blanks++;
                emit.push([ti, -1]);
            }
        }
        if (DEBUG) console.log('    col ' + xa + '-' + xb + ' texts=' + texts.length + ' photos=' + merged.length +
            ' blanks=' + blanks + ' fragments=' + fragments +
            ' unusedPhotos=' + (merged.length - emit.filter(e => e[1] >= 0).length) +
            ' textGaps=' + JSON.stringify(texts.map((t, i) => i === 0 ? -1 : t[0] - texts[i - 1][1])));

        // Emit crops in TEXT order (DB order), blanks skipped
        for (const [ti, pidx] of emit) {
            if (pidx < 0) continue;
            const [by0, by1] = merged[pidx];
            const y0 = Math.max(0, by0 - 2), y1 = Math.min(H, by1 + 2);
            const bh = y1 - y0;
            const crop = Buffer.alloc(cw * bh * 4);
            for (let y = 0; y < bh; y++) for (let x = 0; x < cw; x++) {
                const si = at(t0 + x, y0 + y) * 4, di = (y * cw + x) * 4;
                crop[di] = data[si]; crop[di + 1] = data[si + 1];
                crop[di + 2] = data[si + 2]; crop[di + 3] = 255;
            }
            writeFileSync(join(OUT, 'yarn-' + String(globalIdx).padStart(3, '0') + '.png'), encodePNG(crop, cw, bh));
            globalIdx++;
        }
        return texts.length - fragments;
    }
    for (let ri = 0; ri < ranges.length; ri++) {
        let [rx0, rx1] = ranges[ri];
        // Re-split overly wide ranges (merged columns) on 4-column pages: if
        // a range is wider than 1.5x the median range width, divide it by
        // its own gutters or into equal sub-columns. Pages with fewer than
        // 3 interior gutters (like the sparse last chart page) have real
        // 2-column layouts and must not be re-split.
        const widths = ranges.map(r => r[1] - r[0]).sort((a, b) => a - b);
        const medianW = widths[Math.floor(widths.length / 2)];
        if (ranges.length >= 3 && rx1 - rx0 > medianW * 1.5) {
            const sub = [];
            let g0 = -1; const subGutters = [];
            for (let x = rx0; x <= rx1; x++) {
                const inG = x <= rx1 && colHist[x] <= gutThresh;
                if (inG && g0 < 0) g0 = x;
                if (!inG && g0 >= 0) { if (x - g0 >= 12 && g0 > rx0 + 6 && x < rx1 - 6) subGutters.push(Math.floor((g0 + x) / 2)); g0 = -1; }
            }
            if (subGutters.length >= 1) {
                let prev = rx0;
                for (const sp of subGutters) { sub.push([prev, sp]); prev = sp; }
                sub.push([prev, rx1]);
            } else {
                const n = Math.max(2, Math.round((rx1 - rx0) / medianW));
                const w = Math.floor((rx1 - rx0) / n);
                for (let k = 0; k < n; k++) sub.push([rx0 + k * w, k === n - 1 ? rx1 : rx0 + (k + 1) * w]);
            }
            console.log('  re-split wide range ' + ri + ' (' + rx0 + '-' + rx1 + ') into ' + sub.length + ' parts');
            for (const s of sub) {
                const c = detectColumn(s[0], s[1]);
                pageCounts.push(c);
            }
            continue;
        }
        pageCounts.push(detectColumn(rx0, rx1));
    }
    console.log(f, 'ranges=' + JSON.stringify(ranges.map(r => r.join('-'))) + ' perCol=[' + pageCounts.join(',') + '] total=' + pageCounts.reduce((a, b) => a + b, 0));
}
console.log('TOTAL CROPS:', globalIdx);
