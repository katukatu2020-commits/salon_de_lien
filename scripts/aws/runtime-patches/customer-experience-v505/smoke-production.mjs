const baseUrl = process.env.BASE_URL || 'https://salon-de-lien.com'

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

async function textResponse(pathname, options = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, options)
  const body = await response.text()
  return { response, body }
}

const ready = await fetch(`${baseUrl}/api/health/ready?smoke=v505`, { cache: 'no-store' })
assert(ready.ok, `production readiness returned ${ready.status}`)
assert(ready.headers.get('x-lien-customer-experience') === 'v505', 'production v505 readiness header is missing')
assert(ready.headers.get('x-lien-store-platform') === 'v503', 'production v503 parent header is missing')

const login = await textResponse('/u/login?smoke=v505', {
  headers: { Accept: 'text/html', 'Cache-Control': 'no-cache' },
  redirect: 'manual',
})
assert(login.response.status === 200, `production login returned ${login.response.status}`)
assert(login.body.includes('/customer-experience-v505.css?v=505'), 'production login stylesheet was not injected')
assert(login.body.includes('/customer-experience-v505.js?v=505'), 'production login client was not injected')

const client = await textResponse('/customer-experience-v505.js?v=505')
assert(client.response.ok, `production client returned ${client.response.status}`)
assert(client.body.includes('cx-menu-picker-v505'), 'production menu picker is missing')
assert(client.body.includes('cx-slot-confirmed-v505'), 'production booking check is missing')
assert(client.body.includes("window.addEventListener('load', start"), 'production post-load startup is missing')
assert(client.body.includes("'requestIdleCallback' in window"), 'production idle hydration guard is missing')
assert(client.body.includes('HTMLFormElement.prototype.submit.call(form)'), 'production profile fix is missing')

const stylesheet = await textResponse('/customer-experience-v505.css?v=505')
assert(stylesheet.response.ok, `production stylesheet returned ${stylesheet.response.status}`)
assert(stylesheet.body.includes('.cx-login-main-v505'), 'production login styles are missing')
assert(stylesheet.body.includes('.cx-menu-dialog-v505'), 'production menu styles are missing')

console.log('[customer-experience-v505] production smoke passed')
