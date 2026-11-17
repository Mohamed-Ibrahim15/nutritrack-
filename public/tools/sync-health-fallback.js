/**
 * سكربت مساعد لإعادة توليد FALLBACK_DIETARY_CONDITIONS داخل health-conditions.js
 * من ملف البيانات data/site-dataset.json عند تحديث الشروط الصحية.
 * التشغيل: node tools/sync-health-fallback.js
 */
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const ds = JSON.parse(fs.readFileSync(path.join(root, 'data', 'site-dataset.json'), 'utf8'));
const pretty = JSON.stringify(ds.dietaryConditions, null, 2);
const lines = pretty.split(/\r?\n/);
lines[0] = '  var FALLBACK_DIETARY_CONDITIONS = ' + lines[0];
for (let i = 1; i < lines.length; i++) lines[i] = '  ' + lines[i];

const hcPath = path.join(root, 'assest', 'js', 'health-conditions.js');
const s = fs.readFileSync(hcPath, 'utf8');
const start = s.indexOf('  var FALLBACK_DIETARY_CONDITIONS = [');
if (start < 0) throw new Error('FALLBACK start not found');
const fnIdx = s.indexOf('  function datasetPath()', start);
if (fnIdx < 0) throw new Error('datasetPath not found');
const nl = s.slice(start, fnIdx).indexOf('\r\n') >= 0 ? '\r\n' : '\n';
const fullBlock = lines.join(nl) + ';' + nl + nl;
const out = s.slice(0, start) + fullBlock + s.slice(fnIdx);
fs.writeFileSync(hcPath, out, 'utf8');
console.log('Updated FALLBACK_DIETARY_CONDITIONS in health-conditions.js');
