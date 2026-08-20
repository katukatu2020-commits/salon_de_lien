const fs = require('node:fs')

const service = fs.readFileSync('/app/tenant-setup.js', 'utf8')
const client = fs.readFileSync('/app/tenant-setup-client.js', 'utf8')
const checks = [
  [service.includes('OrganizationDailySchedule'), 'daily schedule schema exists'],
  [service.includes("url.pathname === '/api/lien-business-days'"), 'daily schedule API is routed'],
  [service.includes('scheduleForDate(schedule, dailyLookup.get(date)'), 'customer availability resolves daily schedule'],
  [service.includes('currentSchedule.capacity'), 'booking enforces daily capacity'],
  [service.includes("session.role !== 'ADMIN'"), 'daily updates require owner role'],
  [client.includes('日別の営業時間・休業日'), 'calendar navigation and monthly page are rendered'],
  [client.includes('ts-shift-hover-slot'), 'shift hover slot indicator is rendered'],
  [client.includes('selectedShiftMinutes(event, lane)'), 'hover and double-click share slot geometry'],
  [client.includes('loadDailyScheduleForShift'), 'shift view resolves the selected day schedule'],
  [!client.includes('labels.pop().remove()'), 'shift time labels are not removed outside React'],
]
const failed = checks.filter(([ok]) => !ok).map(([, label]) => label)
if (failed.length) throw new Error('runtime verification failed: ' + failed.join(', '))
for (const [, label] of checks) console.log('ok - ' + label)
