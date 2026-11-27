"""Photos des espèces sans photo, depuis iNaturalist (photo de référence de l'espèce, ou la première suivante
sous licence libre : CC0, CC BY, CC BY-SA, CC BY-NC, CC BY-NC-SA ; jamais « tous droits réservés » ni « ND »).
L'usage NC (non commercial) convient : mycélium est gratuit et sans publicité.
Usage : python3 scripts/photos_inaturalist.py [id ...]   (sans argument : toutes les espèces sans photo)
Écrit data/photos/<id>.jpg (240 px), data/photos-hd/<id>.webp (800 px) et les crédits dans data/photos.json."""
import json, os, io, sys, time, subprocess, urllib.parse
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UA = 'mycelium-carte/1.0 (projet pedagogique)'
P, PHD, META = (os.path.join(ROOT, 'data', x) for x in ('photos', 'photos-hd', 'photos.json'))
OK = {'cc0': 'CC0', 'cc-by': 'CC BY', 'cc-by-sa': 'CC BY-SA', 'cc-by-nc': 'CC BY-NC', 'cc-by-nc-sa': 'CC BY-NC-SA'}
meta = json.load(open(META, encoding='utf-8'))
E = {e['id']: e for e in json.load(open(os.path.join(ROOT, 'data', 'especes.json'), encoding='utf-8'))}
ids = sys.argv[1:] or [i for i in E if i not in meta]

def get(url, binaire=False):
    for essai in range(5):
        r = subprocess.run(['curl', '-sS', '-f', '-L', '--max-time', '90', '-A', UA, url], capture_output=True)
        if r.returncode == 0 and r.stdout: return r.stdout if binaire else json.loads(r.stdout)
        time.sleep(5 * (essai + 1))
    raise RuntimeError(r.stderr.decode()[:150])

def taxon(latin):
    r = get('https://api.inaturalist.org/v1/taxa?rank=species&q=' + urllib.parse.quote(latin))['results']
    r = [t for t in r if t['name'].lower() == latin.lower()] or r
    if not r: return None
    return get('https://api.inaturalist.org/v1/taxa/%d' % r[0]['id'])['results'][0]

for sid in ids:
    e = E[sid]; t = None
    for nom in [e['latin']] + e.get('autres_noms', []):
        try: t = taxon(nom.replace(' (sens large)', ''))
        except Exception as x: print('  erreur', sid, nom, x, flush=True)
        if t: break
        time.sleep(1)
    if not t: print('AUCUN TAXON', sid, flush=True); continue
    photos = [tp['photo'] for tp in t.get('taxon_photos', [])] or ([t['default_photo']] if t.get('default_photo') else [])
    ph = next((p for p in photos if p.get('license_code') in OK), None)
    if not ph: print('AUCUNE PHOTO LIBRE', sid, flush=True); continue
    url = (ph.get('url') or ph.get('medium_url')).replace('/square.', '/large.').replace('/medium.', '/large.')
    data = get(url, binaire=True)
    im = Image.open(io.BytesIO(data)).convert('RGB')
    hd = im.copy(); hd.thumbnail((800, 800), Image.LANCZOS); hd.save(os.path.join(PHD, sid + '.webp'), 'WEBP', quality=78, method=6)
    w, h = im.size; c = min(w, h); top = max(0, int((h - c) * 0.4)); left = (w - c) // 2
    im.crop((left, top, left + c, top + c)).resize((240, 240), Image.LANCZOS).save(os.path.join(P, sid + '.jpg'), 'JPEG', quality=62, optimize=True, progressive=True)
    meta[sid] = {'fichier': 'iNaturalist photo %d' % ph['id'], 'auteur': (ph.get('attribution_name') or ph.get('attribution') or 'voir iNaturalist')[:100],
                 'licence': OK[ph['license_code']], 'url': 'https://www.inaturalist.org/photos/%d' % ph['id']}
    json.dump(meta, open(META, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('OK', sid, OK[ph['license_code']], '|', meta[sid]['auteur'][:40], flush=True)
    time.sleep(1.2)
