import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowLeft,
  Camera,
  ClipboardList,
  Heart,
  Save,
  Scissors,
  UserPlus
} from "lucide-react";
import { TextAreaField, TextField, SelectField, SubmitButton } from "@/components/ui";
import { createCustomer } from "@/lib/actions";

const genderOptions = ["女性", "男性", "その他", "未回答"];
const lengthOptions = ["ショート", "ボブ", "ミディアム", "セミロング", "ロング", "相談したい"];
const styleOptions = ["ナチュラル", "上品", "柔らかい", "大人っぽい", "モード", "扱いやすさ重視"];
const colorOptions = ["地毛に近い", "暗め", "明るめ", "透明感", "白髪ぼかし", "カラーなし"];
const maintenanceOptions = ["低め", "標準", "高めでも可"];
const thicknessOptions = ["細い", "普通", "太い", "混在"];
const volumeOptions = ["少ない", "普通", "多い", "広がりやすい"];
const textureOptions = ["直毛", "ゆるいクセ", "強いクセ", "うねり", "乾燥しやすい"];
const scalpOptions = ["普通", "敏感", "乾燥", "脂っぽい", "かゆみが出やすい"];
const faceShapeOptions = ["丸顔", "面長", "卵型", "ベース型", "逆三角", "未確認"];
const foreheadOptions = ["狭め", "普通", "広め", "前髪で調整したい"];

function FormBlock({
  title,
  caption,
  icon,
  children
}: {
  title: string;
  caption: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-stone-200 bg-white shadow-sm">
      <div className="flex items-center gap-3 border-b border-stone-100 px-5 py-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-50 text-teal-800">
          {icon}
        </div>
        <div>
          <h2 className="font-semibold text-stone-950">{title}</h2>
          <p className="mt-1 text-xs text-stone-500">{caption}</p>
        </div>
      </div>
      <div className="grid gap-4 p-5">{children}</div>
    </section>
  );
}

export default function NewCustomerPage() {
  return (
    <div className="mx-auto grid w-full max-w-6xl gap-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link href="/customers" className="inline-flex items-center gap-2 text-sm font-semibold text-teal-800 hover:text-teal-950">
            <ArrowLeft className="h-4 w-4" />
            顧客一覧へ戻る
          </Link>
          <h1 className="mt-3 text-2xl font-semibold text-stone-950">新規顧客登録</h1>
          <p className="mt-1 text-sm text-stone-600">
            初回カウンセリングの内容をそのまま提案、再来店提案、追客メッセージに使える顧客カルテとして保存します。
          </p>
        </div>
      </div>

      <form action={createCustomer} className="grid gap-5">
        <FormBlock
          title="基本情報"
          caption="予約確認、提案ページ送付、来店後フォローに使う情報です。"
          icon={<UserPlus className="h-5 w-5" />}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="名前" name="name" required />
            <SelectField label="性別" name="gender" options={genderOptions} />
            <TextField label="生年" name="birthYear" type="number" placeholder="例: 1985" />
            <TextField label="電話番号" name="phone" placeholder="例: 090-1234-5678" />
          </div>
        </FormBlock>

        <div className="grid gap-5 lg:grid-cols-2">
          <FormBlock
            title="髪質と骨格"
            caption="似合わせ精度と施術前の注意点に直結する情報です。"
            icon={<Scissors className="h-5 w-5" />}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField label="髪の太さ" name="hairThickness" options={thicknessOptions} />
              <SelectField label="髪量" name="hairVolume" options={volumeOptions} />
              <SelectField label="髪質" name="hairTexture" options={textureOptions} />
              <SelectField label="頭皮状態" name="scalpCondition" options={scalpOptions} />
              <SelectField label="顔型" name="faceShape" options={faceShapeOptions} />
              <SelectField label="額・前髪" name="forehead" options={foreheadOptions} />
              <TextField label="朝のスタイリング時間" name="stylingTimeMinutes" type="number" placeholder="例: 10" />
            </div>
            <TextAreaField label="生活習慣・扱い方" name="lifestyle" placeholder="仕事、結ぶ頻度、アイロン使用、乾かし方、汗や湿気の悩みなど" />
          </FormBlock>

          <FormBlock
            title="好みとNG"
            caption="別人化しない提案、失注しにくいメニュー提案に使います。"
            icon={<Heart className="h-5 w-5" />}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField label="好きな長さ" name="preferredLength" options={lengthOptions} />
              <SelectField label="好きな雰囲気" name="preferredStyle" options={styleOptions} />
              <SelectField label="カラーの好み" name="colorPreference" options={colorOptions} />
              <SelectField label="メンテナンス許容度" name="maintenanceLevel" options={maintenanceOptions} />
            </div>
            <TextAreaField label="避けたい条件" name="dislikes" placeholder="短すぎる前髪、重いシルエット、派手な色、毎朝のセットが必要な髪型など" />
            <TextAreaField label="参考メモ" name="referenceNotes" placeholder="好きな芸能人、過去に評判が良かった髪型、今回変えたい理由など" />
          </FormBlock>
        </div>

        <FormBlock
          title="接客メモ"
          caption="店側の引き継ぎ、会話履歴、提案時の注意点として残します。"
          icon={<ClipboardList className="h-5 w-5" />}
        >
          <TextAreaField label="メモ" name="memo" placeholder="来店理由、悩み、接客時の注意点、次回提案したいメニューなど" />
        </FormBlock>

        <div className="flex flex-col-reverse gap-3 rounded-lg border border-stone-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-xs text-stone-500">
            <Camera className="h-4 w-4" />
            <span>写真は登録後の顧客詳細画面で追加します。</span>
          </div>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Link
              href="/customers"
              className="inline-flex h-11 items-center justify-center rounded-md border border-stone-200 bg-stone-50 px-5 text-sm font-semibold text-stone-700 shadow-sm hover:bg-stone-100"
            >
              キャンセル
            </Link>
            <SubmitButton>
              <span className="inline-flex items-center gap-2">
                <Save className="h-4 w-4" />
                顧客カルテを作成
              </span>
            </SubmitButton>
          </div>
        </div>
      </form>
    </div>
  );
}
