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
assert(ready.headers.get('x-lien-customer-experience') === 'v505', 'v505 readiness header is missing')
assert(ready.headers.get('x-lien-store-platform') === 'v503', 'v503 parent readiness header is missing')

const login = await textResponse('/u/login?integration=v505', {
  headers: { Accept: 'text/html' },
  redirect: 'manual',
})
assert(login.response.status === 200, `login returned ${login.response.status}`)
assert(login.body.includes('/customer-experience-v505.css?v=505'), 'login stylesheet was not injected')
assert(login.body.includes('/customer-experience-v505.js?v=505'), 'login client was not injected')

const client = await textResponse('/customer-experience-v505.js?v=505')
assert(client.response.ok, `client returned ${client.response.status}`)
assert(client.response.headers.get('content-type')?.includes('application/javascript'), 'client content type is invalid')
assert(client.body.includes('cx-menu-picker-v505'), 'searchable menu picker is missing')
assert(client.body.includes('HTMLFormElement.prototype.submit.call(form)'), 'profile submission fix is missing')
assert(client.body.includes('cx-slot-confirmed-v505'), 'booking confirmation check is missing')
assert(client.body.includes("window.addEventListener('load', start"), 'post-load startup is missing')
assert(client.body.includes("'requestIdleCallback' in window"), 'idle hydration guard is missing')

const stylesheet = await textResponse('/customer-experience-v505.css?v=505')
assert(stylesheet.response.ok, `stylesheet returned ${stylesheet.response.status}`)
assert(stylesheet.response.headers.get('content-type')?.includes('text/css'), 'stylesheet content type is invalid')
assert(stylesheet.body.includes('.cx-login-main-v505'), 'login layout styles are missing')
assert(stylesheet.body.includes('.cx-menu-dialog-v505'), 'menu dialog styles are missing')

console.log('[customer-experience-v505] local HTTP integration passed')
