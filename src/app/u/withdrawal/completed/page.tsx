import Link from "next/link";

export default function CustomerWithdrawalCompletedPage() {
  return (
    <main className="min-h-screen bg-[#fbf7f2] px-5 py-12 text-[#2f2a25]">
      <section className="mx-auto max-w-xl rounded-[28px] border border-[#eadfd5] bg-white p-7 text-center shadow-[0_20px_60px_rgba(96,67,54,.10)] sm:p-10">
        <p className="text-xs font-semibold tracking-[.18em] text-[#a35a4a]">ORIMIA</p>
        <h1 className="mt-3 font-serif text-3xl">退会が完了しました</h1>
        <p className="mt-5 leading-8 text-[#655b54]">これまでORIMIAをご利用いただき、ありがとうございました。</p>
        <Link href="/" className="mt-7 flex min-h-12 items-center justify-center rounded-full bg-[#8f4f42] px-6 font-semibold text-white">トップページへ</Link>
      </section>
    </main>
  );
}
