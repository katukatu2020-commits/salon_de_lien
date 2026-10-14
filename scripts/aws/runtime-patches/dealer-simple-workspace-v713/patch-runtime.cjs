'use strict'
const fs=require('node:fs'),path=require('node:path')
const root=process.env.LIEN_RUNTIME_ROOT||'/app'
const read=f=>fs.readFileSync(path.join(root,f),'utf8')
const write=(f,s)=>fs.writeFileSync(path.join(root,f),s)
function replace(s,from,to,count=1){
  if(s.split(from).length!==count+1)throw Error('Unexpected anchor: '+from.slice(0,140))
  return s.split(from).join(to)
}
function transformFunction(s,name,fn){
  const start=s.indexOf('  function '+name+'('),end=s.indexOf('\n  function ',start+12)
  if(start<0||end<0)throw Error('Missing function '+name)
  return s.slice(0,start)+fn(s.slice(start,end))+s.slice(end)
}
function removeHeader(s){
  const match=s.match(/<header class="wo-workspace-head">[\s\S]*?<\/header>/)
  if(!match)throw Error('Workspace header missing')
  return replace(s,match[0],'')
}
write('dealer-navigation-v713.cjs',fs.readFileSync(path.join(__dirname,'navigation.cjs'),'utf8'))
write('public/dealer-simple-v713.css',fs.readFileSync(path.join(__dirname,'workspace.css'),'utf8'))
write('public/dealer-readonly-v713.js',fs.readFileSync(path.join(__dirname,'readonly.js'),'utf8'))

// Keep the proven shell (dialogs, unread badges, mobile navigation) and change only its layout.
let shell=read('dealer-workspace-v688.js')
const navStart=shell.indexOf('const groups = ['),navEnd=shell.indexOf('function render(')
if(navStart<0||navEnd<0)throw Error('Navigation boundaries missing')
shell=shell.slice(0,navStart)+"const {navigation}=require('./dealer-navigation-v713.cjs')\n"+shell.slice(navEnd)
shell=replace(shell,'navigation(dealer.role)','navigation(dealer)')
shell=replace(shell,'  const tabs =',"  head=head.replace('<script src=\"/dealer-order-flow-v698/addon.js\" defer></script>','')\n  head=head.replace('</head>','<link rel=\"stylesheet\" href=\"/dealer-simple-v713.css\"><script src=\"/dealer-readonly-v713.js\" defer></script></head>')\n  const tabs =")
const tabsLine=shell.split('\n').find(l=>l.startsWith('  const tabs ='))
shell=replace(shell,tabsLine,'')
const shortcutsLine=shell.split('\n').find(l=>l.startsWith('  const shortcuts ='))
shell=replace(shell,shortcutsLine,'')
shell=replace(shell,'${tabs}${shortcuts}','')
shell=replace(shell,'wo-dealer-body dw-body"','wo-dealer-body dw-body dw-simple" data-dealer-role="${esc(dealer.role)}"')
shell=replace(shell,'${menu.map(group=>groupLink(group)).join(\'\')}',`\${menu.map(group=>group.pages.length===1?groupLink(group):\`<details name="dealer-navigation"\${group.id===active.id?' open':''}><summary>\${icon(group.icon)}<span>\${esc(group.label)}</span>\${group.id==='activity'?badge:''}</summary><div>\${group.pages.map(([id,label])=>link(id,label)).join('')}</div></details>\`).join('')}`)
shell=replace(shell,'<span class="dw-context">${esc(active.label)}</span>','')
shell=replace(shell,'<h1>${title}</h1></section>','<h1>${title}</h1>${key===\'salons\'&&dealer.role===\'ADMIN\'?\'<a class="wo-button wo-button-secondary" href="/dealer/procurement?tab=accounts">サロンIDを発行</a>\':\'\'}${key===\'products\'&&dealer.role===\'ADMIN\'&&!content?\'<div class="dpm-entry"><a class="wo-button wo-button-primary" href="/dealer/products/master">マスタから商品を選ぶ</a></div>\':\'\'}</section>')
const mainLine=shell.split('\n').find(l=>l.startsWith('  const main ='))
shell=replace(shell,mainLine,'  const main = content ?? \'<div id="wholesale-app" class="wo-app-root"><div class="wo-loading"><span></span><p>管理情報を読み込んでいます</p></div></div>\'')
shell=replace(shell,"'/dealer-orders-v692.js?v=692-1'","'/dealer-orders-v713.js'")
shell=replace(shell,"'/dealer-catalog-v695.js?v=695-1'","'/dealer-catalog-v713.js'")
shell=replace(shell,"'/dealer-calendar-v696.js?v=696-1'","'/dealer-calendar-v713.js'")
write('dealer-workspace-v713.js',shell)
let service=read('wholesale-ordering-v543.js')
service=replace(service,"require('./dealer-workspace-v688.js').render","require('./dealer-workspace-v713.js').render")
write('wholesale-ordering-v543.js',service)

