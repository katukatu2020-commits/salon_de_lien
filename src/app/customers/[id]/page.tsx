import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock3,
  Edit3,
  FileText,
  Heart,
  MoreHorizontal,
  Phone,
  Save,
  Scissors,
  Sparkles,
  UserRound
} from "lucide-react";
import {
  createStyleSuggestion,
  createVisit,
  updateCustomer,
  updateStyleSuggestionAccepted,
  upsertHairProfile,
  upsertPreference
} from "@/lib/actions";
import { prisma } from "@/lib/prisma";
import { EmptyState, Section, SelectField, SubmitButton, TextAreaField, TextField } from "@/components/ui";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type CustomerDetailPageProps = {
  params: {
    id: string;
  };
};

function formatDate(date?: Date | null) {
  if (!date) {
    return "-";
  }

  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

function inputDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addMonths(date: Date, months: number) {
  const nextDate = new Date(date);
  nextDate.setMonth(nextDate.getMonth() + months);
  return nextDate;
}

function customerCode(id: string) {
  return `C-${id.slice(-5).toUpperCase()}`;
}

function InfoRow({
  label,
  value,
  alert = false,
  icon
}: {
  label: string;
  value?: string | number | null;
  alert?: boolean;
  icon?: ReactNode;
}) {
  return (
    <div className={`rounded-md p-3 ${alert && value ? "border border-red-200 bg-red-50" : "bg-[#fbf8f3]"}`}>
      <dt className="flex items-center gap-2 text-xs font-semibold text-stone-500">
        {icon}
        {label}
      </dt>
      <dd className={`mt-2 whitespace-pre-wrap text-sm ${alert && value ? "font-semibold text-red-800" : "text-stone-900"}`}>
        {value ?? "未登録"}
      </dd>
    </div>
  );
}

function Pill({ children, tone = "stone" }: { children: ReactNode; tone?: "stone" | "red" | "green" | "amber" }) {
  const className =
    tone === "red"
      ? "bg-red-100 text-red-700"
      : tone === "green"
        ? "bg-emerald-100 text-emerald-800"
        : tone === "amber"
          ? "bg-amber-100 text-amber-800"
          : "bg-stone-100 text-stone-700";

  return <span className={`inline-flex rounded px-2.5 py-1 text-xs font-semibold ${className}`}>{children}</span>;
}

function RecordCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <article className={`rounded-md border border-stone-200 bg-white p-4 shadow-sm ${className}`}>{children}</article>;
}

function SaveLabel({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2">
      <Save className="h-4 w-4" />
      {children}
    </span>
  );
}

