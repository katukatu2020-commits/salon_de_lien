import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const require = createRequire(import.meta.url)
const runtimeRequire = createRequire(path.join(root, 'server.js'))
const read = file => fs.readFileSync(path.join(root, file), 'utf8')

const server = read('server.js')
const publicSite = read('public-site.js')
const audience = read('audience-sites.js')
const platform = read('platform-operator.js')
const css = read('orimia-public-v637.css')
const { renderAudiencePage } = runtimeRequire('./audience-sites.js')

assert.match(server, /createBusinessInquiryService/)
assert.match(server, /businessInquiriesV637\.handlePublic/)
assert.match(server, /X-Lien-Business-Inquiries', 'v637'/)
assert.match(publicSite, /orimia-public-v637\.css/)
assert.match(publicSite, /inquiryStatus: url\.searchParams\.get\('inquiry'\)/)
assert.match(publicSite, /includes\('inquiry='\) \? 'private, no-store'/)
assert.match(platform, /href="\/platform\/inquiries">導入相談/)
assert.match(platform, /businessInquiries\.listInquiries/)
assert.match(platform, /businessInquiries\.updateInquiry/)
assert.match(css, /\.business-inquiry-form/)
assert.match(css, /\.inquiry-fields/)

const salon = renderAudiencePage('/business/salon')
assert.match(salon, /href="#contact">導入について相談する/)
assert.match(salon, /id="contact"/)
assert.match(salon, /action="\/api\/public\/business-inquiries"/)
assert.match(salon, /support@salon-de-lien\.com/)
assert.match(salon, /070-9444-6007/)
assert.match(salon, /name="audience" value="salon"/)
assert.doesNotMatch(salon, /mailto:support@salon-de-lien\.com\?subject=/)
assert.match(renderAudiencePage('/business/dealer'), /name="audience" value="dealer"/)
assert.match(renderAudiencePage('/business'), /美容室として相談/)
assert.match(renderAudiencePage('/business/salon', { inquiryStatus: 'sent' }), /お問い合わせを受け付けました/)
assert.doesNotMatch(renderAudiencePage('/'), /business-inquiry-form/)

const helper = require('./business-inquiries-v637.js')
assert.equal(typeof helper.createBusinessInquiryService, 'function')
assert.equal(typeof helper.renderPlatformInbox, 'function')

console.log(JSON.stringify({ release: 'business-inquiries-v637', runtimeVerified: true, ctaAnchor: true, publicForm: true, platformInbox: true, immutableCss: true }))
