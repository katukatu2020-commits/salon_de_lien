const fs = require('fs')
const path = require('path')

const appRoot = process.env.APP_ROOT || '/app'
const oldChunk = 'static/chunks/app/u/(account)/points/page-d5be485caa1e3acb.js'
const newChunk = 'static/chunks/app/u/(account)/points/page-d5be485caa1e3acb-sms-off-v39.js'
const read = relative => fs.readFileSync(path.join(appRoot, relative), 'utf8')

const manifest = read('.next/app-build-manifest.json')
const clientManifest = read('.next/server/app/u/(account)/points/page_client-reference-manifest.js')
const chunk = read(`.next/${newChunk}`)

const checks = [
  ['app build manifest uses the new asset URL', manifest.includes(newChunk) && !manifest.includes(oldChunk)],
  ['client reference manifest uses the new asset URL', clientManifest.includes(newChunk) && !clientManifest.includes(oldChunk)],
  ['new asset keeps the referral-aware coupon copy', chunk.includes('referralsEnabled:R=!0') && chunk.includes('限定クーポンコードを入力してください。')],
]

const failed = checks.filter(([, ok]) => !ok)
if (failed.length) {
  for (const [name] of failed) console.error(`FAILED: ${name}`)
  process.exit(1)
}

console.log(JSON.stringify({ verified: checks.map(([name]) => name) }))