export default async function CustomerDetailPage({ params }: CustomerDetailPageProps) {
  const { id } = params;
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      hairProfile: true,
      preference: true,
      visits: {
        orderBy: { visitedAt: "desc" }
      },
      styleSuggestions: {
        orderBy: { createdAt: "desc" },
        include: {
          visit: true
        }
      }
    }
  });

  if (!customer) {
    notFound();
  }

  const updateCustomerAction = updateCustomer.bind(null, customer.id);
  const upsertHairProfileAction = upsertHairProfile.bind(null, customer.id);
  const upsertPreferenceAction = upsertPreference.bind(null, customer.id);
  const createVisitAction = createVisit.bind(null, customer.id);
  const createStyleSuggestionAction = createStyleSuggestion.bind(null, customer.id);
  const latestVisit = customer.visits[0];
  const hasNgCondition = Boolean(customer.preference?.dislikes?.trim());
  const nextVisitDate = latestVisit ? addMonths(latestVisit.visitedAt, 2) : null;
  const ngItems = customer.preference?.dislikes
    ?.split(/\r?\n|、|,/)
    .map((item) => item.trim())
    .filter(Boolean);

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-5">
      <div className="flex items-center gap-2 text-sm text-stone-500">
        <Link href="/customers" className="inline-flex items-center gap-2 font-semibold text-teal-800 hover:text-teal-950">
          <ArrowLeft className="h-4 w-4" />
          顧客一覧
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span>{customer.name}</span>
      </div>

      <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
        <div className="grid gap-5 xl:grid-cols-[1.05fr_0.9fr_0.9fr_auto] xl:items-stretch">
          <div className="grid gap-5 sm:grid-cols-[128px_1fr]">
            <div className="relative flex h-32 w-32 items-center justify-center rounded-full bg-[#e7ebe7] text-4xl font-semibold text-teal-900 shadow-inner">
              {customer.name.slice(0, 1)}
              <span className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-teal-900 text-white ring-4 ring-white">
                <UserRound className="h-4 w-4" />
              </span>
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-semibold text-stone-950">{customer.name}</h1>
                <Pill>{customerCode(customer.id)}</Pill>
                <Pill tone="green">常連</Pill>
              </div>
              <div className="mt-4 grid gap-2 text-sm text-stone-800">
                <div className="flex items-center gap-2">
                  <UserRound className="h-4 w-4 text-stone-500" />
                  <span>{customer.gender ?? "未登録"} / {customer.birthYear ?? "生年未登録"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-stone-500" />
                  <span>{customer.phone ?? "電話番号未登録"}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid border-stone-100 xl:border-l xl:px-7">
            <div className="grid gap-4 self-center text-sm">
              <div className="flex gap-3">
                <CalendarDays className="mt-0.5 h-5 w-5 text-stone-500" />
                <div>
                  <p className="text-xs font-semibold text-stone-500">最終来店日</p>
                  <p className="mt-1 font-semibold text-stone-950">{formatDate(latestVisit?.visitedAt)}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Clock3 className="mt-0.5 h-5 w-5 text-stone-500" />
                <div>
                  <p className="text-xs font-semibold text-stone-500">最終更新日</p>
                  <p className="mt-1 font-semibold text-stone-950">{formatDate(customer.updatedAt)}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <FileText className="mt-0.5 h-5 w-5 text-stone-500" />
                <div>
                  <p className="text-xs font-semibold text-stone-500">メモ</p>
                  <p className="mt-1 whitespace-pre-wrap text-stone-800">{customer.memo ?? "未登録"}</p>
                </div>
              </div>
            </div>
          </div>

          {hasNgCondition ? (
            <div className="rounded-md border border-red-200 bg-red-50 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-red-700">
                <AlertCircle className="h-4 w-4" />
                NG条件
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {ngItems?.map((item) => (
                    <Pill key={item} tone="red">
                      {item}
                    </Pill>
                  ))}
              </div>
              <Link href="#preference" className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-teal-900">
                すべてのNG条件を見る
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          ) : (
            <div className="rounded-md border border-stone-100 bg-[#fbf8f3] p-4 text-sm text-stone-500">
              <p className="font-semibold text-stone-700">NG条件</p>
              <p className="mt-2">NG条件は未登録です。</p>
            </div>
          )}

          <div className="flex gap-2 xl:flex-col">
            <Link
              href="#basic-form"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-teal-900 px-5 text-sm font-semibold text-white shadow-sm hover:bg-teal-950"
            >
              <Edit3 className="h-4 w-4" />
              編集する
            </Link>
            <button className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-stone-200 bg-stone-50 text-stone-700 shadow-sm hover:bg-stone-100">
              <MoreHorizontal className="h-5 w-5" />
            </button>
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_260px]">
      <Tabs defaultValue="basic" className="min-w-0">
        <TabsList className="grid grid-flow-col auto-cols-max justify-start border-x-0 border-t-0 bg-transparent p-0 shadow-none sm:auto-cols-fr">
          <TabsTrigger value="basic" className="rounded-none border-b-2 border-transparent data-[state=active]:border-teal-800 data-[state=active]:shadow-none">
            <UserRound className="mr-2 h-4 w-4" />
            基本情報
          </TabsTrigger>
          <TabsTrigger value="preference" className="rounded-none border-b-2 border-transparent data-[state=active]:border-teal-800 data-[state=active]:shadow-none">
            <Heart className="mr-2 h-4 w-4" />
            好み・NG
          </TabsTrigger>
          <TabsTrigger value="hair" className="rounded-none border-b-2 border-transparent data-[state=active]:border-teal-800 data-[state=active]:shadow-none">
            <Scissors className="mr-2 h-4 w-4" />
            髪質
          </TabsTrigger>
          <TabsTrigger value="visits" className="rounded-none border-b-2 border-transparent data-[state=active]:border-teal-800 data-[state=active]:shadow-none">
            <CalendarDays className="mr-2 h-4 w-4" />
            来店履歴
          </TabsTrigger>
          <TabsTrigger value="suggestions" className="rounded-none border-b-2 border-transparent data-[state=active]:border-teal-800 data-[state=active]:shadow-none">
            <Sparkles className="mr-2 h-4 w-4" />
            髪型提案
          </TabsTrigger>
        </TabsList>

        <TabsContent value="basic">
          <div className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
            <Section title="基本情報サマリー">
              <dl className="grid gap-3 sm:grid-cols-2">
                <InfoRow label="名前" value={customer.name} />
                <InfoRow label="性別" value={customer.gender} />
                <InfoRow label="生年" value={customer.birthYear} />
                <InfoRow label="電話番号" value={customer.phone} />
                <InfoRow label="最終更新日" value={formatDate(customer.updatedAt)} />
                <InfoRow label="メモ" value={customer.memo} />
              </dl>
            </Section>

            <Section title="基本情報を編集">
              <form id="basic-form" action={updateCustomerAction} className="grid gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <TextField label="名前" name="name" value={customer.name} required />
                  <SelectField label="性別" name="gender" value={customer.gender} options={["男性", "女性", "その他", "未回答"]} />
                  <TextField label="生年" name="birthYear" type="number" value={customer.birthYear} />
                  <TextField label="電話番号" name="phone" value={customer.phone} />
                </div>
                <TextAreaField label="メモ" name="memo" value={customer.memo} />
                <div className="flex justify-end">
                  <SubmitButton><SaveLabel>保存する</SaveLabel></SubmitButton>
                </div>
              </form>
            </Section>
          </div>

          <div className="mt-5 grid gap-5 xl:grid-cols-2">
            <Section title="直近の来店履歴">
              <div className="grid gap-3">
                {customer.visits.slice(0, 2).map((visit) => (
                  <RecordCard key={visit.id} className="shadow-none">
                    <div className="grid gap-3 sm:grid-cols-[92px_1fr]">
                      <div className="rounded-md bg-[#f4efe8] p-3 text-center">
                        <p className="text-xs font-semibold text-stone-500">{visit.visitedAt.getFullYear()}</p>
                        <p className="mt-1 text-lg font-semibold text-stone-950">
                          {new Intl.DateTimeFormat("ja-JP", { month: "2-digit", day: "2-digit" }).format(visit.visitedAt)}
                        </p>
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500">
                          <span>担当: {visit.stylistName ?? "未入力"}</span>
                          {visit.customerReaction ? <Pill tone="green">{visit.customerReaction}</Pill> : null}
                        </div>
                        <p className="mt-2 text-sm font-semibold text-stone-950">{visit.performedStyle ?? "実施スタイル未登録"}</p>
                        <p className="mt-2 text-sm text-stone-600">{visit.nextRecommendation ?? visit.cutNotes ?? "次回提案は未登録です。"}</p>
                      </div>
                    </div>
                  </RecordCard>
                ))}
                {customer.visits.length === 0 ? <EmptyState>来店履歴はまだありません。</EmptyState> : null}
              </div>
            </Section>

            <Section title="直近の髪型提案">
              <div className="grid gap-3">
                {customer.styleSuggestions.slice(0, 2).map((suggestion) => (
                  <RecordCard key={suggestion.id} className="shadow-none">
                    <div className="flex items-start gap-3">
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md bg-[#e7ebe7] text-lg font-semibold text-teal-900">
                        {suggestion.suggestedStyleName.slice(0, 1)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-stone-950">{suggestion.suggestedStyleName}</p>
                          {suggestion.accepted ? <Pill tone="green">採用済み</Pill> : <Pill tone="amber">提案中</Pill>}
                        </div>
                        <p className="mt-2 line-clamp-2 text-sm text-stone-600">{suggestion.reason ?? "提案理由は未登録です。"}</p>
                        <p className="mt-2 text-xs text-stone-500">提案日: {formatDate(suggestion.createdAt)}</p>
                      </div>
                    </div>
                  </RecordCard>
                ))}
                {customer.styleSuggestions.length === 0 ? <EmptyState>髪型提案はまだありません。</EmptyState> : null}
              </div>
            </Section>
          </div>
        </TabsContent>

        <TabsContent value="preference">
          <div className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
            <Section title="現在の好み・NG">
              <dl className="grid gap-3 sm:grid-cols-2">
                <InfoRow label="好きな長さ" value={customer.preference?.preferredLength} />
                <InfoRow label="好きな雰囲気" value={customer.preference?.preferredStyle} />
                <InfoRow label="NG条件" value={customer.preference?.dislikes} alert />
                <InfoRow label="カラーの好み" value={customer.preference?.colorPreference} />
                <InfoRow label="メンテナンス許容度" value={customer.preference?.maintenanceLevel} />
                <InfoRow label="参考メモ" value={customer.preference?.referenceNotes} />
              </dl>
            </Section>

            <Section title="好み・NGを編集">
              <form action={upsertPreferenceAction} className="grid gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <TextField label="好きな長さ" name="preferredLength" value={customer.preference?.preferredLength} />
                  <TextField label="好きな雰囲気" name="preferredStyle" value={customer.preference?.preferredStyle} />
                  <TextField label="カラーの好み" name="colorPreference" value={customer.preference?.colorPreference} />
                  <SelectField label="メンテナンス許容度" name="maintenanceLevel" value={customer.preference?.maintenanceLevel} options={["低", "中", "高"]} />
                </div>
                <TextAreaField label="NG条件" name="dislikes" value={customer.preference?.dislikes} />
                <TextAreaField label="参考メモ" name="referenceNotes" value={customer.preference?.referenceNotes} />
                <div className="flex justify-end">
                  <SubmitButton><SaveLabel>保存する</SaveLabel></SubmitButton>
                </div>
              </form>
            </Section>
          </div>
        </TabsContent>

        <TabsContent value="hair">
          <div className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
            <Section title="髪質サマリー">
              <dl className="grid gap-3 sm:grid-cols-2">
                <InfoRow label="髪の太さ" value={customer.hairProfile?.hairThickness} />
                <InfoRow label="髪量" value={customer.hairProfile?.hairVolume} />
                <InfoRow label="髪質" value={customer.hairProfile?.hairTexture} />
                <InfoRow label="頭皮状態" value={customer.hairProfile?.scalpCondition} />
                <InfoRow label="顔型" value={customer.hairProfile?.faceShape} />
                <InfoRow label="額" value={customer.hairProfile?.forehead} />
                <InfoRow label="ライフスタイル" value={customer.hairProfile?.lifestyle} />
                <InfoRow label="朝のセット時間" value={customer.hairProfile?.stylingTimeMinutes ? `${customer.hairProfile.stylingTimeMinutes}分` : null} />
              </dl>
            </Section>

            <Section title="髪質プロフィールを編集">
              <form action={upsertHairProfileAction} className="grid gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <SelectField label="髪の太さ" name="hairThickness" value={customer.hairProfile?.hairThickness} options={["細い", "普通", "太い"]} />
                  <SelectField label="髪量" name="hairVolume" value={customer.hairProfile?.hairVolume} options={["少ない", "普通", "多い"]} />
                  <SelectField label="髪質" name="hairTexture" value={customer.hairProfile?.hairTexture} options={["直毛", "少しくせ毛", "強いくせ毛"]} />
                  <SelectField label="頭皮状態" name="scalpCondition" value={customer.hairProfile?.scalpCondition} options={["普通", "乾燥", "脂性", "敏感"]} />
                  <SelectField label="顔型" name="faceShape" value={customer.hairProfile?.faceShape} options={["丸顔", "面長", "ベース型", "卵型", "逆三角形"]} />
                  <SelectField label="額" name="forehead" value={customer.hairProfile?.forehead} options={["広い", "普通", "狭い"]} />
                  <TextField label="ライフスタイル" name="lifestyle" value={customer.hairProfile?.lifestyle} />
                  <TextField label="朝のセット時間（分）" name="stylingTimeMinutes" type="number" value={customer.hairProfile?.stylingTimeMinutes} />
                </div>
                <div className="flex justify-end">
                  <SubmitButton><SaveLabel>保存する</SaveLabel></SubmitButton>
                </div>
              </form>
            </Section>
          </div>
        </TabsContent>

        <TabsContent value="visits">
          <div className="grid gap-5 xl:grid-cols-[1fr_0.75fr]">
            <Section title="来店履歴">
              <div className="grid gap-3">
                {customer.visits.map((visit) => (
                  <RecordCard key={visit.id}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-stone-950">{formatDate(visit.visitedAt)}</h3>
                        <p className="mt-1 text-xs font-medium text-stone-500">担当: {visit.stylistName ?? "未入力"}</p>
                      </div>
                      {visit.customerReaction ? <Pill tone="green">{visit.customerReaction}</Pill> : null}
                    </div>
                    <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                      <InfoRow label="希望スタイル" value={visit.requestedStyle} />
                      <InfoRow label="実施したスタイル" value={visit.performedStyle} />
                      <InfoRow label="カットメモ" value={visit.cutNotes} />
                      <InfoRow label="カラーメモ" value={visit.colorNotes} />
                      <InfoRow label="パーマメモ" value={visit.permNotes} />
                      <InfoRow label="次回へのおすすめ" value={visit.nextRecommendation} />
                    </dl>
                  </RecordCard>
                ))}
                {customer.visits.length === 0 ? <EmptyState>来店履歴はまだありません。</EmptyState> : null}
              </div>
            </Section>

            <Section title="来店履歴を追加">
              <form action={createVisitAction} className="grid gap-4">
                <TextField label="来店日" name="visitedAt" type="date" value={inputDate(new Date())} required />
                <TextField label="担当スタッフ名" name="stylistName" />
                <TextField label="希望スタイル" name="requestedStyle" />
                <TextField label="実施したスタイル" name="performedStyle" />
                <TextAreaField label="カットメモ" name="cutNotes" />
                <TextAreaField label="カラーメモ" name="colorNotes" />
                <TextAreaField label="パーマメモ" name="permNotes" />
                <SelectField label="顧客の反応" name="customerReaction" options={["喜んだ", "普通", "微妙", "不満"]} />
                <TextAreaField label="次回へのおすすめ" name="nextRecommendation" />
                <SubmitButton>来店履歴を追加</SubmitButton>
              </form>
            </Section>
          </div>
        </TabsContent>

        <TabsContent value="suggestions">
          <div className="grid gap-5 xl:grid-cols-[1fr_0.75fr]">
            <Section title="髪型提案">
              <div className="grid gap-3">
                {customer.styleSuggestions.map((suggestion) => {
                  const acceptAction = updateStyleSuggestionAccepted.bind(null, customer.id, suggestion.id, !suggestion.accepted);

                  return (
                    <RecordCard key={suggestion.id} className={suggestion.accepted ? "border-teal-300 bg-teal-50" : ""}>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Scissors className="h-4 w-4 text-teal-800" />
                            <h3 className="font-semibold text-stone-950">{suggestion.suggestedStyleName}</h3>
                            {suggestion.accepted ? <Pill tone="green">採用済み</Pill> : <Pill>提案中</Pill>}
                          </div>
                          <p className="mt-1 text-xs text-stone-500">提案日: {formatDate(suggestion.createdAt)}</p>
                        </div>
                        <form action={acceptAction}>
                          <button
                            type="submit"
                            className={`inline-flex h-9 items-center gap-2 rounded-md px-3 text-xs font-semibold ${
                              suggestion.accepted
                                ? "bg-teal-800 text-white hover:bg-teal-900"
                                : "border border-stone-200 bg-white text-stone-700 hover:bg-stone-50"
                            }`}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            {suggestion.accepted ? "採用を解除" : "採用にする"}
                          </button>
                        </form>
                      </div>
                      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                        <InfoRow label="提案理由" value={suggestion.reason} />
                        <InfoRow label="注意点" value={suggestion.caution} alert />
                        <InfoRow label="スタイリングアドバイス" value={suggestion.stylingAdvice} />
                        <InfoRow label="紐づく来店" value={suggestion.visit ? formatDate(suggestion.visit.visitedAt) : null} />
                      </dl>
                    </RecordCard>
                  );
                })}
                {customer.styleSuggestions.length === 0 ? <EmptyState>髪型提案はまだありません。</EmptyState> : null}
              </div>
            </Section>

            <Section title="新しい髪型を提案">
              <form action={createStyleSuggestionAction} className="grid gap-4">
                <TextField label="提案スタイル名" name="suggestedStyleName" required />
                <label className="grid gap-1 text-sm font-medium text-stone-700">
                  紐づける来店履歴
                  <select
                    name="visitId"
                    className="h-11 rounded-md border border-stone-200 bg-white px-3 text-stone-950 shadow-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                    defaultValue=""
                  >
                    <option value="">紐づけなし</option>
                    {customer.visits.map((visit) => (
                      <option key={visit.id} value={visit.id}>
                        {formatDate(visit.visitedAt)} {visit.performedStyle ?? ""}
                      </option>
                    ))}
                  </select>
                </label>
                <TextAreaField label="提案理由" name="reason" />
                <TextAreaField label="注意点" name="caution" />
                <TextAreaField label="スタイリングアドバイス" name="stylingAdvice" />
                <label className="flex items-center gap-2 text-sm font-medium text-stone-700">
                  <input name="accepted" type="checkbox" className="h-4 w-4 rounded border-stone-300 text-teal-700" />
                  採用済みとして保存
                </label>
                <SubmitButton>
                  <span className="inline-flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    髪型提案を追加
                  </span>
                </SubmitButton>
              </form>
            </Section>
          </div>
        </TabsContent>
      </Tabs>

        <aside className="grid content-start gap-3">
          <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-stone-950">
              <CalendarDays className="h-4 w-4 text-stone-500" />
              次回来店の目安
            </div>
            <p className="mt-4 text-2xl font-semibold text-stone-950">{formatDate(nextVisitDate)}</p>
            <p className="mt-1 text-xs text-stone-500">
              {latestVisit ? "前回来店から約2ヶ月後" : "来店履歴の登録後に表示されます"}
            </p>
          </section>

          <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-stone-950">
              <ClipboardList className="h-4 w-4 text-stone-500" />
              メモ・注意点
            </div>
            <ul className="mt-4 grid gap-2 text-sm leading-6 text-stone-700">
              {hasNgCondition ? <li>・NG条件を施術前に確認</li> : <li>・NG条件は未登録</li>}
              {customer.preference?.preferredStyle ? <li>・好み: {customer.preference.preferredStyle}</li> : null}
              {customer.hairProfile?.hairTexture ? <li>・髪質: {customer.hairProfile.hairTexture}</li> : null}
              {latestVisit?.nextRecommendation ? <li>・次回: {latestVisit.nextRecommendation}</li> : null}
              {!customer.preference?.preferredStyle && !customer.hairProfile?.hairTexture && !latestVisit?.nextRecommendation ? (
                <li>・好みや髪質を登録すると注意点が増えます</li>
              ) : null}
            </ul>
          </section>

          <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-stone-950">
              <Scissors className="h-4 w-4 text-stone-500" />
              よく使うメニュー
            </div>
            <div className="mt-4 grid gap-2">
              {["カット", "カラー", "トリートメント", "ヘッドスパ"].map((menu) => (
                <button
                  key={menu}
                  type="button"
                  className="flex h-10 items-center justify-between rounded-md bg-[#f4efe8] px-3 text-sm font-medium text-stone-800 hover:bg-[#eee5dc]"
                >
                  {menu}
                  <ChevronRight className="h-4 w-4 text-stone-500" />
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-stone-950">
              <Edit3 className="h-4 w-4 text-stone-500" />
              担当者メモ
            </div>
            <p className="mt-4 text-sm leading-6 text-stone-700">
              会話が落ち着いていて、静かな接客が好ましい傾向。提案は理由を添えて丁寧に説明する。
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
