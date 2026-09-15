import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const changes = []

function target(file) { return path.join(root, file) }
function read(file) { return fs.readFileSync(target(file), 'utf8') }

function replaceExact(file, before, after) {
  const source = read(file)
  if (source.split(before).length !== 2) throw new Error(`Unexpected v647 parent anchor: ${file} / ${before.slice(0, 140)}`)
  fs.writeFileSync(target(file), source.replace(before, after))
  changes.push({ file, kind: 'exact', anchor: before.slice(0, 140) })
}

function replaceSection(file, start, end, replacement) {
  const source = read(file)
  const startIndex = source.indexOf(start)
  const endIndex = source.indexOf(end, startIndex + start.length)
  if (startIndex < 0 || endIndex < 0 || source.indexOf(start, startIndex + start.length) >= 0) {
    throw new Error(`Unexpected v647 parent section: ${file} / ${start}`)
  }
  fs.writeFileSync(target(file), source.slice(0, startIndex) + replacement + source.slice(endIndex))
  changes.push({ file, kind: 'section', anchor: start })
}

replaceExact(
  'business-account-approvals-v643.js',
  "const RELEASE = 'business-account-approvals-v643'",
  "const RELEASE = 'business-account-approvals-v643'\nconst APPLICATION_REJECTION_RELEASE = 'business-application-rejection-v648'",
)

replaceExact(
  'business-account-approvals-v643.js',
  `function cleanText(value, maximum, required = false) {
  const text = String(value == null ? '' : value).replace(/\\s+/g, ' ').trim()
  if ((required && !text) || text.length > maximum) throw new BusinessAccessError('input')
  return text
}
`,
  `function cleanText(value, maximum, required = false) {
  const text = String(value == null ? '' : value).replace(/\\s+/g, ' ').trim()
  if ((required && !text) || text.length > maximum) throw new BusinessAccessError('input')
  return text
}

function cleanMultiline(value, maximum, required = false) {
  const text = String(value == null ? '' : value)
    .replace(/\\r\\n?/g, '\\n')
    .split('\\n').map(function (line) { return line.trim() }).join('\\n')
    .replace(/\\n{3,}/g, '\\n\\n').trim()
  if ((required && !text) || text.length > maximum) throw new BusinessAccessError('input')
  return text
}
`,
)

replaceExact(
  'business-account-approvals-v643.js',
  `function mailStatusLabel(status) {
  return { SENT: '承認メール送信済み', FAILED: 'メール送信失敗', PENDING: 'メール送信中' }[status] || '未送信'
}
`,
  `function mailStatusLabel(status) {
  return { SENT: '承認メール送信済み', FAILED: 'メール送信失敗', PENDING: 'メール送信中' }[status] || '未送信'
}

function rejectionMailStatusLabel(status) {
  return { SENT: '却下メール送信済み', FAILED: '却下メール送信失敗', PENDING: '却下メール送信中' }[status] || '未送信'
}
`,
)

