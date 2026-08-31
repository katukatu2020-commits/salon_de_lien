const baseUrl = process.env.BASE_URL || 'https://salon-de-lien.com'

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

async function textResponse(pathname, options = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, options)
  const body = await response.text()
  return { response, body }
}

const ready = await fetch(`${baseUrl}/api/health/ready?smoke=v506`, { cache: 'no-store' })
assert(ready.ok, `production readiness returned ${ready.status}`)
assert(ready.headers.get('x-lien-customer-experience') === 'v506', 'production v506 readiness header is missing')
assert(ready.headers.get('x-lien-store-platform') === 'v503', 'production v503 parent header is missing')

const login = await textResponse('/u/login?smoke=v506', {
  headers: { Accept: 'text/html', 'Cache-Control': 'no-cache' },
  redirect: 'manual',
})
assert(login.response.status === 200, `production login returned ${login.response.status}`)
assert(login.body.includes('/customer-experience-v506.css?v=506'), 'production login stylesheet loader is missing')
assert(login.body.includes('/customer-experience-v506.js?v=506'), 'production login client loader is missing')
assert(!login.body.includes('<link id="customer-experience-style-v506"'), 'production stylesheet node was injected before hydration')
assert(!login.body.includes('<script id="customer-experience-script-v506"'), 'production script node was injected before hydration')

const client = await textResponse('/customer-experience-v506.js?v=506')
assert(client.response.ok, `production client returned ${client.response.status}`)
assert(client.body.includes('cx-menu-picker-v506'), 'production menu picker is missing')
assert(client.body.includes('cx-slot-confirmed-v506'), 'production booking check is missing')
assert(client.body.includes("window.addEventListener('load', start"), 'production post-load startup is missing')
assert(client.body.includes("'requestIdleCallback' in window"), 'production idle hydration guard is missing')
assert(client.body.includes('HTMLFormElement.prototype.submit.call(form)'), 'production profile fix is missing')

const stylesheet = await textResponse('/customer-experience-v506.css?v=506')
assert(stylesheet.response.ok, `production stylesheet returned ${stylesheet.response.status}`)
assert(stylesheet.body.includes('.cx-login-main-v506'), 'production login styles are missing')
assert(stylesheet.body.includes('.cx-menu-dialog-v506'), 'production menu styles are missing')

console.log('[customer-experience-v506] production smoke passed')
