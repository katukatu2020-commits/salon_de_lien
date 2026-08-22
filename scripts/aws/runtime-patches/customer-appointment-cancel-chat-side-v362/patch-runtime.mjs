import fs from 'node:fs'
import path from 'node:path'

function replaceOnce(source, label, before, after) {
  const count = source.split(before).length - 1
  if (count !== 1) throw new Error(`${label}: expected exactly one match, found ${count}`)
  return source.replace(before, after)
}

const serverPath = '/app/server.js'
let server = fs.readFileSync(serverPath, 'utf8')
server = replaceOnce(
  server,
  'customer cancellation service require',
  "const { createAppointmentOperationsService } = require('./appointment-operations-v267')",
  "const { createAppointmentOperationsService } = require('./appointment-operations-v267')\nconst { createCustomerAppointmentCancellationService } = require('./customer-appointment-cancellation-v362') /* customer-appointment-cancellation-v362-require */",
)
server = replaceOnce(
  server,
  'customer cancellation service initialization',
  "const app = next({ dev: false, dir, conf: nextConfig })",
  "const customerAppointmentCancellation = createCustomerAppointmentCancellationService({ prisma, crypto, sessionProvider: req => chatSession(req, 'customer') }) /* customer-appointment-cancellation-v362-service */\n\nconst app = next({ dev: false, dir, conf: nextConfig })",
)
server = replaceOnce(
  server,
  'customer cancellation route',
  "      if (await customerWithdrawal.handle(req, res, url)) return /* verified-customer-withdrawal-v309-route */",
  "      if (await customerWithdrawal.handle(req, res, url)) return /* verified-customer-withdrawal-v309-route */\n      if (await customerAppointmentCancellation.handle(req, res, url)) return /* customer-appointment-cancellation-v362-route */",
)
fs.writeFileSync(serverPath, server)

const workflowPath = '/app/ui-workflows-v294.js'
let workflow = fs.readFileSync(workflowPath, 'utf8')
const oldChatCss = '.lien-chat-v294__messages{display:flex;min-height:380px;flex:1;flex-direction:column;gap:12px;overflow:auto;padding:20px}.lien-chat-v294__date{display:flex;width:100%;align-items:center;justify-content:center;padding:4px 0}.lien-chat-v294__date span{border-radius:999px;background:#b8afa7;padding:4px 12px;color:#fff;font-size:11px;font-weight:600;line-height:1.4}.lien-chat-v294__message-row{display:flex;max-width:min(82%,620px);align-self:flex-end;align-items:flex-end;gap:8px;flex-direction:row-reverse}.lien-chat-v294__message-row.mine{align-self:flex-start;flex-direction:row}.lien-chat-v294__message{border-radius:17px 17px 5px 17px;background:#f3ede7;padding:11px 14px;color:#2f2a25;font-size:13px;line-height:1.75;white-space:pre-wrap;overflow-wrap:anywhere}.lien-chat-v294__message-row.mine .lien-chat-v294__message{border-radius:17px 17px 17px 5px;background:#8f4f42;color:#fff}.lien-chat-v294__message-meta{display:flex;flex:0 0 auto;flex-direction:column;align-items:flex-end;padding-bottom:2px;color:#8b7c73;font-size:10px;line-height:1.35;white-space:nowrap}.lien-chat-v294__message-row.mine .lien-chat-v294__message-meta{align-items:flex-start}.lien-chat-v294__message-read{font-size:9px}'
const newChatCss = '.lien-chat-v294__messages{display:flex;min-height:380px;flex:1;flex-direction:column;gap:12px;overflow:auto;padding:20px}.lien-chat-v294__date{display:flex;width:100%;align-items:center;justify-content:center;padding:4px 0}.lien-chat-v294__date span{border-radius:999px;background:#b8afa7;padding:4px 12px;color:#fff;font-size:11px;font-weight:600;line-height:1.4}.lien-chat-v294__message-row{display:flex;max-width:min(82%,620px);align-self:flex-start;align-items:flex-end;gap:8px;flex-direction:row}.lien-chat-v294__message-row.mine{align-self:flex-end;flex-direction:row-reverse}.lien-chat-v294__message{border-radius:17px 17px 17px 5px;background:#f3ede7;padding:11px 14px;color:#2f2a25;font-size:13px;line-height:1.75;white-space:pre-wrap;overflow-wrap:anywhere}.lien-chat-v294__message-row.mine .lien-chat-v294__message{border-radius:17px 17px 5px 17px;background:#8f4f42;color:#fff}.lien-chat-v294__message-meta{display:flex;flex:0 0 auto;flex-direction:column;align-items:flex-start;padding-bottom:2px;color:#8b7c73;font-size:10px;line-height:1.35;white-space:nowrap}.lien-chat-v294__message-row.mine .lien-chat-v294__message-meta{align-items:flex-end}.lien-chat-v294__message-read{font-size:9px}'
workflow = replaceOnce(workflow, 'customer chat side restoration', oldChatCss, newChatCss)
const appointmentClient = fs.readFileSync('/tmp/customer-appointment-cancel-client-v362.js', 'utf8')
if (workflow.includes('__lienCustomerAppointmentCancelV362')) throw new Error('customer appointment client is already present')
workflow += `\n${appointmentClient}\n`
fs.writeFileSync(workflowPath, workflow)

