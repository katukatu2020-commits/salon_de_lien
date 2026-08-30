import fs from 'node:fs'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const serverPath = `${root}/server.js`
const campaignPath = `${root}/customer-campaigns-v427.js`
const commercialPath = `${root}/commercial-admin-v101.js`

function replaceExact(source, before, after, expected, label) {
  const count = source.split(before).length - 1
  if (count !== expected) throw new Error(`${label}: expected ${expected} matches, found ${count}`)
  return source.split(before).join(after)
}

function replacePattern(source, pattern, replacement, expected, label) {
  let count = 0
  const output = source.replace(pattern, (...args) => {
    count += 1
    return typeof replacement === 'function' ? replacement(...args) : replacement
  })
  if (count !== expected) throw new Error(`${label}: expected ${expected} matches, found ${count}`)
  return output
}

let campaign = fs.readFileSync(campaignPath, 'utf8')
campaign = replaceExact(campaign, "'use strict'\n", "'use strict'\n\n/* storewide-campaigns-v498 */\n", 1, 'runtime marker')

campaign = replaceExact(
  campaign,
  `    const audienceGender = ['female', 'male', 'other'].includes(String(input.audienceGender || '')) ? String(input.audienceGender) : null
    const audienceMinAge = optionalInteger(input.audienceMinAge, '年齢下限', 0, 120)
    const audienceMaxAge = optionalInteger(input.audienceMaxAge, '年齢上限', 0, 120)
    if (audienceMinAge !== null && audienceMaxAge !== null && audienceMinAge > audienceMaxAge) {
      throw Object.assign(new Error('年齢範囲を確認してください。'), { status: 400 })
    }
`,
  `    // Advertising campaigns are store-wide. Demographic payloads from stale clients are ignored.
    const audienceGender = null
    const audienceMinAge = null
    const audienceMaxAge = null
`,
  1,
  'demographic input parsing',
)

