"use client";

import { useState } from "react";
import { CheckCircle2, LoaderCircle, MessageSquareText, RotateCcw } from "lucide-react";

type RequestPayload = {
  challengeId?: string;
  maskedPhone?: string;
  developmentCode?: string;
  error?: string;
};

type VerifyPayload = {
  registrationToken?: string;
  maskedPhone?: string;
  error?: string;
};

export function CustomerPhoneVerificationField() {
  const [phone, setPhone] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [registrationToken, setRegistrationToken] = useState("");
  const [code, setCode] = useState("");
  const [maskedPhone, setMaskedPhone] = useState("");
  const [message, setMessage] = useState("");
  const [developmentCode, setDevelopmentCode] = useState("");
  const [busy, setBusy] = useState<"send" | "verify" | null>(null);

  const verified = Boolean(challengeId && registrationToken);

  function resetVerification(nextPhone = phone) {
    setPhone(nextPhone);
    setChallengeId("");
    setRegistrationToken("");
    setCode("");
    setMaskedPhone("");
    setDevelopmentCode("");
    setMessage("");
  }

  async function requestCode() {
    setBusy("send");
    setMessage("");
    try {
      const response = await fetch("/api/customer-auth/phone-verification/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone })
      });
      const payload = (await response.json()) as RequestPayload;
      if (!response.ok || !payload.challengeId) throw new Error(payload.error || "認証コードを送信できませんでした。");
      setChallengeId(payload.challengeId);
      setRegistrationToken("");
      setMaskedPhone(payload.maskedPhone || "入力した番号");
      setDevelopmentCode(payload.developmentCode || "");
      setCode("");
      setMessage(`${payload.maskedPhone || "入力した番号"}へ認証コードを送信しました。`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "認証コードを送信できませんでした。");
    } finally {
      setBusy(null);
    }
  }

  async function verifyCode() {
    setBusy("verify");
    setMessage("");
    try {
      const response = await fetch("/api/customer-auth/phone-verification/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId, code })
      });
      const payload = (await response.json()) as VerifyPayload;
      if (!response.ok || !payload.registrationToken) throw new Error(payload.error || "認証コードを確認できませんでした。");
      setRegistrationToken(payload.registrationToken);
      setMaskedPhone(payload.maskedPhone || maskedPhone);
      setMessage("電話番号を確認しました。このままプロフィール登録へ進めます。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "認証コードを確認できませんでした。");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="grid gap-3 sm:col-span-2">
      <input type="hidden" name="phoneVerificationId" value={challengeId} />
      <input type="hidden" name="phoneVerificationToken" value={registrationToken} />
      <div className="grid gap-1.5 text-sm font-semibold">
        <label htmlFor="customer-registration-phone">携帯電話番号</label>
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
          <input
            id="customer-registration-phone"
            name="phone"
            value={phone}
            onChange={(event) => resetVerification(event.target.value)}
            inputMode="tel"
            autoComplete="tel"
            required
            readOnly={verified}
            placeholder="例: 090-1234-5678"
            className="lien-input"
          />
          {verified ? (
            <button type="button" onClick={() => resetVerification()} className="lien-button-secondary min-h-11 px-4">
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              番号を変更
            </button>
          ) : (
            <button type="button" onClick={requestCode} disabled={busy !== null || phone.trim().length === 0} className="lien-button-secondary min-h-11 px-4 disabled:cursor-wait disabled:opacity-60">
              {busy === "send" ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <MessageSquareText className="h-4 w-4" aria-hidden="true" />}
              {challengeId ? "コードを再送" : "認証コードを送信"}
            </button>
          )}
        </div>
      </div>

      {challengeId && !verified ? (
        <div className="grid gap-2 rounded-2xl border border-[#e8ded2] bg-[#fbf7f0] p-4">
          <div className="grid gap-1.5 text-sm font-semibold">
            <label htmlFor="customer-registration-sms-code">SMS認証コード</label>
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
              <input
                id="customer-registration-sms-code"
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                placeholder="6桁のコード"
                className="lien-input font-mono tracking-[0.25em]"
              />
              <button type="button" onClick={verifyCode} disabled={busy !== null || code.length !== 6} className="lien-button-primary min-h-11 px-5 disabled:cursor-wait disabled:opacity-60">
                {busy === "verify" ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                コードを確認
              </button>
            </div>
          </div>
          {developmentCode ? <p className="text-xs font-semibold text-amber-800">ローカル確認用コード: {developmentCode}</p> : null}
        </div>
      ) : null}

      {message ? (
        <p role="status" className={`rounded-xl border px-4 py-3 text-sm leading-6 ${verified ? "border-[#b8d5bf] bg-[#edf7ef] text-[#315c3c]" : "border-[#e8ded2] bg-white text-[#5b5149]"}`}>
          {verified ? <CheckCircle2 className="mr-2 inline h-4 w-4" aria-hidden="true" /> : null}
          {message}
        </p>
      ) : null}
    </div>
  );
}
