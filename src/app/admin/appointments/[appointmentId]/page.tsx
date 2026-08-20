import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Coins,
  JapaneseYen,
  Scissors,
  UserRound
} from "lucide-react";
import { AppointmentCheckoutForm } from "@/components/appointments/appointment-checkout-form";
import { AppointmentVisitPhotoManager } from "@/components/appointments/appointment-visit-photo-manager";
import { ReceiptPrintLink } from "@/components/appointments/receipt-print-link";
import { BrandVisual } from "@/components/lien/brand-visual";
import { LienCard, MetricCard, PageHeader, StatusBadge } from "@/components/lien/lien-ui";
import { requireBackofficeSession } from "@/lib/auth/authorization";
import { getPointBalance, getReferralCheckoutDiscount } from "@/lib/points/point-service";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type AppointmentCheckoutPageProps = {
  params: { appointmentId: string };
  searchParams?: { completed?: string; error?: string; bookingPoints?: string };
};

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(value);
}

function noteLine(note: string | null, label: string) {
  return note?.split("\n").find((line) => line.startsWith(`${label}: `))?.slice(label.length + 2) ?? null;
}

function couponDiscountFromSale(note: string | null) {
  const match = note?.match(/クーポン (.+?) -([\d,]+)円/) ?? note?.match(/(友達紹介（(?:[^）]+)）\d+%OFF) -([\d,]+)円/);
  if (!match) return null;
  return { label: match[1], amount: Number(match[2].replace(/,/g, "")) };
}

function longChargeFromSale(note: string | null) {
  const match = note?.match(/ロング料金 (M|L|LL) \+([\d,]+)円/);
  if (!match) return null;
  return { length: match[1], amount: Number(match[2].replace(/,/g, "")) };
}

function baseServiceAmountFromSale(note: string | null) {
  const match = note?.match(/基本施術料金 ([\d,]+)円/) ?? note?.match(/施術料金 ([\d,]+)円/);
  return match ? Number(match[1].replace(/,/g, "")) : null;
}

