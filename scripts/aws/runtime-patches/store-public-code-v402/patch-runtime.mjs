import fs from 'node:fs'

function replaceOnce(source, oldValue, newValue, label) {
  const count = source.split(oldValue).length - 1
  if (count !== 1) throw new Error(`${label}: expected 1 match, found ${count}`)
  return source.replace(oldValue, newValue)
}

const billingPath = '/app/billing.js'
let billing = fs.readFileSync(billingPath, 'utf8')

billing = replaceOnce(
  billing,
  `    const organizationId = randomId(crypto, 'org')
    const userId = randomId(crypto, 'usr')`,
  `    const organizationId = randomId(crypto, 'org')
    const publicCode = 'STORE-' + crypto.createHash('md5').update(organizationId).digest('hex').slice(0, 8).toUpperCase()
    const userId = randomId(crypto, 'usr')`,
  'registration public code generation',
)

billing = replaceOnce(
  billing,
  `          'INSERT INTO "Organization" ("id","slug","name","createdAt","updatedAt") VALUES ($1,$2,$3,NOW(),NOW())',
          organizationId,
          slug,
          organizationName
        )`,
  `          'INSERT INTO "Organization" ("id","slug","name","publicCode","createdAt","updatedAt") VALUES ($1,$2,$3,$4,NOW(),NOW())',
          organizationId,
          slug,
          organizationName,
          publicCode
        )`,
  'organization registration insert',
)

fs.writeFileSync(billingPath, billing)

const customerLinksPath = '/app/customer-links-v293.js'
let customerLinks = fs.readFileSync(customerLinksPath, 'utf8')

customerLinks = replaceOnce(
  customerLinks,
  `  async function storeQr(req, res) {
    const session = await currentStaff(req)
    await ensureSchema()
    const rows = await prisma.$queryRawUnsafe('SELECT "name","publicCode" FROM "Organization" WHERE "id"=$1 LIMIT 1', session.organizationId)`,
  `  async function storeQr(req, res) {
    const session = await currentStaff(req)
    await ensureSchema()
    await prisma.$executeRawUnsafe(\`UPDATE "Organization" SET "publicCode"='STORE-'||UPPER(SUBSTRING(MD5("id") FROM 1 FOR 8)) WHERE "id"=$1 AND "publicCode" IS NULL\`, session.organizationId)
    const rows = await prisma.$queryRawUnsafe('SELECT "name","publicCode" FROM "Organization" WHERE "id"=$1 LIMIT 1', session.organizationId)`,
  'store QR self healing',
)

customerLinks = replaceOnce(
  customerLinks,
  `  async function storeQrSvg(req, res) {
    const session = await currentStaff(req)
    await ensureSchema()
    const rows = await prisma.$queryRawUnsafe('SELECT "publicCode" FROM "Organization" WHERE "id"=$1 LIMIT 1', session.organizationId)`,
  `  async function storeQrSvg(req, res) {
    const session = await currentStaff(req)
    await ensureSchema()
    await prisma.$executeRawUnsafe(\`UPDATE "Organization" SET "publicCode"='STORE-'||UPPER(SUBSTRING(MD5("id") FROM 1 FOR 8)) WHERE "id"=$1 AND "publicCode" IS NULL\`, session.organizationId)
    const rows = await prisma.$queryRawUnsafe('SELECT "publicCode" FROM "Organization" WHERE "id"=$1 LIMIT 1', session.organizationId)`,
  'store QR SVG self healing',
)

fs.writeFileSync(customerLinksPath, customerLinks)

const workflowsPath = '/app/ui-workflows-v294.js'
let workflows = fs.readFileSync(workflowsPath, 'utf8')

