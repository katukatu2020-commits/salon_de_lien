'use strict'

const CHAT_PATHS = new Set([
  '/admin/customers/messages',
  '/admin/customers/messages/chat',
])
const MAX_ID_LENGTH = 200

function cleanId(value) {
  const result = String(value || '').trim()
  return result.length <= MAX_ID_LENGTH ? result : ''
}

function firstHeader(value) {
  return String(Array.isArray(value) ? value[0] || '' : value || '')
    .split(',')[0]
    .trim()
}

function trustedChatReferrer(req) {
  const raw = firstHeader(req?.headers?.referer)
  if (!raw) return null
  try {
    const referrer = new URL(raw)
    const expectedHost = firstHeader(req?.headers?.['x-forwarded-host']) || firstHeader(req?.headers?.host)
    if (expectedHost && referrer.host.toLowerCase() !== expectedHost.toLowerCase()) return null
    return CHAT_PATHS.has(referrer.pathname) ? referrer : null
  } catch {
    return null
  }
}

function recoverContext(req, form) {
  const submittedThreadId = cleanId(form?.get?.('threadId'))
  const submittedCustomerId = cleanId(form?.get?.('customerId'))
  const referrer = trustedChatReferrer(req)
  const referrerThreadId = cleanId(referrer?.searchParams.get('threadId'))
  const referrerCustomerId = cleanId(referrer?.searchParams.get('customerId'))
  return {
    threadId: submittedThreadId || referrerThreadId,
    customerId: submittedCustomerId || referrerCustomerId,
    recoveredThreadId: !submittedThreadId && Boolean(referrerThreadId),
    recoveredCustomerId: !submittedCustomerId && Boolean(referrerCustomerId),
  }
}

module.exports = {
  CHAT_PATHS,
  MAX_ID_LENGTH,
  cleanId,
  trustedChatReferrer,
  recoverContext,
}
