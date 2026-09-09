import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const changes = []
function replace(file, before, after) {
  const target = path.join(root, file)
  const source = fs.readFileSync(target, 'utf8')
  if (source.split(before).length !== 2) throw new Error('Unexpected v597 parent anchor: ' + file)
  fs.writeFileSync(target, source.replace(before, after))
  changes.push({ file, before, after })
}

replace('.next/server/app/api/auth/logout/route.js',
  'NextResponse.redirect((0,l.tm)(e,"/"),303)',
  'NextResponse.redirect((0,l.tm)(e,"/business"),303)')
replace('wholesale-ordering-v543.js',
  "res.setHeader('Set-Cookie', expiredSessionCookie(req)); redirect(res, '/dealer/login'); return true",
  "res.setHeader('Set-Cookie', expiredSessionCookie(req)); redirect(res, '/business'); return true")
const ready = "      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Customer-Notification-Badge', 'v597') /* customer-notification-badge-v597 */"
replace('server.js', ready, ready + "\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Business-Logout', 'v599') /* business-logout-v599 */")
fs.writeFileSync('/tmp/business-logout-v599-changes.json', JSON.stringify(changes))
console.log(JSON.stringify({ release: 'business-logout-v599', modifiedFiles: changes.map(c => c.file) }))
