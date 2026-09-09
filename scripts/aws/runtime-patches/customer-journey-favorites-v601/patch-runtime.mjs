import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
const root=process.env.LIEN_RUNTIME_ROOT||'/app', here=path.dirname(fileURLToPath(import.meta.url)), changes=[]
function replace(file,before,after){const target=path.join(root,file),source=fs.readFileSync(target,'utf8');if(source.split(before).length!==2)throw Error('Unexpected parent anchor: '+file+' '+before.slice(0,100));fs.writeFileSync(target,source.replace(before,after));changes.push({file,before,after})}
const server='server.js'
replace(server,"const catalogOperations = createCatalogOperationsService({ prisma, crypto })",`const customerFavoritesV601 = require('./customer-favorites-v601').createCustomerFavoritesService({ prisma, sessionProvider: req => chatSession(req, 'customer') })
const { customerSummaryV601 } = require('./customer-summary-v601')
const catalogOperations = createCatalogOperationsService({ prisma, crypto })`)
replace(server,'await catalogOperations.ensureSchema()', 'await customerFavoritesV601.ensureSchema(); await catalogOperations.ensureSchema()')
replace(server,"      if (url.pathname === '/api/customer/profile' && req.method === 'POST')",`      if (await customerFavoritesV601.handle(req,res,url)) return
      if (url.pathname === '/api/customer/mypage-summary' && req.method === 'GET') {
        const session = await chatSession(req,'customer')
        if (!session) return json(res,401,{error:'ログインしてください。'})
        const summary = await customerSummaryV601(prisma,session,await customerLinks.customerPublicCode(session))
        res.setHeader('Cache-Control','private, no-store')
        return json(res,summary ? 200 : 404,summary || {error:'会員情報が見つかりません。'})
      }
      if (url.pathname === '/api/customer/profile' && req.method === 'POST')`)
replace(server,"  if (!customerRoute) return output\n",`  if (!customerRoute) return output
  if (!output.includes('id="customer-journey-v601"')) output = output.replace('</head>', '<link rel="stylesheet" href="/customer-journey-v601.css"><script id="customer-journey-v601" src="/customer-journey-v601.js" defer></script></head>')
`)
replace(server,"res.setHeader('X-Lien-Hotpepper-Style-Import', 'v600')","res.setHeader('X-Lien-Customer-Journey', 'v601'); res.setHeader('X-Lien-Hotpepper-Style-Import', 'v600')")
replace(server,'async function customerCatalogPage(res, session, productId, url) {\n  const data = await customerAppData(session)',`async function customerCatalogPage(res, session, productId, url) {
  const data = await customerAppData(session)
  const favorites = await customerFavoritesV601.listProducts(session)
  const favoriteIds = new Set(favorites.map(product => product.id))`)
replace(server,'const product = products.find(p => p.id === productId)','const product = products.find(p => p.id === productId) || await customerFavoritesV601.findProduct(session, productId)')
replace(server,"<div class=\"description\">${htmlEscape(product.description","<div class=\"cj-favorite-wrap\"><button class=\"cj-favorite\" type=\"button\" data-cj-favorite=\"${htmlEscape(product.id)}\" aria-pressed=\"${favoriteIds.has(product.id)}\"><svg class=\"cj-icon\" aria-hidden=\"true\"><use href=\"/customer-icons-v601.svg#Heart\"></use></svg><span>${favoriteIds.has(product.id) ? 'お気に入りに追加済み' : 'お気に入りに追加'}</span></button><output data-cj-favorite-status role=\"status\" aria-live=\"polite\"></output></div><div class=\"description\">${htmlEscape(product.description")
replace(server,"const allowed = new Set(['all','haircare','styling','concerns'])","const allowed = new Set(['all','haircare','styling','favorites'])")
replace(server,"const requested = url?.searchParams.get('category') || 'all'","const requested = (url?.searchParams.get('category') || 'all').replace(/^concerns$/, 'favorites')")
replace(server,"const visibleProducts = products.filter(p => selected === 'all' || (selected === 'haircare' && haircarePattern.test(textFor(p))) || (selected === 'styling' && stylingPattern.test(textFor(p))) || (selected === 'concerns' && jsonArray(p.concernTags).length > 0))","const visibleProducts = selected === 'favorites' ? favorites : products.filter(p => selected === 'all' || (selected === 'haircare' && haircarePattern.test(textFor(p))) || (selected === 'styling' && stylingPattern.test(textFor(p))))")
replace(server,"['concerns','お悩み別']","['favorites','お気に入り']")
replace(server,'<section class="product-list">${visibleProducts.length ?','<section class="product-list ${selected === \'favorites\' ? \'cj-favorites-list\' : \'\'}">${visibleProducts.length ?')
replace(server,"${customerRankBadge(i)}${customerProductArt(p)}","${selected === 'favorites' ? '<span class=\"cj-favorite-mark\"><svg class=\"cj-icon\" aria-hidden=\"true\"><use href=\"/customer-icons-v601.svg#Heart\"></use></svg></span>' : customerRankBadge(i)}${customerProductArt(p)}")
replace(server,"'<p style=\"padding:30px;text-align:center;color:#81756f\">このカテゴリーに該当する販売中の商品はありません</p>'","(selected === 'favorites' ? '<p class=\"cj-empty\">お気に入りの商品はまだありません</p><a class=\"primary\" href=\"/u/catalog\">商品を探す</a>' : '<p style=\"padding:30px;text-align:center;color:#81756f\">このカテゴリーに該当する販売中の商品はありません</p>')")
replace(server,'const body = `<div class="page-title"><h1>私に合うアイテムランキング</h1></div><section class="ranking-intro"><div class="ranking-kicker"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 8 4 3.2L12 5l4 6.2L20 8l-1.7 8.8H5.7z"></path><path d="M6 19h12"></path></svg><span>MONTHLY SELECT</span></div><h2>お客様愛用ランキング</h2><p>実際の購入データと髪のお悩みタグからご紹介</p></section><nav class="tabs" aria-label="商品カテゴリー">','const body = `<div class="page-title"><h1>${selected === \'favorites\' ? \'お気に入りアイテム\' : \'私に合うアイテムランキング\'}</h1></div>${selected === \'favorites\' ? \'\' : \'<section class="ranking-intro"><div class="ranking-kicker"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 8 4 3.2L12 5l4 6.2L20 8l-1.7 8.8H5.7z"></path><path d="M6 19h12"></path></svg><span>MONTHLY SELECT</span></div><h2>お客様愛用ランキング</h2><p>実際の購入データと髪のお悩みタグからご紹介</p></section>\'}<nav class="tabs" aria-label="商品カテゴリー">')
for(const file of ['customer-favorites-v601.js','customer-summary-v601.js'])fs.copyFileSync(path.join(here,file),path.join(root,file))
for(const file of ['customer-journey-v601.js','customer-journey-v601.css','customer-icons-v601.svg'])fs.copyFileSync(path.join(here,file),path.join(root,'public',file))
fs.writeFileSync('/tmp/customer-journey-v601-changes.json',JSON.stringify(changes))
console.log(JSON.stringify({release:'customer-journey-favorites-v601',modified:[...new Set(changes.map(c=>c.file))]}))
