import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const releaseRoot = path.dirname(fileURLToPath(import.meta.url))
const changes = []

function target(file) { return path.join(root, file) }
function read(file) { return fs.readFileSync(target(file), 'utf8') }

function replaceExact(file, before, after) {
  const source = read(file)
  if (source.split(before).length !== 2) throw new Error(`Unexpected v653 parent anchor: ${file} / ${before.slice(0, 140)}`)
  fs.writeFileSync(target(file), source.replace(before, after))
  changes.push(file)
}

const membershipSource = fs.readFileSync(path.join(releaseRoot, 'customer-store-unlink-v654.js'), 'utf8')
fs.writeFileSync(target('customer-store-unlink-v654.js'), membershipSource)
changes.push('customer-store-unlink-v654.js')

const links = 'customer-links-v293.js'
replaceExact(
  links,
  "const customerStoreMembershipV642 = require('./customer-store-membership-v642.js') /* customer-store-limit-v642 */",
  "const customerStoreMembershipV654 = require('./customer-store-unlink-v654.js') /* customer-store-unlink-v654 */",
)
for (const anchor of [
  'customerStoreMembershipV642.ensureSchema',
  'customerStoreMembershipV642.prepareLink',
  'customerStoreMembershipV642.availableStores',
  'customerStoreMembershipV642.MAX_STORES',
  'customerStoreMembershipV642.unlinkStore',
]) {
  const source = read(links)
  if (!source.includes(anchor)) throw new Error(`Missing v642 membership reference: ${anchor}`)
  fs.writeFileSync(target(links), source.replaceAll(anchor, anchor.replace('customerStoreMembershipV642', 'customerStoreMembershipV654')))
  changes.push(links)
}

replaceExact(
  links,
  `      await customerGlobalProfile.synchronizeAppUser(tx, appUserId)
      return { customerId: persisted[0].customerId, alreadyLinked: false, name: source.name }`,
  `      const primary = await customerStoreMembershipV654.promoteLinkedStore(tx, {
        appUserId,
        organizationId,
        customerId: persisted[0].customerId,
      })
      await customerGlobalProfile.synchronizeAppUser(tx, appUserId)
      return {
        customerId: persisted[0].customerId,
        alreadyLinked: false,
        name: source.name,
        becamePrimary: primary.promoted,
        subject: primary.subject,
      }`,
)

replaceExact(
  links,
  `      const result = await linkMemberToOrganization(session.userId, organizations[0].id)
      if (!result.alreadyLinked) await notifyLinkedCustomer(organizations[0].id, result.customerId, result.name)
      return json(res, result.alreadyLinked ? 200 : 201, { ok: true, alreadyLinked: result.alreadyLinked, maxStores: customerStoreMembershipV654.MAX_STORES })`,
  `      const result = await linkMemberToOrganization(session.userId, organizations[0].id)
      if (!result.alreadyLinked) await notifyLinkedCustomer(organizations[0].id, result.customerId, result.name)
      let redirect = null
      if (result.becamePrimary) {
        const signed = signCustomerSession(session, result.subject, result.customerId, organizations[0].id)
        res.setHeader('Set-Cookie', \`lien_customer_session=\${encodeURIComponent(signed.token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=\${signed.maxAge}\`)
        redirect = '/u/home'
      }
      return json(res, result.alreadyLinked ? 200 : 201, { ok: true, alreadyLinked: result.alreadyLinked, redirect, maxStores: customerStoreMembershipV654.MAX_STORES })`,
)

replaceExact(
  links,
  `      let redirect = '/u/stores'
      if (result.removesCurrent && result.replacement) {
        const signed = signCustomerSession(session, result.subject, result.replacement.customerId, result.replacement.organizationId)
        res.setHeader('Set-Cookie', \`lien_customer_session=\${encodeURIComponent(signed.token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=\${signed.maxAge}\`)
        redirect = '/u/home'
      }
      return json(res, 200, { ok: true, removed: true, switched: result.removesCurrent, redirect, storeCount: result.remainingCount, maxStores: customerStoreMembershipV654.MAX_STORES })`,
  `      let redirect = result.storeSelectionRequired ? '/u/stores?removed=1' : '/u/stores'
      if (result.removesCurrent && result.replacement) {
        const signed = signCustomerSession(session, result.subject, result.replacement.customerId, result.replacement.organizationId)
        res.setHeader('Set-Cookie', \`lien_customer_session=\${encodeURIComponent(signed.token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=\${signed.maxAge}\`)
        redirect = '/u/home'
      }
      return json(res, 200, {
        ok: true,
        removed: true,
        switched: result.removesCurrent && Boolean(result.replacement),
        storeSelectionRequired: result.storeSelectionRequired,
        redirect,
        storeCount: result.remainingCount,
        maxStores: customerStoreMembershipV654.MAX_STORES,
      })`,
)

