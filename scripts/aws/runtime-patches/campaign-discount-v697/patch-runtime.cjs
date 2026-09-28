'use strict'
const fs=require('node:fs'),path=require('node:path')
const read=f=>fs.readFileSync('/app/'+f,'utf8'),write=(f,s)=>fs.writeFileSync('/app/'+f,s),local=f=>fs.readFileSync(path.join(__dirname,f),'utf8')
function replace(s,a,b){if(s.split(a).length!==2)throw Error('Patch anchor: '+a.slice(0,100));return s.replace(a,()=>b)}
let context=read('campaign-booking-v685.cjs')
context=replace(context,'"title","targetMenu","startsAt"','"title","targetMenu","discountRate","startsAt"')
context=replace(context,'title:campaign.title,targetMenu:', 'title:campaign.title,discountRate:Number(campaign.discountRate || 0),targetMenu:')
write('campaign-booking-v685.cjs',context)

let service=read('customer-booking-points-v652.js')
service=replace(service,'    pointsUsed: integer(row.pointsUsed),',`    campaignId: row.campaignId || null,
    campaignTitle: row.campaignTitle || null,
    campaignRate: integer(row.campaignRate),
    campaignDiscount: integer(row.campaignDiscount),
    pointsUsed: integer(row.pointsUsed),`)
service=replace(service,"        await prisma.$executeRawUnsafe(\n          'CREATE INDEX IF NOT EXISTS \"CustomerBookingAdjustmentV652_customer_idx\"",'        await prisma.$executeRawUnsafe('+JSON.stringify(local('schema.sql'))+')\n        await prisma.$executeRawUnsafe(\n          \'CREATE INDEX IF NOT EXISTS "CustomerBookingAdjustmentV652_customer_idx"')
// Reuse the established coupon, lot allocation, cancellation and settlement logic
// inside the booking transaction, so campaign reservations cannot save full price.
const applyStart=service.indexOf('  async function applyBookingAdjustment(')
const txStart=service.indexOf('      const result = await prisma.$transaction(async tx => {',applyStart)
const txEnd=service.indexOf("      }, { isolationLevel: 'Serializable' })",txStart)
if(applyStart<0||txStart<0||txEnd<0)throw Error('Adjustment transaction not found')
let body=service.slice(txStart+'      const result = await prisma.$transaction(async tx => {'.length,txEnd)
body=replace(body,'        const afterCoupon = Math.max(0, menuPrice - couponDiscount)',`        const campaignRate = Math.max(0, Math.min(100, integer(campaign?.discountRate)))
        const campaignDiscount = coupon ? 0 : Math.floor(menuPrice * campaignRate / 100)
        const afterCoupon = Math.max(0, menuPrice - couponDiscount - campaignDiscount)`)
body=replace(body,"'利用ポイント:', '支払予定額:'", "'予約キャンペーン:', 'キャンペーン割引:', '利用ポイント:', '支払予定額:'")
body=replace(body,'        if (pointsToUse > 0) noteLines.push',`        if (campaignDiscount > 0) {
          noteLines.push('予約キャンペーン: ' + String(campaign.title || '').replace(/[\\r\\n]/g,' ') + '（' + campaignRate + '%OFF）')
          noteLines.push('キャンペーン割引: ' + yen(campaignDiscount))
        }
        if (pointsToUse > 0) noteLines.push`)
body=replace(body,'        await tx.$executeRawUnsafe(\n          `UPDATE "Appointment"',`        if (campaign) await tx.$executeRawUnsafe(
          'UPDATE "CustomerBookingAdjustmentV652" SET "campaignId"=$2,"campaignTitle"=$3,"campaignRate"=$4,"campaignDiscount"=$5 WHERE "id"=$1',
          adjustmentId,campaign.id,campaign.title,campaignRate,campaignDiscount,
        )
        await tx.$executeRawUnsafe(
          \`UPDATE "Appointment"`)
body=replace(body,'          pointsUsed: pointsToUse,',`          campaignId: campaign?.id,
          campaignTitle: campaign?.title,
          campaignRate,
          campaignDiscount,
          pointsUsed: pointsToUse,`)
