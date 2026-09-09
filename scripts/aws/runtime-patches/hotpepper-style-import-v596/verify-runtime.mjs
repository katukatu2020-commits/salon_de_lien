import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import assert from 'node:assert/strict'
const hash = value => crypto.createHash('sha256').update(value).digest('hex')
const manifest = '/tmp/hotpepper-v596-parent.json'
function files(dir) { return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(path.join(dir,e.name)):[path.join(dir,e.name)]) }
if (process.argv[2] === 'snapshot') {
  const targets=[...files('/app/.next'),...files('/app/public'),...fs.readdirSync('/app').filter(f=>/\.(js|css)$/.test(f)).map(f=>'/app/'+f)]
  fs.writeFileSync(manifest,JSON.stringify(Object.fromEntries(targets.map(f=>[f,hash(fs.readFileSync(f))]))))
} else {
  const parent=JSON.parse(fs.readFileSync(manifest,'utf8'))
  const changes=JSON.parse(fs.readFileSync('/tmp/hotpepper-v596-changes.json','utf8'))
  for (const [file,digest] of Object.entries(parent)) {
    let value=fs.readFileSync(file)
    const scoped=changes.filter(c=>'/app/'+c.file===file).reverse()
    if(scoped.length) {
      let source=value.toString('utf8')
      for(const c of scoped) { assert.equal(source.split(c.after).length,2, file);source=source.replace(c.after,c.before) }
      value=Buffer.from(source)
    }
    assert.equal(hash(value),digest,'Unexpected change: '+file)
  }
  console.log(JSON.stringify({protectedFiles:Object.keys(parent).length,receiptsAndMembershipsUnchanged:true}))
}
