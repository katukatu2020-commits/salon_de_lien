import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
const root=process.env.LIEN_RUNTIME_ROOT||'/app',source=path.dirname(fileURLToPath(import.meta.url))
function replace(file,before,after,count=1){const p=path.join(root,file),s=fs.readFileSync(p,'utf8');if(s.split(before).length-1!==count)throw Error('v678 parent anchor mismatch: '+file+' '+before.slice(0,100));fs.writeFileSync(p,s.replaceAll(before,after))}
for(const file of ['platform-usage-payments-v679.js','platform-usage-payments-v679.css'])fs.copyFileSync(path.join(source,file),path.join(root,file))
fs.copyFileSync(path.join(source,'schema.sql'),path.join(root,'platform-usage-payments-v679.sql'))
replace('server.js','const businessAccountApprovalsV643 = createBusinessAccountApprovalService({',`const platformUsagePaymentsV679 = require('./platform-usage-payments-v679').createPlatformUsagePayments({ prisma, crypto, operatorSession: req => platformOperator.session(req), renderPage: renderPlatformPage }) /* platform-usage-payments-v679-service */
const businessAccountApprovalsV643 = createBusinessAccountApprovalService({
  usageFees: platformUsagePaymentsV679,`)
replace('server.js','  await businessAccountApprovalsV643.ensureSchema() /* business-account-approvals-v643-schema */','  await businessAccountApprovalsV643.ensureSchema() /* business-account-approvals-v643-schema */\n  await platformUsagePaymentsV679.ensureSchema() /* platform-usage-payments-v679-schema */')
replace('server.js','      if (await businessAccountApprovalsV643.handle(req, res, url)) return /* business-account-approvals-v643-route */','      if (await platformUsagePaymentsV679.handle(req, res, url)) return /* platform-usage-payments-v679-route */\n      if (await businessAccountApprovalsV643.handle(req, res, url)) return /* business-account-approvals-v643-route */')
replace('server.js',"      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Dealer-Erp', 'v678') /* dealer-erp-v678-ready */", "      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Dealer-Erp', 'v678') /* dealer-erp-v678-ready */\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Platform-Usage-Payments', 'v679') /* platform-usage-payments-v679-ready */")
replace('platform-operator.js','<a class="readonly" href="/platform/inquiries">申請・発行</a>','<a class="readonly" href="/platform/inquiries">申請・発行</a><a class="readonly" href="/platform/payments">利用料・入金</a>')
const a='business-account-approvals-v643.js'
replace(a,'    const accounts = await loadDashboardAccounts()','    const accounts = await loadDashboardAccounts()\n    if (options.usageFees) await options.usageFees.decorateAccounts(accounts)')
replace(a,'<td colspan="7" class="empty">登録がありません。','<td colspan="8" class="empty">登録がありません。')
replace(a,"+ '</span></td><td><div class=\"baaInline\" style=\"margin:0\">'", "+ '</span></td>' + (row.feeHtml || '<td>-</td>') + '<td><div class=\"baaInline\" style=\"margin:0\">'")
replace(a,'<th>発行区分</th><th>状態</th><th>操作</th>','<th>発行区分</th><th>利用状態</th><th>今月の利用料</th><th>操作</th>',2)
replace(a,"    return PLATFORM_STYLE + '<section class=\"card\" style=\"margin-top:20px\"><div class=\"baaTableHead\">", "    return PLATFORM_STYLE + '<style>' + require('node:fs').readFileSync(require('node:path').join(__dirname, 'platform-usage-payments-v679.css'), 'utf8') + '</style><section class=\"card\" style=\"margin-top:20px\"><div class=\"baaTableHead\">")
console.log('Platform usage payments v679 runtime patched')
