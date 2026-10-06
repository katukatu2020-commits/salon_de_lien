'use strict'
const { randomUUID } = require('node:crypto')
const SOURCE_CODE = 'DLR-60EA86D040'
const LIMIT = 500
const publicFields = `p.id,p."manufacturerName",p.name,p.category,p."productCode",p."manufacturerProductCode",p."janCode",p."suggestedRetailPrice",p."orderUnit"`
class CatalogError extends Error { constructor(message,status=400){super(message);this.status=status} }
function admin(s){if(!s?.id)throw new CatalogError('ログインし直してください。',401);if(s.role!=='ADMIN')throw new CatalogError('商品マスタからの登録は管理者のみ行えます。',403)}
function filters(q){
  const text=key=>{const v=(q.get(key)||'').trim();if(v.length>180)throw new CatalogError('検索条件が長すぎます。');return v}
  const rawPage=q.get('page')||'1',rawSize=q.get('pageSize')||'50'
  if(!/^\d{1,6}$/.test(rawPage)||!['25','50','100'].includes(rawSize)||Number(rawPage)<1)throw new CatalogError('ページ指定を確認してください。')
  return {search:text('search'),manufacturer:text('manufacturer'),category:text('category'),page:Number(rawPage),pageSize:Number(rawSize),unregistered:q.get('unregistered')==='1'}
}
function entries(payload){
  if(!payload||!Array.isArray(payload.products)||!payload.products.length||payload.products.length>LIMIT)throw new CatalogError(`商品を1〜${LIMIT}件選択してください。`)
  const seen=new Set()
  return payload.products.map(p=>{
    if(!p||typeof p.id!=='string'||!p.id||p.id.length>200||seen.has(p.id))throw new CatalogError('選択した商品を確認してください。')
    if(!Number.isSafeInteger(p.price)||p.price<1||p.price>10000000)throw new CatalogError('販売価格は1〜10,000,000円で入力してください。')
    seen.add(p.id);return {id:p.id,price:p.price,newId:'dealer_product_'+randomUUID()}
  })
}
function createCatalog({db,h={},sourceCode=process.env.ORIMIA_PRODUCT_MASTER_DEALER_CODE||SOURCE_CODE}){
  async function source(tx=db){
    const row=(await tx.$queryRawUnsafe('SELECT id FROM "WholesaleDealer" WHERE "dealerCode"=$1 AND active=TRUE',sourceCode))[0]
    if(!row)throw new CatalogError('共通商品マスタを準備中です。時間をおいて再度お試しください。',503)
    return row.id
  }
  async function list(s,q){
    admin(s)
    const f=filters(q),sourceId=await source()
    const groups=await db.$queryRawUnsafe('SELECT DISTINCT "manufacturerName",COALESCE(category,\'\') AS category FROM "WholesaleDealerProduct" WHERE "dealerId"=$1 AND active=TRUE ORDER BY "manufacturerName",category',sourceId)
    const manufacturers=[...new Set(groups.map(p=>p.manufacturerName))]
    const categories=[...new Set(groups.filter(p=>!f.manufacturer||p.manufacturerName===f.manufacturer).map(p=>p.category).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ja'))
    if(!categories.includes(f.category))f.category=''
    const terms=(h.searchVariants?h.searchVariants(f.search):f.search?[f.search.normalize('NFKC')]:[]).map(term=>term.replace(/[\\%_]/g,'\\$&'))
    const where=`p."dealerId"=$1 AND p.active=TRUE AND ($3='' OR p."manufacturerName"=$3) AND ($4='' OR p.category=$4)
      AND ($5::jsonb='[]'::jsonb OR EXISTS (SELECT 1 FROM jsonb_array_elements_text($5::jsonb) AS terms(term)
        WHERE concat_ws(' ',p.name,p."manufacturerName",p."productCode",p."manufacturerProductCode",p."janCode") ILIKE '%' || terms.term || '%'))
      AND (NOT $6::boolean OR own.id IS NULL OR own.active=FALSE)`
    const join=`FROM "WholesaleDealerProduct" p LEFT JOIN "WholesaleDealerProduct" own ON own."dealerId"=$2 AND own."productCode"=p."productCode"`
    const params=[sourceId,s.id,f.manufacturer,f.category,JSON.stringify(terms),f.unregistered]
    const total=Number((await db.$queryRawUnsafe(`SELECT COUNT(*)::int AS total ${join} WHERE ${where}`,...params))[0].total)
    f.page=Math.min(f.page,Math.max(1,Math.ceil(total/f.pageSize)))
    const products=await db.$queryRawUnsafe(`SELECT ${publicFields},own.id AS "ownProductId",own.active AS "ownActive",own."wholesalePrice" AS "ownPrice" ${join} WHERE ${where} ORDER BY p."manufacturerName",p.name,p."productCode",p.id LIMIT $7 OFFSET $8`,...params,f.pageSize,(f.page-1)*f.pageSize)
    const counts=(await db.$queryRawUnsafe(`SELECT COUNT(*)::int AS total FROM "WholesaleDealerProduct" WHERE "dealerId"=$1 AND active=TRUE`,sourceId))[0]
    return {products,total,masterTotal:Number(counts.total),filters:f,manufacturers,categories,limit:LIMIT}
  }
  async function importProducts(s,payload){
    admin(s)
    const selected=entries(payload)
    return db.$transaction(async tx=>{
      await tx.$executeRawUnsafe("SELECT pg_advisory_xact_lock(hashtextextended('dealer-master-import:' || $1,0))",s.id)
      const sourceId=await source(tx)
      // Validate the complete batch under a shared lock before any product is written.
      const available=await tx.$queryRawUnsafe(`SELECT p.id FROM "WholesaleDealerProduct" p WHERE p."dealerId"=$1 AND p.active=TRUE AND p.id IN (SELECT jsonb_array_elements_text($2::jsonb)) FOR SHARE`,sourceId,JSON.stringify(selected.map(p=>p.id)))
      if(available.length!==selected.length)throw new CatalogError('選択した商品に取扱終了の商品が含まれています。再検索してください。',409)
      const rows=await tx.$queryRawUnsafe(`INSERT INTO "WholesaleDealerProduct" (id,"dealerId","manufacturerName",name,category,"productCode","manufacturerProductCode","janCode","wholesalePrice","suggestedRetailPrice","orderUnit",description,active,"createdAt","updatedAt")
        SELECT input."newId",$2,p."manufacturerName",p.name,p.category,p."productCode",p."manufacturerProductCode",p."janCode",input.price,p."suggestedRetailPrice",p."orderUnit",p.description,TRUE,NOW(),NOW()
        FROM jsonb_to_recordset($3::jsonb) AS input(id text,price integer,"newId" text)
        JOIN "WholesaleDealerProduct" p ON p.id=input.id AND p."dealerId"=$1 AND p.active=TRUE
        ON CONFLICT ("dealerId","productCode") DO UPDATE SET active=TRUE,"wholesalePrice"=EXCLUDED."wholesalePrice","updatedAt"=NOW() WHERE "WholesaleDealerProduct".active=FALSE
        RETURNING id`,sourceId,s.id,JSON.stringify(selected))
      return {registered:rows.length,skipped:selected.length-rows.length}
    },{timeout:30000})
  }
  async function landing(dealer){
    if(dealer.staffUserId)return '/dealer/orders'
    const rows=await db.$queryRawUnsafe('SELECT id FROM "WholesaleDealerProduct" WHERE "dealerId"=$1 AND active=TRUE LIMIT 1',dealer.id)
    return rows.length?'/dealer/orders':'/dealer/products/master'
  }
  async function handle(req,res,url){
    const page=url.pathname==='/dealer/products/master',api=url.pathname==='/api/dealer/product-master'
    if(!page&&!api)return false
    res.setHeader('Cache-Control','private, no-store')
    try{
      const s=await h.session(req)
      if(page&&!s){h.redirect(res,'/dealer/login?next=%2Fdealer%2Fproducts%2Fmaster',302);return true}
      admin(s)
      if(page&&req.method==='GET'){
        h.html(res,200,h.portal(s,'products',{content:require('./page.cjs').page(),scripts:'<link rel="stylesheet" href="/dealer-product-master-v709.css"><script src="/dealer-product-master-v709.js" defer></script>'}));return true
      }
      if(api&&req.method==='GET'){h.json(res,200,{ok:true,...await list(s,url.searchParams)});return true}
      if(api&&req.method==='POST'){
        if(!h.sameOrigin(req))throw new CatalogError('安全性を確認できないため処理できませんでした。',403)
        h.json(res,200,{ok:true,...await importProducts(s,await h.readPayload(req))});return true
      }
      res.setHeader('Allow',page?'GET':'GET, POST');throw new CatalogError('この操作には対応していません。',405)
    }catch(e){
      const status=e.status>=400&&e.status<500||e.status===503?e.status:500
      if(status===500)console.error('[dealer-product-master-v709]',e)
      const error=status===500?'処理を完了できませんでした。再度お試しください。':e.message
      if(page)h.html(res,status,`<!doctype html><html lang="ja"><meta charset="utf-8"><title>商品マスタ</title><p>${status===403?'商品マスタからの登録は管理者のみ行えます。':'画面を開けませんでした。'}</p><a href="/dealer/products">商品管理へ戻る</a></html>`)
      else h.json(res,status,{ok:false,error})
      return true
    }
  }
  return {list,importProducts,landing,handle}
}
module.exports={createCatalog,entries,filters,admin,SOURCE_CODE,LIMIT}
