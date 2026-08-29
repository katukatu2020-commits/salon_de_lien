import assert from 'node:assert/strict'
import fs from 'node:fs'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const route = fs.readFileSync(`${root}/.next/server/app/api/auth/password-reset/request/route.js`, 'utf8')
const page = fs.readFileSync(`${root}/.next/server/app/u/password-reset/page.js`, 'utf8')

assert.equal((route.match(/customer:\{is:\{deletedAt:null\}\}/g) || []).length, 1)
assert.equal((route.match(/account-not-found/g) || []).length, 1)
assert.ok(route.indexOf('appUser.findFirst') < route.indexOf('m.get(s)'))
assert.equal((page.match(/このメールアドレスに一致する登録情報はありません/g) || []).length, 1)
assert.equal((page.match(/accountNotFound:e\?\.error==="account-not-found"/g) || []).length, 1)

console.log('customer password-reset v464 runtime tests passed')
