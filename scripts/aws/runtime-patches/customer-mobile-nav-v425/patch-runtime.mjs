import fs from 'node:fs'
import path from 'node:path'

const appRoot = '/app'
const serverPath = path.join(appRoot, 'server.js')
const serverChunkPath = path.join(appRoot, '.next/server/chunks/1597.js')
const clientChunkDirectory = path.join(appRoot, '.next/static/chunks/app/u/(account)')
const oldClientChunkName = 'layout-customer-experience-v424.js'
const newClientChunkName = 'layout-customer-mobile-nav-v425.js'
const oldClientChunkPath = path.join(clientChunkDirectory, oldClientChunkName)
const newClientChunkPath = path.join(clientChunkDirectory, newClientChunkName)

function replaceOnce(source, before, after, label) {
  const count = source.split(before).length - 1
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`)
  return source.replace(before, after)
}

function walk(directory) {
  const files = []
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const filePath = path.join(directory, entry.name)
    if (entry.isDirectory()) files.push(...walk(filePath))
    else files.push(filePath)
  }
  return files
}

const canonicalNavCssLink = '<link rel="stylesheet" href="/customer-mobile-nav-v425.css?v=425-1">'
const oldNavClass = 'fixed inset-x-0 bottom-0 z-40 border-t border-[#e8ded2] bg-white/96 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden'
const oldNavInnerClass = 'mx-auto grid h-16 w-full max-w-xl grid-cols-4 px-1'
const oldNavLinkClass = '"flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-semibold transition ".concat(t?"bg-[#f7e7e1] text-[#8f4f42] shadow-[inset_0_0_0_1px_#ead0c7]":"text-[#8b8178] hover:bg-[#f6efe6] hover:text-[#5b332c]")'
const newNavLinkClass = '"customer-mobile-nav-v425-link".concat(t?" active":"")'
const oldNavIconClass = '"h-5 w-5 ".concat(t?"stroke-[2.4]":"")'
const oldServerNavLinkClass = 'className:`flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-semibold transition ${t?"bg-[#f7e7e1] text-[#8f4f42] shadow-[inset_0_0_0_1px_#ead0c7]":"text-[#8b8178] hover:bg-[#f6efe6] hover:text-[#5b332c]"}`'
const oldServerNavIconClass = 'className:`h-5 w-5 ${t?"stroke-[2.4]":""}`'

let server = fs.readFileSync(serverPath, 'utf8')
server = replaceOnce(
  server,
  '<link rel="stylesheet" href="/customer-native-shell-v92.css">',
  `<link rel="stylesheet" href="/customer-native-shell-v92.css">${canonicalNavCssLink}`,
  'customer shell nav stylesheet',
)
server = replaceOnce(
  server,
  "  return `<nav class=\"bottom-nav\" aria-label=\"お客様アプリメニュー\">${items.map(([icon,label,href]) => `<a class=\"bottom-link cx-customer-nav-link ${active === label ? 'active cx-customer-nav-active' : ''}\" href=\"${href}\"${active === label ? ' aria-current=\"page\"' : ''}>${customerIcon(icon)}<span>${label}</span></a>`).join('')}</nav>`",
  "  return `<nav id=\"customer-mobile-bottom-nav\" class=\"bottom-nav customer-mobile-nav-v425 customer-mobile-nav-home\" data-customer-bottom-nav-v425=\"1\" aria-label=\"お客様アプリメニュー\"><div class=\"customer-mobile-nav-v425-inner\">${items.map(([icon,label,href]) => `<a class=\"bottom-link cx-customer-nav-link customer-mobile-nav-v425-link ${active === label ? 'active cx-customer-nav-active' : ''}\" href=\"${href}\"${active === label ? ' aria-current=\"page\"' : ''}>${customerIcon(icon).replace('class=\"icon ', 'class=\"icon customer-mobile-nav-v425-icon ')}<span>${label}</span></a>`).join('')}</div></nav>`",
  'canonical home navigation markup',
)
server = replaceOnce(server, "['news','店舗からのお知らせ','NEWS & EVENTS','/u/news']", "['news','キャンペーン','CAMPAIGN','/u/news']", 'campaign shortcut label')
server = replaceOnce(server, '<h2>店舗からのお知らせ</h2><p>イベント・キャンペーン・店舗からのご案内</p>', '<h2>キャンペーン</h2><p>広告・チラシ・イベント・キャンペーン</p>', 'campaign section heading')
server = replaceOnce(server, "item.title || '店舗からのお知らせ'", "item.title || 'キャンペーン'", 'campaign fallback title')
server = replaceOnce(server, '<strong>現在、新しいお知らせはありません</strong><p>イベントやキャンペーンが届くと、こちらに表示されます。</p>', '<strong>現在、新しいキャンペーンはありません</strong><p>新しい広告・チラシ・イベント情報が届くと、こちらに表示されます。</p>', 'campaign empty state')
server = server.split('/customer-experience-v424.js').join('/customer-experience-v425.js')
server = server.split("path.join(dir, 'customer-experience-v424.js')").join("path.join(dir, 'customer-experience-v425.js')")
server = server.split('customer-app-experience-v424-runtime').join('customer-mobile-nav-v425-runtime')
fs.writeFileSync(serverPath, server)

