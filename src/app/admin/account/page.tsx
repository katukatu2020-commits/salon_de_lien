import { KeyRound, LockKeyhole, ShieldCheck, UserRound } from "lucide-react";
import { redirect } from "next/navigation";
import { requireBackofficeSession } from "@/lib/auth/authorization";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const messages: Record<string, string> = {
  current: "現在のパスワードが正しくありません。",
  duplicate: "そのログインIDはすでに使用されています。",
  loginId: "ログインIDは半角英数字と . _ @ + - を使い、4〜80文字で入力してください。",
  password: "新しいパスワードは8文字以上で、確認欄と同じ内容を入力してください。",
  unchanged: "新しいログインIDまたはパスワードを入力してください。",
  unavailable: "このアカウントは画面から変更できません。管理者へ確認してください。",
  failed: "変更を保存できませんでした。時間をおいてもう一度お試しください。"
};

export default async function AdminAccountPage({ searchParams }: { searchParams?: { error?: string } }) {
  const session = await requireBackofficeSession(["ADMIN", "STAFF", "MANUFACTURER"]);
  if (!session.userId) redirect("/admin/customers");
  const user = await prisma.appUser.findUnique({
    where: { id: session.userId },
    select: { displayName: true, email: true, loginId: true, role: true }
  });
  if (!user) redirect("/admin/login");
  const error = searchParams?.error ? messages[searchParams.error] : null;

  return (
    <div className="mx-auto grid w-full max-w-4xl gap-6">
      <header>
        <p className="text-sm font-semibold text-[color:var(--lien-primary)]">My account</p>
        <h1 className="mt-1 text-2xl font-semibold text-lien-ink md:text-3xl">アカウント設定</h1>
        <p className="mt-2 text-sm leading-7 text-lien-muted">右上に表示されるご自身のアカウントについて、ログインIDとパスワードを変更できます。</p>
      </header>

      {error ? <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">{error}</p> : null}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <section className="rounded-[24px] border border-lien bg-white p-5 shadow-lien-sm">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-[#f1dfd7] text-lg font-bold text-[color:var(--lien-primary-dark)]">
            {(user.displayName ?? user.loginId ?? user.email).slice(0, 1)}
          </span>
          <h2 className="mt-4 text-lg font-semibold">{user.displayName ?? "スタッフ"}</h2>
          <dl className="mt-5 grid gap-3 text-sm">
            <div className="rounded-2xl bg-lien-soft px-4 py-3"><dt className="text-xs text-lien-muted">現在のログインID</dt><dd className="mt-1 font-semibold">{user.loginId ?? user.email}</dd></div>
            <div className="rounded-2xl bg-lien-soft px-4 py-3"><dt className="text-xs text-lien-muted">登録メール</dt><dd className="mt-1 break-all font-semibold">{user.email}</dd></div>
          </dl>
        </section>

        <form action="/api/auth/account" method="post" className="rounded-[24px] border border-lien bg-white p-5 shadow-lien-sm sm:p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold"><UserRound className="h-5 w-5 text-[color:var(--lien-primary)]" />ログイン情報を変更</h2>
          <div className="mt-5 grid gap-4">
            <label className="grid gap-2 text-sm font-semibold">新しいログインID
              <span className="relative"><KeyRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-lien-muted" /><input name="newLoginId" defaultValue={user.loginId ?? ""} autoComplete="username" minLength={4} maxLength={80} className="h-12 w-full rounded-xl border border-lien bg-white pl-11 pr-4 outline-none focus:border-[color:var(--lien-primary)] focus:ring-4 focus:ring-[#e9c9be]/40" /></span>
            </label>
            <label className="grid gap-2 text-sm font-semibold">新しいパスワード
              <span className="relative"><LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-lien-muted" /><input name="newPassword" type="password" minLength={8} maxLength={128} autoComplete="new-password" placeholder="変更しない場合は空欄" className="h-12 w-full rounded-xl border border-lien bg-white pl-11 pr-4 outline-none focus:border-[color:var(--lien-primary)] focus:ring-4 focus:ring-[#e9c9be]/40" /></span>
            </label>
            <label className="grid gap-2 text-sm font-semibold">新しいパスワード（確認）
              <input name="newPasswordConfirm" type="password" minLength={8} maxLength={128} autoComplete="new-password" className="h-12 w-full rounded-xl border border-lien bg-white px-4 outline-none focus:border-[color:var(--lien-primary)] focus:ring-4 focus:ring-[#e9c9be]/40" />
            </label>
            <label className="grid gap-2 border-t border-lien pt-4 text-sm font-semibold">現在のパスワード
              <input name="currentPassword" type="password" required maxLength={256} autoComplete="current-password" className="h-12 w-full rounded-xl border border-lien bg-white px-4 outline-none focus:border-[color:var(--lien-primary)] focus:ring-4 focus:ring-[#e9c9be]/40" />
            </label>
          </div>
          <div className="mt-4 flex gap-2 rounded-2xl bg-[#f6efe6] px-4 py-3 text-xs leading-5 text-lien-muted"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--lien-sage)]" />変更後はいったんログアウトします。新しい情報で再度ログインしてください。</div>
          <button type="submit" className="lien-button-primary mt-5 w-full">変更を保存</button>
        </form>
      </div>
    </div>
  );
}
