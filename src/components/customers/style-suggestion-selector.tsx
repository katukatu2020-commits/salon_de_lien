"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Copy,
  ExternalLink,
  ImageIcon,
  LinkIcon,
  Plus,
  Scissors,
  Trash2,
  UserRound,
  WandSparkles
} from "lucide-react";
import {
  addStyleSuggestionImageUrl,
  removeStyleSuggestionImageAction,
  updateStyleSuggestionAccepted
} from "@/lib/actions";
import { StyleSuggestionImageGenerator } from "@/components/customers/style-suggestion-image-generator";

const ANGLES = ["斜め正面", "横", "斜め後ろ"] as const;

type StyleImageEntry = {
  angle: string;
  url: string;
  provider?: string;
  identityScore?: number;
  identityLevel?: "high" | "medium" | "low";
  identityWarning?: string | null;
};

export type SelectableStyleSuggestion = {
  id: string;
  customerId: string;
  suggestedStyleName: string;
  reason: string | null;
  caution: string | null;
  stylingAdvice: string | null;
  imageUrls: string[];
  imageUrlsJson: string | null;
  menuSuggestion: string | null;
  estimatedMinutes: number | null;
  maintenanceLevel: string | null;
  label: string | null;
  faceAnalysis: string | null;
  accepted: boolean;
  archivedAt: string | null;
  createdAt: string;
  visit: {
    visitedAt: string;
  } | null;
};

function formatDate(value?: string | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date(value));
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

function parseImageEntries(suggestion: SelectableStyleSuggestion): StyleImageEntry[] {
  const fallback = suggestion.imageUrls.map((url, index) => ({
    angle: ANGLES[index] ?? `画像${index + 1}`,
    url
  }));

  if (!suggestion.imageUrlsJson) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(suggestion.imageUrlsJson) as unknown;

    if (!Array.isArray(parsed)) {
      return fallback;
    }

    return parsed
      .map((item, index): StyleImageEntry | null => {
        if (typeof item === "string") {
          return {
            angle: ANGLES[index] ?? `画像${index + 1}`,
            url: item
          };
        }

        if (
          typeof item === "object" &&
          item !== null &&
          typeof (item as { url?: unknown }).url === "string"
        ) {
          return {
            angle:
              typeof (item as { angle?: unknown }).angle === "string"
                ? (item as { angle: string }).angle
                : ANGLES[index] ?? `画像${index + 1}`,
            url: (item as { url: string }).url,
            provider:
              typeof (item as { provider?: unknown }).provider === "string"
                ? (item as { provider: string }).provider
                : undefined,
            identityScore:
              typeof (item as { identityScore?: unknown }).identityScore === "number"
                ? (item as { identityScore: number }).identityScore
                : undefined,
            identityLevel:
              (item as { identityLevel?: unknown }).identityLevel === "high" ||
              (item as { identityLevel?: unknown }).identityLevel === "medium" ||
              (item as { identityLevel?: unknown }).identityLevel === "low"
                ? (item as { identityLevel: "high" | "medium" | "low" }).identityLevel
                : undefined,
            identityWarning:
              typeof (item as { identityWarning?: unknown }).identityWarning === "string"
                ? (item as { identityWarning: string }).identityWarning
                : null
          };
        }

        return null;
      })
      .filter((entry): entry is StyleImageEntry => Boolean(entry));
  } catch {
    return fallback;
  }
}

function imageEntryForAngle(entries: StyleImageEntry[], angle: string, index: number) {
  const exactEntry = entries.find((entry) => entry.angle === angle);

  if (exactEntry) {
    return exactEntry;
  }

  const hasAngleMetadata = entries.some((entry) => (ANGLES as readonly string[]).includes(entry.angle));

  return hasAngleMetadata ? null : entries[index] ?? null;
}

function displaySuggestionLabel(label?: string | null) {
  return !label || label === "AI提案" ? "提案" : label;
}

function isAiSuggestion(suggestion: SelectableStyleSuggestion) {
  return (
    ["本命", "安全", "挑戦", "AI提案"].includes(suggestion.label ?? "") ||
    Boolean(suggestion.faceAnalysis) ||
    Boolean(suggestion.imageUrlsJson)
  );
}

function suggestionKey(suggestion: SelectableStyleSuggestion) {
  return `${suggestion.suggestedStyleName.trim().toLowerCase()}:${suggestion.label ?? ""}`;
}

function uniqueLatest(suggestions: SelectableStyleSuggestion[]) {
  const seen = new Set<string>();
  const unique: SelectableStyleSuggestion[] = [];

  for (const suggestion of suggestions) {
    const key = suggestionKey(suggestion);
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    unique.push(suggestion);
  }

  return unique;
}

