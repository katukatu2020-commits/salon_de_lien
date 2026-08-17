'use strict'

const fs = require('fs')
const path = require('path')

const root = process.argv[2] ? path.resolve(process.argv[2]) : '/app'
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8')

const required = [
  'LOWER("loginId")=LOWER($2)',
  'LOWER("email")=LOWER($2)',
  'userId: value.userId || users[0].id',
  'organizationId"=$1 AND "active"=true',
]

for (const marker of required) {
  if (!server.includes(marker)) throw new Error(`Missing runtime marker: ${marker}`)
}

new Function(server)
console.log('Release 291 runtime verification passed.')
