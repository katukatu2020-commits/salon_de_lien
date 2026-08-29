const baseUrl = process.env.SMOKE_BASE_URL || 'https://salon-de-lien.com'

for (const path of ['/api/health/ready', '/admin/login']) {
  const response = await fetch(`${baseUrl}${path}`, {
    redirect: 'manual',
    headers: { 'Cache-Control': 'no-cache' },
  })
  if (!response.ok) throw new Error(`${path} smoke failed: ${response.status}`)
}

for (const path of ['/admin/customers/messages', '/admin/customers/messages/campaigns']) {
  const response = await fetch(`${baseUrl}${path}`, {
    redirect: 'manual',
    headers: { 'Cache-Control': 'no-cache' },
  })
  if (![401, 302, 303, 307, 308].includes(response.status)) {
    throw new Error(`${path} unauthenticated guard failed: ${response.status}`)
  }
}

console.log('campaign admin layout production smoke passed')
