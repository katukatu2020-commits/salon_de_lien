import fs from 'node:fs'

function replaceOnce(source, before, after, label) {
  const count = source.split(before).length - 1
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`)
  return source.replace(before, after)
}

const file = '/app/store-profile.js'
let source = fs.readFileSync(file, 'utf8')

source = replaceOnce(
  source,
  `    const websiteUrl = normalizedWebsite(data.websiteUrl)
    const previousScheduleRows = await prisma.$queryRawUnsafe(
      'SELECT "businessOpenMinutes","businessCloseMinutes" FROM "OrganizationStoreProfile" WHERE "organizationId"=$1 LIMIT 1',
      session.organizationId,
    ).catch(() => [])
    const previousSchedule = previousScheduleRows[0] || {}
    const previousOpenMinutes = Number.isInteger(Number(previousSchedule.businessOpenMinutes))
      ? Number(previousSchedule.businessOpenMinutes)
      : DEFAULT_BUSINESS_OPEN_MINUTES
    const previousCloseMinutes = Number.isInteger(Number(previousSchedule.businessCloseMinutes))
      ? Number(previousSchedule.businessCloseMinutes)
      : DEFAULT_BUSINESS_CLOSE_MINUTES
    const organization = await prisma.organization.update({`,
  `    const websiteUrl = normalizedWebsite(data.websiteUrl)
    const organization = await prisma.organization.update({`,
  'remove inherited-schedule assumption',
)

source = replaceOnce(
  source,
  `    await prisma.$executeRawUnsafe(
      \`UPDATE "OrganizationDailySchedule" SET "openMinutes"=$2,"closeMinutes"=$3,"updatedAt"=NOW() WHERE "organizationId"=$1 AND "openMinutes"=$4 AND "closeMinutes"=$5 AND "date">=TO_CHAR(NOW() AT TIME ZONE 'Asia/Tokyo','YYYY-MM-DD')\`,
      session.organizationId,
      schedule.openMinutes,
      schedule.closeMinutes,
      previousOpenMinutes,
      previousCloseMinutes,
    ).catch(() => {})
    await prisma.$executeRawUnsafe(`,
  `    await prisma.$executeRawUnsafe(`,
  'preserve explicit daily schedule rows',
)

fs.writeFileSync(file, source)
console.log('Explicit daily schedules preserved in v431.')
