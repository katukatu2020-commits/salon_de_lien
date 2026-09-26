import fs from 'node:fs'
import path from 'node:path'
const root = process.env.LIEN_RUNTIME_ROOT || '/app'
function edit(file, before, after) {
  const target = path.join(root, file)
  const source = fs.readFileSync(target, 'utf8')
  if (source.split(before).length !== 2) throw new Error('Unexpected parent: ' + file + ': ' + before)
  fs.writeFileSync(target, source.replace(before, after))
}
fs.copyFileSync(new URL('./branch-shared-contact-v677.js', import.meta.url), path.join(root, 'branch-shared-contact-v677.js'))
const branch = 'salon-branch-inquiry-v675.js'
edit(branch,
  'async function attachApprovedStore({ tx, crypto, inquiry, organizationId, contactName, type, BusinessAccessError }) {',
  'async function validateBranch({ tx, inquiry, type, BusinessAccessError }) {')
edit(branch,
  "  if (!owners.length) throw new BusinessAccessError('branch', 409)\n",
  `  if (!owners.length) throw new BusinessAccessError('branch', 409)
  return branch
}

async function attachApprovedStore({ tx, crypto, inquiry, organizationId, contactName, type, BusinessAccessError }) {
  const branch = await validateBranch({ tx, inquiry, type, BusinessAccessError })
  if (!branch) return
`)
edit(branch, 'module.exports = { ensureSchema, submitInquiry, attachApprovedStore }', 'module.exports = { ensureSchema, submitInquiry, validateBranch, attachApprovedStore }')
const approvals = 'business-account-approvals-v643.js'
edit(approvals,
  "const branchInquiryV675 = require('./salon-branch-inquiry-v675')",
  "const branchInquiryV675 = require('./salon-branch-inquiry-v675')\nconst branchContactV677 = require('./branch-shared-contact-v677')")
edit(approvals,
  '      await ensureIdentityAvailable(tx, loginId, contactEmail)',
  `      const branch = await branchInquiryV675.validateBranch({ tx, inquiry, type, BusinessAccessError })
      const principalEmail = await branchContactV677.resolvePrincipalEmail({ tx, branch, contactEmail, loginId, BusinessAccessError })
      await ensureIdentityAvailable(tx, loginId, principalEmail)`)
edit(approvals, 'principalId, targetId, contactEmail, loginId, contactName, hash)', 'principalId, targetId, principalEmail, loginId, contactName, hash)')
const ready = "      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Style-Mobile-Stability', 'v676') /* style-mobile-stability-v676-ready */"
edit('server.js', ready, ready + "\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Branch-Shared-Contact', 'v677') /* branch-shared-contact-v677-ready */")
console.log('v677 approval contact identity patched')