replaceExact(
  'business-account-approvals-v643.js',
  '\nfunction noticeFromQuery(url) {',
  `
function rejectionEmail(rejection, origin, resent = false) {
  const label = rejection.audience === 'dealer' ? 'ディーラー' : '美容室'
  const contactUrl = origin + (rejection.audience === 'dealer' ? '/business/dealer' : '/business/salon')
  const subject = 'ORIMIA ご利用申請結果のお知らせ' + (resent ? '（再送）' : '')
  const textBody = [
    rejection.organizationName + ' ご担当者様', '',
    'このたびはORIMIAの' + label + '向けサービスへお申し込みいただき、ありがとうございました。',
    '申請内容を確認いたしましたが、今回はご利用アカウントの発行を見送らせていただくこととなりました。', '',
    '却下理由:', rejection.reason, '',
    '内容についてご不明な点がある場合は、下記のお問い合わせフォームからORIMIA運営へご連絡ください。',
    contactUrl, '', 'ORIMIA運営',
  ].join('\\n')
  const reasonHtml = escapeHtml(rejection.reason).replace(/\\n/g, '<br>')
  const htmlBody = '<!doctype html><html lang="ja"><body style="margin:0;background:#f7f2ed;color:#2d2723;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Yu Gothic,Meiryo,sans-serif"><div style="max-width:620px;margin:0 auto;padding:32px 16px"><div style="background:#fff;border:1px solid #eadbd2;border-radius:16px;padding:30px"><p style="margin:0;color:#a14c65;font-size:12px;font-weight:700">ORIMIA BUSINESS ACCOUNT</p><h1 style="margin:10px 0 20px;font-size:25px">ご利用申請結果のお知らせ</h1><p style="line-height:1.8">' + escapeHtml(rejection.organizationName) + ' ご担当者様<br>このたびはORIMIAの' + escapeHtml(label) + '向けサービスへお申し込みいただき、ありがとうございました。</p><p style="line-height:1.8">申請内容を確認いたしましたが、今回はご利用アカウントの発行を見送らせていただくこととなりました。</p><div style="margin:22px 0;padding:18px;border-left:4px solid #a14c65;background:#faf6f2"><strong style="display:block;margin-bottom:8px">却下理由</strong><div style="font-size:14px;line-height:1.8">' + reasonHtml + '</div></div><p style="color:#756a63;font-size:13px;line-height:1.8">内容についてご不明な点がある場合は、ORIMIA運営へお問い合わせください。</p><p style="text-align:center"><a href="' + escapeHtml(contactUrl) + '" style="display:inline-block;border:1px solid #a14c65;color:#a14c65;text-decoration:none;padding:12px 22px;border-radius:9px;font-weight:700">お問い合わせフォームを開く</a></p></div></div></body></html>'
  return { to: rejection.contactEmail, subject, textBody, htmlBody }
}

function noticeFromQuery(url) {`,
)

replaceExact(
  'business-account-approvals-v643.js',
  `  if (url.searchParams.get('resent') === '1' && mail === 'sent') return '<div class="baaNotice good">新しい初期パスワードを発行し、メールを再送しました。</div>'
  if (error) {`,
  `  if (url.searchParams.get('resent') === '1' && mail === 'sent') return '<div class="baaNotice good">新しい初期パスワードを発行し、メールを再送しました。</div>'
  if (url.searchParams.get('rejected') === '1' && mail === 'sent') return '<div class="baaNotice good"><strong>申請を却下しました。</strong><span>入力した却下理由を申請者へメール送信しました。</span></div>'
  if (url.searchParams.get('rejected') === '1' && mail === 'failed') return '<div class="baaNotice bad"><strong>申請は却下済みですが、メールを送信できませんでした。</strong><span>対象申請の「却下メールを再送」を実行してください。</span></div>'
  if (url.searchParams.get('rejectionResent') === '1' && mail === 'sent') return '<div class="baaNotice good">却下理由のメールを再送しました。</div>'
  if (url.searchParams.get('rejectionResent') === '1' && mail === 'failed') return '<div class="baaNotice bad">却下理由のメールを再送できませんでした。時間をおいて再度お試しください。</div>'
  if (error) {`,
)

replaceExact(
  'business-account-approvals-v643.js',
  `const message = { already: 'この申請はすでに承認されています。', input: '発行内容を確認してください。', email: 'メールアドレスを確認してください。', duplicate: '同じIDまたはメールアドレスの事業者アカウントが存在します。', plan: '利用プランを確認してください。', suspended: '利用停止中のアカウントには認証情報を再送できません。', server: '処理を完了できませんでした。時間をおいて再度お試しください。' }[error] || '処理を完了できませんでした。'`,
  `const message = { already: 'この申請はすでに承認されています。', rejected: 'この申請はすでに却下されています。', input: '入力内容を確認してください。', email: '申請者のメールアドレスを確認してください。', duplicate: '同じIDまたはメールアドレスの事業者アカウントが存在します。', plan: '利用プランを確認してください。', suspended: '利用停止中のアカウントには認証情報を再送できません。', server: '処理を完了できませんでした。時間をおいて再度お試しください。' }[error] || '処理を完了できませんでした。'`,
)

