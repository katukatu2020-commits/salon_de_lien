import { sendPostmarkMessage } from "@/lib/mail/postmark";

type CustomerRegistrationMailInput = {
  to: string;
  registrationUrl: string;
  expiresInMinutes: number;
};

export async function sendCustomerRegistrationMail(input: CustomerRegistrationMailInput) {
  const escapedRegistrationUrl = input.registrationUrl
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
  const body = [
    "Salon de Lien お客様アプリの初回登録を受け付けました。",
    "",
    `次のURLを開き、${input.expiresInMinutes}分以内にプロフィールとログイン情報を登録してください。`,
    input.registrationUrl,
    "",
    "登録画面では、携帯電話番号のSMS認証を行います。",
    "このメールに心当たりがない場合は、何もせず破棄してください。",
    "このURLは登録完了後に無効になります。",
    "",
    "Salon de Lien"
  ].join("\r\n");

  await sendPostmarkMessage({
    to: input.to,
    subject: "Salon de Lien お客様アプリの初回登録",
    textBody: body,
    htmlBody: `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;line-height:1.8;color:#2f2522"><p>Salon de Lien お客様アプリの初回登録を受け付けました。</p><p>次のボタンを押し、${input.expiresInMinutes}分以内にプロフィールとログイン情報を登録してください。</p><p><a href="${escapedRegistrationUrl}" style="display:inline-block;padding:12px 22px;border-radius:999px;background:#a75161;color:#fff;text-decoration:none;font-weight:700">お客様アプリの登録を続ける</a></p><p style="font-size:13px;color:#766862">このメールに心当たりがない場合は、何もせず破棄してください。このURLは登録完了後に無効になります。</p><p>Salon de Lien</p></div>`,
    tag: "customer-registration"
  });
}
