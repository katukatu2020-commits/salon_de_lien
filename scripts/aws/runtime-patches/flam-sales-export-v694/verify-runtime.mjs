import fs from 'node:fs'
import assert from 'node:assert/strict'
import {execFileSync} from 'node:child_process'
for(const file of ['server.js','dealer-erp-v678.js','dealer-sales-team-v671.js','flam-export-v694/export.cjs','public/dealer-sales-team-v694-client.js'])execFileSync('node',['--check','/app/'+file])
const headers=JSON.parse(fs.readFileSync('/app/flam-export-v694/headers.json','utf8'))
assert.equal(headers.length,105);assert.equal(headers[13],'得意先コード');assert.equal(headers[54],'小計');assert.equal(headers[104],'取消')
let legacy=fs.readFileSync('/tmp/lien-v693/verify-runtime.mjs','utf8').replace('/dealer-sales-team-v693-client.js?v=693-1','/dealer-sales-team-v694-client.js?v=694-1')
await import('data:text/javascript;base64,'+Buffer.from(legacy).toString('base64'))
await import('/tmp/lien-v693/verify-compat.mjs')
console.log('v694 runtime PASS: 105 template columns and prior runtime compatibility')
