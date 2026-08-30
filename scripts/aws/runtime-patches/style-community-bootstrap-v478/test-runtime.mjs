import assert from 'node:assert/strict'
import fs from 'node:fs'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const sources = fs.readdirSync(`${root}/.next/server/chunks`)
  .filter(name => name.endsWith('.js'))
  .map(name => fs.readFileSync(`${root}/.next/server/chunks/${name}`, 'utf8'))
const shell = sources.find(source => source.includes('"data-lien-community-bootstrap": "v478"'))

assert.ok(shell)
assert.equal((shell.match(/"data-lien-community-bootstrap": "v478"/g) || []).length, 1)
assert.equal((shell.match(/src: "\/content-edit-delete-client-v477\.js"/g) || []).length, 1)
assert.match(shell, /children: \[\s+[A-Za-z_$][\w$]*\.jsx\("script", \{ src: "\/content-edit-delete-client-v477\.js"/)
assert.ok(!shell.includes('content-edit-delete-client-v470.js'))

console.log('style community bootstrap runtime tests passed')
