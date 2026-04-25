# Architecture

## Fichiers à la racine

| Fichier | Rôle |
|---|---|
| `index.html` | Markup des trois écrans (setup, game, recap) + templates + toast host |
| `script.js` | Logique : état, rendu, persistance, lazy loading, événements |
| `styles.css` | Styles dark mobile-first, variables CSS, responsive (breakpoint 520px) |
| `questions/index.json` | Métadonnées des thèmes (id, name, file, questionCount) — chargée au démarrage |
| `questions/<id>.json` | Un fichier par thème, chargé à la demande (lazy loading) |
| `questions.sample.json` | Fichier monolithique servant de fallback si l'index échoue |
| `split-themes.py` | Script Python one-shot qui régénère `questions/index.json` + fichiers par thème depuis `questions.sample.json` |
| `CLAUDE.md` | Pointeurs pour Claude Code |

Pas de build, pas de package manager, pas de dépendance runtime. Servir le dossier en static suffit (`python -m http.server`).

## Modules dans `script.js`

Le fichier est organisé en sections logiques séparées par des bandeaux `// --------- ... ----------` :

1. **Sélecteurs DOM** (`$`, `$$`) et tables `screens` / `els` — référence centrale aux nœuds.
2. **Constantes** : `MAX_ROUNDS`, `MAX_PLAYERS`, `MIN_PLAYERS`, `PLAYER_COLORS`.
3. **`STATE`** : objet global qui agrège l'état de la partie en cours et le cache lazy loading.
4. **Utils** : `randInt`, `initials`, `saveLocal`/`loadLocal`/`clearSavedGame`, `saveLastNames`/`loadLastNames`, `resetState`.
5. **Toast** : `toast(message, opts)` — composant d'alerte custom.
6. **Données questions** : `loadThemeIndex`, `loadQuestionsFallback`, `loadTheme`, `pickRandomTheme`, `drawQuestion`, `remainingCount`, `hasRemainingQuestions`, `ensureUsedQuestionsPaths`, `getAllThemeIds`.
7. **Joueurs (setup dynamique)** : `addPlayerInput`, `currentPlayerInputs`, `updateRemoveButtonsVisibility`, `renderInitialPlayerInputs`.
8. **UI helpers** : `showScreen`, `playerColor`, `renderRoundHeader`, `renderCurrentPlayer`, `renderScoreboard`, `renderDifficulties`, `renderQA`, `renderAll`.
9. **Tour & manches** : `setThemeForRound`, `computeTurnOrder`, `nextPlayer`.
10. **Actions** : `onChooseDifficulty`, `onShowAnswer`, `onAnswer`, `snapshotForUndo`, `restoreFromSnapshot`.
11. **Game flow** : `startGame`, `finishGame`, `confirmEndGame`.
12. **Events** : bindings `addEventListener` sur les boutons.
13. **Resume flow** : `describeSave`, `resumeFromSave`, hook `window.addEventListener("load", ...)`.

## L'objet `STATE`

Source unique de vérité pendant la partie :

```js
{
  players: [{name, score, colorIdx}],
  turnIndex,         // index du joueur qui doit jouer
  starterIndex,      // index du joueur qui a démarré la manche courante
  round,             // numéro de la manche courante (1-indexed)
  theme,             // objet thème courant ({id, name, questions})
  usedDifficulties,  // Set des difficultés déjà jouées dans la manche
  usedQuestions,     // {themeId: {1: [idx], 2: [idx], ...}} questions déjà tirées
  lastThemeId,       // dernier thème utilisé (évite le doublon immédiat)
  usedThemes,        // Set des thèmes déjà épuisés/joués
  questions,         // racine de la base { themes: [...] } (rempli au fur et à mesure du lazy)
  currentQA,         // {q, a, diff, _idx} ou null
  answerRevealed,    // bool : la réponse est-elle dévoilée ?
  themeIndex,        // contenu de questions/index.json ou null en mode fallback
  loadedThemes,      // cache { themeId: themeData }
}
```

`MAX_ROUNDS` est volontairement hors de `STATE` car déterminé par le bouton de démarrage (5 ou 10) et persisté à part dans `pocer_state.maxRounds`.

## Pipeline de rendu

`renderAll()` recompose entièrement l'écran de jeu en appelant en séquence :

1. `renderRoundHeader()` — chip manche, chip thème, dots de progression
2. `renderCurrentPlayer()` — avatar, nom, ordre des chips
3. `renderScoreboard(els.scoreboard)` — liste `<details>` repliable
4. `renderDifficulties()` — grille 1-10
5. `renderQA()` — carte question/réponse + ouvre/ferme automatiquement le scoreboard

Chaque rendu repart de zéro (`innerHTML = ""` puis reconstruit) — pas de diffing. Suffisant car le DOM est petit.

`renderAll` est appelé après chaque action utilisateur qui modifie l'état (`onChooseDifficulty`, `onAnswer` via `nextPlayer`, `restoreFromSnapshot`, etc.).

## Cycle de vie côté `window`

1. `load` event :
   - `renderInitialPlayerInputs()` — peuple le setup avec 2 inputs vides ou les noms persistés
   - `loadThemeIndex()` — fetch `questions/index.json` (ou fallback)
   - Si `pocer_state` existe et a au moins un joueur → affiche la carte de reprise
   - `showScreen("setup")`
2. Clic sur "Partie courte/normale" → `startGame(names, rounds)` → `showScreen("game")`
3. À chaque tour : `onChooseDifficulty` → `onAnswer` → `nextPlayer` → `renderAll`
4. Manche terminée (`turnIndex === starterIndex`) → `round++` ; si `round > MAX_ROUNDS` → `finishGame()`
5. `finishGame()` → `showScreen("recap")` + `clearSavedGame()`

## Lazy loading des questions

Voir [data.md](data.md) pour le détail.

Au démarrage, seul `questions/index.json` (~1 KB) est chargé. Chaque fichier de thème (`questions/<id>.json`) n'est fetché que lorsque ce thème est tiré pour la première fois, et mis en cache dans `STATE.loadedThemes`.

Si `questions/index.json` n'est pas accessible, fallback automatique sur `questions.sample.json` (monolithique). Si lui non plus n'est pas accessible, un thème "Démo" minimal est utilisé.
