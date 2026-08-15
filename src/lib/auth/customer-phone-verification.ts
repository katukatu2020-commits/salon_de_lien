import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import {
  SMS_CODE_TTL_MINUTES,
  SMS_MAX_VERIFY_ATTEMPTS,
  PHONE_REGISTRATION_TTL_MINUTES,
  generatePhoneRegistrationToken,
  generateSmsVerificationCode,
  hashPhoneRegistrationToken,
  hashSmsRequestIp,
  hashSmsVerificationCode,
  maskJapaneseMobilePhone,
  normalizeJapaneseMobilePhone,
  phoneVerificationSecret,
  secureHashMatches
} from "@/lib/auth/phone-verification";
import { sendTransactionalSms } from "@/lib/auth/sms-provider";

export class PhoneVerificationError extends Error {
  constructor(message: string, readonly status = 400, readonly code = "invalid_request") {
    super(message);
  }
}

export async function hasExistingCustomerAccount(organizationId: string, phoneE164: string) {
  const identity = await prisma.customerPhoneIdentity.findUnique({
    where: { organizationId_phoneE164: { organizationId, phoneE164 } },
    select: { id: true }
  });
  if (identity) return true;

  const legacyAccounts = await prisma.appUser.findMany({
    where: {
      organizationId,
      role: "CUSTOMER",
      active: true,
      customer: { is: { deletedAt: null, phone: { not: null } } }
    },
    select: { customer: { select: { phone: true } } }
  });
  return legacyAccounts.some((account) => {
    const phone = account.customer?.phone;
    return phone ? normalizeJapaneseMobilePhone(phone) === phoneE164 : false;
  });
}

export async function requestCustomerPhoneVerification(input: {
  rawPhone: string;
  organizationId: string;
  requestAddress: string;
}) {
  const phoneE164 = normalizeJapaneseMobilePhone(input.rawPhone);
  if (!phoneE164) {
    throw new PhoneVerificationError("SMSを受信できる携帯番号を入力してください。", 400, "invalid_phone");
  }
  if (await hasExistingCustomerAccount(input.organizationId, phoneE164)) {
    throw new PhoneVerificationError("この電話番号はすでに登録されています。ログインまたはパスワード再設定をご利用ください。", 409, "phone_in_use");
  }

  const secret = phoneVerificationSecret();
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const requestIpHash = hashSmsRequestIp(input.requestAddress || "unknown", secret);
  const [phoneRequests, addressRequests] = await Promise.all([
    prisma.smsVerificationChallenge.count({
      where: { organizationId: input.organizationId, phoneE164, createdAt: { gt: oneHourAgo } }
    }),
    prisma.smsVerificationChallenge.count({
      where: { requestIpHash, createdAt: { gt: oneHourAgo } }
    })
  ]);
  if (phoneRequests >= 3 || addressRequests >= 10) {
    throw new PhoneVerificationError("認証コードの送信回数が上限に達しました。1時間ほど待ってからお試しください。", 429, "rate_limited");
  }

  const challengeId = randomUUID();
  const code = generateSmsVerificationCode();
  const expiresAt = new Date(Date.now() + SMS_CODE_TTL_MINUTES * 60 * 1000);
  await prisma.smsVerificationChallenge.create({
    data: {
      id: challengeId,
      organizationId: input.organizationId,
      phoneE164,
      codeHash: hashSmsVerificationCode({ challengeId, phoneE164, code, secret }),
      requestIpHash,
      expiresAt
    }
  });

  let smsResult: Awaited<ReturnType<typeof sendTransactionalSms>>;
  try {
    smsResult = await sendTransactionalSms({
      phoneE164,
      message: `Salon de Lien 認証コード: ${code}（${SMS_CODE_TTL_MINUTES}分有効）。心当たりがなければ無視してください。`
    });
  } catch (error) {
    await prisma.smsVerificationChallenge.delete({ where: { id: challengeId } }).catch(() => undefined);
    throw new PhoneVerificationError(error instanceof Error ? error.message : "SMSを送信できませんでした。", 503, "sms_failed");
  }

  return {
    challengeId,
    maskedPhone: maskJapaneseMobilePhone(phoneE164),
    expiresAt,
    developmentCode:
      smsResult.provider === "console" && process.env.APP_ENV !== "production" && process.env.SMS_DEV_SHOW_CODE === "true"
        ? code
        : undefined
  };
}

export async function verifyCustomerPhoneCode(input: { challengeId: string; code: string }) {
  const code = input.code.replace(/\D/g, "");
  if (!input.challengeId || code.length !== 6) {
    throw new PhoneVerificationError("6桁の認証コードを入力してください。", 400, "invalid_code");
  }
  const secret = phoneVerificationSecret();

  const outcome = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "SmsVerificationChallenge" WHERE "id" = ${input.challengeId} FOR UPDATE`;
    const challenge = await tx.smsVerificationChallenge.findUnique({ where: { id: input.challengeId } });
    if (!challenge || challenge.consumedAt || challenge.expiresAt <= new Date()) {
      return { error: new PhoneVerificationError("認証コードの有効期限が切れています。もう一度送信してください。", 410, "expired") } as const;
    }
    if (challenge.verifiedAt) {
      return { error: new PhoneVerificationError("この認証コードは確認済みです。最初からやり直してください。", 409, "already_verified") } as const;
    }
    if (challenge.attempts >= SMS_MAX_VERIFY_ATTEMPTS) {
      return { error: new PhoneVerificationError("認証コードの入力回数が上限に達しました。もう一度送信してください。", 429, "attempts_exceeded") } as const;
    }

    const expectedHash = hashSmsVerificationCode({
      challengeId: challenge.id,
      phoneE164: challenge.phoneE164,
      code,
      secret
    });
    if (!secureHashMatches(challenge.codeHash, expectedHash)) {
      await tx.smsVerificationChallenge.update({
        where: { id: challenge.id },
        data: { attempts: { increment: 1 } }
      });
      return { error: new PhoneVerificationError("認証コードが正しくありません。", 400, "invalid_code") } as const;
    }

    const registrationToken = generatePhoneRegistrationToken();
    await tx.smsVerificationChallenge.update({
      where: { id: challenge.id },
      data: {
        verifiedAt: new Date(),
        expiresAt: new Date(Date.now() + PHONE_REGISTRATION_TTL_MINUTES * 60 * 1000),
        registrationTokenHash: hashPhoneRegistrationToken({ challengeId: challenge.id, token: registrationToken, secret })
      }
    });
    return { value: { registrationToken, maskedPhone: maskJapaneseMobilePhone(challenge.phoneE164) } } as const;
  });

  if ("error" in outcome) throw outcome.error;
  return outcome.value;
}
