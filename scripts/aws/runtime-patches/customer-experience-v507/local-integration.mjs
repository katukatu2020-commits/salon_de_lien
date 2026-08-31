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
assert(ready.headers.get('x-lien-customer-experience') === 'v507', 'v507 readiness header is missing')
assert(ready.headers.get('x-lien-store-platform') === 'v503', 'v503 parent readiness header is missing')

const login = await textResponse('/u/login?integration=v507', {
  headers: { Accept: 'text/html' },
  redirect: 'manual',
})
assert(login.response.status === 200, `login returned ${login.response.status}`)
assert(login.body.includes('/customer-experience-v507.css?v=507'), 'login stylesheet loader is missing')
assert(login.body.includes('/customer-experience-v507.js?v=507'), 'login client loader is missing')
assert(!login.body.includes('<link id="customer-experience-style-v507"'), 'stylesheet node was injected before hydration')
assert(!login.body.includes('<script id="customer-experience-script-v507"'), 'script node was injected before hydration')

const client = await textResponse('/customer-experience-v507.js?v=507')
assert(client.response.ok, `client returned ${client.response.status}`)
assert(client.response.headers.get('content-type')?.includes('application/javascript'), 'client content type is invalid')
assert(client.body.includes('cx-menu-picker-v507'), 'searchable menu picker is missing')
assert(client.body.includes('HTMLFormElement.prototype.submit.call(form)'), 'profile submission fix is missing')
assert(client.body.includes('cx-slot-confirmed-v507'), 'booking confirmation check is missing')
assert(client.body.includes("window.addEventListener('load', start"), 'post-load startup is missing')
assert(client.body.includes("'requestIdleCallback' in window"), 'idle hydration guard is missing')

const stylesheet = await textResponse('/customer-experience-v507.css?v=507')
assert(stylesheet.response.ok, `stylesheet returned ${stylesheet.response.status}`)
assert(stylesheet.response.headers.get('content-type')?.includes('text/css'), 'stylesheet content type is invalid')
assert(stylesheet.body.includes('.cx-login-main-v507'), 'login layout styles are missing')
assert(stylesheet.body.includes('.cx-menu-dialog-v507'), 'menu dialog styles are missing')

console.log('[customer-experience-v507] local HTTP integration passed')
