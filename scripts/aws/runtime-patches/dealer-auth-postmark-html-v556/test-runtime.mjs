import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { AUTH_TOKEN_MINUTES, RELEASE, dealerAuthMailHtml } = require('./dealer-auth-mail-content-v556.js')

assert.equal(RELEASE, 'dealer-auth-postmark-html-v556')
assert.equal(AUTH_TOKEN_MINUTES, 30)

const html = dealerAuthMailHtml({
  preheader: '初期設定を完了してください。',
  title: 'ディーラーアカウントを設定してください',
  lead: '会社情報とログイン情報を設定してください。',
  loginId: 'dealer<script>',
  actionLabel: '初期設定を開く',
  actionUrl: 'https://salon-de-lien.com/dealer/register/token?a=1&b=2',
  origin: 'https://salon-de-lien.com',
})

assert.match(html, /^<!doctype html>/)
assert.match(html, /ORIMIA PARTNER NETWORK/)
assert.match(html, /dealer&lt;script&gt;/)
assert.doesNotMatch(html, /dealer<script>/)
assert.match(html, /a=1&amp;b=2/)
assert.match(html, /送信から30分間/)
assert.match(html, /\/brand\/orimia-icon-192\.png/)

const existingAccountHtml = dealerAuthMailHtml({
  preheader: '登録済みです。',
  title: 'アカウントは設定済みです',
  lead: 'ログインしてください。',
  actionLabel: 'ログインを開く',
  actionUrl: 'https://salon-de-lien.com/dealer/login',
  origin: 'https://salon-de-lien.com',
  oneTime: false,
})
assert.match(existingAccountHtml, /何もせず削除してください/)
assert.doesNotMatch(existingAccountHtml, /送信から30分間/)

console.log(JSON.stringify({ release: RELEASE, commercialHtmlRestored: true, escapingVerified: true }))
