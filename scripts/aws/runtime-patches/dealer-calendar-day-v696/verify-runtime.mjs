import fs from 'node:fs'
import assert from 'node:assert/strict'
import {execFileSync} from 'node:child_process'
for(const file of ['server.js','wholesale-ordering-v543.js','dealer-erp-v678.js','dealer-workspace-v688.js','dealer-calendar-day-v696.cjs','public/dealer-calendar-v696.js'])execFileSync('node',['--check','/app/'+file])
const read=f=>fs.readFileSync('/app/'+f,'utf8')
assert.match(read('dealer-workspace-v688.js'),/view==='calendar' \? '\/dealer-calendar-v696.js/)
assert.match(read('dealer-erp-v678.js'),/'calendar-day': require/)
const {dayRange}=await import('/app/dealer-calendar-day-v696.cjs')
assert.equal(dayRange('2028-02-29').start.toISOString(),'2028-02-28T15:00:00.000Z')
for(const value of ['','2026-02-29','2026-09-31','2026-1-1','2026-09-29 OR 1=1'])assert.throws(()=>dayRange(value))
await import('/tmp/lien-v695/verify-runtime.mjs')
console.log('v696 runtime PASS: day route, date validation, immutable calendar client, prior releases preserved')
