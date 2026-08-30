import { NextRequest, NextResponse } from "next/server";
import {
  CUSTOMER_SESSION_COOKIE,
  createCustomerSessionToken,
  customerAuthSecret,
  getCustomerSessionDays,
  normalizeCustomerLoginId
} from "@/lib/auth/customer-session";
import { verifyScryptPassword } from "@/lib/auth/password";
import { getExternalRequestUrl, hasValidRequestOrigin, isExternalHttpsRequest } from "@/lib/auth/request-security";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type Attempt = { count: number; resetAt: number };
const attempts = new Map<string, Attempt>();
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function clientKey(request: NextRequest, loginIdentifier: string) {
  const address = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  return `${address}:${loginIdentifier}`;
}

function safeReturnPath(value: FormDataEntryValue | null) {
  const allowed = new Set(["/u/home", "/u/appointments", "/u/points", "/u/history", "/u/profile", "/u/reviews"]);
  return typeof value === "string" && (allowed.has(value) || /^\/u\/reviews\/[a-z0-9_-]+$/i.test(value)) ? value : "/u/home";
}

function loginRedirect(request: NextRequest, error: string, nextPath: string, loginIdentifier = "") {
  const url = getExternalRequestUrl(request, "/u/login");
  url.searchParams.set("error", error);
  url.searchParams.set("next", nextPath);
  if (loginIdentifier && !loginIdentifier.includes("@")) url.searchParams.set("loginId", loginIdentifier);
  return NextResponse.redirect(url, 303);
}

export async function POST(request: NextRequest) {
  if (!hasValidRequestOrigin(request)) {
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  }

  const formData = await request.formData();
  const nextPath = safeReturnPath(formData.get("next"));
  const loginIdentifier = normalizeCustomerLoginId(String(formData.get("loginId") || ""));
  const password = String(formData.get("password") || "");
  const secret = customerAuthSecret();

  if (!secret || secret.length < 32) {
    return loginRedirect(request, "config", nextPath, loginIdentifier);
  }

  const key = clientKey(request, loginIdentifier);
  const now = Date.now();
  const attempt = attempts.get(key);
  if (attempt && attempt.resetAt > now && attempt.count >= MAX_ATTEMPTS) {
    return loginRedirect(request, "locked", nextPath, loginIdentifier);
  }
  if (attempt && attempt.resetAt <= now) attempts.delete(key);

  const appUser = await prisma.appUser.findFirst({
    where: {
      role: "CUSTOMER",
      OR: [
        { loginId: { equals: loginIdentifier, mode: "insensitive" } },
        { email: { equals: loginIdentifier, mode: "insensitive" } }
      ]
    },
    select: {
      id: true,
      loginId: true,
      email: true,
      passwordHash: true,
      role: true,
      active: true,
      customerId: true,
      organizationId: true,
      customer: { select: { id: true, organizationId: true, deletedAt: true } }
    }
  });

  const valid = Boolean(
    appUser?.active &&
    appUser.role === "CUSTOMER" &&
    (appUser.loginId || appUser.email) &&
    appUser.passwordHash &&
    appUser.customerId &&
    appUser.organizationId &&
    appUser.customer &&
    !appUser.customer.deletedAt &&
    appUser.customer.organizationId === appUser.organizationId &&
    password.length >= 8 &&
    password.length <= 256 &&
    verifyScryptPassword(password, appUser.passwordHash)
  );

  if (!valid) {
    const current = attempts.get(key);
    attempts.set(key, {
      count: (current?.count ?? 0) + 1,
      resetAt: current?.resetAt && current.resetAt > now ? current.resetAt : now + ATTEMPT_WINDOW_MS
    });
    return loginRedirect(request, "credentials", nextPath, loginIdentifier);
  }

  attempts.delete(key);
  const sessionDays = getCustomerSessionDays();
  const token = await createCustomerSessionToken({
    loginId: appUser!.loginId || appUser!.email,
    customerId: appUser!.customerId!,
    organizationId: appUser!.organizationId!,
    userId: appUser!.id,
    secret,
    sessionDays
  });
  const response = NextResponse.redirect(getExternalRequestUrl(request, nextPath), 303);
  response.cookies.set({
    name: CUSTOMER_SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: isExternalHttpsRequest(request),
    path: "/",
    maxAge: sessionDays * 24 * 60 * 60
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