const appointmentServerPath = '/app/.next/server/app/u/(account)/appointments/page.js'
const staticDirectory = '/app/.next/static/chunks/app/u/(account)/appointments'
const appointmentClientPath = path.join(staticDirectory, fs.readdirSync(staticDirectory).find(name => name.endsWith('.js')))
for (const target of [appointmentServerPath, appointmentClientPath]) {
  let source = fs.readFileSync(target, 'utf8')
  source = replaceOnce(
    source,
    `appointment card identity in ${target}`,
    '("div",{className:"rounded-2xl bg-[#f6efe6] px-4 py-3",children:',
    '("div",{"data-customer-appointment-id":e.id,className:"rounded-2xl bg-[#f6efe6] px-4 py-3",children:',
  )
  fs.writeFileSync(target, source)
}

const homePath = '/app/.next/server/app/u/(account)/home/page.js'
let home = fs.readFileSync(homePath, 'utf8')
home = replaceOnce(
  home,
  'home next appointment identity',
  '"section",{className:"rounded-[20px] border border-[#b8d5bf] bg-[#edf7ef] p-5",children:',
  '"section",{"data-customer-next-appointment-id":j.id,className:"rounded-[20px] border border-[#b8d5bf] bg-[#edf7ef] p-5",children:',
)
fs.writeFileSync(homePath, home)

// Publish the customer layout under a new immutable chunk name as well as
// changing the workflow query. This prevents an existing browser cache from
// keeping the pre-v362 workflow after deployment.
const customerLayoutDirectory = '/app/.next/static/chunks/app/u/(account)'
const previousCustomerLayoutName = 'layout-customer-stability-v298.js'
const currentCustomerLayoutName = 'layout-customer-stability-v362.js'
const previousCustomerLayoutPath = path.join(customerLayoutDirectory, previousCustomerLayoutName)
const currentCustomerLayoutPath = path.join(customerLayoutDirectory, currentCustomerLayoutName)
let customerLayout = fs.readFileSync(previousCustomerLayoutPath, 'utf8')
customerLayout = replaceOnce(
  customerLayout,
  'customer workflow cache key',
  'ui-workflows-v294.js?v=296-1',
  'ui-workflows-v294.js?v=362',
)
fs.writeFileSync(currentCustomerLayoutPath, customerLayout)

function replaceManifestChunkReference(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      replaceManifestChunkReference(target)
      continue
    }
    if (!entry.isFile() || !/\.(?:json|js)$/.test(entry.name)) continue
    let source = fs.readFileSync(target, 'utf8')
    if (!source.includes(previousCustomerLayoutName)) continue
    source = source.split(previousCustomerLayoutName).join(currentCustomerLayoutName)
    fs.writeFileSync(target, source)
  }
}

replaceManifestChunkReference('/app/.next')
