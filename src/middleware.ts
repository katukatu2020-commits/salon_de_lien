import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from "@/lib/auth/admin-session";
import {
  CUSTOMER_SESSION_COOKIE,
  customerAuthSecret,
  verifyCustomerSessionToken
} from "@/lib/auth/customer-session";
import { isExternalHttpsRequest } from "@/lib/auth/request-security";

const CUSTOMER_ACCOUNT_PATHS = new Set(["/u/home", "/u/appointments", "/u/points", "/u/history", "/u/profile", "/u/reviews", "/u/community"]);

function isCustomerAccountPath(pathname: string) {
  return CUSTOMER_ACCOUNT_PATHS.has(pathname) || pathname.startsWith("/u/reviews/") || pathname.startsWith("/u/community/");
}

function isProtectedPath(pathname: string) {
  if (
    pathname === "/admin/login" ||
    pathname.startsWith("/admin/password-reset") ||
    pathname.startsWith("/api/auth/")
  ) return false;

  if (
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    pathname === "/customers" ||
    pathname.startsWith("/customers/") ||
    pathname === "/reports" ||
    pathname.startsWith("/reports/")
  ) {
    return true;
  }

  const protectedApiPrefixes = [
    "/api/admin/",
    "/api/customers/",
    "/api/product-proposals/",
    "/api/products",
    "/api/reports/",
    "/api/coupon-issues/"
  ];

  if (protectedApiPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(prefix))) {
    return true;
  }

  return /^\/api\/referrals\/[^/]+\/complete-first-visit$/.test(pathname);
}

function applySecurityHeaders(response: NextResponse, request: NextRequest) {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin");

  if (isExternalHttpsRequest(request)) {
    response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }

  return response;
}

function roleCanAccess(pathname: string, role: "ADMIN" | "STAFF" | "MANUFACTURER") {
  if (role === "ADMIN" || role === "STAFF") return true;
  return (
    pathname === "/admin/reports/manufacturer-products" ||
    pathname.startsWith("/admin/reports/manufacturer-products/") ||
    pathname === "/api/admin/reports/manufacturer-products" ||
    pathname.startsWith("/api/admin/reports/manufacturer-products/")
  );
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (isCustomerAccountPath(pathname)) {
    const customerSession = await verifyCustomerSessionToken(
      request.cookies.get(CUSTOMER_SESSION_COOKIE)?.value,
      customerAuthSecret()
    );
    if (customerSession) {
      return applySecurityHeaders(NextResponse.next(), request);
    }
    const loginUrl = new URL("/u/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return applySecurityHeaders(NextResponse.redirect(loginUrl), request);
  }

  if (!isProtectedPath(pathname)) {
    return applySecurityHeaders(NextResponse.next(), request);
  }

  const session = await verifyAdminSessionToken(
    request.cookies.get(ADMIN_SESSION_COOKIE)?.value,
    process.env.ADMIN_AUTH_SECRET
  );

  if (session && roleCanAccess(pathname, session.role)) {
    return applySecurityHeaders(NextResponse.next(), request);
  }

  if (session) {
    return applySecurityHeaders(
      pathname.startsWith("/api/") || request.headers.has("next-action")
        ? NextResponse.json({ error: "この画面を利用する権限がありません。" }, { status: 403 })
        : NextResponse.redirect(new URL("/admin/reports/manufacturer-products", request.url)),
      request
    );
  }

  if (pathname.startsWith("/api/") || request.headers.has("next-action")) {
    return applySecurityHeaders(
      NextResponse.json(
        { error: "管理画面のセッションが切れました。もう一度ログインしてください。" },
        { status: 401 }
      ),
      request
    );
  }

  const loginUrl = new URL("/admin/login", request.url);
  loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
  return applySecurityHeaders(NextResponse.redirect(loginUrl), request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"]
};