export default async function AppointmentCheckoutPage({ params, searchParams }: AppointmentCheckoutPageProps) {
  const session = await requireBackofficeSession(["ADMIN", "STAFF"]);
  if (!session.organizationId) notFound();

  const appointment = await prisma.appointment.findFirst({
    where: {
      id: params.appointmentId,
      customer: { organizationId: session.organizationId, deletedAt: null }
    },
    include: {
      customer: {
        select: {
          id: true,
          name: true,
          phone: true,
          organizationId: true,
          organization: { select: { taxRate: true } }
        }
      },
      serviceSales: {
        orderBy: { paidAt: "desc" },
        take: 1,
        include: { productLines: { orderBy: { createdAt: "asc" } } }
      }
    }
  });
  if (!appointment) notFound();

  const [pointBalance, pointRedemption, products, availableReferralDiscount, couponIssues] = await Promise.all([
    getPointBalance(appointment.customerId),
    prisma.pointTransaction.findFirst({
      where: {
        customerId: appointment.customerId,
        sourceType: "checkout",
        sourceId: appointment.id,
        type: "redeem"
      },
      orderBy: { createdAt: "desc" }
    }),
    prisma.product.findMany({
      where: { organizationId: appointment.customer.organizationId, active: true },
      orderBy: [{ manufacturerName: "asc" }, { name: "asc" }],
      select: { id: true, manufacturerName: true, name: true, category: true, retailPrice: true, stockQuantity: true }
    }),
    getReferralCheckoutDiscount(appointment.customerId),
    prisma.couponIssue.findMany({
      where: {
        customerId: appointment.customerId,
        status: "issued",
        issuedAt: { lte: new Date() },
        expiresAt: { gte: new Date() }
      },
      orderBy: { expiresAt: "asc" },
      select: { id: true, couponCode: true, discountRate: true, targetMenusJson: true, expiresAt: true }
    })
  ]);
  const sale = appointment.serviceSales[0] ?? null;
  const pointDiscount = pointRedemption ? Math.abs(pointRedemption.amount) : 0;
  const usedCouponDiscount = couponDiscountFromSale(sale?.note ?? null);
  const couponDiscountAmount = usedCouponDiscount?.amount ?? 0;
  const usedLongCharge = longChargeFromSale(sale?.note ?? null);
  const productTotal = sale?.productLines.reduce((sum, line) => sum + line.lineTotal, 0) ?? 0;
  const serviceSubtotal = appointment.estimatedPrice ?? (sale ? Math.max(0, sale.amount + pointDiscount + couponDiscountAmount - productTotal) : 0);
  const baseServiceAmount = baseServiceAmountFromSale(sale?.note ?? null) ?? Math.max(0, serviceSubtotal - (usedLongCharge?.amount ?? 0));
  const checkoutSubtotal = serviceSubtotal + productTotal;
  const finalAmount = sale?.amount ?? Math.max(0, checkoutSubtotal - couponDiscountAmount - pointDiscount);
  const staffName = appointment.staffName ?? noteLine(appointment.note, "担当") ?? "フリー";
  const isCompleted = Boolean(sale);
  const checkoutCoupons = [
    ...(availableReferralDiscount
      ? [{
          value: "referral",
          label: availableReferralDiscount.label,
          detail: `施術料金から${availableReferralDiscount.rate}%OFF`,
          rate: availableReferralDiscount.rate
        }]
      : []),
    ...couponIssues.map((coupon) => ({
      value: `couponIssue:${coupon.id}`,
      label: `限定クーポン ${coupon.discountRate}%OFF`,
      detail: `${coupon.couponCode} / ${new Intl.DateTimeFormat("ja-JP", { month: "numeric", day: "numeric" }).format(coupon.expiresAt)}まで`,
      rate: coupon.discountRate
    }))
  ];

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6">
      <PageHeader
        eyebrow={<span className="inline-flex items-center gap-2"><JapaneseYen className="h-3.5 w-3.5" />Appointment Checkout</span>}
        title={`${appointment.customer.name}様の予約・会計`}
        description="予約内容を確認し、ポイント割引を反映した本日のお会計を記録します。"
        breadcrumb={<Link href="/admin/appointments" className="hover:text-[color:var(--lien-primary)]">予約カレンダー / 予約詳細</Link>}
        primaryAction={<Link href={`/admin/customers/${appointment.customer.id}`} className="lien-button-primary px-4"><UserRound className="h-4 w-4" />お客様カルテ</Link>}
        secondaryAction={<Link href="/admin/appointments" className="lien-button-secondary px-4"><CalendarDays className="h-4 w-4" />カレンダーへ戻る</Link>}
        visual={
          <BrandVisual
            variant="consultation"
            className="h-full min-h-40"
            imageClassName="object-[52%_48%]"
            sizes="(max-width: 1024px) 100vw, 352px"
            overlay="none"
          />
        }
      />

      {searchParams?.error ? (
        <div role="alert" className="rounded-[18px] border border-[#edc2bd] bg-[#fff1ef] px-4 py-3 text-sm font-semibold text-[#884039]">
          {searchParams.error}
        </div>
      ) : null}
      {searchParams?.completed === "1" ? (
        <div className="flex items-center gap-3 rounded-[18px] border border-[#cbdcc8] bg-[#eef5ed] px-4 py-3 text-sm font-semibold text-[#405d41]">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          {Number(searchParams.bookingPoints) > 0
            ? `会計を記録し、オンライン予約特典${Number(searchParams.bookingPoints).toLocaleString("ja-JP")}ptを付与しました。`
            : "会計を記録しました。売上とポイント履歴にも反映されています。"}
        </div>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="予約日時" value={formatDateTime(appointment.scheduledAt)} icon={Clock3} helper={appointment.status} />
        <MetricCard label="本日のメニュー" value={appointment.menu ?? "未記載"} icon={Scissors} helper={staffName ? `担当: ${staffName}` : "担当者未記載"} tone="highlight" />
        <MetricCard label="利用可能ポイント" value={pointBalance.availablePoints.toLocaleString("ja-JP")} unit="pt" icon={Coins} tone="success" />
        <MetricCard label="本日のお会計" value={finalAmount.toLocaleString("ja-JP")} unit="円" icon={JapaneseYen} helper={isCompleted ? "会計済み" : "ポイント反映前"} tone="premium" />
      </section>

      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)]">
        <LienCard>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-[color:var(--lien-muted)]">お客様</p>
              <h2 className="mt-1 text-xl font-semibold text-[color:var(--lien-ink)]">{appointment.customer.name}様</h2>
              {appointment.customer.phone ? <p className="mt-1 text-sm tabular-nums text-[color:var(--lien-muted)]">{appointment.customer.phone}</p> : null}
            </div>
            <StatusBadge tone={isCompleted ? "success" : "highlight"}>{isCompleted ? "会計済み" : appointment.status}</StatusBadge>
          </div>
          <dl className="mt-5 grid gap-3 border-t border-[color:var(--lien-border)] pt-5 text-sm">
            <div className="flex justify-between gap-4"><dt className="text-[color:var(--lien-muted)]">予約日時</dt><dd className="text-right font-semibold">{formatDateTime(appointment.scheduledAt)}</dd></div>
            {appointment.durationMinutes ? <div className="flex justify-between gap-4"><dt className="text-[color:var(--lien-muted)]">施術時間</dt><dd className="font-semibold">{appointment.durationMinutes}分</dd></div> : null}
            <div className="flex justify-between gap-4"><dt className="text-[color:var(--lien-muted)]">メニュー</dt><dd className="text-right font-semibold">{appointment.menu ?? "未記載"}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-[color:var(--lien-muted)]">予定料金</dt><dd className="font-semibold tabular-nums">{serviceSubtotal.toLocaleString("ja-JP")}円</dd></div>
            {staffName ? <div className="flex justify-between gap-4"><dt className="text-[color:var(--lien-muted)]">担当</dt><dd className="font-semibold">{staffName}</dd></div> : null}
          </dl>
          {appointment.note ? <p className="mt-5 whitespace-pre-line rounded-2xl bg-[color:var(--lien-surface-soft)] p-4 text-xs leading-6 text-[color:var(--lien-muted)]">{appointment.note}</p> : null}
        </LienCard>

        <LienCard tone={isCompleted ? "success" : "default"}>
          {sale ? (
            <div className="grid gap-5">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#47674a] shadow-sm"><CheckCircle2 className="h-5 w-5" /></span>
                <div><p className="text-xs font-semibold text-[#47674a]">会計完了</p><h2 className="mt-1 text-lg font-semibold">{sale.title}</h2></div>
              </div>
              <dl className="grid gap-3 text-sm">
                <div className="flex justify-between gap-4"><dt className="text-[color:var(--lien-muted)]">基本施術料金</dt><dd className="font-semibold tabular-nums">{baseServiceAmount.toLocaleString("ja-JP")}円</dd></div>
                {usedLongCharge ? <div className="flex justify-between gap-4"><dt className="text-[color:var(--lien-muted)]">ロング料金 {usedLongCharge.length}</dt><dd className="font-semibold tabular-nums">+{usedLongCharge.amount.toLocaleString("ja-JP")}円</dd></div> : null}
                {sale.productLines.map((line) => (
                  <div key={line.id} className="flex justify-between gap-4">
                    <dt className="min-w-0 text-[color:var(--lien-muted)]">{line.productNameSnapshot} × {line.quantity}</dt>
                    <dd className="shrink-0 font-semibold tabular-nums">{line.lineTotal.toLocaleString("ja-JP")}円</dd>
                  </div>
                ))}
                {productTotal > 0 ? <div className="flex justify-between gap-4"><dt className="text-[color:var(--lien-muted)]">商品計</dt><dd className="font-semibold tabular-nums">{productTotal.toLocaleString("ja-JP")}円</dd></div> : null}
                <div className="flex justify-between gap-4"><dt className="text-[color:var(--lien-muted)]">小計</dt><dd className="font-semibold tabular-nums">{checkoutSubtotal.toLocaleString("ja-JP")}円</dd></div>
                {usedCouponDiscount ? <div className="flex justify-between gap-4"><dt className="text-[#47674a]">{usedCouponDiscount.label}</dt><dd className="font-semibold tabular-nums text-[#47674a]">-{usedCouponDiscount.amount.toLocaleString("ja-JP")}円</dd></div> : null}
                <div className="flex justify-between gap-4"><dt className="text-[color:var(--lien-muted)]">ポイント割引</dt><dd className="font-semibold tabular-nums text-[color:var(--lien-primary-dark)]">-{pointDiscount.toLocaleString("ja-JP")}円</dd></div>
                <div className="flex items-end justify-between gap-4 border-t border-[#cbdcc8] pt-4"><dt className="font-semibold">本日のお会計</dt><dd className="text-3xl font-semibold tabular-nums text-[#405d41]">{sale.amount.toLocaleString("ja-JP")}<span className="ml-1 text-sm">円</span></dd></div>
              </dl>
              <p className="text-xs text-[color:var(--lien-muted)]">支払い方法: {sale.paymentMethod ?? "未記載"}</p>
              <ReceiptPrintLink appointmentId={appointment.id} className="mt-1 w-full" />
            </div>
          ) : (
            <AppointmentCheckoutForm
              appointmentId={appointment.id}
              initialMenu={appointment.menu ?? ""}
              initialSubtotal={appointment.estimatedPrice ?? 0}
              availablePoints={pointBalance.availablePoints}
              coupons={checkoutCoupons}
              products={products}
              taxRate={appointment.customer.organization.taxRate}
            />
          )}
        </LienCard>
      </div>
      {isCompleted ? (
        <AppointmentVisitPhotoManager
          customerId={appointment.customerId}
          scheduledAt={appointment.scheduledAt}
        />
      ) : null}
    </div>
  );
}
