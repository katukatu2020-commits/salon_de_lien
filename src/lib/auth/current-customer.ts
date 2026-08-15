import "server-only";

import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import {
  CUSTOMER_SESSION_COOKIE,
  customerAuthSecret,
  verifyCustomerSessionToken
} from "@/lib/auth/customer-session";

export async function getCurrentCustomerSession() {
  const session = await verifyCustomerSessionToken(
    cookies().get(CUSTOMER_SESSION_COOKIE)?.value,
    customerAuthSecret()
  );
  if (!session) return null;

  const appUser = await prisma.appUser.findFirst({
    where: {
      id: session.userId,
      loginId: session.subject,
      role: "CUSTOMER",
      active: true,
      customerId: session.customerId,
      organizationId: session.organizationId,
      customer: {
        id: session.customerId,
        organizationId: session.organizationId,
        deletedAt: null
      }
    },
    select: {
      id: true,
      customerId: true,
      organizationId: true,
      customer: { select: { id: true, name: true } }
    }
  });

  return appUser?.customerId && appUser.organizationId && appUser.customer
    ? { ...session, customer: appUser.customer }
    : null;
}
