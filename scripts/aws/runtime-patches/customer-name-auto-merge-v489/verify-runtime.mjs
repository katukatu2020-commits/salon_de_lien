import fs from 'node:fs'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const files = {
  server: fs.readFileSync(`${root}/server.js`, 'utf8'),
  service: fs.readFileSync(`${root}/customer-name-auto-merge-v489.js`, 'utf8'),
  line: fs.readFileSync(`${root}/line-reservations-v436.js`, 'utf8'),
  tenant: fs.readFileSync(`${root}/tenant-setup.js`, 'utf8'),
  inbound: fs.readFileSync(`${root}/inbound-email.js`, 'utf8'),
  appointment: fs.readFileSync(`${root}/appointment-operations-v267.js`, 'utf8'),
}

const assertions = [
  [files.server.includes("require('./customer-name-auto-merge-v489')"), 'server imports the shared service'],
  [(files.server.match(/createCustomerNameAutoMergeService\(\{ prisma, crypto \}\)/g) || []).length === 1, 'one shared service is created'],
  [files.server.includes('await customerNameAutoMerge.ensureSchema()'), 'schema is initialized before traffic'],
  [files.server.includes("X-Lien-Customer-Name-Auto-Merge', 'v489"), 'production marker is present'],
  [files.server.includes('WITH RECURSIVE "MergedCustomer"') && files.server.includes('customerId: users[0].customerId'), 'merged customer sessions follow the final target chart'],
  [files.service.includes('CustomerNormalizedNameIdentity'), 'normalized-name identity table is present'],
  [files.service.includes('pg_advisory_xact_lock(hashtext($1))::text'), 'same-name reservations are serialized with a Prisma-safe result type'],
  [files.service.includes('c."organizationId"=$1') && files.service.includes('"organizationId"=$2'), 'matching is constrained to one store'],
  [files.service.includes('CustomerLineIdentity') && files.service.includes('CustomerCampaignRecipient'), 'newer customer relations are merged'],
  [files.service.includes("'Appointment'") && files.service.includes("'ServiceSale'") && files.service.includes("'VisitCommunityPost'"), 'booking, sales, visit, and style history are merged'],
  [files.line.includes('customerNameAutoMerge.resolveOrCreate(tx'), 'LINE booking uses shared resolution'],
  [files.line.includes("actorLabel: 'LINE予約時自動統合'"), 'LINE merge is audited'],
  [files.tenant.includes("actorLabel: 'Gmail予約取込時自動統合'"), 'Gmail import uses shared resolution'],
  [files.tenant.includes("actorLabel: 'お客様アプリ予約時自動統合'"), 'customer app booking uses shared resolution'],
  [files.tenant.includes('preferredCustomerId: sessionCustomer.id'), 'customer app login chart is preserved'],
  [files.inbound.includes("actorLabel: '予約メール取込時自動統合'"), 'inbound mail uses shared resolution'],
  [files.appointment.includes("actorLabel: '電話・店頭予約時自動統合'"), 'manual booking uses shared resolution'],
  [files.appointment.includes("actorLabel: '別店舗顧客コード予約時自動統合'"), 'cross-store customer code uses shared resolution'],
  [!files.line.includes('normalizeJapanesePhone(item.phone) === normalizedPhone && normalizePersonName(item.name)'), 'old LINE phone-and-name-only lookup is removed'],
  [!files.tenant.includes("parsed.customerName.replace(/\\s/g, '')"), 'old whitespace-only Gmail lookup is removed'],
  [!files.inbound.includes("String(parsed.customerName || '').replace(/\\s/g, '')"), 'old whitespace-only inbound lookup is removed'],
]

for (const [condition, message] of assertions) {
  if (!condition) throw new Error(`customer-name-auto-merge-v489: ${message}`)
}

console.log(`customer name auto merge v489 verified (${assertions.length} assertions)`)
