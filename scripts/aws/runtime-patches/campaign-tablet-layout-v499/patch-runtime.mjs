import fs from 'node:fs'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const campaignPath = `${root}/customer-campaigns-v427.js`
const serverPath = `${root}/server.js`

function replaceExact(source, before, after, expected, label) {
  const count = source.split(before).length - 1
  if (count !== expected) throw new Error(`${label}: expected ${expected} match(es), found ${count}`)
  return source.replace(before, after)
}

let campaign = fs.readFileSync(campaignPath, 'utf8')
campaign = replaceExact(
  campaign,
  "'use strict'\n\n/* storewide-campaigns-v498 */\n",
  "'use strict'\n\n/* storewide-campaigns-v498 */\n/* campaign-tablet-layout-v499 */\n",
  1,
  'runtime marker',
)

campaign = replaceExact(
  campaign,
  `@media(max-width:767px){
html,body{min-width:0!important;overflow-x:hidden!important}`,
  `@media(min-width:768px) and (max-width:1099px){
html.ca-admin-pc-shell:has([data-campaign-admin]),html.ca-admin-pc-shell:has([data-campaign-admin]) body{min-width:0!important;max-width:100%!important;overflow-x:hidden!important}
html.ca-admin-pc-shell:has([data-campaign-admin]) body .admin-app-shell.admin-staff-unified-v48{width:100%!important;min-width:0!important;max-width:100%!important;overflow-x:hidden!important}
html.ca-admin-pc-shell:has([data-campaign-admin]) body .admin-app-shell.admin-staff-unified-v48>[data-campaign-stage]{width:100%!important;min-width:0!important;max-width:100%!important}
html.ca-admin-pc-shell:has([data-campaign-admin]) body main.admin-main-content{min-width:0!important;max-width:100%!important;overflow-x:hidden!important}
}
@media(max-width:767px){
html,body{min-width:0!important;overflow-x:hidden!important}`,
  1,
  'campaign tablet width reset',
)
fs.writeFileSync(campaignPath, campaign)

let server = fs.readFileSync(serverPath, 'utf8')
server = replaceExact(
  server,
  "      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Storewide-Campaigns', 'v498')",
  "      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Storewide-Campaigns', 'v498')\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Campaign-Tablet-Layout', 'v499')",
  1,
  'readiness marker',
)
fs.writeFileSync(serverPath, server)

console.log('campaign-tablet-layout-v499 patched')
