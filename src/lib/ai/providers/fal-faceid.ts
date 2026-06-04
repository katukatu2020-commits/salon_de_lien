import type {
  StyleSimulationRequest,
  StyleSimulationResult
} from "@/lib/ai/style-simulation-provider";

export async function generateWithFalFaceId(
  request: StyleSimulationRequest
): Promise<StyleSimulationResult> {
  void request;

  throw new Error("fal-faceid provider is not implemented yet.");
}
