# Tiny Worlds

A small, cozy browser sandbox for building miniature islands. It is designed as a self-contained Toolspace folder and uses HTML, CSS, and vanilla JavaScript. No backend, accounts, API keys, build step, or external JS dependencies are required.

## Features

- 10×8 tile island generated from a reproducible world seed.
- Four biomes: Meadow, Desert, Snowfield, and Mystic.
- Build palette with nature, buildings, and magical objects; terrain painting and erase mode.
- Weather and time-of-day themes.
- Six discoveries triggered by object combinations.
- Undo, rename, autosave, save/load multiple worlds in `localStorage`.
- Shareable world URL (the current board state is encoded into the link), JSON export/import, and an explicit PNG snapshot button. Sharing encodes data in the URL; no world is uploaded to a server.
- Responsive layout, including 320px-wide phones.
- Toolspace metadata in `index.html`; catalog generator can read its title/category/status/tag/symbol/thumbnail.

## Add to Toolspace

Copy/upload this entire `Tiny_Worlds/` folder to the root of `SatrioUtomo874/toolspace-dashboard`, beside the root `index.html` and other tool folders. Commit to the configured production branch. The Toolspace catalog generator should discover `Tiny_Worlds/index.html` and generate its card metadata automatically.

The page is available at `/Tiny_Worlds/` when deployed from the root folder without rewrite rules that change subdirectory routing.

## Data and privacy

Worlds are stored in the current browser profile using `localStorage`. Sharing a world copies a URL with a world seed and biome; it does not upload the world to a server. Saving a world in localStorage does not sync it between devices. Export JSON for a portable backup.

## Keyboard and touch

The world grid is keyboard-focusable. For mobile, choose a palette item then tap a tile. No drag gesture is required for the core building loop.

## Notes

- This is an MVP cozy toy, not a game server. Clearing browser storage can remove saved worlds unless exported.
- The project imports Google Fonts via CSS when the network is available; system fallbacks are included by the browser.
