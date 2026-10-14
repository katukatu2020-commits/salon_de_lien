import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
const root=process.env.LIEN_RUNTIME_ROOT||'/app'
const read=f=>fs.readFileSync(root+'/'+f,'utf8')
for(const file of ['public/dealer-salon-picker-v714.js','public/dealer-catalog-v714.js','public/dealer-erp-v714-client.js','public/dealer-sales-team-v714-client.js','dealer-workspace-v714.js','dealer-sales-team-v671.js'])new vm.Script(read(file),{filename:file})
const shell=read('dealer-workspace-v714.js')
assert(shell.includes('/dealer-salon-picker-v714.js'))
assert(shell.includes('/dealer-catalog-v714.js'))
assert(read('wholesale-ordering-v543.js').includes("require('./dealer-workspace-v714.js').render"))
assert(read('dealer-erp-v678.js').includes("'/dealer-erp-v714-client.js')"))
const team=read('dealer-sales-team-v671.js')
assert(team.includes("'/dealer-sales-team-v714-client.js')"))
assert(team.includes('o."publicCode",c."customerCode"'))
assert(team.includes('WHERE c."dealerId"=$1 ORDER BY o."name",c."id"'))
for(const file of ['public/dealer-catalog-v714.js','public/dealer-erp-v714-client.js','public/dealer-sales-team-v714-client.js'])assert(read(file).includes('data-dealer-salon-picker='),file)
const picker=read('public/dealer-salon-picker-v714.js')
assert(picker.includes('lucide-search'))
assert(picker.includes('select.dispatchEvent(new Event(\'change\''))
assert(!picker.includes('fetch('),'picker must use only the authorized options already loaded')
assert(read('server.js').includes("'X-Lien-Dealer-Salon-Picker', 'v714'"))
console.log('v714 runtime PASS: syntax, all picker renderers, assets, tenant scope, native events')
