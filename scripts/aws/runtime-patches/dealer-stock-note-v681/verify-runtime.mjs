import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
const root=process.env.LIEN_RUNTIME_ROOT||'/app'
const server=fs.readFileSync(root+'/dealer-erp-v678.js','utf8')
const client=fs.readFileSync(root+'/dealer-erp-v678-client.stock-note-v681.js','utf8')
new vm.Script(server);new vm.Script(client)
assert.ok(server.includes("text(p.reason, '備考', 1000, true)"))
assert.ok(client.includes("area('reason','備考（任意）','',false,1000)"))
assert.ok(client.includes("'更新後','備考'"))
assert.ok(server.includes("text(p.reason, '返品理由', 1000)"))
assert.ok(server.includes("text(p.reason, '取消理由', 1000)"))
assert.ok(server.includes("text(p.reason, '変更理由', 1000)"))
assert.ok(client.includes("area('reason','返品理由','',true)"))
assert.ok(fs.readFileSync(root+'/dealer-erp-v678-client.js','utf8').includes("+area('reason','理由','',true),(p,k) => command('stock',p,k)"))
console.log('v681 syntax, optional notes, unchanged reversal requirements, immutable asset verified')
