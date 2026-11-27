"""Branches de la clé ajoutées pour les espèces de la v1.22 (100 espèces communes en France qui manquaient,
d'après les observations iNaturalist). Appliqué par gen_cle.py et reponses_courtes.py.

AJOUTS : question existante -> options ajoutées. Elles s'insèrent AVANT l'option « autres espèces » si la question
en a une (les photos d'aide validées sont décalées en conséquence par decaler_aide.py), sinon à la fin.
Une suite peut être une nouvelle question : ("q", id, question, options, courts).
CONVERSIONS : une espèce seule qui devient une question (l'ancienne espèce y reste, en premier).
COURTS : réponses courtes des options ajoutées (même ordre)."""
AUTRES = "Aucune de ces descriptions (autres espèces)"

def q(id, question, options, courts):
    return ('q', id, question, options, courts)

AJOUTS = {
  # ---------- Polypores ----------
  'consoles-molles': [(AUTRES, q('consoles-molles-autres', 'Aspect ?', [
      ("Grande rosette brun-roux à bord jaune vif ; au pied des pins", 'phaeolus-schweinitzii'),
      ("Blanchâtre à rosé, rougissant au toucher ; souvent au sol, sur racines", 'abortiporus-biennis'),
      ("Gros coussin brun pleurant des gouttes ambrées ; au pied des chênes", 'pseudoinonotus-dryadeus'),
      ("Brun-roux velouté ; uniquement sur tamaris", 'inocutis-tamaricis'),
      ("Blanc, ramifié comme un corail, aiguillons courts", 'hericium-coralloides'),
    ], ["Rosette au pied des pins", "Blanc rosissant", "Coussin qui pleure", "Sur tamaris", "Corail blanc à aiguillons"]))],
  'consoles-dures': [(AUTRES, q('consoles-dures-autres', 'Aspect ?', [
      ("Pores allongés qui rougissent au toucher ; sur saules et aulnes", 'daedaleopsis-confragosa'),
      ("Petit sabot gris fendillé ; sur pruniers et cerisiers", 'phellinus-pomaceus'),
      ("Brun-rouge laqué, sans vrai pied ; à la base des chênes", 'ganoderma-resinaceum'),
      ("Pores très larges en nid d'abeilles ; sur chênes du Midi", 'hexagonia-nitida'),
      ("Brun sombre ridé, pores jaunâtres ; sur pins vivants", 'porodaedalea-pini'),
      ("Brun-noir laqué avec un pied ; sur sapins", 'ganoderma-carnosum'),
    ], ["Pores rougissants", "Sur arbres fruitiers", "Laqué, base des chênes", "Pores en nid d'abeilles", "Sur pins vivants", "Laqué à pied, sapins"]))],
  'consoles-minces': [(AUTRES, q('consoles-minces-autres', 'Aspect ?', [
      ("Gris-blanc très velu, zones discrètes ; pores crème", 'trametes-hirsuta'),
      ("Zoné de gris, dessous à lames (et non à pores) ; sur bouleaux", 'lenzites-betulina'),
      ("Entièrement rouge-orangé vif", 'trametes-cinnabarina'),
      ("Zones ocre et brun-roux ; pores crème", 'trametes-ochracea'),
      ("Brun-roux à marge jaune, lames dessous ; sur bois de conifères travaillé", 'gloeophyllum-sepiarium'),
      ("Petites consoles grises à pores violets ; sur conifères", 'trichaptum-abietinum'),
      ("Rosettes brun chocolat à bord frangé ; au sol, sous les pins", 'thelephora-terrestris'),
    ], ["Gris très velu", "Lames, sur bouleaux", "Rouge-orangé vif", "Zones ocre", "Lames, bois travaillé", "Pores violets", "Rosettes brunes au sol"]))],
  'bolets': [("Chair coriace qui ne se casse pas ; pied dur, souvent sur bois (polypore à pied)", q('polypores-pied', 'Aspect ?', [
      ("Chapeau crème couvert d'écailles brunes ; pousse d'une grosse boule souterraine", 'polyporus-tuberaster'),
      ("Chapeau brun-roux lisse ; pied noir à la base", 'picipes-badius'),
      ("Petit chapeau brun velouté ; pores blancs ; en hiver sur branches", 'lentinus-brumalis'),
    ], ["Écailleux, sur sclérote", "Pied noir", "Petit, en hiver"]))],
  'leccinum-autres': [
      ("Brun-gris bosselé ; sous les charmes ; chair noircissant", 'leccinellum-pseudoscabrum'),
      ("Jaune, cuticule craquelée ; sous chênes, sol calcaire", 'leccinellum-crocipodium'),
      ("Orange vif ; pied blanc à mèches blanches ; sous trembles", 'leccinum-leucopodium')],
  'suillus-anneau': [
      ("Gris-blanchâtre très gluant ; sous les mélèzes", 'suillus-viscidus'),
      ("Brun fibrilleux, peu gluant ; pied creux ; sous les mélèzes", 'suillus-cavipes')],
  'bolets-immuables-autres': [(AUTRES, q('bolets-immuables-plus', 'Aspect ?', [
      ("Chapeau gluant brun ; base du pied rose ; sous pins", 'suillus-collinitus'),
      ("Chapeau brun-gris velouté ; pores gris-brun ; sporée rouge-pourpre", 'porphyrellus-porphyrosporus'),
      ("Petit, jaune-olive ; pousse sur un scléroderme", 'pseudoboletus-parasiticus'),
    ], ["Base du pied rose", "Sombre, sporée pourpre", "Sur un scléroderme"]))],
  'bolets-bleus-autres': [(AUTRES, q('bolets-bleus-plus', 'Aspect ?', [
      ("Petit chapeau rouge framboise ; pores jaunes ; pied taché de rouge", 'hortiboletus-rubellus'),
      ("Chapeau brun-pourpre pruineux, non craquelé ; pores jaunes", 'xerocomellus-pruinatus'),
    ], ["Rouge framboise", "Pourpre pruineux"]))],
  # ---------- Aiguillons, plis ----------
  'hydnes-autres': [
      ("Chapeau noir-bleuté à marge pâle ; aiguillons gris ; chair noire et dure", 'phellodon-niger'),
      ("Chapeau bleu pâle bosselé ; aiguillons bruns ; chair zonée de bleu", 'hydnellum-caeruleum')],
  'plis-autres': [("Petite trompette gris-noir ; plis gris marqués ; odeur fruitée", 'craterellus-cinereus')],
  # ---------- Ascos ----------
  'ascos-autres': [
      ("Petit dé à coudre LISSE, entièrement libre du pied", 'verpa-conica'),
      ("Coupe gris-noir sur un court pied blanc ; au printemps, sur sol sableux", 'dissingia-leucomelaena')],
  'coupes': [(AUTRES, q('coupes-autres', 'Aspect ?', [
      ("Coupe orange-jaune qui bleuit par endroits ; au printemps, sous conifères", 'caloscypha-fulgens'),
      ("Coupe enterrée, crème dedans, brune et velue dehors ; sous les cèdres", 'geopora-sumneriana'),
      ("Grosse coupe violacée qui s'ouvre en couronne ; au printemps", 'sarcosphaera-coronaria'),
    ], ["Orange qui bleuit", "Enterrée, sous cèdres", "Couronne violacée"]))],
  # ---------- Boules ----------
  'boules-autres': [(AUTRES, q('boules-plus', 'Aspect ?', [
      ("Couvert de longues épines brunes qui tombent en laissant un réseau", 'lycoperdon-echinatum'),
      ("Petite boule blanche des pelouses ; base séparée par une cloison", 'lycoperdon-pratense'),
      ("Grosse poire crème puis brune, surface en mosaïque", 'lycoperdon-utriforme'),
      ("Petite boule blanchâtre sur un pied fin et dur ; sol sableux", 'tulostoma-brumale'),
      ("Grand pied écailleux portant une tête poudreuse brune ; sols secs", 'battarrea-phalloides'),
    ], ["Longues épines", "Petite, des pelouses", "Grosse, en mosaïque", "Boule sur un pied fin", "Grand pied écailleux"]))],
  # ---------- Clavaires ----------
  'coraux': [("Rosette de larges lames plates crème-ocre ; au pied des chênes", 'sparassis-brevipes')],
  'ramaires-autres': [
      ("Rameaux crème terminés en petites couronnes ; sur bois pourri", 'artomyces-pyxidatus'),
      ("Rameaux ocre très serrés, dressés en parallèle ; sur bois", 'lentoramaria-stricta'),
      ("Massue blanche ridée, peu ramifiée ; au sol", 'clavulina-rugosa')],
  # ---------- Gélatineux ----------
  'gelatineux': [(AUTRES, q('gelatineux-autres', 'Forme et couleur ?', [
      ("Masse plissée orange vif, ferme ; sur la stérée hirsute", 'naematelia-aurantia'),
      ("Petites cornes jaunes non ramifiées, en groupes sur bois", 'calocera-cornea'),
      ("Petits disques noirs en toupie, surface lisse ; sur chênes", 'exidia-truncata'),
      ("Masse translucide incolore avec des grains blancs", 'myxarium-nucleatum'),
      ("Petit éventail orange vif à larges pores ; sur bois mort", 'favolaschia-claudopus'),
    ], ["Orange sur stérée", "Petites cornes jaunes", "Disques noirs", "Translucide à grains", "Éventail orange à pores"]))],
  # ---------- Formes étranges ----------
  'etranges': [
      ("Une petite massue colorée sur un pied (orange, jaune)", q('massues', 'Couleur et habitat ?', [
          ("Massue orange vif sortant du sol (sur une chrysalide enterrée)", 'cordyceps-militaris'),
          ("Tête jaune-orangé sur un pied blanc ; dans l'eau des marais", 'mitrula-paludosa'),
        ], ["Orange, sur chrysalide", "Jaune, dans les marais"])),
      ("Un petit champignon poudreux poussant sur une russule pourrie", 'asterophora-lycoperdoides')],
  'noirs-bois': [("Doigt noir sur un long pied fin ; sur bois d'érable", 'xylaria-longipes')],
  # ---------- Lames : sporée blanche ----------
  'decurrentes-bois-autres': [
      ("Chapeau blanc moucheté d'écailles noires ; lames dentelées ; sur saules", 'lentinus-tigrinus'),
      ("Gros, crème à écailles brunes ; odeur d'anis ; sur bois de pin", 'neolentinus-lepideus'),
      ("Blanc floconneux ; reste de voile sur le pied ; sur feuillus", 'pleurotus-dryinus'),
      ("Crème pâle en éventail ; en été, sur feuillus", 'pleurotus-pulmonarius')],
  'clitocybes-autres': [(AUTRES, q('clitocybes-plus', 'Aspect ?', [
      ("Gris-brun en coupe profonde ; lames crème ; fin d'automne", 'pseudoclitocybe-cyathiformis'),
      ("Minuscule, orange ; pied très fin ; dans les mousses", 'rickenella-fibula'),
      ("Minuscule, gris-brun ; dans les mousses des sols sableux", 'arrhenia-rickenii'),
      ("Blanc ivoire très visqueux ; lames espacées ; sous les hêtres", 'hygrophorus-eburneus'),
    ], ["Gris en coupe", "Minuscule orange", "Minuscule gris-brun", "Blanc ivoire visqueux"]))],
  'tricho-bois': [(AUTRES, q('tricho-bois-autres', 'Aspect ?', [
      ("Cloche grise ; pied orangé en bas ; en touffes sur souches de chênes", 'mycena-inclinata'),
      ("Petit chapeau rose-brun ; pied jaune ; sur bois de feuillus", 'mycena-renati'),
      ("Minuscule chapeau crème ; sur brindilles, en troupes", 'collybiopsis-ramealis'),
      ("Jaune vif à fines mèches brunes ; sur bois de conifères", 'tricholomopsis-decora'),
    ], ["Cloche grise, en touffes", "Rose, pied jaune", "Minuscule, sur brindilles", "Jaune à mèches brunes"]))],
  'tricho-bruns': [
      ("Forte odeur d'ail ; pied long noir velouté", 'mycetinis-alliaceus'),
      ("Pied velu à base jaune ; saveur brûlante", 'collybiopsis-peronata')],
  'tricho-gris': [("Gris à fibrilles ; lames jaunissant ; odeur de farine", 'tricholoma-scalpturatum')],
  'tricho-sol': [("Jaune ou vert, cireux et luisant ; dans les prés", q('hygrocybes-jaunes', 'Couleur ?', [
      ("Vert perroquet, très visqueux, puis jaune-orangé", 'gliophorus-psittacinus'),
      ("Jaune citron, visqueux ; pied jaune", 'hygrocybe-chlorophana'),
      ("Jaune orangé, petit ; lames un peu décurrentes", 'hygrocybe-ceracea'),
      ("Jaune, conique pointu ; ne noircit pas", 'hygrocybe-acutoconica'),
    ], ["Vert perroquet", "Jaune citron", "Petit jaune orangé", "Jaune conique"]))],
  'tricho-couleurs': [("Rouge vif, chapeau convexe sec ; lames rouges ; dans les prés", 'hygrocybe-coccinea')],
  'touffes-blanches-autres': [("Brun-jaune ; pied renflé à la base ; isolé ou en petits groupes, au sol", 'armillaria-gallica')],
  'lactaires-autres': [("Lait orange, sur un petit champignon conique poussant sur bois", 'mycena-crocata')],
  'lactaires-blancs': [
      ("Gris-vert visqueux, zoné de gouttes ; sous les hêtres", 'lactarius-blennius'),
      ("Blanc taché de rose ; lames rosées ; sous peupliers et saules", 'lactarius-controversus')],
  'russules-rouges': [("Rouge sang ; lames un peu décurrentes ; saveur âcre ; sous pins", 'russula-sanguinea')],
  'russules-autres': [("Gris-bleu, comme poudré (pruineux) ; saveur douce", 'russula-parazurea')],
  'amanites-vaginees': [("Brun doré, grand ; volve grise friable ; plaques grises sur le chapeau", 'amanita-ceciliae')],
  # ---------- Lames : sporée rose ----------
  'rose-autres': [("Chapeau rose saumon veiné en réseau ; sur bois d'orme", 'rhodotus-palmatus')],
  # ---------- Lames : sporée brune ----------
  'cortinaires-autres': [
      ("Chapeau couvert de mèches rouge-cuivré sur fond jaune", 'cortinarius-bolaris'),
      ("Visqueux, brun-jaune ; pied à bracelets ; sous saules et peupliers", 'cortinarius-trivialis')],
  'touffes-brunes-autres': [("Grand, blanc-crème à mèches ; sur peupliers vivants", 'hemipholiota-populnea')],
  'brune-autres': [
      ("Jaune d'œuf très visqueux, fragile ; prés et fumier", 'bolbitius-titubans'),
      ("Lames décurrentes ; pied court couvert de velours noir ; sur souches de pins", 'tapinella-atrotomentosa')],
  # ---------- Lames : sporée sombre ----------
  'coprins-autres': [("Petit, gris couvert de poils blancs ; pied fin velu ; vit quelques heures", 'coprinopsis-lagopus')],
  'noire-autres': [(AUTRES, q('noire-plus', 'Aspect ?', [
      ("Bleu-vert pâle, visqueux ; anneau fugace ; jardins et bords de chemins", 'stropharia-caerulea'),
      ("Petit, jaune paille ; anneau strié ; dans les pelouses", 'stropharia-coronilla'),
      ("Orange vif ; voile blanc à la marge ; sur copeaux", 'leratiomyces-ceres'),
      ("Gris-brun, marge dentelée de blanc ; sur crottin", 'panaeolus-papilionaceus'),
      ("Conique, brun-roux pâlissant ; pied très long et fragile", 'parasola-conopilea'),
    ], ["Bleu-vert visqueux", "Jaune paille, anneau", "Orange, sur copeaux", "Sur crottin", "Conique, pied très long"]))],
}

