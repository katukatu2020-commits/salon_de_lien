'use strict'

const fs = require('fs')
const path = require('path')

const template = fs.readFileSync(path.join(__dirname, 'line-booking-page-v527.html'), 'utf8')

function replaceToken(source, token, value) {
  const count = source.split(token).length - 1
  if (count < 1) throw new Error(`LINE booking template token is missing: ${token}`)
  return source.replaceAll(token, () => String(value))
}

function createLineReservationPageV527({ connection, crypto, escapeHtml }) {
  if (!connection || !connection.liffId) throw new Error('LINE booking connection is missing')
  const nonce = crypto.randomBytes(18).toString('base64url')
  const storeCode = connection.publicCode || connection.slug
  let html = template
  html = replaceToken(html, '{{NONCE}}', nonce)
  html = replaceToken(html, '{{STORE_CODE_JSON}}', JSON.stringify(storeCode))
  html = replaceToken(html, '{{LIFF_ID_JSON}}', JSON.stringify(connection.liffId))
  html = replaceToken(html, '{{STORE_NAME}}', escapeHtml(connection.organizationName || 'サロン'))
  return { html, nonce }
}

module.exports = { createLineReservationPageV527 }
