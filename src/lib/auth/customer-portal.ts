import "server-only";

import { prisma } from "@/lib/prisma";
import {
  generateCustomerPortalToken,
  hashCustomerPortalToken,
  isCustomerPortalTokenFormat
} from "@/lib/auth/customer-portal-token";

export { generateCustomerPortalToken, hashCustomerPortalToken } from "@/lib/auth/customer-portal-token";

const DEFAULT_PORTAL_DAYS = 90;

export async function issueCustomerPortalAccess({
  customerId,
  organizationId,
  validDays = DEFAULT_PORTAL_DAYS
}: {
  customerId: string;
  organizationId?: string;
  validDays?: number;
}) {
  const customer = await prisma.customer.findFirst({
    where: {
      id: customerId,
      deletedAt: null,
      ...(organizationId ? { organizationId } : {})
    },
    select: { id: true }
  });
  if (!customer) throw new Error("顧客が見つかりません。");

  const token = generateCustomerPortalToken();
  const expiresAt = new Date(Date.now() + Math.min(365, Math.max(1, validDays)) * 24 * 60 * 60 * 1000);
  await prisma.customerPortalAccess.create({
    data: {
      customerId,
      tokenHash: hashCustomerPortalToken(token),
      expiresAt
    }
  });
  return { token, expiresAt, urlPath: `/u/${token}` };
}

export async function resolveCustomerPortalToken(token: string, { touch = true } = {}) {
  if (!isCustomerPortalTokenFormat(token)) return null;
  const now = new Date();
  const access = await prisma.customerPortalAccess.findFirst({
    where: {
      tokenHash: hashCustomerPortalToken(token),
      revokedAt: null,
      expiresAt: { gt: now },
      customer: { deletedAt: null }
    },
    select: {
      id: true,
      customerId: true,
      expiresAt: true,
      lastUsedAt: true,
      customer: { select: { organizationId: true } }
    }
  });
  if (!access) return null;

  if (touch && (!access.lastUsedAt || now.getTime() - access.lastUsedAt.getTime() > 5 * 60 * 1000)) {
    await prisma.customerPortalAccess.update({ where: { id: access.id }, data: { lastUsedAt: now } });
  }
  return {
    accessId: access.id,
    customerId: access.customerId,
    organizationId: access.customer.organizationId,
    expiresAt: access.expiresAt
  };
}

export async function revokeCustomerPortalAccess(accessId: string, customerId: string) {
  return prisma.customerPortalAccess.updateMany({
    where: { id: accessId, customerId, revokedAt: null },
    data: { revokedAt: new Date() }
  });
}

export function legacyCustomerIdPortalAllowed() {
  return process.env.APP_ENV !== "production" && process.env.ALLOW_LEGACY_CUSTOMER_ID_PORTAL === "true";
}
