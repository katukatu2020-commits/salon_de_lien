import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBackofficeSession } from "@/lib/auth/authorization";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireBackofficeSession(["ADMIN", "STAFF"]);
  if (!session.organizationId) {
    return NextResponse.json({ error: "店舗所属が設定されていません。" }, { status: 403 });
  }
  const now = new Date();

  const [couponIssues, legacyCoupons] = await Promise.all([
    prisma.couponIssue.findMany({
      where: { customer: { organizationId: session.organizationId, deletedAt: null } },
      orderBy: {
        createdAt: "desc"
      },
      take: 100,
      select: {
        id: true,
        couponCode: true,
        customerName: true,
        discountRate: true,
        targetMenusJson: true,
        issuedAt: true,
        expiresAt: true,
        status: true,
        printedAt: true,
        customer: {
          select: {
            name: true
          }
        }
      }
    }),
    prisma.coupon.findMany({
      where: { customer: { organizationId: session.organizationId, deletedAt: null } },
      orderBy: {
        createdAt: "desc"
      },
      take: 100,
      select: {
        id: true,
        title: true,
        couponCode: true,
        targetMenu: true,
        discountType: true,
        discountValue: true,
        validUntil: true,
        status: true,
        printCount: true,
        customer: {
          select: {
            name: true
          }
        }
      }
    })
  ]);

  const issueRows = couponIssues.map((issue) => {
    const effectiveStatus = issue.status === "issued" && issue.expiresAt.getTime() < now.getTime() ? "expired" : issue.status;
    return {
      id: issue.id,
      kind: "couponIssue",
      couponCode: issue.couponCode,
      customerName: issue.customerName || issue.customer.name,
      discountDisplay: `${issue.discountRate}%OFF`,
      targetMenus: issue.targetMenusJson,
      issuedAt: issue.issuedAt,
      validUntil: issue.expiresAt,
      status: effectiveStatus,
      printed: Boolean(issue.printedAt)
    };
  });

  const legacyRows = legacyCoupons.map((coupon) => {
    const effectiveStatus = coupon.status === "issued" && coupon.validUntil.getTime() < now.getTime() ? "expired" : coupon.status;
    return {
      id: coupon.id,
      kind: "coupon",
      couponCode: coupon.couponCode,
      customerName: coupon.customer.name,
      discountDisplay: formatLegacyDiscount(coupon.discountType, coupon.discountValue),
      targetMenus: [coupon.targetMenu],
      issuedAt: null,
      validUntil: coupon.validUntil,
      status: effectiveStatus,
      printCount: coupon.printCount
    };
  });

  const rows = [...issueRows, ...legacyRows];

  return NextResponse.json({
    totals: {
      issued: rows.length,
      used: rows.filter((row) => row.status === "used").length,
      expired: rows.filter((row) => row.status === "expired").length,
      printed: issueRows.filter((row) => row.printed).length + legacyRows.reduce((sum, row) => sum + (row.printCount ?? 0), 0)
    },
    offers: rows
  });
}

function formatLegacyDiscount(discountType: string, discountValue: string) {
  if (discountType === "percentage") {
    return `${discountValue}%OFF`;
  }

  if (discountType === "fixed_amount") {
    return `${Number(discountValue).toLocaleString("ja-JP")}円OFF`;
  }

  return discountValue;
}
