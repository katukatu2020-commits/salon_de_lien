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
for (const file of ['salon-group-master-v672.js', 'salon-group-master-v672-page.js', 'salon-group-master-v672-client.js', 'salon-group-master-v672.css']) fs.copyFileSync(path.join(source, file), path.join(root, file))
fs.copyFileSync(path.join(source, 'schema.sql'), path.join(root, 'salon-group-master-v672.sql'))
replace('server.js', '}) /* business-account-approvals-v643-service */', `}) /* business-account-approvals-v643-service */
const salonGroupMasterV672 = require('./salon-group-master-v672').createSalonGroupMaster({ prisma, crypto, sessionProvider: req => chatSession(req, 'staff'), mailSender: sendBusinessAccountMailV643 }) /* salon-group-master-v672-service */`)
replace('server.js', "  await storeProfile.ensureSchema() /* orimia-store-directory-v670-schema */", "  await storeProfile.ensureSchema() /* orimia-store-directory-v670-schema */\n  await salonGroupMasterV672.ensureSchema() /* salon-group-master-v672-schema */")
replace('server.js', "      if (await businessAccountApprovalsV643.handle(req, res, url)) return /* business-account-approvals-v643-route */", "      if (await businessAccountApprovalsV643.handle(req, res, url)) return /* business-account-approvals-v643-route */\n      if (await salonGroupMasterV672.handle(req, res, url)) return /* salon-group-master-v672-route */")
replace('server.js', "  if (pathname === '/admin/register') return output /* store-registration-layout-v592: standalone shared auth layout */", `  if (pathname === '/admin/salon-master') return output /* salon-group-master-v672: complete server-rendered workspace */
  if (pathname === '/admin/settings' && !output.includes('salon-group-master-v672-client')) {
    output = output.replace('</head>', '<link rel="stylesheet" href="/salon-group-master-v672.css?v=672-1"><script src="/salon-group-master-v672-client.js?v=672-1" defer></script></head>')
  }
  if (pathname === '/admin/register') return output /* store-registration-layout-v592: standalone shared auth layout */`)
replace('server.js', "      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Dealer-Sales-Team', 'v671') /* dealer-sales-team-v671-ready */", "      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Dealer-Sales-Team', 'v671') /* dealer-sales-team-v671-ready */\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Salon-Group-Master', 'v672') /* salon-group-master-v672-ready */")
console.log('Salon group master v672 runtime patched')
