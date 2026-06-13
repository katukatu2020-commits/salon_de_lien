import { notFound } from "next/navigation";
import { CalendarDays, CheckCircle2, MessageCircle, Sparkles } from "lucide-react";
import { createCustomerFeedback } from "@/lib/actions";
import { prisma } from "@/lib/prisma";

type FeedbackPageProps = {
  params: {
    id: string;
  };
};

const homeStylingOptions = ["家でも扱いやすい", "少しセットが難しい", "前髪・顔まわりが気になる", "色持ち・まとまりを相談したい"];
const homeCareInterestOptions = ["おすすめがあれば知りたい", "シャンプー・トリートメントを相談したい", "乾かし方だけ知りたい", "今回は不要"];
const rebookReasonOptions = ["きれいな状態を保ちたい", "白髪・根元が気になる前に整えたい", "前髪・顔まわりを定期的に整えたい", "次回はまだ未定"];

function feedbackRating(message?: string | null) {
  const match = (message ?? "").match(/来店後評価:\s*(\d)\/5/);
  return match ? Number(match[1]) : null;
}

function feedbackMessageLine(message: string | null | undefined, label: string) {
  const line = (message ?? "")
    .split(/\r?\n/)
    .find((item) => item.startsWith(`${label}:`));

  return line ? line.replace(`${label}:`, "").trim() : null;
}

