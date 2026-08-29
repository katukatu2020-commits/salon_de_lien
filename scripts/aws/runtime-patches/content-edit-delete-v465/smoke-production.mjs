import assert from 'node:assert/strict'

const baseUrl = String(process.env.BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')

async function fetchChecked(path, expectedStatus, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, { redirect: 'manual', ...options })
  assert.equal(response.status, expectedStatus, `${path}: expected ${expectedStatus}, received ${response.status}`)
  return response
}

const script = await fetchChecked('/content-edit-delete-client-v465.js', 200)
const source = await script.text()
assert.match(source, /window\.__lienContentEditDeleteV465/)
assert.match(source, /\/api\/lien-chat-message/)
assert.equal(script.headers.get('x-content-type-options'), 'nosniff')

const contentApi = await fetchChecked('/api/lien-content-management?audience=customer&postId=missing', 401)
assert.match(await contentApi.text(), /ログインが必要/)
const chatApi = await fetchChecked('/api/lien-chat-message?audience=staff', 401, { method: 'PATCH', headers: { Origin: baseUrl, 'Content-Type': 'application/json' }, body: '{}' })
assert.match(await chatApi.text(), /ログインが必要/)

for (const path of ['/admin/login', '/u/login']) {
  const response = await fetch(`${baseUrl}${path}`, { redirect: 'manual' })
  assert.ok([200, 307, 308].includes(response.status), `${path}: unexpected ${response.status}`)
}

console.log(`content edit/delete v465 production smoke passed (${baseUrl})`)
