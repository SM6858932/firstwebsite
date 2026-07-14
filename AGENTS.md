# Repository Guidelines

## Project Structure & Module Organization

GlobalPulse is a zero-dependency vanilla JavaScript news aggregation site organized into three main modules:

- **rss-engine.js** — Fetches and normalizes RSS feeds from 13+ sources across 7 categories (World, Business, Technology, Sports, Entertainment, Health, Science). Implements CORS-proxy integration (rss2json.com), client-side deduplication, and 30-minute localStorage caching. Exports a singleton module with `fetchArticles()` and `fetchLatestBreaking()` methods.
- **engagement.js** — Gamification layer managing points, daily streaks, bookmarks, and social sharing. Persists user state to localStorage.
- **app.js** — Main orchestrator rendering articles in responsive grid, handling category filtering, search, infinite scroll, and UI state. Also renders static "Reels" carousel and "Products" showcase.

**style.css** implements a design system with CSS custom properties for colors, spacing, and animations. Supports dark/light mode toggle.

## Build, Test, and Development Commands

There is no build step. Simply open `index.html` in a browser, or use a local HTTP server:

```bash
npx serve .
```

The project runs entirely in the browser with no server-side build, bundling, or transpilation.

## Coding Style & Naming Conventions

- **JavaScript pattern:** Vanilla ES6+ with `'use strict'` mode. Modules use the IIFE (Immediately Invoked Function Expression) pattern to encapsulate state and expose only a public API.
- **File headers:** Each JS file includes a JSDoc comment block describing its purpose, scope, and external dependencies (e.g., CORS proxy details, localStorage usage).
- **State management:** App state lives in a single `state` object in app.js with properties like `articles`, `activeCategory`, `searchQuery`, `visibleCount`. No frameworks.
- **Comments:** Consistent use of `// ---` delimiters to mark logical sections (Configuration, State, Methods, etc.).
- **Naming:** camelCase for variables and functions. ALL_CAPS for configuration constants like `CACHE_KEY` and `FEED_SOURCES`.

No linter or formatter is configured. Maintain the existing style manually.

## Commits

The repository follows a single initial commit with a conventional message format: `<type>: <subject>`. Follow this pattern for new commits (e.g., `feat: add article search`, `fix: correct RSS feed URL`).
