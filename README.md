# Card Maximizer

Pick the best credit card for every purchase. A phone web app (PWA): open the
link, tap Share → Add to Home Screen, and it runs like an app, offline too.

## Folder layout

| Path | What it is |
|---|---|
| `index.html` | The built app. **Generated, don't edit by hand.** GitHub Pages serves this. |
| `catalog.json` | Card rewards data. The app checks it for updates every time it opens. |
| `sw.js` | Offline support. Bump `CACHE` (e.g. `card-max-v7`) when you ship a new version. |
| `manifest.json`, `icon-192.png`, `icon-512.png`, `apple-touch-icon.png` | Home-screen name, colors, icon. |
| `src/template.html` | Page layout and all styles (colors live at the top as `--tokens`). |
| `src/cats.js` | Feature switches (`SHOW`), icons, spending categories. |
| `src/engine.js` | Catalog loading, wallet storage, ranking rules. |
| `src/wallet.js` | Wallet tab: press-and-hold to reorder, swipe actions, sort/group/filter, pin, rename. |
| `src/views.js` | Every other screen: Pay, Updates, sheets, splash, backup. |
| `tools/build_catalog.py` | Source of truth for card data. Run it to regenerate `catalog.json`. |
| `build.py` | Combines `src/` + `catalog.json` into `index.html`. |
| `seed.local.js` | *(optional, git-ignored)* your own test wallet for `preview.html`. Never commit it. |

## Everyday workflow (VS Code)

1. Open this folder in VS Code (File → Open Folder).
2. Edit files in `src/`.
3. In the VS Code terminal:
   ```
   python3 build.py preview     # builds preview.html for testing
   python3 -m http.server 8000  # then open http://localhost:8000/preview.html
   ```
   Chrome DevTools → toggle device toolbar (phone icon) to see it at phone size.
4. When it looks right:
   ```
   python3 build.py             # rebuilds index.html
   ```
   Bump `CACHE` in `sw.js`, then commit and push. GitHub Pages republishes in ~1 minute.

## Updating card data

1. Edit `tools/build_catalog.py`.
2. Change the `"version"` string near the bottom to something newer (e.g. `2026.10.15-v1`).
   Phones only switch to a catalog whose version sorts *after* the one they have.
3. `python3 tools/build_catalog.py` then `python3 build.py`, commit, push.

## Feature switches (`src/cats.js`)

- `SHOW.accountDetails` – due date, limit, fee, rewards balance (off for v1.0)
- `SHOW.splash` – opening animation
- `SINGLE_CARD_PER_PRODUCT` – one of each card per wallet

## Privacy

Wallets are stored only on the user's phone (`localStorage`, key `cardmax-v3`).
No card numbers, no bank logins. Users can save a backup file from Wallet → Back up or restore.
