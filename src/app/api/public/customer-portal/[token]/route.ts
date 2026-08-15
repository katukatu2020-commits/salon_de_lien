import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCustomerPortalToken } from "@/lib/auth/customer-portal";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: {
    token: string;
  };
};

export async function GET(_request: Request, { params }: RouteContext) {
  const portal = await resolveCustomerPortalToken(params.token);
  if (!portal) return NextResponse.json({ error: "customer portal not found" }, { status: 404 });
  const now = new Date();
  const customer = await prisma.customer.findFirst({
    where: {
      id: portal.customerId,
      organizationId: portal.organizationId,
      deletedAt: null
    },
    select: {
      id: true,
      name: true,
      pointAccount: {
        select: {
          availablePoints: true
        }
      },
      couponIssues: {
        where: {
          status: "issued",
          expiresAt: {
            gte: now
          }
        },
        orderBy: {
          expiresAt: "asc"
        },
        select: {
          id: true,
          couponCode: true,
          discountRate: true,
          targetMenusJson: true,
          expiresAt: true
        }
      }
    }
  });

  if (!customer) {
    return NextResponse.json({ error: "customer portal not found" }, { status: 404 });
  }

  return NextResponse.json({
    customer: {
      name: customer.name,
      availablePoints: customer.pointAccount?.availablePoints ?? 0
    },
    coupons: customer.couponIssues.map((issue) => ({
      id: issue.id,
      couponCode: issue.couponCode,
      discountDisplay: `${issue.discountRate}%OFF`,
      targetMenus: issue.targetMenusJson,
      expiresAt: issue.expiresAt
    }))
  });
}