replaceExact(
  'business-account-approvals-v643.js',
  '.baaPager{display:flex;justify-content:flex-end;gap:9px;margin-top:16px}@media(max-width:850px)',
  '.baaPager{display:flex;justify-content:flex-end;gap:9px;margin-top:16px}.baaDecisionActions{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:14px}.baaReject{min-width:0;border-top:1px solid var(--line);padding-top:14px}.baaReject summary{cursor:pointer;color:var(--red);font-weight:800}.baaReject .baaField{margin-top:13px}.baaRejectHelp{margin:8px 0 0;color:var(--muted);font-size:11px;line-height:1.7}.baaRejection{min-width:0;border:1px solid #ecc8c5;border-radius:12px;background:var(--redBg);padding:14px;color:var(--red);overflow-wrap:anywhere}.baaRejectionReason{margin-top:11px;border-top:1px solid #ecc8c5;padding-top:10px;color:var(--ink);font-size:12px;line-height:1.75}.baaRejectionReason span{display:block;margin-bottom:4px;color:var(--red);font-size:10px;font-weight:800}.baaRejectionReason p{margin:0;white-space:pre-wrap}.baaLockedStatus{border-top:1px solid var(--line);padding-top:14px;color:var(--muted);font-size:11px;line-height:1.7}@media(max-width:850px)',
)

replaceExact(
  'business-account-approvals-v643.js',
  '.baaActions{grid-template-columns:1fr}.baaApproveGrid{grid-template-columns:1fr}',
  '.baaActions{grid-template-columns:1fr}.baaApproveGrid,.baaDecisionActions{grid-template-columns:1fr}',
)

replaceExact(
  'business-account-approvals-v643.js',
  `      await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "BusinessAccountAction_target_created_idx" ON "BusinessAccountAction"("accountType","targetId","createdAt" DESC)')`,
  `      await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "BusinessAccountAction_target_created_idx" ON "BusinessAccountAction"("accountType","targetId","createdAt" DESC)')
      await prisma.$executeRawUnsafe(\`CREATE TABLE IF NOT EXISTS "BusinessInquiryRejection" (
        "inquiryId" TEXT PRIMARY KEY,
        "audience" TEXT NOT NULL,
        "organizationName" TEXT NOT NULL,
        "contactEmail" TEXT NOT NULL,
        "reason" TEXT NOT NULL,
        "mailStatus" TEXT NOT NULL DEFAULT 'PENDING',
        "mailSentAt" TIMESTAMPTZ,
        "mailError" TEXT,
        "rejectedBy" TEXT NOT NULL,
        "rejectedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "BusinessInquiryRejection_audience_check" CHECK ("audience" IN ('salon','dealer')),
        CONSTRAINT "BusinessInquiryRejection_mail_check" CHECK ("mailStatus" IN ('PENDING','SENT','FAILED'))
      )\`)
      await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "BusinessInquiryRejection_rejected_idx" ON "BusinessInquiryRejection"("rejectedAt" DESC)')`,
)

