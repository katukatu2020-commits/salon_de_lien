import assert from 'node:assert/strict'
import {
  BROWSER_LOCAL_VALUE_SOURCE,
  CAN_ACCESS_THREAD_SOURCE,
  JAPAN_DATE_PARSER_SOURCE,
  LOCAL_DATETIME_VALUE_SOURCE,
} from './runtime-transform.mjs'

function compile(source, name) {
  return Function(`"use strict"; return (${source});`)()
}

const canAccessThread = compile(CAN_ACCESS_THREAD_SOURCE, 'canAccessThread')
assert.equal(canAccessThread({ role: 'ADMIN' }, { staffName: '担当外' }), true)
assert.equal(canAccessThread({ role: 'STAFF', isSharedStoreAccount: true, displayName: '店舗共通' }, { staffName: '谷崎 太二' }), true)
assert.equal(canAccessThread({ role: 'STAFF', isSharedStoreAccount: false, displayName: '谷崎 太二' }, { staffName: '谷崎太二' }), true)
assert.equal(canAccessThread({ role: 'STAFF', isSharedStoreAccount: false, displayName: '別の担当者' }, { staffName: '谷崎 太二' }), false)

const parseJapanDateTime = compile(JAPAN_DATE_PARSER_SOURCE, 'parseJapanDateTime')
const localDateTimeValue = compile(LOCAL_DATETIME_VALUE_SOURCE, 'localDateTimeValue')
const browserLocalValue = compile(BROWSER_LOCAL_VALUE_SOURCE, 'localValue')

const stored = parseJapanDateTime('2026-09-25T11:40')
assert.equal(stored.toISOString(), '2026-09-25T02:40:00.000Z')
assert.equal(localDateTimeValue(stored), '2026-09-25T11:40')
assert.equal(browserLocalValue(stored.toISOString()), '2026-09-25T11:40')
assert.equal(parseJapanDateTime('2026-09-25T02:40:00.000Z').toISOString(), '2026-09-25T02:40:00.000Z')
assert.equal(Number.isNaN(parseJapanDateTime('2026-02-30T11:40').getTime()), true)
assert.equal(Number.isNaN(parseJapanDateTime('not-a-date').getTime()), true)

console.log(JSON.stringify({ release: 'chat-campaign-time-v664', testsPassed: true }))
