"""Génère data/cle.json à partir d'une description compacte (plus lisible à maintenir).
Syntaxe : Q(id, question, options, aide, groupe) ; options = [(réponse, suite), ...] ;
une suite = Q(...) ou un identifiant d'espèce (str).
Les réponses « AUTRES » mènent aux espèces secondaires (dessinées au-delà du cercle pointillé)."""
import json, os
def Q(id, question, options, aide=None, groupe=None):
    n = {"id": id, "question": question}
    if aide: n["aide"] = aide
    if groupe: n["groupe"] = groupe
    n["options"] = [{"reponse": r, "suite": (s if isinstance(s, dict) else {"espece": s})} for r, s in options]
    return n
AUTRES = "Aucune de ces descriptions (autres espèces)"

# ======================= AMANITES =======================
amanites = Q("amanites", "Quelle est la forme de la base du pied ?", [
  ("Volve en sac membraneux, libre autour du pied", Q("amanites-sac", "Couleur du chapeau et des lames ?", [
      ("Chapeau orange vif, lames et pied jaunes ; anneau jaune", "amanita-caesarea"),
      ("Chapeau vert olive à jaunâtre (parfois blanchâtre), fibrilles rayonnantes, lames blanches ; anneau", "amanita-phalloides"),
      ("Entièrement blanc (chapeau, lames, pied)", Q("amanites-blanches", "Forme du chapeau, aspect du pied, saison ?", [
          ("Chapeau conique, souvent asymétrique ; pied pelucheux ; été-automne", "amanita-virosa"),
          ("Chapeau convexe puis plat, régulier ; pied lisse ; printemps", "amanita-verna"),
          ("Très grand et massif (10 à 25 cm), marge du chapeau floconneuse, volve épaisse", Q("amanites-ovoides", "Couleur de la volve ?", [
              ("Volve blanche ; anneau crémeux qui s'effiloche", "amanita-ovoidea"),
              ("Volve orangée à rousse ; anneau membraneux persistant", "amanita-proxima"),
          ], aide="Grandes amanites blanches du Midi : l'amanite à volve rousse détruit les reins.")),
      ], aide="Toutes les amanites blanches sont à rejeter : plusieurs sont mortelles.")),
      ("Chapeau gris, fauve ou orangé à marge striée ; pas d'anneau", Q("amanites-vaginees", "Couleur du chapeau ?", [
          ("Gris souris à gris-brun ; volve blanche", "amanita-vaginata"),
          ("Fauve roux à brun-orangé ; volve tachée de roux", "amanita-fulva"),
          ("Orange safran ; pied chiné d'orange", "amanita-crocea"),
      ], groupe="Amanites vaginées")),
  ])),
  ("Bulbe arrondi, avec bourrelets ou un rebord, sans sac", Q("amanites-bulbe", "Couleur du chapeau ?", [
      ("Rouge à orange, couvert de verrues blanches", "amanita-muscaria"),
      ("Brun, verrues blanc pur ; bulbe à rebord net « en chaussette » ; anneau lisse", "amanita-pantherina"),
      ("Brun rosé, verrues grisâtres ; chair qui rougit lentement", "amanita-rubescens"),
      ("Jaune pâle à blanc, larges plaques ; gros bulbe marginé ; odeur de rave", "amanita-citrina"),
      (AUTRES, Q("amanites-bulbe-autres", "Couleur du chapeau et des verrues ?", [
          ("Jaune jonquille, verrues blanches ; bulbe à petite collerette", "amanita-gemmata"),
          ("Gris-brun, verrues grises ; chair qui ne rougit pas ; anneau strié", "amanita-excelsa"),
          ("Gris-brun violacé ; anneau grisâtre ; odeur de rave", "amanita-porphyria"),
          ("Brun-jaunâtre, verrues jaunes ; anneau jaune", "amanita-franchetii"),
          ("Grand, blanc, couvert de larges écailles plates ; bulbe en fuseau enfoncé", "amanita-strobiliformis"),
      ])),
  ], aide="Les verrues peuvent être lavées par la pluie : ne vous fiez jamais à leur absence.")),
], aide="Toutes les amanites sont à laisser aux spécialistes : plusieurs sont mortelles.", groupe="Amanites")

# ======================= SPORÉE BLANCHE =======================
lactaires = Q("lactaires", "Couleur du lait et arbre voisin ?", [
  ("Orange carotte ; chair qui verdit ; sous les pins", "lactarius-deliciosus"),
  ("Blanc ; chapeau rose saumon à marge laineuse ; sous les bouleaux", "lactarius-torminosus"),
  (AUTRES, Q("lactaires-autres", "Couleur du lait ?", [
      ("Orange", Q("lactaires-orange", "Arbre voisin et aspect ?", [
          ("Sous les épicéas ; chapeau orange taché de vert", "lactarius-deterrimus"),
          ("Sous les sapins ; chapeau orange saumon pâle, peu zoné", "lactarius-salmonicolor"),
      ])),
      ("Rouge vineux ; sous les pins", "lactarius-sanguifluus"),
      ("Blanc qui jaunit vivement à l'air", "lactarius-chrysorrheus"),
      ("Rouge sang, sur un petit champignon conique poussant sur bois", "mycena-haematopus"),
      ("Blanc, immuable", Q("lactaires-blancs", "Aspect du chapeau ?", [
          ("Orange-fauve ; lait très abondant ; odeur de hareng en vieillissant", "lactifluus-volemus"),
          ("Blanc ; lames très serrées ; lait très âcre", "lactifluus-piperatus"),
          ("Blanc, velouté ; lames espacées", "lactifluus-vellereus"),
          ("Brun-roux zoné ; odeur de punaise ; sous les chênes", "lactarius-quietus"),
          ("Olive-noir, visqueux ; sous les bouleaux", "lactarius-turpis"),
      ])),
  ])),
], groupe="Lactaires")