replaceExact(
  'business-account-approvals-v643.js',
  `  async function approveInquiry(inquiryId, params, operator, req) {`,
  `  async function sendRejectionNotice(rejection, req, resent) {
    try {
      const messageId = await mailSender(rejectionEmail(rejection, requestOrigin(req), resent))
      await prisma.$executeRawUnsafe('UPDATE "BusinessInquiryRejection" SET "mailStatus"=\\'SENT\\',"mailSentAt"=NOW(),"mailError"=NULL,"updatedAt"=NOW() WHERE "inquiryId"=$1', rejection.inquiryId)
      return { sent: true, messageId }
    } catch (error) {
      const detail = String(error && (error.message || error.code) || 'mail_failed').replace(/[\\r\\n]+/g, ' ').slice(0, 500)
      await prisma.$executeRawUnsafe('UPDATE "BusinessInquiryRejection" SET "mailStatus"=\\'FAILED\\',"mailError"=$2,"updatedAt"=NOW() WHERE "inquiryId"=$1', rejection.inquiryId, detail)
      console.error('[business-application-rejection-v648] rejection mail failed', { inquiryId: rejection.inquiryId, audience: rejection.audience, detail })
      return { sent: false }
    }
  }

  async function rejectInquiry(inquiryId, params, operator, req) {
    const reason = cleanMultiline(params.get('reason'), 1000, true)
    const rejection = await prisma.$transaction(async function (tx) {
      await tx.$queryRawUnsafe("SELECT 1::int FROM (SELECT pg_advisory_xact_lock(hashtext('business_account_approval_v643'))) guard")
      const inquiries = await tx.$queryRawUnsafe('SELECT * FROM "BusinessInquiry" WHERE "id"=$1 FOR UPDATE', inquiryId)
      const inquiry = inquiries[0]
      if (!inquiry || !['salon', 'dealer'].includes(inquiry.audience)) throw new BusinessAccessError('input', 404)
      const existing = await tx.$queryRawUnsafe('SELECT "id" FROM "ManagedBusinessAccess" WHERE "inquiryId"=$1 LIMIT 1', inquiryId)
      if (existing[0]) throw new BusinessAccessError('already', 409)
      const rejected = await tx.$queryRawUnsafe('SELECT "inquiryId" FROM "BusinessInquiryRejection" WHERE "inquiryId"=$1 LIMIT 1', inquiryId)
      if (rejected[0]) throw new BusinessAccessError('rejected', 409)
      const contactEmail = normalizeEmail(inquiry.email)
      const type = inquiry.audience === 'dealer' ? 'DEALER' : 'SALON'
      await tx.$executeRawUnsafe('INSERT INTO "BusinessInquiryRejection" ("inquiryId","audience","organizationName","contactEmail","reason","mailStatus","rejectedBy","rejectedAt","updatedAt") VALUES ($1,$2,$3,$4,$5,\\'PENDING\\',$6,NOW(),NOW())', inquiryId, inquiry.audience, inquiry.organizationName, contactEmail, reason, operator.subject)
      await tx.$executeRawUnsafe('UPDATE "BusinessInquiry" SET "status"=\\'closed\\',"operatorNote"=$2,"updatedAt"=NOW() WHERE "id"=$1', inquiryId, '却下理由: ' + reason)
      await audit(tx, type, inquiryId, 'REJECT_APPLICATION', operator.subject, { inquiryId, contactEmail, reason })
      return { inquiryId, audience: inquiry.audience, organizationName: inquiry.organizationName, contactEmail, reason, mailStatus: 'PENDING', rejectedBy: operator.subject }
    })
    const mail = await sendRejectionNotice(rejection, req, false)
    return { rejection, mail }
  }

  async function resendRejection(inquiryId, operator, req) {
    const rejection = await prisma.$transaction(async function (tx) {
      const rows = await tx.$queryRawUnsafe('SELECT * FROM "BusinessInquiryRejection" WHERE "inquiryId"=$1 FOR UPDATE', inquiryId)
      const row = rows[0]
      if (!row) throw new BusinessAccessError('input', 404)
      await tx.$executeRawUnsafe('UPDATE "BusinessInquiryRejection" SET "mailStatus"=\\'PENDING\\',"mailSentAt"=NULL,"mailError"=NULL,"updatedAt"=NOW() WHERE "inquiryId"=$1', inquiryId)
      await audit(tx, row.audience === 'dealer' ? 'DEALER' : 'SALON', inquiryId, 'REJECTION_MAIL_RESENT', operator.subject, { inquiryId, contactEmail: row.contactEmail })
      return { ...row, mailStatus: 'PENDING' }
    })
    const mail = await sendRejectionNotice(rejection, req, true)
    return { rejection, mail }
  }

  async function approveInquiry(inquiryId, params, operator, req) {`,
)

