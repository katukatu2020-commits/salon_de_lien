import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
const root=process.env.RUNTIME_ROOT||'/app',here=path.dirname(fileURLToPath(import.meta.url))
const read=file=>fs.readFileSync(path.join(root,file),'utf8'),write=(file,value)=>fs.writeFileSync(path.join(root,file),value)
function once(source,old,value){if(source.split(old).length!==2)throw Error('Expected one anchor: '+old.slice(0,150));return source.replace(old,value)}
write('treatment-reviews-v690.js',fs.readFileSync(path.join(here,'treatment-reviews.cjs'),'utf8'))
write('public/treatment-reviews-v690.js',fs.readFileSync(path.join(here,'review-client.js'),'utf8'))
write('public/treatment-reviews-v690.css',fs.readFileSync(path.join(here,'treatment-reviews.css'),'utf8'))
let server=read('server.js')
server=once(server,"const salonSettingsChatV689 = require('./salon-settings-chat-v689')","const {createTreatmentReviews} = require('./treatment-reviews-v690')\nconst salonSettingsChatV689 = require('./salon-settings-chat-v689')")
server=once(server,'customerLinks = createCustomerLinkService({',`const treatmentReviewsV690 = createTreatmentReviews({prisma,sessionProvider:req=>chatSession(req,'customer'),renderCustomerShell:customerShell,sendCustomerHtml,staffProvider:organizationId=>customerStoreStaff.staffForOrganization(organizationId),icon:customerIcon})
customerLinks = createCustomerLinkService({`)
server=once(server,'  await customerStoreStaff.ensureSchema()','  await customerStoreStaff.ensureSchema()\n  await treatmentReviewsV690.ensureSchema()')
server=once(server,'      if (await customerAppointmentHistory.handle(req, res, url)) return', '      if (await treatmentReviewsV690.handle(req, res, url)) return\n      if (await customerAppointmentHistory.handle(req, res, url)) return')
server=once(server,"['campaign','キャンペーン','CAMPAIGN','/u/campaigns','amber']","['user','スタッフ紹介','OUR STAFF','/u/staff','sage']")
server=once(server,"['heart','商品アンケート','/u/reviews']","['user','スタッフ紹介','/u/staff'],['campaign','キャンペーン','/u/campaigns'],['heart','アンケート受信ボックス','/u/reviews']")
server=once(server,"      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Salon-Settings-Chat','v689')","      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Salon-Settings-Chat','v689')\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Treatment-Reviews','v690')")
for(const file of ['customer-experience-v503.js','customer-experience-v508.js']) {
  let text=read(file)
  text=once(text,"['/u/campaigns', 'キャンペーン', 'campaign'],","['/u/staff', 'スタッフ紹介', 'profile'],\n        ['/u/campaigns', 'キャンペーン', 'campaign'],")
  text=once(text,"['/u/reviews', 'お客様の声', 'CUSTOMER VOICE', '商品アンケートとレビュー'],","['/u/staff', 'スタッフ紹介', 'SALON STAFF', 'スタッフとお客様のレビュー'],\n    ['/u/reviews', 'アンケート受信ボックス', 'SURVEY INBOX', '施術と商品のアンケート'],")
  write(file,text)
}
const chunkDir='.next/static/chunks/app/u/(account)/',oldChunk='layout-customer-mobile-nav-v425.desktop-quality-v674.js',newChunk='layout-customer-mobile-nav-v425.treatment-reviews-v690.js'
write(chunkDir+newChunk,once(read(chunkDir+oldChunk),'/customer-experience-v503.js?v=674-desktop-quality1','/customer-experience-v503.js?v=690-treatment-reviews1'))
server=once(server,oldChunk,newChunk)
server=server.replaceAll('?v=674-desktop-quality1','?v=690-treatment-reviews1')
write('server.js',server)
// The legacy feedback page must participate in the same visit lock and reward check.
for(const [file,anchor] of [['.next/server/chunks/7295.js','async function b(e,t,r){let i=await y(e,c.feedbackSubmitted)'],['.next/server/chunks/805.js','async function h(e,t,r){let a=await m(e,c.feedbackSubmitted)']]) {
  const guard='const prior690=await require("/app/treatment-reviews-v690.js").lockLegacyFeedbackVisit(e,t,r);if(prior690)return prior690;'
  write(file,once(read(file),anchor,anchor.replace('{let','{'+guard+'let')))
}
console.log('v690 runtime patched')
