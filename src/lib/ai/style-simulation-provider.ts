import { generateStyleSimulationImages } from "@/lib/ai/style-image-generator";
import { generateWithFalFaceId } from "@/lib/ai/providers/fal-faceid";
import { generateWithFalPhotoMakerThenOpenAiEdit } from "@/lib/ai/providers/fal-photomaker";

export type StyleSimulationAngle = "front_three_quarter" | "side" | "back_three_quarter";

export type StyleSimulationRequest = {
  customerId: string;
  styleSuggestionId: string;
  styleName: string;
  hairPrompt: string;
  frontImageUrls: string[];
  sideImageUrls: string[];
  backImageUrls: string[];
  angles: StyleSimulationAngle[];
};

export type StyleSimulationImage = {
  angle: "斜め正面" | "横" | "斜め後ろ";
  url: string;
  identityScore?: number;
  warning?: string;
  provider?: string;
};

export type StyleSimulationProvider = "openai" | "fal-photomaker-openai-edit" | "fal-photomaker" | "fal-faceid";
type EffectiveStyleSimulationProvider = "openai" | "fal-photomaker-openai-edit" | "fal-faceid";

export type StyleSimulationResult = {
  ok: boolean;
  provider: EffectiveStyleSimulationProvider;
  requestedProvider?: StyleSimulationProvider;
  images: StyleSimulationImage[];
  message?: string;
  fallbackReason?: string;
};

export function styleSimulationProviderLabel(provider = process.env.STYLE_SIMULATION_PROVIDER || "openai") {
  if (provider === "fal-photomaker-openai-edit" || provider === "fal-photomaker") {
    return "FaceID基準 + 顔保護マスク髪型編集";
  }

  if (provider === "fal-faceid") {
    return "FaceID";
  }

  return "OpenAI fallback";
}

async function generateWithOpenAiFallback(request: StyleSimulationRequest): Promise<StyleSimulationResult> {
  const urls = await generateStyleSimulationImages({
    customerId: request.customerId,
    referencePhotos: {
      frontUrls: request.frontImageUrls,
      sideUrls: request.sideImageUrls,
      backUrls: request.backImageUrls
    },
    styleName: request.styleName,
    imageEditPrompt: request.hairPrompt
  });
  const angleLabels: StyleSimulationImage["angle"][] = ["斜め正面", "横", "斜め後ろ"];

  return {
    ok: urls.length > 0,
    provider: "openai",
    images: urls.map((url, index) => ({
      angle: angleLabels[index] ?? "斜め正面",
      url
    })),
    message: urls.length > 0 ? "OpenAI fallbackで画像を生成しました。" : "OpenAI fallbackの画像生成結果が空でした。"
  };
}

export async function generateStyleSimulation(
  request: StyleSimulationRequest
): Promise<StyleSimulationResult> {
  const requestedProvider = (process.env.STYLE_SIMULATION_PROVIDER || "openai") as StyleSimulationProvider;
  const provider = requestedProvider === "fal-photomaker" ? "fal-photomaker-openai-edit" : requestedProvider;

  console.log("style simulation provider selected", {
    provider,
    requestedProvider,
    STYLE_SIMULATION_PROVIDER: process.env.STYLE_SIMULATION_PROVIDER,
    hasFalKey: Boolean(process.env.FAL_KEY),
    customerId: request.customerId,
    styleSuggestionId: request.styleSuggestionId
  });

  if (provider === "fal-photomaker-openai-edit") {
    try {
      return await generateWithFalPhotoMakerThenOpenAiEdit(request);
    } catch (error) {
      const fallbackReason =
        error instanceof Error
          ? error.message
          : "FaceID基準 + 髪型編集に失敗しました。";

      console.warn("fal photomaker failed, falling back to openai", {
        customerId: request.customerId,
        styleSuggestionId: request.styleSuggestionId,
        error: fallbackReason
      });

      if (!process.env.OPENAI_API_KEY) {
        return {
          ok: false,
          provider: "fal-photomaker-openai-edit",
          images: [],
          message:
            error instanceof Error
              ? error.message
              : "FaceID基準 + 髪型編集に失敗しました。"
        };
      }

      const fallbackResult = await generateWithOpenAiFallback(request);

      return {
        ...fallbackResult,
        requestedProvider,
        fallbackReason,
        message: fallbackReason.includes("FAL_KEY")
          ? "FAL_KEY未設定のためOpenAI fallbackで生成しました。"
          : `PhotoMaker stageに失敗したためOpenAI fallbackで生成しました。理由: ${fallbackReason}`
      };
    }
  }

  if (provider === "fal-faceid") {
    try {
      return await generateWithFalFaceId(request);
    } catch (error) {
      console.error("fal-faceid provider failed; falling back to OpenAI", {
        customerId: request.customerId,
        styleSuggestionId: request.styleSuggestionId,
        error
      });

      if (!process.env.OPENAI_API_KEY) {
        return {
          ok: false,
          provider: "fal-faceid",
          images: [],
          message:
            error instanceof Error
              ? error.message
              : "fal-faceid画像生成に失敗しました。"
        };
      }

      return generateWithOpenAiFallback(request);
    }
  }

  return generateWithOpenAiFallback(request);
}
