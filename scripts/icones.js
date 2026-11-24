// Génère l'icône de l'app (piste 1D : « m. » en Literata italique sur un relief centré) dans toutes les tailles.
// node scripts/icones.js  ->  icones/*.png + icones/icone.svg
'use strict';
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const R = (...p) => path.join(__dirname, '..', ...p);
const N = '#0C120F', M = '#8DF5C0', T = '#E6EEE8';
const police = fs.readFileSync(R('src/polices/literata-latin-400-italic.woff2')).toString('base64');

function relief(opL, opM, rmax = 42, cx = 50, cy = 51) {
  let out = '';
  for (let k = 1; k <= 9; k++) {
    const r = rmax * k / 9, t = r / rmax; let d = '';
    for (let i = 0; i <= 72; i++) {
      const a = i / 72 * 2 * Math.PI;
      const rr = r * (1 + (0.04 + 0.14 * t * t) * Math.sin(3 * a + 1.3 + r / 9) + 0.06 * t * Math.sin(5 * a + r / 5));
      d += (i ? 'L' : 'M') + (cx + Math.cos(a) * rr).toFixed(1) + ' ' + (cy + Math.sin(a) * rr).toFixed(1);
    }
    const n = k - 1;
    out += `<path d="${d}Z" fill="none" stroke="${M}" stroke-width="${n % 3 === 2 ? .9 : .6}" stroke-opacity="${n % 3 === 2 ? opM : opL}"/>`;
  }
  return out;
}
// coins : arrondis (icône classique) ou carré plein (icône « maskable » Android, le système découpe lui-même)
// arrondi : true (coins arrondis), false (carré plein), 'rond' (disque), 'transparent' (avant-plan d'icône adaptative Android)
function svg(arrondi, echelle = 1) {
  const cont = `<g transform="translate(50 50) scale(${echelle}) translate(-50 -50)">${relief(.16, .3)}<text x="47" y="68" text-anchor="middle" font-family="Literata" font-style="italic" font-size="62" fill="${T}">m</text><circle cx="79" cy="66" r="6" fill="${M}"/></g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><style>@font-face{font-family:'Literata';font-style:italic;src:url(data:font/woff2;base64,${police}) format('woff2')}</style>` +
    (arrondi === 'transparent' ? '' : arrondi === 'rond' ? `<circle cx="50" cy="50" r="50" fill="${N}"/>` : arrondi ? `<rect width="100" height="100" rx="22" fill="${N}"/>` : `<rect width="100" height="100" fill="${N}"/>`) + cont + '</svg>';
}
(async () => {
  fs.mkdirSync(R('icones'), { recursive: true });
  fs.writeFileSync(R('icones/icone.svg'), svg(true));
  const b = await chromium.launch(); const p = await b.newPage();
  const sorties = [['icone-512.png', 512, true], ['icone-192.png', 192, true], ['apple-touch-icon.png', 180, false], ['maskable-512.png', 512, false, 0.8], ['maskable-192.png', 192, false, 0.8], ['favicon-64.png', 64, true], ['favicon-32.png', 32, true], ['android-1024.png', 1024, false, 0.8],
    ['android-rond-192.png', 192, 'rond', 0.82], ['android-avant-432.png', 432, 'transparent', 0.62]];
  for (const [nom, t, arr, ech] of sorties) {
    await p.setViewportSize({ width: t, height: t });
    await p.setContent(`<html><body style="margin:0;background:transparent">${svg(arr, ech || 1).replace('<svg ', `<svg width="${t}" height="${t}" `)}</body></html>`);
    await p.evaluate(() => document.fonts.ready);
    await p.screenshot({ path: R('icones', nom), omitBackground: true });
  }
  await b.close();
  console.log('icônes écrites dans icones/');
})();
