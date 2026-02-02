# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PoCer is a mobile-first multiplayer quiz game built as a vanilla HTML/CSS/JavaScript web application. It supports up to 5 players on a single device with difficulty-based scoring and theme-based rounds.

## Development

**Run locally**: Open `index.html` directly in a browser, or serve with any static HTTP server:
```bash
python -m http.server 8000
```

No build step, dependencies, or package manager required.

## Architecture

Four core files:

- **index.html** - UI markup with three screens: setup, game, and recap
- **script.js** - Game logic (~420 lines): state management, DOM manipulation, localStorage persistence
- **styles.css** - Dark theme mobile-first styling with CSS custom properties
- **questions.sample.json** - Question database organized by themes and difficulty levels (1-10)

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

## Notes

- French language UI
- Mobile-first responsive design (breakpoint at 520px)
- Haptic feedback via `navigator.vibrate()`
- DOM helpers: `$` (querySelector) and `$$` (querySelectorAll)
