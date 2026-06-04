import { put } from "@vercel/blob";

const STYLE_IMAGE_ANGLES = [
  {
    key: "front",
    label: "斜め正面",
    slug: "front-three-quarter",
    referenceRole:
      "aiFrontImageUrlは、顔全体、目鼻口、左右バランス、前髪、正面印象の基準です。",
    prompt:
      "斜め正面の角度で生成してください。両目、鼻、口、輪郭が明瞭に見える構図にしてください。本人の正面印象を維持し、前髪、顔周り、トップ、サイドの髪型だけを自然に調整してください。顔の輪郭、顎の形、頬骨、額の広さ、目元、眉、鼻、口元、耳、首、表情は変更しないでください。"
  },
  {
    key: "side",
    label: "横",
    slug: "side",
    referenceRole:
      "aiSideImageUrlは、横顔、鼻先ライン、耳位置、後頭部形状、首ラインの基準です。",
    prompt:
      "真横またはそれに近い横顔の角度で生成してください。鼻筋、鼻先、口元、顎ライン、耳の位置と大きさ、首の長さと太さ、後頭部の丸みを忠実に維持してください。サイド、耳まわり、襟足、後頭部の髪の丸み、トップの高さだけを髪型として調整してください。横顔の人物自体を作り替えないでください。"
  },
  {
    key: "back",
    label: "斜め後ろ",
    slug: "back-three-quarter",
    referenceRole:
      "aiBackImageUrlは、後頭部、襟足、毛流れ、後ろ姿の基準です。",
    prompt:
      "斜め後ろの角度で生成してください。後頭部、襟足、毛流れ、側頭部の収まりが分かる構図にしてください。首、耳、肩、後頭部シルエット、頭の向きは維持してください。横・正面情報も本人同一性の補助として反映し、別人の後ろ姿にならないようにしてください。顔を新しく生成し直さないでください。"
  }
] as const;

type ReferenceImageUrls = {
  front: string;
  side: string;
  back: string;
};

type ReferenceImageBytes = {
  key: keyof ReferenceImageUrls;
  label: string;
  slug: string;
  bytes: Buffer;
  contentType: string;
};