let orders=read('public/dealer-orders-v692.js')
orders=transformFunction(orders,'dealerOrders',s=>{
  s=removeHeader(s)
  s=replace(s," + dealerStats() + "," + ")
  s=replace(s,"'\">' + filter[1] + '</button>'","'\" aria-pressed=\"' + (dealer.status === filter[0]) + '\">' + filter[1] + '<span class=\"dw-filter-count\">' + dealer.data.orders.filter(function(order){ return filter[0] === 'ALL' || order.status === filter[0] }).length + '</span></button>'")
  return s
})
write('public/dealer-orders-v713.js',orders)

let catalog=read('public/dealer-catalog-v695.js')
catalog=replace(catalog,'root.innerHTML = dealerCodePanel() + dealerCompany()','root.innerHTML = dealerCompany()')
for(const name of ['dealerProducts','dealerContracts','dealerCompany'])catalog=transformFunction(catalog,name,removeHeader)
catalog=transformFunction(catalog,'dealerPricing',s=>{
  s=replace(s,'<div><p class="wo-section-label">SALON-SPECIFIC PRICING</p><h2>美容室別の取扱・割引設定</h2><p>同じ商品でも、美容室との取り決めに合わせて個別の割引率を設定できます。</p></div>','')
  s=replace(s,'<div class="wo-pricing-bulk">',`<details class="dw-details dw-pricing-bulk" ' + (selectedCount ? 'open' : '') + '><summary>割引率を一括設定</summary><div class="wo-pricing-bulk">`)
  s=replace(s,'選択商品へ適用</button></div></div><form','選択商品へ適用</button></div></details></div><form')
  return s
})
catalog=transformFunction(catalog,'dealerContracts',s=>{
  s=replace(s,'<form id="dealer-salon-form"','<details class="dw-product-create"><summary>店舗コードで美容室を登録</summary><form id="dealer-salon-form"')
  s=replace(s,'契約美容室を登録</button></form>','契約美容室を登録</button></form></details>')
  s=replace(s,"<strong>' + esc(contract.organizationName) + '</strong>","<a class=\"dw-salon-link\" href=\"/dealer/salons/' + encodeURIComponent(contract.organizationId) + '\">' + esc(contract.organizationName) + '</a>")
  return s
})
write('public/dealer-catalog-v713.js',catalog)

let calendar=read('public/dealer-calendar-v696.js')
calendar=transformFunction(calendar,'dealerCalendar',s=>{
  s=replace(s,'<p class="wo-section-label">MONTHLY SALES CALENDAR</p><h2>売上カレンダー</h2>','')
  s=replace(s,'<form id="dealer-calendar-plan-form"','<details class="dw-details"><summary>月間目標を編集</summary><form id="dealer-calendar-plan-form"')
  s=replace(s,'目標を保存</button></form></div>','目標を保存</button></form></details></div>')
  return s
})
write('public/dealer-calendar-v713.js',calendar)

let erp=read('dealer-erp-v698-client.js')
erp=transformFunction(erp,'dashboardBody',s=>{
  s=replace(s,'<div class="erp-dashboard-grid">','<details class="dw-details"><summary>売上内訳・目標の詳細</summary><div class="erp-dashboard-grid">')
  s=replace(s,"${isAdmin() ? section('操作履歴'","</details>${isAdmin() ? '<details class=\"dw-details\"><summary>操作履歴</summary>' + section('操作履歴'")
  s=replace(s," : ''}`"," + '</details>' : ''}`")
  return s
})
write('public/dealer-erp-v713-client.js',erp)
let erpServer=read('dealer-erp-v678.js')
erpServer=replace(erpServer,"'/dealer-erp-v698-client.js?v=698-1')","'/dealer-erp-v713-client.js')")
write('dealer-erp-v678.js',erpServer)

// Newer business pages now declare their own navigation keys instead of impersonating inventory/sales.
let portal=read('dealer-order-flow-v698/portal.cjs')
portal=replace(portal,"h.portal(s,match?'salons':reportMode==='sales-report'?'sales':'inventory'","h.portal(s,match?'salons':reportMode==='sales-report'?'period-sales':reportMode?'manufacturer-report':'procurement'")
write('dealer-order-flow-v698/portal.cjs',portal)
// Password pages already allow their inline eye-button code, but blocked the shared menu script.
let access=read('business-account-approvals-v643.js')
access=replace(access,'  setSecurityHeaders(res, inlineScript)',`  setSecurityHeaders(res, inlineScript)
  if (inlineScript && content.includes('data-dealer-view="password"')) {
    res.setHeader('Content-Security-Policy', String(res.getHeader('Content-Security-Policy')).replace("script-src 'unsafe-inline'", "script-src 'self' 'unsafe-inline'"))
  }`)
write('business-account-approvals-v643.js',access)
let server=read('server.js')
const ready="      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Store-Code-Settings', 'v712')"
server=replace(server,ready,"      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Dealer-Simple', 'v713')\n"+ready)
write('server.js',server)
console.log('v713 applied: one dealer navigation, compact lists, preserved forms and company profile fix')
