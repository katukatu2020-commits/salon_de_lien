const assert = require('node:assert/strict')
const { sameOrigin } = require('/app/hotpepper-origin-v600')
const parent = require('/app/hotpepper-import-v596').__test.sameOrigin
const viewer = { host: 'internal-alb.example', 'x-forwarded-proto': 'http', 'cloudfront-forwarded-proto': 'https', origin: 'https://salon-de-lien.com' }
assert.equal(parent({ headers: viewer }), false)
assert.equal(sameOrigin({ headers: viewer }, {}), true)
for (const origin of ['https://evil.test', 'https://salon-de-lien.com.evil.test', 'null', 'https://user@salon-de-lien.com']) assert.equal(sameOrigin({ headers: { ...viewer, origin } }, {}), false)
assert.equal(sameOrigin({ headers: { host: 'localhost:3600', origin: 'http://localhost:3600' } }, {}), true)
assert.equal(sameOrigin({ headers: { host: 'internal-alb.example', 'sec-fetch-site': 'same-origin', referer: 'https://salon-de-lien.com/admin/community' } }, {}), true)
assert.equal(sameOrigin({ headers: { host: 'internal-alb.example', 'sec-fetch-site': 'cross-site' } }, {}), false)
assert.equal(sameOrigin({ headers: { host: 'salon-de-lien.com', 'sec-fetch-site': 'same-origin', referer: 'https://evil.test/' } }, {}), false)
assert.equal(sameOrigin({ headers: { host: 'salon-de-lien.com' } }, {}), false)
console.log(JSON.stringify({ originRegression: true, cloudFront: true, csrfPreserved: true, safari: true }))
