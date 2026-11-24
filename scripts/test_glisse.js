// Vérifie le glissement des réponses : capture avant / après un déplacement de la carte
const { chromium } = require('playwright'); const path = require('path');
const [fichier, dossier, espece = 'clitocybe-odora', zoom = '0.45'] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1400, height: 900 } });
  await p.goto('file://' + path.resolve(fichier)); await p.waitForTimeout(300);
  await p.evaluate(e => CARTE.selectionner(e), espece); await p.waitForTimeout(1600);
  await p.click('#fiche .fermer'); await p.waitForTimeout(400);
  await p.evaluate(z => CARTE.zoomer(+z), zoom); await p.waitForTimeout(300);
  await p.screenshot({ path: `${dossier}/glisse-1.png` });
  await p.mouse.move(700, 500); await p.mouse.down(); await p.mouse.move(250, 650, { steps: 12 }); await p.mouse.up(); await p.waitForTimeout(300);
  await p.screenshot({ path: `${dossier}/glisse-2.png` });
  await b.close();
})();
