const fs = require('fs')
const path = require('path')

const nextRoot = process.env.NEXT_ROOT || '/app/.next'
const chunkDir = path.join(nextRoot, 'server/chunks')
const parserFiles = fs.readdirSync(chunkDir)
  .filter((name) => name.endsWith('.js'))
  .map((name) => path.join(chunkDir, name))
  .filter((file) => fs.readFileSync(file, 'utf8').includes('function extractReservationPrice(e)'))

if (parserFiles.length !== 1) throw new Error(`patched Gmail parser count: ${parserFiles.length}`)
const parser = fs.readFileSync(parserFiles[0], 'utf8')
for (const marker of [
  'extractCouponTitle(t)',
  'extractReservationPrice(t)',
  'n.value.estimatedPrice ?? y?.estimatedPrice ?? null',
  'FROM "SalonMenu" WHERE "organizationId"=$1',
  '"お支払い予定金額"',
]) {
  if (!parser.includes(marker)) throw new Error(`missing parser marker: ${marker}`)
}

const page = fs.readFileSync(path.join(nextRoot, 'server/app/admin/appointments/page.js'), 'utf8')
for (const marker of [
  'cancelledAppointmentIds',
  'linkedSaleAppointmentIds',
  'dailyForecast',
  'dailyRevenue',
  'activeDayCount',
  '"見込 "',
]) {
  if (!page.includes(marker)) throw new Error(`missing calendar marker: ${marker}`)
}
if (page.includes('children: [t.length, "件 ・ ¥", (dailySales.get(e.key)')) {
  throw new Error('old actual-sales-only calendar total remains')
}

console.log(JSON.stringify({
  parser: path.basename(parserFiles[0]),
  parserPriceFallback: true,
  cancellationPreservesKnownPrice: true,
  calendarUsesForecast: true,
  calendarExcludesCancelled: true,
}))
