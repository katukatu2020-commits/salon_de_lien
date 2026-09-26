import fs from 'node:fs'
import assert from 'node:assert/strict'
import {execFileSync} from 'node:child_process'
const root=process.env.LIEN_RUNTIME_ROOT||'/app'
for(const f of ['server.js','platform-operator.js','business-account-approvals-v643.js','platform-usage-payments-v679.js'])execFileSync(process.execPath,['--check',root+'/'+f])
const server=fs.readFileSync(root+'/server.js','utf8'),approval=fs.readFileSync(root+'/business-account-approvals-v643.js','utf8')
assert.ok(server.indexOf('if (await platformUsagePaymentsV679.handle')<server.indexOf('if (await businessAccountApprovalsV643.handle'))
for(const s of ['platformUsagePaymentsV679.ensureSchema','X-Lien-Platform-Usage-Payments','X-Lien-Dealer-Erp','X-Lien-Branch-Shared-Contact'])assert.ok(server.includes(s),s)
assert.ok(approval.includes('decorateAccounts(accounts)'))
assert.ok(approval.includes('row.feeHtml'))
assert.ok(fs.readFileSync(root+'/platform-operator.js','utf8').includes('href="/platform/payments"'))
console.log('PASS: v679 route, schema, dashboard integration and inherited release markers')
