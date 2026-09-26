import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
const root=process.env.LIEN_RUNTIME_ROOT||'/app',source=path.dirname(fileURLToPath(import.meta.url))
const read=file=>fs.readFileSync(path.join(root,file),'utf8'),write=(file,value)=>fs.writeFileSync(path.join(root,file),value)
function replace(value,before,after){if(value.split(before).length-1!==1)throw Error('Unexpected parent anchor: '+before);return value.replace(before,after)}
for(const [from,to]of [['campaign-booking.cjs','campaign-booking-v685.cjs'],['campaign-booking-client.js','public/campaign-booking-v685.js'],['campaign-booking.css','public/campaign-booking-v685.css']])write(to,fs.readFileSync(path.join(source,from),'utf8'))
let server=read('server.js')
const service="const customerHomeBranding = createCustomerHomeBrandingService({"
server=replace(server,service,"const campaignBookingV685 = require('./campaign-booking-v685.cjs').createCampaignBookingService({prisma,customerSession:req=>chatSession(req,'customer'),ensureTables:customerCampaigns.ensureTables,json})\n"+service)
const route="      if (await customerCampaigns.handle(req, res, url)) return /* customer-campaigns-v427-route */"
server=replace(server,route,"      if (await campaignBookingV685.handle(req,res,url)) return\n"+route)
const marker="      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Appointment-Datetime-Recovery', 'v684') /* appointment-datetime-recovery-v684 */"
server=replace(server,marker,marker+"\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Campaign-Booking-Menu','v685')")
const journeyStyle='<link rel="stylesheet" href="/customer-journey-v601.css?v=607-booking-clearance1">'
server=replace(server,journeyStyle,journeyStyle+'<link rel="stylesheet" href="/campaign-booking-v685.css">')
server=replace(server,'/customer-journey-v680.js?v=680','/customer-journey-v685.js?v=685')
write('server.js',server)
let tenant=read('tenant-setup.js')
const anchor='        const currentSchedule = await dailySchedule(session.organizationId, date, transaction)'
tenant=replace(tenant,anchor,"        await require('./campaign-booking-v685.cjs').assertCampaignMenu(transaction,session,data.campaignId,menu.id)\n"+anchor)
write('tenant-setup.js',tenant)
let journey=read('public/customer-journey-v680.js')
journey=replace(journey,'    function go(next) {',"    const campaignBooking=window.OrimiaCampaignBookingV685\n    function go(next) {\n      if(next>1&&campaignBooking&&!campaignBooking.permits(select.value))return")
journey=replace(journey,'    function sync() {\n      main.dataset.cjStep',"    function sync() {\n      campaignBooking?.render(shell)\n      if(campaignBooking?.initializeMenu(select))step=2\n      if(campaignBooking&&!campaignBooking.permits(select.value))step=1\n      main.dataset.cjStep")
journey=replace(journey,'      const menus=[...select.options].map(menuInfo)','      const menus=[...select.options].map(menuInfo).filter(item=>!campaignBooking||campaignBooking.permits(item.value))')
journey=replace(journey,'      next.disabled=(step===1&&!select.value)||(step===3&&!selectedSlot())','      next.disabled=(campaignBooking&&!campaignBooking.permits(select.value))||(step===1&&!select.value)||(step===3&&!selectedSlot())')
journey=replace(journey,"window.addEventListener('popstate',queue)","window.addEventListener('orimia:campaign-booking-v685',queue);window.addEventListener('popstate',queue)")
// Keep the constraint available even when arriving through an App Router link.
write('public/customer-journey-v685.js',fs.readFileSync(path.join(source,'campaign-booking-client.js'),'utf8')+'\n'+journey)
console.log('v685 campaign menu selection and transactional validation installed')
