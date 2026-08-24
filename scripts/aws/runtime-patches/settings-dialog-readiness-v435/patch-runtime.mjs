import fs from "node:fs";

function replaceOnce(source, before, after, label) {
  const count = source.split(before).length - 1;
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`);
  return source.replace(before, after);
}

const clientPath = "/app/commercial-admin-v101.js";
let client = fs.readFileSync(clientPath, "utf8");

client = replaceOnce(
  client,
  `  function configureSettingsDocument() {
    if (location.pathname !== '/admin/settings') return
    const params = new URLSearchParams(location.search)
    const panelKey = params.get('panel')
    const embedded = params.get('embedded') === '1' && settingsPanels[panelKey]
    const main = document.querySelector('main')
    if (!main) return
    const headings = Array.from(main.querySelectorAll('h2'))`,
  `  let settingsDocumentRetryTimer = 0
  let settingsDocumentRetryCount = 0

  function scheduleSettingsDocumentRetry() {
    if (settingsDocumentRetryTimer || settingsDocumentRetryCount >= 160) return
    settingsDocumentRetryCount += 1
    settingsDocumentRetryTimer = window.setTimeout(() => {
      settingsDocumentRetryTimer = 0
      configureSettingsDocument()
    }, 60)
  }

  function configureSettingsDocument() {
    if (location.pathname !== '/admin/settings') return false
    if (document.documentElement.classList.contains('ca-settings-ready')) return true
    const params = new URLSearchParams(location.search)
    const panelKey = params.get('panel')
    const embedded = params.get('embedded') === '1' && settingsPanels[panelKey]
    const main = document.querySelector('main')
    if (!main) {
      if (embedded) scheduleSettingsDocumentRetry()
      return false
    }
    const headings = Array.from(main.querySelectorAll('h2'))
    if (embedded && !headings.some(heading => settingsPanels[panelKey].headings.includes(heading.textContent.trim()))) {
      scheduleSettingsDocumentRetry()
      return false
    }`,
  "retry embedded settings initialization",
);

client = replaceOnce(
  client,
  `    document.documentElement.classList.add('ca-settings-ready')
    document.body.classList.add('ca-settings-ready')
  }

  function closeSettingsDialog(root) {`,
  `    document.documentElement.classList.add('ca-settings-ready')
    document.body.classList.add('ca-settings-ready')
    settingsDocumentRetryCount = 0
    if (settingsDocumentRetryTimer) window.clearTimeout(settingsDocumentRetryTimer)
    settingsDocumentRetryTimer = 0
    return true
  }
  window.__lienConfigureSettingsDocument = configureSettingsDocument

  function closeSettingsDialog(root) {`,
  "expose completed settings initializer",
);

client = replaceOnce(
  client,
  `    const reveal = () => {
      try {
        if (!frame.contentDocument?.documentElement?.classList.contains('ca-settings-ready')) return false`,
  `    const reveal = () => {
      try {
        if (typeof frame.contentWindow?.__lienConfigureSettingsDocument === 'function') {
          frame.contentWindow.__lienConfigureSettingsDocument()
        }
        if (!frame.contentDocument?.documentElement?.classList.contains('ca-settings-ready')) return false`,
  "parent requests iframe initialization",
);

fs.writeFileSync(clientPath, client);
fs.writeFileSync("/app/.settings-dialog-readiness-v435", "ok\n");
console.log("Settings dialog readiness v435 runtime patched");
