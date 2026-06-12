export const DEMO_ANCHOR_IMAGES = {
  front: "/demo-anchor-images/anchor-front.png",
  side: "/demo-anchor-images/anchor-side.png",
  back: "/demo-anchor-images/anchor-back.png",
  generatedFront: "/demo-anchor-images/generated-front.png",
  generatedSide: "/demo-anchor-images/generated-side-fixed.png",
  generatedBack: "/demo-anchor-images/generated-back.png"
} as const;

export const DEMO_IMAGE_URLS = [
  DEMO_ANCHOR_IMAGES.generatedFront,
  DEMO_ANCHOR_IMAGES.generatedSide,
  DEMO_ANCHOR_IMAGES.generatedBack
];

export const DEMO_IMAGE_ENTRIES = [
  { angle: "斜め正面", url: DEMO_ANCHOR_IMAGES.generatedFront },
  { angle: "横", url: DEMO_ANCHOR_IMAGES.generatedSide },
  { angle: "斜め後ろ", url: DEMO_ANCHOR_IMAGES.generatedBack }
];
