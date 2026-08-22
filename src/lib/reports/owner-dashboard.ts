import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { normalizeSalonStaffName } from "@/lib/salon/staff";

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;
const NON_OPERATIONAL_CUSTOMER_MEMO_MARKERS = [
  "デモ顧客",
  "メーカー商品フィードバック連携用の顧客データ",
  "操作説明資料用",
  "店舗状況シミュレーション用",
  "Codex verification"
] as const;
const NON_OPERATIONAL_SALE_MARKERS = ["demo", "デモ", "操作説明資料", "Codex"] as const;
export const OWNER_DASHBOARD_SIMULATION_SOURCE = "owner-dashboard-simulation-v1";
export const OWNER_DASHBOARD_SIMULATION_VISIT_MARKER = "OWNER_DASHBOARD_SIMULATION_V1";

export type OwnerDashboardPeriod = 6 | 12 | 24;
export type OwnerDashboardScope = "actual" | "simulation";

export type OwnerDashboardMonth = {
  key: string;
  label: string;
  shortLabel: string;
  revenue: number;
  paidCustomerCount: number;
  visitCount: number;
  visitedCustomerCount: number;
  registeredCustomerCount: number;
  newPaidCustomerCount: number;
  repeatPaidCustomerCount: number;
};

export type OwnerDashboardData = {
  generatedAt: Date;
  period: OwnerDashboardPeriod;
  scope: OwnerDashboardScope;
  periodStart: Date;
  periodEnd: Date;
  currentMonthLabel: string;
  summary: {
    currentRevenue: number;
    previousRevenue: number;
    currentPaidCustomerCount: number;
    previousPaidCustomerCount: number;
    currentAverageSpend: number;
    previousAverageSpend: number;
    currentNewPaidCustomerCount: number;
    currentRepeatPaidCustomerCount: number;
    currentRepeatRate: number;
    currentVisitCount: number;
    averageVisitCycleDays: number;
    visitCycleIntervalCount: number;
    totalRegisteredCustomers: number;
    upcomingAppointmentCount: number;
    lifetimeRevenue: number;
    lifetimeSaleCount: number;
  };
  dataStatus: {
    operationalCustomerCount: number;
    customersWithPhoneCount: number;
    customersWithVisitCount: number;
    customersWithSaleCount: number;
    excludedCustomerCount: number;
    excludedSaleCount: number;
    excludedVisitCount: number;
  };
  months: OwnerDashboardMonth[];
  menuBreakdown: Array<{ label: string; revenue: number; count: number }>;
  paymentBreakdown: Array<{ label: string; revenue: number; count: number }>;
  stylistBreakdown: Array<{ label: string; visitCount: number }>;
  staffPerformance: Array<{
    label: string;
    revenue: number;
    saleCount: number;
    customerCount: number;
    visitCount: number;
    averageSpend: number;
  }>;
  topCustomers: Array<{
    customerId: string;
    customerName: string;
    revenue: number;
    saleCount: number;
    visitCount: number;
    averageSpend: number;
  }>;
  ageBreakdown: Array<{ label: string; count: number }>;
  genderBreakdown: Array<{ label: string; count: number }>;
  recentSales: Array<{
    id: string;
    customerId: string;
    customerName: string;
    title: string;
    amount: number;
    paidAt: Date;
    paymentMethod: string | null;
  }>;
};

function jstDateParts(date: Date) {
  const shifted = new Date(date.getTime() + JST_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    monthIndex: shifted.getUTCMonth(),
    day: shifted.getUTCDate()
  };
}

function startOfJstMonth(date: Date) {
  const { year, monthIndex } = jstDateParts(date);
  return new Date(Date.UTC(year, monthIndex, 1) - JST_OFFSET_MS);
}

function addJstMonths(date: Date, amount: number) {
  const { year, monthIndex } = jstDateParts(date);
  return new Date(Date.UTC(year, monthIndex + amount, 1) - JST_OFFSET_MS);
}

function monthKey(date: Date) {
  const { year, monthIndex } = jstDateParts(date);
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
}

function monthLabel(date: Date) {
  const { year, monthIndex } = jstDateParts(date);
  return `${year}年${monthIndex + 1}月`;
}

