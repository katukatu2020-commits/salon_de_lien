'use strict'

const fs = require('fs')
const path = require('path')

const appDir = process.env.APP_DIR || '/app'
const chunkPath = path.join(appDir, '.next', 'server', 'chunks', '9845.js')
const source = fs.readFileSync(chunkPath, 'utf8')

for (const marker of [
  'process.env.GMAIL_SEND_OAUTH_REFRESH_TOKEN',
  'process.env.GMAIL_SEND_EMAIL',
  'process.env.GMAIL_OAUTH_REFRESH_TOKEN',
  'process.env.GMAIL_RESERVATION_EMAIL',
  'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
]) {
  if (!source.includes(marker)) throw new Error(`Missing mail sender marker: ${marker}`)
}

console.log('Mail sender credential separation verified.')
