'use strict'
const http=require('node:http'),fs=require('node:fs')
const catalog=Array.from({length:3947},(_,i)=>({id:'dealer:p'+String(i+1).padStart(4,'0'),dealerProductId:'p'+String(i+1).padStart(4,'0'),name:i===3946?'ｵﾙﾃﾞｨｰﾌﾞ ｱﾃﾞｨｸｼｰ':'契約商品 '+String(i+1).padStart(4,'0'),manufacturerName:i%2?'サンコール':'ミルボン',category:i%2?'カラー':'ヘアケア',productCode:'SKU-'+String(i+1).padStart(4,'0'),janCode:'4954835'+String(i+1).padStart(6,'0'),dealerId:i%2?'b':'a',dealerName:i%2?'ディーラー B':'ディーラー A',orderUnit:1,unitPrice:1000,listPrice:1250,discountRate:20}))
let lastOrder=null
const bootstrap={ok:true,organization:{id:'salon',name:'テストサロン',publicCode:'SALON-TEST',taxRate:10},actor:{role:'ADMIN'},contracts:[{id:'ca',dealerId:'a',dealerName:'ディーラー A',dealerCode:'DLR-A',status:'ACTIVE'},{id:'cb',dealerId:'b',dealerName:'ディーラー B',dealerCode:'DLR-B',status:'ACTIVE'}],catalogProducts:catalog,products:[{id:'stock',name:'在庫商品',manufacturerName:'ミルボン',category:'ケア',stockQuantity:4}],selectedDealerId:'all',orders:[]}
const json=(res,data,status=200)=>{res.statusCode=status;res.setHeader('Content-Type','application/json');res.end(JSON.stringify(data))}
http.createServer(async(req,res)=>{
 const u=new URL(req.url,'http://fixture')
 if(u.pathname==='/api/admin/wholesale/bootstrap')return json(res,bootstrap)
 if(u.pathname==='/api/admin/wholesale/orders'&&req.method==='POST'){
  let body='';for await(const chunk of req)body+=chunk
  lastOrder=JSON.parse(body);return json(res,{ok:true,orders:lastOrder.orders.map((o,i)=>({id:'o'+i,orderNo:'TEST-'+i,dealerId:o.dealerId}))},201)
 }
 if(u.pathname==='/fixture/last-order')return json(res,lastOrder)
 const files={'/wholesale-ordering-v543.css':'/app/wholesale-ordering-v543.css','/salon-order-entry-v686.css':'/app/public/salon-order-entry-v686.css','/salon-order-entry-v686.js':'/app/public/salon-order-entry-v686.js'}
 if(files[u.pathname]){res.setHeader('Content-Type',u.pathname.endsWith('.js')?'application/javascript':'text/css');return res.end(fs.readFileSync(files[u.pathname]))}
 if(u.pathname==='/favicon.ico'){res.statusCode=204;return res.end()}
 res.setHeader('Content-Type','text/html; charset=utf-8');res.end('<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/wholesale-ordering-v543.css"><link rel="stylesheet" href="/salon-order-entry-v686.css"><style>body{margin:0}main{max-width:1600px;margin:auto;padding:12px}</style></head><body class="wo-body" data-wholesale-page="salon"><main><div id="wholesale-app"></div></main><script src="/salon-order-entry-v686.js"></script></body></html>')
}).listen(Number(process.env.PORT||3193),'0.0.0.0',()=>console.log('v686 order fixture ready'))
