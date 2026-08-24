import fs from 'node:fs'

const serverPath = '/app/server.js'
const adminMessagesPath = '/app/.next/server/app/admin/customers/messages/page.js'
const workflowPath = '/app/ui-workflows-v294.js'
const commercialPath = '/app/commercial-admin-v101.js'
const customerRuntimePath = '/app/customer-runtime-v267.js'

function replaceOnce(source, before, after, label) {
  const count = source.split(before).length - 1
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`)
  return source.replace(before, after)
}

function writePatched(file, patcher) {
  const source = fs.readFileSync(file, 'utf8')
  const result = patcher(source)
  if (result === source) throw new Error(`${file}: patch produced no change`)
  fs.writeFileSync(file, result)
}

writePatched(serverPath, source => {
  source = replaceOnce(
    source,
    "const { createCustomerProfileImageService } = require('./customer-profile-image-service-v424') /* customer-app-experience-v424 */",
    "const { createCustomerProfileImageService } = require('./customer-profile-image-service-v424') /* customer-app-experience-v424 */\nconst { createCustomerCampaignService } = require('./customer-campaigns-v427') /* customer-campaigns-v427 */",
    'campaign service require',
  )
  source = replaceOnce(
    source,
    "const customerProfileImage = createCustomerProfileImageService({ prisma, customerSession: req => chatSession(req, 'customer'), json })",
    `const customerProfileImage = createCustomerProfileImageService({ prisma, customerSession: req => chatSession(req, 'customer'), json })
const customerCampaigns = createCustomerCampaignService({
  prisma,
  customerSession: req => chatSession(req, 'customer'),
  staffSession: req => chatSession(req, 'staff'),
  json,
  sendCustomerHtml,
  customerShell,
  customerIcon,
  htmlEscape,
  jpDate,
})`,
    'campaign service initialization',
  )
  source = replaceOnce(
    source,
    '  return { customer: customers[0], visit: visits[0], appointment: appointments[0], points: pointAccounts[0]?.availablePoints || 0, broadcasts, unread: broadcasts.filter(v => !v.readAt).length + (chatCounts[0]?.count || 0) }',
    `  const campaigns = await customerCampaigns.activeCampaignsForCustomer(session)
  return { customer: customers[0], visit: visits[0], appointment: appointments[0], points: pointAccounts[0]?.availablePoints || 0, broadcasts, campaigns, unread: broadcasts.filter(v => !v.readAt).length + (chatCounts[0]?.count || 0) }`,
    'customer home campaign data',
  )
  source = replaceOnce(
    source,
    "    ['news','キャンペーン','CAMPAIGN','/u/news'],",
    "    ['news','キャンペーン','CAMPAIGN','/u/campaigns'],",
    'customer campaign shortcut',
  )
  source = source.replace(
    /^  const announcementSection = .*$/m,
    '  const announcementSection = customerCampaigns.homeSection(data.campaigns)',
  )
  if (!source.includes('customerCampaigns.homeSection(data.campaigns)')) throw new Error('customer campaign section was not replaced')
  source = replaceOnce(
    source,
    '      if (await customerProfileImage.handle(req, res, url)) return /* customer-app-experience-v424-profile */',
    `      if (await customerCampaigns.handle(req, res, url)) return /* customer-campaigns-v427-route */
      if (await customerProfileImage.handle(req, res, url)) return /* customer-app-experience-v424-profile */`,
    'campaign route hook',
  )
  return source
})

writePatched(adminMessagesPath, source => {
  source = replaceOnce(source, '"Event & campaign",', '"Customer message",', 'normal broadcast eyebrow')
  source = replaceOnce(source, 'title: "イベント・キャンペーン配信",', 'title: "顧客へのお知らせ・クーポン配信",', 'normal broadcast title')
  source = replaceOnce(
    source,
    '"店舗のイベントやキャンペーンを、お客様アプリのホームと受信ボックスへ配信します。年齢・性別で対象を絞り、クーポンも一緒に届けられます。",',
    '"対象顧客と配信方法を選び、アプリ内・登録メール・SMSへお知らせを届けます。クーポンを付けると対象者ごとに個別コードを発行します。",',
    'normal broadcast description',
  )
  source = replaceOnce(source, '"イベント・キャンペーン名",', '"件名",', 'normal broadcast subject label')
  source = replaceOnce(source, 'placeholder: "例: 秋のヘアケアキャンペーン",', 'placeholder: "例: 営業時間変更のお知らせ",', 'normal broadcast subject placeholder')
  return source
})

const campaignEntryScript = `
;(() => {
  const styleId = 'lien-campaign-entry-style-v427'
  function enhanceCampaignEntry() {
    if (location.pathname !== '/admin/customers/messages') return
    const form = document.querySelector('main form')
    if (!form || document.getElementById('lien-campaign-entry-v427')) return
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style')
      style.id = styleId
      style.textContent = '.lien-campaign-entry-v427{display:flex;align-items:center;justify-content:space-between;gap:24px;margin:0 0 22px;border:1px solid #ead8d0;border-radius:20px;background:linear-gradient(135deg,#fff8f7,#f7eee8);padding:20px 22px;box-shadow:0 13px 34px rgba(67,42,34,.07)}.lien-campaign-entry-v427 small{display:block;color:#a34b60;font-weight:800}.lien-campaign-entry-v427 strong{display:block;margin-top:4px;color:#3d302b;font-size:18px}.lien-campaign-entry-v427 p{margin:6px 0 0;color:#786b64;font-size:12px}.lien-campaign-entry-v427 a{display:inline-flex;min-height:44px;flex:none;align-items:center;border-radius:999px;background:#8f4f42;padding:0 20px;color:#fff!important;font-size:12px;font-weight:800;text-decoration:none;box-shadow:0 9px 24px rgba(143,79,66,.24)}'
      document.head.appendChild(style)
    }
    const entry = document.createElement('section')
    entry.id = 'lien-campaign-entry-v427'
    entry.className = 'lien-campaign-entry-v427'
    entry.innerHTML = '<div><small>EVENT & CAMPAIGN</small><strong>広告付きキャンペーンは専用ページから配信</strong><p>通常のお知らせと分けて、期間限定メニューや店舗イベントを掲載します。</p></div><a href="/admin/customers/messages/campaigns">キャンペーンを作成</a>'
    form.parentElement.insertBefore(entry, form)
  }
  const run = () => window.setTimeout(enhanceCampaignEntry, 40)
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, { once: true }); else run()
  new MutationObserver(run).observe(document.documentElement, { childList: true, subtree: true })
  window.addEventListener('popstate', run)
})()
`

writePatched(workflowPath, source => source + campaignEntryScript)

for (const file of [commercialPath, customerRuntimePath]) {
  writePatched(file, source => replaceOnce(source, "script.src='/ui-workflows-v294.js?v=294-2'", "script.src='/ui-workflows-v294.js?v=427'", `${file} workflow cache key`))
}

console.log('customer campaigns v427 runtime patched')
