const baseUrl = process.env.SMOKE_BASE_URL || 'https://salon-de-lien.com'

function sessionCookie(response) {
  return (response.headers.get('set-cookie') || '').split(';')[0]
}

async function fetchBound(url, options = {}) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 12000)
  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } finally {
    clearTimeout(timeoutId)
  }
}

const ready = await fetchBound(`${baseUrl}/api/health/ready`, { headers: { 'Cache-Control': 'no-cache' } })
if (!ready.ok) throw new Error(`readiness failed: ${ready.status}`)

const adminLogin = await fetchBound(`${baseUrl}/api/auth/login`, {
  method: 'POST',
  redirect: 'manual',
  headers: { Origin: baseUrl, 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ email: 'demo.owner', password: 'LienDemo2026!', next: '/admin/customers' }),
})
if (adminLogin.status !== 303) throw new Error(`demo admin login failed: ${adminLogin.status}`)
const adminCookie = sessionCookie(adminLogin)
if (!adminCookie) throw new Error('demo admin session cookie was not issued')

const lookup = await fetchBound(`${baseUrl}/api/admin/customer-directory?code=C-R-036`, {
  headers: { cookie: adminCookie, 'Cache-Control': 'no-cache' },
})
if (!lookup.ok) throw new Error(`customer-code lookup failed: ${lookup.status}`)
const member = await lookup.json()
if (member.publicCode !== 'C-R-036' || !member.linkedCustomerId) {
  throw new Error('customer-code lookup did not resolve the existing linked customer')
}

const existingLink = await fetchBound(`${baseUrl}/api/admin/customer-directory`, {
  method: 'POST',
  headers: { cookie: adminCookie, Origin: baseUrl, 'Content-Type': 'application/json' },
  body: JSON.stringify({ mode: 'member', publicCode: 'C-R-036' }),
})
if (!existingLink.ok) throw new Error(`existing customer link verification failed: ${existingLink.status}`)
const existingLinkPayload = await existingLink.json()
if (!existingLinkPayload.ok || existingLinkPayload.customerId !== member.linkedCustomerId) {
  throw new Error('customer link API returned an unverified customer record')
}

const customerLogin = await fetchBound(`${baseUrl}/api/customer-auth/login`, {
  method: 'POST',
  redirect: 'manual',
  headers: { Origin: baseUrl, 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ loginId: 'demo.hana', password: 'Mypage2026!', next: '/u/home' }),
})
if (customerLogin.status !== 303) throw new Error(`demo customer login failed: ${customerLogin.status}`)
const customerCookie = sessionCookie(customerLogin)
if (!customerCookie) throw new Error('demo customer session cookie was not issued')

const storesResponse = await fetchBound(`${baseUrl}/api/lien-customer-stores`, {
  headers: { cookie: customerCookie, 'Cache-Control': 'no-cache' },
})
if (!storesResponse.ok) throw new Error(`registered stores could not be loaded: ${storesResponse.status}`)
const storesPayload = await storesResponse.json()
if (!storesPayload.stores.some(store => store.customerId === member.linkedCustomerId && store.linked)) {
  throw new Error('the staff-side linked customer is missing from the customer registered-store list')
}

console.log('customer code link production smoke passed across staff and customer views')
