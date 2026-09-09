import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const root = process.env.LIEN_RUNTIME_ROOT
if (!root) throw new Error('LIEN_RUNTIME_ROOT must point at a patched local runtime')
const require = createRequire(path.resolve(root, 'package.json'))
const { handlePublicSiteRequest } = require(path.resolve(root, 'public-site.js'))
const brandRoot = path.resolve('public/brand')
const mime = { '.png':'image/png', '.jpg':'image/jpeg', '.webp':'image/webp' }
process.env.BILLING_ONBOARDING_ENABLED = 'true'
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1')
  if (handlePublicSiteRequest(req, res, url)) return
  if (['GET','HEAD'].includes(req.method) && /^\/brand\/[a-z0-9-]+\.(png|jpg|webp)$/.test(url.pathname)) {
    const file = path.join(brandRoot, path.basename(url.pathname))
    if (fs.existsSync(file)) {
      res.setHeader('Content-Type', mime[path.extname(file)])
      res.end(req.method === 'HEAD' ? undefined : fs.readFileSync(file))
      return
    }
  }
  if (['/u/login','/u/register','/admin/login','/admin/register','/dealer/login','/dealer/register'].includes(url.pathname)) {
    res.writeHead(302, { Location:'https://salon-de-lien.com' + url.pathname })
    res.end()
    return
  }
  res.writeHead(404, { 'Content-Type':'text/plain; charset=utf-8' })
  res.end('Not found')
})
const port = Number(process.env.PORT || 3588)
server.listen(port, '127.0.0.1', () => console.log(`Public site preview: http://127.0.0.1:${port}`))
