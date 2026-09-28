import fs from 'node:fs'
import assert from 'node:assert/strict'
import {execFileSync} from 'node:child_process'
import {createRequire} from 'node:module'
const require=createRequire('/app/package.json')
const root=process.env.RUNTIME_ROOT||'/app'
const read=file=>fs.readFileSync(root+'/'+file,'utf8')
const helper=require(root+'/salon-settings-chat-v689.js')
for(const file of ['server.js','salon-settings-chat-v689.js','admin-chat-inbox-v589.js','commercial-admin-v101.js','public/salon-chat-v689.js','.next/server/app/admin/settings/page.js','.next/server/app/admin/customers/messages/page.js'])execFileSync(process.execPath,['--check',root+'/'+file])
assert.ok(!read('server.js').includes("Location', '/admin/account?notice=owner-required'"))
assert.ok(read('.next/server/app/admin/settings/page.js').includes('readonlySettings(g._,t)'))
assert.ok(read('server.js').includes('X-Lien-Dealer-Workspace'))
assert.ok(read('server.js').includes('X-Lien-Salon-Settings-Chat'))
assert.ok(read('server.js').includes('handleStaffForm(req, res, prisma'))
assert.ok(!read('server.js').includes('|| organizationStaff[0]'))
const actor={role:'STAFF',organizationId:'a',chatStaffKeys:['staff-a']}
assert.equal(helper.canAccessThread(actor,{organizationId:'a',staffKey:'staff-a'}),true)
assert.equal(helper.canAccessThread(actor,{organizationId:'a',staffKey:'staff-b'}),false)
assert.equal(helper.canAccessThread({...actor,isSharedStoreAccount:true},{organizationId:'b',staffKey:'staff-a'}),false)
assert.equal(helper.sameOrigin({headers:{host:'salon.example',origin:'https://evil.example'}}),false)
assert.equal(helper.sameOrigin({headers:{host:'salon.example',origin:'https://salon.example'}}),true)
console.log('v689 runtime and focused authorization checks PASS')
