# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Lumen is a theme for the Steam desktop client, loaded by [Millennium](https://steambrew.app). The theme itself is plain CSS and browser JS with no build step. The npm packages are dev tooling only: lint, tests and checks. The repo lives inside the Steam install at `Steam/millennium/themes/Lumen`, so edits on disk are what Steam loads on its next start.

The design is Lumen's own: calm dark surfaces, rounded shapes, one accent color and cinematic game pages. The README and theme description must not call it "Fluent-style". Do not copy code from other Millennium themes (e.g. Fluenty, Aika); reimplement ideas in our own code.

## Commands

```sh
npm ci                                      # dev tooling
npm run ci                                  # everything CI runs: check, lint, test
npm run check                               # tools/check.js (see below)
npm run lint                                # ESLint (scripts) + Stylelint (CSS)
npm test                                    # node:test + jsdom, all of test/*.test.js
node --test test/store-hero.test.js         # one test file
node --test --test-name-pattern="viewer" test/store-hero.test.js   # one test
```

On Windows, `node --test test/` does not work; use the quoted glob as in `npm test`.

## How Millennium loads the theme

`skin.json` is the manifest:
- **`Patches`** match a window title (`^Steam$`, `^Friends List$`, `^Sign in to Steam$`, menus, …), a page URL (`^https://store\.steampowered\.com/…`) or a class (`.ModalDialogPopup`). A match injects `TargetCss`/`TargetJs` into that window or page.
- **`Conditions`** are the user settings. Each value can inject an `options/*.css` file and/or a JS file, scoped by `affects` patterns. JS options read their mode from CSS variables that the option CSS sets, e.g. `--lumen-hero`, `--lumen-header`.
- **`RootColors`** (`root-colors.css`) holds only opaque `#rrggbb` values; anything else breaks Steam's start.

Two load-order rules that cause real bugs:
- **Option files load before the base CSS** (`tokens.css`, `client.css`, `webkit.css`). An option rule with the same selector as a base rule loses on shared properties, so make option selectors more specific (e.g. a doubled class `.BottomBar.BottomBar`). `tools/check.js` fails CI on such collisions.
- `skin.json` (new patches, new conditions) is only re-read when Steam restarts.

## Layout of the code

- **`tokens.css`**: design tokens (`--lumen-*` colors, fonts, radii, easing), injected everywhere. Use these tokens rather than raw colors.
- **`client.css`**: all client windows (main window, friends, menus, dialogs). Organized in `/* ---- Section ---- */` blocks per area.
- **`webkit.css`**: store and community pages.
- **`signin.css`**: the sign-in / account-chooser window.
- **`options/`**: CSS switched on by settings: accent presets, compact header, cinematic library page, floating bottom bar, store hero modes.
- **`store/`**: the cinematic store app page (`hero.js`/`hero.css`: hero, facts row, media strip, viewer) and store browsing (`browse.css`, `hover.js`).
- **`js/`**: main-window scripts. Each is an IIFE guarded by a `window.__lumen*` flag and re-mounts through a rAF-throttled `MutationObserver`, because Steam's React UI re-renders and replaces nodes.
- **`shared/dash.js`**: `window.LumenDash`, a small MSE DASH player for Steam trailers (video-only for background trailers, with audio for the store viewer). Used by store and library.

Patterns that span files:
- **Selectors:** Steam's React UI has hashed class names next to stable semantic ones (`.AppDetailsMain`, `.PlayBar`, `.SectionItem`, `.friend`, …). Target the semantic ones, or page structure; never the hashed names.
- **Client data and actions:** main-window scripts reach them through the shared context `window.opener`:
  - `collectionStore` and `appStore` for games.
  - `appDetailsStore.Get{Hero,Logo}ImagesForAppId` for library art; relative `/assets/...` paths need the `https://steamloopback.host` prefix.
  - `downloadsStore` for the download queue.
  - `SteamUIStore.Navigate('/library/app/<id>')` for navigation.
  - `SteamClient.Apps.RunGame` to start a game.
  - `SteamClient.Downloads.*`, whose calls take the remote client id (`downloadsStore.CurrentViewingRemoteClientID`) as the last argument; without it they silently do nothing.
- **Labels:** script-made labels follow Steam's language from the `LANGUAGE` URL parameter, with English plus German at least.
- **Accent:** colors use `--lumen-accent` (set by the accent option files) and `color-mix()` for tints.

## Tests

`test/helpers.js` builds a jsdom page (`page(html, { url, vars })`) and evals a theme script into it (`load(w, "js/x.js")`):
- **Settings:** CSS variables that settings set are passed through `vars`.
- **Steam's shared context:** stub it with `Object.defineProperty(w, "opener", { value: {...} })`.
- **Timing:** `tick(ms)` waits for the rAF/MutationObserver cycle.

Fixtures are trimmed copies of real Steam markup.

`tools/check.js` (also run by CI and the release workflow) verifies:
- `skin.json` fields, condition defaults, and that every referenced file exists.
- CSS `url()`s resolve.
- Scripts pass `node --check`.
- RootColors values are `#rrggbb`.
- Option rules collide with no base rules.
- With `--tag vX.Y.Z`, the tag matches `skin.json`'s `version`.

`LUMEN_ROOT=<dir>` points it at a fixture.

## Working against the live Steam client

Steam exposes CEF remote debugging on `127.0.0.1:8080` when an empty file `Steam/.cef-enable-remote-debugging` exists at start. Steam deletes that file on every start, so recreate it before a restart. A full quit (Steam → Exit) is needed for a restart.

```sh
node tools/cdp.js list                                  # windows and pages
node tools/cdp.js eval "^Steam$" -e "document.title"    # run JS in a window ("^…$" = exact title, else substring of title/URL)
node tools/cdp.js shot "^Friends List$" dev/x.png       # screenshot (hangs while the window is minimized; use a timeout)
node tools/cdp.js click "^Steam$" 400 300               # real mouse click at CSS px
sh tools/push.sh "^Steam$" dev/.combo.css               # live-inject CSS as <style id="lumen-dev">
```

- **Live CSS:** when pushing CSS to the main window, concatenate in Millennium's order, options first and then `client.css`: `cat options/header-compact.css options/library-cinematic.css options/bottom-floating.css client.css > dev/.combo.css`.
- **Live JS:** to inject a script, reset its `window.__lumen*` guard first.
- **Never** call `location.reload()` on the `Steam` main window: it closes the window and needs a full Steam restart. Navigating store pages, or `SteamUIStore.Navigate` in the library, is fine.
- **Scratch:** `dev/` is git-ignored scratch space for probes and screenshots.

## Repo workflow

- **Branch protection:** `main` is protected (ruleset "Protect main"). Every change goes through its own PR, and the required checks are Validate, Lint, Test, CodeQL and Dependency review. The branch must be up to date, and review threads must be resolved.
- **Merging:** only after the user says so (usually "Ja, mergen") and CI is green. Use `gh pr merge <n> --merge --match-head-commit <full sha>`.
- **Releases:** bump `version` in `skin.json`, merge, then push a tag `vX.Y.Z`. The Release workflow publishes `Lumen.zip` without `tools/` or `test/`.
- **Commit author:** the GitHub noreply address that git is already configured with; do not use the user's private email.
- **Parked ideas** go into GitHub issues in the "Later" milestone.
