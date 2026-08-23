import fs from 'node:fs'

const commercial = fs.readFileSync('/app/commercial-admin-v101.js', 'utf8')
const customerLink = fs.readFileSync('/app/customer-link-ui-v293.js', 'utf8')

for (const marker of [
  `/customer-link-ui-v293.js?v=417`,
  `ca-settings-panel-`,
  `dataset.caEmbeddedIdentity`,
  `dataset.caEmbeddedSettingsForm`,
  `dataset.caEmbeddedSave`,
  `ca-embedded-save-button`,
  `[data-sm-store-code]`,
  `.lien-store-qr-card`,
  `frameUrl.searchParams.get('notice') === 'saved'`,
]) {
  if (!commercial.includes(marker)) throw new Error(`missing commercial v417 marker: ${marker}`)
}

for (const marker of [
  `const embeddedSettings = new URLSearchParams(location.search).get('embedded') === '1'`,
  `location.pathname !== '/admin/settings' || embeddedSettings || document.querySelector('.lien-store-qr-card')`,
]) {
  if (!customerLink.includes(marker)) throw new Error(`missing customer-link v417 marker: ${marker}`)
}

for (const stale of [
  `/customer-link-ui-v293.js?v=293-4`,
  `location.pathname !== '/admin/settings' || document.querySelector('.lien-store-qr-card')`,
]) {
  if (commercial.includes(stale) || customerLink.includes(stale)) {
    throw new Error(`stale settings modal behavior remains: ${stale}`)
  }
}

new Function(commercial)
new Function(customerLink)

console.log('settings modal commercial v417 runtime verified')
