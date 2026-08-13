const fs = require('fs')
const path = require('path')

const appRoot = process.env.APP_ROOT || '/app'

function replaceServerFunction(source, name, nextName, replacement) {
  const pattern = new RegExp(`async function ${name}\\([\\s\\S]*?\\n}\\r?\\n\\r?\\nasync function ${nextName}\\(`)
  const match = source.match(pattern)
  if (!match) throw new Error(`server function not found: ${name}`)
  return source.replace(pattern, `${replacement.toString()}\n\nasync function ${nextName}(`)
}

function replaceOnce(source, before, after, label) {
  const count = source.split(before).length - 1
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`)
  return source.replace(before, after)
}

async function customerCatalogPage(res, session, productId, url) {
  const data = await customerAppData(session)
  const products = await prisma.$queryRawUnsafe('SELECT p."id",p."manufacturerName",p."name",p."category",p."retailPrice",p."concernTags",p."description",p."alternativeRecommendation",COALESCE(SUM(sl."quantity"),0)::int AS "soldCount" FROM "Product" p LEFT JOIN "ProductSaleLine" sl ON sl."productId"=p."id" WHERE p."organizationId"=$1 AND p."active"=true AND p."salesSuspended"=false GROUP BY p."id" ORDER BY "soldCount" DESC,p."updatedAt" DESC LIMIT 40', session.organizationId)
  if (productId) {
    const product = products.find(p => p.id === productId)
    if (!product) { res.statusCode = 404; return res.end('Not found') }
    const tags = jsonArray(product.concernTags)
    const alternatives = products.filter(p => p.id !== product.id && jsonArray(p.concernTags).some(t => tags.includes(t))).sort((a,b) => jsonArray(b.concernTags).filter(t => tags.includes(t)).length - jsonArray(a.concernTags).filter(t => tags.includes(t)).length).slice(0,3)
    const body = `<div class="page-title"><h1>アイテム詳細</h1></div><div class="detail-visual"><div class="product-art">${htmlEscape(product.manufacturerName.slice(0,8))}</div></div><article class="detail-card"><h1>${htmlEscape(product.name)}</h1><div class="tags">${[product.category,...tags].filter(Boolean).map(t => `<span class="tag">${htmlEscape(t)}</span>`).join('')}</div><p class="price">${yen(product.retailPrice)}（税込）</p><div class="description">${htmlEscape(product.description || 'サロンで髪の状態を確認し、使い方と使用量をご案内します。')}</div><section class="recommend"><h2>こんなお悩みにおすすめ</h2><ul>${(tags.length ? tags : ['毎日のホームケア','髪のまとまり']).map(t => `<li>${htmlEscape(t)}が気になる方</li>`).join('')}</ul></section>${alternatives.length ? `<section class="recommend"><h2>合わない場合の代替アイテム</h2><ul>${alternatives.map(p => `<li><a href="/u/catalog/${encodeURIComponent(p.id)}">${htmlEscape(p.name)}</a></li>`).join('')}</ul></section>` : ''}<a class="primary" href="/u/appointments">次回来店時に取り置きを相談</a><a class="secondary" href="/u/appointments?view=chat">スタッフにチャットで相談</a></article>`
    return sendCustomerHtml(res, customerShell({ title: product.name, unread: data.unread, back: '/u/catalog', body }))
  }

  const allowed = new Set(['all','haircare','styling','concerns'])
  const requested = url?.searchParams.get('category') || 'all'
  const selected = allowed.has(requested) ? requested : 'all'
  const textFor = p => [p.name,p.category,p.description,...jsonArray(p.concernTags)].filter(Boolean).join(' ')
  const haircarePattern = /シャンプー|トリートメント|ヘアケア|スカルプ|頭皮|オージュア|Aujua/i
  const stylingPattern = /スタイリング|ワックス|ジェル|スプレー|オイル|バーム|ミスト|フォーム/i
  const visibleProducts = products.filter(p => selected === 'all' || (selected === 'haircare' && haircarePattern.test(textFor(p))) || (selected === 'styling' && stylingPattern.test(textFor(p))) || (selected === 'concerns' && jsonArray(p.concernTags).length > 0))
  const categories = [['all','総合'],['haircare','ヘアケア'],['styling','スタイリング'],['concerns','お悩み別']]
  const tabs = categories.map(([key,label]) => `<a class="tab ${selected === key ? 'active' : ''}" href="${key === 'all' ? '/u/catalog' : `/u/catalog?category=${key}`}"${selected === key ? ' aria-current="page"' : ''}>${label}</a>`).join('')
  const body = `<div class="page-title"><h1>私に合うアイテムランキング</h1></div><section class="ranking-intro"><div class="laurel">☆ 今月の ☆</div><h2>お客様愛用ランキング</h2><p>実際の購入データと髪のお悩みタグからご紹介</p></section><nav class="tabs" aria-label="商品カテゴリー">${tabs}</nav><section class="product-list">${visibleProducts.length ? visibleProducts.map((p,i) => { const tags = jsonArray(p.concernTags).slice(0,2); return `<a class="product-row" href="/u/catalog/${encodeURIComponent(p.id)}"><span class="rank ${i < 3 ? 'top' : ''}">${i+1}</span><span class="product-art ${i % 3 === 1 ? 'jar' : ''}">${htmlEscape(p.manufacturerName.slice(0,5))}</span><span class="product-meta"><h3>${htmlEscape(p.name)}</h3><p>${htmlEscape(p.description || `${p.category || 'ヘアケア'}のためのサロン専売アイテム`)}</p><span class="tags">${tags.map(t => `<span class="tag">${htmlEscape(t)}</span>`).join('')}</span></span>${customerIcon('chevron')}</a>` }).join('') : '<p style="padding:30px;text-align:center;color:#81756f">このカテゴリーに該当する販売中の商品はありません</p>'}</section>`
  sendCustomerHtml(res, customerShell({ title: 'アイテムランキング', unread: data.unread, back: '/u/home', body }))
}

async function customerCouponsPage(res, session, url) {
  const data = await customerAppData(session), now = new Date()
  const [coupons, issues] = await Promise.all([
    prisma.$queryRawUnsafe('SELECT "id","title","description","targetMenu","discountType","discountValue","validUntil","couponCode" FROM "Coupon" WHERE "customerId"=$1 AND "status"=\'issued\' AND "validUntil">=$2 ORDER BY "validUntil" ASC LIMIT 30', session.customerId, now),
    prisma.$queryRawUnsafe('SELECT "id",\'限定クーポン\' AS title,"discountRate","targetMenusJson","expiresAt" AS "validUntil","couponCode" FROM "CouponIssue" WHERE "customerId"=$1 AND "status"=\'issued\' AND "expiresAt">=$2 ORDER BY "expiresAt" ASC LIMIT 30', session.customerId, now),
  ])
  const rows = [...coupons.map(c => ({...c, benefit: `${c.discountValue}${String(c.discountType).includes('%') ? '%OFF' : ''}`, menu: c.targetMenu})), ...issues.map(c => ({...c, benefit: `${c.discountRate}%OFF`, menu: jsonArray(c.targetMenusJson).join('・')}))]
  const allowed = new Set(['all','recommended','limited','referral'])
  const requested = url?.searchParams.get('filter') || 'all'
  const selected = allowed.has(requested) ? requested : 'all'
  const referralPattern = /紹介|友達|家族/
  const viewRows = selected === 'recommended' ? rows.slice(0,8) : selected === 'limited' ? rows.filter(c => (new Date(c.validUntil).getTime() - now.getTime()) <= 45 * 86400000) : selected === 'referral' ? rows.filter(c => referralPattern.test([c.title,c.description,c.menu].filter(Boolean).join(' '))) : rows
  const filters = [['all','すべて'],['recommended','おすすめ'],['limited','期間限定'],['referral','紹介特典']]
  const tabs = filters.map(([key,label]) => `<a class="tab ${selected === key ? 'active' : ''}" href="${key === 'all' ? '/u/coupons' : `/u/coupons?filter=${key}`}"${selected === key ? ' aria-current="page"' : ''}>${label}</a>`).join('')
  const body = `<div class="page-title"><h1>クーポン一覧</h1></div><nav class="tabs" aria-label="クーポン絞り込み">${tabs}</nav><section class="coupon-list">${viewRows.length ? viewRows.map((c,i) => `<article class="coupon"><small>${i === 0 && selected !== 'referral' ? 'おすすめ' : 'Salon de Lien Member'}</small><h2>${htmlEscape(c.title)}</h2><div class="benefit">${htmlEscape(c.benefit || 'SPECIAL')}</div><p>${htmlEscape(c.menu || c.description || '対象メニューはスタッフへご確認ください')}</p><p>有効期限：${htmlEscape(jpDate(c.validUntil))}</p><a href="/u/appointments">このクーポンを使う</a></article>`).join('') : '<article class="coupon"><h2>条件に合うクーポンはありません</h2><p>ほかのカテゴリーもご確認ください。新しいクーポンが届くと、お知らせにも表示されます。</p><a href="/u/coupons">すべてのクーポンを見る</a></article>'}</section>`
  sendCustomerHtml(res, customerShell({ title: 'クーポン', unread: data.unread, back: '/u/home', body }))
}

async function customerStampsPage(res, session, url) {
  const data = await customerAppData(session)
  const visits = await prisma.$queryRawUnsafe('SELECT "performedStyle","requestedStyle" FROM "Visit" WHERE "customerId"=$1 ORDER BY "visitedAt" DESC', session.customerId)
  const selected = url?.searchParams.get('type') === 'facial' ? 'facial' : 'hair'
  const facialPattern = /フェイシャル|フェイス|顔|エステ/
  const total = visits.filter(v => { const text = `${v.performedStyle || ''} ${v.requestedStyle || ''}`; return selected === 'facial' ? facialPattern.test(text) : !facialPattern.test(text) }).length
  const stamps = total % 10
  const label = selected === 'facial' ? 'フェイシャル' : 'ヘア'
  const tabs = `<a class="tab ${selected === 'hair' ? 'active' : ''}" href="/u/stamps"${selected === 'hair' ? ' aria-current="page"' : ''}>ヘア</a><a class="tab ${selected === 'facial' ? 'active' : ''}" href="/u/stamps?type=facial"${selected === 'facial' ? ' aria-current="page"' : ''}>フェイシャル</a>`
  const body = `<div class="page-title"><h1>スタンプカード</h1></div><nav class="tabs" aria-label="スタンプカード種別">${tabs}</nav><section class="stamp-card"><div class="section-head"><div><h2>${label}スタンプカード</h2><p>ご来店1回につき1スタンプ</p></div><strong>${stamps} / 10個</strong></div><div class="stamp-grid">${Array.from({length:10},(_,i) => `<span class="stamp-dot ${i < stamps ? 'on' : ''}">${i < stamps ? '✓' : i+1}</span>`).join('')}</div></section><section class="section"><div class="section-head"><div><h2>特典内容</h2><p>次回ご来店時にご利用いただけます</p></div></div><div class="coupon"><small>NEXT REWARD</small><h2>10個達成特典</h2><div class="benefit">${selected === 'facial' ? 'FACIAL SERVICE' : 'CARE SERVICE'}</div><p>${selected === 'facial' ? 'フェイシャルメニューの特典をご案内します。' : 'トリートメントサービスなど、現在の髪に合う特典をご案内します。'}</p><a href="/u/appointments">次回予約へ</a></div></section>`
  sendCustomerHtml(res, customerShell({ title: 'スタンプカード', unread: data.unread, back: '/u/home', body }))
}

const serverFile = path.join(appRoot, 'server.js')
let serverSource = fs.readFileSync(serverFile, 'utf8')
serverSource = replaceServerFunction(serverSource, 'customerCatalogPage', 'customerCouponsPage', customerCatalogPage)
serverSource = replaceServerFunction(serverSource, 'customerCouponsPage', 'customerStampsPage', customerCouponsPage)
serverSource = replaceServerFunction(serverSource, 'customerStampsPage', 'customerNewsPage', customerStampsPage)
serverSource = replaceOnce(serverSource, "if (url.pathname === '/u/catalog') return customerCatalogPage(res, session)", "if (url.pathname === '/u/catalog') return customerCatalogPage(res, session, null, url)", 'catalog route')
serverSource = replaceOnce(serverSource, "if (url.pathname.startsWith('/u/catalog/')) return customerCatalogPage(res, session, decodeURIComponent(url.pathname.slice('/u/catalog/'.length)))", "if (url.pathname.startsWith('/u/catalog/')) return customerCatalogPage(res, session, decodeURIComponent(url.pathname.slice('/u/catalog/'.length)), url)", 'catalog detail route')
serverSource = replaceOnce(serverSource, "if (url.pathname === '/u/coupons') return customerCouponsPage(res, session)", "if (url.pathname === '/u/coupons') return customerCouponsPage(res, session, url)", 'coupons route')
serverSource = replaceOnce(serverSource, "if (url.pathname === '/u/stamps') return customerStampsPage(res, session)", "if (url.pathname === '/u/stamps') return customerStampsPage(res, session, url)", 'stamps route')
fs.writeFileSync(serverFile, serverSource)

const appointmentsFile = path.join(appRoot, '.next', 'server', 'app', 'u', '(account)', 'appointments', 'page.js')
let appointmentsSource = fs.readFileSync(appointmentsFile, 'utf8')
appointmentsSource = replaceOnce(appointmentsSource, 'c=q?.threadId?r.find(e=>e.id===q.threadId):r[0]', 'c=q?.threadId?r.find(e=>e.id===q.threadId):null', 'do not auto-select first chat')
appointmentsSource = replaceOnce(appointmentsSource, 'className:"grid gap-4 md:grid-cols-[16rem_minmax(0,1fr)]",style:{gridTemplateColumns:"16rem minmax(0,1fr)"},children:[', 'className:"grid gap-4",children:[', 'single-column chat flow')
appointmentsSource = replaceOnce(appointmentsSource, 's.jsx("aside",{className:"rounded-[22px] border border-[#e8ded2] bg-white p-3 shadow-sm"', 's.jsx("aside",{className:c?"hidden":"rounded-[22px] border border-[#e8ded2] bg-white p-3 shadow-sm"', 'hide thread list in conversation')
appointmentsSource = replaceOnce(appointmentsSource, 'children:c?(0,s.jsxs)(s.Fragment,{children:[s.jsx("h2",{className:"border-b border-[#ddd4cc] pb-3 text-lg font-semibold",children:c.staffName})', 'children:c?(0,s.jsxs)(s.Fragment,{children:[s.jsx("a",{href:"/u/appointments?view=chat",className:"mb-3 inline-flex min-h-10 items-center self-start rounded-full bg-white px-4 text-xs font-semibold text-[#8f4f42] shadow-sm",children:"← トーク一覧に戻る"}),s.jsx("h2",{className:"border-b border-[#ddd4cc] pb-3 text-lg font-semibold",children:c.staffName})', 'conversation back link')
if (appointmentsSource.includes('e.senderType==="customer"?"ml-auto flex-row-reverse":""')) {
  appointmentsSource = replaceOnce(appointmentsSource, 'e.senderType==="customer"?"ml-auto flex-row-reverse":""', 'e.senderType==="staff"?"ml-auto flex-row-reverse":""', 'customer chat alignment')
} else if (!appointmentsSource.includes('e.senderType==="staff"?"ml-auto flex-row-reverse":""')) {
  throw new Error('customer chat alignment marker not found')
}
fs.writeFileSync(appointmentsFile, appointmentsSource)

console.log(JSON.stringify({
  patched: [
    'functional catalog filters',
    'functional coupon filters',
    'functional stamp tabs',
    'mobile thread-list to conversation flow',
  ],
}))
