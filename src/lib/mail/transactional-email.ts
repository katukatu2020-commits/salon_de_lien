type TransactionalEmailDetail = {
  label: string;
  value: string;
};

type TransactionalEmailInput = {
  preheader: string;
  eyebrow: string;
  title: string;
  greeting?: string;
  lead: string;
  details?: TransactionalEmailDetail[];
  actionLabel: string;
  actionUrl: string;
  notice: string;
  securityMessage: string;
};

export function escapeEmailHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]!);
}

export function renderTransactionalEmail(input: TransactionalEmailInput) {
  const actionUrl = escapeEmailHtml(input.actionUrl);
  const detailRows = (input.details ?? []).map(({ label, value }) => `
    <tr>
      <td style="padding:7px 0;color:#7c7168;font-size:13px;line-height:1.6;vertical-align:top;width:120px;">${escapeEmailHtml(label)}</td>
      <td style="padding:7px 0;color:#2f2a25;font-size:14px;font-weight:600;line-height:1.6;vertical-align:top;word-break:break-word;">${escapeEmailHtml(value)}</td>
    </tr>`).join("");

  return `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>${escapeEmailHtml(input.title)}</title>
  </head>
  <body style="margin:0;padding:0;background:#f7f3ef;color:#2f2a25;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Noto Sans JP','Hiragino Kaku Gothic ProN',Meiryo,sans-serif;-webkit-font-smoothing:antialiased;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeEmailHtml(input.preheader)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#f7f3ef;">
      <tr>
        <td align="center" style="padding:28px 14px 36px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;">
            <tr>
              <td style="padding:0 4px 16px;color:#5b332c;font-size:18px;font-weight:700;letter-spacing:0;">Salon de Lien</td>
            </tr>
            <tr>
              <td style="overflow:hidden;border:1px solid #e8ded2;border-radius:20px;background:#ffffff;box-shadow:0 12px 32px rgba(47,42,37,.06);">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr><td style="height:6px;background:#8f4f42;font-size:0;line-height:0;">&nbsp;</td></tr>
                  <tr>
                    <td style="padding:34px 34px 30px;">
                      <p style="margin:0 0 10px;color:#8f4f42;font-size:12px;font-weight:700;line-height:1.5;">${escapeEmailHtml(input.eyebrow)}</p>
                      <h1 style="margin:0;color:#2f2a25;font-size:25px;font-weight:700;line-height:1.45;letter-spacing:0;">${escapeEmailHtml(input.title)}</h1>
                      ${input.greeting ? `<p style="margin:24px 0 0;color:#2f2a25;font-size:15px;line-height:1.8;">${escapeEmailHtml(input.greeting)}</p>` : ""}
                      <p style="margin:18px 0 0;color:#5f554e;font-size:15px;line-height:1.9;">${escapeEmailHtml(input.lead)}</p>
                      ${detailRows ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:22px;padding:12px 18px;border:1px solid #eadfd5;border-radius:12px;background:#fbf7f0;">${detailRows}</table>` : ""}
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin-top:28px;">
                        <tr>
                          <td align="center" style="border-radius:999px;background:#8f4f42;">
                            <a href="${actionUrl}" style="display:inline-block;padding:14px 26px;color:#ffffff;font-size:15px;font-weight:700;line-height:1.4;text-decoration:none;">${escapeEmailHtml(input.actionLabel)}</a>
                          </td>
                        </tr>
                      </table>
                      <p style="margin:20px 0 0;color:#7c7168;font-size:12px;line-height:1.8;word-break:break-all;">ボタンを押せない場合は、次のURLをブラウザへ貼り付けてください。<br><a href="${actionUrl}" style="color:#8f4f42;text-decoration:underline;">${actionUrl}</a></p>
                      <div style="margin-top:24px;padding:16px 18px;border-left:4px solid #d8b56d;border-radius:8px;background:#fffaf0;">
                        <p style="margin:0;color:#5b5149;font-size:13px;font-weight:600;line-height:1.8;">${escapeEmailHtml(input.notice)}</p>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td style="border-top:1px solid #eee5dc;background:#fbf8f5;padding:22px 34px;">
                      <p style="margin:0;color:#7c7168;font-size:12px;line-height:1.8;">${escapeEmailHtml(input.securityMessage)}</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 8px 0;text-align:center;color:#8b8178;font-size:11px;line-height:1.7;">このメールはSalon de Lienの手続きに伴い自動送信されています。<br>このメールへの返信ではお手続きを承れません。</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
