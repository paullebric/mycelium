# mycélium.

**Carte interactive d'identification des champignons de France, utilisable hors ligne.**

> ⚠️ **Outil pédagogique.** Ne mangez jamais un champignon sur la base de cette carte : faites vérifier toute récolte par un pharmacien ou un mycologue.

👉 **Ouvrir l'app : https://paullebric.github.io/mycelium/**

## Ce que c'est

mycélium présente la clé d'identification des champignons comme une **carte que l'on explore** : on part de la forme générale du champignon, on touche une question, on suit la réponse qui correspond le long de sa branche, jusqu'à l'espèce.

- **278 espèces** de France : 76 principales au centre, 202 secondaires autour.
- **Fiches complètes** : critères clés, habitat, saison, sporée, toxicité, sources.
- **Sosies** : les confusions possibles sont reliées sur la carte et comparables photo contre photo, avec ce qui les sépare.
- **« Comment regarder ? »** : chaque question a un schéma et une photo réelle par réponse.
- **Filtres** par mois de cueillette et par statut. Les espèces mortelles restent toujours affichées.
- **Carnet** : on note ses trouvailles (« Trouvé ! ») et, pour les comestibles vérifiés, « Mangé ! ». Le carnet s'exporte et s'importe.
- **Photos** : 233 photos Wikimedia Commons, avec auteur et licence dans chaque fiche.
- **Hors ligne** : une fois ouverte une première fois, l'app fonctionne sans réseau, en forêt comprise.

## Installer l'app

| Appareil | Comment |
|---|---|
| iPhone / iPad | Safari → bouton Partager → **Sur l'écran d'accueil** |
| Mac | Safari → Fichier → **Ajouter au Dock** (ou l'icône d'installation de Chrome / Edge) |
| Android | Chrome → menu ⋮ → **Installer l'application** (ou l'APK) |
| Ordinateur | Chrome / Edge : icône d'installation dans la barre d'adresse |

Au premier lancement, l'app télécharge en arrière-plan les photos haute définition (environ 23 Mo).

## Contenu de ce dépôt

Ce dépôt contient **la version publiée** (générée) de l'app, servie par GitHub Pages :

| Fichier | Rôle |
|---|---|
| `index.html` | l'application : carte, données, miniatures, polices et icônes intégrées |
| `hd/` | photos haute définition, chargées à la demande |
| `icones/` | icônes de l'app |
| `manifest.webmanifest` | nom, couleurs et icônes de l'app installée |
| `sw.js` | service worker : garde tout en cache pour le hors ligne |

Pour mettre à jour : regénérer la version (`node build.js --pwa` dans le projet source) puis remplacer ces fichiers.

## Sources et crédits

- **Données mycologiques** : guides de référence et articles Wikipédia ; les sources de chaque espèce sont citées dans sa fiche. Les statuts de toxicité sont volontairement prudents.
- **Photos** : Wikimedia Commons, sous licences CC BY, CC BY-SA ou domaine public. Auteur et licence sont indiqués dans chaque fiche.
- **Polices** : Literata et IBM Plex Mono, sous SIL Open Font License.

## Avertissement

Cette carte est un outil d'apprentissage, pas un outil de décision. Beaucoup d'espèces mortelles ressemblent à des comestibles, et un seul exemplaire d'Amanite phalloïde peut tuer. En cas d'intoxication, appelez le **15** ou un **centre antipoison**.
