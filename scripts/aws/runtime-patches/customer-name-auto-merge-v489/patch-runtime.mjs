import fs from 'node:fs'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'

function replaceOnce(source, before, after, label) {
  const matches = source.split(before).length - 1
  if (matches !== 1) throw new Error(`customer-name-auto-merge-v489: expected one ${label}, found ${matches}`)
  return source.replace(before, after)
}

function replaceBetween(source, start, end, replacement, label) {
  const startIndex = source.indexOf(start)
  if (startIndex < 0) throw new Error(`customer-name-auto-merge-v489: ${label} start was not found`)
  const endIndex = source.indexOf(end, startIndex + start.length)
  if (endIndex < 0) throw new Error(`customer-name-auto-merge-v489: ${label} end was not found`)
  if (source.indexOf(start, startIndex + start.length) >= 0) throw new Error(`customer-name-auto-merge-v489: duplicate ${label} start found`)
  return source.slice(0, startIndex) + replacement + source.slice(endIndex)
}

const serverPath = `${root}/server.js`
let server = fs.readFileSync(serverPath, 'utf8')
server = replaceOnce(
  server,
  "const { createCustomerMergeService } = require('./customer-merge-v385') /* customer-record-merge-v385 */",
  "const { createCustomerMergeService } = require('./customer-merge-v385') /* customer-record-merge-v385 */\nconst { createCustomerNameAutoMergeService } = require('./customer-name-auto-merge-v489') /* customer-name-auto-merge-v489 */",
  'server import',
)
server = replaceOnce(
  server,
  'globalThis.__lienChatPrisma = prisma\nlet customerStoreStaff = null',
  "globalThis.__lienChatPrisma = prisma\nconst customerNameAutoMerge = createCustomerNameAutoMergeService({ prisma, crypto }) /* customer-name-auto-merge-v489-service */\nlet customerStoreStaff = null",
  'server service initialization',
)
server = replaceOnce(
  server,
  "  settingsClientScript: fs.readFileSync(path.join(__dirname, 'line-settings-client-v436.js')),\n}) /* line-liff-reservations-v436-service */",
  "  settingsClientScript: fs.readFileSync(path.join(__dirname, 'line-settings-client-v436.js')),\n  customerNameAutoMerge,\n}) /* line-liff-reservations-v436-service */",
  'LINE service wiring',
)
server = replaceOnce(
  server,
  '  customerSessionProvider: req => chatSession(req, \'customer\'),\n  crypto,\n}) /* tenant-bootstrap-v70-service */',
  "  customerSessionProvider: req => chatSession(req, 'customer'),\n  crypto,\n  customerNameAutoMerge,\n}) /* tenant-bootstrap-v70-service */",
  'tenant service wiring',
)
server = replaceOnce(
  server,
  "  customerSessionProvider: req => chatSession(req, 'customer'),\n  runtimeScript: fs.readFileSync(path.join(__dirname, 'customer-runtime-v267.js')),",
  "  customerSessionProvider: req => chatSession(req, 'customer'),\n  customerNameAutoMerge,\n  runtimeScript: fs.readFileSync(path.join(__dirname, 'customer-runtime-v267.js')),",
  'appointment service wiring',
)
server = replaceOnce(
  server,
  '  await billing.ensureSchema() /* stripe-subscription-billing-v52-schema */\n  await tenantSetup.ensureSchema()',
  '  await billing.ensureSchema() /* stripe-subscription-billing-v52-schema */\n  await customerNameAutoMerge.ensureSchema() /* customer-name-auto-merge-v489-schema */\n  await tenantSetup.ensureSchema()',
  'schema initialization',
)
server = replaceOnce(
  server,
  `    const users = await prisma.$queryRawUnsafe(\`SELECT u."id" FROM "AppUser" u
      JOIN "Customer" c ON c."id"=$2 AND c."organizationId"=$3 AND c."deletedAt" IS NULL
      LEFT JOIN "CustomerStoreLink" l ON l."appUserId"=u."id" AND l."organizationId"=c."organizationId" AND l."customerId"=c."id"
      WHERE u."id"=$1 AND u."role"='CUSTOMER' AND u."active"=TRUE
        AND ((u."customerId"=c."id" AND u."organizationId"=c."organizationId") OR l."id" IS NOT NULL)
      LIMIT 1\`, value.userId, value.customerId, value.organizationId)
    return users[0] ? value : null`,
  `    const users = await prisma.$queryRawUnsafe(\`WITH RECURSIVE "MergedCustomer"("customerId","depth") AS (
        SELECT $2::text,0
        UNION ALL
        SELECT h."targetCustomerId",m."depth"+1 FROM "MergedCustomer" m
        JOIN "CustomerMergeHistory" h ON h."sourceCustomerId"=m."customerId" AND h."organizationId"=$3
        WHERE m."depth"<16
      ), "ResolvedCustomer" AS (SELECT "customerId" FROM "MergedCustomer" ORDER BY "depth" DESC LIMIT 1)
      SELECT u."id",c."id" AS "customerId" FROM "AppUser" u
      JOIN "ResolvedCustomer" r ON TRUE
      JOIN "Customer" c ON c."id"=r."customerId" AND c."organizationId"=$3 AND c."deletedAt" IS NULL
      LEFT JOIN "CustomerStoreLink" l ON l."appUserId"=u."id" AND l."organizationId"=c."organizationId" AND l."customerId"=c."id"
      WHERE u."id"=$1 AND u."role"='CUSTOMER' AND u."active"=TRUE
        AND ((u."customerId"=c."id" AND u."organizationId"=c."organizationId") OR l."id" IS NOT NULL)
      LIMIT 1\`, value.userId, value.customerId, value.organizationId)
    return users[0] ? { ...value, customerId: users[0].customerId } : null`,
  'merged customer session forwarding',
)
server = replaceOnce(
  server,
  "      const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`)",
  "      const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`)\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Customer-Name-Auto-Merge', 'v489')",
  'production release marker',
)
fs.writeFileSync(serverPath, server)

