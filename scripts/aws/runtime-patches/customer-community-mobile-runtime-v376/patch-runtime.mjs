import fs from 'node:fs'

const pagePath = '/app/.next/server/app/u/(account)/community/[postId]/page.js'
const serverPath = '/app/server.js'
const publicScriptPath = '/app/customer-community-mobile-v376.js'
const publicTargetPath = '/app/public/customer-community-mobile-v376.js'

let page = fs.readFileSync(pagePath, 'utf8')
let server = fs.readFileSync(serverPath, 'utf8')

function replaceOnce(source, before, after, label) {
  const count = source.split(before).length - 1
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`)
  return source.replace(before, after)
}

const pageAnchor = 'children:[(0,s.jsx)("style",{id:"customer-community-content-height-v375"'
page = replaceOnce(
  page,
  pageAnchor,
  'children:[(0,s.jsx)("script",{src:"/customer-community-mobile-v376.js",defer:!0}),(0,s.jsx)("style",{id:"customer-community-content-height-v375"',
  'customer community mobile runtime script',
)

const serverAnchor = "      if (url.pathname === '/customer-registration-resend-v347.js' && req.method === 'GET') {"
const serverRoute = `      if (url.pathname.startsWith('/u/community')) {
        res.setHeader('Cache-Control', 'private, no-store, max-age=0')
        res.setHeader('Pragma', 'no-cache')
      } /* customer-community-mobile-runtime-v376-no-store */
      if (url.pathname === '/customer-community-mobile-v376.js' && req.method === 'GET') {
        res.statusCode = 200
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8')
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
        res.setHeader('X-Content-Type-Options', 'nosniff')
        res.end(fs.readFileSync(path.join(dir, 'public', 'customer-community-mobile-v376.js')))
        return
      } /* customer-community-mobile-runtime-v376 */
`
server = replaceOnce(server, serverAnchor, serverRoute + serverAnchor, 'customer community mobile server route')

fs.mkdirSync('/app/public', { recursive: true })
fs.copyFileSync(publicScriptPath, publicTargetPath)
fs.writeFileSync(pagePath, page)
fs.writeFileSync(serverPath, server)
