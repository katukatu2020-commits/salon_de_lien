import { Clock3, Coins, History, MinusCircle, PlusCircle, WalletCards } from "lucide-react";
import { EmptyState, LienCard, MetricCard, PageHeader } from "@/components/lien/lien-ui";
import { CustomerWorkspaceTabs } from "@/components/customers/customer-workspace-tabs";
import { BrandVisual } from "@/components/lien/brand-visual";
import { prisma } from "@/lib/prisma";
import { requireBackofficeSession } from "@/lib/auth/authorization";

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(value);
}

function transactionLabel(type: string) {
  if (type === "earn") return "付与";
  if (type === "redeem") return "利用";
  if (type === "expire") return "失効";
  if (type === "cancel") return "取消";
  return "調整";
}

export async function CustomerPointsOverview() {
  const session = await requireBackofficeSession(["ADMIN", "STAFF"]);
  const customerScope = { customer: { organizationId: session.organizationId ?? undefined, deletedAt: null, storeHiddenAt: null } };
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const expiringBoundary = new Date(now);
  expiringBoundary.setDate(expiringBoundary.getDate() + 30);

  const [accountTotals, monthlyTransactions, expiringLots, recentTransactions] = await Promise.all([
    prisma.customerPointAccount.aggregate({
      where: customerScope,
      _sum: { availablePoints: true }
    }),
    prisma.pointTransaction.findMany({
      where: { createdAt: { gte: monthStart }, ...customerScope },
      select: { type: true, amount: true }
    }),
    prisma.pointLot.aggregate({
      where: {
        ...customerScope,
        remainingAmount: { gt: 0 },
        expiresAt: { gte: now, lte: expiringBoundary }
      },
      _sum: { remainingAmount: true }
    }),
    prisma.pointTransaction.findMany({
      where: customerScope,
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        type: true,
        amount: true,
        reason: true,
        createdAt: true,
        customer: {
          select: { name: true }
        }
      }
    })
  ]);

  const availablePoints = accountTotals._sum.availablePoints ?? 0;
  const earnedThisMonth = monthlyTransactions
    .filter((transaction) => transaction.amount > 0)
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const redeemedThisMonth = monthlyTransactions
    .filter((transaction) => transaction.type === "redeem" && transaction.amount < 0)
    .reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0);
  const expiringSoonPoints = expiringLots._sum.remainingAmount ?? 0;

  return (
    <div className="mx-auto grid max-w-6xl gap-6">
      <CustomerWorkspaceTabs active="customers" />

      <PageHeader
        eyebrow="Point Management"
        title="ポイント管理"
        description="店舗ポイントの残高、付与、利用、失効予定だけを確認します。"
        visual={
          <BrandVisual
            variant="points"
            className="h-full min-h-40"
            imageClassName="object-[61%_54%]"
            sizes="(max-width: 1023px) 100vw, 352px"
          />
        }
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="ポイント集計">
        <MetricCard label="利用可能ポイント総数" value={availablePoints.toLocaleString("ja-JP")} unit="pt" icon={WalletCards} />
        <MetricCard label="今月の付与" value={earnedThisMonth.toLocaleString("ja-JP")} unit="pt" icon={PlusCircle} tone="success" />
        <MetricCard label="今月の利用" value={redeemedThisMonth.toLocaleString("ja-JP")} unit="pt" icon={MinusCircle} tone="soft" />
        <MetricCard
          label="30日以内に失効"
          value={expiringSoonPoints.toLocaleString("ja-JP")}
          unit="pt"
          icon={Clock3}
          tone={expiringSoonPoints > 0 ? "warning" : "default"}
        />
      </section>

      <LienCard className="p-0 sm:p-0">
        <div className="flex items-center gap-3 border-b border-[color:var(--lien-border)] px-5 py-4 sm:px-6">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[color:var(--lien-surface-soft)] text-[color:var(--lien-primary)]">
            <History className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-[color:var(--lien-ink)]">最近のポイント履歴</h2>
            <p className="mt-0.5 text-xs text-[color:var(--lien-muted)]">直近20件</p>
          </div>
        </div>

        {recentTransactions.length > 0 ? (
          <div className="divide-y divide-[color:var(--lien-border)] px-5 sm:px-6">
            {recentTransactions.map((transaction) => (
              <article key={transaction.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 py-4">
                <div className="min-w-0">
                  <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-xs font-semibold text-[color:var(--lien-primary-dark)]">{transactionLabel(transaction.type)}</span>
                    <span className="truncate text-sm font-semibold text-[color:var(--lien-ink)]">{transaction.customer.name}</span>
                  </div>
                  <p className="mt-1 truncate text-sm text-[color:var(--lien-muted)]">{transaction.reason}</p>
                  <p className="mt-1 text-xs tabular-nums text-[color:var(--lien-muted)]">{formatDateTime(transaction.createdAt)}</p>
                </div>
                <p
                  className={`self-center whitespace-nowrap text-sm font-semibold tabular-nums ${
                    transaction.amount >= 0 ? "text-[#47674a]" : "text-[#9a4038]"
                  }`}
                >
                  {transaction.amount > 0 ? "+" : ""}
                  {transaction.amount.toLocaleString("ja-JP")}pt
                </p>
              </article>
            ))}
          </div>
        ) : (
          <div className="p-5 sm:p-6">
            <EmptyState icon={Coins} title="ポイント履歴はまだありません" description="ポイントを付与または利用すると、ここに履歴が表示されます。" />
          </div>
        )}
      </LienCard>
    </div>
  );
}
