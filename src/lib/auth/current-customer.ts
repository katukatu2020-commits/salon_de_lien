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

  const customers = await prisma.$queryRaw<Array<{ id: string; name: string }>>`
    SELECT c."id", c."name"
    FROM "AppUser" u
    JOIN "Customer" c
      ON c."id" = ${session.customerId}
      AND c."organizationId" = ${session.organizationId}
      AND c."deletedAt" IS NULL
    LEFT JOIN "CustomerStoreLink" l
      ON l."appUserId" = u."id"
      AND l."organizationId" = c."organizationId"
      AND l."customerId" = c."id"
    WHERE u."id" = ${session.userId}
      AND LOWER(COALESCE(NULLIF(u."loginId", ''), u."email")) = ${session.subject}
      AND u."role" = 'CUSTOMER'
      AND u."active" = TRUE
      AND (
        (u."customerId" = c."id" AND u."organizationId" = c."organizationId")
        OR l."id" IS NOT NULL
      )
    LIMIT 1
  `;

  return customers[0] ? { ...session, customer: customers[0] } : null;
}
