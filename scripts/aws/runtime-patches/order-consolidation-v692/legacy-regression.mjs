import fs from 'node:fs'
const parent=fs.readFileSync('/tmp/lien-v678/integration.mjs','utf8'),anchor="  if (process.env.KEEP_FIXTURE==='1') {"
if(parent.split(anchor).length!==2)throw Error('Unexpected integration fixture')
const source=parent.replace(anchor,()=>`
  await (await import('file:///tmp/lien-v686/ordering-cases.mjs')).verify({db,service,req,ok,a,b,staff})
  // Each legacy amendment scenario starts a separate order window. Merge coverage is in v692/cases.
  const isolatedOrderOk=async(path,...args)=>{
    if(path==='/api/admin/wholesale/orders')await db.$executeRawUnsafe('UPDATE "WholesaleOrder" SET "consolidationClosesAt"=clock_timestamp()-interval \\'1 minute\\' WHERE "consolidationClosesAt" IS NOT NULL')
    return ok(path,...args)
  }
  await (await import('file:///tmp/lien-v687/amendment-cases.mjs')).verify({db,service,req,ok:isolatedOrderOk,a,b,staff,makeOrder,wh,employee})
${anchor}`)
try{await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'))}
catch(e){console.error(String(e.stack).split('\n').filter(l=>!l.includes('data:text/javascript')).join('\n'));process.exitCode=1}
