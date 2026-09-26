'use strict'

const base = require('./orimia-store-directory-v670.js')

function compareVisits(left, right) {
  return right.visitCount - left.visitCount || left.name.localeCompare(right.name, 'ja') || left.organizationId.localeCompare(right.organizationId)
}

async function availableStores(prisma, session) {
  const stores = await base.availableStores(prisma, session)
  // UNION prevents a customer linked through multiple ownership records being counted twice.
  const counts = await prisma.$queryRawUnsafe(`WITH account AS (
      SELECT "id","organizationId","customerId","email" FROM "AppUser"
      WHERE "id"=$1 AND "role"='CUSTOMER' AND "active"=TRUE
    ), owned AS (
      SELECT "organizationId","customerId" FROM account
      UNION
      SELECT l."organizationId",l."customerId" FROM "CustomerStoreLink" l JOIN account a ON a."id"=l."appUserId"
      UNION
      SELECT x."organizationId",x."customerId" FROM "CustomerStoreExclusion" x JOIN account a ON a."id"=x."appUserId"
      UNION
      SELECT i."organizationId",i."customerId" FROM "CustomerRegistrationInvite" i
      JOIN account a ON LOWER(i."email")=LOWER(a."email")
      WHERE i."usedAt" IS NOT NULL AND i."customerId" IS NOT NULL
    )
    SELECT c."organizationId",COUNT(v."id")::int AS "visitCount"
    FROM owned o JOIN "Customer" c ON c."id"=o."customerId" AND c."organizationId"=o."organizationId" AND c."deletedAt" IS NULL
    JOIN "Visit" v ON v."customerId"=c."id" AND v."visitedAt" <= (NOW() AT TIME ZONE 'UTC')
    GROUP BY c."organizationId"`, session.userId)
  const visits = new Map(counts.map(row => [row.organizationId, Number(row.visitCount)]))
  return stores.map(store => ({ ...store, visitCount: visits.get(store.organizationId) || 0 })).sort(compareVisits)
}

function groupStores(stores) {
  return base.groupStores(stores).map(group => ({ ...group, stores: group.stores.sort(compareVisits) }))
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
}

function renderDirectory(stores) {
  const rows = [...stores].sort(compareVisits)
  const extra = [...new Set(rows.map(store => store.prefecture))].filter(name => !base.PREFECTURES.includes(name)).sort()
  const options = [...base.PREFECTURES, ...extra].map(name => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join('')
  const cards = rows.map(store => `<article class="orimia-store-card${store.current ? ' current' : ''}" data-prefecture="${escapeHtml(store.prefecture)}" data-organization-id="${escapeHtml(store.organizationId)}">
    <span class="orimia-store-mark" data-fallback="${escapeHtml(store.name.slice(0, 1))}"><img src="/api/lien-store-icon?organizationId=${encodeURIComponent(store.organizationId)}" alt="" width="64" height="64" loading="lazy" decoding="async"></span>
    <div class="orimia-store-copy"><span class="orimia-store-prefecture">${escapeHtml(store.prefecture)}</span><h2>${escapeHtml(store.name)}</h2><p>${escapeHtml([store.city, store.addressLine1].filter(Boolean).join(' ') || '住所未設定')}</p>${store.phone ? `<small>${escapeHtml(store.phone)}</small>` : ''}<span class="orimia-store-visits">来店 ${store.visitCount.toLocaleString('ja-JP')}回</span></div>
    <div class="orimia-store-action">${store.current ? '<span class="orimia-store-current">利用中</span>' : `<button class="orimia-store-select" type="button" data-select-orimia-store="${escapeHtml(store.organizationId)}" aria-label="${escapeHtml(store.name)}を利用する">この店舗を見る</button>`}</div>
  </article>`).join('')
  return `<link rel="stylesheet" href="/salon-directory-ranking-v673.css">
    <section class="page-title orimia-directory-title"><div><span class="orimia-directory-eyebrow">ORIMIA SALONS</span><h1>サロンを探す</h1></div><span class="orimia-directory-count">${rows.length.toLocaleString('ja-JP')}店舗</span></section>
    <section class="orimia-directory" data-orimia-store-directory="v670" data-directory-ranking="v673">
      <div class="orimia-directory-toolbar"><div class="orimia-prefecture-field"><label for="orimia-prefecture-filter">都道府県</label><select id="orimia-prefecture-filter" name="prefecture"><option value="">すべての都道府県</option>${options}</select></div><div class="orimia-directory-summary"><span>あなたの来店回数順</span><output data-directory-count aria-live="polite" aria-atomic="true">${rows.length.toLocaleString('ja-JP')}店舗</output></div></div>
      <output id="orimia-store-result" class="orimia-store-result" aria-live="polite"></output>
      <div class="orimia-store-grid">${cards}</div>
      <p class="orimia-store-empty" data-directory-empty${rows.length ? ' hidden' : ''}>${rows.length ? '該当する店舗はありません。' : '現在公開中の店舗はありません。'}</p>
    </section><script src="/salon-directory-ranking-v673-client.js" defer></script>`
}

module.exports = { ...base, availableStores, groupStores, renderDirectory }
