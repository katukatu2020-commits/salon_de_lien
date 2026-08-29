import fs from 'node:fs'

const campaignPath = '/app/customer-campaigns-v427.js'
const parentMarker = 'campaign-admin-shell-v458'
const marker = 'campaign-header-collision-v459'
let source = fs.readFileSync(campaignPath, 'utf8')

if (!source.includes(parentMarker)) throw new Error(`${marker}: reviewed v458 parent marker is missing`)
if (source.includes(marker)) throw new Error(`${marker}: patch is already applied`)

const selectors = [
  ['[data-campaign-admin] .hero{', 2],
  ['[data-campaign-admin] .hero h1{', 1],
  ['[data-campaign-admin] .hero p{', 1],
]

for (const [selector, expectedCount] of selectors) {
  const count = source.split(selector).length - 1
  if (count !== expectedCount) throw new Error(`${marker}: expected ${expectedCount} ${selector}, found ${count}`)
  source = source.split(selector).join(selector.replace('.hero', '.campaign-page-header'))
}

const headerToken = 'const content = `<section class="hero">'
const headerCount = source.split(headerToken).length - 1
if (headerCount !== 1) throw new Error(`${marker}: expected one campaign page header, found ${headerCount}`)
source = source.replace(headerToken, 'const content = `<section class="campaign-page-header">')

source = source.replace(`/* ${parentMarker} */`, `/* ${parentMarker} ${marker} */`)
fs.writeFileSync(campaignPath, source)
console.log(`${marker} patched`)
