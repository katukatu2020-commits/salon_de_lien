import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
const root=process.env.LIEN_RUNTIME_ROOT||'/app', source=path.dirname(fileURLToPath(import.meta.url))
const read=f=>fs.readFileSync(path.join(root,f),'utf8'), write=(f,v)=>fs.writeFileSync(path.join(root,f),v)
function replace(value,from,to,count=1){if(value.split(from).length!==count+1)throw Error('Unexpected anchor: '+from);return value.split(from).join(to)}
for(const [from,to] of [['workspace.cjs','dealer-workspace-v688.js'],['workspace.js','public/dealer-workspace-v688.js'],['workspace.css','public/dealer-workspace-v688.css']])write(to,fs.readFileSync(path.join(source,from),'utf8'))
let service=read('wholesale-ordering-v543.js')
const start=service.indexOf("function dealerPortalPage(dealer, initialView = 'orders') {"),end=service.indexOf('\nfunction dateJa(',start)
if(start<0||end<0)throw Error('Portal boundaries missing')
service=service.slice(0,start)+`function dealerPortalPage(dealer, initialView = 'orders', custom = {}) {
  return require('./dealer-workspace-v688.js').render({dealer,view:initialView,head:sharedHead('ディーラー管理'),icon,escapeHtml,...custom})
}
`+service.slice(end)
service=replace(service,'module.exports = { createWholesaleOrderingService,','module.exports = { dealerWorkspacePage: dealerPortalPage, createWholesaleOrderingService,')
write('wholesale-ordering-v543.js',service)
// Version only the dealer clients. The salon client and all existing asset URLs stay intact.
for(const [input,output] of [['wholesale-ordering-client-v543.js','public/dealer-catalog-v688.js'],['public/dealer-order-entry-v687.js','public/dealer-orders-v688.js']]){
  let client=read(input)
  client=replace(client,'root.innerHTML = dealerCodePanel() + content +','root.innerHTML = content +')
  client=replace(client,'root.innerHTML = dealerCompany()','root.innerHTML = dealerCodePanel() + dealerCompany()')
  client=replace(client,'美容室との連携に使う固有コード','ディーラー固有コード')
  client=replace(client,'<p>美容室側の「在庫管理・発注」で、このコードを入力してもらってください。</p>','')
  client=replace(client,'<h2>商品を登録</h2><p>登録後、「契約価格」で美容室ごとの取扱と割引率を設定すると発注画面へ公開されます。</p>','<h2>商品一覧</h2>')
  client=replace(client,'</header><form id="dealer-product-form"','</header><details class="dw-product-create"><summary>商品を登録</summary><form id="dealer-product-form"')
  client=replace(client,"'商品を登録</button></div></form>'","'商品を登録</button></div></form></details>'")
  if(output.includes('dealer-orders'))client=replace(client,'<section class="oa-cutoff" data-order-cutoff-v687></section>','<details class="dw-cutoff"><summary>発注の変更・キャンセル締切</summary><section class="oa-cutoff" data-order-cutoff-v687></section></details>')
  write(output,client)
}
// Reuse the exact managed-password fields, validation and eye buttons in the shared shell.
let approvals=read('business-account-approvals-v643.js')
const a=approvals.indexOf('function dealerPasswordPortalPageV653('),b=approvals.indexOf('\nfunction passwordPage(',a)
if(a<0||b<0)throw Error('Password boundaries missing')
let password=approvals.slice(a,b)
const navStart=password.indexOf('  const nav = ['),navEnd=password.indexOf('  const status = initial')
if(navStart<0||navEnd<0)throw Error('Password nav missing')
password=password.slice(0,navStart)+password.slice(navEnd)
const bodyStart=password.indexOf("    '<section class=\"wo-workspace wo-password-workspace-v653\""),bodyEnd=password.indexOf("</main></div></div>' +",bodyStart)
const scriptStart=password.indexOf('<script>(function(){var eye='),scriptEnd=password.indexOf('</script>',scriptStart)
if(bodyStart<0||bodyEnd<0||scriptStart<0||scriptEnd<0)throw Error('Password content missing')
const content=password.slice(bodyStart,bodyEnd)+"'"
const scripts="'"+password.slice(scriptStart,scriptEnd+9)+"'"
password=password.slice(0,password.indexOf("  return '<!doctype"))+`  const content = ${content.trim()}
  const scripts = ${scripts}
  return require('./wholesale-ordering-v543.js').dealerWorkspacePage({name:access.accountName||access.loginId,role:'ADMIN'},'password',{content,scripts})
}
`
approvals=approvals.slice(0,a)+password+approvals.slice(b)
write('business-account-approvals-v643.js',approvals)
let server=read('server.js')
const marker="      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Order-Amendment-Cutoff','v687')"
server=replace(server,marker,marker+"\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Dealer-Workspace','v688')")
write('server.js',server)
console.log('v688 installed: six-group dealer workspace, contextual tabs, five-item mobile navigation')
