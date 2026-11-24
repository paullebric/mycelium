#!/usr/bin/env node
/* Vérification des données : node verifier.js
   - clé : identifiants uniques, ≥ 2 réponses par question, chaque espèce atteinte par UN SEUL chemin, aucune orpheline ;
   - fiches : tous les champs remplis, statuts valides, sources présentes ;
   - confusions : cibles existantes et liens réciproques ;
   - statuts « sensibles » imposés (espèces dont le statut a changé) ;
   - contrôle croisé (avertissement) avec le texte Wikipédia FR mis en cache dans cache/wiki/. */
'use strict';
const fs = require('fs'), path = require('path');
const R = (...p) => path.join(__dirname, ...p);
const DATA = process.argv[2] ? path.resolve(process.argv[2]) : R('data');
const cle = JSON.parse(fs.readFileSync(path.join(DATA, 'cle.json'), 'utf8'));
const especes = JSON.parse(fs.readFileSync(path.join(DATA, 'especes.json'), 'utf8'));
const erreurs = [], avert = [];
const E = m => erreurs.push(m), A = m => avert.push(m);
const infos = []; // comestibles sans sosie renseigné (information)

const STATUTS = ['comestible', 'sans-interet', 'toxique', 'mortel'];
const TYPES_SCHEMA = ['agaric', 'bolet', 'hydne', 'chanterelle', 'lisse', 'trompette', 'morille', 'gyromitre', 'helvelle', 'boule', 'corail', 'sparassis', 'console', 'pleurote', 'coupe', 'gelee', 'etoile', 'cage', 'pieuvre', 'phalle', 'nid', 'doigts', 'cascade'];
// Statuts imposés : espèces mortelles de référence et espèces dont le statut a changé
const STATUTS_IMPOSES = {
  'amanita-phalloides': 'mortel', 'amanita-virosa': 'mortel', 'amanita-verna': 'mortel',
  'cortinarius-orellanus': 'mortel', 'cortinarius-rubellus': 'mortel', 'galerina-marginata': 'mortel',
  'lepiota-brunneoincarnata': 'mortel', 'lepiota-subincarnata': 'mortel', 'lepiota-helveola': 'mortel',
  'gyromitra-esculenta': 'mortel', 'tricholoma-equestre': 'toxique', 'paxillus-involutus': 'toxique',
  'clitocybe-nebularis': 'toxique', 'entoloma-sinuatum': 'toxique', 'omphalotus-olearius': 'toxique'
};
// Mots interdits dans la clé : critères non observables à l'œil nu
const NON_OBSERVABLE = /microscop|spores? (ellipt|globul|verruqu)|cystide|réactif|KOH|amyloïde|basides?/i;

/* ---------- Fiches ---------- */
const parId = {};
const latins = {};
for (const e of especes) {
  const nom = e.id || '(sans id)';
  if (!e.id || !/^[a-z]+(-[a-z]+)+$/.test(e.id)) E(`${nom} : identifiant absent ou mal formé`);
  if (parId[e.id]) E(`${nom} : identifiant en double`);
  parId[e.id] = e;
  if (latins[e.latin]) E(`${nom} : nom latin en double avec ${latins[e.latin]}`);
  latins[e.latin] = e.id;
  for (const ch of ['nom', 'latin', 'habitat', 'saison', 'sporee']) if (!e[ch] || !String(e[ch]).trim()) E(`${nom} : champ « ${ch} » vide`);
  if (!STATUTS.includes(e.statut)) E(`${nom} : statut invalide « ${e.statut} »`);
  if (!Array.isArray(e.criteres) || e.criteres.length < 2 || e.criteres.some(c => !c || !c.trim())) E(`${nom} : il faut au moins 2 critères clés non vides`);
  if (!Array.isArray(e.sources) || !e.sources.length || e.sources.some(s => !s.titre)) E(`${nom} : sources absentes ou incomplètes`);
  if (!e.sources?.some(s => s.url)) (e.rang === 'secondaire' ? A : E)(`${nom} : aucune source en ligne vérifiable (url)${e.rang === 'secondaire' ? ' (pas d\'article Wikipédia FR : guides de référence seulement)' : ''}`);
  if ((e.statut === 'mortel' || e.statut === 'toxique') && !e.toxicite) E(`${nom} : espèce ${e.statut} sans description de la toxicité`);
  if (e.precaution && e.statut !== 'comestible') A(`${nom} : « precaution » n'est utilisé que pour les comestibles`);
  if (!e.schema || !TYPES_SCHEMA.includes(e.schema.type)) E(`${nom} : schéma absent ou type inconnu`);
  if (!Array.isArray(e.mois) || !e.mois.length || e.mois.some(m => !Number.isInteger(m) || m < 1 || m > 12)) E(`${nom} : champ « mois » absent ou invalide (liste de 1 à 12)`);
  if (!Array.isArray(e.confusions)) E(`${nom} : champ « confusions » absent (mettre [] si aucune)`);
  if (STATUTS_IMPOSES[e.id] && STATUTS_IMPOSES[e.id] !== e.statut) E(`${nom} : statut attendu « ${STATUTS_IMPOSES[e.id]} », trouvé « ${e.statut} »`);
}
for (const id of Object.keys(STATUTS_IMPOSES)) if (!parId[id]) A(`statut imposé pour ${id}, mais l'espèce est absente`);

