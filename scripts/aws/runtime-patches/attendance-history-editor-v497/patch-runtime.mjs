import fs from 'node:fs'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const serverPath = `${root}/server.js`
const commercialPath = `${root}/commercial-admin-v101.js`
const servicePath = `${root}/attendance-history-editor-v497.js`
const clientPath = `${root}/attendance-client-v497.js`

function replaceExact(source, before, after, expected, label) {
  const count = source.split(before).length - 1
  if (count !== expected) throw new Error(`${label}: expected ${expected} matches, found ${count}`)
  return source.split(before).join(after)
}

let server = fs.readFileSync(serverPath, 'utf8')
server = replaceExact(
  server,
  "const { createAttendanceNotificationProductService } = require('./attendance-multi-shift-v349') /* attendance-multi-shift-v349 */",
  "const { createAttendanceNotificationProductService } = require('./attendance-history-editor-v497') /* attendance-history-editor-v497 */",
  1,
  'attendance service import',
)
server = replaceExact(server, 'attendance-multi-shift-v349-service', 'attendance-history-editor-v497-service', 1, 'attendance service marker')
server = replaceExact(server, 'attendance-multi-shift-v349-schema', 'attendance-history-editor-v497-schema', 1, 'attendance schema marker')
server = replaceExact(server, 'attendance-multi-shift-v349-route', 'attendance-history-editor-v497-route', 1, 'attendance route marker')
server = replaceExact(
  server,
  "      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Customer-Registration-Filter', 'v496')",
  "      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Customer-Registration-Filter', 'v496')\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Attendance-History-Editor', 'v497')",
  1,
  'readiness marker',
)
fs.writeFileSync(serverPath, server)

let commercial = fs.readFileSync(commercialPath, 'utf8')
const oldStartMarker = ';(() => {\n  if (window.__lienAttendanceProductV349) return'
const oldStart = commercial.indexOf(oldStartMarker)
if (oldStart < 0) throw new Error('attendance v349 client start was not found')
if (commercial.indexOf(oldStartMarker, oldStart + oldStartMarker.length) >= 0) throw new Error('attendance v349 client start was not unique')
const productTailMarker = '  function setupProductImage(form) {'
const productTailStart = commercial.indexOf(productTailMarker, oldStart)
if (productTailStart < 0) throw new Error('existing product image tail was not found')
const oldEnd = commercial.indexOf('\n})()', productTailStart)
if (oldEnd < 0) throw new Error('attendance v349 client end was not found')

const client = fs.readFileSync(clientPath, 'utf8')
const clientTailMarker = '  /* __LIEN_EXISTING_PRODUCT_TAIL__ */'
const clientTailStart = client.indexOf(clientTailMarker)
if (clientTailStart < 0) throw new Error('attendance v497 client tail marker was not found')
const clientPrefix = client.slice(0, clientTailStart)
const existingProductTail = commercial.slice(productTailStart, oldEnd + '\n})()'.length)
commercial = commercial.slice(0, oldStart) + clientPrefix + existingProductTail + commercial.slice(oldEnd + '\n})()'.length)
fs.writeFileSync(commercialPath, commercial)

if (!fs.existsSync(servicePath)) throw new Error('attendance v497 service was not copied')
console.log('attendance-history-editor-v497 patched')
