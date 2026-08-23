import "server-only";

import { sendPostmarkMessage } from "@/lib/mail/postmark";
import { renderTransactionalEmail } from "@/lib/mail/transactional-email";

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
  const subject = "【Salon de Lien】退会手続きの確認";
  return sendPostmarkMessage({
    to,
    subject,
    tag: "customer-withdrawal",
    metadata: { customerId },
    textBody: [
      "Salon de Lien お客様アプリ",
      "━━━━━━━━━━━━━━━━━━━━",
      "退会手続きの確認",
      "",
      `${customerName} 様`,
      "",
      "退会申請を受け付けました。この時点では、まだ退会は完了していません。",
      "以下のURLから確認画面を開き、内容をご確認のうえ「退会を確定する」を押してください。",
      "",
      confirmationUrl,
      "",
      `有効期限: このメールの送信から${expiresInMinutes}分`,
      "確認画面を開いただけでは退会は完了しません。",
      "",
      "このメールに心当たりがない場合は、URLを開かずにこのメールを削除してください。お客様のアカウントはそのままご利用いただけます。",
      "",
      "Salon de Lien"
    ].join("\r\n"),
    htmlBody: renderTransactionalEmail({
      preheader: "退会申請を受け付けました。内容をご確認ください。",
      eyebrow: "お客様アプリ",
      title: "退会手続きの確認",
      greeting: `${customerName} 様`,
      lead: "退会申請を受け付けました。この時点では、まだ退会は完了していません。確認画面で内容をご確認のうえ、退会を確定してください。",
      details: [{ label: "有効期限", value: `このメールの送信から${expiresInMinutes}分` }],
      actionLabel: "退会手続きを確認する",
      actionUrl: confirmationUrl,
      notice: "確認画面を開いただけでは退会は完了しません。画面内の「退会を確定する」を押した時点で手続きが完了します。",
      securityMessage: "このメールに心当たりがない場合は、ボタンやURLを開かずにこのメールを削除してください。お客様のアカウントはそのままご利用いただけます。"
    })
  });
}
