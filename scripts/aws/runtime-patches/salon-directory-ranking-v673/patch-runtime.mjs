import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const source = path.dirname(fileURLToPath(import.meta.url))
function replace(file, before, after) {
  const target = path.join(root, file), content = fs.readFileSync(target, 'utf8')
  if (content.split(before).length !== 2) throw new Error(`Unexpected parent anchor ${file}: ${before.slice(0, 140)}`)
  fs.writeFileSync(target, content.replace(before, after))
}
for (const file of ['salon-directory-ranking-v673.js', 'salon-directory-ranking-v673-client.js', 'salon-directory-ranking-v673.css']) fs.copyFileSync(path.join(source, file), path.join(root, file))
replace('orimia-store-directory-v670.js', '  ...baseMembership,', '  ...baseMembership,\n  PREFECTURES,')
replace('customer-links-v293.js', "require('./orimia-store-directory-v670.js') /* orimia-store-directory-v670 */", "require('./salon-directory-ranking-v673.js') /* salon-directory-ranking-v673 */")
replace('server.js', "      if (url.pathname === '/customer-link-ui-v424.js' && req.method === 'GET') {", `      if (req.method === 'GET' && ['/salon-directory-ranking-v673-client.js', '/salon-directory-ranking-v673.css'].includes(url.pathname)) {
        res.setHeader('Content-Type', url.pathname.endsWith('.css') ? 'text/css; charset=utf-8' : 'application/javascript; charset=utf-8')
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
        res.setHeader('X-Content-Type-Options', 'nosniff')
        res.end(fs.readFileSync(path.join(dir, url.pathname.slice(1))))
        return
      } /* salon-directory-ranking-v673-assets */
      if (url.pathname === '/customer-link-ui-v424.js' && req.method === 'GET') {`)
replace('server.js', "      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Salon-Group-Master', 'v672') /* salon-group-master-v672-ready */", "      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Salon-Group-Master', 'v672') /* salon-group-master-v672-ready */\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Salon-Directory-Ranking', 'v673') /* salon-directory-ranking-v673-ready */")
console.log('Salon directory ranking v673 runtime patched')
