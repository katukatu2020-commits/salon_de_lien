import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const patchRoot = path.dirname(fileURLToPath(import.meta.url))
const nextRoot = path.join(root, '.next')
const serverPath = path.join(root, 'server.js')

function replaceExact(source, before, after, expected, label) {
  const count = source.split(before).length - 1
  if (count !== expected) throw new Error(`${label}: expected ${expected} matches, found ${count}`)
  return source.split(before).join(after)
}

function replaceBetween(source, start, end, replacement, label) {
  const startIndex = source.indexOf(start)
  if (startIndex < 0) throw new Error(`${label}: start marker was not found`)
  const nextStart = source.indexOf(start, startIndex + start.length)
  if (nextStart >= 0) throw new Error(`${label}: start marker was not unique`)
  const endIndex = source.indexOf(end, startIndex + start.length)
  if (endIndex < 0) throw new Error(`${label}: end marker was not found`)
  return source.slice(0, startIndex) + replacement + source.slice(endIndex)
}

function collectFiles(directory, predicate, output = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name)
    if (entry.isDirectory()) collectFiles(fullPath, predicate, output)
    else if (predicate(fullPath, entry.name)) output.push(fullPath)
  }
  return output
}

function replaceNextReferences(oldValue, newValue, label) {
  let files = 0
  let references = 0
  for (const file of collectFiles(nextRoot, (_fullPath, name) => name.endsWith('.js') || name.endsWith('.json'))) {
    const source = fs.readFileSync(file, 'utf8')
    const count = source.split(oldValue).length - 1
    if (!count) continue
    fs.writeFileSync(file, source.split(oldValue).join(newValue))
    files += 1
    references += count
  }
  if (!files || !references) throw new Error(`${label}: no manifest references were updated`)
  return { files, references }
}

const publicRoot = path.join(root, 'public')
for (const fileName of ['orimia-brand-v503.js', 'store-platform-v503.js']) {
  fs.copyFileSync(path.join(patchRoot, fileName), path.join(publicRoot, fileName))
}

const oldLayoutName = 'layout-runtime-v502.js'
const newLayoutName = 'layout-runtime-v503-final.js'
const oldLayoutPath = path.join(nextRoot, 'static', 'chunks', 'app', oldLayoutName)
const newLayoutPath = path.join(nextRoot, 'static', 'chunks', 'app', newLayoutName)
let layoutRuntime = fs.readFileSync(oldLayoutPath, 'utf8')
const inlineMarker = '\n/* store-app-stability-v502-inline */'
const inlineIndex = layoutRuntime.lastIndexOf(inlineMarker)
if (inlineIndex < 0) throw new Error('v502 inline runtime boundary was not found')
layoutRuntime = layoutRuntime.slice(0, inlineIndex)
const brandRuntime = fs.readFileSync(path.join(publicRoot, 'orimia-brand-v503.js'), 'utf8')
const stabilityRuntime = fs.readFileSync(path.join(publicRoot, 'store-app-stability-v501.js'), 'utf8')
const platformRuntime = fs.readFileSync(path.join(publicRoot, 'store-platform-v503.js'), 'utf8')
layoutRuntime += `\n/* store-platform-v503-inline */\n${brandRuntime}\n${stabilityRuntime}\n${platformRuntime}\n`
fs.writeFileSync(newLayoutPath, layoutRuntime)
const layoutReferences = replaceNextReferences(oldLayoutName, newLayoutName, 'shared layout cache activation')

const oldCustomerLayoutName = 'layout-d1470003e928b0b1.customertabs.js'
const newCustomerLayoutName = 'layout-d1470003e928b0b1.customertabs-v503.js'
const oldCustomerLayoutPath = path.join(nextRoot, 'static', 'chunks', 'app', oldCustomerLayoutName)
const newCustomerLayoutPath = path.join(nextRoot, 'static', 'chunks', 'app', newCustomerLayoutName)
let customerLayoutRuntime = fs.readFileSync(oldCustomerLayoutPath, 'utf8')
customerLayoutRuntime += `\n/* store-platform-v503-customer-inline */\n${brandRuntime}\n${platformRuntime}\n`
fs.writeFileSync(newCustomerLayoutPath, customerLayoutRuntime)
const customerLayoutReferences = replaceNextReferences(oldCustomerLayoutName, newCustomerLayoutName, 'customer layout cache activation')

