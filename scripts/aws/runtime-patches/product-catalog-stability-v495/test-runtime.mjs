import assert from 'node:assert/strict'
import fs from 'node:fs'

const root = process.env.LIEN_APP_ROOT || '/app'
const commercial = fs.readFileSync(`${root}/commercial-admin-v101.js`, 'utf8')
const staffExperience = fs.readFileSync(`${root}/admin-staff-experience-v276.js`, 'utf8')

const notificationBlock = commercial.slice(
  commercial.indexOf('async function refreshNotifications(force = false)'),
  commercial.indexOf('async function toggleNotificationPanel'),
)
assert.match(notificationBlock, /if \(state\.notificationPromise\) return state\.notificationPromise/)
assert.match(notificationBlock, /Date\.now\(\) - state\.notificationFetchedAt < 25000/)
assert.match(notificationBlock, /state\.notificationFetchedAt = Date\.now\(\)/)

const imageBlock = commercial.slice(
  commercial.indexOf('let productImagesPromise = null'),
  commercial.indexOf('const observer = new MutationObserver(() => {', commercial.indexOf('let productImagesPromise = null')),
)

assert.match(imageBlock, /productImagesPromise = fetch\('\/api\/admin\/catalog\/product-images'/)
assert.match(imageBlock, /if \(productImagesFrame\) return/)
assert.match(imageBlock, /productImagesFrame = requestAnimationFrame/)
assert.match(imageBlock, /if \(!row \|\| row\.querySelector\('\.ca-product-uploaded-thumb'\)\) continue/)
assert.match(imageBlock, /await productImagesPromise/)
assert.equal((imageBlock.match(/fetch\('\/api\/admin\/catalog\/product-images'/g) || []).length, 1)

const staffBlock = staffExperience.slice(
  staffExperience.indexOf('const state = { store: null'),
  staffExperience.indexOf('function removeStrayStaffButtons()'),
)
assert.match(staffBlock, /if \(!state\.storePromise\) state\.storePromise = request/)
assert.match(staffBlock, /if \(!state\.ownProfilePromise\) state\.ownProfilePromise = request/)

console.log('product-catalog-stability-v495 behavior contract tested')
