const baseUrl = process.env.BASE_URL || 'https://salon-de-lien.com'

async function postResetRequest(audience, email) {
  return fetch(`${baseUrl}/api/auth/password-reset/request`, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      origin: baseUrl,
    },
    body: new URLSearchParams({ audience, email }),
    redirect: 'manual',
    cache: 'no-store',
  })
}

const ready = await fetch(`${baseUrl}/api/health/ready`, { cache: 'no-store' })
if (!ready.ok) throw new Error(`readiness returned ${ready.status}`)

const missingEmail = `codex-password-reset-missing-${Date.now()}@example.com`
const customer = await postResetRequest('customer', missingEmail)
if (customer.status !== 303) throw new Error(`customer reset returned ${customer.status}`)
const customerLocation = new URL(customer.headers.get('location') || '', baseUrl)
if (customerLocation.pathname !== '/u/password-reset' || customerLocation.searchParams.get('error') !== 'account-not-found') {
  throw new Error(`missing customer did not receive the explicit error redirect: ${customerLocation}`)
}

const customerPage = await fetch(customerLocation, { cache: 'no-store' })
const customerHtml = await customerPage.text()
if (!customerPage.ok || !customerHtml.includes('このメールアドレスに一致する登録情報はありません')) {
  throw new Error('customer reset page did not render the explicit missing-account error')
}

const admin = await postResetRequest('admin', missingEmail)
if (admin.status !== 303) throw new Error(`admin reset returned ${admin.status}`)
const adminLocation = new URL(admin.headers.get('location') || '', baseUrl)
if (adminLocation.pathname !== '/admin/password-reset' || adminLocation.searchParams.get('sent') !== '1') {
  throw new Error('admin reset enumeration protection changed unexpectedly')
}

console.log('customer password-reset v464 production smoke passed')