const customerExperienceName = 'customer-experience-v503.js'
const customerExperience = fs.readFileSync(path.join(root, 'customer-experience-v425.js'), 'utf8')
  + `\n/* store-platform-v503-customer-experience */\n${brandRuntime}\n${platformRuntime}\n`
fs.writeFileSync(path.join(root, customerExperienceName), customerExperience)
const customerExperienceReferences = replaceNextReferences(
  '/customer-experience-v425.js',
  `/${customerExperienceName}?v=503`,
  'customer experience cache activation',
)

let server = fs.readFileSync(serverPath, 'utf8')
server = replaceExact(
  server,
  '<script src="/customer-experience-v425.js" defer></script>',
  '<script src="/customer-experience-v503.js?v=503" defer></script>',
  2,
  'customer experience script tags',
)
server = replaceExact(
  server,
  "url.pathname === '/customer-experience-v425.js'",
  "url.pathname === '/customer-experience-v503.js'",
  1,
  'customer experience route',
)
server = replaceExact(
  server,
  "path.join(dir, 'customer-experience-v425.js')",
  "path.join(dir, 'customer-experience-v503.js')",
  1,
  'customer experience file reader',
)
const apiHelpers = String.raw`

function validStorePlatformOriginV503(req) {
  const origin = String(req.headers.origin || '')
  if (!origin) return true
  try { return new URL(origin).host === String(req.headers.host || '') } catch { return false }
}

async function readStorePlatformFormV503(req) {
  const contentType = String(req.headers['content-type'] || '').toLowerCase()
  if (!contentType.includes('application/x-www-form-urlencoded')) throw Error('unsupported_form')
  const chunks = []
  let total = 0
  for await (const chunk of req) {
    total += chunk.length
    if (total > 65536) throw Error('too_large')
    chunks.push(chunk)
  }
  return new URLSearchParams(Buffer.concat(chunks).toString('utf8'))
}

function redirectCustomerProfileV503(res, status) {
  res.statusCode = 303
  res.setHeader('Location', '/u/profile?profile=' + encodeURIComponent(status))
  res.setHeader('Cache-Control', 'private, no-store')
  res.end()
}

function profileOptionV503(params, key, options) {
  const value = String(params.get(key) || '').trim()
  if (!value) return null
  return options.includes(value) ? value : undefined
}

function birthDateV503(value) {
  const text = String(value || '').trim()
  if (!text) return null
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return undefined
  const date = new Date(text + 'T00:00:00.000Z')
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== text) return undefined
  const year = Number(text.slice(0, 4))
  if (year < 1900 || date.getTime() > Date.now()) return undefined
  return date
}

async function syncCustomerProfileV503(req, res) {
  if (!validStorePlatformOriginV503(req)) return json(res, 403, { error: 'Invalid origin' })
  const session = await chatSession(req, 'customer')
  if (!session) {
    res.statusCode = 303
    res.setHeader('Location', '/u/login')
    res.setHeader('Cache-Control', 'private, no-store')
    return res.end()
  }
  try {
    const params = await readStorePlatformFormV503(req)
    const name = String(params.get('name') || '').trim()
    const nickname = String(params.get('nickname') || '').trim()
    const phone = String(params.get('phone') || '').trim()
    const birthDate = birthDateV503(params.get('birthDate'))
    const gender = profileOptionV503(params, 'gender', ['女性', '男性', 'その他', '未回答'])
    const hairVolume = profileOptionV503(params, 'hairVolume', ['少ない', '普通', '多い'])
    const hairTexture = profileOptionV503(params, 'hairTexture', ['柔らかい', '普通', '硬い'])
    const hairThickness = profileOptionV503(params, 'hairThickness', ['細い', '普通', '太い'])
    const hairCurl = profileOptionV503(params, 'hairCurl', ['なし（直毛）', '少しある', '強い'])
    const servicePreference = profileOptionV503(params, 'servicePreference', ['静かに過ごしたい', '適度に会話したい'])
    const invalid = name.length < 1 || name.length > 80 || nickname.length > 30 || phone.length > 30 ||
      birthDate === undefined || gender === undefined || hairVolume === undefined || hairTexture === undefined ||
      hairThickness === undefined || hairCurl === undefined || servicePreference === undefined
    if (invalid) return redirectCustomerProfileV503(res, 'invalid')

    const targets = await prisma.$queryRawUnsafe(
      \`SELECT DISTINCT c."id",c."organizationId",c."birthYear"
       FROM "Customer" c
       WHERE c."deletedAt" IS NULL AND (
         c."id"=$1
         OR c."id" IN (SELECT l."customerId" FROM "CustomerStoreLink" l WHERE l."appUserId"=$2)
         OR c."id"=(SELECT u."customerId" FROM "AppUser" u WHERE u."id"=$2 AND u."role"='CUSTOMER' AND u."active"=TRUE)
       )\`,
      session.customerId,
      session.userId,
    )
    if (!targets.length) throw Error('Customer not found')
    const birthYear = birthDate ? Number(birthDate.toISOString().slice(0, 4)) : null
    await prisma.$transaction(async tx => {
      for (const target of targets) {
        await tx.customer.update({
          where: { id: target.id },
          data: {
            name,
            phone: phone || null,
            gender,
            birthDate,
            birthYear,
            servicePreference,
          },
        })
        await tx.hairProfile.upsert({
          where: { customerId: target.id },
          update: { hairVolume, hairTexture, hairThickness, hairCurl },
          create: { customerId: target.id, hairVolume, hairTexture, hairThickness, hairCurl },
        })
      }
      await tx.appUser.updateMany({
        where: { id: session.userId, role: 'CUSTOMER', active: true },
        data: { nickname: nickname || null },
      })
    })
    return redirectCustomerProfileV503(res, 'saved')
  } catch (error) {
    console.error('[store-platform-v503] customer profile sync failed', { name: error?.name || 'UnknownError' })
    return redirectCustomerProfileV503(res, 'failed')
  }
}

function ageAtPurchaseV503(row) {
  const paidAt = row.paidAt ? new Date(row.paidAt) : new Date()
  if (row.birthDate) {
    const birth = new Date(row.birthDate)
    let age = paidAt.getUTCFullYear() - birth.getUTCFullYear()
    const beforeBirthday = paidAt.getUTCMonth() < birth.getUTCMonth() ||
      (paidAt.getUTCMonth() === birth.getUTCMonth() && paidAt.getUTCDate() < birth.getUTCDate())
    if (beforeBirthday) age -= 1
    return age >= 0 && age <= 130 ? age : null
  }
  const year = Number(row.birthYear)
  if (!Number.isInteger(year)) return null
  const age = paidAt.getUTCFullYear() - year
  return age >= 0 && age <= 130 ? age : null
}

function ageGroupV503(row) {
  const age = ageAtPurchaseV503(row)
  if (age == null) return '未登録'
  if (age < 20) return '10代以下'
  if (age >= 70) return '70代以上'
  return Math.floor(age / 10) * 10 + '代'
}

function genderGroupV503(value) {
  const normalized = String(value || '').trim().toLowerCase()
  if (normalized === '女性' || normalized === 'female' || normalized === 'woman') return '女性'
  if (normalized === '男性' || normalized === 'male' || normalized === 'man') return '男性'
  if (normalized && normalized !== '未回答') return 'その他'
  return '未登録'
}

function incrementSegmentV503(product, key, label, quantity, customerId) {
  if (!product[key].has(label)) product[key].set(label, { quantity: 0, customers: new Set() })
  const segment = product[key].get(label)
  segment.quantity += quantity
  if (customerId) segment.customers.add(customerId)
}

function segmentRowsV503(map, labels) {
  return labels.map(label => {
    const segment = map.get(label)
    return { label, quantity: segment?.quantity || 0, customerCount: segment?.customers.size || 0 }
  })
}

async function productDemographicsV503(req, res) {
  const session = await chatSession(req, 'staff')
  if (!session) return json(res, 401, { error: 'ログインが必要です。' })
  const rows = await prisma.$queryRawUnsafe(
    \`SELECT p."id",p."name",p."manufacturerName",p."active",
            l."quantity",s."paidAt",c."id" AS "customerId",c."gender",c."birthDate",c."birthYear"
       FROM "Product" p
       LEFT JOIN "ProductSaleLine" l ON l."productId"=p."id"
       LEFT JOIN "ServiceSale" s ON s."id"=l."serviceSaleId"
       LEFT JOIN "Customer" c ON c."id"=s."customerId" AND c."deletedAt" IS NULL
      WHERE p."organizationId"=$1
      ORDER BY p."active" DESC,p."updatedAt" DESC,s."paidAt" DESC\`,
    session.organizationId,
  )
  const products = new Map()
  for (const row of rows) {
    if (!products.has(row.id)) {
      products.set(row.id, {
        id: row.id,
        name: row.name,
        manufacturerName: row.manufacturerName,
        active: row.active === true,
        totalQuantity: 0,
        customers: new Set(),
        age: new Map(),
        gender: new Map(),
      })
    }
    const product = products.get(row.id)
    const quantity = Math.max(0, Number(row.quantity || 0))
    if (!quantity || !row.customerId) continue
    product.totalQuantity += quantity
    product.customers.add(row.customerId)
    incrementSegmentV503(product, 'age', ageGroupV503(row), quantity, row.customerId)
    incrementSegmentV503(product, 'gender', genderGroupV503(row.gender), quantity, row.customerId)
  }
  const ageLabels = ['10代以下', '20代', '30代', '40代', '50代', '60代', '70代以上', '未登録']
  const genderLabels = ['女性', '男性', 'その他', '未登録']
  const output = [...products.values()].map(product => {
    const ageGroups = segmentRowsV503(product.age, ageLabels)
    const genders = segmentRowsV503(product.gender, genderLabels)
    const dominant = groups => groups.reduce((best, current) => current.quantity > (best?.quantity || 0) ? current : best, null)?.label || null
    return {
      id: product.id,
      name: product.name,
      manufacturerName: product.manufacturerName,
      active: product.active,
      totalQuantity: product.totalQuantity,
      customerCount: product.customers.size,
      ageGroups,
      genders,
      dominantAge: dominant(ageGroups),
      dominantGender: dominant(genders),
    }
  }).sort((left, right) => right.totalQuantity - left.totalQuantity || left.name.localeCompare(right.name, 'ja'))
  return json(res, 200, { products: output, generatedAt: new Date().toISOString() })
}
`.replaceAll('\\`', '`')

