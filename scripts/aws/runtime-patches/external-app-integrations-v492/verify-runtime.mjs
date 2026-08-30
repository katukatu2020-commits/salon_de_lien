import assert from 'node:assert/strict'
import fs from 'node:fs'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const commercial = fs.readFileSync(`${root}/commercial-admin-v101.js`, 'utf8')

assert.equal(commercial.split('__lienExternalAppIntegrationsV492').length - 1, 2)
assert.match(commercial, /external-app-integrations-v492/)
assert.match(commercial, /外部アプリ連携/)
assert.match(commercial, /lien-external-integrations-v492/)
assert.match(commercial, /lien-hotpepper-settings-v492/)
assert.match(commercial, /data-external-source-hidden-v492/)
assert.match(commercial, /#lien-line-settings-v436/)
assert.match(commercial, /\/api\/admin\/store-profile/)
assert.match(commercial, /\/api\/lien-tenant-setup\/inbound\/address/)
assert.match(commercial, /data-hotpepper-copy/)
assert.match(commercial, /SALON BOARD/)

console.log('external-app-integrations-v492 runtime verified')
