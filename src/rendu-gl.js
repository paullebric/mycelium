/* mycélium — rendu de la carte par la carte graphique (WebGL, PixiJS).
   Le moteur (app.js) continue de construire et de tenir à jour la carte SVG, qui reste la « source de vérité »
   (classes, transformations, niveaux de détail, export poster) mais n'est plus affichée : ce module en dessine
   un miroir avec PixiJS. Il observe les changements du SVG (MutationObserver) et ne redessine que ce qui a changé.
   Si WebGL n'est pas disponible (ou avec ?svg dans l'adresse), la carte SVG reste affichée comme avant. */
(function () {
  'use strict';
  var NUIT = 0x0C120F, MENTHE = 0x8DF5C0, AMBRE = 0xFFB547, GRIS = 0x8FA39A;

  function couleur(c) { // '#RRGGBB' -> nombre
    if (typeof c === 'number') return c;
    if (!c) return 0xffffff;
    c = String(c).trim();
    if (c[0] === '#') { if (c.length === 4) c = '#' + c[1] + c[1] + c[2] + c[2] + c[3] + c[3]; return parseInt(c.slice(1, 7), 16); }
    return 0xffffff;
  }
  function nombres(s) { return (String(s || '').match(/-?\d*\.?\d+(?:e-?\d+)?/g) || []).map(Number); }
  function transformation(el) { // 'translate(x y) scale(s)' -> {x, y, s}
    var t = el.getAttribute('transform') || '', m = /translate\(([^)]*)\)/.exec(t), k = /scale\(([^)]*)\)/.exec(t);
    var a = m ? nombres(m[1]) : [0, 0], b = k ? nombres(k[1]) : [1];
    return { x: a[0] || 0, y: a[1] || 0, s: b[0] == null ? 1 : b[0] };
  }

  /* ---------- Styles de texte (repris de carte.css) ---------- */
  var SERIF = "'Literata', Georgia, serif", MONO = "'IBM Plex Mono', Menlo, monospace";
  var STYLES = {
    'nom': { fontFamily: SERIF, fontStyle: 'italic', fontWeight: '400', fontSize: 16, fill: 0xE6EEE8, trait: 5 },
    'latin': { fontFamily: MONO, fontWeight: '400', fontSize: 10.5, fill: 0x8FA39A, trait: 4 },
    'st-txt': { fontFamily: MONO, fontWeight: '600', fontSize: 9, espace: .12, trait: 4 },
    'crit': { fontFamily: MONO, fontWeight: '400', fontSize: 10, fill: 0xb9c7c0, trait: 4 },
    'rep-feuille': { fontFamily: MONO, fontWeight: '500', fontSize: 10, fill: 0x8DF5C0, trait: 4 },
    'q-txt': { fontFamily: SERIF, fontStyle: 'italic', fontWeight: '400', fontSize: 18.5, fill: 0xE6EEE8 },
    'q-groupe': { fontFamily: MONO, fontWeight: '500', fontSize: 11, fill: 0x8DF5C0, espace: .14 },
    'q-nb': { fontFamily: MONO, fontWeight: '500', fontSize: 10, fill: 0x8FA39A, espace: .08 },
    'aide': { fontFamily: MONO, fontWeight: '700', fontSize: 17, fill: NUIT },
    'rep-num': { fontFamily: MONO, fontWeight: '700', fontSize: 13, fill: NUIT },
    'rep-txt': { fontFamily: MONO, fontWeight: '500', fontSize: 13, fill: 0x8DF5C0, trait: 5 },
    'region': { fontFamily: SERIF, fontStyle: 'italic', fontWeight: '400', fontSize: 55.4, fill: 0x8DF5C0, espace: .04 },
    'titre': { fontFamily: MONO, fontWeight: '500', fontSize: 15, fill: 0x8FA39A }
  };
  var mesures = {};
  function styleDe(nom, surcharge) {
    var b = STYLES[nom], o = {};
    for (var k in b) o[k] = b[k];
    if (surcharge) for (var j in surcharge) o[j] = surcharge[j];
    return o;
  }
  function pixiStyle(st) {
    var s = { fontFamily: st.fontFamily, fontStyle: st.fontStyle || 'normal', fontWeight: st.fontWeight || '400', fontSize: st.fontSize, fill: st.fill, letterSpacing: (st.espace || 0) * st.fontSize, padding: 2 };
    if (st.trait) s.stroke = { color: NUIT, width: st.trait, join: 'round' };
    return s;
  }
  // Texte SVG -> texte Pixi, aligné sur la ligne de base comme en SVG (x, y = point d'ancrage sur la ligne de base)
  function creerTexte(PIXI, contenu, st, x, y, ancre) {
    var ps = pixiStyle(st), t = new PIXI.Text({ text: contenu, style: ps });
    var cle = ps.fontStyle + ps.fontWeight + ps.fontSize + ps.fontFamily;
    var asc = mesures[cle];
    if (asc == null) asc = mesures[cle] = PIXI.CanvasTextMetrics.measureFont(PIXI.CanvasTextMetrics._fontStringFromStyle ? PIXI.CanvasTextMetrics._fontStringFromStyle(t.style) : t.style._fontString || (ps.fontStyle + ' ' + ps.fontWeight + ' ' + ps.fontSize + 'px ' + ps.fontFamily)).ascent;
    var marge = 2 + (st.trait || 0) / 2;
    t.anchor.set(ancre === 'middle' ? 0.5 : ancre === 'end' ? 1 : 0, 0);
    t.x = x + (ancre === 'end' ? marge : ancre === 'middle' ? 0 : -marge);
    t.y = y - marge - asc;
    t.__base = { taille: st.fontSize };
    return t;
  }

  /* ---------- Dessins vectoriels utilitaires ---------- */
  function cercleTirete(g, r, dash, trou, largeur, coul, alpha, cap) {
    var tour = 2 * Math.PI * r, pas = dash + trou, n = Math.max(1, Math.floor(tour / pas));
    var k = tour / (n * pas); // ajuste pour boucler proprement
    for (var i = 0; i < n; i++) {
      var a0 = (i * pas * k) / r, a1 = a0 + (dash * k) / r;
      g.moveTo(Math.cos(a0) * r, Math.sin(a0) * r).arc(0, 0, r, a0, a1);
    }
    g.stroke({ width: largeur, color: coul, alpha: alpha, cap: cap || 'butt' });
  }
  function courbeTiretee(g, pts, dash, trou, largeur, coul, alpha) { // pts : polyligne
    var etat = dash, trace = true, px = pts[0][0], py = pts[0][1];
    g.moveTo(px, py);
    for (var i = 1; i < pts.length; i++) {
      var qx = pts[i][0], qy = pts[i][1], d = Math.hypot(qx - px, qy - py);
      while (d > 0) {
        var pasr = Math.min(etat, d), t = pasr / d;
        var nx = px + (qx - px) * t, ny = py + (qy - py) * t;
        if (trace) g.lineTo(nx, ny); else g.moveTo(nx, ny);
        px = nx; py = ny; d -= pasr; etat -= pasr;
        if (etat <= 1e-6) { trace = !trace; etat = trace ? dash : trou; }
      }
    }
    g.stroke({ width: largeur, color: coul, alpha: alpha, cap: 'round' });
  }

  /* ---------- Images (photos rondes, schémas, pastilles) ---------- */
  function chargerImage(src) {
    return new Promise(function (ok, ko) { var im = new Image(); im.decoding = 'async'; im.onload = function () { ok(im); }; im.onerror = ko; im.src = src; });
  }
  function svgVersImage(contenu, vb) {
    return chargerImage('data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="' + vb + '">' + contenu + '</svg>'));
  }
  function textureRonde(PIXI, im, taille) { // image recadrée en disque (comme preserveAspectRatio slice + clip-path)
    var c = document.createElement('canvas'); c.width = c.height = taille;
    var x = c.getContext('2d'), w = im.naturalWidth || im.width, h = im.naturalHeight || im.height, k = Math.max(taille / w, taille / h);
    x.beginPath(); x.arc(taille / 2, taille / 2, taille / 2, 0, Math.PI * 2); x.clip();
    x.drawImage(im, (taille - w * k) / 2, (taille - h * k) / 2, w * k, h * k);
    return PIXI.Texture.from(c);
  }
  function textureImage(PIXI, im, taille) {
    var c = document.createElement('canvas'); c.width = c.height = taille;
    c.getContext('2d').drawImage(im, 0, 0, taille, taille);
    return PIXI.Texture.from(c);
  }

  window.installerRenduGL = function (ctx) {
    var PIXI = window.PIXI;
    var choix = null; try { choix = localStorage.getItem('mycelium-rendu'); } catch (e) {}
    if (!PIXI || /[?&]svg\b/.test(location.search) || choix === 'svg') return null;
    try { var essai = document.createElement('canvas'); if (!(essai.getContext('webgl2') || essai.getContext('webgl'))) return null; } catch (e) { return null; }

    var app = new PIXI.Application(), pret = false, sale = true, rafId = 0;
    // Carte « figée » : le monde et chacune de ses couches sont des groupes de rendu. La caméra (position, zoom)
    // est appliquée par la carte graphique : un trajet ne renvoie aucune géométrie, et un changement dans une
    // couche (une réponse qui bouge, un rond qui change) ne reconstruit que cette couche.
    var monde = new PIXI.Container({ isRenderGroup: true }), C = {};
    ['courbes', 'regions', 'aretes', 'cercle', 'titre', 'sosies', 'repsFond', 'noeuds', 'questions', 'reps', 'etiq'].forEach(function (n) { C[n] = new PIXI.Container({ isRenderGroup: true }); monde.addChild(C[n]); });
    C.noeuds.cullable = false;
    var objs = {}, cles = new WeakMap(), aMettreAJour = new Set(), tout = true;
    // Paquets : chaque couche est découpée en petits groupes de rendu d'une douzaine de nœuds voisins. Quand un rond
    // change (niveau de détail au zoom, sélection, arc), seul son paquet est renvoyé à la carte graphique.
    var IDX = {}; ctx.noeuds.forEach(function (nd, i) { IDX[nd.id] = i; });
    var paquets = {};
    function paquet(couche, id) {
      var k = couche + ':' + Math.floor((IDX[id] || 0) / 12);
      if (!paquets[k]) { paquets[k] = new PIXI.Container({ isRenderGroup: true }); C[couche].addChild(paquets[k]); }
      return paquets[k];
    }
    var tex = { photos: {}, badges: {}, prec: null, etoile: null };

    /* ---- correspondance élément SVG -> objet à redessiner ---- */
    ctx.noeuds.forEach(function (nd) {
      var o = ctx.elems[nd.id];
      cles.set(o.g, 'g:' + nd.id); if (o.gE) cles.set(o.gE, 'e:' + nd.id);
      if (o.arete) cles.set(o.arete, 'a:' + nd.id); if (o.rep) cles.set(o.rep, 'r:' + nd.id);
      if (o.reg) cles.set(o.reg, 'reg:' + nd.id);
    });
    ctx.paires.forEach(function (p) { cles.set(ctx.elSosies[p.cle], 's:' + p.cle); });
    cles.set(ctx.cercleP, 'cercle'); cles.set(ctx.titreP, 'titre'); cles.set(ctx.gCourbes, 'courbes');
    function cleDe(el) { while (el && el !== ctx.mondeSVG) { var k = cles.get(el); if (k) return k; el = el.parentNode; } return el === ctx.mondeSVG ? 'monde' : null; }
    var obs = new MutationObserver(function (liste) {
      for (var i = 0; i < liste.length; i++) {
        var k = cleDe(liste[i].target);
        if (k === 'monde') { if (liste[i].attributeName === 'class') tout = true; }
        else if (k) aMettreAJour.add(k);
      }
      demander();
    });
    obs.observe(ctx.mondeSVG, { attributes: true, childList: true, subtree: true, characterData: true, attributeFilter: ['class', 'transform', 'd', 'data-n', 'style', 'r', 'stroke-width', 'stroke-opacity', 'font-size', 'data-gl'] });
    new MutationObserver(function () { tout = true; demander(); }).observe(document.body, { attributes: true, attributeFilter: ['class'] });

    function demander() { sale = true; if (pret && !rafId) rafId = requestAnimationFrame(dessiner); }

    /* ---- états visuels communs ---- */
    function cl(el, c) { return el.classList.contains(c); }
    function loin() { return cl(ctx.mondeSVG, 'loin'); }
    function niveau(el) { var n = el.getAttribute('data-n'); return n == null ? 4 : +n; }
    function alphaNoeud(el) {
      if (cl(el, 'estompe')) return 0.1;
      if (cl(el, 'hors-focus')) return loin() ? 0.15 : 0.2;
      return 1;
    }
    // Changement d'opacité d'un nœud ou d'une branche (filtres, focus) : fondu sur quelques images au lieu d'un saut
    var fondus = new Map();
    function alphaDouce(ob, d, a) {
      // Opacité appliquée d'un coup : avec PixiJS, chaque image d'un fondu renverrait toute la géométrie de la
      // couche à la carte graphique (l'opacité fait partie des sommets). C'était la principale cause de saccades.
      if (true) { ob.alphaVu = true; d.alpha = a; fondus.delete(d); return; }
      if (Math.abs(d.alpha - a) < 0.01) { d.alpha = a; fondus.delete(d); return; }
      fondus.set(d, a);
    }
    function cache(el) { return cl(el, 'masque') || cl(el, 'avant-depart') || cl(el, 'hors-ecran') || el.style.display === 'none'; }

    /* ---- espèces (disque, photo, anneaux, pastilles) ---- */
    function photoDe(nd) {
      var id = nd.sp.id;
      if (tex.photos[id] !== undefined) return tex.photos[id];
      tex.photos[id] = null;
      var ph = ctx.PHOTOS && ctx.PHOTOS[id];
      var p = ph ? chargerImage(ph.src) : svgVersImage(ctx.illustration(nd.sp, 48), '-48 -48 96 96');
      p.then(function (im) { tex.photos[id] = textureRonde(PIXI, im, 160); aMettreAJour.add('g:' + nd.id); demander(); }).catch(function () {});
      return null;
    }
    function majFeuille(nd, ob) {
      var el = ctx.elems[nd.id].g, sp = nd.sp, st = ctx.STATUTS[sp.statut], n = niveau(el), arc = cl(el, 'dans-arc'), sel = cl(el, 'sel');
      var c = ob.c, g = ob.forme;
      var plein = n === 0 && !arc, r = plein ? 72 : 48;
      // clé de dessin : si rien de ce qui se dessine n'a changé (ex. seul le focus change l'opacité), on ne redessine pas
      var tr0 = cl(el, 'trouve') && cl(document.body, 'avec-carnet'), mc0 = tr0 && el.querySelector('.marque-carnet circle'), a20 = sp.statut === 'mortel' && el.querySelector('.anneau2');
      var cleForme = [n, arc, sel, tr0, !!tex.photos[sp.id], mc0 ? mc0.getAttribute('r') + (mc0.getAttribute('style') || '') : '', a20 ? a20.getAttribute('r') + '/' + a20.getAttribute('stroke-width') + '/' + a20.getAttribute('stroke-opacity') : ''].join('|');
      if (ob.cleForme === cleForme) return;
      ob.cleForme = cleForme;
      g.clear();
      if (sel) g.circle(0, 0, r).stroke({ width: 18, color: AMBRE, alpha: 0.45 });
      g.circle(0, 0, r).fill({ color: n <= 1 && !arc ? couleur(st.couleur) : arc && n === 0 ? 0x141c17 : couleur(st.clair) });
      var montrerIllu = n >= 1 || arc;
      if (montrerIllu) {
        var t = photoDe(nd);
        if (t) { if (!ob.illu) { ob.illu = new PIXI.Sprite(t); ob.illu.anchor.set(0.5); ob.illu.width = ob.illu.height = 96; c.addChildAt(ob.illu, 1); } ob.illu.visible = true; }
      } else if (ob.illu) ob.illu.visible = false;
      // anneaux (au-dessus de la photo)
      var a = ob.anneaux; a.clear();
      var dash = st.dash ? nombres(st.dash) : null, larg = sel ? 9 : 5;
      if (dash) cercleTirete(a, 48, dash[0], dash[1], larg, couleur(st.couleur), 1); else a.circle(0, 0, 48).stroke({ width: larg, color: couleur(st.couleur) });
      if (sp.statut === 'mortel') { var a2 = el.querySelector('.anneau2'), r2 = a2 && +a2.getAttribute('r') || 55, w2 = a2 && parseFloat(a2.getAttribute('stroke-width')) || 2.5; a.circle(0, 0, r2).stroke({ width: w2, color: couleur(st.couleur), alpha: a2 && a2.getAttribute('stroke-opacity') ? +a2.getAttribute('stroke-opacity') : 1 }); }
      if (cl(el, 'trouve') && cl(document.body, 'avec-carnet')) {
        var mcc = el.querySelector('.marque-carnet circle'), mr = +mcc.getAttribute('r') || 63;
        if (mr > 63) { var mw = parseFloat(mcc.style.strokeWidth) || 3, md = parseFloat((mcc.style.strokeDasharray || '').split(/[ ,]+/)[0]) || 3; cercleTirete(a, mr, md, md, mw, AMBRE, 1); }
        else cercleTirete(a, 63, 3, 5, 3, AMBRE, 1);
      }
      // pastilles
      var montrerBadge = n >= 1 || arc;
      if (montrerBadge && tex.badges[sp.statut]) {
        if (!ob.badge) { ob.badge = new PIXI.Sprite(tex.badges[sp.statut]); ob.badge.anchor.set(0.5); ob.badge.width = ob.badge.height = 32.5; ob.badge.position.set(34, -34); c.addChild(ob.badge); }
        ob.badge.visible = true;
      } else if (ob.badge) ob.badge.visible = false;
      if (sp.precaution && tex.prec) {
        if (!ob.prec) { ob.prec = new PIXI.Sprite(tex.prec); ob.prec.anchor.set(0.5); ob.prec.width = ob.prec.height = 24; ob.prec.position.set(-34, -34); c.addChild(ob.prec); }
        ob.prec.visible = n >= 1;
      }
      var trouve = cl(el, 'trouve') && cl(document.body, 'avec-carnet') && el.querySelector('.marque-carnet g').getAttribute('display') !== 'none';
      if (trouve && tex.etoile) {
        if (!ob.etoile) { ob.etoile = new PIXI.Sprite(tex.etoile); ob.etoile.anchor.set(0.5); ob.etoile.width = ob.etoile.height = 28; ob.etoile.position.set(-40, 38); c.addChild(ob.etoile); }
        ob.etoile.visible = true;
      } else if (ob.etoile) ob.etoile.visible = false;
    }

    /* ---- questions (pastille + carte) ---- */
    function construireCarteQ(nd, ob) {
      var el = ctx.elems[nd.id].g, cq = el.querySelector('.carte-q');
      var q = new PIXI.Container(); ob.carte = q; ob.c.addChild(q);
      var rects = cq.querySelectorAll('rect');
      ob.ombre = rects[0] ? { x: +rects[0].getAttribute('x'), y: +rects[0].getAttribute('y'), w: +rects[0].getAttribute('width'), h: +rects[0].getAttribute('height') } : null;
      ob.fond = rects[1] ? { x: +rects[1].getAttribute('x'), y: +rects[1].getAttribute('y'), w: +rects[1].getAttribute('width'), h: +rects[1].getAttribute('height') } : null;
      ob.cadre = new PIXI.Graphics(); q.addChild(ob.cadre);
      cq.querySelectorAll(':scope > text').forEach(function (t) {
        var nom = t.classList.contains('q-txt') ? 'q-txt' : t.classList.contains('q-groupe') ? 'q-groupe' : t.classList.contains('q-nb') ? 'q-nb' : null;
        if (!nom) return;
        var tspans = t.querySelectorAll('tspan');
        if (tspans.length) tspans.forEach(function (ts) { q.addChild(creerTexte(PIXI, ts.textContent, styleDe(nom), +ts.getAttribute('x') || 0, +ts.getAttribute('y') || 0, 'middle')); });
        else q.addChild(creerTexte(PIXI, t.textContent, styleDe(nom), +t.getAttribute('x') || 0, +t.getAttribute('y') || 0, 'middle'));
      });
      var b = cq.querySelector('.bouton-aide');
      if (b) {
        var tb = transformation(b), ca = new PIXI.Container(), ga = new PIXI.Graphics().circle(0, 0, 16).fill({ color: MENTHE });
        ca.position.set(tb.x, tb.y); ca.addChild(ga); ca.addChild(creerTexte(PIXI, '?', styleDe('aide'), 0, 6, 'middle')); q.addChild(ca);
        ob.aide = { x: tb.x, y: tb.y, el: b, c: ca };
      }
    }
    function majQuestion(nd, ob) {
      var el = ctx.elems[nd.id].g, n = niveau(el);
      if (n > 0 && !ob.carte) construireCarteQ(nd, ob);
      if (ob.carte) {
        ob.carte.visible = n > 0;
        ob.carte.alpha = cl(el, 'ancetre-focus') ? 0.22 : 1;
        var sel = cl(el, 'sel'), ch = cl(el, 'chemin'), g = ob.cadre;
        g.clear();
        if (ob.ombre) g.rect(ob.ombre.x, ob.ombre.y, ob.ombre.w, ob.ombre.h).fill({ color: 0x000000, alpha: 0.35 });
        if (ob.fond) g.rect(ob.fond.x, ob.fond.y, ob.fond.w, ob.fond.h).fill({ color: 0x121A15 }).stroke({ width: sel ? 3 : ch ? 2.4 : 1.6, color: sel ? AMBRE : MENTHE, alpha: sel || ch ? 1 : 0.55, alignment: 0.5 });
      }
    }

    function objNoeud(nd) {
      var ob = objs['g:' + nd.id];
      if (ob) return ob;
      ob = objs['g:' + nd.id] = { c: new PIXI.Container() };
      if (nd.sp) {
        ob.forme = new PIXI.Graphics(); ob.anneaux = new PIXI.Graphics();
        ob.c.addChild(ob.forme); ob.c.addChild(ob.anneaux);
        paquet('noeuds', nd.id).addChild(ob.c);
      } else {
        ob.pastille = new PIXI.Graphics().circle(0, 0, 11).fill({ color: NUIT }).stroke({ width: 3, color: MENTHE });
        ob.c.addChild(ob.pastille);
        paquet('questions', nd.id).addChild(ob.c);
      }
      return ob;
    }
    function majNoeud(id) {
      var nd = ctx.parId[id], el = ctx.elems[id].g, ob = objs['g:' + id];
      if (cache(el)) { if (ob) ob.c.visible = false; return; }
      ob = objNoeud(nd);
      var p = ctx.courant().pos[id];
      ob.c.visible = true; ob.c.position.set(p.x, p.y); ob.c.scale.set(p.s); alphaDouce(ob, ob.c, alphaNoeud(el));
      if (nd.sp) majFeuille(nd, ob); else majQuestion(nd, ob);
    }

    /* ---- étiquettes des espèces ---- */
    function majEtiquette(id) {
      var o = ctx.elems[id], el = o.gE, ob = objs['e:' + id];
      if (cache(el)) { if (ob) ob.c.visible = false; return; }
      var n = niveau(el), arc = cl(el, 'dans-arc');
      var visiblePossible = n >= 2 || arc;
      if (!ob && !visiblePossible) return;
      var mode = o.modeEtiq + (arc ? '+arc' : '');
      if (!ob) { ob = objs['e:' + id] = { c: new PIXI.Container(), in: new PIXI.Container(), lignes: [] }; ob.c.addChild(ob.in); paquet('etiq', id).addChild(ob.c); }
      if (ob.mode !== mode) { // reconstruire les lignes
        ob.in.removeChildren().forEach(function (x) { x.destroy({ texture: true }); });
        ob.lignes = [];
        o.etiq.querySelectorAll('text').forEach(function (t) {
          var c = t.classList, nom = c.contains('nom') ? 'nom' : c.contains('latin') ? 'latin' : c.contains('st-txt') ? 'st-txt' : c.contains('rep-feuille') ? 'rep-feuille' : 'crit';
          var sur = null;
          if (nom === 'st-txt') sur = { fill: couleur(t.getAttribute('fill')) };
          if (nom === 'rep-feuille' && arc) sur = { fontSize: 11, fill: AMBRE };
          var tx = creerTexte(PIXI, t.textContent, styleDe(nom, sur), +t.getAttribute('x') || 0, +t.getAttribute('y') || 0, t.getAttribute('text-anchor') || 'start');
          var v = /\bv(\d)\b/.exec(t.getAttribute('class')); tx.__niv = v ? +v[1] : 0; tx.__nom = nom;
          ob.in.addChild(tx); ob.lignes.push(tx);
        });
        ob.mode = mode;
      }
      var p = ctx.courant().pos[id], te = transformation(o.etiq);
      ob.c.visible = true; ob.c.position.set(p.x, p.y); ob.c.scale.set(p.s); alphaDouce(ob, ob.c, alphaNoeud(el));
      ob.in.scale.set(te.s);
      ob.lignes.forEach(function (tx) {
        var vis = !tx.__niv || tx.__niv <= n;
        if (arc) { if (tx.__nom === 'nom' || tx.__nom === 'rep-feuille') vis = true; else vis = false; }
        tx.visible = vis;
      });
    }

    /* ---- branches ---- */
    var kBranches = 0, aFiger = false, minuterieFige = 0;
    function majArete(id) {
      var el = ctx.elems[id].arete, ob = objs['a:' + id];
      if (cache(el)) { if (ob) ob.g.visible = false; return; }
      if (!ob) { ob = objs['a:' + id] = { g: new PIXI.Graphics() }; paquet('aretes', id).addChild(ob.g); }
      var d = el.getAttribute('d'), lo = loin(), ch = cl(el, 'chemin'), k = ctx.cam().k;
      var larg = lo ? (ch ? 2.6 : 1.4) / k : +el.getAttribute('stroke-width');
      var cle = d + '|' + larg.toPrecision(2);
      if (ob.cle !== cle) {
        var v = nombres(d);
        ob.g.clear();
        if (v.length >= 8) ob.g.moveTo(v[0], v[1]).bezierCurveTo(v[2], v[3], v[4], v[5], v[6], v[7]).stroke({ width: larg, color: MENTHE, cap: 'round' });
        ob.cle = cle;
      }
      ob.g.visible = true;
      alphaDouce(ob, ob.g, (cl(el, 'estompe') ? 0.1 : cl(el, 'hors-focus') ? (lo ? 0.05 / 0.5 : 0.06 / 0.32) : 1) * (ch ? 1 : lo ? 0.5 : 0.32));
    }

    /* ---- réponses ---- */
    function majReponse(id) {
      var o = ctx.elems[id], el = o.rep, ob = objs['r:' + id];
      var cachee = cl(el, 'rep-f') || cl(el, 'rep-off') || cl(el, 'rep-en-trajet') || cache(el);
      if (cachee) { if (ob) ob.c.visible = false; return; }
      if (!ob) {
        ob = objs['r:' + id] = { c: new PIXI.Container(), b: new PIXI.Graphics(), textes: [] };
        ob.c.addChild(ob.b);
        ob.num = creerTexte(PIXI, el.querySelector('.rep-num').textContent, styleDe('rep-num'), 0, 4.5, 'middle'); ob.c.addChild(ob.num);
        ob.lignesTxt = Array.prototype.map.call(el.querySelectorAll('.rep-txt tspan'), function (ts) { return [ts.textContent, +ts.getAttribute('y')]; });
      }
      var ch = cl(el, 'chemin');
      if (ob.chemin !== ch) {
        ob.textes.forEach(function (t) { ob.c.removeChild(t); t.destroy({ texture: true }); });
        ob.textes = ob.lignesTxt.map(function (l) { var t = creerTexte(PIXI, l[0], styleDe('rep-txt', ch ? { fill: AMBRE, fontWeight: '600' } : null), 0, l[1], 'middle'); ob.c.addChild(t); return t; });
        ob.b.clear().circle(0, 0, 12).fill({ color: ch ? AMBRE : MENTHE }).stroke({ width: 3, color: NUIT });
        ob.chemin = ch;
      }
      var fond = el.parentNode === ctx.gRepsFond, couche = fond ? C.repsFond : C.reps;
      if (ob.c.parent !== couche) couche.addChild(ob.c);
      var t = transformation(el);
      ob.c.visible = true; ob.c.position.set(t.x, t.y); ob.c.scale.set(t.s);
      var a = 1;
      if (cl(el, 'rep-cachee')) a = 0;
      else if (cl(el, 'rep-arriere')) a = 0.18;
      else if (cl(el, 'rep-entrant') && cl(el, 'rep-arrivee')) a = 0;
      if (cl(el, 'estompe')) a *= 0.1; else if (cl(el, 'hors-focus')) a *= 0.06;
      var so = el.style.opacity; if (so !== '' && so != null) a *= +so;
      ob.cible = a; ob.c.alpha = ob.c.alpha == null ? a : ob.c.alpha;
      if (Math.abs(ob.c.alpha - a) > 0.01) animer.add(ob); else ob.c.alpha = a;
      ob.c.__rep = el;
    }
    var animer = new Set();

    /* ---- régions, sosies, cercle, titre, courbes ---- */
    function majRegion(id) {
      var el = ctx.elems[id].reg, ob = objs['reg:' + id];
      var vis = !cache(el) && !cl(ctx.mondeSVG, 'arc-actif') && !cl(document.body, 'en-focus');
      if (!vis) { if (ob) ob.c.visible = false; return; }
      if (!ob) { ob = objs['reg:' + id] = { c: new PIXI.Container() }; ob.c.addChild(creerTexte(PIXI, el.textContent, styleDe('region'), 0, 0, 'middle')); C.regions.addChild(ob.c); }
      var t = transformation(el), op = el.style.opacity;
      ob.c.visible = true; ob.c.position.set(t.x, t.y); ob.c.scale.set(t.s);
      ob.c.alpha = (op === '' ? 1 : +op) * (cl(el, 'hors-focus') ? 0.06 : 1);
    }
    function majSosie(k) {
      var el = ctx.elSosies[k], ob = objs['s:' + k];
      var vis = cl(el, 'actif') && !cl(el, 'estompe');
      if (!vis) { if (ob) ob.g.visible = false; return; }
      if (!ob) { ob = objs['s:' + k] = { g: new PIXI.Graphics() }; C.sosies.addChild(ob.g); }
      var d = el.getAttribute('d');
      if (ob.d !== d) {
        var v = nombres(d), pts = [];
        for (var i = 0; i <= 40; i++) { var t = i / 40, m = 1 - t; pts.push([m * m * v[0] + 2 * m * t * v[2] + t * t * v[4], m * m * v[1] + 2 * m * t * v[3] + t * t * v[5]]); }
        ob.g.clear(); courbeTiretee(ob.g, pts, 14, 12, 4.5, cl(el, 'mortel') ? 0xFF5A3C : 0xFF9F1C, 0.95);
        ob.d = d;
      }
      ob.g.visible = true;
    }
    function majCercle() {
      var el = ctx.cercleP, ob = objs.cercle || (objs.cercle = { g: new PIXI.Graphics() });
      if (!ob.g.parent) C.cercle.addChild(ob.g);
      var r = +el.getAttribute('r');
      if (cache(el) || !r) { ob.g.visible = false; return; }
      if (ob.r !== r) { ob.g.clear(); cercleTirete(ob.g, r, 2, 9, 3, GRIS, 0.7, 'round'); ob.r = r; }
      ob.g.visible = true;
    }
    function majTitre() {
      var el = ctx.titreP, ob = objs.titre || (objs.titre = { c: new PIXI.Container(), lettres: [] });
      if (!ob.c.parent) C.titre.addChild(ob.c);
      var vis = el.style.display !== 'none' && !cache(el) && !cl(ctx.mondeSVG, 'arc-actif') && el.getAttribute('data-gl');
      if (!vis) { ob.c.visible = false; return; }
      var v = nombres(el.getAttribute('data-gl')), a0 = v[0], rt = v[1], bas = v[2] === 1, fs = +el.getAttribute('font-size');
      var txt = 'CHAMPIGNONS PRINCIPAUX';
      if (!ob.lettres.length) for (var i = 0; i < txt.length; i++) { var l = creerTexte(PIXI, txt[i], styleDe('titre'), 0, 0, 'middle'); ob.lettres.push(l); ob.c.addChild(l); }
      var av = fs * 0.6 + fs * 0.3, L = av * txt.length, sens = bas ? -1 : 1;
      var debut = a0 - sens * (L / 2 - av / 2) / rt;
      ob.lettres.forEach(function (l, i) {
        var a = debut + sens * (i * av) / rt;
        l.scale.set(fs / 15); l.rotation = a + sens * Math.PI / 2;
        // la ligne de base suit l'arc : on décale le texte vers l'intérieur de sa hauteur de base
        l.position.set(Math.cos(a) * rt, Math.sin(a) * rt);
        l.anchor.set(0.5, bas ? 0.25 : 0.8);
      });
      ob.c.visible = true;
    }
    var kCourbes = 0;
    function majCourbes(forcer) {
      var ob = objs.courbes || (objs.courbes = { g: new PIXI.Graphics() });
      if (!ob.g.parent) C.courbes.addChild(ob.g);
      var k = ctx.cam().k;
      if (!forcer && kCourbes && Math.abs(Math.log(k / kCourbes)) < 0.25) return;
      kCourbes = k;
      ob.g.clear();
      ctx.gCourbes.querySelectorAll('path').forEach(function (p) {
        var v = nombres(p.getAttribute('d'));
        if (v.length < 4) return;
        ob.g.moveTo(v[0], v[1]); for (var i = 2; i < v.length; i += 2) ob.g.lineTo(v[i], v[i + 1]);
        ob.g.closePath().stroke({ width: 1.2 / k, color: MENTHE, alpha: p.classList.contains('maitresse') ? 0.15 : 0.06 });
      });
    }

    /* ---- netteté des textes : résolution selon le zoom, recalculée quand la caméra s'arrête ---- */
    // Les textes sont préparés une marche au-dessus de leur taille à l'écran : un zoom avant jusqu'à ×2 reste net.
    // Pendant un geste, on les met à jour peu à peu (quelques-uns par image) ; à l'arrêt, tous d'un coup.
    var minuterieNet = 0, dernierNet = 0;
    function ajusterNettete(budget) {
      var dpr = resCible(), n = 0, reste = false;
      dernierNet = performance.now();
      var T = ctx.taille();
      (function visiter(o) {
        if (!o.visible || reste) return;
        if (o instanceof PIXI.Text) {
          var wt = o.worldTransform, sx = wt.tx, sy = wt.ty;
          if (sx < -T.w || sx > 2 * T.w || sy < -T.h || sy > 2 * T.h) return; // hors de l'écran : inutile
          var s = Math.hypot(wt.a, wt.b); // échelle écran du texte (y compris s'il est tourné)
          var r = Math.pow(2, Math.ceil(Math.log2(Math.max(0.25, Math.min(8, s * dpr * 1.25)))));
          if (o.resolution !== r && (!o.__resMax || r <= o.__resMax)) {
            if (budget && n >= budget) { reste = true; return; }
            o.resolution = r; n++;
          }
        } else if (o.children) o.children.forEach(visiter);
      })(monde);
      if (n) demander();
      return reste;
    }

    /* ---- boucle de dessin ---- */
    function dessiner() {
      rafId = 0;
      if (!sale && !animer.size && !fondus.size) return;
      sale = false;
      var cam = ctx.cam();
      monde.position.set(cam.x, cam.y); monde.scale.set(cam.k);
      if (tout) {
        tout = false;
        ctx.noeuds.forEach(function (nd) { aMettreAJour.add('g:' + nd.id); if (nd.sp) aMettreAJour.add('e:' + nd.id); if (nd.parent) { aMettreAJour.add('a:' + nd.id); aMettreAJour.add('r:' + nd.id); } if (ctx.elems[nd.id].reg) aMettreAJour.add('reg:' + nd.id); });
        ctx.paires.forEach(function (p) { aMettreAJour.add('s:' + p.cle); });
        aMettreAJour.add('cercle'); aMettreAJour.add('titre'); majCourbes(true);
      }
      // en vue lointaine, l'épaisseur des branches suit le zoom (trait fin constant à l'écran)
      // Pendant un trajet animé, épaisseur des branches et courbes de niveau restent figées (les recalculer renvoie
      // des centaines de Ko à la carte graphique) : elles sont mises à jour à l'arrivée.
      var vol = ctx.enVol && ctx.enVol();
      if (vol) aFiger = true;
      else {
        if (aFiger) { aFiger = false; minuterieFige = setTimeout(demander, 0); }
        if (loin() && (!kBranches || Math.abs(Math.log(cam.k / kBranches)) > 0.2)) { kBranches = cam.k; ctx.noeuds.forEach(function (nd) { if (nd.parent) aMettreAJour.add('a:' + nd.id); }); }
        else if (!loin() && kBranches) { kBranches = 0; ctx.noeuds.forEach(function (nd) { if (nd.parent) aMettreAJour.add('a:' + nd.id); }); }
        majCourbes(false);
      }
      aMettreAJour.forEach(function (k) {
        var i = k.indexOf(':'), t = i < 0 ? k : k.slice(0, i), id = i < 0 ? null : k.slice(i + 1);
        if (t === 'g') majNoeud(id); else if (t === 'e') majEtiquette(id); else if (t === 'a') majArete(id); else if (t === 'r') majReponse(id);
        else if (t === 'reg') majRegion(id); else if (t === 's') majSosie(id); else if (t === 'cercle') majCercle(); else if (t === 'titre') majTitre();
        else if (t === 'courbes') majCourbes(true);
      });
      aMettreAJour.clear();
      animer.forEach(function (ob) { // fondus des réponses
        var d = ob.cible - ob.c.alpha; ob.c.alpha += d * 0.25;
        if (Math.abs(d) < 0.01) { ob.c.alpha = ob.cible; animer.delete(ob); }
      });
      fondus.forEach(function (a, d) { var x = a - d.alpha; d.alpha += x * 0.22; if (Math.abs(x) < 0.01) { d.alpha = a; fondus.delete(d); } });
      app.render();
      if (animer.size || fondus.size) demander();
      clearTimeout(minuterieNet);
      // pendant un geste : quelques textes affinés par image ; pendant un trajet animé : aucun (ré-rasteriser du texte
      // et l'envoyer à la carte graphique coûte cher sur téléphone) — tout est affiné à l'arrivée
      if (!(ctx.enVol && ctx.enVol()) && performance.now() - dernierNet > 200 && ajusterNettete(12)) demander();
      minuterieNet = setTimeout(function affiner() { // à l'arrêt : tous, par lots de 20 (pas de pic)
        if (ajusterNettete(20)) { demander(); minuterieNet = setTimeout(affiner, 16); }
      }, 140);
    }

    /* ---- désignation au doigt : quel élément est sous le point (x, y) ? ---- */
    function designer(clientX, clientY) {
      var T = ctx.taille(), cam = ctx.cam(), wx = (clientX - T.l - cam.x) / cam.k, wy = (clientY - T.t - cam.y) / cam.k, res = null;
      // 1. réponses au premier plan
      C.reps.children.slice().reverse().some(function (c) {
        if (!c.visible || c.alpha < 0.3 || !c.__rep) return false;
        var o = ctx.elems[c.__rep.getAttribute('data-rep')], s = c.scale.x, dx = wx - c.x, dy = wy - c.y;
        if (Math.hypot(dx, dy) < 18 * s || (Math.abs(dx) < (o.repW / 2 + 4) * s && dy > -15 * s && dy < (o.repBas + 4) * s)) { res = { rep: c.__rep }; return true; }
        return false;
      });
      if (res) return res;
      // 2. boutons « ? » et cartes de question
      var qs = C.questions.children.slice().reverse();
      for (var i = 0; i < qs.length && !res; i++) {
        var c = qs[i]; if (!c.visible) continue;
        var nd = null; for (var k in objs) if (objs[k].c === c && k.indexOf('g:') === 0) { nd = k.slice(2); break; }
        if (!nd) continue;
        var ob = objs['g:' + nd], s = c.scale.x, lx = (wx - c.x) / s, ly = (wy - c.y) / s, b = ctx.elems[nd].boite;
        if (ob.carte && ob.carte.visible) {
          if (ob.aide && Math.hypot(lx - ob.aide.x, ly - ob.aide.y) < 20) res = { aide: ob.aide.el };
          else if (b && lx > b.x0 && lx < b.x1 && ly > b.y0 && ly < b.y1) res = { cible: ctx.elems[nd].g };
        } else if (Math.hypot(lx, ly) < 16) res = { cible: ctx.elems[nd].g };
      }
      if (res) return res;
      // 3. espèces (disque, puis étiquette)
      var meilleur = null, dmin = Infinity;
      ctx.noeuds.forEach(function (nd) {
        if (!nd.sp) return;
        var ob = objs['g:' + nd.id]; if (!ob || !ob.c.visible) return;
        var s = ob.c.scale.x, n = niveau(ctx.elems[nd.id].g), r = (n === 0 && !cl(ctx.elems[nd.id].g, 'dans-arc') ? 72 : 52) * s;
        var d = Math.hypot(wx - ob.c.x, wy - ob.c.y);
        if (d < r && d < dmin) { dmin = d; meilleur = nd; }
        var oe = objs['e:' + nd.id];
        if (!meilleur && oe && oe.c.visible) { var bb = oe.c.getBounds(); var sx = clientX - T.l, sy = clientY - T.t; if (sx > bb.x && sx < bb.x + bb.width && sy > bb.y && sy < bb.y + bb.height) meilleur = nd; }
      });
      if (meilleur) return { cible: ctx.elems[meilleur.id].g };
      return null;
    }

    /* ---- démarrage ---- */
    var toile = null;
    // Mode économie : carte calculée en 1,25x au lieu de 2x (environ 2,5 fois moins de pixels), fondus coupés
    var eco = ctx.eco ? +ctx.eco() || 0 : 0; // 0 haute, 1 économie
    function resCible() { return Math.min(window.devicePixelRatio || 1, eco ? 1.25 : 2); }
    function prechauffer() {}
    var GL = {
      actif: function () { return pret; },
      _debug: function () { return { objs: objs, C: C, monde: monde }; },
      // Préchargement en arrière-plan : toutes les photos des espèces et toutes les cartes de questions sont créées
      // et envoyées à la carte graphique pendant que la carte est au repos, par petits lots. Ainsi, une transition
      // vers une zone jamais vue n'a plus rien à fabriquer (c'était la cause des saccades « de temps en temps »).
      prechauffer: function () {
        if (prechauffer.fait) return;
        if (!pret) { setTimeout(GL.prechauffer, 500); return; }
        prechauffer.fait = true;
        var file = ctx.noeuds.slice(), chauffe = new PIXI.Container(); chauffe.alpha = 0.01; chauffe.scale.set(0.01); app.stage.addChild(chauffe);
        function lot() {
          if (ctx.enVol && ctx.enVol()) { setTimeout(lot, 300); return; } // jamais pendant un trajet
          var t0 = performance.now();
          while (file.length && performance.now() - t0 < 6) {
            var nd = file.shift(), neuf = !objs['g:' + nd.id], ob = objNoeud(nd);
            if (neuf) { ob.c.visible = false; aMettreAJour.add('g:' + nd.id); } // placé et affiché par la mise à jour normale
            if (nd.sp) {
              var t = photoDe(nd);
              if (t) { var sp = new PIXI.Sprite(t); sp.width = sp.height = 4; chauffe.addChild(sp); } // un rendu = texture envoyée
              else if ((nd.__essais = (nd.__essais || 0) + 1) < 40) file.push(nd); // photo pas encore décodée : on repassera
            } else if (!ob.carte) { construireCarteQ(nd, ob); ob.carte.visible = false; }
          }
          sale = true; demander();
          setTimeout(function () { chauffe.removeChildren().forEach(function (x) { x.destroy(); }); if (file.length) setTimeout(lot, 60); else { chauffe.destroy(); } }, 50);
        }
        lot();
      },
      // Trait des sosies dévoilé par un cercle qui grandit depuis l'espèce (seul le masque change à chaque image)
      masqueSosies: function (cx, cy, r) {
        if (r == null) { if (C.sosies.mask) { var m0 = C.sosies.mask; C.sosies.mask = null; m0.destroy(); } demander(); return; }
        if (!C.sosies.mask) { var g = new PIXI.Graphics(); g.circle(0, 0, 1).fill(0xffffff); monde.addChild(g); C.sosies.mask = g; }
        C.sosies.mask.position.set(cx, cy); C.sosies.mask.scale.set(Math.max(0.001, r)); sale = true; demander();
      },
      regler: function (e) {
        eco = +e || 0; if (!pret) return;
        app.renderer.resize(ctx.zoneCarte.clientWidth, ctx.zoneCarte.clientHeight, resCible());
        tout = true; ajusterNettete(0); demander();
      },

      designer: designer,
      demander: demander,
      app: app
    };
    var badgesSVG = ctx.badgesSVG();
    Promise.all([
      app.init({ backgroundAlpha: 0, antialias: (window.devicePixelRatio || 1) < 2, autoDensity: true, resolution: resCible(), // écrans très denses : 2x suffit (1,25x en mode économie), sans lissage MSAA
        resizeTo: ctx.zoneCarte, autoStart: false, preference: 'webgl' }),
      document.fonts ? Promise.all(["italic 400 16px 'Literata'", "400 16px 'Literata'", "400 16px 'IBM Plex Mono'", "500 16px 'IBM Plex Mono'", "600 16px 'IBM Plex Mono'"].map(function (f) { return document.fonts.load(f); })) : null
    ].concat(Object.keys(badgesSVG.statuts).map(function (s) {
      return svgVersImage(badgesSVG.statuts[s], '-1 -1 26 26').then(function (im) { tex.badges[s] = textureImage(PIXI, im, 96); });
    })).concat([
      svgVersImage(badgesSVG.prec, '-12 -12 24 24').then(function (im) { tex.prec = textureImage(PIXI, im, 72); }),
      svgVersImage(badgesSVG.etoile, '-13 -13 26 26').then(function (im) { tex.etoile = textureImage(PIXI, im, 72); })
    ])).then(function () {
      app.ticker.stop();
      app.stage.addChild(monde);
      toile = app.canvas; toile.id = 'carte-gl'; toile.setAttribute('aria-hidden', 'true');
      ctx.zoneCarte.insertBefore(toile, ctx.zoneCarte.firstChild);
      app.renderer.on && app.renderer.on('resize', demander);
      window.addEventListener('resize', demander);
      document.body.classList.add('mode-gl');
      pret = true; tout = true;
      if (ctx.surPret) ctx.surPret();
      demander();
    }).catch(function (err) { console.warn('Rendu WebGL indisponible, carte SVG conservée :', err); });
    return GL;
  };
})();