server = replaceExact(
  server,
  `async function body(req) {
  let raw = ''; for await (const chunk of req) { raw += chunk; if (raw.length > 20000) throw Error('too_large') }
  return raw ? JSON.parse(raw) : {}
}`,
  `async function body(req) {
  let raw = ''; for await (const chunk of req) { raw += chunk; if (raw.length > 20000) throw Error('too_large') }
  return raw ? JSON.parse(raw) : {}
}${apiHelpers}`,
  1,
  'store platform API helpers',
)
server = replaceExact(
  server,
  `      if (await staffBreakCheckoutMenu.handle(req, res, url)) return /* staff-breaks-checkout-menu-v442-route */`,
  `      if (url.pathname === '/api/customer/profile' && req.method === 'POST') return await syncCustomerProfileV503(req, res)
      if (url.pathname === '/api/lien-product-demographics' && req.method === 'GET') return await productDemographicsV503(req, res)
      if (await staffBreakCheckoutMenu.handle(req, res, url)) return /* staff-breaks-checkout-menu-v442-route */`,
  1,
  'store platform API routing',
)
server = replaceExact(
  server,
  `      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Store-App-Cache-Activation', 'v502')`,
  `      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Store-App-Cache-Activation', 'v502')
      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Store-Platform', 'v503')`,
  1,
  'v503 readiness marker',
)
server = replaceExact(
  server,
  `app.prepare().then(async () => {
  await billing.ensureSchema() /* stripe-subscription-billing-v52-schema */`,
  `app.prepare().then(async () => {
  await prisma.$executeRawUnsafe('ALTER TABLE "ProductProposal" ADD COLUMN IF NOT EXISTS "purchaseQuantity" INTEGER NOT NULL DEFAULT 1')
  await prisma.$executeRawUnsafe("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProductProposal_purchaseQuantity_check') THEN ALTER TABLE \\"ProductProposal\\" ADD CONSTRAINT \\"ProductProposal_purchaseQuantity_check\\" CHECK (\\"purchaseQuantity\\" BETWEEN 1 AND 99); END IF; END $$")
  await billing.ensureSchema() /* stripe-subscription-billing-v52-schema */`,
  1,
  'quantity-aware product proposal schema',
)
server = server.replaceAll("process.env[orimiaEnvNameV500] = 'ORIMIA'", "process.env[orimiaEnvNameV500] = 'ORIMIA for Salon'")
server = server.replaceAll('/orimia-brand-v501.js?v=501', '/orimia-brand-v503.js?v=503-final')
server = server.replaceAll(
  '<script src="/store-app-stability-v501.js?v=501" defer></script>',
  '<script src="/store-app-stability-v501.js?v=501" defer></script><script src="/store-platform-v503.js?v=503-final" defer></script>',
)
fs.writeFileSync(serverPath, server)