function patchLayoutChunk(source, jsxPrefix, label) {
  source = source.split('/customer-experience-v424.js').join('/customer-experience-v425.js')
  source = source.split('data-lien-customer-experience="424"').join('data-lien-customer-experience="425"')
  source = source.split("dataset.lienCustomerExperience = '424'").join("dataset.lienCustomerExperience = '425'")
  source = replaceOnce(
    source,
    'children:[' + jsxPrefix + '("header",{',
    'children:[' + jsxPrefix + '("link",{rel:"stylesheet",href:"/customer-mobile-nav-v425.css?v=425-1"}),' + jsxPrefix + '("header",{',
    `${label} critical nav stylesheet`,
  )
  source = replaceOnce(source, `className:"${oldNavClass}"`, 'className:"customer-mobile-nav-v425 customer-mobile-nav-next"', `${label} nav class`)
  source = replaceOnce(
    source,
    'className:"customer-mobile-nav-v425 customer-mobile-nav-next","aria-label":"お客様アプリメニュー"',
    'id:"customer-mobile-bottom-nav",className:"customer-mobile-nav-v425 customer-mobile-nav-next","data-customer-bottom-nav-v425":"1","aria-label":"お客様アプリメニュー"',
    `${label} nav marker`,
  )
  source = replaceOnce(source, `className:"${oldNavInnerClass}"`, 'className:"customer-mobile-nav-v425-inner"', `${label} nav inner class`)
  if (label === 'server') {
    source = replaceOnce(source, oldServerNavLinkClass, 'className:`customer-mobile-nav-v425-link${t?" active":""}`', `${label} nav link class`)
    source = replaceOnce(source, oldServerNavIconClass, 'className:"customer-mobile-nav-v425-icon"', `${label} nav icon class`)
  } else {
    source = replaceOnce(source, oldNavLinkClass, newNavLinkClass, `${label} nav link class`)
    source = replaceOnce(source, oldNavIconClass, '"customer-mobile-nav-v425-icon"', `${label} nav icon class`)
  }
  return source
}

let clientChunk = fs.readFileSync(oldClientChunkPath, 'utf8')
clientChunk = patchLayoutChunk(clientChunk, '(0,a.jsx)', 'client')
fs.writeFileSync(newClientChunkPath, clientChunk)

let serverChunk = fs.readFileSync(serverChunkPath, 'utf8')
serverChunk = patchLayoutChunk(serverChunk, 'a.jsx', 'server')
fs.writeFileSync(serverChunkPath, serverChunk)

const manifestFiles = [
  path.join(appRoot, '.next/app-build-manifest.json'),
  ...walk(path.join(appRoot, '.next/server/app')).filter(filePath => filePath.endsWith('_client-reference-manifest.js')),
]
let manifestCount = 0
for (const manifestPath of manifestFiles) {
  const source = fs.readFileSync(manifestPath, 'utf8')
  if (!source.includes(oldClientChunkName)) continue
  fs.writeFileSync(manifestPath, source.split(oldClientChunkName).join(newClientChunkName))
  manifestCount += 1
}
if (manifestCount < 2) throw new Error(`customer layout manifest references were not fully found: ${manifestCount}`)

const oldExperiencePath = path.join(appRoot, 'customer-experience-v424.js')
const newExperiencePath = path.join(appRoot, 'customer-experience-v425.js')
let experience = fs.readFileSync(oldExperiencePath, 'utf8')
experience = replaceOnce(
  experience,
  'if (window.__lienCustomerExperienceV424) return\n  window.__lienCustomerExperienceV278 = true',
  'if (window.__lienCustomerExperienceV425) return\n  window.__lienCustomerExperienceV425 = true',
  'customer experience singleton marker',
)
experience = experience.split('data.lienCustomerExperience = \'395\'').join('data.lienCustomerExperience = \'425\'')
experience = experience.replace('function normalizeBottomNavigation() {', `function normalizeBottomNavigation() {
    document.querySelectorAll('.bottom-nav,nav.fixed.inset-x-0.bottom-0[aria-label="お客様アプリメニュー"],.customer-mobile-nav-v425').forEach(nav => {
      if (nav.dataset.customerNavCanonicalV425 === '1') return
      const legacyHost = nav.querySelector(':scope > .customer-mobile-nav-v425-inner') || (nav.matches('.bottom-nav') ? nav : (nav.firstElementChild || nav))
      const existingLinks = [...legacyHost.querySelectorAll(':scope > a')]
      nav.className = 'customer-mobile-nav-v425 ' + (location.pathname === '/u/home' || nav.closest('.app') ? 'customer-mobile-nav-home' : 'customer-mobile-nav-next')
      nav.id = 'customer-mobile-bottom-nav'
      nav.dataset.customerBottomNavV425 = '1'
      nav.dataset.customerNavCanonicalV425 = '1'
      const inner = document.createElement('div')
      inner.className = 'customer-mobile-nav-v425-inner'
      inner.append(...existingLinks)
      nav.replaceChildren(inner)
    })`)
experience = experience.replace(
  "const host = nav.matches('.bottom-nav') ? nav : (nav.firstElementChild || nav)",
  "const host = nav.querySelector(':scope > .customer-mobile-nav-v425-inner') || (nav.matches('.bottom-nav') ? nav : (nav.firstElementChild || nav))",
)
experience = experience.replace(
  "const className = nav.matches('.bottom-nav') ? 'bottom-link cx-customer-nav-link' : 'cx-customer-nav-link'",
  "const className = 'customer-mobile-nav-v425-link'",
)
experience = experience.replace(
  'return `<svg class="icon" viewBox="0 0 24 24"',
  'return `<svg class="icon customer-mobile-nav-v425-icon" viewBox="0 0 24 24"',
)
experience = experience.split('window.__lienCustomerExperienceV424').join('window.__lienCustomerExperienceV425')
fs.writeFileSync(newExperiencePath, experience)

console.log(`customer mobile navigation v425 patched (${manifestCount} manifests)`)
