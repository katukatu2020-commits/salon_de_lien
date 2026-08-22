import fs from 'node:fs'

const source = fs.readFileSync('/app/platform-operator.js', 'utf8')
const required = [
  `item('ログインID', row.loginId || '未発行')`,
  `u."loginId",u."email"`,
  `SELECT x."loginId",x."email",x."active" FROM "AppUser"`,
]

for (const marker of required) {
  if (!source.includes(marker)) throw new Error(`platform customer login ID marker missing: ${marker}`)
}