const profileImagePath = path.join(root, 'customer-profile-image-service-v424.js')
let profileImage = fs.readFileSync(profileImagePath, 'utf8')
profileImage = replaceBetween(
  profileImage,
  `        const rows = await prisma.$queryRawUnsafe(`,
  `      } catch (error) {`,
  `        const rows = await prisma.$queryRawUnsafe(
          \`SELECT DISTINCT c."id",c."organizationId",c."profileImageUrl"
             FROM "Customer" c
            WHERE c."deletedAt" IS NULL AND (
              c."id"=$1
              OR c."id" IN (SELECT l."customerId" FROM "CustomerStoreLink" l WHERE l."appUserId"=$2)
              OR c."id"=(SELECT u."customerId" FROM "AppUser" u WHERE u."id"=$2 AND u."role"='CUSTOMER' AND u."active"=TRUE)
            )\`,
          session.customerId,
          session.userId,
        )
        if (!rows.length) {
          json(res, 404, { error: '顧客情報が見つかりません。' })
          return true
        }
        stored = await uploadImage(normalized, session)
        await prisma.$transaction(async tx => {
          for (const customer of rows) {
            const updated = await tx.customer.updateMany({
              where: {
                id: customer.id,
                organizationId: customer.organizationId,
                deletedAt: null,
                profileImageUrl: customer.profileImageUrl,
              },
              data: { profileImageUrl: stored.reference },
            })
            if (updated.count !== 1) {
              const conflict = new Error('画像が同時に更新されました。画面を再読み込みしてお試しください。')
              conflict.status = 409
              throw conflict
            }
          }
        })
        for (const reference of new Set(rows.map(customer => customer.profileImageUrl).filter(Boolean))) {
          if (reference === stored.reference) continue
          await deleteReference(reference).catch(error => {
            console.warn('[customer-profile-image-v503] previous image cleanup failed', { name: error?.name || 'UnknownError' })
          })
        }
        json(res, 200, { success: true, message: 'プロフィール画像を全ての登録済み店舗へ反映しました。', imageUrl: stored.readUrl })
`,
  'linked-store profile image synchronization',
)
fs.writeFileSync(profileImagePath, profileImage)

