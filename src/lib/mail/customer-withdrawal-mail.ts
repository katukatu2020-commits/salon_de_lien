import "server-only";

import { sendPostmarkMessage } from "@/lib/mail/postmark";

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]!);
}

export function sendCustomerWithdrawalMail({
  to,
  customerName,
  confirmationUrl,
  expiresInMinutes,
  customerId
}: {
  to: string;
  customerName: string;
  confirmationUrl: string;
  expiresInMinutes: number;
  customerId: string;
}) {
  const safeName = escapeHtml(customerName);
  const safeUrl = escapeHtml(confirmationUrl);
  const subject = "【Salon de Lien】退会手続きの確認";
  return sendPostmarkMessage({
    to,
    subject,
    tag: "customer-withdrawal",
    metadata: { customerId },
    textBody: `${customerName} 様\n\nSalon de Lienの退会申請を受け付けました。\n以下のリンクを開き、表示された「退会を確定する」を押してください。\n\n${confirmationUrl}\n\nこのリンクは${expiresInMinutes}分間有効です。心当たりがない場合は、このメールを破棄してください。`,
    htmlBody: `<!doctype html><html lang="ja"><body style="margin:0;background:#fbf7f2;color:#2f2a25;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif"><div style="max-width:600px;margin:0 auto;padding:36px 20px"><div style="background:#fff;border:1px solid #eadfd5;border-radius:24px;padding:32px"><p style="margin:0 0 8px;color:#a35a4a;font-size:12px;letter-spacing:.12em">SALON DE LIEN</p><h1 style="margin:0 0 20px;font-family:serif;font-size:26px">退会手続きの確認</h1><p>${safeName} 様</p><p style="line-height:1.8">退会申請を受け付けました。下のボタンから確認画面を開き、表示された「退会を確定する」を押してください。</p><p style="margin:28px 0"><a href="${safeUrl}" style="display:inline-block;border-radius:999px;background:#8f4f42;color:#fff;text-decoration:none;padding:14px 24px;font-weight:700">退会手続きを確認する</a></p><p style="color:#766b63;font-size:13px;line-height:1.7">リンクは${expiresInMinutes}分間有効です。心当たりがない場合は、このメールを破棄してください。</p></div></div></body></html>`
  });
}
