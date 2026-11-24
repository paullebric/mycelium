"""Ajoute aux fiches la source Wikipédia FR (page en cache) quand elle manque encore."""
import json, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
p = os.path.join(ROOT, "data", "especes.json")
E = json.load(open(p, encoding="utf-8"))
n = 0
for e in E:
    if any(s.get("url") for s in e.get("sources", [])): continue
    f = os.path.join(ROOT, "cache", "wiki", e["id"] + ".json")
    if not os.path.exists(f): continue
    w = json.load(open(f, encoding="utf-8"))["summary"]
    e["sources"].insert(0, {"titre": "Wikipédia FR : « " + w["titles"]["normalized"] + " » (statut vérifié le 23/11/2026)", "url": w["content_urls"]["desktop"]["page"]})
    n += 1
json.dump(E, open(p, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(n, "sources ajoutées")
