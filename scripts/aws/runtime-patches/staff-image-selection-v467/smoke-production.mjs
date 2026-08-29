const baseUrl = process.env.BASE_URL || 'https://salon-de-lien.com'

async function response(path) {
  return fetch(`${baseUrl}${path}`, { redirect: 'manual', cache: 'no-store' })
}

const ready = await response('/api/health/ready')
if (!ready.ok) throw new Error(`readiness returned ${ready.status}`)

const runtime = await response('/customer-link-ui-v293.js?v=467')
if (!runtime.ok) throw new Error(`crop runtime returned ${runtime.status}`)
const source = await runtime.text()
if (!source.includes('staff-image-selection-v467')) throw new Error('v467 staff image marker is missing')
if (source.includes('dialog.close(); resolve(value)')) throw new Error('legacy crop settlement race is still shipped')
if (!source.includes('settle(value)')) throw new Error('confirmed crop settlement is missing')

const protectedApi = await response('/api/admin/staff-profile')
if (![401, 403].includes(protectedApi.status)) {
  throw new Error(`unauthenticated staff profile API returned ${protectedApi.status}`)
}

console.log('staff image selection v467 production smoke passed')
