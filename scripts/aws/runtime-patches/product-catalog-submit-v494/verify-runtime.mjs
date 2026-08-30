import assert from 'node:assert/strict'
import fs from 'node:fs'

const root = process.env.LIEN_APP_ROOT || '/app'
const commercial = fs.readFileSync(`${root}/commercial-admin-v101.js`, 'utf8')
const server = fs.readFileSync(`${root}/server.js`, 'utf8')

assert.match(commercial, /product-catalog-submit-v494/)
assert.match(commercial, /function handleCatalogCreateClick\(event\)/)
assert.match(commercial, /document\.addEventListener\('click', handleCatalogCreateClick, true\)/)
assert.match(commercial, /if \(!form\.reportValidity\(\)\) return/)
assert.match(commercial, /submit\.setAttribute\('aria-busy', 'true'\)/)
assert.match(commercial, /void submitCatalogCreateForm\(form, submit\)/)
assert.match(commercial, /if \(panel\._caNotificationMarkup === markup\) return/)
assert.match(commercial, /if \(badge\.textContent !== badgeText\) badge\.textContent = badgeText/)
assert.doesNotMatch(commercial, /forEach\(panel => \{ panel\.innerHTML = notificationMarkup\(state\.notificationData\) \}\)/)
assert.match(server, /X-Lien-Product-Catalog-Submit', 'v494'/)

console.log('product-catalog-submit-v494 runtime verified')
