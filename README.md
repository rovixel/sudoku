# Sudoku

A clean, mobile-friendly Sudoku game built with [Phaser 4](https://phaser.io), Vite and TypeScript. It is made to be embedded in a game website and runs on desktop, tablet and phone.

Play it on [Rovixel](https://rovixel.com).

## Features

- Four difficulties (Easy, Medium, Hard, Expert); every puzzle is generated on the fly and has exactly one solution
- Row, column, box and same-number highlighting; wrong entries are marked in red and underlined
- Notes, undo, erase and hints (3 per game); three mistakes ends the game, with one second chance
- Time-based scoring, best score per difficulty, autosave and resume
- English and Chinese, switchable in game
- Layout adapts to the host frame: side-by-side in landscape embeds, stacked in portrait
- Shuffled background music playlist with separate music and sound-effect switches
- Keyboard support: `1–9` enter, arrows move, `Backspace` erase, `N` notes, `H` hint, `Ctrl/⌘+Z` undo, `Esc` pause

## Development

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # puzzle generator and game-rule tests
npm run build    # static build in dist/
```

## Embedding

`npm run build` produces a fully static `dist/` folder. Host it anywhere and embed it with an iframe of any size; the game picks the layout that fits:

```html
<iframe src="https://example.com/sudoku/?lang=en" width="960" height="600" style="border:0" allow="autoplay"></iframe>
```

`?lang=en` or `?lang=zh` sets the starting language; a player's own choice is remembered after that.

## Project structure

```
src/main.ts            game setup, responsive sizing
src/layout.ts          portrait / landscape layout units
src/i18n.ts            English and Chinese text
src/sudoku/            pure game logic: rules, puzzle generator, game state (with tests)
src/game/              board view, difficulty picker
src/scenes/            Boot → Preload → Menu → Game, plus background music streaming
src/ui/                theme and shared widgets
src/audio/             music playlist and sound effects
public/assets/         images, audio and the asset manifest
```