replaceExact(links, '    const canRemove = rows.length > 1\n', '')
replaceExact(
  links,
  `<button class="registered-store-remove" type="button" data-remove-store="\${escapeHtml(store.organizationId)}" data-store-name="\${escapeHtml(store.name)}"\${canRemove ? '' : ' disabled title="最後の1店舗は解除できません"'}>登録を解除</button>`,
  `<button class="registered-store-remove" type="button" data-remove-store="\${escapeHtml(store.organizationId)}" data-store-name="\${escapeHtml(store.name)}" data-last-store="\${rows.length === 1 ? 'true' : 'false'}">登録を解除</button>`,
)
replaceExact(
  links,
  `    const body = \`<section class="page-title registered-store-title"><div><h1>登録済みの店舗</h1><p>利用する美容室の切り替えや、新しい店舗の追加ができます。</p></div><span class="registered-store-count" aria-label="登録店舗数">\${rows.length} / \${maxStores}</span></section>`,
  `    const removalNotice = url.searchParams.get('removed') === '1'
      ? '<p class="registered-store-notice" role="status">店舗の登録を解除しました。続けて利用する場合は、新しい店舗を登録してください。</p>'
      : url.searchParams.get('storeRequired') === '1'
        ? '<p class="registered-store-notice" role="status">利用する店舗を登録してください。</p>'
        : ''
    const body = \`<section class="page-title registered-store-title"><div><h1>登録済みの店舗</h1><p>利用する美容室の切り替えや、新しい店舗の追加ができます。</p></div><span class="registered-store-count" aria-label="登録店舗数">\${rows.length} / \${maxStores}</span></section>\${removalNotice}`,
)
replaceExact(
  links,
  `.registered-store-empty{border:1px dashed var(--line);border-radius:8px;padding:26px;color:var(--muted);text-align:center}`,
  `.registered-store-empty{border:1px dashed var(--line);border-radius:8px;padding:26px;color:var(--muted);text-align:center}.registered-store-notice{max-width:804px;margin:0 auto 14px;border:1px solid #c7dccd;border-radius:8px;background:#f3f9f4;padding:12px 14px;color:#315f40;font-size:11px;font-weight:700;line-height:1.7}`,
)

replaceExact(
  links,
  `  async function handle(req, res, url) {`,
  `  async function guardStoreSelection(req, res, url) {
    if (!['GET', 'HEAD'].includes(req.method || 'GET')) return false
    if (!/^\\/u(?:\\/|$)/.test(url.pathname) || ['/u/stores', '/u/login'].includes(url.pathname)) return false
    const session = await customerSessionProvider(req)
    if (!session || !await customerStoreMembershipV654.sessionStoreIsExcluded(prisma, session)) return false
    res.statusCode = 303
    res.setHeader('Location', '/u/stores?storeRequired=1')
    res.setHeader('Cache-Control', 'private, no-store, max-age=0')
    res.end()
    return true
  }

  async function handle(req, res, url) {`,
)
replaceExact(
  links,
  '  return { ensureSchema, handle, customerPublicCode, membershipMarkup }',
  '  return { ensureSchema, handle, guardStoreSelection, customerPublicCode, membershipMarkup }',
)

const client = 'customer-link-ui-v293.js'
replaceExact(
  client,
  `            toast(saved.alreadyLinked ? 'この店舗は登録済みです。' : '店舗を登録しました。')
            location.reload()`,
  `            toast(saved.alreadyLinked ? 'この店舗は登録済みです。' : '店舗を登録しました。')
            if (saved.redirect) location.assign(saved.redirect)
            else location.reload()`,
)
replaceExact(
  client,
  `      const storeName = button.dataset.storeName || 'この店舗'
      if (!window.confirm(\`\${storeName}の登録を解除しますか？\\n来店履歴など店舗側の顧客データは削除されません。\`)) return`,
  `      const storeName = button.dataset.storeName || 'この店舗'
      const finalStoreNote = button.dataset.lastStore === 'true'
        ? '\\n解除後は、新しい店舗を登録するまで店舗機能を利用できません。'
        : ''
      if (!window.confirm(\`\${storeName}の登録を解除しますか？\\n来店履歴など店舗側の顧客データは削除されません。\${finalStoreNote}\`)) return`,
)
replaceExact(
  client,
  `        if (result.switched) location.assign(result.redirect || '/u/home')
        else location.reload()`,
  `        if (result.redirect) location.assign(result.redirect)
        else location.reload()`,
)
replaceExact('customer-runtime-v267.js', '/customer-link-ui-v293.js?v=642-store-limit1', '/customer-link-ui-v293.js?v=654-store-unlink1')
replaceExact('commercial-admin-v101.js', '/customer-link-ui-v293.js?v=642-store-limit1', '/customer-link-ui-v293.js?v=654-store-unlink1')

const readinessAnchor = "      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Dealer-Password-Common-Layout', 'v653') /* dealer-password-common-layout-v653-ready */"
replaceExact(
  'server.js',
  readinessAnchor,
  readinessAnchor + "\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Customer-Store-Unlink', 'v654') /* customer-store-unlink-v654-ready */",
)
replaceExact(
  'server.js',
  "      if (url.pathname.startsWith('/u/')) res.setHeader('Cache-Control', 'private, no-store, max-age=0')",
  `      if (url.pathname.startsWith('/u/')) res.setHeader('Cache-Control', 'private, no-store, max-age=0')
      if (await customerLinks.guardStoreSelection(req, res, url)) return /* customer-store-unlink-v654-guard */`,
)

fs.writeFileSync('/tmp/customer-store-unlink-v654-changes.json', JSON.stringify(changes))
console.log(JSON.stringify({ release: 'customer-store-unlink-v654', changedFiles: [...new Set(changes)], changes: changes.length }))