const linePath = `${root}/line-reservations-v436.js`
let line = fs.readFileSync(linePath, 'utf8')
line = replaceOnce(
  line,
  'function createLineReservationService({ prisma, crypto, staffSession, settingsClientScript }) {',
  'function createLineReservationService({ prisma, crypto, staffSession, settingsClientScript, customerNameAutoMerge }) {',
  'LINE factory signature',
)
line = replaceBetween(
  line,
  '  async function findOrCreateCustomer(tx, connection, identity, body) {',
  '  async function sendLineMessage(connection, endpoint, payload) {',
  `  async function findOrCreateCustomer(tx, connection, identity, body) {
    const name = cleanText(body.customerName, 80, 'お名前', true)
    const phone = cleanText(body.phone, 32, '電話番号', true)
    const normalizedPhone = normalizeJapanesePhone(phone)
    if (!/^0[5789]0\\d{8}$/.test(normalizedPhone) && !/^0\\d{9}$/.test(normalizedPhone)) throw new LineReservationError('電話番号を確認してください。')
    const existingIdentity = await tx.$queryRawUnsafe('SELECT "customerId" FROM "CustomerLineIdentity" WHERE "organizationId"=$1 AND "lineUserId"=$2 LIMIT 1 FOR UPDATE', connection.organizationId, identity.lineUserId)
    let customer = await customerNameAutoMerge.resolveOrCreate(tx, {
      organizationId: connection.organizationId,
      existingCustomerId: existingIdentity[0]?.customerId || null,
      name,
      phone,
      overwriteName: true,
      overwritePhone: true,
      actorLabel: 'LINE予約時自動統合',
      createData: { staffAssignmentType: 'free', memo: 'LINE公式アカウントから予約登録' },
    })
    customer = await syncExistingLineCustomer(tx, { customer, organizationId: connection.organizationId, identity, name, phone })
    await tx.$executeRawUnsafe(\`INSERT INTO "CustomerLineIdentity" ("id","organizationId","customerId","lineUserId","displayName","pictureUrl","followed","lastSeenAt","createdAt","updatedAt")
      VALUES ($1,$2,$3,$4,$5,$6,TRUE,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
      ON CONFLICT ("organizationId","lineUserId") DO UPDATE SET "customerId"=EXCLUDED."customerId","displayName"=EXCLUDED."displayName","pictureUrl"=EXCLUDED."pictureUrl","followed"=TRUE,"lastSeenAt"=CURRENT_TIMESTAMP,"updatedAt"=CURRENT_TIMESTAMP\`,
      crypto.randomUUID(), connection.organizationId, customer.id, identity.lineUserId, identity.displayName, identity.pictureUrl)
    return customer
  }

`,
  'LINE customer resolution',
)
fs.writeFileSync(linePath, line)

