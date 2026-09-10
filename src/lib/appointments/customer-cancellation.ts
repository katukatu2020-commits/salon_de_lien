import { dateAtTokyoMinutes, scheduleDateKey } from "@/lib/appointments/schedule";

export const CUSTOMER_CANCELLATION_POLICY_MESSAGE =
  "アプリからのキャンセルは予約日の前日までです。当日の変更・キャンセルは店舗へ電話またはチャットでお問い合わせください。";

export function customerCancellationDeadline(scheduledAt: Date | string) {
  return dateAtTokyoMinutes(scheduleDateKey(scheduledAt), 0);
}

export function canCustomerCancelAppointment(scheduledAt: Date | string, now = new Date()) {
  return now.getTime() < customerCancellationDeadline(scheduledAt).getTime();
}
