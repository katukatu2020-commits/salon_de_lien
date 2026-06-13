import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, CheckCircle2, ChevronRight, Heart, MessageCircle, Scissors, Sparkles } from "lucide-react";
import { prisma } from "@/lib/prisma";

type CustomerAppPageProps = {
  params: {
    id: string;
  };
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

export default async function CustomerAppPage({ params }: CustomerAppPageProps) {
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
  const proposalPath = latestSuggestion ? `/proposals/${latestSuggestion.id}` : `/intake?referrer=${encodeURIComponent(customer.id)}&referrerName=${encodeURIComponent(customer.name)}`;
  const appointmentPath = upcomingAppointment ? `/appointments/${upcomingAppointment.id}/confirm` : `${proposalPath}#reply`;
  const carePath = `/care/${customer.id}`;
  const feedbackPath = `/feedback/${customer.id}`;
  const intakePath = `/intake?referrer=${encodeURIComponent(customer.id)}&referrerName=${encodeURIComponent(customer.name)}`;

  return (
    <main className="min-h-screen bg-[#f7f3ec] pb-24 text-stone-950">
      <section className="mx-auto grid w-full max-w-md gap-4 px-4 py-4">
        <header className="flex items-center justify-between">
          <div>
            <p className="font-serif text-2xl font-semibold tracking-normal">Salon de Lien</p>
            <p className="mt-1 text-xs font-semibold text-stone-500">{customer.name}様のアプリ</p>
          </div>
          <span className="rounded border border-teal-200 bg-white px-3 py-1 text-xs font-semibold text-teal-900">
            My hair
          </span>
        </header>

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
            href={intakePath}
            icon={<Heart className="h-5 w-5" />}
            title="紹介・相談"
            description="新しい相談フォームを開く"
          />
        </section>

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
          {pageUrl(`/app/${customer.id}`)}
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
