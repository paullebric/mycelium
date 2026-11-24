"""Applique l'identité de mycélium au projet Android généré par Capacitor :
icônes (classique, ronde, adaptative), écran de démarrage, couleur de fond, signature et numéro de version.
À relancer après un `npx cap add android` ; sans effet de bord si on le relance plusieurs fois.
Usage : python3 personnaliser.py   (versionCode et versionName lus dans ../version.json)"""
import os, re, sys
from PIL import Image

ICI = os.path.dirname(os.path.abspath(__file__))
ICONES = os.path.join(ICI, '..', 'icones')
RES = os.path.join(ICI, 'android', 'app', 'src', 'main', 'res')
GRADLE = os.path.join(ICI, 'android', 'app', 'build.gradle')
NUIT = '#0C120F'

def icones():
    tailles = {'mdpi': (48, 108), 'hdpi': (72, 162), 'xhdpi': (96, 216), 'xxhdpi': (144, 324), 'xxxhdpi': (192, 432)}
    carre = Image.open(os.path.join(ICONES, 'icone-512.png'))
    rond = Image.open(os.path.join(ICONES, 'android-rond-192.png'))
    avant = Image.open(os.path.join(ICONES, 'android-avant-432.png'))
    for d, (t, ta) in tailles.items():
        dd = os.path.join(RES, 'mipmap-' + d); os.makedirs(dd, exist_ok=True)
        carre.resize((t, t), Image.LANCZOS).save(os.path.join(dd, 'ic_launcher.png'))
        rond.resize((t, t), Image.LANCZOS).save(os.path.join(dd, 'ic_launcher_round.png'))
        avant.resize((ta, ta), Image.LANCZOS).save(os.path.join(dd, 'ic_launcher_foreground.png'))
    with open(os.path.join(RES, 'values', 'ic_launcher_background.xml'), 'w') as f:
        f.write('<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">%s</color>\n</resources>\n' % NUIT)

def demarrage():
    logo = Image.open(os.path.join(ICONES, 'icone-512.png'))
    for d in os.listdir(RES):
        p = os.path.join(RES, d, 'splash.png')
        if d.startswith('drawable') and os.path.exists(p):
            w, h = Image.open(p).size
            im = Image.new('RGB', (w, h), NUIT); s = int(min(w, h) * 0.28)
            ic = logo.resize((s, s), Image.LANCZOS); im.paste(ic, ((w - s) // 2, (h - s) // 2), ic); im.save(p)

def signature_et_version(code, nom):
    s = open(GRADLE).read()
    if 'signatureProps' not in s:
        s = s.replace('android {', """// Signature de la version publiée : app-android/signature/keystore.properties (ne jamais publier ce dossier)
def signatureProps = new Properties()
def signatureFichier = rootProject.file('../signature/keystore.properties')
if (signatureFichier.exists()) signatureProps.load(new FileInputStream(signatureFichier))

android {""", 1)
        s = s.replace('    buildTypes {', """    signingConfigs {
        release {
            if (signatureFichier.exists()) {
                storeFile file(signatureProps['storeFile'])
                storePassword signatureProps['storePassword']
                keyAlias signatureProps['keyAlias']
                keyPassword signatureProps['keyPassword']
            }
        }
    }
    buildTypes {""", 1)
        s = re.sub(r'(release \{\n)(\s*)(minifyEnabled)', r'\1\2signingConfig signingConfigs.release\n\2\3', s, count=1)
    s = re.sub(r'versionCode \d+', 'versionCode %d' % code, s)
    s = re.sub(r'versionName "[^"]*"', 'versionName "%s"' % nom, s)
    open(GRADLE, 'w').write(s)

if __name__ == '__main__':
    import json
    v = json.load(open(os.path.join(ICI, '..', 'version.json')))  # source unique du numéro de version
    code = int(sys.argv[1]) if len(sys.argv) > 1 else v['versionCode']
    nom = sys.argv[2] if len(sys.argv) > 2 else v['version']
    icones(); demarrage(); signature_et_version(code, nom)
    with open(os.path.join(ICI, 'android', 'local.properties'), 'w') as f:
        f.write('sdk.dir=' + os.environ.get('ANDROID_HOME', '/opt/android-sdk') + '\n')
    print('Android personnalisé : versionCode %d, versionName %s' % (code, nom))
