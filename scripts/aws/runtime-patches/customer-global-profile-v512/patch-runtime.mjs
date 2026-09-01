import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const serverPath = path.join(root, 'server.js')
const customerLinksPath = path.join(root, 'customer-links-v293.js')
const appointmentPath = path.join(root, 'appointment-operations-v267.js')
const chunksPath = path.join(root, '.next', 'server', 'chunks')

function replaceExact(source, before, after, expected, label) {
  const count = source.split(before).length - 1
  if (count !== expected) throw new Error(`${label}: expected ${expected} matches, found ${count}`)
  return source.split(before).join(after)
}

function replaceBetween(source, start, end, replacement, label) {
  const startIndex = source.indexOf(start)
  if (startIndex < 0) throw new Error(`${label}: start marker was not found`)
  const endIndex = source.indexOf(end, startIndex + start.length)
  if (endIndex < 0) throw new Error(`${label}: end marker was not found`)
  if (source.indexOf(start, startIndex + start.length) >= 0) throw new Error(`${label}: start marker was not unique`)
  return source.slice(0, startIndex) + replacement + source.slice(endIndex)
}

let server = fs.readFileSync(serverPath, 'utf8')
server = replaceExact(
  server,
  `const { createCustomerNameAutoMergeService } = require('./customer-name-auto-merge-v489') /* customer-name-auto-merge-v489 */`,
  `const { createCustomerNameAutoMergeService } = require('./customer-name-auto-merge-v489') /* customer-name-auto-merge-v489 */
const customerGlobalProfile = require('./customer-global-profile-v512') /* customer-global-profile-v512 */`,
  1,
  'global profile service import',
)
server = replaceExact(
  server,
  `  await customerLinks.ensureSchema()
  await customerWithdrawal.ensureSchema()`,
  `  await customerLinks.ensureSchema()
  const customerGlobalProfileReconciliationV512 = await customerGlobalProfile.reconcileAll(prisma)
  console.log('[customer-global-profile-v512] reconciled', customerGlobalProfileReconciliationV512)
  await customerWithdrawal.ensureSchema()`,
  1,
  'startup profile reconciliation',
)
server = replaceExact(
  server,
  `      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Public-Brand-Icon', 'v511')`,
  `      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Public-Brand-Icon', 'v511')
      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Customer-Global-Profile', 'v512')`,
  1,
  'readiness marker',
)
server = replaceExact(
  server,
  `        data: { nickname: nickname || null },`,
  `        data: { nickname: nickname || null, displayName: name },`,
  1,
  'canonical display name persistence',
)
fs.writeFileSync(serverPath, server)

let customerLinks = fs.readFileSync(customerLinksPath, 'utf8')
customerLinks = replaceExact(
  customerLinks,
  `const QRCode = require('qrcode')`,
  `const QRCode = require('qrcode')
const customerGlobalProfile = require('./customer-global-profile-v512')`,
  1,
  'customer link global profile import',
)
customerLinks = replaceExact(
  customerLinks,
  `      const source = locked[0]
      if (!source) throw new CustomerLinkError('会員情報が見つかりません。', 404)
      await tx.$executeRawUnsafe('INSERT INTO "CustomerStoreLink" ("id","appUserId","organizationId","customerId","createdAt") VALUES ($1,$2,$3,$4,NOW()) ON CONFLICT DO NOTHING', crypto.randomUUID(), appUserId, source.organizationId, source.customerId)`,
  `      const source = locked[0]
      if (!source) throw new CustomerLinkError('会員情報が見つかりません。', 404)
      const synchronizedSource = await customerGlobalProfile.synchronizeAppUser(tx, appUserId)
      Object.assign(source, synchronizedSource.identity || {})
      await tx.$executeRawUnsafe('INSERT INTO "CustomerStoreLink" ("id","appUserId","organizationId","customerId","createdAt") VALUES ($1,$2,$3,$4,NOW()) ON CONFLICT DO NOTHING', crypto.randomUUID(), appUserId, source.organizationId, source.customerId)`,
  1,
  'normalize source before store linking',
)
customerLinks = replaceExact(
  customerLinks,
  `      if (!persisted[0]?.customerId) throw new CustomerLinkError('店舗への顧客登録を確認できませんでした。もう一度お試しください。', 503)
      return { customerId: persisted[0].customerId, alreadyLinked: false, name: source.name }`,
  `      if (!persisted[0]?.customerId) throw new CustomerLinkError('店舗への顧客登録を確認できませんでした。もう一度お試しください。', 503)
      await customerGlobalProfile.synchronizeAppUser(tx, appUserId)
      return { customerId: persisted[0].customerId, alreadyLinked: false, name: source.name }`,
  1,
  'normalize newly linked customer',
)
fs.writeFileSync(customerLinksPath, customerLinks)

