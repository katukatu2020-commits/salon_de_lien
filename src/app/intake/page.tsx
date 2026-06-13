import { CalendarDays, MessageCircle, Scissors, Sparkles, UserRound } from "lucide-react";
import { createPublicConsultationLead } from "@/lib/actions";

const lengthOptions = ["ショート", "ボブ", "ミディアム", "セミロング", "ロング", "相談したい"];
const styleOptions = ["ナチュラル", "上品", "柔らかい", "大人っぽい", "モード", "扱いやすさ重視"];
const colorOptions = ["地毛に近い", "暗め", "明るめ", "透明感", "白髪ぼかし", "カラーなし"];
const maintenanceOptions = ["低め", "標準", "高めでも可"];
const textureOptions = ["直毛", "ゆるいクセ", "強いクセ", "うねり", "乾燥しやすい"];
const visitTimingOptions = ["今週中に行きたい", "2週間以内に行きたい", "今月中に相談したい", "予定が合えば行きたい"];
const concernOptions = ["似合う髪型が分からない", "朝のセットを楽にしたい", "ダメージが気になる", "白髪や色味を相談したい", "前髪・顔まわりを変えたい", "料金と時間を先に知りたい"];
const addOnInterestOptions = ["艶・トリートメント", "白髪ぼかし", "頭皮ケア", "カラーの色持ち", "前髪・顔まわり", "朝の時短セット"];
const budgetOptions = ["提案通りで相談したい", "できれば料金を抑えたい", "必要ならケアも追加したい"];
const leadSourceOptions = ["Instagram", "LINE", "Google検索", "紹介", "店頭・チラシ", "その他"];
const waitlistOptions = ["希望する", "希望しない", "相談したい"];
const timeWindowOptions = ["平日午前", "平日午後", "平日夕方", "土日午前", "土日午後", "いつでも可"];
const rescheduleContactOptions = ["LINEで連絡", "電話で連絡", "SMSで連絡", "どれでも可"];

type IntakePageProps = {
  searchParams?: {
    source?: string;
    campaign?: string;
    referrer?: string;
    referrerName?: string;
  };
};

