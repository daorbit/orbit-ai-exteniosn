import { defineManifest } from "@crxjs/vite-plugin";
import pkg from "./package.json" with { type: "json" };

export default defineManifest({
  manifest_version: 3,
  name: "Orbit AI",
  description: "Orbit AI chat, in a side panel.",
  version: pkg.version,
  icons: {
    16: "public/icons/icon16.png",
    32: "public/icons/icon32.png",
    48: "public/icons/icon48.png",
    128: "public/icons/icon128.png",
  },
  action: {
    default_icon: {
      16: "public/icons/icon16.png",
      32: "public/icons/icon32.png",
      48: "public/icons/icon48.png",
      128: "public/icons/icon128.png",
    },
  },
  background: {
    service_worker: "src/background/service-worker.ts",
    type: "module",
  },
  side_panel: {
    default_path: "src/panel/index.html",
  },
  permissions: ["sidePanel", "storage", "tabs"],
  web_accessible_resources: [
    {
      resources: ["da-ai-dark-mode.png", "da-ai-light-mode.png"],
      matches: ["<all_urls>"],
    },
  ],
  commands: {
    "open-orbit": {
      suggested_key: {
        default: "Ctrl+Shift+O",
        mac: "Command+Shift+O",
      },
      description: "Open Orbit AI",
    },
  },
});
