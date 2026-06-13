import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

export default function IntakeThanksPage() {
  return (
    <main className="min-h-screen bg-[#f8f5ef] text-stone-900">
      <section className="mx-auto flex min-h-screen w-full max-w-2xl items-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="w-full rounded-lg border border-teal-200 bg-white p-6 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-teal-50 text-teal-800">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-2xl font-semibold text-stone-950">相談内容を受け付けました</h1>
          <p className="mt-3 text-sm leading-7 text-stone-600">
            スタッフが内容を確認し、髪の悩み、希望の雰囲気、予約候補に合わせてご連絡します。
          </p>
          <div className="mt-5 grid gap-2 text-left">
            {["似合う方向性と必要メニュー", "目安料金と所要時間", "予約候補または空き枠案内", "家での扱いやすさ・色持ち"].map((item) => (
              <div key={item} className="rounded-md border border-stone-200 bg-[#fbf8f3] px-3 py-2 text-xs font-semibold text-stone-800">
                {item}
              </div>
            ))}
          </div>
          <Link
            href="/intake"
            className="mt-5 inline-flex h-10 items-center justify-center rounded-md border border-teal-200 bg-teal-50 px-4 text-sm font-semibold text-teal-900 hover:bg-teal-100"
          >
            相談フォームに戻る
          </Link>
        </div>
      </section>
    </main>
  );
}