CONVERSIONS = {
  'geastrum-triplex': q('etoiles', 'Aspect de l\'étoile ?', [
      ("Grande étoile à collerette autour de la boule", 'geastrum-triplex'),
      ("Petite étoile sans collerette ; boule pâle", 'geastrum-fimbriatum'),
      ("Bras épais craquelés qui se referment au sec ; sol sableux", 'astraeus-hygrometricus'),
    ], ["Collerette", "Petite, sans collerette", "Bras épais craquelés"]),
  'cyathus-striatus': q('nids', 'Aspect du nid ?', [
      ("Intérieur strié, extérieur velu brun", 'cyathus-striatus'),
      ("Intérieur lisse gris ; en forme de vase", 'cyathus-olla'),
      ("Petite coupe jaune-crème, œufs blancs", 'crucibulum-laeve'),
    ], ["Strié et velu", "Lisse, en vase", "Jaune, œufs blancs"]),
}

# Réponses courtes des options ajoutées directement dans une question existante (espèce -> libellé court)
COURT_SP = {
  'leccinellum-pseudoscabrum': "Brun-gris, sous charmes", 'leccinellum-crocipodium': "Jaune craquelé, chênes",
  'leccinum-leucopodium': "Orange, pied blanc", 'suillus-viscidus': "Gris très gluant, mélèzes",
  'suillus-cavipes': "Pied creux, mélèzes", 'phellodon-niger': "Noir-bleuté, chair noire", 'hydnellum-caeruleum': "Bleu pâle, chair zonée",
  'craterellus-cinereus': "Trompette gris-noir à plis", 'verpa-conica': "Dé à coudre lisse",
  'dissingia-leucomelaena': "Coupe gris-noir, pied blanc", 'sparassis-brevipes': "Rosette de lames plates",
  'artomyces-pyxidatus': "Rameaux en couronnes", 'lentoramaria-stricta': "Rameaux serrés dressés",
  'clavulina-rugosa': "Massue blanche ridée", 'asterophora-lycoperdoides': "Sur une russule pourrie",
  'xylaria-longipes': "Doigt noir à long pied", 'lentinus-tigrinus': "Blanc moucheté, sur saules",
  'neolentinus-lepideus': "Écailleux, odeur d'anis", 'pleurotus-dryinus': "Blanc floconneux, voile",
  'pleurotus-pulmonarius': "Crème pâle, en été", 'mycetinis-alliaceus': "Odeur d'ail, pied noir",
  'collybiopsis-peronata': "Pied velu, saveur brûlante", 'tricholoma-scalpturatum': "Gris, jaunissant, farine",
  'hygrocybe-coccinea': "Rouge vif sec", 'armillaria-gallica': "Pied renflé, au sol",
  'mycena-crocata': "Lait orange, sur bois", 'lactarius-blennius': "Gris-vert visqueux",
  'lactarius-controversus': "Blanc taché de rose", 'russula-sanguinea': "Rouge sang, âcre",
  'russula-parazurea': "Gris-bleu poudré", 'amanita-ceciliae': "Brun doré, volve grise",
  'rhodotus-palmatus': "Rose saumon, sur orme", 'cortinarius-bolaris': "Mèches rouge-cuivré",
  'cortinarius-trivialis': "Visqueux, à bracelets", 'hemipholiota-populnea': "Crème, sur peupliers",
  'bolbitius-titubans': "Jaune d'œuf visqueux", 'tapinella-atrotomentosa': "Pied velours noir",
  'coprinopsis-lagopus': "Gris à poils blancs",
}
# Réponse courte de l'option qui mène à une nouvelle question
COURT_Q = {'polypores-pied': "Polypore à pied", 'massues': "Petite massue colorée", 'hygrocybes-jaunes': "Jaune ou vert cireux"}

