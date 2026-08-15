import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  KANZASHI_SENDER_EMAIL,
  KANZASHI_SENDER_NAME
} from "@/lib/appointments/gmail-browser-bridge";
import { importReservationEmail } from "@/lib/appointments/import-reservation-email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type BrowserIngestBody = {
  subject?: unknown;
  content?: unknown;
  messageId?: unknown;
  senderName?: unknown;
  senderEmail?: unknown;
};

function authorized(request: NextRequest) {
  const expected = process.env.GMAIL_BROWSER_INGEST_SECRET?.trim();
  const actual = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  if (!expected || !actual) return false;

  const expectedBytes = Buffer.from(expected, "utf8");
  const actualBytes = Buffer.from(actual, "utf8");
  return expectedBytes.length === actualBytes.length && timingSafeEqual(expectedBytes, actualBytes);
}

function textValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: NextRequest) {
  if (!process.env.GMAIL_BROWSER_INGEST_SECRET?.trim()) {
    return NextResponse.json(
      { success: false, error: "ブラウザ連携用の秘密鍵が未設定です。" },
      { status: 503 }
    );
  }

  if (!authorized(request)) {
    return NextResponse.json({ success: false, error: "認証できません。" }, { status: 401 });
  }

  let body: BrowserIngestBody;
  try {
    body = (await request.json()) as BrowserIngestBody;
  } catch {
    return NextResponse.json({ success: false, error: "メール情報を読み取れませんでした。" }, { status: 400 });
  }

  const senderName = textValue(body.senderName);
  const senderEmail = textValue(body.senderEmail).toLowerCase();
  const subject = textValue(body.subject);
  const content = textValue(body.content);
  const messageId = textValue(body.messageId);

  if (senderName !== KANZASHI_SENDER_NAME || senderEmail !== KANZASHI_SENDER_EMAIL) {
    return NextResponse.json(
      { success: false, error: "かんざし結の予約メール以外は取り込めません。" },
      { status: 422 }
    );
  }

  if (!/^[a-f0-9]{8,64}$/i.test(messageId)) {
    return NextResponse.json({ success: false, error: "GmailメッセージIDが不正です。" }, { status: 422 });
  }

  if (!subject || subject.length > 500 || !content || content.length > 100_000) {
    return NextResponse.json({ success: false, error: "予約メールの件名または本文が不正です。" }, { status: 422 });
  }

  const result = await importReservationEmail(
    { subject, content, messageId, sender: `${senderName} <${senderEmail}>` },
    process.env.GMAIL_BROWSER_INGEST_ORGANIZATION_ID ?? process.env.DEFAULT_ORGANIZATION_ID
  );
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
