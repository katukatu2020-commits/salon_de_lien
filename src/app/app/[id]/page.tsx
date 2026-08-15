import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, Camera, CheckCircle2, ChevronRight, Gift, Handshake, Heart, MessageCircle, Scissors, Sparkles, TicketPercent } from "lucide-react";
import { CustomerAppAiPhotoUploader } from "@/components/customers/customer-app-ai-photo-uploader";
import { BrandVisual, customerCareVisualVariant } from "@/components/lien/brand-visual";
import { effectiveCouponStatus, formatCouponDiscount } from "@/lib/coupons";
import { expirePointsForCustomer } from "@/lib/points/point-service";
import { prisma } from "@/lib/prisma";
import { resolveCustomerPhotoReferences } from "@/lib/storage/customer-photo";
import { legacyCustomerIdPortalAllowed } from "@/lib/auth/customer-portal";

type CustomerAppPageProps = {
  params: {
    id: string;
  };
  searchParams?: {
    feedback?: string;
    reviewPoints?: string;
    pointExpiresAt?: string;
  };
  portalToken?: string;
};

function pageUrl(path: string) {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");

  return baseUrl ? `${baseUrl.replace(/\/$/, "")}${path}` : path;
}
function formatDate(date?: Date | null) {
  if (!date) {
    return "-";
  }

  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

function formatDateTime(date?: Date | null) {
  if (!date) {
    return "-";
  }

  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function addMonths(date: Date, months: number) {
  const nextDate = new Date(date);
  nextDate.setMonth(nextDate.getMonth() + months);
  return nextDate;
}

function isActiveAppointmentStatus(status: string) {
  return status !== "キャンセル" && status !== "無断キャンセル" && status !== "来店済み";
}

function parseJsonStringArray(value?: string | null) {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string" && item.length > 0) : [];
  } catch {
    return [];
  }
}

function uniqueUrls(urls: Array<string | null | undefined>) {
  return Array.from(new Set(urls.filter((url): url is string => Boolean(url))));
}

function AppLink({
  href,
  icon,
  title,
  description
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Link href={href} className="flex items-center gap-3 rounded-lg border border-stone-200 bg-white p-4 shadow-sm active:scale-[0.99]">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-teal-50 text-teal-900">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-stone-950">{title}</span>
        <span className="mt-1 block truncate text-xs text-stone-500">{description}</span>
      </span>
      <ChevronRight className="h-5 w-5 shrink-0 text-stone-400" />
    </Link>
  );
}

export default async function CustomerAppPage({ params, searchParams, portalToken }: CustomerAppPageProps) {
  if (!portalToken && !legacyCustomerIdPortalAllowed()) notFound();
  await expirePointsForCustomer(params.id);

  const customer = await prisma.customer.findFirst({
    where: {
      id: params.id,
      deletedAt: null
    },
    include: {
      visits: {
        orderBy: { visitedAt: "desc" },
        take: 1
      },
      appointments: {
        orderBy: { scheduledAt: "asc" },
        take: 5
      },
      styleSuggestions: {
        orderBy: [{ accepted: "desc" }, { createdAt: "desc" }],
        take: 3
      },
      proposalResponses: {
        orderBy: { createdAt: "desc" },
        take: 1
      },
      serviceSales: {
        orderBy: { paidAt: "desc" },
        take: 1
      },
      customerOffers: {
        where: { status: "published" },
        orderBy: { createdAt: "desc" },
        take: 5
      },
      coupons: {
        where: { status: "issued" },
        orderBy: { createdAt: "desc" },
        take: 5
      },
      partnerCoupons: {
        where: { status: "published" },
        orderBy: { createdAt: "desc" },
        take: 5
      },
      pointAccount: true,
      pointLots: {
        where: { remainingAmount: { gt: 0 } },
        orderBy: { expiresAt: "asc" },
        take: 5
      }
    }
  });

  if (!customer) {
    notFound();
  }

  const latestVisit = customer.visits[0] ?? null;
  const latestSale = customer.serviceSales[0] ?? null;
  const latestSuggestion =
    customer.styleSuggestions.find((suggestion) => suggestion.accepted) ??
    customer.styleSuggestions.find((suggestion) => suggestion.imageUrls.length > 0 || Boolean(suggestion.imageUrlsJson)) ??
    customer.styleSuggestions[0] ??
    null;
  const latestResponse = customer.proposalResponses[0] ?? null;
  const upcomingAppointment =
    customer.appointments
      .filter((appointment) => appointment.scheduledAt.getTime() >= Date.now() && isActiveAppointmentStatus(appointment.status))
      .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime())[0] ?? null;
  const nextVisitDate = addMonths(latestSale?.paidAt ?? latestVisit?.visitedAt ?? new Date(), 2);
  const customerAppBasePath = `/u/${portalToken ?? customer.id}`;
  const intakePath = `${customerAppBasePath}/intake`;
  const proposalPath = latestSuggestion ? `${customerAppBasePath}/proposals/${latestSuggestion.id}` : intakePath;
  const appointmentPath = upcomingAppointment ? `${customerAppBasePath}/appointments/confirm/${upcomingAppointment.id}` : `${proposalPath}#reply`;
  const carePath = `${customerAppBasePath}/care`;
  const feedbackPath = `${customerAppBasePath}/feedback`;
  const [frontImageUrls, sideImageUrls, backImageUrls] = await Promise.all([
    resolveCustomerPhotoReferences(uniqueUrls([...parseJsonStringArray(customer.aiFrontImageUrlsJson), customer.aiFrontImageUrl])),
    resolveCustomerPhotoReferences(uniqueUrls([...parseJsonStringArray(customer.aiSideImageUrlsJson), customer.aiSideImageUrl])),
    resolveCustomerPhotoReferences(uniqueUrls([...parseJsonStringArray(customer.aiBackImageUrlsJson), customer.aiBackImageUrl]))
  ]);
  const now = new Date();
  const activeCustomerOffers = customer.customerOffers.filter(
    (offer) => !offer.validUntil || offer.validUntil.getTime() >= now.getTime()
  );
  const activeCoupons = customer.coupons.filter((coupon) => effectiveCouponStatus(coupon, now) === "issued");
  const activePartnerCoupons = customer.partnerCoupons.filter(
    (coupon) => !coupon.validUntil || coupon.validUntil.getTime() >= now.getTime()
  );
  const pointAccount = customer.pointAccount ?? { availablePoints: 0 };
  const expiringPointLot = customer.pointLots[0] ?? null;
  const awardedReviewPoints = searchParams?.reviewPoints ? Number(searchParams.reviewPoints) : null;
  const reviewPointsLabel = awardedReviewPoints !== null && Number.isFinite(awardedReviewPoints) ? awardedReviewPoints : null;
  const pointExpiresAt = searchParams?.pointExpiresAt ? new Date(searchParams.pointExpiresAt) : null;

  return (
    <main className="min-h-screen bg-[#f7f3ec] pb-24 text-stone-950">
      <section className="mx-auto grid w-full max-w-md gap-4 px-4 py-4">
        <header>
          <BrandVisual
            variant={customerCareVisualVariant(customer.gender)}
            className="h-60 rounded-[26px] border border-[#e6d8ca] shadow-lien-sm"
            imageClassName="object-[58%_52%]"
            sizes="(max-width: 448px) 100vw, 448px"
            priority
            overlay="none"
          >
            <div className="flex h-full items-start justify-between gap-3 bg-gradient-to-r from-[#fffdf9]/95 via-[#fffdf9]/58 to-transparent p-5">
              <div>
                <p className="text-2xl font-semibold tracking-normal text-[#342b25]">Salon de Lien</p>
                <p className="mt-1 text-xs font-semibold text-[#6f6157]">{customer.name}様のアプリ</p>
                <p className="mt-4 max-w-44 text-sm font-semibold leading-6 text-[#5b352d]">今日のきれいを、次の来店まで心地よく。</p>
              </div>
              <span className="shrink-0 rounded-full border border-white/80 bg-white/82 px-3 py-1 text-xs font-semibold text-[#5b352d] shadow-sm backdrop-blur-sm">
                My hair
              </span>
            </div>
          </BrandVisual>
        </header>

        {searchParams?.feedback === "thanks" ? (
          <section className="rounded-lg border border-teal-200 bg-teal-50 p-4 text-sm leading-6 text-teal-950 shadow-sm">
            仕上がり確認のご回答ありがとうございました。30ptを付与しました。
          </section>
        ) : null}

        {searchParams?.feedback === "already" ? (
          <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950 shadow-sm">
            この施術後アンケートは回答済みです。同じ施術後のポイント付与は1回だけです。
          </section>
        ) : null}

        {reviewPointsLabel !== null ? (
          <section className="rounded-lg border border-teal-200 bg-teal-50 p-4 text-sm leading-6 text-teal-950 shadow-sm">
            商品アンケートのご回答ありがとうございました。{reviewPointsLabel.toLocaleString("ja-JP")}ptを現在使えるポイントへ加算しました。
            {pointExpiresAt && !Number.isNaN(pointExpiresAt.getTime()) ? <span className="mt-1 block text-xs">ポイント有効期限: {formatDate(pointExpiresAt)}</span> : null}
          </section>
        ) : null}

        <section className="rounded-[20px] border border-teal-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-teal-800">利用可能ポイント</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums text-stone-950">
            {pointAccount.availablePoints.toLocaleString("ja-JP")}<span className="ml-1 text-base">pt</span>
          </p>
          {expiringPointLot ? (
            <p className="mt-2 text-xs leading-5 text-amber-800">
              有効期限が近いポイント: {expiringPointLot.remainingAmount.toLocaleString("ja-JP")}pt / {formatDate(expiringPointLot.expiresAt)}まで
            </p>
          ) : null}
        </section>

        <section className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold text-stone-500">次回予約</p>
            <p className="mt-2 text-sm font-semibold leading-6">
              {upcomingAppointment ? formatDateTime(upcomingAppointment.scheduledAt) : "未設定"}
            </p>
          </div>
          <div className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold text-stone-500">次の目安</p>
            <p className="mt-2 text-sm font-semibold leading-6">{formatDate(nextVisitDate)}</p>
          </div>
        </section>

        {activeCoupons.length > 0 || activeCustomerOffers.length > 0 || activePartnerCoupons.length > 0 ? (
          <section className="grid gap-3 rounded-lg border border-teal-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <TicketPercent className="h-5 w-5 text-teal-800" />
              <h2 className="text-sm font-semibold text-stone-950">このお客様だけの限定提案</h2>
            </div>
            {activeCoupons.length > 0 ? (
              <div className="grid gap-2">
                <h3 className="text-xs font-semibold text-stone-600">あなた専用の限定クーポン</h3>
                {activeCoupons.map((coupon) => (
                  <article key={coupon.id} className="rounded-md border border-teal-100 bg-teal-50 p-3">
                    <div className="flex items-start gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-white text-teal-900">
                        <TicketPercent className="h-5 w-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-semibold text-stone-950">{coupon.title}</h4>
                        <p className="mt-1 text-lg font-semibold text-teal-900">{formatCouponDiscount(coupon)}</p>
                        {coupon.description ? <p className="mt-2 text-xs leading-5 text-stone-700">{coupon.description}</p> : null}
                        <div className="mt-2 grid gap-1 text-xs text-stone-500">
                          <p>対象メニュー: {coupon.targetMenu}</p>
                          <p>有効期限: {formatDate(coupon.validUntil)}</p>
                          <p>識別コード: {coupon.couponCode}</p>
                        </div>
                        <p className="mt-3 rounded border border-teal-200 bg-white px-3 py-2 text-xs font-semibold text-teal-900">
                          スタッフへこの画面をお見せください
                        </p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : null}
            {activeCustomerOffers.map((offer) => (
              <article key={offer.id} className="rounded-md border border-teal-100 bg-teal-50 p-3">
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-white text-teal-900">
                    <Gift className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-stone-950">{offer.title}</h3>
                    {offer.benefit ? <p className="mt-1 text-sm font-semibold text-teal-900">{offer.benefit}</p> : null}
                    {offer.description ? <p className="mt-2 text-xs leading-5 text-stone-700">{offer.description}</p> : null}
                    <div className="mt-2 grid gap-1 text-xs text-stone-500">
                      {offer.couponCode ? <p>クーポンコード: {offer.couponCode}</p> : null}
                      {offer.validUntil ? <p>有効期限: {formatDate(offer.validUntil)}</p> : null}
                    </div>
                  </div>
                </div>
              </article>
            ))}
            {activePartnerCoupons.map((coupon) => (
              <article key={coupon.id} className="rounded-md border border-indigo-100 bg-indigo-50 p-3">
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-white text-indigo-900">
                    <Handshake className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-stone-950">{coupon.title}</h3>
                    <p className="mt-1 text-xs font-semibold text-indigo-900">{coupon.partnerName}</p>
                    {coupon.benefit ? <p className="mt-1 text-sm font-semibold text-indigo-900">{coupon.benefit}</p> : null}
                    {coupon.description ? <p className="mt-2 text-xs leading-5 text-stone-700">{coupon.description}</p> : null}
                    <div className="mt-2 grid gap-1 text-xs text-stone-500">
                      {coupon.couponCode ? <p>クーポンコード: {coupon.couponCode}</p> : null}
                      {coupon.validUntil ? <p>有効期限: {formatDate(coupon.validUntil)}</p> : null}
                    </div>
                    {coupon.url ? (
                      <a
                        href={coupon.url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-flex h-9 items-center rounded-md bg-indigo-900 px-3 text-xs font-semibold text-white"
                      >
                        詳細を開く
                      </a>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </section>
        ) : null}

        <section className="grid gap-3">
          <AppLink
            href={proposalPath}
            icon={<Sparkles className="h-5 w-5" />}
            title={upcomingAppointment ? "提案" : "提案・予約相談"}
            description={upcomingAppointment ? latestSuggestion?.suggestedStyleName ?? "似合う方向性を確認" : "提案確認と予約希望を送る"}
          />
          {upcomingAppointment ? (
            <AppLink
              href={appointmentPath}
              icon={<CalendarDays className="h-5 w-5" />}
              title="予約確認"
              description={upcomingAppointment.menu ?? "予約内容を確認"}
            />
          ) : null}
          <AppLink
            href={carePath}
            icon={<Scissors className="h-5 w-5" />}
            title="ホームケア"
            description="家での扱い方を見る"
          />
          <AppLink
            href={feedbackPath}
            icon={<CheckCircle2 className="h-5 w-5" />}
            title="仕上がり確認"
            description="感想や次回の希望を送る"
          />
          <AppLink
            href="#ai-photos"
            icon={<Camera className="h-5 w-5" />}
            title="AI写真登録"
            description="正面・横・斜め後ろの写真を登録"
          />
          <AppLink
            href={intakePath}
            icon={<Heart className="h-5 w-5" />}
            title="紹介・相談"
            description="新しい相談フォームを開く"
          />
        </section>

        <CustomerAppAiPhotoUploader
          customerId={customer.id}
          portalToken={portalToken}
          frontImageUrls={frontImageUrls}
          sideImageUrls={sideImageUrls}
          backImageUrls={backImageUrls}
          consent={customer.aiPhotoConsent}
        />

        {latestResponse ? (
          <section className="rounded-lg border border-teal-200 bg-teal-50 p-4 text-sm text-teal-950">
            <p className="flex items-center gap-2 font-semibold">
              <MessageCircle className="h-4 w-4" />
              最新の返信
            </p>
            <p className="mt-2">{latestResponse.intent}</p>
            <p className="mt-1 text-xs">送信日 {formatDateTime(latestResponse.createdAt)}</p>
          </section>
        ) : null}

        <p className="text-center text-[11px] leading-5 text-stone-500">
          ブックマークやホーム画面に追加して使えます。
          <br />
          {pageUrl(customerAppBasePath)}
        </p>
      </section>

      <nav className="fixed inset-x-0 bottom-0 border-t border-stone-200 bg-white/95 px-4 py-2 shadow-[0_-8px_24px_rgba(28,25,23,0.08)] backdrop-blur">
        <div className={`mx-auto grid max-w-md ${upcomingAppointment ? "grid-cols-4" : "grid-cols-3"} gap-2 text-center text-[11px] font-semibold text-stone-600`}>
          <Link href={proposalPath} className="rounded-md px-2 py-2 text-teal-900">
            <Sparkles className="mx-auto h-5 w-5" />
            {upcomingAppointment ? "提案" : "提案予約"}
          </Link>
          {upcomingAppointment ? (
            <Link href={appointmentPath} className="rounded-md px-2 py-2">
              <CalendarDays className="mx-auto h-5 w-5" />
              予約
            </Link>
          ) : null}
          <Link href={carePath} className="rounded-md px-2 py-2">
            <Scissors className="mx-auto h-5 w-5" />
            ケア
          </Link>
          <Link href={feedbackPath} className="rounded-md px-2 py-2">
            <CheckCircle2 className="mx-auto h-5 w-5" />
            確認
          </Link>
        </div>
      </nav>
    </main>
  );
}

