'use strict'
const fs=require('node:fs'),http=require('node:http')
const assets=['customer-journey-v697.js','customer-booking-confirmation-v697.js','customer-booking-points-v697.js','customer-journey-v601.css','campaign-booking-v685.css','customer-icons-v601.svg']
const workflow=fs.readFileSync('/app/ui-workflows-v294.js','utf8')
const start=workflow.indexOf(';(() => {\n  if (window.__lienCustomerBookingCouponV366)')
const end=workflow.indexOf('\n\n;(() => {\n  /* asset-persistence-banner-v462',start)
if(start<0||end<0)throw Error('Booking workflow fixture anchor missing')
const coupons=[{id:'ten',couponCode:'TEN',discountRate:10,targetMenus:['カット']},{id:'stamp',couponCode:'FREE',discountRate:100,benefitKind:'STAMP_MENU_FREE',targetMenus:['カット']}]
const html=`<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/customer-journey-v601.css"><link rel="stylesheet" href="/campaign-booking-v685.css"><style>*{box-sizing:border-box}body{margin:0;font-family:Arial,sans-serif}main{max-width:1040px;margin:auto;padding:20px}.cj-choices{display:none}.cj-main{min-height:700px}</style></head><body><main class="content"><div><section><select class="cx-menu-native-select-v508"><option value="cut">カット（60分・目安 5,500円）</option><option value="spa">ヘッドスパ（60分・目安 5,500円）</option></select><div><button aria-pressed="true">担当フリー</button></div><p>担当者</p></section><section><button aria-label="予約可能" data-cj-day="1">10月2日 10:00<svg class="lucide-check"></svg></button><div><p>選択した予約内容</p><p>10月2日 10:00 / カット</p><button id="submit">この日時で予約する</button></div></section></div></main><script>window.requests=[];window.adjustments=[];const original=window.fetch;window.fetch=(input,init={})=>{if(String(input)==='/api/customer/appointments')window.requests.push(JSON.parse(init.body));if(String(input)==='/api/lien-customer-booking-coupon')window.adjustments.push(JSON.parse(init.body));return original(input,init)};document.querySelector('#submit').onclick=async()=>{const r=await fetch('/api/customer/appointments',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({menuKey:document.querySelector('select').value})});window.bookingResult={status:r.status,body:await r.json()}};</script><script src="/workflow.js" defer></script><script src="/customer-journey-v697.js" defer></script><script src="/customer-booking-confirmation-v697.js" defer></script><script src="/customer-booking-points-v697.js" defer></script></body></html>`
http.createServer(async(req,res)=>{
  const url=new URL(req.url,'http://fixture');res.setHeader('Cache-Control','no-store')
  const json=(status,data)=>{res.statusCode=status;res.setHeader('Content-Type','application/json');res.end(JSON.stringify(data))}
  if(url.pathname==='/api/customer/campaign-booking'){
    const id=url.searchParams.get('campaign')
    setTimeout(()=>id==='expired'?json(404,{error:'このキャンペーンは終了しました。'}):json(200,{campaign:{id,title:'カット20%OFF',targetMenu:'カット',discountRate:20},menuIds:['cut']}),id==='slow'?500:20);return
  }
  if(url.pathname==='/api/lien-customer-booking-context'){json(200,{coupons,coupon:coupons.find(x=>x.id===url.searchParams.get('coupon')),points:{availablePoints:760,minimumRedeem:1,maxRedemptionPercent:50}});return}
  if(url.pathname==='/api/customer/appointments'){
    let raw='';for await(const chunk of req)raw+=chunk
    const body=JSON.parse(raw)
    if(body.campaignId==='changed'){json(409,{error:'キャンペーンの割引率が変更されました。'});return}
    json(200,{success:true,appointment:{id:'fixture-appointment'},pricing:body.campaignId?{bookingApplied:true}:null});return
  }
  if(url.pathname==='/api/lien-customer-booking-coupon'){json(200,{success:true});return}
  if(url.pathname==='/workflow.js'){res.setHeader('Content-Type','application/javascript');res.end(workflow.slice(start,end));return}
  const asset=url.pathname.slice(1)
  if(assets.includes(asset)){res.setHeader('Content-Type',asset.endsWith('.js')?'application/javascript':asset.endsWith('.css')?'text/css':'image/svg+xml');res.end(fs.readFileSync('/app/public/'+asset));return}
  res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html)
}).listen(Number(process.env.PORT||3202),'0.0.0.0',()=>console.log('v697 browser fixture ready'))
