import type { NextRequest } from "next/server";

function firstHeaderValue(value: string | null) {
  return value?.split(",")[0]?.trim() || null;
}

export function getExternalRequestOrigin(request: NextRequest) {
  const host = firstHeaderValue(request.headers.get("x-forwarded-host")) || request.headers.get("host");
  if (!host) return request.nextUrl.origin;

  const protocol =
    firstHeaderValue(request.headers.get("cloudfront-forwarded-proto")) ||
    firstHeaderValue(request.headers.get("x-forwarded-proto")) ||
    request.nextUrl.protocol.replace(/:$/, "");

  return `${protocol}://${host}`;
}

export function isExternalHttpsRequest(request: NextRequest) {
  return getExternalRequestOrigin(request).startsWith("https://");
}

export function getExternalRequestUrl(request: NextRequest, path: string) {
  return new URL(path, getExternalRequestOrigin(request));
}

export function hasValidRequestOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  return origin === getExternalRequestOrigin(request);
}
