# UI

## Écrans

Trois écrans dans `index.html`, gérés par la classe `.active` (`showScreen(name)`) :

- `#screen-setup` — saisie des joueurs + carte de reprise
- `#screen-game` — partie en cours
- `#screen-recap` — résultats

## Variables CSS (`:root`)

| Variable | Valeur | Rôle |
|---|---|---|
| `--bg` | `#0f1220` | Fond de page |
| `--card` | `#161a2f` | Fond des cartes |
| `--muted` | `#9aa3b2` | Texte secondaire |
| `--text` | `#f3f5f7` | Texte principal |
| `--primary` | `#6d8bff` | Boutons primaires, focus |
| `--success` | `#22c55e` | Bouton "Bonne" |
| `--danger` | `#ef4444` | Toast d'erreur |
| `--chip` / `--chip2` | `#222743` / `#2a2f52` | Backgrounds de chips |
| `--elev` | `0 12px 30px rgba(0,0,0,.35)` | Ombre de la carte joueur |
| `--safe-top/bottom/left/right` | `env(safe-area-inset-*)` | Padding safe-area iOS |

## Layout

- `<main>` capé à `max-width: 760px`, padding combinant `16px` + `env(safe-area-inset-*)` pour respecter les encoches sur iOS.
- Mobile-first. Une seule media query : `@media (min-width: 520px)` qui passe :
  - les inputs de joueurs en grille 2 colonnes
  - la grille de difficulté de 5 à 10 colonnes

## Composants

### Cartes (`.card`)

Bloc `border-radius: 14px`, padding `16px`, fond `var(--card)`. Variante `.card.elevate` ajoute l'ombre `--elev`.

### Boutons (`.btn`)

- `.btn` (par défaut) — fond `#2b3054`
- `.btn.primary` — fond `--primary` (bleu)
- `.btn.secondary` — fond `#39407a`
- `.btn.success` — fond `--success` (vert)
- `.btn.ghost` — transparent + bordure
- `:focus-visible` — outline 2px `--primary` (accessibilité clavier)

### Setup joueurs

- `#playersInputs` contient des `.player-input-row` créées dynamiquement.
- Chaque ligne : `<input>` + bouton `−` (`.btn-remove-player`).
- Le bouton `−` est masqué (`visibility: hidden`) quand il ne reste qu'1 joueur, pour conserver la mise en forme.
- `#addPlayerBtn` (`.btn-add`) en pleine largeur sous les inputs ; texte "+ Ajouter un joueur" ou "Maximum 10 joueurs" (et désactivé) si la limite est atteinte.

### Header de manche (`.round-header`)

- `.round-chip` : fond `#1f2a5a`, texte "Manche X/Y"
- `.theme-chip` : outline `#3546a3`, texte "Thème : <strong>X</strong>"
- `.round-progress` : suite de `.dot` 12×12 px. Un dot a 3 états : vide (gris), `.active` (primaire + halo), `.done` (vert).

### Panneau joueur (`.player-panel`)

Une seule carte qui agrège :
- En tête (`.player-panel-head`) : avatar + texte (eyebrow "À toi de jouer" + nom large)
- Sous le head : `.turn-order` — la liste des chips de tous les joueurs

#### Avatar (`.avatar`)

Carré 56×56 arrondi 12px. Background = couleur du joueur (variable CSS `--player-color` posée inline). Texte = initiales en couleur sombre (`#0f1220`) pour contraster avec le fond clair.

#### Chips de tour (`.turn-chip`)

Pilule grise. Badge circulaire à gauche de la couleur du joueur. La chip active a un outline `--primary`.

### Scoreboard (`.scoreboard-card`)

Élément `<details>` natif :
- `<summary>` custom (puce native masquée, flèche `▾` ajoutée via `::after` qui pivote)
- Liste `<ul class="scoreboard">` avec une ligne par joueur (`.score-row`)
- Chaque ligne a une **bordure gauche de 4px** colorée à la couleur du joueur

Repliage automatique pendant la phase question (voir `renderQA` dans `script.js`).

### Grille de difficulté (`.difficulty-grid`)

10 boutons `.diff-btn` avec un attribut `data-d="1"` à `data-d="10"`. Couleur de fond interpolée du **vert clair (1) au rouge profond (10)** :

| Niveau | Couleur |
|---|---|
| 1 | `#86efac` (vert pâle) |
| 5 | `#f4d04a` (jaune) |
| 10 | `#dc2f4f` (rouge, texte blanc) |

Boutons désactivés : `opacity 0.25` + `grayscale 0.6`. Press : translate `1px` vers le bas.

### Carte Q/A (`#qaCard`)

- Question (taille 20px)
- Bouton "Afficher la réponse"
- Réponse (taille 18px, masquée jusqu'à reveal)
- Boutons de jugement : "Mauvaise" (`.btn.ghost`) et "Bonne (+N)" (`.btn.success`), `flex: 1` chacun

### Toast (`#toastHost`, `.toast`)

Conteneur fixe en bas (`bottom: 16px + safe-bottom`), 1000 z-index. Chaque toast :
- fond `#1f2547`, bordure `#343a6b`
- variante `.toast.danger` : bordure rougeâtre
- texte à gauche, optionnellement bouton d'action `.toast-action` (couleur `--primary` ou `#fca5a5` en variante danger)
- animation d'entrée (slide-up 200ms)
- `pointer-events: none` sur l'host, `auto` sur le toast (pour ne pas bloquer les taps quand vide)

## Palette joueurs (`PLAYER_COLORS`)

10 couleurs distinctes choisies pour rester lisibles avec un texte sombre par-dessus :

| Index | Hex |
|---|---|
| 0 | `#f87171` rouge |
| 1 | `#fb923c` orange |
| 2 | `#fbbf24` ambre |
| 3 | `#a3e635` lime |
| 4 | `#34d399` émeraude |
| 5 | `#22d3ee` cyan |
| 6 | `#60a5fa` bleu |
| 7 | `#a78bfa` violet |
| 8 | `#f472b6` rose |
| 9 | `#facc15` jaune |

Appliquée via la propriété custom CSS `--player-color` posée inline sur chaque élément concerné (avatar, chip, badge, score-row).

## Templates `<template>`

Deux dans `index.html`, clonés en JS :
- `#playerRowTpl` — ligne de scoreboard (`<li class="score-row">`)
- `#playerInputTpl` — ligne d'input setup (`.player-input-row`)
