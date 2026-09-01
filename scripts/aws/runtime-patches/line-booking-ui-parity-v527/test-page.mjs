import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import crypto from 'node:crypto'

const require = createRequire(import.meta.url)
const { createLineReservationPageV527 } = require('./line-booking-page-v527.js')

const page = createLineReservationPageV527({
  connection: {
    publicCode: 'LIEN-TEST',
    slug: 'test-store',
    liffId: '1234567890-AbCdEf',
    organizationName: 'テスト & サロン',
  },
  crypto,
  escapeHtml: value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]),
})

assert.match(page.nonce, /^[A-Za-z0-9_-]+$/)
assert.match(page.html, /data-line-booking-ui-parity="v527"/)
assert.match(page.html, /const STORE = "LIEN-TEST"/)
assert.match(page.html, /const LIFF_ID = "1234567890-AbCdEf"/)
assert.match(page.html, /テスト &amp; サロン/)
assert.match(page.html, new RegExp(`nonce="${page.nonce}"`))
assert.doesNotMatch(page.html, /\{\{(?:NONCE|STORE_CODE_JSON|LIFF_ID_JSON|STORE_NAME)\}\}/)
assert.match(page.html, /選択中のメニュー/)
assert.match(page.html, /予約を受け付けました/)
assert.match(page.html, /LINEへ戻る/)

console.log(JSON.stringify({ release: 'line-booking-ui-parity-v527', pageVerified: true }))
