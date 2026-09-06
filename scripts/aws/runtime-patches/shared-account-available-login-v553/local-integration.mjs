import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const baseUrl = String(process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3124').replace(/\/$/, '')
const suffix = Date.now().toString(36)
const ownerAvailableId = `qa.v553.owner.${suffix}`
const selfAvailableId = `qa.v553.self.${suffix}`
const activeConflictId = `qa.v553.active.${suffix}`
const sharedPassword = `Shared-V553-${suffix}!`
const renamedPassword = `Renamed-V553-${suffix}!`
const fixtureIds = ['qa-v553-inactive-owner', 'qa-v553-inactive-self', 'qa-v553-active-conflict']

function passwordHash(password) {
  const salt = crypto.randomBytes(16).toString('hex')
  return `scrypt$${salt}$${crypto.scryptSync(password, salt, 64).toString('hex')}`
}

async function adminLogin(loginId, password, next = '/admin/account') {
  return fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    redirect: 'manual',
    headers: { Origin: baseUrl, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ email: loginId, password, next }),
  })
}

async function cleanup() {
  await prisma.appUser.deleteMany({ where: { id: { in: fixtureIds } } })
}

try {
  await cleanup()
  await prisma.appUser.createMany({ data: [
    {
      id: fixtureIds[0],
      organizationId: 'org_showcase_yohaku',
      email: `qa-v553-inactive-owner-${suffix}@example.invalid`,
      loginId: ownerAvailableId,
      displayName: 'V553 inactive owner-path fixture',
      role: 'STAFF',
      active: false,
    },
    {
      id: fixtureIds[1],
      organizationId: 'org_showcase_yohaku',
      email: `qa-v553-inactive-self-${suffix}@example.invalid`,
      loginId: selfAvailableId,
      displayName: 'V553 inactive self-path fixture',
      role: 'STAFF',
      active: false,
    },
    {
      id: fixtureIds[2],
      organizationId: 'org_showcase_yohaku',
      email: `qa-v553-active-${suffix}@example.invalid`,
      loginId: activeConflictId,
      displayName: 'V553 active conflict fixture',
      passwordHash: passwordHash(`Active-V553-${suffix}!`),
      role: 'STAFF',
      active: true,
    },
  ] })

  const ready = await fetch(`${baseUrl}/api/health/ready?verify=v553`)
  assert.equal(ready.status, 200)
  assert.equal(ready.headers.get('x-lien-shared-account-identity'), 'v553')
  assert.equal(ready.headers.get('x-lien-style-detail-navigation'), 'v551')

  const ownerLogin = await adminLogin('demo.owner', 'LienDemo2026!')
  assert.ok([302, 303].includes(ownerLogin.status), `owner login failed: ${ownerLogin.status}`)
  const ownerCookie = (ownerLogin.headers.get('set-cookie') || '').split(';')[0]
  assert.match(ownerCookie, /^[^=]+=/)

  const ownerRename = await fetch(`${baseUrl}/api/admin/shared-store-account`, {
    method: 'POST',
    headers: { Origin: baseUrl, Cookie: ownerCookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({ loginId: ownerAvailableId, password: sharedPassword }),
  })
  const ownerRenameBody = await ownerRename.text()
  assert.equal(ownerRename.status, 200, ownerRenameBody)
  assert.equal(JSON.parse(ownerRenameBody).loginId, ownerAvailableId)
  assert.equal((await prisma.appUser.findUnique({ where: { id: fixtureIds[0] } })).loginId, null)

  const ownerConflict = await fetch(`${baseUrl}/api/admin/shared-store-account`, {
    method: 'POST',
    headers: { Origin: baseUrl, Cookie: ownerCookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({ loginId: activeConflictId, password: sharedPassword }),
  })
  assert.equal(ownerConflict.status, 409)
  assert.match(await ownerConflict.text(), /別の有効な店舗側アカウント/)

  const sharedLogin = await adminLogin(ownerAvailableId, sharedPassword)
  assert.ok([302, 303].includes(sharedLogin.status), `shared login failed: ${sharedLogin.status}`)
  const sharedCookie = (sharedLogin.headers.get('set-cookie') || '').split(';')[0]
  assert.match(sharedCookie, /^[^=]+=/)

  const selfRename = await fetch(`${baseUrl}/api/auth/account`, {
    method: 'POST',
    redirect: 'manual',
    headers: { Origin: baseUrl, Cookie: sharedCookie, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      newLoginId: selfAvailableId,
      newPassword: renamedPassword,
      newPasswordConfirm: renamedPassword,
      currentPassword: sharedPassword,
    }),
  })
  assert.equal(selfRename.status, 303)
  assert.equal(selfRename.headers.get('location'), `${baseUrl}/admin/login?account=updated`)
  assert.equal((await prisma.appUser.findUnique({ where: { id: fixtureIds[1] } })).loginId, null)

  const renamedLogin = await adminLogin(selfAvailableId, renamedPassword)
  assert.ok([302, 303].includes(renamedLogin.status), `renamed shared login failed: ${renamedLogin.status}`)
  const renamedCookie = (renamedLogin.headers.get('set-cookie') || '').split(';')[0]

  const selfConflict = await fetch(`${baseUrl}/api/auth/account`, {
    method: 'POST',
    redirect: 'manual',
    headers: { Origin: baseUrl, Cookie: renamedCookie, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      newLoginId: activeConflictId,
      newPassword: '',
      newPasswordConfirm: '',
      currentPassword: renamedPassword,
    }),
  })
  assert.equal(selfConflict.status, 303)
  assert.equal(selfConflict.headers.get('location'), `${baseUrl}/admin/account?error=duplicate`)

  const retainedLogin = await adminLogin(selfAvailableId, renamedPassword, '/admin/appointments')
  assert.ok([302, 303].includes(retainedLogin.status), `retained shared login failed: ${retainedLogin.status}`)
  assert.equal(retainedLogin.headers.get('location'), `${baseUrl}/admin/appointments`)

  console.log(JSON.stringify({
    release: 'shared-account-available-login-v553',
    ownerPathReclaimsInactiveId: true,
    selfPathReclaimsInactiveId: true,
    activeAccountConflictProtected: true,
    renamedSharedLogin: true,
  }))
} finally {
  await cleanup()
  await prisma.$disconnect()
}
