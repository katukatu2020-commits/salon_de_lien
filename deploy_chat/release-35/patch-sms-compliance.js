const fs = require('fs')
const path = require('path')

const appRoot = process.env.APP_ROOT || '/app'

function replaceOnce(source, before, after, label) {
  const count = source.split(before).length - 1
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`)
  return source.replace(before, after)
}

function patchFile(file, mutate) {
  const source = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n')
  const next = mutate(source)
  if (next === source) throw new Error(`no changes made: ${file}`)
  fs.writeFileSync(file, next)
}

function insertBefore(source, marker, addition, label) {
  return replaceOnce(source, marker, `${addition}\n\n${marker}`, label)
}

function replaceReferences(dir, oldName, newName) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name)
    if (entry.isDirectory()) replaceReferences(file, oldName, newName)
    else if (entry.isFile() && /\.(js|json|html)$/.test(file)) {
      const source = fs.readFileSync(file, 'utf8')
      if (source.includes(oldName)) fs.writeFileSync(file, source.split(oldName).join(newName))
    }
  }
}

const serverFunctionsContainer = function smsComplianceSource() { /*
let smsComplianceSchemaPromise = null
let smsCompliancePollRunning = false

async function ensureSmsComplianceSchema() {
  if (!smsComplianceSchemaPromise) {
    smsComplianceSchemaPromise = (async () => {
      const migration = fs.readFileSync(path.join(__dirname, 'sms-compliance-migration.sql'), 'utf8')
      const statements = migration.split(/\n\s*-- statement-breakpoint\s*\n/g).map(value => value.trim()).filter(Boolean)
      for (const statement of statements) await prisma.$executeRawUnsafe(statement)
    })().catch(error => {
      smsComplianceSchemaPromise = null
      throw error
    })
  }
  return smsComplianceSchemaPromise
}

function smsMaskedPhone(value) {
  const match = String(value || '').match(/^\+81(70|80|90)(\d{4})(\d{4})$/)
  return match ? ('0' + match[1] + '-****-' + match[3]) : '未登録'
}

function smsIsCancelled(status) {
  return /cancel|キャンセル/i.test(String(status || ''))
}

function smsJpDateTime(value) {
  return new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit',
    weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(new Date(value))
}

function smsMessageFor(type, appointment) {
  const when = smsJpDateTime(appointment.scheduledAt)
  const menu = String(appointment.menu || 'ご予約メニュー').replace(/[\r\n]+/g, ' ').slice(0, 80)
  const messages = {
    RESERVATION_CONFIRMATION: `Salon de Lien 予約確認: ${when} ${menu}。ご予約内容はお客様アプリで確認できます。`,
    RESERVATION_REMINDER: `Salon de Lien 予約リマインド: ${when} ${menu}。ご来店をお待ちしております。`,
    RESERVATION_CHANGED: `Salon de Lien 予約変更: 変更後は ${when} ${menu} です。お客様アプリで内容をご確認ください。`,
    RESERVATION_CANCELLED: `Salon de Lien 予約キャンセル: ${when} ${menu} のご予約をキャンセルしました。`,
  }
  return messages[type]
}

function smsProviderClient() {
  if (!globalThis.__lienSmsSnsClient) {
    globalThis.__lienSmsSnsClient = new SNSClient({ region: process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'ap-northeast-1' })
  }
  return globalThis.__lienSmsSnsClient
}

async function smsPublish(phoneE164, message) {
  const attributes = {
    'AWS.SNS.SMS.SMSType': { DataType: 'String', StringValue: 'Transactional' },
    'AWS.SNS.SMS.SenderID': { DataType: 'String', StringValue: (process.env.SMS_SENDER_ID || 'SalonLien').trim() || 'SalonLien' },
  }
  const maxPrice = process.env.SMS_MAX_PRICE_USD && process.env.SMS_MAX_PRICE_USD.trim()
  if (maxPrice) attributes['AWS.SNS.SMS.MaxPrice'] = { DataType: 'Number', StringValue: maxPrice }
  const result = await smsProviderClient().send(new PublishCommand({ PhoneNumber: phoneE164, Message: message, MessageAttributes: attributes }))
  if (!result.MessageId) throw new Error('AWS SNS did not return a message ID')
  return result.MessageId
}

async function smsInsertSkippedLog(appointment, customer, type, eventKey, status, phoneE164) {
  const rows = await prisma.$queryRawUnsafe(
    'INSERT INTO "SmsSendLog" ("id","organizationId","customerId","appointmentId","phoneE164","smsType","smsCategory","eventKey","requestedAt","success","status","provider","transactionalOptInAtSend","consentSourceAtSend","userInitiated","createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,\'RESERVATION\',$7,CURRENT_TIMESTAMP,false,$8,\'AWS_SNS\',$9,$10,false,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) ON CONFLICT ("eventKey") DO NOTHING RETURNING "id"',
    crypto.randomUUID(), customer.organizationId, customer.id, appointment.id, phoneE164, type, eventKey, status,
    Boolean(customer.smsTransactionalOptIn), customer.smsConsentSource || null,
  )
  return rows.length > 0
}

async function sendReservationSms(type, appointment, eventKey) {
  const message = smsMessageFor(type, appointment)
  if (!message) throw new Error(`Unsupported reservation SMS type: ${type}`)
  const customers = await prisma.$queryRawUnsafe(
    'SELECT c."id",c."organizationId",c."phone",c."phoneVerifiedAt",c."smsTransactionalOptIn",c."smsTransactionalOptInAt",c."smsTransactionalOptOutAt",c."smsConsentSource",i."phoneE164",i."verifiedAt" AS "identityVerifiedAt" FROM "Customer" c LEFT JOIN "CustomerPhoneIdentity" i ON i."customerId"=c."id" AND i."organizationId"=c."organizationId" WHERE c."id"=$1 AND c."deletedAt" IS NULL LIMIT 1',
    appointment.customerId,
  )
  const customer = customers[0]
  if (!customer) return false
  const phone = customer.phoneE164 || ''
  let skipped = null
  if (!phone) skipped = 'SKIPPED_NO_PHONE'
  else if (!customer.phoneVerifiedAt || !customer.identityVerifiedAt) skipped = 'SKIPPED_UNVERIFIED'
  else if (customer.smsTransactionalOptOutAt) skipped = 'SKIPPED_OPTED_OUT'
  else if (customer.smsTransactionalOptIn !== true) skipped = 'SKIPPED_NO_CONSENT'
  if (skipped) {
    await smsInsertSkippedLog(appointment, customer, type, eventKey, skipped, phone)
    return false
  }

  const logId = crypto.randomUUID()
  const claimed = await prisma.$queryRawUnsafe(
    'INSERT INTO "SmsSendLog" ("id","organizationId","customerId","appointmentId","phoneE164","smsType","smsCategory","eventKey","requestedAt","success","status","provider","transactionalOptInAtSend","consentSourceAtSend","userInitiated","createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,\'RESERVATION\',$7,CURRENT_TIMESTAMP,NULL,\'PENDING\',\'AWS_SNS\',true,$8,false,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) ON CONFLICT ("eventKey") DO NOTHING RETURNING "id"',
    logId, customer.organizationId, customer.id, appointment.id, phone, type, eventKey, customer.smsConsentSource || null,
  )
  if (!claimed.length) return false

  try {
    const messageId = await smsPublish(phone, message)
    await prisma.$executeRawUnsafe(
      'UPDATE "SmsSendLog" SET "sentAt"=CURRENT_TIMESTAMP,"success"=true,"status"=\'SENT\',"awsMessageId"=$2,"updatedAt"=CURRENT_TIMESTAMP WHERE "id"=$1',
      logId, messageId,
    )
    return true
  } catch (error) {
    const code = error && typeof error === 'object' && 'name' in error ? String(error.name).slice(0, 100) : 'SMS_SEND_FAILED'
    const detail = (error instanceof Error ? error.message : String(error)).slice(0, 500)
    await prisma.$executeRawUnsafe(
      'UPDATE "SmsSendLog" SET "success"=false,"status"=\'FAILED\',"errorCode"=$2,"errorMessage"=$3,"updatedAt"=CURRENT_TIMESTAMP WHERE "id"=$1',
      logId, code, detail,
    )
    console.error('reservation SMS failed', { appointmentId: appointment.id, type, code })
    return false
  }
}

async function observeAppointmentSmsChanges() {
  const initialized = (await prisma.$queryRawUnsafe('SELECT "initializedAt" FROM "SmsComplianceState" WHERE "id"=\'sms-compliance-v1\' LIMIT 1'))[0]
  if (!initialized) return
  const appointments = await prisma.$queryRawUnsafe(
    'SELECT a."id",a."customerId",a."scheduledAt",a."menu",a."status",a."createdAt",a."updatedAt",s."scheduledAt" AS "observedScheduledAt",s."status" AS "observedStatus",s."lastObservedUpdatedAt" FROM "Appointment" a JOIN "Customer" c ON c."id"=a."customerId" LEFT JOIN "SmsAppointmentState" s ON s."appointmentId"=a."id" WHERE c."deletedAt" IS NULL AND (s."id" IS NULL OR s."scheduledAt" IS DISTINCT FROM a."scheduledAt" OR s."status" IS DISTINCT FROM a."status") ORDER BY a."updatedAt" ASC LIMIT 200',
  )
  for (const appointment of appointments) {
    if (!appointment.lastObservedUpdatedAt) {
      const inserted = await prisma.$queryRawUnsafe(
        'INSERT INTO "SmsAppointmentState" ("id","appointmentId","scheduledAt","status","lastObservedUpdatedAt","createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) ON CONFLICT ("appointmentId") DO NOTHING RETURNING "id"',
        `sms-state-${appointment.id}`, appointment.id, appointment.scheduledAt, appointment.status || null, appointment.updatedAt,
      )
      if (inserted.length && new Date(appointment.createdAt) >= new Date(initialized.initializedAt) && !smsIsCancelled(appointment.status)) {
        await sendReservationSms('RESERVATION_CONFIRMATION', appointment, `reservation-confirmation:${appointment.id}`)
      }
      continue
    }

    const won = await prisma.$queryRawUnsafe(
      'UPDATE "SmsAppointmentState" SET "scheduledAt"=$2,"status"=$3,"lastObservedUpdatedAt"=$4,"updatedAt"=CURRENT_TIMESTAMP WHERE "appointmentId"=$1 AND "scheduledAt"=$5 AND "status" IS NOT DISTINCT FROM $6 RETURNING "id"',
      appointment.id, appointment.scheduledAt, appointment.status || null, appointment.updatedAt,
      appointment.observedScheduledAt, appointment.observedStatus || null,
    )
    if (!won.length) continue
    if (smsIsCancelled(appointment.status) && !smsIsCancelled(appointment.observedStatus)) {
      await sendReservationSms('RESERVATION_CANCELLED', appointment, `reservation-cancelled:${appointment.id}`)
    } else if (new Date(appointment.scheduledAt).getTime() !== new Date(appointment.observedScheduledAt).getTime() && !smsIsCancelled(appointment.status)) {
      await sendReservationSms('RESERVATION_CHANGED', appointment, `reservation-changed:${appointment.id}:${new Date(appointment.scheduledAt).toISOString()}`)
    }
  }
}

async function sendDueReservationReminders() {
  const appointments = await prisma.$queryRawUnsafe(
    'SELECT a."id",a."customerId",a."scheduledAt",a."menu",a."status",a."createdAt",a."updatedAt" FROM "Appointment" a JOIN "Customer" c ON c."id"=a."customerId" JOIN "SmsAppointmentState" s ON s."appointmentId"=a."id" AND s."scheduledAt"=a."scheduledAt" WHERE c."deletedAt" IS NULL AND a."scheduledAt">CURRENT_TIMESTAMP + INTERVAL \'20 hours\' AND a."scheduledAt"<=CURRENT_TIMESTAMP + INTERVAL \'24 hours\' AND a."updatedAt"<CURRENT_TIMESTAMP - INTERVAL \'1 hour\' ORDER BY a."scheduledAt" ASC LIMIT 200',
  )
  for (const appointment of appointments) {
    if (!smsIsCancelled(appointment.status)) {
      await sendReservationSms('RESERVATION_REMINDER', appointment, `reservation-reminder:${appointment.id}:${new Date(appointment.scheduledAt).toISOString()}`)
    }
  }
}

async function runSmsComplianceCycle() {
  if (smsCompliancePollRunning) return
  smsCompliancePollRunning = true
  try {
    await ensureSmsComplianceSchema()
    await prisma.$executeRawUnsafe('UPDATE "SmsSendLog" AS log SET "customerId"=identity."customerId","updatedAt"=CURRENT_TIMESTAMP FROM "CustomerPhoneIdentity" AS identity WHERE log."customerId" IS NULL AND log."organizationId"=identity."organizationId" AND log."phoneE164"=identity."phoneE164" AND log."smsCategory"=\'OTP\'')
    await observeAppointmentSmsChanges()
    await sendDueReservationReminders()
  } catch (error) {
    console.error('SMS compliance cycle failed', error)
  } finally {
    smsCompliancePollRunning = false
  }
}

async function customerSmsSettingsPage(res, session, url) {
  await ensureSmsComplianceSchema()
  const data = await customerAppData(session)
  const rows = await prisma.$queryRawUnsafe(
    'SELECT c."phoneVerifiedAt",c."smsTransactionalOptIn",c."smsTransactionalOptInAt",c."smsTransactionalOptOutAt",c."smsConsentSource",i."phoneE164",i."verifiedAt" AS "identityVerifiedAt" FROM "Customer" c LEFT JOIN "CustomerPhoneIdentity" i ON i."customerId"=c."id" AND i."organizationId"=c."organizationId" WHERE c."id"=$1 LIMIT 1',
    session.customerId,
  )
  const state = rows[0] || {}
  const verified = Boolean(state.phoneVerifiedAt && state.identityVerifiedAt)
  const enabled = verified && state.smsTransactionalOptIn === true && !state.smsTransactionalOptOutAt
  const notice = url.searchParams.get('saved') === '1' ? '<p role="status" style="margin:0 0 14px;border:1px solid #bfd5c1;border-radius:12px;background:#f2f8f2;padding:12px;color:#315c3c;font-size:12px">SMS予約通知の設定を保存しました。</p>' : ''
  const body = `<div class="page-title"><h1>SMS予約通知</h1></div><section class="section">${notice}<div class="status-card"><span class="label">電話番号認証</span><strong>${verified ? '認証済み' : '未認証'}</strong><p>${htmlEscape(smsMaskedPhone(state.phoneE164))}${verified ? ` / ${htmlEscape(jpDate(state.phoneVerifiedAt, true))}` : ''}</p></div><form action="/api/lien-sms-consent" method="post" style="margin-top:16px"><input type="hidden" name="disabledValue" value="1"><label style="display:flex;align-items:flex-start;gap:12px;border:1px solid #eaded9;border-radius:14px;background:#fff;padding:16px"><input type="checkbox" name="enabled" value="1" ${enabled ? 'checked' : ''} ${verified ? '' : 'disabled'} style="width:22px;height:22px;accent-color:#d85d79"><span><strong style="display:block;font-size:13px;line-height:1.6">SMSで予約確認、予約変更・キャンセル通知、予約リマインドを受け取る</strong><small style="display:block;margin-top:6px;color:#81756f;line-height:1.7">任意の設定です。電話番号認証用OTPとは別の同意で、初期状態はOFFです。いつでもOFFにできます。</small></span></label><button class="primary" type="submit" style="width:100%;border:0" ${verified ? '' : 'disabled'}>設定を保存</button></form>${verified ? '' : '<p style="margin-top:12px;color:#a04d42;font-size:11px">予約通知をONにするには、認証済みの電話番号が必要です。</p>'}<div class="recommend"><h2>現在の記録</h2><ul><li>予約関連SMS: ${enabled ? 'ON' : 'OFF'}</li><li>同意日時: ${state.smsTransactionalOptInAt ? htmlEscape(jpDate(state.smsTransactionalOptInAt, true)) : '未同意'}</li><li>解除日時: ${state.smsTransactionalOptOutAt ? htmlEscape(jpDate(state.smsTransactionalOptOutAt, true)) : 'なし'}</li></ul></div></section>`
  sendCustomerHtml(res, customerShell({ title: 'SMS予約通知', active: 'メニュー', unread: data.unread, back: '/u/menu', body }))
}

async function customerSmsConsent(req, res) {
  const session = await chatSession(req, 'customer')
  if (!session) { res.statusCode = 302; res.setHeader('Location', '/u/login'); return res.end() }
  const origin = req.headers.origin
  if (origin && new URL(origin).host !== req.headers.host) return json(res, 403, { error: '不正な送信元です。' })
  await ensureSmsComplianceSchema()
  let raw = ''; for await (const chunk of req) raw += chunk
  const form = new URLSearchParams(raw)
  const enabled = form.get('enabled') === '1'
  const verified = (await prisma.$queryRawUnsafe('SELECT c."smsTransactionalOptIn",c."phoneVerifiedAt",i."verifiedAt" FROM "Customer" c LEFT JOIN "CustomerPhoneIdentity" i ON i."customerId"=c."id" AND i."organizationId"=c."organizationId" WHERE c."id"=$1 AND c."organizationId"=$2 LIMIT 1', session.customerId, session.organizationId))[0]
  if (!verified) return json(res, 404, { error: '顧客情報が見つかりません。' })
  if (enabled && (!verified.phoneVerifiedAt || !verified.verifiedAt)) return json(res, 400, { error: '電話番号認証を完了してください。' })
  if (enabled) {
    await prisma.$executeRawUnsafe('UPDATE "Customer" SET "smsTransactionalOptIn"=true,"smsTransactionalOptInAt"=CURRENT_TIMESTAMP,"smsTransactionalOptOutAt"=NULL,"smsConsentSource"=\'customer_portal\',"updatedAt"=CURRENT_TIMESTAMP WHERE "id"=$1 AND "organizationId"=$2', session.customerId, session.organizationId)
  } else {
    await prisma.$executeRawUnsafe('UPDATE "Customer" SET "smsTransactionalOptIn"=false,"smsTransactionalOptOutAt"=CASE WHEN "smsTransactionalOptIn" THEN CURRENT_TIMESTAMP ELSE "smsTransactionalOptOutAt" END,"updatedAt"=CURRENT_TIMESTAMP WHERE "id"=$1 AND "organizationId"=$2', session.customerId, session.organizationId)
  }
  res.statusCode = 303; res.setHeader('Location', '/u/sms-settings?saved=1'); res.end()
}

async function adminSmsStatusApi(req, res, url) {
  await ensureSmsComplianceSchema()
  const session = await chatSession(req, 'staff')
  if (!session) return json(res, 401, { error: 'ログインが必要です。' })
  const customerId = String(url.searchParams.get('customerId') || '')
  if (!customerId) return json(res, 400, { error: '顧客IDが必要です。' })
  const rows = await prisma.$queryRawUnsafe('SELECT c."phoneVerifiedAt",c."smsTransactionalOptIn",c."smsTransactionalOptInAt",c."smsTransactionalOptOutAt",c."smsConsentSource",i."phoneE164",i."verifiedAt" AS "identityVerifiedAt" FROM "Customer" c LEFT JOIN "CustomerPhoneIdentity" i ON i."customerId"=c."id" AND i."organizationId"=c."organizationId" WHERE c."id"=$1 AND c."organizationId"=$2 AND c."deletedAt" IS NULL LIMIT 1', customerId, session.organizationId)
  const state = rows[0]
  if (!state) return json(res, 404, { error: '顧客が見つかりません。' })
  const verified = Boolean(state.phoneVerifiedAt && state.identityVerifiedAt)
  const enabled = verified && state.smsTransactionalOptIn === true && !state.smsTransactionalOptOutAt
  return json(res, 200, {
    phone: smsMaskedPhone(state.phoneE164),
    verified,
    phoneVerifiedAt: state.phoneVerifiedAt ? jpDate(state.phoneVerifiedAt, true) : null,
    enabled,
    optInAt: state.smsTransactionalOptInAt ? jpDate(state.smsTransactionalOptInAt, true) : null,
    optOutAt: state.smsTransactionalOptOutAt ? jpDate(state.smsTransactionalOptOutAt, true) : null,
    source: state.smsConsentSource || null,
    readOnly: true,
  })
}
*/ }
const serverFunctions = serverFunctionsContainer.toString().match(/\/\*([\s\S]*?)\*\//)[1].trim()

const serverFile = path.join(appRoot, 'server.js')
patchFile(serverFile, source => {
  source = replaceOnce(
    source,
    "const crypto = require('crypto')\nconst { PrismaClient } = require('@prisma/client')",
    "const crypto = require('crypto')\nconst fs = require('fs')\nconst { PrismaClient } = require('@prisma/client')\nconst { SNSClient, PublishCommand } = require('@aws-sdk/client-sns')",
    'server imports',
  )
  source = insertBefore(source, "const app = next({ dev: false, dir, conf: nextConfig })", serverFunctions.trim(), 'SMS compliance server functions')
  source = replaceOnce(source, "app.prepare().then(() => {", "app.prepare().then(async () => {\n  await ensureSmsComplianceSchema()", 'schema before listen')
  source = replaceOnce(source, "if (url.pathname === '/api/lien-chat') return await chatApi(req, res, url)", "if (url.pathname === '/api/lien-sms-consent' && req.method === 'POST') return await customerSmsConsent(req, res)\n      if (url.pathname === '/api/lien-admin-sms-status' && req.method === 'GET') return await adminSmsStatusApi(req, res, url)\n      if (url.pathname === '/api/lien-chat') return await chatApi(req, res, url)", 'consent and admin status routes')
  source = replaceOnce(source, "if (req.method === 'GET' && ['/u/home','/u/catalog','/u/coupons','/u/stamps','/u/news','/u/menu'].includes(url.pathname)) return await customerBrandedPage(req, res, url)", "if (req.method === 'GET' && ['/u/home','/u/catalog','/u/coupons','/u/stamps','/u/news','/u/menu','/u/sms-settings'].includes(url.pathname)) {\n        if (url.pathname === '/u/sms-settings') {\n          const session = await chatSession(req, 'customer')\n          if (!session) { res.statusCode = 302; res.setHeader('Location', '/u/login'); return res.end() }\n          return await customerSmsSettingsPage(res, session, url)\n        }\n        return await customerBrandedPage(req, res, url)\n      }", 'settings page route')
  source = replaceOnce(source, "const rows = [['user','", "const rows = [['bell','SMS予約通知','/u/sms-settings'],['user','", 'customer menu SMS link')
  source = replaceOnce(source, "server.listen(currentPort, hostname, () => console.log(`Salon de Lien listening on ${hostname}:${currentPort}`))", "server.listen(currentPort, hostname, () => {\n    console.log(`Salon de Lien listening on ${hostname}:${currentPort}`)\n    if (process.env.SMS_COMPLIANCE_DISABLE_POLLER !== 'true') {\n      const initialTimer = setTimeout(runSmsComplianceCycle, 5000); initialTimer.unref()\n      const smsTimer = setInterval(runSmsComplianceCycle, 60000); smsTimer.unref()\n    }\n  })", 'SMS poller startup')
  return source
})

const otpFile = path.join(appRoot, '.next', 'server', 'chunks', '2241.js')
patchFile(otpFile, source => {
  const rateLimit = 'if(m>=3||g>=10)throw new d("認証コードの送信回数が上限に達しました。1時間ほど待ってからお試しください。",429,"rate_limited");let h='
  source = replaceOnce(source, rateLimit, 'if(m>=3||g>=10)throw new d("認証コードの送信回数が上限に達しました。1時間ほど待ってからお試しください。",429,"rate_limited");if(await i._.smsVerificationChallenge.count({where:{organizationId:e.organizationId,phoneE164:a,createdAt:{gt:new Date(Date.now()-6e4)}}}))throw new d("認証コードは1分後に再送できます。",429,"resend_too_soon");let h=', 'OTP resend interval')

  const sendStart = 'try{t=await c({phoneE164:a,message:'
  const sendEnd = '}return{challengeId:h'
  const start = source.indexOf(sendStart)
  const end = source.indexOf(sendEnd, start)
  if (start < 0 || end < 0) throw new Error('OTP send block not found')
  const original = source.slice(start, end + 1)
  const callEnd = original.indexOf('})}catch(e){')
  if (callEnd < 0) throw new Error('OTP provider call terminator not found')
  const providerCall = original.slice('try{'.length, callEnd + 2)
  const replacement = `await i._.$executeRawUnsafe('INSERT INTO "SmsSendLog" ("id","organizationId","challengeId","phoneE164","smsType","smsCategory","eventKey","requestedAt","success","status","provider","userInitiated","createdAt","updatedAt") VALUES ($1,$2,$1,$3,\\'ACCOUNT_VERIFICATION_OTP\\',\\'OTP\\',$4,CURRENT_TIMESTAMP,NULL,\\'PENDING\\',\\'AWS_SNS\\',true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) ON CONFLICT ("eventKey") DO NOTHING',h,e.organizationId,a,\`otp:\${h}\`);try{${providerCall}}catch(e){let t=e instanceof Error?e.message:String(e);await Promise.allSettled([i._.$executeRawUnsafe('UPDATE "SmsVerificationChallenge" SET "smsStatus"=\\'FAILED\\',"updatedAt"=CURRENT_TIMESTAMP WHERE "id"=$1',h),i._.$executeRawUnsafe('UPDATE "SmsSendLog" SET "success"=false,"status"=\\'FAILED\\',"errorCode"=\\'OTP_SEND_FAILED\\',"errorMessage"=$2,"updatedAt"=CURRENT_TIMESTAMP WHERE "eventKey"=$1',\`otp:\${h}\`,t.slice(0,500))]);throw new d(t||"SMSを送信できませんでした。",503,"sms_failed")}await Promise.allSettled([i._.$executeRawUnsafe('UPDATE "SmsVerificationChallenge" SET "sentAt"=CURRENT_TIMESTAMP,"smsProvider"=$2,"smsMessageId"=$3,"smsStatus"=\\'SENT\\',"updatedAt"=CURRENT_TIMESTAMP WHERE "id"=$1',h,t.provider,t.messageId),i._.$executeRawUnsafe('UPDATE "SmsSendLog" SET "sentAt"=CURRENT_TIMESTAMP,"success"=true,"status"=\\'SENT\\',"provider"=$2,"awsMessageId"=$3,"updatedAt"=CURRENT_TIMESTAMP WHERE "eventKey"=$1',\`otp:\${h}\`,t.provider,t.messageId)]);`
  return source.slice(0, start) + replacement + source.slice(end + 1)
})

