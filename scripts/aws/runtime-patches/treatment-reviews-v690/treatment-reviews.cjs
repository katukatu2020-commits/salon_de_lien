'use strict'
const { sameOrigin } = require('./salon-settings-chat-v689')
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
const normalize = value => String(value || '').normalize('NFKC').replace(/\s/g,'').toLowerCase()
const fail = (status,message) => { throw Object.assign(new Error(message),{status}) }
const date = value => new Intl.DateTimeFormat('ja-JP',{timeZone:'Asia/Tokyo',year:'numeric',month:'long',day:'numeric'}).format(new Date(value))
const pageNumber = value => Math.max(1,Math.min(100000,Math.trunc(Number(value)||1)))
const eligible = `a."scheduledAt"<=CURRENT_TIMESTAMP AND a."status" !~* '(cancel|キャンセル|no.?show|無断)' AND EXISTS (SELECT 1 FROM "ServiceSale" s WHERE s."appointmentId"=a."id" AND s."customerId"=a."customerId" AND s."paidAt"<=CURRENT_TIMESTAMP)`
const previouslyRewarded = `EXISTS (SELECT 1 FROM "ServiceSale" rs JOIN "PointTransaction" rp ON rp."sourceId"='service-sale:'||rs."id" AND rp."sourceType"='feedback' AND rp."type"='earn' AND rp."customerId"=a."customerId" WHERE rs."appointmentId"=a."id")`
function json(res,status,value) { res.statusCode=status; res.setHeader('Content-Type','application/json; charset=utf-8'); res.setHeader('Cache-Control','private, no-store'); res.setHeader('X-Content-Type-Options','nosniff'); res.end(JSON.stringify(value)) }
async function readJson(req) {
  let bytes=0; const chunks=[]
  for await(const chunk of req) { bytes+=chunk.length; if(bytes>16384) fail(413,'入力内容が長すぎます。'); chunks.push(chunk) }
  try { const value=JSON.parse(Buffer.concat(chunks).toString('utf8')); if(!value||Array.isArray(value)||typeof value!=='object') throw Error(); return value } catch { fail(400,'入力内容を確認してください。') }
}
function createTreatmentReviews({prisma,sessionProvider,renderCustomerShell,sendCustomerHtml,staffProvider,icon}) {
  let schema
  async function ensureSchema() {
    if(!schema) schema=(async()=>{
      await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "TreatmentReview" (
        "appointmentId" TEXT PRIMARY KEY REFERENCES "Appointment"("id") ON DELETE CASCADE,
        "organizationId" TEXT NOT NULL REFERENCES "Organization"("id") ON DELETE CASCADE,
        "customerId" TEXT NOT NULL REFERENCES "Customer"("id") ON DELETE CASCADE,
        "authorUserId" TEXT NOT NULL REFERENCES "AppUser"("id") ON DELETE CASCADE,
        "staffKey" TEXT NOT NULL, "rating" INTEGER CHECK ("rating" BETWEEN 1 AND 5),
        "body" TEXT NOT NULL DEFAULT '', "rewardClaimedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "awardedPoints" INTEGER NOT NULL DEFAULT 0, "deletedAt" TIMESTAMPTZ,
        "version" INTEGER NOT NULL DEFAULT 1,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(), "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`)
      await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "TreatmentReview_staff_idx" ON "TreatmentReview"("organizationId","staffKey","createdAt" DESC) WHERE "deletedAt" IS NULL')
      await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "TreatmentReview_customer_idx" ON "TreatmentReview"("customerId","updatedAt" DESC)')
    })().catch(error=>{schema=null;throw error})
    return schema
  }
  async function rule(db=prisma) {
    const [row]=await db.$queryRawUnsafe('SELECT "points","validDays","active" FROM "PointRule" WHERE "key"=$1 LIMIT 1','feedback_submitted')
    return {points:row ? row.active ? Math.max(0,row.points) : 0 : 30,validDays:Math.max(1,row?.validDays||40)}
  }
  async function staffForVisit(db,organizationId,staffName) {
    const rows=await db.$queryRawUnsafe(`SELECT s."staffKey",s."staffName",u."displayName" FROM "StaffBookingSetting" s LEFT JOIN "AppUser" u ON u."id"=s."userId" AND u."organizationId"=s."organizationId" WHERE s."organizationId"=$1`,organizationId)
    const matched=rows.filter(s=>normalize(staffName)&&[s.staffName,s.displayName].some(n=>normalize(n)===normalize(staffName)))
    return matched.length===1 ? matched[0].staffKey : null
  }
  async function mutate(session,method,input) {
    const appointmentId=typeof input.appointmentId==='string' ? input.appointmentId : ''
    if(!appointmentId||appointmentId.length>200) fail(400,'予約を確認してください。')
    if(method!=='DELETE' && (!Number.isInteger(input.rating)||input.rating<1||input.rating>5||typeof input.body!=='string'||!input.body.trim()||input.body.trim().length>2000||input.publish!==true)) fail(400,'評価・レビュー・公開への同意を確認してください。')
    await ensureSchema()
    return prisma.$transaction(async tx=>{
      // Serialize the visit before checking the reward; account locking also protects other visits.
      const [visit]=await tx.$queryRawUnsafe(`SELECT a.*,(${eligible}) AS "eligible" FROM "Appointment" a JOIN "Customer" c ON c."id"=a."customerId" WHERE a."id"=$1 AND a."customerId"=$2 AND c."organizationId"=$3 AND c."deletedAt" IS NULL AND c."storeHiddenAt" IS NULL FOR UPDATE OF a`,appointmentId,session.customerId,session.organizationId)
      if(!visit) fail(404,'対象の来店が見つかりません。')
      const [previous]=await tx.$queryRawUnsafe('SELECT * FROM "TreatmentReview" WHERE "appointmentId"=$1',appointmentId)
      if(previous && previous.customerId!==session.customerId) fail(403,'このレビューは変更できません。')
      if(method!=='POST' && (!previous||previous.deletedAt)) fail(404,'レビューが見つかりません。')
      if(method==='POST' && previous && !previous.deletedAt && previous.rating===input.rating && previous.body===input.body.trim()) return {ok:true,awardedPoints:0,duplicate:true}
      if(previous && Number(input.version)!==previous.version) fail(409,'レビューが更新されています。ページを再読み込みしてください。')
      if(method==='POST' && previous && !previous.deletedAt) fail(409,'投稿済みのレビューです。編集画面から変更してください。')
      if(method==='DELETE') {
        await tx.$executeRawUnsafe('UPDATE "TreatmentReview" SET "body"=$2,"rating"=NULL,"deletedAt"=NOW(),"updatedAt"=NOW(),"version"="version"+1 WHERE "appointmentId"=$1',appointmentId,'')
        return {ok:true,deleted:true,awardedPoints:0}
      }
      if(!visit.eligible) fail(409,'会計済みの施術のみレビューできます。')
      const staffKey=previous?.staffKey||await staffForVisit(tx,session.organizationId,visit.staffName)
      if(!staffKey) fail(409,'施術担当者を確認できません。店舗へお問い合わせください。')
      let awardedPoints=0
      if(!previous) {
        const sales=await tx.$queryRawUnsafe('SELECT "id" FROM "ServiceSale" WHERE "appointmentId"=$1 AND "customerId"=$2 ORDER BY "paidAt","id" FOR UPDATE',appointmentId,session.customerId)
        if(!sales.length) fail(409,'会計記録を確認できません。')
        const account=await tx.customerPointAccount.upsert({where:{customerId:session.customerId},update:{},create:{customerId:session.customerId}})
        const [locked]=await tx.$queryRawUnsafe('SELECT * FROM "CustomerPointAccount" WHERE "id"=$1 FOR UPDATE',account.id)
        const [priorReward]=await tx.$queryRawUnsafe('SELECT "id" FROM "PointTransaction" WHERE "customerId"=$1 AND "sourceType"=$2 AND "sourceId"=ANY($3::text[]) AND "type"=$4 LIMIT 1',session.customerId,'feedback',sales.map(s=>'service-sale:'+s.id),'earn')
        const settings=await rule(tx)
        if(!priorReward && settings.points>0) {
          awardedPoints=settings.points
          const expiresAt=new Date(Date.now()+settings.validDays*86400000)
          const reward=await tx.pointTransaction.create({data:{customerId:session.customerId,accountId:account.id,type:'earn',amount:awardedPoints,balanceAfter:locked.availablePoints+awardedPoints,sourceType:'feedback',sourceId:'service-sale:'+sales[0].id,reason:'来店後フィードバック回答（施術レビュー）',expiresAt}})
          await tx.pointLot.create({data:{customerId:session.customerId,earnTransactionId:reward.id,originalAmount:awardedPoints,remainingAmount:awardedPoints,expiresAt}})
          await tx.customerPointAccount.update({where:{id:account.id},data:{availablePoints:{increment:awardedPoints},lifetimeEarned:{increment:awardedPoints}}})
        }
      }
      await tx.$executeRawUnsafe(`INSERT INTO "TreatmentReview" ("appointmentId","organizationId","customerId","authorUserId","staffKey","rating","body","awardedPoints") VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        ON CONFLICT ("appointmentId") DO UPDATE SET "rating"=EXCLUDED."rating","body"=EXCLUDED."body","deletedAt"=NULL,"updatedAt"=NOW(),"version"="TreatmentReview"."version"+1`,appointmentId,session.organizationId,session.customerId,session.userId,staffKey,input.rating,input.body.trim(),awardedPoints)
      return {ok:true,awardedPoints}
    },{timeout:15000})
  }
  async function inbox(session,params) {
    const tab=params.get('tab')==='products'?'products':'treatments'
    const answered=params.get('state')==='answered',page=pageNumber(params.get('page')),limit=20
    const settings=await rule()
    const productWhere=`p."customerId"=$1 AND p."purchased"=TRUE AND rr."status"='active' AND rr."expiresAt">=CURRENT_TIMESTAMP AND NOT EXISTS (SELECT 1 FROM "ProductReview" r WHERE r."reviewRequestId"=rr."id")`
    const productJoin=`FROM "ProductProposal" p JOIN "Product" item ON item."id"=p."productId" JOIN LATERAL (SELECT * FROM "ProductReviewRequest" WHERE "productProposalId"=p."id" ORDER BY "requestedAt" DESC LIMIT 1) rr ON TRUE`
    const [productCount]=await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int AS count ${productJoin} WHERE ${productWhere}`,session.customerId)
    let content,total=0
    if(tab==='products') {
      total=productCount.count
      const products=await prisma.$queryRawUnsafe(`SELECT rr."id",rr."expiresAt",item."name",item."manufacturerName" ${productJoin} WHERE ${productWhere} ORDER BY rr."expiresAt",rr."id" LIMIT $2 OFFSET $3`,session.customerId,limit,(page-1)*limit)
      const [prizes]=await prisma.$queryRawUnsafe('SELECT "reviewPrizeFirstPoints","reviewPrizeSecondPoints","reviewPrizeThirdPoints" FROM "Organization" WHERE "id"=$1',session.organizationId)
      const values=Object.values(prizes||{}).map(Number),reward=values.length?`${Math.min(...values).toLocaleString()}〜${Math.max(...values).toLocaleString()}pt`:''
      content=products.map(p=>`<a class="tr-card tr-visit" href="/u/reviews/${encodeURIComponent(p.id)}"><span class="tr-kicker">${esc(p.manufacturerName)}</span><h2>${esc(p.name)}</h2><p>回答期限 ${date(p.expiresAt)}</p><span class="tr-reward">宝箱 ${reward}</span>${icon('chevron')}</a>`).join('')
    } else {
      const where=`a."customerId"=$1 AND c."organizationId"=$2 AND ${eligible} AND ${answered?'r."deletedAt" IS NULL AND r."appointmentId" IS NOT NULL':'(r."appointmentId" IS NULL OR r."deletedAt" IS NOT NULL)'}`
      const join=`FROM "Appointment" a JOIN "Customer" c ON c."id"=a."customerId" LEFT JOIN "TreatmentReview" r ON r."appointmentId"=a."id"`
      const [count]=await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int AS count ${join} WHERE ${where}`,session.customerId,session.organizationId); total=count.count
      const visits=await prisma.$queryRawUnsafe(`SELECT a."id",a."menu",a."scheduledAt",a."staffName",r."rating",r."appointmentId" AS "reviewId",r."awardedPoints",${previouslyRewarded} AS "rewarded" ${join} WHERE ${where} ORDER BY a."scheduledAt" DESC,a."id" LIMIT $3 OFFSET $4`,session.customerId,session.organizationId,limit,(page-1)*limit)
      content=visits.map(v=>`<a class="tr-card tr-visit" href="/u/reviews/treatment/${encodeURIComponent(v.id)}"><span class="tr-kicker">${date(v.scheduledAt)}</span><h2>${esc(v.menu||'施術')}</h2><p>担当 ${esc(v.staffName||'確認中')}</p><span class="tr-reward">${answered?`評価 ${v.rating} / 5 ・ 公開中`:v.reviewId?'削除済み・再投稿はポイント対象外':v.rewarded?'この来店はポイント付与済み':settings.points?`初回投稿 ${settings.points.toLocaleString()}pt`:'施術のレビュー'}</span>${icon('chevron')}</a>`).join('')
    }
    const pagination=pages(`/u/reviews?tab=${tab}&state=${answered?'answered':'pending'}`,page,total,limit)
    return `<header class="tr-heading"><p class="tr-kicker">SURVEY INBOX</p><h1>アンケート受信ボックス</h1><a href="/u/staff">${icon('user')} スタッフ紹介</a></header><nav class="tr-tabs" aria-label="アンケートの種類"><a href="/u/reviews" ${tab==='treatments'?'aria-current="page"':''}>施術レビュー</a><a href="/u/reviews?tab=products" ${tab==='products'?'aria-current="page"':''}>商品アンケート <span>${productCount.count}</span></a></nav>${tab==='treatments'?`<nav class="tr-filters" aria-label="回答状況"><a href="/u/reviews" ${!answered?'aria-current="page"':''}>未回答</a><a href="/u/reviews?state=answered" ${answered?'aria-current="page"':''}>投稿済み</a></nav>`:''}<p class="tr-count">${tab==='products'||!answered?'未回答':'投稿済み'} ${total}件</p><section class="tr-grid">${content||'<p class="tr-empty">該当するアンケートはありません。</p>'}</section>${pagination}`
  }
  function pages(base,page,total,limit) {
    const count=Math.max(1,Math.ceil(total/limit)); if(count===1)return ''
    return `<nav class="tr-pages" aria-label="ページ切替">${page>1?`<a href="${base}&page=${page-1}" aria-label="前のページ">${icon('arrow')} 前へ</a>`:'<span></span>'}<span>${page} / ${count}</span>${page<count?`<a href="${base}&page=${page+1}" aria-label="次のページ">次へ ${icon('chevron')}</a>`:'<span></span>'}</nav>`
  }
  async function editor(session,appointmentId) {
    const [visit]=await prisma.$queryRawUnsafe(`SELECT a.*,(${eligible}) AS "eligible",${previouslyRewarded} AS "rewarded" FROM "Appointment" a JOIN "Customer" c ON c."id"=a."customerId" WHERE a."id"=$1 AND a."customerId"=$2 AND c."organizationId"=$3`,appointmentId,session.customerId,session.organizationId)
    if(!visit) fail(404,'対象の来店が見つかりません。')
    const [review]=await prisma.$queryRawUnsafe('SELECT * FROM "TreatmentReview" WHERE "appointmentId"=$1 AND "customerId"=$2',appointmentId,session.customerId)
    const [author]=await prisma.$queryRawUnsafe('SELECT "nickname" FROM "AppUser" WHERE "id"=$1',session.userId)
    const staffKey=review?.staffKey||await staffForVisit(prisma,session.organizationId,visit.staffName)
    const exists=review&&!review.deletedAt,settings=await rule(),canReview=visit.eligible&&staffKey
    return `<header class="tr-heading"><p class="tr-kicker">TREATMENT REVIEW</p><h1>${exists?'レビューを編集':'施術をレビュー'}</h1></header><div class="tr-editor"><section class="tr-visit-summary"><p>${date(visit.scheduledAt)}</p><h2>${esc(visit.menu||'施術')}</h2><p>担当 ${esc(visit.staffName||'確認中')}</p>${staffKey?`<a href="/u/staff?staff=${encodeURIComponent(staffKey)}">スタッフ紹介を見る ${icon('chevron')}</a>`:''}</section>${canReview?`<form id="treatment-review-form" data-appointment="${esc(appointmentId)}" data-method="${exists?'PATCH':'POST'}" data-version="${review?.version||0}"><fieldset><legend>施術の評価</legend><div class="tr-rating">${[1,2,3,4,5].map(n=>`<label><input type="radio" name="rating" value="${n}" required ${review?.rating===n?'checked':''}><span aria-hidden="true">★</span><small>${n}</small><span class="tr-sr">${n}点</span></label>`).join('')}</div></fieldset><label class="tr-label" for="treatment-body">レビュー</label><textarea id="treatment-body" name="body" rows="6" maxlength="2000" required>${esc(exists?review.body:'')}</textarea><div class="tr-counter"><span data-char-count>${exists?review.body.length:0}</span> / 2,000文字</div><p class="tr-public-name">公開名：${esc(author?.nickname?.trim()||'匿名のお客様')}</p><label class="tr-consent"><input type="checkbox" name="publish" required ${exists?'checked':''}><span>レビューをスタッフ紹介ページに公開することに同意します。</span></label><p class="tr-reward">${review||visit.rewarded?'この来店の投稿による追加ポイントはありません。':settings.points?`評価の高低にかかわらず、初回投稿で${settings.points}ptを付与します（有効期限${settings.validDays}日）。`:'この来店のレビューはポイント付与の対象外です。'}</p><div class="tr-actions"><button class="primary" type="submit">${exists?'変更を保存':'レビューを公開'}</button>${exists?`<button type="button" class="tr-danger" data-delete-review>レビューを削除</button>`:''}</div></form>`:`<p role="status">${visit.eligible?'施術担当者を確認できません。店舗へお問い合わせください。':'会計済みの施術のみレビューできます。'}</p>${exists?`<form id="treatment-review-form" data-appointment="${esc(appointmentId)}" data-version="${review.version}"><button type="button" class="tr-danger" data-delete-review>レビューを削除</button></form>`:''}`}<p id="treatment-review-result" role="status" aria-live="polite"></p><a id="treatment-review-done" href="/u/reviews?state=answered" hidden>投稿済みレビューへ戻る ${icon('chevron')}</a></div>`
  }
  const publicJoin=`FROM "TreatmentReview" r JOIN "Appointment" a ON a."id"=r."appointmentId" AND a."customerId"=r."customerId" JOIN "Customer" c ON c."id"=r."customerId" AND c."organizationId"=r."organizationId" JOIN "AppUser" u ON u."id"=r."authorUserId" AND u."active"=TRUE WHERE r."organizationId"=$1 AND r."deletedAt" IS NULL AND c."deletedAt" IS NULL AND c."storeHiddenAt" IS NULL AND ${eligible}`
  async function directory(session,params) {
    const staff=await staffProvider(session.organizationId)
    const stats=await prisma.$queryRawUnsafe(`SELECT r."staffKey",COUNT(*)::int AS count,AVG(r."rating")::float8 AS rating ${publicJoin} GROUP BY r."staffKey"`,session.organizationId)
    const target=params.get('staff')?staff.find(s=>s.key===params.get('staff')):null
    if(params.get('staff')&&!target) fail(404,'スタッフが見つかりません。')
    const avatar=s=>s.hasAvatar?`<img class="tr-avatar" src="/api/lien-staff-avatar?audience=customer&staffKey=${encodeURIComponent(s.key)}" alt="${esc(s.name)}" width="112" height="112" loading="lazy">`:`<span class="tr-avatar tr-avatar-placeholder">${icon('user')}</span>`
    const summary=s=>{const stat=stats.find(x=>x.staffKey===s.key); return `<span class="tr-score">${stat?`<span aria-hidden="true">★</span> ${stat.rating.toFixed(1)} <small>(${stat.count}件)</small>`:'レビューはまだありません'}</span>`}
    if(!target) return `<header class="tr-heading"><p class="tr-kicker">SALON STAFF</p><h1>スタッフ紹介</h1><a href="/u/reviews">${icon('reviews')} アンケート受信ボックス</a></header><section class="tr-staff-grid">${staff.map(s=>`<a class="tr-card tr-staff-card" href="/u/staff?staff=${encodeURIComponent(s.key)}">${avatar(s)}<div><p class="tr-kicker">${esc(s.role)}</p><h2>${esc(s.name)}</h2>${s.specialties?`<p>${esc(s.specialties)}</p>`:''}${summary(s)}</div><p class="tr-intro">${esc(s.introduction||'')}</p></a>`).join('')||'<p class="tr-empty">公開中のスタッフ情報はありません。</p>'}</section>`
    const page=pageNumber(params.get('page')),count=stats.find(s=>s.staffKey===target.key)?.count||0
    const reviews=await prisma.$queryRawUnsafe(`SELECT r."rating",r."body",r."createdAt",r."updatedAt",r."customerId"=$3 AS "mine",CASE WHEN r."customerId"=$3 THEN r."appointmentId" ELSE NULL END AS "ownAppointmentId",COALESCE(NULLIF(BTRIM(u."nickname"),''),'匿名のお客様') AS "publicName",a."menu" ${publicJoin} AND r."staffKey"=$2 ORDER BY r."createdAt" DESC,r."appointmentId" LIMIT 10 OFFSET $4`,session.organizationId,target.key,session.customerId,(page-1)*10)
    return `<header class="tr-heading"><p class="tr-kicker">SALON STAFF</p><h1>スタッフ紹介</h1></header><section class="tr-profile">${avatar(target)}<div><p class="tr-kicker">${esc(target.role)}</p><h2>${esc(target.name)}</h2>${summary(target)}${target.specialties?`<p>${esc(target.specialties)}</p>`:''}</div><p class="tr-intro">${esc(target.introduction||'')}</p></section><section class="tr-reviews"><div class="tr-section-title"><h2>お客様のレビュー</h2><span>${count}件</span></div>${reviews.map(r=>`<article class="tr-review"><div class="tr-review-meta"><strong>${esc(r.publicName)}</strong><span class="tr-score" aria-label="5点中${r.rating}点">${'★'.repeat(r.rating)}${'☆'.repeat(5-r.rating)}</span></div><p class="tr-review-body">${esc(r.body)}</p><footer><span>${date(r.createdAt)}${new Date(r.updatedAt)-new Date(r.createdAt)>1000?'・編集済み':''}</span>${r.mine?`<a href="/u/reviews/treatment/${encodeURIComponent(r.ownAppointmentId)}">編集・削除</a>`:''}</footer></article>`).join('')||'<p class="tr-empty">レビューはまだありません。</p>'}${pages('/u/staff?staff='+encodeURIComponent(target.key),page,count,10)}</section>`
  }
  async function handle(req,res,url) {
    const api=url.pathname==='/api/customer/treatment-reviews'
    const edit=/^\/u\/reviews\/treatment\/([^/]+)$/.exec(url.pathname)
    if(!api&&!edit&&!['/u/staff','/u/reviews'].includes(url.pathname)) return false
    try {
      const session=await sessionProvider(req)
      if(!session) { if(api)json(res,401,{error:'ログインしてください。'});else {res.statusCode=302;res.setHeader('Location','/u/login');res.end()} return true }
      await ensureSchema()
      if(api) {
        if(!['POST','PATCH','DELETE'].includes(req.method)) fail(405,'この操作には対応していません。')
        if(!sameOrigin(req)||!req.headers.origin) fail(403,'送信元を確認できません。')
        json(res,200,await mutate(session,req.method,await readJson(req)))
      } else {
        if(req.method!=='GET') fail(405,'この操作には対応していません。')
        const content=edit?await editor(session,decodeURIComponent(edit[1])):url.pathname==='/u/staff'?await directory(session,url.searchParams):await inbox(session,url.searchParams)
        const html=renderCustomerShell({title:edit?'施術レビュー':url.pathname==='/u/staff'?'スタッフ紹介':'アンケート受信ボックス',back:edit?'/u/reviews':url.searchParams.has('staff')?'/u/staff':'/u/home',body:`<div class="treatment-reviews-v690">${content}</div><script defer src="/treatment-reviews-v690.js"></script>`})
        sendCustomerHtml(res,html.replace('</head>','<link rel="stylesheet" href="/treatment-reviews-v690.css"></head>'))
      }
    } catch(error) {
      const status=error.status||500
      if(status===500)console.error('[treatment-reviews-v690]',error.message)
      if(api)json(res,status,{error:status===500?'処理できませんでした。時間をおいて再度お試しください。':error.message})
      else {res.statusCode=status;res.setHeader('Content-Type','text/html; charset=utf-8');res.setHeader('Cache-Control','private, no-store');res.end(renderCustomerShell({title:'レビュー',back:'/u/reviews',body:`<section class="treatment-reviews-v690"><p role="alert">${esc(status===500?'読み込めませんでした。時間をおいて再度お試しください。':error.message)}</p><a href="${esc(url.pathname)}">再読み込み</a></section>`}))}
    }
    return true
  }
  return {ensureSchema,handle,mutate,inbox,editor,directory,rule}
}
async function lockLegacyFeedbackVisit(tx,customerId,sourceId) {
  if(!String(sourceId).startsWith('service-sale:'))return null
  const [visit]=await tx.$queryRawUnsafe('SELECT a."id" FROM "Appointment" a JOIN "ServiceSale" s ON s."appointmentId"=a."id" AND s."customerId"=a."customerId" WHERE s."id"=$1 AND a."customerId"=$2 FOR UPDATE OF a',sourceId.slice('service-sale:'.length),customerId)
  if(!visit)return null
  const [prior]=await tx.$queryRawUnsafe(`SELECT p."id" FROM "PointTransaction" p JOIN "ServiceSale" s ON p."sourceId"='service-sale:'||s."id" WHERE s."appointmentId"=$1 AND p."customerId"=$2 AND p."sourceType"='feedback' AND p."type"='earn' LIMIT 1`,visit.id,customerId)
  if(prior)return {awardedPoints:0,transactionId:prior.id,duplicate:true}
  const [review]=await tx.$queryRawUnsafe('SELECT "appointmentId" FROM "TreatmentReview" WHERE "appointmentId"=$1 AND "customerId"=$2',visit.id,customerId)
  return review?{awardedPoints:0,transactionId:null,duplicate:true}:null
}
module.exports={createTreatmentReviews,lockLegacyFeedbackVisit}
