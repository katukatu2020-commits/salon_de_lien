const baseUrl = process.env.BASE_URL || 'https://salon-de-lien.com'

async function response(path) {
  return fetch(`${baseUrl}${path}`, { redirect: 'manual', cache: 'no-store' })
}

const ready = await response('/api/health/ready')
if (!ready.ok) throw new Error(`readiness returned ${ready.status}`)

const workflow = await response('/ui-workflows-v294.js?v=462')
if (!workflow.ok) throw new Error(`workflow runtime returned ${workflow.status}`)
const workflowBody = await workflow.text()
if (!workflowBody.includes('asset-persistence-banner-v462')) throw new Error('v462 workflow marker is missing')
if (workflowBody.includes('広告付きキャンペーンは専用ページから配信')) throw new Error('obsolete campaign banner is still shipped')

const staffImage = await response('/api/lien-staff-avatar?staffKey=smoke&audience=staff')
if (staffImage.status !== 401) throw new Error(`unauthenticated staff image returned ${staffImage.status}, expected 401`)

const campaignImage = await response('/api/lien-campaign-image?id=smoke&audience=staff')
if (campaignImage.status !== 401) throw new Error(`unauthenticated campaign image returned ${campaignImage.status}, expected 401`)

console.log('asset persistence and banner v462 production smoke passed')
