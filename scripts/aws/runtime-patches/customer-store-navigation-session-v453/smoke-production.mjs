const baseUrl = process.env.SMOKE_BASE_URL || 'https://salon-de-lien.com'

function sessionCookie(response) {
  return (response.headers.get('set-cookie') || '').split(';')[0]
}

const login = await fetch(`${baseUrl}/api/customer-auth/login`, {
  method: 'POST',
  redirect: 'manual',
  headers: {
    Origin: baseUrl,
    'Content-Type': 'application/x-www-form-urlencoded',
  },
  body: new URLSearchParams({
    loginId: 'demo.hana',
    password: 'Mypage2026!',
    next: '/u/home',
  }),
})
if (login.status !== 303) throw new Error(`demo customer login failed: ${login.status}`)
let cookie = sessionCookie(login)
if (!cookie) throw new Error('demo customer session cookie was not issued')

const storesResponse = await fetch(`${baseUrl}/api/lien-customer-stores`, { headers: { cookie } })
if (!storesResponse.ok) throw new Error(`registered stores could not be loaded: ${storesResponse.status}`)
const storesPayload = await storesResponse.json()
const originalStore = storesPayload.stores.find((store) => store.current)
const targetStore = storesPayload.stores.find((store) => store.linked && !store.current)
if (!originalStore || !targetStore) throw new Error('registered-store smoke fixtures are unavailable')

const switchStore = async (organizationId) => {
  const response = await fetch(`${baseUrl}/api/lien-customer-stores`, {
    method: 'POST',
    headers: {
      cookie,
      Origin: baseUrl,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action: 'switch', organizationId }),
  })
  if (!response.ok) throw new Error(`store switch failed: ${response.status}`)
  cookie = sessionCookie(response) || cookie
}

await switchStore(targetStore.organizationId)

for (const pathname of ['/u/home', '/u/appointments', '/u/history', '/u/profile']) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    redirect: 'manual',
    headers: { cookie, 'Cache-Control': 'no-cache' },
  })
  if (response.status !== 200) {
    throw new Error(`${pathname} failed after store switch: ${response.status} ${response.headers.get('location') || ''}`)
  }
}

await switchStore(originalStore.organizationId)
console.log(`registered-store navigation smoke passed: ${originalStore.name} -> ${targetStore.name}`)
