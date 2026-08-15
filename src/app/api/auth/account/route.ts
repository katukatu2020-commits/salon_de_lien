import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE } from "@/lib/auth/admin-session";
import { requireBackofficeSession } from "@/lib/auth/authorization";
import { hashScryptPassword, verifyScryptPassword } from "@/lib/auth/password";
import { getExternalRequestUrl, hasValidRequestOrigin, isExternalHttpsRequest } from "@/lib/auth/request-security";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function redirectError(request: NextRequest, error: string) {
  const url = getExternalRequestUrl(request, "/admin/account");
  url.searchParams.set("error", error);
  return NextResponse.redirect(url, 303);
}

export async function POST(request: NextRequest) {
  if (!hasValidRequestOrigin(request)) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  const session = await requireBackofficeSession(["ADMIN", "STAFF", "MANUFACTURER"]);
  if (!session.userId) return redirectError(request, "unavailable");
  const formData = await request.formData();
  const newLoginId = String(formData.get("newLoginId") || "").trim().toLowerCase();
  const newPassword = String(formData.get("newPassword") || "");
  const newPasswordConfirm = String(formData.get("newPasswordConfirm") || "");
  const currentPassword = String(formData.get("currentPassword") || "");
  if (!/^[a-z0-9._@+-]{4,80}$/i.test(newLoginId)) return redirectError(request, "loginId");
  if (newPassword && (newPassword.length < 8 || newPassword.length > 128 || newPassword !== newPasswordConfirm)) {
    return redirectError(request, "password");
  }

  const user = await prisma.appUser.findUnique({ where: { id: session.userId }, select: { id: true, loginId: true, email: true, passwordHash: true } });
  if (!user?.passwordHash || !verifyScryptPassword(currentPassword, user.passwordHash)) return redirectError(request, "current");
  const unchangedId = (user.loginId ?? user.email).toLowerCase() === newLoginId;
  if (unchangedId && !newPassword) return redirectError(request, "unchanged");
  const duplicate = await prisma.appUser.findFirst({
    where: { id: { not: user.id }, OR: [{ loginId: { equals: newLoginId, mode: "insensitive" } }, { email: { equals: newLoginId, mode: "insensitive" } }] },
    select: { id: true }
  });
  if (duplicate) return redirectError(request, "duplicate");

  try {
    await prisma.appUser.update({
      where: { id: user.id },
      data: { loginId: newLoginId, ...(newPassword ? { passwordHash: hashScryptPassword(newPassword) } : {}) }
    });
  } catch {
    return redirectError(request, "failed");
  }

  const response = NextResponse.redirect(getExternalRequestUrl(request, "/admin/login?account=updated"), 303);
  response.cookies.set({ name: ADMIN_SESSION_COOKIE, value: "", httpOnly: true, sameSite: "lax", secure: isExternalHttpsRequest(request), path: "/", maxAge: 0 });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
