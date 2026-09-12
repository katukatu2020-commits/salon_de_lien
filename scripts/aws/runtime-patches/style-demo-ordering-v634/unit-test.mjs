import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const {
  StylePostOrderError,
  moveStylePost,
  normalizeStylePostOrder,
} = require('./style-post-order-v634.js')

class FakePrisma {
  constructor(rows) {
    this.rows = rows.map((row, index) => ({ ...row, recency: rows.length - index }))
    this.writes = 0
  }

  async $transaction(callback) {
    return callback(this)
  }

  async $queryRawUnsafe(query) {
    if (query.includes('pg_advisory_xact_lock')) return [{ locked: true }]
    if (query.includes('SELECT p."id", p."displayOrder"')) {
      return [...this.rows]
        .sort((left, right) => {
          const leftValid = Number.isInteger(left.displayOrder) && left.displayOrder > 0
          const rightValid = Number.isInteger(right.displayOrder) && right.displayOrder > 0
          if (leftValid !== rightValid) return leftValid ? -1 : 1
          if (leftValid && left.displayOrder !== right.displayOrder) return left.displayOrder - right.displayOrder
          return right.recency - left.recency || String(right.id).localeCompare(String(left.id))
        })
        .map(({ id, displayOrder }) => ({ id, displayOrder }))
    }
    throw new Error(`Unexpected query: ${query.slice(0, 80)}`)
  }

  async $executeRawUnsafe(query, organizationId, ...ids) {
    if (query.includes('ALTER TABLE') || query.includes('CREATE INDEX')) return 0
    if (query.includes('UPDATE "VisitCommunityPost" post')) {
      this.writes += 1
      ids.forEach((id, index) => {
        const row = this.rows.find(candidate => candidate.id === id)
        if (row) row.displayOrder = index + 1
      })
      return ids.length
    }
    throw new Error(`Unexpected execute: ${query.slice(0, 80)} (${organizationId})`)
  }
}

const database = new FakePrisma([
  { id: 'post-a', displayOrder: 1 },
  { id: 'post-b', displayOrder: 2 },
  { id: 'post-c', displayOrder: 3 },
  { id: 'post-d', displayOrder: 4 },
])

const moved = await moveStylePost(database, 'org-salon', 'post-d', 2)
assert.deepEqual(moved, { postId: 'post-d', displayOrder: 2, totalCount: 4 })
assert.deepEqual(
  [...database.rows].sort((a, b) => a.displayOrder - b.displayOrder).map(row => [row.id, row.displayOrder]),
  [['post-a', 1], ['post-d', 2], ['post-b', 3], ['post-c', 4]],
  'the existing No.2 post and following posts must shift back',
)

const clamped = await moveStylePost(database, 'org-salon', 'post-a', 99)
assert.equal(clamped.displayOrder, 4)
assert.deepEqual(
  [...database.rows].sort((a, b) => a.displayOrder - b.displayOrder).map(row => row.id),
  ['post-d', 'post-b', 'post-c', 'post-a'],
)

database.rows[0].displayOrder = 2
database.rows[1].displayOrder = 2
database.rows[2].displayOrder = null
const normalized = await normalizeStylePostOrder(database, 'org-salon')
assert.equal(normalized.changed, true)
assert.deepEqual(
  [...database.rows].sort((a, b) => a.displayOrder - b.displayOrder).map(row => row.displayOrder),
  [1, 2, 3, 4],
)

await assert.rejects(
  () => moveStylePost(database, 'org-salon', 'post-d', 0),
  error => error instanceof StylePostOrderError && error.status === 400,
)
await assert.rejects(
  () => moveStylePost(database, 'org-salon', 'missing-post', 1),
  error => error instanceof StylePostOrderError && error.status === 404,
)

console.log(JSON.stringify({ release: 'style-demo-ordering-v634', unitTests: true, writes: database.writes }))
