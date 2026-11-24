"""Télécharge, pour chaque espèce, le résumé REST et le wikitexte de Wikipédia FR (cache local)."""
import json, sys, time, urllib.request, urllib.parse, os
UA = "CarteChampignonsHorsLigne/0.1 (projet pedagogique, build ponctuel)"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
out = os.path.join(ROOT, "cache", "wiki")
def get(url):
    import subprocess
    for essai in range(4):
        r = subprocess.run(["curl", "-sS", "-f", "-L", "--max-time", "40", "-A", UA, url], capture_output=True)
        if r.returncode == 0: return r.stdout
        if b"404" in r.stderr: raise RuntimeError("HTTP 404")
        time.sleep(10 * (essai + 1))
    raise RuntimeError(r.stderr.decode()[:120])
import sys
LISTE = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, "scripts", "liste.tsv")
for line in open(LISTE, encoding="utf-8"):
    sid, latin = line.rstrip("\n").split("\t")
    f = os.path.join(out, sid + ".json")
    if os.path.exists(f): continue
    # titres essayés : nom latin, puis nom français et synonymes de la fiche
    noms = {e["id"]: [e["nom"]] + e.get("autres_noms", []) for e in json.load(open(os.path.join(ROOT, "data", "especes.json"), encoding="utf-8"))}
    essais = [latin] + noms.get(sid, [])
    for titre in essais:
        t = urllib.parse.quote(titre.replace(" ", "_"))
        try:
            summ = json.loads(get(f"https://fr.wikipedia.org/api/rest_v1/page/summary/{t}"))
            if summ.get("type") == "disambiguation": raise RuntimeError("homonymie")
            title = summ["titles"]["canonical"]
            raw = get("https://fr.wikipedia.org/w/index.php?action=raw&title=" + urllib.parse.quote(title)).decode("utf-8")
            if latin.split()[0].lower() not in raw.lower(): raise RuntimeError("page sans rapport : " + title)
            json.dump({"summary": summ, "wikitext": raw}, open(f, "w", encoding="utf-8"), ensure_ascii=False)
            print("OK", sid, "->", title, flush=True)
            break
        except Exception as e:
            print("  essai", sid, titre, ":", e, flush=True)
    else:
        print("ERREUR", sid, "aucune page trouvée", flush=True)
    time.sleep(1.5)
