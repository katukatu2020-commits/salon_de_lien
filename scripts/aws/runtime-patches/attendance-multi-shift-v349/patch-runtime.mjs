import fs from 'node:fs'

const serverFile = '/app/server.js'
let server = fs.readFileSync(serverFile, 'utf8')
const oldImport = `const { createAttendanceNotificationProductService } = require('./attendance-notification-product-v320') /* attendance-notification-product-v320 */`
if (!server.includes(oldImport)) throw new Error('attendance v320 service import not found')
server = server.replace(oldImport, `const { createAttendanceNotificationProductService } = require('./attendance-multi-shift-v349') /* attendance-multi-shift-v349 */`)
server = server.replaceAll('attendance-notification-product-v320-service', 'attendance-multi-shift-v349-service')
server = server.replaceAll('attendance-notification-product-v320-schema', 'attendance-multi-shift-v349-schema')
server = server.replaceAll('attendance-notification-product-v320-route', 'attendance-multi-shift-v349-route')
fs.writeFileSync(serverFile, server)

const commercialFile = '/app/commercial-admin-v101.js'
let commercial = fs.readFileSync(commercialFile, 'utf8')
const startMarker = ';(() => {\n  if (window.__lienAttendanceProductV320) return'
const start = commercial.indexOf(startMarker)
if (start < 0) throw new Error('attendance v320 client start not found')
const end = commercial.indexOf('\n})()', start)
if (end < 0) throw new Error('attendance v320 client end not found')
commercial = commercial.slice(0, start) + commercial.slice(end + '\n})()'.length)
commercial += '\n' + fs.readFileSync('/app/attendance-client-v349.js', 'utf8') + '\n'
fs.writeFileSync(commercialFile, commercial)
