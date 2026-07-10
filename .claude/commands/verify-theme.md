# Vérifier un thème de questions

Audite la qualité d'un fichier de thème existant : doublons, erreurs factuelles, calibrage, format.

## Arguments

`$ARGUMENTS` : id du thème à auditer (ex. `musique`, `geo`). Si vide, audite **tous** les thèmes listés dans `questions/index.json`.

## Ce que tu dois faire

### 1. Validation structurelle (Python)

```bash
python -c "
import json, sys

ids = ['$ARGUMENTS'] if '$ARGUMENTS' else [t['id'] for t in json.load(open('questions/index.json', encoding='utf-8'))['themes']]

for tid in ids:
    meta = next(t for t in json.load(open('questions/index.json', encoding='utf-8'))['themes'] if t['id'] == tid)
    data = json.load(open(f'questions/{meta[\"file\"]}', encoding='utf-8'))
    qs = data['questions']
    target = 10 if tid in ('plusoumoins', 'quisuisje') else 15
    errors = []

    # Compte par niveau
    for k in [str(i) for i in range(1, 11)]:
        count = len(qs.get(k, []))
        if count != target:
            errors.append(f'  niveau {k}: {count} questions (attendu {target})')

    # Doublons de questions
    all_q = [q['q'] for v in qs.values() for q in v]
    dupes_q = set(q for q in all_q if all_q.count(q) > 1)
    if dupes_q:
        errors.append(f'  doublons de questions: {dupes_q}')

    # Doublons de réponses (même réponse, même fait différemment formulé)
    all_a = [q['a'] for v in qs.values() for q in v]
    dupes_a = set(a for a in all_a if all_a.count(a) > 1)
    if dupes_a:
        errors.append(f'  réponses en double: {dupes_a}')

    # Format spéciaux
    if tid == 'plusoumoins':
        bad = [q['q'] for v in qs.values() for q in v if ' ou ' not in q['q']]
        if bad:
            errors.append(f'  plusoumoins sans \"ou\": {bad[:3]}')
    if tid == 'quisuisje':
        bad = [q['q'] for v in qs.values() for q in v if not q['q'].startswith('Je suis') or 'Qui suis-je' not in q['q']]
        if bad:
            errors.append(f'  quisuisje format invalide: {bad[:3]}')

    status = 'ERREURS' if errors else 'OK'
    print(f'[{status}] {tid}')
    for e in errors:
        print(e)
"
```

Corrige toute erreur structurelle avant de continuer.

### 2. Audit qualitatif par lecture

Lis le fichier du thème (ou chaque fichier si audit global) et examine :

**Calibrage** — vérifie que les extrêmes sont cohérents :
- Niveaux 1–2 : les questions doivent être connues de quelqu'un qui ne s'intéresse pas vraiment au thème.
- Niveaux 9–10 : les questions doivent vraiment séparer le passionné du super-fan. Si une réponse est connue de beaucoup de monde (ex. "La mer Morte" en géo niveau 10, "Imagine" en musique niveau 8), c'est un signal de mauvais calibrage.

**Erreurs factuelles** — signale tout fait douteux : mauvaise attribution d'une œuvre, date incorrecte, biographie erronée. En cas de doute, mentionne-le plutôt que de corriger à tort.

**Doublons sémantiques** — deux questions qui portent sur le même fait exact, même si formulées différemment (ex. deux questions sur le même album de Pink Floyd avec la même réponse à des niveaux différents).

**Qualité des formulations** — signale les questions trop longues (>180 caractères), les réponses ambiguës, ou les questions dont la réponse est trahie par la question elle-même.

### 3. Rapport

Présente les résultats sous cette forme :

```
=== Audit : <thème> ===

STRUCTURE : OK / ERREURS (détail)

CALIBRAGE :
- [niv X] "Question..." → réponse trop connue pour ce niveau
- [niv Y] ... 

ERREURS FACTUELLES :
- [niv X] "Question..." → <problème détecté>

DOUBLONS SÉMANTIQUES :
- [niv X] et [niv Y] : même réponse "<réponse>" sur le même fait

FORMULATIONS :
- [niv X] question trop longue / réponse ambiguë

RÉSUMÉ : N problèmes à corriger, M observations mineures.
```

Si aucun problème : `Thème <id> : RAS.`

### 4. Corrections

Propose les corrections pour chaque problème identifié et demande confirmation avant d'écrire quoi que ce soit. Une fois validé, applique les corrections et recommence la validation structurelle pour confirmer que tout est propre.
