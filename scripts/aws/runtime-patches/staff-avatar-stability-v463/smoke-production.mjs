const baseUrl = process.env.BASE_URL || 'https://salon-de-lien.com'

async function response(path) {
  return fetch(`${baseUrl}${path}`, { redirect: 'manual', cache: 'no-store' })
}

const ready = await response('/api/health/ready')
if (!ready.ok) throw new Error(`readiness returned ${ready.status}`)

const runtime = await response('/admin-staff-experience-v276.js?v=463')
if (!runtime.ok) throw new Error(`staff runtime returned ${runtime.status}`)
const source = await runtime.text()
if (!source.includes('staff-avatar-stability-v463')) throw new Error('v463 staff avatar marker is missing')
if (source.includes("image.src = profile.avatarUrl + (profile.avatarUrl.includes('?') ? '&' : '?') + 'v=' + Date.now()")) {
  throw new Error('unstable staff avatar timestamp rewriting is still shipped')
}

const staffImage = await response('/api/lien-staff-avatar?staffKey=smoke&audience=staff')
if (staffImage.status !== 401) throw new Error(`unauthenticated staff image returned ${staffImage.status}, expected 401`)

console.log('staff avatar stability v463 production smoke passed')
