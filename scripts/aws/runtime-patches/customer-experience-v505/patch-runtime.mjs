import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const patchRoot = path.dirname(fileURLToPath(import.meta.url))
const serverPath = path.join(root, 'server.js')

function replaceExact(source, before, after, expected, label) {
  const count = source.split(before).length - 1
  if (count !== expected) throw new Error(`${label}: expected ${expected} matches, found ${count}`)
  return source.split(before).join(after)
}

for (const fileName of ['customer-experience-v505.js', 'customer-experience-v505.css']) {
  fs.copyFileSync(path.join(patchRoot, fileName), path.join(root, fileName))
}

let server = fs.readFileSync(serverPath, 'utf8')

server = replaceExact(
  server,
  "X-Lien-Customer-Experience', 'v504",
  "X-Lien-Customer-Experience', 'v505",
  1,
  'customer experience readiness header',
)
server = replaceExact(
  server,
  'customer-experience-v504',
  'customer-experience-v505',
  7,
  'customer experience asset references',
)
server = replaceExact(
  server,
  'customer-experience-style-v504',
  'customer-experience-style-v505',
  2,
  'customer experience stylesheet markers',
)
server = replaceExact(
  server,
  'customer-experience-script-v504',
  'customer-experience-script-v505',
  2,
  'customer experience script markers',
)
server = replaceExact(server, '?v=504', '?v=505', 2, 'customer experience cache version')

fs.writeFileSync(serverPath, server)
console.log('[customer-experience-v505] runtime patched')
