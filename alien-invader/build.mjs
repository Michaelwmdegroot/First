// Browser deployment has no runtime build dependency. Keep generated app.js committed for raw.githack.
// Source parts preserve the tested single-module closure; numbered text parts are concatenated verbatim.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const root=path.dirname(new URL(import.meta.url).pathname);
const parts=fs.readdirSync(path.join(root,'src')).filter(x=>/^app-\d+\.txt$/.test(x)).sort();
if(!parts.length)throw Error('Missing browser UI source parts');
fs.writeFileSync(path.join(root,'app.js'),parts.map(x=>fs.readFileSync(path.join(root,'src',x),'utf8')).join(''));
const styles=fs.readdirSync(path.join(root,'src')).filter(x=>/^style-\d+\.txt$/.test(x)).sort();
fs.writeFileSync(path.join(root,'style.css'),styles.map(x=>fs.readFileSync(path.join(root,'src',x),'utf8')).join(''));
// Idempotent, explicitly scoped fixes to the recovered simulation/globe. No other files are touched.
for(const fix of JSON.parse(fs.readFileSync(path.join(root,'src/runtime-fixes.json'),'utf8'))){
 if(!['engine.js','globe.js'].includes(fix.file)||!fix.before||!fix.after)throw Error('Invalid runtime migration');
 const file=path.join(root,fix.file),text=fs.readFileSync(file,'utf8');
 if(text.includes(fix.after))continue;
 if(!text.includes(fix.before)||text.indexOf(fix.before)!==text.lastIndexOf(fix.before))throw Error('Runtime source moved; review migration: '+fix.file);
 fs.writeFileSync(file,text.replace(fix.before,fix.after));
}
const checks=JSON.parse(fs.readFileSync(path.join(root,'src/source-checksums.json'),'utf8'));
for(const [file,expected]of Object.entries(checks)){
 const actual=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex');
 if(actual!==expected)throw Error('Source checksum mismatch: '+file);
}
console.log('Browser source assembled; all tested source checksums match.');
