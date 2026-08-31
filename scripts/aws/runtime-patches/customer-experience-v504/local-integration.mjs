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
assert(ready.headers.get('x-lien-customer-experience') === 'v504', 'v504 readiness header is missing')
assert(ready.headers.get('x-lien-store-platform') === 'v503', 'v503 parent readiness header is missing')

const login = await textResponse('/u/login?integration=v504', {
  headers: { Accept: 'text/html' },
  redirect: 'manual',
})
assert(login.response.status === 200, `login returned ${login.response.status}`)
assert(login.body.includes('/customer-experience-v504.css?v=504'), 'login stylesheet was not injected')
assert(login.body.includes('/customer-experience-v504.js?v=504'), 'login client was not injected')

const client = await textResponse('/customer-experience-v504.js?v=504')
assert(client.response.ok, `client returned ${client.response.status}`)
assert(client.response.headers.get('content-type')?.includes('application/javascript'), 'client content type is invalid')
assert(client.body.includes('cx-menu-picker-v504'), 'searchable menu picker is missing')
assert(client.body.includes('HTMLFormElement.prototype.submit.call(form)'), 'profile submission fix is missing')
assert(client.body.includes('cx-slot-confirmed-v504'), 'booking confirmation check is missing')

const stylesheet = await textResponse('/customer-experience-v504.css?v=504')
assert(stylesheet.response.ok, `stylesheet returned ${stylesheet.response.status}`)
assert(stylesheet.response.headers.get('content-type')?.includes('text/css'), 'stylesheet content type is invalid')
assert(stylesheet.body.includes('.cx-login-main-v504'), 'login layout styles are missing')
assert(stylesheet.body.includes('.cx-menu-dialog-v504'), 'menu dialog styles are missing')

console.log('[customer-experience-v504] local HTTP integration passed')
