const baseUrl = process.env.SMOKE_BASE_URL || 'https://salon-de-lien.com'

for (const path of ['/api/health/ready', '/u/login']) {
  const response = await fetch(`${baseUrl}${path}`, {
    redirect: 'manual',
    headers: { 'Cache-Control': 'no-cache' },
  })
  if (!response.ok) throw new Error(`${path} smoke failed: ${response.status}`)
}

const stores = await fetch(`${baseUrl}/u/stores`, {
  redirect: 'manual',
  headers: { 'Cache-Control': 'no-cache' },
})
if (![401, 302, 303, 307, 308].includes(stores.status)) {
  throw new Error(`/u/stores unauthenticated guard failed: ${stores.status}`)
}

console.log('customer primary store link production smoke passed')
