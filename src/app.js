/* Carte interactive d'identification des champignons — moteur de carte.
   Aucune dépendance externe. Les données sont fournies par window.DONNEES :
   { cle: <arbre>, especes: [...], photos: {id: {src, auteur, licence, url, fichier}}, meta: {...} } */
(function () {
  'use strict';
  var D = window.DONNEES;
  var NS = 'http://www.w3.org/2000/svg';
  var $ = function (s, r) { return (r || document).querySelector(s); };

  /* ======================= Statuts ======================= */
  var STATUTS = {
    comestible: { label: 'Comestible', pluriel: 'Comestibles', court: 'COMEST.', couleur: '#46D17D', clair: '#13291b', dash: '' },
    'sans-interet': { label: 'Sans intérêt', pluriel: 'Sans intérêt', court: 'SANS INT.', couleur: '#9AA6A0', clair: '#1b2320', dash: '2 5' },
    toxique: { label: 'Toxique', pluriel: 'Toxiques', court: 'TOXIQUE', couleur: '#FF9F1C', clair: '#2e210e', dash: '10 5' },
    mortel: { label: 'Mortel', pluriel: 'Mortels', court: 'MORTEL', couleur: '#FF5A3C', clair: '#331511', dash: '' }
  };
  var ORDRE_STATUTS = ['mortel', 'toxique', 'sans-interet', 'comestible'];
  // Icônes dans une boîte 24x24, dessinées en blanc sur une pastille de couleur
  var ICONES = {
    comestible: '<path d="M5.5 12.5l4.2 4.2 8.8-9.2" fill="none" stroke="#0C120F" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>',
    'sans-interet': '<path d="M6.5 12h11" stroke="#0C120F" stroke-width="3" stroke-linecap="round"/>',
    toxique: '<path d="M12 4.2L21 19.5H3z" fill="#0C120F"/><path d="M12 9.5v5" stroke="#FF9F1C" stroke-width="2.2" stroke-linecap="round"/><circle cx="12" cy="17.2" r="1.25" fill="#FF9F1C"/>',
    mortel: '<path d="M12 3.6c-4.4 0-7.6 3-7.6 7 0 2.4 1.1 4.1 2.9 5.1v3.1h2.2v-1.9h1.4v1.9h2.2v-1.9h1.4v1.9h2.2v-3.1c1.8-1 2.9-2.7 2.9-5.1 0-4-3.2-7-7.6-7z" fill="#0C120F"/><circle cx="9.1" cy="10.8" r="1.9" fill="#FF5A3C"/><circle cx="14.9" cy="10.8" r="1.9" fill="#FF5A3C"/><path d="M12 13.2l-1 2h2z" fill="#FF5A3C"/>'
  };
  function iconeSVG(statut, taille) {
    var st = STATUTS[statut];
    return '<svg class="icone-statut" viewBox="0 0 24 24" width="' + (taille || 18) + '" height="' + (taille || 18) + '" aria-hidden="true"><circle cx="12" cy="12" r="12" fill="' + st.couleur + '"/>' + ICONES[statut] + '</svg>';
  }

  /* ======================= Utilitaires ======================= */
  function el(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    if (attrs) for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function escHTML(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function normaliser(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim(); }
  function couper(txt, max) {
    var mots = String(txt).split(' '), lignes = [], cur = '';
    mots.forEach(function (m) {
      if (cur && (cur + ' ' + m).length > max) { lignes.push(cur); cur = m; }
      else cur = cur ? cur + ' ' + m : m;
    });
    if (cur) lignes.push(cur);
    return lignes;
  }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function r1(v) { return Math.round(v * 10) / 10; }
  function stockage(cle, val) {
    try { if (val === undefined) return localStorage.getItem(cle); localStorage.setItem(cle, val); } catch (e) { return null; }
  }

  /* ======================= Données → arbre ======================= */
  var ESP = {};
  D.especes.forEach(function (e) { ESP[e.id] = e; });
  var noeuds = [], parId = {}, feuilles = [];
  function construire(n, parent, opt, prof) {
    var nd = {
      id: n.espece ? 'sp:' + n.espece : n.id, parent: parent, reponse: opt ? opt.reponse : null, court: opt ? (opt.court || opt.reponse) : null,
      prof: prof, enfants: [], q: n.espece ? null : n, sp: n.espece ? ESP[n.espece] : null
    };
    noeuds.push(nd); parId[nd.id] = nd;
    if (parent) parent.enfants.push(nd);
    if (n.espece) { nd.iF = feuilles.length; feuilles.push(nd); }
    else n.options.forEach(function (o) { construire(o.suite, nd, o, prof + 1); });
    return nd;
  }
  var racine = construire(D.cle, null, null, 0);
  // Groupe de premier niveau (pour l'espacement) et étendue des feuilles
  (function etendue(nd) {
    if (nd.sp) { nd.f0 = nd.f1 = nd.iF; nd.nF = 1; nd.profMax = nd.prof; nd.h = 0; nd.sec = nd.sp.rang === 'secondaire'; nd.aPrinc = !nd.sec; nd.hP = nd.sec ? null : 0; return; }
    nd.enfants.forEach(etendue);
    nd.f0 = nd.enfants[0].f0; nd.f1 = nd.enfants[nd.enfants.length - 1].f1;
    nd.nF = nd.enfants.reduce(function (s, c) { return s + c.nF; }, 0);
    nd.profMax = Math.max.apply(null, nd.enfants.map(function (c) { return c.profMax; }));
    nd.h = 1 + Math.max.apply(null, nd.enfants.map(function (c) { return c.h; }));
    var hp = nd.enfants.filter(function (c) { return c.aPrinc; }).map(function (c) { return c.hP; });
    nd.aPrinc = hp.length > 0; nd.hP = nd.aPrinc ? 1 + Math.max.apply(null, hp) : null;
  })(racine);
  var PROF_MAX = racine.profMax;
  function ancetres(nd) { var a = []; while (nd) { a.unshift(nd); nd = nd.parent; } return a; }
  // Positions « u » des feuilles avec des espaces entre groupes
  // wSec : place occupée par une espèce secondaire (1 = autant qu'une principale)
  function calculerU(wSec) {
    var U = [], u = 0;
    feuilles.forEach(function (f, i) {
      if (i > 0) {
        var prev = feuilles[i - 1];
        var a = ancetres(prev), b = ancetres(f), k = 0;
        while (a[k] === b[k]) k++;
        var commun = k - 1; // profondeur de l'ancêtre commun
        var ecart = commun <= 0 ? 2.6 : commun === 1 ? 2.0 : (prev.parent === f.parent ? 1 : 1.45);
        var w = ((prev.sec ? wSec : 1) + (f.sec ? wSec : 1)) / 2;
        u += ecart * w;
      }
      U.push(u);
    });
    return { U: U, UTOT: u };
  }
  var U0 = calculerU(1), U = U0.U, UTOT = U0.UTOT;
  var NB_SEC = feuilles.filter(function (f) { return f.sec; }).length;
  var HP_RACINE = racine.hP;
  // Paires de sosies (dédoublonnées)
  var paires = [], vu = {};
  D.especes.forEach(function (e) {
    (e.confusions || []).forEach(function (c) {
      var k = e.id < c ? e.id + '|' + c : c + '|' + e.id;
      if (vu[k] || !ESP[c]) return; vu[k] = 1;
      paires.push({ cle: k, a: e.id, b: c });
    });
  });

  /* ======================= Dispositions ======================= */
  var ESP_F = 165, TAILLE_F = 1.4; // espacement entre feuilles ; taille des ronds d'espèces (carte radiale) // espacement entre feuilles (unités monde)
  function polaire(a, r) { return [Math.cos(a) * r, Math.sin(a) * r]; }
  var H_RACINE = racine.h;

  // Radial / éventail : espèces sur le cercle extérieur, questions placées selon leur « hauteur »
  // (distance à l'espèce la plus lointaine) pour répartir les nœuds sur tout le disque.
  // Radial / éventail : espèces principales sur un premier cercle, espèces secondaires sur un
  // cercle extérieur, au-delà d'un cercle pointillé « Champignons principaux ».
  function dispositionPolaire(amin, amax, nom) {
    var etendueA = amax - amin, plein = etendueA >= Math.PI * 2 - 1e-6;
    var ECART_C = 470, ECART_S = 560; // cercle pointillé, puis cercle des secondaires (unités monde)
    var R = 1400, Rc, R2, Uw, utot;
    for (var it = 0; it < 4; it++) { // point fixe : l'espacement dépend du rapport des rayons
      Rc = R + ECART_C; R2 = Rc + ECART_S;
      Uw = NB_SEC ? calculerU(R / R2) : U0;
      utot = plein ? Uw.UTOT + 2.6 : Uw.UTOT;
      R = Math.max(1400, (utot * ESP_F) / etendueA);
    }
    if (!NB_SEC) { Rc = R2 = R; }
    var UU = Uw.U;
    var hSmax = Math.max.apply(null, noeuds.map(function (n) { return n.aPrinc || n.sp ? 0 : n.h; }).concat([1]));
    var pasS = (R2 - Rc - 120) / (hSmax + 0.5);
    var pos = {}, aret = {};
    noeuds.forEach(function (nd) {
      var u = nd.sp ? UU[nd.iF] : (UU[nd.f0] + UU[nd.f1]) / 2;
      var a = plein ? amin + u / utot * etendueA : amin + (u / Uw.UTOT) * etendueA;
      var r;
      if (nd.prof === 0) r = 0;
      else if (nd.sp) r = nd.sec ? R2 : R;
      else if (nd.aPrinc) r = R * (0.24 + 0.76 * (1 - nd.hP / HP_RACINE));
      else r = R2 - nd.h * pasS; // question ne menant qu'à des espèces secondaires : au-delà du cercle
      var p = polaire(a, r), s;
      if (nd.sp) s = TAILLE_F;
      else if (nd.prof === 0) s = R * 0.24 / 150;
      else {
        var arc = (UU[nd.f1] - UU[nd.f0] + 1.3) / utot * etendueA * r;
        s = Math.max(0.3, Math.min(arc / 290, (R * 0.76 / HP_RACINE) / 220, 2.6));
      }
      pos[nd.id] = { x: p[0], y: p[1], s: s, r: r, a: a, d: a };
    });
    // Branches : toutes les branches d'une même question s'écartent au même rayon (près de la question),
    // puis filent droit vers leur cible. Une branche longue ne coupe donc plus ses voisines plus courtes.
    noeuds.forEach(function (nd) {
      if (!nd.parent) return;
      var P = pos[nd.parent.id], C = pos[nd.id];
      if (nd.parent.prof === 0) { var rm0 = P.r + (C.r - P.r) * 0.5; var d1 = polaire(C.a, rm0 * 0.4), d2 = polaire(C.a, rm0); aret[nd.id] = [P.x, P.y, d1[0], d1[1], d2[0], d2[1], C.x, C.y]; return; }
      var dmin = Math.min.apply(null, nd.parent.enfants.map(function (c) { return pos[c.id].r - P.r; }));
      dmin = Math.max(dmin, 40);
      var c1 = polaire(P.a, P.r + dmin * 0.45), c2 = polaire(C.a, Math.min(C.r - 1, P.r + dmin * 0.95));
      aret[nd.id] = [P.x, P.y, c1[0], c1[1], c2[0], c2[1], C.x, C.y];
    });
    return finaliser({
      nom: nom, pos: pos, aret: aret, R: R, Rc: NB_SEC ? Rc : 0, R2: R2, plein: plein,
      hub: function () { return [0, 0]; },
      region: function (nd) { // étiquette de groupe : à mi-chemin entre la question et les espèces
        var P = pos[nd.id], a = P.a, r = lerp(P.r, nd.aPrinc ? R : R2, 0.5);
        return polaire(a, r);
      }
    });
  }
  // Arbre horizontal classique, ou « carte mentale » : deux ailes (gauche / droite) autour d'un tronc,
  // et les espèces d'une même question disposées en bouquet (arc de cercle).
  function dispositionHorizontale(bouquet) {
    var col = bouquet ? 330 : 360, esp = bouquet ? 140 : ESP_F;
    var pos = {}, aret = {}, cote = {};
    // 1. Choix du côté de chaque nœud
    var coupe = -1;
    if (bouquet) {
      var meilleur = null;
      for (var k = 1; k < feuilles.length; k++) {
        var traverse = noeuds.filter(function (nd) { return !nd.sp && nd.f0 < k && nd.f1 >= k; }).length;
        var score = traverse * 6 + Math.abs(U[k] - (UTOT - U[k])) / 4;
        if (!meilleur || score < meilleur.score) meilleur = { k: k, score: score };
      }
      coupe = meilleur.k;
    }
    noeuds.forEach(function (nd) {
      if (!bouquet) cote[nd.id] = 1;
      else if (nd.f1 < coupe) cote[nd.id] = -1;
      else if (nd.f0 >= coupe) cote[nd.id] = 1;
      else cote[nd.id] = 0; // tronc commun
    });
    // 2. Ordonnées : chaque aile est empilée séparément, puis centrée
    var yF = {};
    if (bouquet) {
      var g = feuilles.slice(0, coupe), d = feuilles.slice(coupe);
      var hg = U[coupe - 1] - U[0], hd = U[feuilles.length - 1] - U[coupe];
      g.forEach(function (f) { yF[f.id] = (U[f.iF] - U[0] - hg / 2) * esp; });
      d.forEach(function (f) { yF[f.id] = (U[f.iF] - U[coupe] - hd / 2) * esp; });
    } else feuilles.forEach(function (f) { yF[f.id] = U[f.iF] * esp; });
    function yNoeud(nd) {
      if (nd.sp) return yF[nd.id];
      var ys = nd.enfants.filter(function (c) { return !bouquet || cote[c.id] === cote[nd.id] || cote[nd.id] === 0; }).map(yNoeud);
      return (Math.min.apply(null, ys) + Math.max.apply(null, ys)) / 2;
    }
    // 3. Abscisses
    function nbTronc(nd) { var n = 0, a = nd.parent; while (a) { if (cote[a.id] === 0) n++; a = a.parent; } return n; }
    noeuds.forEach(function (nd) {
      var c = cote[nd.id], x;
      if (!bouquet) x = nd.sp ? PROF_MAX * col : nd.prof * col;
      else if (c === 0) x = 0;
      else x = c * (nd.prof - nbTronc(nd) + 1) * col;
      var y = yNoeud(nd);
      var s;
      if (nd.sp) s = esp / 150;
      else if (nd.prof === 0) s = 2.2;
      else s = Math.max(0.3, Math.min(((U[nd.f1] - U[nd.f0] + 1) * esp) / 300, col / 290, 2.6));
      pos[nd.id] = { x: x, y: y, s: s, d: c < 0 ? Math.PI : 0 };
    });
    if (bouquet) {
      // tronc : les nœuds communs s'étagent verticalement entre leurs enfants
      noeuds.forEach(function (nd) { if (cote[nd.id] === 0 && nd.parent) pos[nd.id].y = lerp(pos[nd.parent.id].y, pos[nd.id].y, 0.6); });
      noeuds.forEach(function (nd) { if (cote[nd.id] === 0) pos[nd.id].s = Math.min(pos[nd.id].s, nd.prof === 0 ? 2.2 : 1.6); });
      // bouquets d'espèces en arc de cercle centré sur leur question
      noeuds.forEach(function (nd) {
        if (nd.sp) return;
        var fs = nd.enfants.filter(function (c) { return c.sp; });
        if (!fs.length) return;
        var P = pos[nd.id];
        var dmax = Math.max.apply(null, fs.map(function (c) { return Math.abs(pos[c.id].y - P.y); }));
        var R = Math.max(col * 0.95, dmax * 1.12 + 60);
        fs.forEach(function (c) {
          var C = pos[c.id], dy = C.y - P.y, sg = cote[c.id] || 1;
          C.x = P.x + sg * Math.sqrt(Math.max(0, R * R - dy * dy));
        });
      });
    }
    noeuds.forEach(function (nd) {
      if (!nd.parent) return;
      var P = pos[nd.parent.id], C = pos[nd.id];
      if (bouquet && nd.sp) aret[nd.id] = [P.x, P.y, lerp(P.x, C.x, .45), P.y + (C.y - P.y) * .2, lerp(P.x, C.x, .7), C.y, C.x, C.y];
      else if (bouquet && cote[nd.id] === 0) aret[nd.id] = [P.x, P.y, P.x, lerp(P.y, C.y, .5), C.x, lerp(P.y, C.y, .5), C.x, C.y];
      else { var mx = (P.x + C.x) / 2; aret[nd.id] = [P.x, P.y, mx, P.y, mx, C.y, C.x, C.y]; }
    });
    return finaliser({
      nom: bouquet ? 'bouquets' : 'horizontal', pos: pos, aret: aret,
      hub: function (a, b) {
        var dd = Math.abs(a[1] - b[1]);
        if (bouquet && a[0] * b[0] < 0) return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 - 300];
        var sg = bouquet && a[0] < 0 ? -1 : 1;
        var bord = sg > 0 ? Math.min(a[0], b[0]) : Math.max(a[0], b[0]);
        return [bord - sg * (dd * 0.35 + 120), (a[1] + b[1]) / 2];
      },
      region: null
    });
  }
  function finaliser(L) {
    // bornes
    var x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    noeuds.forEach(function (nd) {
      var p = L.pos[nd.id], m = (nd.sp ? 150 : 150) * p.s;
      x0 = Math.min(x0, p.x - m); y0 = Math.min(y0, p.y - m); x1 = Math.max(x1, p.x + m); y1 = Math.max(y1, p.y + m);
    });
    L.bornes = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
    // taille des cartes de question limitée par la distance aux voisins (évite les chevauchements)
    var qs = noeuds.filter(function (n) { return !n.sp; });
    qs.forEach(function (nd) {
      var P = L.pos[nd.id], dq = Infinity, df = Infinity;
      noeuds.forEach(function (o) {
        if (o === nd) return;
        var Q = L.pos[o.id], d = Math.hypot(Q.x - P.x, (Q.y - P.y) * 2.2);
        if (o.sp) df = Math.min(df, d); else dq = Math.min(dq, d - 140 * Q.s * 0.5);
      });
      P.s = Math.max(0.25, Math.min(P.s, dq / 140, (df - 90) / 135));
    });
    // étiquettes de réponse : point sur l'arête
    L.rep = {};
    noeuds.forEach(function (nd) {
      if (!nd.parent) return;
      var e = L.aret[nd.id];
      function pt(t) { var mt = 1 - t; return [mt * mt * mt * e[0] + 3 * mt * mt * t * e[2] + 3 * mt * t * t * e[4] + t * t * t * e[6], mt * mt * mt * e[1] + 3 * mt * mt * t * e[3] + 3 * mt * t * t * e[5] + t * t * t * e[7]]; }
      var t = 0.5;
      if (nd.sp) {
        // réponse placée sur la branche, assez loin du cercle de l'espèce pour ne pas couvrir son image
        var C = L.pos[nd.id], marge = (L.R ? 150 : 135) * C.s;
        t = 0.3;
        for (var tt = 0.85; tt >= 0.3; tt -= 0.02) { var q = pt(tt); if (Math.hypot(q[0] - C.x, q[1] - C.y) >= marge) { t = tt; break; } }
      }
      var xy = pt(t), x = xy[0], y = xy[1];
      var sr = Math.min(L.pos[nd.id].s, L.pos[nd.parent.id].s) * (nd.sp ? 1 : 1.05);
      if (!nd.sp) sr = Math.max(sr, L.pos[nd.parent.id].s * 0.9);
      L.rep[nd.id] = { x: x, y: y, s: sr };
    });
    // régions (groupes nommés)
    L.reg = {};
    noeuds.forEach(function (nd) {
      if (!nd.q || !nd.q.groupe) return;
      var p;
      if (L.region) p = L.region(nd);
      else {
        var sx = 0, sy = 0, n = 0;
        for (var i = nd.f0; i <= nd.f1; i++) { var q = L.pos[feuilles[i].id]; sx += q.x; sy += q.y; n++; }
        var P = L.pos[nd.id]; p = [lerp(P.x, sx / n, 0.5), lerp(P.y, sy / n, 0.5)];
      }
      L.reg[nd.id] = { x: p[0], y: p[1], s: (0.7 + Math.sqrt(nd.nF) * 0.38) * (nd.prof <= 2 ? 1.3 : 1) };
    });
    // sosies
    L.sos = {};
    paires.forEach(function (p) {
      var A = L.pos['sp:' + p.a], B = L.pos['sp:' + p.b];
      var m = [(A.x + B.x) / 2, (A.y + B.y) / 2], h = L.hub([A.x, A.y], [B.x, B.y]);
      L.sos[p.cle] = [A.x, A.y, lerp(m[0], h[0], .5), lerp(m[1], h[1], .5), B.x, B.y];
    });
    return L;
  }
  var DISPOS = {
    radial: { label: 'Radial', calc: function () { return dispositionPolaire(-Math.PI / 2, Math.PI * 1.5, 'radial'); } },
    eventail: { label: 'Éventail', calc: function () { return dispositionPolaire(-Math.PI * 0.6, Math.PI * 0.6, 'eventail'); } },
    bouquets: { label: 'Carte mentale (bouquets)', calc: function () { return dispositionHorizontale(true); } },
    horizontal: { label: 'Arbre horizontal', calc: function () { return dispositionHorizontale(false); } }
  };
  var calc = {};
  function dispo(nom) { return calc[nom] || (calc[nom] = DISPOS[nom].calc()); }

  /* ======================= Construction du SVG ======================= */
  var svg = $('#carte'), monde = $('#monde');
  var gCourbes = el('g', { 'class': 'courbes' }, monde);        // courbes de niveau (densité d'espèces)
  var gRegions = el('g', { 'class': 'regions' }, monde);
  var gAretes = el('g', { 'class': 'aretes' }, monde);
  var cercleP = el('circle', { 'class': 'cercle-principal', r: 0 }, monde);
  var arcP = el('path', { id: 'arc-principal', fill: 'none', stroke: 'none' }, $('#defs-carte'));
  var titreP = el('text', { 'class': 'titre-cercle' }, monde);
  var tpP = el('textPath', { href: '#arc-principal', startOffset: '50%', 'text-anchor': 'middle' }, titreP);
  tpP.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', '#arc-principal');
  tpP.textContent = 'CHAMPIGNONS PRINCIPAUX';
  var gSosies = el('g', { 'class': 'sosies' }, monde);
  var gRepsFond = el('g', { 'class': 'reponses-fond' }, monde); // réponses des autres questions, en arrière-plan pendant une sélection
  var gNoeuds = el('g', { 'class': 'noeuds' }, monde);          // disques / photos des espèces
  var gQuestions = el('g', { 'class': 'noeuds' }, monde);       // cartes de questions (au-dessus des photos)
  var gReps = el('g', { 'class': 'reponses' }, monde);          // réponses (au-dessus de tout dessin)
  var gEtiq = el('g', { 'class': 'noeuds etiquettes' }, monde);  // noms et critères des espèces (tout en haut)
  var PHOTOS = D.photos || null;
  var modePhoto = !!PHOTOS;

  var elems = {};
  noeuds.forEach(function (nd) {
    var o = elems[nd.id] = {};
    if (nd.parent) {
      o.arete = el('path', { 'class': 'arete', 'stroke-width': r1(3 + Math.sqrt(nd.nF) * 3.2), 'data-id': nd.id }, gAretes);
      var lg = couper(nd.court, 14);
      var g = el('g', { 'class': 'rep' + (nd.sp ? ' rep-f' : ''), 'data-rep': nd.id, role: 'button' }, gReps);
      // réponse = « bourgeon » numéroté posé sur la branche, texte juste dessous, sans cadre
      var num = nd.parent.enfants.indexOf(nd) + 1;
      if (lg.length > 3) lg = lg.slice(0, 2).concat([lg.slice(2).join(' ')]);
      var lw = Math.max.apply(null, lg.map(function (l) { return l.length; })) * 7.6 + 10;
      el('circle', { 'class': 'rep-bourgeon', r: 12 }, g);
      var tnum = el('text', { 'class': 'rep-num', y: 4.5, 'text-anchor': 'middle' }, g); tnum.textContent = num;
      var t = el('text', { 'class': 'rep-txt', 'text-anchor': 'middle' }, g);
      lg.forEach(function (l, i) { var ts = el('tspan', { x: 0, y: 30 + i * 14.5 }, t); ts.textContent = l; });
      o.rep = g; o.repN = lg.length;
      o.repW = Math.max(lw, 30); o.repH = 0; o.repHaut = 15; o.repBas = 36 + (lg.length - 1) * 14.5;
    }
    var g2 = el('g', { 'class': 'noeud ' + (nd.sp ? 'feuille st-' + nd.sp.statut : 'question'), 'data-id': nd.id, tabindex: 0, role: 'button' }, nd.sp ? gNoeuds : gQuestions);
    if (nd.sp) g2.style.setProperty('--c', STATUTS[nd.sp.statut].couleur);
    if (nd.sp) o.gE = el('g', { 'class': 'noeud feuille-etiq', 'data-id': nd.id }, gEtiq);
    o.g = g2;
    if (nd.sp) dessinerFeuille(nd, g2);
    else dessinerQuestion(nd, g2);
  });
  noeuds.forEach(function (nd) {
    if (nd.q && nd.q.groupe) {
      var t = el('text', { 'class': 'region', 'text-anchor': 'middle' }, gRegions);
      t.textContent = nd.q.groupe;
      elems[nd.id].reg = t;
    }
  });
  var elSosies = {};
  paires.forEach(function (p) {
    var sa = ESP[p.a].statut, sb = ESP[p.b].statut;
    var grave = (sa === 'mortel' || sb === 'mortel') ? ' mortel' : '';
    elSosies[p.cle] = el('path', { 'class': 'sosie' + grave, 'data-a': p.a, 'data-b': p.b }, gSosies);
  });

  function dessinerQuestion(nd, g) {
    var q = nd.q;
    el('circle', { r: 11, 'class': 'pastille' }, g);
    var c = el('g', { 'class': 'carte-q v1' }, g);
    // carte ajustée au texte (l'aide détaillée est dans la page « ? »)
    var lignes = couper(q.question, 24);
    var lmax = Math.max.apply(null, lignes.map(function (l) { return l.length; }).concat([q.groupe ? q.groupe.length * 0.95 : 0, 10]));
    var w = Math.round(Math.max(150, lmax * 10.2 + 44)), hw = w / 2;
    var h = 22 + lignes.length * 23 + (q.groupe ? 18 : 0) + 12;
    el('rect', { x: -hw + 4, y: -h / 2 + 5, width: w, height: h, 'class': 'ombre-q' }, c);
    el('rect', { x: -hw, y: -h / 2, width: w, height: h, 'class': 'fond-q' }, c);
    elems[nd.id].boite = { x0: -hw - 4, x1: hw + 20, y0: -h / 2 - 4, y1: h / 2 + 8 };
    var y0 = -h / 2 + 27;
    if (q.groupe) {
      var tg = el('text', { 'class': 'q-groupe', x: 0, y: y0 - 4, 'text-anchor': 'middle' }, c); tg.textContent = q.groupe.toUpperCase(); y0 += 18;
    }
    var t = el('text', { 'class': 'q-txt', 'text-anchor': 'middle' }, c);
    lignes.forEach(function (l, i) { var ts = el('tspan', { x: 0, y: y0 + i * 23 }, t); ts.textContent = l; });
    var tn = el('text', { 'class': 'q-nb', x: 0, y: y0 + lignes.length * 23 - 3, 'text-anchor': 'middle' }, c);
    tn.textContent = nd.nF + ' ESPÈCE' + (nd.nF > 1 ? 'S' : '');
    var b = el('g', { 'class': 'bouton-aide', 'data-aide': nd.id, transform: 'translate(' + hw + ' 0)', role: 'button', 'aria-label': 'Comment regarder ?' }, c);
    el('circle', { r: 16 }, b);
    var tb = el('text', { y: 6, 'text-anchor': 'middle' }, b); tb.textContent = '?';
    var tt = el('title', null, g); tt.textContent = q.question;
  }

  function illustration(sp, taille) {
    // Renvoie le contenu SVG (chaîne) d'une illustration centrée en 0,0, de rayon « taille »
    var ph = modePhoto && PHOTOS[sp.id];
    if (ph) return '<image href="' + ph.src + '" x="' + (-taille) + '" y="' + (-taille) + '" width="' + (2 * taille) + '" height="' + (2 * taille) + '" preserveAspectRatio="xMidYMid slice"/>';
    var k = (taille * 2) / 100;
    return '<rect x="' + (-taille) + '" y="' + (-taille) + '" width="' + (2 * taille) + '" height="' + (2 * taille) + '" fill="#fbf8f0"/><g transform="scale(' + k + ') translate(-50 -54)">' + Schema.dessiner(sp.schema, sp.id) + '</g>';
  }
  function dessinerFeuille(nd, g) {
    var sp = nd.sp, st = STATUTS[sp.statut];
    el('circle', { r: 48, 'class': 'disque', fill: st.clair }, g);
    var ill = el('g', { 'class': 'illu v1', 'clip-path': 'url(#clip-feuille)' }, g);
    ill.innerHTML = illustration(sp, 48);
    el('circle', { r: 48, 'class': 'anneau', stroke: st.couleur, 'stroke-dasharray': st.dash }, g);
    if (sp.statut === 'mortel') el('circle', { r: 55, 'class': 'anneau2', stroke: st.couleur }, g);
    var mc = el('g', { 'class': 'marque-carnet' }, g);
    mc.innerHTML = '<circle r="63"/><g transform="translate(-40 38)"><circle r="12" fill="#0C120F" stroke="#FFB547" stroke-width="2"/><path d="M0-7l2.1 4.4 4.8.6-3.5 3.3.9 4.8L0 3.7-4.3 6.1l.9-4.8-3.5-3.3 4.8-.6z" fill="#FFB547"/></g>';
    var b = el('g', { 'class': 'badge v1', transform: 'translate(34 -34) scale(1.25) translate(-12 -12)' }, g);
    b.innerHTML = '<circle cx="12" cy="12" r="13" fill="#0C120F"/><circle cx="12" cy="12" r="11" fill="' + st.couleur + '"/>' + ICONES[sp.statut];
    if (sp.precaution) {
      var pr = el('g', { 'class': 'badge-prec v1', transform: 'translate(-34 -34)' }, g);
      pr.innerHTML = '<circle r="11" fill="#0C120F" stroke="#FFB547" stroke-width="2"/><path d="M0 -6v6.5" stroke="#FFB547" stroke-width="2.6" stroke-linecap="round"/><circle cy="5.2" r="1.6" fill="#FFB547"/>';
    }
    elems[nd.id].etiq = el('g', { 'class': 'etiq' }, elems[nd.id].gE);
    var tt = el('title', null, g); tt.textContent = sp.nom + ' (' + sp.latin + ') — ' + st.label;
  }

  // Étiquette d'une feuille, orientée selon la direction « vers l'extérieur » de l'arbre
  function placerEtiquette(nd, mode) {
    var o = elems[nd.id], sp = nd.sp, st = STATUTS[sp.statut], g = o.etiq;
    if (o.modeEtiq === mode) return;
    o.modeEtiq = mode;
    while (g.firstChild) g.removeChild(g.firstChild);
    var lat = mode === 'droite' || mode === 'gauche';
    var lignes = [];
    if (mode.indexOf('arc') === 0) { // espèces en arc : le nom, puis la réponse juste dessous (sous le rond, ou à côté)
      var cote = mode === 'arc-d' ? 1 : mode === 'arc-g' ? -1 : 0;
      var nomL = couper(sp.nom, 16), repL = couper((nd.parent.enfants.indexOf(nd) + 1) + ' · ' + nd.court, 24).slice(0, 4);
      var xa = cote * 64, anc = cote > 0 ? 'start' : cote < 0 ? 'end' : 'middle';
      var ya = cote ? -(nomL.length * 19 + repL.length * 12.5) / 2 + 14 : 74;
      nomL.forEach(function (l) { var t = el('text', { 'class': 'nom', x: xa, y: r1(ya), 'text-anchor': anc }, g); t.textContent = l; ya += 19; });
      ya -= 3;
      repL.forEach(function (l) { var t = el('text', { 'class': 'crit rep-feuille', x: xa, y: r1(ya), 'text-anchor': anc }, g); t.textContent = l; ya += 12.5; });
      return;
    }
    couper(sp.nom, lat ? 22 : 15).forEach(function (l) { lignes.push({ c: 'nom v2', t: l, h: 19 }); });
    couper(sp.latin, lat ? 28 : 19).forEach(function (l) { lignes.push({ c: 'latin v3', t: l, h: 14 }); });
    lignes.push({ c: 'st-txt v3', t: st.label.toUpperCase() + (sp.precaution ? ' ⚠' : ''), h: 13, fill: st.couleur });
    var hTete = lignes.reduce(function (a, l) { return a + l.h; }, 0);
    couper('▸ ' + nd.court, lat ? 30 : 22).slice(0, 4).forEach(function (l) { lignes.push({ c: 'crit rep-feuille v3', t: l, h: 13 }); });
    (sp.criteres || []).slice(0, 3).forEach(function (c) {
      couper('• ' + c, lat ? 30 : 22).slice(0, 2).forEach(function (l) { lignes.push({ c: 'crit v4', t: l, h: 12.5 }); });
    });
    var x = 0, y, anc = 'middle';
    if (mode === 'droite') { x = 62; anc = 'start'; y = -hTete / 2 + 12; }
    else if (mode === 'gauche') { x = -62; anc = 'end'; y = -hTete / 2 + 12; }
    else if (mode === 'haut') {
      // bloc principal collé au-dessus du cercle, critères encore au-dessus
      var tete = lignes.filter(function (l) { return l.c.indexOf('crit') < 0; }), crit = lignes.filter(function (l) { return l.c.indexOf('crit') >= 0; });
      var hc = crit.reduce(function (a, l) { return a + l.h; }, 0);
      if (tete.length) tete[0] = Object.assign({}, tete[0], { h: tete[0].h }); if (crit.length) crit[crit.length - 1] = Object.assign({}, crit[crit.length - 1], { h: crit[crit.length - 1].h + 8 });
      lignes = crit.concat(tete); y = -64 - hTete - hc + 6;
    }
    else y = 72;
    lignes.forEach(function (l) {
      var t = el('text', { 'class': l.c, x: x, y: r1(y), 'text-anchor': anc }, g);
      if (l.fill) t.setAttribute('fill', l.fill);
      t.textContent = l.t; y += l.h;
    });
  }
  function modeDepuisAngle(a) {
    var c = Math.cos(a), s = Math.sin(a);
    if (c > 0.6) return 'droite';
    if (c < -0.6) return 'gauche';
    return s > 0 ? 'bas' : 'haut';
  }

  /* ======================= Géométrie courante ======================= */
  var courant = null; // disposition affichée (éventuellement interpolée)
  function interpoler(A, B, t) {
    if (t >= 1) return B;
    var R = { pos: {}, aret: {}, rep: {}, reg: {}, sos: {}, bornes: B.bornes, nom: B.nom, Rc: lerp(A.Rc || 0, B.Rc || 0, t), R: B.R };
    if (!A.Rc || !B.Rc) R.Rc = t < .5 ? A.Rc : B.Rc;
    var k;
    for (k in B.pos) { var a = A.pos[k], b = B.pos[k]; var dd = Math.atan2(Math.sin(b.d - a.d), Math.cos(b.d - a.d)); R.pos[k] = { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), s: lerp(a.s, b.s, t), d: a.d + dd * t }; }
    for (k in B.aret) { var ea = A.aret[k], eb = B.aret[k], e = []; for (var i = 0; i < 8; i++) e.push(lerp(ea[i], eb[i], t)); R.aret[k] = e; }
    for (k in B.rep) { var ra = A.rep[k], rb = B.rep[k]; R.rep[k] = { x: lerp(ra.x, rb.x, t), y: lerp(ra.y, rb.y, t), s: lerp(ra.s, rb.s, t) }; }
    for (k in B.reg) { var ga = A.reg[k], gb = B.reg[k]; R.reg[k] = { x: lerp(ga.x, gb.x, t), y: lerp(ga.y, gb.y, t), s: lerp(ga.s, gb.s, t) }; }
    for (k in B.sos) { var sa = A.sos[k], sb = B.sos[k], s2 = []; for (var j = 0; j < 6; j++) s2.push(lerp(sa[j], sb[j], t)); R.sos[k] = s2; }
    return R;
  }
  function appliquerGeometrie(L) {
    courant = L;
    noeuds.forEach(function (nd) {
      var o = elems[nd.id], p = L.pos[nd.id];
      o.g.setAttribute('transform', 'translate(' + r1(p.x) + ' ' + r1(p.y) + ') scale(' + p.s.toFixed(3) + ')');
      if (o.gE) o.gE.setAttribute('transform', o.g.getAttribute('transform'));
      if (nd.sp) {
        var modeE = modeDepuisAngle(p.d || 0);
        if (arcNd && nd.parent === arcNd) { // en arc : étiquette dessous si l'arc est horizontal, sinon sur le côté extérieur
          var Pq = L.pos[arcNd.id], ca = Math.cos(Math.atan2(p.y - Pq.y, p.x - Pq.x));
          modeE = ca > 0.55 ? 'arc-d' : ca < -0.55 ? 'arc-g' : 'arc';
        }
        placerEtiquette(nd, modeE);
      }
      if (o.arete) {
        var e = L.aret[nd.id];
        o.arete.setAttribute('d', 'M' + r1(e[0]) + ' ' + r1(e[1]) + 'C' + r1(e[2]) + ' ' + r1(e[3]) + ' ' + r1(e[4]) + ' ' + r1(e[5]) + ' ' + r1(e[6]) + ' ' + r1(e[7]));
        var rp = L.rep[nd.id];
        o.rep.setAttribute('transform', 'translate(' + r1(rp.x) + ' ' + r1(rp.y) + ') scale(' + rp.s.toFixed(3) + ')');
      }
      if (o.reg) {
        var g = L.reg[nd.id];
        o.reg.setAttribute('transform', 'translate(' + r1(g.x) + ' ' + r1(g.y) + ') scale(' + g.s.toFixed(3) + ')');
      }
    });
    paires.forEach(function (p) {
      var s = L.sos[p.cle];
      elSosies[p.cle].setAttribute('d', 'M' + r1(s[0]) + ' ' + r1(s[1]) + 'Q' + r1(s[2]) + ' ' + r1(s[3]) + ' ' + r1(s[4]) + ' ' + r1(s[5]));
    });
    cercleP.setAttribute('r', r1(L.Rc || 0)); cercleP.style.display = L.Rc ? '' : 'none';
    dessinerCourbes(L);
    dessinerMinicarte();
    majLOD(true); placerReponses(); placerTitreCercle();
  }

  // Courbes de niveau : des cercles déformés par la densité d'espèces de chaque secteur de la carte
  // (une branche riche en espèces « gonfle » ses courbes vers l'extérieur, comme un relief).
  var courbesPour = null;
  function dessinerCourbes(L) {
    L = calc[L.nom] || L;
    if (!L.R) { gCourbes.innerHTML = ''; courbesPour = null; return; }
    if (courbesPour === L.nom) return;
    courbesPour = L.nom;
    var N = 240, dens = [], i, j;
    for (i = 0; i < N; i++) dens.push(0);
    feuilles.forEach(function (f) {
      var p = L.pos[f.id], a = Math.atan2(p.y, p.x);
      dens[Math.floor((a + Math.PI) / (2 * Math.PI) * N) % N] += f.sec ? 0.55 : 1;
    });
    var sig = 6, lis = [], mx = 0, moy = 0;
    for (i = 0; i < N; i++) {
      var v = 0;
      for (j = -3 * sig; j <= 3 * sig; j++) v += dens[(i + j + N) % N] * Math.exp(-j * j / (2 * sig * sig));
      lis.push(v); mx = Math.max(mx, v); moy += v / N;
    }
    var Rm = (L.R2 || L.R) * 1.65, n = 20, h = ''; // variante « accentuée », moins de lignes, prolongée au-delà de la carte
    for (var k = 1; k <= n; k++) {
      var tk = k / n, r0 = Rm * tk, amp = 0.04 + 1.0 * tk * tk, d = ''; // presque rond au centre, de plus en plus accidenté vers l'extérieur
      for (i = 0; i <= N; i++) {
        var ii = i % N, a2 = -Math.PI + (ii + 0.5) * 2 * Math.PI / N;
        var rr = r0 * (1 + amp * (lis[ii] - moy) / mx) + r0 * 0.012 * Math.sin(a2 * 7 + k * 1.7);
        d += (i ? 'L' : 'M') + Math.round(Math.cos(a2) * rr) + ' ' + Math.round(Math.sin(a2) * rr);
      }
      h += '<path class="courbe' + (k % 4 === 0 ? ' maitresse' : '') + '" d="' + d + 'Z"/>';
    }
    gCourbes.innerHTML = h;
  }

  /* ======================= Caméra ======================= */
  var cam = { x: 0, y: 0, k: 1 };
  var K_MIN = 0.008, K_MAX = 12;
  var rafPlan = 0;
  // La zone visible est #zone-carte ; le SVG déborde d'une demi-largeur/hauteur de chaque côté (voir rendreApercu)
  var zoneCarte = document.getElementById('zone-carte');
  function taille() { var r = zoneCarte.getBoundingClientRect(); return { w: r.width || 800, h: r.height || 600, l: r.left, t: r.top }; }
  /* Fluidité : pendant un geste (glisser, pincer, molette, vol animé), on ne redessine pas la carte.
     On déplace et on agrandit l'image déjà dessinée (transformation CSS, faite par la carte graphique),
     puis on redessine en net à la fin du geste, ou dès que l'image déjà dessinée ne suffit plus. */
  var camR = null, enGeste = 0, finMolette = 0;
  function planifier() { if (!rafPlan) rafPlan = requestAnimationFrame(function () { rafPlan = 0; if (enGeste) rendreApercu(); else rendreCamera(); }); }
  function debutGeste() { enGeste++; }
  function finGeste() { enGeste = Math.max(0, enGeste - 1); if (!enGeste) { cancelAnimationFrame(rafPlan); rafPlan = 0; rendreCamera(); } }
  function rendreApercu() {
    if (!camR) return rendreCamera();
    var T = taille(), s = cam.k / camR.k, tx = cam.x - camR.x * s, ty = cam.y - camR.y * s;
    // l'image dessinée couvre [-W/2, 1,5 W] × [-H/2, 1,5 H] ; elle doit toujours recouvrir l'écran, sans trop s'étirer
    var couvre = tx - s * T.w / 2 <= 0 && tx + s * 1.5 * T.w >= T.w && ty - s * T.h / 2 <= 0 && ty + s * 1.5 * T.h >= T.h;
    if (!couvre || s < 0.67 || s > 1.5) return rendreCamera();
    svg.style.transform = 'translate(' + tx.toFixed(1) + 'px,' + ty.toFixed(1) + 'px) scale(' + s.toFixed(4) + ')';
    majVueMinicarte(); placerCommencer();
  }
  function rendreCamera() {
    var T0 = taille();
    camR = { x: cam.x, y: cam.y, k: cam.k };
    svg.style.transform = '';
    monde.setAttribute('transform', 'translate(' + (cam.x + T0.w / 2).toFixed(2) + ' ' + (cam.y + T0.h / 2).toFixed(2) + ') scale(' + cam.k.toFixed(5) + ')');
    majLOD(false); placerReponses(); placerTitreCercle(); majVueMinicarte(); placerCommencer();
  }
  // Bouton « Commencer l'identification » posé sur la première question quand la carte est vue de loin
  function placerCommencer() {
    var b = document.getElementById('commencer'); if (!b || !courant) return;
    var P = courant.pos[racine.id], loin = cam.k * P.s * 264 < 170;
    var vis = loin && !selection;
    b.hidden = !vis; if (!vis) return;
    b.style.left = r1(cam.x + P.x * cam.k) + 'px'; b.style.top = r1(cam.y + P.y * cam.k) + 'px';
  }
  function zoomerEn(px, py, facteur) {
    var k2 = Math.max(K_MIN, Math.min(K_MAX, cam.k * facteur));
    var f = k2 / cam.k;
    cam.x = px - (px - cam.x) * f; cam.y = py - (py - cam.y) * f; cam.k = k2;
    planifier();
  }
  function camPour(b, marge) {
    var T = taille(); marge = marge == null ? 0.06 : marge;
    var k = Math.min(T.w / (b.w * (1 + marge * 2)), T.h / (b.h * (1 + marge * 2)));
    k = Math.max(K_MIN, Math.min(K_MAX, k));
    return { x: T.w / 2 - (b.x + b.w / 2) * k, y: T.h / 2 - (b.y + b.h / 2) * k, k: k };
  }
  // Vol fluide (interpolation de van Wijk & Nuij, comme d3.interpolateZoom)
  var anim = null;
  function arreterAnim() { if (anim) { cancelAnimationFrame(anim.raf); anim = null; } }
  function volerVers(cible, dureeMax) {
    arreterAnim();
    var T = taille();
    var p0 = [(T.w / 2 - cam.x) / cam.k, (T.h / 2 - cam.y) / cam.k, T.w / cam.k];
    var p1 = [(T.w / 2 - cible.x) / cible.k, (T.h / 2 - cible.y) / cible.k, T.w / cible.k];
    var rho = Math.SQRT2, rho2 = 2, rho4 = 4;
    var ux0 = p0[0], uy0 = p0[1], w0 = p0[2], ux1 = p1[0], uy1 = p1[1], w1 = p1[2];
    var dx = ux1 - ux0, dy = uy1 - uy0, d2 = dx * dx + dy * dy, S, interp;
    if (d2 < 1e-12) {
      S = Math.log(w1 / w0) / rho;
      interp = function (t) { return [ux0 + t * dx, uy0 + t * dy, w0 * Math.exp(rho * t * S)]; };
    } else {
      var d1 = Math.sqrt(d2), b0 = (w1 * w1 - w0 * w0 + rho4 * d2) / (2 * w0 * rho2 * d1), b1 = (w1 * w1 - w0 * w0 - rho4 * d2) / (2 * w1 * rho2 * d1);
      var r0 = Math.log(Math.sqrt(b0 * b0 + 1) - b0), r1_ = Math.log(Math.sqrt(b1 * b1 + 1) - b1);
      S = (r1_ - r0) / rho;
      interp = function (t) {
        var s = t * S, c0 = Math.cosh(r0), uu = w0 / (rho2 * d1) * (c0 * Math.tanh(rho * s + r0) - Math.sinh(r0));
        return [ux0 + uu * dx, uy0 + uu * dy, w0 * c0 / Math.cosh(rho * s + r0)];
      };
    }
    var duree = Math.max(350, Math.min(dureeMax || 1600, Math.abs(S) * 650));
    if (!isFinite(duree)) duree = 500;
    var t0 = performance.now();
    anim = {};
    (function pas() {
      var t = Math.min(1, (performance.now() - t0) / duree);
      var e = t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      var v = interp(e), k = T.w / v[2];
      cam.k = k; cam.x = T.w / 2 - v[0] * k; cam.y = T.h / 2 - v[1] * k;
      if (t < 1) { rendreApercu(); anim.raf = requestAnimationFrame(pas); } else { anim = null; rendreCamera(); }
    })();
  }
  function recentrer(instant) { var c = camPour(courant.bornes, 0.02); if (instant) { cam = c; rendreCamera(); } else volerVers(c); }
  function bornesNoeud(nd) {
    // boîte englobant le nœud et toutes ses feuilles
    var x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    function ajoute(n) { var p = courant.pos[n.id], m = (n.sp ? 120 : 140) * p.s; x0 = Math.min(x0, p.x - m); y0 = Math.min(y0, p.y - m); x1 = Math.max(x1, p.x + m); y1 = Math.max(y1, p.y + m * (n.sp ? 1.25 : 1)); }
    (function parcours(n) { ajoute(n); n.enfants.forEach(parcours); })(nd);
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  }

  /* ======================= Zoom sémantique ======================= */
  // Niveau de détail d'un nœud selon sa taille à l'écran (px par unité locale)
  var niveauxPrec = {};
  function majLOD(force) {
    var k = cam.k;
    var loin = k < 0.08;
    if (force || loin !== majLOD.loin) { monde.classList.toggle('loin', loin); majLOD.loin = loin; }
    noeuds.forEach(function (nd) {
      var o = elems[nd.id], p = courant.pos[nd.id], px = p.s * k, n;
      if (nd.sp) n = px * 48 < 5 ? 0 : px * 14 < 6 ? 1 : px * 11 < 8 ? 2 : px * 10 < 9.5 ? 3 : 4;
      else n = px * 17 < 6 ? 0 : px * 10 < 8.5 ? 2 : 4;
      if (force || niveauxPrec[nd.id] !== n) { o.g.setAttribute('data-n', n); if (o.gE) o.gE.setAttribute('data-n', n); niveauxPrec[nd.id] = n; }
      if (nd.sp && arcNd && nd.parent === arcNd) { // espèces en arc : étiquettes toujours lisibles (≈ 12 px)
        var sc = Math.min(2, Math.max(1, 12 / (19 * px)));
        if (Math.abs((o.scArc || 0) - sc) > 0.02) { o.etiq.setAttribute('transform', 'scale(' + sc.toFixed(2) + ')'); o.scArc = sc; }
      } else if (o.scArc) { o.etiq.removeAttribute('transform'); o.scArc = 0; }
      if (o.rep) {
        var rp = courant.rep[nd.id], pr = rp.s * k * 13;
        var vis = pr >= 11 ? (pr > 60 ? 0.15 : 1) : 0; // réponses visibles seulement de près (sauf la question en cours)
        if (force || o.repVis !== vis) { o.rep.style.opacity = vis; o.rep.style.display = vis ? '' : 'none'; o.repVis = vis; }
      }
      if (o.reg) {
        var rg = courant.reg[nd.id], tpx = rg.s * k * 60; // police de 60 unités
        var op = tpx < 11 ? 0 : tpx < 16 ? (tpx - 11) / 5 : tpx < 48 ? 1 : tpx < 90 ? 1 - (tpx - 48) / 42 : 0;
        op = Math.round(op * 20) / 20;
        if (force || o.regOp !== op) { o.reg.style.opacity = op * 0.85; o.reg.style.display = op ? '' : 'none'; o.regOp = op; }
      }
    });
  }

  /* ======================= Réponses « glissantes » ======================= */
  // Chaque réponse se place le long de sa branche : au plus près de la question, mais toujours dans la
  // partie visible de l'écran, sans chevaucher la carte de la question, celle de l'étape suivante ni
  // les autres réponses de la même question.
  function bez(e, t) {
    var m = 1 - t, a = m * m * m, b = 3 * m * m * t, c = 3 * m * t * t, d = t * t * t;
    return [a * e[0] + b * e[2] + c * e[4] + d * e[6], a * e[1] + b * e[3] + c * e[5] + d * e[7]];
  }
  function boiteQ(nd) { // boîte monde de la carte d'une question (ou du disque d'une espèce)
    var o = elems[nd.id], p = courant.pos[nd.id], s = p.s;
    if (nd.sp) return { x0: p.x - 60 * s, x1: p.x + 60 * s, y0: p.y - 60 * s, y1: p.y + 60 * s };
    if (niveauxPrec[nd.id] === 0 || !o.boite) return { x0: p.x - 14 * s, x1: p.x + 14 * s, y0: p.y - 14 * s, y1: p.y + 14 * s };
    return { x0: p.x + o.boite.x0 * s, x1: p.x + o.boite.x1 * s, y0: p.y + o.boite.y0 * s, y1: p.y + o.boite.y1 * s };
  }
  function chevauche(a, b) { return a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0; }
  var PAS_T = 48, rafLisse = 0;
  function lisser() { if (!rafLisse) rafLisse = requestAnimationFrame(function () { rafLisse = 0; placerReponses(); placerTitreCercle(); }); }
  function placerReponses() {
    if (!courant) return;
    var T = taille(), k = cam.k, m = 8 / k;
    var vx0 = -cam.x / k, vy0 = -cam.y / k, vx1 = vx0 + T.w / k, vy1 = vy0 + T.h / k;
    // zones de l'écran couvertes par l'interface (mini-carte, en-tête, volet) : pas de réponse dessous
    var caches = [];
    ['#cadre-mini', '#controles', '#volet', '#barre', '#ariane', '#quitter-focus'].forEach(function (sel) {
      var x = document.querySelector(sel); if (!x || x.hidden) return;
      var r = x.getBoundingClientRect(); if (!r.width || !r.height) return;
      caches.push({ x0: (r.left - T.l - cam.x) / k, x1: (r.right - T.l - cam.x) / k, y0: (r.top - T.t - cam.y) / k, y1: (r.bottom - T.t - cam.y) / k });
    });
    // cartes de question visibles : aucune réponse ne doit les couvrir
    noeuds.forEach(function (n) {
      if (n.sp || niveauxPrec[n.id] === 0 || elems[n.id].g.classList.contains('hors-focus')) return;
      var bq = boiteQ(n);
      if (bq.x1 < vx0 || bq.x0 > vx1 || bq.y1 < vy0 || bq.y0 > vy1) return;
      bq.id = n.id; caches.push(bq);
    });
    // espèces visibles (rond + étiquette dessous) : les réponses ne doivent pas non plus les couvrir
    feuilles.forEach(function (f) {
      if ((niveauxPrec[f.id] || 0) < 1 || elems[f.id].g.classList.contains('hors-focus')) return;
      var p = courant.pos[f.id], sc = (elems[f.id].scArc || 1) * p.s;
      var bf = { x0: p.x - 70 * sc, x1: p.x + 70 * sc, y0: p.y - 60 * p.s, y1: p.y + (arcNd && f.parent === arcNd && elems[f.id].modeEtiq === 'arc' ? 150 : 60) * sc };
      if (arcNd && f.parent === arcNd && elems[f.id].modeEtiq !== 'arc') { if (elems[f.id].modeEtiq === 'arc-d') bf.x1 += 190 * sc; else bf.x0 -= 190 * sc; }
      if (bf.x1 < vx0 || bf.x0 > vx1 || bf.y1 < vy0 || bf.y0 > vy1) return;
      caches.push(bf);
    });
    var poses = []; // réponses déjà posées (toutes questions confondues) : jamais deux l'une sur l'autre
    var qC0 = selection && (selection.sp ? selection.parent : selection);
    (qC0 ? [qC0].concat(noeuds.filter(function (n) { return n !== qC0; })) : noeuds).forEach(function (P) { // la question en cours d'abord : ses réponses sont prioritaires
      if (P.sp) return;
      // réponses menant à une espèce : montrées seulement pour la question en cours (sinon portées par l'étiquette de l'espèce)
      var qCour = selection && (selection.sp ? selection.parent : selection);
      var enf = P.enfants.filter(function (c) {
        if (c === qCour && !c.sp) { if (glisseRep && glisseRep.id === c.id) { elems[c.id].rep.style.display = ''; elems[c.id].rep.style.opacity = 1; return true; } return elems[c.id].repVis; } // réponse qui a mené ici : elle suit le trajet puis se range derrière la question
        if (P === qCour && (!c.sp || !aDesFeuilles(P))) { var oc = elems[c.id]; oc.rep.style.display = ''; oc.rep.style.opacity = 1; return true; } // question en cours : ses réponses toujours affichées
        return false; // réponses des autres questions : jamais affichées
      });
      if (!enf.length) return;
      var bp = boiteQ(P);
      enf.forEach(function (c) {
        var o = elems[c.id], e = courant.aret[c.id], s = courant.rep[c.id].s;
        if (P === qCour) s = Math.max(s, courant.pos[P.id].s * 0.9, 0.9 / k); // question en cours : lisible à tout zoom
        var hw = o.repW * s / 2, hh = (o.repHaut + o.repBas) * s / 2, dyb = (o.repBas - o.repHaut) * s / 2; // boîte décalée vers le bas (texte sous le bourgeon)
        var bc = boiteQ(c), choix = null, repli = null, entrant = c === qCour;
        // la réponse se pose sur sa branche, entre les deux cartes ; si la branche est courte, elle rétrécit (75 %, puis 55 %)
        var facteurs = entrant ? [1] : [1, 0.8];
        for (var passe = 0; passe < facteurs.length && !choix; passe++) {
          var f = facteurs[passe];
          hw = o.repW * s * f / 2; hh = (o.repHaut + o.repBas) * s * f / 2; dyb = (o.repBas - o.repHaut) * s * f / 2;
          for (var i = 1; i < PAS_T; i++) {
            var t = i / PAS_T, q = bez(e, t);
            q.t = t;
            var b = { x0: q[0] - hw, x1: q[0] + hw, y0: q[1] + dyb - hh, y1: q[1] + dyb + hh };
            var dedans = b.x0 > vx0 + m && b.x1 < vx1 - m && b.y0 > vy0 + m && b.y1 < vy1 - m;
            if (!dedans) continue;
            if (entrant) {
              var ue = o.rep.classList.contains('rep-arrivee') ? 0.97 : glisseRep && glisseRep.id === c.id ? Math.max(0.04, glisseRep.u) : null;
              if (ue != null) { // sur la caméra pendant le trajet, puis rangée sous la carte d'arrivée
                var qu = bez(e, ue); qu.t = ue;
                if (ue === 0.97 || (qu[0] > vx0 && qu[0] < vx1 && qu[1] > vy0 && qu[1] < vy1)) q = qu;
              }
              choix = { q: q, b: b, f: 1 }; break;
            }
            // la branche passe sous une autre carte de question : on ne va pas plus loin (la réponse resterait « après » elle)
            if (caches.some(function (x) { return x.id && x.id !== P.id && q[0] > x.x0 && q[0] < x.x1 && q[1] > x.y0 && q[1] < x.y1; })) break;
            if (chevauche(b, bc) || chevauche(b, bp)) continue; // jamais sur une carte de question
            if (caches.some(function (x) { return chevauche(b, x); })) continue;
            if (poses.some(function (x) { return chevauche(b, x); })) continue;
            choix = { q: q, b: b, f: f }; break;
          }
        }
        // branche vraiment trop courte : à côté de la carte suivante, mais toujours du côté de la question d'où l'on vient
        if (!choix && !entrant) {
          var cxc = (bc.x0 + bc.x1) / 2, cyc = (bc.y0 + bc.y1) / 2, g = 6 / k, f2 = 0.75, sp2 = s * f2, hw2 = o.repW * sp2 / 2;
          var Pp = courant.pos[P.id], dEnf = Math.hypot(cxc - Pp.x, cyc - Pp.y);
          [[cxc, bc.y1 + o.repHaut * sp2 + g], [cxc, bc.y0 - o.repBas * sp2 - g], [bc.x1 + hw2 + g, cyc], [bc.x0 - hw2 - g, cyc]]
            .filter(function (c2) { return Math.hypot(c2[0] - Pp.x, c2[1] - Pp.y) < dEnf; })
            .sort(function (a2, b3) { return Math.hypot(a2[0] - Pp.x, a2[1] - Pp.y) - Math.hypot(b3[0] - Pp.x, b3[1] - Pp.y); })
            .some(function (c2) {
              var b2 = { x0: c2[0] - hw2, x1: c2[0] + hw2, y0: c2[1] - o.repHaut * sp2, y1: c2[1] + o.repBas * sp2 };
              if (!(b2.x0 > vx0 + m && b2.x1 < vx1 - m && b2.y0 > vy0 + m && b2.y1 < vy1 - m)) return false;
              if (chevauche(b2, bp) || caches.some(function (x) { return chevauche(b2, x); }) || poses.some(function (x) { return chevauche(b2, x); })) return false;
              choix = { q: c2, b: b2, libre: true, f: f2 }; return true;
            });
        }
        if (choix) s = s * choix.f;
        // toujours pas de place : la réponse se cache (elle reste accessible dans le volet)
        if (choix && choix.libre) {
          poses.push(choix.b); o.tCur = null;
          o.rep.setAttribute('transform', 'translate(' + r1(choix.q[0]) + ' ' + r1(choix.q[1]) + ') scale(' + s.toFixed(3) + ')');
          if (o.repCache) { o.rep.classList.remove('rep-cachee'); o.repCache = false; }
        } else if (choix) {
          if (!entrant) poses.push(choix.b);
          // glissement lissé : la position affichée rejoint la position cible en quelques images
          var tc = o.tCur == null || o.repCache || (entrant && glisseRep) ? choix.q.t : o.tCur + (choix.q.t - o.tCur) * 0.3;
          if (Math.abs(choix.q.t - tc) < 0.002) tc = choix.q.t; else lisser();
          o.tCur = tc;
          var qa = bez(e, tc);
          o.rep.setAttribute('transform', 'translate(' + r1(qa[0]) + ' ' + r1(qa[1]) + ') scale(' + s.toFixed(3) + ')');
          if (o.repCache) { o.rep.classList.remove('rep-cachee'); o.repCache = false; }
        } else if (!o.repCache) { o.rep.classList.add('rep-cachee'); o.repCache = true; }
      });
    });
  }

  // Titre « Champignons principaux » : collé à l'intérieur du cercle pointillé, à l'endroit
  // du cercle le plus proche du centre de l'écran, toujours lisible (jamais à l'envers).
  var titreA = null;
  function placerTitreCercle() {
    var Rc = courant && courant.Rc;
    if (!Rc) { titreP.style.display = 'none'; return; }
    var T = taille(), k = cam.k, fs = 15 / k;
    var vx0 = -cam.x / k, vy0 = -cam.y / k, vx1 = vx0 + T.w / k, vy1 = vy0 + T.h / k;
    var cx = (vx0 + vx1) / 2, cy = (vy0 + vy1) / 2, m = 3 * fs;
    var meilleur = null, nVis = 0, N = 180;
    for (var i = 0; i < N; i++) {
      var a = -Math.PI + i * 2 * Math.PI / N, x = Math.cos(a) * Rc, y = Math.sin(a) * Rc;
      if (x < vx0 + m || x > vx1 - m || y < vy0 + m || y > vy1 - m) continue;
      nVis++;
      var d = (x - cx) * (x - cx) + (y - cy) * (y - cy);
      if (!meilleur || d < meilleur.d) meilleur = { a: a, d: d };
    }
    if (!meilleur || Rc * k < 120) { titreP.style.display = 'none'; titreA = null; return; }
    var cible = nVis > N * 0.9 ? -Math.PI / 2 : meilleur.a;
    if (titreA == null) titreA = cible;
    else {
      var dA = Math.atan2(Math.sin(cible - titreA), Math.cos(cible - titreA));
      titreA += dA * 0.25;
      if (Math.abs(dA) > 0.0015) lisser(); else titreA = cible;
    }
    var a0 = titreA, bas = Math.sin(a0) > 0.05;
    // en haut : arc horaire, texte « pendu » vers l'intérieur ; en bas : arc anti-horaire
    var rt = bas ? Rc - fs * 0.45 : Rc - fs * 1.05;
    var dir = bas ? -1 : 1;
    var d0 = a0 - dir * Math.PI, xs = Math.cos(d0) * rt, ys = Math.sin(d0) * rt, xm = Math.cos(a0) * rt, ym = Math.sin(a0) * rt;
    var sw = bas ? 0 : 1;
    arcP.setAttribute('d', 'M' + r1(xs) + ' ' + r1(ys) + 'A' + r1(rt) + ' ' + r1(rt) + ' 0 0 ' + sw + ' ' + r1(xm) + ' ' + r1(ym) + 'A' + r1(rt) + ' ' + r1(rt) + ' 0 0 ' + sw + ' ' + r1(xs) + ' ' + r1(ys));
    titreP.setAttribute('font-size', r1(fs));
    titreP.style.display = '';
  }

  /* ======================= Interactions pointeur ======================= */
  var pointeurs = new Map(), glisse = 0, cibleDown = null, aideDown = null, repDown = null, derniereTape = 0, pinchPrec = null;
  svg.addEventListener('pointerdown', function (e) {
    arreterAnim();
    svg.setPointerCapture(e.pointerId);
    if (!pointeurs.size) debutGeste();
    pointeurs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointeurs.size === 1) { glisse = 0; cibleDown = e.target.closest ? e.target.closest('[data-id]') : null; aideDown = e.target.closest ? e.target.closest('[data-aide]') : null; repDown = e.target.closest ? e.target.closest('[data-rep]') : null; }
    else { cibleDown = null; aideDown = null; pinchPrec = null; }
  });
  svg.addEventListener('pointermove', function (e) {
    if (!pointeurs.has(e.pointerId)) return;
    var prev = pointeurs.get(e.pointerId), cur = { x: e.clientX, y: e.clientY };
    if (pointeurs.size === 1) {
      cam.x += cur.x - prev.x; cam.y += cur.y - prev.y;
      glisse += Math.abs(cur.x - prev.x) + Math.abs(cur.y - prev.y);
      pointeurs.set(e.pointerId, cur); planifier();
    } else if (pointeurs.size === 2) {
      pointeurs.set(e.pointerId, cur);
      var pts = Array.from(pointeurs.values()), T = taille();
      var mx = (pts[0].x + pts[1].x) / 2 - T.l, my = (pts[0].y + pts[1].y) / 2 - T.t;
      var d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      if (pinchPrec) {
        cam.x += mx - pinchPrec.mx; cam.y += my - pinchPrec.my;
        zoomerEn(mx, my, d / pinchPrec.d);
      }
      pinchPrec = { mx: mx, my: my, d: d }; glisse = 99;
    }
  });
  function finPointeur(e) {
    if (!pointeurs.has(e.pointerId)) return;
    pointeurs.delete(e.pointerId);
    if (!pointeurs.size) finGeste();
    if (pointeurs.size < 2) pinchPrec = null;
    if (pointeurs.size === 0 && glisse < 7 && e.type === 'pointerup') {
      var maintenant = performance.now(), T = taille();
      if (aideDown) ouvrirAide(parId[aideDown.getAttribute('data-aide')]);
      else if (repDown && !repDown.classList.contains('rep-cachee')) activerNoeud(repDown.getAttribute('data-rep'));
      else if (cibleDown) activerNoeud(cibleDown.getAttribute('data-id'));
      else if (maintenant - derniereTape < 320) zoomerEnAnime(e.clientX - T.l, e.clientY - T.t, 2.2);
      derniereTape = maintenant;
    }
  }
  svg.addEventListener('pointerup', finPointeur);
  svg.addEventListener('pointercancel', finPointeur);
  svg.addEventListener('wheel', function (e) {
    e.preventDefault(); arreterAnim();
    if (!finMolette) debutGeste();
    clearTimeout(finMolette); finMolette = setTimeout(function () { finMolette = 0; finGeste(); }, 180);
    var T = taille();
    var dy = e.deltaMode === 1 ? e.deltaY * 33 : e.deltaMode === 2 ? e.deltaY * 400 : e.deltaY;
    zoomerEn(e.clientX - T.l, e.clientY - T.t, Math.exp(-dy * (e.ctrlKey ? 0.01 : 0.0022)));
  }, { passive: false });
  function zoomerEnAnime(px, py, f) {
    var k2 = Math.max(K_MIN, Math.min(K_MAX, cam.k * f)), r = k2 / cam.k;
    volerVers({ x: px - (px - cam.x) * r, y: py - (py - cam.y) * r, k: k2 }, 450);
  }
  svg.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && e.target.getAttribute && e.target.getAttribute('data-id')) activerNoeud(e.target.getAttribute('data-id'));
  });
  document.addEventListener('keydown', function (e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
    var T = taille();
    if (e.key === '+' || e.key === '=') zoomerEnAnime(T.w / 2, T.h / 2, 1.6);
    else if (e.key === '-') zoomerEnAnime(T.w / 2, T.h / 2, 1 / 1.6);
    else if (e.key === 'ArrowLeft') { cam.x += 80; planifier(); }
    else if (e.key === 'ArrowRight') { cam.x -= 80; planifier(); }
    else if (e.key === 'ArrowUp') { cam.y += 80; planifier(); }
    else if (e.key === 'ArrowDown') { cam.y -= 80; planifier(); }
    else if (e.key === 'Escape') echap();
    else if (e.key === '0') recentrer();
    else return;
    e.preventDefault();
  });
  // Sosies de l'espèce sélectionnée : lignes pointillées sur la carte
  function surbrillanceSosies(id) {
    paires.forEach(function (p) {
      var on = id && (p.a === id || p.b === id);
      elSosies[p.cle].classList.toggle('actif', !!on);
    });
    gSosies.classList.toggle('focus', !!id);
  }

  /* ======================= État de l'interface ======================= */
  var selection = null, focusNd = null;
  function large() { return window.innerWidth > 820; }
  function classe(c, on) { document.body.classList.toggle(c, !!on); }
  var ROMAINS = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x', 'xi', 'xii'];
  function plageMois(m) {
    if (!m || !m.length) return '';
    if (m.length >= 12) return 'toute l\'année';
    // plage circulaire la plus compacte (ex. novembre → février)
    var s = m.slice().sort(function (a, b) { return a - b; }), deb = s[0], fin = s[s.length - 1];
    for (var i = 1; i < s.length; i++) if (s[i] - s[i - 1] > 1) { deb = s[i]; fin = s[i - 1]; }
    return ROMAINS[deb - 1] + '–' + ROMAINS[fin - 1];
  }
  function numero(sp) { var nd = parId['sp:' + sp.id]; return 'N° ' + ('00' + (nd.iF + 1)).slice(-3); }
  function nbEspeces(nd) { return nd.nF + ' espèce' + (nd.nF > 1 ? 's' : ''); }

  // Zone de la carte réellement visible (sous l'en-tête, au-dessus du volet, à gauche d'un panneau)
  function zoneUtile() {
    var T = taille(), haut = focusNd ? 150 : 100, bas = !selection ? 96 : selection.sp ? 236 : 184;
    var miniTel = !large() ? 84 : 0; // mini-carte en haut à droite (téléphone)
    var droite = !large() ? miniTel : large() && (document.body.classList.contains('fiche-ouverte') || document.body.classList.contains('panneau-ouvert')) ? 440 : 0;
    return { T: T, haut: haut, bas: bas, droite: droite, w: T.w - droite, h: Math.max(120, T.h - haut - bas) };
  }
  function camDans(b, marge) {
    var Z = zoneUtile(); marge = marge == null ? 0.04 : marge;
    var k = Math.min(Z.w / (b.w * (1 + 2 * marge)), Z.h / (b.h * (1 + 2 * marge)));
    k = Math.max(K_MIN, Math.min(K_MAX, k));
    return { x: Z.w / 2 - (b.x + b.w / 2) * k, y: Z.haut + Z.h / 2 - (b.y + b.h / 2) * k, k: k };
  }
  recentrer = function (instant) { var c = camDans(courant.bornes, 0.02); if (instant) { cam = c; rendreCamera(); } else volerVers(c); };

  /* ======================= Sélection, focus, fil d'Ariane ======================= */
  function activerNoeud(id) {
    var nd = parId[id]; if (!nd) return;
    var glisser = !!(selection && nd.parent === selection); // réponse de la question en cours : on glisse le long de la branche
    if (nd.sp) selectionnerEspece(nd.sp.id, true, glisser);
    else selectionnerQuestion(nd, glisser);
  }
  // Cadre d'une question : elle-même et le départ de chacune de ses branches (questions ou espèces suivantes)
  // Cadre d'une question : sa carte et le départ de chacune de ses branches (les étapes suivantes proches
  // sont incluses en entier ; pour les lointaines, on montre le début de la branche avec sa réponse)
  function bornesQuestion(nd) {
    var P = courant.pos[nd.id], bx = elems[nd.id].boite || { x0: -140, x1: 140, y0: -80, y1: 80 }, pts = [];
    pts.push([P.x + bx.x0 * P.s, P.y + bx.y0 * P.s], [P.x + bx.x1 * P.s, P.y + bx.y1 * P.s]);
    var dists = nd.enfants.map(function (c) { var C = courant.pos[c.id]; return Math.hypot(C.x - P.x, C.y - P.y); });
    var D = Math.max(330 * P.s, Math.min.apply(null, dists) * 1.1);
    nd.enfants.forEach(function (c, i) {
      var C = courant.pos[c.id], e = courant.aret[c.id];
      if (dists[i] <= D) { var m = (c.sp ? 95 : 150) * C.s; pts.push([C.x - m, C.y - m], [C.x + m, C.y + (c.sp ? 150 : 150) * C.s]); return; }
      for (var t = 0.04; t <= 1; t += 0.04) { var q = bez(e, t); if (Math.hypot(q[0] - P.x, q[1] - P.y) >= D) { pts.push(q); break; } }
    });
    // cadre centré sur la question
    var dx = 0, dy = 0;
    pts.forEach(function (q) { dx = Math.max(dx, Math.abs(q[0] - P.x)); dy = Math.max(dy, Math.abs(q[1] - P.y)); });
    return { x: P.x - dx, y: P.y - dy, w: 2 * dx, h: 2 * dy };
  }
  // Vol « en glissant » : la caméra suit la courbe de la branche jusqu'à l'étape suivante
  var glisseRep = null;
  function glisserVers(nd, cible) {
    var e = courant.aret[nd.id]; if (!e) return volerVers(cible);
    arreterAnim();
    var Z = zoneUtile(), cx = Z.w / 2, cy = Z.haut + Z.h / 2, k0 = cam.k, k1 = cible.k;
    var s0 = [(cx - cam.x) / k0, (cy - cam.y) / k0], s1 = [(cx - cible.x) / k1, (cy - cible.y) / k1];
    var b0 = bez(e, 0), b1 = bez(e, 1);
    var dist = Math.hypot(b1[0] - b0[0], b1[1] - b0[1]) * Math.sqrt(k0 * k1);
    var recul = Math.min(0.45, dist / 2500); // léger dézoom au milieu si la branche est longue
    var duree = Math.max(700, Math.min(1700, 500 + dist * 0.9)), t0 = performance.now();
    anim = {};
    (function pas() {
      var t = Math.min(1, (performance.now() - t0) / duree), u = t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      var q = bez(e, u);
      var wx = q[0] + (1 - u) * (s0[0] - b0[0]) + u * (s1[0] - b1[0]), wy = q[1] + (1 - u) * (s0[1] - b0[1]) + u * (s1[1] - b1[1]);
      var k = Math.exp(lerp(Math.log(k0), Math.log(k1), u)) * (1 - recul * Math.sin(Math.PI * u));
      cam.k = k; cam.x = cx - wx * k; cam.y = cy - wy * k;
      glisseRep = t < 1 ? { id: nd.id, u: u } : null; // la réponse suivie roule avec la caméra le long de la branche
      rendreCamera();
      if (t < 1) anim.raf = requestAnimationFrame(pas);
      else { anim = null; if (elems[nd.id].rep) elems[nd.id].rep.classList.add('rep-arrivee'); } // arrivée : la réponse s'efface derrière la question
    })();
  }
  function majRepsFeuilles() { // aussi appelée sans sélection : toutes les réponses masquées
    var qCour = selection && (selection.sp ? selection.parent : selection);
    feuilles.forEach(function (f) { var o = elems[f.id]; o.rep.classList.toggle('rep-f', f.parent !== qCour || aDesFeuilles(qCour)); o.tCur = null; });
    // seules les réponses de la question en cours restent au premier plan ; les autres passent derrière, estompées
    noeuds.forEach(function (n) {
      var o = elems[n.id]; if (!o.rep) return;
      var fond = !!qCour && n.parent !== qCour, entrant = !!qCour && n === qCour && !n.sp;
      if (fond !== !!o.repFond) { (fond ? gRepsFond : gReps).appendChild(o.rep); o.repFond = fond; }
      o.rep.classList.toggle('rep-arriere', fond && !entrant);
      o.rep.classList.toggle('rep-entrant', entrant);
      o.rep.classList.toggle('rep-off', n.parent !== qCour && !entrant); // seules les réponses de la question choisie s'affichent
      o.rep.classList.remove('rep-arrivee');
    }); // en arc, la réponse est écrite sous le nom de l'espèce
  }
  function marquerChemin(nd) {
    monde.querySelectorAll('.chemin').forEach(function (x) { x.classList.remove('chemin'); });
    monde.querySelectorAll('.sel').forEach(function (x) { x.classList.remove('sel'); });
    if (!nd) { majRepsFeuilles(); return; }
    elems[nd.id].g.classList.add('sel');
    majRepsFeuilles();
    var n = nd;
    while (n) { elems[n.id].g.classList.add('chemin'); if (elems[n.id].arete) elems[n.id].arete.classList.add('chemin'); if (elems[n.id].rep) elems[n.id].rep.classList.add('chemin'); n = n.parent; }
  }
  // Mode focus : seule la branche de la question choisie reste visible (plus le chemin qui y mène)
  function appliquerFocus(nd) {
    focusNd = nd && nd.prof > 0 ? nd : null;
    var dedans = {};
    if (focusNd) {
      (function m(n) { dedans[n.id] = 1; n.enfants.forEach(m); })(focusNd);
      var a = focusNd.parent; while (a) { dedans[a.id] = 2; a = a.parent; }
    }
    noeuds.forEach(function (n) {
      var o = elems[n.id], hors = !!focusNd && !dedans[n.id];
      o.g.classList.toggle('hors-focus', hors);
      if (o.gE) o.gE.classList.toggle('hors-focus', hors);
      if (o.arete) { o.arete.classList.toggle('hors-focus', hors); o.rep.classList.toggle('hors-focus', hors); }
      if (o.reg) o.reg.classList.toggle('hors-focus', !!focusNd && (!dedans[n.id] || n === focusNd.parent));
      o.g.classList.toggle('ancetre-focus', !!focusNd && !n.sp && dedans[n.id] === 2);
    });
    $('#quitter-focus').hidden = !focusNd;
    dessinerMinicarte();
    classe('en-focus', focusNd);
  }
  function dansFocus(nd) { if (!focusNd) return true; while (nd) { if (nd === focusNd) return true; nd = nd.parent; } return false; }
  function quitterFocus() { appliquerFocus(null); deselectionner(); recentrer(); }
  function deselectionner() {
    majArc(null);
    selection = null; marquerChemin(null); majAriane(null); surbrillanceSosies(null); fermerFiche(); rendreVolet(); dessinerMinicarte();
    classe('esp-sel', false);
  }
  /* ---- Arc des espèces finales : autour d'une question qui mène à plusieurs espèces ---- */
  var arcNd = null, animArc = 0;
  function aDesFeuilles(nd) { return nd && !nd.sp && nd.enfants.filter(function (c) { return c.sp; }).length >= 2; }
  function dispositionArc(nd) {
    var B = dispo(dispoActuelle), P = B.pos[nd.id], par = nd.parent ? B.pos[nd.parent.id] : { x: 0, y: 0 };
    var L = {}; for (var k in B) L[k] = B[k];
    L.pos = Object.assign({}, B.pos); L.aret = Object.assign({}, B.aret); L.rep = Object.assign({}, B.rep); L.sos = Object.assign({}, B.sos);
    var fs = nd.enfants.filter(function (c) { return c.sp; }), n = fs.length;
    var dir = Math.hypot(P.x - par.x, P.y - par.y) > 1 ? Math.atan2(P.y - par.y, P.x - par.x) : -Math.PI / 2;
    // les autres branches (questions) gardent leur direction : l'arc les évite si possible
    var s = TAILLE_F, pas = 205 * s, Z = zoneUtile(), ratio = Math.max(0.7, Math.min(1.6, 0.8 * Z.w / Math.max(200, Z.h - 60)));
    var plein = n >= 4; // beaucoup d'espèces : ellipse complète autour de la question, aux proportions de l'écran
    var span = plein ? Math.PI * 2 * (n - 1) / n : Math.max(0.5, (n - 1) * 0.55);
    var rmin = 150 * P.s + 115 * s;
    var r = Math.max(rmin, n > 1 ? pas * (n - 1) / span : 0), rx = r, ry = r;
    if (plein) { var somme = pas * n / Math.PI; ry = Math.max(rmin * 0.75, somme / (1 + ratio)); rx = Math.max(rmin, ry * ratio); }
    fs.forEach(function (f, i) {
      var a = dir + (n > 1 ? (i - (n - 1) / 2) * span / (n - 1) : 0);
      var x = P.x + Math.cos(a) * rx, y = P.y + Math.sin(a) * ry;
      a = Math.atan2(y - P.y, x - P.x);
      L.pos[f.id] = { x: x, y: y, s: s, r: B.pos[f.id].r, a: B.pos[f.id].a, d: Math.PI / 2 }; // étiquettes sous les ronds
      var c1 = [P.x + Math.cos(dir) * r * 0.35, P.y + Math.sin(dir) * r * 0.35], c2 = [P.x + Math.cos(a) * r * 0.6, P.y + Math.sin(a) * r * 0.6];
      var e = [P.x, P.y, c1[0], c1[1], c2[0], c2[1], x, y];
      L.aret[f.id] = e;
      var m = bez(e, 0.55);
      L.rep[f.id] = { x: m[0], y: m[1], s: Math.max(P.s, s * 0.85) };
    });
    paires.forEach(function (p) {
      var A = L.pos['sp:' + p.a], Bp = L.pos['sp:' + p.b];
      if (A === B.pos['sp:' + p.a] && Bp === B.pos['sp:' + p.b]) return;
      var mm = [(A.x + Bp.x) / 2, (A.y + Bp.y) / 2], h = L.hub([A.x, A.y], [Bp.x, Bp.y]);
      L.sos[p.cle] = [A.x, A.y, lerp(mm[0], h[0], .5), lerp(mm[1], h[1], .5), Bp.x, Bp.y];
    });
    L.arc = nd.id;
    return L;
  }
  function animerGeometrie(L, duree) {
    cancelAnimationFrame(animArc);
    var A = courant, t0 = performance.now();
    (function pas() {
      var t = Math.min(1, (performance.now() - t0) / duree), e = t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      appliquerGeometrie(t < 1 ? interpoler(A, L, e) : L);
      if (t < 1) animArc = requestAnimationFrame(pas);
    })();
  }
  function majArc(nd) { // nd : question dont les espèces finales doivent être en arc (ou null)
    if (!aDesFeuilles(nd)) nd = null;
    if (nd && arcNd && nd !== arcNd) { arcNd = null; appliquerGeometrie(dispo(dispoActuelle)); }
    if (nd === arcNd) return courant;
    arcNd = nd;
    monde.classList.toggle('arc-actif', !!nd);
    feuilles.forEach(function (f) { var on = !!nd && f.parent === nd; elems[f.id].g.classList.toggle('dans-arc', on); elems[f.id].gE.classList.toggle('dans-arc', on); });
    var L = nd ? dispositionArc(nd) : dispo(dispoActuelle);
    animerGeometrie(L, 650);
    return L;
  }
  function bornesArc(nd, L) {
    var P = L.pos[nd.id], bx = elems[nd.id].boite, x0 = P.x + bx.x0 * P.s, x1 = P.x + bx.x1 * P.s, y0 = P.y + bx.y0 * P.s, y1 = P.y + bx.y1 * P.s;
    var rmax = 0;
    nd.enfants.forEach(function (c) { if (c.sp) { var C = L.pos[c.id]; rmax = Math.max(rmax, Math.hypot(C.x - P.x, C.y - P.y)); } });
    nd.enfants.forEach(function (c) {
      var C = L.pos[c.id];
      if (!c.sp) { // question suivante lointaine (« autres espèces ») : seulement le départ de sa branche
        var e = L.aret[c.id];
        for (var t = 0.05; t <= 1; t += 0.05) { var q = bez(e, t); if (Math.hypot(q[0] - P.x, q[1] - P.y) > rmax) break; C = { x: q[0], y: q[1], s: P.s }; }
        x0 = Math.min(x0, C.x - 60 * C.s); x1 = Math.max(x1, C.x + 60 * C.s); y0 = Math.min(y0, C.y - 60 * C.s); y1 = Math.max(y1, C.y + 60 * C.s);
        return;
      }
      var ca = Math.cos(Math.atan2(C.y - P.y, C.x - P.x)), cote = ca > 0.55 ? 1 : ca < -0.55 ? -1 : 0; // même règle que les étiquettes
      if (cote) { // étiquette sur le côté
        x0 = Math.min(x0, C.x - (cote < 0 ? 380 : 75) * C.s); x1 = Math.max(x1, C.x + (cote > 0 ? 380 : 75) * C.s);
        y0 = Math.min(y0, C.y - 80 * C.s); y1 = Math.max(y1, C.y + 80 * C.s);
      } else {
        x0 = Math.min(x0, C.x - 150 * C.s); x1 = Math.max(x1, C.x + 150 * C.s); y0 = Math.min(y0, C.y - 70 * C.s); y1 = Math.max(y1, C.y + 230 * C.s);
      }
    });
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  }

  function selectionnerQuestion(nd, glisser) {
    selection = nd; marquerChemin(nd); majAriane(nd); fermerFiche(); surbrillanceSosies(null);
    classe('esp-sel', false); placerCommencer();
    if (elems[nd.id].rep) elems[nd.id].rep.classList.toggle('rep-arrivee', !glisser); // sans trajet : la réponse d'arrivée s'efface tout de suite
    appliquerFocus(nd.prof > 0 ? nd : null);
    rendreVolet();
    var Lc = majArc(nd);
    if (arcNd === nd) { // question qui mène à des espèces : on cadre la question et toutes ses espèces
      var ca = camDans(bornesArc(nd, Lc), 0.04);
      if (glisser) glisserVers(nd, ca); else volerVers(ca);
      dessinerMinicarte();
      return;
    }
    var c = camDans(bornesQuestion(nd), 0.06), P = courant.pos[nd.id], Z = zoneUtile();
    // la carte de la question doit rester lisible : on zoome au moins jusque-là, quitte à ne montrer que le départ des branches
    var kLisible = (large() ? 1.0 : 0.85) / P.s, kMax = 1.4 / P.s;
    if (c.k < kLisible || c.k > kMax) {
      var k = Math.max(K_MIN, Math.min(K_MAX, c.k < kLisible ? kLisible : kMax));
      c = { k: k, x: Z.w / 2 - P.x * k, y: Z.haut + Z.h / 2 - P.y * k };
    }
    if (glisser) glisserVers(nd, c); else volerVers(c);
    dessinerMinicarte();
  }
  function selectionnerEspece(id, voler, glisser) {
    var nd = parId['sp:' + id]; if (!nd) return;
    if (!dansFocus(nd)) appliquerFocus(null);
    var Lc = arcNd === nd.parent ? courant : majArc(null); // garder l'arc si on choisit une de ses espèces
    selection = nd; marquerChemin(nd); majAriane(nd); surbrillanceSosies(id); placerCommencer();
    classe('esp-sel', true);
    rendreVolet(); afficherComparaison(nd.sp);
    if (document.body.classList.contains('fiche-ouverte')) ouvrirFiche(nd.sp);
    if (voler) {
      var p = Lc.pos[nd.id], Z = zoneUtile();
      var k = Math.min(K_MAX, Math.max(Math.min(cam.k, 2.2 / p.s), 1.5 / p.s * Math.min(1, Z.h / 700)));
      var cible = { x: Z.w / 2 - p.x * k, y: Z.haut + Z.h / 2 - (p.y + 30 * p.s) * k, k: k };
      if (glisser) glisserVers(nd, cible); else volerVers(cible);
    }
    dessinerMinicarte();
  }
  function majAriane(nd) {
    var a = $('#ariane');
    if (!nd) { a.hidden = true; a.innerHTML = ''; return; }
    var chemin = ancetres(nd), h = '';
    chemin.forEach(function (n, i) {
      if (i > 0) h += '<span class="sep" aria-hidden="true">›</span>';
      if (n.sp) h += '<button class="miette espece" data-id="' + n.id + '">' + escHTML(n.sp.nom) + '</button>';
      else {
        var suiv = chemin[i + 1];
        var lib = i === 0 ? 'Départ' : (n.q.groupe || couper(n.q.question, 26)[0]);
        h += '<button class="miette" data-id="' + n.id + '" title="' + escHTML(n.q.question + (suiv ? ' → ' + suiv.reponse : '')) + '">' + escHTML(lib) + '</button>';
      }
    });
    a.innerHTML = h; a.hidden = false;
    a.scrollLeft = a.scrollWidth;
  }
  $('#ariane').addEventListener('click', function (e) {
    var b = e.target.closest('[data-id]'); if (!b) return;
    var nd = parId[b.getAttribute('data-id')];
    if (nd && nd.prof === 0) { quitterFocus(); return; }
    activerNoeud(b.getAttribute('data-id'));
  });
  $('#quitter-focus').addEventListener('click', quitterFocus);
  $('#commencer').addEventListener('click', function () { selectionnerQuestion(racine); });

  /* ======================= Volet B (arc en bas de la carte) ======================= */
  function photoOuSchema(sp, pre) {
    var ph = PHOTOS && PHOTOS[sp.id];
    if (ph) return '<img src="' + ph.src + '" alt="">';
    return '<svg viewBox="0 0 100 100" aria-hidden="true"><rect width="100" height="100" fill="#141c17"/>' + Schema.dessiner(sp.schema, sp.id).replace(/sc[0-9a-z]+_/g, function (m) { return pre + m; }) + '</svg>';
  }
  function rendreVolet() {
    var v = $('#volet'), h;
    if (!selection) {
      h = '<div class="volet-vide"><div class="v-fond"></div><div class="v-poignee"></div><div class="v-invite">Touchez une question ou une espèce</div><div class="v-leg">' +
        ['comestible', 'sans-interet', 'toxique', 'mortel'].map(function (s) { return '<span><i style="background:' + STATUTS[s].couleur + '"></i>' + STATUTS[s].court + '</span>'; }).join('') + '</div></div>';
    } else if (!selection.sp) {
      var q = selection.q, n = selection.enfants.length;
      h = '<div class="volet-q"><div class="v-fond"></div>' +
        '<button class="v-rond aide" style="left:7%;top:26px" data-act="aide" aria-label="Comment regarder ?" title="Comment regarder ?">?</button>' +
        (selection.parent ? '<button class="v-rond" style="right:7%;top:26px" data-act="haut" aria-label="Question précédente">↑<br>HAUT</button>' : '') +
        '<div class="vq-corps"><div class="vq-groupe">' + escHTML((q.groupe || (selection.prof === 0 ? 'Départ' : 'Question')).toUpperCase()) + '</div><div class="vq-q">' + escHTML(q.question) + '</div>' +
        '</div><div class="vq-reps" role="group" aria-label="Réponses">' + selection.enfants.map(function (c) {
          return '<button class="vq-rep" data-act="rep" data-rep="' + c.id + '"><b class="vq-num">' + (selection.enfants.indexOf(c) + 1) + '</b><span>' + escHTML(c.court) + '</span><small>' + (c.sp ? '' : c.nF) + '</small></button>';
        }).join('') + '</div></div>';
    } else {
      var sp = selection.sp, st = STATUTS[sp.statut], c = carnet[sp.id] || null;
      var conf = (sp.confusions || []).filter(function (x) { return ESP[x]; });
      var nbM = conf.filter(function (x) { return ESP[x].statut === 'mortel'; }).length;
      var sos = conf.length ? '<button class="vs-sosies" data-act="sosies">' + conf.length + ' sosie' + (conf.length > 1 ? 's' : '') + (nbM ? ' dont ' + nbM + ' mortel' + (nbM > 1 ? 's' : '') : '') + ' →</button>' : '';
      var info = [selection.court, plageMois(sp.mois)].filter(Boolean).map(escHTML).join(' · ');
      h = '<div class="volet-sp" style="--c:' + st.couleur + '"><div class="v-fond"></div>' +
        '<button class="v-rond" style="left:6%;top:72px" data-act="fiche" aria-label="Ouvrir la fiche">FICHE</button>' +
        '<button class="v-photo" data-act="agrandir" aria-label="Voir en grand">' + photoOuSchema(sp, 'vl') + '</button>' +
        '<button class="v-rond trouve" style="right:' + (sp.statut === 'comestible' ? '22%' : '6%') + ';top:' + (sp.statut === 'comestible' ? 52 : 72) + 'px" data-act="trouve" aria-pressed="' + !!c + '" aria-label="Trouvé !" title="Trouvé !">★</button>' +
        (sp.statut === 'comestible' ? '<button class="v-rond mange" style="right:5%;top:70px" data-act="mange" aria-pressed="' + !!(c && c.m) + '" aria-label="Mangé !" title="Mangé !">MAN-<br>GÉ !</button>' : '') +
        '<div class="vs-corps"><div class="vs-meta">' + numero(sp) + ' · <span style="color:' + st.couleur + '">' + st.label.toUpperCase() + (sp.precaution ? ' ⚠' : '') + '</span>' + (sp.rang === 'secondaire' ? ' · HORS CERCLE' : '') + '</div>' +
        '<h2 class="vs-nom" data-act="fiche">' + escHTML(sp.nom) + '</h2><div class="vs-lat">' + escHTML(sp.latin) + '</div>' +
        '<div class="vs-info">' + info + '</div>' + (sos ? '<div class="vs-sos">' + sos + '</div>' : '') + '</div></div>';
    }
    v.innerHTML = h;
  }
  $('#volet').addEventListener('click', function (e) {
    var b = e.target.closest('[data-act]'); if (!b || !selection) return;
    var act = b.getAttribute('data-act'), sp = selection.sp;
    if (act === 'aide') ouvrirAide(selection);
    else if (act === 'haut') activerNoeud(selection.parent.id);
    else if (act === 'rep') activerNoeud(b.getAttribute('data-rep'));
    else if (act === 'fiche') ouvrirFiche(sp);
    else if (act === 'agrandir') ouvrirVisionneuse(sp, PHOTOS && PHOTOS[sp.id] ? 'photo' : 'schema');
    else if (act === 'trouve') basculerTrouve(sp.id);
    else if (act === 'mange') demanderMange(sp.id);
    else if (act === 'sosies') ouvrirComparaison(sp, null);
  });

  /* ======================= Fiche ======================= */
  var ficheMode = 'photo';
  function ouvrirFiche(sp) {
    montrerVue('carte', true);
    var st = STATUTS[sp.statut], f = $('#fiche'), ph = PHOTOS && PHOTOS[sp.id], c = carnet[sp.id] || null;
    var nd = parId['sp:' + sp.id], chemin = ancetres(nd);
    var mode = ph && ficheMode === 'photo' ? 'photo' : 'schema';
    var h = '<div class="f-hero">' + (mode === 'photo' ? '<img src="' + (srcHD(sp.id) || ph.src) + '" alt="Photo : ' + escHTML(sp.nom) + '">' :
      '<svg viewBox="-15 -8 130 116" role="img" aria-label="Schéma : ' + escHTML(sp.nom) + '">' + Schema.dessiner(sp.schema, sp.id).replace(/sc[0-9a-z]+_/g, function (m) { return 'f' + m; }) + '</svg>');
    h += '<div class="f-haut"><button data-act="fermer" aria-label="Fermer la fiche">↓</button><div class="grp">' +
      (ph ? '<button data-act="mode" data-mode="photo" aria-pressed="' + (mode === 'photo') + '">PHOTO</button><button data-act="mode" data-mode="schema" aria-pressed="' + (mode === 'schema') + '">SCHÉMA</button>' : '') +
      '<button data-act="agrandir" aria-label="Afficher en grand">⤢</button></div></div>';
    if (mode === 'photo') h += '<div class="f-cred">© ' + escHTML(ph.auteur) + ' · ' + escHTML(ph.licence) + '</div>';
    h += '</div><div class="f-corps" style="--c:' + st.couleur + '">';
    h += '<span class="f-tag">' + iconeSVG(sp.statut, 15) + ' ' + st.label.toUpperCase() + '</span>';
    h += '<h2>' + escHTML(sp.nom) + '</h2><div class="f-latin">' + escHTML(sp.latin) + ' · ' + numero(sp) + '</div>';
    if (sp.autres_noms && sp.autres_noms.length) h += '<div class="f-autres">Aussi : ' + escHTML(sp.autres_noms.join(', ')) + '</div>';
    if (sp.rang === 'secondaire') h += '<span class="f-rang">Espèce secondaire (hors du cercle principal)</span>';
    if (sp.toxicite) h += '<div class="f-alerte ' + (sp.statut === 'mortel' || sp.statut === 'toxique' ? sp.statut : 'neutre') + '"><b>Toxicité.</b> ' + escHTML(sp.toxicite) + '</div>';
    if (sp.precaution) h += '<div class="f-alerte prec"><b>⚠ Précaution.</b> ' + escHTML(sp.precaution) + '</div>';
    h += '<h3 class="rubrique">CRITÈRES CLÉS</h3><ul class="f-crit">' + (sp.criteres || []).map(function (x) { return '<li>' + escHTML(x) + '</li>'; }).join('') + '</ul>';
    if (sp.mois) {
      h += '<h3 class="rubrique">SAISON · ' + escHTML(plageMois(sp.mois).toUpperCase()) + '</h3><div class="f-cal" aria-label="Mois de pousse (approximatif)">' + MOIS.map(function (m, i) { var on = sp.mois.indexOf(i + 1) >= 0; return '<span class="' + (on ? 'on' : '') + (i + 1 === moisChoisi ? ' cur' : '') + '" title="' + MOIS_LONG[i] + (on ? ' : possible' : ' : peu probable') + '"></span>'; }).join('') + '</div>' +
        '<div class="f-cal-l">' + MOIS.map(function (m, i) { return '<span>' + 'JFMAMJJASOND'.charAt(i) + '</span>'; }).join('') + '</div>';
    }
    h += '<dl class="f-dl"><dt>habitat</dt><dd>' + escHTML(sp.habitat) + '</dd><dt>saison</dt><dd>' + escHTML(sp.saison) + '</dd>' + (sp.sporee ? '<dt>sporée</dt><dd>' + escHTML(sp.sporee) + '</dd>' : '') + '</dl>';
    var conf = (sp.confusions || []).map(function (x) { return ESP[x]; }).filter(Boolean);
    conf.sort(function (a, b) { return ORDRE_STATUTS.indexOf(a.statut) - ORDRE_STATUTS.indexOf(b.statut); });
    if (conf.length) {
      h += '<h3 class="rubrique" style="color:#FF8A73">CONFUSIONS · TOUCHER POUR COMPARER</h3><div class="f-conf">' + conf.map(function (o) {
        return '<button data-cmp="' + o.id + '" style="--c:' + STATUTS[o.statut].couleur + '"><div class="im">' + photoOuSchema(o, 'fc') + '</div><div class="n">' + escHTML(o.nom) + '</div><div class="s">' + STATUTS[o.statut].label.toUpperCase() + '</div></button>';
      }).join('') + '</div>';
      var dist = conf.filter(function (o) { return sp.distinguer && sp.distinguer[o.id]; });
      if (dist.length) h += '<ul class="f-dist">' + dist.map(function (o) { return '<li><b>' + escHTML(o.nom) + '</b> — ' + escHTML(sp.distinguer[o.id]) + '</li>'; }).join('') + '</ul>';
    }
    h += '<h3 class="rubrique">CHEMIN DANS LA CLÉ</h3><ol class="f-chemin">';
    chemin.forEach(function (n, i) { if (n.q) h += '<li><button data-noeud="' + n.id + '">' + escHTML(n.q.question) + '</button> → ' + escHTML(chemin[i + 1].reponse) + '</li>'; });
    h += '</ol>';
    h += '<h3 class="rubrique">SOURCES</h3><ul class="f-sources">' + (sp.sources || []).map(function (s) { return '<li>' + (s.url ? '<a href="' + escHTML(s.url) + '" target="_blank" rel="noopener">' + escHTML(s.titre) + '</a>' : escHTML(s.titre)) + '</li>'; }).join('') + '</ul>';
    if (ph) h += '<p class="f-credit">Photo : ' + escHTML(ph.auteur) + ' — ' + escHTML(ph.licence) + ', via <a href="' + escHTML(ph.url) + '" target="_blank" rel="noopener">Wikimedia Commons</a> (' + escHTML(ph.fichier) + ')</p>';
    h += '<p class="f-avert">Outil pédagogique : ne consommez jamais un champignon sur la base de cette fiche.</p></div>';
    h += '<div class="f-pied"><button class="trouve" data-act="trouve" aria-pressed="' + !!c + '">★ TROUVÉ !</button>' +
      (sp.statut === 'comestible' ? '<button class="mange" data-act="mange" aria-pressed="' + !!(c && c.m) + '">' + (c && c.m ? '✓ MANGÉ' : 'MANGÉ !') + '</button>' : '') +
      '<button class="fermer" data-act="fermer" aria-label="Fermer la fiche">✕</button></div>';
    var deja = !f.hidden && f.getAttribute('data-esp') === sp.id, haut = f.scrollTop;
    f.innerHTML = h; f.hidden = false; f.setAttribute('data-esp', sp.id);
    f.scrollTop = deja ? haut : 0;
    classe('fiche-ouverte', true);
  }
  function fermerFiche() {
    var f = $('#fiche'); if (f.hidden) return;
    f.hidden = true; classe('fiche-ouverte', false);
  }
  $('#fiche').addEventListener('click', function (e) {
    var sp = selection && selection.sp; if (!sp) return;
    var b = e.target.closest('[data-act]');
    if (b) {
      var act = b.getAttribute('data-act');
      if (act === 'fermer') fermerFiche();
      else if (act === 'mode') { ficheMode = b.getAttribute('data-mode'); ouvrirFiche(sp); }
      else if (act === 'agrandir') ouvrirVisionneuse(sp, PHOTOS && PHOTOS[sp.id] && ficheMode === 'photo' ? 'photo' : 'schema');
      else if (act === 'trouve') basculerTrouve(sp.id);
      else if (act === 'mange') demanderMange(sp.id);
      return;
    }
    var c = e.target.closest('[data-cmp]'); if (c) { ouvrirComparaison(sp, ESP[c.getAttribute('data-cmp')]); return; }
    var q = e.target.closest('[data-noeud]'); if (q) { fermerFiche(); activerNoeud(q.getAttribute('data-noeud')); }
  });

  // Photo haute définition : lue à la demande dans son bloc de texte (rien n'est décodé au démarrage)
  var cacheHD = {};
  function srcHD(id) {
    if (cacheHD[id]) return cacheHD[id];
    if (PHOTOS && PHOTOS[id] && PHOTOS[id].hdUrl) return PHOTOS[id].hdUrl; // version web : fichier à côté
    var b = document.getElementById('hd-' + id);
    if (!b) return null;
    return (cacheHD[id] = 'data:' + b.getAttribute('data-mime') + ';base64,' + b.textContent.trim());
  }

  /* ======================= Bandeau de sosies (grands écrans) ======================= */
  function sosiesTries(sp) {
    var conf = (sp.confusions || []).map(function (c) { return ESP[c]; }).filter(Boolean);
    return conf.sort(function (a, b) { return ORDRE_STATUTS.indexOf(a.statut) - ORDRE_STATUTS.indexOf(b.statut); });
  }
  var cmpCourant = null;
  function afficherComparaison(sp) {
    var z = $('#comparaison'), conf = sosiesTries(sp);
    cmpCourant = sp;
    if (!conf.length) { z.hidden = true; return; }
    $('#cmp-liste').innerHTML = conf.map(function (o) {
      return '<button class="cmp-carte" data-cmp="' + o.id + '" style="--c:' + STATUTS[o.statut].couleur + '" title="Comparer en grand avec ' + escHTML(o.nom) + '">' + photoOuSchema(o, 'bd') +
        '<span class="cmp-nom">' + escHTML(o.nom) + '</span><span class="cmp-st">' + STATUTS[o.statut].label.toUpperCase() + '</span></button>';
    }).join('');
    $('#cmp-titre').textContent = 'NE PAS CONFONDRE AVEC (' + conf.length + ')';
    z.hidden = false;
    $('#cmp-liste').scrollLeft = 0;
  }
  $('#comparaison').addEventListener('click', function (e) {
    if (e.target.closest('#cmp-fermer')) { $('#comparaison').hidden = true; return; }
    var b = e.target.closest('[data-cmp]'); if (b && cmpCourant) ouvrirComparaison(cmpCourant, ESP[b.getAttribute('data-cmp')]);
  });

  /* ======================= Visionneuse : espèce, comparaison, aide ======================= */
  var vis = $('#visionneuse'), visSp = null, visComp = null, visAide = null, visMode = 'schema', visZoom = 1, visDx = 0, visDy = 0;
  function ouvrirVisionneuse(sp, mode, comp) {
    visSp = sp; visComp = comp || null; visAide = null;
    visMode = (mode === 'photo' && PHOTOS && (PHOTOS[sp.id] || (comp && PHOTOS[comp.id]))) ? 'photo' : 'schema';
    vis.hidden = false; classe('visionneuse-ouverte', true);
    rendreVisionneuse(); $('#vis-fermer').focus();
  }
  function ouvrirComparaison(sp, comp) {
    var conf = sosiesTries(sp); if (!conf.length) return;
    ouvrirVisionneuse(sp, 'photo', comp || conf[0]);
  }
  function fermerVisionneuse() { vis.hidden = true; classe('visionneuse-ouverte', false); }
  function imageGrande(sp, mode, pre) {
    var ph = PHOTOS && PHOTOS[sp.id];
    if (mode === 'photo' && ph) return '<img class="vis-im" alt="Photo : ' + escHTML(sp.nom) + '" src="' + (srcHD(sp.id) || ph.src) + '">';
    return '<svg class="vis-im" viewBox="-5 -5 110 110" role="img" aria-label="Schéma : ' + escHTML(sp.nom) + '"><rect x="-5" y="-5" width="110" height="110" fill="#141c17"/>' + Schema.dessiner(sp.schema, sp.id).replace(/sc[0-9a-z]+_/g, function (m) { return pre + m; }) + '</svg>';
  }
  function boutonsMode(dispoPhoto) {
    $('#vis-photo').hidden = !dispoPhoto; $('#vis-schema').hidden = !dispoPhoto;
    $('#vis-photo').setAttribute('aria-pressed', visMode === 'photo'); $('#vis-schema').setAttribute('aria-pressed', visMode === 'schema');
  }
  function rendreComparaison() {
    var a = visSp, b = visComp, conf = sosiesTries(a);
    vis.classList.add('vis-comparaison');
    var fig = function (sp, pre) {
      var st = STATUTS[sp.statut], ph = PHOTOS && PHOTOS[sp.id];
      return '<figure class="vis-fig" style="--c:' + st.couleur + '">' + imageGrande(sp, visMode, pre) + '<figcaption><span class="s">' + st.label.toUpperCase() + '</span><strong>' + escHTML(sp.nom) + '</strong>' +
        (visMode === 'photo' && ph ? '<small>© ' + escHTML(ph.auteur) + ' · ' + escHTML(ph.licence) + '</small>' : visMode === 'photo' ? '<small>(pas de photo : schéma)</small>' : '') + '</figcaption></figure>';
    };
    $('#vis-contenu').innerHTML = fig(a, 'va') + '<div class="vis-vs">vs</div>' + fig(b, 'vb');
    var dist = (a.distinguer && a.distinguer[b.id]) || (b.distinguer && b.distinguer[a.id]);
    var i = conf.indexOf(b);
    $('#vis-titre').innerHTML = '<span class="sur-titre" style="color:#FF8A73">SOSIE ' + (i + 1) + ' / ' + conf.length + '</span><strong>Ne pas confondre</strong>';
    $('#vis-credit').innerHTML = dist ? '<span class="vis-dist"><b>Ce qui les sépare :</b> ' + escHTML(dist) + '</span>' : '';
    $('#vis-nav').innerHTML = conf.length > 1 ? '<button class="fl" data-cmpnav="' + conf[(i - 1 + conf.length) % conf.length].id + '">← PRÉC.</button>' +
      conf.map(function (o) { return '<button data-cmpnav="' + o.id + '" aria-current="' + (o === b) + '" title="' + escHTML(o.nom) + '" style="border-color:' + (o === b ? '' : STATUTS[o.statut].couleur) + '">' + photoOuSchema(o, 'nv') + '</button>'; }).join('') +
      '<button class="fl" data-cmpnav="' + conf[(i + 1) % conf.length].id + '">SUIV. →</button>' : '';
    boutonsMode(!!PHOTOS);
  }
  function rendreVisionneuse() {
    if (visAide) return rendreVisAide();
    if (visComp) return rendreComparaison();
    vis.classList.remove('vis-comparaison');
    $('#vis-nav').innerHTML = '';
    var sp = visSp, ph = PHOTOS && PHOTOS[sp.id], st = STATUTS[sp.statut];
    visZoom = 1; visDx = visDy = 0;
    var c = $('#vis-contenu');
    if (visMode === 'photo') c.innerHTML = '<img id="vis-img" alt="Photo : ' + escHTML(sp.nom) + '" src="' + (srcHD(sp.id) || ph.src) + '" decoding="async">';
    else c.innerHTML = '<svg id="vis-img" viewBox="-5 -5 110 110" role="img" aria-label="Schéma : ' + escHTML(sp.nom) + '"><rect x="-5" y="-5" width="110" height="110" fill="#141c17"/>' + Schema.dessiner(sp.schema, sp.id).replace(/sc[0-9a-z]+_/g, function (m) { return 'v' + m; }) + '</svg>';
    appliquerZoomVis();
    $('#vis-titre').innerHTML = '<strong>' + escHTML(sp.nom) + '</strong> <em>' + escHTML(sp.latin) + '</em> <span class="vis-st" style="background:' + st.couleur + '">' + st.label.toUpperCase() + '</span>';
    $('#vis-credit').innerHTML = visMode === 'photo' ? 'Photo : ' + escHTML(ph.auteur) + ' — ' + escHTML(ph.licence) + ', Wikimedia Commons' + (ph.hd ? '' : ' (basse résolution)') : 'Schéma dessiné à partir des critères (non à l\'échelle).';
    boutonsMode(!!ph);
  }
  function appliquerZoomVis() { var i = $('#vis-img'); if (i) i.style.transform = 'translate(' + visDx + 'px,' + visDy + 'px) scale(' + visZoom + ')'; }
  $('#vis-fermer').addEventListener('click', fermerVisionneuse);
  $('#vis-photo').addEventListener('click', function () { visMode = 'photo'; rendreVisionneuse(); });
  $('#vis-schema').addEventListener('click', function () { visMode = 'schema'; rendreVisionneuse(); });
  $('#vis-nav').addEventListener('click', function (e) {
    var b = e.target.closest('[data-cmpnav]'); if (b) { visComp = ESP[b.getAttribute('data-cmpnav')]; rendreVisionneuse(); return; }
    var a = e.target.closest('[data-ainav]'); if (a && visAide) { visAide.i = +a.getAttribute('data-ainav'); rendreVisionneuse(); }
  });
  vis.addEventListener('click', function (e) { if (e.target === vis || e.target.id === 'vis-contenu') fermerVisionneuse(); });
  // zoom dans l'image : molette, pincement, double-clic ; déplacement au doigt / à la souris
  var vc = $('#vis-contenu'), visPts = new Map(), visPinch = null;
  vc.addEventListener('wheel', function (e) { e.preventDefault(); if (visComp) return; visZoom = Math.max(1, Math.min(6, visZoom * Math.exp(-e.deltaY * 0.002))); if (visZoom === 1) visDx = visDy = 0; appliquerZoomVis(); }, { passive: false });
  vc.addEventListener('dblclick', function () { visZoom = visZoom > 1 ? 1 : 2.5; visDx = visDy = 0; appliquerZoomVis(); });
  vc.addEventListener('pointerdown', function (e) { if (!e.target.closest('#vis-img')) return; vc.setPointerCapture(e.pointerId); visPts.set(e.pointerId, { x: e.clientX, y: e.clientY }); visPinch = null; });
  vc.addEventListener('pointermove', function (e) {
    if (!visPts.has(e.pointerId)) return;
    var prev = visPts.get(e.pointerId), cur = { x: e.clientX, y: e.clientY }; visPts.set(e.pointerId, cur);
    if (visPts.size === 1 && visZoom > 1) { visDx += cur.x - prev.x; visDy += cur.y - prev.y; appliquerZoomVis(); }
    else if (visPts.size === 2) {
      var p = Array.from(visPts.values()), d = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
      if (visPinch) { visZoom = Math.max(1, Math.min(6, visZoom * d / visPinch)); appliquerZoomVis(); }
      visPinch = d;
    }
  });
  function finVis(e) { visPts.delete(e.pointerId); if (visPts.size < 2) visPinch = null; }
  vc.addEventListener('pointerup', finVis); vc.addEventListener('pointercancel', finVis);

  /* ======================= « Comment regarder ? » ======================= */
  // Schémas « ce qu'il faut repérer » (boîte 150 x 84) pour les questions délicates
  var SCH = {
    lames: '<path d="M10 34 Q75 -6 140 34 Z" fill="none" stroke="#E6EEE8" stroke-width="1.6"/><path d="M20 34 L72 50 M40 34 L73 50 M60 34 L74 50 M90 34 L76 50 M110 34 L77 50 M130 34 L78 50" stroke="#8DF5C0" stroke-width="1.3"/><rect x="69" y="50" width="12" height="30" fill="none" stroke="#E6EEE8" stroke-width="1.6"/>',
    tubes: '<path d="M10 40 Q75 -6 140 40 Z" fill="none" stroke="#E6EEE8" stroke-width="1.6"/><g fill="none" stroke="#8DF5C0" stroke-width="1.1"><circle cx="30" cy="34" r="3"/><circle cx="42" cy="34" r="3"/><circle cx="54" cy="34" r="3"/><circle cx="96" cy="34" r="3"/><circle cx="108" cy="34" r="3"/><circle cx="120" cy="34" r="3"/></g><rect x="62" y="40" width="26" height="40" rx="4" fill="none" stroke="#E6EEE8" stroke-width="1.6"/>',
    aiguillons: '<path d="M10 34 Q75 -6 140 34 Z" fill="none" stroke="#E6EEE8" stroke-width="1.6"/><path d="M24 34 l2 8 l2 -8 M40 34 l2 9 l2 -9 M56 34 l2 8 l2 -8 M92 34 l2 8 l2 -8 M108 34 l2 9 l2 -9 M124 34 l2 8 l2 -8" fill="none" stroke="#8DF5C0" stroke-width="1.3"/><rect x="69" y="34" width="12" height="46" fill="none" stroke="#E6EEE8" stroke-width="1.6"/>',
    plis: '<path d="M30 20 Q75 0 120 20 L82 80 L68 80 Z" fill="none" stroke="#E6EEE8" stroke-width="1.6"/><path d="M44 24 Q60 50 70 76 M60 20 Q70 50 73 76 M90 20 Q80 50 77 76 M106 24 Q90 50 80 76" fill="none" stroke="#8DF5C0" stroke-width="1.3"/>',
    volve: '<path d="M40 26 Q75 0 110 26 Z" fill="none" stroke="#E6EEE8" stroke-width="1.6"/><path d="M69 26 V66 M81 26 V66 M66 40 Q75 46 84 40" fill="none" stroke="#E6EEE8" stroke-width="1.6"/><path d="M60 82 Q58 62 69 62 L81 62 Q92 62 90 82 Z" fill="none" stroke="#8DF5C0" stroke-width="1.8"/><path d="M20 82 H130" stroke="#5f7269" stroke-dasharray="2 3"/>',
    'sans-volve': '<path d="M40 26 Q75 0 110 26 Z" fill="none" stroke="#E6EEE8" stroke-width="1.6"/><path d="M69 26 V80 M81 26 V80 M69 80 H81" fill="none" stroke="#E6EEE8" stroke-width="1.6"/><path d="M20 82 H130" stroke="#5f7269" stroke-dasharray="2 3"/><circle cx="75" cy="80" r="12" fill="none" stroke="#8DF5C0" stroke-dasharray="3 3"/>'
  };
  // Exemples photo choisis à la main (recadrage sur le détail à observer) ; à valider
  var AIDE_SPECIALE = {
    dessous: [{ s: 'lames', p: 'marasmius-oreades', pos: '80% 45%', t: '300%' }, { s: 'tubes', p: 'suillus-granulatus', pos: '97% 62%', t: '420%' }, { s: 'aiguillons', p: 'hydnum-repandum', pos: '42% 62%', t: '260%' }, { s: 'plis', p: 'cantharellus-cibarius', pos: '88% 50%', t: '260%' }],
    volve: [{ s: 'volve', p: 'amanita-phalloides' }, { s: 'sans-volve', p: 'agaricus-campestris' }]
  };
  // Espèce représentative d'une réponse : une espèce principale avec photo de la branche, sinon la première
  function representant(nd) {
    var fs = []; (function m(n) { if (n.sp) fs.push(n.sp); else n.enfants.forEach(m); })(nd);
    var avec = function (s) { return PHOTOS && PHOTOS[s.id]; };
    return fs.filter(function (s) { return s.rang !== 'secondaire' && avec(s); })[0] || fs.filter(avec)[0] || fs[0];
  }
  function exemplesAide(nd) {
    var spec = AIDE_SPECIALE[nd.id];
    return nd.enfants.map(function (c, i) {
      var x = spec && spec[i], sp = x && ESP[x.p] ? ESP[x.p] : representant(c);
      return { enfant: c, sp: sp, sch: x && SCH[x.s], pos: x && x.pos, t: x && x.t };
    });
  }
  function schemaAide(ex, pre) {
    if (ex.sch) return '<svg viewBox="0 0 150 84" aria-hidden="true">' + ex.sch + '</svg>';
    return '<svg viewBox="0 0 100 100" aria-hidden="true" preserveAspectRatio="xMinYMid meet">' + Schema.dessiner(ex.sp.schema, ex.sp.id).replace(/sc[0-9a-z]+_/g, function (m) { return pre + m; }) + '</svg>';
  }
  var aideNd = null;
  function ouvrirAide(nd) {
    if (!nd || nd.sp) return;
    aideNd = nd;
    var q = nd.q, ex = exemplesAide(nd), court = ex.every(function (e) { return e.enfant.reponse.length < 60; }) && ex.length > 1;
    var h = '<div class="a-tete"><span class="a-ico">?</span><div><div class="sur-titre">COMMENT REGARDER' + (q.groupe ? ' · ' + escHTML(q.groupe.toUpperCase()) : '') + '</div><h2>' + escHTML(q.question) + '</h2></div><button class="carre" data-act="fermer" aria-label="Fermer">✕</button></div>';
    h += '<p class="a-txt">' + escHTML(q.aide || 'Comparez votre champignon à chaque réponse. Le schéma montre ce qu\'il faut repérer ; la photo, un exemple réel tiré de la branche.') + '</p>';
    h += '<div class="a-grille' + (court ? '' : ' une') + '">' + ex.map(function (e, i) {
      var ph = PHOTOS && PHOTOS[e.sp.id];
      return '<div class="a-case"><div class="a-schema">' + schemaAide(e, 'ah' + i) + '</div>' +
        (ph ? '<button class="a-photo" data-ai="' + i + '" aria-label="Agrandir la photo : ' + escHTML(e.enfant.reponse) + '"><img src="' + ph.src + '" alt="" style="' + (e.pos ? 'object-position:' + e.pos + ';transform:scale(' + (parseFloat(e.t) / 100 / 1.6).toFixed(2) + ');transform-origin:' + e.pos : '') + '"></button>' : '') +
        '<div class="a-rep">' + escHTML(e.enfant.court) + '</div>' + (e.enfant.court !== e.enfant.reponse ? '<div class="a-detail">' + escHTML(e.enfant.reponse) + '</div>' : '') + '<div class="a-ex">ex. : ' + escHTML(e.sp.nom) + ' · ' + nbEspeces(e.enfant) + '</div>' +
        '<button class="a-aller" data-aller="' + e.enfant.id + '">VOIR CETTE BRANCHE →</button></div>';
    }).join('') + '</div>';
    if (PHOTOS) h += '<div class="a-pied"><span>⤢</span><span>Toucher une photo pour l\'agrandir. Schéma = ce qu\'il faut repérer ; photo = à quoi ça ressemble en vrai.</span></div>';
    var a = $('#aide-q'); a.innerHTML = h; a.hidden = false; a.scrollTop = 0;
    classe('aide-ouverte', true);
  }
  function fermerAide() { $('#aide-q').hidden = true; classe('aide-ouverte', false); }
  $('#aide-q').addEventListener('click', function (e) {
    if (e.target.closest('[data-act="fermer"]')) { fermerAide(); return; }
    var p = e.target.closest('[data-ai]'); if (p) { ouvrirVisAide(aideNd, +p.getAttribute('data-ai')); return; }
    var g = e.target.closest('[data-aller]'); if (g) { fermerAide(); activerNoeud(g.getAttribute('data-aller')); }
  });
  function ouvrirVisAide(nd, i) {
    visAide = { nd: nd, i: i }; visComp = null; visMode = 'photo';
    vis.hidden = false; classe('visionneuse-ouverte', true); rendreVisionneuse(); $('#vis-fermer').focus();
  }
  function rendreVisAide() {
    var ex = exemplesAide(visAide.nd), e = ex[visAide.i], sp = e.sp, ph = PHOTOS && PHOTOS[sp.id];
    vis.classList.remove('vis-comparaison');
    visZoom = 1; visDx = visDy = 0;
    $('#vis-contenu').innerHTML = (ph ? '<img id="vis-img" alt="' + escHTML(sp.nom) + '" src="' + (srcHD(sp.id) || ph.src) + '">' : imageGrande(sp, 'schema', 'vz').replace('class="vis-im"', 'id="vis-img"')) +
      '<div class="vis-medaillon">' + schemaAide(e, 'vm') + '</div>';
    appliquerZoomVis();
    $('#vis-titre').innerHTML = '<span class="sur-titre">' + escHTML((visAide.nd.q.groupe || 'COMMENT REGARDER').toUpperCase()) + ' · ' + (visAide.i + 1) + ' / ' + ex.length + '</span><strong>' + escHTML(e.enfant.reponse) + '</strong>';
    $('#vis-credit').innerHTML = 'Exemple : ' + escHTML(sp.nom) + ' (' + escHTML(sp.latin) + ')' + (ph ? ' · © ' + escHTML(ph.auteur) + ' · ' + escHTML(ph.licence) : '');
    $('#vis-nav').innerHTML = ex.map(function (x, j) { return '<button data-ainav="' + j + '" aria-current="' + (j === visAide.i) + '" title="' + escHTML(x.enfant.reponse) + '">' + photoOuSchema(x.sp, 'an' + j) + '</button>'; }).join('');
    $('#vis-photo').hidden = true; $('#vis-schema').hidden = true;
  }

  /* ======================= Carnet (Trouvé ! / Mangé !) ======================= */
  var CLE_CARNET = 'mycelium-carnet-v1', carnet = {};
  try { carnet = JSON.parse(stockage(CLE_CARNET) || '{}') || {}; } catch (e) { carnet = {}; }
  Object.keys(carnet).forEach(function (id) { if (!ESP[id]) delete carnet[id]; });
  function jour() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function dateLisible(s) { if (!s) return ''; var p = s.split('-'); return +p[2] + ' ' + ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'][+p[1] - 1] + ' ' + p[0]; }
  function sauverCarnet() { stockage(CLE_CARNET, JSON.stringify(carnet)); majMarquesCarnet(); rafraichirApresCarnet(); }
  function majMarquesCarnet() { feuilles.forEach(function (f) { elems[f.id].g.classList.toggle('trouve', !!carnet[f.sp.id]); }); }
  function rafraichirApresCarnet() {
    if (selection && selection.sp) { rendreVolet(); if (!$('#fiche').hidden) ouvrirFiche(selection.sp); }
    if (!$('#p-carnet').hidden) rendreCarnet();
  }
  function basculerTrouve(id) {
    if (carnet[id]) {
      if (carnet[id].m && !window.confirm('Retirer cette espèce du carnet (trouvée et mangée) ?')) return;
      delete carnet[id];
    } else carnet[id] = { t: jour() };
    sauverCarnet();
  }
  var confId = null;
  function demanderMange(id) {
    if (carnet[id] && carnet[id].m) { delete carnet[id].m; sauverCarnet(); return; }
    confId = id;
    $('#conf-esp').textContent = 'MANGÉ ! · ' + ESP[id].nom.toUpperCase();
    $('#conf-msg').hidden = true; $('#conf-oui').hidden = false; $('#conf-non').textContent = 'NON';
    $('#confirme').hidden = false; $('#conf-oui').focus();
  }
  $('#conf-oui').addEventListener('click', function () {
    if (confId) { carnet[confId] = { t: (carnet[confId] && carnet[confId].t) || jour(), m: jour() }; sauverCarnet(); }
    $('#confirme').hidden = true; confId = null;
  });
  $('#conf-non').addEventListener('click', function () {
    if (!$('#conf-msg').hidden) { $('#confirme').hidden = true; confId = null; return; }
    $('#conf-msg').textContent = 'Alors ne le mangez pas pour l\'instant : montrez votre récolte à un pharmacien ou à un mycologue avant toute consommation. Vous pouvez la noter comme « Trouvé ! ».';
    $('#conf-msg').hidden = false; $('#conf-oui').hidden = true; $('#conf-non').textContent = 'COMPRIS';
  });
  // Branches de premier niveau pour la jauge du carnet
  var LIB_BRANCHES = { volve: 'LAMES', bolets: 'TUBES', hydnes: 'AIGUIL.', chanterelles: 'PLIS', ascos: 'MORILLES', boules: 'BOULES', coraux: 'CORAUX', consoles: 'CONSOLES', gelatineux: 'GÉLAT.', etranges: 'ÉTRANGES' };
  var branchesCarnet = [];
  racine.enfants.forEach(function (c) { if (c.id === 'dessous') c.enfants.forEach(function (d) { branchesCarnet.push(d); }); else branchesCarnet.push(c); });
  var ongletCarnet = 'trouves', limiteCarnet = 40;
  function rendreCarnet() {
    var ids = Object.keys(carnet), nbT = ids.length, nbM = ids.filter(function (i) { return carnet[i].m; }).length;
    var h = '<div class="p-tete c-tete"><div><div class="sur-titre" style="color:var(--ambre)">CARNET</div><h2>Mes trouvailles</h2></div><div class="c-compte">' + nbT + '<small>/' + feuilles.length + '</small></div><button class="p-fermer carre" aria-label="Fermer">✕</button></div>';
    h += '<div class="c-barres" aria-label="Espèces trouvées par branche">' + branchesCarnet.map(function (b) {
      var n = 0; for (var i = b.f0; i <= b.f1; i++) if (carnet[feuilles[i].sp.id]) n++;
      var lib = LIB_BRANCHES[b.id] || (b.q && b.q.groupe) || couper(b.reponse || '', 8)[0];
      return '<div class="c-barre" title="' + escHTML(lib) + ' : ' + n + ' / ' + b.nF + '"><div class="b"><i style="height:' + (n ? Math.max(4, Math.round(100 * n / b.nF)) : 0) + '%"></i></div><span>' + escHTML(lib) + '</span></div>';
    }).join('') + '</div>';
    h += '<div class="c-onglets" role="group"><button data-onglet="trouves" aria-pressed="' + (ongletCarnet === 'trouves') + '">★ TROUVÉS ' + nbT + '</button><button class="mg" data-onglet="manges" aria-pressed="' + (ongletCarnet === 'manges') + '">MANGÉS ' + nbM + '</button><button data-onglet="atrouver" aria-pressed="' + (ongletCarnet === 'atrouver') + '">À TROUVER ' + (feuilles.length - nbT) + '</button></div>';
    var liste;
    if (ongletCarnet === 'atrouver') {
      liste = feuilles.map(function (f) { return f.sp; }).filter(function (s) { return !carnet[s.id]; });
      liste.sort(function (a, b) { return (enSaison(b) - enSaison(a)) || ((a.rang === 'secondaire') - (b.rang === 'secondaire')) || a.nom.localeCompare(b.nom); });
    } else {
      liste = ids.filter(function (i) { return ongletCarnet === 'trouves' || carnet[i].m; }).map(function (i) { return ESP[i]; });
      liste.sort(function (a, b) { var da = carnet[a.id].m && ongletCarnet === 'manges' ? carnet[a.id].m : carnet[a.id].t, db = carnet[b.id].m && ongletCarnet === 'manges' ? carnet[b.id].m : carnet[b.id].t; return db.localeCompare(da) || a.nom.localeCompare(b.nom); });
    }
    if (!liste.length) h += '<p class="c-vide">' + (ongletCarnet === 'atrouver' ? 'Bravo, tout est trouvé !' : 'Rien pour l\'instant. Sur la carte, touchez une espèce puis « ★ Trouvé ! ».') + '</p>';
    else {
      h += '<ul class="c-liste">' + liste.slice(0, limiteCarnet).map(function (s) {
        var c = carnet[s.id], st = STATUTS[s.statut];
        var d = c ? (c.m ? 'mangé le ' + dateLisible(c.m) : 'trouvé le ' + dateLisible(c.t)) : 'pas encore trouvé' + (s.mois ? ' · saison ' + plageMois(s.mois) : '');
        var danger = s.statut === 'mortel' || s.statut === 'toxique';
        return '<li data-esp="' + s.id + '" class="' + (c ? '' : 'pas-trouve') + '" style="--c:' + st.couleur + '"><div class="c-im">' + photoOuSchema(s, 'cn') + '</div><div class="c-t"><div class="c-n">' + escHTML(s.nom) + '</div><div class="c-d' + (danger ? ' danger' : '') + '">' + (danger ? (s.statut === 'mortel' ? '✕ mortel · ' : '⚠ toxique · ') : '') + escHTML(d) + '</div></div>' + (c && c.m ? '<span class="tag-m">MANGÉ</span>' : '') + (c ? '<span class="etoile">★</span>' : '') + '</li>';
      }).join('') + '</ul>';
      if (liste.length > limiteCarnet) h += '<button class="c-plus" data-plus="1">AFFICHER ' + Math.min(40, liste.length - limiteCarnet) + ' DE PLUS (' + (liste.length - limiteCarnet) + ' RESTANTES)</button>';
    }
    h += '<div class="c-actions"><button data-act="exporter">↑ EXPORTER</button><button data-act="importer">↓ IMPORTER</button></div>';
    h += '<p class="note">Le carnet est enregistré sur cet appareil seulement. Exportez-le pour le sauvegarder ou le passer sur un autre appareil.</p>';
    $('#p-carnet').innerHTML = h;
  }
  $('#p-carnet').addEventListener('click', function (e) {
    var o = e.target.closest('[data-onglet]'); if (o) { ongletCarnet = o.getAttribute('data-onglet'); limiteCarnet = 40; rendreCarnet(); return; }
    if (e.target.closest('[data-plus]')) { limiteCarnet += 40; rendreCarnet(); return; }
    var l = e.target.closest('[data-esp]'); if (l) { montrerVue('carte'); selectionnerEspece(l.getAttribute('data-esp'), true); return; }
    var a = e.target.closest('[data-act]'); if (!a) return;
    if (a.getAttribute('data-act') === 'exporter') exporterCarnet(); else importerCarnet();
  });
  // Enregistrer un fichier : téléchargement dans un navigateur ; dans l'application Android, partage du fichier
  // (Drive, mail, Fichiers…) car la vue web de l'app ne sait pas télécharger.
  function enregistrerFichier(nom, contenu, type) {
    var cap = window.Capacitor, P = cap && cap.isNativePlatform && cap.isNativePlatform() && cap.Plugins;
    if (P && P.Filesystem && P.Share) {
      P.Filesystem.writeFile({ path: nom, data: contenu, directory: 'CACHE', encoding: 'utf8' })
        .then(function (r) { return P.Share.share({ title: nom, files: [r.uri] }); })
        .catch(function (err) { if (!/cancel/i.test(String(err && err.message))) window.alert('Enregistrement impossible : ' + (err && err.message || err)); });
      return;
    }
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([contenu], { type: type })); a.download = nom;
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }
  function exporterCarnet() {
    var s = JSON.stringify({ application: 'mycelium', version: 1, exporte: new Date().toISOString(), especes: carnet }, null, 1);
    enregistrerFichier('carnet-mycelium-' + jour() + '.json', s, 'application/json');
  }
  function importerCarnet() {
    var i = document.createElement('input'); i.type = 'file'; i.accept = '.json,application/json';
    i.addEventListener('change', function () {
      var f = i.files && i.files[0]; if (!f) return;
      var r = new FileReader();
      r.onload = function () {
        try {
          var d = JSON.parse(r.result), src = d && (d.especes || d), n = 0;
          Object.keys(src).forEach(function (id) {
            var x = src[id]; if (!ESP[id] || !x || !x.t) return;
            var cur = carnet[id] || {};
            carnet[id] = { t: cur.t && cur.t < x.t ? cur.t : x.t };
            if (cur.m || x.m) carnet[id].m = cur.m || x.m;
            n++;
          });
          sauverCarnet(); window.alert(n + ' espèce' + (n > 1 ? 's' : '') + ' importée' + (n > 1 ? 's' : '') + ' dans le carnet.');
        } catch (err) { window.alert('Fichier illisible : ce n\'est pas un carnet mycélium.'); }
      };
      r.readAsText(f);
    });
    i.click();
  }

  /* ======================= Recherche ======================= */
  var index = [];
  D.especes.forEach(function (e) {
    index.push({ type: 'esp', id: e.id, txt: normaliser([e.nom, e.latin].concat(e.autres_noms || []).join(' ')), label: e.nom, sous: e.latin, statut: e.statut });
  });
  noeuds.forEach(function (n) { if (n.q && n.q.groupe) index.push({ type: 'grp', id: n.id, txt: normaliser(n.q.groupe), label: n.q.groupe, sous: 'groupe de la clé' }); });
  var inp = $('#recherche'), res = $('#resultats'), resSel = -1, resListe = [];
  function chercher() {
    var q = normaliser(inp.value);
    if (!q) { res.hidden = true; resListe = []; return; }
    var mots = q.split(' ');
    resListe = index.map(function (it) {
      var ok = mots.every(function (m) { return it.txt.indexOf(m) >= 0; });
      if (!ok) return null;
      var score = it.txt.indexOf(mots[0]) === 0 ? 0 : (' ' + it.txt).indexOf(' ' + mots[0]) >= 0 ? 1 : 2;
      return { it: it, score: score + (it.type === 'grp' ? .5 : 0) };
    }).filter(Boolean).sort(function (a, b) { return a.score - b.score || a.it.label.localeCompare(b.it.label); }).slice(0, 9).map(function (x) { return x.it; });
    resSel = resListe.length ? 0 : -1;
    afficherResultats();
  }
  function afficherResultats() {
    if (!resListe.length) { res.innerHTML = '<li class="vide">Aucun résultat</li>'; res.hidden = false; return; }
    res.innerHTML = resListe.map(function (it, i) {
      return '<li role="option" data-i="' + i + '" class="' + (i === resSel ? 'actif' : '') + '" aria-selected="' + (i === resSel) + '">' + (it.statut ? iconeSVG(it.statut, 16) : '<span class="ico-grp">◆</span>') + ' <span>' + escHTML(it.label) + '</span> <em>' + escHTML(it.sous) + '</em></li>';
    }).join('');
    res.hidden = false;
  }
  function choisir(i) {
    var it = resListe[i]; if (!it) return;
    res.hidden = true; inp.blur(); inp.value = '';
    montrerVue('carte');
    if (it.type === 'esp') selectionnerEspece(it.id, true); else activerNoeud(it.id);
  }
  inp.addEventListener('input', chercher);
  inp.addEventListener('focus', function () { if (inp.value) chercher(); });
  inp.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowDown') { resSel = Math.min(resListe.length - 1, resSel + 1); afficherResultats(); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { resSel = Math.max(0, resSel - 1); afficherResultats(); e.preventDefault(); }
    else if (e.key === 'Enter') { choisir(resSel); e.preventDefault(); }
    else if (e.key === 'Escape') { res.hidden = true; inp.blur(); }
  });
  res.addEventListener('pointerdown', function (e) { var li = e.target.closest('[data-i]'); if (li) { e.preventDefault(); choisir(+li.getAttribute('data-i')); } });
  document.addEventListener('pointerdown', function (e) { if (!e.target.closest('.zone-recherche')) res.hidden = true; });

  /* ======================= Vues (navigation basse) ======================= */
  var vueCourante = 'carte';
  function montrerVue(v, garderFiche) {
    ['filtres', 'carnet', 'legende'].forEach(function (x) { $('#p-' + x).hidden = x !== v; });
    if (v !== 'carte' && !garderFiche) fermerFiche();
    vueCourante = v;
    document.querySelectorAll('#nav [data-vue]').forEach(function (b) { b.setAttribute('aria-current', b.getAttribute('data-vue') === v); });
    classe('panneau-ouvert', v !== 'carte');
    if (v === 'carnet') { limiteCarnet = 40; rendreCarnet(); $('#p-carnet').scrollTop = 0; }
  }
  $('#nav').addEventListener('click', function (e) {
    var b = e.target.closest('[data-vue]'); if (!b) return;
    var v = b.getAttribute('data-vue');
    if (v === 'carte' && vueCourante === 'carte') { fermerFiche(); recentrer(); return; }
    montrerVue(v === vueCourante ? 'carte' : v);
  });
  document.addEventListener('click', function (e) { if (e.target.closest('.p-fermer')) montrerVue('carte'); });
  $('#pastille-mois').addEventListener('click', function () { montrerVue(vueCourante === 'filtres' ? 'carte' : 'filtres'); });

  /* ======================= Filtres ======================= */
  var filtres = {}, optSec = true, optCarnet = true;
  ORDRE_STATUTS.forEach(function (s) { filtres[s] = true; });
  var zf = $('#filtres');
  var compteStatut = {}; D.especes.forEach(function (e) { compteStatut[e.statut] = (compteStatut[e.statut] || 0) + 1; });
  zf.innerHTML = ['comestible', 'sans-interet', 'toxique', 'mortel'].map(function (s) {
    var fixe = s === 'mortel';
    return '<button class="filtre' + (fixe ? ' fixe' : '') + '" data-statut="' + s + '" aria-pressed="true" style="--c:' + STATUTS[s].couleur + '"' + (fixe ? ' aria-disabled="true" title="Les espèces mortelles restent toujours affichées"' : '') + '>' + iconeSVG(s, 16) + '<span class="f-nom">' + STATUTS[s].pluriel + '</span><span class="f-nb">' + (compteStatut[s] || 0) + '</span>' + (fixe ? '<span class="toujours">TOUJOURS</span>' : '<span class="inter"></span>') + '</button>';
  }).join('');
  zf.addEventListener('click', function (e) {
    var b = e.target.closest('[data-statut]'); if (!b) return;
    var s = b.getAttribute('data-statut'); if (s === 'mortel') return;
    filtres[s] = !filtres[s];
    appliquerFiltres();
  });
  $('#nb-sec').textContent = feuilles.filter(function (f) { return f.sec; }).length;
  $('#opt-secondaires').addEventListener('click', function () { optSec = !optSec; appliquerFiltres(); });
  $('#opt-carnet').addEventListener('click', function () { optCarnet = !optCarnet; stockage('mycelium-opt-carnet', optCarnet ? '1' : '0'); appliquerFiltres(); });
  if (stockage('mycelium-opt-carnet') === '0') optCarnet = false;
  /* ---- Filtre par mois ---- */
  var MOIS = ['JAN', 'FÉV', 'MAR', 'AVR', 'MAI', 'JUN', 'JUL', 'AOÛ', 'SEP', 'OCT', 'NOV', 'DÉC'];
  var MOIS_LONG = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  var moisChoisi = 0; // 0 = toute l'année
  var zm = $('#mois');
  zm.innerHTML = MOIS.map(function (m, i) { return '<button class="mois-btn" data-mois="' + (i + 1) + '" aria-pressed="false" title="' + MOIS_LONG[i] + '">' + m + '</button>'; }).join('') +
    '<button class="mois-btn tout" data-mois="0" aria-pressed="true">TOUTE L\'ANNÉE</button>';
  zm.addEventListener('click', function (e) {
    var b = e.target.closest('[data-mois]'); if (!b) return;
    var m = +b.getAttribute('data-mois');
    moisChoisi = moisChoisi === m ? 0 : m;
    appliquerFiltres();
  });
  function enSaison(sp) { return !moisChoisi || !sp.mois || sp.mois.indexOf(moisChoisi) >= 0; }
  function appliquerFiltres() {
    zm.querySelectorAll('[data-mois]').forEach(function (b) { b.setAttribute('aria-pressed', +b.getAttribute('data-mois') === moisChoisi); });
    zf.querySelectorAll('[data-statut]').forEach(function (b) { b.setAttribute('aria-pressed', filtres[b.getAttribute('data-statut')]); });
    $('#opt-secondaires').setAttribute('aria-pressed', optSec); $('#opt-carnet').setAttribute('aria-pressed', optCarnet);
    classe('avec-carnet', optCarnet);
    var visible = {}, masque = {}, nbVis = 0;
    noeuds.slice().reverse().forEach(function (nd) {
      if (nd.sp) { masque[nd.id] = !optSec && nd.sec; visible[nd.id] = !masque[nd.id] && filtres[nd.sp.statut] && enSaison(nd.sp); if (visible[nd.id]) nbVis++; }
      else { masque[nd.id] = nd.enfants.every(function (c) { return masque[c.id]; }); visible[nd.id] = nd.enfants.some(function (c) { return visible[c.id]; }); }
      var o = elems[nd.id];
      [o.g, o.gE, o.arete, o.rep].forEach(function (x) { if (!x) return; x.classList.toggle('estompe', !visible[nd.id]); x.classList.toggle('masque', !!masque[nd.id]); });
    });
    paires.forEach(function (p) { elSosies[p.cle].classList.toggle('estompe', !(visible['sp:' + p.a] && visible['sp:' + p.b])); });
    cercleP.classList.toggle('masque', !optSec); titreP.classList.toggle('masque', !optSec);
    $('#compte').innerHTML = '<b>' + nbVis + '</b> espèce' + (nbVis > 1 ? 's' : '') + ' visible' + (nbVis > 1 ? 's' : '') + ' sur ' + feuilles.length + (moisChoisi ? ' en ' + MOIS_LONG[moisChoisi - 1] : '');
    var pm = $('#pastille-mois');
    pm.textContent = (moisChoisi ? MOIS[moisChoisi - 1] : 'TOUT') + ' · ' + nbVis;
    pm.classList.toggle('tout', !moisChoisi && nbVis === feuilles.length);
    pm.setAttribute('aria-label', nbVis + ' espèces affichées' + (moisChoisi ? ' en ' + MOIS_LONG[moisChoisi - 1] : '') + ' : ouvrir les filtres');
    dessinerMinicarte();
  }

  /* ======================= Avertissement ======================= */
  var CLE_AVERT = 'mycelium-avert-off';
  $('#avert-nb').textContent = feuilles.length;
  function ouvrirAvert() { $('#avert-plus').checked = stockage(CLE_AVERT) === '1'; $('#avert').hidden = false; $('#avert-ok').focus(); }
  $('#avert-ok').addEventListener('click', function () { stockage(CLE_AVERT, $('#avert-plus').checked ? '1' : '0'); $('#avert').hidden = true; });
  $('#btn-avert').addEventListener('click', ouvrirAvert);

  // Échap : ferme ce qui est au premier plan
  function echap() { // renvoie false s'il n'y avait plus rien à fermer
    if (!$('#confirme').hidden) { $('#confirme').hidden = true; return true; }
    if (!$('#avert').hidden) { $('#avert').hidden = true; return true; }
    if (!vis.hidden) { fermerVisionneuse(); return true; }
    if (!$('#aide-q').hidden) { fermerAide(); return true; }
    if (!$('#fiche').hidden) { fermerFiche(); return true; }
    if (vueCourante !== 'carte') { montrerVue('carte'); return true; }
    if (focusNd) { quitterFocus(); return true; }
    if (selection) { deselectionner(); return true; }
    return false;
  }
  // Application Android : le bouton « retour » ferme ce qui est ouvert, puis quitte l'app
  (function () {
    var cap = window.Capacitor, A = cap && cap.isNativePlatform && cap.isNativePlatform() && cap.Plugins && cap.Plugins.App;
    if (A) A.addListener('backButton', function () { if (!echap()) A.exitApp(); });
  })();


  // Changement de disposition (animé)
  var selDispo = $('#disposition');
  selDispo.innerHTML = Object.keys(DISPOS).map(function (k) { return '<option value="' + k + '">' + DISPOS[k].label + '</option>'; }).join('');
  var dispoActuelle = DISPOS[stockage('cc-dispo2')] ? stockage('cc-dispo2') : 'radial';
  selDispo.value = dispoActuelle;
  selDispo.addEventListener('change', function () { changerDispo(selDispo.value); });
  var animDispo = 0;
  function changerDispo(nom) {
    if (nom === dispoActuelle) return;
    if (arcNd) { arcNd = null; cancelAnimationFrame(animArc); }
    var A = courant, B = dispo(nom);
    // garder la même zone visible relativement : on recentre sur la sélection ou sur l'ensemble
    dispoActuelle = nom; stockage('cc-dispo2', nom);
    selDispo.value = nom;
    cancelAnimationFrame(animDispo);
    var T = taille();
    var camA = { x: cam.x, y: cam.y, k: cam.k };
    var camB = selection ? (function () { var b = bornesNoeudDans(B, selection.sp ? selection.parent : selection); return camPour(b, .05); })() : camPour(B.bornes, 0.02);
    var t0 = performance.now(), duree = 1100;
    (function pas() {
      var t = Math.min(1, (performance.now() - t0) / duree), e = t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      appliquerGeometrie(interpoler(A, B, e));
      // interpolation de la caméra en log
      var k = Math.exp(lerp(Math.log(camA.k), Math.log(camB.k), e));
      var cxA = (T.w / 2 - camA.x) / camA.k, cyA = (T.h / 2 - camA.y) / camA.k, cxB = (T.w / 2 - camB.x) / camB.k, cyB = (T.h / 2 - camB.y) / camB.k;
      cam.k = k; cam.x = T.w / 2 - lerp(cxA, cxB, e) * k; cam.y = T.h / 2 - lerp(cyA, cyB, e) * k;
      rendreCamera();
      if (t < 1) animDispo = requestAnimationFrame(pas); else { appliquerGeometrie(B); dessinerMinicarte(); }
    })();
  }
  function bornesNoeudDans(L, nd) { var sauv = courant; courant = L; var b = bornesNoeud(nd); courant = sauv; return b; }

  /* ======================= Mini-carte ======================= */
  var mini = $('#minicarte'), miniMonde = $('#mini-monde'), miniVue = $('#mini-vue');
  // Mini-carte : la branche sélectionnée (ou toute la carte s'il n'y a pas de sélection)
  function baseMini() {
    var b = focusNd || (selection && (selection.sp ? selection.parent : selection));
    if (b && b.sp) b = b.parent;
    if (b && selection && selection.sp && b.nF < 6 && b.parent && b.parent.prof > 0) b = b.parent; // un peu de contexte
    return b && b.prof > 0 ? b : null;
  }
  function dessinerMinicarte() {
    if (!courant) return;
    var base = baseMini(), dans = null, chem = {};
    if (base) { dans = {}; (function m(n) { dans[n.id] = 1; n.enfants.forEach(m); })(base); }
    var s = selection; while (s) { chem[s.id] = 1; s = s.parent; }
    var b = base ? bornesNoeud(base) : courant.bornes, m = Math.max(b.w, b.h) * 0.04;
    mini.setAttribute('viewBox', [b.x - m, b.y - m, b.w + 2 * m, b.h + 2 * m].map(r1).join(' '));
    var h = '', lw = Math.max(b.w, b.h) / 160;
    noeuds.forEach(function (nd) {
      if (!nd.parent || (dans && !dans[nd.id])) return;
      var e = courant.aret[nd.id];
      if (elems[nd.id].g.classList.contains('estompe')) return;
      var surChemin = chem[nd.id] && nd !== base;
      h += '<path d="M' + r1(e[0]) + ' ' + r1(e[1]) + 'C' + r1(e[2]) + ' ' + r1(e[3]) + ' ' + r1(e[4]) + ' ' + r1(e[5]) + ' ' + r1(e[6]) + ' ' + r1(e[7]) + '" stroke="' + (surChemin ? '#FFB547' : '#8DF5C0') + '" stroke-width="' + r1(lw * (base ? 1.2 : 0.5 + Math.sqrt(nd.nF) * .25) * (surChemin ? 1.8 : 1)) + '" fill="none" opacity="' + (surChemin ? 1 : .7) + '"/>';
    });
    feuilles.forEach(function (f) {
      if (elems[f.id].g.classList.contains('estompe') || (dans && !dans[f.id])) return;
      var p = courant.pos[f.id];
      h += '<circle cx="' + r1(p.x) + '" cy="' + r1(p.y) + '" r="' + r1(lw * (base ? 4 : 2.6) * (chem[f.id] ? 1.6 : 1)) + '" fill="' + STATUTS[f.sp.statut].couleur + '"/>';
    });
    miniMonde.innerHTML = h;
    miniVue.setAttribute('stroke-width', r1(lw * 1.6));
    majVueMinicarte();
  }
  function majVueMinicarte() {
    var T = taille();
    miniVue.setAttribute('x', r1(-cam.x / cam.k)); miniVue.setAttribute('y', r1(-cam.y / cam.k));
    miniVue.setAttribute('width', r1(T.w / cam.k)); miniVue.setAttribute('height', r1(T.h / cam.k));
  }
  function miniVers(e) {
    var pt = mini.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
    var w = pt.matrixTransform(mini.getScreenCTM().inverse()), T = taille();
    cam.x = T.w / 2 - w.x * cam.k; cam.y = T.h / 2 - w.y * cam.k; planifier();
  }
  var miniActif = false;
  mini.addEventListener('pointerdown', function (e) { arreterAnim(); miniActif = true; mini.setPointerCapture(e.pointerId); miniVers(e); e.preventDefault(); });
  mini.addEventListener('pointermove', function (e) { if (miniActif) miniVers(e); });
  mini.addEventListener('pointerup', function () { miniActif = false; });

  /* ======================= Boutons, légende ======================= */
  $('#zoom-plus').addEventListener('click', function () { var T = taille(); zoomerEnAnime(T.w / 2, T.h / 2, 1.8); });
  $('#zoom-moins').addEventListener('click', function () { var T = taille(); zoomerEnAnime(T.w / 2, T.h / 2, 1 / 1.8); });
  $('#recentrer').addEventListener('click', function () { recentrer(); });
  $('#legende-statuts').innerHTML = ORDRE_STATUTS.map(function (s) {
    var st = STATUTS[s];
    return '<li><svg width="34" height="34" viewBox="-17 -17 34 34" aria-hidden="true"><circle r="12" fill="' + st.clair + '" stroke="' + st.couleur + '" stroke-width="3" stroke-dasharray="' + (st.dash ? st.dash.split(' ').map(function (v) { return v / 3; }).join(' ') : '') + '"/>' + (s === 'mortel' ? '<circle r="15.5" fill="none" stroke="' + st.couleur + '" stroke-width="1.4"/>' : '') + '<g transform="translate(-7 -7) scale(.58)">' + '<circle cx="12" cy="12" r="12" fill="' + st.couleur + '"/>' + ICONES[s] + '</g></svg> <span><strong>' + st.label + '</strong><br>' + {
      mortel: 'peut tuer · double cercle, tête de mort',
      toxique: 'intoxication · cercle tireté, triangle',
      'sans-interet': 'non toxique mais sans valeur · pointillés, tiret',
      comestible: 'bon comestible · trait plein, coche'
    }[s] + '</span></li>';
  }).join('');
  $('#credits').textContent = (PHOTOS ? 'Photos : Wikimedia Commons (licences CC BY, CC BY-SA ou domaine public) ; auteur et licence dans chaque fiche. ' : '') +
    'Polices : Literata et IBM Plex Mono (SIL Open Font License). ' + (D.meta && D.meta.version ? 'Version du ' + D.meta.version + '.' : '');

  /* ======================= Export SVG (poster) ======================= */
  $('#exporter').addEventListener('click', exporterSVG);
  function exporterSVG() {
    var L = dispo(dispoActuelle), b = L.bornes, marge = Math.max(b.w, b.h) * 0.03;
    var entete = Math.max(b.w, b.h) * 0.09;
    var W = b.w + 2 * marge, H = b.h + 2 * marge + entete;
    var clone = monde.cloneNode(true);
    clone.removeAttribute('transform');
    clone.querySelectorAll('[data-n]').forEach(function (n) { n.setAttribute('data-n', '4'); });
    clone.querySelectorAll('.rep').forEach(function (n) { n.style.display = ''; n.style.opacity = 1; });
    clone.querySelectorAll('.region').forEach(function (n) { n.style.display = ''; n.style.opacity = .35; });
    clone.querySelectorAll('.estompe,.chemin,.sel,.actif,.focus,.hors-focus').forEach(function (n) { n.classList.remove('estompe', 'chemin', 'sel', 'actif', 'focus', 'hors-focus'); });
    var sos = clone.querySelector('.sosies'); if (sos) sos.parentNode.removeChild(sos);
    var fs = entete * 0.32, x0 = b.x - marge, y0 = b.y - marge - entete;
    var titre = '<g><text x="' + r1(x0 + marge) + '" y="' + r1(y0 + entete * .42) + '" font-size="' + r1(fs) + '" font-family="Literata, Georgia, serif" font-style="italic" fill="#E6EEE8">mycélium<tspan fill="#8DF5C0">.</tspan> carte d\'identification des champignons de France</text>' +
      '<text x="' + r1(x0 + marge) + '" y="' + r1(y0 + entete * .7) + '" font-size="' + r1(fs * .36) + '" font-family="IBM Plex Mono, monospace" fill="#FF5A3C">Outil pédagogique. Ne mangez jamais un champignon sur la base de cette carte : faites vérifier toute récolte par un pharmacien ou un mycologue.</text>' +
      '<text x="' + r1(x0 + marge) + '" y="' + r1(y0 + entete * .88) + '" font-size="' + r1(fs * .26) + '" font-family="IBM Plex Mono, monospace" fill="#8FA39A">Vert / coche : comestible — Gris / tiret : sans intérêt — Orange / triangle : toxique — Rouge / tête de mort, double cercle : mortel. ' + (D.meta && D.meta.version ? 'Version ' + escHTML(D.meta.version) + '.' : '') + '</text></g>';
    var defs = $('#defs-carte').outerHTML;
    var css = '<style>' + $('#css-carte').textContent + '</style>';
    var s = '<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="' + [x0, y0, W, H].map(r1).join(' ') + '" width="' + Math.round(W / 4) + 'mm" height="' + Math.round(H / 4) + 'mm">' + css + defs +
      '<rect x="' + r1(x0) + '" y="' + r1(y0) + '" width="' + r1(W) + '" height="' + r1(H) + '" fill="#0C120F"/>' + titre + new XMLSerializer().serializeToString(clone).replace(/ xmlns="http:\/\/www.w3.org\/2000\/svg"/, '') + '</svg>';
    enregistrerFichier('mycelium-poster-' + dispoActuelle + '.svg', s, 'image/svg+xml');
  }

  /* ======================= Démarrage ======================= */
  majAriane(null);
  majMarquesCarnet();
  majRepsFeuilles();
  appliquerFiltres();
  rendreVolet();
  appliquerGeometrie(dispo(dispoActuelle));
  recentrer(true);
  if (stockage(CLE_AVERT) !== '1') ouvrirAvert();
  window.addEventListener('resize', function () { planifier(); });
  // API minimale pour les tests automatisés
  window.CARTE = {
    cam: function () { return { x: cam.x, y: cam.y, k: cam.k }; },
    zoomer: function (f) { var T = taille(); zoomerEn(T.w / 2, T.h / 2, f); },
    selectionner: function (id) { selectionnerEspece(id, true); },
    question: function (id) { selectionnerQuestion(parId[id]); },
    aide: function (id) { ouvrirAide(parId[id]); },
    fiche: function (id) { selectionnerEspece(id, false); ouvrirFiche(ESP[id]); },
    vue: montrerVue,
    disposition: changerDispo,
    recentrer: function () { recentrer(); },
    zone: function () { var z = zoneUtile(); delete z.T; return z; }, bornes: function (id) { return id ? bornesNoeud(parId[id]) : courant.bornes; },
    nbNoeuds: noeuds.length, nbFeuilles: feuilles.length, nbSosies: paires.length
  };
})();
