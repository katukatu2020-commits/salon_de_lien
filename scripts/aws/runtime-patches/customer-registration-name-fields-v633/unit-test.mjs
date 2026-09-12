import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { parseCustomerRegistrationNameV633 } = require('./customer-registration-name-v633.js')

assert.deepEqual(
  parseCustomerRegistrationNameV633({
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

for (const invalid of [
  { lastName: '', firstName: '花子', lastNameKana: 'ヤマダ', firstNameKana: 'ハナコ' },
  { lastName: '山田', firstName: '', lastNameKana: 'ヤマダ', firstNameKana: 'ハナコ' },
  { lastName: '山田', firstName: '花子', lastNameKana: 'YAMADA', firstNameKana: 'HANAKO' },
]) {
  assert.equal(parseCustomerRegistrationNameV633(invalid), null)
}

console.log(JSON.stringify({ release: 'customer-registration-name-fields-v633', unitTests: true }))
