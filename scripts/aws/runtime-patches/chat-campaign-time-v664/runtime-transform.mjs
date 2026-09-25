export const RELEASE_MARKER = 'chat-campaign-time-v664'

export const CAN_ACCESS_THREAD_SOURCE = `function canAccessThread(session, thread) {
  if (session.role === 'ADMIN' || session.isSharedStoreAccount === true) return true
  const accountName = String(session.displayName || '').replace(/\\s/g, '')
  const staffName = String(thread.staffName || '').replace(/\\s/g, '')
  return Boolean(accountName && staffName && (accountName === staffName || accountName.includes(staffName) || staffName.includes(accountName)))
}`

export const JAPAN_DATE_PARSER_SOURCE = String.raw`function parseJapanDateTime(value) {
  const source = String(value || '').trim()
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(source)
  if (!match) return new Date(source)
  const [, yearText, monthText, dayText, hourText, minuteText, secondText = '0'] = match
  const year = Number(yearText)
  const month = Number(monthText)
  const day = Number(dayText)
  const hour = Number(hourText)
  const minute = Number(minuteText)
  const second = Number(secondText)
  const calendar = new Date(0)
  calendar.setUTCFullYear(year, month - 1, day)
  calendar.setUTCHours(hour, minute, second, 0)
  if (calendar.getUTCFullYear() !== year || calendar.getUTCMonth() !== month - 1 || calendar.getUTCDate() !== day || calendar.getUTCHours() !== hour || calendar.getUTCMinutes() !== minute || calendar.getUTCSeconds() !== second) {
    return new Date(Number.NaN)
  }
  return new Date(calendar.getTime() - 9 * 60 * 60 * 1000)
}`

export const LOCAL_DATETIME_VALUE_SOURCE = `function localDateTimeValue(date) {
  const value = new Date(date)
  if (!Number.isFinite(value.getTime())) return ''
  return new Date(value.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 16)
}`

export const BROWSER_LOCAL_VALUE_SOURCE = "function localValue(value){const date=new Date(value);if(!Number.isFinite(date.getTime()))return '';return new Date(date.getTime()+9*60*60*1000).toISOString().slice(0,16)}"

export function replaceOne(source, before, after, label) {
  const count = source.split(before).length - 1
  if (count !== 1) throw new Error(`${label}: expected 1 match, found ${count}`)
  return source.replace(before, after)
}

function indent(source, spaces) {
  const prefix = ' '.repeat(spaces)
  return source.split('\n').map(line => `${prefix}${line}`).join('\n')
}

export function patchServerRuntime(source) {
  if (source.includes(RELEASE_MARKER)) throw new Error(`${RELEASE_MARKER}: server is already patched`)
  if (!source.includes('appointment-datetime-editor-v663-ready')) {
    throw new Error(`${RELEASE_MARKER}: reviewed v663 parent server was not found`)
  }

  let result = source
  result = replaceOne(
    result,
    `'SELECT "id", "displayName", "role" FROM "AppUser" WHERE "id"=$1 AND "organizationId"=$2 AND "active"=true LIMIT 1'`,
    `'SELECT "id", "displayName", "role", "isSharedStoreAccount" FROM "AppUser" WHERE "id"=$1 AND "organizationId"=$2 AND "active"=true LIMIT 1'`,
    'chat user lookup by id',
  )
  result = replaceOne(
    result,
    `'SELECT "id", "displayName", "role" FROM "AppUser" WHERE "organizationId"=$1 AND "active"=true AND (LOWER("loginId")=LOWER($2) OR LOWER("email")=LOWER($2)) LIMIT 1'`,
    `'SELECT "id", "displayName", "role", "isSharedStoreAccount" FROM "AppUser" WHERE "organizationId"=$1 AND "active"=true AND (LOWER("loginId")=LOWER($2) OR LOWER("email")=LOWER($2)) LIMIT 1'`,
    'chat user lookup by subject',
  )
  result = replaceOne(
    result,
    `  return users[0] ? { ...value, userId: value.userId || users[0].id, displayName: users[0].displayName, role: users[0].role } : null`,
    `  return users[0] ? { ...value, userId: value.userId || users[0].id, displayName: users[0].displayName, role: users[0].role, isSharedStoreAccount: users[0].isSharedStoreAccount === true } : null`,
    'chat session shared-account identity',
  )
  const legacyGuard = `function canAccessThread(session, thread) {
  if (session.role === 'ADMIN') return true
  const accountName = String(session.displayName || '').replace(/\\s/g, '')
  const staffName = String(thread.staffName || '').replace(/\\s/g, '')
  return Boolean(accountName && staffName && (accountName === staffName || accountName.includes(staffName) || staffName.includes(accountName)))
}`
  result = replaceOne(result, legacyGuard, CAN_ACCESS_THREAD_SOURCE, 'chat thread access guard')

  const previousReady = `      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Appointment-Datetime-Editor', 'v663') /* appointment-datetime-editor-v663-ready */`
  result = replaceOne(
    result,
    previousReady,
    `${previousReady}\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Chat-Campaign-Time', 'v664') /* ${RELEASE_MARKER}-ready */`,
    'release readiness marker',
  )
  return `${result}\n/* ${RELEASE_MARKER} */\n`
}

