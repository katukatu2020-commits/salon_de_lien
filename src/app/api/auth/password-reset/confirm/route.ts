import { NextRequest, NextResponse } from "next/server";
import { hashScryptPassword } from "@/lib/auth/password";
import {
  hashPasswordResetToken,
  isPasswordResetTokenFormat,
  type PasswordResetAudience
} from "@/lib/auth/password-reset";
import { getExternalRequestUrl, hasValidRequestOrigin } from "@/lib/auth/request-security";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function isAudience(value: string): value is PasswordResetAudience {
  return value === "admin" || value === "customer";
}

function resetPath(audience: PasswordResetAudience, token: string, error: string) {
  const base = audience === "admin" ? `/admin/password-reset/${token}` : `/u/password-reset/${token}`;
  return `${base}?error=${encodeURIComponent(error)}`;
}

export async function POST(request: NextRequest) {
  if (!hasValidRequestOrigin(request)) {
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  }
  const formData = await request.formData();
  const audienceValue = String(formData.get("audience") || "");
  if (!isAudience(audienceValue)) return NextResponse.json({ error: "Invalid audience" }, { status: 400 });
  const audience = audienceValue;
  const token = String(formData.get("token") || "");
  const password = String(formData.get("password") || "");
  const confirmPassword = String(formData.get("confirmPassword") || "");

  if (!isPasswordResetTokenFormat(token)) {
    return NextResponse.redirect(getExternalRequestUrl(request, resetPath(audience, token, "invalid")), 303);
  }
  if (password.length < 8 || password.length > 72) {
    return NextResponse.redirect(getExternalRequestUrl(request, resetPath(audience, token, "password")), 303);
  }
  if (password !== confirmPassword) {
    return NextResponse.redirect(getExternalRequestUrl(request, resetPath(audience, token, "mismatch")), 303);
  }

  const now = new Date();
  const tokenHash = hashPasswordResetToken(token);
  let loginId: string | null = null;
  try {
    loginId = await prisma.$transaction(async (tx) => {
      const reset = await tx.passwordResetToken.findUnique({
        where: { tokenHash },
        select: {
          id: true,
          audience: true,
          usedAt: true,
          expiresAt: true,
          appUserId: true,
          appUser: { select: { active: true, role: true, loginId: true } }
        }
      });
      const allowedRole = reset && (audience === "customer"
        ? reset.appUser.role === "CUSTOMER"
        : ["ADMIN", "STAFF", "MANUFACTURER"].includes(reset.appUser.role));
      if (!reset || reset.audience !== audience || reset.usedAt || reset.expiresAt <= now || !reset.appUser.active || !allowedRole) {
        throw new Error("INVALID_RESET_TOKEN");
      }

      const claimed = await tx.passwordResetToken.updateMany({
        where: { id: reset.id, usedAt: null, expiresAt: { gt: now } },
        data: { usedAt: now }
      });
      if (claimed.count !== 1) throw new Error("INVALID_RESET_TOKEN");

      await tx.appUser.update({
        where: { id: reset.appUserId },
        data: { passwordHash: hashScryptPassword(password) }
      });
      await tx.passwordResetToken.updateMany({
        where: { appUserId: reset.appUserId, usedAt: null },
        data: { usedAt: now }
      });
      return reset.appUser.loginId;
    });
  } catch (error) {
    if (error instanceof Error && error.message !== "INVALID_RESET_TOKEN") {
      console.error("password reset confirmation failed", { error: error.message });
    }
    return NextResponse.redirect(getExternalRequestUrl(request, resetPath(audience, token, "invalid")), 303);
  }

  const loginUrl = getExternalRequestUrl(request, audience === "admin" ? "/admin/login" : "/u/login");
  loginUrl.searchParams.set("reset", "1");
  if (audience === "customer" && loginId) loginUrl.searchParams.set("loginId", loginId);
  const response = NextResponse.redirect(loginUrl, 303);
  response.headers.set("Cache-Control", "no-store");
  return response;
}
