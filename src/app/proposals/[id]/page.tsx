import { notFound } from "next/navigation";
import { CalendarDays, CheckCircle2, Clock3, MessageCircle, Scissors, Sparkles } from "lucide-react";
import { HairColorAdjustmentPanel } from "@/components/customers/hair-color-adjustment-panel";
import { createProposalResponse } from "@/lib/actions";
import { prisma } from "@/lib/prisma";

const ANGLES = ["斜め正面", "横", "斜め後ろ"] as const;
const CONCERNS = ["似合うか相談したい", "料金を確認したい", "所要時間が気になる", "朝のセットが不安"];
const VISIT_TIMINGS = ["今週中", "2週間以内", "今月中", "予定が合えば"];
const BUDGET_PREFERENCES = ["提案通りで相談", "料金を抑えたい", "必要ならケアも相談"];
const CONTACT_OPTIONS = ["LINEで返信希望", "電話で相談したい", "SMSで返信希望", "おまかせ"];

type ProposalPageProps = {
  params: {
    id: string;
  };
};

type StyleImageEntry = {
  angle: string;
  url: string;
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

function parseImageEntries(imageUrls: string[], imageUrlsJson: string | null): StyleImageEntry[] {
  const fallback = imageUrls.map((url, index) => ({
    angle: ANGLES[index] ?? `画像${index + 1}`,
    url
  }));

  if (!imageUrlsJson) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(imageUrlsJson) as unknown;
    if (!Array.isArray(parsed)) {
      return fallback;
    }

    return parsed
      .map((item, index): StyleImageEntry | null => {
        if (typeof item === "string") {
          return {
            angle: ANGLES[index] ?? `画像${index + 1}`,
            url: item
          };
        }

        if (typeof item === "object" && item !== null && typeof (item as { url?: unknown }).url === "string") {
          return {
            angle:
              typeof (item as { angle?: unknown }).angle === "string"
                ? (item as { angle: string }).angle
                : ANGLES[index] ?? `画像${index + 1}`,
            url: (item as { url: string }).url
          };
        }

        return null;
      })
      .filter((entry): entry is StyleImageEntry => Boolean(entry));
  } catch {
    return fallback;
  }
}

function entryForAngle(entries: StyleImageEntry[], angle: string, index: number) {
  return entries.find((entry) => entry.angle === angle) ?? entries[index] ?? null;
}

function displaySuggestionLabel(label?: string | null) {
  return !label || label === "AI提案" ? "提案" : label;
}

function conciseText(value?: string | null, fallback = "来店時に確認します。") {
  return value?.trim() || fallback;
}

function numberSum(values: Array<number | null | undefined>) {
  return values.reduce<number>((total, value) => total + (value ?? 0), 0);
}

