"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";
import { Camera, CheckCircle2, ImagePlus, LoaderCircle, Trash2, Upload } from "lucide-react";
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
  cacheKey?: number;
  imageUrls?: string[];
};

type PhotoGroup = {
  key: PhotoGroupKey;
  title: string;
  shortLabel: string;
  description: string;
};

const initialUploadState: UploadState = {
  ok: false,
  message: ""
};

const PHOTO_GROUPS: PhotoGroup[] = [
  {
    key: "front",
    title: "正面写真",
    shortLabel: "正面",
    description: "顔まわりと前髪、全体の長さがわかる写真を登録します。"
  },
  {
    key: "side",
    title: "横写真",
    shortLabel: "横",
    description: "耳まわり、横のシルエット、首元の長さがわかる写真を登録します。"
  },
  {
    key: "back",
    title: "斜め後ろ写真",
    shortLabel: "後ろ",
    description: "後頭部と襟足、全体の丸みがわかる写真を登録します。"
  }
];

function uniqueUrls(urls: Array<string | null | undefined>) {
  return Array.from(new Set(urls.filter((url): url is string => Boolean(url))));
}

function UploadButton({ disabled }: { disabled?: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-teal-900 px-3 text-sm font-semibold text-white shadow-sm hover:bg-teal-950 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
      {pending ? "登録中" : "写真を登録"}
    </button>
  );
}

function AiPhotoGroupCard({
  customerId,
  group,
  initialImageUrls
}: {
  customerId: string;
  group: PhotoGroup;
  initialImageUrls: string[];
}) {
  const router = useRouter();
  const normalizedInitialImageUrls = useMemo(() => uniqueUrls(initialImageUrls), [initialImageUrls]);
  const [state, formAction] = useFormState(
    uploadAiReferencePhotoAction.bind(null, customerId, group.key),
    initialUploadState
  );
  const [imageUrls, setImageUrls] = useState(normalizedInitialImageUrls);
  const [fileName, setFileName] = useState("");
  const [removeMessage, setRemoveMessage] = useState("");
  const [isRemoving, startRemoveTransition] = useTransition();
  const hasImage = imageUrls.length > 0;

  useEffect(() => {
    setImageUrls(normalizedInitialImageUrls);
  }, [normalizedInitialImageUrls]);

  useEffect(() => {
    if (!state.ok) {
      return;
    }

    if (state.imageUrls) {
      setImageUrls(uniqueUrls(state.imageUrls));
    } else if (state.imageUrl) {
      setImageUrls([state.imageUrl]);
    }

    setFileName("");
    setRemoveMessage("");
    router.refresh();
  }, [router, state]);

  function removeImage(imageUrl: string) {
    const confirmed = window.confirm(`${group.title}の登録を外しますか？`);

    if (!confirmed) {
      return;
    }

    setRemoveMessage("");
    startRemoveTransition(() => {
      void (async () => {
        const formData = new FormData();
        formData.set("customerId", customerId);
        formData.set("group", group.key);
        formData.set("imageUrl", imageUrl);

        await removeAiReferencePhotoAction(formData);
        setImageUrls((current) => current.filter((url) => url !== imageUrl));
        setRemoveMessage("登録を外しました。");
        router.refresh();
      })().catch(() => {
        setRemoveMessage("登録を外せませんでした。時間をおいてもう一度お試しください。");
      });
    });
  }

  return (
    <article className="rounded-md border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-stone-950">{group.title}</h3>
            <span
              className={`rounded border px-2 py-1 text-[11px] font-semibold ${
                hasImage
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-amber-200 bg-amber-50 text-amber-900"
              }`}
            >
              {hasImage ? "登録済み" : "未登録"}
            </span>
          </div>
          <p className="mt-2 text-xs leading-5 text-stone-600">{group.description}</p>
        </div>
        <Camera className="h-5 w-5 shrink-0 text-teal-800" />
      </div>

      {hasImage ? (
        <div className="mt-4 grid gap-3">
          {imageUrls.map((imageUrl, index) => (
            <figure key={imageUrl} className="overflow-hidden rounded-md border border-stone-200 bg-[#f4efe8]">
              <div className="aspect-[4/3]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl} alt={`${group.shortLabel}写真 ${index + 1}`} className="h-full w-full object-cover" />
              </div>
              <figcaption className="flex items-center justify-between gap-2 border-t border-stone-200 bg-white px-3 py-2 text-xs font-semibold text-stone-700">
                <span>{group.shortLabel} {index + 1}</span>
                <button
                  type="button"
                  disabled={isRemoving}
                  onClick={() => removeImage(imageUrl)}
                  className="inline-flex h-8 items-center justify-center gap-1 rounded-md border border-red-100 bg-red-50 px-2 text-[11px] font-semibold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isRemoving ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  登録を外す
                </button>
              </figcaption>
            </figure>
          ))}
        </div>
      ) : (
        <form action={formAction} encType="multipart/form-data" className="mt-4 grid gap-3 rounded-md border border-dashed border-stone-300 bg-[#fbf8f3] p-3">
          <label className="grid cursor-pointer gap-2 rounded-md border border-stone-200 bg-white px-3 py-3 text-sm font-semibold text-stone-700 shadow-sm hover:bg-stone-50">
            <span className="inline-flex items-center gap-2">
              <ImagePlus className="h-4 w-4 text-teal-800" />
              写真を選択
            </span>
            <input
              type="file"
              name="aiReferencePhoto"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              required
              onChange={(event) => setFileName(event.target.files?.[0]?.name ?? "")}
            />
            {fileName ? <span className="truncate text-xs font-medium text-stone-500">{fileName}</span> : null}
          </label>
          <UploadButton />
          <p className="text-xs leading-5 text-stone-500">JPG / PNG / WebP、5MBまで登録できます。</p>
        </form>
      )}

      {state.message ? (
        <p className={`mt-3 rounded-md border px-3 py-2 text-xs font-semibold ${
          state.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-700"
        }`}>
          {state.message}
        </p>
      ) : null}
      {removeMessage ? (
        <p className="mt-3 rounded-md border border-stone-200 bg-stone-50 px-3 py-2 text-xs font-semibold text-stone-700">
          {removeMessage}
        </p>
      ) : null}
    </article>
  );
}

