import fs from 'node:fs'
const parent=fs.readFileSync('/tmp/lien-v678/integration.mjs','utf8'),anchor="  if (process.env.KEEP_FIXTURE==='1') {"
if(parent.split(anchor).length!==2)throw Error('Unexpected ERP fixture')
const source=parent.replace(anchor,()=>`  await (await import('file:///tmp/lien-v694/cases.mjs')).verify({db,req,ok,a,b,staff,employee,base,month,makeOrder})
${anchor}`)
try{await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'))}
catch(e){console.error(String(e.stack).split('\n').filter(l=>!l.includes('data:text/javascript')).join('\n'));process.exitCode=1}
