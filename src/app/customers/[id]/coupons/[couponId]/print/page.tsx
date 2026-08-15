import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { CouponPrintButton } from "@/components/customers/coupon-print-button";
import { markCouponPrintedAction } from "@/lib/actions";
import { effectiveCouponStatus, formatCouponDiscount } from "@/lib/coupons";
import { prisma } from "@/lib/prisma";

type CouponPrintPageProps = {
  params: {
    id: string;
    couponId: string;
  };
};

const couponTemplateImageSrc = "/coupon-templates/salon-de-lien-coupon-template.jpg";

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeFlyerTitle(title: string, customerName: string) {
  const customerPattern = escapeRegExp(customerName);
  const cleaned = title
    .replace(new RegExp(`^${customerPattern}\\s*様?\\s*(だけの|限定|専用)?\\s*`, "u"), "")
    .replace(/^(このお客様だけの|あなた専用の|限定)\s*/u, "")
    .replace(/\s*\d+\s*%?\s*OFF\s*$/iu, "")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned || "次回ご優待チケット";
}

function formatFlyerDate(date?: Date | null, withWeekday = false) {
  if (!date) {
    return "-";
  }

  const parts = new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: withWeekday ? "short" : undefined
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value ?? "";
  const month = parts.find((part) => part.type === "month")?.value ?? "";
  const day = parts.find((part) => part.type === "day")?.value ?? "";
  const weekday = parts.find((part) => part.type === "weekday")?.value;

  return weekday ? `${year} / ${month} / ${day}（${weekday}）` : `${year} / ${month} / ${day}`;
}

function splitTargetMenus(targetMenu: string) {
  return targetMenu
    .split(/\s*(?:\+|\/|／|,|、|・|\n)\s*/g)
    .map((menu) => menu.trim())
    .filter(Boolean);
}

