"""Prépare les données de la page de validation des photos d'aide (« Comment regarder ? ») :
<dossier>/questions.json (questions, réponses, espèces candidates avec photo) et <dossier>/mini/*.jpg.
Usage : python3 scripts/page_validation_aide.py <dossier>"""
import json, os, shutil, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); O = sys.argv[1]; os.makedirs(O + '/mini', exist_ok=True)
D = lambda f: os.path.join(ROOT, 'data', f)
cle = json.load(open(D('cle.json'))); E = {e['id']: e for e in json.load(open(D('especes.json')))}
P = json.load(open(D('photos.json'))); C = json.load(open(D('reponses_courtes.json')))
A = json.load(open(D('aide_photos.json'))) if os.path.exists(D('aide_photos.json')) else {}
def feuilles(n):
    if 'espece' in n: return [n['espece']]
    r = []; [r.extend(feuilles(o['suite'])) for o in n['options']]; return r
def repres(fs):
    avec = [f for f in fs if f in P]; pr = [f for f in avec if E[f]['rang'] != 'secondaire']
    return (pr or avec or fs)[0]
qs, utiles = [], set()
def w(n, chemin):
    if 'espece' in n: return
    courts = C.get(n['id'], [o['reponse'] for o in n['options']]); rep = []
    for i, o in enumerate(n['options']):
        fs = feuilles(o['suite'])
        cands = [f for f in fs if f in P and E[f]['rang'] != 'secondaire'] + [f for f in fs if f in P and E[f]['rang'] == 'secondaire']
        a = (A.get(n['id']) or {}).get(str(i))
        defaut = a['p'] if a and a.get('p') else repres(fs)
        if defaut in P and defaut not in cands: cands = [defaut] + cands
        cands = cands[:8]
        if defaut in cands: cands.remove(defaut); cands = [defaut] + cands
        utiles.update(cands)
        rep.append({'court': courts[i], 'complet': o['reponse'], 'n': len(fs), 'defaut': defaut if defaut in P else None, 'cands': cands})
    qs.append({'id': n['id'], 'q': n['question'], 'groupe': n.get('groupe'), 'chemin': chemin, 'reps': rep})
    for i, o in enumerate(n['options']): w(o['suite'], chemin + [courts[i]])
w(cle, [])
json.dump({'questions': qs, 'noms': {s: E[s]['nom'] for s in utiles}}, open(O + '/questions.json', 'w'), ensure_ascii=False)
for s in utiles: shutil.copy(D('photos/' + s + '.jpg'), O + '/mini/' + s + '.jpg')
print(len(qs), 'questions', len(utiles), 'photos')
