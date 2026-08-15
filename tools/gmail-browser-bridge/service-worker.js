try {
  importScripts("config.local.js");
} catch {
  globalThis.LIEN_GMAIL_BRIDGE_CONFIG = null;
}

importScripts("background.js");
