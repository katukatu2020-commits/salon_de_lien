"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";
import { Upload, UserRound } from "lucide-react";
import { uploadCustomerProfileImage } from "@/lib/actions";

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

function UploadButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="h-8 rounded-md bg-teal-900 px-3 text-xs font-semibold text-white shadow-sm hover:bg-teal-950 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "アップロード中..." : "アップロード"}
    </button>
  );
}

export function ProfileImageUploader({
  customerId,
  customerName,
  profileImageUrl
}: {
  customerId: string;
  customerName: string;
  profileImageUrl?: string | null;
}) {
  const router = useRouter();
  const [state, formAction] = useFormState(uploadCustomerProfileImage.bind(null, customerId), initialState);
  const [fileName, setFileName] = useState("");
  const [localImageUrl, setLocalImageUrl] = useState(profileImageUrl ?? "");

  useEffect(() => {
    if (state.ok && state.imageUrl) {
      setLocalImageUrl(`${state.imageUrl}?v=${state.cacheKey ?? Date.now()}`);
      setFileName("");
      router.refresh();
    }
  }, [router, state]);

  return (
    <div className="grid justify-items-center gap-3">
      <div className="relative flex h-32 w-32 items-center justify-center overflow-hidden rounded-full bg-[#e7ebe7] text-4xl font-semibold text-teal-900 shadow-inner">
        {localImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={localImageUrl} alt={`${customerName}のプロフィール画像`} className="h-full w-full object-cover" />
        ) : (
          customerName.slice(0, 1)
        )}
        <span className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-teal-900 text-white ring-4 ring-white">
          <UserRound className="h-4 w-4" />
        </span>
      </div>
      <form action={formAction} encType="multipart/form-data" className="grid justify-items-center gap-2">
        <label className="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-md border border-stone-200 bg-white px-3 text-xs font-semibold text-stone-700 shadow-sm hover:bg-stone-50">
          <Upload className="h-4 w-4" />
          画像を選択
          <input
            type="file"
            name="profileImage"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            required
            onChange={(event) => setFileName(event.target.files?.[0]?.name ?? "")}
          />
        </label>
        {fileName ? <p className="max-w-32 truncate text-center text-[11px] text-stone-600">{fileName}</p> : null}
        <UploadButton />
        <p className="text-center text-[11px] leading-4 text-stone-500">JPG / PNG / WebP・5MB以下</p>
        {state.message ? (
          <p className={`text-center text-xs font-semibold ${state.ok ? "text-emerald-700" : "text-red-700"}`}>
            {state.message}
          </p>
        ) : null}
      </form>
    </div>
  );
}
