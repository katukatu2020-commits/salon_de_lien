import Link from "next/link";
import { ArrowLeft, Save, UserPlus } from "lucide-react";
import { TextAreaField, TextField, SelectField, SubmitButton } from "@/components/ui";
import { createCustomer } from "@/lib/actions";

export default function NewCustomerPage() {
  return (
    <div className="mx-auto grid w-full max-w-4xl gap-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link href="/customers" className="inline-flex items-center gap-2 text-sm font-semibold text-teal-800 hover:text-teal-950">
            <ArrowLeft className="h-4 w-4" />
            顧客一覧へ戻る
          </Link>
          <h1 className="mt-3 text-2xl font-semibold text-stone-950">新規顧客登録</h1>
          <p className="mt-1 text-sm text-stone-600">最初は基本情報だけで登録できます。好みや髪質は詳細画面で追記できます。</p>
        </div>
      </div>

      <section className="rounded-lg border border-stone-200 bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b border-stone-100 px-5 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-50 text-teal-800">
            <UserPlus className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-semibold text-stone-950">基本情報</h2>
            <p className="mt-1 text-xs text-stone-500">来店時にすぐ確認する情報を入力してください。</p>
          </div>
        </div>

        <form action={createCustomer} className="grid gap-5 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="名前" name="name" required />
            <SelectField label="性別" name="gender" options={["男性", "女性", "その他", "未回答"]} />
            <TextField label="生年" name="birthYear" type="number" placeholder="例: 1985" />
            <TextField label="電話番号" name="phone" placeholder="例: 090-1234-5678" />
          </div>
          <TextAreaField label="メモ" name="memo" placeholder="髪質、会話メモ、接客時の注意点など" />
          <div className="flex flex-col-reverse gap-3 border-t border-stone-100 pt-5 sm:flex-row sm:justify-end">
            <Link
              href="/customers"
              className="inline-flex h-11 items-center justify-center rounded-md border border-stone-200 bg-stone-50 px-5 text-sm font-semibold text-stone-700 shadow-sm hover:bg-stone-100"
            >
              キャンセル
            </Link>
            <SubmitButton>
              <span className="inline-flex items-center gap-2">
                <Save className="h-4 w-4" />
                登録する
              </span>
            </SubmitButton>
          </div>
        </form>
      </section>
    </div>
  );
}
