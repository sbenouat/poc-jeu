# Mécaniques de jeu

## Joueurs et configuration

- 1 à 10 joueurs (`MIN_PLAYERS = 1`, `MAX_PLAYERS = 10`).
- Chaque joueur a un `name`, un `score` (entier, démarre à 0) et un `colorIdx` (index dans `PLAYER_COLORS`).
- Deux longueurs de partie au choix au démarrage : **5 manches** (bouton "Partie courte") ou **10 manches** (bouton "Partie normale"). Cette valeur est stockée dans `MAX_ROUNDS`.

## Structure d'une partie

Une partie est une séquence de **manches**. Chaque manche est composée de **N tours**, où N = nombre de joueurs.

À chaque manche :
1. Un thème est tiré au hasard parmi ceux pas encore utilisés (`pickRandomTheme`).
2. Tous les joueurs jouent une fois, dans l'ordre déterminé par `starterIndex`.
3. Quand le dernier joueur a joué, la manche se termine et le `starterIndex` avance d'une position pour la manche suivante.

À chaque tour :
1. Le joueur courant choisit une difficulté de 1 à 10 (`onChooseDifficulty`).
2. Une question est tirée au hasard parmi celles non encore utilisées de cette difficulté pour ce thème (`drawQuestion`).
3. Si le timer est activé (cf. *Timer*), un compte à rebours démarre.
4. Le joueur affiche la réponse (`onShowAnswer`) — le timer s'arrête.
5. Le joueur (ou le groupe) déclare la réponse "Bonne" ou "Mauvaise" (`onAnswer`).
6. Si le timer expire avant le reveal, la réponse est révélée automatiquement et `onAnswer(false, { reason: "timeout" })` est appelé.

## Scoring

- Réponse correcte → le joueur gagne **`difficulté` points** (entre 1 et 10).
- Réponse incorrecte → 0 point. Pas de pénalité.
- Le score est mis à jour dans `player.score` au moment de `onAnswer(true)`.

## Choix de difficulté

- 10 boutons de difficulté (1 à 10) affichés en grille (`#difficultyGrid`).
- Une difficulté ne peut être choisie qu'**une seule fois par manche** (set `STATE.usedDifficulties`). Le bouton est désactivé une fois utilisée.
- Une difficulté est aussi désactivée si **toutes les questions** de ce niveau pour le thème courant ont déjà été utilisées (`remainingCount === 0`). À 10 joueurs sur la même manche, certaines difficultés peuvent donc être épuisées en cours de manche si le pool de questions est petit.
- Aucune difficulté par défaut, aucun rappel "il te reste X" — c'est au joueur de regarder la grille.

## Ordre des tours

- L'ordre est déterminé par `starterIndex`. Le joueur à `starterIndex` joue en premier, puis `starterIndex + 1`, etc., en circulaire.
- À chaque nouvelle manche, `starterIndex` avance de 1 (`starterIndex = (starterIndex + 1) % players.length`).
- `turnIndex` est l'index du joueur qui doit jouer maintenant ; il avance de 1 à chaque `nextPlayer()`.
- Une manche se termine quand `turnIndex` est revenu à `starterIndex` après avoir parcouru tous les joueurs. À ce moment-là, `round` est incrémenté.

Conséquence : avec 10 joueurs et 5 manches, seuls les joueurs d'index 0 à 4 ouvrent une manche. Avec 10 joueurs et 10 manches, chacun ouvre exactement une manche.

## Sélection des thèmes

`pickRandomTheme()` :

1. Liste tous les thèmes disponibles (`getAllThemeIds`).
2. Filtre ceux déjà dans `STATE.usedThemes`.
3. Si le pool restant a plus d'un thème, exclut aussi `STATE.lastThemeId` pour éviter deux manches consécutives sur le même thème (improbable de toute façon, mais explicite).
4. Tire au hasard.
5. Charge le thème via `loadTheme(id)` (lazy).
6. Si le thème tiré n'a plus aucune question disponible (`hasRemainingQuestions` = false), le marque comme épuisé et relance.

`STATE.usedThemes` est rempli dans `setThemeForRound` après un pick réussi, donc un thème ne peut pas être tiré deux fois dans une même partie.

## Jugement et undo

Le verdict "Bonne" ou "Mauvaise" est cliqué par le joueur lui-même (ou le groupe) — il n'y a pas de juge dédié dans le code. Aucune restriction technique sur qui peut cliquer.

Après chaque verdict, un **toast d'undo** (3s) propose d'annuler. Cliquer dessus restaure l'état pré-verdict via un snapshot pris dans `snapshotForUndo()` :