russules = Q("russules", "Couleur du chapeau ?", [
  ("Rouge vif ; lames blanches cassantes ; sous conifères ou dans les mousses", "russula-emetica"),
  ("Vert-de-gris, cuticule craquelée en petites plaques", "russula-virescens"),
  ("Violet, vert ou mêlé ; lames souples, grasses au toucher", "russula-cyanoxantha"),
  (AUTRES, Q("russules-autres", "Couleur dominante du chapeau ?", [
      ("Rouge, rose ou pourpre", Q("russules-rouges", "Aspect et lames ?", [
          ("Rouge vif, petit ; lames blanches ; sous les hêtres", "russula-mairei"),
          ("Rouge-violacé ; lames jaune citron ; saveur très âcre ; sous les pins", "russula-sardonia"),
          ("Pourpre à brun-rouge ; odeur de hareng ; chair qui brunit", "russula-xerampelina"),
          ("Brun-rouge ; lames crème puis jaune ; saveur douce", "russula-integra"),
          ("Rose-brun ; cuticule qui n'atteint pas le bord (« montre les dents »)", "russula-vesca"),
          ("Grand, olive-pourpre ; lames jaunes ; pied rosé", "russula-olivacea"),
      ])),
      ("Jaune ou ocre", Q("russules-jaunes", "Saveur et odeur ?", [
          ("Jaune paille ; saveur amère et piquante ; odeur de pomme cuite", "russula-fellea"),
          ("Jaune ocre ; pied blanc ; saveur douce à un peu âcre", "russula-ochroleuca"),
          ("Brun-ocre, visqueux, marge cannelée ; odeur rance et désagréable", "russula-foetens"),
      ])),
      ("Vert à brun-olive, lisse (non craquelé)", "russula-heterophylla"),
      ("Blanc ou noircissant", Q("russules-blanches", "Aspect ?", [
          ("Blanc sale en entonnoir ; lames à reflet vert-bleuté", "russula-delica"),
          ("Gris-brun puis noir ; lames épaisses espacées ; chair rougit puis noircit", "russula-nigricans"),
      ])),
  ], aide="Ne goûtez pas : recrachez et lavez-vous la bouche si vous le faites.")),
], groupe="Russules", aide="Ne goûtez pas : recrachez et lavez-vous la bouche si vous le faites.")

anneau_oui = Q("blanche-anneau-oui", "Taille et port ?", [
  ("Grand (chapeau > 10 cm), chapeau écailleux, pied élancé", Q("coulemelles", "Pied et chair ?", [
      ("Très grand (15 à 30 cm) ; pied chiné de brun ; anneau double coulissant ; chair immuable", "macrolepiota-procera"),
      ("Pied lisse blanchâtre, bulbe arrondi ; chair rougissant orangé ; dans les bois", "chlorophyllum-rhacodes"),
      (AUTRES, Q("coulemelles-autres", "Aspect ?", [
          ("Chapeau 8 à 12 cm à mamelon pointu ; pied finement chiné", "macrolepiota-mastoidea"),
          ("Bulbe très marginé « en marche d'escalier » ; chair rougissante ; jardins, composts", "chlorophyllum-brunneum"),
          ("Écailles pointues dressées brun foncé ; lames serrées ; odeur de caoutchouc", "echinoderma-asperum"),
      ])),
  ], groupe="Coulemelles", aide="Ne récoltez que les grands exemplaires (chapeau > 10 cm, pied > 15 cm).")),
  ("Petit (chapeau < 8 cm), au sol", Q("lepiotes", "Aspect des écailles du chapeau ?", [
      ("Brun-lilas à brun-rose, en cercles concentriques ; pied méché de rose-brun", "lepiota-brunneoincarnata"),
      ("Rose chair à brun rosé, fines écailles ; anneau fugace", "lepiota-subincarnata"),
      ("Brun-rougeâtre ; anneau membraneux bien formé", "lepiota-helveola"),
      ("Disque brun, écailles brunes sur fond blanc ; odeur forte de caoutchouc", "lepiota-cristata"),
      (AUTRES, Q("lepiotes-autres", "Aspect ?", [
          ("Chapeau brun châtain uniforme, écailles fines ; lames se tachant de roux", "lepiota-castanea"),
          ("Chapeau et pied couverts de flocons laineux blanc-crème", "lepiota-clypeolaria"),
          ("Entièrement jaune citron ; dans les pots de fleurs et serres", "leucocoprinus-birnbaumii"),
      ])),
  ], groupe="Petites lépiotes", aide="Toute petite lépiote est à rejeter : plusieurs sont mortelles et difficiles à distinguer.")),
  ("En touffes sur bois ou souches", Q("touffes-blanches", "Couleur et aspect du chapeau ?", [
      ("Jaune miel, petites mèches sombres au centre", "armillaria-mellea"),
      (AUTRES, Q("touffes-blanches-autres", "Aspect ?", [
          ("Brun-rosé, mèches brunes ; anneau épais ; souvent sous conifères", "armillaria-ostoyae"),
          ("Blanc translucide, très visqueux ; sur hêtre", "oudemansiella-mucida"),
      ])),
  ])),
  ("Chapeau blanc et lisse, sans écailles ; au sol", "leucoagaricus-leucothites"),
])

