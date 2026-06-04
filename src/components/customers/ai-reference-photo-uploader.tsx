"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";
import { Camera, CheckCircle2, Upload } from "lucide-react";
import {
  updateCustomerAiPhotoConsent,
  uploadCustomerAiReferencePhoto
} from "@/lib/actions";

type AngleKey = "front" | "side" | "back";

type UploadState = {
  ok: boolean;
  message: string;
  imageUrl?: string;
  cacheKey?: number;
};

const initialState: UploadState = {
  ok: false,
  message: ""
};

const ANGLES: Array<{
  key: AngleKey;
  label: string;
  description: string;
}> = [
  { key: "front", label: "斜め正面", description: "前髪・顔周り・全体バランス用" },
  { key: "side", label: "横", description: "耳まわり・トップの高さ・フェイスライン用" },
  { key: "back", label: "斜め後ろ", description: "後頭部・襟足・毛流れ用" }
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
      {pending ? "アップロード中..." : "保存"}
    </button>
  );
}

function ReferencePhotoForm({
  customerId,
  angle,
  initialImageUrl
}: {
  customerId: string;
  angle: (typeof ANGLES)[number];
  initialImageUrl?: string | null;
}) {
  const router = useRouter();
  const [state, formAction] = useFormState(
    uploadCustomerAiReferencePhoto.bind(null, customerId, angle.key),
    initialState
  );
  const [fileName, setFileName] = useState("");
  const [imageUrl, setImageUrl] = useState(initialImageUrl ?? "");

  useEffect(() => {
    if (state.ok && state.imageUrl) {
      setImageUrl(`${state.imageUrl}?v=${state.cacheKey ?? Date.now()}`);
      setFileName("");
      router.refresh();
    }
  }, [router, state]);

  return (
    <form action={formAction} encType="multipart/form-data" className="grid gap-3 rounded-md border border-stone-200 bg-white p-3">
      <div className="overflow-hidden rounded-md border border-stone-200 bg-[#f4efe8]">
        <div className="aspect-[4/3]">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt={`${angle.label}のAI参照写真`} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-stone-500">
              <Camera className="h-7 w-7 text-stone-400" />
              <span className="font-semibold text-stone-700">{angle.label}</span>
            </div>
          )}
        </div>
        <div className="border-t border-stone-200 bg-white px-3 py-2">
          <p className="text-sm font-semibold text-stone-950">{angle.label}</p>
          <p className="mt-1 text-xs text-stone-500">{angle.description}</p>
        </div>
      </div>

      <label className="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-md border border-stone-200 bg-stone-50 px-3 text-xs font-semibold text-stone-700 hover:bg-stone-100">
        <Upload className="h-4 w-4" />
        写真を選択
        <input
          type="file"
          name="aiReferencePhoto"
          accept="image/jpeg,image/png,image/webp"
          required
          className="sr-only"
          onChange={(event) => setFileName(event.target.files?.[0]?.name ?? "")}
        />
      </label>
      {fileName ? <p className="truncate text-xs text-stone-600">{fileName}</p> : null}
      <UploadButton />
      {state.message ? (
        <p className={`text-xs font-semibold ${state.ok ? "text-emerald-700" : "text-red-700"}`}>
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

export function AiReferencePhotoUploader({
  customerId,
  frontImageUrl,
  sideImageUrl,
  backImageUrl,
  consent
}: {
  customerId: string;
  frontImageUrl?: string | null;
  sideImageUrl?: string | null;
  backImageUrl?: string | null;
  consent: boolean;
}) {
  const consentAction = updateCustomerAiPhotoConsent.bind(null, customerId);
  const registeredCount = [frontImageUrl, sideImageUrl, backImageUrl].filter(Boolean).length;

  return (
    <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-stone-950">AIシミュレーション用写真</h2>
          <p className="mt-2 text-sm leading-6 text-stone-600">
            本人写真と顔型・骨格バランスの印象を参考にした相談用シミュレーションのため、3方向の本人参照写真を登録してください。
          </p>
        </div>
        <span className="inline-flex rounded bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-900">
          {registeredCount}/3 登録済み
        </span>
      </div>

      <div className="mt-4 grid gap-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900">
        <p className="font-semibold">撮影ガイド</p>
        <ul className="grid gap-1 sm:grid-cols-2">
          <li>・顔全体が見える</li>
          <li>・髪が隠れすぎない</li>
          <li>・明るい場所</li>
          <li>・加工アプリなし</li>
          <li>・帽子なし</li>
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

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <ReferencePhotoForm customerId={customerId} angle={ANGLES[0]} initialImageUrl={frontImageUrl} />
        <ReferencePhotoForm customerId={customerId} angle={ANGLES[1]} initialImageUrl={sideImageUrl} />
        <ReferencePhotoForm customerId={customerId} angle={ANGLES[2]} initialImageUrl={backImageUrl} />
      </div>
    </section>
  );
}
