# Card Maximizer

Pick the best credit card for every purchase. Works offline once installed.

## Files
- `index.html` – the app
- `catalog.json` – card rewards data (the app checks this for updates each time it opens)
- `sw.js` – makes the app work offline
- `manifest.json`, `*.png` – home screen name and icon

## Updating card data
1. Edit or replace `catalog.json`.
2. Change `"version"` to a newer value, e.g. `"2026.10.15"`. The app only switches
   to a catalog whose version is newer than the one it already has.
3. Commit. GitHub Pages republishes in about a minute; phones get it the next time
   the app opens with internet.
