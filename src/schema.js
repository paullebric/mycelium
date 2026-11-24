/* Dessin de schémas SVG de champignons à partir de leurs caractères.
   Tout est généré dans une boîte 0..100 x 0..100 (sol à y = 90).
   Aucune image externe : uniquement des formes vectorielles. */
var Schema = (function () {
  'use strict';

  function f(n) { return Math.round(n * 10) / 10; }
  function esc(c) { return c || '#ccc'; }
  // Assombrit / éclaircit une couleur hexadécimale
  function teinte(hex, k) {
    var c = (hex || '#999999').replace('#', '');
    if (c.length === 3) c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
    var r = parseInt(c.substr(0, 2), 16), g = parseInt(c.substr(2, 2), 16), b = parseInt(c.substr(4, 2), 16);
    function m(v) { v = k < 0 ? v * (1 + k) : v + (255 - v) * k; return Math.max(0, Math.min(255, Math.round(v))); }
    return '#' + [m(r), m(g), m(b)].map(function (v) { return (v < 16 ? '0' : '') + v.toString(16); }).join('');
  }
  // Générateur pseudo-aléatoire déterministe (pour que le dessin soit stable)
  function rng(seed) {
    var s = 0;
    for (var i = 0; i < seed.length; i++) s = (s * 31 + seed.charCodeAt(i)) >>> 0;
    return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }
  var TRAIT = ' stroke="#3b2f25" stroke-width="0.9" stroke-linejoin="round"';

  /* ---------- Chapeaux : renvoie {d, bas, gauche, droite, haut} ---------- */
  function chapeau(forme, cx, base, R) {
    var L = cx - R, Rr = cx + R, d;
    switch (forme) {
      case 'plat':
        d = 'M' + L + ' ' + base + 'C' + L + ' ' + (base - R * .38) + ' ' + (cx - R * .6) + ' ' + (base - R * .5) + ' ' + cx + ' ' + (base - R * .5) + 'C' + (cx + R * .6) + ' ' + (base - R * .5) + ' ' + Rr + ' ' + (base - R * .38) + ' ' + Rr + ' ' + base + 'Z';
        return { d: d, haut: base - R * .5 };
      case 'mamelon':
        d = 'M' + L + ' ' + base + 'C' + L + ' ' + (base - R * .4) + ' ' + (cx - R * .5) + ' ' + (base - R * .5) + ' ' + (cx - R * .25) + ' ' + (base - R * .55) +
          'C' + (cx - R * .2) + ' ' + (base - R * .8) + ' ' + (cx + R * .2) + ' ' + (base - R * .8) + ' ' + (cx + R * .25) + ' ' + (base - R * .55) +
          'C' + (cx + R * .5) + ' ' + (base - R * .5) + ' ' + Rr + ' ' + (base - R * .4) + ' ' + Rr + ' ' + base + 'Z';
        return { d: d, haut: base - R * .75 };
      case 'conique':
        d = 'M' + L + ' ' + base + 'C' + (L + R * .2) + ' ' + (base - R * .3) + ' ' + (cx - R * .25) + ' ' + (base - R * 1.1) + ' ' + cx + ' ' + (base - R * 1.15) +
          'C' + (cx + R * .25) + ' ' + (base - R * 1.1) + ' ' + (Rr - R * .2) + ' ' + (base - R * .3) + ' ' + Rr + ' ' + base + 'Z';
        return { d: d, haut: base - R * 1.15 };
      case 'cloche':
        d = 'M' + (L + R * .12) + ' ' + base + 'C' + (L) + ' ' + (base - R * .7) + ' ' + (cx - R * .6) + ' ' + (base - R * 1.05) + ' ' + cx + ' ' + (base - R * 1.05) +
          'C' + (cx + R * .6) + ' ' + (base - R * 1.05) + ' ' + Rr + ' ' + (base - R * .7) + ' ' + (Rr - R * .12) + ' ' + base + 'Z';
        return { d: d, haut: base - R * 1.05 };
      case 'cylindre':
        d = 'M' + (cx - R * .55) + ' ' + (base + R * .5) + 'C' + (cx - R * .6) + ' ' + (base - R * .6) + ' ' + (cx - R * .45) + ' ' + (base - R * 1.25) + ' ' + cx + ' ' + (base - R * 1.3) +
          'C' + (cx + R * .45) + ' ' + (base - R * 1.25) + ' ' + (cx + R * .6) + ' ' + (base - R * .6) + ' ' + (cx + R * .55) + ' ' + (base + R * .5) + 'Z';
        return { d: d, haut: base - R * 1.3, cylindre: true };
      case 'entonnoir':
        d = 'M' + L + ' ' + (base - R * .55) + 'C' + (cx - R * .5) + ' ' + (base - R * .3) + ' ' + (cx + R * .5) + ' ' + (base - R * .3) + ' ' + Rr + ' ' + (base - R * .55) +
          'C' + (Rr - R * .15) + ' ' + (base - R * .2) + ' ' + (cx + R * .3) + ' ' + (base) + ' ' + (cx + R * .2) + ' ' + (base + R * .15) +
          'L' + (cx - R * .2) + ' ' + (base + R * .15) + 'C' + (cx - R * .3) + ' ' + base + ' ' + (L + R * .15) + ' ' + (base - R * .2) + ' ' + L + ' ' + (base - R * .55) + 'Z';
        return { d: d, haut: base - R * .55, entonnoir: true };
      case 'bombe': // bolets : chapeau épais en coussin
        d = 'M' + L + ' ' + base + 'C' + (L - R * .05) + ' ' + (base - R * .75) + ' ' + (cx - R * .6) + ' ' + (base - R * .9) + ' ' + cx + ' ' + (base - R * .9) +
          'C' + (cx + R * .6) + ' ' + (base - R * .9) + ' ' + (Rr + R * .05) + ' ' + (base - R * .75) + ' ' + Rr + ' ' + base + 'Z';
        return { d: d, haut: base - R * .9 };
      default: // convexe
        d = 'M' + L + ' ' + base + 'C' + L + ' ' + (base - R * .62) + ' ' + (cx - R * .55) + ' ' + (base - R * .82) + ' ' + cx + ' ' + (base - R * .82) +
          'C' + (cx + R * .55) + ' ' + (base - R * .82) + ' ' + Rr + ' ' + (base - R * .62) + ' ' + Rr + ' ' + base + 'Z';
        return { d: d, haut: base - R * .82 };
    }
  }

  /* ---------- Ornements du chapeau (verrues, écailles...) ---------- */
  function ornements(s, cx, base, R, haut, rnd, clipId) {
    var o = s.ornement, out = '', i, x, y, c2 = esc(s.chapeau2 || '#ffffff');
    if (!o) return '';
    var n = o === 'verrues' ? 11 : o === 'plaques' ? 5 : o === 'craquele' ? 12 : 16;
    for (i = 0; i < n; i++) {
      x = cx - R * .85 + rnd() * R * 1.7;
      var ymin = haut + 2, ymax = base - 3;
      y = ymin + rnd() * (ymax - ymin);
      if (o === 'verrues') out += '<circle cx="' + f(x) + '" cy="' + f(y) + '" r="' + f(1.4 + rnd() * 1.6) + '" fill="' + c2 + '" stroke="#00000033" stroke-width=".4"/>';
      else if (o === 'plaques') out += '<ellipse cx="' + f(x) + '" cy="' + f(y) + '" rx="' + f(3 + rnd() * 3) + '" ry="' + f(1.6 + rnd() * 1.4) + '" fill="' + c2 + '" opacity=".9"/>';
      else if (o === 'ecailles') out += '<path d="M' + f(x - 2) + ' ' + f(y) + 'q2 -2.4 4 0" fill="none" stroke="' + c2 + '" stroke-width="1.5" stroke-linecap="round"/>';
      else if (o === 'meches') out += '<path d="M' + f(x) + ' ' + f(y) + 'l' + f((x - cx) * .08) + ' 2.5" stroke="' + c2 + '" stroke-width="1.6" stroke-linecap="round"/>';
      else if (o === 'craquele') out += '<path d="M' + f(x - 2.5) + ' ' + f(y) + 'l2 -1.5l2.5 1l-.8 2l-2.6 .4z" fill="' + c2 + '" opacity=".75"/>';
      else if (o === 'fibrilles') out += '<path d="M' + f(cx + (x - cx) * .2) + ' ' + f(haut + 3) + 'L' + f(x) + ' ' + f(base - 1) + '" stroke="' + c2 + '" stroke-width=".7" opacity=".8"/>';
    }
    if (o === 'zones') {
      for (i = 1; i <= 3; i++) out += '<ellipse cx="' + cx + '" cy="' + f(base - 2) + '" rx="' + f(R * i / 3.6) + '" ry="' + f(R * i / 9) + '" fill="none" stroke="' + c2 + '" stroke-width="1.6" stroke-dasharray="2 1.5"/>';
    }
    if (o === 'disque') out += '<ellipse cx="' + cx + '" cy="' + f(haut + 3) + '" rx="' + f(R * .35) + '" ry="3" fill="' + c2 + '"/>';
    return '<g clip-path="url(#' + clipId + ')">' + out + '</g>';
  }

  /* ---------- Un champignon à chapeau + pied ---------- */
  function agaric(s, rnd, uid, ox, sc) {
    var cx = 50, sol = 90, R = 26 * (s.largeur || 1), w = 5 * (s.epaisseur || 1);
    var forme = s.forme || 'convexe';
    var base = sol - 42 * (s.hauteur || 1);
    var g = '';
    var excentre = s.excentre ? R * .55 : 0;
    // Pied
    var pc = esc(s.pied), pt = base + 3, pd;
    var pf = s.pied_forme || 'normal';
    if (pf === 'ventru') pd = 'M' + (cx - w) + ' ' + pt + 'C' + (cx - w * 2.4) + ' ' + (pt + 18) + ' ' + (cx - w * 2.6) + ' ' + (sol - 4) + ' ' + (cx - w * 1.3) + ' ' + sol + 'L' + (cx + w * 1.3) + ' ' + sol + 'C' + (cx + w * 2.6) + ' ' + (sol - 4) + ' ' + (cx + w * 2.4) + ' ' + (pt + 18) + ' ' + (cx + w) + ' ' + pt + 'Z';
    else if (pf === 'bulbeux') pd = 'M' + (cx - w * .8) + ' ' + pt + 'L' + (cx - w * .9) + ' ' + (sol - 9) + 'C' + (cx - w * 2.2) + ' ' + (sol - 6) + ' ' + (cx - w * 2) + ' ' + sol + ' ' + cx + ' ' + sol + 'C' + (cx + w * 2) + ' ' + sol + ' ' + (cx + w * 2.2) + ' ' + (sol - 6) + ' ' + (cx + w * .9) + ' ' + (sol - 9) + 'L' + (cx + w * .8) + ' ' + pt + 'Z';
    else if (pf === 'radicant') pd = 'M' + (cx - w) + ' ' + pt + 'L' + (cx - w * .7) + ' ' + sol + 'L' + (cx + w * .7) + ' ' + sol + 'L' + (cx + w) + ' ' + pt + 'Z';
    else if (pf === 'attenue') pd = 'M' + (cx - w * 1.2) + ' ' + pt + 'C' + (cx - w) + ' ' + (pt + 20) + ' ' + (cx - w * .5) + ' ' + (sol - 6) + ' ' + (cx - w * .45) + ' ' + sol + 'L' + (cx + w * .45) + ' ' + sol + 'C' + (cx + w * .5) + ' ' + (sol - 6) + ' ' + (cx + w) + ' ' + (pt + 20) + ' ' + (cx + w * 1.2) + ' ' + pt + 'Z';
    else pd = 'M' + (cx - w * .9) + ' ' + pt + 'L' + (cx - w * 1.05) + ' ' + sol + 'L' + (cx + w * 1.05) + ' ' + sol + 'L' + (cx + w * .9) + ' ' + pt + 'Z';
    g += '<path d="' + pd + '" fill="' + pc + '"' + TRAIT + '/>';
    // Motifs du pied
    var pid = uid + 'p';
    var motif = '';
    if (s.chine) for (var i = 0; i < 7; i++) { var yy = pt + 6 + i * ((sol - pt - 8) / 7); motif += '<path d="M' + (cx - w * 2) + ' ' + f(yy) + 'q' + w + ' 1.5 ' + (w * 4) + ' 0" stroke="' + esc(s.chine) + '" stroke-width="1.3" fill="none"/>'; }
    if (s.reticule) for (var j = 0; j < 9; j++) { var y2 = pt + 4 + j * ((sol - pt - 4) / 9); motif += '<path d="M' + (cx - w * 3) + ' ' + f(y2) + 'l' + (w * 6) + ' 4M' + (cx - w * 3) + ' ' + f(y2 + 4) + 'l' + (w * 6) + ' -4" stroke="' + esc(s.reticule) + '" stroke-width=".7" fill="none"/>'; }
    if (s.scabres || s.ponctue) for (var k = 0; k < 26; k++) motif += '<circle cx="' + f(cx - w * 2 + rnd() * w * 4) + '" cy="' + f(pt + 3 + rnd() * (sol - pt - 4)) + '" r="' + (s.ponctue ? .7 : .9) + '" fill="' + esc(s.scabres || s.ponctue) + '"/>';
    if (s.bracelets) for (var b = 0; b < 3; b++) motif += '<path d="M' + (cx - w * 1.5) + ' ' + f(pt + 14 + b * 9) + 'q' + (w * 1.5) + ' 2 ' + (w * 3) + ' 0" stroke="' + esc(s.bracelets) + '" stroke-width="1.4" fill="none"/>';
    if (motif) g += '<clipPath id="' + pid + '"><path d="' + pd + '"/></clipPath><g clip-path="url(#' + pid + ')">' + motif + '</g>';
    // Volve
    if (s.volve === 'sac') g += '<path d="M' + (cx - w * 1.9) + ' ' + sol + 'C' + (cx - w * 2.4) + ' ' + (sol - 6) + ' ' + (cx - w * 2) + ' ' + (sol - 10) + ' ' + (cx - w * 1.5) + ' ' + (sol - 12) + 'l1.5 2.5l1.2 -3.2L' + (cx - w * .6) + ' ' + (sol - 6) + 'L' + (cx + w * .6) + ' ' + (sol - 6) + 'l1.2 -4.5l1.4 3.6l1.2 -3.4C' + (cx + w * 2.2) + ' ' + (sol - 9) + ' ' + (cx + w * 2.4) + ' ' + (sol - 5) + ' ' + (cx + w * 1.9) + ' ' + sol + 'Z" fill="' + esc(s.volve_couleur || '#f4f1e6') + '"' + TRAIT + '/>';
    else if (s.volve === 'bulbe' || s.volve === 'bourrelets' || s.volve === 'marge') {
      g += '<ellipse cx="' + cx + '" cy="' + (sol - 4.5) + '" rx="' + f(w * 1.9) + '" ry="5.5" fill="' + pc + '"' + TRAIT + '/>';
      if (s.volve === 'bourrelets') for (var v = 0; v < 3; v++) g += '<path d="M' + f(cx - w * 1.6 + v * .5) + ' ' + (sol - 7 - v * 3.2) + 'q' + f(w * 1.6) + ' 2.4 ' + f(w * 3.2 - v) + ' 0" stroke="#f4f1e6" stroke-width="1.6" fill="none"/>';
      if (s.volve === 'marge') g += '<path d="M' + f(cx - w * 2) + ' ' + (sol - 6) + 'q' + f(w * 2) + ' 3.5 ' + f(w * 4) + ' 0" stroke="#f4f1e6" stroke-width="2" fill="none"/>';
    }
    // Lames / tubes sous le chapeau
    var c = chapeau(forme, cx + excentre, base, R);
    var hy = esc(s.hymenium || '#efe9da');
    if (!c.cylindre) {
      var Lx = cx + excentre - R, Rx = cx + excentre + R;
      var ep = s.type === 'bolet' ? 7 : 4.5;
      var dec = s.decurrent ? 9 : 0;
      if (c.entonnoir) { Lx = cx - R * .2; Rx = cx + R * .2; }
      var hd = 'M' + Lx + ' ' + base + 'C' + (Lx + R * .3) + ' ' + (base + ep) + ' ' + (cx - w * 1.5) + ' ' + (base + ep) + ' ' + (cx - w * .9) + ' ' + (pt + 1 + dec) +
        'L' + (cx + w * .9) + ' ' + (pt + 1 + dec) + 'C' + (cx + w * 1.5) + ' ' + (base + ep) + ' ' + (Rx - R * .3) + ' ' + (base + ep) + ' ' + Rx + ' ' + base + 'Z';
      if (!c.entonnoir) {
        g += '<path d="' + hd + '" fill="' + hy + '"' + TRAIT + '/>';
        var lines = '';
        if (s.type === 'bolet') {
          for (var t = 0; t < 22; t++) lines += '<circle cx="' + f(Lx + 3 + t * (Rx - Lx - 6) / 21) + '" cy="' + f(base + 1.6 + (t % 2)) + '" r=".7" fill="' + teinte(hy, -.35) + '"/>';
        } else if (s.type === 'hydne') {
          for (var a = 0; a < 15; a++) { var xx = Lx + 3 + a * (Rx - Lx - 6) / 14; if (Math.abs(xx - cx) < w) continue; lines += '<path d="M' + f(xx - 1.2) + ' ' + f(base + 1) + 'l1.2 4.5l1.2 -4.5z" fill="' + teinte(hy, -.15) + '"/>'; }
        } else {
          for (var l = 0; l < 13; l++) { var xl = Lx + 2 + l * (Rx - Lx - 4) / 12; if (Math.abs(xl - cx) < w * .9) continue; lines += '<path d="M' + f(xl) + ' ' + f(base + .5) + 'L' + f(cx + (xl - cx) * .45) + ' ' + f(base + ep * .85) + '" stroke="' + teinte(hy, -.3) + '" stroke-width=".6"/>'; }
        }
        g += lines;
      } else {
        // entonnoir : lames décurrentes visibles sous le bord
        g += '<path d="M' + (cx - R) + ' ' + (base - R * .55) + 'C' + (cx - R * .6) + ' ' + (base - R * .1) + ' ' + (cx - w) + ' ' + (base + 2) + ' ' + (cx - w * .8) + ' ' + (base + 12) + 'L' + (cx + w * .8) + ' ' + (base + 12) + 'C' + (cx + w) + ' ' + (base + 2) + ' ' + (cx + R * .6) + ' ' + (base - R * .1) + ' ' + (cx + R) + ' ' + (base - R * .55) + 'Z" fill="' + hy + '"' + TRAIT + '/>';
        for (var p = 0; p < 9; p++) { var xp = cx - R * .9 + p * R * 1.8 / 8; g += '<path d="M' + f(xp) + ' ' + f(base - R * .45) + 'Q' + f(cx + (xp - cx) * .4) + ' ' + f(base) + ' ' + f(cx + (xp - cx) * .12) + ' ' + f(base + 11) + '" stroke="' + teinte(hy, -.3) + '" stroke-width=".7" fill="none"/>'; }
      }
    }
    // Anneau
    if (s.anneau) {
      var ay = pt + 7 + (s.anneau_bas ? 10 : 0);
      g += '<path d="M' + (cx - w * 1.1) + ' ' + ay + 'L' + (cx - w * 2) + ' ' + (ay + 5) + 'Q' + cx + ' ' + (ay + 8) + ' ' + (cx + w * 2) + ' ' + (ay + 5) + 'L' + (cx + w * 1.1) + ' ' + ay + 'Z" fill="' + esc(s.anneau_couleur || '#f6f2e8') + '"' + TRAIT + '/>';
    }
    // Chapeau
    var cid = uid + 'c';
    g += '<path d="' + c.d + '" fill="' + esc(s.chapeau) + '"' + TRAIT + '/>';
    g += '<clipPath id="' + cid + '"><path d="' + c.d + '"/></clipPath>';
    g += ornements(s, cx + excentre, base, R, c.haut, rnd, cid);
    if (c.cylindre && s.ornement === 'meches') { /* déjà dessiné */ }
    // reflet
    g += '<path d="M' + f(cx + excentre - R * .5) + ' ' + f(c.haut + (base - c.haut) * .45) + 'Q' + f(cx + excentre - R * .35) + ' ' + f(c.haut + 3) + ' ' + f(cx + excentre - R * .05) + ' ' + f(c.haut + 2.2) + '" stroke="#ffffff" stroke-opacity=".45" stroke-width="1.6" fill="none" stroke-linecap="round"/>';
    return '<g transform="translate(' + ox + ' 0) translate(50 90) scale(' + sc + ') translate(-50 -90)">' + g + '</g>';
  }

  function sol(s) {
    var g = '';
    if (s.bois) g += '<path d="M2 86 Q50 80 98 86 L98 97 Q50 93 2 97Z" fill="#8a6a4b" stroke="#5a4330" stroke-width=".8"/><path d="M10 89 q12 -2 24 0 M50 90 q14 -2 30 0" stroke="#5a4330" stroke-width=".6" fill="none"/>';
    else g += '<path d="M4 90.5 Q50 88 96 90.5" stroke="#8b7b5e" stroke-width="1.2" fill="none" stroke-linecap="round"/>';
    if (s.herbe) g += '<path d="M8 91 l2 -7 l1 7 l2 -9 l1 9 M84 91 l2 -8 l1 8 l2 -6 l1 6" stroke="#6f9a4a" stroke-width="1" fill="none"/>';
    if (s.aiguilles) g += '<path d="M14 92 l9 -1.5 M18 93 l8 1 M74 92 l9 -1 M78 93.5 l7 -1.6" stroke="#7a5a2e" stroke-width=".8"/>';
    if (s.feuilles) g += '<path d="M10 92 q5 -4 10 0 q-5 3 -10 0z M76 92 q6 -4 12 0 q-6 3 -12 0z" fill="#b5803a" opacity=".8"/>';
    return g;
  }

  /* ---------- Formes particulières ---------- */
  function morille(s, rnd, uid) {
    var hc = esc(s.chapeau), g = '', conique = s.forme === 'conique';
    g += '<path d="M42 90 L43 58 L57 58 L58 90 Z" fill="' + esc(s.pied || '#efe4cc') + '"' + TRAIT + '/>';
    var d = conique ? 'M36 62 C34 44 42 14 50 10 C58 14 66 44 64 62 Z' : 'M34 62 C30 40 38 16 50 16 C62 16 70 40 66 62 Z';
    g += '<path d="' + d + '" fill="' + teinte(hc, -.45) + '"' + TRAIT + '/><clipPath id="' + uid + 'mo"><path d="' + d + '"/></clipPath><g clip-path="url(#' + uid + 'mo)">';
    for (var r = 0; r < 8; r++) for (var c = 0; c < 6; c++) {
      var x = 32 + c * 6.5 + (r % 2) * 3.2, y = 14 + r * 6.4;
      g += '<rect x="' + f(x) + '" y="' + f(y) + '" width="4.4" height="' + (conique ? 5.2 : 4.4) + '" rx="1.6" fill="' + hc + '"/>';
    }
    return g + '</g>';
  }
  function gyromitre(s) {
    var c = esc(s.chapeau), g = '<path d="M44 90 L45 60 L55 60 L56 90Z" fill="' + esc(s.pied || '#efe4cc') + '"' + TRAIT + '/>';
    var lobes = [[38, 50, 11], [52, 44, 13], [63, 54, 10], [46, 58, 10], [58, 60, 9]];
    lobes.forEach(function (l) { g += '<circle cx="' + l[0] + '" cy="' + l[1] + '" r="' + l[2] + '" fill="' + c + '"' + TRAIT + '/>'; });
    g += '<path d="M32 50 q4 -6 8 0 q4 6 8 -2 q4 -8 8 0 q4 6 8 -2 M36 58 q4 -4 8 1 q5 4 9 -2 q4 -5 9 1 M44 40 q4 -5 8 0 q4 4 8 -1" stroke="' + teinte(c, -.45) + '" stroke-width="1.3" fill="none"/>';
    return g;
  }
  function helvelle(s) {
    var g = '<path d="M41 90 L43 50 L57 50 L59 90Z" fill="' + esc(s.pied || '#f0ebe0') + '"' + TRAIT + '/>';
    g += '<path d="M45 52 L44 88 M50 52 L50 89 M55 52 L56 88" stroke="#a59b86" stroke-width="1.2"/>';
    g += '<path d="M22 46 C26 26 42 36 50 30 C58 36 74 26 78 46 C70 40 58 50 50 48 C42 50 30 40 22 46Z" fill="' + esc(s.chapeau) + '"' + TRAIT + '/>';
    g += '<path d="M30 40 q8 -6 20 -6 q12 0 20 6" stroke="#b8ad98" stroke-width=".8" fill="none"/>';
    return g;
  }
  function boule(s, rnd) {
    var c = esc(s.chapeau), g = '', R = 22 * (s.largeur || 1);
    var cx = s.interieur ? 50 - R * 0.4 : 50; // décalé pour laisser la place à la demi-coupe
    var cy = 90 - R * (s.forme === 'poire' ? 1.5 : .9);
    if (s.forme === 'poire') g += '<path d="M' + cx + ' ' + (88 - R * 2.2) + ' C' + (cx + R * 1.2) + ' ' + (88 - R * 2.2) + ' ' + (cx + R) + ' ' + (88 - R * 0.8) + ' ' + (cx + R * .45) + ' 89 L' + (cx - R * .45) + ' 89 C' + (cx - R) + ' ' + (88 - R * .8) + ' ' + (cx - R * 1.2) + ' ' + (88 - R * 2.2) + ' ' + cx + ' ' + (88 - R * 2.2) + 'Z" fill="' + c + '"' + TRAIT + '/>';
    else g += '<ellipse cx="' + cx + '" cy="' + (90 - R * .9) + '" rx="' + R * 1.05 + '" ry="' + R * .92 + '" fill="' + c + '"' + TRAIT + '/>';
    for (var i = 0; i < (s.ornement === 'craquele' ? 14 : s.ornement ? 30 : 0); i++) {
      var a = rnd() * Math.PI * 2, rr = Math.sqrt(rnd()) * R * .85, x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr * .8;
      if (s.ornement === 'pointes') g += '<path d="M' + f(x - 1.8) + ' ' + f(y + 1.2) + 'l1.8 -3 l1.8 3z" fill="' + teinte(c, .25) + '"/>';
      else if (s.ornement === 'craquele') g += '<path d="M' + f(x - 3) + ' ' + f(y) + 'l2.5 -2l3.5 .5l.5 2.6l-3 1.6z" fill="none" stroke="' + teinte(c, -.4) + '" stroke-width=".8"/>';
      else g += '<circle cx="' + f(x) + '" cy="' + f(y) + '" r="' + f(.6 + rnd() * .9) + '" fill="' + esc(s.chapeau2 || '#fff') + '"/>';
    }
    g += '<path d="M' + f(cx - R * .55) + ' ' + f(cy - R * .3) + 'q' + f(R * .2) + ' ' + f(-R * .4) + ' ' + f(R * .6) + ' ' + f(-R * .5) + '" stroke="#fff" stroke-opacity=".5" stroke-width="2" fill="none" stroke-linecap="round"/>';
    if (s.interieur) { // demi-coupe verticale montrant l'intérieur
      var hx = cx + R * 1.05 + 4 + R * .42, hr = Math.min(R * .55, 15);
      g += '<path d="M' + f(hx - hr) + ' 89 A' + f(hr) + ' ' + f(hr * 1.1) + ' 0 0 1 ' + f(hx + hr) + ' 89Z" fill="' + c + '"' + TRAIT + '/>';
      g += '<path d="M' + f(hx - hr * .78) + ' 89 A' + f(hr * .78) + ' ' + f(hr * .86) + ' 0 0 1 ' + f(hx + hr * .78) + ' 89Z" fill="' + esc(s.interieur) + '"/>';
      if (s.interieur.toLowerCase() !== '#ffffff' && s.interieur.toLowerCase() !== '#fbfaf6') g += '<path d="M' + f(hx - hr * .5) + ' 84 q' + f(hr * .3) + ' -4 ' + f(hr * .6) + ' 0 q' + f(hr * .2) + ' 3 ' + f(hr * .4) + ' -2" stroke="#e9e2ee" stroke-width=".8" fill="none"/>';
    }
    return g;
  }
  function corail(s, rnd) {
    var c = esc(s.chapeau), t = esc(s.chapeau2 || s.chapeau), g = '';
    g += '<path d="M40 90 Q50 70 60 90Z" fill="' + teinte(c, .3) + '"' + TRAIT + '/>';
    function br(x, y, a, len, d) {
      var x2 = x + Math.cos(a) * len, y2 = y + Math.sin(a) * len;
      g += '<path d="M' + f(x) + ' ' + f(y) + 'L' + f(x2) + ' ' + f(y2) + '" stroke="' + (d === 0 ? t : c) + '" stroke-width="' + (1.4 + d * 1.5) + '" stroke-linecap="round"/>';
      if (d > 0) { br(x2, y2, a - .38 - rnd() * .2, len * .72, d - 1); br(x2, y2, a + .38 + rnd() * .2, len * .72, d - 1); }
    }
    br(50, 82, -Math.PI / 2, 15, 3); br(46, 84, -Math.PI / 2 - .55, 12, 3); br(54, 84, -Math.PI / 2 + .55, 12, 3);
    return g;
  }
  function sparassis(s, rnd) {
    var c = esc(s.chapeau), g = '<ellipse cx="50" cy="64" rx="30" ry="25" fill="' + teinte(c, -.1) + '"' + TRAIT + '/>';
    for (var i = 0; i < 26; i++) {
      var x = 26 + rnd() * 48, y = 44 + rnd() * 40;
      g += '<path d="M' + f(x - 5) + ' ' + f(y) + 'q2.5 -4 5 0 q2.5 4 5 0" stroke="' + teinte(c, -.35) + '" stroke-width="1" fill="' + c + '"/>';
    }
    return g;
  }
  function console_(s) {
    var c = esc(s.chapeau), c2 = esc(s.chapeau2 || s.chapeau), g = '<rect x="6" y="6" width="20" height="88" fill="#7d6148" stroke="#4e3b2b"/><path d="M10 10 v80 M17 8 v84 M22 14 v70" stroke="#5e4835" stroke-width=".8"/>';
    var etages = s.forme === 'langue' ? [[46, 30]] : [[34, 22], [56, 24], [76, 20]];
    etages.forEach(function (e) {
      var y = e[0], w = e[1];
      g += '<path d="M26 ' + (y - 7) + ' C' + (26 + w) + ' ' + (y - 12) + ' ' + (26 + w * 1.5) + ' ' + (y + 4) + ' ' + (26 + w * 1.1) + ' ' + (y + 8) + ' C' + (26 + w * .6) + ' ' + (y + 11) + ' 34 ' + (y + 9) + ' 26 ' + (y + 7) + 'Z" fill="' + c + '"' + TRAIT + '/>';
      g += '<path d="M28 ' + (y + 5) + ' C' + (26 + w * .6) + ' ' + (y + 8) + ' ' + (26 + w) + ' ' + (y + 5) + ' ' + (26 + w * 1.25) + ' ' + (y + 2) + '" stroke="' + c2 + '" stroke-width="2.2" fill="none"/>';
    });
    return g;
  }
  function trompette(s) {
    var c = esc(s.chapeau);
    return '<path d="M26 22 C36 30 44 50 46 89 L54 89 C56 50 64 30 74 22 C68 30 58 46 50 46 C42 46 32 30 26 22Z" fill="' + c + '"' + TRAIT + '/>' +
      '<ellipse cx="50" cy="22" rx="24" ry="6" fill="' + teinte(c, -.5) + '"' + TRAIT + '/>' +
      '<path d="M30 25 C40 34 46 56 47 86" stroke="' + teinte(c, .25) + '" stroke-width="1" fill="none"/>';
  }
  function chanterelle(s, rnd) {
    var c = esc(s.chapeau), h = esc(s.hymenium || s.chapeau), p = esc(s.pied || s.hymenium || s.chapeau), g = '';
    g += '<path d="M44 52 C45 70 44 82 45 90 L55 90 C56 82 55 70 56 52Z" fill="' + p + '"' + TRAIT + '/>';
    g += '<path d="M18 34 C30 40 40 48 44 58 L56 58 C60 48 70 40 82 34 C70 50 30 50 18 34Z" fill="' + h + '"' + TRAIT + '/>';
    if (s.type !== 'lisse') for (var i = 0; i < 9; i++) { var x = 22 + i * 7; g += '<path d="M' + x + ' ' + (37 + Math.abs(x - 50) * -.05) + 'Q' + f(50 + (x - 50) * .4) + ' 47 ' + f(50 + (x - 50) * .12) + ' 64" stroke="' + teinte(h, -.3) + '" stroke-width=".8" fill="none"/>'; }
    g += '<path d="M16 34 C26 26 74 26 84 34 C74 40 26 40 16 34Z" fill="' + c + '"' + TRAIT + '/>';
    g += '<ellipse cx="50" cy="33" rx="12" ry="2.6" fill="' + teinte(c, -.25) + '"/>';
    return g;
  }
  function pleurote(s) {
    var c = esc(s.chapeau), h = esc(s.hymenium || '#eee'), g = '<rect x="4" y="4" width="18" height="90" fill="#7d6148" stroke="#4e3b2b"/>';
    [[30, 30], [56, 26], [78, 22]].forEach(function (e) {
      var y = e[0], w = e[1];
      g += '<path d="M22 ' + (y + 6) + ' C' + (22 + w * .5) + ' ' + (y + 16) + ' ' + (22 + w * 1.3) + ' ' + (y + 12) + ' ' + (22 + w * 1.45) + ' ' + (y + 4) + 'L22 ' + (y + 2) + 'Z" fill="' + h + '"' + TRAIT + '/>';
      for (var i = 1; i < 6; i++) g += '<path d="M24 ' + (y + 4) + 'L' + f(22 + w * 1.45 * i / 6) + ' ' + f(y + 4 + 6 * Math.sin(Math.PI * i / 6)) + '" stroke="' + teinte(h, -.3) + '" stroke-width=".5"/>';
      g += '<path d="M22 ' + (y - 4) + ' C' + (22 + w * .7) + ' ' + (y - 10) + ' ' + (22 + w * 1.6) + ' ' + (y - 6) + ' ' + (22 + w * 1.45) + ' ' + (y + 4) + ' C' + (22 + w) + ' ' + (y + 2) + ' 30 ' + (y + 3) + ' 22 ' + (y + 4) + 'Z" fill="' + c + '"' + TRAIT + '/>';
    });
    return g;
  }

  /* ---------- Formes ajoutées pour les espèces secondaires ---------- */
  function coupe(s, rnd) { // pézizes, oreilles, coupes sur pied
    var c = esc(s.chapeau), i = esc(s.hymenium || teinte(s.chapeau, .15)), g = '';
    if (s.pied) g += '<path d="M44 90 L46 66 L54 66 L56 90Z" fill="' + esc(s.pied) + '"' + TRAIT + '/><path d="M47 68v20M50 68v21M53 68v20" stroke="#a59b86" stroke-width="1.1"/>';
    var base = s.pied ? 66 : 88, n = s.forme === 'groupe' ? 3 : 1;
    for (var k = 0; k < n; k++) {
      var sc = n > 1 ? [.45, .6, .4][k] : (s.largeur || 1), ox = n > 1 ? [-24, 4, 26][k] : 0, oy = n > 1 ? [0, -4, 2][k] : 0;
      var w = 28 * sc, h = 18 * sc, cx = 50 + ox, by = base + oy;
      if (s.forme === 'oreille') g += '<path d="M' + (cx - 8) + ' ' + by + ' C' + (cx - 20) + ' ' + (by - 30) + ' ' + (cx - 6) + ' ' + (by - 58) + ' ' + (cx + 8) + ' ' + (by - 52) + ' C' + (cx + 18) + ' ' + (by - 30) + ' ' + (cx + 10) + ' ' + (by - 8) + ' ' + (cx + 6) + ' ' + by + 'Z" fill="' + c + '"' + TRAIT + '/><path d="M' + (cx - 2) + ' ' + (by - 6) + ' C' + (cx - 8) + ' ' + (by - 28) + ' ' + cx + ' ' + (by - 44) + ' ' + (cx + 6) + ' ' + (by - 46) + '" stroke="' + teinte(s.chapeau, -.25) + '" stroke-width="1.4" fill="none"/>';
      else {
        g += '<path d="M' + (cx - w) + ' ' + (by - h) + ' Q' + cx + ' ' + (by + h * .5) + ' ' + (cx + w) + ' ' + (by - h) + ' Q' + cx + ' ' + (by - h * .45) + ' ' + (cx - w) + ' ' + (by - h) + 'Z" fill="' + teinte(s.chapeau, -.2) + '"' + TRAIT + '/>';
        g += '<ellipse cx="' + cx + '" cy="' + f(by - h) + '" rx="' + f(w) + '" ry="' + f(h * .38) + '" fill="' + i + '"' + TRAIT + '/>';
        if (s.ornement === 'veines') g += '<path d="M' + f(cx - w * .6) + ' ' + f(by - h) + 'q' + f(w * .3) + ' -3 ' + f(w * .6) + ' 0 q' + f(w * .3) + ' 3 ' + f(w * .6) + ' 0" stroke="' + teinte(s.hymenium || s.chapeau, -.3) + '" stroke-width="1" fill="none"/>';
      }
    }
    if (s.bois) g = '<path d="M2 86 Q50 80 98 86 L98 97 Q50 93 2 97Z" fill="' + esc(s.bois_couleur || '#8a6a4b') + '" stroke="#5a4330" stroke-width=".8"/>' + g;
    return g;
  }
  function gelee(s, rnd) { // champignons gélatineux sur bois
    var c = esc(s.chapeau), g = '<rect x="6" y="54" width="88" height="34" rx="10" fill="#7d6148" stroke="#4e3b2b"/><path d="M14 62h70M12 72h76M16 82h66" stroke="#5e4835" stroke-width=".7"/>';
    if (s.forme === 'oreille') { [[34, 44, 1], [62, 40, .8]].forEach(function (o) { g += '<path d="M' + o[0] + ' 56 C' + (o[0] - 18 * o[2]) + ' ' + (o[1] - 4) + ' ' + (o[0] - 10 * o[2]) + ' ' + (o[1] - 26 * o[2]) + ' ' + (o[0] + 4) + ' ' + (o[1] - 22 * o[2]) + ' C' + (o[0] + 20 * o[2]) + ' ' + (o[1] - 18 * o[2]) + ' ' + (o[0] + 16 * o[2]) + ' ' + o[1] + ' ' + (o[0] + 6) + ' 56Z" fill="' + c + '"' + TRAIT + '/><path d="M' + o[0] + ' 52 q-4 -10 2 -18" stroke="' + teinte(s.chapeau, -.3) + '" stroke-width="1.2" fill="none"/>'; }); }
    else if (s.forme === 'cornet') { [[40, 1], [60, .8]].forEach(function (o) { g += '<path d="M' + (o[0] - 3) + ' 56 L' + (o[0] - 14 * o[1]) + ' ' + (56 - 34 * o[1]) + ' Q' + o[0] + ' ' + (56 - 30 * o[1]) + ' ' + (o[0] + 12 * o[1]) + ' ' + (56 - 36 * o[1]) + ' L' + (o[0] + 3) + ' 56Z" fill="' + c + '"' + TRAIT + '/>'; }); }
    else if (s.forme === 'aiguillons') { g += '<path d="M28 56 C26 34 74 34 72 56Z" fill="' + c + '" stroke="#7e7a70" stroke-width=".9" opacity=".85"/>'; for (var a = 0; a < 9; a++) g += '<path d="M' + (32 + a * 4.5) + ' 56 l1.2 4 l1.2 -4" fill="' + teinte(s.chapeau, -.1) + '"/>'; }
    else if (s.forme === 'massue') { g = '<path d="M4 90 Q50 87 96 90" stroke="#8b7b5e" stroke-width="1.2" fill="none"/><path d="M46 90 L47 60 L53 60 L54 90Z" fill="' + esc(s.pied || '#e9c64b') + '"' + TRAIT + '/><ellipse cx="50" cy="56" rx="14" ry="9" fill="' + c + '"' + TRAIT + '/><path d="M40 56 q10 -6 20 0" stroke="' + teinte(s.chapeau, -.3) + '" stroke-width="1" fill="none"/>'; }
    else { // cervelle / feuilles / masses
      for (var i = 0; i < 7; i++) { var x = 28 + rnd() * 44, y = 36 + rnd() * 16, r = 7 + rnd() * 7; g += '<circle cx="' + f(x) + '" cy="' + f(y) + '" r="' + f(r) + '" fill="' + c + '"' + TRAIT + '/>'; }
      for (var j = 0; j < 8; j++) { var x2 = 26 + rnd() * 48, y2 = 30 + rnd() * 22; g += '<path d="M' + f(x2) + ' ' + f(y2) + ' q3 -4 6 0 q3 4 6 0" stroke="' + teinte(s.chapeau, -.3) + '" stroke-width="1" fill="none"/>'; }
    }
    return g;
  }
  function etoile(s) { // géastres
    var c = esc(s.chapeau), g = '';
    for (var i = 0; i < 7; i++) { var a = Math.PI + i * Math.PI / 6; g += '<path d="M50 80 L' + f(50 + Math.cos(a - .18) * 16) + ' ' + f(80 + Math.sin(a - .18) * 8) + ' L' + f(50 + Math.cos(a) * 36) + ' ' + f(84 + Math.sin(a) * 10) + ' L' + f(50 + Math.cos(a + .18) * 16) + ' ' + f(80 + Math.sin(a + .18) * 8) + 'Z" fill="' + c + '"' + TRAIT + '/>'; }
    g += '<path d="M14 86 Q50 92 86 86 L80 88 Q50 95 20 88Z" fill="' + teinte(s.chapeau, -.2) + '"/>';
    g += '<ellipse cx="50" cy="66" rx="14" ry="12" fill="' + esc(s.chapeau2 || '#c9b08a') + '"' + TRAIT + '/><path d="M50 54 l-2 -4 l4 0z" fill="' + teinte(s.chapeau2 || '#c9b08a', -.3) + '"/>';
    return g;
  }
  function cage(s) { // clathre rouge
    var c = esc(s.chapeau), g = '<path d="M30 86 Q50 94 70 86 L66 80 Q50 86 34 80Z" fill="#f2ede2"' + TRAIT + '/>';
    g += '<path d="M28 82 C18 50 34 18 50 16 C66 18 82 50 72 82" fill="none" stroke="' + c + '" stroke-width="5"/>';
    g += '<path d="M38 84 C30 56 40 26 50 16 M62 84 C70 56 60 26 50 16 M24 60 C40 54 60 54 76 60 M28 40 C40 34 60 34 72 40 M50 16 L50 84" fill="none" stroke="' + c + '" stroke-width="4"/>';
    return g;
  }
  function pieuvre(s) { // anthurus d'Archer
    var c = esc(s.chapeau), g = '<ellipse cx="50" cy="84" rx="14" ry="6" fill="#f2ede2"' + TRAIT + '/>';
    for (var i = 0; i < 5; i++) { var a = Math.PI + .3 + i * .64; g += '<path d="M50 80 Q' + f(50 + Math.cos(a) * 22) + ' ' + f(70 + Math.sin(a) * 30) + ' ' + f(50 + Math.cos(a) * 42) + ' ' + f(76 + Math.sin(a) * 14) + '" stroke="' + c + '" stroke-width="6" fill="none" stroke-linecap="round"/>'; }
    return g + '<circle cx="50" cy="78" r="5" fill="#3b4a2a"/>';
  }
  function phalle(s) {
    var c = esc(s.chapeau), p = esc(s.pied || '#f4f1e8'), g = '<ellipse cx="50" cy="85" rx="12" ry="7" fill="#efe9dc"' + TRAIT + '/>';
    var h = s.forme === 'fin' ? 46 : 58, w = s.forme === 'fin' ? 4 : 7;
    g += '<path d="M' + (50 - w) + ' 84 L' + (50 - w * .9) + ' ' + (84 - h) + ' L' + (50 + w * .9) + ' ' + (84 - h) + ' L' + (50 + w) + ' 84Z" fill="' + p + '"' + TRAIT + '/>';
    if (s.forme === 'fin') g += '<path d="M' + (50 - w * .9) + ' ' + (84 - h + 14) + ' L50 ' + (84 - h - 4) + ' L' + (50 + w * .9) + ' ' + (84 - h + 14) + 'Z" fill="' + c + '"' + TRAIT + '/>';
    else { g += '<path d="M40 ' + (84 - h + 16) + ' C40 ' + (84 - h - 4) + ' 60 ' + (84 - h - 4) + ' 60 ' + (84 - h + 16) + 'Z" fill="' + c + '"' + TRAIT + '/>'; for (var i = 0; i < 6; i++) g += '<circle cx="' + (43 + (i % 3) * 7) + '" cy="' + (84 - h + 4 + Math.floor(i / 3) * 7) + '" r="1.8" fill="' + teinte(s.chapeau, -.4) + '"/>'; }
    return g;
  }
  function nid(s) {
    var c = esc(s.chapeau), g = '<path d="M2 86 Q50 80 98 86 L98 97 Q50 93 2 97Z" fill="#8a6a4b"/>';
    [[34, 1], [60, .85]].forEach(function (o) { var x = o[0], k = o[1]; g += '<path d="M' + (x - 12 * k) + ' ' + (84 - 26 * k) + ' L' + (x - 4 * k) + ' 84 L' + (x + 4 * k) + ' 84 L' + (x + 12 * k) + ' ' + (84 - 26 * k) + 'Z" fill="' + c + '"' + TRAIT + '/><ellipse cx="' + x + '" cy="' + (84 - 26 * k) + '" rx="' + 12 * k + '" ry="' + 3.5 * k + '" fill="#3b2f25"/>'; [-4, 0, 4].forEach(function (d) { g += '<ellipse cx="' + (x + d * k) + '" cy="' + (84 - 26 * k) + '" rx="' + 2 * k + '" ry="' + 1.3 * k + '" fill="#d9d2c4"/>'; }); });
    return g;
  }
  function doigts(s, rnd) { // xylaires, daldinie
    var c = esc(s.chapeau), g = '<path d="M2 86 Q50 80 98 86 L98 97 Q50 93 2 97Z" fill="#8a6a4b" stroke="#5a4330" stroke-width=".8"/>';
    if (s.forme === 'boule') { [[40, 74, 13], [62, 77, 10]].forEach(function (o) { g += '<circle cx="' + o[0] + '" cy="' + o[1] + '" r="' + o[2] + '" fill="' + c + '"' + TRAIT + '/>'; }); g += '<path d="M33 70 q7 -6 14 0" stroke="#5d5d5d" stroke-width="1" fill="none"/>'; }
    else if (s.forme === 'cerf') { [[40, 1], [58, .8]].forEach(function (o) { var x = o[0], k = o[1]; g += '<path d="M' + x + ' 84 L' + x + ' ' + (84 - 26 * k) + ' M' + x + ' ' + (84 - 16 * k) + ' L' + (x - 8 * k) + ' ' + (84 - 34 * k) + ' M' + x + ' ' + (84 - 22 * k) + ' L' + (x + 7 * k) + ' ' + (84 - 38 * k) + '" stroke="' + c + '" stroke-width="' + 3.2 * k + '" stroke-linecap="round" fill="none"/><path d="M' + (x - 8 * k) + ' ' + (84 - 34 * k) + ' l-1 -4 M' + (x + 7 * k) + ' ' + (84 - 38 * k) + ' l1 -4" stroke="#f4f1e8" stroke-width="' + 2.6 * k + '" stroke-linecap="round"/>'; }); }
    else [[38, 30], [52, 38], [64, 26]].forEach(function (o) { g += '<path d="M' + (o[0] - 4) + ' 84 C' + (o[0] - 6) + ' ' + (84 - o[1] * .6) + ' ' + (o[0] - 6) + ' ' + (84 - o[1]) + ' ' + o[0] + ' ' + (84 - o[1]) + ' C' + (o[0] + 6) + ' ' + (84 - o[1]) + ' ' + (o[0] + 6) + ' ' + (84 - o[1] * .6) + ' ' + (o[0] + 4) + ' 84Z" fill="' + c + '"' + TRAIT + '/>'; });
    return g;
  }
  function cascade(s) { // hydne hérisson
    var c = esc(s.chapeau), g = '<rect x="4" y="4" width="20" height="90" fill="#7d6148" stroke="#4e3b2b"/><path d="M24 30 C50 22 76 30 78 44 C76 50 40 52 24 46Z" fill="' + c + '"' + TRAIT + '/>';
    for (var i = 0; i < 14; i++) { var x = 28 + i * 3.6; g += '<path d="M' + x + ' 46 L' + (x + 1.2) + ' ' + (70 + (i % 3) * 5) + ' L' + (x + 2.4) + ' 46Z" fill="' + c + '" stroke="#bdb6a6" stroke-width=".4"/>'; }
    return g;
  }

  /* ---------- Point d'entrée ---------- */
  var compteur = 0;
  function dessiner(s, seed) {
    s = s || {};
    var rnd = rng(seed || 'x');
    var uid = 'sc' + (compteur++).toString(36) + '_';
    var g = sol(s);
    switch (s.type) {
      case 'morille': g += morille(s, rnd, uid); break;
      case 'gyromitre': g += gyromitre(s); break;
      case 'helvelle': g += helvelle(s); break;
      case 'boule': g += boule(s, rnd); break;
      case 'corail': g += corail(s, rnd); break;
      case 'sparassis': g += sparassis(s, rnd); break;
      case 'console': g += console_(s); break;
      case 'trompette': g += trompette(s); break;
      case 'chanterelle': case 'lisse': g += chanterelle(s, rnd); break;
      case 'pleurote': g += pleurote(s); break;
      case 'coupe': g += coupe(s, rnd); break;
      case 'gelee': g += gelee(s, rnd); break;
      case 'etoile': g += etoile(s); break;
      case 'cage': g += cage(s); break;
      case 'pieuvre': g += pieuvre(s); break;
      case 'phalle': g += phalle(s); break;
      case 'nid': g += nid(s); break;
      case 'doigts': g += doigts(s, rnd); break;
      case 'cascade': g += cascade(s); break;
      default:
        if (s.touffe) {
          g += agaric(s, rnd, uid + 'a', -22, .72);
          g += agaric(s, rnd, uid + 'b', 22, .8);
          g += agaric(s, rnd, uid + 'm', 0, 1);
        } else g += agaric(s, rnd, uid + 'm', 0, 1);
    }
    return g;
  }
  return { dessiner: dessiner, teinte: teinte };
})();
if (typeof module !== 'undefined') module.exports = Schema;
