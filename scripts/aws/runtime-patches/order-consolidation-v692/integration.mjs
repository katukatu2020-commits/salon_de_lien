import fs from 'node:fs'
const parent=fs.readFileSync('/tmp/lien-v678/integration.mjs','utf8'),anchor="  if (process.env.KEEP_FIXTURE==='1') {"
if(parent.split(anchor).length!==2)throw Error('Unexpected ERP integration fixture')
let source=parent.replace(anchor,()=>`  await (await import('file:///tmp/lien-v686/ordering-cases.mjs')).verify({db,service,req,ok,a,b,staff})
  await (await import('file:///tmp/lien-v692/cases.mjs')).verify({db,service,req,ok,a,b,staff,wh})
${anchor}`)
source=source.replace('    if (await service.handle(req,res,u)) return',()=>`    if(process.env.KEEP_FIXTURE==='1'&&u.pathname==='/admin/products/orders'){
      res.setHeader('Content-Type','text/html; charset=utf-8');res.end(fs.readFileSync('/tmp/lien-v692/salon-fixture.html'));return
    }
    if (await service.handle(req,res,u)) return`)
try{await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'))}
catch(e){console.error(String(e.stack).split('\n').filter(l=>!l.includes('data:text/javascript')).join('\n'));process.exitCode=1}
