import fs from 'node:fs'
import path from 'node:path'
import http from 'node:http'
import { verifyRegistration } from './browser-regression.mjs'
const root = process.env.REGISTRATION_ASSET_ROOT || 'artifacts/store-registration-layout-v592/assets'
const assets = new Map([
  ['/wholesale-ordering-v543.css', ['wholesale-ordering-v543.css', 'text/css']],
  ['/store-registration-v592.css', ['store-registration-v592.css', 'text/css']],
  ...['salon-interior.jpg', 'salon-product-shelf.jpg', 'orimia-icon-192.png', 'orimia-icon-32.png'].map(name => ['/brand/' + name, [name, name.endsWith('.png') ? 'image/png' : 'image/jpeg']]),
])
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost')
  if (req.method !== 'GET') { res.writeHead(405); res.end(); return }
  let file, type
  if (url.pathname === '/admin/register') {
    const state = url.searchParams.get('fixture') === 'setup' ? 'setup' : url.searchParams.has('token') ? 'expired' : url.searchParams.has('error') ? 'error' : url.searchParams.has('sent') ? 'sent' : url.searchParams.has('registered') ? 'registered' : 'entry'
    file = 'fixtures/' + state + '.html'; type = 'text/html; charset=utf-8'
  } else if (url.pathname === '/dealer/register') { file = 'fixtures/dealer.html'; type = 'text/html; charset=utf-8' }
  else if (assets.has(url.pathname)) [file, type] = assets.get(url.pathname)
  else { res.writeHead(404); res.end(); return }
  res.writeHead(200, { 'Content-Type': type })
  res.end(fs.readFileSync(path.join(root, file)))
})
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
try { await verifyRegistration('http://127.0.0.1:' + server.address().port, { fixtures: true }) }
finally { await new Promise(resolve => server.close(resolve)) }
