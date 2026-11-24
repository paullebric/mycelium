"""Récupère une photo libre (Wikimedia Commons) par espèce : image principale de l'article Wikipédia FR.
Vérifie la licence (CC BY, CC BY-SA, CC0, domaine public), recadre en carré 240 px, JPEG compressé.
Sorties : data/photos/<id>.jpg et data/photos.json (auteur, licence, lien) pour les crédits."""
import json, os, re, time, html, io, urllib.request, urllib.parse
from PIL import Image
UA = "CarteChampignonsHorsLigne/0.1 (projet pedagogique, build ponctuel)"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "data", "photos"); os.makedirs(OUT, exist_ok=True)
META = os.path.join(ROOT, "data", "photos.json")
meta = json.load(open(META, encoding="utf-8")) if os.path.exists(META) else {}
# Remplacements manuels quand l'image de l'article ne convient pas (dessin, mauvaise espèce...)
FORCER = json.load(open(os.path.join(ROOT, "scripts", "photos_forcees.json"), encoding="utf-8")) if os.path.exists(os.path.join(ROOT, "scripts", "photos_forcees.json")) else {}
LICENCES_OK = re.compile(r"^(CC BY(-SA)? [0-9.]+|CC0|Public domain|Domaine public|PD)", re.I)
def get(url):
    # curl est mieux accepté que urllib par les serveurs de Wikimedia
    import subprocess
    for essai in range(4):
        r = subprocess.run(["curl", "-sS", "-f", "-L", "--max-time", "60", "-A", UA, url], capture_output=True)
        if r.returncode == 0 and r.stdout: return r.stdout
        time.sleep(30 * (essai + 1))
    raise RuntimeError("échec du téléchargement : " + url + " " + r.stderr.decode()[:200])
def texte(h):
    h = re.sub(r"(?is)<(style|script)[^>]*>.*?</\1>", "", h)
    h = re.sub(r"(?is)<span[^>]*class=\"[^\"]*(?:noprint|mw-valign)[^\"]*\"[^>]*>.*?</span>", "", h)
    t = html.unescape(re.sub(r"<[^>]+>", " ", h))
    return re.sub(r"\s+", " ", t).strip()
for f in sorted(os.listdir(os.path.join(ROOT, "cache", "wiki"))):
    sid = f[:-5]
    if sid in meta and os.path.exists(os.path.join(OUT, sid + ".jpg")) and sid not in FORCER: continue
    s = json.load(open(os.path.join(ROOT, "cache", "wiki", f), encoding="utf-8"))["summary"]
    if sid in FORCER: fichier = FORCER[sid]
    else:
        src = (s.get("originalimage") or {}).get("source")
        if not src: print("PAS D IMAGE", sid, flush=True); continue
        m = re.search(r"/commons/(?:thumb/)?[0-9a-f]/[0-9a-f]{2}/([^/?]+)", src)
        fichier = urllib.parse.unquote(m.group(1) if m else src.split("?")[0].rsplit("/", 1)[1])
    try:
        page = get("https://commons.wikimedia.org/wiki/File:" + urllib.parse.quote(fichier.replace(" ", "_"))).decode("utf-8").replace("&#95;", "_")
        lic = re.findall(r'class="licensetpl_short"[^>]*>(.*?)</span>', page, re.S)
        lic = [texte(l) for l in lic if texte(l)]
        aut = re.search(r'id="fileinfotpl_aut"[^>]*>.*?</td>\s*<td[^>]*>(.*?)</td>', page, re.S)
        auteur = texte(aut.group(1)) if aut else ""
        auteur = re.sub(r"\s+", " ", auteur)[:120] or "voir la page Commons"
        licence = next((l for l in lic if LICENCES_OK.match(l)), None)
        if not licence: print("LICENCE NON RETENUE", sid, fichier, lic[:3], flush=True); continue
        # miniature 330 px (taille standard) servie par upload.wikimedia.org
        nom = fichier.replace(" ", "_"); h = __import__("hashlib").md5(nom.encode()).hexdigest()
        thumb = f"https://upload.wikimedia.org/wikipedia/commons/thumb/{h[0]}/{h[:2]}/{urllib.parse.quote(nom)}/330px-{urllib.parse.quote(nom)}"
        if nom.lower().endswith(".svg"): thumb += ".png"
        data = get(thumb)
        im = Image.open(io.BytesIO(data)).convert("RGB")
        w, hh = im.size; c = min(w, hh)
        # recadrage carré, légèrement vers le haut pour garder le chapeau
        top = max(0, int((hh - c) * 0.4)); left = (w - c) // 2
        im = im.crop((left, top, left + c, top + c)).resize((240, 240), Image.LANCZOS)
        im.save(os.path.join(OUT, sid + ".jpg"), "JPEG", quality=62, optimize=True, progressive=True)
        meta[sid] = {"fichier": fichier, "auteur": auteur, "licence": licence, "url": "https://commons.wikimedia.org/wiki/File:" + urllib.parse.quote(nom)}
        json.dump(meta, open(META, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        print("OK", sid, licence, "|", auteur[:40], flush=True)
    except Exception as e:
        print("ERREUR", sid, e, flush=True)
    time.sleep(2.5)