def _construire(Q, s):
    if isinstance(s, tuple):
        _, id_, question, options, _c = s
        return Q(id_, question, [(t, _construire(Q, x)) for t, x in options])
    return s

def _position(n):
    for i, o in enumerate(n['options']):
        if o['reponse'] == AUTRES: return i
    return len(n['options'])

def appliquer(racine, Q):
    """Ajoute les branches à l'arbre construit par gen_cle.py."""
    index = {}
    def visiter(n):
        if 'espece' in n: return
        index[n['id']] = n
        for o in n['options']: visiter(o['suite'])
    visiter(racine)
    for qid, opts in AJOUTS.items():
        n = index[qid]; i = _position(n)
        nouv = [{'reponse': t, 'suite': (lambda s: s if isinstance(s, dict) else {'espece': s})(_construire(Q, x))} for t, x in opts]
        n['options'][i:i] = nouv
    for sp, conv in CONVERSIONS.items():
        trouve = []
        def rempl(n):
            if 'espece' in n: return
            for o in n['options']:
                if o['suite'].get('espece') == sp: o['suite'] = _construire(Q, conv); trouve.append(1)
                else: rempl(o['suite'])
        rempl(racine)
        assert trouve, sp

def courts(C):
    """Complète le dictionnaire des réponses courtes (mêmes positions que appliquer())."""
    def ajouter_q(s):
        if not isinstance(s, tuple): return
        _, id_, _q, options, c = s
        C[id_] = list(c)
        for _t, x in options: ajouter_q(x)
    for qid, opts in AJOUTS.items():
        i = C[qid].index('Autres') if 'Autres' in C[qid] else len(C[qid])  # même règle que _position()
        lib = []
        for t, x in opts:
            if t == AUTRES: lib.append('Autres')
            elif isinstance(x, tuple): lib.append(COURT_Q[x[1]])
            else: lib.append(COURT_SP[x])
            ajouter_q(x)
        C[qid][i:i] = lib
    for sp, conv in CONVERSIONS.items(): ajouter_q(conv)

