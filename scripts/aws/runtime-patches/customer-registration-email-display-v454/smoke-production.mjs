const baseUrl = process.env.SMOKE_BASE_URL || 'https://salon-de-lien.com'

const ready = await fetch(`${baseUrl}/api/health/ready`, {
  headers: { 'Cache-Control': 'no-cache' },
})
if (!ready.ok) throw new Error(`production readiness failed: ${ready.status}`)

const loginPage = await fetch(`${baseUrl}/admin/login`, {
  redirect: 'manual',
  headers: { 'Cache-Control': 'no-cache' },
})
if (loginPage.status !== 200) {
  throw new Error(`admin login page failed: ${loginPage.status}`)
}

const html = await loginPage.text()
if (!html.includes('Salon de Lien')) {
  throw new Error('admin login page did not render the expected application shell')
}

console.log('customer registration email display production smoke passed')
