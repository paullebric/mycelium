# mycélium.

**Carte interactive d'identification des champignons de France, utilisable hors ligne.**

> ⚠️ **Outil pédagogique.** Ne mangez jamais un champignon sur la base de cette carte : faites vérifier toute récolte par un pharmacien ou un mycologue. En cas d'intoxication : **15** ou un centre antipoison.

👉 **Ouvrir l'app : https://paullebric.github.io/mycelium/** · Android : voir les [Releases](https://github.com/paullebric/mycelium/releases)

mycélium présente la clé d'identification comme une **carte que l'on explore** : on part de la forme générale du champignon, on touche une question, on suit la réponse le long de sa branche, jusqu'à l'espèce.

- **263 espèces** (76 principales, 187 secondaires), fiches complètes avec sources
- **Sosies** reliés sur la carte, comparaison photo contre photo
- **« Comment regarder ? »** : schéma et photo réelle pour chaque réponse
- Filtres par **mois** et par **statut** (les mortels restent toujours visibles)
- **Carnet** « Trouvé ! » / « Mangé ! », exportable
- **Hors ligne** : web installable (PWA) et application Android

## Organisation du dépôt

| Dossier / fichier | Contenu |
|---|---|
| `src/` | l'app : moteur de carte (`app.js`), schémas (`schema.js`), styles, gabarit HTML, polices, pages annexes |
| `data/` | `cle.json` (arbre de la clé), `especes.json` (fiches), `reponses_courtes.json`, photos (`photos/` miniatures, `photos-hd/`) et crédits (`photos.json`) |
| `scripts/` | génération de la clé (`gen_cle.py`), réponses courtes, téléchargement des photos, icônes, tests navigateur |
| `cache/` | textes Wikipédia mis en cache, utilisés par `verifier.js` |
| `icones/` | icônes de l'app (générées par `scripts/icones.js`) |
| `build.js` | construit l'app |
| `verifier.js` | vérifie la cohérence des données (statuts, sosies réciproques, mois, sources) |
| `app-android/` | projet Android (Capacitor), fiche Play Store, guides |
| `.github/workflows/pages.yml` | publie automatiquement la version web sur GitHub Pages |

## Construire

Node 20 ou plus, sans autre dépendance :

```
node verifier.js            # contrôle des données
node build.js               # dist/carte-champignons.html (un seul fichier, schémas)
node build.js --photos      # dist/carte-champignons-photos.html (un seul fichier, ~30 Mo, avec photos)
node build.js --pwa         # dist/pwa/ (version web installable, celle de GitHub Pages)
```

**Publication web** : chaque envoi sur `main` reconstruit et publie la PWA (GitHub Actions → Pages).

**Android** : voir [`app-android/LISEZMOI-APK.md`](app-android/LISEZMOI-APK.md) et [`app-android/GUIDE-PLAY-STORE.md`](app-android/GUIDE-PLAY-STORE.md). Les fichiers `.aab` / `.apk` sont publiés dans les **Releases**, pas dans le dépôt. La clé de signature n'est **jamais** versionnée.

## Crédits

- **Données** : guides de référence et Wikipédia ; sources citées dans chaque fiche.
- **Photos** : Wikimedia Commons (CC BY, CC BY-SA, domaine public) ; auteur et licence dans chaque fiche.
- **Polices** : Literata, IBM Plex Mono (SIL Open Font License).
- [Politique de confidentialité](https://paullebric.github.io/mycelium/confidentialite.html) : aucune donnée collectée.