function shortMonthLabel(date: Date) {
  const { monthIndex } = jstDateParts(date);
  return `${monthIndex + 1}月`;
}

function uniqueCount(values: string[]) {
  return new Set(values).size;
}

function average(total: number, count: number) {
  return count > 0 ? Math.round(total / count) : 0;
}

function percent(numerator: number, denominator: number) {
  return denominator > 0 ? Math.round((numerator / denominator) * 100) : 0;
}

function normalizedLabel(value: string | null | undefined, fallback: string) {
  const label = value?.trim();
  return label || fallback;
}

function operationalCustomerWhere(organizationId: string): Prisma.CustomerWhereInput {
  return {
    organizationId,
    deletedAt: null,
    storeHiddenAt: null,
    NOT: {
      name: { contains: "Codex" }
    },
    AND: [
      ...NON_OPERATIONAL_CUSTOMER_MEMO_MARKERS.map((marker) => ({
        OR: [
          { memo: null },
          {
            NOT: {
              memo: { contains: marker }
            }
          }
        ]
      }))
    ]
  };
}

function operationalSaleWhere(organizationId: string): Prisma.ServiceSaleWhereInput {
  return {
    customer: operationalCustomerWhere(organizationId),
    AND: NON_OPERATIONAL_SALE_MARKERS.flatMap((marker) => [
      {
        OR: [
          { source: null },
          {
            NOT: {
              source: { contains: marker }
            }
          }
        ]
      },
      {
        OR: [
          { note: null },
          {
            NOT: {
              note: { contains: marker }
            }
          }
        ]
      }
    ])
  };
}

function simulationCustomerWhere(organizationId: string): Prisma.CustomerWhereInput {
  return {
    organizationId,
    deletedAt: null,
    storeHiddenAt: null,
    memo: {
      contains: "店舗状況シミュレーション用"
    }
  };
}

export function normalizeOwnerDashboardPeriod(value?: string): OwnerDashboardPeriod {
  if (value === "6") return 6;
  if (value === "24") return 24;
  return 12;
}

export function normalizeOwnerDashboardScope(value?: string): OwnerDashboardScope {
  return value === "simulation" ? "simulation" : "actual";
}

