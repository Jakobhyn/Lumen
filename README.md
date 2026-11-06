# Lumen

A calm, dark Fluent-style theme for the Steam client, built for [Millennium](https://steambrew.app).

- **Cinematic store page**: a game's trailer plays muted across the whole window, with the logo, short description, price and buttons on top. Below it sit a row with release date, developer, publisher, tags and the community hub, and a media strip whose trailers and screenshots open in a full-window viewer (trailers with sound).
- **Cinematic library page**: the game fills the first screen with its store trailer (art as poster), a large logo and a bigger play bar; a "More" button glides down to activity and achievements, shown as Fluent-style cards.
- **Library home**: a large "Continue playing" banner with the game you played last (art, logo, playtime, Play), and What's New as Fluent cards.
- **Downloads page**: the current download as a hero card, the queue as cards, and a "Smallest first" button that queues every scheduled update and sorts the queue by download size.
- **Friends list**: a dark header, a quiet Friends tab row, plain group titles with hairlines and rounded hover rows instead of Steam's blue-grey bars.
- **Sign-in and startup**: a calm account chooser with round avatars, and a Lumen loading screen while Steam starts.
- **Floating bottom buttons**: Steam's bottom bar becomes three round buttons side by side in the bottom right corner: Add a Game, Downloads (a progress pill while downloading) and Friends & Chat.
- **Store browsing**: the front page carousel in Lumen colors, and a wider game hover box with the game's header art and all its tags.
- **One-row header**: back/forward, the Steam menu as a logo, the Store/Library/Community/profile tabs, a game search in the middle, and a plain bell and avatar on the right.
- **Neutral greys** instead of Steam's blue tones, Segoe UI Variable, rounded corners and Fluent-style buttons and menus.
- **Accent color** that follows Windows, one of the presets, or any color you pick.

## Install

1. Install [Millennium](https://steambrew.app).
2. Copy this folder to `Steam/millennium/themes/Lumen`.
3. In Steam open Millennium → Themes and choose **Lumen**, then restart Steam.

## Settings

| Tab | Setting | Options |
|---|---|---|
| Colors | Accent | Windows (default), Sky, Violet, Mint, Amber, Rose, Custom |
| Window | Header | Compact (default), Classic |
| Window | Bottom bar | Floating (default), Classic |
| Window | Startup screen | On (default), Off |
| Library | Library page | Cinematic (default), Classic |
| Library | Library trailer | On (default), Off |
| Library | Continue banner | On (default), Off |
| Store | Store trailer | Cinematic (default), Still, Classic |

## Layout

| Path | What it styles |
|---|---|
| `skin.json` | Millennium manifest: patches and settings |
| `tokens.css` | Shared design tokens (colors, fonts, radii) |
| `root-colors.css` | Colors editable in the Millennium settings |
| `signin.css` | The "Sign in to Steam" window: account chooser and sign-in form |
| `client.css` | Client windows: frame, library, downloads, menus, friends |
| `webkit.css` | Store and community pages |
| `shared/dash.js` | Tiny DASH player for Steam's trailers, used by store and library |
| `store/` | Cinematic store page (hero, facts row, media strip, viewer) and store browsing (front page carousel, game hover box) |
| `js/library-trailer.js` | Store trailer behind the library game page |
| `js/library-activity.js` | Puts each activity entry's date on its card |
| `js/achievement-hover.js` | Achievement details beside the pointer instead of over it |
| `js/downloads-sort.js` | "Smallest first" on the downloads page: queue every scheduled update, smallest download first |
| `js/startup.js` | Calm loading screen while the Steam window starts |
| `js/library-home.js` | "Continue playing" banner on the library home |
| `js/library-more.js` | "More" (down to the content) and "Top" (back up) on the game page |
| `js/header-search.js` | The search field in the compact header |
| `options/` | Files switched on by the settings |
| `tools/` | Dev helpers that talk to Steam over CEF remote debugging |

## Development

Create an empty file `Steam/.cef-enable-remote-debugging` and restart Steam; the client then
listens on `http://127.0.0.1:8080`. Steam removes the file again on the next start.

```sh
node tools/cdp.js list                                # list Steam windows
node tools/cdp.js shot "^Steam$" main.png             # screenshot a window
sh tools/push.sh "^Steam$" client.css                 # live-inject CSS without restarting
```

## Checks, tests and CI

```sh
npm ci          # dev tooling only; the theme itself has no dependencies
npm run ci      # everything CI runs: check, lint, test
```

- `npm run check` (`tools/check.js`): `skin.json` parses, every file it references exists,
  CSS `url()`s resolve, scripts pass `node --check`, and `root-colors.css` holds only opaque
  `#rrggbb` values. It also flags option rules that the base CSS silently overrides:
  Millennium injects the settings' `options/*.css` before `client.css`, so an option rule
  with the same selector as a base rule needs to be more specific to take effect.
- `npm run lint`: ESLint for the scripts, Stylelint for the CSS.
- `npm test`: Node's test runner with jsdom: the store hero on a trimmed store page
  (bundles vs. the game's own price, facts row, media strip and viewer, Classic mode, fallbacks), the header search, and the checks.

Every pull request must pass **Validate**, **Lint**, **Test** and **CodeQL** before it can be
merged into `main`; dependency review, secret scanning and Dependabot run alongside.

To release, bump `version` in `skin.json`, merge, then push a matching tag:

```sh
git tag v0.2.0
git push origin v0.2.0
```

The Release workflow attaches `Lumen.zip` (without `tools/`) to a new GitHub release.

## License

[MIT](LICENSE)