const storeProfilePath = path.join(root, 'store-profile.js')
let storeProfile = fs.readFileSync(storeProfilePath, 'utf8')
storeProfile = replaceExact(
  storeProfile,
  `           AND "date"=TO_CHAR(NOW() AT TIME ZONE 'Asia/Tokyo','YYYY-MM-DD')\`,`,
  `           AND "date"=TO_CHAR(NOW() AT TIME ZONE 'Asia/Tokyo','YYYY-MM-DD')
           AND "updatedByUserId" IS NULL\`,`,
  1,
  'preserve explicit daily business-hour overrides',
)
fs.writeFileSync(storeProfilePath, storeProfile)

const rewardChunkPath = path.join(nextRoot, 'server', 'chunks', '7295.js')
let rewardChunk = fs.readFileSync(rewardChunkPath, 'utf8')
const rewardFunction = `async function A(e,t,r,a){var n;let u=await w(e,t),c=[{tier:1,points:(n={firstPoints:u.reviewPrizeFirstPoints,firstRate:u.reviewPrizeFirstRate,secondPoints:u.reviewPrizeSecondPoints,secondRate:u.reviewPrizeSecondRate,thirdPoints:u.reviewPrizeThirdPoints,thirdRate:u.reviewPrizeThirdRate}).firstPoints,weight:100*n.firstRate,probabilityLabel:\`\${n.firstRate}%\`},{tier:2,points:n.secondPoints,weight:100*n.secondRate,probabilityLabel:\`\${n.secondRate}%\`},{tier:3,points:n.thirdPoints,weight:100*n.thirdRate,probabilityLabel:\`\${n.thirdRate}%\`}],v=(await e.$queryRawUnsafe('SELECT p."note",p."purchaseQuantity" FROM "ProductProposal" p JOIN "ProductReview" r ON r."productProposalId"=p."id" WHERE r."id"=$1 LIMIT 1',r))[0],g=Math.max(1,Math.min(99,Number((Number(v?.purchaseQuantity)>1?v.purchaseQuantity:/^\\s*(\\d+)\\s*点/.exec(String(v?.note||""))?.[1])||1))),l=await e.pointTransaction.findFirst({where:{sourceType:"product_review",sourceId:r,type:"earn"},select:{id:!0,amount:!0,expiresAt:!0,note:!0}});if(l){let e;try{e=JSON.parse(l.note||"")}catch{}let t=Array.isArray(e?.drawResults)?e.drawResults.map(Number).filter(Number.isFinite):[l.amount];return{awardedPoints:l.amount,prizeTier:s(t[t.length-1]??l.amount,c),prizes:c,transactionId:l.id,expiresAt:l.expiresAt,duplicate:!0,drawCount:t.length,drawResults:t}}let f=()=>function(e,t=d){if(!Number.isInteger(e)||e<0||e>=1e4)throw Error("抽選値が正しくありません。");let r=0;for(let i of t)if(e<(r+=i.weight))return i.points;return t[t.length-1]?.points??0}((0,i.randomInt)(1e4),c),b=Array.from({length:g},f),x=b.reduce((e,t)=>e+t,0),p=await h(e,t),m=o(new Date,u.pointDefaultValidDays),y=p.availablePoints+x,P=await e.pointTransaction.create({data:{customerId:t,accountId:p.id,type:"earn",amount:x,balanceAfter:y,sourceType:"product_review",sourceId:r,reason:\`商品アンケート抽選 \${g}回 合計\${x}pt\`,note:JSON.stringify({drawCount:g,drawResults:b}),expiresAt:m}});return await e.pointLot.create({data:{customerId:t,earnTransactionId:P.id,originalAmount:x,remainingAmount:x,expiresAt:m}}),await e.customerPointAccount.update({where:{id:p.id},data:{availablePoints:{increment:x},lifetimeEarned:{increment:x}}}),{awardedPoints:x,prizeTier:s(b[b.length-1]??x,c),prizes:c,transactionId:P.id,expiresAt:m,duplicate:!1,drawCount:g,drawResults:b}}`
rewardChunk = replaceBetween(rewardChunk, 'async function A(e,t,r,a){', 'async function I(', rewardFunction, 'quantity-aware product lottery')
fs.writeFileSync(rewardChunkPath, rewardChunk)