const helper=`
async function applyInTransaction(tx,session,body,campaign=null) {
  const appointmentId=String(body.appointmentId || '').trim().slice(0,160)
  const requestedCouponId=String(body.couponIssueId || '').trim().slice(0,160)
  const pointsToUse=Number(body.pointsToUse ?? 0)
  if(!appointmentId || !Number.isSafeInteger(pointsToUse) || pointsToUse<0)throw Object.assign(new Error('予約情報と利用ポイントを確認してください。'),{status:400})
${body}
}
`
service=service.slice(0,txStart)+"      const result = await prisma.$transaction(tx => applyInTransaction(tx,session,body), { isolationLevel: 'Serializable' })"+service.slice(txEnd+"      }, { isolationLevel: 'Serializable' })".length)
service=replace(service,'function createCustomerBookingCouponService({ prisma, sessionProvider }) {',helper+'\nfunction createCustomerBookingCouponService({ prisma, sessionProvider }) {')
service=replace(service,'adjustment."menuPrice",adjustment."couponDiscount",','adjustment."campaignId",adjustment."campaignTitle",adjustment."campaignRate",adjustment."campaignDiscount",\n              adjustment."menuPrice",adjustment."couponDiscount",')
service=replace(service,'module.exports = { createCustomerBookingCouponService }','module.exports = { createCustomerBookingCouponService, applyInTransaction }')
write('customer-booking-points-v652.js',service)

let tenant=read('tenant-setup.js')
tenant=replace(tenant,"        await require('./campaign-booking-v685.cjs').assertCampaignMenu(transaction,session,data.campaignId,menu.id)",`        const campaign = await require('./campaign-booking-v685.cjs').assertCampaignMenu(transaction,session,data.campaignId,menu.id)
        if(campaign && data.campaignDiscountRate !== undefined && Number(data.campaignDiscountRate) !== campaign.discountRate)throw new Error('キャンペーンの割引率が変更されました。画面を更新して内容をご確認ください。')`)
tenant=replace(tenant,'        return { appointment, customerName: customer.name }',`        const pricing = campaign ? await require('./customer-booking-points-v652').applyInTransaction(transaction,{...session,customerId:customer.id},{appointmentId:appointment.id,couponIssueId:data.couponIssueId,pointsToUse:data.pointsToUse},campaign) : null
        if(pricing)appointment.estimatedPrice=pricing.finalPrice
        return { appointment, customerName: customer.name, pricing }`)
tenant=replace(tenant,"{ success: true, appointment: { id: result.appointment.id", "{ success: true, pricing: result.pricing, appointment: { estimatedPrice: result.appointment.estimatedPrice, id: result.appointment.id")
write('tenant-setup.js',tenant)

let journey=read('public/customer-journey-v685.js')
journey=replace(journey,'  window.OrimiaCampaignBookingV685={read,permits,initializeMenu,render}', '  window.OrimiaCampaignBookingV685={read,permits,initializeMenu,render}\n'+local('campaign-client.js'))
journey=replace(journey,'{...body,campaignId:current.id}',"{...body,campaignId:current.id,campaignDiscountRate:current.campaign.discountRate,couponIssueId:window.__lienSelectedCouponV366?.id || body.couponIssueId || '',pointsToUse:window.__lienBookingPointsV652 ?? body.pointsToUse ?? 0}")
write('public/customer-journey-v697.js',journey)

let confirmation=read('public/customer-booking-confirmation-v616.js')
confirmation=replace(confirmation,'    const eligible = state.coupons.filter',`    const campaignId = window.OrimiaCampaignBookingV685?.read()?.id || ''
    if(state.campaignIdV697 !== campaignId){
      if(campaignId && !new URLSearchParams(location.search).has('coupon'))state.selectedCouponId=''
      state.campaignIdV697=campaignId
    }
    const eligible = state.coupons.filter`)
confirmation=replace(confirmation,'    const selected = eligible.find(coupon => coupon.id === state.selectedCouponId) || null',`    const selected = eligible.find(coupon => coupon.id === state.selectedCouponId) || null
    const campaign = window.OrimiaCampaignBookingV685?.quote?.(details.select.value,details.price,selected) || {id:'',rate:0,discount:0}`)
confirmation=replace(confirmation,'      selected: state.selectedCouponId,','      selected: state.selectedCouponId,\n      campaign,')
confirmation=replace(confirmation,"    none.textContent = !state.loaded ?", "    none.textContent = campaign.rate > 0 ? 'キャンペーン ' + campaign.rate + '%OFFを利用' : !state.loaded ?")
confirmation=replace(confirmation,"    select.value = state.selectedCouponId",`    root.querySelector('.lien-booking-v616__label span:last-child').textContent = campaign.rate > 0 ? '利用する割引' : '利用するクーポン'
    select.setAttribute('aria-label',campaign.rate > 0 ? '利用する割引' : '利用するクーポン')
    select.value = state.selectedCouponId`)
