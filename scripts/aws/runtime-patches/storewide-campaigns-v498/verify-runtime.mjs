import fs from 'node:fs'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const server = fs.readFileSync(`${root}/server.js`, 'utf8')
const campaign = fs.readFileSync(`${root}/customer-campaigns-v427.js`, 'utf8')
const commercial = fs.readFileSync(`${root}/commercial-admin-v101.js`, 'utf8')

const required = [
  [server, "X-Lien-Storewide-Campaigns', 'v498'", 'v498 readiness header'],
  [server, "X-Lien-Attendance-History-Editor', 'v497'", 'v497 readiness header'],
  [campaign, 'storewide-campaigns-v498', 'v498 campaign runtime'],
  [campaign, 'WHERE c."organizationId"=$1 AND c."status"=\'published\'', 'store-scoped campaign lookup'],
  [campaign, 'Advertising campaigns are store-wide', 'forced universal audience'],
  [campaign, '公開対象：この店舗を登録しているすべてのお客様', 'universal audience UI'],
  [campaign, '店舗の全顧客に公開', 'universal campaign history label'],
  [campaign, 'html,body{min-width:0!important;overflow-x:hidden!important}', 'mobile width reset'],
  [campaign, '.admin-desktop-sidebar{display:none!important}', 'mobile sidebar removal'],
  [campaign, 'html.ca-campaign-mobile body .admin-app-shell.admin-staff-unified-v48>aside.admin-desktop-sidebar{display:none!important}', 'mobile sidebar specificity guard'],
  [campaign, 'ON CONFLICT ("campaignId","customerId") DO UPDATE', 'lazy view ledger'],
  [campaign, "url.pathname === '/u/campaigns'", 'customer campaign route'],
  [campaign, "url.pathname === '/admin/customers/messages/campaigns'", 'admin campaign route'],
  [commercial, "location.pathname === '/admin/customers/messages/campaigns' && window.matchMedia('(max-width: 767px)').matches", 'campaign mobile shell guard'],
  [commercial, "document.documentElement.classList.add('ca-campaign-mobile')", 'campaign mobile shell marker'],
]
for (const [source, marker, label] of required) {
  if (!source.includes(marker)) throw new Error(`${label} missing`)
}

const activeStart = campaign.indexOf('async function activeCampaignsForCustomer')
const activeEnd = campaign.indexOf('async function notificationUnreadForCustomer', activeStart)
const activeSource = campaign.slice(activeStart, activeEnd)
if (activeSource.includes('CustomerCampaignRecipient')) throw new Error('campaign visibility is still recipient-gated')
if (activeSource.includes('session.customerId')) throw new Error('campaign visibility still depends on the current customer id')

const adminStart = campaign.indexOf('async function adminPageV429')
const adminEnd = campaign.indexOf('async function customerPage', adminStart)
const adminSource = campaign.slice(adminStart, adminEnd)
for (const stale of ['name="audienceGender"', 'name="audienceMinAge"', 'name="audienceMaxAge"', '配信条件に一致する顧客']) {
  if (adminSource.includes(stale)) throw new Error(`stale campaign targeting UI remains: ${stale}`)
}

if ((server.match(/X-Lien-Storewide-Campaigns/g) || []).length !== 1) throw new Error('v498 readiness marker was duplicated')
if ((campaign.match(/storewide-campaigns-v498/g) || []).length !== 1) throw new Error('v498 runtime marker was duplicated')
if ((commercial.match(/const campaignMobile =/g) || []).length !== 1) throw new Error('campaign mobile shell guard was duplicated')

console.log('storewide-campaigns-v498 runtime verification passed')
