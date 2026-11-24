"""Pour les espèces sans photo : liste les images de la catégorie Commons de l'espèce (page HTML, l'API étant
souvent limitée) et télécharge des vignettes 330 px pour choisir à l'œil. Sortie : <dossier>/candidats.json + vignettes.
Usage : python3 scripts/candidats_commons.py <dossier> [id ...]"""
import json, os, re, sys, time, hashlib, subprocess, urllib.parse
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UA = "CarteChampignonsHorsLigne/0.3 (projet pedagogique, build ponctuel)"
OUT = sys.argv[1]; os.makedirs(OUT, exist_ok=True)
E = {e['id']: e for e in json.load(open(os.path.join(ROOT, 'data', 'especes.json'), encoding='utf-8'))}
P = json.load(open(os.path.join(ROOT, 'data', 'photos.json'), encoding='utf-8'))
# un argument « id=Nom latin » cherche aussi sous ce nom (synonymes : Russula mairei = R. nobilis, etc.)
AUTRES = dict(a.split('=', 1) for a in sys.argv[2:] if '=' in a)
ids = [a.split('=')[0] for a in sys.argv[2:]] or [i for i in E if i not in P]
def get(url):
    for essai in range(4):
        r = subprocess.run(["curl", "-sS", "-f", "-L", "--max-time", "60", "-A", UA, url], capture_output=True)
        if r.returncode == 0: return r.stdout
        time.sleep(8 * (essai + 1))
    return None
def vignette(nom, larg=330):
    n = nom.replace(' ', '_'); h = hashlib.md5(n.encode()).hexdigest(); q = urllib.parse.quote(n)
    return f"https://upload.wikimedia.org/wikipedia/commons/thumb/{h[0]}/{h[:2]}/{q}/{larg}px-{q}"
res = json.load(open(os.path.join(OUT, 'candidats.json'))) if os.path.exists(os.path.join(OUT, 'candidats.json')) else {}
for sid in ids:
    lat = AUTRES.get(sid, E[sid]['latin']); noms = [lat, E[sid]['latin']] + [x for x in E[sid].get('autres_noms', []) if re.match(r'^[A-Z][a-z]+ [a-z]+$', x)]
    fichiers = []
    for nm in noms:
        h = get("https://commons.wikimedia.org/wiki/Category:" + urllib.parse.quote(nm.replace(' ', '_')))
        if not h: continue
        for f in re.findall(r'href="/wiki/File:([^"]+)"', h.decode('utf-8', 'replace')):
            f = urllib.parse.unquote(f).replace('_', ' ')
            if f not in fichiers and re.search(r'\.(jpe?g|JPE?G)$', f) and lat.split()[1].lower() in f.lower(): fichiers.append(f)
        if fichiers: break
        time.sleep(1)
    res[sid] = fichiers[:6]
    for i, f in enumerate(res[sid]):
        d = get(vignette(f))
        if d: open(os.path.join(OUT, f"{sid}__{i}.jpg"), 'wb').write(d)
        time.sleep(0.5)
    print(sid, len(fichiers), flush=True)
    json.dump(res, open(os.path.join(OUT, 'candidats.json'), 'w'), ensure_ascii=False, indent=1)
