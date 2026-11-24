# Publier mycélium sur le Play Store, pas à pas

Le Play Store n'accepte plus les fichiers `.apk` pour une nouvelle app : il faut envoyer un **`.aab`** (Android App Bundle).
Il est prêt : `mycelium-1.1.aab` (cible Android 16, comme l'exige Google en 2026).

Tout se fait sur ordinateur, sur **https://play.google.com/console**.

---

## Étape 1 — Créer le compte développeur (une seule fois)

1. Aller sur https://play.google.com/console/signup avec le compte Google qui gérera l'app.
2. Choisir **« Pour vous-même »** (compte personnel).
3. Payer les **25 $** (une seule fois, à vie).
4. Vérifier son identité : pièce d'identité, puis numéro de téléphone. La validation prend de quelques heures à quelques jours.
5. Google demande aussi de prouver qu'on possède un téléphone Android : installer l'app **Play Console** sur un Android et s'y connecter.

> ⚠️ **Règle importante pour les comptes personnels récents** : avant de pouvoir publier pour tout le monde, Google impose un **test fermé avec au moins 12 testeurs qui gardent l'app installée pendant 14 jours d'affilée**. Les étapes ci-dessous suivent donc l'ordre : test interne → test fermé (12 personnes, 14 jours) → production.

---

## Étape 2 — Créer l'application

1. Play Console → **« Créer une application »**.
2. Nom : `mycélium · champignons` ; langue par défaut : **Français (France)** ; type : **Application** ; **Gratuite**.
3. Cocher les déclarations (règles du programme, lois d'export) → **Créer**.

---

## Étape 3 — Remplir « Contenu de l'application »

Menu de gauche : **Règles et programmes → Contenu de l'application**. Chaque rubrique se remplit une fois :

| Rubrique | Réponse pour mycélium |
|---|---|
| Règles de confidentialité | `https://paullebric.github.io/mycelium/confidentialite.html` |
| Accès aux applications | « Toutes les fonctionnalités sont disponibles sans restriction » |
| Annonces | « Non, l'application ne contient pas d'annonces » |
| Classification du contenu | Questionnaire → catégorie « Référence, actualités ou éducation » → répondre Non partout → classé **3+ / Tout public** |
| Public cible | **18 ans et plus** (le plus simple : l'app parle de consommation de champignons, et viser les enfants ajoute des obligations) |
| Sécurité des données | « L'application collecte ou partage-t-elle des données ? » → **Non**. Chiffrement : sans objet. Suppression des données : sans objet. |
| Appli gouvernementale / financière / santé | Non / Non / **Non** (ce n'est pas une app médicale) |

---

## Étape 4 — Remplir la fiche Play Store

**Développer → Présence sur le Play Store → Fiche principale**. Tout est dans `play-store/` :

- Nom, description courte, description complète : copier depuis `play-store/textes-fiche.md`.
- Icône : `play-store/icone-512.png`
- Image de présentation : `play-store/banniere-1024x500.png`
- Captures d'écran téléphone : les 8 fichiers `play-store/capture-*.png` (2 minimum).
- Puis **Paramètres de la fiche** : catégorie **Éducation**, e-mail de contact, site web `https://paullebric.github.io/mycelium/`.

---

## Étape 5 — Test interne : avoir l'app tout de suite sur ses téléphones

Le test interne n'a **pas d'examen** par Google (ou très court) : idéal pour soi et des proches, jusqu'à 100 personnes.

1. **Tester → Test interne → Testeurs → Créer une liste d'adresses e-mail**, par ex. « famille ». Ajouter les adresses **Gmail** (comptes Google utilisés sur leurs téléphones). Enregistrer et cocher la liste.
2. **Test interne → Créer une release**.
3. Signature : Google propose **« Signature d'application par Google Play »** → **Accepter** (Google garde la clé de distribution ; notre clé `signature/` devient la « clé d'importation »).
4. **Importer** le fichier `mycelium-1.1.aab`.
5. Nom de la release : `1.1` ; notes : « Première version de test ». → **Suivant → Enregistrer et publier**.
6. Onglet **Testeurs** → **« Copier le lien »** : c'est le **lien d'invitation** à envoyer aux testeurs.

**Côté testeur** : ouvrir le lien **sur son téléphone, connecté au même compte Gmail que celui ajouté à la liste** → « Devenir testeur » → « Télécharger sur Google Play ». Les mises à jour arrivent ensuite automatiquement par le Play Store.

---

## Étape 6 — Test fermé : les 12 testeurs pendant 14 jours (obligatoire avant la publication)

1. **Tester → Tests fermés → Créer un canal** (ou utiliser « Alpha »).
2. **Testeurs** : créer une liste avec **au moins 12 adresses Gmail** (plus si possible, certains oublient), ou un **groupe Google** (pratique : on partage le lien du groupe, les gens s'inscrivent eux-mêmes).
3. **Créer une release** → **ajouter depuis la bibliothèque** le même `.aab` (ou un nouveau) → publier.
4. Ce canal **passe par l'examen de Google** (souvent quelques heures, parfois quelques jours).
5. Copier le **lien d'invitation** du canal et l'envoyer aux testeurs : chacun l'ouvre sur son Android → « Devenir testeur » → installe l'app.
6. Leur demander de **garder l'app installée 14 jours** et de l'ouvrir de temps en temps. Le compteur est visible dans le **Tableau de bord** de la Play Console.

> Astuce : envoyer aux testeurs le message tout prêt plus bas.

---

## Étape 7 — Passer en production (publication pour tout le monde)

Quand les 14 jours sont passés avec 12 testeurs :

1. **Tableau de bord → « Demander l'accès à la production »** : répondre au petit questionnaire (comment s'est passé le test, ce qui a été corrigé…).
2. Après accord de Google (quelques jours) : **Production → Créer une release** → ajouter le `.aab` → choisir les pays (France, Belgique, Suisse, Canada… ou tous) → **Publier**.
3. Premier examen : de quelques heures à une semaine. L'app apparaît ensuite sur le Play Store, avec un lien du type `https://play.google.com/store/apps/details?id=fr.mycelium.carte`.

---

## Mettre à jour l'application plus tard

1. Dans le projet : `cd app-android`, `npm run www`, `npx cap sync android`, puis `python3 personnaliser.py 3 1.2` (le **versionCode** doit toujours augmenter : 3, 4, 5…).
2. `cd android && ./gradlew bundleRelease` → `android/app/build/outputs/bundle/release/app-release.aab`.
3. Play Console → le canal voulu → **Créer une release** → importer le nouveau `.aab`.

(Ou plus simple : me le demander, je reconstruis le `.aab`.)

---

## Message type pour les testeurs

> Salut ! Je teste mon app **mycélium**, une carte pour identifier les champignons de France (hors ligne).
> 1. Ouvre ce lien **sur ton téléphone Android**, connecté à ton compte Gmail **[adresse donnée]** : [LIEN D'INVITATION]
> 2. Touche « Devenir testeur », puis « Télécharger sur Google Play ».
> 3. Garde l'app installée au moins **14 jours** (c'est la règle de Google pour que je puisse la publier), et ouvre-la de temps en temps.
> Tes retours m'intéressent ! ⚠️ C'est un outil pédagogique : on ne mange jamais un champignon identifié avec une app.

---

## Et l'iPhone ?

Pas besoin du Play Store : la version web installable est déjà en ligne sur https://paullebric.github.io/mycelium/ (Safari → Partager → « Sur l'écran d'accueil »).
Pour l'App Store, il faudrait un Mac, Xcode et un compte Apple Developer (99 $/an) — on pourra en parler plus tard.