clitocybes = Q("clitocybes", "Taille, couleur, odeur ?", [
  ("Orange, lames orange serrées et fourchues", "hygrophoropsis-aurantiaca"),
  ("Bleu-vert, forte odeur d'anis", "clitocybe-odora"),
  ("Blanc, petit (< 5 cm), lames serrées et minces ; dans l'herbe des prés", "clitocybe-rivulosa"),
  ("Gris, grand et charnu, odeur forte ; en troupes dans les bois", "clitocybe-nebularis"),
  ("Crème-chamois, très grand, en entonnoir avec mamelon, pied haut", "infundibulicybe-geotropa"),
  (AUTRES, Q("clitocybes-autres", "Aspect et odeur ?", [
      ("Petit entonnoir chamois-rosé ; pied fin ; odeur d'amande", "infundibulicybe-gibba"),
      ("Blanc givré, 4 à 10 cm ; dans les feuilles mortes ; odeur aromatique", "clitocybe-phyllophila"),
      ("Gris-brun ; pied renflé en massue à la base", "ampulloclitocybe-clavipes"),
      ("Énorme (15 à 40 cm), blanc-crème, en entonnoir ; pied court ; en ronds dans les prés", "leucopaxillus-giganteus"),
      ("Roux-orangé en entonnoir ; odeur faible", "lepista-flaccida"),
      ("Chamois-orangé en entonnoir ; très forte odeur florale (jasmin, poire) ; montagne", "paralepistopsis-amoenolens"),
      ("Lames épaisses et espacées, cireuses ; dans les prés", Q("hygrophores-pres", "Couleur ?", [
          ("Orange-saumon", "cuphophyllus-pratensis"),
          ("Blanc ivoire", "cuphophyllus-virgineus"),
      ])),
      ("Gris-brun ; au pied des panicauts (chardon bleu), en terrain ouvert", "pleurotus-eryngii"),
  ])),
], groupe="Clitocybes")

tricholomes = Q("tricholomes", "Aspect général ?", [
  ("Petit ; pied fin et coriace (se tord sans casser) ; en ronds dans l'herbe", "marasmius-oreades"),
  ("Blanc-crème, charnu, odeur de farine ; au printemps", "calocybe-gambosa"),
  ("Chapeau jaune verdâtre à centre brunâtre, lames jaune soufre ; sous pins, dans le sable", "tricholoma-equestre"),
  ("Chapeau gris couvert de mèches sombres (tigré), trapu", "tricholoma-pardinum"),
  ("Chapeau gris fibrilleux strié de noir ; lames blanches jaunissantes", "tricholoma-portentosum"),
  (AUTRES, Q("tricholomes-autres", "Où pousse-t-il et comment ?", [
      ("Sur bois (souches, troncs, branches)", Q("tricho-bois", "Aspect ?", [
          ("Chapeau orange-roux visqueux ; pied velouté brun-noir ; en touffes, en hiver", "flammulina-velutipes"),
          ("Chapeau couvert de fines mèches pourpres sur fond jaune ; sur souches de conifères", "tricholomopsis-rutilans"),
          ("Minuscule « parapluie » blanc ; lames attachées à un collier ; sur brindilles", "marasmius-rotula"),
          ("Petite cloche gris-brun ridée ; pied lisse et raide ; en touffes sur souches", "mycena-galericulata"),
          ("Chapeau gris-brun fibrilleux ; lames très larges et espacées ; cordons blancs à la base", "megacollybia-platyphylla"),
      ])),
      ("Au sol, en grosses touffes serrées", Q("tricho-touffes", "Aspect ?", [
          ("Chapeau gris-brun lisse ; chair élastique ; bords de chemins", "lyophyllum-decastes"),
          ("Chapeau roux ; pied en fuseau cannelé enraciné ; au pied des chênes", "gymnopus-fusipes"),
      ])),
      ("Au sol, isolé ou en groupes", Q("tricho-sol", "Couleur du chapeau ?", [
          ("Gris à noir", Q("tricho-gris", "Aspect ?", [
              ("Gris souris, feutré, petit ; sans odeur de farine ; sous pins", "tricholoma-terreum"),
              ("Gris argenté, conique pointu, strié ; saveur amère", "tricholoma-virgatum"),
              ("Vert-olive à gris ; odeur de savon ; chair rosissant à la base", "tricholoma-saponaceum"),
              ("Brun très foncé, plat à petit mamelon ; lames blanches serrées", "melanoleuca-melaleuca"),
              ("Gris-noir ; lames grises épaisses ; au printemps, à la fonte des neiges, en montagne", "hygrophorus-marzuolus"),
          ])),
          ("Blanc soyeux ; taches bleu-vert au pied ; en automne", "tricholoma-columbetta"),
          ("Entièrement jaune soufre ; odeur forte de gaz d'éclairage ; sous feuillus", "tricholoma-sulphureum"),
          ("Rouge, orange, rose ou violet", Q("tricho-couleurs", "Aspect ?", [
              ("Rouge écarlate, visqueux, ne noircit pas ; dans les prés", "hygrocybe-punicea"),
              ("Orange-rose ; lames roses épaisses et espacées", "laccaria-laccata"),
              ("Entièrement violet améthyste", "laccaria-amethystina"),
              ("Rose-lilas, petit (2 à 5 cm) ; odeur de radis", "mycena-pura"),
              ("Rose, plus grand (3 à 6 cm) ; odeur de radis ; sous les hêtres", "mycena-rosea"),
              ("Orange-rouge, conique pointu ; noircit en vieillissant ou au toucher ; dans les prés", "hygrocybe-conica"),
              ("Grand et charnu, blanc taché de rouge vineux ; sous les chênes", "hygrophorus-russula"),
          ])),
          ("Brun", Q("tricho-bruns", "Chapeau et pied ?", [
              ("Pied fin, lisse, creux ; petit ; dans la litière", "gymnopus-dryophilus"),
              ("Pied très long, enraciné profondément ; chapeau ridé, visqueux", "hymenopellis-radicata"),
              ("Chapeau gras au toucher (« beurré ») ; pied renflé en massue à la base", "rhodocollybia-butyracea"),
              ("Chapeau brun-roux visqueux ; lames se tachant de roux ; sous les hêtres", "tricholoma-ustale"),
          ])),
      ])),
  ])),
], groupe="Tricholomes et mousserons")

