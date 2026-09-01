import fs from 'node:fs'
import path from 'node:path'

const root = process.env.APP_ROOT || '/app'
const serverPath = path.join(root, 'server.js')
const shellCssPath = path.join(root, 'public', 'shell-consistency-v518.css')
const addonPath = new URL('sidebar-boundary-v523.css', import.meta.url)
const marker = 'sidebar-boundary-v523'

function replaceExact(source, before, after, expected, label) {
  const count = source.split(before).length - 1
  if (count !== expected) throw new Error(`${label}: expected ${expected} matches, found ${count}`)
  return source.split(before).join(after)
}

let server = fs.readFileSync(serverPath, 'utf8')
server = replaceExact(
  server,
  `      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Manual-Break-Cleanup', 'v522')`,
  `      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Manual-Break-Cleanup', 'v522')
      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Sidebar-Boundary', 'v523')`,
  1,
  'sidebar boundary readiness marker',
)
server = replaceExact(
  server,
  '/shell-consistency-v518.css?v=518-release1',
  '/shell-consistency-v518.css?v=523-boundary1',
  1,
  'shell stylesheet cache revision',
)
fs.writeFileSync(serverPath, server)

let shellCss = fs.readFileSync(shellCssPath, 'utf8')
if (shellCss.includes(marker)) throw new Error(`${marker}: patch already applied`)
const addon = fs.readFileSync(addonPath, 'utf8')
shellCss += `\n\n${addon}\n`
fs.writeFileSync(shellCssPath, shellCss)

console.log(JSON.stringify({ release: marker, patched: true }))
