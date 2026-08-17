const fs = require('fs')

const source = fs.readFileSync('/app/customer-experience-v278.js', 'utf8')
const required = [
  'function canonicalStaffName(value)',
  "replace(/[邊邉]/g, '辺')",
  "if (!label || label === '指名なし') return",
  "byName(label) || { key: label, name: label }",
  'avatarCounts.get(item.avatarUrl) === 1',
  'function ensureMobileCustomerStoreIcon()',
]

for (const marker of required) {
  if (!source.includes(marker)) throw new Error(`customer-experience-v278.js: missing ${marker}`)
}

console.log('Booking staff avatar verification passed.')