blanche = Q("blanche-chair", "Comment se casse la chair du pied ?", [
  ("Il en coule un lait (latex)", lactaires),
  ("Net, comme de la craie, sans fibres", russules),
  ("Fibreuse, se déchire en long", Q("blanche-anneau", "Le pied porte-t-il un anneau ?", [
      ("Oui", anneau_oui),
      ("Non", Q("blanche-lames", "Comment les lames s'attachent-elles au pied ?", [
          ("Elles descendent le long du pied (décurrentes)", Q("decurrentes", "Où pousse-t-il ?", [
              ("Sur bois (tronc, souche)", Q("decurrentes-bois", "Aspect ?", [
                  ("Chapeau gris en forme d'huître, pied court et latéral, en étages", "pleurotus-ostreatus"),
                  ("Orange vif, en grosses touffes, pied central, lames orange", "omphalotus-olearius"),
                  (AUTRES, Q("decurrentes-bois-autres", "Aspect ?", [
                      ("Crème, en corne d'abondance ; pied central ; en touffes sur feuillus", "pleurotus-cornucopiae"),
                      ("Petit (1 à 3 cm), brun clair, en éventail ; saveur très âcre", "panellus-stipticus"),
                      ("Petit éventail gris velu ; lames fendues en deux sur la longueur", "schizophyllum-commune"),
                      ("Jaune miel, en touffes ; sans anneau ; dans le Midi", "desarmillaria-tabescens"),
                  ])),
              ])),
              ("Au sol", clitocybes),
          ])),
          ("Attachées au pied, échancrées ou presque libres", tricholomes),
      ])),
  ])),
], groupe="Sporée blanche")

# ======================= SPORÉE ROSE =======================
rose = Q("rose", "Lames et couleur ?", [
  ("Lames décurrentes ; chapeau blanc mat ; forte odeur de farine", "clitopilus-prunulus"),
  ("Lames échancrées ; tout violet-lilas", "lepista-nuda"),
  ("Lames échancrées jaunâtres puis roses ; grand chapeau gris-crème", "entoloma-sinuatum"),
  (AUTRES, Q("rose-autres", "Aspect ?", [
      ("Chapeau beige-crème ; pied violet ; dans les prés", "lepista-saeva"),
      ("Petit, lilas-brun ; jardins, composts", "lepista-sordida"),
      ("Gris-brun ; au printemps, sous les rosacées (aubépine, prunier) ; odeur de farine", "entoloma-clypeatum"),
      ("Gris-brun pâlissant en séchant ; en automne, dans les bois", "entoloma-rhodopolium"),
      ("Lames libres ; sur bois mort ; chapeau brun fibrilleux", "pluteus-cervinus"),
  ])),
], groupe="Sporée rose")

# ======================= SPORÉE BRUNE =======================
brune = Q("brune", "Particularité la plus visible ?", [
  ("Lames décurrentes, se détachant facilement au doigt ; marge enroulée", "paxillus-involutus"),
  ("En touffes sur bois, anneau sur le pied", Q("touffes-brunes", "Pied sous l'anneau et chapeau ?", [
      ("Couvert de petites écailles brunes retroussées ; chapeau bicolore", "kuehneromyces-mutabilis"),
      ("Lisse, à fibrilles argentées, sans écailles", "galerina-marginata"),
      (AUTRES, Q("touffes-brunes-autres", "Aspect ?", [
          ("Chapeau et pied hérissés de grosses écailles brunes sur fond jaune paille", "pholiota-squarrosa"),
          ("Grand (8 à 15 cm), orange doré ; saveur amère", "gymnopilus-junonius"),
          ("Beige-brun, souvent craquelé ; sur peupliers et saules", "agrocybe-cylindracea"),
      ])),
  ], aide="Distinction difficile, même pour des connaisseurs : la galère est mortelle.")),
  ("Au sol ; voile en toile d'araignée (cortine) chez le jeune", Q("cortinaires", "Forme et couleur ?", [
      ("Chapeau convexe puis plat, fauve orangé ; pied sans bracelets", "cortinarius-orellanus"),
      ("Chapeau conique à mamelon, roux ; pied à bracelets jaunes", "cortinarius-rubellus"),
      (AUTRES, Q("cortinaires-autres", "Couleur ?", [
          ("Entièrement violet foncé, velouté", "cortinarius-violaceus"),
          ("Chapeau brun-olive ; lames rouge sang", "cortinarius-semisanguineus"),
          ("Chapeau ocre ridé ; anneau membraneux blanc", "cortinarius-caperatus"),
          ("Très grand (10 à 20 cm), brun-violacé ; marge givrée de voile blanc", "cortinarius-praestans"),
      ])),
  ], groupe="Cortinaires")),
  ("Au sol ; chapeau conique fibrilleux, souvent fendu (inocybes)", Q("inocybes", "Couleur ?", [
      ("Blanc à crème, rougissant ; au printemps", "inocybe-erubescens"),
      (AUTRES, Q("inocybes-autres", "Aspect ?", [
          ("Petit, blanc soyeux (ou lilas) ; ne rougit pas", "inocybe-geophylla"),
          ("Jaune paille à brun ; chapeau très fendu radialement", "inocybe-rimosa"),
          ("Brun-roux fendu ; petit bulbe arrondi à rebord net à la base du pied", "inocybe-asterospora"),
      ])),
  ], groupe="Inocybes")),
  (AUTRES, Q("brune-autres", "Habitat et aspect ?", [
      ("Au sol ; odeur de radis ; lames qui pleurent des gouttelettes", Q("hebelomes", "Taille ?", [
          ("Moyen (3 à 8 cm), crème à beige", "hebeloma-crustuliniforme"),
          ("Grand (8 à 15 cm) ; pied creux avec une « mèche » à l'intérieur", "hebeloma-sinapizans"),
      ])),
      ("Petit et fragile ; anneau ; sur copeaux, gazons", "conocybe-rugosa"),
      ("Petit, brun ; sans anneau ; sur brindilles, en hiver", "tubaria-furfuracea"),
      ("Beige ; anneau ; au printemps, dans les jardins et prés", "agrocybe-praecox"),
      ("Orange-roux ; sans anneau ; sur bois de conifères", "gymnopilus-penetrans"),
  ])),
], groupe="Sporée brune")

