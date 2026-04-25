# Persistance (localStorage)

PoCer utilise deux clés `localStorage` distinctes. Aucun cookie, aucun IndexedDB, aucun backend.

## `pocer_state` — partie en cours

Écrit après chaque action qui modifie l'état (`saveLocal()` est appelé dans `onChooseDifficulty`, `onAnswer`, `setThemeForRound`, `nextPlayer`, `restoreFromSnapshot`, `startGame`).

Lu au démarrage (`window.load`) pour proposer la reprise via `#resumeCard`.

### Shape

```json
{
  "players": [
    {"name": "Sami", "score": 12, "colorIdx": 0},
    {"name": "Marie", "score": 8, "colorIdx": 1}
  ],
  "turnIndex": 1,
  "starterIndex": 0,
  "round": 3,
  "themeId": "geo",
  "usedDifficulties": [3, 7],
  "usedQuestions": {
    "geo": {
      "1": [4, 12],
      "2": [],
      ...
      "10": [0]
    }
  },
  "lastThemeId": "geo",
  "usedThemes": ["histoire", "sciences", "geo"],
  "maxRounds": 10
}
```

### Champs non sauvegardés

`currentQA` et `answerRevealed` ne sont **pas** dans le save. À la reprise, le joueur courant doit re-choisir une difficulté (et la difficulté qu'il avait éventuellement déjà entamée reste marquée comme prise dans la manche).

`STATE.theme` est sauvegardé sous forme d'`id` (`themeId`) et rechargé via `loadTheme(themeId)` à la reprise. Si le thème a été supprimé entre-temps (improbable), `pickRandomTheme` est appelé en fallback.

### Effacement

`pocer_state` est effacé dans :
- `clearSavedGame()` (helper centralisé)
- `finishGame()` une fois le récap affiché
- Bouton "Rejouer" sur l'écran récap (avant `location.reload()`)
- Bouton "Nouvelle partie" sur la carte de reprise

## `pocer_lastPlayers` — derniers noms saisis

Écrit dans `startGame()` via `saveLastNames(names)` — la liste de noms validés au démarrage de la partie.

Lu dans `renderInitialPlayerInputs()` au chargement du setup pour pré-remplir les inputs si la liste contient au moins 2 noms.

### Shape

```json
["Sami", "Marie", "Léo"]
```

Ne contient que les noms — pas de scores, pas de couleurs. Ces deux derniers sont reconstruits au démarrage suivant (`colorIdx = i` à la création).

### Effacement

Pas effacé automatiquement — survit entre parties pour permettre la pré-saisie. Pour le réinitialiser, l'utilisateur doit retirer manuellement les noms dans le setup et démarrer une partie avec une liste différente.

## Robustesse

`loadLocal()` enveloppe le `JSON.parse` dans un `try/catch` : si `pocer_state` est corrompu, retourne `null` et la carte de reprise n'apparaît pas.

`loadLastNames()` fait pareil.

`saveLastNames` enveloppe le `setItem` dans un `try/catch` silencieux (pour les contextes où localStorage est indisponible : navigation privée stricte sur certains navigateurs, par exemple).

Aucune migration : les saves sont liés à la version actuelle du shape. Une partie sauvegardée avant une refactorisation peut casser la reprise. La sentinelle `pocer_state.maxRounds` est lue avec un fallback `|| 10` pour le cas (historique) où le champ n'existait pas.
