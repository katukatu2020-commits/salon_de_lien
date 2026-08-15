import { NextRequest, NextResponse } from "next/server";
import { importReservationEmail } from "@/lib/appointments/import-reservation-email";
import { requireBackofficeSession } from "@/lib/auth/authorization";

export async function POST(request: NextRequest) {
  const session = await requireBackofficeSession(["ADMIN", "STAFF"]);
  if (!session.organizationId) {
    return NextResponse.json({ success: false, error: "店舗所属が設定されていません。" }, { status: 403 });
  }
  let body: { subject?: unknown; content?: unknown; messageId?: unknown };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ success: false, error: "メール内容を読み取れませんでした。" }, { status: 400 });
  }

  const content = typeof body.content === "string" ? body.content.trim() : "";
  if (!content) {
    return NextResponse.json({ success: false, error: "予約メールの本文を入力してください。" }, { status: 400 });
  }

  if (content.length > 100_000) {
    return NextResponse.json({ success: false, error: "メール本文が長すぎます。" }, { status: 413 });
  }

  const result = await importReservationEmail({
    subject: typeof body.subject === "string" ? body.subject : null,
    content,
    messageId: typeof body.messageId === "string" ? body.messageId : null
  }, session.organizationId);

  if (!result.ok) {
    return NextResponse.json({ success: false, error: result.errors.join(" ") }, { status: 422 });
  }

  return NextResponse.json({
    success: true,
    appointmentId: result.appointment.id,
    customerId: result.appointment.customer.id,
    customerName: result.appointment.customer.name,
    scheduledAt: result.appointment.scheduledAt,
    month: result.month,
    customerCreated: result.customerCreated,
    duplicate: result.duplicate
  });
}
