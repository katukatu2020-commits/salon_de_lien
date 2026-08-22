import fs from 'node:fs'

const file = '/app/platform-operator.js'
let source = fs.readFileSync(file, 'utf8')

function replaceOnce(before, after, label) {
  const matches = source.split(before).length - 1
  if (matches !== 1) throw new Error(`${label}: expected 1 match, found ${matches}`)
  source = source.replace(before, after)
}

replaceOnce(
  `    const withdrawn = Boolean(row.deletedAt)\n    return '<tr><td><div class="storeName">' + escapeHtml(row.name)`,
  `    const withdrawn = Boolean(row.deletedAt)\n    const storeHidden = Boolean(row.storeHiddenAt)\n    return '<tr><td><div class="storeName">' + escapeHtml(row.name)`,
  'customer registry visibility state',
)

replaceOnce(
  `+ '</span></td><td>' + formatDate(row.createdAt, true)`,
  `+ '</span><div class="slug" style="margin-top:6px">' + (storeHidden ? '店舗から非表示' : '店舗に表示中') + '</div></td><td>' + formatDate(row.createdAt, true)`,
  'customer registry visibility badge',
)

replaceOnce(
  `店舗画面から除外された退会済み顧客も、退会日時を付けて運営者権限で保全・確認します。`,
  `退会済み・店舗から非表示の顧客も削除せず、状態を分けて運営者権限で保全・確認します。`,
  'customer registry description',
)

replaceOnce(
  `  const withdrawn = Boolean(row.deletedAt)\n  const item = function`,
  `  const withdrawn = Boolean(row.deletedAt)\n  const storeHidden = Boolean(row.storeHiddenAt)\n  const item = function`,
  'customer record visibility state',
)

replaceOnce(
  `    (withdrawn ? '<section class="notice" style="margin-top:20px">この顧客は ' + escapeHtml(formatDate(row.deletedAt, true)) + ' に退会しました。店舗側の顧客一覧・検索・カルテ・チャットには表示されません。履歴は運営者確認用として保持されています。</section>' : '') +\n    '<section class="sectionGrid">`,
  `    (withdrawn ? '<section class="notice" style="margin-top:20px">この顧客は ' + escapeHtml(formatDate(row.deletedAt, true)) + ' に退会しました。店舗側の顧客一覧・検索・カルテ・チャットには表示されません。履歴は運営者確認用として保持されています。</section>' : '') +\n    (storeHidden && !withdrawn ? '<section class="notice" style="margin-top:20px">この顧客は登録店舗の顧客一覧・カルテで非表示です。顧客アカウント、予約・会計・施術履歴は保持されています。</section>' : '') +\n    '<section class="sectionGrid">`,
  'customer record visibility notice',
)

replaceOnce(
  `item('退会日時', formatDate(row.deletedAt, true)) + '</div></article>'`,
  `item('退会日時', formatDate(row.deletedAt, true)) + item('店舗表示状態', storeHidden ? '店舗から非表示' : '店舗に表示中') + '</div></article>'`,
  'customer record visibility field',
)

replaceOnce(
  `SELECT c."id",c."name",c."phone",c."createdAt",c."deletedAt",c."organizationId"`,
  `SELECT c."id",c."name",c."phone",c."createdAt",c."deletedAt",c."storeHiddenAt",c."organizationId"`,
  'customer registry storeHiddenAt selection',
)

replaceOnce(
  `SELECT c."id",c."name",c."gender",c."birthDate",c."phone",c."createdAt",c."deletedAt",c."organizationId"`,
  `SELECT c."id",c."name",c."gender",c."birthDate",c."phone",c."createdAt",c."deletedAt",c."storeHiddenAt",c."organizationId"`,
  'customer record storeHiddenAt selection',
)

fs.writeFileSync(file, source)
