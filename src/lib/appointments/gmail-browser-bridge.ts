export const KANZASHI_SENDER_NAME = "【かんざし結】受付";
export const KANZASHI_SENDER_EMAIL = "kanzashi@pacificporter.jp";

export type GmailBrowserBridgeConfig = {
  configured: boolean;
  senderName: string;
  senderEmail: string;
  missingEnvironmentVariables: string[];
};

export function getGmailBrowserBridgeConfig(): GmailBrowserBridgeConfig {
  const missingEnvironmentVariables = process.env.GMAIL_BROWSER_INGEST_SECRET?.trim()
    ? []
    : ["GMAIL_BROWSER_INGEST_SECRET"];

  return {
    configured: missingEnvironmentVariables.length === 0,
    senderName: KANZASHI_SENDER_NAME,
    senderEmail: KANZASHI_SENDER_EMAIL,
    missingEnvironmentVariables
  };
}
