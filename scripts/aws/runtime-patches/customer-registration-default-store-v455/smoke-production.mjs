const baseUrl = process.env.SMOKE_BASE_URL || 'https://salon-de-lien.com'

for (const path of ['/api/health/ready', '/u/register', '/u/login']) {
  const response = await fetch(`${baseUrl}${path}`, {
    redirect: 'manual',
    headers: { 'Cache-Control': 'no-cache' },
  })
  if (!response.ok) throw new Error(`${path} smoke failed: ${response.status}`)
}

console.log('customer registration default store production smoke passed')