const tenantPath = `${root}/tenant-setup.js`
let tenant = fs.readFileSync(tenantPath, 'utf8')
tenant = replaceOnce(
  tenant,
  'function createTenantSetupService({ prisma, sessionProvider, customerSessionProvider, crypto }) {',
  'function createTenantSetupService({ prisma, sessionProvider, customerSessionProvider, crypto, customerNameAutoMerge }) {',
  'tenant factory signature',
)
tenant = replaceOnce(
  tenant,
  'const inboundEmail = createInboundEmailService({ prisma, sessionProvider, crypto, parseReservationMail, normalizePhone })',
  'const inboundEmail = createInboundEmailService({ prisma, sessionProvider, crypto, parseReservationMail, normalizePhone, customerNameAutoMerge })',
  'inbound service wiring',
)
tenant = replaceBetween(
  tenant,
  '  async function findOrCreateCustomer(organizationId, parsed, hash) {',
  '  async function ingestMessage(organizationId, gmailMessage) {',
  `  async function findOrCreateCustomer(organizationId, parsed, hash) {
    return prisma.$transaction(transaction => customerNameAutoMerge.resolveOrCreate(transaction, {
      organizationId,
      name: parsed.customerName,
      phone: parsed.phone || null,
      actorLabel: 'Gmail予約取込時自動統合',
      createData: {
        id: \`gmail-customer-\${hash.slice(0, 20)}\`,
        memo: 'Gmail予約メールから登録。内容確認後に正式な顧客情報へ更新してください。',
      },
    }), { isolationLevel: 'Serializable', timeout: 30000 })
  }

`,
  'Gmail customer resolution',
)
tenant = replaceOnce(
  tenant,
  `        const customer = await transaction.customer.findFirst({ where: { id: session.customerId, organizationId: session.organizationId, deletedAt: null }, select: { id: true, name: true } })
        if (!customer) throw new Error('お客様情報が見つかりません。')`,
  `        const sessionCustomer = await transaction.customer.findFirst({ where: { id: session.customerId, organizationId: session.organizationId, deletedAt: null }, select: { id: true, name: true, phone: true } })
        if (!sessionCustomer) throw new Error('お客様情報が見つかりません。')
        const customer = await customerNameAutoMerge.resolveOrCreate(transaction, {
          organizationId: session.organizationId,
          existingCustomerId: sessionCustomer.id,
          preferredCustomerId: sessionCustomer.id,
          name: sessionCustomer.name,
          phone: sessionCustomer.phone,
          actorLabel: 'お客様アプリ予約時自動統合',
        })`,
  'customer app resolution',
)
tenant = replaceOnce(
  tenant,
  "      }, { isolationLevel: 'Serializable' })\n      return json(res, 200, { success: true, appointment:",
  "      }, { isolationLevel: 'Serializable', timeout: 30000 })\n      return json(res, 200, { success: true, appointment:",
  'customer booking transaction timeout',
)
fs.writeFileSync(tenantPath, tenant)

const inboundPath = `${root}/inbound-email.js`
let inbound = fs.readFileSync(inboundPath, 'utf8')
inbound = replaceOnce(
  inbound,
  'function createInboundEmailService({ prisma, sessionProvider, crypto, parseReservationMail, normalizePhone }) {',
  'function createInboundEmailService({ prisma, sessionProvider, crypto, parseReservationMail, normalizePhone, customerNameAutoMerge }) {',
  'inbound factory signature',
)
inbound = replaceBetween(
  inbound,
  '  async function findOrCreateCustomer(organizationId, parsed, hash) {',
  '  async function existingAppointmentForBooking(organizationId, bookingReference) {',
  `  async function findOrCreateCustomer(organizationId, parsed, hash) {
    return prisma.$transaction(transaction => customerNameAutoMerge.resolveOrCreate(transaction, {
      organizationId,
      name: parsed.customerName,
      phone: parsed.phone || null,
      actorLabel: '予約メール取込時自動統合',
      createData: {
        id: \`mail-customer-\${hash.slice(0, 20)}\`,
        memo: '予約メールから自動登録。内容確認後に正式な顧客情報へ更新してください。',
      },
    }), { isolationLevel: 'Serializable', timeout: 30000 })
  }

`,
  'inbound customer resolution',
)
fs.writeFileSync(inboundPath, inbound)

