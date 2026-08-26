import fs from 'node:fs'

const serverPath = '/app/server.js'
const workflowPath = '/app/ui-workflows-v294.js'
const commercialPath = '/app/commercial-admin-v101.js'

function replaceOnce(source, before, after, label) {
  const count = source.split(before).length - 1
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`)
  return source.replace(before, after)
}

function patchFile(file, patcher) {
  const source = fs.readFileSync(file, 'utf8')
  const result = patcher(source)
  if (result === source) throw new Error(`${file}: patch produced no change`)
  fs.writeFileSync(file, result)
}

patchFile(serverPath, source => {
  source = replaceOnce(
    source,
    "const { createCustomerCampaignService } = require('./customer-campaigns-v427') /* customer-campaigns-v427 */",
    "const { createCustomerCampaignService } = require('./customer-campaigns-v427') /* customer-campaigns-v427 */\nconst { createLineReservationService } = require('./line-reservations-v436') /* line-liff-reservations-v436 */",
    'LINE reservation require',
  )
  source = replaceOnce(
    source,
    `const customerCampaigns = createCustomerCampaignService({
  prisma,
  customerSession: req => chatSession(req, 'customer'),
  staffSession: req => chatSession(req, 'staff'),
  json,
  sendCustomerHtml,
  customerShell,
  customerIcon,
  htmlEscape,
  jpDate,
})`,
    `const customerCampaigns = createCustomerCampaignService({
  prisma,
  customerSession: req => chatSession(req, 'customer'),
  staffSession: req => chatSession(req, 'staff'),
  json,
  sendCustomerHtml,
  customerShell,
  customerIcon,
  htmlEscape,
  jpDate,
})
const lineReservations = createLineReservationService({
  prisma,
  crypto,
  staffSession: req => chatSession(req, 'staff'),
  settingsClientScript: fs.readFileSync(path.join(__dirname, 'line-settings-client-v436.js')),
}) /* line-liff-reservations-v436-service */`,
    'LINE reservation initialization',
  )
  source = replaceOnce(
    source,
    '  await communityPublishing.ensureSchema() /* community-publishing-v348-schema */',
    `  await communityPublishing.ensureSchema() /* community-publishing-v348-schema */
  await lineReservations.ensureSchema() /* line-liff-reservations-v436-schema */`,
    'LINE reservation schema startup',
  )
  source = replaceOnce(
    source,
    '      if (handlePublicSiteRequest(req, res, url)) return /* public-review-pages-v46-route */',
    `      if (await lineReservations.handle(req, res, url)) return /* line-liff-reservations-v436-route */
      if (handlePublicSiteRequest(req, res, url)) return /* public-review-pages-v46-route */`,
    'LINE reservation route',
  )
  return source
})

patchFile(workflowPath, source => source + `
;(() => {
  if (window.__lienLineSettingsLoaderV436) return
  window.__lienLineSettingsLoaderV436 = true
  const script = document.createElement('script')
  script.src = '/line-settings-client-v436.js?v=436'
  script.defer = true
  document.head.appendChild(script)
})()
`)

patchFile(commercialPath, source => replaceOnce(
  source,
  "script.src='/ui-workflows-v294.js?v=427'",
  "script.src='/ui-workflows-v294.js?v=436'",
  'admin workflow cache key',
))

console.log('line LIFF reservations v436 runtime patched')
