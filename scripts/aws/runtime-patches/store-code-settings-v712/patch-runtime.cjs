'use strict'
const fs = require('node:fs'), path = require('node:path')
const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const read = file => fs.readFileSync(path.join(root, file), 'utf8')
const write = (file, value) => fs.writeFileSync(path.join(root, file), value)
function replace(source, from, to) {
  if (source.split(from).length !== 2) throw Error('Unexpected anchor: ' + from.slice(0, 120))
  return source.replace(from, () => to)
}
let client = read('admin-staff-experience-v276.js')
client = replace(client,
  "  async function ensureStoreCode() {\n    document.querySelectorAll('[data-sm-store-code],.lien-store-qr-card').forEach(card => card.remove())\n  }\n\n",
  fs.readFileSync(path.join(__dirname, 'store-code.fragment.js'), 'utf8') + '\n')
client = replace(client, '    .sm-store-code{', `    [data-store-code-v712].sm-store-code{margin:0;border:0;border-bottom:1px solid var(--ca-line,#e8ded2);border-radius:0;box-shadow:none;background:transparent;padding:20px 24px}
    [data-store-code-v712].sm-store-code code{max-width:100%;overflow-wrap:anywhere;white-space:normal;letter-spacing:0;user-select:all}
    [data-store-code-v712] [data-store-code-status]{min-height:16px;font-size:12px}
    html[data-ca-theme="dark"] [data-store-code-v712] h3{color:#f4ece7}
    html[data-ca-theme="dark"] [data-store-code-v712] code{background:#191513;color:#f4ece7;border-color:#53433c}
    .sm-store-code{`)
write('admin-staff-experience-v276.js', client)
let server = read('server.js')
const ready = "      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Hotpepper-Menu-Rows', 'v711')"
server = replace(server, ready, "      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Store-Code-Settings', 'v712')\n" + ready)
write('server.js', server)
console.log('v712 applied: restore existing store code in the store settings panel')
