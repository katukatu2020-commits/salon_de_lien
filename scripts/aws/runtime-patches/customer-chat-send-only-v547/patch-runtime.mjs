import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const marker = 'customer-chat-send-only-v547'
const workflowPath = path.join(root, 'ui-workflows-v294.js')
const serverPath = path.join(root, 'server.js')
const nextRoot = path.join(root, '.next')
const customerChunkRoot = path.join(nextRoot, 'static', 'chunks', 'app', 'u', '(account)')

function replaceExact(source, before, after, expected, label) {
  const count = source.split(before).length - 1
  if (count !== expected) throw new Error(`${label}: expected ${expected} matches, found ${count}`)
  return source.split(before).join(after)
}

let workflow = fs.readFileSync(workflowPath, 'utf8')
if (workflow.includes(marker)) throw new Error(`${marker}: patch already applied`)

const legacyChatControlsLoader = `    if (!document.querySelector('script[data-content-edit-delete-v465]')) { const script = document.createElement('script'); script.src = '/content-edit-delete-client-v466.js'; script.defer = true; script.dataset.contenteditdeletev465 = '1'; document.head.appendChild(script) } /* content-edit-delete-v465 */`
workflow = replaceExact(
  workflow,
  legacyChatControlsLoader,
  `    window.__orimiaCustomerChatSendOnlyV547 = true /* ${marker} */
    document.querySelectorAll('script[src*="/content-edit-delete-client-v466.js"]').forEach(script => script.remove())`,
  1,
  'legacy customer chat control loader',
)

workflow = replaceExact(
  workflow,
  '.lien-chat-v294__message-read{font-size:9px}',
  '.lien-chat-v294__message-read{font-size:9px}.lien-chat-v294 .lien-chat-message-actions,.lien-chat-v294 [data-lien-chat-edit],.lien-chat-v294 [data-lien-chat-cancel]{display:none!important}',
  1,
  'customer chat action visibility guard',
)

workflow = replaceExact(
  workflow,
  'data-lien-chat-can-edit="${String(Boolean(message.canEdit))}"',
  'data-lien-chat-can-edit="false" data-lien-chat-customer-read-only="v547"',
  1,
  'customer chat message ownership attributes',
)

workflow = replaceExact(
  workflow,
  `    const resizeObserver = new ResizeObserver(sync)
    resizeObserver.observe(main)
    addEventListener('resize', sync, { passive: true })
    portal.addEventListener('lien:customer-chat-cleanup', () => {
      resizeObserver.disconnect()
      removeEventListener('resize', sync)
    }, { once: true })`,
  `    const resizeObserver = new ResizeObserver(sync)
    resizeObserver.observe(main)
    addEventListener('resize', sync, { passive: true })

    const enforceCustomerChatReadOnly = () => {
      portal.querySelectorAll('[data-lien-chat-message]').forEach(row => {
        row.setAttribute('data-lien-chat-can-edit', 'false')
        row.removeAttribute('data-lien-chat-delete-on-dblclick')
      })
      portal.querySelectorAll('.lien-chat-message-actions,[data-lien-chat-edit],[data-lien-chat-cancel]').forEach(action => action.remove())
    }
    const readOnlyObserver = new MutationObserver(enforceCustomerChatReadOnly)
    readOnlyObserver.observe(portal, { childList: true, subtree: true })
    enforceCustomerChatReadOnly()

    portal.addEventListener('lien:customer-chat-cleanup', () => {
      resizeObserver.disconnect()
      readOnlyObserver.disconnect()
      removeEventListener('resize', sync)
    }, { once: true })`,
  1,
  'customer chat read-only observer',
)

workflow += `\n/* ${marker} */\n`
fs.writeFileSync(workflowPath, workflow)

const oldLayoutName = 'layout-customer-mobile-nav-v425.navigation-privacy-v546.js'
const newLayoutName = 'layout-customer-mobile-nav-v425.chat-send-only-v547.js'
const oldLayoutPath = path.join(customerChunkRoot, oldLayoutName)
const newLayoutPath = path.join(customerChunkRoot, newLayoutName)
let customerLayout = fs.readFileSync(oldLayoutPath, 'utf8')
customerLayout = replaceExact(
  customerLayout,
  '/ui-workflows-v294.js?v=393',
  '/ui-workflows-v294.js?v=547-send-only1',
  1,
  'customer workflow cache revision',
)
customerLayout += `\n/* ${marker} */\n`
fs.writeFileSync(newLayoutPath, customerLayout)

let server = fs.readFileSync(serverPath, 'utf8')
server = replaceExact(
  server,
  `const CUSTOMER_LAYOUT_REFRESHED_CHUNK_V508 = 'static/chunks/app/u/(account)/${oldLayoutName}'`,
  `const CUSTOMER_LAYOUT_REFRESHED_CHUNK_V508 = 'static/chunks/app/u/(account)/${newLayoutName}'`,
  1,
  'customer account layout cache revision',
)
const previousReady = `      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Customer-Navigation-Privacy', 'v546') /* customer-navigation-privacy-v546 */`
server = replaceExact(
  server,
  previousReady,
  `${previousReady}\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Customer-Chat-Send-Only', 'v547') /* ${marker} */`,
  1,
  'customer chat readiness marker',
)
server += `\n/* ${marker} */\n`
fs.writeFileSync(serverPath, server)

console.log(JSON.stringify({ release: marker, patched: true }))
