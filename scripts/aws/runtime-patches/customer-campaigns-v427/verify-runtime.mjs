import fs from 'node:fs'

function requireText(file, markers) {
  const source = fs.readFileSync(file, 'utf8')
  for (const marker of markers) {
    if (!source.includes(marker)) throw new Error(`${file}: missing ${marker}`)
  }
  return source
}

const server = requireText('/app/server.js', [
  "require('./customer-campaigns-v427')",
  'customerCampaigns.activeCampaignsForCustomer(session)',
  'customerCampaigns.homeSection(data.campaigns)',
  "['news','キャンペーン','CAMPAIGN','/u/campaigns']",
  'customer-campaigns-v427-route',
])
if (!server.includes('const bell = `<a class="icon-button customer-notification-link" href="/u/news"')) {
  throw new Error('the existing notification bell no longer points to /u/news')
}
if (!server.includes('CustomerBroadcastRecipient') || !server.includes('async function customerNewsPage')) {
  throw new Error('the existing notification ledger was removed')
}

const service = requireText('/app/customer-campaigns-v427.js', [
  'CREATE TABLE IF NOT EXISTS "CustomerCampaign"',
  'CREATE TABLE IF NOT EXISTS "CustomerCampaignRecipient"',
  "private/campaign-images/${safeSegment(session.organizationId, 'organization')}/",
  "url.pathname === '/u/campaigns'",
  "url.pathname === '/admin/customers/messages/campaigns'",
  'c."startsAt"<=CURRENT_TIMESTAMP AND c."endsAt">=CURRENT_TIMESTAMP',
  'r."customerId"=$1 AND c."organizationId"=$2',
])
if (service.includes('CustomerBroadcastRecipient r JOIN "CustomerCampaign"')) {
  throw new Error('campaigns are incorrectly connected to the notification recipient table')
}

const adminMessages = requireText('/app/.next/server/app/admin/customers/messages/page.js', [
  'Customer message',
  '顧客へのお知らせ・クーポン配信',
  '件名',
])
if (adminMessages.includes('Event & campaign') || adminMessages.includes('イベント・キャンペーン名')) {
  throw new Error('the normal broadcast form is still mislabeled as campaign delivery')
}

requireText('/app/ui-workflows-v294.js', ['lien-campaign-entry-v427', '/admin/customers/messages/campaigns'])
requireText('/app/commercial-admin-v101.js', ["script.src='/ui-workflows-v294.js?v=427'"])
requireText('/app/customer-runtime-v267.js', ["script.src='/ui-workflows-v294.js?v=427'"])

console.log('customer campaigns v427 verified')
