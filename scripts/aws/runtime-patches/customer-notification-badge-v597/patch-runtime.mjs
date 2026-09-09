import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const here = path.dirname(fileURLToPath(import.meta.url))
const css = '\n' + fs.readFileSync(path.join(here, 'customer-notification-badge-v597.css'), 'utf8').replace(/\r\n/g, '\n')
const changes = []
function replace(file, before, after, count = 1) {
  const target = path.join(root, file)
  const text = fs.readFileSync(target, 'utf8')
  if (text.split(before).length !== count + 1) throw new Error('Unexpected v596 parent anchor: ' + file + ' / ' + before)
  fs.writeFileSync(target, text.split(before).join(after))
  changes.push({ file, before, after, count })
}
const styleFile = 'public/shell-consistency-v518.css'
const style = fs.readFileSync(path.join(root, styleFile), 'utf8')
if (style.includes('customer-notification-badge-v597')) throw new Error('Already patched')
fs.appendFileSync(path.join(root, styleFile), css)
changes.push({ file: styleFile, before: '', after: css, count: 1 })
replace('server.js', '/shell-consistency-v518.css?v=544-single-loader1', '/shell-consistency-v518.css?v=597-notification-badge1')
replace('server.js', '/customer-experience-v508.js?v=529-release1', '/customer-experience-v508.js?v=597-notification-badge1')
const ready = "      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Customer-Booking-Check', 'v574') /* customer-booking-check-v574 */"
replace('server.js', ready, ready + "\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Customer-Notification-Badge', 'v597') /* customer-notification-badge-v597 */")
for (const file of ['customer-experience-v508.js', 'customer-experience-v503.js']) replace(file,
  "document.querySelector('.customer-notification-badge,.topbar .badge')",
  "document.querySelector('.customer-premium-topbar a[href=\"/u/news\"] > span.absolute,.customer-notification-badge,.topbar a[href=\"/u/news\"] > .badge')")
const oldUrl = '/customer-experience-v503.js?v=546-navigation-privacy1'
const newUrl = '/customer-experience-v503.js?v=597-notification-badge1'
replace('server.js', oldUrl, newUrl, 2)
// The native layout chunk is immutable: use a new filename, not an in-place cache edit.
const oldChunk = 'layout-customer-mobile-nav-v425.chat-send-only-v547.js'
const newChunk = 'layout-customer-mobile-nav-v425.notification-badge-v597.js'
const chunkDir = '.next/static/chunks/app/u/(account)/'
const oldSource = fs.readFileSync(path.join(root, chunkDir + oldChunk), 'utf8')
if (oldSource.split(oldUrl).length !== 2) throw new Error('Unexpected native loader')
fs.writeFileSync(path.join(root, chunkDir + newChunk), oldSource.replace(oldUrl, newUrl))
replace('server.js', oldChunk, newChunk)
fs.writeFileSync('/tmp/notification-v597-changes.json', JSON.stringify(changes))
console.log(JSON.stringify({ release: 'customer-notification-badge-v597', modifiedFiles: [...new Set(changes.map(c => c.file))] }))
