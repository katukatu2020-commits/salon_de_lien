"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";
import { Camera, CheckCircle2, Trash2, Upload } from "lucide-react";
import {
  removeAiReferencePhotoAction,
  updateCustomerAiPhotoConsent,
  uploadAiReferencePhotoAction
} from "@/lib/actions";

type PhotoGroupKey = "front" | "side" | "back";

type UploadState = {
  ok: boolean;
  message: string;
  imageUrl?: string;
  imageUrls?: string[];
  cacheKey?: number;
};

const initialState: UploadState = {
  ok: false,
  message: ""
};

const PHOTO_GROUPS: Array<{
  key: PhotoGroupKey;
  label: string;
  rangeLabel: string;
  min: number;
  max: number;
  description: string;
}> = [
  {
    key: "front",
    label: "正面写真",
    rangeLabel: "2〜4枚",
    min: 2,
    max: 4,
    description: "正面の写真を2枚以上登録してください。顔の輪郭・目鼻口・骨格バランスの印象を安定して反映するために使います。"
  },
  {
    key: "side",
    label: "横顔写真",
    rangeLabel: "2〜4枚",
    min: 2,
    max: 4,
    description: "横顔の写真を2枚以上登録してください。フェイスライン・耳まわり・首元・頭部シルエットを確認するために使います。"
  },
  {
    key: "back",
    label: "後ろ姿写真",
    rangeLabel: "任意 0〜2枚",
    min: 0,
    max: 2,
    description: "後ろ姿の写真は任意です。襟足や後頭部のシルエット確認に使えます。"
  }
];

function UploadButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-teal-900 px-3 text-xs font-semibold text-white shadow-sm hover:bg-teal-950 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <Upload className="h-4 w-4" />
      {pending ? "アップロード中..." : "追加"}
    </button>
  );
}

function uniqueUrls(urls: string[]) {
  return Array.from(new Set(urls.filter(Boolean)));
}

function ReferencePhotoGroup({
  customerId,
  group,
  initialImageUrls
}: {
  customerId: string;
  group: (typeof PHOTO_GROUPS)[number];
  initialImageUrls: string[];
}) {
  const router = useRouter();
  const [state, formAction] = useFormState(
    uploadAiReferencePhotoAction.bind(null, customerId, group.key),
    initialState
  );
  const [fileNames, setFileNames] = useState<string[]>([]);
  const [imageUrls, setImageUrls] = useState(() => uniqueUrls(initialImageUrls));

  useEffect(() => {
    setImageUrls(uniqueUrls(initialImageUrls));
  }, [initialImageUrls]);

  useEffect(() => {
    if (state.ok && state.imageUrls) {
      setImageUrls(state.imageUrls);
      setFileNames([]);
      router.refresh();
    }
  }, [router, state]);

  const remaining = Math.max(0, group.max - imageUrls.length);
  const statusText =
    group.min > 0 && imageUrls.length < group.min
      ? `あと${group.min - imageUrls.length}枚必要です`
      : group.min > 0
        ? "生成条件を満たしています"
        : "任意登録です";

  return (
    <div className="grid gap-3 rounded-md border border-stone-200 bg-white p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-stone-950">{group.label}</h3>
          <p className="mt-1 text-xs font-semibold text-teal-800">{group.rangeLabel}</p>
        </div>
        <span className="inline-flex rounded bg-stone-100 px-2.5 py-1 text-xs font-semibold text-stone-700">
          {imageUrls.length}/{group.max} 登録済み
        </span>
      </div>
      <p className="text-xs leading-5 text-stone-600">{group.description}</p>
      <p className={`text-xs font-semibold ${group.min > 0 && imageUrls.length < group.min ? "text-amber-700" : "text-emerald-700"}`}>
        {statusText}
      </p>

      <div className="grid grid-cols-2 gap-2">
        {imageUrls.map((imageUrl, index) => (
          <div key={imageUrl} className="overflow-hidden rounded-md border border-stone-200 bg-[#f4efe8]">
            <div className="aspect-[4/3]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl} alt={`${group.label} ${index + 1}`} className="h-full w-full object-cover" />
            </div>
            <form action={removeAiReferencePhotoAction} className="border-t border-stone-200 bg-white p-2">
              <input type="hidden" name="customerId" value={customerId} />
              <input type="hidden" name="group" value={group.key} />
              <input type="hidden" name="imageUrl" value={imageUrl} />
              <button
                type="submit"
                className="inline-flex h-8 w-full items-center justify-center gap-1 rounded-md border border-red-100 bg-red-50 px-2 text-xs font-semibold text-red-700 hover:bg-red-100"
              >
                <Trash2 className="h-3.5 w-3.5" />
                削除
              </button>
            </form>
          </div>
        ))}
        {Array.from({ length: remaining }).map((_, index) => (
          <div
            key={`${group.key}-empty-${index}`}
            className="flex aspect-[4/3] flex-col items-center justify-center gap-2 rounded-md border border-dashed border-stone-300 bg-[#f4efe8] text-center text-xs text-stone-500"
          >
            <Camera className="h-6 w-6 text-stone-400" />
            <span>{group.label}</span>
          </div>
        ))}
      </div>

      <form action={formAction} encType="multipart/form-data" className="grid gap-2">
        <label className="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-md border border-stone-200 bg-stone-50 px-3 text-xs font-semibold text-stone-700 hover:bg-stone-100">
          <Upload className="h-4 w-4" />
          写真を選択
          <input
            type="file"
            name="aiReferencePhoto"
            accept="image/jpeg,image/png,image/webp"
            multiple
            disabled={remaining === 0}
            className="sr-only"
            onChange={(event) => setFileNames(Array.from(event.target.files ?? []).map((file) => file.name))}
          />
        </label>
        {fileNames.length > 0 ? (
          <p className="truncate text-xs text-stone-600">{fileNames.join(" / ")}</p>
        ) : null}
        <UploadButton />
        {remaining === 0 ? <p className="text-xs font-semibold text-stone-500">最大枚数まで登録済みです。</p> : null}
        {state.message ? (
          <p className={`text-xs font-semibold ${state.ok ? "text-emerald-700" : "text-red-700"}`}>
            {state.message}
          </p>
        ) : null}
      </form>
    </div>
  );
}

