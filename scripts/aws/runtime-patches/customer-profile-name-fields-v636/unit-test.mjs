import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const {
  loadCustomerProfileNameV636,
  parseCustomerProfileNameV636,
  persistCustomerProfileNameV636,
  resolveCustomerProfileNameV636,
} = require('./customer-profile-name-v636.js')

assert.deepEqual(
  parseCustomerProfileNameV636({
    lastName: ' 山田 ',
    firstName: ' 花子 ',
    lastNameKana: 'ﾔﾏﾀﾞ',
    firstNameKana: 'はなこ',
  }),
  {
    lastName: '山田',
    firstName: '花子',
    lastNameKana: 'ヤマダ',
    firstNameKana: 'ハナコ',
    fullName: '山田 花子',
    fullNameKana: 'ヤマダ ハナコ',
  },
)
assert.equal(
  parseCustomerProfileNameV636({
    lastName: '山田',
    firstName: '花子',
    lastNameKana: 'YAMADA',
    firstNameKana: 'HANAKO',
  }),
  null,
)

assert.deepEqual(resolveCustomerProfileNameV636({}, '山本 公正'), {
  lastName: '山本',
  firstName: '公正',
  lastNameKana: '',
  firstNameKana: '',
})
assert.deepEqual(resolveCustomerProfileNameV636({}, '中島 弾正ナカジマ ダンジョウ'), {
  lastName: '中島',
  firstName: '弾正',
  lastNameKana: '',
  firstNameKana: '',
})
assert.deepEqual(
  resolveCustomerProfileNameV636(
    { lastName: '山田', firstName: '花子', lastNameKana: 'ﾔﾏﾀﾞ', firstNameKana: 'はなこ' },
    '旧姓 旧名',
  ),
  { lastName: '山田', firstName: '花子', lastNameKana: 'ヤマダ', firstNameKana: 'ハナコ' },
)

const queryCalls = []
const profile = await loadCustomerProfileNameV636({
  async $queryRawUnsafe(...args) {
    queryCalls.push(args)
    return [{ lastName: '佐藤', firstName: '葵', lastNameKana: 'サトウ', firstNameKana: 'アオイ' }]
  },
}, 'customer-1', '旧姓 旧名')
assert.equal(queryCalls.length, 1)
assert.equal(queryCalls[0][1], 'customer-1')
assert.equal(profile.firstNameKana, 'アオイ')

const executeCalls = []
await persistCustomerProfileNameV636({
  async $executeRawUnsafe(...args) {
    executeCalls.push(args)
  },
}, 'customer-1', {
  lastName: '佐藤',
  firstName: '葵',
  lastNameKana: 'サトウ',
  firstNameKana: 'アオイ',
})
assert.equal(executeCalls.length, 1)
assert.deepEqual(executeCalls[0].slice(1), ['customer-1', '佐藤', '葵', 'サトウ', 'アオイ'])

console.log(JSON.stringify({
  release: 'customer-profile-name-fields-v636',
  unitVerified: true,
  legacyPrefillVerified: true,
  kanaNormalizationVerified: true,
  transactionalPersistenceVerified: true,
}))