export async function generateStyleSimulationImages({
  customerId,
  referenceImageUrls,
  styleName,
  imageEditPrompt
}: {
  customerId: string;
  referenceImageUrls: ReferenceImageUrls;
  styleName: string;
  imageEditPrompt: string;
}): Promise<string[]> {
  if (process.env.ENABLE_STYLE_IMAGE_GENERATION !== "true") {
    return [];
  }

  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set.");
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error("BLOB_READ_WRITE_TOKEN is not set.");
  }

  const OpenAI = (await import("openai")).default;
  const { toFile } = await import("openai/uploads");
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const safeStyleName = styleName.replace(/[^\w.-]/g, "_");
  const generatedUrls: string[] = [];
  const referenceImages: ReferenceImageBytes[] = [];

  for (const angle of STYLE_IMAGE_ANGLES) {
    const sourceImageUrl = referenceImageUrls[angle.key];
    const sourceResponse = await fetch(sourceImageUrl);

    if (!sourceResponse.ok) {
      throw new Error(`Failed to fetch ${angle.label} reference image: ${sourceResponse.status}`);
    }

    referenceImages.push({
      key: angle.key,
      label: angle.label,
      slug: angle.slug,
      bytes: Buffer.from(await sourceResponse.arrayBuffer()),
      contentType: sourceResponse.headers.get("content-type") ?? "image/png"
    });
  }

  for (const angle of STYLE_IMAGE_ANGLES) {
    const primaryReference = referenceImages.find((reference) => reference.key === angle.key);

    if (!primaryReference) {
      throw new Error(`${angle.label} reference image is missing.`);
    }

    const orderedReferences = [
      primaryReference,
      ...referenceImages.filter((reference) => reference.key !== angle.key)
    ];
    const referenceFiles = await Promise.all(
      orderedReferences.map((reference, index) =>
        toFile(reference.bytes, `${index === 0 ? "primary" : "support"}-${reference.slug}-reference.png`, {
          type: reference.contentType
        })
      )
    );
    const prompt = [
      "これは美容師が顧客に見せるための髪型シミュレーション画像です。別人生成ではありません。",
      "3枚の参照写真は同一人物です。本人同一性の維持を最優先してください。",
      "優先順位: 1. 本人同一性の維持、2. 骨格・顔パーツ・頭部形状の忠実な再現、3. 背景・ライティング・構図の統一、4. 髪型提案の反映、5. 見栄えの微調整。",
      "髪型をよく見せることより、本人に見えることを優先してください。",
      "本人性維持優先。髪型のみ編集。顔パーツ変更禁止。自然な試着イメージ。",
      "顔の輪郭、顎の形、頬骨の出方、額の広さ、目の大きさ・位置・間隔、眉の位置・角度、鼻筋・鼻先・小鼻の形、唇の厚み・口角位置、耳の位置と大きさ、首の長さ・太さ、頭部全体の形、年齢感、性別表現、肌の質感、その人らしい印象を忠実に保持してください。",
      "変更してよいものは、髪の長さ、前髪、サイド、襟足、トップの高さ、毛流れ、束感、ボリュームだけです。",
      "メイクの変化、別人化、美化しすぎ、若返り、老けさせる処理、目を大きくする、鼻筋を変える、顎を細くする、肌を過度に補正することは禁止です。",
      "年齢感・性別感・民族的特徴を変えないでください。",
      "背景・ライティング・画角は全提案共通フォーマットで統一してください。",
      "背景は無地のニュートラル背景（薄いグレーから青みグレー）。背景の装飾、家具、屋外要素は禁止です。",
      "ライティングは均一で自然なスタジオ風の柔らかい光。露出は明るすぎず暗すぎず、色味はナチュラル。",
      "構図はバストアップから肩上。カメラ距離、顔サイズ、余白、表情トーンを3方向・全提案でできるだけ揃えてください。",
      "服装は目立たない無地・中立的なトップス。余計なアクセサリを追加しないでください。",
      "提案ごとの画像差分は、主に髪の長さ、前髪、毛流れ、ボリューム位置、襟足、束感・質感だけにしてください。",
      "写真に足りない部分は他の角度参照から最小限だけ補完してください。それでも不足する部分だけ控えめに補い、推測で別人化しないでください。",
      "比較用画像として整然とした、相談用の統一フォーマットで出力してください。",
      `主参照: ${angle.label}。入力画像配列の1枚目をこの角度の最重要基準として扱ってください。`,
      "入力画像配列の2枚目以降は、同一人物性を保つための補助参照です。主参照を上書きせず、不足部分の最小補完にだけ使ってください。",
      STYLE_IMAGE_ANGLES.map((referenceAngle) => referenceAngle.referenceRole).join("\n"),
      `生成角度: ${angle.label}`,
      `提案スタイル: ${styleName}`,
      angle.prompt,
      imageEditPrompt
    ].join("\n");

    const images = await client.images.edit({
      image: referenceFiles,
      prompt,
      model: process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-1.5",
      n: 1,
      size: "1024x1024",
      quality: "low",
      output_format: "webp",
      input_fidelity: "high"
    });

    const generatedImage = images.data?.[0];

    if (!generatedImage?.b64_json && !generatedImage?.url) {
      continue;
    }

    const imageBuffer = generatedImage.b64_json
      ? Buffer.from(generatedImage.b64_json, "base64")
      : Buffer.from(await (await fetch(generatedImage.url as string)).arrayBuffer());

    const blob = await put(
      `customers/${customerId}/style-simulations/${Date.now()}-${angle.slug}-${safeStyleName}.webp`,
      imageBuffer,
      {
        access: "public",
        addRandomSuffix: true,
        contentType: "image/webp",
        token: process.env.BLOB_READ_WRITE_TOKEN
      }
    );

    generatedUrls.push(blob.url);
  }

  return generatedUrls;
}
