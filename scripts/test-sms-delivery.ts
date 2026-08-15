import { normalizeJapaneseMobilePhone } from "../src/lib/auth/phone-verification";
import { sendTransactionalSms } from "../src/lib/auth/sms-provider";

async function main() {
  const rawPhone = process.env.SMS_TEST_PHONE?.trim() ?? "";
  const phoneE164 = normalizeJapaneseMobilePhone(rawPhone);
  if (!phoneE164) {
    throw new Error("SMS_TEST_PHONE に070・080・090で始まる携帯番号を設定してください。");
  }
  if (process.env.SMS_PROVIDER !== "aws-sns") {
    throw new Error("実送信テストでは SMS_PROVIDER=aws-sns が必要です。");
  }

  const result = await sendTransactionalSms({
    phoneE164,
    message: "【Salon de Lien】SMS認証の実送信テストです。このメッセージへの返信は不要です。"
  });
  console.log(`SMS accepted by ${result.provider}: ${result.messageId ? "message id received" : "no message id"}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "SMS送信テストに失敗しました。");
  process.exitCode = 1;
});
