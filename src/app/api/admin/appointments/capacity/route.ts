import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { AuthorizationError, requireBackofficeSession } from "@/lib/auth/authorization";
import { hasValidRequestOrigin } from "@/lib/auth/request-security";
import {
  bookingCapacitySlotStarts,
  MAX_BOOKING_CAPACITY
} from "@/lib/appointments/booking-capacity";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type CapacityBody = {
  date?: unknown;
  slots?: unknown;
};

function jsonError(error: unknown) {
  const status = error instanceof AuthorizationError ? error.status : 400;
  return NextResponse.json(
    { error: error instanceof Error ? error.message : "受付数を保存できませんでした。" },
    { status }
  );
}

export async function PUT(request: NextRequest) {
  if (!hasValidRequestOrigin(request)) {
    return NextResponse.json({ error: "不正なリクエストです。" }, { status: 403 });
  }

  try {
    const session = await requireBackofficeSession(["ADMIN", "STAFF"]);
    if (!session.organizationId) {
      throw new AuthorizationError("店舗所属が設定されていません。", 403);
    }

    const body = (await request.json()) as CapacityBody;
    const date = typeof body.date === "string" ? body.date : "";
    if (!/^20\d{2}-(0[1-9]|1[0-2])-([012]\d|3[01])$/.test(date)) {
      throw new Error("日付を確認してください。");
    }
    if (!Array.isArray(body.slots)) throw new Error("受付数を確認してください。");

    const validStarts = new Set(bookingCapacitySlotStarts());
    const slots = body.slots.map((item) => {
      if (!item || typeof item !== "object") throw new Error("受付数を確認してください。");
      const slotStartMinutes = Number((item as { slotStartMinutes?: unknown }).slotStartMinutes);
      const rawCapacity = (item as { capacity?: unknown }).capacity;
      const capacity = rawCapacity === null ? null : Number(rawCapacity);
      if (!validStarts.has(slotStartMinutes)) throw new Error("受付時間を確認してください。");
      if (
        capacity !== null &&
        (!Number.isInteger(capacity) || capacity < 0 || capacity > MAX_BOOKING_CAPACITY)
      ) {
        throw new Error(`受付数は0〜${MAX_BOOKING_CAPACITY}件で設定してください。`);
      }
      return { slotStartMinutes, capacity };
    });

    if (new Set(slots.map((slot) => slot.slotStartMinutes)).size !== slots.length) {
      throw new Error("同じ時間帯が重複しています。");
    }

    await prisma.$transaction(async (tx) => {
      await tx.bookingCapacityOverride.deleteMany({
        where: { organizationId: session.organizationId!, dateKey: date }
      });
      const explicitSlots = slots.filter(
        (slot): slot is { slotStartMinutes: number; capacity: number } => slot.capacity !== null
      );
      if (explicitSlots.length > 0) {
        await tx.bookingCapacityOverride.createMany({
          data: explicitSlots.map((slot) => ({
            organizationId: session.organizationId!,
            dateKey: date,
            slotStartMinutes: slot.slotStartMinutes,
            capacity: slot.capacity
          }))
        });
      }
    });

    revalidatePath("/admin/appointments");
    revalidatePath("/u/appointments");
    return NextResponse.json({ success: true, date, slots });
  } catch (error) {
    return jsonError(error);
  }
}
