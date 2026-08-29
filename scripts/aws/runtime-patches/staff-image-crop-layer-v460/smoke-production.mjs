const baseUrl = process.env.BASE_URL || 'https://salon-de-lien.com'

async function text(path) {
  const response = await fetch(`${baseUrl}${path}`, { redirect: 'manual', cache: 'no-store' })
  if (!response.ok) throw new Error(`${path}: expected 2xx, received ${response.status}`)
  return response.text()
}

const [cropRuntime, staffRuntime] = await Promise.all([
  text('/customer-link-ui-v293.js?v=460'),
  text('/admin-staff-experience-v276.js?v=460'),
])

if (!cropRuntime.includes('staff-image-crop-layer-v460')) throw new Error('production crop-layer marker is missing')
if (!cropRuntime.includes('z-index:2147483000')) throw new Error('production crop dialog is not on the top layer')
if (!cropRuntime.includes("dialog.overlay.classList.add('lien-v293-crop-modal')")) throw new Error('production crop dialog class is missing')
if (!staffRuntime.includes('.sm-overlay{position:fixed;z-index:110000')) throw new Error('production staff editor layer changed unexpectedly')

console.log('staff image crop v460 production smoke passed')
