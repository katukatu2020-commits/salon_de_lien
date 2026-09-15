import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const changes = []

function target(file) { return path.join(root, file) }
function read(file) { return fs.readFileSync(target(file), 'utf8') }

function replaceExact(file, before, after) {
  const source = read(file)
  if (source.split(before).length !== 2) throw new Error(`Unexpected v645 parent anchor: ${file} / ${before.slice(0, 140)}`)
  fs.writeFileSync(target(file), source.replace(before, after))
  changes.push({ file, before, after })
}

const readinessAnchor = "      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Stamp-Reward-Pricing', 'v645') /* stamp-reward-pricing-v645-ready */"
replaceExact(
  'server.js',
  readinessAnchor,
  readinessAnchor + "\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Dealer-Password-Change', 'v646') /* dealer-password-change-v646-ready */",
)

replaceExact(
  'business-account-approvals-v643.js',
  `  async function managedAccessForPrincipal(type, principalId) {
    if (!principalId) return null
    const rows = await prisma.$queryRawUnsafe('SELECT * FROM "ManagedBusinessAccess" WHERE "accountType"=$1 AND "principalId"=$2 LIMIT 1', type, principalId)
    return rows[0] || null
  }

  async function accountControl(type, targetId) {`,
  `  async function managedAccessForPrincipal(type, principalId) {
    if (!principalId) return null
    const rows = await prisma.$queryRawUnsafe('SELECT * FROM "ManagedBusinessAccess" WHERE "accountType"=$1 AND "principalId"=$2 LIMIT 1', type, principalId)
    return rows[0] || null
  }

  async function existingDealerAccess(dealerId) {
    if (!dealerId) return null
    const rows = await prisma.$queryRawUnsafe('SELECT "id","name","loginId" FROM "WholesaleDealer" WHERE "id"=$1 AND "active"=TRUE LIMIT 1', dealerId)
    const dealer = rows[0]
    if (!dealer) return null
    return {
      id: null,
      accountType: 'DEALER',
      targetId: dealer.id,
      principalId: dealer.id,
      accountName: dealer.name,
      loginId: dealer.loginId,
      accessStatus: 'ACTIVE',
      mustChangePassword: false,
      legacyAccount: true,
    }
  }

  async function accountControl(type, targetId) {`,
)

replaceExact(
  'business-account-approvals-v643.js',
  `  async function changePassword(type, session, params, operatorEmail) {
    const access = await managedAccessForPrincipal(type, type === 'SALON' ? session.userId : session.id)
    if (!access) throw new BusinessAccessError('input', 404)`,
  `  async function changePassword(type, session, params, operatorEmail) {
    const managedAccess = await managedAccessForPrincipal(type, type === 'SALON' ? session.userId : session.id)
    const access = managedAccess || (type === 'DEALER' ? await existingDealerAccess(session.id) : null)
    if (!access) throw new BusinessAccessError('input', 404)`,
)

replaceExact(
  'business-account-approvals-v643.js',
  `      await tx.$executeRawUnsafe('UPDATE "ManagedBusinessAccess" SET "mustChangePassword"=FALSE,"updatedAt"=NOW() WHERE "id"=$1', access.id)
      await audit(tx, type, access.targetId, 'PASSWORD_CHANGED', operatorEmail, { initialChange: Boolean(access.mustChangePassword) })`,
  `      if (managedAccess) await tx.$executeRawUnsafe('UPDATE "ManagedBusinessAccess" SET "mustChangePassword"=FALSE,"updatedAt"=NOW() WHERE "id"=$1', managedAccess.id)
      await audit(tx, type, access.targetId, 'PASSWORD_CHANGED', operatorEmail, { initialChange: Boolean(access.mustChangePassword), managedAccount: Boolean(managedAccess) })`,
)

replaceExact(
  'business-account-approvals-v643.js',
  `    const access = await managedAccessForPrincipal('DEALER', session.id)
    const control = await accountControl('DEALER', session.id)`,
  `    const managedAccess = await managedAccessForPrincipal('DEALER', session.id)
    const access = managedAccess || await existingDealerAccess(session.id)
    const control = await accountControl('DEALER', session.id)`,
)

fs.writeFileSync('/tmp/dealer-password-change-v646-changes.json', JSON.stringify(changes))
console.log(JSON.stringify({ release: 'dealer-password-change-v646', changedFiles: [...new Set(changes.map(change => change.file))], changes: changes.length }))
