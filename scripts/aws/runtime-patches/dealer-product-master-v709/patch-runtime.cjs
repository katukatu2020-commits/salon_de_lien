'use strict'
const fs=require('node:fs'),path=require('node:path'),root=process.env.LIEN_RUNTIME_ROOT||'/app'
function once(s,a,b){if(s.split(a).length!==2)throw Error('Patch anchor mismatch: '+a.slice(0,100));return s.replace(a,()=>b)}
function edit(file,fn){const p=path.join(root,file);fs.writeFileSync(p,fn(fs.readFileSync(p,'utf8')))}
const dir=path.join(root,'dealer-product-master-v709');fs.mkdirSync(dir,{recursive:true})
for(const file of ['catalog.cjs','page.cjs'])fs.copyFileSync(path.join(__dirname,file),path.join(dir,file))
fs.copyFileSync(path.join(__dirname,'client.js'),path.join(root,'public/dealer-product-master-v709.js'))
fs.copyFileSync(path.join(__dirname,'style.css'),path.join(root,'public/dealer-product-master-v709.css'))
edit('wholesale-ordering-v543.js',s=>{
  s=once(s,'  const authAttempts = new Map()',`  const authAttempts = new Map()
  const masterCatalogV709 = require('./dealer-product-master-v709/catalog.cjs').createCatalog({db:prisma,h:{session:dealerSession,portal:dealerPortalPage,sameOrigin:validSameOrigin,readPayload,json,html,redirect}})`)
  s=once(s,'    if (await dealerErpV678.flowPortal.handle(req, res, url)) return true','    if (await masterCatalogV709.handle(req, res, url)) return true\n    if (await dealerErpV678.flowPortal.handle(req, res, url)) return true')
  s=once(s,"dealer.staffUserId && dealer.mustChangePassword ? '/dealer/password-change' : '/dealer/orders'","dealer.staffUserId && dealer.mustChangePassword ? '/dealer/password-change' : await masterCatalogV709.landing(dealer)")
  return once(s,"head:sharedHead('ディーラー管理'),icon,escapeHtml,...custom}","head:sharedHead('ディーラー管理').replace('</head>','<link rel=\"stylesheet\" href=\"/dealer-product-master-v709.css\"></head>'),icon,escapeHtml,...custom}")
})
edit('dealer-workspace-v688.js',s=>once(s,
  `  const main = content ?? '<div id="wholesale-app" class="wo-app-root"><div class="wo-loading"><span></span><p>管理情報を読み込んでいます</p></div></div>'`,
  `  const main = content ?? ((key==='products'&&dealer.role==='ADMIN'?'<div class="dpm-entry"><a class="wo-button wo-button-primary" href="/dealer/products/master">マスタから商品を選ぶ</a></div>':'')+'<div id="wholesale-app" class="wo-app-root"><div class="wo-loading"><span></span><p>管理情報を読み込んでいます</p></div></div>')`))
edit('server.js',s=>once(s,
  "if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Private-Treatment-Comments', 'v708')",
  "if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Private-Treatment-Comments', 'v708')\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Dealer-Product-Master', 'v709')"))
console.log('v709 dealer product master: existing product storage, fixed source, independent dealer registration')
