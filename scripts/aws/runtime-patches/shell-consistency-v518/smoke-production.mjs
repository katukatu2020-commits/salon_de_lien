import assert from 'node:assert/strict'

const baseUrl = (process.env.BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')
const headers = {
  'Cache-Control': 'no-cache',
  'User-Agent': 'ORIMIA-shell-consistency-v518-smoke/1.0',
}

async function read(pathname) {
  const response = await fetch(`${baseUrl}${pathname}`, { headers, redirect: 'follow' })
  assert.equal(response.ok, true, `${pathname} returned ${response.status}`)
  return { response, body: await response.text() }
}

const health = await read('/api/health/ready')
assert.equal(health.response.headers.get('x-lien-shell-consistency'), 'v518')
assert.equal(health.response.headers.get('x-lien-route-scoped-settings'), 'v517')

const shell = await read('/shell-consistency-v518.js?v=518-release1')
assert.match(shell.body, /__orimiaShellConsistencyV518/)
assert.match(shell.body, /ORIMIA for Salon/)

const shellCss = await read('/shell-consistency-v518.css?v=518-release1')
assert.match(shellCss.body, /orimia-admin-bottom-nav-v518/)

for (const manifestPath of ['/powered-by-orimia.webmanifest', '/orimia-for-salon.webmanifest']) {
  const manifest = JSON.parse((await read(manifestPath)).body)
  assert.equal(manifest.name, 'ORIMIA for Salon')
}

console.log(JSON.stringify({ baseUrl, release: 'shell-consistency-v518', ready: true }))
