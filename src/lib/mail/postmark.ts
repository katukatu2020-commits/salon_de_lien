import "server-only";

type PostmarkMessage = {
  to: string;
  subject: string;
  textBody: string;
  htmlBody: string;
  tag?: string;
  metadata?: Record<string, string>;
};

export async function sendPostmarkMessage(message: PostmarkMessage) {
  const token = process.env.POSTMARK_SERVER_TOKEN?.trim();
  const from = process.env.POSTMARK_FROM_EMAIL?.trim();
  if (!token || !from) throw new Error("Postmark is not configured");

  const response = await fetch("https://api.postmarkapp.com/email", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-Postmark-Server-Token": token
    },
    body: JSON.stringify({
      From: `${process.env.POSTMARK_FROM_NAME?.trim() || "Salon de Lien"} <${from}>`,
      To: message.to,
      ReplyTo: process.env.POSTMARK_REPLY_TO?.trim() || undefined,
      Subject: message.subject,
      TextBody: message.textBody,
      HtmlBody: message.htmlBody,
      MessageStream: process.env.POSTMARK_TRANSACTIONAL_STREAM?.trim() || "outbound",
      Tag: message.tag,
      Metadata: message.metadata
    }),
    cache: "no-store"
  });

  const result = (await response.json().catch(() => null)) as
    | { ErrorCode?: number; Message?: string; MessageID?: string }
    | null;
  if (!response.ok || result?.ErrorCode) {
    throw new Error(`Postmark rejected the message (${response.status}): ${result?.Message || "unknown error"}`);
  }
  return result?.MessageID || null;
}
