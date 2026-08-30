import Link from "next/link";
import { redirect } from "next/navigation";
import { KeyRound, LockKeyhole, Sparkles, UserPlus } from "lucide-react";
import { BrandVisual } from "@/components/lien/brand-visual";
import { getCurrentCustomerSession } from "@/lib/auth/current-customer";

const errorMessages: Record<string, string> = {
  credentials: "ログインID・メールアドレスまたはパスワードが正しくありません。",
  locked: "入力回数が上限に達しました。15分ほど待ってからお試しください。",
  config: "ログイン設定を確認しています。店舗スタッフへお声がけください。"
};

export default async function CustomerLoginPage({
  searchParams
}: {
  searchParams?: { error?: string; next?: string; loginId?: string; loggedOut?: string; registered?: string; reset?: string; account?: string };
}) {
  const session = await getCurrentCustomerSession();
  if (session) redirect("/u/home");
  const error = searchParams?.error ? errorMessages[searchParams.error] : null;
  const requestedNext = searchParams?.next ?? "";
  const nextPath = ["/u/home", "/u/appointments", "/u/points", "/u/history", "/u/profile", "/u/reviews", "/u/messages"].includes(requestedNext) || /^\/u\/reviews\/[a-z0-9_-]+$/i.test(requestedNext) ? requestedNext : "/u/home";

  return (
    <main className="min-h-screen bg-[#fbf7f0] px-4 py-6 text-[#2f2a25] sm:py-10 lg:grid lg:place-items-center lg:px-8">
      <section className="mx-auto grid w-full max-w-5xl gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(400px,0.9fr)] lg:items-stretch">
        <BrandVisual variant="customerCare" className="h-56 overflow-hidden rounded-[24px] border border-[#e8ded2] shadow-[0_18px_50px_rgba(47,42,37,0.08)] lg:h-auto lg:min-h-[640px]" imageClassName="object-[62%_50%]" sizes="(max-width: 1023px) 100vw, 560px" priority overlay="none">
          <div className="flex h-full flex-col justify-between bg-gradient-to-r from-[#fffdf9]/95 via-[#fffdf9]/70 to-transparent p-6"><span className="grid h-11 w-11 place-items-center rounded-full bg-[#8f4f42] text-white shadow-sm"><Sparkles className="h-5 w-5" /></span><div><p className="text-2xl font-semibold">Salon de Lien</p><p className="mt-2 max-w-52 text-sm font-medium leading-6 text-[#5b5149]">髪の記録とポイントを、いつでもあなたの手元に。</p></div></div>
        </BrandVisual>
        <section className="rounded-[24px] border border-[#e8ded2] bg-white p-5 shadow-[0_18px_50px_rgba(47,42,37,0.07)] sm:p-6 lg:flex lg:flex-col lg:justify-center lg:p-10">
          <p className="text-sm font-semibold text-[#8f4f42]">お客様専用</p><h1 className="mt-1 text-2xl font-semibold">ログイン</h1><p className="mt-2 text-sm leading-6 text-[#7c7168]">登録したログインIDまたはメールアドレスとパスワードを入力してください。</p>
          {error ? <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-800">{error}</p> : null}
          {searchParams?.registered === "1" ? <p className="mt-4 rounded-xl border border-[#b8d5bf] bg-[#edf7ef] px-4 py-3 text-sm leading-6 text-[#315c3c]">登録が完了しました。設定したIDまたは登録メールアドレスとパスワードでログインできます。</p> : null}
          {searchParams?.loggedOut === "1" ? <p className="mt-4 rounded-xl border border-[#e8ded2] bg-[#f6efe6] px-4 py-3 text-sm text-[#5b5149]">ログアウトしました。</p> : null}
          {searchParams?.reset === "1" ? <p className="mt-4 rounded-xl border border-[#b8d5bf] bg-[#edf7ef] px-4 py-3 text-sm leading-6 text-[#315c3c]">パスワードを変更しました。メールで確認したIDと新しいパスワードでログインしてください。</p> : null}
          {searchParams?.account === "updated" ? <p className="mt-4 rounded-xl border border-[#b8d5bf] bg-[#edf7ef] px-4 py-3 text-sm leading-6 text-[#315c3c]">ログイン情報を変更しました。新しいID・パスワードでログインしてください。</p> : null}
          <form action="/api/customer-auth/login" method="post" className="mt-5 grid gap-4">
            <input type="hidden" name="next" value={nextPath} />
            <label className="grid gap-2 text-sm font-semibold">ログインIDまたはメールアドレス<span className="relative"><KeyRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8b8178]" /><input name="loginId" defaultValue={searchParams?.loginId ?? ""} autoComplete="username" autoCapitalize="none" placeholder="ID または登録メールアドレス" required className="h-12 w-full rounded-xl border border-[#e8ded2] bg-white pl-11 pr-4 text-base outline-none transition focus:border-[#8f4f42] focus:ring-4 focus:ring-[#e9c9be]/40" /></span></label>
            <label className="grid gap-2 text-sm font-semibold">パスワード<span className="relative"><LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8b8178]" /><input name="password" type="password" minLength={8} maxLength={256} autoComplete="current-password" required className="h-12 w-full rounded-xl border border-[#e8ded2] bg-white pl-11 pr-4 text-base outline-none transition focus:border-[#8f4f42] focus:ring-4 focus:ring-[#e9c9be]/40" /></span></label>
            <button type="submit" className="mt-1 inline-flex h-12 items-center justify-center rounded-full bg-[#8f4f42] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#7d453a] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#e9c9be]">ログインする</button>
          </form>
          <Link href="/u/password-reset" className="mt-3 inline-flex min-h-11 w-full items-center justify-center text-sm font-semibold text-[#8f4f42] hover:text-[#5b332c]">ID・パスワードを忘れた方</Link>
          <div className="mt-4 border-t border-[#e8ded2] pt-5">
            <p className="text-center text-sm font-semibold text-[#2f2a25]">初めてご利用の方</p>
            <p className="mt-1 text-center text-xs leading-5 text-[#7c7168]">基本情報と髪の特徴を登録して、お客様アカウントを作成します。</p>
            <Link
              href="/u/register"
              className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-[#8f4f42] bg-white px-5 text-sm font-semibold text-[#8f4f42] shadow-sm transition hover:bg-[#fbf3ef] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#e9c9be]"
            >
              <UserPlus className="h-4 w-4" aria-hidden="true" />
              新規アカウントを作成
            </Link>
          </div>
        </section>
        <p className="text-center text-xs leading-5 text-[#7c7168] lg:col-span-2">店舗管理画面とは分離された、お客様専用ページです。</p>
      </section>
    </main>
  );
}
