// Copie la version web (dist/pwa) dans www/ pour l'application : sans service worker (inutile, tout est déjà dans l'APK).
'use strict';
const fs = require('fs'), path = require('path');
const src = path.join(__dirname, '..', 'dist', 'pwa'), dst = path.join(__dirname, 'www');
fs.rmSync(dst, { recursive: true, force: true });
fs.cpSync(src, dst, { recursive: true });
for (const f of ['sw.js', '.nojekyll']) fs.rmSync(path.join(dst, f), { force: true });
let html = fs.readFileSync(path.join(dst, 'index.html'), 'utf8');
html = html.replace(/<script>if \('serviceWorker'[^<]*<\/script>/, '');
fs.writeFileSync(path.join(dst, 'index.html'), html);
console.log('www/ prêt (' + fs.readdirSync(path.join(dst, 'hd')).length + ' photos HD)');
