"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireBackofficeSession } from "@/lib/auth/authorization";
import { prisma } from "@/lib/prisma";
import { resolveSalonStaffByKey } from "@/lib/salon/staff";
import {
  SCHEDULE_END_MINUTES,
  SCHEDULE_START_MINUTES,
  SCHEDULE_SNAP_MINUTES
} from "@/lib/appointments/schedule";

function integerField(formData: FormData, key: string) {
  const value = Number(formData.get(key));
  return Number.isInteger(value) ? value : Number.NaN;
}

function minutesField(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "");
  const match = value.match(/^(\d{2}):(\d{2})$/);
  if (!match) return Number.NaN;
  return Number(match[1]) * 60 + Number(match[2]);
}

export async function updateStaffBookingSettingAction(staffKey: string, formData: FormData) {
  const session = await requireBackofficeSession(["ADMIN"]);
  if (!session.organizationId) throw new Error("店舗所属が設定されていません。");
  const staff = resolveSalonStaffByKey(staffKey);
  if (!staff) throw new Error("スタッフが見つかりません。");

  const maxConcurrentAppointments = integerField(formData, "maxConcurrentAppointments");
  const workStartMinutes = minutesField(formData, "workStart");
  const workEndMinutes = minutesField(formData, "workEnd");
  if (!Number.isInteger(maxConcurrentAppointments) || maxConcurrentAppointments < 1 || maxConcurrentAppointments > 5) {
    throw new Error("受付可能数は1〜5件で設定してください。");
  }
  if (
    !Number.isInteger(workStartMinutes) ||
    !Number.isInteger(workEndMinutes) ||
    workStartMinutes % SCHEDULE_SNAP_MINUTES !== 0 ||
    workEndMinutes % SCHEDULE_SNAP_MINUTES !== 0 ||
    workStartMinutes < SCHEDULE_START_MINUTES ||
    workEndMinutes > SCHEDULE_END_MINUTES ||
    workStartMinutes >= workEndMinutes
  ) {
    throw new Error("受付時間は10:00〜19:00の間で15分単位に設定してください。");
  }

  await prisma.staffBookingSetting.upsert({
    where: {
      organizationId_staffKey: {
        organizationId: session.organizationId,
        staffKey
      }
    },
    update: { staffName: staff.name, maxConcurrentAppointments, workStartMinutes, workEndMinutes },
    create: {
      organizationId: session.organizationId,
      staffKey,
      staffName: staff.name,
      maxConcurrentAppointments,
      workStartMinutes,
      workEndMinutes
    }
  });

  revalidatePath("/admin/appointments");
  revalidatePath(`/admin/staff/${staffKey}`);
  redirect(`/admin/staff/${staffKey}?saved=1`);
}
