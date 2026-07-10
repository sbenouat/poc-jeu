# Créer un nouveau thème de questions

Génère un fichier de thème complet pour le jeu PoCer, puis l'enregistre et met à jour l'index.

## Arguments

`$ARGUMENTS` doit contenir le nom du thème à créer, par exemple : `Astronomie` ou `Marvel`.

## Ce que tu dois faire

### 1. Déterminer les métadonnées

- **id** : slug en minuscules, sans accents ni espaces (ex. `astronomie`, `marvel`). Pour un nom multi-mots utilise `_` (ex. `culture_japonaise`).
- **name** : libellé affiché tel que fourni dans `$ARGUMENTS`.
- **file** : `<id>.json`.
- **Type** : standard (150 questions, 15/niveau) ou format spécial (voir ci-dessous).

Formats spéciaux (10 questions/niveau = 100 au total) :
- `plusoumoins` : chaque `q` doit être "Quel/Qui est le plus/le moins X : A ou B ?"
- `quisuisje` : chaque `q` commence par "Je suis…" et se termine par "Qui suis-je ?"

### 2. Générer les questions

Produis **150 questions** (standard) ou **100 questions** (format spécial), réparties en 10 niveaux.

**Format JSON strict** — chaque question est `{"q": "...", "a": "..."}` en texte brut (pas de HTML, pas de Markdown, pas d'astérisques). La réponse `a` doit être courte et tranchable (un mot, un nom propre, une date).

**Calibration relative au thème** (échelle intra-thème) :

| Niveau | Profil cible |
|--------|-------------|
| 1–2 | Trivial — quelqu'un même peu intéressé par le thème connaît la réponse |
| 3–4 | Connaissance basique — vu/lu/entendu une fois |
| 5–6 | Amateur régulier — détails connus |
| 7–8 | Passionné — anecdotes, dates, noms moins évidents |
| 9–10 | Expert — détail piège, fait peu connu, point précis qui sépare le fan du super-fan |

**Règles de qualité :**
- Pas de doublon : une même réponse ne doit pas apparaître deux fois pour le même fait, même reformulé.
- Pas d'erreur factuelle : ne pas inventer de dates, noms ou attributions incertains.
- Longueur des questions : viser 60–150 caractères (lisibilité mobile).
- Les clés du JSON sont des strings `"1"` à `"10"`, pas des entiers.

### 3. Écrire le fichier

Écris `questions/<id>.json` avec la structure suivante :

```json
{
  "id": "<id>",
  "name": "<name>",
  "questions": {
    "1": [{"q": "...", "a": "..."}, ...],
    "2": [...],
    ...
    "10": [...]
  }
}
```

### 4. Valider

Lance :

```bash
python -c "
import json
data = json.load(open('questions/<id>.json', encoding='utf-8'))
qs = data['questions']
target = 15  # ou 10 pour format spécial
errors = []
for k, v in qs.items():
    if len(v) != target:
        errors.append(f'niveau {k}: {len(v)} questions (attendu {target})')
all_q = [q['q'] for v in qs.values() for q in v]
dupes = [q for q in all_q if all_q.count(q) > 1]
if dupes:
    errors.append(f'doublons: {set(dupes)}')
print('OK' if not errors else '\n'.join(errors))
"
```

Corrige tout problème avant de continuer.

### 5. Mettre à jour `questions/index.json`

Ajoute une entrée dans le tableau `themes` :

```json
{
  "id": "<id>",
  "name": "<name>",
  "file": "<id>.json",
  "questionCount": 150
}
```

(`questionCount` = 100 pour les formats spéciaux.)

### 6. Présenter un échantillon sans réponses

Montre 2 questions de chaque niveau impair (1, 3, 5, 7, 9) **sans afficher les réponses** — le user joue au jeu et ne doit pas les voir. Attends sa validation avant de commiter.

### 7. Commiter

Une fois validé par le user :

```
git add questions/<id>.json questions/index.json
git commit -m "add theme: <name> (150 q., 15/level, calibrated)"
```
