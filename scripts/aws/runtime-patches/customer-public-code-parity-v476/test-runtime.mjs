import assert from 'node:assert/strict'
import fs from 'node:fs'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const chunkDirectory = `${root}/.next/server/chunks`
const sources = fs.readdirSync(chunkDirectory)
  .filter(name => name.endsWith('.js'))
  .map(name => fs.readFileSync(`${chunkDirectory}/${name}`, 'utf8'))

const list = sources.find(source => source.includes('customer-public-code-parity-v476-list'))
const detail = sources.find(source => source.includes('customer-public-code-parity-v476-detail'))
assert.ok(list)
assert.ok(detail)

const bulkQueryStart = list.indexOf('SELECT c."id",COALESCE(')
const bulkQueryEnd = list.indexOf("',", bulkQueryStart)
const bulkQuery = list.slice(bulkQueryStart, bulkQueryEnd)
assert.match(bulkQuery, /directUser\."role"=\\'CUSTOMER\\'/)
assert.match(bulkQuery, /directUser\."active"=TRUE/)
assert.match(bulkQuery, /linkedUser\."role"=\\'CUSTOMER\\'/)
assert.match(bulkQuery, /linkedUser\."active"=TRUE/)
assert.ok(!bulkQuery.includes('UPDATE '))
assert.ok(!bulkQuery.includes('INSERT '))
assert.ok(!bulkQuery.includes('DELETE '))

assert.equal((list.match(/children:R\(e\.customer\.id\)/g) || []).length, 0)
assert.equal((detail.match(/children: et\(el\.id\)/g) || []).length, 0)
assert.ok(list.includes('??R(e.customer.id)'), 'unregistered list customers retain a stable fallback')
assert.ok(detail.includes('?? et(el.id)'), 'unregistered detail customers retain a stable fallback')

console.log('customer public code runtime tests passed')