const appointmentPath = `${root}/appointment-operations-v267.js`
let appointment = fs.readFileSync(appointmentPath, 'utf8')
appointment = replaceOnce(
  appointment,
  'function createAppointmentOperationsService({ prisma, crypto, sessionProvider, customerSessionProvider, runtimeScript }) {',
  'function createAppointmentOperationsService({ prisma, crypto, sessionProvider, customerSessionProvider, runtimeScript, customerNameAutoMerge }) {',
  'appointment factory signature',
)
appointment = replaceBetween(
  appointment,
  '  async function customerForCode(tx, organizationId, rawCode) {',
  '  async function resolveManualCustomer(tx, organizationId, body) {',
  `  async function customerForCode(tx, organizationId, rawCode) {
    const code = String(rawCode || '').trim().toUpperCase()
    if (!CUSTOMER_CODE_PATTERN.test(code)) throw new RequestError('お客様コードは C-R-036 の形式で入力してください。')
    const users = await tx.$queryRawUnsafe(\`SELECT u."id" AS "appUserId",u."customerId",c."organizationId",c."name",c."gender",c."birthYear",c."birthDate",c."phone",c."servicePreference",c."staffAssignmentType",c."assignedStaffName"
      FROM "AppUser" u JOIN "Customer" c ON c."id"=u."customerId"
      WHERE u."customerPublicCode"=$1 AND u."role"='CUSTOMER' AND u."active"=true AND c."deletedAt" IS NULL FOR UPDATE OF u\`, code)
    const source = users[0]
    if (!source) throw new RequestError('このお客様コードは見つかりませんでした。', 404)
    if (source.organizationId === organizationId) {
      return customerNameAutoMerge.resolveOrCreate(tx, {
        organizationId,
        existingCustomerId: source.customerId,
        preferredCustomerId: source.customerId,
        name: source.name,
        phone: source.phone,
        actorLabel: '顧客コード予約時自動統合',
      })
    }
    const links = await tx.$queryRawUnsafe(\`SELECT l."customerId",c."name",c."phone" FROM "CustomerStoreLink" l JOIN "Customer" c ON c."id"=l."customerId" WHERE l."appUserId"=$1 AND l."organizationId"=$2 AND c."deletedAt" IS NULL LIMIT 1\`, source.appUserId, organizationId)
    if (links[0]) {
      return customerNameAutoMerge.resolveOrCreate(tx, {
        organizationId,
        existingCustomerId: links[0].customerId,
        preferredCustomerId: links[0].customerId,
        name: links[0].name,
        phone: links[0].phone,
        actorLabel: '顧客コード予約時自動統合',
      })
    }
    return customerNameAutoMerge.resolveOrCreate(tx, {
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
  }

`,
  'customer-code resolution',
)
appointment = replaceBetween(
  appointment,
  '  async function resolveManualCustomer(tx, organizationId, body) {',
  '  async function patchSchedule(req, res, url) {',
  `  async function resolveManualCustomer(tx, organizationId, body) {
    const mode = String(body.customerMode || 'existing')
    if (mode === 'existing') {
      const customerId = cleanText(body.customerId, 100, true)
      const customer = await tx.customer.findFirst({ where: { id: customerId, organizationId, deletedAt: null }, select: { id: true, name: true, phone: true } })
      if (!customer) throw new RequestError('お客様が見つかりません。', 404)
      return customerNameAutoMerge.resolveOrCreate(tx, {
        organizationId,
        existingCustomerId: customer.id,
        name: customer.name,
        phone: customer.phone,
        actorLabel: '手動予約時自動統合',
      })
    }
    if (mode === 'code') return customerForCode(tx, organizationId, body.customerPublicCode)
    if (mode !== 'new') throw new RequestError('お客様の登録方法を確認してください。')
    const name = cleanText(body.newCustomerName, 80, true)
    const phone = cleanText(body.newCustomerPhone, 32)
    return customerNameAutoMerge.resolveOrCreate(tx, {
      organizationId,
      name,
      phone,
      rejectDifferentNamePhone: true,
      actorLabel: '電話・店頭予約時自動統合',
      createData: { staffAssignmentType: 'free', memo: '電話・店頭予約から初回登録' },
    })
  }

`,
  'manual customer resolution',
)
appointment = replaceOnce(
  appointment,
  "      const status = error instanceof RequestError ? error.status : error?.code === 'P2034' ? 409 : 400",
  "      const status = error instanceof RequestError ? error.status : Number(error?.statusCode) || (error?.code === 'P2034' ? 409 : 400)",
  'appointment error status',
)
fs.writeFileSync(appointmentPath, appointment)

console.log('customer-name-auto-merge-v489 runtime patched')
