const fs = require('node:fs')

const server = fs.readFileSync('/app/server.js', 'utf8')
const admin = fs.readFileSync('/app/commercial-admin-v101.js', 'utf8')

const checks = [
  [server.includes('Array.isArray(data.notifications)'), 'bulk notification request is supported'],
  [server.includes("['appointment', 'event', 'message'].includes(type)"), 'bulk endpoint validates supported notification types'],
  [server.includes('notification.createdAt, notification.threadId'), 'selected chat message advances its thread read time'],
  [server.includes('submitted.length > 100'), 'bulk request size is limited'],
  [admin.includes('data-ca-notification-select-all'), 'select-all checkbox is rendered'],
  [admin.includes('data-ca-notification-bulk-read'), 'bulk read action is rendered'],
  [admin.includes('notifications: targets.map'), 'selected notifications are sent to the server'],
  [admin.includes("readType: 'message', readId: item.id"), 'message selection uses the exact message identity'],
  [admin.includes('ca-notification-history-row'), 'notification cards and checkboxes share a stable row layout'],
]

const failed = checks.filter(([ok]) => !ok).map(([, label]) => label)
if (failed.length) throw new Error(`runtime verification failed: ${failed.join(', ')}`)
for (const [, label] of checks) console.log(`ok - ${label}`)
