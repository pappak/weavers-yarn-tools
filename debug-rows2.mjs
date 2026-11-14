// One-off: classify rows 285-345 of page 1 col1 with the same logic
import { readFileSync } from 'fs';
import { inflateSync } from 'zlib';
const buf = readFileSync('C:/Users/eldon/Workspace/weavers-yarn-tools/chart-pages/Screenshot 2026-06-04 131916.png');
let pos = 8, W = 0, H = 0, ct = 0;
const idat = [];
while (pos < buf.length) {
    const len = buf.readUInt32BE(pos), type = buf.toString('ascii', pos + 4, pos + 8);
    if (type === 'IHDR') { W = buf.readUInt32BE(pos + 8); H = buf.readUInt32BE(pos + 12); ct = buf[pos + 17]; }
    else if (type === 'IDAT') idat.push(buf.subarray(pos + 8, pos + 8 + len));
    pos += 12 + len;
    if (type === 'IEND') break;
}
const ch = ct === 6 ? 4 : ct === 2 ? 3 : 1;
const raw = inflateSync(Buffer.concat(idat));
const stride = W * ch;
const out = Buffer.alloc(W * H * ch);
let p = 0;
for (let y = 0; y < H; y++) {
    const f = raw[p++]; const row = y * stride;
    for (let x = 0; x < stride; x++) {
        const v = raw[p++]; const a = x >= ch ? out[row + x - ch] : 0;
        const b = y > 0 ? out[row - stride + x] : 0;
        const c = (x >= ch && y > 0) ? out[row - stride + x - ch] : 0;
        let val;
        if (f === 0) val = v; else if (f === 1) val = v + a; else if (f === 2) val = v + b;
        else if (f === 3) val = v + ((a + b) >> 1);
        else { const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c); val = v + ((pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c)); }
        out[row + x] = val & 0xff;
    }
}
const at = (x, y) => y * W + x;
const t0 = 80, t1 = 255, cw = t1 - t0 + 1;
for (let y = 285; y <= 400; y++) {
    let run = 0, best = 0, hit = 0;
    const samples = [];
    for (let x = t0; x <= t1; x++) {
        const i = at(x, y) * 4;
        const r = out[i], g = out[i + 1], b = out[i + 2];
        const lum = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
        const gray = Math.abs(r - g) < 30 && Math.abs(g - b) < 32;
        const isP = gray && lum > 0.04 && lum < 0.968;
        if (isP) { run++; if (run > best) best = run; hit++; }
        else run = 0;
        if (x >= 90 && x <= 120 && samples.length < 4) samples.push('(' + r + ',' + g + ',' + b + ')');
    }
    const cls = best >= cw * 0.72 ? 'BAND' : (hit >= cw * 0.05 ? 'text' : '-');
    console.log('y=' + y, cls, 'best=' + best + '/' + cw, 'hit=' + hit, samples.join(''));
}