- Scores des joueurs
- `turnIndex`, `starterIndex`, `round`
- Thème courant et questions utilisées dans ce thème
- `usedDifficulties` et `currentQA` / `answerRevealed`
- `lastThemeId`, `usedThemes`

Si l'undo intervient après que la manche s'est terminée (donc nouveau thème tiré), restaurer ramène au thème précédent et au tour précédent. Si l'undo intervient après la fin de partie (`finishGame`), `restoreFromSnapshot` rebascule sur l'écran de jeu.

## Fin de partie

Trois manières d'atteindre la fin :

1. **Naturelle** : `round > MAX_ROUNDS` après `nextPlayer()` → `finishGame()`.
2. **Volontaire** : bouton "Terminer la partie" → `confirmEndGame()` affiche un toast "Terminer la partie ?" avec action "Confirmer" qui appelle `finishGame()`. Le toast disparaît seul après 4s.
3. **Plus de questions** : `setThemeForRound` ne trouve plus aucun thème jouable → toast "Plus de thèmes disponibles. Fin de partie." + `finishGame()`.

`finishGame()` :
- Calcule le meilleur score, identifie le ou les vainqueurs.
- Affiche `Vainqueur : X (Y pts)` ou `Égalité ! Gagnants : A, B (Y pts)` dans `#winners`.
- Rend le scoreboard final dans `#finalTable`.
- Bascule sur l'écran récap.
- Efface le `pocer_state` du localStorage (la partie ne peut plus être reprise).

L'écran récap propose un bouton "Rejouer" qui efface aussi `pocer_state` et recharge la page.

## Tirage des questions

`drawQuestion(theme, d)` :

1. Récupère la liste des questions pour la difficulté `d` du thème (`theme.questions[String(d)]`).
2. Initialise `STATE.usedQuestions[theme.id][d]` si nécessaire (`ensureUsedQuestionsPaths`).
3. Filtre les questions déjà utilisées (par index dans la liste).
4. Tire au hasard parmi les restantes.
5. Marque l'index comme utilisé.
6. Retourne `{q, a, diff, _idx}`.

Si toutes les questions de cette difficulté sont utilisées, la fonction retourne `null` et l'UI affiche brièvement le message `#deckEmpty` (1.8s).

## Timer

Optionnel, activé par défaut. Toggle dans le setup (`#timerToggle`), persisté dans `pocer_settings` localStorage (cf. `docs/persistence.md`).

- **Durée** : `(10 + difficulté × 3)` secondes — soit 13s pour la difficulté 1, jusqu'à 40s pour la 10. Helper `timerDurationFor(diff)` dans `script.js`.
- **Démarrage** : à la fin de `onChooseDifficulty` (`startTimerLoop(deadline)`), après le `renderAll` qui affiche la question.
- **Arrêt** : sur `onShowAnswer`, `onAnswer`, `restoreFromSnapshot`, `finishGame`, `resumeFromSave`. Helper `stopTimer`.
- **Tick** : `setInterval` à 250ms qui calcule `remaining = deadline - Date.now()`. Met à jour `#timerDisplay` avec `Xs` (entier supérieur), bascule la classe `.warn` quand `remaining ≤ 3000ms`.
- **Expiration** : `onTimeout()` met `answerRevealed = true`, `timedOut = true`, vibre `[20, 40, 20]`, et révèle la réponse. Les boutons Bonne/Mauvaise sont remplacés par un bouton **Continuer** (`#btnContinue`). Le score n'est pas encore appliqué — le groupe a le temps de lire la réponse. Au clic sur Continuer (`onContinueAfterTimeout`) : `timedOut = false` puis `onAnswer(false, { reason: "timeout" })`, qui applique 0 point, avance et affiche le toast "Temps écoulé — 0 pt pour X" avec l'undo standard.
- **Pas de persistance du timer** : `currentQA` n'étant pas sauvegardé, sur reload le joueur revient à la grille de difficulté ; la difficulté entamée reste marquée prise. Aucun timer fantôme.

## Effets latéraux

- **Vibration** (`navigator.vibrate`) sur :
  - Changement de joueur (15ms) dans `renderCurrentPlayer`
  - Choix d'une difficulté (8ms) dans `onChooseDifficulty`
  - Affichage de la réponse (pattern `[8, 20, 8]`) dans `onShowAnswer`
  - Verdict bonne (`[10, 30, 10]`) ou mauvaise (25ms) dans `onAnswer`
  - Timeout (pattern `[20, 40, 20]`) dans `onTimeout`
- Aucun son.
