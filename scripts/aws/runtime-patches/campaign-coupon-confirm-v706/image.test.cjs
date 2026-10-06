'use strict'
const assert = require('node:assert/strict'), { Readable } = require('node:stream')
const sharp = require('/app/node_modules/sharp')
let uploaded
globalThis.__lienCampaignS3 = { send: async command => { uploaded = command.input; return {} } }
process.env.S3_PRIVATE_ASSETS_BUCKET = 'unit-test-only'
const { createCustomerCampaignService } = require('/app/customer-campaigns-v427.js')
async function run() {
  let response
  const service = createCustomerCampaignService({ staffSession: async () => ({ organizationId: 'qa-org' }), json: (_, status, body) => { response = { status, body } } })
  for (const [width, height] of [[1200, 900], [800, 1200], [1800, 600]]) {
    const colors = [[255, 0, 0], [0, 255, 0], [0, 0, 255], [255, 255, 0]]
    const patches = await Promise.all(colors.map(background => sharp({ create: { width: 100, height: 100, channels: 3, background: { r: background[0], g: background[1], b: background[2] } } }).png().toBuffer()))
    const source = await sharp({ create: { width, height, channels: 3, background: '#eeeeee' } }).composite(patches.map((input, index) => ({ input, left: index % 2 ? width - 100 : 0, top: index >= 2 ? height - 100 : 0 }))).png().toBuffer()
    const req = Readable.from([source]); req.method = 'POST'; req.headers = { 'content-type': 'image/png', origin: 'https://qa.test', host: 'qa.test' }
    await service.handle(req, {}, new URL('https://qa.test/api/lien-campaign-image'))
    assert.equal(response.status, 201)
    assert.match(uploaded.Key, /^private\/campaign-images\/qa-org\//)
    assert.equal(uploaded.ServerSideEncryption, 'AES256')
    const normalized = await sharp(uploaded.Body).removeAlpha().raw().toBuffer({ resolveWithObject: true })
    assert.equal(normalized.info.width, 1600); assert.equal(normalized.info.height, 1200)
    const scale = Math.min(1600 / width, 1200 / height), dx = (1600 - width * scale) / 2, dy = (1200 - height * scale) / 2
    for (let index = 0; index < 4; index++) {
      const x = Math.floor(dx + (index % 2 ? width - 50 : 50) * scale), y = Math.floor(dy + (index >= 2 ? height - 50 : 50) * scale), offset = (y * 1600 + x) * 3
      for (let channel = 0; channel < 3; channel++) assert.ok(Math.abs(normalized.data[offset + channel] - colors[index][channel]) < 12, 'Image corner preserved')
    }
  }
  console.log('v706 actual campaign upload handler: 4:3, portrait and landscape edges preserved; S3 transport mocked.')
}
run().catch(error => { console.error(error); process.exitCode = 1 })
