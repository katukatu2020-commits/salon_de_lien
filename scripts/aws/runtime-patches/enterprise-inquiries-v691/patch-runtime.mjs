import fs from 'node:fs'
import assert from 'node:assert/strict'

function edit(file, update) {
  const path = '/app/' + file
  fs.writeFileSync(path, update(fs.readFileSync(path, 'utf8')))
}
function once(source, before, after) {
  assert.equal(source.split(before).length, 2, 'Patch anchor: ' + before.slice(0, 100))
  return source.replace(before, () => after)
}
const migration = `await prisma.$executeRawUnsafe('ALTER TABLE "BusinessInquiry" ADD COLUMN IF NOT EXISTS "isEnterprise" BOOLEAN NOT NULL DEFAULT FALSE')`
const enterpriseLabel = '50店舗以上での導入を希望（大口契約）'

edit('business-inquiries-v637.js', source => {
  source = once(source, "  const privacyAccepted =", "  const enterpriseValues = params.getAll('isEnterprise')\n  const enterpriseValid = enterpriseValues.length === 0 || (enterpriseValues.length === 1 && enterpriseValues[0] === '1')\n  const isEnterprise = enterpriseValues.length === 1 && enterpriseValues[0] === '1'\n  const privacyAccepted =")
  source = once(source, 'message.length >= 10 && privacyAccepted', 'message.length >= 10 && privacyAccepted && enterpriseValid')
  source = once(source, 'preferredContact, message }', 'preferredContact, message, isEnterprise }')
  source = once(source, "+ audienceField + '<div", `+ audienceField + '<label class="inquiry-consent inquiry-enterprise" style="min-height:44px;font-size:14px;line-height:1.6;cursor:pointer"><input type="checkbox" name="isEnterprise" value="1"><span>${enterpriseLabel}</span></label><div`)
  source = once(source, `        await prisma.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "BusinessInquiry_requestKey_key"`, `        ${migration}\n        await prisma.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "BusinessInquiry_requestKey_key"`)
  // Preserve the old deduplication key for ordinary inquiries.
  source = once(source, '      inquiry.message,\n      bucket,', "      inquiry.message + (inquiry.isEnterprise === true ? '\\n[enterprise]' : ''),\n      bucket,")
  source = once(source, '"message","sourcePath","status","createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,', '"message","sourcePath","isEnterprise","status","createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,')
  source = once(source, '      inquiry.preferredContact, inquiry.message, inquiry.sourcePath,', '      inquiry.preferredContact, inquiry.message, inquiry.sourcePath, inquiry.isEnterprise === true,')
  source = once(source, "+ audienceLabel(row.audience) + '</span><time>'", "+ audienceLabel(row.audience) + '</span>' + (row.isEnterprise ? '<span class=\"badge pending\">大口契約（50店舗以上）</span>' : '') + '<time>'")
  return source
})

edit('business-account-approvals-v643.js', source => {
  source = once(source, '      await branchInquiryV675.ensureSchema(prisma)', '      await branchInquiryV675.ensureSchema(prisma)\n      ' + migration)
  source = once(source, '    const query = String(url.searchParams.get(\'q\')', "    const contractType = ['enterprise', 'standard'].includes(url.searchParams.get('contractType')) ? url.searchParams.get('contractType') : 'all'\n    const query = String(url.searchParams.get('q')")
  source = once(source, "    if (query) { params.push('%' + query + '%');", "    if (contractType !== 'all') { params.push(contractType === 'enterprise'); clauses.push('i.\"isEnterprise\"=$' + params.length) }\n    if (query) { params.push('%' + query + '%');")
  source = once(source, 'stats: stats[0] || {}, status, audience, query, page, pageSize }', 'stats: stats[0] || {}, status, audience, contractType, query, page, pageSize }')
  source = once(source, "+ escapeHtml(audience) + '</span><span>'", "+ escapeHtml(audience) + '</span>' + (row.isEnterprise ? '<span class=\"baaState active\">大口契約（50店舗以上）</span>' : '') + '<span>'")
  source = once(source, "      query.set('page', String(page))", "      if (data.contractType !== 'all') query.set('contractType', data.contractType)\n      query.set('page', String(page))")
  source = once(source, '<label class="baaField"><span>対応状況</span><select name="status"><option value="all">', '<label class="baaField"><span>契約区分</span><select name="contractType"><option value="all">すべて</option><option value="enterprise"\' + (data.contractType === \'enterprise\' ? \' selected\' : \'\') + \'>大口契約（50店舗以上）</option><option value="standard"\' + (data.contractType === \'standard\' ? \' selected\' : \'\') + \'>通常申請</option></select></label><label class="baaField"><span>対応状況</span><select name="status"><option value="all">')
  source = once(source, 'grid-template-columns:minmax(220px,1fr) 170px 170px auto;', 'grid-template-columns:minmax(180px,1fr) 130px 210px 130px auto;')
  source = once(source, '@media(max-width:850px){.baaToolbar', '.baaToolbar>.baaButton{white-space:nowrap}.baaToolbar>label{min-width:0}@media(max-width:1200px){.baaToolbar{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:850px){.baaToolbar')
  return source
})

// These are operator-contact modules, not salon profile/database records.
for (const file of ['business-inquiries-v637.js', 'audience-sites.js', 'public-site.js']) {
  edit(file, source => {
    assert.ok(source.includes('070-9444-6007'), file + ' contact display')
    assert.ok(source.includes('tel:+817094446007'), file + ' contact URI')
    return source.replaceAll('070-9444-6007', '070-8490-9876').replaceAll('tel:+817094446007', 'tel:+817084909876')
  })
}
edit('server.js', source => once(source,
  "      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Treatment-Reviews','v690')",
  "      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Treatment-Reviews','v690')\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Enterprise-Inquiries','v691')"))
console.log('Enterprise inquiries v691 applied')
