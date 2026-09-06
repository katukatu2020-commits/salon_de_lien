import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const {
  DEALER_AUTH_FROM_EMAIL,
  POSTMARK_ENDPOINT,
  RELEASE,
  sendDealerAuthPostmark,
} = require('./dealer-auth-postmark-v555.js')

assert.equal(RELEASE, 'dealer-auth-postmark-v555')
assert.equal(DEALER_AUTH_FROM_EMAIL, 'support@salon-de-lien.com')
assert.equal(POSTMARK_ENDPOINT, 'https://api.postmarkapp.com/email')

const calls = []
const messageId = await sendDealerAuthPostmark({
  to: 'dealer@example.com',
  subject: '【ORIMIA】ディーラーアカウントの新規設定',
  textBody: '初期設定URLを開いてください。',
  htmlBody: '<p>初期設定URLを開いてください。</p>',
}, {
  environment: {
    POSTMARK_SERVER_TOKEN: 'test-postmark-token',
    POSTMARK_FROM_EMAIL: 'legacy-sender@gmail.com',
    POSTMARK_FROM_NAME: 'ORIMIA',
    POSTMARK_REPLY_TO: 'support@salon-de-lien.com',
    POSTMARK_TRANSACTIONAL_STREAM: 'outbound',
  },
  fetchImpl: async (url, options) => {
    calls.push({ url, options })
    return {
      ok: true,
      status: 200,
      json: async () => ({ ErrorCode: 0, MessageID: 'postmark-message-v555' }),
    }
  },
})

assert.equal(messageId, 'postmark-message-v555')
assert.equal(calls.length, 1)
assert.equal(calls[0].url, POSTMARK_ENDPOINT)
assert.equal(calls[0].options.method, 'POST')
assert.equal(calls[0].options.headers['X-Postmark-Server-Token'], 'test-postmark-token')
const payload = JSON.parse(calls[0].options.body)
assert.equal(payload.From, 'ORIMIA <support@salon-de-lien.com>')
assert.equal(payload.To, 'dealer@example.com')
assert.equal(payload.ReplyTo, 'support@salon-de-lien.com')
assert.equal(payload.MessageStream, 'outbound')
assert.equal(payload.Tag, 'dealer-auth')
assert.doesNotMatch(JSON.stringify(payload), /gmail\.com/i)

await assert.rejects(
  sendDealerAuthPostmark({ to: 'dealer@example.com', subject: 'subject', textBody: 'text', htmlBody: '<p>html</p>' }, {
    environment: {},
    fetchImpl: async () => { throw new Error('must not be called') },
  }),
  /Postmark is not configured/,
)

await assert.rejects(
  sendDealerAuthPostmark({ to: 'dealer@example.com', subject: 'subject', textBody: 'text', htmlBody: '<p>html</p>' }, {
    environment: { POSTMARK_SERVER_TOKEN: 'test-postmark-token' },
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      json: async () => ({ ErrorCode: 300, Message: 'Invalid email request' }),
    }),
  }),
  /Postmark rejected the message \(200\): Invalid email request/,
)

await assert.rejects(
  sendDealerAuthPostmark({ to: 'dealer@example.com', subject: 'subject', textBody: 'text', htmlBody: '<p>html</p>' }, {
    environment: { POSTMARK_SERVER_TOKEN: 'test-postmark-token' },
    fetchImpl: async () => ({
      ok: false,
      status: 503,
      json: async () => { throw new Error('non-JSON response') },
    }),
  }),
  /Postmark rejected the message \(503\): unknown error/,
)

console.log(JSON.stringify({
  release: RELEASE,
  provider: 'postmark',
  from: DEALER_AUTH_FROM_EMAIL,
  gmailSenderIgnored: true,
  failureHandlingVerified: true,
}))