export function AiReferencePhotoUploader({
  customerId,
  frontImageUrls,
  sideImageUrls,
  backImageUrls,
  consent
}: {
  customerId: string;
  frontImageUrls: string[];
  sideImageUrls: string[];
  backImageUrls: string[];
  consent: boolean;
}) {
  const consentAction = updateCustomerAiPhotoConsent.bind(null, customerId);
  const missingMessages = useMemo(
    () =>
      [
        frontImageUrls.length < 2 ? `正面写真があと${2 - frontImageUrls.length}枚必要です` : "",
        sideImageUrls.length < 2 ? `横顔写真があと${2 - sideImageUrls.length}枚必要です` : "",
        !consent ? "AI画像生成への同意が必要です" : ""
      ].filter(Boolean),
    [consent, frontImageUrls.length, sideImageUrls.length]
  );

  return (
    <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-stone-950">AIシミュレーション用写真</h2>
          <p className="mt-2 text-sm leading-6 text-stone-600">
            本人らしさを高めるため、正面写真と横顔写真を複数枚登録してください。細かい角度指定は不要です。システム側で参照写真を組み合わせて使います。
          </p>
        </div>
        <span className="inline-flex rounded bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-900">
          正面 {frontImageUrls.length}/4 ・ 横顔 {sideImageUrls.length}/4 ・ 後ろ姿 {backImageUrls.length}/2
        </span>
      </div>

      <div className="mt-4 grid gap-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900">
        <p className="font-semibold">撮影ガイド</p>
        <ul className="grid gap-1 sm:grid-cols-2">
          <li>・同じ場所、同じ明るさ、同じ服装で撮影してください</li>
          <li>・顔全体と髪の輪郭が見えるようにしてください</li>
          <li>・前髪で目や輪郭が隠れすぎないようにしてください</li>
          <li>・加工アプリやフィルターは使わないでください</li>
          <li>・帽子、マスク、サングラスは外してください</li>
          <li>・カメラは顔の高さに合わせてください</li>
        </ul>
      </div>

      <form action={consentAction} className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-stone-200 bg-[#fbf8f3] p-3">
        <label className="flex items-center gap-2 text-sm font-semibold text-stone-800">
          <input
            name="aiPhotoConsent"
            type="checkbox"
            defaultChecked={consent}
            className="h-4 w-4 rounded border-stone-300 text-teal-700"
          />
          AI画像生成への同意を取得済み
        </label>
        <button
          type="submit"
          className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-stone-200 bg-white px-3 text-xs font-semibold text-stone-700 shadow-sm hover:bg-stone-50"
        >
          <CheckCircle2 className="h-4 w-4" />
          同意状態を保存
        </button>
      </form>

      <div className={`mt-4 rounded-md border px-3 py-2 text-sm font-semibold ${
        missingMessages.length === 0 ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-900"
      }`}>
        {missingMessages.length === 0
          ? "生成可能です。正面写真2枚以上・横顔写真2枚以上・同意済みです。"
          : missingMessages.join("、")}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <ReferencePhotoGroup customerId={customerId} group={PHOTO_GROUPS[0]} initialImageUrls={frontImageUrls} />
        <ReferencePhotoGroup customerId={customerId} group={PHOTO_GROUPS[1]} initialImageUrls={sideImageUrls} />
        <ReferencePhotoGroup customerId={customerId} group={PHOTO_GROUPS[2]} initialImageUrls={backImageUrls} />
      </div>
    </section>
  );
}
