import { notFound } from "next/navigation";
import { CalendarDays, CheckCircle2, Clock3, MessageCircle, Scissors } from "lucide-react";
import { createAppointmentConfirmationResponse } from "@/lib/actions";
import { prisma } from "@/lib/prisma";

type AppointmentConfirmPageProps = {
  params: {
    id: string;
  };
  searchParams?: {
    submitted?: string;
  };
};

const attendanceOptions = ["予定通り来店します", "日時変更を相談したい", "事前に相談したいことがある"];
const contactPreferenceOptions = ["LINEで返信希望", "電話で確認希望", "SMSで確認希望"];
const concernOptions = ["髪型・仕上がりを相談したい", "料金や所要時間を確認したい", "カラー・薬剤の不安がある", "特に不安はない"];
const priceExpectationOptions = ["料金目安を先に知りたい", "必要なら追加ケアも相談したい", "予算内で調整したい", "当日相談で大丈夫"];
const visitPriorityOptions = ["仕上がり優先", "料金とのバランス優先", "時間内に終わること優先", "髪の負担を抑えたい"];

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

export default async function AppointmentConfirmPage({ params, searchParams }: AppointmentConfirmPageProps) {
  const appointment = await prisma.appointment.findFirst({
    where: {
      id: params.id,
      customer: {
        deletedAt: null
      }
    },
    include: {
      customer: {
        select: {
          id: true,
          name: true,
          phone: true,
          preference: true,
          styleSuggestions: {
            where: { archivedAt: null },
            orderBy: { createdAt: "desc" },
            take: 1
          },
          contactLogs: {
            where: {
              OR: [{ channel: "予約確認ページ" }, { outcome: "予約確認返信" }, { outcome: "予約変更希望" }]
            },
            orderBy: { createdAt: "desc" },
            take: 1
          }
        }
      }
    }
  });

  if (!appointment) {
    notFound();
  }

  const confirmationAction = createAppointmentConfirmationResponse.bind(null, appointment.id);
  const latestConfirmation = appointment.customer.contactLogs[0] ?? null;
  const latestSuggestion = appointment.customer.styleSuggestions[0] ?? null;
  const submitted = searchParams?.submitted === "1";

  return (
    <main className="min-h-screen bg-[#f8f5ef] text-stone-900">
      <section className="mx-auto grid w-full max-w-3xl gap-5 px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-teal-800">Salon de Lien</p>
          <h1 className="mt-2 text-3xl font-semibold text-stone-950">ご予約の確認</h1>
          <p className="mt-3 text-sm leading-7 text-stone-600">
            {appointment.customer.name}様、ご予約ありがとうございます。来店可否や変更希望、当日前に確認したいことを送ってください。
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-md border border-stone-200 bg-[#fbf8f3] p-3">
              <p className="flex items-center gap-2 text-xs font-semibold text-stone-500">
                <CalendarDays className="h-4 w-4" />
                予約日時
              </p>
              <p className="mt-2 text-sm font-semibold text-stone-950">{formatDateTime(appointment.scheduledAt)}</p>
            </div>
            <div className="rounded-md border border-stone-200 bg-[#fbf8f3] p-3">
              <p className="flex items-center gap-2 text-xs font-semibold text-stone-500">
                <Scissors className="h-4 w-4" />
                メニュー
              </p>
              <p className="mt-2 text-sm font-semibold text-stone-950">{appointment.menu ?? "当日相談"}</p>
            </div>
          </div>
        </div>

        {submitted || latestConfirmation ? (
          <div className="rounded-lg border border-teal-200 bg-teal-50 p-5 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-teal-800" />
              <h2 className="text-lg font-semibold text-teal-950">内容を受け付けました</h2>
            </div>
            <p className="mt-3 text-sm leading-6 text-teal-900">
              送信内容はスタッフに共有されています。変更希望や相談内容がある場合は、確認して連絡します。
            </p>
            {latestConfirmation ? (
              <p className="mt-3 whitespace-pre-wrap rounded-md bg-white px-3 py-2 text-xs leading-5 text-stone-700">
                {latestConfirmation.message}
              </p>
            ) : null}
          </div>
        ) : null}

        <form action={confirmationAction} className="grid gap-4 rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-stone-950">
              <MessageCircle className="h-5 w-5 text-teal-800" />
              来店前にお知らせください
            </h2>
            <div className="mt-4 grid gap-2 md:grid-cols-3">
              {attendanceOptions.map((item) => (
                <label key={item} className="flex cursor-pointer items-center gap-2 rounded-md border border-stone-200 bg-[#fbf8f3] px-3 py-3 text-sm font-semibold text-stone-800">
                  <input name="attendance" type="radio" value={item} required className="h-4 w-4 border-stone-300 text-teal-800" />
                  {item}
                </label>
              ))}
            </div>
          </div>

          <div className="rounded-md border border-amber-200 bg-amber-50 p-4">
            <h3 className="text-sm font-semibold text-amber-950">連絡方法</h3>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {contactPreferenceOptions.map((item) => (
                <label key={item} className="flex cursor-pointer items-center gap-2 rounded-md border border-amber-200 bg-white px-3 py-2 text-xs font-semibold text-stone-800">
                  <input name="contactPreference" type="radio" value={item} className="h-4 w-4 border-stone-300 text-amber-700" />
                  {item}
                </label>
              ))}
            </div>
          </div>

          <div className="rounded-md border border-indigo-200 bg-indigo-50 p-4">
            <h3 className="text-sm font-semibold text-indigo-950">事前相談</h3>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {concernOptions.map((item) => (
                <label key={item} className="flex cursor-pointer items-center gap-2 rounded-md border border-indigo-200 bg-white px-3 py-2 text-xs font-semibold text-stone-800">
                  <input name="concern" type="radio" value={item} className="h-4 w-4 border-stone-300 text-indigo-800" />
                  {item}
                </label>
              ))}
            </div>
          </div>

          <div className="rounded-md border border-sky-200 bg-sky-50 p-4">
            <h3 className="text-sm font-semibold text-sky-950">料金・時間の確認</h3>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {priceExpectationOptions.map((item) => (
                <label key={item} className="flex cursor-pointer items-center gap-2 rounded-md border border-sky-200 bg-white px-3 py-2 text-xs font-semibold text-stone-800">
                  <input name="priceExpectation" type="radio" value={item} className="h-4 w-4 border-stone-300 text-sky-800" />
                  {item}
                </label>
              ))}
            </div>
            <label className="mt-3 grid gap-1 text-sm font-medium text-sky-950">
              終わりたい時間
              <input
                name="finishBy"
                type="time"
                className="h-11 rounded-md border border-sky-200 bg-white px-3 text-stone-950 shadow-sm outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100"
              />
            </label>
          </div>

          <div className="rounded-md border border-violet-200 bg-violet-50 p-4">
            <h3 className="text-sm font-semibold text-violet-950">当日の優先順位</h3>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {visitPriorityOptions.map((item) => (
                <label key={item} className="flex cursor-pointer items-center gap-2 rounded-md border border-violet-200 bg-white px-3 py-2 text-xs font-semibold text-stone-800">
                  <input name="visitPriority" type="radio" value={item} className="h-4 w-4 border-stone-300 text-violet-800" />
                  {item}
                </label>
              ))}
            </div>
          </div>

          <label className="grid gap-1 text-sm font-medium text-stone-700">
            変更希望日時
            <input
              name="preferredDate"
              type="datetime-local"
              className="h-11 rounded-md border border-stone-200 bg-white px-3 text-stone-950 shadow-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
            />
          </label>

          <label className="grid gap-1 text-sm font-medium text-stone-700">
            メモ
            <textarea
              name="message"
              placeholder="遅れそうな時間、相談したい髪の悩み、当日の希望など"
              className="min-h-24 rounded-md border border-stone-200 bg-white px-3 py-2 text-stone-950 shadow-sm outline-none placeholder:text-stone-400 focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
            />
          </label>

          {latestSuggestion || appointment.customer.preference ? (
            <div className="rounded-md border border-stone-200 bg-[#fbf8f3] p-4">
              <p className="flex items-center gap-2 text-xs font-semibold text-stone-500">
                <Clock3 className="h-4 w-4" />
                当日の確認予定
              </p>
              <div className="mt-2 grid gap-1 text-xs leading-5 text-stone-700">
                {latestSuggestion ? <p>提案スタイル: {latestSuggestion.suggestedStyleName}</p> : null}
                {appointment.customer.preference?.preferredStyle ? <p>好み: {appointment.customer.preference.preferredStyle}</p> : null}
                {appointment.customer.preference?.dislikes ? <p>避けたいこと: {appointment.customer.preference.dislikes}</p> : null}
              </div>
            </div>
          ) : null}

          <button type="submit" className="inline-flex h-11 items-center justify-center rounded-md bg-teal-900 px-5 text-sm font-semibold text-white shadow-sm hover:bg-teal-950 md:w-fit">
            確認内容を送る
          </button>
        </form>
      </section>
    </main>
  );
}
