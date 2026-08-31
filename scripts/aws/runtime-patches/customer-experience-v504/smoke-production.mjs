const baseUrl = process.env.BASE_URL || 'https://salon-de-lien.com'

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

async function textResponse(pathname, options = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, options)
  const body = await response.text()
  return { response, body }
}

const ready = await fetch(`${baseUrl}/api/health/ready?smoke=v504`, { cache: 'no-store' })
assert(ready.ok, `production readiness returned ${ready.status}`)
assert(ready.headers.get('x-lien-customer-experience') === 'v504', 'production v504 readiness header is missing')
assert(ready.headers.get('x-lien-store-platform') === 'v503', 'production v503 parent header is missing')

const login = await textResponse('/u/login?smoke=v504', {
  headers: { Accept: 'text/html', 'Cache-Control': 'no-cache' },
  redirect: 'manual',
})
assert(login.response.status === 200, `production login returned ${login.response.status}`)
assert(login.body.includes('/customer-experience-v504.css?v=504'), 'production login stylesheet was not injected')
assert(login.body.includes('/customer-experience-v504.js?v=504'), 'production login client was not injected')

const client = await textResponse('/customer-experience-v504.js?v=504')
assert(client.response.ok, `production client returned ${client.response.status}`)
assert(client.body.includes('cx-menu-picker-v504'), 'production menu picker is missing')
assert(client.body.includes('cx-slot-confirmed-v504'), 'production booking check is missing')
assert(client.body.includes('HTMLFormElement.prototype.submit.call(form)'), 'production profile fix is missing')

const stylesheet = await textResponse('/customer-experience-v504.css?v=504')
assert(stylesheet.response.ok, `production stylesheet returned ${stylesheet.response.status}`)
assert(stylesheet.body.includes('.cx-login-main-v504'), 'production login styles are missing')
assert(stylesheet.body.includes('.cx-menu-dialog-v504'), 'production menu styles are missing')

console.log('[customer-experience-v504] production smoke passed')
