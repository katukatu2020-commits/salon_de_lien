const assert = require('node:assert/strict')
const { PrismaClient } = require('/app/node_modules/@prisma/client')
const { S3Client, GetObjectCommand } = require('/app/node_modules/@aws-sdk/client-s3')
const sharp = require('/app/node_modules/sharp')
assert.equal(new URL(process.env.DATABASE_URL).pathname, '/orimia_chat_v589')
assert.equal(process.env.S3_PRIVATE_ASSETS_BUCKET, 'orimia-v600-local')
assert.equal(process.env.AWS_ENDPOINT_URL_S3, 'http://127.0.0.1:9160')
const db = new PrismaClient(), s3 = new S3Client({})
;(async () => {
  const owner = await db.appUser.findFirst({ where: { loginId: 'demo.owner', role: 'ADMIN' } })
  const [row] = await db.$queryRawUnsafe('SELECT "data" FROM "StyleImportJobV596" WHERE "organizationId"=$1', owner.organizationId)
  const job = row.data
  assert.equal(job.status, 'DONE')
  const posts = await db.$queryRawUnsafe('SELECT "id","photoReferences","photoDirections","styleMetadata","sourceUrl","published" FROM "VisitCommunityPost" WHERE "organizationId"=$1 AND "sourceUrl"=ANY($2::text[])', owner.organizationId, job.items.map(i => i.url))
  assert.equal(posts.length, job.items.length)
  let objects = 0
  for (const post of posts) {
    const item = job.items.find(i => i.url === post.sourceUrl)
    assert.equal(post.id, item.postId); assert.equal(post.published, true)
    if (item.data) for (const key of ['title', 'stylistName', 'stylistKana', 'stylistRole', 'stylistComment', 'menuDescription']) assert.equal(post.styleMetadata[key], item.data[key] || '', key)
    assert.equal(post.photoReferences.length, post.photoDirections.length)
    const refs = [...post.photoReferences, ...(post.styleMetadata.stylistPhotoReference ? [post.styleMetadata.stylistPhotoReference] : [])]
    for (const ref of refs) {
      assert.ok(ref.startsWith('s3-private://private/community-posts/'))
      const result = await s3.send(new GetObjectCommand({ Bucket: process.env.S3_PRIVATE_ASSETS_BUCKET, Key: ref.replace('s3-private://', '') }))
      assert.equal(result.ServerSideEncryption, 'AES256')
      const buffer = Buffer.from(await result.Body.transformToByteArray())
      const meta = await sharp(buffer).metadata()
      assert.equal(meta.format, 'jpeg'); assert.ok(meta.width > 0 && meta.height > 0)
      objects++
    }
  }
  console.log(JSON.stringify({ savedStyles: posts.length, decryptedImagesReadBack: objects, metadataMatchesSource: true, published: true, remoteHotlinksStored: false }))
})().catch(error => { console.error(error); process.exitCode = 1 }).finally(() => db.$disconnect())