confirmation=replace(confirmation,'    hint.textContent = state.loadError || (',"    hint.textContent = state.loadError || (campaign.rate > 0 ? (selected ? '選択したクーポンを適用します。キャンペーン割引との併用はできません。' : 'キャンペーン割引を適用しています。通常クーポンとの併用はできません。') : ")
// Points UI owns the final breakdown when loaded; do not overwrite its total on mutations.
confirmation=replace(confirmation,'    amounts.innerHTML = `', '    if (!window.__lienCustomerBookingPointsUiV652) amounts.innerHTML = `')
confirmation=replace(confirmation,'${yen(details.price - discount)}','${yen(details.price - discount - campaign.discount)}')
confirmation=replace(confirmation,': \'\'}<div class="lien-booking-v616__total">',': \'\'}${campaign.discount ? `<div class="lien-booking-v616__discount"><dt>キャンペーン ${campaign.rate}%OFF</dt><dd>-${yen(campaign.discount)}</dd></div>` : \'\'}<div class="lien-booking-v616__total">')
confirmation=replace(confirmation,'  function tokyoDateKey(value) {',"  window.addEventListener('orimia:campaign-booking-v685',()=>syncBookingSummary(true))\n  function tokyoDateKey(value) {")
write('public/customer-booking-confirmation-v697.js',confirmation)

let points=read('public/customer-booking-points-v652.js')
points=replace(points,'    const afterCoupon = Math.max(0, details.price - couponDiscount)',`    const campaign = window.OrimiaCampaignBookingV685?.quote?.(details.select?.value,details.price,coupon) || {id:'',rate:0,discount:0}
    const afterCoupon = Math.max(0, details.price - couponDiscount - campaign.discount)`)
points=replace(points,'      couponDiscount,','      couponDiscount,\n      campaign,')
points=replace(points,'      couponKind: quote.coupon?.benefitKind || \'\',','      couponKind: quote.coupon?.benefitKind || \'\',\n      campaign: quote.campaign,')
points=replace(points,"      + (state.pointsToUse > 0 ?", "      + (quote.campaign.discount > 0 ? `<div class=\"lien-booking-v616__discount\"><dt>キャンペーン ${quote.campaign.rate}%OFF</dt><dd>-${yen(quote.campaign.discount)}</dd></div>` : '')\n      + (state.pointsToUse > 0 ?")
points=replace(points,"    window.addEventListener('popstate', () => queue(true))", "    window.addEventListener('orimia:campaign-booking-v685', () => queue(true))\n    window.addEventListener('popstate', () => queue(true))")
write('public/customer-booking-points-v697.js',points)

let workflow=read('ui-workflows-v294.js')
workflow=replace(workflow,'      const appointmentId = payload?.appointment?.id',`      if(payload.pricing?.bookingApplied){window.__lienBookingPointsV652=0;return response}
      const appointmentId = payload?.appointment?.id`)
workflow=replace(workflow,'        pricing.couponIssueId ? `クーポン',`        pricing.campaignDiscount > 0 ? \`キャンペーン　\${pricing.campaignTitle}（\${pricing.campaignRate}%OFF） -\${yen(pricing.campaignDiscount)}\` : null,
        pricing.couponIssueId ? \`クーポン`)
write('ui-workflows-v294.js',workflow)
let server=read('server.js')
server=replace(server,'/customer-journey-v685.js?v=685','/customer-journey-v697.js?v=697')
server=replace(server,'/customer-booking-confirmation-v616.js?v=645-pricing1','/customer-booking-confirmation-v697.js?v=697-1')
server=replace(server,'/customer-booking-points-v652.js?v=652-release1','/customer-booking-points-v697.js?v=697-1')
server=replace(server,"res.setHeader('X-Lien-Dealer-Calendar-Day','v696')","res.setHeader('X-Lien-Dealer-Calendar-Day','v696')\n   if(url.pathname === '/api/health/ready')res.setHeader('X-Lien-Campaign-Discount','v697')")
write('server.js',server)
console.log('campaign-discount-v697 applied')
