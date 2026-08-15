import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BarChart3,
  CalendarRange,
  Crown,
  JapaneseYen,
  ReceiptText,
  Repeat2,
  TrendingUp,
  UserRound,
  UsersRound
} from "lucide-react";
import { LienCard, MetricCard, PageHeader, StatusBadge } from "@/components/lien/lien-ui";
import { getBackofficeSession } from "@/lib/auth/authorization";
import { getOwnerDashboardData, normalizeOwnerDashboardPeriod } from "@/lib/reports/owner-dashboard";

export const dynamic = "force-dynamic";

type OwnerAnalyticsPageProps = {
  searchParams?: { period?: string };
};

function yen(value: number) {
  return `${value.toLocaleString("ja-JP")}円`;
}

function percentChange(current: number, previous: number) {
  if (previous <= 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

function RankingBar({ value, max }: { value: number; max: number }) {
  const width = max > 0 ? Math.max(3, Math.round((value / max) * 100)) : 0;
  return (
    <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#f1e9e1]">
      <div className="h-full rounded-full bg-[#8f4f42]" style={{ width: `${width}%` }} />
    </div>
  );
}

function DistributionPanel({
  title,
  items
}: {
  title: string;
  items: Array<{ label: string; count: number }>;
}) {
  const total = items.reduce((sum, item) => sum + item.count, 0);
  const max = Math.max(0, ...items.map((item) => item.count));
  return (
    <LienCard>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-lien-ink">{title}</h2>
        <span className="text-xs font-semibold tabular-nums text-lien-muted">{total.toLocaleString("ja-JP")}人</span>
      </div>
      <div className="mt-5 grid gap-4">
        {items.map((item) => {
          const rate = total > 0 ? Math.round((item.count / total) * 100) : 0;
          return (
            <div key={item.label}>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="font-medium text-lien-ink">{item.label}</span>
                <span className="tabular-nums text-lien-muted">{item.count}人 / {rate}%</span>
              </div>
              <RankingBar value={item.count} max={max} />
            </div>
          );
        })}
      </div>
    </LienCard>
  );
}

export default async function OwnerAnalyticsPage({ searchParams }: OwnerAnalyticsPageProps) {
  const session = await getBackofficeSession();
  if (!session) redirect("/admin/login?next=/admin/owner-analytics");
  if (session.role !== "ADMIN" || !session.organizationId) redirect("/admin/customers");

  const period = normalizeOwnerDashboardPeriod(searchParams?.period);
  const data = await getOwnerDashboardData(period, "actual", session.organizationId);
  const revenueChange = percentChange(data.summary.currentRevenue, data.summary.previousRevenue);
  const maxMonthlyRevenue = Math.max(0, ...data.months.map((month) => month.revenue));
  const maxStaffRevenue = Math.max(0, ...data.staffPerformance.map((staff) => staff.revenue));
  const maxMenuRevenue = Math.max(0, ...data.menuBreakdown.map((menu) => menu.revenue));

  return (
    <div className="mx-auto grid max-w-7xl gap-6">
      <PageHeader
        eyebrow={<span className="inline-flex items-center gap-2"><BarChart3 className="h-3.5 w-3.5" />Business analytics</span>}
        title="経営分析"
        description="店舗全体の売上、客数、スタッフ実績、顧客構成を実データからまとめています。"
        secondaryAction={
          <form action="/admin/owner-analytics" className="flex items-center gap-2">
            <label className="text-xs font-semibold text-lien-muted" htmlFor="analytics-period">集計期間</label>
            <select id="analytics-period" name="period" defaultValue={String(period)} className="h-10 rounded-full border border-lien bg-white px-4 text-sm font-semibold">
              <option value="6">6か月</option>
              <option value="12">12か月</option>
              <option value="24">24か月</option>
            </select>
            <button className="lien-button-secondary h-10 min-h-10 px-3 text-xs" type="submit">表示</button>
          </form>
        }
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="今月の売上" value={data.summary.currentRevenue.toLocaleString("ja-JP")} unit="円" icon={JapaneseYen} tone="premium" helper={`前月比 ${revenueChange >= 0 ? "+" : ""}${revenueChange}%`} />
        <MetricCard label="今月の会計客数" value={data.summary.currentPaidCustomerCount} unit="人" icon={UsersRound} helper={`前月 ${data.summary.previousPaidCustomerCount}人`} />
        <MetricCard label="平均客単価" value={data.summary.currentAverageSpend.toLocaleString("ja-JP")} unit="円" icon={ReceiptText} tone="highlight" helper="今月の会計から算出" />
        <MetricCard label="再来客率" value={data.summary.currentRepeatRate} unit="%" icon={Repeat2} tone="success" helper={`新規 ${data.summary.currentNewPaidCustomerCount}人 / 再来 ${data.summary.currentRepeatPaidCustomerCount}人`} />
        <MetricCard
          label="平均来店サイクル"
          value={data.summary.averageVisitCycleDays || "-"}
          unit={data.summary.averageVisitCycleDays ? "日" : undefined}
          icon={CalendarRange}
          tone="soft"
          helper={data.summary.visitCycleIntervalCount > 0 ? `${data.summary.visitCycleIntervalCount}件の来店間隔から算出` : "2回以上の来店履歴が必要です"}
        />
      </section>

      <LienCard>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold text-lien-primary">Revenue trend</p>
            <h2 className="mt-1 text-xl font-semibold text-lien-ink">店舗売上の推移</h2>
          </div>
          <p className="text-xs text-lien-muted">会計済み売上のみ集計</p>
        </div>
        <div className="mt-6 overflow-x-auto pb-2">
          <div className="flex min-w-[680px] items-end gap-3" style={{ height: "240px" }}>
            {data.months.map((month) => {
              const height = maxMonthlyRevenue > 0 ? Math.max(4, Math.round((month.revenue / maxMonthlyRevenue) * 180)) : 4;
              return (
                <div key={month.key} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-2">
                  <span className="text-[10px] font-semibold tabular-nums text-lien-muted">{month.revenue > 0 ? `${Math.round(month.revenue / 10000)}万` : "0"}</span>
                  <div className="w-full max-w-12 rounded-t-xl bg-gradient-to-t from-[#8f4f42] to-[#d3a08f]" style={{ height }} />
                  <span className="text-[11px] font-semibold text-lien-muted">{month.shortLabel}</span>
                </div>
              );
            })}
          </div>
        </div>
      </LienCard>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <LienCard>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-lien-primary">Staff performance</p>
              <h2 className="mt-1 text-xl font-semibold text-lien-ink">スタッフ別売上</h2>
            </div>
            <Crown className="h-5 w-5 text-[#d8b56d]" />
          </div>
          <div className="mt-5 grid gap-4">
            {data.staffPerformance.map((staff, index) => (
              <div key={staff.label} className="rounded-2xl border border-lien bg-[#fffdf9] p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-semibold ${index === 0 ? "bg-[#d8b56d] text-white" : "bg-[#f1e7df] text-[#8f4f42]"}`}>{index + 1}</span>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-lien-ink">{staff.label}</p>
                      <p className="mt-1 text-xs text-lien-muted">会計 {staff.saleCount}件 / 担当来店 {staff.visitCount}件 / 顧客 {staff.customerCount}人</p>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-semibold tabular-nums text-lien-ink">{yen(staff.revenue)}</p>
                    <p className="mt-1 text-xs tabular-nums text-lien-muted">平均 {yen(staff.averageSpend)}</p>
                  </div>
                </div>
                <RankingBar value={staff.revenue} max={maxStaffRevenue} />
              </div>
            ))}
            {data.staffPerformance.length === 0 ? <p className="py-8 text-center text-sm text-lien-muted">集計できる担当付き売上がありません。</p> : null}
          </div>
        </LienCard>

        <LienCard>
          <p className="text-xs font-semibold text-lien-primary">Customer value</p>
          <h2 className="mt-1 text-xl font-semibold text-lien-ink">トップ顧客</h2>
          <div className="mt-5 grid gap-2">
            {data.topCustomers.map((customer, index) => (
              <Link key={customer.customerId} href={`/admin/customers/${customer.customerId}`} className="flex items-center gap-3 rounded-2xl border border-transparent p-3 transition hover:border-lien hover:bg-[#fffaf5]">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#f1e7df] text-sm font-semibold text-[#8f4f42]">{index + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-lien-ink">{customer.customerName}</p>
                  <p className="mt-1 text-xs text-lien-muted">会計 {customer.saleCount}件 / 来店 {customer.visitCount}件</p>
                </div>
                <p className="shrink-0 text-sm font-semibold tabular-nums text-lien-ink">{yen(customer.revenue)}</p>
              </Link>
            ))}
            {data.topCustomers.length === 0 ? <p className="py-8 text-center text-sm text-lien-muted">集計できる売上がありません。</p> : null}
          </div>
        </LienCard>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <DistributionPanel title="年齢層" items={data.ageBreakdown} />
        <DistributionPanel title="男女比率" items={data.genderBreakdown} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <LienCard>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-lien-ink">売上メニュー構成</h2>
            <TrendingUp className="h-5 w-5 text-lien-primary" />
          </div>
          <div className="mt-5 grid gap-4">
            {data.menuBreakdown.map((menu) => (
              <div key={menu.label}>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate font-medium text-lien-ink">{menu.label}</span>
                  <span className="shrink-0 tabular-nums text-lien-muted">{yen(menu.revenue)} / {menu.count}件</span>
                </div>
                <RankingBar value={menu.revenue} max={maxMenuRevenue} />
              </div>
            ))}
          </div>
        </LienCard>

        <LienCard>
          <h2 className="text-lg font-semibold text-lien-ink">店舗の現在地</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-[#f8f2eb] p-4"><CalendarRange className="h-5 w-5 text-lien-primary" /><p className="mt-3 text-2xl font-semibold tabular-nums">{data.summary.upcomingAppointmentCount}<span className="ml-1 text-sm">件</span></p><p className="mt-1 text-xs text-lien-muted">今後30日の予約</p></div>
            <div className="rounded-2xl bg-[#f8f2eb] p-4"><UserRound className="h-5 w-5 text-lien-primary" /><p className="mt-3 text-2xl font-semibold tabular-nums">{data.summary.totalRegisteredCustomers}<span className="ml-1 text-sm">人</span></p><p className="mt-1 text-xs text-lien-muted">実運用顧客</p></div>
            <div className="rounded-2xl bg-[#f8f2eb] p-4 sm:col-span-2"><JapaneseYen className="h-5 w-5 text-lien-primary" /><p className="mt-3 text-2xl font-semibold tabular-nums">{yen(data.summary.lifetimeRevenue)}</p><p className="mt-1 text-xs text-lien-muted">累計売上 / 会計 {data.summary.lifetimeSaleCount}件</p></div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <StatusBadge tone="success">電話登録 {data.dataStatus.customersWithPhoneCount}人</StatusBadge>
            <StatusBadge tone="highlight">来店履歴あり {data.dataStatus.customersWithVisitCount}人</StatusBadge>
            <StatusBadge tone="default">売上履歴あり {data.dataStatus.customersWithSaleCount}人</StatusBadge>
          </div>
        </LienCard>
      </section>
    </div>
  );
}
