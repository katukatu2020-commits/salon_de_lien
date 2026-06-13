import type {
  StyleSimulationImage,
  StyleSimulationRequest,
  StyleSimulationResult
} from "@/lib/ai/style-simulation-provider";
import { editHairWithOpenAi } from "@/lib/ai/providers/openai-hair-edit";

const ANGLES: Array<{
  key: StyleSimulationRequest["angles"][number];
  label: StyleSimulationImage["angle"];
}> = [
  { key: "front_three_quarter", label: "斜め正面" },
  { key: "side", label: "横" },
  { key: "back_three_quarter", label: "斜め後ろ" }
];

function anchorUrlForAngle(request: StyleSimulationRequest, targetAngle: StyleSimulationRequest["angles"][number]) {
  if (targetAngle === "front_three_quarter") {
    return request.frontImageUrls[0] ?? request.sideImageUrls[0] ?? request.backImageUrls[0] ?? null;
  }

  if (targetAngle === "side") {
    return request.sideImageUrls[0] ?? request.frontImageUrls[0] ?? request.backImageUrls[0] ?? null;
  }

  return request.backImageUrls[0] ?? request.sideImageUrls[0] ?? request.frontImageUrls[0] ?? null;
}

function buildCrossAngleHairConsistencyPrompt(request: StyleSimulationRequest) {
  return [
    "Generate the same haircut design across front three-quarter, side, and rear three-quarter outputs.",
    "The person identity may come from a different uploaded anchor photo per angle, but the hairstyle design must read as one continuous haircut photographed from three directions.",
    "Preserve identity first. Do not sacrifice face, profile, jawline, ear shape, neck, or age impression for hairstyle consistency.",
    "Keep the same bangs/fringe length, density, direction, separation, and parting across all angles.",
    "Keep the same side hair length, face-framing pieces, layer height, top volume, texture, color, shine, and ends across all angles.",
    "Keep the same neckline/nape length and outward or inward bend across side and rear three-quarter views.",
    "Do not invent a new bang/fringe shape only to force consistency. If the source angle naturally hides the fringe, keep it natural for that angle.",
    "Focus consistency corrections on hair-only details: ear coverage, temple hair, sideburn hair, face-framing length, nape length, layer height, ends, and texture.",
    "Avoid a mismatch where the side image shows a deliberate tucked-behind-ear styling choice while the front or rear image shows loose side hair.",
    "Use one consistent ear policy for the hairstyle: do not tuck hair behind the ear in one angle while leaving it untucked or covering the ear in another angle.",
    "Unless the hairstyle request explicitly says tucked-behind-ear or ear-showing, do not create a deliberate ear-tuck style. Let side hair fall naturally around the ear with the same coverage logic in every angle.",
    "When an ear is visible because the source pose exposes it, keep the ear identity unchanged. If the mask allows, add only subtle consistent soft hair around the temple, sideburn, and area in front of or behind the ear so it does not look like a different styling choice.",
    "If an uploaded anchor photo already has a visible ear that must remain unchanged for identity, preserve the ear itself, but adjust only the surrounding masked hair so it still matches the same non-tucked haircut design.",
    "Do not invent angle-specific styling changes, accessory changes, different layers, different bang shapes, or different ear exposure choices.",
    "The final result should look like one salon style sheet: front, side, and back of the same haircut on the same person.",
    "Treat each image as a view of the same final salon style, not three independent hairstyle suggestions.",
    `Shared style name: ${request.styleName}`,
    `Shared hair details: ${request.hairPrompt || "match the selected suggestion while preserving identity"}`
  ].join("\n");
}

export async function generateWithOpenAiAnchorHairEdit(
  request: StyleSimulationRequest
): Promise<StyleSimulationResult> {
  console.log("style simulation provider: openai-anchor-hair-edit", {
    customerId: request.customerId,
    styleSuggestionId: request.styleSuggestionId,
    frontImageCount: request.frontImageUrls.length,
    sideImageCount: request.sideImageUrls.length,
    backImageCount: request.backImageUrls.length
  });

  const images: StyleSimulationImage[] = [];
  const errors: string[] = [];
  const styleConsistencyPrompt = buildCrossAngleHairConsistencyPrompt(request);

  for (const angle of ANGLES) {
    if (!request.angles.includes(angle.key)) {
      continue;
    }

    const anchorUrl = anchorUrlForAngle(request, angle.key);

    if (!anchorUrl) {
      errors.push(`${angle.label}の元画像がありません。`);
      continue;
    }

    try {
      console.log("openai anchor hair edit started", {
        customerId: request.customerId,
        styleSuggestionId: request.styleSuggestionId,
        angle: angle.label,
        source: "uploaded-user-photo",
        crossAngleHairConsistency: true
      });

      const url = await editHairWithOpenAi({
        customerId: request.customerId,
        styleName: request.styleName,
        hairPrompt: request.hairPrompt,
        identityMasterImageUrl: anchorUrl,
        referenceFrontUrls: request.frontImageUrls,
        referenceSideUrls: request.sideImageUrls,
        referenceBackUrls: request.backImageUrls,
        angle: angle.label,
        styleConsistencyPrompt
      });

      images.push({
        angle: angle.label,
        url,
        provider: "openai-anchor-hair-edit"
      });

      console.log("openai anchor hair edit completed", {
        customerId: request.customerId,
        styleSuggestionId: request.styleSuggestionId,
        angle: angle.label,
        url
      });
    } catch (error) {
      console.error("openai anchor hair edit failed", {
        customerId: request.customerId,
        styleSuggestionId: request.styleSuggestionId,
        angle: angle.label,
        error
      });
      errors.push(error instanceof Error ? error.message : `${angle.label}の髪型編集に失敗しました。`);
    }
  }

  return {
    ok: images.length > 0,
    provider: "openai-anchor-hair-edit",
    images,
    message:
      images.length > 0
        ? `登録写真を直接編集して、髪型画像を${images.length}枚生成しました。`
        : `登録写真の髪型編集に失敗しました。${errors.length > 0 ? ` ${errors.join(" / ")}` : ""}`
  };
}
