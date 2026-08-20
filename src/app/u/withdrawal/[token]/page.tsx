import Link from "next/link";
import { hashCustomerWithdrawalToken, isCustomerWithdrawalToken } from "@/lib/auth/customer-withdrawal";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function CustomerWithdrawalConfirmationPage({ params }: { params: { token: string } }) {
  const token = params.token;
  const requestRow = isCustomerWithdrawalToken(token)
    ? await prisma.customerWithdrawalRequest.findUnique({
        where: { tokenHash: hashCustomerWithdrawalToken(token) },
        include: { customer: { select: { name: true, deletedAt: true } }, appUser: { select: { active: true } } }
      })
    : null;
  const valid = Boolean(
    requestRow && !requestRow.usedAt && requestRow.expiresAt > new Date() && !requestRow.customer.deletedAt && requestRow.appUser.active
  );

  return (
    <main className="min-h-screen bg-[#fbf7f2] px-5 py-12 text-[#2f2a25]">
      <section className="mx-auto max-w-xl rounded-[28px] border border-[#eadfd5] bg-white p-7 shadow-[0_20px_60px_rgba(96,67,54,.10)] sm:p-10">
        <p className="text-xs font-semibold tracking-[.18em] text-[#a35a4a]">SALON DE LIEN</p>
        <h1 className="mt-3 font-serif text-3xl">{valid ? "退会手続きの確認" : "リンクを確認できません"}</h1>
        {valid ? (
          <>
            <p className="mt-5 leading-8 text-[#655b54]">
              {requestRow!.customer.name} 様のアカウントを退会します。退会後はログインできず、SMS等の通知も停止します。
            </p>
            <div className="mt-6 rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-sm leading-7 text-red-900">
              この操作は取り消せません。予約・会計など法令・店舗運営上必要な履歴は、退会済みとして保護された状態で保持されます。
            </div>
            <form action="/api/customer-auth/withdrawal/confirm" method="post" className="mt-7">
              <input type="hidden" name="token" value={token} />
              <button type="submit" className="min-h-12 w-full rounded-full bg-[#9f3f44] px-6 font-semibold text-white hover:bg-[#89343a]">
                退会を確定する
              </button>
            </form>
            <Link href="/u/profile" className="mt-4 flex min-h-12 items-center justify-center rounded-full border border-[#dfd1c5] font-semibold">
              退会せず戻る
            </Link>
          </>
        ) : (
          <>
            <p className="mt-5 leading-8 text-[#655b54]">このリンクは無効、使用済み、または有効期限切れです。必要な場合はマイページからもう一度申請してください。</p>
            <Link href="/u/login" className="mt-7 flex min-h-12 items-center justify-center rounded-full bg-[#8f4f42] px-6 font-semibold text-white">ログイン画面へ</Link>
          </>
        )}
      </section>
    </main>
  );
}
