# Roadmap

> **Attention :** ce fichier décrit des évolutions **envisagées**, pas l'état actuel du code. Tout le reste de `docs/` documente l'existant ; ce fichier-ci est le seul à parler de cible.
>
> Aucune de ces idées n'est planifiée à date. Elles sont consignées pour structurer une future conversation. À ré-aborder une à une, dans un plan dédié, avant implémentation.

## 1. Pénalité sur mauvaise réponse

**Idée** : une mauvaise réponse coûte des points. Variantes possibles : `−difficulté/2` (douce) ou `−difficulté` (dure, miroir parfait du gain).

**Pourquoi** : aujourd'hui, prendre toujours la difficulté 10 est dominant — zéro risque, gros gain. Une pénalité crée un vrai dilemme et donne du sens à la difficulté 1, qui devient un choix "safe" pour préserver son score.

**Questions à trancher** :
- Score peut-il devenir négatif ?
- Pénalité réduite (ex: divisée par 2) sur les premiers rounds, pour ne pas étouffer les retardataires ?
- Affichage : montrer "−N" sur le bouton "Mauvaise" comme on montre "+N" sur "Bonne" ?

**Impact** : `onAnswer(false)`, scoreboard, copy des boutons.

---

## 2. Combo

**Idée** : deux bonnes réponses d'affilée pour un même joueur déclenchent un multiplicateur ×1.5 sur la 2ᵉ (et au-delà, tant que la chaîne n'est pas brisée).

**Pourquoi** : récompense la régularité, donne une dynamique "momentum" qui rend chaque tour suivant plus tendu pour le joueur en série. Crée aussi un objectif intermédiaire entre score brut et stratégie de difficulté.

**Questions à trancher** :
- Le combo est-il propre à chaque joueur (à priori oui — par joueur) ?
- Cap au combo (ex: ×3 max) ou progression infinie ×1.5, ×2, ×2.5… ?
- Réinitialisé sur mauvaise, sur passe, sur fin de manche ?
- Affichage du combo en cours dans la chip de joueur ?

**Impact** : nouveau champ `comboCount` par joueur dans `STATE.players`, `onAnswer`, rendu visuel.

---

## 3. Joker souffle

**Idée** : à n'importe quel moment du tour, le joueur peut "demander un souffle" à un autre joueur de son choix. Si la réponse est correcte, les points sont partagés (par défaut 2/3 pour le joueur de tour, 1/3 pour le souffleur). Mauvaise = pénalité partagée selon le même ratio.

**Pourquoi** : casse l'isolement de chaque tour. Crée des dynamiques sociales (à qui fais-tu confiance ? qui veut s'associer à un risque ?). Donne un usage à la connaissance des autres joueurs.

**Questions à trancher** :
- Limite par partie (ex: 1 ou 2 jokers souffle par joueur) ?
- Le souffleur peut refuser ?
- Ratio de partage : 2/3 - 1/3 ou 1/2 - 1/2 ?
- UI : phase "à qui demandes-tu ?" avec chips cliquables ?

**Impact** : nouvelle phase entre reveal et verdict, état additionnel sur le tour, rendu de chips cliquables, double mise à jour de score.

---

## 4. Vol

**Idée** : si le joueur de tour ne sait pas, il déclare "je sèche" (ou un délai expire). Les autres joueurs peuvent tenter de répondre — premier arrivé premier servi — pour la moitié des points en jeu. Mauvais vol = pénalité (selon §1, divisée par 2 aussi).

**Pourquoi** : récompense l'écoute et l'attention. Un joueur en retard peut grappiller des points sur les hésitations des autres. Anti-frustration : une question "vue" qu'on connaît n'est pas perdue pour tout le monde.

**Questions à trancher** :
- Tous les joueurs peuvent voler, ou seulement N (premier à appuyer) ?
- UI : un bouton "Voler" devient cliquable par tous après que le joueur courant a déclaré "passe" ?
- Compatibilité avec §3 (souffle) — les deux peuvent-ils coexister, ou choisir au début du tour ?
- Le vol passe-t-il par la même phase de jugement (Bonne/Mauvaise) ?

**Impact** : nouvelle action `onSkip` (le joueur déclare passer), bouton "Voler" actif sur les chips des autres joueurs, attribution du score au voleur, juste plus complexe que `onAnswer`.

---

## 5. Défi 1v1

