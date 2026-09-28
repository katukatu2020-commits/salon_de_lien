'use strict'
function phone(value){
 const normalized=String(value??'').normalize('NFKC').trim().replace(/[‐‑‒–—―ー−]/g,'-')
 if(!normalized)return null
 const digits=normalized.replace(/[^0-9]/g,'')
 if(normalized.length>40||!/^\+?[0-9 ()-]+$/.test(normalized)||digits.length<7||digits.length>15)throw Object.assign(new Error('電話番号は7〜15桁の数字で入力してください。ハイフン・空白・括弧・先頭の+も使用できます。'),{status:400})
 return normalized
}
function publicPhone(value){try{return phone(value)}catch{return null}}
async function salonContact(db,organizationId,dealerId,ErrorClass){
 const [row]=await db.$queryRawUnsafe(`SELECT d.id AS "dealerId",d.name AS "dealerName",d.phone AS "companyPhone",m.name AS "staffName",m.phone AS "staffPhone"
 FROM "WholesaleDealerContract" c JOIN "WholesaleDealer" d ON d.id=c."dealerId" AND d.active
 LEFT JOIN "DealerSalesMember" m ON m.id=c."salesMemberId" AND m."dealerId"=d.id AND m.active
 WHERE c."organizationId"=$1 AND c."dealerId"=$2 AND c.status='ACTIVE'`,organizationId,String(dealerId||'').slice(0,180))
 if(!row)throw new ErrorClass('連携中のディーラーを確認できませんでした。',404)
 return {dealerId:row.dealerId,dealerName:row.dealerName,staffName:row.staffName||null,staffPhone:publicPhone(row.staffPhone),companyPhone:publicPhone(row.companyPhone)}
}
module.exports={phone,salonContact}
