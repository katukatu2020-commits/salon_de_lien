import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  createAdminSessionToken,
  getAdminSessionHours,
  normalizeAdminEmail
} from "@/lib/auth/admin-session";
import { verifyScryptPassword } from "@/lib/auth/password";
import { getExternalRequestUrl, hasValidRequestOrigin, isExternalHttpsRequest } from "@/lib/auth/request-security";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type Attempt = { count: number; resetAt: number };
const attempts = new Map<string, Attempt>();
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function clientKey(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

function safeReturnPath(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return "/admin/customers";
  }
  return value;
}

function loginRedirect(request: NextRequest, error: string, nextPath: string) {
  const url = getExternalRequestUrl(request, "/admin/login");
  url.searchParams.set("error", error);
  url.searchParams.set("next", nextPath);
  return NextResponse.redirect(url, 303);
}

export async function POST(request: NextRequest) {
  if (!hasValidRequestOrigin(request)) {
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  }

  const formData = await request.formData();
  const nextPath = safeReturnPath(formData.get("next"));
  const secret = process.env.ADMIN_AUTH_SECRET;

  if (!secret || secret.length < 32) {
    return loginRedirect(request, "config", nextPath);
  }

  const key = clientKey(request);
  const now = Date.now();
  const attempt = attempts.get(key);
  if (attempt && attempt.resetAt > now && attempt.count >= MAX_ATTEMPTS) {
    return loginRedirect(request, "locked", nextPath);
  }
  if (attempt && attempt.resetAt <= now) attempts.delete(key);

  const email = normalizeAdminEmail(String(formData.get("email") || ""));
  const password = String(formData.get("password") || "");
  const appUser = await prisma.appUser.findFirst({
    where: {
      OR: [
        { email: { equals: email, mode: "insensitive" } },
        { loginId: { equals: email, mode: "insensitive" } }
      ]
    },
    select: {
      id: true,
      email: true,
      passwordHash: true,
      role: true,
      organizationId: true,
      manufacturerName: true,
      active: true
    }
  });
  const isBackofficeRole = appUser && ["ADMIN", "STAFF", "MANUFACTURER"].includes(appUser.role);
  const validAppUser = Boolean(
    appUser?.active &&
    isBackofficeRole &&
    appUser.passwordHash &&
    password.length <= 256 &&
    verifyScryptPassword(password, appUser.passwordHash)
  );

  const configuredEmail = process.env.ADMIN_EMAIL;
  const configuredLoginId = process.env.ADMIN_LOGIN_ID?.trim() || "lien";
  const configuredPasswordHash = process.env.ADMIN_PASSWORD_HASH;
  const validFallbackAdmin = Boolean(
    configuredEmail &&
    configuredPasswordHash &&
    (email === normalizeAdminEmail(configuredEmail) || email === normalizeAdminEmail(configuredLoginId)) &&
    password.length <= 256 &&
    verifyScryptPassword(password, configuredPasswordHash)
  );

  const testLoginEnabled =
    process.env.APP_ENV !== "production" &&
    process.env.ENABLE_TEST_ADMIN_LOGIN?.trim().toLowerCase() === "true";
  const configuredTestId = process.env.TEST_ADMIN_ID;
  const configuredTestPasswordHash = process.env.TEST_ADMIN_PASSWORD_HASH;
  const validTestAdmin = Boolean(
    testLoginEnabled &&
    configuredTestId &&
    configuredTestPasswordHash &&
    email === normalizeAdminEmail(configuredTestId) &&
    password.length <= 256 &&
    verifyScryptPassword(password, configuredTestPasswordHash)
  );

  if (!validAppUser && !validFallbackAdmin && !validTestAdmin) {
    const current = attempts.get(key);
    attempts.set(key, {
      count: (current?.count ?? 0) + 1,
      resetAt: current?.resetAt && current.resetAt > now ? current.resetAt : now + ATTEMPT_WINDOW_MS
    });
    return loginRedirect(request, "credentials", nextPath);
  }

  attempts.delete(key);
  const sessionHours = getAdminSessionHours();
  const token = await createAdminSessionToken({
    email: validAppUser ? appUser!.email : normalizeAdminEmail(configuredEmail ?? email),
    secret,
    role: validAppUser ? (appUser!.role as "ADMIN" | "STAFF" | "MANUFACTURER") : "ADMIN",
    organizationId: validAppUser
      ? appUser!.organizationId
      : process.env.DEFAULT_ORGANIZATION_ID ?? "org_salon_de_lien",
    manufacturerName: validAppUser ? appUser!.manufacturerName : null,
    userId: validAppUser ? appUser!.id : null,
    sessionHours
  });
  const response = NextResponse.redirect(getExternalRequestUrl(request, nextPath), 303);
  response.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: isExternalHttpsRequest(request),
    path: "/",
    maxAge: sessionHours * 60 * 60
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
