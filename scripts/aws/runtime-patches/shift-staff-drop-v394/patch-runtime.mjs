import fs from 'node:fs'
import path from 'node:path'

const servicePath = '/app/appointment-operations-v267.js'
const pagePath = '/app/.next/server/app/admin/appointments/page.js'
const chunkDirectory = '/app/.next/static/chunks/app/admin/appointments'
const oldChunkName = 'page-shift-layout-20260812-02.capacity-persist-v44.business-schedule-v294.shift-day-nav-v382.js'
const newChunkName = 'page-shift-staff-drop-v394.js'
const oldChunkPath = path.join(chunkDirectory, oldChunkName)
const newChunkPath = path.join(chunkDirectory, newChunkName)

function replaceOnce(source, before, after, label) {
  const count = source.split(before).length - 1
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`)
  return source.replace(before, after)
}

// Use the database row as the canonical identity shown by the schedule. The legacy
// Salon de Lien seed remains a fallback only when a row has not yet been migrated.
let page = fs.readFileSync(pagePath, 'utf8')
page = replaceOnce(
  page,
  `                name: e.name,
                role: e.role,`,
  `                name: t?.staffName || e.name,
                role: e.role,`,
  'schedule uses canonical database staff name',
)
fs.writeFileSync(pagePath, page)

// Keep the stable staff key chosen by the lane as the source of truth. Name lookup
// is retained only for older appointment objects that do not yet carry staffKey.
let chunk = fs.readFileSync(oldChunkPath, 'utf8')
chunk = replaceOnce(
  chunk,
  `staffKey: (m.find((member) => member.name === e.staffName) || {}).key || e.staffKey || "",`,
  `staffKey: e.staffKey || (m.find((member) => member.name === e.staffName) || {}).key || "",`,
  'schedule request prioritizes selected lane key',
)
fs.writeFileSync(newChunkPath, chunk)

// A new chunk URL is intentional. Earlier runtime patches changed the contents of
// an immutable Next.js asset in-place, allowing browsers/CDNs to keep the old drag
// handler. Updating every generated reference makes this release cache-safe.
function replaceGeneratedReferences(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      replaceGeneratedReferences(target)
      continue
    }
    if (!entry.isFile() || !/\.(?:json|js)$/.test(entry.name)) continue
    let source = fs.readFileSync(target, 'utf8')
    if (!source.includes(oldChunkName)) continue
    source = source.split(oldChunkName).join(newChunkName)
    fs.writeFileSync(target, source)
  }
}

replaceGeneratedReferences('/app/.next')

// Preserve the server-side key-first resolver and make the variant handling
// explicit in the deployed artifact. This guard prevents later base-image drift.
const service = fs.readFileSync(servicePath, 'utf8')
for (const marker of [
  `requestedStaffKey = null`,
  `normalizeStaff(item.staffKey) === keyToken`,
  `body.staffName, body.staffKey`,
]) {
  if (!service.includes(marker)) throw new Error(`stable staff resolver marker missing: ${marker}`)
}
