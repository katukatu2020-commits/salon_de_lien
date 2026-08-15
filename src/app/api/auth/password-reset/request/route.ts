import { NextRequest, NextResponse } from "next/server";
import {
  generatePasswordResetToken,
  isDeliverableRecoveryEmail,
  normalizeRecoveryEmail,
  passwordResetExpiresAt,
  passwordResetMinutes,
  hashPasswordResetToken,
  type PasswordResetAudience
} from "@/lib/auth/password-reset";
import { getExternalRequestUrl, hasValidRequestOrigin } from "@/lib/auth/request-security";
import { sendPasswordResetMail } from "@/lib/mail/password-reset-mail";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type Attempt = { count: number; resetAt: number };
const attempts = new Map<string, Attempt>();
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function isAudience(value: string): value is PasswordResetAudience {
  return value === "admin" || value === "customer";
}

function requestPage(audience: PasswordResetAudience) {
  return audience === "admin" ? "/admin/password-reset" : "/u/password-reset";
}

function genericSuccess(request: NextRequest, audience: PasswordResetAudience) {
  const url = getExternalRequestUrl(request, requestPage(audience));
  url.searchParams.set("sent", "1");
  const response = NextResponse.redirect(url, 303);
  response.headers.set("Cache-Control", "no-store");
  return response;
}

function clientKey(request: NextRequest, email: string, audience: PasswordResetAudience) {
  const address = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  return `${address}:${audience}:${email}`;
}

export async function POST(request: NextRequest) {
  if (!hasValidRequestOrigin(request)) {
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  }

  const formData = await request.formData();
  const audienceValue = String(formData.get("audience") || "");
  if (!isAudience(audienceValue)) {
    return NextResponse.json({ error: "Invalid audience" }, { status: 400 });
  }
  const audience = audienceValue;
  const email = normalizeRecoveryEmail(String(formData.get("email") || ""));
  const success = () => genericSuccess(request, audience);
  if (!isDeliverableRecoveryEmail(email)) return success();

  const key = clientKey(request, email, audience);
  const now = Date.now();
  const attempt = attempts.get(key);
  if (attempt && attempt.resetAt > now && attempt.count >= MAX_ATTEMPTS) return success();
  attempts.set(key, {
    count: (attempt?.resetAt ?? 0) > now ? attempt!.count + 1 : 1,
    resetAt: (attempt?.resetAt ?? 0) > now ? attempt!.resetAt : now + ATTEMPT_WINDOW_MS
  });

  const appUser = await prisma.appUser.findFirst({
    where: {
      email: { equals: email, mode: "insensitive" },
      active: true,
      role: audience === "customer" ? "CUSTOMER" : { in: ["ADMIN", "STAFF", "MANUFACTURER"] }
    },
    select: { id: true, email: true, loginId: true, role: true }
  });
  if (!appUser || !isDeliverableRecoveryEmail(appUser.email)) return success();

  const token = generatePasswordResetToken();
  const expiresAt = passwordResetExpiresAt();
  const record = await prisma.$transaction(async (tx) => {
    await tx.passwordResetToken.updateMany({
      where: { appUserId: appUser.id, usedAt: null },
      data: { usedAt: new Date() }
    });
    return tx.passwordResetToken.create({
      data: {
        appUserId: appUser.id,
        tokenHash: hashPasswordResetToken(token),
        audience,
        expiresAt
      },
      select: { id: true }
    });
  });

  const resetPath = audience === "admin" ? `/admin/password-reset/${token}` : `/u/password-reset/${token}`;
  try {
    await sendPasswordResetMail({
      to: appUser.email,
      audienceLabel: audience === "admin" ? "店舗管理画面" : "お客様アプリ",
      loginId: appUser.loginId,
      resetUrl: getExternalRequestUrl(request, resetPath).toString(),
      expiresInMinutes: passwordResetMinutes()
    });
  } catch (error) {
    await prisma.passwordResetToken.deleteMany({ where: { id: record.id } });
    console.error("password reset mail delivery failed", {
      audience,
      provider: "gmail",
      error: error instanceof Error ? error.message : "unknown error"
    });
  }

  return success();
}
