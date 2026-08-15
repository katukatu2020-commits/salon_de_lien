'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const { updateHelperUrls } = require('./patch-runtime-cache-v130')

test('v130 refreshes both helpers from the stable v129 shell', () => {
  const output = updateHelperUrls('a=/commercial-admin-v129.js?v=20260815-129;b=/tenant-setup-client.js?v=20260815-129;admin-header-settings-v129')
  assert.match(output, /commercial-admin-v130\.js\?v=20260815-130/)
  assert.match(output, /tenant-setup-client\.js\?v=20260815-130/)
})

test('commercial helper starts at DOM readiness without a visible post-load delay', () => {
  const helper = fs.readFileSync(require.resolve('./commercial-admin-v101'), 'utf8')
  assert.match(helper, /window\.addEventListener\('DOMContentLoaded', start/)
  assert.doesNotMatch(helper, /window\.setTimeout\(boot, 250\)/)
  assert.doesNotMatch(helper, /window\.addEventListener\('load', start/)
})