function buildVisibleSuggestions(suggestions: SelectableStyleSuggestion[]) {
  const accepted = suggestions.filter((suggestion) => suggestion.accepted);
  const openAiSuggestions = suggestions.filter(
    (suggestion) => !suggestion.accepted && !suggestion.archivedAt && isAiSuggestion(suggestion)
  );
  const manualSuggestions = suggestions.filter(
    (suggestion) => !suggestion.accepted && !suggestion.archivedAt && !isAiSuggestion(suggestion)
  );
  const map = new Map<string, SelectableStyleSuggestion>();

  [
    ...accepted,
    ...uniqueLatest(openAiSuggestions).slice(0, 3),
    ...uniqueLatest(manualSuggestions).slice(0, 3)
  ].forEach((suggestion) => map.set(suggestion.id, suggestion));

  return Array.from(map.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

function buildCustomerProposalMessage(suggestion: SelectableStyleSuggestion, sharePath?: string) {
  const lines = [
    `今回のおすすめは「${suggestion.suggestedStyleName}」です。`,
    suggestion.reason
      ? `似合わせの理由: ${suggestion.reason}`
      : "顔立ち・髪質・普段の扱いやすさを見ながら、当日スタッフが最終調整します。",
    suggestion.menuSuggestion ? `おすすめメニュー: ${suggestion.menuSuggestion}` : null,
    suggestion.maintenanceLevel ? `メンテナンス目安: ${suggestion.maintenanceLevel}` : null,
    suggestion.stylingAdvice ? `ご自宅での扱い方: ${suggestion.stylingAdvice}` : null,
    suggestion.caution ? `注意点: ${suggestion.caution}` : null,
    sharePath ? `提案ページ: ${sharePath}` : null,
    "画像は相談用イメージです。来店時に似合う幅とNG条件を一緒に確認しましょう。"
  ];

  return lines.filter((line): line is string => Boolean(line)).join("\n");
}

export function StyleSuggestionSelector({
  customerId,
  suggestions,
  hasAiReferencePhotos,
  hasAiPhotoConsent,
  isStyleImageGenerationEnabled,
  initialSelectedSuggestionId
}: {
  customerId: string;
  suggestions: SelectableStyleSuggestion[];
  hasAiReferencePhotos: boolean;
  hasAiPhotoConsent: boolean;
  isStyleImageGenerationEnabled: boolean;
  initialSelectedSuggestionId?: string;
}) {
  const router = useRouter();
  const [isDeletingImage, startImageDeleteTransition] = useTransition();
  const [imageDeleteMessage, setImageDeleteMessage] = useState("");
  const [isMessageCopied, setIsMessageCopied] = useState(false);
  const selectableSuggestions = useMemo(() => buildVisibleSuggestions(suggestions), [suggestions]);
  const archivedSuggestions = useMemo(
    () =>
      suggestions.filter(
        (suggestion) => suggestion.archivedAt && !selectableSuggestions.some((visible) => visible.id === suggestion.id)
      ),
    [selectableSuggestions, suggestions]
  );
  const defaultSuggestion =
    selectableSuggestions.find((suggestion) => suggestion.id === initialSelectedSuggestionId) ??
    selectableSuggestions.find((suggestion) => suggestion.accepted) ??
    selectableSuggestions[0];
  const [selectedId, setSelectedId] = useState(defaultSuggestion?.id ?? "");
  const selectedIndex = selectableSuggestions.findIndex((suggestion) => suggestion.id === selectedId);
  const selectedSuggestion = suggestions.find((suggestion) => suggestion.id === selectedId) ?? defaultSuggestion;
  const dropdownSuggestions =
    selectedSuggestion && !selectableSuggestions.some((suggestion) => suggestion.id === selectedSuggestion.id)
      ? [selectedSuggestion, ...selectableSuggestions]
      : selectableSuggestions;

  useEffect(() => {
    if (initialSelectedSuggestionId && suggestions.some((suggestion) => suggestion.id === initialSelectedSuggestionId)) {
      setSelectedId(initialSelectedSuggestionId);
      return;
    }

    if (!suggestions.some((suggestion) => suggestion.id === selectedId)) {
      setSelectedId(defaultSuggestion?.id ?? "");
    }
  }, [defaultSuggestion?.id, initialSelectedSuggestionId, selectableSuggestions, selectedId, suggestions]);

  function selectSuggestion(nextId: string) {
    setSelectedId(nextId);
    router.replace(`/customers/${customerId}?suggestionId=${nextId}`, { scroll: false });
  }

  function deleteGeneratedImage(imageUrl: string) {
    const confirmed = window.confirm(
      "この生成画像を削除しますか？\n破綻画像や不要な画像を提案カードから外します。"
    );

    if (!confirmed) {
      return;
    }

    setImageDeleteMessage("");
    startImageDeleteTransition(() => {
      void (async () => {
        const formData = new FormData();
        formData.set("styleSuggestionId", selectedSuggestion?.id ?? "");
        formData.set("customerId", customerId);
        formData.set("imageUrl", imageUrl);

        const result = await removeStyleSuggestionImageAction(formData);

        setImageDeleteMessage(result.message);

        if (result.ok) {
          router.replace(`/customers/${customerId}?suggestionId=${selectedSuggestion?.id ?? ""}`, { scroll: false });
          router.refresh();
        }
      })().catch(() => {
        setImageDeleteMessage("生成画像を削除できませんでした。");
      });
    });
  }

  function copyCustomerMessage() {
    if (!selectedSuggestion) {
      return;
    }

    const message = buildCustomerProposalMessage(selectedSuggestion, `${window.location.origin}/proposals/${selectedSuggestion.id}`);
    setIsMessageCopied(false);
    void navigator.clipboard.writeText(message).then(() => {
      setIsMessageCopied(true);
      window.setTimeout(() => setIsMessageCopied(false), 1800);
    });
  }

  if (!selectedSuggestion) {
    return (
      <div className="rounded-md border border-dashed border-stone-300 bg-stone-50 px-4 py-7 text-center text-sm text-stone-500">
        髪型提案はまだありません。
      </div>
    );
  }

  const imageEntries = parseImageEntries(selectedSuggestion);
  const hasLowIdentityScore = imageEntries.some((entry) => entry.identityLevel === "low");
  const canGenerateImages = hasAiReferencePhotos && hasAiPhotoConsent && isStyleImageGenerationEnabled;
  const generationDisabledReason = !hasAiPhotoConsent
    ? "お客様側の相談フォームで写真利用同意が必要です。"
    : !isStyleImageGenerationEnabled
      ? "画像生成機能が無効です。ENABLE_STYLE_IMAGE_GENERATION=true を設定してください。"
    : !hasAiReferencePhotos
      ? "正面・横・斜め後ろ写真を1枚ずつ登録すると、髪型シミュレーションを生成できます。"
      : undefined;
  const addImageAction = addStyleSuggestionImageUrl.bind(null, customerId, selectedSuggestion.id);
  const proposalSharePath = `/proposals/${selectedSuggestion.id}`;
  const acceptAction = updateStyleSuggestionAccepted.bind(
    null,
    customerId,
    selectedSuggestion.id,
    !selectedSuggestion.accepted
  );

  return (
    <div className="grid gap-4">
      <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
        <label className="grid gap-2 text-sm font-semibold text-stone-800">
          提案を選択
          <select
            value={selectedSuggestion.id}
            onChange={(event) => selectSuggestion(event.target.value)}
            className="h-11 rounded-md border border-stone-200 bg-white px-3 text-sm text-stone-950 shadow-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
          >
            {dropdownSuggestions.map((suggestion) => {
              const originalIndex = suggestions.findIndex((item) => item.id === suggestion.id);
              const suggestionNumber = String(suggestions.length - originalIndex).padStart(2, "0");
              return (
                <option key={suggestion.id} value={suggestion.id}>
                  {`提案${suggestionNumber}｜${suggestion.suggestedStyleName}｜${displaySuggestionLabel(suggestion.label)}｜${
                    suggestion.accepted ? "採用済み｜" : ""
                  }${formatDate(suggestion.createdAt)}`}
                </option>
              );
            })}
          </select>
        </label>
        <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
          <div className="flex gap-2">
            <button
              type="button"
              disabled={selectedIndex <= 0}
              onClick={() => selectSuggestion(selectableSuggestions[selectedIndex - 1]?.id ?? selectedSuggestion.id)}
              className="inline-flex h-9 items-center gap-1 rounded-md border border-stone-200 bg-white px-3 text-xs font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
              前の提案
            </button>
            <button
              type="button"
              disabled={selectedIndex < 0 || selectedIndex >= selectableSuggestions.length - 1}
              onClick={() => selectSuggestion(selectableSuggestions[selectedIndex + 1]?.id ?? selectedSuggestion.id)}
              className="inline-flex h-9 items-center gap-1 rounded-md border border-stone-200 bg-white px-3 text-xs font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-50"
            >
              次の提案
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      <article className={`rounded-lg border bg-white p-5 shadow-sm ${selectedSuggestion.accepted ? "border-teal-300 bg-teal-50/50" : "border-stone-200"}`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Pill tone="amber">{displaySuggestionLabel(selectedSuggestion.label)}</Pill>
              {selectedSuggestion.accepted ? <Pill tone="green">採用候補</Pill> : <Pill>確認中</Pill>}
              <span className="text-sm text-stone-500">{formatDate(selectedSuggestion.createdAt)}</span>
            </div>
            <h3 className="mt-3 text-2xl font-semibold text-stone-950">{selectedSuggestion.suggestedStyleName}</h3>
          </div>
          <form action={acceptAction}>
            <button
              type="submit"
              className={`inline-flex h-11 items-center gap-2 rounded-md px-4 text-sm font-semibold shadow-sm ${
                selectedSuggestion.accepted
                  ? "border border-stone-200 bg-white text-stone-700 hover:bg-stone-50"
                  : "bg-teal-900 text-white hover:bg-teal-950"
              }`}
            >
              <CheckCircle2 className="h-4 w-4" />
              {selectedSuggestion.accepted ? "候補から外す" : "この提案を候補にする"}
            </button>
          </form>
        </div>

        <div className="mt-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="inline-flex rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-900">
                3方向シミュレーション
              </div>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {ANGLES.map((angle, index) => {
              const imageEntry = imageEntryForAngle(imageEntries, angle, index);
              const imageUrl = imageEntry?.url ?? "";
              return (
                <div key={angle} className="overflow-hidden rounded-md border border-stone-200 bg-[#f4efe8]">
                  <div className="aspect-[4/3]">
                    {imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={imageUrl} alt={`${selectedSuggestion.suggestedStyleName} ${angle}`} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center gap-2 px-5 text-center text-sm text-stone-500">
                        <ImageIcon className="h-7 w-7 text-stone-400" />
                        <span className="font-semibold text-stone-700">{angle}</span>
                      </div>
                    )}
                  </div>
                  <div className="border-t border-stone-200 bg-white px-3 py-2 text-center text-xs font-semibold text-stone-700">
                    {angle}
                  </div>
                  {imageUrl ? (
                    <div className="border-t border-stone-200 bg-white px-3 py-2">
                      <button
                        type="button"
                        disabled={isDeletingImage}
                        onClick={() => deleteGeneratedImage(imageUrl)}
                        className="inline-flex h-8 w-full items-center justify-center gap-2 rounded-md border border-red-100 bg-red-50 px-3 text-xs font-semibold text-red-700 hover:bg-red-100"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        生成画像を削除
                      </button>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
          {imageDeleteMessage ? (
            <p className="mt-3 rounded-md border border-stone-200 bg-white px-3 py-2 text-xs font-semibold text-stone-700">
              {imageDeleteMessage}
            </p>
          ) : null}
        </div>

        <div className="mt-4">
          <StyleSuggestionImageGenerator
            styleSuggestionId={selectedSuggestion.id}
            customerId={customerId}
            disabled={!canGenerateImages}
            disabledReason={generationDisabledReason}
            hasLowIdentityScore={hasLowIdentityScore}
          />
        </div>

        <section className="mt-5 rounded-md border border-teal-200 bg-teal-50 p-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h4 className="flex items-center gap-2 font-semibold text-teal-950">
              <ClipboardList className="h-4 w-4" />
              提案シート
            </h4>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={copyCustomerMessage}
                className="inline-flex h-9 items-center gap-2 rounded-md border border-teal-200 bg-white px-3 text-xs font-semibold text-teal-900 hover:bg-teal-100"
              >
                <Copy className="h-3.5 w-3.5" />
                {isMessageCopied ? "コピー済み" : "送信用文面をコピー"}
              </button>
              <a
                href={proposalSharePath}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-9 items-center gap-2 rounded-md border border-teal-200 bg-white px-3 text-xs font-semibold text-teal-900 hover:bg-teal-100"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                共有ページ
              </a>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Pill>{selectedSuggestion.suggestedStyleName}</Pill>
            {selectedSuggestion.menuSuggestion ? <Pill>{selectedSuggestion.menuSuggestion}</Pill> : null}
            {selectedSuggestion.estimatedMinutes ? <Pill>約{selectedSuggestion.estimatedMinutes}分</Pill> : null}
            {selectedSuggestion.maintenanceLevel ? <Pill>メンテ: {selectedSuggestion.maintenanceLevel}</Pill> : null}
          </div>
          <details className="mt-3 rounded-md border border-teal-100 bg-white p-3">
            <summary className="cursor-pointer text-xs font-semibold text-stone-600">送信用文面</summary>
            <div className="mt-3 grid gap-3">
              <p className="whitespace-pre-wrap text-xs leading-5 text-stone-700">
                {buildCustomerProposalMessage(selectedSuggestion, proposalSharePath)}
              </p>
            </div>
          </details>
        </section>

        <form action={addImageAction} className="mt-4 flex flex-col gap-2 rounded-md border border-dashed border-stone-300 bg-[#fbf8f3] p-3 sm:flex-row">
          <label className="relative min-w-0 flex-1">
            <LinkIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <input
              name="imageUrl"
              type="url"
              placeholder="画像URLを追加"
              className="h-10 w-full rounded-md border border-stone-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
            />
          </label>
          <button
            type="submit"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-stone-200 bg-white px-3 text-sm font-semibold text-stone-700 hover:bg-stone-50"
          >
            <Plus className="h-4 w-4" />
            画像URLを追加
          </button>
        </form>

        <details className="mt-5 rounded-md border border-stone-200 bg-white p-4">
          <summary className="cursor-pointer text-sm font-semibold text-stone-800">詳細メモ</summary>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="rounded-md border border-stone-200 bg-white p-4 lg:col-span-2">
            <h4 className="flex items-center gap-2 font-semibold text-stone-950">
              <ClipboardList className="h-4 w-4 text-stone-500" />
              顔型・骨格バランスの印象メモ
            </h4>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-stone-700">
              {selectedSuggestion.faceAnalysis ?? "本人写真ベースの印象整理は未生成です。"}
            </p>
            </div>
            <div className="rounded-md border border-stone-200 bg-white p-4">
            <h4 className="flex items-center gap-2 font-semibold text-stone-950">
              <UserRound className="h-4 w-4 text-stone-500" />
              提案理由
            </h4>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-stone-700">{selectedSuggestion.reason ?? "未登録"}</p>
            </div>
            <div className="rounded-md border border-red-100 bg-red-50 p-4">
            <h4 className="flex items-center gap-2 font-semibold text-red-800">
              <AlertCircle className="h-4 w-4" />
              注意点
            </h4>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-red-900">{selectedSuggestion.caution ?? "未登録"}</p>
            </div>
            <div className="rounded-md border border-stone-200 bg-white p-4">
            <h4 className="flex items-center gap-2 font-semibold text-stone-950">
              <WandSparkles className="h-4 w-4 text-stone-500" />
              スタイリングアドバイス
            </h4>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-stone-700">
              {selectedSuggestion.stylingAdvice ?? "未登録"}
            </p>
            </div>
            <div className="rounded-md border border-stone-200 bg-white p-4">
            <h4 className="flex items-center gap-2 font-semibold text-stone-950">
              <Scissors className="h-4 w-4 text-stone-500" />
              おすすめメニュー
            </h4>
            <div className="mt-3 grid gap-2 text-sm text-stone-700">
              <p>{selectedSuggestion.menuSuggestion ?? "未登録"}</p>
              <div className="flex flex-wrap gap-2 pt-1">
                {selectedSuggestion.estimatedMinutes ? <Pill>所要時間: 約{selectedSuggestion.estimatedMinutes}分</Pill> : null}
                {selectedSuggestion.maintenanceLevel ? <Pill>メンテナンス: {selectedSuggestion.maintenanceLevel}</Pill> : null}
                {selectedSuggestion.visit ? <Pill>関連来店: {formatDate(selectedSuggestion.visit.visitedAt)}</Pill> : null}
              </div>
            </div>
            </div>
          </div>
        </details>
      </article>
      {archivedSuggestions.length > 0 ? (
        <details className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
          <summary className="cursor-pointer text-sm font-semibold text-stone-800">
            過去の提案を見る（{archivedSuggestions.length}件）
          </summary>
          <div className="mt-3 grid gap-2">
            {archivedSuggestions.slice(0, 20).map((suggestion) => (
              <button
                key={suggestion.id}
                type="button"
                onClick={() => selectSuggestion(suggestion.id)}
                className="flex flex-col gap-1 rounded-md border border-stone-200 bg-[#fbf8f3] px-3 py-2 text-left text-sm hover:bg-stone-50"
              >
                <span className="font-semibold text-stone-900">{suggestion.suggestedStyleName}</span>
                <span className="text-xs text-stone-500">
                  {displaySuggestionLabel(suggestion.label)} / {formatDate(suggestion.createdAt)}
                </span>
              </button>
            ))}
          </div>
        </details>
      ) : null}
    </div>
  );
}
