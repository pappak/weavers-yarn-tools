// Finds the exact script block + offset of any syntax error in app/index.html
import { readFileSync } from 'fs';
const html = readFileSync('C:/Users/eldon/Workspace/weavers-yarn-tools/app/index.html', 'utf8');
const re = /<script>([\s\S]*?)<\/script>/g;
let m, bi = 0;
while ((m = re.exec(html)) !== null) {
    bi++;
    const code = m[1];
    const before = html.slice(0, m.index).split('\n').length;
    try {
        new Function(code);
        console.log('block ' + bi + ' (html line ' + before + '): OK, ' + code.split('\n').length + ' lines');
    } catch (e) {
        console.log('block ' + bi + ' (html line ' + before + '): SYNTAX ERROR: ' + e.message);
        // bisect to find the offending line
        const lines = code.split('\n');
        let lo = 1, hi = lines.length, bad = -1;
        while (lo <= hi) {
            const mid = Math.floor((lo + hi) / 2);
            try { new Function(lines.slice(0, mid).join('\n')); lo = mid + 1; }
            catch (err) { bad = mid; hi = mid - 1; }
        }
        if (bad > 0) {
            console.log('  first failing line ~' + bad + ':');
            for (let k = Math.max(0, bad - 3); k < Math.min(lines.length, bad + 2); k++) {
                console.log('   ' + (k + 1) + ': ' + lines[k].slice(0, 120));
            }
        }
    }
}
