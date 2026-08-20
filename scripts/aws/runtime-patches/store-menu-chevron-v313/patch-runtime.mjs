import fs from 'node:fs'

const file = '/app/admin-staff-experience-v276.js'
const source = fs.readFileSync(file, 'utf8')
const legacyRule = '    .ca-store-menu-links a[data-sm-staff-link] .arrow{display:grid!important;width:26px!important;height:26px!important;flex:0 0 26px!important;place-items:center;border-radius:50%;background:#fff1ec;color:#a55747}.ca-store-menu-links a[data-sm-staff-link] .arrow svg{width:18px!important;height:18px!important}\n'

const matches = source.split(legacyRule).length - 1
if (matches !== 1) {
  throw new Error(`expected one staff-only store-menu chevron rule, found ${matches}`)
}

// The commercial header owns the shared store-menu styles. Staff management
// must use the same .arrow rule as the surrounding store/account links.
fs.writeFileSync(file, source.replace(legacyRule, ''))
