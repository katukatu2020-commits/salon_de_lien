import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, CheckCircle2, Coins, JapaneseYen, UserRound } from "lucide-react";
import { AppointmentVisitPhotoManager } from "@/components/appointments/appointment-visit-photo-manager";
import { ReceiptPrintLink } from "@/components/appointments/receipt-print-link";
import { requireBackofficeSession } from "@/lib/auth/authorization";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type AppointmentCheckoutCompletedPageProps = {
  params: { appointmentId: string };
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

function referralDiscountFromSale(note: string | null) {
  const match = note?.match(/(友達紹介（[^）]+）(\d+)%OFF) -([\d,]+)円/);
  if (!match) return null;
  return { label: match[1], amount: Number(match[3].replace(/,/g, "")) };
}

export default async function AppointmentCheckoutCompletedPage({ params }: AppointmentCheckoutCompletedPageProps) {
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
          pointAccount: { select: { availablePoints: true } }
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

  const sale = appointment.serviceSales[0] ?? null;
  if (!sale) notFound();

  const [pointRedemption, bookingReward] = await Promise.all([
    prisma.pointTransaction.findFirst({
      where: {
        customerId: appointment.customerId,
        sourceType: "checkout",
        sourceId: appointment.id,
        type: "redeem"
      },
      orderBy: { createdAt: "desc" },
      select: { amount: true }
    }),
    prisma.pointTransaction.findFirst({
      where: {
        customerId: appointment.customerId,
        sourceType: "appointment_checkout",
        sourceId: appointment.id,
        type: "earn"
      },
      orderBy: { createdAt: "desc" },
      select: { amount: true }
    })
  ]);

  const pointDiscount = Math.abs(pointRedemption?.amount ?? 0);
  const referralDiscount = referralDiscountFromSale(sale.note);
  const awardedPoints = bookingReward?.amount ?? 0;
  const productTotal = sale.productLines.reduce((sum, line) => sum + line.lineTotal, 0);
  const serviceSubtotal = Math.max(0, sale.amount + pointDiscount + (referralDiscount?.amount ?? 0) - productTotal);

  return (
    <main className="mx-auto grid w-full max-w-3xl gap-6 pb-8">
      <section className="overflow-hidden rounded-[28px] border border-[#cbdcc8] bg-white shadow-lien">
        <div className="grid justify-items-center bg-[#eef5ed] px-5 py-10 text-center sm:px-10">
          <span className="grid h-20 w-20 place-items-center rounded-full bg-white text-[#47674a] shadow-sm">
            <CheckCircle2 className="h-11 w-11" aria-hidden="true" />
          </span>
          <p className="mt-5 text-xs font-semibold text-[#5b745d]">CHECKOUT COMPLETE</p>
          <h1 className="mt-2 text-2xl font-semibold text-[#2f3d30] sm:text-3xl">会計処理が終わりました</h1>
          <p className="mt-3 max-w-xl text-sm leading-7 text-[#5b6f5c]">
            {appointment.customer.name}様のお会計を、売上・ポイント履歴・購入商品へ反映しました。
          </p>
        </div>

        <div className="grid gap-6 p-5 sm:p-8">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[20px] bg-[color:var(--lien-surface-soft)] p-4">
              <p className="text-xs font-semibold text-[color:var(--lien-muted)]">お客様</p>
              <p className="mt-2 text-lg font-semibold text-[color:var(--lien-ink)]">{appointment.customer.name}様</p>
              <p className="mt-1 text-xs leading-5 text-[color:var(--lien-muted)]">{formatDateTime(appointment.scheduledAt)}</p>
            </div>
            <div className="rounded-[20px] bg-[#fff8e8] p-4">
              <p className="text-xs font-semibold text-[#80611d]">本日のお会計</p>
              <p className="mt-2 text-3xl font-semibold tabular-nums text-[#5b332c]">
                {sale.amount.toLocaleString("ja-JP")}<span className="ml-1 text-sm">円</span>
              </p>
              <p className="mt-1 text-xs text-[#806b42]">{sale.paymentMethod ?? "支払い方法未記載"}</p>
            </div>
          </div>

          <dl className="grid gap-3 rounded-[20px] border border-[color:var(--lien-border)] bg-white p-4 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-[color:var(--lien-muted)]">施術</dt>
              <dd className="text-right font-semibold">{sale.title} / {serviceSubtotal.toLocaleString("ja-JP")}円</dd>
            </div>
            {sale.productLines.map((line) => (
              <div key={line.id} className="flex justify-between gap-4">
                <dt className="min-w-0 text-[color:var(--lien-muted)]">{line.productNameSnapshot} × {line.quantity}</dt>
                <dd className="shrink-0 font-semibold tabular-nums">{line.lineTotal.toLocaleString("ja-JP")}円</dd>
              </div>
            ))}
            {referralDiscount ? (
              <div className="flex justify-between gap-4">
                <dt className="text-[#47674a]">{referralDiscount.label}</dt>
                <dd className="font-semibold tabular-nums text-[#47674a]">-{referralDiscount.amount.toLocaleString("ja-JP")}円</dd>
              </div>
            ) : null}
            {pointDiscount > 0 ? (
              <div className="flex justify-between gap-4">
                <dt className="text-[color:var(--lien-muted)]">ポイント利用</dt>
                <dd className="font-semibold tabular-nums text-[color:var(--lien-primary-dark)]">-{pointDiscount.toLocaleString("ja-JP")}pt</dd>
              </div>
            ) : null}
            {awardedPoints > 0 ? (
              <div className="flex justify-between gap-4 border-t border-[color:var(--lien-border)] pt-3">
                <dt className="inline-flex items-center gap-2 font-semibold text-[#47674a]"><Coins className="h-4 w-4" />予約・会計特典</dt>
                <dd className="font-semibold tabular-nums text-[#47674a]">+{awardedPoints.toLocaleString("ja-JP")}pt</dd>
              </div>
            ) : null}
            <div className="flex justify-between gap-4 border-t border-[color:var(--lien-border)] pt-3">
              <dt className="text-[color:var(--lien-muted)]">現在の保有ポイント</dt>
              <dd className="font-semibold tabular-nums">{(appointment.customer.pointAccount?.availablePoints ?? 0).toLocaleString("ja-JP")}pt</dd>
            </div>
          </dl>

          <div className="grid gap-3 sm:grid-cols-3">
            <ReceiptPrintLink appointmentId={appointment.id} className="w-full sm:col-span-3" />
            <Link href="/admin/appointments" className="lien-button-primary w-full">
              <CalendarDays className="h-4 w-4" />予約カレンダーへ戻る
            </Link>
            <Link href={`/admin/customers/${appointment.customer.id}`} className="lien-button-secondary w-full">
              <UserRound className="h-4 w-4" />お客様カルテを見る
            </Link>
          </div>

          <p className="flex items-center justify-center gap-2 text-center text-xs leading-5 text-[color:var(--lien-muted)]">
            <JapaneseYen className="h-4 w-4 shrink-0" />同じ予約で会計が重複して記録されることはありません。
          </p>
        </div>
      </section>
      <AppointmentVisitPhotoManager
        customerId={appointment.customerId}
        scheduledAt={appointment.scheduledAt}
      />
    </main>
  );
}
