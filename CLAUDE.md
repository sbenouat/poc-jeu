# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PoCer is a mobile-first multiplayer quiz game built as a vanilla HTML/CSS/JavaScript web application. It supports up to 10 players on a single device with difficulty-based scoring and theme-based rounds.

**Live site**: https://sbenouat.github.io/game/

## Development

**Run locally**: Open `index.html` directly in a browser, or serve with any static HTTP server:
```bash
python -m http.server 8000
```

No build step, dependencies, or package manager required.

## Architecture

Four core files:

- **index.html** - UI markup with three screens: setup, game, and recap
- **script.js** - Game logic: state management, DOM manipulation, localStorage persistence
- **styles.css** - Dark theme mobile-first styling with CSS custom properties
- **questions/** - Lazy-loaded theme files (19 themes), each with questions organized by difficulty (1-10)

### Game Flow

1. Players enter names (1-5 players) and choose game length (5 or 10 rounds)
2. Each round: random theme selected → players take turns choosing difficulty → question drawn → answer revealed → points awarded (points = difficulty level)
3. Game state persisted to localStorage for session resumption

### State Management

Central `STATE` object in script.js tracks: players, scores, current round, theme, used questions (by theme/difficulty), and used difficulties per round. Key functions:
- `startGame()`, `nextPlayer()`, `drawQuestion()`, `onAnswer()`, `renderAll()`
- `saveLocal()` / `loadLocal()` for persistence

### Question Data Format

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

## Question Difficulty Criteria

Target audience: a group of friends playing at a party, not quiz champions. When in doubt, make it easier.

| Level | Criteria | Example |
|-------|----------|---------|
| 1-2 | Trivial, obvious to everyone | Capital of France, color of the sky |
| 3-4 | Elementary school, very well-known facts | Capital of Spain, days of the week |
| 5-6 | Middle/high school, common culture | Treaty of Versailles, Louis XIV |
| 7-8 | Educated adult, media/reading knowledge | First man in space, E=mc² |
| 9-10 | Specialized interest — never expert/obscure | Well-known director of a cult film, capital of Kazakhstan |

Prefer recognition questions ("which work / which dish / which character") over proper-name recall ("who invented/composed/wrote"), except for universal names (Hugo, Mozart, Einstein).

## Deployment

Hosted on GitHub Pages. Deploy by pushing to `master` branch.

**Settings > Pages > Source**: Deploy from branch (master / root)

## Notes

- French language UI
- Mobile-first responsive design (breakpoint at 520px)
- Haptic feedback via `navigator.vibrate()`
- DOM helpers: `$` (querySelector) and `$$` (querySelectorAll)
