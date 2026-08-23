import fs from 'node:fs'
import path from 'node:path'

const files = {
  customer: fs.readFileSync('/app/customer-experience-v395.js', 'utf8'),
  staff: fs.readFileSync('/app/customer-store-staff-v276.js', 'utf8'),
  setup: fs.readFileSync('/app/tenant-setup-client.js', 'utf8'),
  workflows: fs.readFileSync('/app/ui-workflows-v294.js', 'utf8'),
  publishing: fs.readFileSync('/app/community-publishing-v348.js', 'utf8'),
  serverFeed: fs.readFileSync('/app/.next/server/chunks/2616.js', 'utf8'),
  clientFeed: fs.readFileSync('/app/.next/static/chunks/6012-community-timezone-v420.js', 'utf8'),
}

const markers = {
  customer: ['@media(min-width:768px)', 'width:21px!important', '<svg class="icon" viewBox="0 0 24 24"'],
  staff: ['hasAvatar: Boolean(bucket && row.profileImageKey)', 'avatarUrl: bucket && row.profileImageKey ?'],
  setup: ['function bootAfterHydration() {\n    if (!location.pathname.startsWith(\'/admin/\')', '/^\\/admin\\/(?:login|register|forgot-password|password-reset)'],
  workflows: ['staff.avatarUrl ? `<img src="${esc(staff.avatarUrl)}"'],
  publishing: ['This file is a static client bundle; its API remains session-protected.'],
  serverFeed: ['timeZone:"Asia/Tokyo",year:"numeric"', 'timeZone:"Asia/Tokyo",month:"numeric",day:"numeric",hour:"2-digit"'],
  clientFeed: ['timeZone:"Asia/Tokyo",year:"numeric"', 'timeZone:"Asia/Tokyo",month:"numeric",day:"numeric",hour:"2-digit"'],
}

if (files.workflows.includes('staff.avatarUrl || `/api/lien-staff-avatar')) {
  throw new Error('chat still invents an unavailable staff avatar URL')
}

for (const [name, expected] of Object.entries(markers)) {
  for (const marker of expected) {
    if (!files[name].includes(marker)) throw new Error(`${name}: missing ${marker}`)
  }
  new Function(files[name])
}

for (const stale of [
  '{year:"numeric",month:"long",day:"numeric"}',
  '{month:"numeric",day:"numeric",hour:"2-digit",minute:"2-digit"}',
]) {
  if (files.serverFeed.includes(stale) || files.clientFeed.includes(stale)) throw new Error(`timezone-unsafe formatter remains: ${stale}`)
}

let references = 0
function inspectManifests(root) {
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const fullPath = path.join(root, entry.name)
    if (entry.isDirectory()) inspectManifests(fullPath)
    else if (entry.isFile() && /manifest\.json$|manifest\.js$/.test(entry.name)) {
      const source = fs.readFileSync(fullPath, 'utf8')
      if (source.includes('6012-community-aspect-v383.js')) throw new Error(`stale community chunk in ${fullPath}`)
      if (source.includes('6012-community-timezone-v420.js')) references += 1
    }
  }
}
inspectManifests('/app/.next')
if (references < 3) throw new Error(`community chunk reference count is too small: ${references}`)

console.log('full surface quality v420 runtime verified')
