import assert from 'node:assert/strict'

function routePath(route) {
  return new URL(route, 'https://salon-de-lien.com').pathname
}

function samePage(left, right) {
  return routePath(left) === routePath(right)
}

function recordCustomerRoute(routes, route) {
  const next = [...routes]
  let existingIndex = -1
  for (let index = next.length - 1; index >= 0; index -= 1) {
    if (samePage(next[index], route)) {
      existingIndex = index
      break
    }
  }
  if (existingIndex >= 0) {
    next.splice(existingIndex + 1)
    next[existingIndex] = route
  } else {
    next.push(route)
  }
  return next
}

function backTarget(routes, current, fallback = '/u/home') {
  const next = [...routes]
  while (next.length && samePage(next.at(-1), current)) next.pop()
  return next.pop() || fallback
}

const home = '/u/home'
const list = '/u/community?sort=latest'
const detail = '/u/community/showcase-yohaku-community-post-001'

let routes = []
for (const route of [home, list, detail]) routes = recordCustomerRoute(routes, route)
assert.deepEqual(routes, [home, list, detail])

routes = recordCustomerRoute(routes, '/u/community')
assert.deepEqual(routes, [home, '/u/community'])
assert.equal(backTarget(routes, '/u/community'), home)

routes = recordCustomerRoute(routes, detail)
routes = recordCustomerRoute(routes, '/u/community?page=1')
assert.deepEqual(routes, [home, '/u/community?page=1'])
assert.equal(backTarget(routes, '/u/community?page=1'), home)

console.log(JSON.stringify({
  release: 'style-detail-navigation-v551',
  duplicateRoutePruned: true,
  detailLoopRemoved: true,
}))
