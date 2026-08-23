import fs from 'node:fs'

const chunkPaths = [
  '/app/.next/server/chunks/1597.js',
  '/app/.next/server/chunks/2241.js',
  '/app/.next/server/chunks/8043.js',
]

const directStoreOnlyAuth = /let t=await ([a-z])\._\.appUser\.findFirst\(\{where:\{id:e\.userId,loginId:e\.subject,role:"CUSTOMER",active:!0,customerId:e\.customerId,organizationId:e\.organizationId,customer:\{id:e\.customerId,organizationId:e\.organizationId,deletedAt:null\}\},select:\{id:!0,customerId:!0,organizationId:!0,customer:\{select:\{id:!0,name:!0\}\}\}\}\);return t\?\.customerId&&t\.organizationId&&t\.customer\?\{\.\.\.e,customer:t\.customer\}:null/g

const linkedStoreAuth = (_, prismaVariable) => `let[t]=await ${prismaVariable}._.$queryRawUnsafe(\`SELECT c."id",c."name" FROM "AppUser" u JOIN "Customer" c ON c."id"=$3 AND c."organizationId"=$4 AND c."deletedAt" IS NULL LEFT JOIN "CustomerStoreLink" l ON l."appUserId"=u."id" AND l."organizationId"=c."organizationId" AND l."customerId"=c."id" WHERE u."id"=$1 AND LOWER(COALESCE(NULLIF(u."loginId",''),u."email"))=$2 AND u."role"='CUSTOMER' AND u."active"=TRUE AND ((u."customerId"=c."id" AND u."organizationId"=c."organizationId") OR l."id" IS NOT NULL) LIMIT 1\`,e.userId,e.subject,e.customerId,e.organizationId);return t?{...e,customer:t}:null`

for (const chunkPath of chunkPaths) {
  let source = fs.readFileSync(chunkPath, 'utf8')
  const matches = [...source.matchAll(directStoreOnlyAuth)]
  if (matches.length !== 1) {
    throw new Error(`${chunkPath}: expected one direct-store auth implementation, found ${matches.length}`)
  }
  source = source.replace(directStoreOnlyAuth, linkedStoreAuth)
  fs.writeFileSync(chunkPath, source)
}

console.log('customer store navigation session v414 runtime patched')
