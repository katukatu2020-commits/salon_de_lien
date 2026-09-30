import fs from 'node:fs'
let source=fs.readFileSync('/tmp/lien-v678/integration.mjs','utf8')
source=source.replace('"active" BOOLEAN DEFAULT TRUE)', '"active" BOOLEAN DEFAULT TRUE,"passwordHash" TEXT)')
source=source.replace('console.error(e);res.statusCode=500','console.error(e.message);res.statusCode=500')
source=source.replace("organizationId:'salon-a',userId:'salon-user'", "organizationId:req.headers['x-fixture-org']||'salon-a',userId:req.headers['x-fixture-user']||'salon-user'")
const anchor="  if (process.env.KEEP_FIXTURE==='1') {"
if(source.split(anchor).length!==2)throw Error('Unexpected ERP integration fixture')
source=source.replace(anchor,()=>`  await (await import('file:///tmp/lien-v686/ordering-cases.mjs')).verify({db,service,req,ok,a,b,staff})
  await (await import('file:///tmp/lien-v692/cases.mjs')).verify({db,service,req,ok,a,b,staff,wh})
  await (await import('file:///tmp/lien-v698/cases.mjs')).verify({db,service,req,ok,a,b,staff,wh})
${anchor}`)
source=source.replace('    if (await service.handle(req,res,u)) return','    if(await service.flowGate(req,res,u))return\n    if (await service.handle(req,res,u)) return')
try{await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'))}
catch(e){console.error(String(e.stack).split('\n').filter(l=>!l.includes('data:text/javascript')).join('\n'));process.exitCode=1}
