import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const source = path.dirname(fileURLToPath(import.meta.url))
const read = name => fs.readFileSync(path.join(root, name), 'utf8')
const write = (name, value) => fs.writeFileSync(path.join(root, name), value)
function replace(value, before, after, count = 1) {
  if (value.split(before).length - 1 !== count) throw Error('Unexpected parent anchor: ' + before)
  return value.replaceAll(before, after)
}
const require = createRequire(path.join(root, 'package.json'))
const React = require('react'), { renderToStaticMarkup } = require('react-dom/server'), icons = require('lucide-react')
const markup = Object.fromEntries(['Search', 'Send', 'MessageSquare', 'RefreshCw', 'ArrowLeft', 'ChevronLeft', 'ChevronRight', 'ChevronDown'].map(name => [name, renderToStaticMarkup(React.createElement(icons[name], { size: 20, 'aria-hidden': true }))]))
write('dealer-erp-v678-partner-chat-v682.js', fs.readFileSync(path.join(source, 'partner-chat.js'), 'utf8'))
write('dealer-erp-v678-partner-chat-client-v682.js', 'window.PartnerChatIcons=' + JSON.stringify(markup) + ';\n' + fs.readFileSync(path.join(source, 'partner-chat-client.js'), 'utf8'))
write('dealer-erp-v678-partner-chat-v682.css', fs.readFileSync(path.join(source, 'partner-chat.css'), 'utf8'))
const clientURL = '/dealer-erp-v678-partner-chat-client-v682.js?v=682-1'
const cssURL = '/dealer-erp-v678-partner-chat-v682.css?v=682-1'
let server = read('dealer-erp-v678.js')
server = replace(server, '  const actions = { warehouse:', `  const partnerChat = require('./dealer-erp-v678-partner-chat-v682').createPartnerChat({ db, crypto, actor, scope, fail, text, num, clean })
  const actions = { 'chat-send': partnerChat.send, 'chat-read': partnerChat.read, warehouse:`)
server = replace(server, "!['thread', 'message', 'read'].includes(action)", "!['thread', 'message', 'read', 'chat-send', 'chat-read'].includes(action)")
server = replace(server, "!['options', 'threads', 'messages', 'unread'].includes(name)", "!['options', 'threads', 'messages', 'unread', 'chat-partners', 'chat-messages'].includes(name)")
server = replace(server, 'const getters = { options,', "const getters = { 'chat-partners': partnerChat.partners, 'chat-messages': partnerChat.messages, options,")
server = replace(server, 'unread: (s,q) => threads(s,q,true)', 'unread: async (s,q) => ({ unread: (await partnerChat.partners(s,new URLSearchParams())).counts.unreadMessages })')
server = replace(server, '} else if (t.organizationId) await contract(tx, s, t.organizationId)', "} else if (t.organizationId) { if ((await contract(tx, s, t.organizationId)).status !== 'ACTIVE') fail('契約中の取引先ではありません。', 403) }")
server = replace(server, '  function page(s, view) {', `  function page(s, view) {
    if (view === 'messages') {
      if (s.salon) return \`<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>ディーラーとのチャット | ORIMIA</title><link rel="icon" href="/brand/orimia-icon-32.png"><link rel="stylesheet" href="/wholesale-ordering-v543.css?v=659-product-search-filters1"><link rel="stylesheet" href="${cssURL}"></head><body class="wo-body" data-erp-salon="\${esc(s.id)}"><header class="pc-salon-head"><a href="/admin/products/orders"><img src="/brand/orimia-icon-192.png" alt=""><strong>ORIMIA for Salon</strong></a><a href="/admin/products/orders">在庫管理・発注へ戻る</a></header><main class="pc-salon-main"><h1>ディーラーとのチャット</h1><div id="wholesale-app"></div></main><script src="${clientURL}" defer></script></body></html>\`
      return h.portal(s, view).replace('/wholesale-ordering-client-v543.js?v=678-erp1', '${clientURL}').replace('</head>', '<link rel="stylesheet" href="${cssURL}"></head>')
    }`)
server = replace(server, 'const assets = { ', `const assets = { '/dealer-erp-v678-partner-chat-client-v682.js': 'application/javascript', '/dealer-erp-v678-partner-chat-v682.css': 'text/css', '/dealer-erp-v678-order-entry-v682.js': 'application/javascript', '/dealer-erp-v678-nav.partner-chat-v682.js': 'application/javascript', `)
write('dealer-erp-v678.js', server)
let wholesale = read('wholesale-ordering-v543.js')
wholesale = replace(wholesale, "messages: { title: '連絡'", "messages: { title: '契約サロンとのチャット'")
wholesale = replace(wholesale, "['messages', '/dealer/messages', 'users', '連絡']", "['messages', '/dealer/messages', 'users', 'サロンチャット']")
wholesale = replace(wholesale, '/dealer-erp-v678-nav.js?v=1', '/dealer-erp-v678-nav.partner-chat-v682.js?v=682-1')
write('wholesale-ordering-v543.js', wholesale)
let nav = replace(read('dealer-erp-v678-nav.js'), "['messages','連絡']", "['messages','サロンチャット']")
nav = replace(nav, '  unread()\n', "  window.addEventListener('orimia:partner-chat-read', unread)\n  unread()\n")
write('dealer-erp-v678-nav.partner-chat-v682.js', nav)
let entry = read('wholesale-ordering-client-v543.js')
entry = replace(entry, '\">取引先へ連絡</a></span>\'', '\" class="wo-button" style="display:inline-flex;align-items:center;gap:6px;margin-top:8px;min-height:44px;padding:8px 12px;border-radius:6px;font-size:14px">' + markup.MessageSquare.replaceAll("'", '&#39;') + 'チャットを開く</a></span>\'')
write('dealer-erp-v678-order-entry-v682.js', entry)
const layout = 'public/inventory-orders-common-layout-v572.hydration-v680.js'
write('public/inventory-orders-common-layout-v572.partner-chat-v682.js', replace(read(layout), '/wholesale-ordering-client-v543.js?v=641-search-input-stability1', '/dealer-erp-v678-order-entry-v682.js?v=682-1'))
let app = replace(read('server.js'), '/inventory-orders-common-layout-v572.hydration-v680.js?v=641-search-input-stability1', '/inventory-orders-common-layout-v572.partner-chat-v682.js?v=682-1')
const marker = "      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Dealer-Stock-Note', 'v681') /* dealer-stock-note-v681 */"
app = replace(app, marker, marker + "\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Partner-Chat', 'v682') /* partner-chat-v682 */")
write('server.js', app)
console.log('v682: contract partner chat, retained history, scoped APIs, dedicated dealer/salon screens')
