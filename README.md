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

The packaged extension is written to `dist/`.

## Publishing

Every push to `main` that changes the extension builds it, uploads it to the Chrome Web Store and submits it for review (`.github/workflows/publish.yml`). It can also be run by hand from the **Actions** tab.

The version is set automatically to `<major>.<minor>.<run number>` from `package.json`, so you never bump it by hand. To start a new minor line, change `version` in `package.json` (for example to `0.2.0`).

Repository secrets (**Settings → Secrets and variables → Actions**):

| Secret | Where it comes from |
|---|---|
| `CWS_ITEM_ID` | The extension ID: `ilmdbgnbkgjldhelepoadfkmpahelmkg` |
| `CWS_PUBLISHER_ID` | Chrome Web Store developer dashboard → **Account** |
| `CWS_SERVICE_ACCOUNT` | The full contents of a Google Cloud service account JSON key. The project must have the Chrome Web Store API enabled, and the service account's email must be added under **Account** in the developer dashboard. |

Each built zip is also kept as a workflow artifact.

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