const identityFunction = String.raw`
  async function initStoreIdentityCard() {
    if (location.pathname !== '/admin/settings' || new URLSearchParams(location.search).get('embedded') === '1') return
    if (document.querySelector('[data-lien-store-identity-v402]')) return
    const form = document.querySelector('main form') || document.querySelector('form')
    if (!form || !form.parentNode) return

    const card = document.createElement('section')
    card.setAttribute('data-lien-store-identity-v402', '')
    card.setAttribute('aria-label', '店舗固有コード')
    card.innerHTML = '<div class="lien-store-id-v402__intro"><span class="lien-store-id-v402__mark" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10h18M5 10v11h14V10M4 3h16l2 7H2l2-7Zm5 18v-6h6v6"/></svg></span><div><p>店舗アカウント</p><h2 data-store-name>店舗情報</h2><span>お客様が店舗を登録するときに使用する、この店舗専用のコードです。</span></div></div><div class="lien-store-id-v402__code"><div data-store-qr aria-hidden="true"></div><div class="lien-store-id-v402__value"><span>店舗固有コード</span><strong data-store-code>読み込み中...</strong><button type="button" data-copy-store-code disabled>コードをコピー</button></div></div>'
    form.parentNode.insertBefore(card, form)

    if (!document.getElementById('lien-store-identity-v402-styles')) {
      const style = document.createElement('style')
      style.id = 'lien-store-identity-v402-styles'
      style.textContent = '.lien-store-id-v402{display:grid}.lien-store-id-v402__intro{display:flex;min-width:0;align-items:flex-start;gap:16px}.lien-store-id-v402__mark{display:grid;width:48px;height:48px;flex:0 0 48px;place-items:center;border-radius:16px;background:var(--lien-primary,#8f4f42);color:#fff;box-shadow:0 8px 20px rgba(91,51,44,.14)}.lien-store-id-v402__mark svg{width:21px;height:21px}.lien-store-id-v402__intro p,.lien-store-id-v402__code span{margin:0;color:var(--lien-primary,#8f4f42);font-size:11px;font-weight:800}.lien-store-id-v402__intro h2{margin:4px 0 0;color:var(--lien-ink,#2f2a25);font-size:18px;line-height:1.35}.lien-store-id-v402__intro div>span{display:block;margin-top:7px;color:var(--lien-muted,#7c7168);font-size:12px;line-height:1.7}.lien-store-id-v402__code{display:flex;align-items:center;gap:14px;border:1px solid var(--lien-border,#e8ded2);border-radius:18px;background:rgba(255,255,255,.92);padding:12px;box-shadow:0 5px 18px rgba(47,42,37,.06)}.lien-store-id-v402__code [data-store-qr]{display:grid;width:78px;height:78px;flex:0 0 78px;place-items:center;overflow:hidden;border-radius:12px;background:#fff}.lien-store-id-v402__code [data-store-qr] svg{display:block;width:78px;height:78px}.lien-store-id-v402__value{min-width:0}.lien-store-id-v402__value strong{display:block;margin-top:5px;color:var(--lien-primary-dark,#5b332c);font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:17px;letter-spacing:.06em;white-space:nowrap}.lien-store-id-v402__value button{min-height:42px;margin-top:9px;border:1px solid var(--lien-border,#e8ded2);border-radius:999px;background:#fff;padding:0 15px;color:var(--lien-ink,#2f2a25);font:700 12px/1 system-ui,sans-serif;cursor:pointer}.lien-store-id-v402__value button:hover{background:var(--lien-surface-soft,#f6efe6)}[data-lien-store-identity-v402]{display:grid;gap:20px;border:1px solid #dfd1c5;border-radius:24px;background:linear-gradient(135deg,#fff 0%,#fbf6f1 58%,#f4ebe3 100%);padding:20px;box-shadow:0 16px 38px rgba(47,42,37,.07)}@media(min-width:760px){[data-lien-store-identity-v402]{grid-template-columns:minmax(0,1fr) auto;align-items:center;padding:24px}}@media(max-width:480px){.lien-store-id-v402__code{align-items:flex-start}.lien-store-id-v402__code [data-store-qr]{width:68px;height:68px;flex-basis:68px}.lien-store-id-v402__code [data-store-qr] svg{width:68px;height:68px}.lien-store-id-v402__value strong{font-size:14px;letter-spacing:.03em}}'
      document.head.appendChild(style)
    }

    try {
      const payload = await jsonRequest('/api/admin/store-qr')
      card.querySelector('[data-store-name]').textContent = payload.name || '店舗情報'
      card.querySelector('[data-store-code]').textContent = payload.publicCode
      card.querySelector('[data-store-qr]').innerHTML = payload.svg || ''
      const button = card.querySelector('[data-copy-store-code]')
      button.disabled = false
      button.addEventListener('click', async () => {
        await navigator.clipboard.writeText(payload.publicCode)
        button.textContent = 'コピーしました'
        window.setTimeout(() => { button.textContent = 'コードをコピー' }, 2000)
      })
    } catch (error) {
      card.querySelector('[data-store-code]').textContent = 'コードを確認できませんでした'
      card.querySelector('[data-store-qr]').remove()
    }
  }

`

workflows = replaceOnce(
  workflows,
  '  function removeStoreCodeFromProductDialogs() {',
  identityFunction + '  function removeStoreCodeFromProductDialogs() {',
  'store identity settings card',
)

workflows = replaceOnce(
  workflows,
  `    initCustomerChat()
    removeStoreCodeFromProductDialogs()`,
  `    initCustomerChat()
    initStoreIdentityCard().catch(() => {})
    removeStoreCodeFromProductDialogs()`,
  'store identity boot hook',
)

fs.writeFileSync(workflowsPath, workflows)

console.log('store public code v402 runtime patched')
