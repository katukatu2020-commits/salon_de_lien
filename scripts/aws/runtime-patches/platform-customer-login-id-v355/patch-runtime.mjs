import fs from 'node:fs'

const file = '/app/platform-operator.js'
let source = fs.readFileSync(file, 'utf8')

function replaceOnce(before, after, label) {
  const matches = source.split(before).length - 1
  if (matches !== 1) throw new Error(`${label}: expected 1 match, found ${matches}`)
  source = source.replace(before, after)
}

replaceOnce(
  `item('生年月日', formatDate(row.birthDate)) + item('メールアドレス', row.email)`,
  `item('生年月日', formatDate(row.birthDate)) + item('ログインID', row.loginId || '未発行') + item('メールアドレス', row.email)`,
  'customer record login id field',
)

replaceOnce(
  `o."name" AS "organizationName",u."email",COALESCE(u."active",FALSE) AS "appUserActive"`,
  `o."name" AS "organizationName",u."loginId",u."email",COALESCE(u."active",FALSE) AS "appUserActive"`,
  'customer record login id selection',
)

replaceOnce(
  `LEFT JOIN LATERAL (SELECT x."email",x."active" FROM "AppUser" x WHERE x."customerId"=c."id"`,
  `LEFT JOIN LATERAL (SELECT x."loginId",x."email",x."active" FROM "AppUser" x WHERE x."customerId"=c."id"`,
  'customer record app user login id join',
)

fs.writeFileSync(file, source)
