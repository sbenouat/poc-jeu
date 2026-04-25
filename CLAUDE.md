# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PoCer is a mobile-first multiplayer quiz game built as a vanilla HTML/CSS/JavaScript web application. It supports up to 10 players on a single device with difficulty-based scoring and theme-based rounds.

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

## Notes

- French language UI
- Mobile-first responsive design (breakpoint at 520px)
- Haptic feedback via `navigator.vibrate()`
- DOM helpers: `$` (querySelector) and `$$` (querySelectorAll)
- Themes loaded lazily — only the metadata index is fetched at startup; theme files load when first picked
