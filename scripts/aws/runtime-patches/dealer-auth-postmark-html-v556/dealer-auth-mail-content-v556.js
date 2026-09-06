'use strict'

const RELEASE = 'dealer-auth-postmark-html-v556'
const AUTH_TOKEN_MINUTES = 30

function escapeHtml(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character])
}

function dealerAuthMailHtml(input) {
  const detail = input.loginId
    ? `<tr><td style="padding:8px 0;color:#7c7168;font-size:12px">ログインID</td><td style="padding:8px 0;text-align:right;font-size:13px;font-weight:700">${escapeHtml(input.loginId)}</td></tr>`
    : ''
  const securityNote = input.oneTime === false
    ? 'このメールに心当たりがない場合は、何もせず削除してください。'
    : `このURLは送信から${AUTH_TOKEN_MINUTES}分間、一度だけ有効です。心当たりがない場合は、このメールを削除してください。`
  return `<!doctype html><html lang="ja"><body style="margin:0;background:#f8f4ef;color:#2f2926;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Noto Sans JP',sans-serif"><div style="display:none;max-height:0;overflow:hidden">${escapeHtml(input.preheader)}</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 12px;background:#f8f4ef"><tr><td align="center"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;border:1px solid #eaded8;background:#fff"><tr><td style="padding:30px 32px"><img src="${escapeHtml(input.origin)}/brand/orimia-icon-192.png" width="52" height="52" alt="ORIMIA" style="display:block;border:0"><p style="margin:22px 0 6px;color:#b83d5e;font-size:12px;font-weight:700;letter-spacing:.08em">ORIMIA PARTNER NETWORK</p><h1 style="margin:0;font-family:Georgia,'Yu Mincho',serif;font-size:27px;font-weight:500;line-height:1.5">${escapeHtml(input.title)}</h1><p style="margin:16px 0 20px;color:#746864;font-size:14px;line-height:1.8">${escapeHtml(input.lead)}</p>${detail ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:22px;border-top:1px solid #eee4df;border-bottom:1px solid #eee4df">${detail}</table>` : ''}<a href="${escapeHtml(input.actionUrl)}" style="display:block;padding:14px 18px;background:#b83d5e;color:#fff;font-size:14px;font-weight:700;text-align:center;text-decoration:none">${escapeHtml(input.actionLabel)}</a><p style="margin:18px 0 0;color:#8a7e79;font-size:12px;line-height:1.8">${escapeHtml(securityNote)}</p></td></tr></table></td></tr></table></body></html>`
}

module.exports = { AUTH_TOKEN_MINUTES, RELEASE, dealerAuthMailHtml }