# ======================= SPORÉE SOMBRE =======================
noire = Q("noire", "Particularité la plus visible ?", [
  ("Lames qui se liquéfient en encre noire", Q("coprins", "Forme du chapeau ?", [
      ("Haut cylindre blanc couvert de mèches", "coprinus-comatus"),
      ("Cloche grise lisse, en touffes", "coprinopsis-atramentaria"),
      (AUTRES, Q("coprins-autres", "Aspect ?", [
          ("Chapeau noir couvert de plaques blanches (comme une pie)", "coprinopsis-picacea"),
          ("Petit, ocre, couvert de granules brillants ; en touffes sur bois", "coprinellus-micaceus"),
          ("Minuscule parapluie gris plissé ; dans les pelouses", "parasola-plicatilis"),
      ])),
  ], groupe="Coprins")),
  ("Lames libres, roses puis chocolat ; anneau ; au sol", Q("agarics", "Réaction au grattage, odeur, habitat ?", [
      ("Ne jaunit pas ; anneau mince ; odeur agréable ; prés pâturés", "agaricus-campestris"),
      ("Jaunit légèrement ; odeur d'anis ; anneau ample en roue dentée ; dans les prés", "agaricus-arvensis"),
      ("Chapeau blanc ; jaunit vivement à la base du pied ; odeur d'encre (phénol)", "agaricus-xanthodermus"),
      (AUTRES, Q("agarics-autres", "Aspect ?", [
          ("Grand ; écailles brun doré ; odeur d'amande", "agaricus-augustus"),
          ("Écailles brunes ; chair qui rougit ; sous conifères", "agaricus-sylvaticus"),
          ("Blanc ; jaunit un peu ; odeur d'anis ; dans les bois", "agaricus-sylvicola"),
          ("Chapeau aplati ; double anneau ; trottoirs, bords de routes", "agaricus-bitorquis"),
          ("Brun à petites écailles ; fumiers, jardins", "agaricus-bisporus"),
          ("Fines écailles gris-noir ; jaunit à la base ; odeur d'encre", "agaricus-moelleri"),
      ])),
  ], groupe="Agarics (rosés)", aide="Les lames d'une amanite blanche restent blanches : en cas de doute, rejetez.")),
  ("En touffes sur bois ou souches", Q("touffes-sombres", "Couleur du chapeau et des lames ?", [
      ("Jaune soufre ; lames verdâtres ; très amer", "hypholoma-fasciculare"),
      (AUTRES, Q("touffes-sombres-autres", "Aspect ?", [
          ("Rouge brique ; lames grises", "hypholoma-lateritium"),
          ("Ocre ; lames gris pâle ; sur souches de conifères", "hypholoma-capnoides"),
          ("Brun, pâlissant en séchant ; lames brunes", "psathyrella-piluliformis"),
          ("Minuscules chapeaux crème-gris plissés, par centaines ; ne se liquéfient pas", "coprinellus-disseminatus"),
      ])),
  ])),
  (AUTRES, Q("noire-autres", "Aspect ?", [
      ("Vert-bleu, visqueux ; anneau", "stropharia-aeruginosa"),
      ("Grand, brun-vineux ; anneau épais denté ; sur paillages", "stropharia-rugosoannulata"),
      ("Crème, marge ornée de lambeaux blancs ; pelouses", "psathyrella-candolleana"),
      ("Brun-jaune fibrilleux ; lames qui « pleurent » des gouttes noires", "lacrymaria-lacrymabunda"),
      ("Petit, conique pointu à mamelon ; dans les prés", "psilocybe-semilanceata"),
      ("Lames décurrentes épaisses ; chapeau visqueux", Q("gomphides", "Couleur et arbre ?", [
          ("Orange-cuivré ; sous les pins", "chroogomphus-rutilus"),
          ("Gris-violet, très visqueux ; sous les épicéas", "gomphidius-glutinosus"),
      ])),
  ])),
], groupe="Sporée sombre")

lames = Q("volve", "Le pied sort-il d'une volve (sac membraneux) ou d'un bulbe à rebord ?", [
  ("Oui : volve ou bulbe à la base", Q("volve-sporee", "Couleur de la sporée et habitat ?", [
      ("Rose saumon (lames blanches puis roses) ; au sol", "volvopluteus-gloiocephalus"),
      ("Rose saumon ; sur un tronc d'arbre ; chapeau soyeux blanc", "volvariella-bombycina"),
      ("Blanche (lames restant blanches ou jaunes)", amanites),
  ])),
  ("Non : pied sans volve ni bulbe à rebord", Q("sporee", "Couleur de la sporée ?", [
      ("Blanche à crème", blanche),
      ("Rose à rose saumon", rose),
      ("Brun rouille, ocre ou tabac", brune),
      ("Brun pourpre, chocolat ou noire", noire),
  ], aide="Sporée : posez le chapeau, lames en bas, sur une feuille mi-blanche mi-noire, sous un verre, 4 à 12 h.")),
], aide="Déterrez le pied entier : la volve reste souvent dans le sol. En cas de doute, considérez qu'il y en a une.", groupe="Champignons à lames")

