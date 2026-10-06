'use strict'
const fs = require('node:fs'), path = require('node:path')
const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const read = file => fs.readFileSync(path.join(root, file), 'utf8')
const asset = file => fs.readFileSync(path.join(__dirname, file), 'utf8').replace(/\r\n/g, '\n')
const write = (file, text) => fs.writeFileSync(path.join(root, file), text)
function replace(source, before, after) {
  if (source.split(before).length !== 2) throw Error('Non-unique anchor: ' + before.slice(0, 100))
  return source.replace(before, () => after)
}
let client = read('public/hotpepper-menu-import-v612.js')
client = replace(client, '  window.__orimiaHotpepperMenuImportV612 = true', '  window.__orimiaHotpepperMenuImportV612 = true\n  window.__orimiaHotpepperMenuRestoreV703 = true')
const start = client.indexOf('  function scan() {'), end = client.lastIndexOf('})()')
if (start < 0 || end < start) throw Error('Missing menu import lifecycle')
client = client.slice(0, start) + asset('menu-entry.js') + '\n' + client.slice(end)
client = replace(client, '    mode.addEventListener(\'change\', () => {', `    form.addEventListener('submit', event => {
      if (mode.checked) { event.preventDefault(); event.stopImmediatePropagation() }
    }, true)
    urlInput.addEventListener('keydown', event => {
      if (event.key === 'Enter') { event.preventDefault(); event.stopPropagation(); if (!startButton.disabled) startButton.click() }
    })
    mode.addEventListener('change', () => {`)
client = replace(client, '        adopt(payload.job)', '        if (!disposed) adopt(payload.job)')
client = replace(client, 'if (payload.job && ACTIVE.has(payload.job.status)) adopt(payload.job)', 'if (!disposed && payload.job && ACTIVE.has(payload.job.status)) adopt(payload.job)')
client = replace(client, "      const warning = job.sourceWarnings?.length", "      const durationWarning = job.items.some(item => item.durationEstimated) ? '<p class=\"orimia-menu-import-note-v612\">施術時間は推定です。登録前に内容を確認・修正してください。</p>' : ''\n      const warning = job.sourceWarnings?.length")
client = replace(client, '        ${warning}\n', '        ${durationWarning}${warning}\n')
write('public/hotpepper-menu-import-v703.js', 'window.HotpepperMenuIconsV703=' + asset('icons.json').trim() + ';\n' + client)
write('public/hotpepper-menu-import-v703.css', read('public/hotpepper-menu-import-v612.css') + '\n' + asset('menu-entry.css'))
let server = read('server.js')
server = replace(server, "const hotpepperMenuRouteV612 = pathname === '/admin/products'", "const hotpepperMenuRouteV612 = pathname.startsWith('/admin/')")
server = replace(server, '/hotpepper-menu-import-v612.js?v=612-release1', '/hotpepper-menu-import-v703.js?v=703-1')
server = replace(server, '/hotpepper-menu-import-v612.css?v=612-release1', '/hotpepper-menu-import-v703.css?v=703-1')
server = replace(server, "res.setHeader('X-Lien-Staff-Break-Drag', 'v702')", "res.setHeader('X-Lien-Staff-Break-Drag', 'v702')\n    res.setHeader('X-Lien-Hotpepper-Menu-Restore', 'v703')")
write('server.js', server)
console.log('v703 restored SPA-safe menu import entry; existing parser, API and data preserved.')
