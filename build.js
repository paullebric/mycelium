#!/usr/bin/env node
/* Construit le fichier HTML unique et autonome.
   node build.js                 -> dist/carte-champignons.html (schémas dessinés)
   node build.js --photos        -> dist/carte-champignons-photos.html (photos Wikimedia intégrées)
   node build.js --factice [N]   -> dist/carte-factice.html (données factices pour tester le moteur) */
'use strict';
const fs = require('fs'), path = require('path');
const R = (...p) => path.join(__dirname, ...p);
const args = process.argv.slice(2);
const pwa = args.includes('--pwa');            // version web installable (GitHub Pages) : HD en fichiers séparés
const avecPhotos = args.includes('--photos') || pwa;
const fichiersHD = [];
const factice = args.includes('--factice');

function lireJSON(f) { return JSON.parse(fs.readFileSync(R(f), 'utf8')); }

let cle, especes, photos = null;
const blocsHD = [];
if (factice) {
  const n = parseInt(args[args.indexOf('--factice') + 1], 10) || 150;
  ({ cle, especes } = genererFactice(n));
} else {
  cle = lireJSON('data/cle.json');
  especes = lireJSON('data/especes.json');
  // versions courtes des réponses (affichées sur la carte) ; le texte complet reste pour la page « ? » et la fiche
  const courtes = lireJSON('data/reponses_courtes.json');
  (function fusion(q) { if (q.espece) return; const c = courtes[q.id]; if (!c || c.length !== q.options.length) console.warn('⚠ réponses courtes à revoir pour la question « ' + q.id + ' » (lancer scripts/reponses_courtes.py)'); q.options.forEach((o, i) => { if (c && c[i]) o.court = c[i]; fusion(o.suite); }); })(cle);
}
if (avecPhotos) {
  const meta = lireJSON('data/photos.json');
  photos = {};
  for (const [id, p] of Object.entries(meta)) {
    const f = R('data', 'photos', id + '.jpg');
    if (!fs.existsSync(f)) continue;
    photos[id] = { src: 'data:image/jpeg;base64,' + fs.readFileSync(f).toString('base64'), auteur: p.auteur, licence: p.licence, url: p.url, fichier: p.fichier };
    // la HD est stockée à part (blocs de texte lus seulement à l'ouverture d'une photo en grand)
    for (const [ext, mime] of [['webp', 'image/webp'], ['jpg', 'image/jpeg']]) {
      const fhd = R('data', 'photos-hd', id + '.' + ext);
      if (fs.existsSync(fhd) && pwa) { photos[id].hd = true; photos[id].hdUrl = 'hd/' + id + '.' + ext; fichiersHD.push([fhd, id + '.' + ext]); break; }
      if (fs.existsSync(fhd)) { photos[id].hd = true; blocsHD.push(`<script type="text/plain" id="hd-${id}" data-mime="${mime}">${fs.readFileSync(fhd).toString('base64')}</script>`); break; }
    }
  }
}
// Numéro de version unique (affiché dans l'app, repris par l'application Android) : version.json
const versionApp = fs.existsSync(R('version.json')) ? JSON.parse(fs.readFileSync(R('version.json'), 'utf8')) : { version: '0', versionCode: 0 };
const pkg = { version: new Date().toISOString().slice(0, 10), app: versionApp.version };
const donnees = { cle, especes, photos, meta: pkg };
const js = fs.readFileSync(R('src/schema.js'), 'utf8') + '\n' + fs.readFileSync(R('src/app.js'), 'utf8');
// Échappement pour inclusion dans <script> : « </ » et séparateurs de ligne Unicode
const jsonSur = JSON.stringify(donnees).replace(/<\//g, '<\\/').replace(/[\u2028\u2029]/g, c => '\\u' + c.charCodeAt(0).toString(16));
let html = fs.readFileSync(R('src/template.html'), 'utf8');
const remplacer = (cle, val) => { if (!html.includes(cle)) throw new Error('Marqueur absent : ' + cle); html = html.split(cle).join(val); };
// Polices intégrées (SIL Open Font License) : aucune requête réseau
const polices = [['Literata', 'normal', 400, 'literata-latin-400-normal'], ['Literata', 'italic', 400, 'literata-latin-400-italic'],
  ['IBM Plex Mono', 'normal', 400, 'ibm-plex-mono-latin-400-normal'], ['IBM Plex Mono', 'normal', 500, 'ibm-plex-mono-latin-500-normal'], ['IBM Plex Mono', 'normal', 600, 'ibm-plex-mono-latin-600-normal']]
  .map(([f, st, w, fic]) => `@font-face{font-family:'${f}';font-style:${st};font-weight:${w};font-display:swap;src:url(data:font/woff2;base64,${fs.readFileSync(R('src/polices', fic + '.woff2')).toString('base64')}) format('woff2')}`).join('\n');
remplacer('/*POLICES*/', polices);
// En-tête PWA (manifeste, réglages iPhone) et enregistrement du service worker : seulement pour --pwa
remplacer('<!--PWA-->', pwa ? ['<link rel="manifest" href="manifest.webmanifest">', '<meta name="mobile-web-app-capable" content="yes">', '<meta name="apple-mobile-web-app-capable" content="yes">',
  '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">', '<meta name="apple-mobile-web-app-title" content="mycélium">'].join('\n') : '');
remplacer('<!--SW-->', pwa ? `<script>if ('serviceWorker' in navigator && location.protocol !== 'file:') addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); });</script>` : '');
// Icône de l'app (générée par scripts/icones.js), intégrée en data: pour rester hors ligne
const ico = f => fs.existsSync(R('icones', f)) ? 'data:image/png;base64,' + fs.readFileSync(R('icones', f)).toString('base64') : null;
remplacer('<!--ICONES-->', [ico('favicon-64.png') && `<link rel="icon" type="image/png" href="${ico('favicon-64.png')}">`, ico('apple-touch-icon.png') && `<link rel="apple-touch-icon" href="${ico('apple-touch-icon.png')}">`].filter(Boolean).join('\n'));
remplacer('/*CSS_PAGE*/', fs.readFileSync(R('src/page.css'), 'utf8'));
remplacer('/*CSS_CARTE*/', fs.readFileSync(R('src/carte.css'), 'utf8'));
remplacer('/*DONNEES*/', 'window.DONNEES=' + jsonSur + ';');
remplacer('/*JS*/', js.replace(/<\/script/gi, '<\\/script'));
html = html.replace('</body>', blocsHD.join('\n') + '\n</body>');
// Garde-fou : aucune ressource réseau
const reseau = html.match(/(?:src|href)\s*=\s*["'](?:https?:)?\/\/[^"']+/gi);
if (reseau) { console.error('Ressource externe détectée :', reseau.slice(0, 5)); process.exit(1); }
const sortie = factice ? 'dist/carte-factice.html' : pwa ? 'dist/pwa/index.html' : avecPhotos ? 'dist/carte-champignons-photos.html' : 'dist/carte-champignons.html';
if (pwa) fs.mkdirSync(R('dist/pwa/hd'), { recursive: true });
fs.mkdirSync(R('dist'), { recursive: true });
fs.writeFileSync(R(sortie), html);
if (pwa) ecrirePWA();
console.log(`${sortie} : ${(html.length / 1024).toFixed(0)} Ko, ${especes.length} espèces` + (photos ? `, ${Object.keys(photos).length} photos (dont ${Object.values(photos).filter(p => p.hd).length} en HD)` : ''));

function genererFactice(nFeuilles) {
  let graine = 42; const rnd = () => (graine = (graine * 1664525 + 1013904223) >>> 0) / 4294967296;
  const statuts = ['comestible', 'comestible', 'sans-interet', 'toxique', 'mortel'];
  const formes = ['convexe', 'plat', 'conique', 'mamelon', 'entonnoir', 'bombe', 'cloche'];
  const couleurs = ['#c98a3c', '#8d6e4f', '#e0c060', '#b23b2b', '#eee6d2', '#7f8f5a', '#5a4a3a', '#d77b2b'];
  const esp = []; let qid = 0;
  function arbre(n, prof, sec) {
    if (n === 1) {
      const id = 'esp-' + esp.length;
      esp.push({ id, rang: (sec || rnd() < .25) ? 'secondaire' : 'principal', mois: [5,6,7,8,9,10], nom: 'Espèce factice ' + esp.length, latin: 'Fungus fictus ' + esp.length, statut: statuts[Math.floor(rnd() * statuts.length)],
        criteres: ['Critère A de test', 'Critère B un peu plus long pour tester le retour à la ligne', 'Critère C'], habitat: 'Bois', saison: 'Automne', confusions: [], sources: [{ titre: 'Données factices' }],
        schema: { type: rnd() < .3 ? 'bolet' : 'agaric', forme: formes[Math.floor(rnd() * formes.length)], chapeau: couleurs[Math.floor(rnd() * couleurs.length)], pied: '#efe6d2', anneau: rnd() < .4, volve: rnd() < .2 ? 'sac' : null, ornement: rnd() < .3 ? 'verrues' : null } });
      return { espece: id };
    }
    const k = Math.min(n, 2 + Math.floor(rnd() * 3));
    const parts = Array(k).fill(1); for (let i = k; i < n; i++) parts[Math.floor(rnd() * k)]++;
    const id = 'q' + (qid++);
    return { id, question: 'Question factice n° ' + qid + ' : quel critère observe-t-on ?', aide: prof < 2 ? 'Aide de test' : undefined, groupe: prof === 1 ? 'Groupe ' + qid : undefined,
      options: parts.map((p, i) => ({ reponse: 'Réponse ' + (i + 1) + ' (critère observable)', suite: arbre(p, prof + 1, sec || (prof >= 2 && rnd() < .3)) })) };
  }
  const c = arbre(nFeuilles, 0);
  for (let i = 0; i < esp.length / 4; i++) { const a = esp[Math.floor(rnd() * esp.length)], b = esp[Math.floor(rnd() * esp.length)]; if (a !== b && !a.confusions.includes(b.id)) { a.confusions.push(b.id); b.confusions.push(a.id); } }
  return { cle: c, especes: esp };
}

// ---------- PWA : fichiers à côté de index.html ----------
function ecrirePWA() {
  const D = (...p) => R('dist/pwa', ...p);
  for (const [src, nom] of fichiersHD) fs.copyFileSync(src, D('hd', nom));
  fs.mkdirSync(D('icones'), { recursive: true });
  for (const f of ['icone-192.png', 'icone-512.png', 'maskable-192.png', 'maskable-512.png', 'apple-touch-icon.png', 'favicon-64.png']) fs.copyFileSync(R('icones', f), D('icones', f));
  fs.writeFileSync(D('manifest.webmanifest'), JSON.stringify({
    name: 'mycélium · champignons de France', short_name: 'mycélium', lang: 'fr',
    description: 'Carte interactive d\'identification des champignons de France, utilisable hors ligne. Outil pédagogique.',
    start_url: './', scope: './', display: 'standalone', orientation: 'any',
    background_color: '#0C120F', theme_color: '#0C120F',
    icons: [
      { src: 'icones/icone-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: 'icones/icone-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: 'icones/maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: 'icones/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
    ]
  }, null, 1));
  // le numéro de version change à chaque construction : l'app se met à jour à la visite suivante
  const version = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12);
  const coeur = ['./', 'index.html', 'manifest.webmanifest'].concat(fs.readdirSync(D('icones')).map(f => 'icones/' + f));
  const hd = fichiersHD.map(([, nom]) => 'hd/' + nom);
  fs.writeFileSync(D('sw.js'), `// Service worker de mycélium : tout est mis en cache pour fonctionner hors ligne.
const VERSION = 'mycelium-${version}';
const COEUR = ${JSON.stringify(coeur)};
const HD = ${JSON.stringify(hd)};
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(COEUR)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim())
    .then(() => caches.open(VERSION)).then(async c => { // photos HD : téléchargées en arrière-plan, une par une
      for (const u of HD) { try { if (!(await c.match(u))) await c.add(u); } catch (err) { /* réessayé à la prochaine visite */ } }
    }));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(r => r || fetch(e.request).then(rep => {
    if (rep.ok && new URL(e.request.url).origin === location.origin) { const copie = rep.clone(); caches.open(VERSION).then(c => c.put(e.request, copie)); }
    return rep;
  }).catch(() => caches.match('index.html'))));
});
`);
  fs.writeFileSync(D('.nojekyll'), '');
  if (fs.existsSync(R('src/confidentialite.html'))) fs.copyFileSync(R('src/confidentialite.html'), D('confidentialite.html')); // politique de confidentialité (Play Store)
  if (fs.existsSync(R('src/README-depot.md'))) fs.copyFileSync(R('src/README-depot.md'), D('README.md')); // présentation du dépôt GitHub
  const taille = fichiersHD.reduce((a, [src]) => a + fs.statSync(src).size, 0) + fs.statSync(D('index.html')).size;
  console.log(`PWA prête dans dist/pwa/ : index.html + ${fichiersHD.length} photos HD (${(taille / 1048576).toFixed(1)} Mo au total), version ${version}`);
}
