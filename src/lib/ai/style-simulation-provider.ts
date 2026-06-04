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

export type StyleSimulationResult = {
  ok: boolean;
  provider: StyleSimulationProvider;
  images: StyleSimulationImage[];
  message?: string;
};

export function styleSimulationProviderLabel(provider = process.env.STYLE_SIMULATION_PROVIDER || "openai") {
  if (provider === "fal-photomaker-openai-edit" || provider === "fal-photomaker") {
    return "FaceID基準 + 髪型編集";
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
  const provider = (process.env.STYLE_SIMULATION_PROVIDER || "openai") as StyleSimulationProvider;

  console.log("style simulation provider selected", {
    provider,
    customerId: request.customerId,
    styleSuggestionId: request.styleSuggestionId
  });

  if (provider === "fal-photomaker-openai-edit" || provider === "fal-photomaker") {
    try {
      return await generateWithFalPhotoMakerThenOpenAiEdit(request);
    } catch (error) {
      console.error("fal-photomaker-openai-edit provider failed; falling back to OpenAI", {
        customerId: request.customerId,
        styleSuggestionId: request.styleSuggestionId,
        error
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

      return generateWithOpenAiFallback(request);
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