let appointment = fs.readFileSync(appointmentPath, 'utf8')
appointment = replaceExact(
  appointment,
  `const { Prisma } = require('@prisma/client')`,
  `const { Prisma } = require('@prisma/client')
const customerGlobalProfile = require('./customer-global-profile-v512')`,
  1,
  'appointment global profile import',
)
appointment = replaceBetween(
  appointment,
  `  async function customerForCode(tx, organizationId, rawCode) {`,
  `  async function resolveManualCustomer(tx, organizationId, body) {`,
  `  async function customerForCode(tx, organizationId, rawCode) {
    const code = String(rawCode || '').trim().toUpperCase()
    if (!CUSTOMER_CODE_PATTERN.test(code)) throw new RequestError('お客様コードは C-R-036 の形式で入力してください。')
    const users = await tx.$queryRawUnsafe(\`SELECT u."id" AS "appUserId",u."customerId",c."organizationId",c."name",c."gender",c."birthYear",c."birthDate",c."phone",c."servicePreference",c."staffAssignmentType",c."assignedStaffName"
      FROM "AppUser" u JOIN "Customer" c ON c."id"=u."customerId"
      WHERE u."customerPublicCode"=$1 AND u."role"='CUSTOMER' AND u."active"=true AND c."deletedAt" IS NULL FOR UPDATE OF u\`, code)
    const source = users[0]
    if (!source) throw new RequestError('このお客様コードは見つかりませんでした。', 404)
    const synchronizedSource = await customerGlobalProfile.synchronizeAppUser(tx, source.appUserId)
    Object.assign(source, synchronizedSource.identity || {})
    if (source.organizationId === organizationId) {
      return customerNameAutoMerge.resolveOrCreate(tx, {
        organizationId,
        existingCustomerId: source.customerId,
        preferredCustomerId: source.customerId,
        name: source.name,
        phone: source.phone,
        overwriteName: true,
        overwritePhone: true,
        actorLabel: '顧客コード予約時自動統合',
      })
    }
    const links = await tx.$queryRawUnsafe(\`SELECT l."customerId" FROM "CustomerStoreLink" l JOIN "Customer" c ON c."id"=l."customerId" WHERE l."appUserId"=$1 AND l."organizationId"=$2 AND c."deletedAt" IS NULL LIMIT 1\`, source.appUserId, organizationId)
    if (links[0]) {
      return customerNameAutoMerge.resolveOrCreate(tx, {
        organizationId,
        existingCustomerId: links[0].customerId,
        preferredCustomerId: links[0].customerId,
        name: source.name,
        phone: source.phone,
        overwriteName: true,
        overwritePhone: true,
        actorLabel: '顧客コード予約時自動統合',
      })
    }
    const customer = await customerNameAutoMerge.resolveOrCreate(tx, {
      organizationId,
      name: source.name,
      phone: source.phone,
      appUserIdForStoreLink: source.appUserId,
      actorLabel: '別店舗顧客コード予約時自動統合',
      createData: {
        gender: source.gender,
        birthYear: source.birthYear,
        birthDate: source.birthDate,
        servicePreference: source.servicePreference,
        staffAssignmentType: source.staffAssignmentType,
        assignedStaffName: source.assignedStaffName,
        memo: \`お客様アプリコード \${code} で店舗へ追加\`,
      },
    })
    await customerGlobalProfile.synchronizeAppUser(tx, source.appUserId)
    return customer
  }

`,
  'customer code booking resolution',
)
fs.writeFileSync(appointmentPath, appointment)

let customerListCodeChunk = null
let customerDetailCodeChunk = null
for (const entry of fs.readdirSync(chunksPath, { withFileTypes: true })) {
  if (!entry.isFile() || !entry.name.endsWith('.js')) continue
  const file = path.join(chunksPath, entry.name)
  let source = fs.readFileSync(file, 'utf8')
  if (source.includes('customer-public-code-parity-v476-list')) {
    source = replaceExact(
      source,
      'function R(e){return`C-${e.slice(-5).toUpperCase()}`}',
      'function R(e){return`C-T-${String(e).replace(/[^a-z0-9]/gi,"").slice(-5).toUpperCase()}`}',
      1,
      'provisional customer list code namespace',
    )
    fs.writeFileSync(file, source)
    customerListCodeChunk = entry.name
    continue
  }
  if (source.includes('customer-public-code-parity-v476-detail')) {
    source = replaceExact(
      source,
      `          function et(e) {
            return \`C-${'${'}e.slice(-5).toUpperCase()}\`;
          }`,
      `          function et(e) {
            return \`C-T-${'${'}String(e).replace(/[^a-z0-9]/gi, "").slice(-5).toUpperCase()}\`;
          }`,
      1,
      'provisional customer detail code namespace',
    )
    fs.writeFileSync(file, source)
    customerDetailCodeChunk = entry.name
  }
}

if (!customerListCodeChunk || !customerDetailCodeChunk) {
  throw new Error(`provisional customer code patch was incomplete: list=${customerListCodeChunk}, detail=${customerDetailCodeChunk}`)
}

