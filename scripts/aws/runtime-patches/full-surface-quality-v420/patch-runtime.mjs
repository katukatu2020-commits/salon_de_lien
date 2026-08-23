import fs from 'node:fs'
import path from 'node:path'

function replaceOnce(source, before, after, label) {
  const count = source.split(before).length - 1
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`)
  return source.replace(before, after)
}

function writePatched(filePath, transform) {
  const source = fs.readFileSync(filePath, 'utf8')
  fs.writeFileSync(filePath, transform(source))
}

writePatched('/app/customer-experience-v395.js', source => {
  source = replaceOnce(
    source,
    '    .cx-customer-nav-link{color:#938780!important}',
    '    @media(min-width:768px){.bottom-nav[data-customer-bottom-nav] svg,.bottom-nav .cx-customer-nav-link svg{display:block!important;width:21px!important;height:21px!important;min-width:21px!important;min-height:21px!important;flex:0 0 21px!important}.bottom-nav[data-customer-bottom-nav] .cx-customer-nav-link{min-height:52px!important}}\n    .cx-customer-nav-link{color:#938780!important}',
    'customer desktop navigation sizing',
  )
  return replaceOnce(
    source,
    'return `<svg viewBox="0 0 24 24"',
    'return `<svg class="icon" viewBox="0 0 24 24"',
    'customer navigation icon class',
  )
})

writePatched('/app/customer-store-staff-v276.js', source => replaceOnce(
  source,
  '      hasAvatar: Boolean(row.profileImageKey),\n      avatarUrl: row.profileImageKey ? `/api/lien-staff-avatar?staffKey=${encodeURIComponent(row.key)}` : null,',
  '      hasAvatar: Boolean(bucket && row.profileImageKey),\n      avatarUrl: bucket && row.profileImageKey ? `/api/lien-staff-avatar?staffKey=${encodeURIComponent(row.key)}` : null,',
  'staff avatar storage fallback',
))

writePatched('/app/tenant-setup-client.js', source => replaceOnce(
  replaceOnce(
    source,
    '  function bootAfterHydration() {\n    if (state.booted) return',
    "  function bootAfterHydration() {\n    if (!location.pathname.startsWith('/admin/') || /^\\/admin\\/(?:login|register|forgot-password|password-reset)(?:\\/|$)/.test(location.pathname)) return\n    if (state.booted) return",
    'tenant setup auth-route guard',
  ),
  "    if (!location.pathname.startsWith('/admin/')) return\n    addStyles()",
  "    if (!location.pathname.startsWith('/admin/')) return\n    if (/^\\/admin\\/(?:login|register|forgot-password|password-reset)(?:\\/|$)/.test(location.pathname)) return\n    addStyles()",
  'product tour auth-route guard',
))

writePatched('/app/ui-workflows-v294.js', source => replaceOnce(
  source,
  '    const avatar = staff => `<span class="lien-chat-v294__avatar"><span>${esc(String(staff.name || \'ス\').trim().slice(0, 1))}</span><img src="${esc(staff.avatarUrl || `/api/lien-staff-avatar?staffKey=${encodeURIComponent(staff.key || \'\')}`)}" alt="${esc(staff.name)}のプロフィール画像"></span>`',
  '    const avatar = staff => `<span class="lien-chat-v294__avatar"><span>${esc(String(staff.name || \'ス\').trim().slice(0, 1))}</span>${staff.avatarUrl ? `<img src="${esc(staff.avatarUrl)}" alt="${esc(staff.name)}のプロフィール画像">` : \'\'}</span>`',
  'chat avatar storage fallback',
))

writePatched('/app/community-publishing-v348.js', source => replaceOnce(
  source,
  "      const session = await sessionProvider(req)\n      if (!session) { res.statusCode = 404; res.end(); return true }\n      res.statusCode = 200",
  "      // This file is a static client bundle; its API remains session-protected.\n      res.statusCode = 200",
  'community static client delivery',
))

const serverFeedPath = '/app/.next/server/chunks/2616.js'
writePatched(serverFeedPath, source => {
  source = replaceOnce(
    source,
    '{year:"numeric",month:"long",day:"numeric"}',
    '{timeZone:"Asia/Tokyo",year:"numeric",month:"long",day:"numeric"}',
    'server visit date timezone',
  )
  return replaceOnce(
    source,
    '{month:"numeric",day:"numeric",hour:"2-digit",minute:"2-digit"}',
    '{timeZone:"Asia/Tokyo",month:"numeric",day:"numeric",hour:"2-digit",minute:"2-digit"}',
    'server comment date timezone',
  )
})

const oldFeedName = '6012-community-aspect-v383.js'
const newFeedName = '6012-community-timezone-v420.js'
const staticChunkDir = '/app/.next/static/chunks'
const oldFeedPath = path.join(staticChunkDir, oldFeedName)
const newFeedPath = path.join(staticChunkDir, newFeedName)
fs.copyFileSync(oldFeedPath, newFeedPath)
writePatched(newFeedPath, source => {
  source = replaceOnce(
    source,
    '{year:"numeric",month:"long",day:"numeric"}',
    '{timeZone:"Asia/Tokyo",year:"numeric",month:"long",day:"numeric"}',
    'client visit date timezone',
  )
  return replaceOnce(
    source,
    '{month:"numeric",day:"numeric",hour:"2-digit",minute:"2-digit"}',
    '{timeZone:"Asia/Tokyo",month:"numeric",day:"numeric",hour:"2-digit",minute:"2-digit"}',
    'client comment date timezone',
  )
})

function replaceManifestReferences(root) {
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const fullPath = path.join(root, entry.name)
    if (entry.isDirectory()) {
      replaceManifestReferences(fullPath)
      continue
    }
    if (!entry.isFile() || !/manifest\.json$|manifest\.js$/.test(entry.name)) continue
    const source = fs.readFileSync(fullPath, 'utf8')
    if (source.includes(oldFeedName)) fs.writeFileSync(fullPath, source.replaceAll(oldFeedName, newFeedName))
  }
}
replaceManifestReferences('/app/.next')

console.log('full surface quality v420 runtime patched')
