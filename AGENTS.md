# AGENTS.md

## Cursor Cloud specific instructions

### Overview

This is a single-file static web application (`index.html`) — a DiDi Referral Claimer that makes client-side API calls to DiDi's growth API. There is no build system, no package manager, no backend, and no dependencies.

### Serving the app

Run a static file server from the repo root:

```
python3 -m http.server 8080
```

Then open `http://localhost:8080/index.html` in Chrome.

### Lint / Test / Build

- **Lint**: No linter is configured. You can optionally validate the HTML with an external tool, but there is no project-level lint command.
- **Tests**: No automated test suite exists. Testing is manual — open the page, enter a phone number, click "Claim Discount", and verify the UI shows progress steps and a result.
- **Build**: No build step — the app is a single self-contained HTML file.

### Key caveats

- The app calls `https://growth.didiglobal.com/litchi2/api` directly from the browser. Network access to this external API is required for core functionality to work.
- All JavaScript, CSS, and HTML are embedded in a single `index.html` file.
