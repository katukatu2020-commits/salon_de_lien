"use client";

import { AlertCircle, CheckCircle2, LoaderCircle, Upload, UserRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SquareProfileImageCropper } from "@/components/customers/square-profile-image-cropper";

const MAX_PROFILE_IMAGE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

type UploadMessage = {
  tone: "success" | "error";
  text: string;
};

export function ProfileImageUploader({
  customerName,
  profileImageUrl
}: {
  customerId: string;
  customerName: string;
  profileImageUrl?: string | null;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [savedImageUrl, setSavedImageUrl] = useState(profileImageUrl ?? "");
  const [cropSource, setCropSource] = useState<File | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedPreviewUrl, setSelectedPreviewUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState<UploadMessage | null>(null);

  useEffect(() => {
    setSavedImageUrl(profileImageUrl ?? "");
  }, [profileImageUrl]);

  useEffect(() => {
    if (!selectedFile) {
      setSelectedPreviewUrl("");
      return;
    }
    const objectUrl = URL.createObjectURL(selectedFile);
    setSelectedPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [selectedFile]);

  function chooseFile(file: File | undefined) {
    setMessage(null);
    if (!file) return;
    if (!ACCEPTED_TYPES.has(file.type)) {
      setMessage({ tone: "error", text: "JPG、PNG、WebPの画像を選択してください。" });
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    if (file.size > MAX_PROFILE_IMAGE_SIZE) {
      setMessage({ tone: "error", text: "プロフィール画像は5MB以下にしてください。" });
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setCropSource(file);
  }

  async function uploadImage() {
    if (!selectedFile || isUploading) return;
    setIsUploading(true);
    setMessage(null);

    const formData = new FormData();
    formData.set("profileImage", selectedFile);

    try {
      const response = await fetch("/api/customer/profile-image", {
        method: "POST",
        body: formData,
        credentials: "same-origin"
      });
      const result = (await response.json().catch(() => null)) as
        | { success?: boolean; imageUrl?: string; message?: string; error?: string }
        | null;
      if (!response.ok || !result?.success || !result.imageUrl) {
        throw new Error(result?.error || "画像を保存できませんでした。");
      }

      setSavedImageUrl(result.imageUrl);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setMessage({ tone: "success", text: result.message || "プロフィール画像を更新しました。" });
      router.refresh();
    } catch (error) {
      setMessage({
        tone: "error",
        text: error instanceof Error ? error.message : "画像を保存できませんでした。"
      });
    } finally {
      setIsUploading(false);
    }
  }

  const displayedImageUrl = selectedPreviewUrl || savedImageUrl;

  return (
    <div className="grid justify-items-center gap-3">
      <div className="relative flex h-32 w-32 items-center justify-center overflow-hidden rounded-full bg-[#e7ebe7] text-4xl font-semibold text-teal-900 shadow-inner">
        {displayedImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={displayedImageUrl} alt={`${customerName}のプロフィール画像`} className="h-full w-full object-cover" />
        ) : (
          customerName.slice(0, 1)
        )}
        <span className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-teal-900 text-white ring-4 ring-white">
          <UserRound className="h-4 w-4" />
        </span>
      </div>

      <div className="grid justify-items-center gap-2">
        <label className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-full border border-[#e8ded2] bg-white px-4 text-sm font-semibold text-[#4f463f] shadow-sm transition hover:bg-[#f6efe6] focus-within:ring-4 focus-within:ring-[#e9c9be]/50">
          <Upload className="h-4 w-4" />
          画像を選ぶ
          <input
            ref={fileInputRef}
            type="file"
            name="profileImage"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            disabled={isUploading}
            onChange={(event) => chooseFile(event.target.files?.[0])}
          />
        </label>

        {selectedFile ? (
          <>
            <p className="max-w-56 truncate text-center text-xs text-[#7c7168]">選択中: {selectedFile.name}</p>
            <button
              type="button"
              onClick={uploadImage}
              disabled={isUploading}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#8f4f42] px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-[#7d453a] disabled:cursor-wait disabled:opacity-60"
            >
              {isUploading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {isUploading ? "保存中..." : "プロフィール画像を保存"}
            </button>
          </>
        ) : null}

        <p className="text-center text-[11px] leading-4 text-[#7c7168]">JPG / PNG / WebP、5MB以下</p>
        {message ? (
          <p
            role={message.tone === "error" ? "alert" : "status"}
            aria-live="polite"
            className={`flex items-center gap-2 rounded-xl px-3 py-2 text-center text-xs font-semibold ${
              message.tone === "success" ? "bg-[#edf7ef] text-[#315c3c]" : "bg-red-50 text-red-800"
            }`}
          >
            {message.tone === "success" ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            {message.text}
          </p>
        ) : null}
      </div>

      {cropSource ? (
        <SquareProfileImageCropper
          file={cropSource}
          onCancel={() => {
            setCropSource(null);
            if (fileInputRef.current) fileInputRef.current.value = "";
          }}
          onConfirm={(croppedFile) => {
            setSelectedFile(croppedFile);
            setCropSource(null);
          }}
        />
      ) : null}
    </div>
  );
}