# ======================= BOLETS =======================
bolets = Q("bolets", "Le chapeau est-il gluant, avec un anneau sur le pied ?", [
  ("Oui", Q("suillus-anneau", "Couleur et arbre ?", [
      ("Brun chocolat ; sous les pins", "suillus-luteus"),
      ("Jaune d'or à orange ; sous les mélèzes", "suillus-grevillei"),
  ])),
  ("Non", Q("bolets-pied", "Le pied est-il couvert de petites mèches noires (scabres) ?", [
      ("Oui, pied rugueux", Q("leccinum", "Couleur du chapeau et arbre ?", [
          ("Brun grisâtre ; sous les bouleaux", "leccinum-scabrum"),
          (AUTRES, Q("leccinum-autres", "Aspect ?", [
              ("Orange ; sous les bouleaux ; chair noircissant", "leccinum-versipelle"),
              ("Rouge-orangé ; sous les trembles et peupliers", "leccinum-aurantiacum"),
              ("Brun-rouge orangé ; sous les chênes", "leccinum-quercinum"),
          ])),
      ])),
      ("Non", Q("bolets-bleuit", "La chair bleuit-elle à la coupe ?", [
          ("Non, elle reste blanche ou jaune", Q("cepes-pores", "Couleur des pores et du réseau du pied ?", [
              ("Pores roses ; réseau brun foncé ; chair très amère", "tylopilus-felleus"),
              ("Pores blancs puis jaune-vert ; pied plein avec réseau clair", Q("cepes", "Couleur du chapeau ?", [
                  ("Brun noisette, marge plus claire ; pied ventru", "boletus-edulis"),
                  ("Brun-noir bronzé ; réseau brunâtre", "boletus-aereus"),
                  ("Brun clair, mat ; réseau sur tout le pied ; dès le printemps", "boletus-reticulatus"),
                  ("Brun-rouge acajou ; sous pins", "boletus-pinophilus"),
              ], groupe="Cèpes")),
              (AUTRES, Q("bolets-immuables-autres", "Aspect ?", [
                  ("Chapeau brun-jaune gluant sans anneau ; pores jaunes avec gouttelettes ; sous pins", "suillus-granulatus"),
                  ("Pores larges et anguleux ; chapeau orangé ; sous pins", "suillus-bovinus"),
                  ("Chapeau jaune-ocre granuleux ; odeur de chlore ; sous pins", "suillus-variegatus"),
                  ("Petit ; pores couleur rouille ; saveur poivrée", "chalciporus-piperatus"),
                  ("Chapeau ocre velouté ; pores jaunes ; odeur d'iode", "hemileccinum-impolitum"),
                  ("Chapeau marron velouté ; pores blancs ; pied creux et cassant", "gyroporus-castaneus"),
                  ("Chapeau couvert de grosses écailles noires (pomme de pin)", "strobilomyces-strobilaceus"),
                  ("Chapeau blanchâtre à centre brun, gluant ; pied court ; pins du Midi", "suillus-bellinii"),
              ])),
          ])),
          ("Oui, elle bleuit", Q("bolets-bleus", "Couleur des pores ?", [
              ("Jaunes ; chapeau brun bai lisse, visqueux par temps humide ; pied sans réseau", "imleria-badia"),
              ("Rouges", Q("pores-rouges", "Chapeau, pied et chair ?", [
                  ("Chapeau blanc grisâtre ; pied ventru, rouge en bas, à réseau rouge ; odeur forte", "rubroboletus-satanas"),
                  ("Chapeau brun foncé velouté ; pied ponctué de rouge, sans réseau ; chair jaune", "neoboletus-erythropus"),
                  (AUTRES, Q("pores-rouges-autres", "Aspect ?", [
                      ("Chapeau olive-brun ; pied à réseau rouge ; chair rouge à la base du pied", "suillellus-luridus"),
                      ("Chapeau orange-brique ; pied sans réseau ; chair rouge betterave à la base", "suillellus-queletii"),
                      ("Chapeau blanc rosé ; pied jaune vif à réseau rouge", "rubroboletus-rhodoxanthus"),
                  ])),
              ])),
              (AUTRES, Q("bolets-bleus-autres", "Aspect ?", [
                  ("Cuticule craquelée laissant voir du rouge ; pores jaunes", "xerocomellus-chrysenteron"),
                  ("Chapeau velouté olive ; pores larges jaune vif", "xerocomus-subtomentosus"),
                  ("Chapeau brun ; pores jaune citron ; pied à réseau jaune ; chair bleuit peu", "butyriboletus-appendiculatus"),
                  ("Chapeau gris ; pied rouge à réseau ; chair amère", "caloboletus-calopus"),
                  ("Chapeau blanc-gris ; pied jaune profondément enraciné ; amer", "caloboletus-radicans"),
                  ("Pores blanchâtres ; chair bleu bleuet intense et immédiat", "gyroporus-cyanescens"),
                  ("Chapeau rose à rouge ; pores jaunes ; pied jaune à réseau", "butyriboletus-regius"),
              ])),
          ])),
      ])),
  ])),
], groupe="Bolets")

