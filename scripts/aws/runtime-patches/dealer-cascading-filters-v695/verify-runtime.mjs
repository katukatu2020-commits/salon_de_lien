import fs from 'node:fs'
import assert from 'node:assert/strict'
import {execFileSync} from 'node:child_process'
for(const file of ['server.js','wholesale-ordering-v543.js','dealer-workspace-v688.js','public/dealer-catalog-v695.js'])execFileSync('node',['--check','/app/'+file])
const read=f=>fs.readFileSync('/app/'+f,'utf8')
assert.match(read('dealer-workspace-v688.js'),/\/dealer-catalog-v695\.js\?v=695-1/)
assert.match(read('wholesale-ordering-v543.js'),/categoryGroups: productFilterRows/)
await import('/tmp/lien-v688/verify-runtime.mjs')
await import('/tmp/lien-v694/verify-runtime.mjs')
console.log('v695 runtime PASS: cascading options, immutable catalog client, preserved prior releases')
