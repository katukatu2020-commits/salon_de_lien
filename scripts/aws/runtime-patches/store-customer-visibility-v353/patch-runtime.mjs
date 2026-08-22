import fs from 'node:fs'

function replaceExact(file, before, after, expected = 1) {
  let source = fs.readFileSync(file, 'utf8')
  const matches = source.split(before).length - 1
  if (matches !== expected) {
    throw new Error(`${file}: expected ${expected} matches, found ${matches}: ${before.slice(0, 100)}`)
  }
  source = source.split(before).join(after)
  fs.writeFileSync(file, source)
}

const schemaFile = '/app/prisma/schema.prisma'
replaceExact(
  schemaFile,
  '  deletedAt             DateTime?\n',
  '  deletedAt             DateTime?\n  storeHiddenAt          DateTime?\n',
)
replaceExact(
  schemaFile,
  '  @@index([organizationId, deletedAt])\n',
  '  @@index([organizationId, deletedAt])\n  @@index([organizationId, storeHiddenAt, deletedAt])\n',
)

replaceExact(
  '/app/.next/server/chunks/1608.js',
  'data: { deletedAt: new Date() },',
  'data: { storeHiddenAt: new Date() }, /* store-customer-visibility-v353 */',
)
replaceExact(
  '/app/.next/server/chunks/2241.js',
  'where:{id:e},data:{deletedAt:new Date}',
  'where:{id:e},data:{storeHiddenAt:new Date}/* store-customer-visibility-v353 */',
)
replaceExact(
  '/app/.next/server/chunks/1425.js',
  'where: { id: e, organizationId: n.organizationId, deletedAt: null },',
  'where: { id: e, organizationId: n.organizationId, deletedAt: null, storeHiddenAt: null }, /* store-customer-visibility-v353 */',
)
replaceExact(
  '/app/.next/server/chunks/3244.js',
  'organizationId: F.organizationId ?? void 0,\n                deletedAt: null,',
  'organizationId: F.organizationId ?? void 0,\n                deletedAt: null,\n                storeHiddenAt: null, /* store-customer-visibility-v353 */',
)
replaceExact(
  '/app/.next/server/chunks/3491.js',
  'deletedAt:null,organizationId:t.organizationId??void 0',
  'deletedAt:null,storeHiddenAt:null,organizationId:t.organizationId??void 0',
  2,
)

const customerPageFile = '/app/.next/server/chunks/3244.js'
const labels = [
  ['children: "削除",', 'children: "店舗から非表示",'],
  ['顧客情報の削除', '店舗の顧客一覧から非表示'],
  [
    'この顧客を削除すると、顧客一覧とお客様アプリから表示されなくなります。施術履歴などの関連データは復旧や確認のためDB上に保持されます。',
    'この店舗の顧客一覧・カルテからのみ非表示にします。顧客アカウント、他店舗のカルテ、予約・会計・施術履歴は削除されません。',
  ],
  ['論理削除', '店舗のみ非表示'],
  ['さんの顧客情報を削除することを確認しました。', 'さんを、この店舗の顧客一覧から非表示にすることを確認しました。'],
  ['"顧客情報を削除",', '"この店舗から非表示にする",'],
]

for (const [before, after] of labels) {
  replaceExact(customerPageFile, before, after)
}