replaceExact(
  'business-account-approvals-v643.js',
  `      const existing = await tx.$queryRawUnsafe('SELECT "id" FROM "ManagedBusinessAccess" WHERE "inquiryId"=$1 LIMIT 1', inquiryId)
      if (existing[0]) throw new BusinessAccessError('already', 409)
      const type = inquiry.audience === 'dealer' ? 'DEALER' : 'SALON'`,
  `      const existing = await tx.$queryRawUnsafe('SELECT "id" FROM "ManagedBusinessAccess" WHERE "inquiryId"=$1 LIMIT 1', inquiryId)
      if (existing[0]) throw new BusinessAccessError('already', 409)
      const rejected = await tx.$queryRawUnsafe('SELECT "inquiryId" FROM "BusinessInquiryRejection" WHERE "inquiryId"=$1 LIMIT 1', inquiryId)
      if (rejected[0]) throw new BusinessAccessError('rejected', 409)
      const type = inquiry.audience === 'dealer' ? 'DEALER' : 'SALON'`,
)

replaceExact(
  'business-account-approvals-v643.js',
  `'SELECT i.*,m."id" AS "accessId",m."accountType",m."targetId",m."accountName",m."loginId",m."contactEmail" AS "issuedEmail",m."accessStatus",m."mustChangePassword",m."approvalMailStatus",m."approvalMailSentAt",m."approvalMailError",m."approvedAt",m."approvedBy" FROM "BusinessInquiry" i LEFT JOIN "ManagedBusinessAccess" m ON m."inquiryId"=i."id"'`,
  `'SELECT i.*,m."id" AS "accessId",m."accountType",m."targetId",m."accountName",m."loginId",m."contactEmail" AS "issuedEmail",m."accessStatus",m."mustChangePassword",m."approvalMailStatus",m."approvalMailSentAt",m."approvalMailError",m."approvedAt",m."approvedBy",r."reason" AS "rejectionReason",r."contactEmail" AS "rejectionEmail",r."mailStatus" AS "rejectionMailStatus",r."mailSentAt" AS "rejectionMailSentAt",r."mailError" AS "rejectionMailError",r."rejectedAt",r."rejectedBy" FROM "BusinessInquiry" i LEFT JOIN "ManagedBusinessAccess" m ON m."inquiryId"=i."id" LEFT JOIN "BusinessInquiryRejection" r ON r."inquiryId"=i."id"'`,
)

