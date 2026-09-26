import fs from 'node:fs'
const parent = fs.readFileSync('/tmp/lien-v678/integration.mjs', 'utf8')
const anchor = "  if (process.env.KEEP_FIXTURE==='1') {"
if (parent.split(anchor).length !== 2) throw Error('Unexpected ERP test fixture')
const cases = new URL('./chat-cases.mjs', import.meta.url).href
const source = parent.replace(anchor, `  await (await import('file:///tmp/lien-v681/stock-notes-cases.mjs')).verify({action,denied,get,sql,a,b,staff})
  await (await import(${JSON.stringify(cases)})).verify({action,denied,get,sql,a,b,staff,req,ok,employee,salonThread,internal})
${anchor}`)
await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'))