const broadcastFile = path.join(appRoot, '.next', 'server', 'chunks', '9845.js')
patchFile(broadcastFile, source => replaceOnce(
  source,
  'throw Error("配信方法を確認してください。");',
  'throw Error("配信方法を確認してください。");\n        if ("sms" === deliveryMethod)\n          throw Error("SMS一斉配信は利用できません。SMSは、本人が要求した認証コードと、同意済み顧客への予約通知にのみ使用できます。");',
  'disable non-consented bulk SMS',
))

const otpExplanationBefore = '1つの携帯番号につき、お客様アカウントは1つだけ作成できます。'
const otpExplanationAfter = 'この電話番号を本人確認に使用します。SMSは、あなたが「認証コードを送信」を押した時だけ送信され、ページ表示や電話番号入力だけでは送信されません。予約通知への同意とは別です。1つの携帯番号につき、お客様アカウントは1つだけ作成できます。'
const registrationFiles = [
  path.join(appRoot, '.next', 'server', 'app', 'u', 'register', '[token]', 'page.js'),
  path.join(appRoot, '.next', 'static', 'chunks', 'app', 'u', 'register', '[token]', 'page-36454af0277c0f75.js'),
]
for (const file of registrationFiles) {
  patchFile(file, source => {
    const count = source.split(otpExplanationBefore).length - 1
    if (count !== 1) throw new Error(`OTP explanation in ${file}: expected one match, found ${count}`)
    return source.replace(otpExplanationBefore, otpExplanationAfter)
  })
}