export function patchCampaignRuntime(source) {
  if (source.includes(RELEASE_MARKER)) throw new Error(`${RELEASE_MARKER}: campaign runtime is already patched`)
  if (!source.includes('storewide-campaigns-v498')) {
    throw new Error(`${RELEASE_MARKER}: reviewed campaign parent was not found`)
  }

  let result = source
  result = replaceOne(
    result,
    `    if (tablesReady) return`,
    `    if (tablesReady) {
      await prisma.$executeRawUnsafe(\`UPDATE "CustomerCampaign"
        SET "startsAt"="startsAt" - INTERVAL '9 hours',
            "endsAt"="endsAt" - INTERVAL '9 hours',
            "timeZoneVersion"=1
        WHERE "timeZoneVersion"=0\`)
      return
    }`,
    'campaign rolling-deployment migration guard',
  )
  result = replaceOne(
    result,
    `      "endsAt" TIMESTAMP(3) NOT NULL,\n      "status" TEXT NOT NULL DEFAULT 'published',`,
    `      "endsAt" TIMESTAMP(3) NOT NULL,\n      "timeZoneVersion" INTEGER NOT NULL DEFAULT 0,\n      "status" TEXT NOT NULL DEFAULT 'published',`,
    'campaign schema timezone version',
  )
  const recipientTableStart = `    )\`)
    await prisma.$executeRawUnsafe(\`CREATE TABLE IF NOT EXISTS "CustomerCampaignRecipient" (`
  const migration = `    )\`)
    await prisma.$executeRawUnsafe('ALTER TABLE "CustomerCampaign" ADD COLUMN IF NOT EXISTS "timeZoneVersion" INTEGER NOT NULL DEFAULT 0')
    await prisma.$executeRawUnsafe(\`UPDATE "CustomerCampaign"
      SET "startsAt"="startsAt" - INTERVAL '9 hours',
          "endsAt"="endsAt" - INTERVAL '9 hours',
          "timeZoneVersion"=1
      WHERE "timeZoneVersion"=0\`)
    await prisma.$executeRawUnsafe(\`CREATE TABLE IF NOT EXISTS "CustomerCampaignRecipient" (`
  result = replaceOne(result, recipientTableStart, migration, 'campaign timezone migration')

  result = replaceOne(
    result,
    `  function parseCampaignInput(input, organizationId) {`,
    `${indent(JAPAN_DATE_PARSER_SOURCE, 2)}\n\n  function parseCampaignInput(input, organizationId) {`,
    'campaign JST parser',
  )
  result = replaceOne(
    result,
    `    const startsAt = new Date(input.startsAt)\n    const endsAt = new Date(input.endsAt)`,
    `    const startsAt = parseJapanDateTime(input.startsAt)\n    const endsAt = parseJapanDateTime(input.endsAt)`,
    'campaign datetime parsing',
  )
  result = replaceOne(
    result,
    `          "startsAt","endsAt","status","audienceGender","audienceMinAge","audienceMaxAge","audienceMatchedCount","updatedAt"
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'published',$12,$13,$14,$15,CURRENT_TIMESTAMP)`,
    `          "startsAt","endsAt","timeZoneVersion","status","audienceGender","audienceMinAge","audienceMaxAge","audienceMatchedCount","updatedAt"
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,1,'published',$12,$13,$14,$15,CURRENT_TIMESTAMP)`,
    'campaign insert timezone version',
  )
  result = replaceOne(
    result,
    `          "audienceMatchedCount"=$14,"updatedAt"=CURRENT_TIMESTAMP`,
    `          "audienceMatchedCount"=$14,"timeZoneVersion"=1,"updatedAt"=CURRENT_TIMESTAMP`,
    'campaign update timezone version',
  )
  const legacyFormatter = `  function localDateTimeValue(date) {
    const shifted = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    return shifted.toISOString().slice(0, 16)
  }`
  result = replaceOne(result, legacyFormatter, indent(LOCAL_DATETIME_VALUE_SOURCE, 2), 'campaign server JST formatter')
  result = replaceOne(
    result,
    `function localValue(value){const date=new Date(value);date.setMinutes(date.getMinutes()-date.getTimezoneOffset());return date.toISOString().slice(0,16)}`,
    BROWSER_LOCAL_VALUE_SOURCE,
    'campaign browser JST formatter',
  )
  return `${result}\n/* ${RELEASE_MARKER} */\n`
}
