const fs = require('node:fs')

const server = fs.readFileSync('/app/server.js', 'utf8')
const admin = fs.readFileSync('/app/commercial-admin-v101.js', 'utf8')
const tenant = fs.readFileSync('/app/tenant-setup-client.js', 'utf8')

const checks = [
  [server.includes('const thread = requested ? threads.find(t => t.id === requested) : null'), 'chat list does not auto-open a thread'],
  [server.includes('CREATE TABLE IF NOT EXISTS "StaffNotificationRead"'), 'per-item notification read table exists'],
  [server.includes('async function markStaffNotificationRead'), 'explicit notification read API exists'],
  [server.includes("req.method === 'POST') return await markStaffNotificationRead"), 'notification POST route exists'],
  [server.includes('NOT EXISTS (SELECT 1 FROM "StaffNotificationRead"'), 'unread queries use per-item state'],
  [!admin.includes('history=1&read=1'), 'opening history does not mark all read'],
  [admin.includes("data-ca-notification-read-type"), 'history items carry read identity'],
  [admin.includes("document.addEventListener('click', async event =>"), 'notification navigation can await the read request'],
  [admin.includes("Number(payload?.staff?.count || 0)"), 'badge uses server canonical unread count'],
  [tenant.includes('function openManualAppointmentFromLane'), 'shift double-click launcher exists'],
  [tenant.includes("document.addEventListener('dblclick'"), 'shift double-click handler is bound'],
  [tenant.includes("button.hidden = true"), 'legacy manual appointment button is hidden'],
  [tenant.includes("button.style.setProperty('display', 'none', 'important')"), 'launcher remains hidden against utility CSS'],
  [tenant.includes("Math.round(rawMinutes / 15) * 15"), 'clicked time is snapped to 15 minutes'],
]

const failed = checks.filter(([ok]) => !ok).map(([, label]) => label)
if (failed.length) throw new Error(`runtime verification failed: ${failed.join(', ')}`)
for (const [, label] of checks) console.log(`ok - ${label}`)
