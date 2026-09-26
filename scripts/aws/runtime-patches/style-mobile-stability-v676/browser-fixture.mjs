import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const assets = new Set(['content-edit-delete-client-v615.js', 'style-admin-controls-v618.js', 'style-admin-controls-v618.css', 'style-order-focus-stability-v667.js', 'mobile-workspaces-v657.css'])
const html = `<!doctype html><html lang="ja" data-orimia-ui-ready="v516"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;color:#332d2a;background:#fffafa;font:16px Arial,sans-serif}main{max-width:1400px;margin:auto;padding:16px}*{box-sizing:border-box}input:focus{outline:3px solid #dbaea1!important;outline-offset:3px!important}input{border:1px solid #eaded9!important;border-radius:12px!important}button,input{font:inherit}</style><link rel="stylesheet" href="/style-admin-controls-v618.css"><link rel="stylesheet" href="/mobile-workspaces-v657.css"><script src="/style-admin-controls-v618.js" defer></script><script src="/style-order-focus-stability-v667.js" defer></script><script src="/content-edit-delete-client-v615.js" defer></script></head><body><main><h1>スタイル投稿</h1><section class="orimia-style-admin-v618" data-orimia-style-list-shell-v640="true"></section></main></body></html>`
http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost')
  const name = url.pathname.slice(1)
  if (assets.has(name) || /^demo\/showcase\/styles\/style-\d+\.png$/.test(name)) {
    const file = path.join(root, 'public', name)
    if (!fs.existsSync(file)) { res.writeHead(404).end(); return }
    res.setHeader('Content-Type', name.endsWith('.js') ? 'text/javascript' : name.endsWith('.css') ? 'text/css' : 'image/png')
    fs.createReadStream(file).pipe(res)
    return
  }
  if (url.pathname === '/admin/community') { res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end(html); return }
  res.writeHead(404).end()
}).listen(Number(process.env.PORT || 3180), '0.0.0.0', () => console.log('V676_BROWSER_READY'))
