import fs from 'node:fs'
const parent=fs.readFileSync('/tmp/lien-v678/integration.mjs','utf8')
const anchor="  if (process.env.KEEP_FIXTURE==='1') {"
if(parent.split(anchor).length!==2)throw Error('Unexpected ERP integration fixture')
const source=parent.replace(anchor,`  await (await import('file:///tmp/lien-v686/ordering-cases.mjs')).verify({db,service,req,ok,a,b,staff})\n${anchor}`)
await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'))
