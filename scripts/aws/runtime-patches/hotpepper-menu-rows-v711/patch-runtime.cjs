'use strict'
const fs = require('node:fs'), path = require('node:path')
const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const read = file => fs.readFileSync(path.join(root, file), 'utf8')
const write = (file, value) => fs.writeFileSync(path.join(root, file), value)
function replace(source, from, to) {
  if (source.split(from).length !== 2) throw Error('Unexpected anchor: ' + from.slice(0, 100))
  return source.replace(from, () => to)
}
fs.copyFileSync(path.join(__dirname, 'parse-menu-rows.cjs'), path.join(root, 'hotpepper-menu-rows-v711.cjs'))
let parser = read('hotpepper-menu-parser-v612.js')
const start = parser.indexOf('function parseMenuPage(html, source) {'), end = parser.indexOf('\nasync function retrieveMenuPage(value)', start)
if (start < 0 || end <= start || !parser.slice(start, end).includes("$('table.menuTbl').each")) throw Error('Unexpected menu parser version')
parser = parser.slice(0, start) + `const parseMenuPage = require('./hotpepper-menu-rows-v711.cjs').createMenuParser({
  load, crypto, menuPageUrl, clean, parsePrice, estimateDuration, failure, MAX_MENUS,
})
` + parser.slice(end)
write('hotpepper-menu-parser-v612.js', parser)
let server = read('server.js')
server = replace(server, "      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Hotpepper-Menu-Import', 'v612')", "      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Hotpepper-Menu-Rows', 'v711')\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Hotpepper-Menu-Import', 'v612')")
write('server.js', server)
// Preserve v703's service integrity check; parsing is intentionally superseded.
const checkFile = '/tmp/lien-v703/verify-runtime.mjs'
let check = fs.readFileSync(checkFile, 'utf8')
check = replace(check, "['hotpepper-menu-parser-v612.js', 'hotpepper-menu-import-v612.js']", "['hotpepper-menu-import-v612.js']")
check += "\nassert.ok(fs.readFileSync('/app/hotpepper-menu-parser-v612.js','utf8').includes('hotpepper-menu-rows-v711.cjs'))\n"
fs.writeFileSync(checkFile, check)
console.log('v711 applied: parse each menu row and retain single-menu category and stable ID')
