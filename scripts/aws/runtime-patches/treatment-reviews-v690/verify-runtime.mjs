import fs from 'node:fs'
import assert from 'node:assert/strict'
import {execFileSync} from 'node:child_process'
const root=process.env.RUNTIME_ROOT||'/app'
for(const name of ['server.js','treatment-reviews-v690.js','public/treatment-reviews-v690.js'])execFileSync(process.execPath,['--check',root+'/'+name])
const server=fs.readFileSync(root+'/server.js','utf8'),service=fs.readFileSync(root+'/treatment-reviews-v690.js','utf8')
for(const anchor of ['X-Lien-Treatment-Reviews',"['user','スタッフ紹介','OUR STAFF','/u/staff','sage']",'await treatmentReviewsV690.ensureSchema()','await treatmentReviewsV690.handle'])assert.ok(server.includes(anchor),anchor)
for(const anchor of ['FOR UPDATE OF a','FOR UPDATE','sameOrigin(req)','rewardClaimedAt','ON CONFLICT','lockLegacyFeedbackVisit'])assert.ok(service.includes(anchor),anchor)
for(const file of ['.next/server/chunks/7295.js','.next/server/chunks/805.js']){execFileSync(process.execPath,['--check',root+'/'+file]);assert.ok(fs.readFileSync(root+'/'+file,'utf8').includes('lockLegacyFeedbackVisit'))}
for(const file of ['public/treatment-reviews-v690.css','public/salon-chat-v689.js','salon-settings-chat-v689.js'])assert.ok(fs.existsSync(root+'/'+file))
console.log('v690 runtime verification PASS')
