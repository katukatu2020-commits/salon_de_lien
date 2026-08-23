import { sendPostmarkMessage } from "@/lib/mail/postmark";
import { renderTransactionalEmail } from "@/lib/mail/transactional-email";

type CustomerRegistrationMailInput = {
  to: string;
  registrationUrl: string;
  expiresInMinutes: number;
};

export async function sendCustomerRegistrationMail(input: CustomerRegistrationMailInput) {
  const body = [
    "Salon de Lien お客様アプリ",
    "━━━━━━━━━━━━━━━━━━━━",
    "登録手続きを完了してください",
    "",
    "お客様アプリの登録手続きを受け付けました。",
    `以下のURLを開き、${input.expiresInMinutes}分以内にプロフィールとログイン情報を設定してください。`,
    "",
    input.registrationUrl,
    "",
    `有効期限: このメールの送信から${input.expiresInMinutes}分`,
    "登録画面では、ご本人確認のため携帯電話番号のSMS認証を行います。",
    "",
    "このメールに心当たりがない場合は、URLを開かずにこのメールを削除してください。",
    "URLは登録完了後、または有効期限を過ぎると利用できなくなります。",
    "",
    "Salon de Lien"
  ].join("\r\n");

  await sendPostmarkMessage({
    to: input.to,
    subject: "【Salon de Lien】お客様アプリの登録手続きをお願いします",
    textBody: body,
    htmlBody: renderTransactionalEmail({
      preheader: `お客様アプリの登録手続きを${input.expiresInMinutes}分以内に完了してください。`,
      eyebrow: "お客様アプリ",
      title: "登録手続きを完了してください",
      lead: "お客様アプリの登録手続きを受け付けました。プロフィールとログイン情報を設定すると、予約やポイントなどをご利用いただけます。",
      details: [
        { label: "有効期限", value: `このメールの送信から${input.expiresInMinutes}分` },
        { label: "ご本人確認", value: "登録画面で携帯電話番号のSMS認証を行います" }
      ],
      actionLabel: "登録手続きを続ける",
      actionUrl: input.registrationUrl,
      notice: "URLは登録完了後、または有効期限を過ぎると利用できなくなります。",
      securityMessage: "このメールに心当たりがない場合は、ボタンやURLを開かずにこのメールを削除してください。"
    }),
    tag: "customer-registration"
  });
}