const checkoutServerPath = path.join(nextRoot, 'server', 'app', 'admin', 'appointments', '[appointmentId]', 'page.js')
let checkoutServer = fs.readFileSync(checkoutServerPath, 'utf8')
checkoutServer = replaceExact(
  checkoutServer,
  '                    select: { id: !0, status: !0, purchased: !0 },\n                  });\n                  await d({ db: a, proposal: n, visitAt: i.scheduledAt });',
  '                    select: { id: !0, status: !0, purchased: !0 },\n                  });\n                  await a.$executeRawUnsafe(\'UPDATE "ProductProposal" SET "purchaseQuantity"=$2 WHERE "id"=$1\', n.id, e.quantity);\n                  await d({ db: a, proposal: n, visitAt: i.scheduledAt });',
  1,
  'persist checkout purchase quantity',
)
fs.writeFileSync(checkoutServerPath, checkoutServer)

const reviewResponseBefore = 'return{reviewId:t.id,awardedPoints:o.awardedPoints,pointExpiresAt:o.expiresAt,rewardPrizes:o.prizes}'
const reviewResponseAfter = 'return{reviewId:t.id,awardedPoints:o.awardedPoints,pointExpiresAt:o.expiresAt,rewardPrizes:o.prizes,drawCount:o.drawCount,drawResults:o.drawResults}'
let reviewRouteCount = 0
let reviewApiResponseCount = 0
for (const file of collectFiles(path.join(nextRoot, 'server', 'app'), (_fullPath, name) => name.endsWith('.js'))) {
  let source = fs.readFileSync(file, 'utf8')
  const count = source.split(reviewResponseBefore).length - 1
  const apiCount = source.split('rewardPrizes:e.rewardPrizes}').length - 1
  if (count) {
    source = source.split(reviewResponseBefore).join(reviewResponseAfter)
    reviewRouteCount += count
  }
  if (apiCount) {
    source = source.split('rewardPrizes:e.rewardPrizes}').join('rewardPrizes:e.rewardPrizes,drawCount:e.drawCount,drawResults:e.drawResults}')
    reviewApiResponseCount += apiCount
  }
  if (count || apiCount) fs.writeFileSync(file, source)
}
if (reviewRouteCount !== 3) throw new Error(`review response propagation expected 3 matches, found ${reviewRouteCount}`)
if (reviewApiResponseCount !== 2) throw new Error(`public review API response propagation expected 2 matches, found ${reviewApiResponseCount}`)

