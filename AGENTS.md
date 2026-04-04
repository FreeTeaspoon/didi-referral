# AGENTS.md

## Cursor Cloud specific instructions

This is a static client-side web app (vanilla HTML/CSS/JS) with no build step, no backend, and no database. Dev tooling is ESLint + Prettier only.

### Running the app

Serve with any static HTTP server from the repo root, e.g. `python3 -m http.server 8080`, then open `http://localhost:8080/index.html`. The app makes browser-side `fetch()` calls to DiDi's external Growth API (`growth.didiglobal.com`); no local backend is needed.

### Lint & format

See `package.json` scripts: `npm run lint`, `npm run lint:fix`, `npm run format`, `npm run format:check`.