export default async function ProposalPage({ params }: ProposalPageProps) {
  const suggestion = await prisma.styleSuggestion.findUnique({
    where: { id: params.id },
    include: {
      proposalResponses: {
        orderBy: { createdAt: "desc" },
        take: 1
      },
      customer: {
        include: {
          preference: true,
          visits: {
            orderBy: { visitedAt: "desc" },
            take: 1
          },
          courseRecommendations: {
            orderBy: [{ accepted: "desc" }, { createdAt: "desc" }],
            take: 3
          }
        }
      }
    }
  });

  if (!suggestion || suggestion.customer.deletedAt) {
    notFound();
  }

  const latestVisit = suggestion.customer.visits[0] ?? null;
  const nextVisitDate = latestVisit ? addMonths(latestVisit.visitedAt, 2) : null;
  const latestResponse = suggestion.proposalResponses[0] ?? null;
  const responseAction = createProposalResponse.bind(null, suggestion.id);
  const imageEntries = parseImageEntries(suggestion.imageUrls, suggestion.imageUrlsJson);
  const displayImages = ANGLES.map((angle, index) => ({
    angle,
    entry: entryForAngle(imageEntries, angle, index)
  }));
  const mainImage = displayImages.find((image) => image.entry?.url)?.entry ?? null;
  const detailImages = displayImages.filter((image) => image.entry?.url !== mainImage?.url);
  const hairColorImages = displayImages.flatMap(({ angle, entry }) => (entry?.url ? [{ angle, url: entry.url }] : []));
  const optionalCoursePrice = numberSum(suggestion.customer.courseRecommendations.map((course) => course.estimatedPrice));

  return (
    <main className="min-h-screen bg-[#f7f3ec] text-stone-950">
      <section className="mx-auto grid w-full max-w-5xl gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between gap-3">
          <p className="font-serif text-xl font-semibold tracking-normal">Salon de Lien</p>
          <div className="flex items-center gap-2">
            <span className="rounded border border-teal-200 bg-white px-3 py-1 text-xs font-semibold text-teal-900">
              {displaySuggestionLabel(suggestion.label)}
            </span>
            <a href={`/app/${suggestion.customer.id}`} className="rounded border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-800 shadow-sm hover:bg-stone-50">
              アプリ
            </a>
            <a href="#reply" className="rounded bg-teal-900 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-teal-950">
              返信
            </a>
          </div>
        </header>

        <section className="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm">
          <div className="grid gap-0 lg:grid-cols-[minmax(0,1.1fr)_360px]">
            <div className="aspect-[4/5] bg-[#ede7dc] lg:aspect-[4/3]">
              {mainImage?.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={mainImage.url} alt={suggestion.suggestedStyleName} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center px-6 text-center text-sm font-semibold text-stone-500">
                  画像準備中
                </div>
              )}
            </div>
            <div className="grid content-between gap-5 p-5">
              <div>
                <p className="text-xs font-semibold text-teal-800">{suggestion.customer.name}様へのご提案</p>
                <h1 className="mt-2 text-3xl font-semibold leading-tight text-stone-950">{suggestion.suggestedStyleName}</h1>
                <p className="mt-3 line-clamp-5 whitespace-pre-wrap text-sm leading-7 text-stone-700">
                  {conciseText(suggestion.reason, "顔まわり、髪質、普段の扱いやすさを見ながら調整します。")}
                </p>
              </div>
              <div className="grid gap-2 text-sm">
                <div className="flex items-center gap-2 rounded-md bg-[#f7f3ec] px-3 py-2">
                  <Scissors className="h-4 w-4 text-teal-800" />
                  <span className="font-semibold">{conciseText(suggestion.menuSuggestion, "当日相談")}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-md bg-[#f7f3ec] px-3 py-2">
                    <p className="flex items-center gap-1 text-xs font-semibold text-stone-500">
                      <Clock3 className="h-3.5 w-3.5" />
                      時間
                    </p>
                    <p className="mt-1 font-semibold">{suggestion.estimatedMinutes ? `約${suggestion.estimatedMinutes}分` : "当日確認"}</p>
                  </div>
                  <div className="rounded-md bg-[#f7f3ec] px-3 py-2">
                    <p className="flex items-center gap-1 text-xs font-semibold text-stone-500">
                      <CalendarDays className="h-3.5 w-3.5" />
                      目安
                    </p>
                    <p className="mt-1 font-semibold">{formatDate(nextVisitDate)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-3 md:grid-cols-2">
          {detailImages.map(({ angle, entry }) => (
            <div key={angle} className="overflow-hidden rounded-md border border-stone-200 bg-white shadow-sm">
              <div className="aspect-[4/3] bg-[#ede7dc]">
                {entry?.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={entry.url} alt={`${suggestion.suggestedStyleName} ${angle}`} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm font-semibold text-stone-500">準備中</div>
                )}
              </div>
              <p className="px-3 py-2 text-sm font-semibold">{angle}</p>
            </div>
          ))}
        </section>

        <HairColorAdjustmentPanel images={hairColorImages} title="髪色を試す" />

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="grid gap-4">
            <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <Sparkles className="h-5 w-5 text-teal-800" />
                仕上がり
              </h2>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-md bg-[#f7f3ec] p-3">
                  <p className="text-xs font-semibold text-stone-500">扱い方</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-stone-800">
                    {conciseText(suggestion.stylingAdvice, "乾かし方と朝のセットは来店時に一緒に確認します。")}
                  </p>
                </div>
                <div className="rounded-md bg-[#f7f3ec] p-3">
                  <p className="text-xs font-semibold text-stone-500">確認すること</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-stone-800">
                    {conciseText(suggestion.caution ?? suggestion.customer.preference?.dislikes, "苦手な雰囲気や長さを当日確認します。")}
                  </p>
                </div>
              </div>
            </div>

            {suggestion.customer.courseRecommendations.length > 0 ? (
              <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold">一緒に相談できるケア</h2>
                <div className="mt-3 grid gap-2">
                  {suggestion.customer.courseRecommendations.map((course) => (
                    <label key={course.id} className="flex cursor-pointer items-start gap-3 rounded-md border border-stone-200 bg-[#f7f3ec] p-3 text-sm">
                      <input name="selectedCourse" type="checkbox" value={course.id} form="proposal-response-form" className="mt-1 h-4 w-4 rounded border-stone-300 text-teal-800" />
                      <span>
                        <span className="block font-semibold">{course.title}</span>
                        <span className="mt-1 block text-xs font-semibold text-stone-600">
                          {course.estimatedPrice ? `${course.estimatedPrice.toLocaleString("ja-JP")}円` : "料金は相談"}
                          {course.estimatedMinutes ? ` / 約${course.estimatedMinutes}分` : ""}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <section id="reply" className="rounded-lg border border-teal-200 bg-white p-5 shadow-sm lg:sticky lg:top-5 lg:self-start">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">返信</h2>
                <p className="mt-1 text-sm text-stone-600">希望だけ送れます。</p>
              </div>
              {latestResponse ? (
                <span className="rounded border border-teal-200 bg-teal-50 px-2 py-1 text-xs font-semibold text-teal-900">
                  送信済み
                </span>
              ) : null}
            </div>

            {latestResponse ? (
              <div className="mt-4 rounded-md border border-teal-200 bg-teal-50 p-3 text-sm text-teal-950">
                <p className="flex items-center gap-2 font-semibold">
                  <CheckCircle2 className="h-4 w-4" />
                  {latestResponse.intent}
                </p>
                <p className="mt-1 text-xs">送信日 {formatDateTime(latestResponse.createdAt)}</p>
                {latestResponse.preferredDate ? <p className="mt-1 text-xs">希望 {formatDateTime(latestResponse.preferredDate)}</p> : null}
              </div>
            ) : null}

            <form id="proposal-response-form" action={responseAction} className="mt-4 grid gap-4">
              <div className="grid gap-2">
                {["予約したい", "相談したい", "少し検討したい"].map((intent) => (
                  <label key={intent} className="flex cursor-pointer items-center gap-2 rounded-md border border-stone-200 bg-[#f7f3ec] px-3 py-3 text-sm font-semibold">
                    <input name="intent" type="radio" value={intent} required className="h-4 w-4 border-stone-300 text-teal-800" />
                    {intent}
                  </label>
                ))}
              </div>

              <div className="grid gap-2">
                <p className="text-sm font-semibold">気になること</p>
                {CONCERNS.map((concern) => (
                  <label key={concern} className="flex cursor-pointer items-center gap-2 rounded-md border border-stone-200 bg-white px-3 py-2 text-xs font-semibold">
                    <input name="concern" type="checkbox" value={concern} className="h-4 w-4 rounded border-stone-300 text-teal-800" />
                    {concern}
                  </label>
                ))}
              </div>

              <div className="grid gap-3">
                <label className="grid gap-1 text-sm font-medium">
                  希望日時
                  <input name="preferredDate" type="datetime-local" className="h-11 rounded-md border border-stone-200 bg-white px-3 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100" />
                </label>
                <label className="grid gap-1 text-sm font-medium">
                  来店時期
                  <select name="visitTiming" className="h-11 rounded-md border border-stone-200 bg-white px-3 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100">
                    <option value="">未選択</option>
                    {VISIT_TIMINGS.map((timing) => (
                      <option key={timing} value={timing}>{timing}</option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1 text-sm font-medium">
                  予算
                  <select name="budgetPreference" className="h-11 rounded-md border border-stone-200 bg-white px-3 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100">
                    <option value="">未選択</option>
                    {BUDGET_PREFERENCES.map((budget) => (
                      <option key={budget} value={budget}>{budget}</option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1 text-sm font-medium">
                  連絡方法
                  <select name="contactPreference" className="h-11 rounded-md border border-stone-200 bg-white px-3 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100">
                    <option value="">未選択</option>
                    {CONTACT_OPTIONS.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </label>
              </div>

              <input type="hidden" name="contactName" value={suggestion.customer.name} />
              {suggestion.customer.phone ? <input type="hidden" name="contactPhone" value={suggestion.customer.phone} /> : null}
              {optionalCoursePrice > 0 ? <input type="hidden" name="pricePlan" value={`追加候補 ${optionalCoursePrice.toLocaleString("ja-JP")}円分は必要なら相談`} /> : null}

              <label className="grid gap-1 text-sm font-medium">
                メモ
                <textarea
                  name="message"
                  placeholder="前髪、カラー、料金など"
                  className="min-h-24 rounded-md border border-stone-200 bg-white px-3 py-2 outline-none placeholder:text-stone-400 focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                />
              </label>

              <button type="submit" className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-teal-900 px-5 text-sm font-semibold text-white shadow-sm hover:bg-teal-950">
                <MessageCircle className="h-4 w-4" />
                {latestResponse ? "更新して送る" : "送る"}
              </button>
            </form>
          </section>
        </section>

        <p className="pb-4 text-center text-xs leading-5 text-stone-500">
          料金と施術内容は、当日の髪の状態を見て施術前に確認します。
        </p>
      </section>
    </main>
  );
}
