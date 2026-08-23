import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import {
  normalizeReservationPhone,
  parseReservationEmail,
  type ParsedReservationEmail,
  type ReservationEmailInput
} from "@/lib/appointments/reservation-email";
import { BOOKING_PROVIDERS, inferBookingProvider } from "@/lib/appointments/booking-provider";

const GMAIL_CUSTOMER_MEMO = "Gmail予約メールから登録。内容確認後に正式な顧客情報へ更新してください。";

function stableHash(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function monthParam(value: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit"
  }).format(value);
}

type ExistingAppointmentDetails = {
  staffName: string | null;
  durationMinutes: number | null;
  menu: string | null;
  estimatedPrice: number | null;
  note?: string | null;
};

function noteAmount(note: string | null | undefined, label: string) {
  const match = (note ?? "").match(new RegExp(`(?:^|\\n)${label}:\\s*([\\d,]+)`, "i"));
  if (!match) return null;
  const amount = Number(match[1].replace(/,/g, ""));
  return Number.isSafeInteger(amount) && amount >= 0 ? amount : null;
}

export function mergeReservationEmailDetails(
  parsed: Pick<
    ParsedReservationEmail,
    "staffAssignment" | "staffName" | "durationMinutes" | "menu" | "estimatedPrice"
  >,
  existing?: ExistingAppointmentDetails | null
) {
  return {
    staffName:
      parsed.staffAssignment === "unknown"
        ? existing?.staffName ?? null
        : parsed.staffName,
    durationMinutes: parsed.durationMinutes ?? existing?.durationMinutes ?? null,
    menu: parsed.menu ?? existing?.menu ?? null,
    estimatedPrice: parsed.estimatedPrice ?? existing?.estimatedPrice ?? null
  };
}

async function resolveCustomer(customerName: string, phone: string | null, digest: string, organizationId: string) {
  const normalizedPhone = normalizeReservationPhone(phone)?.replace(/\D/g, "") ?? "";
  const phoneTail = normalizedPhone.slice(-4);
  const candidates = await prisma.customer.findMany({
    where: {
      deletedAt: null,
      organizationId,
      OR: [
        { name: customerName },
        ...(phoneTail ? [{ phone: { contains: phoneTail } }] : [])
      ]
    },
    select: { id: true, name: true, phone: true },
    take: 30
  });
  const phoneMatch = normalizedPhone
    ? candidates.find((candidate) => normalizeReservationPhone(candidate.phone)?.replace(/\D/g, "") === normalizedPhone)
    : null;
  const nameMatch = candidates.find((candidate) => candidate.name.replace(/\s+/g, "") === customerName.replace(/\s+/g, ""));
  const matched = phoneMatch ?? nameMatch;

  if (matched) return { customer: matched, created: false };

  const id = `gmail-customer-${stableHash(`${organizationId}:${phone || `${customerName}:${digest}`}`).slice(0, 20)}`;
  const customer = await prisma.customer.upsert({
    where: { id },
    update: {
      name: customerName,
      phone,
      organizationId,
      deletedAt: null
    },
    create: {
      id,
      name: customerName,
      phone,
      organizationId,
      memo: GMAIL_CUSTOMER_MEMO
    },
    select: { id: true, name: true, phone: true }
  });

  return { customer, created: true };
}

