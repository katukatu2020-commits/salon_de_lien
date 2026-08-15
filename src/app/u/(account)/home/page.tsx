import Link from "next/link";
import { Bell, CalendarDays, ChevronRight, Clock3, MessageCircleQuestion, Scissors, Sparkles, WalletCards } from "lucide-react";
import { BrandVisual, customerCareVisualVariant } from "@/components/lien/brand-visual";
import { getCurrentCustomerSession } from "@/lib/auth/current-customer";
import { expirePointsForCustomer } from "@/lib/points/point-service";
import { prisma } from "@/lib/prisma";

function formatDate(date?: Date | null) {
  return date ? new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "long", day: "numeric", weekday: "short" }).format(date) : "未登録";
}

export default async function CustomerHomePage() {
  const session = await getCurrentCustomerSession();
  if (!session) return null;
  await expirePointsForCustomer(session.customerId);
  const now = new Date();
  const customer = await prisma.customer.findFirst({
    where: { id: session.customerId, organizationId: session.organizationId, deletedAt: null },
    include: {
      pointAccount: true,
      pointLots: { where: { remainingAmount: { gt: 0 } }, orderBy: { expiresAt: "asc" }, take: 1 },
      visits: { orderBy: { visitedAt: "desc" }, take: 1 },
      appointments: {
        where: { scheduledAt: { gte: now }, status: { notIn: ["キャンセル", "無断キャンセル", "来店済み"] } },
        orderBy: { scheduledAt: "asc" },
        take: 1
      },
      productProposals: {
        orderBy: { createdAt: "desc" },
        take: 4,
        include: {
          product: { select: { name: true, category: true } },
          reviewRequests: { orderBy: { requestedAt: "desc" }, take: 1, select: { id: true, status: true, expiresAt: true } }
        }
      },
      broadcastRecipients: {
        where: { broadcast: { status: "sent" } },
        orderBy: { deliveredAt: "desc" },
        take: 3,
        include: { broadcast: { select: { title: true, body: true, couponEnabled: true } } }
      }
    }
  });
  if (!customer) return null;
  const latestVisit = customer.visits[0];
  const nextAppointment = customer.appointments[0];
  const pendingReviews = customer.productProposals.filter((proposal) => proposal.reviewRequests[0]?.status === "active" && proposal.reviewRequests[0].expiresAt >= now);
  const unreadMessages = customer.broadcastRecipients.filter((recipient) => !recipient.readAt).length;

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <BrandVisual variant={customerCareVisualVariant(customer.gender)} className="h-52 rounded-[24px] border border-[#e8ded2] shadow-lien-sm lg:col-span-2 lg:h-64" imageClassName="object-[64%_50%]" sizes="(max-width: 1023px) 100vw, 1180px" priority overlay="none">
        <div className="flex h-full flex-col justify-end bg-gradient-to-r from-[#fffdf9]/96 via-[#fffdf9]/74 to-transparent p-5">
          <p className="text-sm font-semibold text-[#8f4f42]">Welcome back</p>
          <h1 className="mt-1 text-2xl font-semibold">{customer.name}様</h1>
          <p className="mt-2 max-w-60 text-sm leading-6 text-[#6f6259]">サロンでの記録を、次のきれいにつなげましょう。</p>
        </div>
      </BrandVisual>

      <section className="grid grid-cols-2 gap-3">
        <Link href="/u/points" className="lien-action-card rounded-[20px] border bg-white p-4 pr-11 transition">
          <WalletCards className="h-5 w-5 text-[#8f4f42]" />
          <p className="mt-3 text-xs font-semibold text-[#7c7168]">利用可能ポイント</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{(customer.pointAccount?.availablePoints ?? 0).toLocaleString("ja-JP")}<span className="ml-1 text-sm">pt</span></p>
        </Link>
        <Link href="/u/history" className="lien-action-card rounded-[20px] border bg-white p-4 pr-11 transition">
          <Clock3 className="h-5 w-5 text-[#8aa58a]" />
          <p className="mt-3 text-xs font-semibold text-[#7c7168]">前回来店</p>
          <p className="mt-1 text-sm font-semibold leading-6">{formatDate(latestVisit?.visitedAt)}</p>
        </Link>
      </section>

      {nextAppointment ? (
        <section className="rounded-[20px] border border-[#b8d5bf] bg-[#edf7ef] p-5">
          <div className="flex items-start gap-3"><CalendarDays className="mt-0.5 h-5 w-5 shrink-0 text-[#54745a]" /><div><p className="text-sm font-semibold text-[#315c3c]">次回のご予約</p><p className="mt-2 text-lg font-semibold">{formatDate(nextAppointment.scheduledAt)}</p><p className="mt-1 text-sm text-[#54745a]">{nextAppointment.menu ?? "メニュー相談"}</p></div></div>
        </section>
      ) : null}

      <section className="rounded-[20px] border border-[#e8ded2] bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#edf7ef] text-[#54745a]"><CalendarDays className="h-5 w-5" /></span>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold">来店予約</h2>
            <p className="mt-2 text-sm leading-6 text-[#7c7168]">担当者を選ぶと、現在の予約状況に合わせた空き日時をカレンダーで確認できます。</p>
            <Link href="/u/appointments" className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[#8f4f42] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#7d453a]">
              空き状況を見て予約する<ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {pendingReviews.length > 0 ? (
        <Link href="/u/reviews" className="lien-action-card block rounded-[20px] border border-[#e5cf93] bg-[#fff9e8] p-5 pr-12 transition">
          <div className="flex items-start gap-3"><MessageCircleQuestion className="mt-0.5 h-5 w-5 shrink-0 text-[#8a6a20]" /><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-[#6f5215]">アンケート受信ボックス</p><p className="mt-2 text-sm leading-6 text-[#755f2f]">未回答 {pendingReviews.length}件</p><p className="mt-2 text-xs font-semibold leading-5 text-[#8a7443]">回答後に3つの宝箱から選択・80pt〜1,000pt</p></div><ChevronRight className="h-5 w-5 shrink-0 text-[#9a7a32]" /></div>
        </Link>
      ) : null}

      {customer.broadcastRecipients.length > 0 ? (
        <Link href="/u/messages" className="lien-action-card block rounded-[20px] border border-[#dfc9bf] bg-[#fff8f5] p-5 pr-12 transition">
          <div className="flex items-start gap-3"><Bell className="mt-0.5 h-5 w-5 shrink-0 text-[#8f4f42]" /><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="text-sm font-semibold text-[#5b332c]">サロンからのお知らせ</p>{unreadMessages > 0 ? <span className="rounded-full bg-[#8f4f42] px-2 py-0.5 text-[10px] font-semibold text-white">新着 {unreadMessages}</span> : null}</div><p className="mt-2 truncate text-sm text-[#755f56]">{customer.broadcastRecipients[0].broadcast.title}</p><p className="mt-1 text-xs text-[#8b8178]">{customer.broadcastRecipients[0].broadcast.couponEnabled ? "クーポン付きのご案内です" : "内容を確認する"}</p></div><ChevronRight className="h-5 w-5 shrink-0 text-[#a47d70]" /></div>
        </Link>
      ) : null}

      <section className="lg:col-span-2">
        <div className="mb-3 flex items-center justify-between"><div><p className="text-sm font-semibold text-[#8f4f42]">My salon</p><h2 className="mt-1 text-lg font-semibold">最近の記録</h2></div><Sparkles className="h-5 w-5 text-[#d8b56d]" /></div>
        <div className="divide-y divide-[#eee4da] overflow-hidden rounded-[20px] border border-[#e8ded2] bg-white">
          <Link href="/u/history" className="lien-list-action flex min-h-16 items-center gap-3 px-4 py-3"><span className="grid h-10 w-10 place-items-center rounded-full bg-[#f6efe6] text-[#8f4f42]"><Scissors className="h-5 w-5" /></span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold">前回の施術</span><span className="mt-1 block truncate text-xs text-[#7c7168]">{latestVisit?.performedStyle ?? "まだ来店履歴はありません"}</span></span><ChevronRight className="h-5 w-5 text-[#a69a90]" /></Link>
          <Link href="/u/profile" className="lien-list-action flex min-h-16 items-center gap-3 px-4 py-3"><span className="grid h-10 w-10 place-items-center rounded-full bg-[#edf7ef] text-[#54745a]"><Sparkles className="h-5 w-5" /></span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold">髪のプロフィール</span><span className="mt-1 block truncate text-xs text-[#7c7168]">髪質・接客の希望を確認</span></span><ChevronRight className="h-5 w-5 text-[#a69a90]" /></Link>
        </div>
      </section>
    </div>
  );
}
