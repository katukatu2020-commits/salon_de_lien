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
assert(ready.headers.get('x-lien-customer-experience') === 'v506', 'v506 readiness header is missing')
assert(ready.headers.get('x-lien-store-platform') === 'v503', 'v503 parent readiness header is missing')

const login = await textResponse('/u/login?integration=v506', {
  headers: { Accept: 'text/html' },
  redirect: 'manual',
})
assert(login.response.status === 200, `login returned ${login.response.status}`)
assert(login.body.includes('/customer-experience-v506.css?v=506'), 'login stylesheet loader is missing')
assert(login.body.includes('/customer-experience-v506.js?v=506'), 'login client loader is missing')
assert(!login.body.includes('<link id="customer-experience-style-v506"'), 'stylesheet node was injected before hydration')
assert(!login.body.includes('<script id="customer-experience-script-v506"'), 'script node was injected before hydration')

const client = await textResponse('/customer-experience-v506.js?v=506')
assert(client.response.ok, `client returned ${client.response.status}`)
assert(client.response.headers.get('content-type')?.includes('application/javascript'), 'client content type is invalid')
assert(client.body.includes('cx-menu-picker-v506'), 'searchable menu picker is missing')
assert(client.body.includes('HTMLFormElement.prototype.submit.call(form)'), 'profile submission fix is missing')
assert(client.body.includes('cx-slot-confirmed-v506'), 'booking confirmation check is missing')
assert(client.body.includes("window.addEventListener('load', start"), 'post-load startup is missing')
assert(client.body.includes("'requestIdleCallback' in window"), 'idle hydration guard is missing')

const stylesheet = await textResponse('/customer-experience-v506.css?v=506')
assert(stylesheet.response.ok, `stylesheet returned ${stylesheet.response.status}`)
assert(stylesheet.response.headers.get('content-type')?.includes('text/css'), 'stylesheet content type is invalid')
assert(stylesheet.body.includes('.cx-login-main-v506'), 'login layout styles are missing')
assert(stylesheet.body.includes('.cx-menu-dialog-v506'), 'menu dialog styles are missing')

console.log('[customer-experience-v506] local HTTP integration passed')
