// Captures ciblées : node scripts/captures.js <html> <dossier> <prefixe> [dispo] [espece] [zoom]
const { chromium } = require('playwright'); const path = require('path');
const [fichier, dossier, prefixe, dispo = 'radial', espece = 'amanita-phalloides', zoomRel = '1', largeur = '1400', hauteur = '900'] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: +largeur, height: +hauteur }, deviceScaleFactor: 1 });
  await p.goto('file://' + path.resolve(fichier));
  await p.evaluate(d => CARTE.disposition(d), dispo); await p.waitForTimeout(1300);
  await p.evaluate(e => CARTE.selectionner(e), espece); await p.waitForTimeout(1900);
  if (+zoomRel !== 1) { await p.evaluate(z => CARTE.zoomer(+z), zoomRel); await p.waitForTimeout(300); }
  await p.screenshot({ path: `${dossier}/${prefixe}.png` });
  await b.close();
})();
