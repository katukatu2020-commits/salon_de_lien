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

for (const fileName of ['customer-experience-v504.js', 'customer-experience-v504.css']) {
  fs.copyFileSync(path.join(patchRoot, fileName), path.join(root, fileName))
}

let server = fs.readFileSync(serverPath, 'utf8')

server = replaceExact(
  server,
  "      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Store-Platform', 'v503')",
  "      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Store-Platform', 'v503')\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Customer-Experience', 'v504')",
  1,
  'customer experience readiness header',
)

const oldTransform = `function transformOrimiaHtmlV500(html) { /* store-app-stability-v501 */
  return String(html || '')
}`
const newTransform = `const CUSTOMER_EXPERIENCE_HEAD_V504 = '<link id="customer-experience-style-v504" rel="stylesheet" href="/customer-experience-v504.css?v=504">'
const CUSTOMER_EXPERIENCE_BODY_V504 = '<script id="customer-experience-script-v504" src="/customer-experience-v504.js?v=504" defer></script>'

function transformOrimiaHtmlV500(html, requestUrl) { /* customer-experience-v504 */
  let output = String(html || '')
  const pathname = String(requestUrl || '').split('?')[0]
  if (!pathname.startsWith('/u/')) return output
  if (!output.includes('customer-experience-style-v504')) output = output.replace('</head>', CUSTOMER_EXPERIENCE_HEAD_V504 + '</head>')
  if (!output.includes('customer-experience-script-v504')) output = output.replace('</body>', CUSTOMER_EXPERIENCE_BODY_V504 + '</body>')
  return output
}`
server = replaceExact(server, oldTransform, newTransform, 1, 'customer HTML asset injection')
server = replaceExact(
  server,
  "const body = Buffer.from(transformOrimiaHtmlV500(Buffer.concat(chunks).toString('utf8')))",
  "const body = Buffer.from(transformOrimiaHtmlV500(Buffer.concat(chunks).toString('utf8'), req.url))",
  1,
  'customer HTML request path',
)

const oldRoute = `      if (url.pathname === '/customer-experience-v503.js' && req.method === 'GET') {`
const newRoute = `      if (url.pathname === '/customer-experience-v504.js' && req.method === 'GET') {
        res.statusCode = 200
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8')
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
        res.setHeader('X-Content-Type-Options', 'nosniff')
        res.end(fs.readFileSync(path.join(dir, 'customer-experience-v504.js')))
        return
      }
      if (url.pathname === '/customer-experience-v504.css' && req.method === 'GET') {
        res.statusCode = 200
        res.setHeader('Content-Type', 'text/css; charset=utf-8')
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
        res.setHeader('X-Content-Type-Options', 'nosniff')
        res.end(fs.readFileSync(path.join(dir, 'customer-experience-v504.css')))
        return
      }
      if (url.pathname === '/customer-experience-v503.js' && req.method === 'GET') {`
server = replaceExact(server, oldRoute, newRoute, 1, 'customer experience asset routes')

fs.writeFileSync(serverPath, server)
console.log('[customer-experience-v504] runtime patched')