export default async function CouponPrintPage({ params }: CouponPrintPageProps) {
  const coupon = await prisma.coupon.findFirst({
    where: {
      id: params.couponId,
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

  if (!coupon) {
    notFound();
  }

  const status = effectiveCouponStatus(coupon);
  const discountLabel = formatCouponDiscount(coupon.discountType, coupon.discountValue);
  const flyerTitle = normalizeFlyerTitle(coupon.title, coupon.customer.name);
  const targetMenus = splitTargetMenus(coupon.targetMenu);
  const markPrinted = markCouponPrintedAction.bind(null, coupon.id, coupon.customerId);
  const salonMessage =
    coupon.description ??
    "日頃の感謝を込めて、ささやかな特典をご用意しました。これからも、あなたのキレイと心地よさを大切にサポートしてまいります。次回のご来店も心よりお待ちしております。";

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#eee9df] px-3 py-4 text-[#4b3925] sm:px-4 sm:py-6 print:bg-white print:p-0">
      <div className="no-print mx-auto mb-3 flex w-full max-w-[210mm] flex-col items-stretch justify-between gap-2 sm:flex-row sm:items-center print:hidden">
        <Link
          href={`/admin/customers/${coupon.customerId}`}
          className="inline-flex h-10 min-w-0 items-center justify-center gap-2 rounded-md border border-stone-200 bg-white px-3 text-sm font-semibold text-stone-700 shadow-sm hover:bg-stone-50 sm:px-4"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="truncate">顧客詳細に戻る</span>
        </Link>
        <CouponPrintButton markPrintedAction={markPrinted} />
      </div>

      <FlyerPhotoTemplate
        couponCode={coupon.couponCode}
        customerName={coupon.customer.name}
        discountLabel={discountLabel}
        flyerTitle={flyerTitle}
        issuedAtLabel={formatFlyerDate(coupon.issuedAt)}
        menuItems={targetMenus}
        salonMessage={salonMessage}
        status={status}
        validUntilLabel={formatFlyerDate(coupon.validUntil)}
      />
    </main>
  );
}

function FlyerPhotoTemplate({
  couponCode,
  customerName,
  discountLabel,
  flyerTitle,
  issuedAtLabel,
  menuItems,
  salonMessage,
  status,
  validUntilLabel
}: {
  couponCode: string;
  customerName: string;
  discountLabel: string;
  flyerTitle: string;
  issuedAtLabel: string;
  menuItems: string[];
  salonMessage: string;
  status: string;
  validUntilLabel: string;
}) {
  const visibleMenus = menuItems.length > 0 ? menuItems.slice(0, 5) : ["全メニュー"];

  return (
    <article
      className="print-page print-color-exact relative mx-auto aspect-[905/1280] w-full max-w-full overflow-hidden bg-[#fffaf1] text-[#4b3925] shadow-xl ring-1 ring-stone-200 [container-type:inline-size] sm:max-w-[210mm] print:max-w-none print:shadow-none print:ring-0"
      data-flyer-page
      style={{
        position: "relative",
        width: "100%",
        maxWidth: "210mm",
        aspectRatio: "905 / 1280",
        margin: "0 auto",
        overflow: "hidden",
        background: "#fffaf1",
        color: "#4b3925",
        containerType: "inline-size",
        boxShadow: "0 18px 40px rgba(68, 50, 28, 0.18)"
      }}
    >
      <img
        src={couponTemplateImageSrc}
        alt="Salon de Lien クーポンチラシテンプレート"
        className="absolute inset-0 z-0 h-full w-full object-cover"
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover"
        }}
      />

      <div
        data-flyer-overlay="title"
        style={{
          position: "absolute",
          zIndex: 10,
          left: "6.8%",
          top: "21.8%",
          width: "47.2%",
          height: "13.6%",
          overflow: "hidden",
          background: "#fffaf1",
          display: "grid",
          placeItems: "center",
          textAlign: "center",
          padding: "0 2.2%"
        }}
      >
        <div style={{ display: "grid", gap: "4%", width: "100%", maxHeight: "100%", overflow: "hidden" }}>
          <p
            style={{
              margin: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              fontFamily: "serif",
              fontSize: "clamp(11px, 2.35cqw, 18px)",
              fontWeight: 600,
              lineHeight: 1.05,
              color: "#6a4a31"
            }}
          >
            {customerName}様だけの
          </p>
          <p
            style={{
              margin: 0,
              overflow: "hidden",
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
              fontFamily: "serif",
              fontSize: "clamp(18px, 3.65cqw, 30px)",
              fontWeight: 700,
              lineHeight: 1.05,
              color: "#4b3925"
            }}
          >
            {flyerTitle}
          </p>
          <p
            style={{
              margin: 0,
              overflow: "hidden",
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
              fontSize: "clamp(6px, 0.82cqw, 9px)",
              fontWeight: 700,
              lineHeight: 1.25,
              color: "#6d5742"
            }}
          >
            次回も心地よくご利用いただけるように、キレイを応援する特別クーポンをお届けします。
          </p>
        </div>
      </div>

      <div
        data-flyer-overlay="hero-discount"
        style={{
          position: "absolute",
          zIndex: 10,
          left: "18.9%",
          top: "35.9%",
          width: "34.5%",
          height: "12.7%",
          overflow: "hidden",
          background: "#fffaf1",
          display: "grid",
          placeItems: "center",
          textAlign: "center"
        }}
      >
        <DiscountVisual label={discountLabel} />
      </div>

      <div
        data-flyer-overlay="menus"
        style={{
          position: "absolute",
          zIndex: 10,
          left: "4.9%",
          top: "56.9%",
          width: "27.4%",
          height: "10.4%",
          overflow: "hidden",
          background: "#fffaf1",
          padding: "1.2% 2.2%"
        }}
      >
        <ul
          style={{
            display: "grid",
            alignContent: "start",
            gap: "7%",
            height: "100%",
            margin: 0,
            padding: 0,
            listStyle: "none",
            fontSize: "clamp(10px, 1.45cqw, 14px)",
            fontWeight: 700,
            lineHeight: 1.2,
            color: "#4b3925"
          }}
        >
          {visibleMenus.map((menu) => (
            <li key={menu} style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              ・{menu}
            </li>
          ))}
        </ul>
      </div>

      <div
        data-flyer-overlay="validity"
        style={{
          position: "absolute",
          zIndex: 10,
          left: "35.5%",
          top: "57.6%",
          width: "25.6%",
          height: "7.2%",
          overflow: "hidden",
          background: "#fffaf1",
          display: "grid",
          placeItems: "center",
          textAlign: "center",
          padding: "0 1.2%"
        }}
      >
        <div style={{ display: "grid", gap: "8%", width: "100%", overflow: "hidden" }}>
          <p
            style={{
              margin: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              fontSize: "clamp(10px, 1.35cqw, 14px)",
              fontWeight: 700,
              lineHeight: 1.05,
              color: "#4b3925"
            }}
          >
            {validUntilLabel}
          </p>
          <p style={{ margin: 0, fontSize: "clamp(9px, 1.1cqw, 12px)", fontWeight: 700, lineHeight: 1, color: "#4b3925" }}>まで</p>
          <p
            style={{
              margin: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              fontSize: "clamp(6px, 0.78cqw, 9px)",
              lineHeight: 1,
              color: "#5f503d"
            }}
          >
            発行日: {issuedAtLabel}
          </p>
        </div>
      </div>

      <div
        data-flyer-overlay="coupon-code"
        style={{
          position: "absolute",
          zIndex: 10,
          left: "65.0%",
          top: "61.0%",
          width: "27.8%",
          height: "3.6%",
          overflow: "hidden",
          background: "#fff",
          display: "grid",
          placeItems: "center",
          textAlign: "center",
          padding: "0 1.2%"
        }}
      >
        <p
          style={{
            maxWidth: "100%",
            margin: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            fontFamily: "monospace",
            fontSize: "clamp(7px, 1.03cqw, 10px)",
            fontWeight: 700,
            lineHeight: 1,
            letterSpacing: "0.04em",
            color: "#4b3925"
          }}
        >
          {couponCode}
        </p>
      </div>

      <div
        data-flyer-overlay="salon-message"
        style={{
          position: "absolute",
          zIndex: 10,
          left: "6.4%",
          top: "74.5%",
          width: "61.5%",
          height: "5.8%",
          overflow: "hidden",
          background: "#fff4ee",
          padding: "0.2% 1.1%"
        }}
      >
        <p
          style={{
            margin: 0,
            overflow: "hidden",
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
            fontSize: "clamp(7px, 0.82cqw, 9px)",
            fontWeight: 600,
            lineHeight: 1.35,
            color: "#5f503d"
          }}
        >
          {salonMessage}
        </p>
      </div>

      <div
        aria-hidden="true"
        data-flyer-mask="salon-message-tail"
        style={{
          position: "absolute",
          zIndex: 10,
          left: "63.4%",
          top: "77.0%",
          width: "7.2%",
          height: "2.8%",
          overflow: "hidden",
          background: "#fff4ee"
        }}
      />
      {status === "expired" ? (
        <div
          className="absolute z-20 left-[7%] right-[7%] top-[2%] rounded-md border border-amber-300 bg-amber-50/95 px-4 py-2 text-center text-sm font-semibold text-amber-900"
          style={{ position: "absolute", zIndex: 20, left: "7%", right: "7%", top: "2%" }}
        >
          このクーポンは期限切れです。印刷前に有効期限をご確認ください。
        </div>
      ) : null}
    </article>
  );
}
function DiscountVisual({ label }: { label: string }) {
  const percentageMatch = label.match(/^(.+?)%OFF$/i);

  if (percentageMatch) {
    const value = percentageMatch[1];

    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          maxWidth: "100%",
          maxHeight: "100%",
          overflow: "hidden",
          fontFamily: "serif",
          fontWeight: 700,
          lineHeight: 1,
          color: "#cf6862"
        }}
      >
        <span style={{ fontSize: "clamp(42px, 10.7cqw, 82px)" }}>{value}</span>
        <span style={{ display: "grid", placeItems: "start", marginLeft: "0.35cqw" }}>
          <span style={{ fontSize: "clamp(18px, 3.7cqw, 30px)", lineHeight: 0.95 }}>%</span>
          <span style={{ fontSize: "clamp(17px, 3.1cqw, 28px)", lineHeight: 0.95 }}>OFF</span>
        </span>
      </div>
    );
  }

  return (
    <p
      style={{
        maxWidth: "100%",
        margin: 0,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        fontFamily: "serif",
        fontSize: "clamp(17px, 3.2cqw, 30px)",
        fontWeight: 700,
        lineHeight: 1,
        color: "#cf6862"
      }}
    >
      {label}
    </p>
  );
}

