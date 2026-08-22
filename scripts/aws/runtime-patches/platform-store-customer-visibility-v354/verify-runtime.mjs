import fs from 'node:fs'

const source = fs.readFileSync('/app/platform-operator.js', 'utf8')
const required = [
  'const storeHidden = Boolean(row.storeHiddenAt)',
  '店舗から非表示',
  '店舗に表示中',
  '顧客アカウント、予約・会計・施術履歴は保持されています。',
  'item(\'店舗表示状態\'',
  'c."storeHiddenAt"',
]

for (const text of required) {
  if (!source.includes(text)) throw new Error(`platform visibility marker missing: ${text}`)
}

if ((source.match(/c\."storeHiddenAt"/g) || []).length < 2) {
  throw new Error('platform customer registry and record must both load storeHiddenAt')
}
