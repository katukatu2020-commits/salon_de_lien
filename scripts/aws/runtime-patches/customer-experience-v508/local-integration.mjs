const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:3114'

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

async function textResponse(pathname, options = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, options)
  const body = await response.text()
  return { response, body }
}

const ready = await fetch(`${baseUrl}/api/health/ready`, { cache: 'no-store' })
assert(ready.ok, `readiness returned ${ready.status}`)
assert(ready.headers.get('x-lien-customer-experience') === 'v508', 'v508 readiness header is missing')
assert(ready.headers.get('x-lien-store-platform') === 'v503', 'v503 parent readiness header is missing')

const login = await textResponse('/u/login?integration=v508', {
  headers: { Accept: 'text/html' },
  redirect: 'manual',
})
assert(login.response.status === 200, `login returned ${login.response.status}`)
assert(login.body.includes('/customer-experience-v508.css?v=508'), 'login stylesheet loader is missing')
assert(login.body.includes('/customer-experience-v508.js?v=508'), 'login client loader is missing')
assert(!login.body.includes('<link id="customer-experience-style-v508"'), 'stylesheet node was injected before hydration')
assert(!login.body.includes('<script id="customer-experience-script-v508"'), 'script node was injected before hydration')

const client = await textResponse('/customer-experience-v508.js?v=508')
assert(client.response.ok, `client returned ${client.response.status}`)
assert(client.response.headers.get('content-type')?.includes('application/javascript'), 'client content type is invalid')
assert(client.body.includes('cx-menu-picker-v508'), 'searchable menu picker is missing')
assert(client.body.includes('HTMLFormElement.prototype.submit.call(form)'), 'profile submission fix is missing')
assert(client.body.includes('cx-slot-confirmed-v508'), 'booking confirmation check is missing')
assert(client.body.includes("window.addEventListener('load', start"), 'post-load startup is missing')
assert(client.body.includes("'requestIdleCallback' in window"), 'idle hydration guard is missing')

const stylesheet = await textResponse('/customer-experience-v508.css?v=508')
assert(stylesheet.response.ok, `stylesheet returned ${stylesheet.response.status}`)
assert(stylesheet.response.headers.get('content-type')?.includes('text/css'), 'stylesheet content type is invalid')
assert(stylesheet.body.includes('.cx-login-main-v508'), 'login layout styles are missing')
assert(stylesheet.body.includes('.cx-menu-dialog-v508'), 'menu dialog styles are missing')

const refreshedLayout = await textResponse('/_next/static/chunks/app/u/(account)/layout-customer-mobile-nav-v425.orimia-v508.js')
assert(refreshedLayout.response.ok, `refreshed layout returned ${refreshedLayout.response.status}`)
assert(refreshedLayout.body.includes('ORIMIA'), 'refreshed customer layout branding is missing')
assert(!refreshedLayout.body.includes('Salon de Lien'), 'stale customer layout branding remains')

console.log('[customer-experience-v508] local HTTP integration passed')
