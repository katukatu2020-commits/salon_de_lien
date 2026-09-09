const assert = require('node:assert/strict')
const { createRequire } = require('node:module')
const runtimeRequire = createRequire('/app/package.json')
const { NextRequest } = runtimeRequire('next/server')
const admin = runtimeRequire('./.next/server/app/api/auth/logout/route.js').routeModule.userland
const customer = runtimeRequire('./.next/server/app/api/customer-auth/logout/route.js').routeModule.userland
const { createWholesaleOrderingService } = runtimeRequire('./wholesale-ordering-v543.js')

async function main() {
  let cases = 0
  for (const origin of ['http://localhost:3599', 'https://salon-de-lien.com']) {
    for (const [handler, route, cookie, destination] of [
      [admin, '/api/auth/logout', 'lien_admin_session', '/business'],
      [customer, '/api/customer-auth/logout', 'lien_customer_session', '/'],
    ]) {
      const url = origin + route + '?next=https://example.org/'
      const response = await handler.POST(new NextRequest(url, { method: 'POST', headers: { origin, host: new URL(origin).host, cookie: cookie + '=expired-fixture' } }))
      assert.equal(response.status, 303)
      assert.equal(response.headers.get('location'), origin + destination)
      assert.match(response.headers.get('cache-control'), /no-store/)
      const cleared = response.headers.get('set-cookie')
      assert.match(cleared, new RegExp('^' + cookie + '=;'))
      assert.match(cleared, /Max-Age=0/)
      assert.match(cleared, /HttpOnly/)
      assert.match(cleared, /SameSite=lax/i)
      assert.equal(/Secure/i.test(cleared), origin.startsWith('https:'))
      const rejected = await handler.POST(new NextRequest(url, { method: 'POST', headers: { host: new URL(origin).host, origin: 'https://example.org' } }))
      assert.equal(rejected.status, 403)
      assert.equal(rejected.headers.get('set-cookie'), null)
      cases += 2
    }
  }

  // Use a database stub: the existing dealer service initializes its schema before routing.
  const service = createWholesaleOrderingService({
    prisma: { $executeRawUnsafe: async () => 0, $queryRawUnsafe: async () => [] },
    crypto: require('node:crypto'), adminSessionProvider: async () => null,
  })
  for (const headers of [
    { host: 'salon-de-lien.com', origin: 'https://salon-de-lien.com', 'x-forwarded-proto': 'https' },
    { host: 'salon-de-lien.com', 'sec-fetch-site': 'same-origin', 'x-forwarded-proto': 'https' },
    { host: 'salon-de-lien.com', origin: 'https://example.org' },
  ]) {
    const response = { headers: {}, setHeader(key, value) { this.headers[key.toLowerCase()] = value }, end() {} }
    assert.equal(await service.handle({ method: 'POST', headers }, response, new URL('https://salon-de-lien.com/api/dealer/auth/logout?next=/')), true)
    if (headers.origin === 'https://example.org') {
      assert.equal(response.statusCode, 403)
      assert.equal(response.headers['set-cookie'], undefined)
    } else {
      assert.equal(response.statusCode, 303)
      assert.equal(response.headers.location, '/business')
      assert.match(response.headers['cache-control'], /no-store/)
      assert.match(response.headers['set-cookie'], /^orimia_dealer_session=;.*Max-Age=0; Secure$/)
    }
    cases += 1
  }
  console.log(JSON.stringify({ cases, passed: true }))
}
main().catch(error => { console.error(error); process.exitCode = 1 })
