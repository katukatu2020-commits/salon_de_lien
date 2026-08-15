import Link from "next/link";
import { KeyRound } from "lucide-react";
import type { PasswordResetAudience } from "@/lib/auth/password-reset";

const errorMessages: Record<string, string> = {
  invalid: "この再設定URLは無効か、有効期限が切れています。もう一度メールを送信してください。",
  password: "パスワードは8〜72文字で入力してください。",
  mismatch: "確認用パスワードが一致しません。"
};

export function PasswordResetConfirmPage({
  audience,
  token,
  error
}: {
  audience: PasswordResetAudience;
  token: string;
  error?: string;
}) {
  const requestHref = audience === "admin" ? "/admin/password-reset" : "/u/password-reset";
  const message = error ? errorMessages[error] : null;

  return (
    <main className="grid min-h-screen place-items-center bg-[#fbf7f0] px-4 py-8 text-[#2f2a25]">
      <section className="w-full max-w-md rounded-[26px] border border-[#e8ded2] bg-white p-6 shadow-[0_20px_60px_rgba(47,42,37,0.09)] sm:p-8">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#f6efe6] text-[#8f4f42]"><KeyRound className="h-5 w-5" /></span>
        <h1 className="mt-5 text-2xl font-semibold">新しいパスワードを設定</h1>
        <p className="mt-3 text-sm leading-7 text-[#7c7168]">8文字以上の新しいパスワードを入力してください。</p>
        {message ? <p role="alert" className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-800">{message}</p> : null}
        <form action="/api/auth/password-reset/confirm" method="post" className="mt-6 grid gap-4">
          <input type="hidden" name="audience" value={audience} />
          <input type="hidden" name="token" value={token} />
          <label className="grid gap-2 text-sm font-semibold">新しいパスワード<input name="password" type="password" minLength={8} maxLength={72} autoComplete="new-password" required className="h-12 rounded-xl border border-[#e8ded2] bg-white px-4 text-base outline-none transition focus:border-[#8f4f42] focus:ring-4 focus:ring-[#e9c9be]/40" /></label>
          <label className="grid gap-2 text-sm font-semibold">新しいパスワード（確認）<input name="confirmPassword" type="password" minLength={8} maxLength={72} autoComplete="new-password" required className="h-12 rounded-xl border border-[#e8ded2] bg-white px-4 text-base outline-none transition focus:border-[#8f4f42] focus:ring-4 focus:ring-[#e9c9be]/40" /></label>
          <button type="submit" className="inline-flex h-12 items-center justify-center rounded-full bg-[#8f4f42] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#7d453a] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#e9c9be]">パスワードを変更する</button>
        </form>
        <Link href={requestHref} className="mt-5 inline-flex min-h-11 w-full items-center justify-center text-sm font-semibold text-[#8f4f42] hover:text-[#5b332c]">再設定メールを送り直す</Link>
      </section>
    </main>
  );
}
