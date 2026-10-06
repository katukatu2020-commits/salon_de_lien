'use strict'
const { test } = require('node:test'), assert = require('node:assert/strict')
const h = require('./customer-kana.cjs')
const rows = [{id:'hana',lastNameKana:'ヤマモト',firstNameKana:'ハナ'}, {id:'other',lastNameKana:'ヤマダ',firstNameKana:'タロウ'}, {id:'empty'}]
test('full, partial, halfwidth and hiragana kana search joins saved name parts', () => {
  for (const keyword of ['ヤマモトハナ','ヤマモト ハナ',' やまもと　はな ','ﾔﾏﾓﾄﾊﾅ','モトハ','ハナ']) assert.deepEqual(h.matchingCustomerKanaIds(rows, keyword), ['hana'])
  assert.deepEqual(h.matchingCustomerKanaIds(rows, ''), [])
  assert.deepEqual(h.matchingCustomerKanaIds(rows, '　 '), [])
  assert.deepEqual(h.matchingCustomerKanaIds(rows, '%'), [])
  assert.deepEqual(h.matchingCustomerKanaIds(rows, "' OR 1=1 --"), [])
})
test('saved kana only, no guessed reading, no empty parentheses or name mutation', () => {
  assert.equal(h.formatCustomerNameWithKana('山本 はな',h.customerKana(rows[0])), '山本 はな（ヤマモトハナ）')
  assert.equal(h.formatCustomerNameWithKana('山本 はな',h.customerKana(rows[2])), '山本 はな')
  assert.equal(h.formatCustomerNameWithKana('山本 はな（ヤマモトハナ）','ヤマモトハナ'), '山本 はな（ヤマモトハナ）')
  assert.equal(h.customerKana({lastNameKana:null,firstNameKana:'　'}), '')
  assert.equal(h.customerKana({lastNameKana:'ｻﾄｳ',firstNameKana:' がく '}), 'サトウガク')
})
test('scoped read excludes withdrawn/hidden customers and fails closed without organization', async () => {
  const calls = [], db = {$queryRawUnsafe:async (...args) => { calls.push(args);return rows }}
  assert.deepEqual(await h.loadCustomerKanaRows(db,null), [])
  assert.equal(calls.length,0)
  assert.deepEqual(await h.loadCustomerKanaRows(db,'org-test'), rows)
  assert.deepEqual(calls[0], [h.CUSTOMER_KANA_QUERY,'org-test'])
  assert.match(calls[0][0], /"organizationId" = \$1 AND "deletedAt" IS NULL AND "storeHiddenAt" IS NULL/)
})