const prismaSchema = path.join(appRoot, 'prisma', 'schema.prisma')
if (fs.existsSync(prismaSchema)) {
patchFile(prismaSchema, source => {
    source = replaceOnce(source, '  phone                 String?\n', '  phone                 String?\n  phoneVerifiedAt       DateTime?\n  smsTransactionalOptIn Boolean   @default(false)\n  smsTransactionalOptInAt DateTime?\n  smsTransactionalOptOutAt DateTime?\n  smsConsentSource      String?\n', 'Prisma Customer SMS fields')
    source = replaceOnce(source, '  updatedAt             DateTime  @updatedAt\n\n  @@index([organizationId, phoneE164, createdAt])', '  updatedAt             DateTime  @updatedAt\n  sentAt               DateTime?\n  smsProvider           String?\n  smsMessageId          String?\n  smsStatus             String?\n\n  @@index([organizationId, phoneE164, createdAt])', 'Prisma OTP send metadata')
    return source
})

const adminStaticRoot = path.join(appRoot, '.next', 'static', 'chunks', 'app')
const adminLayoutFile = fs.readdirSync(adminStaticRoot).find(name => /^layout-sidebar-boundary-.*\.js$/.test(name))
if (!adminLayoutFile) throw new Error('admin layout client chunk not found')
const adminLayoutPath = path.join(adminStaticRoot, adminLayoutFile)
const adminSmsClient = `
;(()=>{
  const label='SMS認証・同意状況'
  let activeCustomer='', requestToken=0
  const remove=()=>{document.querySelector('[aria-label="'+label+'"]')?.remove()}
  const value=(root,key,text,color)=>{const node=root.querySelector('[data-sms="'+key+'"]');node.textContent=text;if(color)node.style.color=color}
  async function render(){
    const match=/^\\/admin\\/customers\\/([^/]+)$/.exec(location.pathname)
    const customerId=match&&match[1]!=='messages'?decodeURIComponent(match[1]):''
    if(!customerId){activeCustomer='';remove();return}
    if(activeCustomer===customerId&&document.querySelector('[aria-label="'+label+'"]'))return
    activeCustomer=customerId;remove();const token=++requestToken
    try{
      const response=await fetch('/api/lien-admin-sms-status?customerId='+encodeURIComponent(customerId),{credentials:'same-origin',cache:'no-store'})
      if(!response.ok||token!==requestToken||activeCustomer!==customerId)return
      const data=await response.json()
      const panel=document.createElement('aside');panel.setAttribute('aria-label',label)
      panel.style.cssText="position:fixed;right:20px;bottom:20px;z-index:60;width:min(360px,calc(100vw - 32px));border:1px solid #e4d4c8;border-radius:18px;background:#fffdfaf2;padding:16px;box-shadow:0 16px 44px #4f352326;backdrop-filter:blur(10px);font-family:-apple-system,BlinkMacSystemFont,'Hiragino Kaku Gothic ProN','Yu Gothic',sans-serif"
      panel.innerHTML='<strong style="display:block;color:#2f2a25;font-size:14px">SMS認証・同意状況</strong><dl style="display:grid;grid-template-columns:auto 1fr;gap:7px 12px;margin:12px 0 0;font-size:12px"><dt style="color:#7c7168">電話番号</dt><dd data-sms="phone" style="margin:0;font-weight:700"></dd><dt style="color:#7c7168">本人確認</dt><dd data-sms="verified" style="margin:0;font-weight:700"></dd><dt style="color:#7c7168">予約SMS</dt><dd data-sms="enabled" style="margin:0;font-weight:700"></dd><dt style="color:#7c7168">同意日時</dt><dd data-sms="optin" style="margin:0"></dd><dt style="color:#7c7168">解除日時</dt><dd data-sms="optout" style="margin:0"></dd><dt style="color:#7c7168">同意経路</dt><dd data-sms="source" style="margin:0"></dd></dl><p style="margin:12px 0 0;color:#7c7168;font-size:10px;line-height:1.6">閲覧専用です。管理者が顧客の同意なしにONへ変更する操作はありません。</p>'
      value(panel,'phone',data.phone||'未登録')
      value(panel,'verified',data.verified?'認証済み（'+data.phoneVerifiedAt+'）':'未認証')
      value(panel,'enabled',data.enabled?'ON':'OFF',data.enabled?'#356244':'#8b4b42')
      value(panel,'optin',data.optInAt||'なし');value(panel,'optout',data.optOutAt||'なし');value(panel,'source',data.source||'なし')
      document.body.appendChild(panel)
    }catch(error){if(token===requestToken)remove()}
  }
  render();setInterval(render,750);addEventListener('popstate',render);document.addEventListener('click',()=>setTimeout(render,0),true)
})()
`
fs.appendFileSync(adminLayoutPath, adminSmsClient)
const versionedAdminLayoutFile = adminLayoutFile.replace(/(?:\.sms-compliance-v\d+)?\.js$/, '.sms-compliance-v1.js')
fs.renameSync(adminLayoutPath, path.join(adminStaticRoot, versionedAdminLayoutFile))
replaceReferences(path.join(appRoot, '.next'), adminLayoutFile, versionedAdminLayoutFile)
}

console.log(JSON.stringify({
  patched: [
    'explicit OTP disclosure and click-only send flow',
    'one-minute OTP resend interval',
    'OTP AWS message ID and outcome audit log',
    'transactional SMS consent settings and opt-out',
    'server-side appointment SMS consent gate',
    'appointment confirmation, reminder, change, and cancellation SMS events',
    'read-only admin consent status',
    'generic bulk SMS blocked server-side',
  ],
}))
