import sharp from "sharp";

type HairEditMaskAngle = "斜め正面" | "横" | "斜め後ろ";

type Shape = {
  type: "rect" | "ellipse";
  x: number;
  y: number;
  width: number;
  height: number;
  opacity: number;
};

function pct(value: number, max: number) {
  return Math.round(value * max);
}

function rect(shape: Shape, width: number, height: number) {
  return `<rect x="${pct(shape.x, width)}" y="${pct(shape.y, height)}" width="${pct(
    shape.width,
    width
  )}" height="${pct(shape.height, height)}" fill="black" fill-opacity="${shape.opacity}" />`;
}

function ellipse(shape: Shape, width: number, height: number) {
  const cx = pct(shape.x + shape.width / 2, width);
  const cy = pct(shape.y + shape.height / 2, height);
  const rx = pct(shape.width / 2, width);
  const ry = pct(shape.height / 2, height);

  return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="black" fill-opacity="${shape.opacity}" />`;
}

function shapeToSvg(shape: Shape, width: number, height: number) {
  return shape.type === "rect" ? rect(shape, width, height) : ellipse(shape, width, height);
}

function maskShapesForAngle(angle: HairEditMaskAngle): Shape[] {
  if (angle === "斜め正面") {
    return [
      { type: "rect", x: 0, y: 0, width: 1, height: 0.36, opacity: 0 },
      { type: "ellipse", x: 0.08, y: 0.15, width: 0.36, height: 0.65, opacity: 0 },
      { type: "ellipse", x: 0.56, y: 0.15, width: 0.36, height: 0.65, opacity: 0 },
      { type: "ellipse", x: 0.28, y: 0.2, width: 0.44, height: 0.62, opacity: 1 },
      { type: "rect", x: 0.38, y: 0.55, width: 0.24, height: 0.38, opacity: 1 }
    ];
  }

  if (angle === "横") {
    return [
      { type: "rect", x: 0, y: 0, width: 1, height: 0.34, opacity: 0 },
      { type: "ellipse", x: 0.4, y: 0.12, width: 0.48, height: 0.68, opacity: 0 },
      { type: "ellipse", x: 0.18, y: 0.2, width: 0.3, height: 0.54, opacity: 1 },
      { type: "ellipse", x: 0.32, y: 0.25, width: 0.22, height: 0.3, opacity: 1 },
      { type: "rect", x: 0.3, y: 0.55, width: 0.26, height: 0.34, opacity: 1 }
    ];
  }

  return [
    { type: "rect", x: 0, y: 0, width: 1, height: 0.42, opacity: 0 },
    { type: "ellipse", x: 0.22, y: 0.12, width: 0.56, height: 0.62, opacity: 0 },
    { type: "ellipse", x: 0.16, y: 0.24, width: 0.22, height: 0.36, opacity: 1 },
    { type: "ellipse", x: 0.62, y: 0.24, width: 0.22, height: 0.36, opacity: 1 },
    { type: "rect", x: 0.34, y: 0.55, width: 0.32, height: 0.36, opacity: 1 }
  ];
}

export async function buildHairEditMask({
  imageBuffer,
  angle
}: {
  imageBuffer: Buffer;
  angle: HairEditMaskAngle;
}): Promise<Buffer> {
  console.log("hair edit mask build started", { angle });

  const metadata = await sharp(imageBuffer).metadata();
  const width = metadata.width;
  const height = metadata.height;

  if (!width || !height) {
    throw new Error("顔保護用の編集マスクを作成できなかったため、髪型編集を中止しました。");
  }

  const shapes = maskShapesForAngle(angle)
    .map((shape) => shapeToSvg(shape, width, height))
    .join("\n");
  const svg = `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="${width}" height="${height}" fill="black" fill-opacity="1" />
      ${shapes}
    </svg>
  `;
  const maskBuffer = await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();

  if (maskBuffer.byteLength >= 4 * 1024 * 1024) {
    throw new Error("顔保護用の編集マスクが4MBを超えたため、髪型編集を中止しました。");
  }

  console.log("hair edit mask build completed", {
    angle,
    width,
    height,
    bytes: maskBuffer.byteLength
  });

  return maskBuffer;
}

// TODO:
// Replace heuristic mask with automatic face landmark / face parsing.
// Candidates:
// - MediaPipe Face Landmarker
// - face-api.js
// - external segmentation API
// Goal:
// automatically protect eyes, nose, mouth, cheeks, jawline, ears, neck,
// and expose only hair-related regions for editing.
