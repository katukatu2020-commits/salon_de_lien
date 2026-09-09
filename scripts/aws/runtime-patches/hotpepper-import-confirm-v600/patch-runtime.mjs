import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const here = path.dirname(fileURLToPath(import.meta.url))
const changes = []
function replace(file, before, after) {
  const target = path.join(root, file)
  const source = fs.readFileSync(target, 'utf8')
  if (source.split(before).length !== 2) throw new Error('Unexpected v599 anchor: ' + file)
  fs.writeFileSync(target, source.replace(before, after))
  changes.push({ file, before, after })
}
const client = 'community-publishing-client-v566.js'
const source = fs.readFileSync(path.join(root, client), 'utf8')
if (crypto.createHash('sha256').update(source).digest('hex') !== 'b61aa5e2bcde7fe166b2d939691d420d2eaf9a0aeae1d3abe2652adc8bf82202') throw new Error('Publisher parent changed')
const start = source.indexOf('  function configureHotpepper(modal) {')
const end = source.indexOf('  function openModal() {', start)
if (start < 0 || end <= start) throw new Error('Import UI boundary missing')
replace(client, source.slice(start, end), fs.readFileSync(path.join(here, 'publisher-addon-v600.js'), 'utf8').replace(/\r\n/g, '\n') + '\n')
replace('server.js', "require('./hotpepper-import-v596').createHotpepperImportService", "require('./hotpepper-import-v600').createHotpepperImportService")
replace('server.js', "res.setHeader('X-Lien-Hotpepper-Style-Import', 'v596')", "res.setHeader('X-Lien-Hotpepper-Style-Import', 'v600')")
replace('commercial-admin-v101.js', "script.src = '/admin-community-publishing-v596.js?v=596'", "script.src = '/admin-community-publishing-v600.js?v=600'")
replace('community-publishing-v566.js', "'/admin-community-publishing-v596.js']", "'/admin-community-publishing-v596.js', '/admin-community-publishing-v600.js']")
for (const file of ['hotpepper-import-v600.js', 'hotpepper-origin-v600.js']) {
  if (fs.existsSync(path.join(root, file))) throw new Error('Already installed: ' + file)
  fs.copyFileSync(path.join(here, file), path.join(root, file))
}
fs.writeFileSync('/tmp/hotpepper-v600-changes.json', JSON.stringify(changes))
console.log(JSON.stringify({ release: 'hotpepper-import-confirm-v600', modified: [...new Set(changes.map(c => c.file))] }))
