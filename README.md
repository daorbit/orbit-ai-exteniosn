# Orbit AI — browser extension

A Chrome extension (Manifest V3) that opens [Quantalog](https://quantalog.daorbit.in)'s Orbit AI assistant in the browser's side panel. Open it from the toolbar icon or with `Ctrl+Shift+O` (`Cmd+Shift+O` on macOS).

- **Stack:** React, TypeScript, Vite, `@crxjs/vite-plugin`
- **Manifest:** `manifest.config.ts`

## Getting started

```bash
npm install
npm run dev
```

Then load the extension in Chrome:

1. Open `chrome://extensions` and turn on **Developer mode**.
2. Click **Load unpacked** and choose the `dist` folder.
3. Pin **Orbit AI** and open it from the toolbar.

While `npm run dev` runs, changes reload automatically.

## Build

```bash
npm run build
```

The packaged extension is written to `dist/`. Zip that folder to upload it to the Chrome Web Store.

## Configuration

| Variable | Purpose |
|---|---|
| `VITE_API_BASE` | Quantalog backend origin (`.env.development` / `.env.production`) |

## Structure

```
src/background/  Service worker (side panel and keyboard shortcut)
src/panel/       Side panel entry
src/app/         App shell
src/orbit/       Orbit chat and suggestions
src/settings/    Extension settings
src/shared/      Shared helpers
```
