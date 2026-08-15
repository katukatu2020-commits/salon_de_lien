import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { ReceiptPrintButton } from "@/components/appointments/receipt-print-button";
import { requireBackofficeSession } from "@/lib/auth/authorization";
import { DEFAULT_COUPON_SALON_INFO } from "@/lib/coupons/coupon-defaults";
import { buildReceiptSaleSummary, receiptNumber } from "@/lib/appointments/receipt";
import { prisma } from "@/lib/prisma";
import styles from "./receipt.module.css";

export const dynamic = "force-dynamic";

type AppointmentReceiptPageProps = {
  params: { appointmentId: string };
};

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(value);
}

export default async function AppointmentReceiptPage({ params }: AppointmentReceiptPageProps) {
  const session = await requireBackofficeSession(["ADMIN", "STAFF"]);
  if (!session.organizationId) notFound();

  const appointment = await prisma.appointment.findFirst({
    where: {
      id: params.appointmentId,
      customer: { organizationId: session.organizationId, deletedAt: null }
    },
    select: {
      id: true,
      scheduledAt: true,
      staffName: true,
      customerId: true,
      customer: {
        select: {
          name: true,
          organization: { select: { name: true, taxRate: true } }
        }
      },
      serviceSales: {
        orderBy: { paidAt: "desc" },
        take: 1,
        select: {
          id: true,
          title: true,
          amount: true,
          paymentMethod: true,
          paidAt: true,
          note: true,
          productLines: {
            orderBy: { createdAt: "asc" },
            select: {
              id: true,
              productNameSnapshot: true,
              unitPrice: true,
              quantity: true,
              lineTotal: true
            }
          }
        }
      }
    }
  });
  if (!appointment) notFound();

  const sale = appointment.serviceSales[0];
  if (!sale) notFound();

  const pointRedemption = await prisma.pointTransaction.findFirst({
    where: {
      customerId: appointment.customerId,
      sourceType: "checkout",
      sourceId: appointment.id,
      type: "redeem"
    },
    orderBy: { createdAt: "desc" },
    select: { amount: true }
  });
  const productTotal = sale.productLines.reduce((sum, line) => sum + line.lineTotal, 0);
  const summary = buildReceiptSaleSummary({
    saleAmount: sale.amount,
    note: sale.note,
    productTotal,
    fallbackTaxRate: appointment.customer.organization.taxRate,
    fallbackPointDiscount: Math.abs(pointRedemption?.amount ?? 0)
  });
  const staffName = appointment.staffName?.trim();
  const printableStaffName = staffName && /[^?\s]/.test(staffName) ? staffName : "フリー";

  return (
    <main className={styles.screen}>
      <div className={styles.toolbar}>
        <Link href={`/admin/appointments/${appointment.id}`} className="lien-button-secondary px-4">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          会計へ戻る
        </Link>
        <ReceiptPrintButton />
      </div>

      <article className={styles.receipt} aria-label="会計レシート">
        <header className={styles.brand}>
          <p className={styles.brandName}>{appointment.customer.organization.name}</p>
          <p className={styles.brandSub}>{DEFAULT_COUPON_SALON_INFO.salonNameSub}</p>
        </header>

        <h1 className={styles.title}>領 収 書</h1>

        <div className={styles.meta}>
          <p className={styles.metaRow}><span>発行日時</span><span>{formatDateTime(sale.paidAt)}</span></p>
          <p className={styles.metaRow}><span>レシート番号</span><span>{receiptNumber(sale.id, sale.paidAt)}</span></p>
          <p className={styles.metaRow}><span>お客様</span><span>{appointment.customer.name} 様</span></p>
          <p className={styles.metaRow}><span>担当</span><span>{printableStaffName}</span></p>
        </div>

        <hr className={styles.divider} />

        <section className={styles.lines} aria-label="購入明細">
          <p className={styles.line}>
            <span>{sale.title}<small className={styles.lineDetail}>施術</small></span>
            <span>{summary.serviceBaseAmount.toLocaleString("ja-JP")}円</span>
          </p>
          {summary.longHairCharge ? (
            <p className={styles.line}>
              <span>{summary.longHairCharge.label}</span>
              <span>{summary.longHairCharge.amount.toLocaleString("ja-JP")}円</span>
            </p>
          ) : null}
          {sale.productLines.map((line) => (
            <p key={line.id} className={styles.line}>
              <span>
                {line.productNameSnapshot}
                <small className={styles.lineDetail}>{line.unitPrice.toLocaleString("ja-JP")}円 × {line.quantity}</small>
              </span>
              <span>{line.lineTotal.toLocaleString("ja-JP")}円</span>
            </p>
          ))}
        </section>

        <hr className={styles.divider} />

        <section className={styles.summary} aria-label="会計合計">
          <p className={styles.summaryLine}><span>小計</span><span>{summary.subtotal.toLocaleString("ja-JP")}円</span></p>
          {summary.couponDiscount ? (
            <p className={`${styles.summaryLine} ${styles.discount}`}>
              <span>{summary.couponDiscount.label}</span>
              <span>-{summary.couponDiscount.amount.toLocaleString("ja-JP")}円</span>
            </p>
          ) : null}
          {summary.pointDiscount > 0 ? (
            <p className={`${styles.summaryLine} ${styles.discount}`}>
              <span>ポイント利用</span>
              <span>-{summary.pointDiscount.toLocaleString("ja-JP")}円</span>
            </p>
          ) : null}
          <p className={`${styles.summaryLine} ${styles.total}`}>
            <span>合計</span>
            <strong>{sale.amount.toLocaleString("ja-JP")}円</strong>
          </p>
          <p className={styles.tax}>（うち消費税 {summary.taxRate}%　{summary.includedTax.toLocaleString("ja-JP")}円）</p>
          <p className={styles.summaryLine}><span>お支払い</span><span>{sale.paymentMethod ?? "未記載"}</span></p>
        </section>

        <p className={styles.message}>上記正に領収いたしました。<br />ご来店ありがとうございました。</p>

        <footer className={styles.store}>
          <strong>{DEFAULT_COUPON_SALON_INFO.salonNameJa}</strong><br />
          {DEFAULT_COUPON_SALON_INFO.address}<br />
          {DEFAULT_COUPON_SALON_INFO.access}<br />
          {DEFAULT_COUPON_SALON_INFO.hours.replace("営業時間: ", "")}
        </footer>
      </article>
    </main>
  );
}
