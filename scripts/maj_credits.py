"""Recalcule auteur et licence de chaque photo depuis sa page Wikimedia Commons (data/photos.json)."""
import json, os, re, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import importlib.util
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = open(os.path.join(ROOT, "scripts", "fetch_photos.py"), encoding="utf-8").read()
ns = {}
ns["__file__"] = os.path.join(ROOT, "scripts", "fetch_photos.py")
exec(src.split("for f in sorted(")[0], ns)   # réutilise get(), texte(), constantes
META = os.path.join(ROOT, "data", "photos.json")
meta = json.load(open(META, encoding="utf-8"))
for sid, m in sorted(meta.items()):
    page = ns["get"](m["url"]).decode("utf-8").replace("&#95;", "_")
    aut = re.search(r'id="fileinfotpl_aut"[^>]*>.*?</td>\s*<td[^>]*>(.*?)</td>', page, re.S)
    auteur = ns["texte"](aut.group(1)) if aut else ""
    auteur = re.sub(r"\b(Creator|Créateur)\s*:\s*", "", auteur)
    auteur = re.sub(r"\s*(Wikidata|Q\d+|Date of birth.*)$", "", auteur).strip()[:100] or "voir la page Commons"
    m["auteur"] = auteur
    print(sid, "|", auteur, "|", m["licence"])
    time.sleep(0.5)
json.dump(meta, open(META, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
