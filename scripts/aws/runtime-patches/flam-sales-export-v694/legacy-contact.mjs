import fs from 'node:fs'
const cases=fs.readFileSync('/tmp/lien-v693/cases.mjs','utf8').replaceAll('dealer-sales-team-v693-client','dealer-sales-team-v694-client').replaceAll('v=693-1','v=694-1')
const url='data:text/javascript;base64,'+Buffer.from(cases).toString('base64')
const original=fs.readFileSync('/tmp/lien-v693/integration.mjs','utf8'),needle="'file:///tmp/lien-v693/cases.mjs'"
if(original.split(needle).length!==2)throw Error('Unexpected contact regression fixture')
const source=original.replace(needle,JSON.stringify(url))
try{await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'))}
catch(e){console.error(String(e.stack).split('\n').filter(l=>!l.includes('data:text/javascript')).join('\n'));process.exitCode=1}