export function CustomerAppAiPhotoUploader({
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
  const router = useRouter();
  const [localConsent, setLocalConsent] = useState(consent);
  const [consentMessage, setConsentMessage] = useState("");
  const [isUpdatingConsent, startConsentTransition] = useTransition();
  const imageMap: Record<PhotoGroupKey, string[]> = {
    front: uniqueUrls(frontImageUrls),
    side: uniqueUrls(sideImageUrls),
    back: uniqueUrls(backImageUrls)
  };
  const registeredCount = imageMap.front.length + imageMap.side.length + imageMap.back.length;
  const isReady = localConsent && PHOTO_GROUPS.every((group) => imageMap[group.key].length > 0);

  useEffect(() => {
    setLocalConsent(consent);
  }, [consent]);

  function changeConsent(nextConsent: boolean) {
    setConsentMessage("");
    startConsentTransition(() => {
      void (async () => {
        const formData = new FormData();

        if (nextConsent) {
          formData.set("aiPhotoConsent", "on");
        }

        await updateCustomerAiPhotoConsent(customerId, formData);
        setLocalConsent(nextConsent);
        setConsentMessage(nextConsent ? "写真利用に同意しました。" : "写真利用の同意を解除しました。");
        router.refresh();
      })().catch(() => {
        setConsentMessage("同意状態を更新できませんでした。時間をおいてもう一度お試しください。");
      });
    });
  }

  return (
    <section id="ai-photos" className="rounded-lg border border-teal-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2 rounded bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-900">
            <Camera className="h-4 w-4" />
            AI写真登録
          </div>
          <h2 className="mt-3 text-lg font-semibold text-stone-950">AI提案用の写真</h2>
          <p className="mt-2 text-sm leading-6 text-stone-600">
            正面、横、斜め後ろの写真を登録すると、次回の髪型提案に使えます。
          </p>
        </div>
        <span className={`inline-flex rounded border px-3 py-1 text-xs font-semibold ${
          isReady ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-900"
        }`}>
          {registeredCount}/3 登録
        </span>
      </div>

      <div className="mt-4 rounded-md border border-stone-200 bg-[#fbf8f3] p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-stone-950">写真利用の同意</p>
            <p className="mt-1 text-xs leading-5 text-stone-600">
              登録写真はSalon de Lienでの髪型提案と仕上がりイメージ作成に使います。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={isUpdatingConsent || localConsent}
              onClick={() => changeConsent(true)}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-teal-900 px-3 text-xs font-semibold text-white hover:bg-teal-950 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isUpdatingConsent ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              同意する
            </button>
            <button
              type="button"
              disabled={isUpdatingConsent || !localConsent}
              onClick={() => changeConsent(false)}
              className="inline-flex h-9 items-center justify-center rounded-md border border-stone-200 bg-white px-3 text-xs font-semibold text-stone-700 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              解除
            </button>
          </div>
        </div>
        <p className={`mt-3 rounded-md border px-3 py-2 text-xs font-semibold ${
          localConsent ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-900"
        }`}>
          {localConsent ? "写真利用に同意済みです。" : "AI提案に使うには写真利用への同意が必要です。"}
        </p>
        {consentMessage ? (
          <p className="mt-2 text-xs font-semibold text-stone-600">{consentMessage}</p>
        ) : null}
      </div>

      <div className="mt-4 grid gap-3">
        {PHOTO_GROUPS.map((group) => (
          <AiPhotoGroupCard
            key={group.key}
            customerId={customerId}
            group={group}
            initialImageUrls={imageMap[group.key]}
          />
        ))}
      </div>
    </section>
  );
}
