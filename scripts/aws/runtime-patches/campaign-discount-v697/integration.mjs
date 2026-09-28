import fs from 'node:fs'
let source=fs.readFileSync('/tmp/lien-v652/integration.mjs','utf8')
const anchor='  console.log(JSON.stringify({\n    passed: true,'
if(source.split(anchor).length!==2)throw Error('Booking test anchor')
source=source.replace(anchor,()=>`  await (await import('file:///tmp/lien-v697/cases.mjs')).verify({db,service,api,session:customerSession})
${anchor}`)
try{await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'))}
catch(e){console.error(String(e.stack).split('\n').filter(l=>!l.includes('data:text/javascript')).join('\n'));process.exitCode=1}
let campaign=fs.readFileSync('/tmp/lien-v685/integration.mjs','utf8')
campaign=campaign.replace("  assert.equal(menuMatches('カット'", "  await db.$executeRawUnsafe('ALTER TABLE \"CustomerCampaign\" ADD COLUMN \"discountRate\" INTEGER')\n  assert.equal(menuMatches('カット'")
try{await import('data:text/javascript;base64,'+Buffer.from(campaign).toString('base64'))}
catch(e){console.error(String(e.stack).split('\n').filter(l=>!l.includes('data:text/javascript')).join('\n'));process.exitCode=1}
