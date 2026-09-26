import assert from 'node:assert/strict'
import fs from 'node:fs'
const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const approvals = fs.readFileSync(root + '/business-account-approvals-v643.js', 'utf8')
assert.match(approvals, /await branchInquiryV675.validateBranch/)
assert.match(approvals, /await ensureIdentityAvailable\(tx, loginId, principalEmail\)/)
assert.match(approvals, /principalId, targetId, principalEmail, loginId, contactName, hash/)
assert.match(approvals, /return \{ to: access.contactEmail,/)
assert.match(fs.readFileSync(root + '/salon-branch-inquiry-v675.js', 'utf8'), /submitInquiry, validateBranch, attachApprovedStore/)
assert.match(fs.readFileSync(root + '/server.js', 'utf8'), /X-Lien-Branch-Shared-Contact/)
console.log('v677 runtime verified')
