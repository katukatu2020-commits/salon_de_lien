import fs from 'node:fs'

function requireText(file, text, label) {
  const source = fs.readFileSync(file, 'utf8')
  if (!source.includes(text)) throw new Error(`${label} is missing from ${file}`)
}

function rejectText(file, text, label) {
  const source = fs.readFileSync(file, 'utf8')
  if (source.includes(text)) throw new Error(`${label} remains in ${file}`)
}

requireText('/app/prisma/schema.prisma', 'storeHiddenAt          DateTime?', 'Customer.storeHiddenAt schema field')
requireText('/app/node_modules/.prisma/client/index.d.ts', 'storeHiddenAt', 'generated Prisma storeHiddenAt field')
requireText('/app/.next/server/chunks/1608.js', 'data: { storeHiddenAt: new Date() }', 'store-only customer hide action')
requireText('/app/.next/server/chunks/2241.js', 'data:{storeHiddenAt:new Date}', 'minified store-only customer hide action')
requireText('/app/.next/server/chunks/1425.js', 'deletedAt: null, storeHiddenAt: null', 'store customer authorization filter')
requireText('/app/.next/server/chunks/3244.js', 'storeHiddenAt: null, /* store-customer-visibility-v353 */', 'customer card visibility filter')
requireText('/app/.next/server/chunks/3491.js', 'deletedAt:null,storeHiddenAt:null,organizationId:', 'customer list visibility filter')
requireText('/app/.next/server/chunks/3244.js', '顧客アカウント、他店舗のカルテ、予約・会計・施術履歴は削除されません。', 'safe hide explanation')
rejectText('/app/.next/server/chunks/1608.js', 'data: { deletedAt: new Date() }', 'customer withdrawal mutation in store action')
rejectText('/app/.next/server/chunks/2241.js', 'where:{id:e},data:{deletedAt:new Date}', 'minified customer withdrawal mutation in store action')
