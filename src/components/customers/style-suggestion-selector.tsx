"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  ImageIcon,
  LinkIcon,
  Plus,
  Scissors,
  UserRound,
  WandSparkles
} from "lucide-react";
import {
  addStyleSuggestionImageUrl,
  updateStyleSuggestionAccepted
} from "@/lib/actions";
import { StyleSuggestionImageGenerator } from "@/components/customers/style-suggestion-image-generator";

const ANGLES = ["斜め正面", "横", "斜め後ろ"] as const;

type StyleImageEntry = {
  angle: string;
  url: string;
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
            url: (item as { url: string }).url
          };
        }

        return null;
      })
      .filter((entry): entry is StyleImageEntry => Boolean(entry));
  } catch {
    return fallback;
  }
}

function imageForAngle(entries: StyleImageEntry[], angle: string, index: number) {
  return entries.find((entry) => entry.angle === angle)?.url ?? entries[index]?.url ?? "";
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

  if (!selectedSuggestion) {
    return (
      <div className="rounded-md border border-dashed border-stone-300 bg-stone-50 px-4 py-7 text-center text-sm text-stone-500">
        髪型提案はまだありません。
      </div>
    );
  }

  const imageEntries = parseImageEntries(selectedSuggestion);
  const hasThreeImages = ANGLES.every((angle, index) => Boolean(imageForAngle(imageEntries, angle, index)));
  const canGenerateImages = hasAiReferencePhotos && hasAiPhotoConsent && isStyleImageGenerationEnabled;
  const generationDisabledReason = !hasAiPhotoConsent
    ? "AI画像生成への同意を保存してください。"
    : !isStyleImageGenerationEnabled
      ? "画像生成機能が無効です。ENABLE_STYLE_IMAGE_GENERATION=true を設定してください。"
    : !hasAiReferencePhotos
      ? "正面写真2枚以上・横顔写真2枚以上を登録すると、髪型シミュレーションを生成できます。"
      : undefined;
  const addImageAction = addStyleSuggestionImageUrl.bind(null, customerId, selectedSuggestion.id);
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
                  {`提案${suggestionNumber}｜${suggestion.suggestedStyleName}｜${suggestion.label ?? "AI提案"}｜${
                    suggestion.accepted ? "採用済み｜" : ""
                  }${formatDate(suggestion.createdAt)}`}
                </option>
              );
            })}
          </select>
        </label>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs leading-5 text-stone-500">
            通常表示は最新のAI 3案と採用候補を中心に整理します。古い未採用AI提案は過去の提案へ移動します。
          </p>
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
              <Pill tone="amber">{selectedSuggestion.label ?? "AI提案"}</Pill>
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
                本人写真と顔型・骨格バランスの印象を参考にした相談用シミュレーション
              </div>
              {!hasThreeImages ? (
                <p className="mt-3 text-sm leading-6 text-stone-600">
                  本人写真ベースの3方向シミュレーションは未生成です。画像生成を有効にすると、斜め正面・横・斜め後ろの相談用イメージを作成できます。
                </p>
              ) : null}
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {ANGLES.map((angle, index) => {
              const imageUrl = imageForAngle(imageEntries, angle, index);
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
                </div>
              );
            })}
          </div>
          {hasThreeImages ? (
            <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
              <p className="text-xs leading-5 text-amber-900">
                AI生成画像は参考です。本人性や仕上がりを完全に保証するものではありません。
              </p>
              <p className="mt-1 text-xs leading-5 text-amber-900">
                顔が変わりすぎて見える場合は「別人っぽい」を選び、再生成してください。
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {["本人に近い", "微妙", "別人っぽい"].map((label) => (
                  <button
                    key={label}
                    type="button"
                    className="inline-flex h-8 items-center rounded-md border border-amber-200 bg-white px-3 text-xs font-semibold text-amber-900 hover:bg-amber-100"
                    aria-label={`生成画像の評価: ${label}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="mt-4">
          <StyleSuggestionImageGenerator
            styleSuggestionId={selectedSuggestion.id}
            customerId={customerId}
            disabled={hasThreeImages || !canGenerateImages}
            disabledReason={generationDisabledReason}
          />
        </div>

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

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
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
                  {suggestion.label ?? "AI提案"} / {formatDate(suggestion.createdAt)}
                </span>
              </button>
            ))}
          </div>
        </details>
      ) : null}
    </div>
  );
}
