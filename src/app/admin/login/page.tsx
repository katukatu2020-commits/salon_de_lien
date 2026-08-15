import Link from "next/link";
import { ArrowRight, LockKeyhole, ShieldCheck } from "lucide-react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from "@/lib/auth/admin-session";
import { BrandVisual } from "@/components/lien/brand-visual";

export const dynamic = "force-dynamic";

const errors: Record<string, string> = {
  credentials: "メールアドレス・IDまたはパスワードが正しくありません。",
  locked: "試行回数が上限に達しました。15分後にもう一度お試しください。",
  config: "管理画面認証が未設定です。セットアップを完了してください。"
};

function safeNext(value: string | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/admin/customers";
  return value;
}

export default async function AdminLoginPage({
  searchParams
}: {
  searchParams?: { error?: string; next?: string; loggedOut?: string; reset?: string; account?: string };
}) {
  const nextPath = safeNext(searchParams?.next);
  const currentSession = await verifyAdminSessionToken(
    cookies().get(ADMIN_SESSION_COOKIE)?.value,
    process.env.ADMIN_AUTH_SECRET
  );
  if (currentSession) redirect(nextPath);
  const errorMessage = searchParams?.error ? errors[searchParams.error] : null;

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[#fbf7f0] px-4 py-10 text-[#2f2a25]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(216,181,109,0.18),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(143,79,66,0.14),transparent_36%)]" />
      <section className="relative grid w-full max-w-5xl overflow-hidden rounded-[28px] border border-[#e8ded2] bg-white shadow-[0_24px_70px_rgba(47,42,37,0.12)] lg:grid-cols-[minmax(0,1.05fr)_minmax(24rem,0.95fr)]">
        <BrandVisual variant="customerCrm" className="h-52 lg:h-full lg:min-h-[620px]" imageClassName="object-[67%_52%]" sizes="(max-width: 1023px) 100vw, 520px" priority overlay="strong">
          <div className="flex h-full items-end p-6 sm:p-8"><div className="max-w-sm text-white"><p className="text-xs font-semibold">Salon de Lien CRM</p><p className="mt-2 text-2xl font-semibold leading-tight">接客の記録を、次のご来店へつなげる。</p></div></div>
        </BrandVisual>
        <div className="p-6 sm:p-8 lg:p-10">
          <div className="flex items-center gap-3"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#8f4f42] text-lg font-semibold text-white shadow-sm">L</span><div><p className="text-lg font-semibold">Salon de Lien</p><p className="text-xs font-medium text-[#7c7168]">スタッフ管理画面</p></div></div>
          <div className="mt-8"><div className="flex items-center gap-2 text-sm font-semibold text-[#8f4f42]"><LockKeyhole className="h-4 w-4" />安全なログイン</div><h1 className="mt-3 text-2xl font-semibold">管理画面にログイン</h1><p className="mt-2 text-sm leading-6 text-[#7c7168]">顧客情報・予約・商品・ポイントを扱う、店舗スタッフ専用の画面です。</p></div>
          {errorMessage ? <div role="alert" className="mt-5 rounded-2xl border border-[#efc7c1] bg-[#fff4f2] px-4 py-3 text-sm font-medium text-[#8b342b]">{errorMessage}</div> : null}
          {searchParams?.loggedOut ? <div className="mt-5 rounded-2xl border border-[#cddfce] bg-[#f2f8f2] px-4 py-3 text-sm font-medium text-[#466349]">ログアウトしました。</div> : null}
          {searchParams?.reset === "1" ? <div className="mt-5 rounded-2xl border border-[#cddfce] bg-[#f2f8f2] px-4 py-3 text-sm font-medium text-[#466349]">パスワードを変更しました。新しいパスワードでログインしてください。</div> : null}
          {searchParams?.account === "updated" ? <div className="mt-5 rounded-2xl border border-[#cddfce] bg-[#f2f8f2] px-4 py-3 text-sm font-medium text-[#466349]">ログイン情報を変更しました。新しいID・パスワードでログインしてください。</div> : null}
          <form action="/api/auth/login" method="post" className="mt-6 grid gap-4">
            <input type="hidden" name="next" value={nextPath} />
            <label className="grid gap-2 text-sm font-semibold">メールアドレスまたはID<input name="email" type="text" autoComplete="username" required className="h-12 rounded-2xl border border-[#e8ded2] bg-white px-4 text-base outline-none transition placeholder:text-[#b0a49a] focus:border-[#8f4f42] focus:ring-4 focus:ring-[#e9c9be]/45" placeholder="メールアドレスまたはID" /></label>
            <label className="grid gap-2 text-sm font-semibold">パスワード<input name="password" type="password" autoComplete="current-password" required minLength={4} maxLength={256} className="h-12 rounded-2xl border border-[#e8ded2] bg-white px-4 text-base outline-none transition placeholder:text-[#b0a49a] focus:border-[#8f4f42] focus:ring-4 focus:ring-[#e9c9be]/45" placeholder="パスワードを入力" /></label>
            <button type="submit" className="mt-2 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#8f4f42] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#7d453a] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#e9c9be]">ログイン<ArrowRight className="h-4 w-4" /></button>
          </form>
          <Link href="/admin/password-reset" className="mt-3 inline-flex min-h-11 w-full items-center justify-center text-sm font-semibold text-[#8f4f42] hover:text-[#5b332c]">ID・パスワードを忘れた方</Link>
          <div className="mt-4 flex items-start gap-3 rounded-2xl bg-[#f6efe6] px-4 py-3 text-xs leading-5 text-[#6b5f56]"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#718b72]" />共用端末では、利用後に必ずログアウトしてください。</div>
        </div>
      </section>
    </main>
  );
}
