const fs = require('fs')
const path = require('path')

const appRoot = process.env.APP_ROOT || '/app'
const read = relative => fs.readFileSync(path.join(appRoot, relative), 'utf8')

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

const serverTreasure = read('.next/server/chunks/8404.js')
const clientTreasure = read('.next/static/chunks/5691-4da1d9e518b3859d.reward-chest-v44.js')
const serverShell = read('.next/server/chunks/1597.js')
const clientShell = read('.next/static/chunks/app/u/(account)/layout-1c1963f4f2eb1b14.unified-reservation-chat.premium-mobile-v29.customer-home-unified-v35.customer-shell-chat-v36.notification-badge-v44.js')
const adminCapacity = read('.next/static/chunks/app/admin/appointments/page-shift-layout-20260812-02.capacity-persist-v44.js')
const availability = read('.next/server/app/api/customer/appointments/availability/route.js')
const createAppointment = read('.next/server/app/api/customer/appointments/route.js')
const customServer = read('server.js')
const manifest = read('.next/app-build-manifest.json')

for (const source of [serverTreasure, clientTreasure]) {
  assert(source.includes('/rewards/treasure-open-v2.png'), 'open reward treasure asset is missing')
  assert(source.includes('/rewards/treasure-closed-v2.png'), 'closed reward treasure asset is missing')
}
assert(fs.existsSync(path.join(appRoot, 'public/rewards/treasure-open-v2.png')), 'open treasure PNG is missing')
assert(fs.existsSync(path.join(appRoot, 'public/rewards/treasure-closed-v2.png')), 'closed treasure PNG is missing')

for (const source of [serverShell, clientShell]) {
  assert(source.includes('unreadCount'), 'customer shell unreadCount prop is missing')
  assert(source.includes('bg-[#c54843]'), 'red customer notification badge is missing')
  assert(source.includes('99+'), 'notification badge cap is missing')
}
assert(serverShell.includes('CustomerBroadcastRecipient'), 'broadcast unread query is missing')
assert(serverShell.includes('ChatMessage'), 'chat unread query is missing')

assert(customServer.includes("url.pathname === '/api/lien-capacity'"), 'capacity persistence endpoint is missing')
assert(adminCapacity.includes('/api/lien-capacity?date='), 'admin capacity load is missing')
assert(adminCapacity.includes('method: "POST"'), 'admin capacity save is missing')
assert(adminCapacity.includes('Object.entries(r).forEach'), 'legacy local capacity migration is missing')
assert(adminCapacity.includes('commercial-reward-notifications-capacity-v44-admin-capacity'), 'admin capacity patch marker is missing')
assert(availability.includes('Number(o.remaining)===0'), 'customer availability zero-capacity filter is missing')
assert(createAppointment.includes('"remaining"=0'), 'appointment create zero-capacity server guard is missing')

assert(manifest.includes('5691-4da1d9e518b3859d.reward-chest-v44.js'), 'reward chunk cache bust is missing')
assert(manifest.includes('notification-badge-v44.js'), 'customer shell chunk cache bust is missing')
assert(manifest.includes('page-shift-layout-20260812-02.capacity-persist-v44.js'), 'admin capacity chunk cache bust is missing')

console.log('release 44 verification passed')
