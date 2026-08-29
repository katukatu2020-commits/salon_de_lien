const baseUrl = process.env.BASE_URL || 'https://salon-de-lien.com'

async function body(path) {
  const response = await fetch(`${baseUrl}${path}`, { redirect: 'manual', cache: 'no-store' })
  if (!response.ok) throw new Error(`${path}: expected 2xx, received ${response.status}`)
  return response.text()
}

const [shift, breakClient] = await Promise.all([
  body('/_next/static/chunks/app/admin/appointments/page-shift-line-break-v461.js'),
  body('/staff-breaks-checkout-menu-client-v442.js?v=461'),
])

if (!shift.includes('shift-line-break-interaction-v461')) throw new Error('production shift chunk marker is missing')
if (!shift.includes('label: "LINE予約"')) throw new Error('production LINE route legend is missing')
if (!shift.includes('lien-route-line-v461')) throw new Error('production LINE route class is missing')
if (!breakClient.includes('shift-line-break-interaction-v461')) throw new Error('production break interaction marker is missing')
if (!breakClient.includes('休憩（予約受付を停止）')) throw new Error('production break menu option is missing')
if (!breakClient.includes("method: 'PATCH'")) throw new Error('production break drag persistence is missing')

console.log('shift LINE and break interaction v461 production smoke passed')
