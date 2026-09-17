import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const release = 'business-application-phone-type-v651'
const changes = []

function target(file) { return path.join(root, file) }
function read(file) { return fs.readFileSync(target(file), 'utf8') }

function replaceExact(file, before, after, label) {
  const source = read(file)
  const count = source.split(before).length - 1
  if (count !== 1) throw new Error(`${label}: expected one v650 parent anchor in ${file}, found ${count}`)
  fs.writeFileSync(target(file), source.replace(before, after))
  changes.push({ file, label })
}

replaceExact(
  'business-inquiries-v637.js',
  "const ALLOWED_AUDIENCES = new Set(['salon', 'dealer', 'other'])",
  "const ALLOWED_AUDIENCES = new Set(['salon', 'dealer', 'other'])\nconst PUBLIC_APPLICATION_AUDIENCES = new Set(['salon', 'dealer'])",
  'separate public application types from historical inquiry types',
)

replaceExact(
  'business-inquiries-v637.js',
  `function validPhone(value) {
  return !value || /^[0-9+()\\-\\s]{8,30}$/.test(value)
}`,
  `function validPhone(value) {
  return /^[0-9+()\\-\\s]{8,30}$/.test(value)
}`,
  'require a valid phone number',
)

replaceExact(
  'business-inquiries-v637.js',
  `function safeReturnPath(value, audience) {
  const requested = trim(value, 120)
  if (RETURN_PATHS.has(requested)) return requested
  if (audience === 'salon') return '/business/salon'
  if (audience === 'dealer') return '/business/dealer'
  return '/business'
}`,
  `function safeReturnPath(value, audience) {
  if (audience === 'salon') return '/business/salon'
  if (audience === 'dealer') return '/business/dealer'
  const requested = trim(value, 120)
  if (RETURN_PATHS.has(requested)) return requested
  return '/business'
}`,
  'redirect feedback to the selected application type',
)

replaceExact(
  'business-inquiries-v637.js',
  'const valid = ALLOWED_AUDIENCES.has(audience) && organizationName.length >= 2 && contactName.length >= 1 &&',
  'const valid = PUBLIC_APPLICATION_AUDIENCES.has(audience) && organizationName.length >= 2 && contactName.length >= 1 &&',
  'accept only salon and dealer applications',
)

{
  const file = 'business-inquiries-v637.js'
  const source = read(file)
  const start = source.indexOf('  const audienceField = ')
  const end = source.indexOf("\n  return '<section", start)
  if (start < 0 || end < 0 || source.indexOf('  const audienceField = ', start + 1) >= 0) {
    throw new Error('visible application type selector: unexpected v650 parent section')
  }
  const replacement = `  const audienceField = '<label class="inquiry-field"><span>申請種別 <b>必須</b></span><select name="audience" required><option value=""' + (PUBLIC_APPLICATION_AUDIENCES.has(safeAudience) ? '' : ' selected') + ' disabled>選択してください</option>' + option('salon', safeAudience, 'サロン') + option('dealer', safeAudience, 'ディーラー') + '</select></label>'`
  fs.writeFileSync(target(file), source.slice(0, start) + replacement + source.slice(end))
  changes.push({ file, label: 'show a required salon or dealer selector on every application form' })
}

replaceExact(
  'business-inquiries-v637.js',
  '<input type="tel" name="phone" maxlength="30" autocomplete="tel" inputmode="tel">',
  '<input type="tel" name="phone" maxlength="30" autocomplete="tel" inputmode="tel" required>',
  'mark the phone input as required',
)

{
  const file = 'business-inquiries-v637.js'
  const source = read(file)
  const phone = '<input type="tel" name="phone" maxlength="30" autocomplete="tel" inputmode="tel" required>'
  const inputIndex = source.indexOf(phone)
  const labelIndex = source.lastIndexOf('<label class="inquiry-field">', inputIndex)
  const spanEnd = source.indexOf('</span>', labelIndex)
  if (inputIndex < 0 || labelIndex < 0 || spanEnd < 0 || spanEnd > inputIndex || source.slice(labelIndex, spanEnd).includes('<b>')) {
    throw new Error('phone required label: unexpected v650 parent section')
  }
  fs.writeFileSync(target(file), source.slice(0, spanEnd) + ' <b>必須</b>' + source.slice(spanEnd))
  changes.push({ file, label: 'show the required marker beside phone number' })
}

const readinessAnchor = "      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Style-Admin-Local-Pagination', 'v650') /* style-admin-local-pagination-v650-ready */"
replaceExact(
  'server.js',
  readinessAnchor,
  readinessAnchor + "\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Business-Application-Phone-Type', 'v651') /* business-application-phone-type-v651-ready */",
  'publish the v651 readiness marker',
)

fs.writeFileSync('/tmp/business-application-phone-type-v651-changes.json', JSON.stringify(changes))
console.log(JSON.stringify({ release, changedFiles: [...new Set(changes.map(change => change.file))], changes: changes.length }))
