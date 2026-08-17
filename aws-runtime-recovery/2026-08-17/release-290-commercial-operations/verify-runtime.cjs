const fs = require('fs')
const root = process.argv[2] || '/app'

const checks = {
  'server.js': [
    "i.\"type\"=\\'store_inflow\\'",
    'const availableStaff = organizationStaff.filter',
    'const seenStaff = new Set()',
  ],
  'appointment-operations-v267.js': [
    'SELECT "id","name","durationMinutes","priceYen" FROM "SalonMenu"',
    'const estimatedPrice = registeredMenu ? Number(registeredMenu.priceYen) : submittedPrice',
  ],
  'commercial-admin-v101.js': [
    "params.get('chat') !== '1'",
    'function enhanceManualAppointmentMenu()',
    'function removeAccountProfileEditors()',
    'Hotpepper予約受信用メール',
    '店舗専用アイコンを保存しています',
  ],
  'customer-experience-v278.js': [
    'const available = directory.filter',
    'cx-chat-all-open',
    "fallbackAvatar(item || { name: strong?.textContent || '担当' })",
  ],
  'admin-staff-experience-v276.js': [
    "document.querySelectorAll('[data-sm-account-profile]').forEach(node => node.remove())",
  ],
}

for (const [name, markers] of Object.entries(checks)) {
  const source = fs.readFileSync(`${root}/${name}`, 'utf8')
  for (const marker of markers) {
    if (!source.includes(marker)) throw new Error(`${name}: missing ${marker}`)
  }
  new Function(source)
}

console.log('Release 290 runtime verification passed.')
