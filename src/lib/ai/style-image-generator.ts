import { put } from "@vercel/blob";

const STYLE_IMAGE_ANGLES = [
  {
    key: "front",
    label: "斜め正面",
    slug: "front-three-quarter",
    prompt:
      "斜め正面の相談用イメージを生成してください。正面写真群を、顔の輪郭・目鼻口・顔全体の比率・年齢感・本人性の最優先基準として扱ってください。横顔写真群は耳位置、首元、頭部シルエットの補助として使ってください。斜め正面では、目元・鼻・口元・頬・顎・輪郭の本人性を最優先で維持してください。前髪、顔周りの毛流れ、トップ、サイドの髪だけを変更してください。顔の表情や顔パーツを描き直さないでください。For the three-quarter front view, preserve the original eyes, nose, mouth, cheeks, chin, jawline, and facial proportions. Only modify the bangs, hair around the face, top volume, side hair, and hair flow. Do not redraw or reinterpret the face."
  },
  {
    key: "side",
    label: "横",
    slug: "side",
    prompt:
      "横顔の相談用イメージを生成してください。横顔写真群を、鼻筋・口元・顎ライン・耳位置・首ライン・頭部シルエットの最優先基準として扱ってください。正面写真群は本人性固定用に使ってください。横顔では、鼻筋・口元・顎ライン・耳の位置・首のラインを維持してください。サイドの髪、耳まわり、襟足、トップのボリュームだけを変更してください。横顔の輪郭を作り替えないでください。For the side view, preserve the original nose profile, mouth, chin line, ear position, neck line, and side facial silhouette. Only modify side hair, hair around the ears, neckline hair, and top volume. Do not recreate the side profile."
  },
  {
    key: "back",
    label: "斜め後ろ",
    slug: "back-three-quarter",
    prompt:
      "斜め後ろの相談用イメージを生成してください。後ろ姿写真がある場合は、後頭部・襟足・毛流れの基準として優先してください。後ろ姿写真がない場合は、横顔写真群から襟足・後頭部・首元を最小限補完してください。正面写真群は本人性固定用に使い、別人の後ろ姿にしないでください。斜め後ろでは、首、耳、肩、頭部の基本シルエット、体の向きを維持してください。襟足、後頭部の髪、毛流れ、サイドとのつながりだけを変更してください。人物の体や頭の形を作り替えないでください。For the rear three-quarter view, preserve the original neck, ears, shoulders, head silhouette, and body direction. Only modify neckline hair, back hair volume, hair flow, and side-to-back hair connection. Do not recreate the person's head or body shape."
  }
] as const;

export type AiReferencePhotos = {
  frontUrls: string[];
  sideUrls: string[];
  backUrls: string[];
};

type ReferenceImageBytes = {
  group: "front" | "side" | "back";
  label: string;
  slug: string;
  bytes: Buffer;
  contentType: string;
};

function uniqueUrls(urls: string[]) {
  return Array.from(new Set(urls.filter(Boolean)));
}

function orderReferencesForAngle(
  angleKey: (typeof STYLE_IMAGE_ANGLES)[number]["key"],
  references: ReferenceImageBytes[]
) {
  const byGroup = (group: ReferenceImageBytes["group"]) => references.filter((reference) => reference.group === group);

  if (angleKey === "front") {
    return [...byGroup("front"), ...byGroup("side"), ...byGroup("back")];
  }

  if (angleKey === "side") {
    return [...byGroup("side"), ...byGroup("front"), ...byGroup("back")];
  }

  return [...byGroup("back"), ...byGroup("side"), ...byGroup("front")];
}

