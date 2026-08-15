'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const { updateHelperUrls, addThemeBootstrap, themeBootstrap } = require('./patch-runtime-cache-v136')

test('v153 cache-busts both admin UI helpers', () => {
  const source = "x=/commercial-admin-v130.js?v=20260815-130;y=/tenant-setup-client.js?v=20260815-135;const schedule=()=>window.setTimeout(loadAdminRuntime,1800)\n  if(document.readyState==='complete')schedule()\n  else window.addEventListener('load',schedule,{once:true});/* commercial-sidebar-v135 */"
  const output = updateHelperUrls(source)
  assert.match(output, /commercial-admin-v136\.js\?v=20260815-153/)
  assert.match(output, /tenant-setup-client\.js\?v=20260815-153/)
  assert.doesNotMatch(output, /commercial-admin-v130\.js/)
  assert.doesNotMatch(output, /tenant-setup-client\.js\?v=20260815-135/)
  assert.match(output, /requestAnimationFrame\(loadAdminRuntime\)/)
  assert.match(output, /DOMContentLoaded',schedule/)
  assert.doesNotMatch(output, /setTimeout\(loadAdminRuntime,1800\)/)
})

test('v153 applies the saved admin theme before the runtime helpers load', () => {
  const output = addThemeBootstrap('console.log("layout")')
  assert.ok(output.startsWith(themeBootstrap))
  assert.match(output, /salon-lien:admin-theme/)
  assert.equal(addThemeBootstrap(output), output)
})
