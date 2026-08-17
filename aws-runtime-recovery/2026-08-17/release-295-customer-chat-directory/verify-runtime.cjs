const fs = require('node:fs')
const path = require('node:path')

const root = path.resolve(process.argv[2] || '/app')
const oldBasename = 'page-02f2b7a47700a9dc.js'
const newBasename = 'page-02f2b7a47700a9dc.staff-directory-v295.js'
const oldLayoutBasename = 'layout-1c1963f4f2eb1b14.unified-reservation-chat.premium-mobile-v29.customer-home-unified-v35.customer-shell-chat-v36.notification-badge-v44.navigation-v45.customer-native-v82.customer-shell-v91.navigation-v86.customer-experience-v278.js'
const newLayoutBasename = 'layout-chat-v295-4.js'
const newChunk = path.join(root, '.next/static/chunks/app/u/(account)/messages', newBasename)
const newLayoutChunk = path.join(root, '.next/static/chunks/app/u/(account)', newLayoutBasename)
const appManifest = fs.readFileSync(path.join(root, '.next/app-build-manifest.json'), 'utf8')
const clientManifest = fs.readFileSync(path.join(root, '.next/server/app/u/(account)/messages/page_client-reference-manifest.js'), 'utf8')
const source = fs.readFileSync(newChunk, 'utf8')
const layoutSource = fs.readFileSync(newLayoutChunk, 'utf8')
const helperSource = fs.readFileSync(path.join(root, 'ui-workflows-v294.js'), 'utf8')

for (const [label, manifest] of [['app manifest', appManifest], ['client manifest', clientManifest]]) {
  if (!manifest.includes(newBasename)) throw new Error(`Release 295 ${label} does not reference the new chat chunk.`)
  if (manifest.includes(oldBasename)) throw new Error(`Release 295 ${label} still references the cached chat chunk.`)
}
if (!appManifest.includes(newLayoutBasename) || !clientManifest.includes(newLayoutBasename)) {
  throw new Error('Release 295 manifests do not reference the cache-busted customer layout.')
}
if (appManifest.includes(oldLayoutBasename) || clientManifest.includes(oldLayoutBasename)) {
  throw new Error('Release 295 manifests still reference the cached customer layout.')
}
if (!source.includes("script.src='/ui-workflows-v294.js?v=295-2'")) {
  throw new Error('Release 295 chat chunk does not load the bounded customer chat helper.')
}
if (!layoutSource.includes("location.pathname!=='/u/chat'") || !layoutSource.includes("script.src='/ui-workflows-v294.js?v=295-2'")) {
  throw new Error('Release 295 customer layout does not load the bounded chat helper on /u/chat.')
}
if (!helperSource.includes('.lien-chat-v294 .lien-chat-v294__sidebar{display:block!important')) {
  throw new Error('Release 295 customer chat helper does not keep the staff directory visible.')
}
if (!helperSource.includes('<section class="lien-chat-v294__sidebar" aria-label="相談するスタッフ">') || helperSource.includes('<aside class="lien-chat-v294__sidebar">')) {
  throw new Error('Release 295 customer chat helper still uses the globally hidden aside element.')
}
if (!helperSource.includes('.lien-chat-v294.is-conversation .lien-chat-v294__sidebar{display:none!important}') ||
    !helperSource.includes('.lien-chat-v294.is-conversation .lien-chat-v294__conversation{display:flex!important}')) {
  throw new Error('Release 295 customer chat helper does not switch from the staff list to the conversation on mobile.')
}
if (!helperSource.includes('data-chat-back aria-label="スタッフ一覧へ戻る"') ||
    !helperSource.includes("chatRoot?.classList.remove('is-conversation')") ||
    !helperSource.includes("chatRoot?.classList.add('is-conversation')")) {
  throw new Error('Release 295 customer chat helper does not provide the mobile conversation back flow.')
}
new Function(source)
new Function(layoutSource)
new Function(helperSource)
console.log('Release 295 customer chat loader verification passed.')
