# Données questions

## Layout du dossier `questions/`

```
questions/
├── index.json              ← métadonnées (chargé au démarrage)
├── geo.json                ← un fichier par thème
├── histoire.json
├── sciences.json
├── ...
```

## Format de `index.json`

```json
{
  "version": "2.0",
  "themes": [
    {
      "id": "geo",
      "name": "Géographie",
      "file": "geo.json",
      "questionCount": 100
    },
    ...
  ]
}
```

Champs :
- `id` : identifiant interne (slug). Utilisé comme clé dans `STATE.usedQuestions[id]`.
- `name` : libellé affiché dans la theme chip.
- `file` : nom du fichier dans `questions/` à charger pour récupérer les questions.
- `questionCount` : total de questions tous niveaux confondus (information seulement, le code ne s'en sert pas pour la logique).

## Format d'un fichier de thème

```json
{
  "id": "geo",
  "name": "Géographie",
  "questions": {
    "1": [{"q": "Capitale de la France ?", "a": "Paris"}, ...],
    "2": [...],
    ...
    "10": [...]
  }
}
```

Les clés `"1"` à `"10"` sont des chaînes (pas des nombres). Chaque entrée est un objet `{q, a}`.

## Lazy loading

Au démarrage (`window.load`) : `loadThemeIndex()` :
1. Fetch `questions/index.json` avec `cache: "no-store"`.
2. Stocke le contenu dans `STATE.themeIndex`.
3. Initialise `STATE.questions = { themes: [] }` et `STATE.loadedThemes = {}`.

À chaque manche, `pickRandomTheme` choisit un id et appelle `loadTheme(id)` :
1. Si déjà dans `STATE.loadedThemes`, retourne directement.
2. Sinon, lit la métadonnée dans `STATE.themeIndex.themes` pour récupérer le `file`.
3. Fetch `questions/${file}`.
4. Stocke le résultat dans `STATE.loadedThemes[id]` et l'ajoute à `STATE.questions.themes` (pour compatibilité avec le code qui itère sur `STATE.questions.themes`).

Les thèmes déjà chargés restent en cache pour toute la durée de vie de la page (pas vidés entre parties — voir le commentaire dans `resetState`).

## Fallback monolithique

Si `questions/index.json` n'est pas accessible (erreur réseau, fichier absent), `loadQuestionsFallback()` :
1. Fetch `questions.sample.json` (le fichier monolithique racine).
2. Stocke directement le contenu dans `STATE.questions`.
3. Met `STATE.themeIndex = null` (sentinelle qui indique le mode fallback).
4. Pré-remplit `STATE.loadedThemes` avec **tous** les thèmes (pas de lazy en mode fallback).

`loadTheme(id)` détecte ce mode via `STATE.themeIndex === null` et retourne directement le thème depuis `STATE.questions.themes`.

## Fallback ultime

Si même `questions.sample.json` n'est pas accessible : un thème "Démo" minimal codé en dur dans `loadQuestionsFallback` (deux questions sur deux difficultés). Permet au moins de ne pas crasher au démarrage.

## Suivi des questions utilisées

`STATE.usedQuestions` est de la forme `{themeId: {1: [idx], 2: [idx], ...}}`. Les `idx` sont les positions dans la liste `theme.questions[difficulté]`.

`drawQuestion(theme, d)` :
1. `ensureUsedQuestionsPaths(theme.id)` — initialise les listes vides pour chaque difficulté si nécessaire.
2. Filtre les indices déjà utilisés.
3. Tire au hasard parmi les restants.
4. Marque l'index comme utilisé.
5. Retourne `{...qa, diff: d, _idx: idx}`.

`hasRemainingQuestions(theme)` retourne `true` dès qu'au moins une difficulté du thème a au moins une question non utilisée. Sert à `pickRandomTheme` pour ignorer les thèmes épuisés.

## Migration / régénération

Le script `split-themes.py` à la racine du repo (Python 3) régénère :
- Le fichier `questions/index.json` (avec `version`, `themes` et leurs `questionCount`).
- Un fichier `questions/<id>.json` par thème.

À partir du contenu de `questions.sample.json`. À ré-exécuter manuellement après modification du monolithique :

```bash
python3 split-themes.py
```

Le script crée le dossier `questions/` s'il n'existe pas. Il écrase les fichiers existants.
