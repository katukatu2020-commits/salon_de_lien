import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CalendarDays, CheckCircle2, MessageCircle, Sparkles } from "lucide-react";
import { BrandVisual, customerCareVisualVariant } from "@/components/lien/brand-visual";
import { createCustomerFeedback } from "@/lib/actions";
import { prisma } from "@/lib/prisma";
import { legacyCustomerIdPortalAllowed } from "@/lib/auth/customer-portal";

type FeedbackPageProps = {
  params: {
    id: string;
  };
  searchParams?: {
    inApp?: string;
  };
  portalToken?: string;
};

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

export default async function FeedbackPage({ params, searchParams, portalToken }: FeedbackPageProps) {
  if (!portalToken && !legacyCustomerIdPortalAllowed()) {
    notFound();
  }

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
      serviceSales: {
        orderBy: { paidAt: "desc" },
        take: 1
      },
      contactLogs: {
        where: { purpose: "来店後フィードバック" },
        orderBy: { createdAt: "desc" },
        take: 1
      }
    }
  });

  if (!customer) {
    notFound();
  }

  if (!portalToken && searchParams?.inApp !== "1") {
    redirect(`/u/${customer.id}/feedback`);
  }

  const feedbackAction = createCustomerFeedback.bind(null, customer.id, portalToken ?? null);
  const portalHome = `/u/${portalToken ?? customer.id}`;
  const latestVisit = customer.visits[0] ?? null;
  const latestSale = customer.serviceSales[0] ?? null;
  const latestTreatmentAt = latestSale?.paidAt ?? latestVisit?.visitedAt ?? null;
  const latestFeedback = customer.contactLogs[0] ?? null;
  const latestTreatmentFeedback =
    latestTreatmentAt && latestFeedback && latestFeedback.createdAt.getTime() >= latestTreatmentAt.getTime() ? latestFeedback : null;
  const canAnswer = Boolean(latestTreatmentAt) && !latestTreatmentFeedback;

  return (
    <main className="min-h-screen bg-lien px-4 py-6 text-lien-ink">
      <section className="mx-auto grid w-full max-w-2xl gap-5">
        <div className="overflow-hidden rounded-[26px] border border-lien bg-white shadow-lien-sm">
          <BrandVisual
            variant={customerCareVisualVariant(customer.gender)}
            className="h-44"
            imageClassName="object-[58%_52%]"
            sizes="(max-width: 672px) 100vw, 672px"
            priority
          />
          <div className="p-5">
            <p className="text-sm font-semibold text-[color:var(--lien-primary-dark)]">Salon de Lien</p>
            <h1 className="mt-2 text-2xl font-semibold">仕上がり確認</h1>
            <p className="mt-3 text-sm leading-7 text-lien-muted">
              {customer.name}様、本日はご来店ありがとうございました。仕上がりや家での扱いやすさを確認し、必要なフォローや次回の目安をご案内します。
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-[18px] border border-lien bg-lien-soft p-3">
              <p className="text-xs font-semibold text-lien-muted">最終来店</p>
              <p className="mt-2 text-sm font-semibold text-lien-ink">{formatDate(latestVisit?.visitedAt)}</p>
            </div>
            <div className="rounded-[18px] border border-lien bg-lien-soft p-3">
              <p className="text-xs font-semibold text-lien-muted">前回メニュー</p>
              <p className="mt-2 text-sm font-semibold text-lien-ink">{latestSale?.title ?? latestVisit?.performedStyle ?? "来店時に確認"}</p>
            </div>
            </div>
          </div>
        </div>

        {!latestTreatmentAt ? (
          <div className="rounded-[24px] border border-amber-200 bg-amber-50 p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-amber-950">施術後に回答できます</h2>
            <p className="mt-3 text-sm leading-6 text-amber-900">
              このアンケートは来店記録または会計記録の登録後に1回だけ回答できます。必要な場合はサロンスタッフへご確認ください。
            </p>
            <Link href={portalHome} className="mt-4 inline-flex h-10 items-center rounded-full bg-amber-800 px-4 text-sm font-semibold text-white">
              お客様トップへ戻る
            </Link>
          </div>
        ) : latestTreatmentFeedback ? (
          <div className="rounded-[24px] border border-[#cbdcc8] bg-[color:var(--lien-sage-soft)] p-5 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-[color:var(--lien-sage)]" />
              <h2 className="text-lg font-semibold text-[#405d41]">この施術後アンケートは回答済みです</h2>
            </div>
            <p className="mt-3 text-sm leading-6 text-[#405d41]">
              同じ施術後のアンケートは1回だけ回答できます。ご回答ありがとうございました。
            </p>
            <Link href={portalHome} className="mt-4 inline-flex h-10 items-center rounded-full bg-[color:var(--lien-primary)] px-4 text-sm font-semibold text-white">
              お客様トップへ戻る
            </Link>
          </div>
        ) : null}

        {canAnswer ? (
          <form action={feedbackAction} className="grid gap-5 rounded-[26px] border border-lien bg-white p-5 shadow-lien-sm">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <Sparkles className="h-5 w-5 text-[color:var(--lien-primary)]" />
                今日の仕上がりはいかがですか
              </h2>
              <div className="mt-4 grid grid-cols-5 gap-2">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <label key={rating} className="flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-lien bg-lien-soft text-sm font-semibold">
                    <input name="rating" type="radio" value={rating} required className="h-4 w-4 accent-[color:var(--lien-primary)]" />
                    {rating}
                  </label>
                ))}
              </div>
            </div>

            <fieldset className="grid gap-2">
              <legend className="text-sm font-semibold">仕上がり</legend>
              {["とても満足", "扱いやすい", "少し気になる", "手直しを相談したい"].map((item) => (
                <label key={item} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-2xl border border-lien bg-lien-soft px-3 text-sm font-semibold">
                  <input name="satisfaction" type="radio" value={item} className="h-4 w-4 accent-[color:var(--lien-primary)]" />
                  {item}
                </label>
              ))}
            </fieldset>

            <fieldset className="grid gap-2 rounded-[22px] border border-lien bg-lien-soft p-4">
              <legend className="px-1 text-sm font-semibold">ホームケア・次回</legend>
              <label className="grid gap-1 text-sm font-semibold">
                家での扱いやすさ
                <select name="homeStyling" className="lien-input">
                  <option value="">選択してください</option>
                  <option>家でも扱いやすい</option>
                  <option>少しセットが難しい</option>
                  <option>前髪・顔まわりが気になる</option>
                  <option>色持ち・まとまりを相談したい</option>
                </select>
              </label>
              <label className="grid gap-1 text-sm font-semibold">
                ホームケア相談
                <select name="homeCareInterest" className="lien-input">
                  <option value="">選択してください</option>
                  <option>おすすめがあれば知りたい</option>
                  <option>シャンプー・トリートメントを相談したい</option>
                  <option>乾かし方だけ知りたい</option>
                  <option>今回は不要</option>
                </select>
              </label>
              <label className="grid gap-1 text-sm font-semibold">
                次回希望
                <select name="rebookTiming" className="lien-input">
                  <option value="">選択してください</option>
                  <option>4週間以内に相談</option>
                  <option>6週間前後で予約相談</option>
                  <option>2か月以内に予約相談</option>
                  <option>まだ決めない</option>
                </select>
              </label>
              <label className="grid gap-1 text-sm font-semibold">
                希望日時
                <input name="preferredDate" type="datetime-local" className="lien-input" />
              </label>
            </fieldset>

            <fieldset className="grid gap-2">
              <legend className="text-sm font-semibold">口コミについて</legend>
              {["口コミ投稿してもよい", "まずは相談したい", "今回は控える"].map((item) => (
                <label key={item} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-2xl border border-lien bg-lien-soft px-3 text-sm font-semibold">
                  <input name="reviewPermission" type="radio" value={item} className="h-4 w-4 accent-[color:var(--lien-primary)]" />
                  {item}
                </label>
              ))}
            </fieldset>

            <label className="grid gap-1 text-sm font-semibold">
              気になった点・感想
              <textarea name="message" rows={4} className="lien-input py-3" placeholder="気になる点や次回相談したいことがあれば入力してください" />
            </label>

            <label className="grid gap-1 text-sm font-semibold">
              次回につながる理由
              <input name="rebookReason" className="lien-input" placeholder="例: きれいな状態を保ちたい" />
            </label>

            <button type="submit" className="lien-button-primary min-h-12">
              <MessageCircle className="h-4 w-4" />
              回答して30ptを受け取る
            </button>
            <p className="text-xs leading-5 text-lien-muted">
              この施術後アンケートは1回だけ回答できます。回答後はお客様トップへ戻ります。
            </p>
          </form>
        ) : null}

        <div className="flex items-center gap-2 text-xs text-lien-muted">
          <CalendarDays className="h-4 w-4" />
          回答内容は次回の接客準備に活用されます。
        </div>
      </section>
    </main>
  );
}
