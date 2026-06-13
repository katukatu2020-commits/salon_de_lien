import sharp from "sharp";

type HairEditMaskAngle = string;
type HairLengthIntent = "short" | "medium" | "semiLong" | "long" | "unknown";

type Shape = {
  type: "rect" | "ellipse";
  x: number;
  y: number;
  width: number;
  height: number;
  opacity: number;
};

const FRONT_ANGLE = "\u659c\u3081\u6b63\u9762";
const SIDE_ANGLE = "\u6a2a";

function pct(value: number, max: number) {
  return Math.round(value * max);
}

function isFrontAngle(angle: HairEditMaskAngle) {
  return angle === FRONT_ANGLE || angle.includes("front");
}

function isSideAngle(angle: HairEditMaskAngle) {
  return angle === SIDE_ANGLE || angle.includes("side");
}

function shouldAllowShoulderLength(lengthIntent: HairLengthIntent = "unknown") {
  return lengthIntent === "medium" || lengthIntent === "semiLong" || lengthIntent === "long";
}

function maskShapesForAngle(angle: HairEditMaskAngle, lengthIntent: HairLengthIntent = "unknown"): Shape[] {
  const allowShoulderLength = shouldAllowShoulderLength(lengthIntent);

  if (isFrontAngle(angle)) {
    return [
      { type: "rect", x: 0.08, y: 0, width: 0.84, height: 0.3, opacity: 0 },
      { type: "ellipse", x: 0.1, y: 0.1, width: 0.3, height: 0.58, opacity: 0 },
      { type: "ellipse", x: 0.6, y: 0.1, width: 0.3, height: 0.58, opacity: 0 },
      ...(allowShoulderLength
        ? [
            { type: "rect" as const, x: 0.04, y: 0.34, width: 0.3, height: 0.52, opacity: 0 },
            { type: "rect" as const, x: 0.66, y: 0.34, width: 0.3, height: 0.52, opacity: 0 },
            { type: "ellipse" as const, x: 0.04, y: 0.46, width: 0.32, height: 0.36, opacity: 0 },
            { type: "ellipse" as const, x: 0.64, y: 0.46, width: 0.32, height: 0.36, opacity: 0 }
          ]
        : []),
      { type: "ellipse", x: 0.22, y: 0.15, width: 0.56, height: 0.7, opacity: 1 },
      { type: "rect", x: 0.32, y: 0.5, width: 0.36, height: 0.44, opacity: 1 }
    ];
  }

  if (isSideAngle(angle)) {
    return [
      { type: "rect", x: 0.04, y: 0.02, width: 0.76, height: 0.26, opacity: 0 },
      { type: "ellipse", x: 0.02, y: 0.1, width: 0.58, height: 0.74, opacity: 0 },
      { type: "ellipse", x: 0.32, y: 0.08, width: 0.3, height: 0.36, opacity: 0 },
      { type: "rect", x: 0.04, y: 0.5, width: 0.42, height: 0.34, opacity: 0 },
      ...(allowShoulderLength
        ? [
            { type: "rect" as const, x: 0.0, y: 0.46, width: 0.58, height: 0.44, opacity: 0 },
            { type: "ellipse" as const, x: 0.0, y: 0.54, width: 0.52, height: 0.32, opacity: 0 }
          ]
        : []),
      { type: "ellipse", x: 0.42, y: 0.16, width: 0.54, height: 0.52, opacity: 1 },
      { type: "rect", x: 0.42, y: 0.42, width: 0.32, height: 0.38, opacity: 1 },
      { type: "ellipse", x: 0.18, y: 0.36, width: 0.24, height: 0.34, opacity: 1 },
      { type: "ellipse", x: 0.15, y: 0.48, width: 0.24, height: 0.22, opacity: 1 }
    ];
  }

  return [
    { type: "rect", x: 0.08, y: 0, width: 0.84, height: 0.36, opacity: 0 },
    { type: "ellipse", x: 0.24, y: 0.12, width: 0.52, height: 0.54, opacity: 0 },
    ...(allowShoulderLength
      ? [
          { type: "rect" as const, x: 0.12, y: 0.34, width: 0.76, height: 0.5, opacity: 0 },
          { type: "ellipse" as const, x: 0.12, y: 0.52, width: 0.76, height: 0.32, opacity: 0 }
        ]
      : []),
    { type: "ellipse", x: 0.16, y: 0.24, width: 0.24, height: 0.38, opacity: 1 },
    { type: "ellipse", x: 0.6, y: 0.24, width: 0.24, height: 0.38, opacity: 1 },
    { type: "rect", x: 0.32, y: 0.5, width: 0.36, height: 0.42, opacity: 1 }
  ];
}

function applyShapeAlpha(mask: Buffer, shape: Shape, width: number, height: number) {
  const x1 = Math.max(0, pct(shape.x, width));
  const y1 = Math.max(0, pct(shape.y, height));
  const x2 = Math.min(width, pct(shape.x + shape.width, width));
  const y2 = Math.min(height, pct(shape.y + shape.height, height));
  const alpha = Math.round(shape.opacity * 255);

  if (shape.type === "rect") {
    for (let y = y1; y < y2; y += 1) {
      for (let x = x1; x < x2; x += 1) {
        mask[(y * width + x) * 4 + 3] = alpha;
      }
    }
    return;
  }

  const cx = pct(shape.x + shape.width / 2, width);
  const cy = pct(shape.y + shape.height / 2, height);
  const rx = Math.max(1, pct(shape.width / 2, width));
  const ry = Math.max(1, pct(shape.height / 2, height));

  for (let y = y1; y < y2; y += 1) {
    for (let x = x1; x < x2; x += 1) {
      const dx = (x - cx) / rx;
      const dy = (y - cy) / ry;

      if (dx * dx + dy * dy <= 1) {
        mask[(y * width + x) * 4 + 3] = alpha;
      }
    }
  }
}

export async function buildHairEditMask({
  imageBuffer,
  angle,
  lengthIntent = "unknown"
}: {
  imageBuffer: Buffer;
  angle: HairEditMaskAngle;
  lengthIntent?: HairLengthIntent;
}): Promise<Buffer> {
  console.log("hair edit mask build started", { angle, lengthIntent });

  const metadata = await sharp(imageBuffer).metadata();
  const width = metadata.width;
  const height = metadata.height;

  if (!width || !height) {
    throw new Error("Failed to build the hair edit mask.");
  }

  const mask = Buffer.alloc(width * height * 4);

  for (let index = 0; index < mask.length; index += 4) {
    mask[index] = 0;
    mask[index + 1] = 0;
    mask[index + 2] = 0;
    mask[index + 3] = 255;
  }

  for (const shape of maskShapesForAngle(angle, lengthIntent)) {
    applyShapeAlpha(mask, shape, width, height);
  }

  const maskBuffer = await sharp(mask, {
    raw: {
      width,
      height,
      channels: 4
    }
  })
    .png({ compressionLevel: 9 })
    .toBuffer();

  if (maskBuffer.byteLength >= 4 * 1024 * 1024) {
    throw new Error("The hair edit mask is too large.");
  }

  console.log("hair edit mask build completed", {
    angle,
    lengthIntent,
    width,
    height,
    bytes: maskBuffer.byteLength
  });

  return maskBuffer;
}
