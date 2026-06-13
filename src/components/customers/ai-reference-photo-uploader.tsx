import { Camera } from "lucide-react";

type PhotoGroupKey = "front" | "side" | "back";

type PhotoGroup = {
  key: PhotoGroupKey;
  title: string;
  shortLabel: string;
  requirement: string;
  description: string;
};

const PHOTO_GROUPS: PhotoGroup[] = [
  {
    key: "front",
    title: "正面写真",
    shortLabel: "正面",
    requirement: "必須 1枚",
    description: "顔と髪の正面が分かる写真です。"
  },
  {
    key: "side",
    title: "横写真",
    shortLabel: "横",
    requirement: "必須 1枚",
    description: "横顔、耳まわり、首元のラインが分かる写真です。"
  },
  {
    key: "back",
    title: "斜め後ろ写真",
    shortLabel: "斜め後ろ",
    requirement: "必須 1枚",
    description: "襟足と後頭部のシルエットが分かる写真です。"
  }
];

function uniqueUrls(urls: string[]) {
  return Array.from(new Set(urls.filter(Boolean)));
}

function photoStatus(count: number) {
  return count > 0 ? "登録済み" : "未登録";
}

function groupImages(group: PhotoGroup, imageMap: Record<PhotoGroupKey, string[]>) {
  return uniqueUrls(imageMap[group.key]);
}

function ReferencePhotoGroup({
  group,
  imageUrls
}: {
  group: PhotoGroup;
  imageUrls: string[];
}) {
  const hasImage = imageUrls.length > 0;

  return (
    <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-stone-950">{group.title}</h3>
            <span
              className={`rounded border px-2 py-1 text-[11px] font-semibold ${
                hasImage
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-amber-200 bg-amber-50 text-amber-800"
              }`}
            >
              {photoStatus(imageUrls.length)}
            </span>
          </div>
          <p className="mt-1 text-xs font-semibold text-stone-500">{group.requirement}</p>
        </div>
        <span className="rounded bg-stone-100 px-2.5 py-1 text-xs font-semibold text-stone-700">
          {imageUrls.length}枚
        </span>
      </div>

      <p className="mt-3 text-sm leading-6 text-stone-700">{group.description}</p>

      {hasImage ? (
        <div className="mt-4 grid grid-cols-2 gap-2">
          {imageUrls.map((imageUrl, index) => (
            <figure key={imageUrl} className="overflow-hidden rounded-md border border-stone-200 bg-[#f4efe8]">
              <div className="aspect-[4/3]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl} alt={`${group.title} ${index + 1}`} className="h-full w-full object-cover" />
              </div>
              <figcaption className="border-t border-stone-200 bg-white px-3 py-2 text-center text-xs font-semibold text-stone-700">
                {group.shortLabel} {index + 1}
              </figcaption>
            </figure>
          ))}
        </div>
      ) : (
        <div className="mt-4 flex aspect-[4/3] flex-col items-center justify-center gap-2 rounded-md border border-dashed border-stone-300 bg-[#f4efe8] text-center text-xs text-stone-500">
          <Camera className="h-6 w-6 text-stone-400" />
          <span>{group.shortLabel}写真は未登録です</span>
        </div>
      )}
    </section>
  );
}

export function AiReferencePhotoUploader({
  frontImageUrls,
  sideImageUrls,
  backImageUrls,
  consent
}: {
  frontImageUrls: string[];
  sideImageUrls: string[];
  backImageUrls: string[];
  consent: boolean;
}) {
  const imageMap = {
    front: uniqueUrls(frontImageUrls),
    side: uniqueUrls(sideImageUrls),
    back: uniqueUrls(backImageUrls)
  };
  const missingMessages = [
    imageMap.front.length < 1 ? "正面写真が未登録です" : "",
    imageMap.side.length < 1 ? "横写真が未登録です" : "",
    imageMap.back.length < 1 ? "斜め後ろ写真が未登録です" : "",
    !consent ? "お客様側で写真利用同意が必要です" : ""
  ].filter(Boolean);

  return (
    <section className="rounded-lg border border-teal-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="inline-flex rounded bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-900">
            お客様情報
          </div>
          <h2 className="mt-3 text-xl font-semibold text-stone-950">登録写真</h2>
          <p className="mt-2 text-sm leading-6 text-stone-600">
            お客様側から共有された写真を確認できます。
          </p>
        </div>
        <span className="inline-flex rounded bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-900">
          正面 {imageMap.front.length}枚 ・ 横 {imageMap.side.length}枚 ・ 斜め後ろ {imageMap.back.length}枚
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-stone-200 bg-[#fbf8f3] p-3">
        <div>
          <p className="text-sm font-semibold text-stone-900">
            写真利用同意: {consent ? "同意済み" : "未同意"}
          </p>
          <p className="mt-1 text-xs leading-5 text-stone-600">
            同意はお客様側の相談フォームで取得します。店側では状態確認だけ行います。
          </p>
        </div>
        <span
          className={`inline-flex h-8 items-center rounded-md px-3 text-xs font-semibold ${
            consent ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200" : "bg-amber-50 text-amber-900 ring-1 ring-amber-200"
          }`}
        >
          {consent ? "同意済み" : "未同意"}
        </span>
      </div>

      <div
        className={`mt-4 rounded-md border px-3 py-2 text-sm font-semibold ${
          missingMessages.length === 0
            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
            : "border-amber-200 bg-amber-50 text-amber-900"
        }`}
      >
        {missingMessages.length === 0 ? "提案画像に必要な情報がそろっています。" : missingMessages.join(" / ")}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {PHOTO_GROUPS.map((group) => (
          <ReferencePhotoGroup key={group.key} group={group} imageUrls={groupImages(group, imageMap)} />
        ))}
      </div>
    </section>
  );
}
