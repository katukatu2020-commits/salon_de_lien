export type IdentityCheckResult = {
  score: number;
  level: "high" | "medium" | "low";
  reason: string;
  warnings: string[];
};

const fallbackResult: IdentityCheckResult = {
  score: 0,
  level: "low",
  reason: "Identity check could not be completed. Please review the generated image manually.",
  warnings: ["Identity check could not be completed."]
};

function normalizeIdentityCheckResult(value: unknown): IdentityCheckResult {
  const parsed = value as Partial<IdentityCheckResult>;
  const score = Math.max(0, Math.min(100, Number(parsed.score) || 0));
  const level: IdentityCheckResult["level"] =
    parsed.level === "high" || parsed.level === "medium" || parsed.level === "low"
      ? parsed.level
      : score >= 80
        ? "high"
        : score >= 60
          ? "medium"
          : "low";

  return {
    score,
    level,
    reason: typeof parsed.reason === "string" ? parsed.reason : "Visual similarity was estimated from the reference photos.",
    warnings: Array.isArray(parsed.warnings)
      ? parsed.warnings.filter((warning): warning is string => typeof warning === "string")
      : []
  };
}

function identityAngleInstruction(angle: string) {
  if (angle.includes("後ろ") || angle.includes("back")) {
    return [
      "Angle-specific rule: this generated image is a rear or rear three-quarter reference.",
      "Do not penalize it merely because the front face, eyes, nose, or mouth are not visible.",
      "Judge identity using angle-appropriate visible cues: back-of-head silhouette, ears, nape, neck, shoulder direction, hairline, age impression, and overall person impression.",
      "Use back and side references more strongly than front references for this rear angle.",
      "Strongly penalize a generated straight-back pose when the uploaded back reference is side-back or rear three-quarter.",
      "Strongly penalize changed head direction, neck length, shoulder angle, ear visibility, nape line, and crop distance."
    ].join("\n");
  }

  if (angle.includes("横") || angle.includes("side")) {
    return [
      "Angle-specific rule: this generated image is a side profile reference.",
      "Judge identity mainly against side references.",
      "Prioritize nose profile, mouth profile, chin line, jawline, ear position, ear shape, neck line, head silhouette, skin texture, age impression, and overall person impression."
    ].join("\n");
  }

  return [
    "Angle-specific rule: this generated image is a front or three-quarter-front reference.",
    "Judge identity using visible facial features and proportions while allowing only a slight three-quarter turn.",
    "Prioritize eyes, eyebrows, nose, mouth, cheeks, chin, jawline, face shape, age impression, and skin texture."
  ].join("\n");
}

export async function checkGeneratedImageIdentity({
  referenceFrontImageUrls,
  referenceSideImageUrls,
  referenceBackImageUrls = [],
  generatedImageUrl,
  angle
}: {
  referenceFrontImageUrls: string[];
  referenceSideImageUrls: string[];
  referenceBackImageUrls?: string[];
  generatedImageUrl: string;
  angle: string;
}): Promise<IdentityCheckResult> {
  if (!process.env.OPENAI_API_KEY) {
    return fallbackResult;
  }

  console.log("identity check started", {
    angle,
    frontReferenceCount: referenceFrontImageUrls.length,
    sideReferenceCount: referenceSideImageUrls.length,
    backReferenceCount: referenceBackImageUrls.length,
    generatedImageUrl
  });

  try {
    const OpenAI = (await import("openai")).default;
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const referenceImages = [
      ...referenceFrontImageUrls.slice(0, 4),
      ...referenceSideImageUrls.slice(0, 4),
      ...referenceBackImageUrls.slice(0, 2)
    ];
    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: identityAngleInstruction(angle)
            },
            {
              type: "input_text",
              text: `Compare the uploaded reference photos with the generated image for hair-salon style simulation identity preservation.

This is NOT a legal identity verification task. It is a strict visual similarity check for whether the generated image still looks like the same person from the user's actual input photos.

Generated angle: ${angle}

Score harshly. Do not give a high score just because the image is attractive, realistic, or has a similar hairstyle.

Strongly penalize:
- a more generic or beautified face
- younger-looking skin, smoother skin, or changed age impression
- changed eyelid shape, eye size, eyebrow shape, nose bridge, nose tip, nostril shape, lips, mouth profile, chin, jawline, cheek contour, face length, or face width
- changed ear shape, ear position, neck line, nape line, head size, or skull/head silhouette
- changed head direction, pose, crop distance, or shoulder direction when those cues are visible in the references
- changed profile proportions for side views
- rear images that rotate the person to a different angle than the uploaded rear/side-back reference
- generated model-like facial symmetry that is not present in the references
- a hairstyle or hair volume change that hides or redraws identity-critical face, ear, neck, or head-outline cues

Score scale:
- 90-100: extremely close; only hairstyle changed.
- 80-89: strong match; minor angle or hair differences.
- 70-79: acceptable but visibly changed in some features.
- 60-69: weak match; may be usable only with caution.
- 0-59: too different; likely a different person or over-beautified/generated identity.

Return only JSON:
{
  "score": 84,
  "level": "high",
  "reason": "Short visual reason",
  "warnings": ["Important caution if any"]
}`
            },
            ...referenceImages.map((imageUrl) => ({
              type: "input_image" as const,
              image_url: imageUrl,
              detail: "high" as const
            })),
            {
              type: "input_image" as const,
              image_url: generatedImageUrl,
              detail: "high" as const
            }
          ]
        }
      ],
      max_output_tokens: 500
    });
    const text = response.output_text.trim();
    const jsonText = text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "");
    const result = normalizeIdentityCheckResult(JSON.parse(jsonText));

    console.log("identity check completed", {
      angle,
      score: result.score,
      level: result.level,
      warningCount: result.warnings.length
    });

    return result;
  } catch (error) {
    console.error("identity check failed", {
      angle,
      error
    });

    return fallbackResult;
  }
}
