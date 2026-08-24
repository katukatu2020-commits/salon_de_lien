import fs from "node:fs";

const client = fs.readFileSync("/app/commercial-admin-v101.js", "utf8");
const required = [
  "let settingsDocumentRetryTimer = 0",
  "function scheduleSettingsDocumentRetry()",
  "settingsDocumentRetryCount >= 160",
  "window.__lienConfigureSettingsDocument = configureSettingsDocument",
  "frame.contentWindow.__lienConfigureSettingsDocument()",
  "document.documentElement.classList.contains('ca-settings-ready')",
];

for (const marker of required) {
  if (!client.includes(marker)) throw new Error(`missing v435 marker: ${marker}`);
}

if (!fs.existsSync("/app/.settings-dialog-readiness-v435")) {
  throw new Error("v435 release marker is missing");
}

const publicInitializerCount = client.split("window.__lienConfigureSettingsDocument = configureSettingsDocument").length - 1;
if (publicInitializerCount !== 1) throw new Error(`expected one public settings initializer, found ${publicInitializerCount}`);

console.log("Settings dialog readiness v435 verification passed");
