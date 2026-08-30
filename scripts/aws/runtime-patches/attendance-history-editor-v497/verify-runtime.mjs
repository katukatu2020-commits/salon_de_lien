import fs from 'node:fs'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const server = fs.readFileSync(`${root}/server.js`, 'utf8')
const commercial = fs.readFileSync(`${root}/commercial-admin-v101.js`, 'utf8')
const service = fs.readFileSync(`${root}/attendance-history-editor-v497.js`, 'utf8')

const required = [
  [server, "require('./attendance-history-editor-v497')", 'v497 service import'],
  [server, "X-Lien-Attendance-History-Editor', 'v497'", 'v497 readiness header'],
  [commercial, '__lienAttendanceProductV497', 'v497 attendance client'],
  [commercial, 'data-attendance-record-editor', 'daily record editor'],
  [commercial, 'ca-calendar-day', 'monthly calendar'],
  [commercial, 'function setupProductImage(form)', 'preserved product image client'],
  [commercial, 'product-catalog-stability-v495', 'preserved product catalog stability patch'],
  [service, '(x."clockOutAt" IS NULL OR x."workDate"=$2)', 'cross-day open shift query'],
  [service, "action === 'save_record'", 'manual attendance update API'],
  [service, '同じスタッフの勤務時間が重複しています。', 'overlap validation'],
  [service, '"manuallyEditedAt"', 'manual edit audit field'],
]
for (const [source, marker, label] of required) {
  if (!source.includes(marker)) throw new Error(`${label} missing`)
}

for (const stale of ['__lienAttendanceProductV349', "require('./attendance-multi-shift-v349')"]) {
  if (commercial.includes(stale) || server.includes(stale)) throw new Error(`stale attendance marker remains: ${stale}`)
}

if ((commercial.match(/function setupProductImage\(form\)/g) || []).length !== 1) throw new Error('product image setup function was duplicated')
if ((server.match(/X-Lien-Attendance-History-Editor/g) || []).length !== 1) throw new Error('readiness header was duplicated')
console.log('attendance-history-editor-v497 runtime verification passed')
