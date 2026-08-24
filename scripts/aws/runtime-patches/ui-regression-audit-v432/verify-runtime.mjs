import fs from 'node:fs'

const source = fs.readFileSync('/app/customer-campaigns-v427.js', 'utf8')
const tenantClient = fs.readFileSync('/app/tenant-setup-client.js', 'utf8')
const required = [
  'ui-regression-audit-v432',
  'class="top-actions"',
  'class="top-notification"',
  'class="top-store"',
  'id="campaign-side-toggle"',
  'side-collapsed',
  "localStorage.getItem('salon-lien:admin-theme')",
  'SELECT "name" FROM "Organization"',
  'data-edit=',
  'data-delete=',
]

for (const marker of required) {
  if (!source.includes(marker)) throw new Error(`missing v432 marker: ${marker}`)
}
if (source.includes('<div class="top-search">')) throw new Error('legacy campaign header search remains')
if (source.includes('.nav a.active{background:var(--primary);color:#fff')) throw new Error('legacy solid sidebar active style remains')
if (!tenantClient.includes('ui-regression-audit-v432: issue the address only after the owner explicitly confirms it')) throw new Error('explicit inbound address issuance marker is missing')
if (tenantClient.includes("try { await issueInboundAddress() }")) throw new Error('automatic inbound address issuance remains')

const expectedFormLabels = new Map([
  ['/app/sales-ledger-client-v318.js', {
    from: '売上日（開始）', to: '売上日（終了）', customer: '顧客名', staff: '主担当スタッフ',
    saleNo: '売上番号', appointmentNo: '施術番号', keyword: '施術・メニュー・メモ',
    loginId: 'ログインID', password: 'パスワード',
  }],
  ['/app/commercial-admin-v101.js', {
    storeName: '店舗名', ownerName: '代表者名', phone: '電話番号', postalCode: '郵便番号',
    prefecture: '都道府県', city: '市区町村', addressLine1: '番地', addressLine2: '建物名・部屋番号',
    businessOpen: '営業開始', businessClose: '営業終了', websiteUrl: 'WebサイトURL',
    email: 'メールアドレス', currentPassword: '現在のパスワード',
  }],
])

let verifiedFormLabels = 0
for (const [filePath, labels] of expectedFormLabels) {
  const formSource = fs.readFileSync(filePath, 'utf8')
  for (const [name, label] of Object.entries(labels)) {
    const marker = `aria-label="${label}" name="${name}"`
    const count = formSource.split(marker).length - 1
    if (count !== 1) throw new Error(`${filePath} ${name}: expected one accessible label, found ${count}`)
    verifiedFormLabels += 1
  }
}
const labeledControlCount = Number(fs.readFileSync('/app/.ui-regression-audit-v432-form-label-count', 'utf8'))
if (labeledControlCount !== verifiedFormLabels) throw new Error(`form label verification failed: ${verifiedFormLabels} expected=${labeledControlCount}`)

const customerSearchLabelCount = Number(fs.readFileSync('/app/.ui-regression-audit-v432-customer-search-label-count', 'utf8'))
const recoveryEmailLabelCount = Number(fs.readFileSync('/app/.ui-regression-audit-v432-recovery-email-label-count', 'utf8'))
if (!Number.isInteger(customerSearchLabelCount) || customerSearchLabelCount < 1) throw new Error('customer search label count is invalid')
if (!Number.isInteger(recoveryEmailLabelCount) || recoveryEmailLabelCount < 1) throw new Error('recovery email label count is invalid')

function countCompiledMarkers(directory, oldMarker, currentMarker) {
  if (!fs.existsSync(directory)) return { old: 0, current: 0 }
  let old = 0
  let current = 0
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const entryPath = `${directory}/${entry.name}`
    if (entry.isDirectory()) {
      const nested = countCompiledMarkers(entryPath, oldMarker, currentMarker)
      old += nested.old
      current += nested.current
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      const compiled = fs.readFileSync(entryPath, 'utf8')
      old += compiled.split(oldMarker).length - 1
      current += compiled.split(currentMarker).length - 1
    }
  }
  return { old, current }
}

const searchLabels = ['/app/.next/server', '/app/.next/static']
  .map((root) => countCompiledMarkers(root, 'placeholder:"顧客名・電話・メモで検索"', '"aria-label":"顧客名・電話・メモで検索",placeholder:"顧客名・電話・メモで検索"'))
  .reduce((total, item) => ({ old: total.old + item.old, current: total.current + item.current }), { old: 0, current: 0 })
if (searchLabels.old !== searchLabels.current || searchLabels.current !== customerSearchLabelCount) throw new Error(`customer search label verification failed: ${JSON.stringify(searchLabels)}`)

const recoveryLabels = ['/app/.next/server/app/u/(account)/profile', '/app/.next/static/chunks/app/u/(account)/profile']
  .map((root) => countCompiledMarkers(root, 'name:"email",type:"email",required:!0,autoComplete:"email"', 'name:"email","aria-label":"復旧用メールアドレス",type:"email",required:!0,autoComplete:"email"'))
  .reduce((total, item) => ({ old: total.old + item.old, current: total.current + item.current }), { old: 0, current: 0 })
if (recoveryLabels.old !== 0 || recoveryLabels.current !== recoveryEmailLabelCount) throw new Error(`recovery email label verification failed: ${JSON.stringify(recoveryLabels)}`)

const metricCount = Number(fs.readFileSync('/app/.ui-regression-audit-v432-metric-count', 'utf8'))
if (!Number.isInteger(metricCount) || metricCount < 1) throw new Error('metric card patch count is invalid')

function verifyMetricCards(directory) {
  if (!fs.existsSync(directory)) return { old: 0, current: 0 }
  let old = 0
  let current = 0
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const entryPath = `${directory}/${entry.name}`
    if (entry.isDirectory()) {
      const nested = verifyMetricCards(entryPath)
      old += nested.old
      current += nested.current
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      const compiled = fs.readFileSync(entryPath, 'utf8')
      old += compiled.split('tabular-nums text-2xl font-semibold sm:text-3xl').length - 1
      current += compiled.split('whitespace-nowrap tabular-nums text-2xl font-semibold leading-none 2xl:text-3xl').length - 1
    }
  }
  return { old, current }
}

const metrics = ['/app/.next/server', '/app/.next/static'].map(verifyMetricCards).reduce((total, item) => ({ old: total.old + item.old, current: total.current + item.current }), { old: 0, current: 0 })
if (metrics.old !== 0 || metrics.current !== metricCount) throw new Error(`metric card verification failed: ${JSON.stringify(metrics)} expected=${metricCount}`)

console.log('UI regression audit v432 verification passed')
