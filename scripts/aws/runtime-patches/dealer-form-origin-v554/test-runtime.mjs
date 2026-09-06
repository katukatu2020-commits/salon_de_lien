import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { validDealerRequestOrigin } = require('./dealer-origin-policy-v554.js')
const environment = { APP_URL: 'http://127.0.0.1:3125' }
const request = headers => ({ headers })

assert.equal(validDealerRequestOrigin(request({ origin: 'https://salon-de-lien.com' }), environment), true)
assert.equal(validDealerRequestOrigin(request({ origin: 'https://www.salon-de-lien.com' }), environment), true)
assert.equal(validDealerRequestOrigin(request({ referer: 'https://salon-de-lien.com/dealer/register' }), environment), true)
assert.equal(validDealerRequestOrigin(request({ origin: 'http://127.0.0.1:3125' }), environment), true)
assert.equal(validDealerRequestOrigin(request({ origin: 'null', 'sec-fetch-site': 'same-origin' }), environment), true)
assert.equal(validDealerRequestOrigin(request({ 'sec-fetch-site': 'same-origin' }), environment), true)

assert.equal(validDealerRequestOrigin(request({}), environment), false)
assert.equal(validDealerRequestOrigin(request({ origin: 'null' }), environment), false)
assert.equal(validDealerRequestOrigin(request({ 'sec-fetch-site': 'cross-site' }), environment), false)
assert.equal(validDealerRequestOrigin(request({ 'sec-fetch-site': 'same-site' }), environment), false)
assert.equal(validDealerRequestOrigin(request({ origin: 'https://attacker.example', 'sec-fetch-site': 'same-origin' }), environment), false)
assert.equal(validDealerRequestOrigin(request({ origin: 'not a url', 'sec-fetch-site': 'same-origin' }), environment), false)

console.log(JSON.stringify({
  release: 'dealer-form-origin-v554',
  explicitOriginProtected: true,
  safariSameOriginFallback: true,
  missingMetadataRejected: true,
  crossSiteRejected: true,
}))
