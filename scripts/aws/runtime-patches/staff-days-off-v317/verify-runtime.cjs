const fs = require('node:fs')

const customer = fs.readFileSync('/app/customer-store-staff-v276.js', 'utf8')
const staffClient = fs.readFileSync('/app/admin-staff-experience-v276.js', 'utf8')
const tenant = fs.readFileSync('/app/tenant-setup.js', 'utf8')
const tenantClient = fs.readFileSync('/app/tenant-setup-client.js', 'utf8')
const server = fs.readFileSync('/app/server.js', 'utf8')
const checks = [
  [customer.includes('normalizeStaffClosedWeekdays'), 'staff API normalizes recurring days off'],
  [customer.includes('"closedWeekdays"=$5'), 'staff API persists recurring days off'],
  [staffClient.includes('recurringDaysOffMarkup'), 'staff management renders recurring days off'],
  [staffClient.includes('selectedRecurringDaysOff(form)'), 'staff management submits recurring days off'],
  [tenant.includes('staff.closedWeekdays || []'), 'booking availability enforces recurring days off'],
  [tenant.includes('durationMinutes: Number(menu.durationMinutes), date'), 'booking checks receive reservation date'],
  [tenantClient.includes('applyStaffRecurringDaysOff'), 'shift renders recurring days off'],
  [tenantClient.includes("root.dataset.interacting === '1'"), 'daily schedule protects active controls'],
  [tenantClient.includes('records.every(record => businessRoot.contains(record.target))'), 'observer ignores interactive calendar mutations'],
  [server.includes('submitted.length > 500'), 'bulk notification read accepts all visible items'],
]
const failed = checks.filter(([ok]) => !ok).map(([, label]) => label)
if (failed.length) throw new Error('runtime verification failed: ' + failed.join(', '))
for (const [, label] of checks) console.log('ok - ' + label)
