import "server-only";

import { createHash } from "crypto";
import type { Prisma } from "@prisma/client";

const HISTORY_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function historyDateRange(value: string) {
  if (!HISTORY_DATE_PATTERN.test(value)) return null;
  const start = new Date(`${value}T00:00:00+09:00`);
  if (Number.isNaN(start.getTime())) return null;
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { key: value, start, end };
}

export function historyDateKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

export function deterministicHistoryVisitId(customerId: string, dateKey: string) {
  const digest = createHash("sha256").update(`${customerId}:${dateKey}`).digest("hex").slice(0, 24);
  return `history_${digest}`;
}

export async function ensureHistoryVisit(
  tx: Prisma.TransactionClient,
  input: {
    customerId: string;
    occurredAt: Date;
    menu?: string | null;
    staffName?: string | null;
  }
) {
  const dateKey = historyDateKey(input.occurredAt);
  const range = historyDateRange(dateKey);
  if (!range) throw new Error("来店日を確認できませんでした。");

  const existing = await tx.visit.findFirst({
    where: {
      customerId: input.customerId,
      visitedAt: { gte: range.start, lt: range.end }
    },
    orderBy: { visitedAt: "desc" },
    select: {
      id: true,
      stylistName: true,
      requestedStyle: true,
      performedStyle: true
    }
  });

  if (existing) {
    const data: Prisma.VisitUpdateInput = {};
    if (!existing.stylistName && input.staffName) data.stylistName = input.staffName;
    if (!existing.requestedStyle && input.menu) data.requestedStyle = input.menu;
    if (!existing.performedStyle && input.menu) data.performedStyle = input.menu;
    if (Object.keys(data).length > 0) {
      return tx.visit.update({ where: { id: existing.id }, data, select: { id: true } });
    }
    return { id: existing.id };
  }

  return tx.visit.upsert({
    where: { id: deterministicHistoryVisitId(input.customerId, dateKey) },
    update: {},
    create: {
      id: deterministicHistoryVisitId(input.customerId, dateKey),
      customerId: input.customerId,
      visitedAt: input.occurredAt,
      stylistName: input.staffName?.trim() || null,
      requestedStyle: input.menu?.trim() || null,
      performedStyle: input.menu?.trim() || null
    },
    select: { id: true }
  });
}
