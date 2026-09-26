import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {createRequire} from 'node:module'
const root=process.env.LIEN_RUNTIME_ROOT||'/app', source=path.dirname(fileURLToPath(import.meta.url))
const read=name=>fs.readFileSync(path.join(root,name),'utf8')
const write=(name,value)=>fs.writeFileSync(path.join(root,name),value)
function replace(value,before,after,count=1){if(value.split(before).length-1!==count)throw Error('Unexpected parent anchor: '+before);return value.replaceAll(before,after)}
const require=createRequire(path.join(root,'package.json'))
const React=require('react'),{renderToStaticMarkup}=require('react-dom/server'),icons=require('lucide-react')
const markup=Object.fromEntries(['LayoutDashboard','Building2','ClipboardList','Wallet','Users','LogOut','Search','ArrowRight','ArrowLeft','ExternalLink','ChevronLeft','ChevronRight'].map(name=>[name,renderToStaticMarkup(React.createElement(icons[name],{size:18,'aria-hidden':true}))]))
write('platform-console-v683-icons.json',JSON.stringify(markup))
write('platform-console-v683.js',fs.readFileSync(path.join(source,'platform-console.js'),'utf8'))
write('platform-console-v683.css',fs.readFileSync(path.join(source,'platform-console.css'),'utf8'))
let platform=read('platform-operator.js')
platform=replace(platform,'function pageShell(title, body, authenticated) {',`function pageShell(title, body, authenticated) {
  return require('./platform-console-v683').modernize(legacyPageShell(title, body, authenticated), title, authenticated)
}
function legacyPageShell(title, body, authenticated) {`)
const start=platform.indexOf('function dashboardPage(data) {'),end=platform.indexOf('function customerRegistryPage(data) {',start)
if(start<0||end<0)throw Error('Dashboard boundaries missing')
platform=platform.slice(0,start)+`function dashboardPage(data) {
  return require('./platform-console-v683').overview(data, pageShell)
}

`+platform.slice(end)
write('platform-operator.js',platform)
let approval=read('business-account-approvals-v643.js')
const loadStart=approval.indexOf('  async function loadDashboardAccounts()'),loadEnd=approval.indexOf('  async function platformDashboard',loadStart)
if(loadStart<0||loadEnd<0)throw Error('Account loader missing')
approval=approval.slice(0,loadStart)+replace(approval.slice(loadStart,loadEnd),'LIMIT 200','',2)+approval.slice(loadEnd)
const old=`    const baseData = await baseDashboardProvider()
    const accounts = await loadDashboardAccounts()
    if (options.usageFees) await options.usageFees.decorateAccounts(accounts)
    const content = renderBaseDashboard(baseData).replace('</main>', dashboardSection(accounts) + '</main>')
    sendHtml(res, 200, content, headOnly)`
approval=replace(approval,old,`    const baseData = await baseDashboardProvider()
    const accounts = await loadDashboardAccounts()
    const ui = require('./platform-console-v683')
    const render = renderPlatformPage || require('./platform-operator').pageShell
    sendHtml(res, 200, ui.overview(baseData, render, accounts), headOnly)`)
approval=replace(approval,"const relevant = pathname === '/platform' || pathname === '/platform/inquiries'", "const relevant = pathname === '/platform' || pathname === '/platform/businesses' || pathname.startsWith('/platform/businesses/') || pathname === '/platform/inquiries'")
approval=replace(approval,"    if (pathname === '/platform/inquiries') {",`    if (pathname === '/platform/businesses' || pathname.startsWith('/platform/businesses/')) {
      if (!['GET', 'HEAD'].includes(req.method)) { res.statusCode = 405; res.setHeader('Allow', 'GET, HEAD'); res.end(); return true }
      const ui = require('./platform-console-v683')
      const accounts = await loadDashboardAccounts()
      const baseData = await baseDashboardProvider()
      if (options.usageFees) await options.usageFees.decorateAccounts(accounts)
      const render = renderPlatformPage || require('./platform-operator').pageShell
      const result = pathname === '/platform/businesses' ? {status:200,html:ui.listPage(baseData, accounts, url, render)} : ui.detailPage(baseData, accounts, url, render)
      sendHtml(res, result.status, result.html, req.method === 'HEAD')
      return true
    }
    if (pathname === '/platform/inquiries') {`)
approval=replace(approval,"redirect(res, '/platform?account=' + (statusMatch[3] === 'suspend' ? 'suspended' : 'resumed'))", "redirect(res, require('./platform-console-v683').accountReturn(url, statusMatch[3] === 'suspend' ? 'suspended' : 'resumed'))")
approval=replace(approval,"redirect(res, '/platform?account=failed')", "redirect(res, require('./platform-console-v683').accountReturn(url, 'failed'))")
write('business-account-approvals-v643.js',approval)
const marker="      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Partner-Chat', 'v682') /* partner-chat-v682 */"
write('server.js',replace(read('server.js'),marker,marker+"\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Platform-Console', 'v683') /* platform-console-v683 */"))
// The existing payment regression now verifies the consolidated business list.
const previous='/tmp/lien-v679/integration.mjs'
if(fs.existsSync(previous)){
  let fixture=replace(fs.readFileSync(previous,'utf8'),"const dashboard=await request('/platform');","const dashboard=await request('/platform/businesses');")
  fixture=replace(fixture,"    const u=new URL(req.url,'http://local')", "    const u=new URL(req.url,'http://local')\n    if(u.pathname==='/brand/orimia-icon-192.png'){res.setHeader('Content-Type','image/png');res.end((await import('node:fs')).readFileSync('/app/public/brand/orimia-icon-192.png'));return}")
  fixture=replace(fixture,'baseDashboardProvider:async()=>({})',`baseDashboardProvider:async()=>({
    summary:{storeCount:4,activeStores:3,customerCount:123,withdrawnCustomerCount:2,monthRevenue:432100,totalRevenue:3210980,activeMrr:38400,projectedMrr:48200},
    storeRows:[{id:'salon-a',organizationName:'サロンA',slug:'salon-a',ownerName:'責任者',ownerEmail:'shared@example.test',monthRevenue:432100,totalRevenue:3210980,customerCount:123,staffCount:4,appointmentCount:56,planName:'竹プラン',subscriptionStatus:'active',trialEndsAt:'2026-10-01'}],
    trendRows:Array.from({length:12},(_,i)=>({month:'2026-'+String(i+1).padStart(2,'0'),amount:(i+1)*32000})),
    planRows:[{planName:'竹プラン',storeCount:4}],statusRows:[{subscriptionStatus:'active',storeCount:3}]
  })`)
  fixture=replace(fixture,"  console.log('PASS: monthly transfer/debit", "  await (await import('/tmp/lien-v683/integration-cases.mjs')).run({request,db,base,cookie})\n  console.log('PASS: monthly transfer/debit")
  fs.writeFileSync(previous,fixture)
}
console.log('v683: unified operator businesses, preserved metrics and actions, shared responsive console')
