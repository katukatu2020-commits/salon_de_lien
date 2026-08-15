import { PublishCommand, SNSClient } from "@aws-sdk/client-sns";

type SmsInput = {
  phoneE164: string;
  message: string;
};

export type SmsSendResult = {
  provider: "aws-sns" | "console";
  messageId?: string;
};

let snsClient: SNSClient | null = null;

function providerName() {
  const configured = process.env.SMS_PROVIDER?.trim().toLowerCase();
  if (configured === "aws-sns" || configured === "console") return configured;
  return process.env.APP_ENV === "production" ? "unconfigured" : "console";
}

function senderId() {
  const value = process.env.SMS_SENDER_ID?.trim();
  if (!value) return null;
  if (!/^(?=.{1,11}$)(?=.*[A-Za-z])[A-Za-z0-9-]+$/.test(value) || value.startsWith("-") || value.endsWith("-")) {
    throw new Error("SMSの送信者ID設定が正しくありません。");
  }
  return value;
}

function deliveryError(error: unknown) {
  const name = typeof error === "object" && error !== null && "name" in error ? String(error.name) : "";
  const message = error instanceof Error ? error.message : "";

  if (/needs a subscription|subscription for the service/i.test(message)) {
    return new Error("AWSのSMS送信サービスがまだ有効化されていません。店舗へお問い合わせください。");
  }
  if (name === "CredentialsProviderError" || /credentials|credential/i.test(message)) {
    return new Error("SMS送信サービスのAWS認証が未設定です。店舗へお問い合わせください。");
  }
  if (name === "AuthorizationErrorException" || name === "AccessDeniedException" || /not authorized|access denied/i.test(message)) {
    return new Error("SMS送信サービスの権限が設定されていません。店舗へお問い合わせください。");
  }
  if (name === "ThrottledException" || name === "TooManyRequestsException" || /throttl/i.test(message)) {
    return new Error("SMS送信が混み合っています。少し待ってからもう一度お試しください。");
  }
  if (name === "OptedOutException") {
    return new Error("この電話番号はSMSを受信できない設定になっています。");
  }
  if (name === "InvalidParameterException" || name === "InvalidParameter") {
    return new Error("SMSを送信できない電話番号です。番号を確認してください。");
  }
  return new Error("SMS配信サービスで送信に失敗しました。少し待ってからもう一度お試しください。");
}

export async function sendTransactionalSms(input: SmsInput): Promise<SmsSendResult> {
  const provider = providerName();

  if (provider === "console") {
    if (process.env.APP_ENV === "production") {
      throw new Error("本番環境ではconsole SMSを使用できません。");
    }
    console.info("development SMS sent", { phone: input.phoneE164.replace(/\d(?=\d{4})/g, "*") });
    return { provider };
  }

  if (provider !== "aws-sns") {
    throw new Error("SMS_PROVIDER=aws-sns を設定してください。");
  }

  const region = process.env.AWS_REGION || "ap-northeast-1";
  snsClient ??= new SNSClient({ region });
  const messageAttributes: Record<string, { DataType: "String" | "Number"; StringValue: string }> = {
    "AWS.SNS.SMS.SMSType": { DataType: "String", StringValue: "Transactional" }
  };
  const configuredSenderId = senderId();
  if (configuredSenderId) {
    messageAttributes["AWS.SNS.SMS.SenderID"] = { DataType: "String", StringValue: configuredSenderId };
  }
  const maxPrice = process.env.SMS_MAX_PRICE_USD?.trim();
  if (maxPrice && /^\d+(\.\d{1,4})?$/.test(maxPrice)) {
    messageAttributes["AWS.SNS.SMS.MaxPrice"] = { DataType: "Number", StringValue: maxPrice };
  }

  try {
    const result = await snsClient.send(new PublishCommand({
      PhoneNumber: input.phoneE164,
      Message: input.message,
      MessageAttributes: messageAttributes
    }));

    if (!result.MessageId) throw new Error("SMS provider did not return a message id");
    return { provider, messageId: result.MessageId };
  } catch (error) {
    throw deliveryError(error);
  }
}