replaceSection(
  'business-account-approvals-v643.js',
  '  function inquiryCard(row) {',
  '  function inquiriesPage(data, url) {',
  `  function inquiryCard(row) {
    const audience = { salon: '美容室', dealer: 'ディーラー', other: 'その他の法人' }[row.audience] || '未設定'
    const rejected = Boolean(row.rejectionReason)
    const status = rejected ? '却下' : ({ new: '未対応', in_progress: '対応中', closed: '完了' }[row.status] || '未対応')
    let issuance = ''
    if (row.accessId) {
      issuance = '<div class="baaIssued"><strong>' + escapeHtml(accountTypeLabel(row.accountType)) + 'アカウント発行済み</strong><div class="baaMeta" style="margin-top:7px"><span>ID <code>' + escapeHtml(row.loginId) + '</code></span><span>' + escapeHtml(row.issuedEmail) + '</span><span>' + escapeHtml(formatDate(row.approvedAt, true)) + '</span><span class="baaState ' + (row.approvalMailStatus === 'SENT' ? 'active' : 'suspended') + '">' + escapeHtml(mailStatusLabel(row.approvalMailStatus)) + '</span></div>' + (row.approvalMailStatus !== 'SENT' ? '<form class="baaInline" method="post" action="/api/platform/inquiries/' + encodeURIComponent(row.id) + '/resend"><button class="baaButton primary" type="submit">認証情報を再発行してメール送信</button></form>' : '') + '</div>'
    } else if (rejected) {
      issuance = '<div class="baaRejection"><strong>申請を却下</strong><div class="baaMeta" style="margin-top:7px"><span>' + escapeHtml(row.rejectionEmail) + '</span><span>' + escapeHtml(formatDate(row.rejectedAt, true)) + '</span><span class="baaState ' + (row.rejectionMailStatus === 'SENT' ? 'active' : 'suspended') + '">' + escapeHtml(rejectionMailStatusLabel(row.rejectionMailStatus)) + '</span></div><div class="baaRejectionReason"><span>却下理由</span><p>' + escapeHtml(row.rejectionReason) + '</p></div>' + (row.rejectionMailStatus !== 'SENT' ? '<form class="baaInline" method="post" action="/api/platform/inquiries/' + encodeURIComponent(row.id) + '/reject-resend"><button class="baaButton danger" type="submit">却下メールを再送</button></form>' : '') + '</div>'
    } else if (row.audience === 'salon' || row.audience === 'dealer') {
      const approve = '<details class="baaApprove"><summary>申請を承認してアカウントを発行</summary><form method="post" action="/api/platform/inquiries/' + encodeURIComponent(row.id) + '/approve"><div class="baaApproveGrid"><label class="baaField wide"><span>事業者・店舗名</span><input name="accountName" value="' + escapeHtml(row.organizationName) + '" required maxlength="140"></label><label class="baaField"><span>責任者・担当者名</span><input name="contactName" value="' + escapeHtml(row.contactName) + '" required maxlength="120"></label><label class="baaField"><span>承認メール送信先</span><input name="contactEmail" type="email" value="' + escapeHtml(row.email) + '" required maxlength="254"></label>' + (row.audience === 'salon' ? '<label class="baaField"><span>利用プラン</span><select name="planKey"><option value="take">竹プラン</option><option value="ume">梅プラン</option><option value="matsu">松プラン</option></select></label>' : '') + '<div class="baaField"><span>発行方法</span><div class="baaMeta">初期ID・初期PASSを自動生成し、承認メールで通知します。</div></div></div><button class="baaButton primary" style="margin-top:12px" type="submit">承認・発行する</button></form></details>'
      const reject = '<details class="baaReject"><summary>申請を却下</summary><form method="post" action="/api/platform/inquiries/' + encodeURIComponent(row.id) + '/reject"><label class="baaField"><span>却下理由</span><textarea name="reason" required maxlength="1000" placeholder="申請者へお伝えする理由を入力してください"></textarea></label><p class="baaRejectHelp">申請時の連絡先 ' + escapeHtml(row.email) + ' へ、入力した理由を自動送信します。</p><button class="baaButton danger" style="margin-top:12px" type="submit">却下してメール送信</button></form></details>'
      issuance = '<div class="baaDecisionActions">' + approve + reject + '</div>'
    } else {
      issuance = '<div class="baaIssued">この申請種別はアカウント自動発行・却下メールの対象外です。対応状況と運営メモで管理してください。</div>'
    }
    const progress = rejected
      ? '<div class="baaLockedStatus"><strong>対応状況: 却下済み</strong><br>却下理由と送信履歴は上記に記録されています。</div>'
      : '<form class="baaStatusForm" method="post" action="/api/platform/inquiries/' + encodeURIComponent(row.id) + '"><div class="baaApproveGrid"><label class="baaField"><span>対応状況</span><select name="status"><option value="new"' + (row.status === 'new' ? ' selected' : '') + '>未対応</option><option value="in_progress"' + (row.status === 'in_progress' ? ' selected' : '') + '>対応中</option><option value="closed"' + (row.status === 'closed' ? ' selected' : '') + '>完了</option></select></label><label class="baaField"><span>運営メモ</span><input name="operatorNote" value="' + escapeHtml(row.operatorNote || '') + '" maxlength="1000"></label></div><button class="baaButton" style="margin-top:10px" type="submit">対応状況を保存</button></form>'
    return '<article class="baaInquiry"><div class="baaInquiryHead"><div><div class="baaMeta"><span class="baaState">' + escapeHtml(audience) + '</span><span>' + escapeHtml(formatDate(row.createdAt, true)) + '</span></div><h2>' + escapeHtml(row.organizationName) + '</h2><div class="baaMeta"><span>' + escapeHtml(row.contactName) + '</span><a href="mailto:' + escapeHtml(row.email) + '">' + escapeHtml(row.email) + '</a><span>' + escapeHtml(row.phone || '電話未登録') + '</span><span>希望: ' + escapeHtml(row.preferredContact === 'phone' ? '電話' : row.preferredContact === 'email' ? 'メール' : 'どちらでも可') + '</span></div></div><span class="baaState ' + (rejected ? 'suspended' : row.status === 'closed' ? 'active' : '') + '">' + escapeHtml(status) + '</span></div><div class="baaMessage">' + escapeHtml(row.message) + '</div>' + issuance + '<div class="baaActions">' + progress + '<div></div></div></article>'
  }

`,
)

