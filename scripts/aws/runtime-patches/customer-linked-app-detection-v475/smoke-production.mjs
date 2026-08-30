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

const lookup = await fetchBound(`${baseUrl}/api/admin/customer-directory?code=C-R-054`, {
  headers: { cookie: adminCookie, 'Cache-Control': 'no-cache' },
})
if (!lookup.ok) throw new Error(`cross-store customer lookup failed: ${lookup.status}`)
const member = await lookup.json()
if (member.publicCode !== 'C-R-054' || !member.linkedCustomerId) {
  throw new Error('cross-store fixture is not linked to the current store')
}

const detail = await fetchBound(`${baseUrl}/admin/customers/${encodeURIComponent(member.linkedCustomerId)}?smoke=v475`, {
  headers: { cookie: adminCookie, 'Cache-Control': 'no-cache' },
})
if (!detail.ok) throw new Error(`linked customer detail failed: ${detail.status}`)
const detailHtml = await detail.text()
if (detailHtml.includes('お客様アプリ未登録') || detailHtml.includes('このQRコードから新規登録できます')) {
  throw new Error('linked customer is still rendered as an unregistered app user')
}

console.log('cross-store customer app registration production smoke passed')
