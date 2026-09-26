'use strict'

const baseMembership = require('./customer-store-frequency-v668.js')

const PREFECTURES = [
  '北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県',
  '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県',
  '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県', '静岡県', '愛知県',
  '三重県', '滋賀県', '京都府', '大阪府', '兵庫県', '奈良県', '和歌山県',
  '鳥取県', '島根県', '岡山県', '広島県', '山口県', '徳島県', '香川県', '愛媛県', '高知県',
  '福岡県', '佐賀県', '長崎県', '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県',
]

const prefectureOrder = new Map(PREFECTURES.map((name, index) => [name, index]))
const prefectureAliases = new Map(PREFECTURES.flatMap(name => {
  const aliases = [[name, name]]
  if (/[都府県]$/.test(name)) aliases.push([name.slice(0, -1), name])
  return aliases
}))

function clean(value) {
  return String(value == null ? '' : value).replace(/\s+/g, ' ').trim()
}

function escapeHtml(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character])
}

function prefectureName(value) {
  const name = clean(value)
  return prefectureAliases.get(name) || name || '都道府県未設定'
}

function comparePrefecture(left, right) {
  const leftOrder = prefectureOrder.has(left) ? prefectureOrder.get(left) : Number.MAX_SAFE_INTEGER
  const rightOrder = prefectureOrder.has(right) ? prefectureOrder.get(right) : Number.MAX_SAFE_INTEGER
  return leftOrder - rightOrder || left.localeCompare(right, 'ja')
}

function groupStores(stores) {
  const grouped = new Map()
  for (const store of stores || []) {
    const prefecture = prefectureName(store.prefecture)
    if (!grouped.has(prefecture)) grouped.set(prefecture, [])
    grouped.get(prefecture).push({ ...store, prefecture })
  }
  return [...grouped.entries()]
    .sort(([left], [right]) => comparePrefecture(left, right))
    .map(([prefecture, entries]) => ({
      prefecture,
      stores: entries.sort((left, right) => {
        if (left.current !== right.current) return left.current ? -1 : 1
        return clean(left.name).localeCompare(clean(right.name), 'ja')
      }),
    }))
}

async function ensureSchema(prisma) {
  await baseMembership.ensureSchema(prisma)
  await prisma.$executeRawUnsafe('ALTER TABLE "OrganizationStoreProfile" ADD COLUMN IF NOT EXISTS "orimiaPublished" BOOLEAN NOT NULL DEFAULT TRUE')
  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "OrganizationStoreProfile_orimiaPublished_idx" ON "OrganizationStoreProfile"("orimiaPublished","organizationId")')
}

async function availableStores(prisma, session) {
  await ensureSchema(prisma)
  const rows = await prisma.$queryRawUnsafe(`SELECT o."id" AS "organizationId",o."name",o."publicCode",
      p."prefecture",p."city",p."addressLine1",p."phone",
      (o."id"=$2) AS "current",(l."customerId" IS NOT NULL) AS "linked"
    FROM "Organization" o
    LEFT JOIN "OrganizationStoreProfile" p ON p."organizationId"=o."id"
    LEFT JOIN "CustomerStoreLink" l ON l."organizationId"=o."id" AND l."appUserId"=$1
    WHERE COALESCE(p."orimiaPublished",TRUE)=TRUE
      AND EXISTS (
        SELECT 1 FROM "AppUser" staff
        WHERE staff."organizationId"=o."id" AND staff."active"=TRUE AND staff."role" IN ('ADMIN','STAFF')
      )
    ORDER BY o."name",o."id"`, session.userId, session.organizationId)
  return groupStores(rows.map(row => ({
    organizationId: row.organizationId,
    name: clean(row.name) || '名称未設定のサロン',
    publicCode: clean(row.publicCode),
    prefecture: prefectureName(row.prefecture),
    city: clean(row.city),
    addressLine1: clean(row.addressLine1),
    phone: clean(row.phone),
    current: row.current === true,
    linked: row.linked === true,
    available: true,
  }))).flatMap(group => group.stores)
}

async function storeIsPublished(prisma, organizationId) {
  await ensureSchema(prisma)
  const rows = await prisma.$queryRawUnsafe(`SELECT 1
    FROM "Organization" o
    LEFT JOIN "OrganizationStoreProfile" p ON p."organizationId"=o."id"
    WHERE o."id"=$1 AND COALESCE(p."orimiaPublished",TRUE)=TRUE
      AND EXISTS (
        SELECT 1 FROM "AppUser" staff
        WHERE staff."organizationId"=o."id" AND staff."active"=TRUE AND staff."role" IN ('ADMIN','STAFF')
      )
    LIMIT 1`, organizationId)
  return Boolean(rows[0])
}

