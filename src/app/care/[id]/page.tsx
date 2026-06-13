import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, HeartHandshake, Home, MessageCircle, Scissors, Sparkles } from "lucide-react";
import { prisma } from "@/lib/prisma";

type CarePlanPageProps = {
  params: {
    id: string;
  };
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

function addMonths(date: Date, months: number) {
  const nextDate = new Date(date);
  nextDate.setMonth(nextDate.getMonth() + months);
  return nextDate;
}

function pageUrl(path: string) {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");

  return baseUrl ? `${baseUrl.replace(/\/$/, "")}${path}` : path;
}

function feedbackShareUrl(customerId: string) {
  return pageUrl(`/feedback/${customerId}`);
}

function referralShareUrl(customerId: string, customerName: string) {
  return pageUrl(`/intake?referrer=${encodeURIComponent(customerId)}&referrerName=${encodeURIComponent(customerName)}`);
}

function careTips({
  latestSaleTitle,
  preferredStyle,
  maintenanceLevel,
  latestSuggestionName
}: {
  latestSaleTitle?: string | null;
  preferredStyle?: string | null;
  maintenanceLevel?: string | null;
  latestSuggestionName?: string | null;
}) {
  const title = `${latestSaleTitle ?? latestSuggestionName ?? preferredStyle ?? "今日の仕上がり"}を保つコツ`;
  const tips = [
    "根元からしっかり乾かして、毛先はこすらず手ぐしで整えてください。",
    preferredStyle?.includes("扱いやす") || maintenanceLevel?.includes("低")
      ? "朝は水分を少し足してから整えると、無理に熱を当てずにまとまりやすくなります。"
      : "仕上げ前に少量ずつスタイリング剤を足すと、重くなりすぎず形を調整できます。",
    latestSaleTitle?.includes("カラー")
      ? "カラー後はぬるめのお湯で洗い、退色が気になる日は洗浄力が強すぎるものを避けてください。"
      : "広がりが気になる日は、乾かす前に中間から毛先へ保湿を足すのがおすすめです。"
  ];

  return { title, tips };
}

export default async function CarePlanPage({ params }: CarePlanPageProps) {
  const customer = await prisma.customer.findFirst({
    where: {
      id: params.id,
      deletedAt: null
    },
    include: {
      preference: true,
      hairProfile: true,
      visits: {
        orderBy: { visitedAt: "desc" },
        take: 1
      },
      serviceSales: {
        orderBy: { paidAt: "desc" },
        take: 1
      },
      styleSuggestions: {
        where: { archivedAt: null },
        orderBy: { createdAt: "desc" },
        take: 1
      },
      appointments: {
        where: {
          scheduledAt: {
            gte: new Date()
          }
        },
        orderBy: { scheduledAt: "asc" },
        take: 1
      }
    }
  });

  if (!customer) {
    notFound();
  }

  const latestVisit = customer.visits[0] ?? null;
  const latestSale = customer.serviceSales[0] ?? null;
  const latestSuggestion = customer.styleSuggestions[0] ?? null;
  const upcomingAppointment = customer.appointments[0] ?? null;
  const nextVisitDate = upcomingAppointment?.scheduledAt ?? addMonths(latestSale?.paidAt ?? latestVisit?.visitedAt ?? new Date(), 2);
  const feedbackUrl = feedbackShareUrl(customer.id);
  const referralUrl = referralShareUrl(customer.id, customer.name);
  const tips = careTips({
    latestSaleTitle: latestSale?.title,
    preferredStyle: customer.preference?.preferredStyle,
    maintenanceLevel: customer.preference?.maintenanceLevel,
    latestSuggestionName: latestSuggestion?.suggestedStyleName
  });

  return (
    <main className="min-h-screen bg-[#f8f5ef] text-stone-900">
      <section className="mx-auto grid w-full max-w-4xl gap-5 px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-teal-800">Salon de Lien</p>
          <h1 className="mt-2 text-3xl font-semibold text-stone-950">{customer.name}様のホームケアメモ</h1>
          <p className="mt-3 text-sm leading-7 text-stone-600">
            今日の仕上がりを家でも保ちやすくするための、乾かし方・次回目安・相談リンクをまとめています。
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-md border border-stone-200 bg-[#fbf8f3] p-3">
              <p className="flex items-center gap-2 text-xs font-semibold text-stone-500">
                <Scissors className="h-4 w-4" />
                最近のメニュー
              </p>
              <p className="mt-2 text-sm font-semibold text-stone-950">{latestSale?.title ?? latestVisit?.performedStyle ?? "当日相談"}</p>
            </div>
            <div className="rounded-md border border-stone-200 bg-[#fbf8f3] p-3">
              <p className="flex items-center gap-2 text-xs font-semibold text-stone-500">
                <Sparkles className="h-4 w-4" />
                似合わせ方向
              </p>
              <p className="mt-2 text-sm font-semibold text-stone-950">{latestSuggestion?.suggestedStyleName ?? customer.preference?.preferredStyle ?? "状態を見て相談"}</p>
            </div>
            <div className="rounded-md border border-stone-200 bg-[#fbf8f3] p-3">
              <p className="flex items-center gap-2 text-xs font-semibold text-stone-500">
                <CalendarDays className="h-4 w-4" />
                次回の目安
              </p>
              <p className="mt-2 text-sm font-semibold text-stone-950">{formatDate(nextVisitDate)}</p>
            </div>
          </div>
        </div>

        <section className="rounded-lg border border-teal-200 bg-white p-5 shadow-sm">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-teal-950">
            <Home className="h-5 w-5" />
            {tips.title}
          </h2>
          <div className="mt-4 grid gap-3">
            {tips.tips.map((tip, index) => (
              <div key={tip} className="rounded-md border border-teal-100 bg-teal-50 px-4 py-3 text-sm leading-6 text-teal-950">
                <span className="mr-2 font-semibold">{index + 1}.</span>
                {tip}
              </div>
            ))}
          </div>
          {customer.hairProfile ? (
            <div className="mt-4 rounded-md border border-stone-200 bg-[#fbf8f3] p-4">
              <p className="text-xs font-semibold text-stone-500">髪質メモ</p>
              <p className="mt-2 text-sm leading-6 text-stone-700">
                {[
                  customer.hairProfile.hairThickness,
                  customer.hairProfile.hairVolume,
                  customer.hairProfile.hairTexture,
                  customer.hairProfile.scalpCondition
                ]
                  .filter(Boolean)
                  .join(" / ") || "髪質メモは次回来店時に更新します。"}
              </p>
            </div>
          ) : null}
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-emerald-950">
              <MessageCircle className="h-5 w-5" />
              仕上がりの相談
            </h2>
            <p className="mt-3 text-sm leading-6 text-emerald-900">
              家で扱ってみて気になる点があれば、感想フォームから送ってください。必要に応じて乾かし方や次回目安を調整します。
            </p>
            <Link
              href={feedbackUrl}
              className="mt-4 inline-flex h-10 items-center justify-center rounded-md bg-emerald-900 px-4 text-sm font-semibold text-white hover:bg-emerald-950"
            >
              感想を送る
            </Link>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-5 shadow-sm">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-amber-950">
              <HeartHandshake className="h-5 w-5" />
              ご紹介フォーム
            </h2>
            <p className="mt-3 text-sm leading-6 text-amber-900">
              髪型やカラーで悩んでいる方がいれば、このフォームから相談内容を送れます。紹介元も分かる形でスタッフに届きます。
            </p>
            <Link
              href={referralUrl}
              className="mt-4 inline-flex h-10 items-center justify-center rounded-md bg-amber-900 px-4 text-sm font-semibold text-white hover:bg-amber-950"
            >
              紹介フォームを開く
            </Link>
          </div>
        </section>
      </section>
    </main>
  );
}
