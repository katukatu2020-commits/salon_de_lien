import assert from 'node:assert/strict'
import fs from 'node:fs'
import {createRequire} from 'node:module'
import {execFileSync} from 'node:child_process'
const require=createRequire('/app/package.json')
const ui=require('/app/platform-console-v683'),{pageShell,dashboardPage}=require('/app/platform-operator')
for(const file of ['platform-console-v683.js','platform-operator.js','business-account-approvals-v643.js','server.js'])execFileSync(process.execPath,['--check','/app/'+file])
const accounts={salons:[{id:'salon-1',name:'テスト <サロン>',email:'test@example.test',loginId:'salon.one',contactName:'責任者',status:'ACTIVE',createdAt:'2026-09-01',approvedAt:'2026-09-02',approvalMailStatus:'SENT',mustChangePassword:true,feeHtml:'<td class="fee-dashboard-payment">入金済み</td>'}],dealers:[]}
const data={summary:{storeCount:1,customerCount:123,activeMrr:9800},storeRows:[{id:'salon-1',organizationName:'テスト <サロン>',slug:'test-salon',ownerName:'登録者',ownerEmail:'owner@example.test',monthRevenue:12345,totalRevenue:98765,customerCount:123,staffCount:4,appointmentCount:56,planName:'竹プラン',subscriptionStatus:'active',trialEndsAt:'2026-10-01'}],trendRows:[{month:'2026-09',amount:12345}]}
const overview=ui.overview(data,pageShell,accounts)
assert.ok(overview.includes('123名'));assert.ok(overview.includes('9,800円'))
assert.ok(!overview.includes('登録店舗一覧'));assert.ok(!overview.includes('利用中の事業者'));assert.ok(!overview.includes('<table'))
assert.ok(dashboardPage(data).includes('ops-nav'))
const list=ui.listPage(data,accounts,new URL('http://local/platform/businesses'),pageShell)
assert.equal((list.match(/data-business=/g)||[]).length,1)
assert.ok(list.includes('12,345円'));assert.ok(list.includes('入金済み'));assert.ok(list.includes('テスト &lt;サロン&gt;'))
assert.ok(!list.includes('テスト <サロン>'))
const detail=ui.detailPage(data,accounts,new URL('http://local/platform/businesses/salon/salon-1'),pageShell)
for(const text of ['98765','登録者','owner@example.test','salon.one','test-salon','変更待ち','送信済み','2026/10/01','利用停止を確定','/api/platform/enter-store'])assert.ok(detail.html.includes(text==='98765'?'98,765円':text),text)
assert.equal(detail.status,200)
assert.equal(ui.detailPage(data,accounts,new URL('http://local/platform/businesses/salon/missing'),pageShell).status,404)
assert.equal(ui.accountReturn(new URL('http://local/?returnTo=https://evil.test'), 'resumed'),'/platform/businesses?account=resumed')
assert.equal(ui.accountReturn(new URL('http://local/?returnTo=%2Fplatform%2Fbusinesses%2Fsalon%2Fsalon-1'), 'resumed'),'/platform/businesses/salon/salon-1?account=resumed')
assert.equal(ui.normalize('ﾃｽﾄ ＡＢＣ'),'てすと abc')
const many={salons:Array.from({length:231},(_,i)=>({...accounts.salons[0],id:'p-'+i,name:'一覧検証'+i})),dealers:[]}
const last=ui.listPage({},many,new URL('http://local/platform/businesses?page=8'),pageShell)
assert.equal((last.match(/data-business=/g)||[]).length,21);assert.ok(last.includes('8 / 8'))
const filtered=ui.listPage(data,accounts,new URL('http://local/platform/businesses?q='+encodeURIComponent('ﾃｽﾄ')),pageShell)
assert.equal((filtered.match(/data-business=/g)||[]).length,1)
assert.equal((ui.listPage(data,accounts,new URL('http://local/platform/businesses?state=SUSPENDED'),pageShell).match(/data-business=/g)||[]).length,0)
assert.ok(!fs.readFileSync('/app/business-account-approvals-v643.js','utf8').match(/createdAt" DESC LIMIT 200/))
console.log('PASS v683: deduplication, metric/detail parity, escaping, filtering, pagination >200, safe action return')
