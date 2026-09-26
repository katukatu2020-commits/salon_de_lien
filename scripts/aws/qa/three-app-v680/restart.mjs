import assert from 'node:assert/strict'
import {execFileSync} from 'node:child_process'
const run=(...args)=>execFileSync('docker',args,{encoding:'utf8'})
const name='orimia-qa-v680-app'
const conf=JSON.parse(run('inspect',name))[0]
assert.ok(conf.Config.Env.includes('ORIMIA_ISOLATED_QA=v680'))
assert.ok(conf.Config.Env.some(e=>e.includes('/orimia_qa_v680_20260926?')))
run('stop',name)
run('rename',name,name+'-previous-'+Date.now())
run('run','-d','--name',name,'--network','orimia-qa-v680','--entrypoint','node',...conf.Config.Env.flatMap(e=>['-e',e]),'salon-de-lien:three-app-qa-v680-isolated','/app/server.js')
let ready=false
for(let attempt=0;attempt<60;attempt++){
  try{const response=await fetch('http://127.0.0.1:3188/api/health/ready');if(response.ok){ready=true;break}}catch{}
  await new Promise(resolve=>setTimeout(resolve,1000))
}
assert.ok(ready,'QA backend did not become ready')
console.log('Isolated QA backend restarted; previous container retained')
