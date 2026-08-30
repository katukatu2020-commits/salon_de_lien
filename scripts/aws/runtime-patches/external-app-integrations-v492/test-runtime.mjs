import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'

const clientPath = process.env.LIEN_EXTERNAL_INTEGRATIONS_CLIENT || '/tmp/lien-v492/external-integrations-client-v492.js'
const source = fs.readFileSync(clientPath, 'utf8')
const listeners = []
const observed = []
const context = {
  location: { pathname: '/outside-test', search: '', hash: '' },
  window: {
    addEventListener: (...args) => listeners.push(args),
    requestAnimationFrame: callback => { callback(); return 1 },
    setTimeout: () => 1,
  },
  document: {
    readyState: 'loading',
    documentElement: {},
    addEventListener: (...args) => listeners.push(args),
  },
  MutationObserver: class {
    constructor(callback) { this.callback = callback }
    observe(target, options) { observed.push({ target, options }) }
  },
}
vm.runInNewContext(source, context, { filename: clientPath })

assert.equal(context.window.__lienExternalAppIntegrationsV492, true)
const loadListener = listeners.find(([name]) => name === 'load')
assert.ok(loadListener)
assert.equal(observed.length, 0)
loadListener[1]()
assert.ok(listeners.some(([name]) => name === 'hashchange'))
assert.ok(listeners.some(([name]) => name === 'popstate'))
assert.equal(observed.length, 1)
assert.equal(observed[0].options.childList, true)
assert.equal(observed[0].options.attributes, true)
assert.match(source, /sourceInbound\.hidden = true/)
assert.match(source, /lineSlot\.replaceChildren\(lineCard\)/)

console.log('external-app-integrations-v492 client bootstrap tested')
