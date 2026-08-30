import assert from 'node:assert/strict'
import fs from 'node:fs'

const root = process.env.LIEN_APP_ROOT || '/app'
const commercial = fs.readFileSync(`${root}/commercial-admin-v101.js`, 'utf8')
const staffExperience = fs.readFileSync(`${root}/admin-staff-experience-v276.js`, 'utf8')
const server = fs.readFileSync(`${root}/server.js`, 'utf8')

assert.match(commercial, /product-catalog-submit-v494/)
assert.match(commercial, /product-catalog-stability-v495/)
assert.match(commercial, /notificationFetchedAt: 0/)
assert.match(commercial, /Date\.now\(\) - state\.notificationFetchedAt < 25000/)
assert.match(commercial, /state\.notificationFetchedAt = Date\.now\(\)/)
assert.match(commercial, /let productImagesPromise = null/)
assert.match(commercial, /if \(!productImagesPromise\)/)
assert.match(commercial, /window\.__lienProductImageFetchCountV495/)
assert.match(commercial, /function scheduleProductImages\(\)/)
assert.match(commercial, /scheduleProductImages\(\)/)
assert.doesNotMatch(commercial, /const observer = new MutationObserver\(\(\) => \{[\s\S]{0,600}enhanceProductImages\(\)/)

assert.match(staffExperience, /product-catalog-stability-v495/)
assert.match(staffExperience, /storePromise: null/)
assert.match(staffExperience, /ownProfilePromise: null/)
assert.match(staffExperience, /if \(!state\.storePromise\)/)
assert.match(staffExperience, /if \(!state\.ownProfilePromise\)/)

assert.match(server, /X-Lien-Product-Catalog-Stability', 'v495'/)

console.log('product-catalog-stability-v495 runtime verified')
