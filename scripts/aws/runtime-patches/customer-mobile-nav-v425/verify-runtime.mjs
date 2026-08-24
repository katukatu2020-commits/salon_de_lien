import fs from 'node:fs'

function assertIncludes(source, expected, label) {
  if (!source.includes(expected)) throw new Error(`${label}: verification failed`)
}

const server = fs.readFileSync('/app/server.js', 'utf8')
const client = fs.readFileSync('/app/.next/static/chunks/app/u/(account)/layout-customer-mobile-nav-v425.js', 'utf8')
const serverChunk = fs.readFileSync('/app/.next/server/chunks/1597.js', 'utf8')
const manifest = fs.readFileSync('/app/.next/app-build-manifest.json', 'utf8')
const experience = fs.readFileSync('/app/customer-experience-v425.js', 'utf8')
const navCss = fs.readFileSync('/app/public/customer-mobile-nav-v425.css', 'utf8')

assertIncludes(server, "['news','キャンペーン','CAMPAIGN','/u/news']", 'campaign shortcut')
assertIncludes(server, '<h2>キャンペーン</h2>', 'campaign section')
assertIncludes(server, 'customer-mobile-nav-v425 customer-mobile-nav-home', 'home canonical nav')
assertIncludes(server, 'id="customer-mobile-bottom-nav"', 'home canonical nav id')
assertIncludes(server, '/customer-mobile-nav-v425.css?v=425-1', 'home canonical nav stylesheet')
assertIncludes(server, '/customer-experience-v425.js', 'new customer experience runtime')
assertIncludes(server, "path.join(dir, 'customer-experience-v425.js')", 'new customer experience file response')
if (server.includes("path.join(dir, 'customer-experience-v424.js')")) throw new Error('old customer experience file is still served')
if (server.includes("['news','店舗からのお知らせ','NEWS & EVENTS','/u/news']")) throw new Error('old home announcement shortcut remains')
assertIncludes(client, 'customer-mobile-nav-v425 customer-mobile-nav-next', 'client canonical nav')
assertIncludes(client, 'id:"customer-mobile-bottom-nav"', 'client canonical nav id')
assertIncludes(client, 'customer-mobile-nav-v425-link', 'client canonical nav links')
assertIncludes(client, 'customer-mobile-nav-v425-icon', 'client canonical nav icons')
assertIncludes(client, '/customer-mobile-nav-v425.css?v=425-1', 'client critical nav stylesheet')
assertIncludes(serverChunk, 'customer-mobile-nav-v425 customer-mobile-nav-next', 'server canonical nav')
assertIncludes(serverChunk, '/customer-mobile-nav-v425.css?v=425-1', 'server critical nav stylesheet')
assertIncludes(manifest, 'layout-customer-mobile-nav-v425.js', 'active customer layout chunk')
if (manifest.includes('layout-customer-experience-v424.js')) throw new Error('old customer layout chunk is still active')
assertIncludes(experience, 'window.__lienCustomerExperienceV425 = true', 'experience singleton marker')
assertIncludes(experience, 'customerNavCanonicalV425', 'canonical navigation normalizer')
assertIncludes(navCss, '.customer-mobile-nav-v425-icon', 'canonical icon CSS')
assertIncludes(navCss, 'env(safe-area-inset-bottom)', 'iPhone safe area CSS')

console.log('customer mobile navigation v425 verified')
