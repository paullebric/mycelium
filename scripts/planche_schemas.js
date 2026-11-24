// Planche de contrôle de tous les schémas : node scripts/planche_schemas.js <sortie.png>
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const especes = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/especes.json'), 'utf8'));
const schema = fs.readFileSync(path.join(__dirname, '../src/schema.js'), 'utf8');
const col = { mortel: '#c62828', toxique: '#d35400', comestible: '#2e7d32', 'sans-interet': '#6b6b6b' };
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1520, height: 1400 } });
  await p.setContent(`<body style="margin:0;background:#f7f2e6;font:11px sans-serif"><div id=g style="display:grid;grid-template-columns:repeat(12,124px);gap:2px"></div><script>${schema}</script></body>`);
  await p.evaluate(({ especes, col }) => {
    document.getElementById('g').innerHTML = especes.map(e => `<div style="text-align:center"><svg viewBox="0 0 100 100" width="110" height="110" style="background:#fbf8f0;border:3px solid ${col[e.statut]};border-radius:50%">${Schema.dessiner(e.schema, e.id)}</svg><div>${e.nom}</div></div>`).join('');
  }, { especes, col });
  await p.screenshot({ path: process.argv[2], fullPage: true }); await b.close();
})();
