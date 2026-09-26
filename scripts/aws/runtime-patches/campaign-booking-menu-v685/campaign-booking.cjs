'use strict'

class CampaignBookingError extends Error {
  constructor(message,status=400){super(message);this.status=status}
}
const normalize=value=>String(value||'').normalize('NFKC').replace(/[\s\u3000]+/g,'').toLowerCase()
const menuMatches=(target,name)=>!String(target||'').trim()||normalize(target)===normalize(name)

async function bookingContext(db,session,id,{lock=false}={}) {
  if(!session?.customerId||!session.organizationId)throw new CampaignBookingError('ログインしてください。',401)
  if(typeof id!=='string'||!id.trim()||id.length>200)throw new CampaignBookingError('キャンペーンを選び直してください。')
  const rows=await db.$queryRawUnsafe(`SELECT "id","organizationId","title","targetMenu","startsAt","endsAt"
    FROM "CustomerCampaign" WHERE "id"=$1 AND "organizationId"=$2 AND "status"='published'
    AND "startsAt"<=CURRENT_TIMESTAMP AND "endsAt">=CURRENT_TIMESTAMP${lock?' FOR SHARE':''}`,id,session.organizationId)
  const campaign=rows[0]
  if(!campaign)throw new CampaignBookingError('このキャンペーンは終了したか、現在利用できません。',404)
  const menus=await db.$queryRawUnsafe(`SELECT "id","name" FROM "SalonMenu" WHERE "organizationId"=$1
    AND "active"=TRUE AND ($2::boolean OR "source"<>'kanzashi') ORDER BY "sortOrder","name"${lock?' FOR SHARE':''}`,session.organizationId,session.organizationId==='org_salon_de_lien')
  const eligible=menus.filter(menu=>menuMatches(campaign.targetMenu,menu.name))
  if(!eligible.length)throw new CampaignBookingError('このキャンペーンの対象メニューは、現在予約を受け付けていません。',409)
  return {campaign:{id:campaign.id,title:campaign.title,targetMenu:campaign.targetMenu||null},menuIds:eligible.map(menu=>menu.id)}
}

async function assertCampaignMenu(db,session,campaignId,menuId) {
  if(campaignId===undefined||campaignId===null||campaignId==='')return null
  const context=await bookingContext(db,session,campaignId,{lock:true})
  if(!context.menuIds.includes(menuId))throw new CampaignBookingError('キャンペーンの対象メニューを選択してください。')
  return context.campaign
}

function createCampaignBookingService({prisma,customerSession,ensureTables,json}) {
  return {async handle(req,res,url){
    if(url.pathname!=='/api/customer/campaign-booking')return false
    res.setHeader('Cache-Control','private, no-store')
    if(req.method!=='GET'){json(res,405,{error:'Method not allowed'});return true}
    try{
      const session=await customerSession(req)
      if(!session?.customerId||!session.organizationId)throw new CampaignBookingError('ログインしてください。',401)
      await ensureTables()
      json(res,200,await bookingContext(prisma,session,url.searchParams.get('campaign')))
    }catch(error){json(res,error instanceof CampaignBookingError?error.status:500,{error:error instanceof CampaignBookingError?error.message:'キャンペーンを確認できませんでした。時間をおいて再度お試しください。'})}
    return true
  }}
}
module.exports={bookingContext,assertCampaignMenu,createCampaignBookingService,menuMatches}
