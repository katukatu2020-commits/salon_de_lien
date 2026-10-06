import assert from 'node:assert/strict'
import fs from 'node:fs'
const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const list = fs.readFileSync(root + '/.next/server/chunks/3491.js', 'utf8')
assert.match(list, /loadCustomerKanaRows\(w\._,t\.organizationId\)/)
assert.match(list, /OR:\[\{id:\{in:kanaHelperV707.matchingCustomerKanaIds/)
assert.equal(list.split('data-customer-name-v707').length - 1, 2)
assert.match(list, /顧客名・フリガナ・電話・メモで検索/)
assert.match(list, /customerRegistrationFilterV496/)
assert.match(list, /customerListRowsV496.slice\(sl,sl\+50\)/)
assert.match(list, /deletedAt:null,storeHiddenAt:null,organizationId:t.organizationId/)
assert.match(fs.readFileSync(root + '/server.js', 'utf8'), /X-Lien-Customer-Kana-Search/)
console.log('v707 runtime verification PASS')
