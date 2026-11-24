"""Photos par lots (plus rapide) : pour chaque espèce sans photo,
1. nom du fichier image = image principale de l'article Wikipédia FR (cache/wiki, déjà téléchargé) ;
2. métadonnées (auteur, licence, adresse de la miniature 960 px) via l'API Commons, 50 fichiers par appel ;
3. UNE seule image téléchargée (960 px, taille standard) dont on tire la vignette 240 px et la HD WebP 800 px.
Sorties : data/photos/<id>.jpg, data/photos-hd/<id>.webp, data/photos.json."""
import json, os, re, io, time, html, subprocess, urllib.parse
from PIL import Image
UA = "CarteChampignonsHorsLigne/0.2 (projet pedagogique, build ponctuel)"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P, PHD, META = (os.path.join(ROOT, "data", x) for x in ("photos", "photos-hd", "photos.json"))
os.makedirs(P, exist_ok=True); os.makedirs(PHD, exist_ok=True)
meta = json.load(open(META, encoding="utf-8")) if os.path.exists(META) else {}
EXCLUES = set(json.load(open(os.path.join(ROOT, "scripts", "photos_exclues.json")))) if os.path.exists(os.path.join(ROOT, "scripts", "photos_exclues.json")) else set()
LIC = re.compile(r"^(CC BY(-SA)? [0-9.]+|CC0|Public domain|Domaine public|PD|Attribution$)", re.I)
def get(url, essais=5):
    for essai in range(essais):
        r = subprocess.run(["curl", "-sS", "-f", "-L", "--max-time", "90", "-A", UA, url], capture_output=True)
        if r.returncode == 0 and r.stdout: return r.stdout
        time.sleep(20 * (essai + 1))
    raise RuntimeError(r.stderr.decode()[:150])
def texte(h): return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", re.sub(r"(?is)<(style|script)[^>]*>.*?</\1>", "", h or "")))).strip()

# 1. espèces à traiter et nom de leur fichier image
todo = {}
for f in sorted(os.listdir(os.path.join(ROOT, "cache", "wiki"))):
    sid = f[:-5]
    if sid in EXCLUES or (sid in meta and os.path.exists(os.path.join(P, sid + ".jpg")) and os.path.exists(os.path.join(PHD, sid + ".webp"))): continue
    s = json.load(open(os.path.join(ROOT, "cache", "wiki", f), encoding="utf-8"))["summary"]
    src = (s.get("originalimage") or {}).get("source")
    if not src: print("PAS D'IMAGE", sid, flush=True); continue
    m = re.search(r"/commons/(?:thumb/)?[0-9a-f]/[0-9a-f]{2}/([^/?]+)", src)
    if not m: print("IMAGE HORS COMMONS", sid, flush=True); continue
    todo[sid] = urllib.parse.unquote(m.group(1)).replace("_", " ")
print(len(todo), "espèces à traiter", flush=True)
# 2. métadonnées par lots de 50
ids = list(todo)
infos = {}
for i in range(0, len(ids), 50):
    lot = ids[i:i + 50]
    q = urllib.parse.urlencode({"action": "query", "format": "json", "prop": "imageinfo", "iiprop": "url|extmetadata",
                                "iiurlwidth": 960, "iiextmetadatafilter": "Artist|LicenseShortName",
                                "titles": "|".join("File:" + todo[s] for s in lot)})
    try: d = json.loads(get("https://commons.wikimedia.org/w/api.php?" + q, essais=1))
    except Exception as e:
        print("API Commons refusée (", e, ") : métadonnées page par page pour ce lot", flush=True); continue
    norm = {n["to"]: n["from"] for n in d["query"].get("normalized", [])}
    par_titre = {}
    for pg in d["query"]["pages"].values():
        if "imageinfo" in pg: par_titre[pg["title"]] = pg["imageinfo"][0]
    for s in lot:
        t = "File:" + todo[s]
        ii = par_titre.get(t) or par_titre.get(next((k for k, v in norm.items() if v == t), ""), None)
        if ii: infos[s] = ii
    time.sleep(2)
# 2 bis. repli : page Commons de chaque fichier (HTML), si l'API a refusé
def infos_page(fichier):
    nom = fichier.replace(" ", "_")
    page = get("https://commons.wikimedia.org/wiki/File:" + urllib.parse.quote(nom)).decode("utf-8").replace("&#95;", "_")
    lic = [texte(l) for l in re.findall(r'class="licensetpl_short"[^>]*>(.*?)</span>', page, re.S)]
    aut = re.search(r'id="fileinfotpl_aut"[^>]*>.*?</td>\s*<td[^>]*>(.*?)</td>', page, re.S)
    import hashlib
    h = hashlib.md5(nom.encode()).hexdigest(); q = urllib.parse.quote(nom)
    return {"thumburl": f"https://upload.wikimedia.org/wikipedia/commons/thumb/{h[0]}/{h[:2]}/{q}/960px-{q}",
            "url": f"https://upload.wikimedia.org/wikipedia/commons/{h[0]}/{h[:2]}/{q}",
            "extmetadata": {"LicenseShortName": {"value": next((l for l in lic if LIC.match(l)), lic[0] if lic else "")},
                            "Artist": {"value": aut.group(1) if aut else ""}}}
# 3. une image par espèce
for s in ids:
    ii = infos.get(s)
    if not ii:
        try: ii = infos_page(todo[s])
        except Exception as e: print("SANS MÉTADONNÉES", s, e, flush=True); continue
    em = ii.get("extmetadata", {})
    lic = texte(em.get("LicenseShortName", {}).get("value", ""))
    if not LIC.match(lic): print("LICENCE NON RETENUE", s, lic, flush=True); continue
    auteur = texte(em.get("Artist", {}).get("value", ""))[:100] or "voir la page Commons"
    url = (ii.get("thumburl") or ii["url"]).split("?")[0].replace("thumb.wikimedia.org", "upload.wikimedia.org")
    try:
        try: data = get(url)
        except Exception: data = get(ii["url"].split("?")[0])  # repli : image originale
        im = Image.open(io.BytesIO(data)).convert("RGB")
        hd = im.copy(); hd.thumbnail((800, 800), Image.LANCZOS); hd.save(os.path.join(PHD, s + ".webp"), "WEBP", quality=78, method=6)
        w, h = im.size; c = min(w, h); top = max(0, int((h - c) * 0.4)); left = (w - c) // 2
        im.crop((left, top, left + c, top + c)).resize((240, 240), Image.LANCZOS).save(os.path.join(P, s + ".jpg"), "JPEG", quality=62, optimize=True, progressive=True)
        meta[s] = {"fichier": todo[s], "auteur": auteur, "licence": lic, "url": "https://commons.wikimedia.org/wiki/File:" + urllib.parse.quote(todo[s].replace(" ", "_"))}
        json.dump(meta, open(META, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        print("OK", s, lic, "|", auteur[:40], flush=True)
    except Exception as e:
        print("ERREUR", s, e, flush=True)
    time.sleep(3)