let patchedChunk = null
for (const entry of fs.readdirSync(chunksPath, { withFileTypes: true })) {
  if (!entry.isFile() || !entry.name.endsWith('.js')) continue
  const file = path.join(chunksPath, entry.name)
  let source = fs.readFileSync(file, 'utf8')
  if (!source.includes('updateCustomer:()=>Y') || !source.includes('async function Y(e,t){await (0,P.zH)(e);')) continue

  source = replaceBetween(
    source,
    `async function Y(e,t){`,
    `async function K(e,t){`,
    `async function Y(e,t){await (0,P.zH)(e);let a=(0,U.RR)((0,w.PB)(t,"birthDate")??"");if(void 0===a)throw Error("生年月日を正しく入力してください。");let r=(0,w.PB)(t,"assignedStaffSelection"),i=!!(r&&"free"!==r),n={name:(0,w.Jc)(t,"name"),gender:(0,w.PB)(t,"gender"),birthDate:a,birthYear:a?(0,U.eI)(a):null,phone:(0,w.PB)(t,"phone"),servicePreference:(0,w.PB)(t,"servicePreference")};await c._.$transaction(async o=>{await require("/app/customer-global-profile-v512.js").syncIdentityFromCustomer(o,e,n),await o.customer.update({where:{id:e},data:{staffAssignmentType:i?"assigned":"free",assignedStaffName:i?r:null,memo:(0,w.PB)(t,"memo")}})}),(0,s.revalidatePath)("/admin/customers"),(0,s.revalidatePath)("/admin/customers?view=visits"),(0,s.revalidatePath)("/admin/customers?view=calendar"),(0,s.revalidatePath)("/admin/customers?view=messages"),(0,s.revalidatePath)(\`/admin/customers/\${e}\`),(0,s.revalidatePath)(\`/u/\${e}\`)}\n`,
    'compiled customer identity action',
  )

  source = replaceBetween(
    source,
    `async function W(e,t,a){`,
    `async function Z(e,t,a,r){`,
    `async function W(e,t,a){let r=await (0,S.j)();r?.customerId!==e&&await (0,P.zH)(e);let i=null;try{let t=a.get("profileImage");if(!(t instanceof File)||0===t.size)return{ok:!1,message:"プロフィール画像を選択してください。"};if(!eF.includes(t.type))return{ok:!1,message:"プロフィール画像は JPG / PNG / WebP のみアップロードできます。"};if(t.size>5242880)return{ok:!1,message:"プロフィール画像は5MB以下にしてください。"};let n=require("/app/customer-global-profile-v512.js"),o=await n.profileImageTargets(c._,e),l=o.rows.find(t=>t.id===e)??o.rows[0];if(!l)return{ok:!1,message:"顧客が見つかりません。"};let d=Date.now();i=await (0,v.l1)({file:t,organizationId:l.organizationId,customerId:e,kind:"profile"});let u=await c._.$transaction(t=>n.syncProfileImageFromCustomer(t,e,i.reference));for(let e of new Set(o.rows.map(e=>e.profileImageUrl).filter(Boolean)))e!==i.reference&&await (0,v.SR)(e).catch(()=>void 0);for(let e of u.targetIds)(0,s.revalidatePath)(\`/admin/customers/\${e}\`),(0,s.revalidatePath)(\`/u/\${e}\`);return(0,s.revalidatePath)("/admin/customers"),(0,s.revalidatePath)("/u/home"),(0,s.revalidatePath)("/u/profile"),{ok:!0,message:"画像を全ての登録済み店舗へ反映しました。",imageUrl:i.readUrl,cacheKey:d}}catch(e){return i&&await (0,v.SR)(i.reference).catch(()=>void 0),{ok:!1,message:e instanceof Error?e.message:"プロフィール画像のアップロードに失敗しました。"}}}\n`,
    'compiled profile image action',
  )

  source = replaceBetween(
    source,
    `async function et(e,t){`,
    `async function ea(e,t){`,
    `async function et(e,t){await (0,P.zH)(e);let a={hairThickness:(0,w.PB)(t,"hairThickness"),hairVolume:(0,w.PB)(t,"hairVolume"),hairTexture:(0,w.PB)(t,"hairTexture"),hairCurl:(0,w.PB)(t,"hairCurl"),scalpCondition:(0,w.PB)(t,"scalpCondition"),faceShape:(0,w.PB)(t,"faceShape"),forehead:(0,w.PB)(t,"forehead"),lifestyle:(0,w.PB)(t,"lifestyle"),stylingTimeMinutes:(0,w.bG)(t,"stylingTimeMinutes")};await c._.$transaction(t=>require("/app/customer-global-profile-v512.js").syncHairProfileFromCustomer(t,e,a)),(0,s.revalidatePath)(\`/admin/customers/\${e}\`),(0,s.revalidatePath)("/admin/customers"),(0,s.revalidatePath)("/admin/customers?view=styles"),(0,s.revalidatePath)("/admin/customers?view=messages")}\n`,
    'compiled hair profile action',
  )

  source += '\n/* customer-global-profile-v512 */\n'
  fs.writeFileSync(file, source)
  patchedChunk = entry.name
}

if (!patchedChunk) throw new Error('customer detail action chunk was not patched')

console.log(JSON.stringify({
  release: 'customer-global-profile-v512',
  patchedChunk,
  customerListCodeChunk,
  customerDetailCodeChunk,
}))
