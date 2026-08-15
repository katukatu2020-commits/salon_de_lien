import "server-only";

import { cookies } from "next/headers";
import { ADMIN_SESSION_COOKIE, type AdminRole, verifyAdminSessionToken } from "@/lib/auth/admin-session";
import { prisma } from "@/lib/prisma";
import { legacyCustomerIdPortalAllowed, resolveCustomerPortalToken } from "@/lib/auth/customer-portal";

export class AuthorizationError extends Error {
  constructor(
    message: string,
    readonly status = 403
  ) {
    super(message);
    this.name = "AuthorizationError";
  }
}

export async function getBackofficeSession() {
  return verifyAdminSessionToken(cookies().get(ADMIN_SESSION_COOKIE)?.value, process.env.ADMIN_AUTH_SECRET);
}

export async function requireBackofficeSession(allowedRoles: AdminRole[] = ["ADMIN", "STAFF"]) {
  const session = await getBackofficeSession();
  if (!session) throw new AuthorizationError("ログインが必要です。", 401);
  if (!allowedRoles.includes(session.role)) throw new AuthorizationError("この操作を行う権限がありません。", 403);
  return session;
}

export async function requireCustomerAccess(customerId: string, allowedRoles: AdminRole[] = ["ADMIN", "STAFF"]) {
  const session = await requireBackofficeSession(allowedRoles);
  if (!session.organizationId) throw new AuthorizationError("店舗所属が設定されていません。", 403);
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, organizationId: session.organizationId, deletedAt: null },
    select: { id: true, organizationId: true }
  });
  if (!customer) throw new AuthorizationError("顧客が見つからないか、この店舗から参照できません。", 404);
  return { session, customer };
}

export async function requireProductProposalAccess(proposalId: string) {
  const session = await requireBackofficeSession(["ADMIN", "STAFF"]);
  if (!session.organizationId) throw new AuthorizationError("店舗所属が設定されていません。", 403);
  const proposal = await prisma.productProposal.findFirst({
    where: {
      id: proposalId,
      customer: { organizationId: session.organizationId, deletedAt: null },
      product: { organizationId: session.organizationId }
    },
    select: { id: true, customerId: true, productId: true }
  });
  if (!proposal) throw new AuthorizationError("商品提案が見つからないか、この店舗から参照できません。", 404);
  return { session, proposal };
}

export async function requireManufacturerReportAccess(requestedManufacturer?: string | null) {
  const session = await requireBackofficeSession(["ADMIN", "STAFF", "MANUFACTURER"]);
  if (session.role === "MANUFACTURER") {
    if (!session.manufacturerName) throw new AuthorizationError("メーカー所属が設定されていません。", 403);
    if (requestedManufacturer && requestedManufacturer !== session.manufacturerName) {
      throw new AuthorizationError("他メーカーの集計は参照できません。", 403);
    }
  }
  return session;
}

export async function requireCustomerActor(customerId: string, portalToken?: string | null) {
  if (portalToken) {
    const portal = await resolveCustomerPortalToken(portalToken, { touch: false });
    if (!portal || portal.customerId !== customerId) {
      throw new AuthorizationError("お客様ページの認証情報が無効です。", 403);
    }
    return { actor: "CUSTOMER" as const, organizationId: portal.organizationId };
  }
  if (legacyCustomerIdPortalAllowed()) {
    return { actor: "CUSTOMER" as const, organizationId: process.env.DEFAULT_ORGANIZATION_ID ?? "org_salon_de_lien" };
  }
  const { session } = await requireCustomerAccess(customerId);
  return { actor: session.role, organizationId: session.organizationId };
}
