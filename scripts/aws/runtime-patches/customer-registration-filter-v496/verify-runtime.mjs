import fs from 'node:fs'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const chunkDirectory = `${root}/.next/server/chunks`
const server = fs.readFileSync(`${root}/server.js`, 'utf8')
const source = fs.readdirSync(chunkDirectory)
  .filter(name => name.endsWith('.js'))
  .map(name => fs.readFileSync(`${chunkDirectory}/${name}`, 'utf8'))
  .find(value => value.includes('customer-registration-filter-v496'))

if (!source) throw new Error('customer registration filter chunk is missing')
new Function(source)

const assertions = [
  [source.includes('(directUser."id" IS NOT NULL OR linkedUser."id" IS NOT NULL) AS "appRegistered"'), 'query resolves direct and linked registrations'],
  [source.includes("directUser.\"role\"=\\'CUSTOMER\\' AND directUser.\"active\"=TRUE"), 'direct account must be an active customer'],
  [source.includes("linkedUser.\"role\"=\\'CUSTOMER\\' AND linkedUser.\"active\"=TRUE"), 'linked account must be an active customer'],
  [source.includes('appRegistered:!!customerAccountByIdV496.get(e.id)?.appRegistered'), 'registration state is attached to each customer'],
  [source.includes('customerRegistrationFilterV496=["registered","provisional"].includes'), 'filter input is allow-listed'],
  [source.includes('customerListRowsV496="registered"===customerRegistrationFilterV496'), 'registered and provisional rows are split'],
  [source.includes('Math.ceil(customerListRowsV496.length/50)'), 'pagination uses filtered rows'],
  [source.includes('customerListRowsV496.slice(sl,sl+50)'), 'visible rows use filtered rows'],
  [source.includes('t.set("registration",customerRegistrationFilterV496)'), 'pagination retains the filter'],
  [source.includes('name:"registration",value:customerRegistrationFilterV496'), 'search retains the filter'],
  [(source.match(/data-customer-registration-filter/g) || []).length === 1, 'filter control metadata exists'],
  [(source.match(/data-customer-registration/g) || []).length === 3, 'filter and both row layouts expose registration metadata'],
  [source.includes('aria-label":"顧客登録状態で絞り込み"'), 'filter has an accessible label'],
  [source.includes('children:e.customer.appRegistered?"アプリ登録済み":"仮カルテ"'), 'rows display registration state'],
  [source.includes('該当する顧客がいません。絞り込み条件を変更してください。'), 'filtered empty state is clear'],
  [source.includes('customer-public-code-parity-v476-list'), 'public customer code behavior remains'],
  [server.includes("X-Lien-Customer-Registration-Filter', 'v496'"), 'readiness marker exists'],
]

for (const [condition, message] of assertions) {
  if (!condition) throw new Error(message)
}

const sqlStart = source.indexOf('SELECT c."id",COALESCE(')
const sqlEnd = source.indexOf("',", sqlStart)
const sql = source.slice(sqlStart, sqlEnd)
if (sqlStart < 0 || sqlEnd < 0) throw new Error('registration query was not found')
for (const mutation of ['UPDATE ', 'INSERT ', 'DELETE ', 'DROP ', 'ALTER ']) {
  if (sql.includes(mutation)) throw new Error(`registration query contains ${mutation.trim()}`)
}

console.log(`customer registration filter runtime verified (${assertions.length} assertions)`)
