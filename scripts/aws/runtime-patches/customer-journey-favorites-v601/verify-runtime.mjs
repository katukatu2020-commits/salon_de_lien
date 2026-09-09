import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import assert from 'node:assert/strict'
const hash=value=>crypto.createHash('sha256').update(value).digest('hex'),manifest='/tmp/customer-journey-v601-parent.json'
const files=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(path.join(dir,e.name)):[path.join(dir,e.name)])
const targets=[...files('/app/.next'),...files('/app/public'),...fs.readdirSync('/app').filter(f=>/\.(js|css)$/.test(f)).map(f=>'/app/'+f)]
if(process.argv[2]==='snapshot')fs.writeFileSync(manifest,JSON.stringify(Object.fromEntries(targets.map(f=>[f,hash(fs.readFileSync(f))]))))
else {
  const parent=JSON.parse(fs.readFileSync(manifest)),changes=JSON.parse(fs.readFileSync('/tmp/customer-journey-v601-changes.json'))
  assert.deepEqual([...new Set(changes.map(c=>c.file))],['server.js'])
  assert.deepEqual(targets.filter(f=>!parent[f]).sort(),['/app/customer-favorites-v601.js','/app/customer-summary-v601.js','/app/public/customer-icons-v601.svg','/app/public/customer-journey-v601.css','/app/public/customer-journey-v601.js'])
  for(const [file,digest] of Object.entries(parent)){
    let value=fs.readFileSync(file)
    for(const c of changes.filter(c=>'/app/'+c.file===file).reverse()){
      const source=value.toString('utf8');assert.equal(source.split(c.after).length,2,file);value=Buffer.from(source.replace(c.after,c.before))
    }
    assert.equal(hash(value),digest,'Unexpected change: '+file)
  }
  console.log(JSON.stringify({protectedFiles:Object.keys(parent).length,bookingEngineAndProfileFormsUnchanged:true,receiptAndImportUnchanged:true}))
}
