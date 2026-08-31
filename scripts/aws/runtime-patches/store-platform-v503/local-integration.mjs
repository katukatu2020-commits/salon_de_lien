import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import { spawnSync } from 'node:child_process'

const baseUrl = String(process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3110').replace(/\/$/, '')
const databaseContainer = process.env.TEST_DATABASE_CONTAINER || 'salon_de_lien_postgres'
const appUserId = 'showcase-yohaku-user-customer-001'
const primaryCustomerId = 'showcase-yohaku-customer-001'
const linkedCustomerId = 'qa-v503-linked-customer'

function sql(source) {
  const result = spawnSync('docker', [
    'exec', '-i', databaseContainer, 'psql', '-X', '-qAt', '-v', 'ON_ERROR_STOP=1',
    '-U', 'salon', '-d', 'salon_de_lien',
  ], { input: source, encoding: 'utf8' })
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || 'psql failed')
  return result.stdout.trim()
}

function literal(value) {
  if (value == null) return 'NULL'
  return `'${String(value).replaceAll("'", "''")}'`
}

const snapshot = JSON.parse(sql(`
SELECT json_build_object(
  'name',c."name",'phone',c."phone",'gender',c."gender",'birthDate',c."birthDate",
  'birthYear',c."birthYear",'servicePreference',c."servicePreference",
  'nickname',u."nickname",'hairExists',(h."id" IS NOT NULL),'hairId',h."id",
  'hairVolume',h."hairVolume",'hairTexture',h."hairTexture",
  'hairThickness',h."hairThickness",'hairCurl',h."hairCurl"
)::text
FROM "Customer" c
JOIN "AppUser" u ON u."id"=${literal(appUserId)}
LEFT JOIN "HairProfile" h ON h."customerId"=c."id"
WHERE c."id"=${literal(primaryCustomerId)};
`))
const linkedOrganizations = ['org_showcase_yohaku', 'org_salon_de_lien']
const linkSnapshot = JSON.parse(sql(`
SELECT COALESCE(json_agg(row_to_json(x)),'[]'::json)::text FROM (
  SELECT "organizationId","customerId"
  FROM "CustomerStoreLink"
  WHERE "appUserId"=${literal(appUserId)}
    AND "organizationId" IN ('org_showcase_yohaku','org_salon_de_lien')
  ORDER BY "organizationId"
) x;
`))

