import fs from 'node:fs'
import path from 'node:path'

const root = process.env.APP_ROOT || '/app'
const serverPath = path.join(root, 'server.js')
const clientPath = path.join(root, 'staff-breaks-checkout-menu-client-v442.js')
const addonPath = new URL('manual-break-booking-v521.js', import.meta.url)
const marker = 'manual-break-booking-v521'

function replaceExact(source, before, after, expected, label) {
  const count = source.split(before).length - 1
  if (count !== expected) throw new Error(`${label}: expected ${expected} matches, found ${count}`)
  return source.split(before).join(after)
}

let server = fs.readFileSync(serverPath, 'utf8')
server = replaceExact(
  server,
  `      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Customer-Staff-Booking', 'v520')`,
  `      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Customer-Staff-Booking', 'v520')
      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Manual-Break-Booking', 'v521')`,
  1,
  'manual break readiness marker',
)
fs.writeFileSync(serverPath, server)

let client = fs.readFileSync(clientPath, 'utf8')
if (client.includes(marker)) throw new Error(`${marker}: patch already applied`)
client = replaceExact(
  client,
  `      option.value = BREAK_MENU_VALUE
      option.dataset.price = '0'`,
  `      option.value = BREAK_MENU_VALUE
      option.hidden = true
      option.disabled = true
      option.dataset.price = '0'`,
  1,
  'retired break menu option visibility',
)
const addon = fs.readFileSync(addonPath, 'utf8')
client += `\n\n/* ${marker} */\n${addon}\n`
fs.writeFileSync(clientPath, client)

console.log(JSON.stringify({ release: marker, patched: true }))
