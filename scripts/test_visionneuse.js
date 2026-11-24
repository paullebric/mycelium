// Test de la visionneuse : node scripts/test_visionneuse.js <html> <dossier> [espece]
const { chromium } = require('playwright'); const path = require('path');
const [fichier, dossier, espece = 'agaricus-campestris'] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch(); const err = [];
  for (const [nom, vp] of [['pc', { width: 1400, height: 900 }], ['tel', { width: 390, height: 800 }]]) {
    const p = await b.newPage({ viewport: vp }); p.on('pageerror', e => err.push(e.message));
    await p.goto('file://' + path.resolve(fichier)); await p.waitForTimeout(300);
    await p.evaluate(e => CARTE.selectionner(e), espece); await p.waitForTimeout(1500);
    await p.click('#fiche .f-illu'); await p.waitForTimeout(400);
    await p.screenshot({ path: `${dossier}/vis-${nom}-1.png` });
    await p.click('#vis-schema'); await p.waitForTimeout(300);
    await p.screenshot({ path: `${dossier}/vis-${nom}-2.png` });
    await p.keyboard.press('Escape'); await p.waitForTimeout(200);
    console.log(nom, 'fermée après Échap :', await p.evaluate(() => document.getElementById('visionneuse').hidden));
  }
  console.log('erreurs', err); await b.close();
})();
