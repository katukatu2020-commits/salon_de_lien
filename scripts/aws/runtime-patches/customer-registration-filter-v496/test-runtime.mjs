import assert from 'node:assert/strict'
import fs from 'node:fs'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const chunkDirectory = `${root}/.next/server/chunks`
const source = fs.readdirSync(chunkDirectory)
  .filter(name => name.endsWith('.js'))
  .map(name => fs.readFileSync(`${chunkDirectory}/${name}`, 'utf8'))
  .find(value => value.includes('customer-registration-filter-v496'))

assert.ok(source)

const customers = [
  { id: 'direct', appRegistered: true },
  { id: 'linked', appRegistered: true },
  { id: 'booking-only', appRegistered: false },
]
const filter = (value) => value === 'registered'
  ? customers.filter(customer => customer.appRegistered)
  : value === 'provisional'
    ? customers.filter(customer => !customer.appRegistered)
    : customers

assert.deepEqual(filter('registered').map(customer => customer.id), ['direct', 'linked'])
assert.deepEqual(filter('provisional').map(customer => customer.id), ['booking-only'])
assert.equal(filter('unexpected').length, 3)

assert.equal((source.match(/"アプリ登録済み"/g) || []).length >= 2, true)
assert.equal((source.match(/"仮カルテ"/g) || []).length >= 2, true)
assert.equal((source.match(/0===customerListRowsV496\.length/g) || []).length, 3)
assert.equal((source.match(/0===q\.length/g) || []).length, 0)
assert.match(source, /customerRegistrationHrefV496/)
assert.match(source, /customerAccountByIdV496/)

console.log('customer registration filter runtime tests passed')