replaceExact(
  'business-account-approvals-v643.js',
  '問い合わせ内容を確認し、承認した事業者へ運営発行IDと初期パスワードを通知します。',
  '問い合わせ内容を確認し、承認時はログイン情報を、却下時は入力した理由を申請者へ自動通知します。',
)

replaceSection(
  'business-account-approvals-v643.js',
  '    const approvalMatch = pathname.match(/^\\/api\\/platform\\/inquiries\\/([^/]+)\\/(approve|resend)$/)',
  '    const statusMatch = pathname.match(/^\\/api\\/platform\\/business-accounts\\/(salon|dealer)\\/([^/]+)\\/(suspend|resume)$/)',
  `    const decisionMatch = pathname.match(/^\\/api\\/platform\\/inquiries\\/([^/]+)\\/(approve|resend|reject|reject-resend)$/)
    if (decisionMatch) {
      if (req.method !== 'POST') { res.statusCode = 405; res.end(); return true }
      if (!validSameOrigin(req)) { res.statusCode = 403; res.end(); return true }
      const inquiryId = decodeURIComponent(decisionMatch[1]).slice(0, 160)
      const action = decisionMatch[2]
      try {
        let result
        if (action === 'approve') result = await approveInquiry(inquiryId, await readForm(req), operator, req)
        else if (action === 'resend') result = await reissueCredentials(inquiryId, operator, req)
        else if (action === 'reject') result = await rejectInquiry(inquiryId, await readForm(req), operator, req)
        else result = await resendRejection(inquiryId, operator, req)
        const flag = action === 'approve' ? 'approved=1' : action === 'resend' ? 'resent=1' : action === 'reject' ? 'rejected=1' : 'rejectionResent=1'
        redirect(res, '/platform/inquiries?' + flag + '&mail=' + (result.mail.sent ? 'sent' : 'failed'))
      } catch (error) {
        const duplicate = error && (error.code === '23505' || error.code === 'P2002')
        const code = error instanceof BusinessAccessError ? error.code : duplicate ? 'duplicate' : 'server'
        if (code === 'server') console.error('[business-application-rejection-v648] application decision failed', { action, error: error && error.stack || error })
        redirect(res, '/platform/inquiries?error=' + encodeURIComponent(code))
      }
      return true
    }
`,
)

replaceExact(
  'business-account-approvals-v643.js',
  `    approveInquiry,
    reissueCredentials,`,
  `    approveInquiry,
    rejectInquiry,
    resendRejection,
    reissueCredentials,`,
)

replaceExact(
  'business-account-approvals-v643.js',
  `  RELEASE,
  BusinessAccessError,
  approvalEmail,`,
  `  RELEASE,
  APPLICATION_REJECTION_RELEASE,
  BusinessAccessError,
  approvalEmail,
  rejectionEmail,`,
)

replaceExact(
  'server.js',
  "      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Style-Admin-Pagination', 'v647') /* style-admin-pagination-v647-ready */",
  "      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Style-Admin-Pagination', 'v647') /* style-admin-pagination-v647-ready */\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Business-Application-Rejection', 'v648') /* business-application-rejection-v648-ready */",
)

fs.writeFileSync('/tmp/business-application-rejection-v648-changes.json', JSON.stringify(changes))
console.log(JSON.stringify({ release: 'business-application-rejection-v648', changedFiles: [...new Set(changes.map(change => change.file))], changes: changes.length }))