export async function generateStyleSimulationImages({
  customerId,
  referencePhotos,
  styleName,
  imageEditPrompt
}: {
  customerId: string;
  referencePhotos: AiReferencePhotos;
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

  const frontUrls = uniqueUrls(referencePhotos.frontUrls);
  const sideUrls = uniqueUrls(referencePhotos.sideUrls);
  const backUrls = uniqueUrls(referencePhotos.backUrls);

  if (frontUrls.length < 2 || sideUrls.length < 2) {
    throw new Error("AIシミュレーションには正面写真2枚以上・横顔写真2枚以上が必要です。");
  }

  const OpenAI = (await import("openai")).default;
  const { toFile } = await import("openai/uploads");
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const safeStyleName = styleName.replace(/[^\w.-]/g, "_");
  const generatedUrls: string[] = [];
  const referenceImages: ReferenceImageBytes[] = [];
  const groupedUrls: Array<{ group: ReferenceImageBytes["group"]; label: string; slug: string; urls: string[] }> = [
    { group: "front", label: "正面写真", slug: "front", urls: frontUrls },
    { group: "side", label: "横顔写真", slug: "side", urls: sideUrls },
    { group: "back", label: "後ろ姿写真", slug: "back", urls: backUrls }
  ];

  for (const group of groupedUrls) {
    for (const [index, sourceImageUrl] of group.urls.entries()) {
      const sourceResponse = await fetch(sourceImageUrl);

      if (!sourceResponse.ok) {
        throw new Error(`Failed to fetch ${group.label} reference image: ${sourceResponse.status}`);
      }

      referenceImages.push({
        group: group.group,
        label: `${group.label}${index + 1}`,
        slug: `${group.slug}-${index + 1}`,
        bytes: Buffer.from(await sourceResponse.arrayBuffer()),
        contentType: sourceResponse.headers.get("content-type") ?? "image/png"
      });
    }
  }

  for (const angle of STYLE_IMAGE_ANGLES) {
    const orderedReferences = orderReferencesForAngle(angle.key, referenceImages);
    const referenceFiles = await Promise.all(
      orderedReferences.map((reference, index) =>
        toFile(reference.bytes, `${index === 0 ? "primary" : "support"}-${reference.slug}.png`, {
          type: reference.contentType
        })
      )
    );
    const prompt = [
      "これは美容師が顧客に見せるための相談用シミュレーション画像です。別人生成ではありません。",
      "これは人物を新しく生成する処理ではなく、登録済みの本人写真をもとに髪型だけを変更する画像編集です。",
      "最重要: 顔パーツと本人らしさを変えないでください。",
      "登録された正面写真群と横顔写真群、任意の後ろ姿写真群はすべて同一人物です。",
      "複数写真を平均化して別人を作らないでください。",
      "本人性を高めるため、正面写真群を顔の輪郭・額の広さ・眉・目の位置と距離と角度・鼻筋・小鼻・口元・顎先・頬骨・顔全体の比率・年齢感・肌の質感・その人らしい印象の最優先基準として扱ってください。",
      "横顔写真群を、フェイスライン・鼻筋・口元・顎・耳・首・頭部シルエット・サイドの髪の収まり・襟足の基準として扱ってください。",
      "後ろ姿写真群がある場合は、後頭部・襟足・毛流れ・後ろ姿の補助基準として扱ってください。後ろ姿写真がない場合は、横顔写真群から最小限だけ補完してください。",
      "写真に足りない部分は他の角度参照から補完し、それでも不足する部分のみ最小限に補ってください。推測で別人化しないでください。",
      "優先順位: 1. 本人同一性の維持、2. 顔パーツの保持、3. 顔の輪郭・骨格バランスの保持、4. 年齢感・肌質・表情の保持、5. 髪型のみ変更、6. 背景・ライティング・構図の統一、7. 見栄えの調整。",
      "髪型をよく見せることより、本人に見えることを優先してください。",
      "髪型以外の顔パーツ・骨格・年齢感・肌質は変更しないでください。",
      "以下は変更禁止です: 目の形、大きさ、位置、左右の間隔。眉の形、角度、位置。鼻筋、鼻先、小鼻、鼻の高さ。口の形、唇の厚み、口角。顎の形、顎先、フェイスライン。頬、頬骨、顔の輪郭。額の広さ。耳の位置、大きさ、形。首の長さ、太さ。肌の質感、肌色、年齢感。表情。顔の向き。顔全体の比率。",
      "変更してよいものは、髪の長さ、前髪、サイド、襟足、トップの高さ、毛流れ、束感、ボリュームだけです。",
      "前髪、サイド、襟足、トップ、毛流れ、束感、ボリュームのみを提案内容に合わせて変更してください。",
      "顔を美化しないでください。若返らせないでください。肌を補正しすぎないでください。左右対称に整えすぎないでください。別人のように見える変更は禁止です。モデル写真風に作り替えないでください。本人の顔を新しく描き直さないでください。",
      "メイクの変化、別人化、美化しすぎ、若返り、老けさせる処理、目を大きくする、鼻筋を変える、顎を細くする、肌を過度に補正することは禁止です。",
      "年齢感・性別感・民族的特徴を変えないでください。",
      "This is an image edit of the registered person, not a new person generation.",
      "Highest priority: preserve the person's identity and facial features.",
      "All registered front and side photos show the same person. Do not average the photos into a new face.",
      "Use the front photos as the reference for facial features, facial proportions, and age impression.",
      "Use the side photos as the reference for nose profile, jawline, ears, neck, and head silhouette.",
      "Do not change: eye shape, eye size, eye position, or eye spacing; eyebrow shape, angle, or position; nose bridge, nose tip, nostrils, or nose height; mouth shape, lip thickness, or mouth corners; jaw shape, chin, or facial outline; cheeks, cheekbones, or face contour; forehead size; ear position, ear size, or ear shape; neck length or neck width; skin texture, skin tone, or age impression; facial expression; head direction; overall facial proportions.",
      "Only modify the hair. You may change bangs, side hair, neckline hair, top volume, hair flow, texture, and overall hairstyle shape.",
      "Do not beautify the face. Do not make the person younger. Do not over-retouch the skin. Do not make the face more symmetrical. Do not redraw the face. Do not generate a different person. Do not turn this into a model photo.",
      "Avoid: different person, changed eyes, changed nose, changed mouth, changed jaw, changed face shape, younger face, beautified face, over-retouched skin, fashion model face, symmetrical idealized face, new identity, celebrity lookalike.",
      "背景・ライティング・構図は比較しやすい相談用フォーマットに統一してください。",
      "背景は無地のニュートラル背景（薄いグレーから青みグレー）。背景の装飾、家具、屋外要素は禁止です。",
      "ライティングは均一で自然なスタジオ風の柔らかい光。露出は明るすぎず暗すぎず、色味はナチュラル。",
      "構図はバストアップから肩上。カメラ距離、顔サイズ、余白、表情トーン、服装の簡素さを全提案でできるだけ揃えてください。",
      "服装は目立たない無地・中立的なトップス。余計なアクセサリを追加しないでください。",
      "提案ごとの差分は、主に髪の長さ、前髪、毛流れ、ボリューム位置、襟足、束感・質感だけにしてください。",
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
