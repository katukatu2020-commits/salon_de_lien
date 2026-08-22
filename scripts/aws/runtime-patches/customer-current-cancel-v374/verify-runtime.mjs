import fs from 'node:fs'
import path from 'node:path'

function requireMarkers(file, markers) {
  const source = fs.readFileSync(file, 'utf8')
  for (const marker of markers) {
    if (!source.includes(marker)) throw new Error(`${file}: missing ${marker}`)
  }
  return source
}

const pageDirectory = '/app/.next/static/chunks/app/u/(account)/appointments'
const pageName = fs.readdirSync(pageDirectory).find(name => name.endsWith('.current-cancel-v374.js'))
if (!pageName) throw new Error('cache-busted appointments client chunk was not found')
const page = requireMarkers(path.join(pageDirectory, pageName), [
  'data-customer-appointment-id',
  '現在の予約',
])
new Function(page)

for (const file of [
  '/app/.next/app-build-manifest.json',
  '/app/.next/server/app/u/(account)/appointments/page_client-reference-manifest.js',
]) requireMarkers(file, [pageName, 'layout-customer-stability-v373.js'])

const client = requireMarkers('/app/public/customer-current-cancel-v373.js', [
  '予約をキャンセル',
  '/api/lien-customer-appointment-cancel',
])
new Function(client)

console.log('customer current reservation cancellation cache bust v374 verified')
