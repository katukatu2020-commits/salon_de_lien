'use strict'

const RELEASE = 'dealer-auth-postmark-v555'
const POSTMARK_ENDPOINT = 'https://api.postmarkapp.com/email'
const DEALER_AUTH_FROM_EMAIL = 'support@salon-de-lien.com'

function cleanHeader(value, fallback = '') {
  return String(value == null ? '' : value).replace(/[\r\n]+/g, ' ').trim() || fallback
}

async function sendDealerAuthPostmark(message, options = {}) {
  const environment = options.environment || process.env
  const fetchImpl = options.fetchImpl || globalThis.fetch
  const token = cleanHeader(environment.POSTMARK_SERVER_TOKEN)
  if (!token) throw new Error('Postmark is not configured')
  if (typeof fetchImpl !== 'function') throw new Error('Postmark transport is unavailable')

  const to = cleanHeader(message && message.to)
  const subject = cleanHeader(message && message.subject)
  const textBody = String(message && message.textBody || '')
  const htmlBody = String(message && message.htmlBody || '')
  if (!to || !subject || !textBody || !htmlBody) throw new Error('Postmark message is incomplete')

  const senderName = cleanHeader(environment.POSTMARK_FROM_NAME, 'ORIMIA')
  const replyTo = cleanHeader(environment.POSTMARK_REPLY_TO, DEALER_AUTH_FROM_EMAIL)
  const messageStream = cleanHeader(environment.POSTMARK_TRANSACTIONAL_STREAM, 'outbound')
  const response = await fetchImpl(POSTMARK_ENDPOINT, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Postmark-Server-Token': token,
    },
    body: JSON.stringify({
      From: `${senderName} <${DEALER_AUTH_FROM_EMAIL}>`,
      To: to,
      ReplyTo: replyTo,
      Subject: subject,
      TextBody: textBody,
      HtmlBody: htmlBody,
      MessageStream: messageStream,
      Tag: 'dealer-auth',
    }),
    cache: 'no-store',
  })

  const result = await response.json().catch(() => null)
  if (!response.ok || Number(result && result.ErrorCode || 0) !== 0) {
    const detail = cleanHeader(result && result.Message, 'unknown error')
    throw new Error(`Postmark rejected the message (${response.status}): ${detail}`)
  }
  return result && result.MessageID || null
}

module.exports = {
  DEALER_AUTH_FROM_EMAIL,
  POSTMARK_ENDPOINT,
  RELEASE,
  sendDealerAuthPostmark,
}
