# UX

## Flux setup

Au chargement de la page :

1. `renderInitialPlayerInputs()` peuple `#playersInputs` :
   - Si `pocer_lastPlayers` (localStorage) contient ≥ 2 noms : reprend la liste (cap à 10)
   - Sinon : 2 inputs vides
2. Si `pocer_state` existe et a des joueurs : la carte `#resumeCard` apparaît au-dessus du formulaire avec un résumé `"N joueurs — manche X/Y"` et deux boutons "Reprendre" / "Nouvelle partie".
3. Le formulaire de setup propose :
   - **+ Ajouter un joueur** : ajoute une ligne (jusqu'à 10). Au-delà, le bouton est désactivé et le texte devient "Maximum 10 joueurs".
   - **−** sur chaque ligne (sauf la dernière restante) : retire la ligne et renumérote les placeholders.
   - **Partie courte (5 manches)** ou **Partie normale (10 manches)** : démarre la partie.

À la validation (`collectNames`) :
- Les noms sont triés (vides retirés).
- Si moins de 1 joueur valide : toast d'erreur "Au moins 1 joueur requis." (variante `danger`).
- Si plus de 10 (ne devrait pas arriver vu les contrôles) : toast "Maximum 10 joueurs." (variante `danger`).
- Sinon : `startGame(names, rounds)` qui sauvegarde aussi les noms dans `pocer_lastPlayers`.

## Flux reprise

Si `pocer_state` existe au chargement :
- `#resumeCard` apparaît avec le détail de la partie en cours.
- **Reprendre** : `resumeFromSave(saved)` reconstruit `STATE` à partir du save, recharge le thème courant (lazy via `loadTheme`) ou en tire un nouveau si le thème sauvegardé n'est plus dispo, puis bascule sur l'écran de jeu.
- **Nouvelle partie** : efface `pocer_state` et masque la carte. Le formulaire de setup reste utilisable.

Aucune modale système (`confirm`/`alert`) n'est utilisée — uniquement la carte custom et les toasts.

## Flux d'un tour

1. **Tour annoncé** : le panneau `.player-panel` affiche en grand l'avatar coloré + nom du joueur courant. Une vibration de 15ms ponctue le changement.
2. **Choix de difficulté** : tap sur un bouton de la grille `1-10`. Vibration de 8ms.
   - Si la difficulté est déjà prise dans la manche → bouton désactivé.
   - Si la difficulté n'a plus de questions → bouton désactivé.
   - Sur tap valide, la carte Q/A apparaît, le scoreboard se replie automatiquement.
3. **Lecture de la question** : affichée en grand (20px). Bouton "Afficher la réponse" en dessous.
4. **Réponse révélée** : tap sur "Afficher la réponse". Vibration `[8, 20, 8]`. La réponse apparaît, les boutons "Mauvaise" / "Bonne (+N)" remplacent le bouton de reveal.
5. **Verdict** : tap sur Bonne ou Mauvaise. Vibration `[10, 30, 10]` ou `25ms`.
   - Toast en bas : `+N pts pour <Joueur>` ou `0 pt pour <Joueur>`, avec un bouton "Annuler" actif 3s.
   - Tour suivant immédiatement (pas d'écran intermédiaire).

## Annuler un verdict

Pendant les 3 secondes du toast :
- Tap "Annuler" → `restoreFromSnapshot` ramène l'état exact d'avant le verdict (scores, tour, manche, thème, questions utilisées, currentQA, etc.).
- Si le verdict avait clôturé une manche (nouveau thème) ou la partie (`finishGame`) : l'undo restaure aussi l'écran de jeu et le thème précédent.

Le toast disparaît seul si non cliqué.

## Fin de partie

Deux entrées :

- **Bouton "Terminer la partie"** (en bas de l'écran de jeu) → toast "Terminer la partie ?" (variante `danger`) avec bouton "Confirmer" actif 4s. Pas de fin sans confirmation.
- **Atteinte naturelle** : à la fin du dernier tour de la dernière manche.

À la fin :
- Calcul du vainqueur (ou des vainqueurs en cas d'égalité).
- Affichage du scoreboard final.
- Bouton "Rejouer" qui efface `pocer_state` et recharge la page (le formulaire de setup est repré-rempli avec `pocer_lastPlayers`).

## Décisions mobile-first

- Inputs en `font-size: 16px` (évite le zoom auto iOS Safari sur focus).
- Boutons en `padding: 14-16px` (cibles de tap confortables).
- Toast positionné en bas (zone du pouce), avec marge `safe-area-inset-bottom`.
- Pas de hover-only — toutes les interactions fonctionnent au tap simple.
- Toasts plutôt que dialogues système : pas de coupure d'immersion, dismiss par timeout sans tap obligatoire.
- Carte de reprise plutôt que `confirm()` : choix explicite "Reprendre / Nouvelle", aucune répétition involontaire.
- Bouton de fin de partie protégé par confirmation toast (4s).
- Annulation toujours possible 3s après chaque verdict.

## Accessibilité

- `aria-live="polite"` sur la chip de manche, sur `.player-panel`, sur `#toastHost`.
- `aria-expanded` géré sur "Afficher la réponse".
- `aria-label` sur les boutons icônes (`.btn-remove-player`).
- `:focus-visible` global avec outline `--primary`.
- Le marker de `<summary>` du scoreboard est visuellement remplacé par une flèche custom mais reste un `<summary>` standard (clavier OK).