function SelectBox({ label, name, options, defaultValue = "" }: { label: string; name: string; options: string[]; defaultValue?: string }) {
  return (
    <label className="grid gap-1 text-sm font-medium text-stone-700">
      {label}
      <select name={name} defaultValue={defaultValue} className="h-11 rounded-md border border-stone-200 bg-white px-3 text-stone-950 shadow-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100">
        <option value="">未選択</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

export default function IntakePage({ searchParams }: IntakePageProps) {
  const rawLeadSource = searchParams?.source?.trim() ?? "";
  const campaign = searchParams?.campaign?.trim() ?? "";
  const referrer = searchParams?.referrer?.trim() ?? "";
  const referrerName = searchParams?.referrerName?.trim() ?? "";
  const leadSource = rawLeadSource || referrer || referrerName ? (rawLeadSource && leadSourceOptions.includes(rawLeadSource) ? rawLeadSource : "紹介") : "";
  const referralLabel = referrerName || referrer;

  return (
    <main className="min-h-screen bg-[#f8f5ef] text-stone-900">
      <section className="mx-auto grid w-full max-w-4xl gap-5 px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-teal-800">Salon de Lien</p>
          <h1 className="mt-2 text-3xl font-semibold text-stone-950">はじめての髪型相談</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-stone-600">
            悩み、好み、来店できそうな時期を送ってください。スタッフが内容を確認し、似合う方向性、必要なメニュー、予約候補を返信します。
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-4">
            {["似合う方向性", "料金・所要時間", "予約候補", "家での扱いやすさ"].map((item) => (
              <div key={item} className="rounded-md border border-stone-200 bg-[#fbf8f3] px-3 py-2 text-xs font-semibold text-stone-800">
                {item}
              </div>
            ))}
          </div>
          {referralLabel ? (
            <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs leading-5 text-emerald-950">
              {referralLabel}さんからの紹介としてスタッフに共有されます。初回相談では、悩み・予算・来店時期を先に確認してから進めます。
            </div>
          ) : null}
        </div>

        <form action={createPublicConsultationLead} className="grid gap-5">
          <input type="hidden" name="leadSourceParam" value={leadSource} />
          <input type="hidden" name="campaign" value={campaign} />
          <input type="hidden" name="referrerCode" value={referrer} />
          <input type="hidden" name="referrerName" value={referrerName} />
          <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-stone-950">
              <UserRound className="h-5 w-5 text-teal-800" />
              連絡先
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1 text-sm font-medium text-stone-700">
                お名前
                <input name="name" required className="h-11 rounded-md border border-stone-200 bg-white px-3 text-stone-950 shadow-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100" />
              </label>
              <label className="grid gap-1 text-sm font-medium text-stone-700">
                電話・LINE連絡先
                <input name="phone" className="h-11 rounded-md border border-stone-200 bg-white px-3 text-stone-950 shadow-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100" />
              </label>
              <SelectBox label="何で知りましたか" name="leadSource" options={leadSourceOptions} defaultValue={leadSource} />
            </div>
            {leadSource || campaign ? (
              <p className="mt-3 rounded-md border border-teal-200 bg-teal-50 px-3 py-2 text-xs leading-5 text-teal-900">
                流入元: {leadSource || "未設定"}
                {campaign ? ` / キャンペーン: ${campaign}` : ""}
                {referrerName || referrer ? ` / 紹介: ${referrerName || referrer}` : ""}
              </p>
            ) : null}
          </section>

          <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-stone-950">
              <Sparkles className="h-5 w-5 text-teal-800" />
              相談したいこと
            </h2>
            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {concernOptions.map((concern) => (
                <label key={concern} className="flex cursor-pointer items-center gap-2 rounded-md border border-stone-200 bg-[#fbf8f3] px-3 py-2 text-xs font-semibold text-stone-800">
                  <input name="mainConcern" type="radio" value={concern} className="h-4 w-4 border-stone-300 text-teal-800" />
                  {concern}
                </label>
              ))}
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <SelectBox label="希望の長さ" name="preferredLength" options={lengthOptions} />
              <SelectBox label="好きな雰囲気" name="preferredStyle" options={styleOptions} />
              <SelectBox label="カラー希望" name="colorPreference" options={colorOptions} />
              <SelectBox label="メンテナンス許容度" name="maintenanceLevel" options={maintenanceOptions} />
              <SelectBox label="髪質" name="hairTexture" options={textureOptions} />
              <label className="grid gap-1 text-sm font-medium text-stone-700">
                朝のセット時間
                <input name="stylingTimeMinutes" type="number" placeholder="例: 10" className="h-11 rounded-md border border-stone-200 bg-white px-3 text-stone-950 shadow-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100" />
              </label>
            </div>
            <div className="mt-4">
              <p className="text-sm font-medium text-stone-700">気になる追加相談</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {addOnInterestOptions.map((interest) => (
                  <label key={interest} className="flex cursor-pointer items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-950">
                    <input name="addOnInterest" type="checkbox" value={interest} className="h-4 w-4 rounded border-amber-300 text-amber-700" />
                    {interest}
                  </label>
                ))}
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-stone-950">
              <CalendarDays className="h-5 w-5 text-teal-800" />
              予約しやすくするための確認
            </h2>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {visitTimingOptions.map((timing) => (
                <label key={timing} className="flex cursor-pointer items-center gap-2 rounded-md border border-stone-200 bg-[#fbf8f3] px-3 py-2 text-xs font-semibold text-stone-800">
                  <input name="visitTiming" type="radio" value={timing} className="h-4 w-4 border-stone-300 text-teal-800" />
                  {timing}
                </label>
              ))}
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <label className="grid gap-1 text-sm font-medium text-stone-700">
                希望日時
                <input name="preferredDate" type="datetime-local" className="h-11 rounded-md border border-stone-200 bg-white px-3 text-stone-950 shadow-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100" />
              </label>
              <label className="grid gap-1 text-sm font-medium text-stone-700">
                終わりたい時間
                <input name="finishBy" type="time" className="h-11 rounded-md border border-stone-200 bg-white px-3 text-stone-950 shadow-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100" />
              </label>
              <SelectBox label="予算感" name="budgetPreference" options={budgetOptions} />
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <SelectBox label="早い空きが出た時の連絡" name="waitlistPreference" options={waitlistOptions} />
              <SelectBox label="連絡しやすい時間帯" name="preferredTimeWindow" options={timeWindowOptions} />
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <SelectBox label="変更・キャンセル時の連絡方法" name="rescheduleContactPreference" options={rescheduleContactOptions} />
              <label className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-950">
                <input name="cancellationPolicyConsent" type="checkbox" className="mt-1 h-4 w-4 border-amber-300 text-amber-700" />
                予約確定後、変更やキャンセルが必要な場合は早めに連絡することを確認しました。
              </label>
            </div>
          </section>

          <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-stone-950">
              <Scissors className="h-5 w-5 text-teal-800" />
              詳しく伝えたいこと
            </h2>
            <textarea
              name="message"
              placeholder="今の髪で困っていること、過去に苦手だった髪型、料金や時間で不安なことなど"
              className="mt-4 min-h-28 w-full rounded-md border border-stone-200 bg-white px-3 py-2 text-stone-950 shadow-sm outline-none placeholder:text-stone-400 focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
            />
          </section>

          <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-stone-950">
              <Sparkles className="h-5 w-5 text-teal-800" />
              事前写真
            </h2>
            <div className="mt-4 grid gap-4">
              <label className="grid gap-1 text-sm font-medium text-stone-700">
                髪・顔まわりの写真
                <input
                  name="intakePhotos"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  className="block w-full rounded-md border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700 shadow-sm file:mr-3 file:rounded file:border-0 file:bg-teal-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-teal-900 hover:file:bg-teal-100"
                />
              </label>
              <label className="flex items-start gap-2 rounded-md border border-teal-200 bg-teal-50 px-3 py-2 text-xs leading-5 text-teal-950">
                <input name="aiPhotoConsent" type="checkbox" className="mt-1 h-4 w-4 border-teal-300 text-teal-800" />
                写真をカウンセリング、似合わせ提案、提案画像の準備に利用することに同意します。
              </label>
            </div>
          </section>

          <div className="rounded-lg border border-teal-200 bg-teal-50 p-4 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs leading-5 text-teal-900">
                送信内容はスタッフ確認用のカルテとして保存されます。予約確定はスタッフからの返信後になります。
              </p>
              <button type="submit" className="inline-flex h-11 items-center justify-center rounded-md bg-teal-900 px-5 text-sm font-semibold text-white shadow-sm hover:bg-teal-950">
                <MessageCircle className="mr-2 h-4 w-4" />
                相談を送る
              </button>
            </div>
          </div>
        </form>
      </section>
    </main>
  );
}
