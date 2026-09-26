'use strict'
const fs=require('fs'),http=require('http')
const menus=[['cut','カット'],['color','カラー'],['spa','ヘッドスパ']]
const html=`<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/customer-journey-v601.css"><link rel="stylesheet" href="/campaign-booking-v685.css"><style>body{margin:0;background:#fffafc;font-family:Arial,sans-serif}main{max-width:900px;margin:auto;padding:20px;box-sizing:border-box}.cj-choices{display:none}.cj-main{min-height:900px}</style></head><body><main class="content"><div><section><select class="cx-menu-native-select-v508">${menus.map(([id,name])=>`<option value="${id}">${name}（60分・目安 5,500円）</option>`).join('')}</select><div><button aria-pressed="true">担当フリー</button></div><p>担当者</p></section><section><button aria-label="予約可能">空き時間<svg class="lucide-check"></svg></button></section></div></main><script>window.changes=[];window.requests=[];document.querySelector('select').addEventListener('change',e=>window.changes.push(e.target.value));const original=window.fetch;window.fetch=async(input,init={})=>{if(String(input).endsWith('/api/customer/appointments'))window.requests.push(JSON.parse(init.body));return original(input,init)}</script><script src="/customer-journey-v685.js" defer></script></body></html>`
http.createServer((req,res)=>{
  const url=new URL(req.url,'http://local')
  res.setHeader('Cache-Control','no-store')
  if(url.pathname==='/api/customer/campaign-booking'){
    const id=url.searchParams.get('campaign')
    setTimeout(()=>{res.setHeader('Content-Type','application/json');if(id==='expired'){res.statusCode=404;res.end(JSON.stringify({error:'このキャンペーンは終了したか、現在利用できません。'}));return}res.end(JSON.stringify({campaign:{id,title:'ヘッドスパキャンペーン',targetMenu:id==='all'?null:'ヘッドスパ'},menuIds:id==='all'?['cut','color','spa']:['spa']}))},id==='slow'?1500:50);return
  }
  if(url.pathname==='/api/customer/appointments'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({success:true,appointment:{id:'fixture-booking'}}));return}
  const asset=url.pathname.slice(1)
  if(['campaign-booking-v685.js','campaign-booking-v685.css','customer-journey-v685.js','customer-journey-v601.css','customer-icons-v601.svg'].includes(asset)){
    res.setHeader('Content-Type',asset.endsWith('.js')?'application/javascript':asset.endsWith('.css')?'text/css':'image/svg+xml');res.end(fs.readFileSync('/app/public/'+asset));return
  }
  res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html)
}).listen(Number(process.env.PORT||3192),'0.0.0.0',()=>console.log('v685 browser fixture ready'))