function googleReviewShareUrl() {
  const url = process.env.NEXT_PUBLIC_GOOGLE_REVIEW_URL ?? process.env.NEXT_PUBLIC_REVIEW_URL ?? process.env.GOOGLE_REVIEW_URL;
  return url?.trim() || null;
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

export default async function FeedbackPage({ params }: FeedbackPageProps) {
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

  const feedbackAction = createCustomerFeedback.bind(null, customer.id);
  const latestVisit = customer.visits[0] ?? null;
  const latestSale = customer.serviceSales[0] ?? null;
  const latestFeedback = customer.contactLogs[0] ?? null;
  const latestFeedbackRating = feedbackRating(latestFeedback?.message);
  const latestReviewPermission = feedbackMessageLine(latestFeedback?.message, "口コミ");
  const googleReviewUrl = googleReviewShareUrl();
  const canShowGoogleReviewLink = Boolean(
    googleReviewUrl &&
      latestFeedback &&
      latestFeedbackRating !== null &&
      latestFeedbackRating >= 4 &&
      latestReviewPermission?.includes("投稿")
  );

  return (
    <main className="min-h-screen bg-[#f8f5ef] text-stone-900">
      <section className="mx-auto grid w-full max-w-3xl gap-5 px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-teal-800">Salon de Lien</p>
          <h1 className="mt-2 text-3xl font-semibold text-stone-950">仕上がり確認</h1>
          <p className="mt-3 text-sm leading-7 text-stone-600">
            {customer.name}様、先日はご来店ありがとうございました。仕上がりや扱いやすさを確認し、必要なフォローや次回の目安をご案内します。
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-md border border-stone-200 bg-[#fbf8f3] p-3">
              <p className="text-xs font-semibold text-stone-500">最終来店</p>
              <p className="mt-2 text-sm font-semibold text-stone-950">{formatDate(latestVisit?.visitedAt)}</p>
            </div>
            <div className="rounded-md border border-stone-200 bg-[#fbf8f3] p-3">
              <p className="text-xs font-semibold text-stone-500">前回メニュー</p>
              <p className="mt-2 text-sm font-semibold text-stone-950">{latestSale?.title ?? "来店時に確認"}</p>
            </div>
          </div>
        </div>

        {latestFeedback ? (
          <div className="rounded-lg border border-teal-200 bg-teal-50 p-5 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-teal-800" />
              <h2 className="text-lg font-semibold text-teal-950">回答を受け付けました</h2>
            </div>
            <p className="mt-3 text-sm leading-6 text-teal-900">
              内容はスタッフに届いています。気になる点がある場合は、確認してご連絡します。
            </p>
            <p className="mt-3 whitespace-pre-wrap rounded-md bg-white px-3 py-2 text-xs leading-5 text-stone-700">
              {latestFeedback.message}
            </p>
            {canShowGoogleReviewLink ? (
              <div className="mt-4 rounded-md border border-amber-200 bg-white p-4">
                <h3 className="text-sm font-semibold text-amber-950">口コミ投稿もできます</h3>
                <p className="mt-2 text-xs leading-5 text-amber-900">
                  仕上がりにご満足いただけていれば、率直な感想を投稿いただけると今後のご案内の励みになります。
                </p>
                <a
                  href={googleReviewUrl ?? "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex h-10 items-center rounded-md bg-amber-800 px-4 text-xs font-semibold text-white hover:bg-amber-900"
                >
                  口コミを投稿する
                </a>
              </div>
            ) : null}
          </div>
        ) : null}

        <form action={feedbackAction} className="grid gap-4 rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-stone-950">
              <Sparkles className="h-5 w-5 text-teal-800" />
              仕上がりはいかがですか
            </h2>
            <div className="mt-4 grid gap-2 sm:grid-cols-5">
              {[1, 2, 3, 4, 5].map((rating) => (
                <label key={rating} className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-stone-200 bg-[#fbf8f3] px-3 py-3 text-sm font-semibold text-stone-800">
                  <input name="rating" type="radio" value={rating} required className="h-4 w-4 border-stone-300 text-teal-800" />
                  {rating}
                </label>
              ))}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {["とても満足", "扱いやすい", "少し気になる", "手直しを相談したい"].map((item) => (
              <label key={item} className="flex cursor-pointer items-center gap-2 rounded-md border border-stone-200 bg-[#fbf8f3] px-3 py-3 text-sm font-semibold text-stone-800">
                <input name="satisfaction" type="radio" value={item} className="h-4 w-4 border-stone-300 text-teal-800" />
                {item}
              </label>
            ))}
          </div>

          <div className="rounded-md border border-amber-200 bg-amber-50 p-4">
            <h3 className="text-sm font-semibold text-amber-950">口コミ・感想について</h3>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {["口コミ投稿してもよい", "まずは相談したい", "今回は控える"].map((item) => (
                <label key={item} className="flex cursor-pointer items-center gap-2 rounded-md border border-amber-200 bg-white px-3 py-2 text-xs font-semibold text-stone-800">
                  <input name="reviewPermission" type="radio" value={item} className="h-4 w-4 border-stone-300 text-amber-700" />
                  {item}
                </label>
              ))}
            </div>
          </div>

          <div className="rounded-md border border-teal-200 bg-teal-50 p-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-teal-950">
              <CalendarDays className="h-4 w-4" />
              次回の目安
            </h3>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {["4週間以内に相談", "6週間前後で予約相談", "2か月以内に予約相談", "まだ決めない"].map((item) => (
                <label key={item} className="flex cursor-pointer items-center gap-2 rounded-md border border-teal-200 bg-white px-3 py-2 text-xs font-semibold text-stone-800">
                  <input name="rebookTiming" type="radio" value={item} className="h-4 w-4 border-stone-300 text-teal-800" />
                  {item}
                </label>
              ))}
            </div>
            <label className="mt-3 grid gap-1 text-sm font-medium text-teal-950">
              希望日時
              <input
                name="preferredDate"
                type="datetime-local"
                className="h-11 rounded-md border border-teal-200 bg-white px-3 text-stone-950 shadow-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
              />
            </label>
          </div>

          <div className="rounded-md border border-indigo-200 bg-indigo-50 p-4">
            <h3 className="text-sm font-semibold text-indigo-950">家での扱いやすさ</h3>
            <p className="mt-2 text-xs leading-5 text-indigo-900">
              家での扱い方が分かると、必要なフォローや次回の提案を合わせやすくなります。
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {homeStylingOptions.map((item) => (
                <label key={item} className="flex cursor-pointer items-center gap-2 rounded-md border border-indigo-200 bg-white px-3 py-2 text-xs font-semibold text-stone-800">
                  <input name="homeStyling" type="radio" value={item} className="h-4 w-4 border-stone-300 text-indigo-800" />
                  {item}
                </label>
              ))}
            </div>
          </div>

          <div className="rounded-md border border-violet-200 bg-violet-50 p-4">
            <h3 className="text-sm font-semibold text-violet-950">ホームケア相談</h3>
            <p className="mt-2 text-xs leading-5 text-violet-900">
              必要な場合だけ、髪の状態に合わせたケアや乾かし方をご案内します。
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {homeCareInterestOptions.map((item) => (
                <label key={item} className="flex cursor-pointer items-center gap-2 rounded-md border border-violet-200 bg-white px-3 py-2 text-xs font-semibold text-stone-800">
                  <input name="homeCareInterest" type="radio" value={item} className="h-4 w-4 border-stone-300 text-violet-800" />
                  {item}
                </label>
              ))}
            </div>
          </div>

          <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4">
            <h3 className="text-sm font-semibold text-emerald-950">次回につなげたい理由</h3>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {rebookReasonOptions.map((item) => (
                <label key={item} className="flex cursor-pointer items-center gap-2 rounded-md border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold text-stone-800">
                  <input name="rebookReason" type="radio" value={item} className="h-4 w-4 border-stone-300 text-emerald-800" />
                  {item}
                </label>
              ))}
            </div>
          </div>

          <label className="grid gap-1 text-sm font-medium text-stone-700">
            気になる点・感想
            <textarea
              name="message"
              placeholder="前髪の扱い、カラーの色味、朝のセットなど"
              className="min-h-24 rounded-md border border-stone-200 bg-white px-3 py-2 text-stone-950 shadow-sm outline-none placeholder:text-stone-400 focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
            />
          </label>

          <button type="submit" className="inline-flex h-11 items-center justify-center rounded-md bg-teal-900 px-5 text-sm font-semibold text-white shadow-sm hover:bg-teal-950 md:w-fit">
            <MessageCircle className="mr-2 h-4 w-4" />
            送信する
          </button>
        </form>
      </section>
    </main>
  );
}
