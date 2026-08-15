import { ArrowDownLeft, ArrowUpRight, CalendarClock, WalletCards } from "lucide-react";
import { CouponCodeEntryCard } from "@/components/customer-app/coupon-code-entry-card";
import { FriendReferralCard } from "@/components/customer-app/friend-referral-card";
import { CustomerVisualHeader } from "@/components/lien/brand-visual";
import { getCurrentCustomerSession } from "@/lib/auth/current-customer";
import { expirePointsForCustomer, getReferralDiscountRatesForCustomer } from "@/lib/points/point-service";
import { prisma } from "@/lib/prisma";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

function expiryDateKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

const typeLabels: Record<string, string> = { earn: "付与", redeem: "利用", expire: "失効", cancel: "取消", adjust: "調整" };

export default async function CustomerPointsPage() {
  const session = await getCurrentCustomerSession();
  if (!session) return null;
  await expirePointsForCustomer(session.customerId);
  const [account, transactions, lots, activeReferral, referralDiscountRates] = await Promise.all([
    prisma.customerPointAccount.findUnique({ where: { customerId: session.customerId } }),
    prisma.pointTransaction.findMany({ where: { customerId: session.customerId }, orderBy: { createdAt: "desc" }, take: 30 }),
    prisma.pointLot.findMany({ where: { customerId: session.customerId, remainingAmount: { gt: 0 } }, orderBy: { expiresAt: "asc" } }),
    prisma.referral.findFirst({
      where: {
        referrerCustomerId: session.customerId,
        status: "issued"
      },
      orderBy: { issuedAt: "desc" },
      select: { code: true }
    }),
    getReferralDiscountRatesForCustomer(session.customerId)
  ]);
  const expiringGroups = Array.from(
    lots.reduce((groups, lot) => {
      const key = expiryDateKey(lot.expiresAt);
      const current = groups.get(key);
      groups.set(key, {
        expiresAt: current?.expiresAt ?? lot.expiresAt,
        points: (current?.points ?? 0) + lot.remainingAmount
      });
      return groups;
    }, new Map<string, { expiresAt: Date; points: number }>())
  ).map(([, value]) => value);

  return (
    <div className="grid gap-5">
      <CustomerVisualHeader
        variant="points"
        eyebrow="Point wallet"
        title="ポイント"
        description="Salon de Lienで使えるポイントと履歴です。"
        imageClassName="object-[50%_48%]"
      />
      <section className="rounded-[24px] bg-[#5b332c] p-6 text-white shadow-[0_18px_50px_rgba(91,51,44,0.18)]">
        <div className="flex items-center justify-between"><p className="text-sm font-semibold text-white/75">現在使えるポイント</p><WalletCards className="h-6 w-6 text-[#ead19a]" /></div>
        <p className="mt-4 text-4xl font-semibold tabular-nums">{(account?.availablePoints ?? 0).toLocaleString("ja-JP")}<span className="ml-2 text-lg">pt</span></p>
      </section>

      <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
        <CouponCodeEntryCard />
        <FriendReferralCard
          discountRates={referralDiscountRates}
          initialReferral={activeReferral
            ? {
                code: activeReferral.code,
                referralUrl: `/referral/${encodeURIComponent(activeReferral.code)}`
              }
            : null}
        />
      </div>

      {expiringGroups.length > 0 ? <section><h2 className="flex items-center gap-2 text-base font-semibold"><CalendarClock className="h-5 w-5 text-[#8f4f42]" />有効期限が近いポイント</h2><div className="mt-3 divide-y divide-[#eee4da] overflow-hidden rounded-[20px] border border-[#e8ded2] bg-white">{expiringGroups.map((group) => <div key={expiryDateKey(group.expiresAt)} className="flex items-center justify-between gap-4 px-4 py-3"><span className="text-sm text-[#6f6259]">{formatDate(group.expiresAt)}まで</span><span className="font-semibold tabular-nums">{group.points.toLocaleString("ja-JP")}pt</span></div>)}</div></section> : null}

      <section><h2 className="text-base font-semibold">ポイント履歴</h2>{transactions.length > 0 ? <div className="mt-3 divide-y divide-[#eee4da] overflow-hidden rounded-[20px] border border-[#e8ded2] bg-white">{transactions.map((transaction) => { const positive = transaction.amount > 0; return <div key={transaction.id} className="flex items-start gap-3 px-4 py-4"><span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${positive ? "bg-[#edf7ef] text-[#54745a]" : "bg-[#f6efe6] text-[#8f4f42]"}`}>{positive ? <ArrowDownLeft className="h-5 w-5" /> : <ArrowUpRight className="h-5 w-5" />}</span><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold">{transaction.reason}</p><p className="mt-1 text-xs text-[#8b8178]">{typeLabels[transaction.type] ?? transaction.type}・{formatDate(transaction.createdAt)}</p></div><p className={`shrink-0 font-semibold tabular-nums ${positive ? "text-[#54745a]" : "text-[#8f4f42]"}`}>{positive ? "+" : ""}{transaction.amount.toLocaleString("ja-JP")}pt</p></div></div></div>; })}</div> : <div className="mt-3 rounded-[20px] border border-dashed border-[#d8cbbf] bg-white px-5 py-10 text-center text-sm text-[#7c7168]">ポイント履歴はまだありません。</div>}</section>
      <p className="text-xs leading-5 text-[#7c7168]">ポイントは現金との交換や、ほかの方への譲渡はできません。</p>
    </div>
  );
}
