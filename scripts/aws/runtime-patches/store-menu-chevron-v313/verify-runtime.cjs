const fs = require('node:fs')

const staff = fs.readFileSync('/app/admin-staff-experience-v276.js', 'utf8')
const admin = fs.readFileSync('/app/commercial-admin-v101.js', 'utf8')

const checks = [
  [staff.includes("link.dataset.smStaffLink = '1'"), 'staff management menu entry remains available'],
  [staff.includes("<span class=\"arrow\">${icon('chevronRight')}</span>"), 'staff management uses the shared arrow markup'],
  [!staff.includes('.ca-store-menu-links a[data-sm-staff-link] .arrow{'), 'staff-only circular arrow override is removed'],
  [admin.includes('.ca-store-menu-links .arrow{margin-left:auto;width:14px;color:#9a8580}'), 'shared store-menu arrow style remains authoritative'],
]

const failed = checks.filter(([ok]) => !ok).map(([, label]) => label)
if (failed.length) throw new Error(`runtime verification failed: ${failed.join(', ')}`)
for (const [, label] of checks) console.log(`ok - ${label}`)
