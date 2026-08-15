'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const { updateHelperUrls } = require('./patch-runtime-cache-v135')

test('v135 keeps the deployed commercial helper and refreshes only the tenant helper', () => {
  const source = 'x=/commercial-admin-v130.js?v=20260815-130;y=/tenant-setup-client.js?v=20260815-130;/* admin-header-settings-v130 */'
  const output = updateHelperUrls(source)
  assert.match(output, /commercial-admin-v130\.js\?v=20260815-130/)
  assert.match(output, /tenant-setup-client\.js\?v=20260815-135/)
  assert.doesNotMatch(output, /commercial-admin-v135/)
})

test('sidebar toggle retains collision-proof commercial styling', () => {
  const source = fs.readFileSync('tenant-setup-client.js', 'utf8')
  assert.match(source, /button\.style\.setProperty\(property, value, 'important'\)/)
  assert.match(source, /button\.innerHTML = icon\(expectedIcon, 'ts-sidebar-chevron'\)/)
})

