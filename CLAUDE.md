# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PoCer is a mobile-first multiplayer quiz game built as a vanilla HTML/CSS/JavaScript web application. It supports up to 10 players on a single device with difficulty-based scoring and theme-based rounds.

**Live site**: https://sbenouat.github.io/poc-jeu/

## Development

**Run locally**: Open `index.html` directly in a browser, or serve with any static HTTP server:
```bash
python -m http.server 8000
```

No build step, dependencies, or package manager required.

## Documentation

Detailed docs live under `docs/`. Start with `docs/README.md` for the index. Each doc describes the current state of the code, not roadmap items:

- `docs/architecture.md` — files, modules in `script.js`, `STATE` shape, render pipeline, lifecycle
- `docs/mechanics.md` — game rules, scoring, turn order, theme rotation, undo, end-of-game
- `docs/ui.md` — CSS variables, screens, components (cards, buttons, chips, toasts, palette)
- `docs/ux.md` — flows (setup, resume, in-game, undo, end), mobile-first decisions, accessibility
- `docs/data.md` — `questions/` layout, lazy loading, fallback chain, `split-themes.py`
- `docs/persistence.md` — `pocer_state` and `pocer_lastPlayers` shapes, when written/cleared

When the code changes substantively, update the relevant `docs/*.md` to keep them factual.

## Architecture

Core files:

- **index.html** - UI markup with three screens: setup, game, and recap
- **script.js** - Game logic: state management, DOM manipulation, localStorage persistence, lazy loading of question themes
- **styles.css** - Dark theme mobile-first styling with CSS custom properties
- **questions/index.json** - Theme metadata pointing to per-theme files (primary source)
- **questions/<theme>.json** - One file per theme, loaded on demand
- **questions.sample.json** - Monolithic fallback used if `questions/index.json` fails to load

### Game Flow

1. Players enter names (1-10 players) and choose game length (5 or 10 rounds)
2. Each round: random theme selected → players take turns choosing difficulty → question drawn → answer revealed → points awarded (points = difficulty level if correct, 0 otherwise)
3. Game state persisted to localStorage for session resumption

### State Management

Central `STATE` object in script.js tracks: players, scores, current round, theme, used questions (by theme/difficulty), used difficulties per round, and the lazy-loading cache (`themeIndex`, `loadedThemes`). Key functions:
- `startGame()`, `nextPlayer()`, `drawQuestion()`, `onAnswer()`, `renderAll()`
- `saveLocal()` / `loadLocal()` for persistence
- `loadThemeIndex()` / `loadTheme()` for lazy loading themes

### Question Data Format

Per-theme file (`questions/<id>.json`):

```json
{
  "id": "theme-id",
  "name": "Theme Name",
  "questions": {
    "1": [{"q": "Question?", "a": "Answer"}],
    "2": [...],
    ...
    "10": [...]
  }
}
```

Index file (`questions/index.json`):

```json
{
  "themes": [
    {"id": "theme-id", "name": "Theme Name", "file": "theme-id.json"}
  ]
}
```

After editing per-theme files, regenerate `questions.sample.json` so the fallback stays in sync (see `docs/data.md`). Validate structure with `python check_questions.py`.

## Question Difficulty Criteria

Target audience: a group of friends playing at a party, not quiz champions. When in doubt, make it easier.

| Level | Criteria | Example |
|-------|----------|---------|
| 1-2 | Trivial, obvious to everyone | Capital of France, color of the sky |
| 3-4 | Elementary school, very well-known facts | Capital of Spain, days of the week |
| 5-6 | Middle/high school, common culture | Treaty of Versailles, Louis XIV |
| 7-8 | Educated adult, media/reading knowledge | First man in space, E=mc² |
| 9-10 | Specialized interest — never expert/obscure | Well-known director of a cult film, capital of Kazakhstan |

For specialized themes (Harry Potter, HIMYM, video games, sagas): levels 1-2 must be answerable by someone who only vaguely knows the topic; levels 9-10 target a good fan, never a super-fan encyclopedist.

Prefer recognition questions ("which work / which dish / which character") over proper-name recall ("who invented/composed/wrote"), except for universal names (Hugo, Mozart, Einstein).

## Deployment

Hosted on GitHub Pages. Deploy by pushing to `master` branch.

**Settings > Pages > Source**: Deploy from branch (master / root)

## Notes

- French language UI
- Mobile-first responsive design (breakpoint at 520px)
- Haptic feedback via `navigator.vibrate()`
- DOM helpers: `$` (querySelector) and `$$` (querySelectorAll)
- Themes loaded lazily — only the metadata index is fetched at startup; theme files load when first picked
