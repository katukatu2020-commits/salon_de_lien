import { Bell, CheckCheck, Clock3, Inbox, TicketPercent } from "lucide-react";
import Link from "next/link";
import { markCustomerBroadcastsReadAction } from "@/lib/actions/customer-broadcast-actions";
import { getCurrentCustomerSession } from "@/lib/auth/current-customer";
import { effectiveCouponIssueStatus } from "@/lib/coupons/coupon-validation";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "long", day: "numeric" }).format(value);
}

export default async function CustomerMessagesPage() {
  const session = await getCurrentCustomerSession();
  if (!session) return null;
  const recipients = await prisma.customerBroadcastRecipient.findMany({
    where: {
      customerId: session.customerId,
      broadcast: { organizationId: session.organizationId, status: "sent" }
    },
    orderBy: { deliveredAt: "desc" },
    take: 50,
    include: { broadcast: true }
  });
  const couponIds = recipients.map((recipient) => recipient.couponIssueId).filter((value): value is string => Boolean(value));
  const couponIssues = couponIds.length > 0
    ? await prisma.couponIssue.findMany({ where: { id: { in: couponIds }, customerId: session.customerId } })
    : [];
  const couponMap = new Map(couponIssues.map((coupon) => [coupon.id, coupon]));
  const reservedCouponIds = couponIds.length > 0
    ? new Set((await prisma.appointment.findMany({
        where: {
          couponIssueId: { in: couponIds },
          status: { notIn: ["キャンセル", "キャンセル済み", "無断キャンセル"] }
        },
        select: { couponIssueId: true }
      })).map((appointment) => appointment.couponIssueId).filter((value): value is string => Boolean(value)))
    : new Set<string>();
  const unreadCount = recipients.filter((recipient) => !recipient.readAt).length;

  return (
    <div className="grid gap-5">
      <section className="rounded-[24px] border border-[#e8ded2] bg-gradient-to-br from-[#fffdf9] to-[#f6efe6] p-5 shadow-lien-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#8f4f42] text-white"><Inbox className="h-5 w-5" /></span><div><p className="text-xs font-semibold text-[#8f4f42]">Salon inbox</p><h1 className="mt-1 text-2xl font-semibold">サロンからのお知らせ</h1><p className="mt-2 text-sm leading-6 text-[#7c7168]">メッセージとあなた専用クーポンを確認できます。</p></div></div>
          {unreadCount > 0 ? <form action={markCustomerBroadcastsReadAction}><button type="submit" className="lien-button-secondary min-h-11 w-full px-4 sm:w-auto"><CheckCheck className="h-4 w-4" />すべて既読にする</button></form> : null}
        </div>
      </section>

      {recipients.length > 0 ? (
        <section className="grid gap-4">
          {recipients.map((recipient) => {
            const broadcast = recipient.broadcast;
            const coupon = recipient.couponIssueId ? couponMap.get(recipient.couponIssueId) : null;
            const couponStatus = coupon ? effectiveCouponIssueStatus(coupon) : null;
            return (
              <article key={recipient.id} className={`rounded-[22px] border bg-white p-5 shadow-lien-sm ${recipient.readAt ? "border-[#e8ded2]" : "border-[#dcae9d] ring-4 ring-[#f3ddd5]/45"}`}>
                <div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2">{!recipient.readAt ? <span className="rounded-full bg-[#8f4f42] px-2.5 py-1 text-[10px] font-semibold text-white">新着</span> : null}<p className="text-xs text-[#8b8178]">{formatDate(recipient.deliveredAt)}</p></div><h2 className="mt-2 text-lg font-semibold">{broadcast.title}</h2></div><Bell className="h-5 w-5 shrink-0 text-[#8f4f42]" /></div>
                <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-[#5f554e]">{broadcast.body}</p>
                {coupon ? (
                  <div className="mt-5 rounded-[18px] border border-[#e5cf93] bg-[#fff9e8] p-4">
                    <div className="flex items-center gap-2 text-[#765813]"><TicketPercent className="h-5 w-5" /><p className="font-semibold">{broadcast.couponTitle ?? "あなた専用クーポン"}</p></div>
                    {broadcast.couponDescription ? <p className="mt-2 text-sm leading-6 text-[#6f5b2d]">{broadcast.couponDescription}</p> : null}
                    <div className="mt-4 grid gap-3 sm:grid-cols-3"><div><p className="text-xs text-[#8a7443]">優待内容</p><p className="mt-1 text-xl font-semibold text-[#8f4f42]">{coupon.discountRate}%OFF</p></div><div><p className="text-xs text-[#8a7443]">対象メニュー</p><p className="mt-1 text-sm font-semibold">{broadcast.couponTargetMenu ?? "対象メニュー"}</p></div><div><p className="text-xs text-[#8a7443]">有効期限</p><p className="mt-1 text-sm font-semibold">{formatDate(coupon.expiresAt)}まで</p></div></div>
                    <div className="mt-4 rounded-xl border border-[#ead9a9] bg-white px-3 py-3 text-center"><p className="text-[10px] font-semibold text-[#8a7443]">ご利用コード</p><p className="mt-1 break-all font-mono text-base font-semibold tracking-wider text-[#4f3b22]">{coupon.couponCode}</p></div>
                    <p className="mt-3 flex items-center gap-2 text-xs text-[#7c6a3c]"><Clock3 className="h-4 w-4" />{couponStatus === "used" ? "使用済み" : couponStatus === "expired" ? "期限切れ" : "会計時にこの画面をご提示ください"}</p>
                    {couponStatus === "issued" ? (
                      reservedCouponIds.has(coupon.id) ? (
                        <p className="mt-3 rounded-full bg-[#f1ead7] px-4 py-3 text-center text-sm font-semibold text-[#765813]">予約に設定済みです</p>
                      ) : (
                        <Link href={`/u/appointments?coupon=${encodeURIComponent(coupon.id)}`} className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[#8f4f42] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#7d453a]">
                          <TicketPercent className="h-4 w-4" />クーポンを使って予約する
                        </Link>
                      )
                    ) : null}
                  </div>
                ) : null}
              </article>
            );
          })}
        </section>
      ) : <section className="rounded-[22px] border border-dashed border-[#d8cbbf] bg-white px-5 py-14 text-center"><Inbox className="mx-auto h-9 w-9 text-[#b7aaa0]" /><h2 className="mt-4 font-semibold">お知らせはまだありません</h2><p className="mt-2 text-sm text-[#7c7168]">サロンから届いたご案内がここに表示されます。</p></section>}
    </div>
  );
}