export async function getOwnerDashboardData(
  period: OwnerDashboardPeriod,
  scope: OwnerDashboardScope = "actual",
  organizationId = process.env.DEFAULT_ORGANIZATION_ID ?? "org_salon_de_lien",
  now = new Date()
): Promise<OwnerDashboardData> {
  const currentMonthStart = startOfJstMonth(now);
  const nextMonthStart = addJstMonths(currentMonthStart, 1);
  const periodStart = addJstMonths(currentMonthStart, -(period - 1));
  const upcomingEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const customerWhere =
    scope === "simulation" ? simulationCustomerWhere(organizationId) : operationalCustomerWhere(organizationId);
  const saleWhere: Prisma.ServiceSaleWhereInput =
    scope === "simulation"
      ? {
          source: OWNER_DASHBOARD_SIMULATION_SOURCE,
          customer: customerWhere
        }
      : operationalSaleWhere(organizationId);
  const visitWhere: Prisma.VisitWhereInput =
    scope === "simulation"
      ? {
          nextRecommendation: {
            contains: OWNER_DASHBOARD_SIMULATION_VISIT_MARKER
          },
          customer: customerWhere
        }
      : {
          customer: customerWhere
        };
  const appointmentWhere: Prisma.AppointmentWhereInput =
    scope === "simulation"
      ? {
          source: OWNER_DASHBOARD_SIMULATION_SOURCE,
          customer: customerWhere
        }
      : {
          customer: customerWhere
        };

  const [
    sales,
    visits,
    registeredCustomers,
    firstSaleRows,
    operationalCustomers,
    lifetimeSales,
    upcomingAppointmentCount,
    operationalVisitCount,
    allActiveCustomerCount,
    allActiveSaleCount,
    allActiveVisitCount
  ] = await Promise.all([
    prisma.serviceSale.findMany({
      where: {
        ...saleWhere,
        paidAt: { gte: periodStart, lt: nextMonthStart },
      },
      orderBy: { paidAt: "desc" },
      select: {
        id: true,
        customerId: true,
        title: true,
        amount: true,
        paidAt: true,
        paymentMethod: true,
        appointment: {
          select: {
            staffName: true
          }
        },
        customer: {
          select: {
            name: true
          }
        }
      }
    }),
    prisma.visit.findMany({
      where: {
        ...visitWhere,
        visitedAt: { gte: periodStart, lt: nextMonthStart },
      },
      select: {
        customerId: true,
        visitedAt: true,
        stylistName: true
      }
    }),
    prisma.customer.findMany({
      where: {
        ...customerWhere,
        createdAt: { gte: periodStart, lt: nextMonthStart }
      },
      select: {
        createdAt: true
      }
    }),
    prisma.serviceSale.groupBy({
      by: ["customerId"],
      where: {
        ...saleWhere,
        paidAt: { lt: nextMonthStart },
      },
      _min: {
        paidAt: true
      }
    }),
    prisma.customer.findMany({
      where: customerWhere,
      select: {
        id: true,
        name: true,
        gender: true,
        birthYear: true,
        phone: true,
        _count: {
          select: {
            visits: true
          }
        }
      }
    }),
    prisma.serviceSale.aggregate({
      where: saleWhere,
      _count: {
        _all: true
      },
      _sum: {
        amount: true
      }
    }),
    prisma.appointment.count({
      where: {
        ...appointmentWhere,
        scheduledAt: { gte: now, lt: upcomingEnd },
      }
    }),
    prisma.visit.count({
      where: visitWhere
    }),
    prisma.customer.count({
      where: {
        organizationId,
        deletedAt: null,
        storeHiddenAt: null
      }
    }),
    prisma.serviceSale.count({
      where: {
        customer: {
          organizationId,
          deletedAt: null
        }
      }
    }),
    prisma.visit.count({
      where: {
        customer: {
          organizationId,
          deletedAt: null
        }
      }
    })
  ]);

  const firstSaleByCustomer = new Map(
    firstSaleRows
      .filter((row) => row._min.paidAt)
      .map((row) => [row.customerId, monthKey(row._min.paidAt as Date)])
  );

  const months = Array.from({ length: period }, (_, index) => {
    const start = addJstMonths(periodStart, index);
    const key = monthKey(start);
    const monthSales = sales.filter((sale) => monthKey(sale.paidAt) === key);
    const monthVisits = visits.filter((visit) => monthKey(visit.visitedAt) === key);
    const paidCustomerIds = Array.from(new Set(monthSales.map((sale) => sale.customerId)));
    const newPaidCustomerCount = paidCustomerIds.filter(
      (customerId) => firstSaleByCustomer.get(customerId) === key
    ).length;

    return {
      key,
      label: monthLabel(start),
      shortLabel: shortMonthLabel(start),
      revenue: monthSales.reduce((total, sale) => total + sale.amount, 0),
      paidCustomerCount: paidCustomerIds.length,
      visitCount: monthVisits.length,
      visitedCustomerCount: uniqueCount(monthVisits.map((visit) => visit.customerId)),
      registeredCustomerCount: registeredCustomers.filter(
        (customer) => monthKey(customer.createdAt) === key
      ).length,
      newPaidCustomerCount,
      repeatPaidCustomerCount: Math.max(0, paidCustomerIds.length - newPaidCustomerCount)
    };
  });

  const current = months.at(-1) as OwnerDashboardMonth;
  const previous = months.at(-2) ?? {
    revenue: 0,
    paidCustomerCount: 0,
    newPaidCustomerCount: 0,
    repeatPaidCustomerCount: 0,
    visitCount: 0
  };

  const menuMap = new Map<string, { revenue: number; count: number }>();
  const paymentMap = new Map<string, { revenue: number; count: number }>();
  const stylistMap = new Map<string, number>();
  const staffSalesMap = new Map<string, { revenue: number; saleCount: number; customerIds: Set<string> }>();
  const customerSalesMap = new Map<string, { customerName: string; revenue: number; saleCount: number }>();
  const visitsByCustomer = new Map<string, typeof visits>();

  for (const visit of visits) {
    visitsByCustomer.set(visit.customerId, [...(visitsByCustomer.get(visit.customerId) ?? []), visit]);
  }

  let totalVisitCycleDays = 0;
  let visitCycleIntervalCount = 0;
  for (const customerVisits of visitsByCustomer.values()) {
    const ordered = [...customerVisits].sort((left, right) => left.visitedAt.getTime() - right.visitedAt.getTime());
    for (let index = 1; index < ordered.length; index += 1) {
      const intervalDays = (ordered[index].visitedAt.getTime() - ordered[index - 1].visitedAt.getTime()) / (24 * 60 * 60 * 1000);
      if (intervalDays < 1) continue;
      totalVisitCycleDays += intervalDays;
      visitCycleIntervalCount += 1;
    }
  }
  const averageVisitCycleDays = visitCycleIntervalCount > 0
    ? Math.round(totalVisitCycleDays / visitCycleIntervalCount)
    : 0;

  for (const sale of sales) {
    const menuLabel = normalizedLabel(sale.title, "内容未設定");
    const menuValue = menuMap.get(menuLabel) ?? { revenue: 0, count: 0 };
    menuValue.revenue += sale.amount;
    menuValue.count += 1;
    menuMap.set(menuLabel, menuValue);

    const paymentLabel = normalizedLabel(sale.paymentMethod, "未設定");
    const paymentValue = paymentMap.get(paymentLabel) ?? { revenue: 0, count: 0 };
    paymentValue.revenue += sale.amount;
    paymentValue.count += 1;
    paymentMap.set(paymentLabel, paymentValue);

    const nearbyVisit = (visitsByCustomer.get(sale.customerId) ?? [])
      .map((visit) => ({ visit, distance: Math.abs(visit.visitedAt.getTime() - sale.paidAt.getTime()) }))
      .filter((item) => item.distance <= 14 * 24 * 60 * 60 * 1000)
      .sort((left, right) => left.distance - right.distance)[0]?.visit;
    const staffLabel =
      normalizeSalonStaffName(sale.appointment?.staffName ?? nearbyVisit?.stylistName) ?? "フリー・担当不明";
    const staffValue = staffSalesMap.get(staffLabel) ?? {
      revenue: 0,
      saleCount: 0,
      customerIds: new Set<string>()
    };
    staffValue.revenue += sale.amount;
    staffValue.saleCount += 1;
    staffValue.customerIds.add(sale.customerId);
    staffSalesMap.set(staffLabel, staffValue);

    const customerValue = customerSalesMap.get(sale.customerId) ?? {
      customerName: sale.customer.name,
      revenue: 0,
      saleCount: 0
    };
    customerValue.revenue += sale.amount;
    customerValue.saleCount += 1;
    customerSalesMap.set(sale.customerId, customerValue);
  }

  for (const visit of visits) {
    const label = normalizeSalonStaffName(visit.stylistName) ?? "フリー・担当不明";
    stylistMap.set(label, (stylistMap.get(label) ?? 0) + 1);
  }

  const ageLabels = ["19歳以下", "20代", "30代", "40代", "50代", "60代", "70歳以上", "未設定"];
  const ageMap = new Map(ageLabels.map((label) => [label, 0]));
  const genderLabels = ["女性", "男性", "その他", "未回答"];
  const genderMap = new Map(genderLabels.map((label) => [label, 0]));
  const currentYear = jstDateParts(now).year;

  for (const customer of operationalCustomers) {
    const age = customer.birthYear ? currentYear - customer.birthYear : null;
    const ageLabel =
      age === null || age < 0
        ? "未設定"
        : age <= 19
          ? "19歳以下"
          : age >= 70
            ? "70歳以上"
            : `${Math.floor(age / 10) * 10}代`;
    ageMap.set(ageLabel, (ageMap.get(ageLabel) ?? 0) + 1);

    const normalizedGender = customer.gender?.trim();
    const genderLabel =
      normalizedGender === "女性" || normalizedGender?.toLowerCase() === "female"
        ? "女性"
        : normalizedGender === "男性" || normalizedGender?.toLowerCase() === "male"
          ? "男性"
          : normalizedGender && normalizedGender !== "未回答"
            ? "その他"
            : "未回答";
    genderMap.set(genderLabel, (genderMap.get(genderLabel) ?? 0) + 1);
  }

  return {
    generatedAt: now,
    period,
    scope,
    periodStart,
    periodEnd: nextMonthStart,
    currentMonthLabel: current.label,
    summary: {
      currentRevenue: current.revenue,
      previousRevenue: previous.revenue,
      currentPaidCustomerCount: current.paidCustomerCount,
      previousPaidCustomerCount: previous.paidCustomerCount,
      currentAverageSpend: average(current.revenue, current.paidCustomerCount),
      previousAverageSpend: average(previous.revenue, previous.paidCustomerCount),
      currentNewPaidCustomerCount: current.newPaidCustomerCount,
      currentRepeatPaidCustomerCount: current.repeatPaidCustomerCount,
      currentRepeatRate: percent(current.repeatPaidCustomerCount, current.paidCustomerCount),
      currentVisitCount: current.visitCount,
      averageVisitCycleDays,
      visitCycleIntervalCount,
      totalRegisteredCustomers: operationalCustomers.length,
      upcomingAppointmentCount,
      lifetimeRevenue: lifetimeSales._sum.amount ?? 0,
      lifetimeSaleCount: lifetimeSales._count._all
    },
    dataStatus: {
      operationalCustomerCount: operationalCustomers.length,
      customersWithPhoneCount: operationalCustomers.filter((customer) => Boolean(customer.phone?.trim())).length,
      customersWithVisitCount: operationalCustomers.filter((customer) => customer._count.visits > 0).length,
      customersWithSaleCount: firstSaleRows.length,
      excludedCustomerCount:
        scope === "actual" ? Math.max(0, allActiveCustomerCount - operationalCustomers.length) : 0,
      excludedSaleCount:
        scope === "actual" ? Math.max(0, allActiveSaleCount - lifetimeSales._count._all) : 0,
      excludedVisitCount:
        scope === "actual" ? Math.max(0, allActiveVisitCount - operationalVisitCount) : 0
    },
    months,
    menuBreakdown: Array.from(menuMap.entries())
      .map(([label, value]) => ({ label, ...value }))
      .sort((left, right) => right.revenue - left.revenue)
      .slice(0, 6),
    paymentBreakdown: Array.from(paymentMap.entries())
      .map(([label, value]) => ({ label, ...value }))
      .sort((left, right) => right.revenue - left.revenue),
    stylistBreakdown: Array.from(stylistMap.entries())
      .map(([label, visitCount]) => ({ label, visitCount }))
      .sort((left, right) => right.visitCount - left.visitCount)
      .slice(0, 6),
    staffPerformance: Array.from(new Set([...staffSalesMap.keys(), ...stylistMap.keys()]))
      .map((label) => {
        const staffSales = staffSalesMap.get(label);
        const saleCount = staffSales?.saleCount ?? 0;
        return {
          label,
          revenue: staffSales?.revenue ?? 0,
          saleCount,
          customerCount: staffSales?.customerIds.size ?? 0,
          visitCount: stylistMap.get(label) ?? 0,
          averageSpend: average(staffSales?.revenue ?? 0, saleCount)
        };
      })
      .sort((left, right) => right.revenue - left.revenue || right.visitCount - left.visitCount),
    topCustomers: Array.from(customerSalesMap.entries())
      .map(([customerId, value]) => ({
        customerId,
        customerName: value.customerName,
        revenue: value.revenue,
        saleCount: value.saleCount,
        visitCount: visitsByCustomer.get(customerId)?.length ?? 0,
        averageSpend: average(value.revenue, value.saleCount)
      }))
      .sort((left, right) => right.revenue - left.revenue)
      .slice(0, 10),
    ageBreakdown: ageLabels.map((label) => ({ label, count: ageMap.get(label) ?? 0 })),
    genderBreakdown: genderLabels.map((label) => ({ label, count: genderMap.get(label) ?? 0 })),
    recentSales: sales.slice(0, 10).map((sale) => ({
      id: sale.id,
      customerId: sale.customerId,
      customerName: sale.customer.name,
      title: sale.title,
      amount: sale.amount,
      paidAt: sale.paidAt,
      paymentMethod: sale.paymentMethod
    }))
  };
}