# ======================= AUTRES FORMES =======================
hydnes = Q("hydnes", "Couleur et taille ?", [
  ("Crème à orangé pâle ; chair épaisse ; assez grand", "hydnum-repandum"),
  ("Roux orangé ; plus petit et plus fin", "hydnum-rufescens"),
  (AUTRES, Q("hydnes-autres", "Aspect ?", [
      ("Grand, chapeau couvert de grosses écailles brunes retroussées", "sarcodon-imbricatus"),
      ("Blanc, couvert de gouttes rouge sang", "hydnellum-peckii"),
      ("Minuscule, brun, pied latéral ; sur cônes de pin", "auriscalpium-vulgare"),
  ])),
], groupe="Pieds-de-mouton")

chanterelles = Q("chanterelles", "Le dessous du chapeau porte :", [
  ("Des plis épais, fourchus, descendant sur le pied", Q("plis", "Couleur ?", [
      ("Jaune d'œuf partout, chapeau lisse ; chair pleine ; odeur fruitée", "cantharellus-cibarius"),
      ("Chapeau brun en entonnoir ; plis grisâtres ; pied creux jaune", "craterellus-tubaeformis"),
      (AUTRES, Q("plis-autres", "Aspect ?", [
          ("Jaune, chapeau couvert de fines mèches lilas", "cantharellus-amethysteus"),
          ("Violet, en massue tronquée ; plis violets", "gomphus-clavatus"),
          ("Jaune très pâle, givré de blanc ; jaunit à orangé au toucher", "cantharellus-pallens"),
      ])),
  ])),
  ("Une surface presque lisse ou faiblement veinée", Q("lisse", "Couleur ?", [
      ("Gris-noir, en forme de trompette creuse", "craterellus-cornucopioides"),
      ("Chapeau brun ; pied orange vif ; dessous rosé-orangé", "craterellus-lutescens"),
      ("Gris, petit, chapeau ondulé ; pied gris", "pseudocraterellus-undulatus"),
  ])),
], groupe="Chanterelles et trompettes")

ascos = Q("ascos", "Forme de la tête ?", [
  ("Alvéolée en nid d'abeilles, creuse, soudée au pied", Q("morilles", "Forme de la tête ?", [
      ("Arrondie ; alvéoles irrégulières jaunâtres à grises", "morchella-esculenta"),
      ("Conique ; alvéoles en rangées verticales, arêtes sombres", "morchella-elata"),
  ], groupe="Morilles")),
  ("Plissée en cervelle, brun-rouge, intérieur cloisonné ; au printemps", "gyromitra-esculenta"),
  ("En forme de selle blanchâtre ; pied creusé de côtes", "helvella-crispa"),
  (AUTRES, Q("ascos-autres", "Aspect ?", [
      ("Tête alvéolée, libre du pied sur sa moitié inférieure (« jupe »)", "morchella-semilibera"),
      ("Petit « dé à coudre » ridé, entièrement libre du pied", "verpa-bohemica"),
      ("Selle gris-noir ; pied gris côtelé", "helvella-lacunosa"),
      ("Selle ou turban brun-roux ; pied lisse ; en automne, sur bois pourri", "gyromitra-infula"),
  ])),
], groupe="Morilles et apparentés")

boules = Q("boules", "Coupé en deux de haut en bas, l'intérieur est :", [
  ("Blanc et homogène ; enveloppe couverte de petites perles", "lycoperdon-perlatum"),
  ("Blanc et homogène ; boule énorme (15 à 50 cm), lisse", "calvatia-gigantea"),
  ("Noir violacé marbré de blanc ; enveloppe épaisse, écailleuse, jaunâtre", "scleroderma-citrinum"),
  (AUTRES, Q("boules-autres", "Aspect ?", [
      ("En groupes serrés sur bois pourri ; en forme de poire", "lycoperdon-pyriforme"),
      ("Grand, en forme de quille, avec un long pied", "lycoperdon-excipuliforme"),
      ("Petite boule lisse blanche puis gris plomb, sans pied ; prés", "bovista-plumbea"),
      ("Enveloppe mince brune ; base plissée en pied ; intérieur noir", "scleroderma-verrucosum"),
      ("Enterré ; boule noire à verrues pyramidales ; intérieur veiné de blanc", Q("truffes", "Intérieur et saison ?", [
          ("Noir violacé veiné de blanc ; en hiver", "tuber-melanosporum"),
          ("Beige à brun veiné de blanc ; en été et automne", "tuber-aestivum"),
      ])),
  ])),
], aide="Si la coupe montre la silhouette d'un champignon (chapeau, lames, pied), c'est un œuf d'amanite : DANGER.", groupe="Vesses-de-loup")

coraux = Q("coraux", "Aspect ?", [
  ("Boule de lames ondulées crème, comme une éponge ; au pied des pins", "sparassis-crispa"),
  ("Rameaux dressés", Q("ramaires", "Couleur des rameaux ?", [
      ("Blancs à extrémités rose-violacé", "ramaria-botrytis"),
      ("Rose saumon à extrémités jaunes", "ramaria-formosa"),
      (AUTRES, Q("ramaires-autres", "Aspect ?", [
          ("Petits rameaux blancs à pointes en crête", "clavulina-cristata"),
          ("Jaune d'or, caoutchouteux ; sur bois de conifères", "calocera-viscosa"),
      ])),
  ])),
  ("Une massue unique jaune-ocre (sans rameaux)", "clavariadelphus-pistillaris"),
], groupe="Clavaires")

