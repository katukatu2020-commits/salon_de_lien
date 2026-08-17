const fs = require('fs')

const checks = {
  'server.js': [
    '/api/lien-store-icon',
    'StaffSystemNotification',
    'syncStaffSystemNotifications',
    'customer-notification-badge',
  ],
  'customer-experience-v278.js': [
    'cx-community-route',
    'enforceSquareImageInputs',
    'cx-staff-avatar-fallback',
  ],
  'customer-store-staff-v276.js': [
    "require('sharp')",
    'decodeSquareImage',
    '/api/admin/store-icon',
    'store_inflow',
    'duplicate_candidate',
  ],
  'admin-staff-experience-v276.js': [
    'candidates.slice(1)',
    '正方形の画像を選択してください。',
    'スタッフが手動で行った操作だけ',
  ],
  'commercial-admin-v101.js': [
    'function enforceAdminSquareImageInputs()',
    'data-ca-notification-filter="new_registration"',
    'data-ca-notification-filter="store_inflow"',
    '/api/admin/store-icon',
  ],
  'inbound-email.js': [
    'reservation_import',
    '予約メールを取り込みました',
  ],
}

for (const [file, markers] of Object.entries(checks)) {
  const source = fs.readFileSync(`/app/${file}`, 'utf8')
  for (const marker of markers) if (!source.includes(marker)) throw new Error(`${file}: missing ${marker}`)
}

const customer = fs.readFileSync('/app/customer-experience-v278.js', 'utf8')
if (customer.includes("link.setAttribute('href', '/u/stores')")) throw new Error('The notification-to-store rewrite is still active.')
const commercial = fs.readFileSync('/app/commercial-admin-v101.js', 'utf8')
if (commercial.includes("location.pathname === '/admin/customers/messages') return { panelKey: 'points'")) throw new Error('Consultation settings shortcut is still active.')
console.log('Runtime consistency verification passed.')
