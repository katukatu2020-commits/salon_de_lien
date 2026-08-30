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

const lookup = await fetchBound(`${baseUrl}/api/admin/customer-directory?code=C-R-055`, {
  headers: { cookie: adminCookie, 'Cache-Control': 'no-cache' },
})
if (!lookup.ok) throw new Error(`customer public-code lookup failed: ${lookup.status}`)
const member = await lookup.json()
if (member.publicCode !== 'C-R-055' || !member.linkedCustomerId) {
  throw new Error('customer public-code fixture is not linked to the current store')
}

const legacyCode = `C-${member.linkedCustomerId.slice(-5).toUpperCase()}`
const [listResponse, detailResponse] = await Promise.all([
  fetchBound(`${baseUrl}/admin/customers?q=${encodeURIComponent(member.name)}&smoke=v476`, {
    headers: { cookie: adminCookie, 'Cache-Control': 'no-cache' },
  }),
  fetchBound(`${baseUrl}/admin/customers/${encodeURIComponent(member.linkedCustomerId)}?smoke=v476`, {
    headers: { cookie: adminCookie, 'Cache-Control': 'no-cache' },
  }),
])
if (!listResponse.ok || !detailResponse.ok) {
  throw new Error(`staff customer pages failed: list=${listResponse.status}, detail=${detailResponse.status}`)
}
const [listHtml, detailHtml] = await Promise.all([listResponse.text(), detailResponse.text()])
for (const [surface, html] of [['list', listHtml], ['detail', detailHtml]]) {
  if (!html.includes('C-R-055')) throw new Error(`${surface} does not show the app customer code`)
  if (legacyCode !== 'C-R-055' && html.includes(legacyCode)) throw new Error(`${surface} still shows the legacy customer code`)
}

const customerLogin = await fetchBound(`${baseUrl}/api/customer-auth/login`, {
  method: 'POST',
  redirect: 'manual',
  headers: { Origin: baseUrl, 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ loginId: 'yohaku.member04', password: 'Mypage2026!', next: '/u/home' }),
})
if (customerLogin.status !== 303) throw new Error(`demo customer login failed: ${customerLogin.status}`)
const customerCookie = sessionCookie(customerLogin)
const customerHome = await fetchBound(`${baseUrl}/u/home?smoke=v476`, {
  headers: { cookie: customerCookie, 'Cache-Control': 'no-cache' },
})
if (!customerHome.ok || !(await customerHome.text()).includes('C-R-056')) {
  throw new Error('demo customer app does not show its expected public code')
}

console.log('customer public code parity production smoke passed')
