import fs from 'node:fs'

const pagePath = '/app/.next/server/app/u/(account)/community/[postId]/page.js'
const serverPath = '/app/server.js'
let page = fs.readFileSync(pagePath, 'utf8')
let server = fs.readFileSync(serverPath, 'utf8')

function replaceOnce(source, before, after, label) {
  const count = source.split(before).length - 1
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`)
  return source.replace(before, after)
}

page = replaceOnce(
  page,
  'src:"/customer-community-mobile-v376.js"',
  'src:"/customer-community-mobile-v377.js"',
  'customer community mobile script version',
)

const serverAnchor = "      if (url.pathname === '/customer-community-mobile-v376.js' && req.method === 'GET') {"
const serverRoute = `      if (url.pathname === '/customer-community-mobile-v377.js' && req.method === 'GET') {
        res.statusCode = 200
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8')
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
        res.setHeader('X-Content-Type-Options', 'nosniff')
        res.end(fs.readFileSync(path.join(dir, 'public', 'customer-community-mobile-v377.js')))
        return
      } /* customer-community-mobile-runtime-v377 */
`
server = replaceOnce(server, serverAnchor, serverRoute + serverAnchor, 'customer community v377 server route')

fs.writeFileSync(pagePath, page)
fs.writeFileSync(serverPath, server)
