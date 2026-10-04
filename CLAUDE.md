# Lucro: notes for Claude Code

Lucro picks the best credit card for every purchase. It is a phone web app (PWA) hosted on
GitHub Pages: one self-contained `index.html` built from the files in `src/`.

## Build and test
- `python3 build.py` builds `index.html` (what GitHub Pages serves). Run it after every change in `src/`.
- `python3 build.py preview` builds `preview.html` for local testing (loads `seed.local.js` if present).
- No Python? `node build.js` and `node build.js preview` do exactly the same thing (identical output).
- Preview: `python3 -m http.server 8000` (or `npx http-server -p 8000`), then open http://localhost:8000/preview.html in Chrome
  with the device toolbar at iPhone size (390×844). Check light and dark mode.
- Before shipping, bump `CACHE` in `sw.js` (e.g. `card-max-v20` → `card-max-v21`) so phones pick up the new version,
  and raise `APP_VERSION` in `src/cats.js` (shown in Profile).

## Where things live
- `src/template.html`: layout and ALL styles. Colors are tokens at the top (`--primary`, `--accent`, `--hl` lime, etc.).
- `src/cats.js`: feature switches (`SHOW`), icons, spending categories, popular categories.
- `src/engine.js`: catalog loading, wallet storage (`localStorage` key `cardmax-v3`), ranking (`evalCard`, `rank`), tasks.
- `src/wallet.js`: Wallet tab (sort/filter sheets, swipe actions, drag to reorder, list rows).
- `src/views.js`: Earn tab, answer sheet, notifications, card details, add-card flow, onboarding, profile, splash, backup.
- `tools/build_catalog.py`: source of truth for card data; run it to regenerate `catalog.json`.
  Always raise `"version"` (phones only accept a newer version string).

## Native app (`mobile/`)
- Expo SDK 57 + TypeScript + Expo Router. See `mobile/README.md` and `mobile/AGENTS.md` (check versioned Expo docs; APIs change every SDK).
- Card logic lives in `mobile/src/core/`. `engine.ts` must keep giving the same answers as `src/engine.js`:
  `cd mobile && npm test` runs the parity test. If you change ranking rules, change both and keep the test green.
- After changing the catalog, run `npm run sync-catalog` in `mobile/` (the app also fetches the live `catalog.json` when newer).
- To check layouts without a phone: `npx expo export --platform web`, serve the output, screenshot at 390×844 (light + dark).
- Sheets must set their own background (`style={{ backgroundColor: c.bg }}`) so dark mode never shows a light sheet.
- Stick to modules that ship in Expo Go (e.g. `expo-sqlite/kv-store`, not MMKV) until we move to development builds.

## Rules
- Never edit `index.html` by hand: change `src/` and rebuild, or the next build wipes the edit.
- Never commit personal data: no real names, last-4 digits or wallets. Personal test data goes in `seed.local.js` (git-ignored).
- Never ask users for full card numbers or bank logins.
- Keep the storage key `cardmax-v3` so existing wallets survive updates.
- Hidden features stay in code behind `SHOW` switches instead of being deleted.
- Design: one-thumb phone UI, 44px+ tap targets, works in light and dark mode, no sideways scrolling.
