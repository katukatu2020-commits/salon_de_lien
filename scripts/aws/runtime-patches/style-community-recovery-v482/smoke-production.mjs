import assert from 'node:assert/strict'

const baseUrl = process.env.SMOKE_BASE_URL || 'https://salon-de-lien.com'

function cookie(response) {
  return (response.headers.get('set-cookie') || '').split(';')[0]
}

const ready = await fetch(`${baseUrl}/api/health/ready`, { headers: { 'Cache-Control': 'no-cache' } })
assert.equal(ready.status, 200)

const login = await fetch(`${baseUrl}/api/auth/login`, {
  method: 'POST',
  redirect: 'manual',
  headers: { Origin: baseUrl, 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ email: 'demo.owner', password: 'LienDemo2026!', next: '/admin/community' }),
})
assert.equal(login.status, 303)
const sessionCookie = cookie(login)

const postsResponse = await fetch(`${baseUrl}/api/lien-content-management?audience=staff&scope=posts`, {
  headers: { cookie: sessionCookie, 'Cache-Control': 'no-cache' },
})
assert.equal(postsResponse.status, 200)
const payload = await postsResponse.json()
const historicalPostIds = [
  'cmt7d8s3l002gb2w0b3gvcnfm',
  'community-post-cbce37ed-0700-4235-b91b-53126f9b2da1',
  ...Array.from({ length: 10 }, (_, index) => `showcase-yohaku-community-post-${String(index + 1).padStart(3, '0')}`),
]
const postsById = new Map(payload.posts.map(post => [post.id, post]))
assert.ok(payload.posts.length >= historicalPostIds.length)
for (const postId of historicalPostIds) {
  assert.ok(postsById.has(postId), `historical post is missing: ${postId}`)
  assert.ok(postsById.get(postId).coverPhotoUrl, `historical image is missing: ${postId}`)
  const imageUrl = new URL(postsById.get(postId).coverPhotoUrl, baseUrl)
  const image = await fetch(imageUrl, { headers: { 'Cache-Control': 'no-cache' } })
  assert.equal(image.status, 200, `historical image is unavailable: ${postId}`)
  assert.match(image.headers.get('content-type') || '', /^image\//, `historical asset is not an image: ${postId}`)
  await image.body?.cancel()
}

const page = await fetch(`${baseUrl}/admin/community?smoke=v482`, {
  headers: { cookie: sessionCookie, 'Cache-Control': 'no-cache' },
})
assert.equal(page.status, 200)
const html = await page.text()
assert.match(html, /content-edit-delete-client-v482\.js/)
assert.match(html, /data-lien-community-bootstrap="v482"/)
for (const postId of historicalPostIds) assert.ok(html.includes(postId), `SSR post is missing: ${postId}`)

const client = await fetch(`${baseUrl}/content-edit-delete-client-v482.js?smoke=v482`, {
  headers: { 'Cache-Control': 'no-cache' },
})
assert.equal(client.status, 200)
const source = await client.text()
assert.match(source, /grid\.replaceChildren\(\.\.\.publicCards, \.\.\.supplementalCards\)/)
assert.match(source, /useStableCommunityNavigation/)
assert.match(source, /data-lien-style-grid-managed-v482/)

const sharedAdmin = await fetch(`${baseUrl}/admin-staff-experience-v276.js?smoke=v482`, {
  headers: { 'Cache-Control': 'no-cache' },
})
assert.equal(sharedAdmin.status, 200)
const sharedSource = await sharedAdmin.text()
assert.match(sharedSource, /__lienStyleCommunityLoaderV482/)
assert.match(sharedSource, /content-edit-delete-client-v482\.js/)

console.log('style community route, merge, and asset production smoke passed')
