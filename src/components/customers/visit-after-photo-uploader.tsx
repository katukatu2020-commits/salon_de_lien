"use client";

import { AlertCircle, Camera, CheckCircle2, Images, LoaderCircle, Plus, Trash2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const MAX_FILES = 4;
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export type VisitAfterPhoto = {
  id: string;
  url: string;
  caption: string | null;
  uploadedByName: string | null;
  createdAt: string;
};

export function VisitAfterPhotoUploader({
  customerId,
  visitId,
  historyDate,
  photos
}: {
  customerId: string;
  visitId: string | null;
  historyDate: string;
  photos: VisitAfterPhoto[];
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [caption, setCaption] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    const nextUrls = selectedFiles.map((file) => URL.createObjectURL(file));
    setPreviewUrls(nextUrls);
    return () => nextUrls.forEach((url) => URL.revokeObjectURL(url));
  }, [selectedFiles]);

  function acceptFiles(values: File[]) {
    setMessage(null);
    if (values.length > MAX_FILES) {
      setMessage({ tone: "error", text: `一度に選べる写真は${MAX_FILES}枚までです。` });
      return;
    }
    if (values.some((file) => !ACCEPTED_TYPES.has(file.type))) {
      setMessage({ tone: "error", text: "JPG、PNG、WebPの写真を選択してください。" });
      return;
    }
    if (values.some((file) => file.size > MAX_FILE_BYTES)) {
      setMessage({ tone: "error", text: "写真は1枚5MB以下にしてください。" });
      return;
    }
    setSelectedFiles(values);
  }

  async function uploadPhotos() {
    if (selectedFiles.length === 0 || isUploading) return;

    setIsUploading(true);
    setMessage(null);
    const formData = new FormData();
    selectedFiles.forEach((file) => formData.append("photos", file));
    if (caption.trim()) formData.set("caption", caption.trim());
    if (!visitId) formData.set("historyDate", historyDate);

    try {
      const endpoint = visitId
        ? `/api/admin/customers/${customerId}/visits/${visitId}/photos`
        : `/api/admin/customers/${customerId}/history-photos`;
      const response = await fetch(endpoint, {
        method: "POST",
        body: formData
      });
      const result = (await response.json()) as { success?: boolean; count?: number; error?: string };
      if (!response.ok || !result.success) {
        throw new Error(result.error || "写真を保存できませんでした。");
      }

      setSelectedFiles([]);
      setCaption("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      setMessage({ tone: "success", text: `${result.count ?? 0}枚の施術後写真を保存しました。` });
      router.refresh();
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "写真を保存できませんでした。" });
    } finally {
      setIsUploading(false);
    }
  }

  async function deletePhoto(photo: VisitAfterPhoto) {
    if (!visitId || deletingPhotoId) return;
    if (!window.confirm("この施術後写真を削除しますか？")) return;

    setDeletingPhotoId(photo.id);
    setMessage(null);
    try {
      const response = await fetch(
        `/api/admin/customers/${customerId}/visits/${visitId}/photos/${photo.id}`,
        { method: "DELETE" }
      );
      const result = (await response.json()) as { success?: boolean; error?: string };
      if (!response.ok || !result.success) {
        throw new Error(result.error || "写真を削除できませんでした。");
      }
      setMessage({ tone: "success", text: "施術後写真を削除しました。" });
      router.refresh();
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "写真を削除できませんでした。" });
    } finally {
      setDeletingPhotoId(null);
    }
  }

  return (
    <section className="mt-4 border-t border-[color:var(--lien-border)] pt-4" aria-label="施術後写真">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#f1dfd7] text-[color:var(--lien-primary-dark)]">
            <Camera className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-[color:var(--lien-ink)]">施術後写真</h3>
            <p className="text-xs text-[color:var(--lien-muted)]">この来店日の仕上がりとして保存されます。</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[color:var(--lien-border)] bg-white px-4 text-sm font-semibold text-[color:var(--lien-primary-dark)] shadow-sm transition hover:bg-[#fff9f5] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Plus className="h-4 w-4" />
          写真を追加
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        multiple
        className="sr-only"
        onChange={(event) => acceptFiles(Array.from(event.target.files ?? []))}
      />

      {photos.length > 0 ? (
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {photos.map((photo) => (
            <div key={photo.id} className="group relative aspect-[4/3] min-w-0">
              <a
                href={photo.url}
                target="_blank"
                rel="noreferrer"
                className="absolute inset-0 overflow-hidden rounded-xl border border-[color:var(--lien-border)] bg-[#eee7df] shadow-sm focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#e9c9be]"
                aria-label={`施術後写真を拡大表示${photo.caption ? `: ${photo.caption}` : ""}`}
              >
                <span
                  className="absolute inset-0 bg-cover bg-center transition duration-200 group-hover:scale-[1.02] motion-reduce:transition-none"
                  style={{ backgroundImage: `url(${photo.url})` }}
                />
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 to-transparent px-2 pb-2 pt-7 text-[10px] leading-4 text-white">
                  {photo.caption || photo.uploadedByName || "施術後の仕上がり"}
                </span>
              </a>
              <button
                type="button"
                onClick={() => deletePhoto(photo)}
                disabled={!visitId || deletingPhotoId !== null}
                className="absolute right-2 top-2 z-10 grid h-10 w-10 place-items-center rounded-full border border-white/80 bg-white/95 text-red-700 shadow-md transition hover:bg-red-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-200 disabled:cursor-wait disabled:opacity-65"
                aria-label={`写真を削除${photo.caption ? `: ${photo.caption}` : ""}`}
                title="写真を削除"
              >
                {deletingPhotoId === photo.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              </button>
            </div>
          ))}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="mt-3 flex min-h-24 w-full items-center justify-center gap-3 rounded-xl border border-dashed border-[#d8c7bb] bg-white/65 px-4 text-left transition hover:border-[color:var(--lien-primary)] hover:bg-white"
        >
          <Images className="h-5 w-5 shrink-0 text-[#a78778]" />
          <span>
            <span className="block text-sm font-semibold text-[color:var(--lien-ink)]">仕上がりを撮影・選択</span>
            <span className="mt-1 block text-xs text-[color:var(--lien-muted)]">来店履歴とお客様アプリから見返せます。</span>
          </span>
        </button>
      )}

      {selectedFiles.length > 0 ? (
        <div className="mt-3 rounded-xl bg-white p-3 shadow-sm ring-1 ring-[color:var(--lien-border)]">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {previewUrls.map((url, index) => (
              <div
                key={url}
                role="img"
                aria-label={`選択中の写真 ${index + 1}`}
                className="aspect-[4/3] rounded-lg bg-[#eee7df] bg-cover bg-center"
                style={{ backgroundImage: `url(${url})` }}
              />
            ))}
          </div>
          <label className="mt-3 grid gap-1.5 text-xs font-semibold text-[color:var(--lien-ink)]">
            写真メモ（任意）
            <input
              value={caption}
              onChange={(event) => setCaption(event.target.value.slice(0, 120))}
              maxLength={120}
              placeholder="例: カラー後のツヤと毛先の収まり"
              className="h-11 rounded-xl border border-[color:var(--lien-border)] bg-white px-3 text-sm font-normal outline-none focus:border-[color:var(--lien-primary)] focus:ring-4 focus:ring-[#e9c9be]/45"
            />
          </label>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-[color:var(--lien-muted)]">{selectedFiles.length}枚をこの来店履歴に追加します。</p>
            <button
              type="button"
              onClick={uploadPhotos}
              disabled={isUploading}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[color:var(--lien-primary)] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[color:var(--lien-primary-dark)] disabled:cursor-wait disabled:opacity-70"
            >
              {isUploading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {isUploading ? "保存中..." : "来店履歴に保存"}
            </button>
          </div>
        </div>
      ) : null}

      {message ? (
        <p
          role={message.tone === "error" ? "alert" : "status"}
          className={`mt-3 flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold ${
            message.tone === "success" ? "bg-[#eef6ee] text-[#466349]" : "bg-[#fff1ef] text-[#8b342b]"
          }`}
        >
          {message.tone === "success" ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          {message.text}
        </p>
      ) : null}
    </section>
  );
}
