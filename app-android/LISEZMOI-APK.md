# mycélium pour Android (APK)

L'application Android est la même carte que la version web, emballée avec Capacitor :
tout (carte, données, 233 photos HD, polices) est **dans l'APK**, elle marche **sans réseau** dès l'installation.

## Installer l'APK (sans Play Store)

1. Copier `mycelium.apk` sur le téléphone (câble, Drive, mail, Telegram…).
2. L'ouvrir depuis le téléphone. Android demande d'**autoriser l'installation depuis cette source**
   (Paramètres → Applications → accès spécial → « Installer des applis inconnues ») : l'autoriser pour l'appli utilisée (Fichiers, Chrome, Drive…).
3. « Installer ». Play Protect peut afficher « appli inconnue » : choisir « Installer quand même » (normal pour une app hors Play Store).

Android 6 (2015) ou plus récent.

## Ce qui change par rapport à la version web

- **Bouton retour** d'Android : ferme ce qui est ouvert (photo, fiche, panneau, focus…), puis quitte l'app.
- **Exporter le carnet** (et le poster SVG) : ouvre le menu de partage d'Android (Drive, mail, Fichiers…) au lieu d'un téléchargement.
- **Importer le carnet** : ouvre le sélecteur de fichiers d'Android.
- Le carnet est propre à l'app (distinct de celui du navigateur) : utiliser Exporter / Importer pour le transférer.

## Reconstruire l'APK après une modification

Prérequis : Node 20+, JDK 21, SDK Android (platform 35, build-tools 35) — ou Android Studio.

```
cd app-android
npm install
npm run www          # reconstruit la version web puis la copie dans www/
npx cap sync android
python3 personnaliser.py   # icônes, écran de démarrage, signature, numéro de version (version.json)
cd android
./gradlew assembleRelease
```

L'APK signé est dans `android/app/build/outputs/apk/release/app-release.apk` (`./gradlew bundleRelease` donne le `.aab` du Play Store).
Avant chaque nouvelle version, augmenter `version` et `versionCode` dans `version.json` (à la racine du projet) :
ce numéro s'affiche en bas à gauche de l'app, et Android refuse une mise à jour qui n'a pas un `versionCode` plus grand.

## ⚠ La clé de signature

`signature/mycelium-release.jks` et `signature/keystore.properties` (mot de passe) signent l'application.

- **Les garder précieusement et en lieu sûr** (deux copies). Sans eux, impossible de publier une mise à jour
  installable par-dessus l'app existante : il faudrait désinstaller et perdre le carnet.
- **Ne jamais les publier** (pas dans un dépôt GitHub public).
- La même clé pourra servir plus tard pour le Play Store (via « Play App Signing »).