**Idée** : avant de répondre, le joueur de tour peut désigner un autre joueur en disant "je te défie de répondre à ma place". Le défié doit répondre. Bonne = le défié gagne les points. Mauvaise = c'est le défieur qui gagne les points (l'inverse du gain habituel).

**Pourquoi** : injecte un pari social. Permet de saboter un leader, ou de tester un joueur perçu comme expert sur un thème.

**Questions à trancher** :
- Le défié peut-il refuser ?
- Le défieur perd-il son tour s'il défie ? (Probablement oui, sinon c'est trop puissant.)
- Limite par partie ?
- Compatibilité avec §3 (souffle) et §4 (vol) — ces trois mécaniques s'excluent-elles dans un même tour ?
- Visuellement, comment indiquer "untel a été défié" ?

**Impact** : phase de désignation (chips cliquables), bascule du joueur actif pour le tour, scoring inversé dans `onAnswer`.

---

## 6. Timer dur

**Idée** : à partir du moment où la question est affichée (ou la réponse révélée, à trancher), un compte à rebours de `difficulté × 5s` se déclenche. Si dépassé, la réponse est automatiquement déclarée mauvaise.

**Pourquoi** : aujourd'hui, rien ne presse. Avec 50 tours par partie (10 joueurs × 5 manches), ça traîne. Un timer accélère le rythme et ajoute de la tension au moment de la réponse.

**Questions à trancher** :
- Timer entre l'affichage de la question et la révélation, ou entre la révélation et le verdict ?
- Cap minimum (ex: au moins 10s même pour difficulté 1) ?
- Mode "casual" sans timer activable ?
- Affichage : barre de progression en bas de la carte Q/A, ou compte numérique ?
- Vibration ou son sur les 3 dernières secondes ?

**Impact** : nouveau composant timer, état additionnel `timerStartedAt`, gestion de la pause (le joueur tape "Afficher la réponse" — le timer continue ou redémarre ?), accessibilité (à désactiver pour certains joueurs).

---

## 7. Objectifs secrets

**Idée** : au démarrage de la partie, chaque joueur tire en privé une "carte d'objectif secret" (ex: *"finir avec un score impair"*, *"jouer trois questions de difficulté ≥ 8"*, *"gagner sans jamais répondre faux"*, *"être 2ᵉ à la fin de la 3ᵉ manche"*). Si l'objectif est rempli à la fin de la partie, le joueur gagne un bonus de points fixe (ex: +20) ou un statut spécial (sub-vainqueur).

**Pourquoi** : ajoute une couche de méta-jeu. Encourage des stratégies non évidentes (un joueur peut volontairement choisir des difficultés faibles pour cocher son objectif). Renforce la rejouabilité — chaque partie est un peu différente selon les cartes tirées.

**Questions à trancher** :
- Objectifs visibles dans le récap final (révélation = effet "wow") ?
- Catalogue de combien d'objectifs (50 ? 100 ?) — où les stocker (`questions/objectives.json` ?) ?
- Comment gérer la triche / l'oubli — détection automatique ou auto-déclaration en fin de partie ?
- Bonus = points additionnels qui changent le classement, ou prix d'honneur séparé du gagnant ?
- UI : phase de pioche au début, où chaque joueur voit son objectif sur le tel sans que les autres voient ?

**Impact** : catalogue d'objectifs sérialisable, état par joueur (`objectiveId`, état d'avancement éventuel), phase setup additionnelle, vérificateur en fin de partie, écran récap enrichi.

---

## Notes générales

- **§3, §4, §5 interagissent fortement** : souffle, vol et défi sont trois façons de modifier qui répond et comment les points sont distribués. Ils méritent d'être pensés ensemble — peut-être en limitant à une seule "action sociale" par tour, déclenchée explicitement par le joueur de tour avant la révélation.
- **§1 et §2** sont les changements les plus simples mais les plus impactants sur l'équilibre du jeu. À tester en premier, isolément, avant d'empiler le reste.
- **§6 (timer)** est orthogonal et peut s'ajouter à n'importe quelle combinaison.
- **§7 (objectifs)** ajoute une couche au-dessus de tout le reste sans modifier les règles de base — peut se faire en dernier sans casser l'équilibrage.

Ordre d'implémentation suggéré (à valider) : §1 → §2 → §6 → §4 → §3 → §5 → §7.
