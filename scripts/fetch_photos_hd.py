"""Version haute définition (WebP, 800 px max) des photos listées dans data/photos.json -> data/photos-hd/<id>.webp"""
import json, os, io, time, hashlib, subprocess, urllib.parse
from PIL import Image
UA = "CarteChampignonsHorsLigne/0.1 (projet pedagogique, build ponctuel)"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "data", "photos-hd"); os.makedirs(OUT, exist_ok=True)
meta = json.load(open(os.path.join(ROOT, "data", "photos.json"), encoding="utf-8"))
def get(url):
    for essai in range(5):
        r = subprocess.run(["curl", "-sS", "-f", "-L", "--max-time", "90", "-A", UA, url], capture_output=True)
        if r.returncode == 0 and r.stdout: return r.stdout
        time.sleep(30 * (essai + 1))
    raise RuntimeError(r.stderr.decode()[:200])
def enregistrer(im, f):
    im.thumbnail((800, 800), Image.LANCZOS)
    im.save(f, "WEBP", quality=78, method=6)
for sid, m in sorted(meta.items()):
    f = os.path.join(OUT, sid + ".webp")
    if os.path.exists(f): continue
    ancien = os.path.join(OUT, sid + ".jpg")
    if os.path.exists(ancien):  # déjà téléchargée en JPEG : simple conversion locale
        enregistrer(Image.open(ancien).convert("RGB"), f); os.remove(ancien)
        print("CONVERTI", sid, flush=True); continue
    nom = m["fichier"].replace(" ", "_"); h = hashlib.md5(nom.encode()).hexdigest(); q = urllib.parse.quote(nom)
    try:
        try: data = get(f"https://upload.wikimedia.org/wikipedia/commons/thumb/{h[0]}/{h[:2]}/{q}/960px-{q}")
        except Exception: data = get(f"https://upload.wikimedia.org/wikipedia/commons/{h[0]}/{h[:2]}/{q}")
        enregistrer(Image.open(io.BytesIO(data)).convert("RGB"), f)
        print("OK", sid, os.path.getsize(f) // 1024, "Ko", flush=True)
    except Exception as e:
        print("ERREUR", sid, e, flush=True)
    time.sleep(3)