const quantityOldName = 'page-4198cf4ea5eaf395.js'
const quantityNewName = 'page-4198cf4ea5eaf395.quantity-v503-final.js'
const quantityDirectory = path.join(nextRoot, 'static', 'chunks', 'app', 'admin', 'appointments', '[appointmentId]')
const quantitySourcePath = path.join(quantityDirectory, quantityOldName)
const quantityTargetPath = path.join(quantityDirectory, quantityNewName)
let quantitySource = fs.readFileSync(quantitySourcePath, 'utf8')
quantitySource = replaceExact(
  quantitySource,
  `value:e.quantity,onChange:s=>{var n,a;return n=e.productId,a=v(Number(s.target.value),1,Math.min(99,t.stockQuantity)),void z(e=>e.map(e=>e.productId===n?{...e,quantity:a}:e))}`,
  `value:e.quantity,inputMode:"numeric",step:"1",onFocus:e=>e.currentTarget.select(),onChange:s=>{var n,a;return n=e.productId,a=""===s.target.value?"":v(Number(s.target.value),1,Math.min(99,t.stockQuantity)),void z(e=>e.map(e=>e.productId===n?{...e,quantity:a}:e))},onBlur:s=>{if(""===s.currentTarget.value){let n=e.productId;z(e=>e.map(e=>e.productId===n?{...e,quantity:1}:e))}}`,
  1,
  'checkout product quantity editor',
)
fs.writeFileSync(quantityTargetPath, quantitySource)
const quantityReferences = replaceNextReferences(quantityOldName, quantityNewName, 'checkout quantity chunk cache activation')

const campaignsPath = path.join(root, 'customer-campaigns-v427.js')
let campaigns = fs.readFileSync(campaignsPath, 'utf8')
campaigns = replaceExact(
  campaigns,
  `<script src="/tenant-setup-client.js?v=20260829-450" defer data-runtime="admin-route-lifecycle"></script>`,
  `<script src="/orimia-brand-v503.js?v=503-final" defer></script><script src="/store-platform-v503.js?v=503-final" defer></script><script src="/tenant-setup-client.js?v=20260829-450" defer data-runtime="admin-route-lifecycle"></script>`,
  1,
  'campaign standalone brand runtime',
)
fs.writeFileSync(campaignsPath, campaigns)

const manifestBase = {
  description: '美容室のお客様と店舗をつなぐ予約・顧客管理サービス',
  lang: 'ja',
  display: 'standalone',
  background_color: '#ffffff',
  theme_color: '#ffffff',
  icons: [
    { src: '/brand/orimia-icon-192.png?v=503', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: '/brand/orimia-icon-512.png?v=503', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: '/brand/orimia-icon-maskable-512.png?v=503', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
}
const storeManifest = { id: '/admin/', name: 'ORIMIA for Salon', short_name: 'ORIMIA', start_url: '/admin/appointments', scope: '/admin/', ...manifestBase }
const customerManifest = { id: '/u/', name: 'Powered by ORIMIA', short_name: 'ORIMIA', start_url: '/u/home', scope: '/u/', ...manifestBase }
fs.writeFileSync(path.join(publicRoot, 'orimia-for-salon.webmanifest'), JSON.stringify(storeManifest, null, 2) + '\n')
fs.writeFileSync(path.join(publicRoot, 'powered-by-orimia.webmanifest'), JSON.stringify(customerManifest, null, 2) + '\n')
fs.writeFileSync(path.join(publicRoot, 'orimia.webmanifest'), JSON.stringify({ ...storeManifest, id: '/', start_url: '/', scope: '/' }, null, 2) + '\n')

console.log(JSON.stringify({
  release: 'v503',
  layoutReferences,
  customerLayoutReferences,
  customerExperienceReferences,
  quantityReferences,
  reviewRouteCount,
  reviewApiResponseCount,
}))
