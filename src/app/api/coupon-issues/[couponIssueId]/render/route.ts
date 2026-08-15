import { NextResponse } from "next/server";
import { renderCouponIssuePng } from "@/lib/coupons/coupon-png-renderer";
import { prisma } from "@/lib/prisma";
import { requireBackofficeSession } from "@/lib/auth/authorization";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CouponIssueRenderRouteProps = {
  params: {
    couponIssueId: string;
  };
};

export async function GET(_request: Request, { params }: CouponIssueRenderRouteProps) {
  const session = await requireBackofficeSession(["ADMIN", "STAFF"]);
  if (!session.organizationId) {
    return NextResponse.json({ error: "店舗所属が設定されていません。" }, { status: 403 });
  }
  const issue = await prisma.couponIssue.findFirst({
    where: {
      id: params.couponIssueId,
      customer: {
        deletedAt: null,
        organizationId: session.organizationId
      }
    }
  });

  if (!issue) {
    return NextResponse.json({ error: "クーポン発行履歴が見つかりません。" }, { status: 404 });
  }

  try {
    const { png, report } = await renderCouponIssuePng({
      customerName: issue.customerName,
      discountRate: issue.discountRate,
      targetMenus: parseTargetMenus(issue.targetMenusJson),
      issuedAt: issue.issuedAt,
      expiresAt: issue.expiresAt,
      couponCode: issue.couponCode,
      salonMessage: issue.salonMessage,
      footerAddress: issue.footerAddress,
      footerHours: issue.footerHours,
      footerReservation: issue.footerReservation,
      footerPayments: issue.footerPayments,
      status: issue.status,
      templateVersion: issue.templateVersion
    });

    return new NextResponse(new Uint8Array(png), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "no-store",
        "X-Coupon-Render-Validation": JSON.stringify(report)
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "クーポン画像の生成に失敗しました。"
      },
      { status: 500 }
    );
  }
}

function parseTargetMenus(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item)).filter(Boolean);
  }

  return ["カット"];
}
