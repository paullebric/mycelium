"""Importe les photos choisies à l'œil parmi les candidats Commons (scripts/candidats_commons.py).
Usage : python3 scripts/importer_photos_choisies.py <dossier candidats> id=indice [id=indice ...]
Pour chaque espèce : métadonnées (auteur, licence) lues sur la page Commons du fichier, image 960 px téléchargée,
puis miniature 240 px (data/photos) et HD WebP 800 px (data/photos-hd), crédits dans data/photos.json."""
import json, os, re, io, sys, time, html, hashlib, subprocess, urllib.parse
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UA = "CarteChampignonsHorsLigne/0.3 (projet pedagogique, build ponctuel)"
P, PHD, META = (os.path.join(ROOT, "data", x) for x in ("photos", "photos-hd", "photos.json"))
meta = json.load(open(META, encoding="utf-8"))
LIC = re.compile(r"^(CC BY(-SA)? [0-9.]+|CC0|Public domain|Domaine public|PD|Attribution$)", re.I)
def get(url):
    for essai in range(5):
        r = subprocess.run(["curl", "-sS", "-f", "-L", "--max-time", "90", "-A", UA, url], capture_output=True)
        if r.returncode == 0 and r.stdout: return r.stdout
        time.sleep(10 * (essai + 1))
    raise RuntimeError(r.stderr.decode()[:150])
def texte(h): return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", re.sub(r"(?is)<(style|script)[^>]*>.*?</\1>", "", h or "")))).strip()
cand = json.load(open(os.path.join(sys.argv[1], "candidats.json")))
for arg in sys.argv[2:]:
    sid, i = arg.split("="); fichier = cand[sid][int(i)]; nom = fichier.replace(" ", "_")
    page = get("https://commons.wikimedia.org/wiki/File:" + urllib.parse.quote(nom)).decode("utf-8", "replace").replace("&#95;", "_")
    lics = [texte(l) for l in re.findall(r'class="licensetpl_short"[^>]*>(.*?)</span>', page, re.S)]
    lic = next((l for l in lics if LIC.match(l)), "")
    if not lic: print("LICENCE NON RETENUE", sid, lics[:2], flush=True); continue
    aut = re.search(r'id="fileinfotpl_aut"[^>]*>.*?</td>\s*<td[^>]*>(.*?)</td>', page, re.S)
    auteur = (texte(aut.group(1)) if aut else "")[:100] or "voir la page Commons"
    h = hashlib.md5(nom.encode()).hexdigest(); q = urllib.parse.quote(nom)
    try: data = get(f"https://upload.wikimedia.org/wikipedia/commons/thumb/{h[0]}/{h[:2]}/{q}/960px-{q}")
    except Exception: data = get(f"https://upload.wikimedia.org/wikipedia/commons/{h[0]}/{h[:2]}/{q}")
    im = Image.open(io.BytesIO(data)).convert("RGB")
    hd = im.copy(); hd.thumbnail((800, 800), Image.LANCZOS); hd.save(os.path.join(PHD, sid + ".webp"), "WEBP", quality=78, method=6)
    w, hh = im.size; c = min(w, hh); top = max(0, int((hh - c) * 0.4)); left = (w - c) // 2
    im.crop((left, top, left + c, top + c)).resize((240, 240), Image.LANCZOS).save(os.path.join(P, sid + ".jpg"), "JPEG", quality=62, optimize=True, progressive=True)
    meta[sid] = {"fichier": fichier, "auteur": auteur, "licence": lic, "url": "https://commons.wikimedia.org/wiki/File:" + q}
    json.dump(meta, open(META, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("OK", sid, lic, "|", auteur[:40], flush=True)
    time.sleep(2)