let cookie = ''
let adminCookie = ''
let hoursRestore = null
let pointSnapshot = null
let lotteryReviewId = ''
const lotteryProposalId = 'qa-v503-lottery-proposal'
const lotteryRequestId = 'qa-v503-lottery-request'
try {
  sql(`
BEGIN;
DELETE FROM "Customer" WHERE "id"=${literal(linkedCustomerId)};
INSERT INTO "Customer" ("id","name","organizationId","updatedAt")
VALUES (${literal(linkedCustomerId)},'同期前の別店舗名','org_salon_de_lien',CURRENT_TIMESTAMP);
INSERT INTO "CustomerStoreLink" ("id","appUserId","organizationId","customerId") VALUES
 ('qa-v503-link-current',${literal(appUserId)},'org_showcase_yohaku',${literal(primaryCustomerId)}),
 ('qa-v503-link-second',${literal(appUserId)},'org_salon_de_lien',${literal(linkedCustomerId)})
ON CONFLICT ("appUserId","organizationId") DO UPDATE SET "customerId"=EXCLUDED."customerId";
COMMIT;
`)

  const login = await fetch(`${baseUrl}/api/customer-auth/login`, {
    method: 'POST', redirect: 'manual',
    headers: { Origin: baseUrl, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ loginId: 'demo.hana', password: 'Mypage2026!', next: '/u/profile' }),
  })
  assert.equal(login.status, 303)
  cookie = (login.headers.get('set-cookie') || '').split(';')[0]
  assert.match(cookie, /^[^=]+=/)

  const profile = {
    name: 'V503 横断同期確認',
    nickname: '同期QA',
    phone: '090-5030-0503',
    birthDate: '1991-05-03',
    gender: 'その他',
    hairVolume: '多い',
    hairTexture: '柔らかい',
    hairThickness: '太い',
    hairCurl: '少しある',
    servicePreference: '適度に会話したい',
  }
  const save = await fetch(`${baseUrl}/api/customer/profile`, {
    method: 'POST', redirect: 'manual',
    headers: { Origin: baseUrl, cookie, 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
    body: new URLSearchParams(profile),
  })
  assert.equal(save.status, 303)
  assert.match(save.headers.get('location') || '', /profile=saved/)

  const linkedRows = JSON.parse(sql(`
SELECT COALESCE(json_agg(row_to_json(x)),'[]'::json)::text FROM (
  SELECT c."id",c."name",c."phone",c."gender",TO_CHAR(c."birthDate",'YYYY-MM-DD') AS "birthDate",c."birthYear",
         c."servicePreference",h."hairVolume",h."hairTexture",h."hairThickness",h."hairCurl"
  FROM "Customer" c LEFT JOIN "HairProfile" h ON h."customerId"=c."id"
  WHERE c."id" IN (${literal(primaryCustomerId)},${literal(linkedCustomerId)}) ORDER BY c."id"
) x;
`))
  assert.equal(linkedRows.length, 2)
  for (const row of linkedRows) {
    assert.equal(row.name, profile.name)
    assert.equal(row.phone, profile.phone)
    assert.equal(row.gender, profile.gender)
    assert.equal(row.birthDate, profile.birthDate)
    assert.equal(Number(row.birthYear), 1991)
    assert.equal(row.servicePreference, profile.servicePreference)
    assert.equal(row.hairVolume, profile.hairVolume)
    assert.equal(row.hairTexture, profile.hairTexture)
    assert.equal(row.hairThickness, profile.hairThickness)
    assert.equal(row.hairCurl, profile.hairCurl)
  }

  const clearBirthDate = await fetch(`${baseUrl}/api/customer/profile`, {
    method: 'POST', redirect: 'manual',
    headers: { Origin: baseUrl, cookie, 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
    body: new URLSearchParams({ ...profile, birthDate: '' }),
  })
  assert.equal(clearBirthDate.status, 303)
  const clearedBirthDates = JSON.parse(sql(`
SELECT COALESCE(json_agg(row_to_json(x)),'[]'::json)::text FROM (
  SELECT "id","birthDate","birthYear" FROM "Customer"
  WHERE "id" IN (${literal(primaryCustomerId)},${literal(linkedCustomerId)}) ORDER BY "id"
) x;
`))
  assert.equal(clearedBirthDates.length, 2)
  for (const row of clearedBirthDates) {
    assert.equal(row.birthDate, null)
    assert.equal(row.birthYear, null)
  }

  const stores = await fetch(`${baseUrl}/api/lien-customer-stores`, {
    headers: { cookie, Accept: 'application/json', 'Cache-Control': 'no-cache' },
  })
  assert.equal(stores.status, 200)
  const storesPayload = await stores.json()
  assert.ok(storesPayload.stores.some(store => store.organizationId === 'org_salon_de_lien' && store.linked))
  assert.ok(storesPayload.stores.some(store => store.organizationId === 'org_showcase_yohaku' && store.linked))

  const demographicsLogin = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST', redirect: 'manual',
    headers: { Origin: baseUrl, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ email: 'demo.owner', password: 'LienDemo2026!', next: '/admin/products?section=feedback' }),
  })
  adminCookie = (demographicsLogin.headers.get('set-cookie') || '').split(';')[0]
  const demographics = await fetch(`${baseUrl}/api/lien-product-demographics`, {
    headers: { cookie: adminCookie, Accept: 'application/json' },
  })
  assert.equal(demographics.status, 200)
  const demographicsPayload = await demographics.json()
  assert.ok(demographicsPayload.products.every(product => Array.isArray(product.ageGroups) && Array.isArray(product.genders)))

  const storeProfileResponse = await fetch(`${baseUrl}/api/admin/store-profile`, {
    headers: { cookie: adminCookie, Accept: 'application/json', 'Cache-Control': 'no-cache' },
  })
  assert.equal(storeProfileResponse.status, 200)
  const storeProfilePayload = await storeProfileResponse.json()
  const storeProfile = storeProfilePayload.profile
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date())
  const month = today.slice(0, 7)
  const dayResponse = await fetch(`${baseUrl}/api/lien-business-days?month=${month}`, {
    headers: { cookie: adminCookie, Accept: 'application/json', 'Cache-Control': 'no-cache' },
  })
  assert.equal(dayResponse.status, 200)
  const originalDay = (await dayResponse.json()).days.find(day => day.date === today)
  assert.ok(originalDay)
  hoursRestore = { storeProfile, originalDay, today }

  const customDay = {
    date: today,
    isClosed: false,
    openMinutes: 660,
    closeMinutes: 1080,
    capacity: Math.max(1, Number(originalDay.capacity || 1)),
  }
  const saveDay = await fetch(`${baseUrl}/api/lien-business-days`, {
    method: 'POST',
    headers: { Origin: baseUrl, cookie: adminCookie, Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ days: [customDay] }),
  })
  assert.equal(saveDay.status, 200)

  const alternateOpen = storeProfile.businessSchedule.openMinutes === 600 ? '10:30' : '10:00'
  const alternateClose = storeProfile.businessSchedule.closeMinutes === 1200 ? '19:30' : '20:00'
  const saveDefault = await fetch(`${baseUrl}/api/admin/store-profile`, {
    method: 'POST',
    headers: { Origin: baseUrl, cookie: adminCookie, Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'update-store',
      storeName: storeProfile.storeName,
      ownerName: storeProfile.ownerName,
      phone: storeProfile.phone,
      postalCode: storeProfile.postalCode,
      prefecture: storeProfile.prefecture,
      city: storeProfile.city,
      addressLine1: storeProfile.addressLine1,
      addressLine2: storeProfile.addressLine2,
      websiteUrl: storeProfile.websiteUrl,
      businessOpen: alternateOpen,
      businessClose: alternateClose,
      closedWeekdays: storeProfile.businessSchedule.closedWeekdays,
    }),
  })
  assert.equal(saveDefault.status, 200)

  const verifyDayResponse = await fetch(`${baseUrl}/api/lien-business-days?month=${month}`, {
    headers: { cookie: adminCookie, Accept: 'application/json', 'Cache-Control': 'no-cache' },
  })
  assert.equal(verifyDayResponse.status, 200)
  const verifiedDay = (await verifyDayResponse.json()).days.find(day => day.date === today)
  assert.equal(verifiedDay.overridden, true)
  assert.equal(verifiedDay.openMinutes, customDay.openMinutes)
  assert.equal(verifiedDay.closeMinutes, customDay.closeMinutes)

  const productId = sql(`SELECT "id" FROM "Product" WHERE "organizationId"='org_showcase_yohaku' AND "active"=TRUE ORDER BY "createdAt" LIMIT 1;`)
  assert.ok(productId)
  const pointSnapshotText = sql(`
SELECT json_build_object(
  'id',"id",'availablePoints',"availablePoints",'pendingPoints',"pendingPoints",
  'lifetimeEarned',"lifetimeEarned",'lifetimeRedeemed',"lifetimeRedeemed",'lifetimeExpired',"lifetimeExpired"
)::text FROM "CustomerPointAccount" WHERE "customerId"=${literal(primaryCustomerId)};
`)
  pointSnapshot = pointSnapshotText ? JSON.parse(pointSnapshotText) : null
  const reviewToken = `store-platform-v503-${crypto.randomUUID()}`
  const tokenHash = crypto.createHash('sha256').update(reviewToken).digest('hex')
  sql(`
BEGIN;
DELETE FROM "PointLot" WHERE "earnTransactionId" IN (SELECT "id" FROM "PointTransaction" WHERE "sourceType"='product_review' AND "sourceId" IN (SELECT "id" FROM "ProductReview" WHERE "productProposalId"=${literal(lotteryProposalId)}));
DELETE FROM "PointTransaction" WHERE "sourceType"='product_review' AND "sourceId" IN (SELECT "id" FROM "ProductReview" WHERE "productProposalId"=${literal(lotteryProposalId)});
DELETE FROM "ProductProposal" WHERE "id"=${literal(lotteryProposalId)};
INSERT INTO "ProductProposal" ("id","customerId","productId","status","reaction","purchased","note","purchaseQuantity","updatedAt")
VALUES (${literal(lotteryProposalId)},${literal(primaryCustomerId)},${literal(productId)},'purchased','purchased',TRUE,'3点 / 3,000円',3,CURRENT_TIMESTAMP);
INSERT INTO "ProductReviewRequest" ("id","productProposalId","tokenHash","expiresAt","status","updatedAt")
VALUES (${literal(lotteryRequestId)},${literal(lotteryProposalId)},${literal(tokenHash)},CURRENT_TIMESTAMP + INTERVAL '1 day','active',CURRENT_TIMESTAMP);
COMMIT;
`)
  const lottery = await fetch(`${baseUrl}/api/public/review/product/${encodeURIComponent(reviewToken)}`, {
    method: 'POST',
    headers: { Origin: baseUrl, Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      usedStatus: 'used',
      rating: 5,
      repeatIntent: 'yes',
      goodPoints: ['仕上がり'],
      badPoints: [],
      freeComment: 'テスト用の商品アンケートです。購入数量と同じ回数だけ抽選され、一つの商品につき回答は一度だけになることを確認します。',
      allowAnonymousShare: true,
      allowAnonymousQuote: false,
    }),
  })
  const lotteryPayload = await lottery.json().catch(() => ({}))
  assert.equal(lottery.status, 200, lotteryPayload.error || 'lottery review submission failed')
  assert.equal(lotteryPayload.drawCount, 3)
  assert.equal(lotteryPayload.drawResults.length, 3)
  assert.equal(lotteryPayload.awardedPoints, lotteryPayload.drawResults.reduce((sum, points) => sum + points, 0))
  lotteryReviewId = lotteryPayload.reviewId
  const lotteryRecord = JSON.parse(sql(`
SELECT json_build_object(
  'reviews',(SELECT COUNT(*) FROM "ProductReview" WHERE "productProposalId"=${literal(lotteryProposalId)}),
  'drawCount',COALESCE((SELECT ("note"::jsonb->>'drawCount')::int FROM "PointTransaction" WHERE "sourceType"='product_review' AND "sourceId"=${literal(lotteryReviewId)}),0)
)::text;
`))
  assert.equal(Number(lotteryRecord.reviews), 1)
  assert.equal(Number(lotteryRecord.drawCount), 3)

  console.log(JSON.stringify({
    linkedProfiles: linkedRows.length,
    clearedBirthDates: clearedBirthDates.length,
    linkedStores: storesPayload.stores.filter(store => store.linked).length,
    demographicProducts: demographicsPayload.products.length,
    explicitBusinessDayPreserved: true,
    lotteryDraws: lotteryPayload.drawCount,
    questionnairesForProduct: Number(lotteryRecord.reviews),
  }))
} finally {
  if (hoursRestore && adminCookie) {
    const { storeProfile, originalDay, today } = hoursRestore
    const restoreDefault = await fetch(`${baseUrl}/api/admin/store-profile`, {
      method: 'POST',
      headers: { Origin: baseUrl, cookie: adminCookie, Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'update-store',
        storeName: storeProfile.storeName,
        ownerName: storeProfile.ownerName,
        phone: storeProfile.phone,
        postalCode: storeProfile.postalCode,
        prefecture: storeProfile.prefecture,
        city: storeProfile.city,
        addressLine1: storeProfile.addressLine1,
        addressLine2: storeProfile.addressLine2,
        websiteUrl: storeProfile.websiteUrl,
        businessOpen: storeProfile.businessSchedule.openTime,
        businessClose: storeProfile.businessSchedule.closeTime,
        closedWeekdays: storeProfile.businessSchedule.closedWeekdays,
      }),
    })
    assert.equal(restoreDefault.status, 200, 'default business hours cleanup failed')
    const restoreDay = await fetch(`${baseUrl}/api/lien-business-days`, {
      method: 'POST',
      headers: { Origin: baseUrl, cookie: adminCookie, Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ days: [originalDay.overridden ? {
        date: today,
        isClosed: originalDay.isClosed,
        openMinutes: originalDay.openMinutes,
        closeMinutes: originalDay.closeMinutes,
        capacity: originalDay.capacity,
      } : { date: today, reset: true }] }),
    })
    assert.equal(restoreDay.status, 200, 'daily business hours cleanup failed')
  }
  sql(`
BEGIN;
DELETE FROM "PointLot" WHERE "earnTransactionId" IN (SELECT "id" FROM "PointTransaction" WHERE "sourceType"='product_review' AND "sourceId" IN (SELECT "id" FROM "ProductReview" WHERE "productProposalId"=${literal(lotteryProposalId)}));
DELETE FROM "PointTransaction" WHERE "sourceType"='product_review' AND "sourceId" IN (SELECT "id" FROM "ProductReview" WHERE "productProposalId"=${literal(lotteryProposalId)});
DELETE FROM "ProductProposal" WHERE "id"=${literal(lotteryProposalId)};
${pointSnapshot ? `UPDATE "CustomerPointAccount" SET
  "availablePoints"=${Number(pointSnapshot.availablePoints)},"pendingPoints"=${Number(pointSnapshot.pendingPoints)},
  "lifetimeEarned"=${Number(pointSnapshot.lifetimeEarned)},"lifetimeRedeemed"=${Number(pointSnapshot.lifetimeRedeemed)},
  "lifetimeExpired"=${Number(pointSnapshot.lifetimeExpired)},"updatedAt"=CURRENT_TIMESTAMP
WHERE "id"=${literal(pointSnapshot.id)};` : `DELETE FROM "CustomerPointAccount" WHERE "customerId"=${literal(primaryCustomerId)};`}
COMMIT;
`)
  sql(`
BEGIN;
${linkedOrganizations.map(organizationId => {
  const previous = linkSnapshot.find(link => link.organizationId === organizationId)
  return previous
    ? `UPDATE "CustomerStoreLink" SET "customerId"=${literal(previous.customerId)} WHERE "appUserId"=${literal(appUserId)} AND "organizationId"=${literal(organizationId)};`
    : `DELETE FROM "CustomerStoreLink" WHERE "appUserId"=${literal(appUserId)} AND "organizationId"=${literal(organizationId)};`
}).join('\n')}
DELETE FROM "Customer" WHERE "id"=${literal(linkedCustomerId)};
UPDATE "Customer" SET
  "name"=${literal(snapshot.name)},"phone"=${literal(snapshot.phone)},"gender"=${literal(snapshot.gender)},
  "birthDate"=${literal(snapshot.birthDate)},"birthYear"=${snapshot.birthYear == null ? 'NULL' : Number(snapshot.birthYear)},
  "servicePreference"=${literal(snapshot.servicePreference)},"updatedAt"=CURRENT_TIMESTAMP
WHERE "id"=${literal(primaryCustomerId)};
UPDATE "AppUser" SET "nickname"=${literal(snapshot.nickname)},"updatedAt"=CURRENT_TIMESTAMP WHERE "id"=${literal(appUserId)};
${snapshot.hairExists ? `
INSERT INTO "HairProfile" ("id","customerId","hairVolume","hairTexture","hairThickness","hairCurl","updatedAt")
VALUES (${literal(snapshot.hairId)},${literal(primaryCustomerId)},${literal(snapshot.hairVolume)},${literal(snapshot.hairTexture)},${literal(snapshot.hairThickness)},${literal(snapshot.hairCurl)},CURRENT_TIMESTAMP)
ON CONFLICT ("customerId") DO UPDATE SET
  "hairVolume"=EXCLUDED."hairVolume","hairTexture"=EXCLUDED."hairTexture",
  "hairThickness"=EXCLUDED."hairThickness","hairCurl"=EXCLUDED."hairCurl","updatedAt"=CURRENT_TIMESTAMP;
` : `DELETE FROM "HairProfile" WHERE "customerId"=${literal(primaryCustomerId)};`}
COMMIT;
`)
}
