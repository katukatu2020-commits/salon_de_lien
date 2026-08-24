import fs from 'node:fs'

function requireMarkers(file, markers) {
  const source = fs.readFileSync(file, 'utf8')
  for (const marker of markers) {
    if (!source.includes(marker)) throw new Error(`${file}: missing ${marker}`)
  }
  return source
}

const service = requireMarkers('/app/customer-campaigns-v427.js', [
  'async function updateCampaign',
  'async function deleteCampaign',
  'adminPageV429',
  'adminShellV429',
  '作成済みの広告は、ここから編集・削除できます。',
  "['POST', 'PATCH', 'DELETE'].includes(req.method)",
  'UPDATE "CustomerCampaign" SET "status"',
])
if (!service.includes('WHERE "id"=$1 AND "organizationId"=$2')) {
  throw new Error('campaign mutations are not scoped to the current organization')
}
if (!service.includes('matchingRecipients(session.organizationId, input)')) {
  throw new Error('campaign recipients are not recalculated during mutations')
}

const tabs = requireMarkers('/app/.next/server/chunks/3491.js', [
  'href:"/admin/customers/messages/campaigns",label:"キャンペーン"',
  'grid-cols-4 gap-1 rounded-[18px]',
])
if (tabs.includes('grid-cols-3 gap-1 rounded-[18px]')) {
  throw new Error('the shared customer workspace still uses the three-column tab layout')
}

const server = requireMarkers('/app/server.js', [
  'grid-template-columns:repeat(4,1fr)',
  '<span>キャンペーン</span></a></nav>`',
  "require('./customer-campaigns-v427')",
])
if (!server.includes('customerCampaigns.handle(req, res, url)')) {
  throw new Error('campaign route hook is missing')
}

console.log('Campaign management v429 verified.')
