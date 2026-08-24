import fs from 'node:fs'

const campaignPath = '/app/customer-campaigns-v427.js'
let source = fs.readFileSync(campaignPath, 'utf8')

function replaceOnce(before, after, label) {
  const count = source.split(before).length - 1
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`)
  source = source.replace(before, after)
}

if (source.includes('ui-regression-audit-v432')) {
  throw new Error('UI regression audit v432 is already installed')
}

replaceOnce(
  '  function adminCssV429() {',
  '  // ui-regression-audit-v432\n  function adminCssV429() {',
  'release marker',
)

replaceOnce(
  ".nav a.active{background:var(--primary);color:#fff;box-shadow:0 4px 12px #8f4f4225}.nav a.active svg{color:#fff}",
  ".nav a.active{background:#f9e7eb;color:#a23f59;box-shadow:inset 0 0 0 1px #f0ccd6}.nav a.active svg{color:#a23f59}",
  'sidebar active style',
)

replaceOnce(
  '.top-settings{display:grid;width:40px;height:40px;place-items:center;border:1px solid var(--border);border-radius:50%;background:#fff;color:var(--muted)}.wrap{',
  '.top-settings{display:grid;width:40px;height:40px;place-items:center;border:1px solid var(--border);border-radius:50%;background:#fff;color:var(--muted)}.top-actions{display:flex;min-width:max-content;align-items:center;gap:9px;margin-left:auto}.top-notification{display:grid;position:relative;width:42px;height:42px;place-items:center;border:1px solid var(--border);border-radius:50%;background:linear-gradient(180deg,#fff,#fffaf7);color:#72584f;box-shadow:0 6px 18px #5b34250d}.top-notification svg{width:18px;height:18px}.top-store{display:inline-flex;min-height:44px;max-width:190px;align-items:center;gap:8px;border:1px solid var(--border);border-radius:999px;background:linear-gradient(180deg,#fff,#fffaf7);padding:0 14px;color:#4b3730;box-shadow:0 6px 18px #5b34250d;font-size:11px;font-weight:900}.top-store svg{width:17px;height:17px;color:#a95c4c}.top-store span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.top-actions .top-account{margin-left:0}.side-toggle{position:fixed;z-index:30;top:76px;left:237px;display:grid;width:38px;height:38px;place-items:center;border:1px solid #dfcec6;border-radius:13px;background:linear-gradient(145deg,#fff,#fff8f5);padding:0;color:#865044;box-shadow:0 8px 22px #4d2a2121;cursor:pointer;transition:left .2s,transform .2s}.side-toggle svg{width:18px;height:18px;transition:transform .2s}html.side-collapsed .side{transform:translateX(-100%)}html.side-collapsed .shell{padding-left:0}html.side-collapsed .side-toggle{left:12px}html.side-collapsed .side-toggle svg{transform:rotate(180deg)}html[data-ca-theme="dark"]{color-scheme:dark;--bg:#151210;--surface:#211b18;--soft:#2a221e;--ink:#f4ece7;--muted:#b9aaa2;--primary:#d77f97;--primary-dark:#f2b0c3;--primary-soft:#673747;--border:#483a34}html[data-ca-theme="dark"] body,html[data-ca-theme="dark"] .side,html[data-ca-theme="dark"] .top{background:#191513;color:var(--ink)}html[data-ca-theme="dark"] .card,html[data-ca-theme="dark"] .workspace-tabs,html[data-ca-theme="dark"] .history article,html[data-ca-theme="dark"] .input,html[data-ca-theme="dark"] .top-account,html[data-ca-theme="dark"] .top-settings,html[data-ca-theme="dark"] .top-store,html[data-ca-theme="dark"] .top-notification,html[data-ca-theme="dark"] .side-toggle{border-color:var(--border);background:#211b18;color:var(--ink)}html[data-ca-theme="dark"] .hero{border-color:var(--border);background:linear-gradient(145deg,#211b18,#2a221e)}html[data-ca-theme="dark"] .workspace-tabs a.active,html[data-ca-theme="dark"] .nav a.active{background:#4a2934;color:#f2b0c3;box-shadow:inset 0 0 0 1px #673747}html[data-ca-theme="dark"] .workspace-tabs a.active svg,html[data-ca-theme="dark"] .nav a.active svg{color:#f2b0c3}html[data-ca-theme="dark"] .side-note,html[data-ca-theme="dark"] .preview{border-color:var(--border);background:#2a221e;color:#d5b8af}.wrap{',
  'commercial shell controls',
)

replaceOnce(
  "      search: '<circle cx=\"11\" cy=\"11\" r=\"7\"/><path d=\"m20 20-4-4\"/>',\n      settings:",
  "      search: '<circle cx=\"11\" cy=\"11\" r=\"7\"/><path d=\"m20 20-4-4\"/>',\n      bell: '<path d=\"M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9\"/><path d=\"M10 21h4\"/>',\n      store: '<path d=\"M3 10h18\"/><path d=\"m5 10 1-5h12l1 5\"/><path d=\"M5 10v9h14v-9\"/><path d=\"M9 19v-5h6v5\"/>',\n      chevronLeft: '<path d=\"m15 18-6-6 6-6\"/>',\n      settings:",
  'commercial shell icons',
)

replaceOnce(
  '  function adminShellV429(session, content) {\n    const displayName = htmlEscape(String(session.displayName || session.name || session.email || \'スタッフ\').split(\'@\')[0])',
  '  function adminShellV429(session, content, organizationName) {\n    const displayName = htmlEscape(String(session.displayName || session.name || session.email || (session.role === \'ADMIN\' ? \'管理者\' : \'スタッフ\')).split(\'@\')[0])\n    const storeName = htmlEscape(String(organizationName || \'Salon de Lien\'))',
  'campaign shell arguments',
)

replaceOnce(
  '<body><div class="shell"><aside class="side"><a class="brand" href="/admin/customers"><img src="/brand/salon-customer-service-mark.svg" alt=""><div><b>Salon de Lien</b><small>Salon customer service</small></div></a><nav class="nav">${nav}</nav><div class="side-note">お客様との関係を、日々の接客から育てます。</div></aside><section class="stage"><header class="top"><div class="top-title"><small>Salon de Lien</small><strong>顧客・チャット・配信</strong></div><div class="top-search">${adminIconV429(\'search\')}<span>顧客名・電話・メモで検索</span></div><a class="top-account" href="/admin/account"><span>${displayName.slice(0, 1)}</span>${displayName}</a><a class="top-settings" href="/admin/settings" aria-label="設定">${adminIconV429(\'settings\')}</a></header><main class="wrap">${tabs}${content}</main></section></div></body>',
  '<body><div class="shell"><aside class="side"><a class="brand" href="/admin/customers"><img src="/brand/salon-customer-service-mark.svg" alt=""><div><b>${storeName}</b><small>Salon customer servitomer service</small></div></a><nav class="nav">${nav}</nav><div class="side-note">お客様との関係を、日々の接客から育てます。</div></aside><button id="campaign-side-toggle" class="side-toggle" type="button" aria-label="サイドバーを閉じる">${adminIconV429(\'chevronLeft\')}</button><section class="stage"><header class="top"><div class="top-title"><small>${storeName}</small><strong>顧客・チャット・配信</strong></div><div class="top-actions"><a class="top-notification" href="/admin/appointments?notificationHistory=1" aria-label="お知らせ">${adminIconV429(\'bell\')}</a><a class="top-store" href="/admin/settings#store-profile">${adminIconV429(\'store\')}<span>${storeName}</span></a><a class="top-account" href="/admin/account"><span>${displayName.slice(0, 1)}</span>${displayName}</a><a class="top-settings" href="/admin/settings" aria-label="設定">${adminIconV429(\'settings\')}</a></div></header><main class="wrap">${tabs}${content}</main></section></div><script>try{if(localStorage.getItem(\'salon-lien:admin-theme\')===\'dark\')document.documentElement.dataset.caTheme=\'dark\'}catch{}const campaignSidebarButton=document.getElementById(\'campaign-side-toggle\');campaignSidebarButton.addEventListener(\'click\',()=>{const collapsed=document.documentElement.classList.toggle(\'side-collapsed\');campaignSidebarButton.setAttribute(\'aria-label\',collapsed?\'サイドバーを開く\':\'サイドバーを閉じる\')})</script></body>',
  'campaign shell markup',
)

replaceOnce(
  '    const [menus, campaigns] = await Promise.all([\n      prisma.$queryRawUnsafe(\'SELECT "name" FROM "SalonMenu" WHERE "organizationId"=$1 AND "active"=TRUE ORDER BY "sortOrder","name"\', session.organizationId),\n      prisma.$queryRawUnsafe(\'SELECT * FROM "CustomerCampaign" WHERE "organizationId"=$1 AND "status"<>\\\'deleted\\\' ORDER BY "createdAt" DESC LIMIT 40\', session.organizationId),\n    ])',
  '    const [menus, campaigns, organizations] = await Promise.all([\n      prisma.$queryRawUnsafe(\'SELECT "name" FROM "SalonMenu" WHERE "organizationId"=$1 AND "active"=TRUE ORDER BY "sortOrder","name"\', session.organizationId),\n      prisma.$queryRawUnsafe(\'SELECT * FROM "CustomerCampaign" WHERE "organizationId"=$1 AND "status"<>\\\'deleted\\\' ORDER BY "createdAt" DESC LIMIT 40\', session.organizationId),\n      prisma.$queryRawUnsafe(\'SELECT "name" FROM "Organization" WHERE "id"=$1 LIMIT 1\', session.organizationId),\n    ])',
  'campaign organization query',
)

replaceOnce(
  '    sendCustomerHtml(res, adminShellV429(session, content))',
  "    sendCustomerHtml(res, adminShellV429(session, content, organizations[0]?.name || 'Salon de Lien'))",
  'campaign shell call',
)

fs.writeFileSync(campaignPath, source)

const tenantClientPath = '/app/tenant-setup-client.js'
let tenantClient = fs.readFileSync(tenantClientPath, 'utf8')
const automaticInboundIssue = `      if (!state.setup.inbound?.address && state.setup.role === 'ADMIN') {
        try { await issueInboundAddress() }
        catch (error) { console.warn('Inbound reservation address could not be issued', error) }
      }
`
const automaticInboundIssueCount = tenantClient.split(automaticInboundIssue).length - 1
if (automaticInboundIssueCount !== 1) {
  throw new Error(`automatic inbound issue: expected one match, found ${automaticInboundIssueCount}`)
}
tenantClient = tenantClient.replace(
  automaticInboundIssue,
  '      // ui-regression-audit-v432: issue the address only after the owner explicitly confirms it in the setup guide.\n',
)
fs.writeFileSync(tenantClientPath, tenantClient)

const formControlLabels = new Map([
  ['/app/sales-ledger-client-v318.js', {
    from: '売上日（開始）',
    to: '売上日（終了）',
    customer: '顧客名',
    staff: '主担当スタッフ',
    saleNo: '売上番号',
    appointmentNo: '施術番号',
    keyword: '施術・メニュー・メモ',
    loginId: 'ログインID',
    password: 'パスワード',
  }],
  ['/app/commercial-admin-v101.js', {
    storeName: '店舗名',
    ownerName: '代表者名',
    phone: '電話番号',
    postalCode: '郵便番号',
    prefecture: '都道府県',
    city: '市区町村',
    addressLine1: '番地',
    addressLine2: '建物名・部屋番号',
    businessOpen: '営業開始',
    businessClose: '営業終了',
    websiteUrl: 'WebサイトURL',
    email: 'メールアドレス',
    currentPassword: '現在のパスワード',
  }],
])

let labeledControlCount = 0
for (const [filePath, labels] of formControlLabels) {
  let formSource = fs.readFileSync(filePath, 'utf8')
  for (const [name, label] of Object.entries(labels)) {
    const before = `name="${name}"`
    const count = formSource.split(before).length - 1
    if (count !== 1) throw new Error(`${filePath} ${name}: expected one form control, found ${count}`)
    formSource = formSource.replace(before, `aria-label="${label}" ${before}`)
    labeledControlCount += 1
  }
  fs.writeFileSync(filePath, formSource)
}
fs.writeFileSync('/app/.ui-regression-audit-v432-form-label-count', String(labeledControlCount))

const customerSearchBefore = 'placeholder:"顧客名・電話・メモで検索"'
const customerSearchAfter = '"aria-label":"顧客名・電話・メモで検索",placeholder:"顧客名・電話・メモで検索"'
let customerSearchLabelCount = 0

function patchCompiledCustomerSearch(directory) {
  if (!fs.existsSync(directory)) return
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const entryPath = `${directory}/${entry.name}`
    if (entry.isDirectory()) {
      patchCompiledCustomerSearch(entryPath)
      continue
    }
    if (!entry.isFile() || !entry.name.endsWith('.js')) continue
    const compiled = fs.readFileSync(entryPath, 'utf8')
    const count = compiled.split(customerSearchBefore).length - 1
    if (!count) continue
    fs.writeFileSync(entryPath, compiled.split(customerSearchBefore).join(customerSearchAfter))
    customerSearchLabelCount += count
  }
}

for (const root of ['/app/.next/server', '/app/.next/static']) patchCompiledCustomerSearch(root)
if (customerSearchLabelCount < 1) throw new Error('customer search input was not found')
fs.writeFileSync('/app/.ui-regression-audit-v432-customer-search-label-count', String(customerSearchLabelCount))

const recoveryEmailBefore = 'name:"email",type:"email",required:!0,autoComplete:"email"'
const recoveryEmailAfter = 'name:"email","aria-label":"復旧用メールアドレス",type:"email",required:!0,autoComplete:"email"'
let recoveryEmailLabelCount = 0

function patchCompiledRecoveryEmail(directory) {
  if (!fs.existsSync(directory)) return
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const entryPath = `${directory}/${entry.name}`
    if (entry.isDirectory()) {
      patchCompiledRecoveryEmail(entryPath)
      continue
    }
    if (!entry.isFile() || !entry.name.endsWith('.js')) continue
    const compiled = fs.readFileSync(entryPath, 'utf8')
    const count = compiled.split(recoveryEmailBefore).length - 1
    if (!count) continue
    fs.writeFileSync(entryPath, compiled.split(recoveryEmailBefore).join(recoveryEmailAfter))
    recoveryEmailLabelCount += count
  }
}

for (const root of ['/app/.next/server/app/u/(account)/profile', '/app/.next/static/chunks/app/u/(account)/profile']) patchCompiledRecoveryEmail(root)
if (recoveryEmailLabelCount < 1) throw new Error('customer recovery email input was not found')
fs.writeFileSync('/app/.ui-regression-audit-v432-recovery-email-label-count', String(recoveryEmailLabelCount))

const compiledRoots = ['/app/.next/server', '/app/.next/static']
const oldMetricClass = 'tabular-nums text-2xl font-semibold sm:text-3xl'
const newMetricClass = 'whitespace-nowrap tabular-nums text-2xl font-semibold leading-none 2xl:text-3xl'
let metricReplacementCount = 0

function patchCompiledMetricCards(directory) {
  if (!fs.existsSync(directory)) return
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const entryPath = `${directory}/${entry.name}`
    if (entry.isDirectory()) {
      patchCompiledMetricCards(entryPath)
      continue
    }
    if (!entry.isFile() || !entry.name.endsWith('.js')) continue
    const compiled = fs.readFileSync(entryPath, 'utf8')
    const count = compiled.split(oldMetricClass).length - 1
    if (!count) continue
    fs.writeFileSync(entryPath, compiled.split(oldMetricClass).join(newMetricClass))
    metricReplacementCount += count
  }
}

for (const root of compiledRoots) patchCompiledMetricCards(root)
if (metricReplacementCount < 1) throw new Error('metric card responsive value class was not found')
fs.writeFileSync('/app/.ui-regression-audit-v432-metric-count', String(metricReplacementCount))
console.log('UI regression audit v432 runtime patched')