consoles = Q("consoles", "Aspect ?", [
  ("En étages jaune soufre et orange vif ; chair tendre", "laetiporus-sulphureus"),
  ("Rouge sang, en forme de langue ; chair qui « saigne »", "fistulina-hepatica"),
  (AUTRES, Q("consoles-autres", "Texture ?", [
      ("Molle à charnue", Q("consoles-molles", "Aspect ?", [
          ("Touffe de nombreux lobes gris-brun ; au pied des chênes", "grifola-frondosa"),
          ("Énorme rosette de lobes bruns qui noircissent au toucher ; au pied des hêtres", "meripilus-giganteus"),
          ("Grand éventail crème à écailles brunes ; pied latéral noir", "polyporus-squamosus"),
          ("Cascade blanche de longs aiguillons pendants", "hericium-erinaceus"),
          ("Brun-roux, très velu ; sur frênes et arbres fruitiers", "inonotus-hispidus"),
          ("Petites consoles grises ; pores gris foncé", "bjerkandera-adusta"),
      ])),
      ("Dure, ligneuse", Q("consoles-dures", "Aspect ?", [
          ("En forme de sabot de cheval, gris", "fomes-fomentarius"),
          ("Grande plaque brune ; pores blancs qui gardent la trace d'un dessin", "ganoderma-applanatum"),
          ("Rouge laqué brillant, avec un pied", "ganoderma-lucidum"),
          ("Marge rouge-orange ; sur conifères", "fomitopsis-pinicola"),
          ("Blanc, en coussin ; uniquement sur bouleaux", "fomitopsis-betulina"),
          ("Pores en labyrinthe ; sur chênes", "daedalea-quercina"),
      ])),
      ("Mince et coriace, en rosettes ou en croûtes", Q("consoles-minces", "Aspect ?", [
          ("Zones concentriques multicolores, veloutées", "trametes-versicolor"),
          ("Blanc, bosselé, épais", "trametes-gibbosa"),
          ("Jaune-orange velu ; dessous lisse, sans pores", "stereum-hirsutum"),
      ])),
  ])),
], groupe="Polypores")

gelatineux = Q("gelatineux", "Forme et couleur ?", [
  ("En forme d'oreille brune, lisse", "auricularia-auricula-judae"),
  ("Oreilles grises zonées et velues, en étages", "auricularia-mesenterica"),
  ("Masse plissée jaune d'or, comme une cervelle", "tremella-mesenterica"),
  ("Feuilles brunes ondulées, en touffe", "tremella-foliacea"),
  ("Masses noires plissées, sur bois mort", "exidia-glandulosa"),
  ("Translucide, avec des aiguillons dessous", "pseudohydnum-gelatinosum"),
  ("Cornet rose-orangé, en touffes", "tremiscus-helvelloides"),
  ("Petit chapeau vert-olive gélatineux sur un pied jaune ; au sol", "leotia-lubrica"),
], groupe="Gélatineux")

etranges = Q("etranges", "Laquelle de ces formes ?", [
  ("Une coupe, une oreille ou un disque", Q("coupes", "Couleur et habitat ?", [
      ("Orange vif ; au sol, sur terre nue", "aleuria-aurantia"),
      ("Rouge écarlate, extérieur blanchâtre ; sur bois mort, en hiver", "sarcoscypha-coccinea"),
      ("Oreille jaune-orangé fendue d'un côté", "otidea-onotica"),
      ("Minuscules coupes bleu-vert ; bois teinté de turquoise", "chlorociboria-aeruginascens"),
      ("Grande coupe brune veinée ; odeur d'eau de Javel ; au printemps", "disciotis-venosa"),
      ("Coupe brune sur un pied blanc à côtes saillantes", "helvella-acetabulum"),
      ("Coupe beige-crème, bord enroulé ; sur fumier ou compost", "peziza-vesiculosa"),
  ], groupe="Pézizes")),
  ("Un pied blanc sortant d'un « œuf », tête gluante et puante", Q("phalles", "Taille et couleur ?", [
      ("Grand, tête verdâtre alvéolée, odeur de charogne", "phallus-impudicus"),
      ("Petit et fin, pointe orange", "mutinus-caninus"),
  ])),
  ("Une cage rouge en treillis", "clathrus-ruber"),
  ("Des bras rouges étalés en étoile (pieuvre)", "clathrus-archeri"),
  ("Une étoile brune portant une boule au centre", "geastrum-triplex"),
  ("Un petit nid contenant des « œufs »", "cyathus-striatus"),
  ("Noir et dur, sur bois", Q("noirs-bois", "Forme ?", [
      ("Petit « bois de cerf » noir à pointes blanches", "xylaria-hypoxylon"),
      ("Doigts noirs en massue", "xylaria-polymorpha"),
      ("Boule noire dure ; zones concentriques à la coupe", "daldinia-concentrica"),
  ])),
], groupe="Formes étranges")

racine = Q("racine", "Quelle est la forme générale du champignon ?", [
  ("Chapeau et pied bien distincts", Q("dessous", "Que voit-on sous le chapeau ?", [
      ("Des lames (feuillets minces rayonnants)", lames),
      ("Des tubes terminés par des pores (éponge)", bolets),
      ("Des aiguillons (petits picots)", hydnes),
      ("Des plis épais et fourchus, ou une surface lisse", chanterelles),
  ])),
  ("Tête alvéolée, en cervelle ou en selle", ascos),
  ("En boule ou en poire, sans chapeau", boules),
  ("Ramifié comme un corail ou un chou-fleur", coraux),
  ("En console sur un tronc, sans vrai pied", consoles),
  ("Gélatineux, mou et tremblotant", gelatineux),
  ("Forme étrange : coupe, étoile, cage, œuf, nid…", etranges),
], aide="Observez le champignon entier, y compris la base du pied : déterrez-le délicatement.")

# espèces ajoutées en v1.22 (branches décrites dans cle_ajouts.py)
import sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import cle_ajouts; cle_ajouts.appliquer(racine, Q)

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
json.dump(racine, open(os.path.join(root, "data", "cle.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("cle.json écrit")