function renderDirectory(stores) {
  const groups = groupStores(stores)
  const groupMarkup = groups.map(group => {
    const cards = group.stores.map(store => {
      const location = [store.city, store.addressLine1].filter(Boolean).join(' ')
      const action = store.current
        ? '<span class="orimia-store-current">利用中</span>'
        : `<button class="orimia-store-select" type="button" data-select-orimia-store="${escapeHtml(store.organizationId)}" aria-label="${escapeHtml(store.name)}を利用する">この店舗を見る</button>`
      return `<article class="orimia-store-card${store.current ? ' current' : ''}">
        <span class="orimia-store-mark"><img src="/api/lien-store-icon?organizationId=${encodeURIComponent(store.organizationId)}" alt="" width="64" height="64" loading="lazy" decoding="async" onerror="this.hidden=true;this.parentElement.dataset.fallback='${escapeHtml(store.name.slice(0, 1))}'"></span>
        <div class="orimia-store-copy"><strong>${escapeHtml(store.name)}</strong><p>${escapeHtml(location || '住所未設定')}</p>${store.phone ? `<small>${escapeHtml(store.phone)}</small>` : ''}</div>
        <div class="orimia-store-action">${action}</div>
      </article>`
    }).join('')
    return `<section class="orimia-prefecture-group" aria-labelledby="orimia-prefecture-${escapeHtml(group.prefecture)}">
      <header><h2 id="orimia-prefecture-${escapeHtml(group.prefecture)}">${escapeHtml(group.prefecture)}</h2><span>${group.stores.length}店舗</span></header>
      <div class="orimia-store-grid">${cards}</div>
    </section>`
  }).join('')

  return `<section class="page-title orimia-directory-title"><div><span class="orimia-directory-eyebrow">ORIMIA SALONS</span><h1>サロンを探す</h1><p>ORIMIAで公開中の店舗を、都道府県別に表示しています。</p></div><span class="orimia-directory-count" aria-label="公開店舗数">${Number(stores?.length || 0).toLocaleString('ja-JP')}店舗</span></section>
    <section class="orimia-directory" data-orimia-store-directory="v670">
      <output id="orimia-store-result" class="orimia-store-result" aria-live="polite"></output>
      ${groupMarkup || '<p class="orimia-store-empty">現在公開中の店舗はありません。</p>'}
    </section>
    <style>
      .orimia-directory-title{display:flex;align-items:flex-start;justify-content:space-between;gap:18px}.orimia-directory-title h1{margin-top:4px}.orimia-directory-title p{margin:9px 0 0;color:var(--muted);font-size:12px;line-height:1.8}.orimia-directory-eyebrow{color:var(--rose);font-size:9px;font-weight:900;letter-spacing:0}.orimia-directory-count{display:grid;min-width:76px;min-height:44px;flex:none;place-items:center;border:1px solid var(--line);border-radius:999px;background:#fff;color:#765e55;font-size:13px;font-weight:800}.orimia-directory{width:min(960px,100%);margin:0 auto;padding:18px}.orimia-store-result{display:block;min-height:0;color:#a02f28;font-size:11px;font-weight:700}.orimia-store-result:not(:empty){min-height:42px;margin-bottom:14px;border:1px solid #e6c7c2;border-radius:8px;background:#fff5f4;padding:12px 14px}.orimia-prefecture-group{margin:0 0 26px}.orimia-prefecture-group>header{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px;border-bottom:1px solid var(--line);padding:0 2px 9px}.orimia-prefecture-group h2{margin:0;font-size:17px;letter-spacing:0}.orimia-prefecture-group>header span{color:var(--muted);font-size:10px;font-weight:800}.orimia-store-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.orimia-store-card{display:grid;grid-template-columns:64px minmax(0,1fr);grid-template-rows:auto auto;align-items:center;gap:0 14px;min-width:0;border:1px solid var(--line);border-radius:8px;background:#fff;padding:15px;box-shadow:0 8px 22px rgba(68,47,39,.045)}.orimia-store-card.current{border-color:#dfa8b8;background:#fff8fa}.orimia-store-mark{position:relative;display:grid;width:64px;height:64px;grid-row:1/3;place-items:center;overflow:hidden;border:1px solid #eee0d8;border-radius:8px;background:#f7ebe6;color:#8f4f42;font-size:22px;font-weight:900}.orimia-store-mark[data-fallback]::after{content:attr(data-fallback)}.orimia-store-mark img{display:block;width:64px;height:64px;object-fit:cover}.orimia-store-copy{min-width:0;align-self:end}.orimia-store-copy strong{display:block;overflow-wrap:anywhere;font-size:14px;line-height:1.5}.orimia-store-copy p,.orimia-store-copy small{display:block;margin:4px 0 0;color:var(--muted);font-size:10px;line-height:1.55}.orimia-store-action{align-self:start;margin-top:10px}.orimia-store-select,.orimia-store-current{display:inline-grid;min-height:36px;place-items:center;border-radius:999px;padding:0 14px;font:inherit;font-size:10px;font-weight:900}.orimia-store-select{border:0;background:var(--rose);color:#fff;cursor:pointer}.orimia-store-select:hover{filter:brightness(.97)}.orimia-store-select:focus-visible{outline:3px solid rgba(197,72,107,.23);outline-offset:2px}.orimia-store-select:disabled{cursor:wait;opacity:.55}.orimia-store-current{background:#eaf6ed;color:#356143}.orimia-store-empty{border:1px dashed var(--line);border-radius:8px;background:#fff;padding:34px 18px;color:var(--muted);font-size:12px;text-align:center}
      @media(max-width:680px){.orimia-directory-title{align-items:flex-start}.orimia-directory-title h1{font-size:25px}.orimia-directory-count{min-width:66px;min-height:40px}.orimia-directory{padding:14px}.orimia-store-grid{grid-template-columns:minmax(0,1fr)}.orimia-prefecture-group{margin-bottom:22px}.orimia-store-card{grid-template-columns:58px minmax(0,1fr);padding:14px}.orimia-store-mark,.orimia-store-mark img{width:58px;height:58px}.orimia-store-select,.orimia-store-current{width:100%;min-height:40px}}
    </style>`
}

module.exports = {
  ...baseMembership,
  ensureSchema,
  availableStores,
  storeIsPublished,
  groupStores,
  renderDirectory,
  MAX_STORES: null,
  STORE_LIMITED: false,
}