campaign = replacePattern(
  campaign,
  /  function ageOf\(customer, now = new Date\(\)\) \{[\s\S]*?\n  async function matchingRecipients\(organizationId, input\) \{[\s\S]*?\n  \}\n\n  async function activeCampaignsForCustomer/,
  `  async function matchingRecipients(organizationId) {
    return prisma.$queryRawUnsafe(
      'SELECT "id" FROM "Customer" WHERE "organizationId"=$1 AND "deletedAt" IS NULL AND "storeHiddenAt" IS NULL',
      organizationId,
    )
  }

  async function activeCampaignsForCustomer`,
  1,
  'store-wide recipient lookup',
)

campaign = replaceExact(
  campaign,
  `  async function activeCampaignsForCustomer(session) {
    await ensureTables()
    return prisma.$queryRawUnsafe(\`SELECT c.*
      FROM "CustomerCampaignRecipient" r
      JOIN "CustomerCampaign" c ON c."id"=r."campaignId"
      WHERE r."customerId"=$1 AND c."organizationId"=$2 AND c."status"='published'
        AND c."startsAt"<=CURRENT_TIMESTAMP AND c."endsAt">=CURRENT_TIMESTAMP
      ORDER BY c."startsAt" DESC, c."createdAt" DESC LIMIT 30\`, session.customerId, session.organizationId)
  }
`,
  `  async function activeCampaignsForCustomer(session) {
    await ensureTables()
    return prisma.$queryRawUnsafe(\`SELECT c.*
      FROM "CustomerCampaign" c
      WHERE c."organizationId"=$1 AND c."status"='published'
        AND c."startsAt"<=CURRENT_TIMESTAMP AND c."endsAt">=CURRENT_TIMESTAMP
      ORDER BY c."startsAt" DESC, c."createdAt" DESC LIMIT 30\`, session.organizationId)
  }
`,
  1,
  'active campaign store scope',
)

campaign = replacePattern(
  campaign,
  /prisma\.\$queryRawUnsafe\(`SELECT c\."imageKey" FROM "CustomerCampaign" c\s+JOIN "CustomerCampaignRecipient" r ON r\."campaignId"=c\."id"\s+WHERE c\."id"=\$1 AND c\."organizationId"=\$2 AND r\."customerId"=\$3 LIMIT 1`, id, customer\.organizationId, customer\.customerId\)/g,
  `prisma.$queryRawUnsafe(\`SELECT "imageKey" FROM "CustomerCampaign"
        WHERE "id"=$1 AND "organizationId"=$2 AND "status"='published'
          AND "startsAt"<=CURRENT_TIMESTAMP AND "endsAt">=CURRENT_TIMESTAMP LIMIT 1\`, id, customer.organizationId)`,
  2,
  'customer campaign image store scope',
)

campaign = replaceExact(
  campaign,
  'matchingRecipients(session.organizationId, input)',
  'matchingRecipients(session.organizationId)',
  2,
  'store-wide current customer materialization',
)
campaign = replaceExact(
  campaign,
  `      if (!recipients.length) return json(res, 400, { error: '配信条件に一致する顧客がいません。' })
`,
  '',
  2,
  'zero-customer campaign rejection',
)

campaign = replaceExact(
  campaign,
  `      await prisma.$executeRawUnsafe('UPDATE "CustomerCampaignRecipient" SET "viewedAt"=COALESCE("viewedAt",CURRENT_TIMESTAMP) WHERE "customerId"=$1 AND "campaignId"=$2', session.customerId, campaign.id)`,
  `      await prisma.$executeRawUnsafe(\`INSERT INTO "CustomerCampaignRecipient" ("id","campaignId","customerId","viewedAt")
        VALUES ($1,$2,$3,CURRENT_TIMESTAMP)
        ON CONFLICT ("campaignId","customerId") DO UPDATE
        SET "viewedAt"=COALESCE("CustomerCampaignRecipient"."viewedAt",CURRENT_TIMESTAMP)\`, crypto.randomUUID(), campaign.id, session.customerId)`,
  1,
  'lazy campaign recipient view ledger',
)

campaign = replaceExact(
  campaign,
  `<span class="badge">\${Number(campaign.audienceMatchedCount || 0).toLocaleString('ja-JP')}名へ配信</span>`,
  '<span class="badge">店舗の全顧客に公開</span>',
  1,
  'campaign history audience label',
)
campaign = replaceExact(
  campaign,
  `      audienceGender: campaign.audienceGender,
      audienceMinAge: campaign.audienceMinAge,
      audienceMaxAge: campaign.audienceMaxAge,
`,
  '',
  1,
  'campaign editor demographic data',
)

campaign = replaceExact(
  campaign,
  '[data-campaign-admin] .columns{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}',
  '[data-campaign-admin] .columns{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}\n[data-campaign-admin] .campaign-audience{display:flex;min-height:48px;align-items:center;gap:10px;margin-top:18px;border-left:3px solid var(--lien-primary,#8f4f42);background:var(--lien-surface-soft,#f6efe6);padding:11px 14px;color:var(--lien-ink,#2f2a25);font-size:13px;font-weight:700;line-height:1.6}\n[data-campaign-admin] .campaign-audience svg{width:18px;height:18px;flex:0 0 18px;color:var(--lien-primary,#8f4f42)}',
  1,
  'store-wide audience status style',
)
campaign = replaceExact(
  campaign,
  '@media(max-width:1120px){[data-campaign-admin] .grid{grid-template-columns:minmax(0,1fr)}[data-campaign-admin] .history{grid-template-columns:repeat(2,minmax(0,1fr))}}\n@media(prefers-reduced-motion:reduce)',
  `@media(max-width:1120px){[data-campaign-admin] .grid{grid-template-columns:minmax(0,1fr)}[data-campaign-admin] .history{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:767px){
html,body{min-width:0!important;overflow-x:hidden!important}
.admin-desktop-sidebar{display:none!important}
html.ca-campaign-mobile body .admin-app-shell.admin-staff-unified-v48>aside.admin-desktop-sidebar{display:none!important}
[data-campaign-stage]{width:100%!important;min-width:0!important;padding-left:0!important}
#campaign-sidebar-toggle{display:none!important}
.admin-shell-header .admin-mobile-header{display:flex!important}
.admin-shell-header .admin-desktop-header{display:none!important}
main.admin-main-content{width:100%!important;min-width:0!important;padding:16px 14px 28px!important}
.campaign-workspace-tabs{grid-template-columns:repeat(2,minmax(0,1fr))!important}
.campaign-workspace-tabs a{min-width:0!important}
[data-campaign-admin] .campaign-page-header{border-radius:18px;padding:18px}
[data-campaign-admin] .campaign-page-header h1{font-size:24px}
[data-campaign-admin] .grid{gap:16px;margin-top:16px}
[data-campaign-admin] .card{border-radius:18px;padding:18px}
[data-campaign-admin] .columns{grid-template-columns:minmax(0,1fr)}
[data-campaign-admin] .history{grid-template-columns:minmax(0,1fr)}
[data-campaign-admin] .preview{min-height:160px}
[data-campaign-admin] .form-actions>*{flex:1 1 140px}
}
@media(prefers-reduced-motion:reduce)`,
  1,
  'campaign mobile layout',
)

campaign = replaceExact(
  campaign,
  '通常のお知らせとは分けて、期間限定メニュー、割引、店舗イベントを広告画像と一緒にお客様アプリへ掲載します。',
  '店舗を登録しているすべてのお客様へ、期間限定メニュー、割引、店舗イベントを掲載します。',
  1,
  'campaign page description',
)
campaign = replaceExact(
  campaign,
  '公開期間中の内容だけが顧客アプリのホームとキャンペーン一覧へ表示されます。',
  '掲載期間中は、店舗を登録したすべてのお客様のホームとキャンペーン一覧に表示されます。',
  1,
  'campaign form audience description',
)
campaign = replaceExact(
  campaign,
  '対象条件やおすすめしたいお客様、イベント内容をご案内します。',
  'メニューの魅力や割引内容、店舗イベントの詳細をご案内します。',
  1,
  'campaign body placeholder',
)

campaign = replacePattern(
  campaign,
  /<div class="columns"><label class="field">対象の性別<select class="input" name="audienceGender">[\s\S]*?<\/div><\/div><div id="campaign-message"/,
  `<div class="campaign-audience">\${adminIconV429('users')}<span>公開対象：この店舗を登録しているすべてのお客様</span></div><div id="campaign-message"`,
  1,
  'demographic form controls',
)
campaign = replaceExact(
  campaign,
  "for(const key of ['title','summary','body','targetMenu','discountRate','audienceGender','audienceMinAge','audienceMaxAge'])",
  "for(const key of ['title','summary','body','targetMenu','discountRate'])",
  1,
  'campaign edit field list',
)
campaign = replaceExact(
  campaign,
  "show(editingId?result.recipientCount+'名を対象に変更を保存しました。':result.recipientCount+'名へキャンペーンを配信しました。',true)",
  "show(editingId?'店舗の全顧客向けに変更を保存しました。':'店舗の全顧客向けにキャンペーンを公開しました。',true)",
  1,
  'campaign success message',
)

fs.writeFileSync(campaignPath, campaign)

let commercial = fs.readFileSync(commercialPath, 'utf8')
commercial = replaceExact(
  commercial,
  `  function enforceAdminDesktopShell() {
    if (!location.pathname.startsWith('/admin') || !document.querySelector('.admin-app-shell')) return
    const embeddedSettings = location.pathname === '/admin/settings' && new URLSearchParams(location.search).get('embedded') === '1'`,
  `  function enforceAdminDesktopShell() {
    if (!location.pathname.startsWith('/admin') || !document.querySelector('.admin-app-shell')) return
    const campaignMobile = location.pathname === '/admin/customers/messages/campaigns' && window.matchMedia('(max-width: 767px)').matches
    if (campaignMobile) {
      document.documentElement.classList.remove('ca-admin-pc-shell')
      document.documentElement.classList.add('ca-campaign-mobile')
      const mobileShell = document.querySelector('.admin-app-shell')
      const mobileSidebar = mobileShell?.querySelector(':scope > aside.admin-desktop-sidebar')
      const mobileNav = mobileSidebar?.querySelector('nav')
      for (const property of ['display','position','inset','width','min-width','max-width','height','min-height']) mobileSidebar?.style.removeProperty(property)
      for (const property of ['position','inset','display','grid-template-columns','width','height']) mobileNav?.style.removeProperty(property)
      mobileSidebar?.querySelectorAll(':scope > div > div.border-b,:scope > div > div.mx-3,:scope > div > div.mt-auto,button[aria-label="メニューを閉じる"],button.touch-manipulation').forEach(node => node.style.removeProperty('display'))
      mobileShell?.querySelectorAll('.admin-mobile-header,.admin-mobile-sidebar,.admin-desktop-header').forEach(node => node.style.removeProperty('display'))
      return
    }
    document.documentElement.classList.remove('ca-campaign-mobile')
    const embeddedSettings = location.pathname === '/admin/settings' && new URLSearchParams(location.search).get('embedded') === '1'`,
  1,
  'campaign mobile shell guard',
)
fs.writeFileSync(commercialPath, commercial)

let server = fs.readFileSync(serverPath, 'utf8')
server = replaceExact(
  server,
  "      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Attendance-History-Editor', 'v497')",
  "      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Attendance-History-Editor', 'v497')\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Storewide-Campaigns', 'v498')",
  1,
  'readiness marker',
)
fs.writeFileSync(serverPath, server)

console.log('storewide-campaigns-v498 patched')
