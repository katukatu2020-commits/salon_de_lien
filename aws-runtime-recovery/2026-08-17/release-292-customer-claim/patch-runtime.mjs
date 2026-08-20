import fs from 'node:fs'
import path from 'node:path'

const root = process.argv[2] ? path.resolve(process.argv[2]) : '/app'
const actionChunkPath = path.join(root, '.next/server/chunks/2241.js')
const source = fs.readFileSync(actionChunkPath, 'utf8')

const anchor = '}}}});return g&&await t.contactLog.create'
const replacement = `}}}});
let provisionalCandidates=await t.customer.findMany({where:{organizationId:P,deletedAt:null,id:{not:p.id},createdAt:{lt:p.createdAt},appUsers:{none:{}},phone:{not:null}},select:{id:!0,name:!0,phone:!0,memo:!0,phoneVerifiedAt:!0,preference:{select:{id:!0}},hairProfile:{select:{id:!0}}},orderBy:{createdAt:"asc"}}),normalizeClaimName=e=>String(e??"").normalize("NFKC").replace(/\\s+/g,"").toLowerCase(),sourceCustomerId="string"==typeof ea&&ea.startsWith("customer:")?ea.slice("customer:".length).trim():null,phoneMatches=provisionalCandidates.filter(e=>e.phone&&(0,$.ni)(e.phone)===y),provisionalCustomer=sourceCustomerId?phoneMatches.find(e=>e.id===sourceCustomerId&&normalizeClaimName(e.name)===normalizeClaimName(f))??null:null;
if(!provisionalCustomer&&smsEnabled&&i?.verifiedAt){let exactNameMatches=phoneMatches.filter(e=>normalizeClaimName(e.name)===normalizeClaimName(f));provisionalCustomer=1===exactNameMatches.length?exactNameMatches[0]:1===phoneMatches.length?phoneMatches[0]:null}
if(provisionalCustomer){
let duplicateCustomerId=p.id,newPreference=await t.preference.findUnique({where:{customerId:duplicateCustomerId}}),newHairProfile=await t.hairProfile.findUnique({where:{customerId:duplicateCustomerId}});
await t.appUser.updateMany({where:{customerId:duplicateCustomerId},data:{customerId:provisionalCustomer.id}});
await t.customerPhoneIdentity.updateMany({where:{customerId:duplicateCustomerId},data:{customerId:provisionalCustomer.id}});
await t.contactLog.updateMany({where:{customerId:duplicateCustomerId},data:{customerId:provisionalCustomer.id}});
if(newPreference){if(provisionalCustomer.preference){let preferenceData={};for(let key of ["preferredLength","preferredStyle","dislikes","colorPreference","maintenanceLevel","referenceNotes"]){let value=newPreference[key];null!=value&&""!==value&&(preferenceData[key]=value)}Object.keys(preferenceData).length&&await t.preference.update({where:{customerId:provisionalCustomer.id},data:preferenceData});await t.preference.delete({where:{customerId:duplicateCustomerId}})}else await t.preference.update({where:{customerId:duplicateCustomerId},data:{customerId:provisionalCustomer.id}})}
if(newHairProfile){if(provisionalCustomer.hairProfile){let hairData={};for(let key of ["hairThickness","hairVolume","hairTexture","scalpCondition","faceShape","forehead","lifestyle","stylingTimeMinutes","hairCurl"]){let value=newHairProfile[key];null!=value&&""!==value&&(hairData[key]=value)}Object.keys(hairData).length&&await t.hairProfile.update({where:{customerId:provisionalCustomer.id},data:hairData});await t.hairProfile.delete({where:{customerId:duplicateCustomerId}})}else await t.hairProfile.update({where:{customerId:duplicateCustomerId},data:{customerId:provisionalCustomer.id}})}
p=await t.customer.update({where:{id:provisionalCustomer.id},data:{name:f,phone:S,gender:B,birthDate:D,birthYear:T,servicePreference:M,staffAssignmentType:R?"assigned":"free",assignedStaffName:R?O:null,referredByCustomerId:referralsEnabled?g?.id??null:void 0,aiPhotoConsent:ed,memo:[provisionalCustomer.memo,em].filter(Boolean).join("\\n\\n"),phoneVerifiedAt:i?.verifiedAt??provisionalCustomer.phoneVerifiedAt}});
await t.customer.delete({where:{id:duplicateCustomerId}})
}
return g&&await t.contactLog.create`

const occurrences = source.split(anchor).length - 1
if (occurrences !== 1) {
  throw new Error(`Expected one customer registration insertion point, found ${occurrences}`)
}

fs.writeFileSync(actionChunkPath, source.replace(anchor, replacement), 'utf8')
console.log('Release 292 provisional-customer claim patch complete.')
