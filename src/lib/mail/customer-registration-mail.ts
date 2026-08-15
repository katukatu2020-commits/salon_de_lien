import { sendGmailTextMail } from "@/lib/mail/password-reset-mail";

type CustomerRegistrationMailInput = {
  to: string;
  registrationUrl: string;
  expiresInMinutes: number;
};

export async function sendCustomerRegistrationMail(input: CustomerRegistrationMailInput) {
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

  await sendGmailTextMail({
    to: input.to,
    subject: "Salon de Lien お客様アプリの初回登録",
    body
  });
}
