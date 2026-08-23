import fs from 'node:fs'
import vm from 'node:vm'

const server = fs.readFileSync('/app/server.js', 'utf8')
const customerStore = fs.readFileSync('/app/customer-store-staff-v276.js', 'utf8')
const experience = fs.readFileSync('/app/customer-experience-v395.js', 'utf8')
const oldLayoutChunkName = 'layout-customer-chat-v393.js'
const newLayoutChunkName = 'layout-customer-profile-v395.js'
const layoutChunk = fs.readFileSync(`/app/.next/static/chunks/app/u/(account)/${newLayoutChunkName}`, 'utf8')
const profileManifest = fs.readFileSync('/app/.next/server/app/u/(account)/profile/page_client-reference-manifest.js', 'utf8')

for (const marker of [
  '/customer-experience-v395.js',
  'customerShell',
]) {
  if (!server.includes(marker)) throw new Error(`server marker missing: ${marker}`)
}
if (server.includes('/customer-experience-v278.js')) throw new Error('old customer experience URL remains in server')
if (!customerStore.includes("'/customer-experience-v395.js'")) throw new Error('v395 static route is missing')
if (!customerStore.includes("fs.readFileSync(path.join(__dirname, 'customer-experience-v395.js'))")) throw new Error('v395 static file is not served')
if (!layoutChunk.includes('customer-experience-v395.js') || layoutChunk.includes('customer-experience-v278.js')) throw new Error('customer layout does not load v395')
if (!profileManifest.includes(newLayoutChunkName) || profileManifest.includes(oldLayoutChunkName)) throw new Error('profile layout chunk was not cache-busted')

for (const marker of [
  "field.className = 'cx-nickname-field'",
  "nameInput.closest('label')?.insertAdjacentElement('afterend', field)",
  "HTMLFormElement.prototype.submit.call(profileForm)",
  'input[type="date"]',
  "style.dataset.lienCustomerExperience = '395'",
]) {
  if (!experience.includes(marker)) throw new Error(`profile marker missing: ${marker}`)
}
if (experience.includes("card.className = 'cx-nickname-card'")) throw new Error('standalone nickname card remains')

new vm.Script(experience)
new vm.Script(layoutChunk)
console.log('customer profile v395 verified')
