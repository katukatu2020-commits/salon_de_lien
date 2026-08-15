import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { CouponFlyerPrint } from "@/components/coupons/CouponFlyerPrint";
import { CouponIssuePrintButton } from "@/components/coupons/CouponIssuePrintButton";
import { markCouponIssuePrintedAction } from "@/lib/actions/coupon-actions";
import { assertCouponProductionFontsReady } from "@/lib/coupons/coupon-png-renderer";
import { prisma } from "@/lib/prisma";

type CouponIssuePrintPageProps = {
  params: {
    id: string;
    couponIssueId: string;
  };
};

export default async function CouponIssuePrintPage({ params }: CouponIssuePrintPageProps) {
  const issue = await prisma.couponIssue.findFirst({
    where: {
      id: params.couponIssueId,
      customerId: params.id,
      customer: { deletedAt: null }
    },
    include: {
      customer: {
        select: {
          id: true,
          name: true
        }
      }
    }
  });

  if (!issue) {
    notFound();
  }

  const markPrinted = markCouponIssuePrintedAction.bind(null, issue.id, issue.customerId);
  const assetError = await getAssetError();

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#eee9df] px-3 py-4 text-stone-900 sm:px-4 sm:py-6 print:bg-white print:p-0">
      <div className="no-print mx-auto mb-4 flex w-full max-w-[905px] flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center">
        <Link
          href={`/admin/customers/${issue.customerId}/coupons/new`}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-stone-200 bg-white px-4 text-sm font-semibold text-stone-700 shadow-sm hover:bg-stone-50"
        >
          <ArrowLeft className="h-4 w-4" />
          クーポン作成へ戻る
        </Link>
        {assetError ? null : <CouponIssuePrintButton markPrintedAction={markPrinted} />}
      </div>

      {assetError ? (
        <div className="mx-auto max-w-3xl rounded-md border border-red-200 bg-red-50 p-5 text-sm leading-7 text-red-900">
          <h1 className="text-base font-semibold">クーポン画像の生成を停止しました</h1>
          <p className="mt-2">
            production_font_file が未配置です。指定フォントがない状態での自動代替描画は禁止しているため、印刷PNGは生成しません。
          </p>
          <pre className="mt-3 overflow-auto rounded bg-white p-3 text-xs">{assetError}</pre>
        </div>
      ) : (
        <CouponFlyerPrint
          issue={{
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
          }}
        />
      )}
    </main>
  );
}

async function getAssetError() {
  try {
    await assertCouponProductionFontsReady();
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : "クーポン画像生成に必要なアセットが不足しています。";
  }
}

function parseTargetMenus(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item)).filter(Boolean);
  }

  return ["カット"];
}

