import { readFileSync } from 'fs';
const src = readFileSync('C:/Users/eldon/Workspace/uploads/weaverscanvas.html', 'utf8').split('\n');
function probe(startAnchor, prefix) {
    let a = -1;
    for (let i = 0; i < src.length; i++) if (src[i].includes(startAnchor)) { a = i; break; }
    if (a < 0) { console.log('anchor missing: ' + startAnchor); return; }
    for (let i = a + 1; i < src.length; i++) {
        const m = src[i].match(/^\s*function ([A-Za-z_$][\w$]*)/);
        if (m && !m[1].startsWith(prefix)) {
            console.log('== ' + startAnchor + ' ==');
            console.log('  ends before line ' + (i + 1) + ': ' + m[1]);
            console.log('  last 3 lines of slice:');
            for (let k = Math.max(0, i - 3); k < i; k++) console.log('   | ' + src[k].slice(0, 110));
            console.log('  found at: | ' + src[i].slice(0, 80));
            return;
        }
    }
    console.log('== ' + startAnchor + ' == no foreign function found');
}
probe('function ycAddColor', 'yc');
probe('function ylRender', 'yl');
