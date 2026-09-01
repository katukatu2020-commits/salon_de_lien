import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = process.env.APP_ROOT || '/app'
const cropRuntime = fs.readFileSync(path.join(root, 'customer-link-ui-v293.js'), 'utf8')
const campaign = fs.readFileSync(path.join(root, 'customer-campaigns-v427.js'), 'utf8')
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8')

const eligibleStart = cropRuntime.indexOf('function eligibleCropInput(input)')
const eligibleEnd = cropRuntime.indexOf('\n  async function cropImage(file)', eligibleStart)
assert.ok(eligibleStart >= 0 && eligibleEnd > eligibleStart, 'crop eligibility function is missing')
const eligibility = cropRuntime.slice(eligibleStart, eligibleEnd)

assert.match(eligibility, /input\.id === 'campaign-image'/)
assert.ok(
  eligibility.indexOf("input.id === 'campaign-image'") > eligibility.indexOf('/\\/community'),
  'community uploads must remain excluded before campaign eligibility',
)
assert.match(cropRuntime, /modal\('画像を正方形に調整'/)
assert.match(cropRuntime, /canvas\.toBlob/)
assert.match(cropRuntime, /new File\(\[blob\]/)
assert.match(cropRuntime, /const transfer = new DataTransfer\(\)/)
assert.match(cropRuntime, /input\.dispatchEvent\(new Event\('change', \{ bubbles: true \}\)\)/)
assert.match(campaign, /id="campaign-image"/)
assert.match(campaign, /fetch\('\/api\/lien-campaign-image'/)
assert.match(server, /X-Lien-Campaign-Image-Crop', 'v519'/)
assert.equal((cropRuntime.match(/campaign-image-crop-v519/g) || []).length, 2)

console.log(JSON.stringify({ release: 'campaign-image-crop-v519', verified: true }))
