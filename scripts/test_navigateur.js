// Test hors ligne : ouvre le HTML en file://, bloque tout réseau, mesure la fluidité, fait des captures.
const { chromium } = require('playwright');
const path = require('path');
const fichier = process.argv[2], dossier = process.argv[3] || '.', prefixe = process.argv[4] || 'cap';
(async () => {
  const b = await chromium.launch();
  const erreurs = [], requetes = [];
  for (const vp of [{ nom: 'pc', viewport: { width: 1400, height: 900 } }, { nom: 'tel', viewport: { width: 390, height: 800 }, isMobile: true, hasTouch: true }]) {
    const ctx = await b.newContext({ viewport: vp.viewport, isMobile: !!vp.isMobile, hasTouch: !!vp.hasTouch, deviceScaleFactor: 1 });
    await ctx.route('**/*', r => { const u = r.request().url(); if (!u.startsWith('file:') && !u.startsWith('data:') && !u.startsWith('blob:')) { requetes.push(u); return r.abort(); } return r.continue(); });
    const p = await ctx.newPage();
    p.on('pageerror', e => erreurs.push(vp.nom + ': ' + e.message));
    p.on('console', m => { if (m.type() === 'error') erreurs.push(vp.nom + ' console: ' + m.text()); });
    await p.goto('file://' + path.resolve(fichier));
    await p.waitForTimeout(400);
    if (await p.$('#avert-ok')) await p.click('#avert-ok');
    const info = await p.evaluate(() => ({ n: CARTE.nbNoeuds, f: CARTE.nbFeuilles, s: CARTE.nbSosies }));
    console.log(vp.nom, 'nœuds', info.n, 'feuilles', info.f, 'sosies', info.s);
    if (vp.nom === 'pc') {
      for (const d of ['eventail', 'radial', 'bouquets', 'horizontal']) {
        await p.evaluate(d => { CARTE.disposition(d); }, d);
        await p.waitForTimeout(1300);
        await p.evaluate(() => CARTE.recentrer(true));
        await p.waitForTimeout(100);
        await p.screenshot({ path: `${dossier}/${prefixe}-${d}.png` });
      }
      await p.evaluate(() => { CARTE.disposition('eventail'); });
      await p.waitForTimeout(1300);
      await p.evaluate(() => CARTE.recentrer(true));
      // Fluidité : 120 pas de molette, mesure du temps par image
      const t = await p.evaluate(async () => {
        const svg = document.getElementById('carte'), r = svg.getBoundingClientRect();
        const durees = []; let prec = performance.now();
        for (let i = 0; i < 120; i++) {
          svg.dispatchEvent(new WheelEvent('wheel', { deltaY: i < 60 ? -40 : 40, clientX: r.width * .55, clientY: r.height * .5, bubbles: true, cancelable: true }));
          await new Promise(res => requestAnimationFrame(() => res()));
          const n = performance.now(); durees.push(n - prec); prec = n;
        }
        durees.sort((a, b) => a - b);
        return { med: durees[60].toFixed(1), p95: durees[114].toFixed(1), max: durees[119].toFixed(1) };
      });
      console.log('temps par image pendant le zoom (ms) : médiane', t.med, 'p95', t.p95, 'max', t.max);
      // zoom intermédiaire
      await p.evaluate(() => CARTE.zoomer(3));
      await p.waitForTimeout(200);
      await p.screenshot({ path: `${dossier}/${prefixe}-zoom3.png` });
      await p.evaluate(() => CARTE.zoomer(4));
      await p.waitForTimeout(200);
      await p.screenshot({ path: `${dossier}/${prefixe}-zoom12.png` });
      // sélection d'une espèce
      const id = await p.evaluate(() => DONNEES.especes[Math.floor(DONNEES.especes.length / 3)].id);
      await p.evaluate(id => CARTE.selectionner(id), id);
      await p.waitForTimeout(1800);
      await p.screenshot({ path: `${dossier}/${prefixe}-fiche.png` });
      // recherche
      await p.fill('#recherche', DONNEES_NOM = await p.evaluate(() => DONNEES.especes[5].nom.slice(0, 6)));
      await p.waitForTimeout(200);
      await p.screenshot({ path: `${dossier}/${prefixe}-recherche.png`, clip: { x: 0, y: 0, width: 1400, height: 450 } });
      // export
      const dl = p.waitForEvent('download');
      await p.keyboard.press('Escape'); await p.evaluate(() => CARTE.vue('reglages')); await p.click('#exporter');
      const fichierDl = await dl; const out = `${dossier}/${prefixe}-export.svg`; await fichierDl.saveAs(out);
      console.log('export SVG :', (require('fs').statSync(out).size / 1024).toFixed(0), 'Ko');
    } else {
      await p.screenshot({ path: `${dossier}/${prefixe}-tel.png` });
      // pincement simulé : deux pointeurs tactiles
      const id = await p.evaluate(() => DONNEES.especes[3].id);
      await p.evaluate(id => CARTE.selectionner(id), id);
      await p.waitForTimeout(1800);
      await p.screenshot({ path: `${dossier}/${prefixe}-tel-fiche.png` });
    }
    await ctx.close();
  }
  await b.close();
  console.log('requêtes réseau tentées :', requetes.length, requetes.slice(0, 3));
  console.log('erreurs JS :', erreurs.length ? erreurs : 'aucune');
})();
