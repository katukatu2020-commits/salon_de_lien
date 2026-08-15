import Link from "next/link";
import { KeyRound, Mail, ShieldCheck } from "lucide-react";
import type { PasswordResetAudience } from "@/lib/auth/password-reset";

export function PasswordResetRequestPage({
  audience,
  sent = false
}: {
  audience: PasswordResetAudience;
  sent?: boolean;
}) {
  const isAdmin = audience === "admin";
  const loginHref = isAdmin ? "/admin/login" : "/u/login";

  return (
    <main className="grid min-h-screen place-items-center bg-[#fbf7f0] px-4 py-8 text-[#2f2a25]">
      <section className="w-full max-w-md rounded-[26px] border border-[#e8ded2] bg-white p-6 shadow-[0_20px_60px_rgba(47,42,37,0.09)] sm:p-8">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#f6efe6] text-[#8f4f42]">
          <KeyRound className="h-5 w-5" />
        </span>
        <p className="mt-5 text-sm font-semibold text-[#8f4f42]">{isAdmin ? "店舗スタッフ用" : "お客様アプリ"}</p>
        <h1 className="mt-1 text-2xl font-semibold">ログイン情報を再設定</h1>
        <p className="mt-3 text-sm leading-7 text-[#7c7168]">
          登録済みのメールアドレスへ、ログインIDとパスワード再設定用のURLを送ります。
        </p>

        {sent ? (
          <div role="status" className="mt-5 rounded-2xl border border-[#bfd5c1] bg-[#f2f8f2] px-4 py-4 text-sm leading-6 text-[#3f6144]">
            該当するアカウントがある場合、再設定メールを送信しました。受信箱と迷惑メールをご確認ください。
          </div>
        ) : null}

        <form action="/api/auth/password-reset/request" method="post" className="mt-6 grid gap-4">
          <input type="hidden" name="audience" value={audience} />
          <label className="grid gap-2 text-sm font-semibold">
            登録メールアドレス
            <span className="relative">
              <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8b8178]" />
              <input
                name="email"
                type="email"
                autoComplete="email"
                required
                className="h-12 w-full rounded-xl border border-[#e8ded2] bg-white pl-11 pr-4 text-base outline-none transition focus:border-[#8f4f42] focus:ring-4 focus:ring-[#e9c9be]/40"
                placeholder="example@email.com"
              />
            </span>
          </label>
          <button type="submit" className="inline-flex h-12 items-center justify-center rounded-full bg-[#8f4f42] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#7d453a] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#e9c9be]">
            再設定メールを送る
          </button>
        </form>

        <div className="mt-5 flex gap-2 rounded-2xl bg-[#f6efe6] px-4 py-3 text-xs leading-5 text-[#6b5f56]">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#718b72]" />
          メールアドレスが登録されているかどうかは画面上に表示しません。再設定URLは30分間、一度だけ有効です。
        </div>
        <Link href={loginHref} className="mt-5 inline-flex min-h-11 w-full items-center justify-center text-sm font-semibold text-[#8f4f42] hover:text-[#5b332c]">
          ログイン画面に戻る
        </Link>
      </section>
    </main>
  );
}
