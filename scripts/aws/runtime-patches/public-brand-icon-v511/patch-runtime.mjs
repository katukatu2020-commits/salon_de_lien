import fs from 'node:fs'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const publicSitePath = `${root}/public-site.js`
const serverPath = `${root}/server.js`

function replaceExact(source, before, after, expected, label) {
  const matches = source.split(before).length - 1
  if (matches !== expected) {
    throw new Error(`public-brand-icon-v511: expected ${expected} ${label} matches, found ${matches}`)
  }
  return source.replaceAll(before, after)
}

let publicSite = fs.readFileSync(publicSitePath, 'utf8')

const oldMarkCss = '.mark{display:grid;width:42px;height:42px;place-items:center;border-radius:50%;background:var(--brown);color:#fff;font:italic 18px Georgia,serif}'
const newMarkCss = '.mark{display:block;width:42px;height:42px;flex:0 0 auto;background:transparent;line-height:0}.mark img{display:block;width:100%;height:100%;object-fit:contain}'
publicSite = replaceExact(publicSite, oldMarkCss, newMarkCss, 1, 'legacy mark CSS')

const oldMark = '<span class="mark">L</span>'
const newMark = '<span class="mark" aria-hidden="true"><img src="/brand/orimia-icon-192.png?v=511" alt="" width="42" height="42" decoding="async"></span>'
publicSite = replaceExact(publicSite, oldMark, newMark, 1, 'legacy L mark')

fs.writeFileSync(publicSitePath, publicSite)

let server = fs.readFileSync(serverPath, 'utf8')
const readyMarker = "      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Broadcast-Layout', 'v510')"
server = replaceExact(
  server,
  readyMarker,
  `${readyMarker}\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Public-Brand-Icon', 'v511')`,
  1,
  'readiness marker',
)
fs.writeFileSync(serverPath, server)

console.log('public-brand-icon-v511 runtime patched')
