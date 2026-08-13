'use strict'

const fs = require('fs')
const path = require('path')

const appDir = process.env.APP_DIR || '/app'
const chunkPath = path.join(appDir, '.next', 'server', 'chunks', '9845.js')
let source = fs.readFileSync(chunkPath, 'utf8')

const original = `n = process.env.GMAIL_OAUTH_REFRESH_TOKEN?.trim(),
          a = process.env.GMAIL_RESERVATION_EMAIL?.trim();`
const separated = `n = (
            process.env.GMAIL_SEND_OAUTH_REFRESH_TOKEN ||
            process.env.GMAIL_OAUTH_REFRESH_TOKEN
          )?.trim(),
          a = (
            process.env.GMAIL_SEND_EMAIL ||
            process.env.GMAIL_RESERVATION_EMAIL
          )?.trim();`

if (!source.includes(separated)) {
  if (!source.includes(original)) {
    throw new Error('Gmail sender credential anchor was not found')
  }
  source = source.replace(original, separated)
}

fs.writeFileSync(chunkPath, source)
console.log('Outbound Gmail credentials were separated from reservation-import credentials.')