export async function importReservationEmail(
  input: ReservationEmailInput,
  organizationId = process.env.DEFAULT_ORGANIZATION_ID ?? "org_salon_de_lien"
) {
  const parsed = parseReservationEmail(input);
  if (!parsed.ok) return parsed;

  const normalizedContent = input.content.normalize("NFKC").replace(/\r/g, "").trim();
  const digest = stableHash(input.messageId?.trim() || `${input.subject ?? ""}\n${normalizedContent}`);
  const source = `gmail:${digest}`;
  const bookingProvider = inferBookingProvider({
    source,
    subject: parsed.value.subject,
    content: `${input.sender ?? ""}\n${normalizedContent}`
  });
  const providerLabel = BOOKING_PROVIDERS[bookingProvider].label;
  const { customer, created: customerCreated } = await resolveCustomer(
    parsed.value.customerName,
    parsed.value.phone,
    digest,
    organizationId
  );
  const matchedCancellation =
    parsed.value.status === "キャンセル" && !parsed.value.bookingReference
      ? await prisma.appointment.findFirst({
          where: {
            customerId: customer.id,
            scheduledAt: parsed.value.scheduledAt,
            status: { notIn: ["キャンセル", "無断キャンセル", "来店済み"] },
            OR: [{ bookingProvider }, { source: { startsWith: "gmail:" } }]
          },
          orderBy: { updatedAt: "desc" },
          select: { id: true }
        })
      : null;
  const appointmentIdentity = parsed.value.bookingReference
    ? `booking:${parsed.value.bookingReference}`
    : `message:${digest}`;
  const appointmentId =
    matchedCancellation?.id ??
    `gmail-appt-${stableHash(`${organizationId}:${appointmentIdentity}`).slice(0, 24)}`;
  const existing = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: {
      id: true,
      staffName: true,
      durationMinutes: true,
      menu: true,
      estimatedPrice: true,
      note: true
    }
  });
  const mergedDetails = mergeReservationEmailDetails(parsed.value, existing);
  const usedPoints = parsed.value.usedPoints ?? noteAmount(existing?.note, "利用ポイント");
  const usedGiftAmount = parsed.value.usedGiftAmount ?? noteAmount(existing?.note, "利用ギフト券");
  const otherDiscountAmount = parsed.value.otherDiscountAmount ?? noteAmount(existing?.note, "その他割引");
  const prepaidAmount = parsed.value.prepaidAmount ?? noteAmount(existing?.note, "事前決済額");
  const paymentDue = parsed.value.paymentDue ?? noteAmount(existing?.note, "支払予定額");
  const note = [
    parsed.value.bookingReference ? `予約番号: ${parsed.value.bookingReference}` : null,
    mergedDetails.staffName ? `担当: ${mergedDetails.staffName}` : null,
    mergedDetails.durationMinutes ? `所要時間: ${mergedDetails.durationMinutes}分` : null,
    parsed.value.subject ? `メール件名: ${parsed.value.subject}` : null,
    usedPoints !== null ? `利用ポイント: ${usedPoints}pt` : null,
    usedGiftAmount !== null ? `利用ギフト券: ${usedGiftAmount}円` : null,
    otherDiscountAmount !== null ? `その他割引: ${otherDiscountAmount}円` : null,
    prepaidAmount !== null ? `事前決済額: ${prepaidAmount}円` : null,
    paymentDue !== null ? `支払予定額: ${paymentDue}円` : null,
    `予約元: ${providerLabel}`,
    "Gmail予約メールから抽出。元メール本文は保存していません。"
  ]
    .filter((value): value is string => Boolean(value))
    .join("\n");
  const appointment = await prisma.appointment.upsert({
    where: { id: appointmentId },
    update: {
      customerId: customer.id,
      scheduledAt: parsed.value.scheduledAt,
      durationMinutes: mergedDetails.durationMinutes,
      menu: mergedDetails.menu,
      staffName: mergedDetails.staffName,
      estimatedPrice: mergedDetails.estimatedPrice,
      status: parsed.value.status,
      source,
      bookingProvider,
      note
    },
    create: {
      id: appointmentId,
      customerId: customer.id,
      scheduledAt: parsed.value.scheduledAt,
      durationMinutes: mergedDetails.durationMinutes,
      menu: mergedDetails.menu,
      staffName: mergedDetails.staffName,
      estimatedPrice: mergedDetails.estimatedPrice,
      status: parsed.value.status,
      source,
      bookingProvider,
      note
    },
    include: {
      customer: { select: { id: true, name: true } }
    }
  });
  const contactId = `gmail-contact-${stableHash(`${organizationId}:${digest}`).slice(0, 24)}`;
  await prisma.contactLog.upsert({
    where: { id: contactId },
    update: {
      customerId: customer.id,
      channel: `${providerLabel}予約メール`,
      purpose: "予約取込",
      message: [
        `予約日時: ${parsed.value.scheduledAt.toISOString()}`,
        appointment.durationMinutes ? `施術時間: ${appointment.durationMinutes}分` : null,
        `メニュー: ${appointment.menu ?? "記載なし"}`,
        `ステータス: ${parsed.value.status}`,
        appointment.staffName ? `担当: ${appointment.staffName}` : null,
        parsed.value.bookingReference ? `予約番号: ${parsed.value.bookingReference}` : null,
        usedPoints !== null ? `利用ポイント: ${usedPoints}pt` : null,
        usedGiftAmount !== null ? `利用ギフト券: ${usedGiftAmount}円` : null,
        otherDiscountAmount !== null ? `その他割引: ${otherDiscountAmount}円` : null,
        prepaidAmount !== null ? `事前決済額: ${prepaidAmount}円` : null,
        paymentDue !== null ? `支払予定額: ${paymentDue}円` : null
      ].filter(Boolean).join("\n"),
      outcome: existing ? "予約更新" : "予約登録",
      nextAction: "予約内容と顧客情報を確認する",
      scheduledFollowUp: parsed.value.scheduledAt
    },
    create: {
      id: contactId,
      customerId: customer.id,
      channel: `${providerLabel}予約メール`,
      purpose: "予約取込",
      message: [
        `予約日時: ${parsed.value.scheduledAt.toISOString()}`,
        appointment.durationMinutes ? `施術時間: ${appointment.durationMinutes}分` : null,
        `メニュー: ${appointment.menu ?? "記載なし"}`,
        `ステータス: ${parsed.value.status}`,
        appointment.staffName ? `担当: ${appointment.staffName}` : null,
        parsed.value.bookingReference ? `予約番号: ${parsed.value.bookingReference}` : null,
        usedPoints !== null ? `利用ポイント: ${usedPoints}pt` : null,
        usedGiftAmount !== null ? `利用ギフト券: ${usedGiftAmount}円` : null,
        otherDiscountAmount !== null ? `その他割引: ${otherDiscountAmount}円` : null,
        prepaidAmount !== null ? `事前決済額: ${prepaidAmount}円` : null,
        paymentDue !== null ? `支払予定額: ${paymentDue}円` : null
      ].filter(Boolean).join("\n"),
      outcome: existing ? "予約更新" : "予約登録",
      nextAction: "予約内容と顧客情報を確認する",
      scheduledFollowUp: parsed.value.scheduledAt
    }
  });

  return {
    ok: true as const,
    appointment,
    customerCreated,
    duplicate: Boolean(existing),
    month: monthParam(parsed.value.scheduledAt),
    parsed: parsed.value
  };
}