/* ---------- Confusions ---------- */
for (const e of especes) {
  for (const c of e.confusions || []) {
    if (c === e.id) E(`${e.id} : se cite lui-même dans ses confusions`);
    else if (!parId[c]) E(`${e.id} : confusion vers une espèce inconnue « ${c} »`);
    else if (!(parId[c].confusions || []).includes(e.id)) E(`${e.id} → ${c} : lien de confusion non réciproque`);
  }
  if (new Set(e.confusions || []).size !== (e.confusions || []).length) E(`${e.id} : confusion en double`);
  for (const k of Object.keys(e.distinguer || {})) if (!(e.confusions || []).includes(k)) E(`${e.id} : « distinguer » mentionne ${k} qui n'est pas dans les confusions`);
  if (e.statut === 'comestible' && !(e.confusions || []).length) infos.push(e.id);
}

/* ---------- Clé ---------- */
const idsQ = new Set(), atteint = {};
let nbQ = 0, profMax = 0;
(function parcours(n, chemin) {
  if (n.espece !== undefined) {
    if (!parId[n.espece]) E(`clé : feuille vers une espèce inconnue « ${n.espece} » (${chemin.join(' > ')})`);
    (atteint[n.espece] = atteint[n.espece] || []).push(chemin.join(' > '));
    profMax = Math.max(profMax, chemin.length);
    return;
  }
  nbQ++;
  if (!n.id) E(`clé : question sans identifiant (${chemin.join(' > ')})`);
  else if (idsQ.has(n.id)) E(`clé : identifiant de question en double « ${n.id} »`);
  idsQ.add(n.id);
  if (!n.question || !n.question.trim()) E(`clé : question vide (${n.id})`);
  if (NON_OBSERVABLE.test(n.question + ' ' + (n.aide || ''))) E(`clé : critère non observable à l'œil nu dans « ${n.id} »`);
  if (!Array.isArray(n.options) || n.options.length < 2) E(`clé : la question « ${n.id} » doit avoir au moins 2 réponses`);
  const vues = new Set();
  for (const o of n.options || []) {
    if (!o.reponse || !o.reponse.trim()) E(`clé : réponse vide sous « ${n.id} »`);
    if (vues.has(o.reponse)) E(`clé : réponse en double sous « ${n.id} »`);
    vues.add(o.reponse);
    if (NON_OBSERVABLE.test(o.reponse)) E(`clé : réponse non observable à l'œil nu sous « ${n.id} » : ${o.reponse}`);
    if (!o.suite) E(`clé : réponse sans suite sous « ${n.id} »`);
    else parcours(o.suite, chemin.concat(n.id));
  }
})(cle, []);
for (const e of especes) {
  const ch = atteint[e.id] || [];
  if (ch.length === 0) E(`${e.id} : espèce orpheline (absente de la clé)`);
  if (ch.length > 1) E(`${e.id} : atteinte par ${ch.length} chemins (un seul attendu)`);
}

/* ---------- Contrôle croisé avec Wikipédia (avertissements) ---------- */
const MOTS = {
  mortel: /mortel|mortelle|létal|décès|amatoxine|amanitine|orellanine|gyromitrine/i,
  toxique: /toxique|vénéneu|intoxication|indigest|vomissement|irritant|syndrome/i,
  comestible: /comestible/i,
  'sans-interet': /médiocre|immangeable|amer|douteu|sans intérêt|déconseill|rejeter/i
};
let nbWiki = 0;
for (const e of especes) {
  const f = R('cache', 'wiki', e.id + '.json');
  if (!fs.existsSync(f)) { A(`${e.id} : pas de texte Wikipédia en cache (lancer scripts/fetch_wiki.py)`); continue; }
  nbWiki++;
  const w = JSON.parse(fs.readFileSync(f, 'utf8'));
  const txt = (w.summary.extract || '') + ' ' + w.wikitext;
  if (!MOTS[e.statut].test(txt)) A(`${e.id} : le statut « ${e.statut} » n'est pas corroboré par le texte Wikipédia — à vérifier à la main`);
  if (e.statut === 'comestible' && /\b(mortel|mortelle)\b/i.test(w.summary.extract || '')) A(`${e.id} : le résumé Wikipédia mentionne « mortel » — à vérifier`);
}

/* ---------- Rapport ---------- */
const compte = STATUTS.map(s => `${s} : ${especes.filter(e => e.statut === s).length}`).join(', ');
console.log(`Espèces : ${especes.length} (${compte})`);
console.log(`Questions : ${nbQ}, profondeur maximale : ${profMax}, liens de confusion : ${especes.reduce((s, e) => s + (e.confusions || []).length, 0) / 2}`);
console.log(`Textes Wikipédia contrôlés : ${nbWiki}/${especes.length}`);
if (infos.length) console.log(`Comestibles sans sosie renseigné dans la liste actuelle (${infos.length}) : ${infos.join(', ')}`);
if (avert.length) { console.log(`\n${avert.length} avertissement(s) :`); avert.forEach(m => console.log('  ⚠ ' + m)); }
if (erreurs.length) { console.log(`\n${erreurs.length} ERREUR(S) :`); erreurs.forEach(m => console.log('  ✗ ' + m)); process.exit(1); }
console.log('\n✓ Aucune erreur.');
