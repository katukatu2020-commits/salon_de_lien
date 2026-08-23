export type SquareCropRegion = {
  sourceX: number;
  sourceY: number;
  sourceSize: number;
};

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function calculateSquareCropRegion({
  imageWidth,
  imageHeight,
  zoom,
  positionX,
  positionY
}: {
  imageWidth: number;
  imageHeight: number;
  zoom: number;
  positionX: number;
  positionY: number;
}): SquareCropRegion {
  if (imageWidth <= 0 || imageHeight <= 0) {
    throw new Error("画像サイズが不正です。");
  }

  const normalizedZoom = clamp(Number.isFinite(zoom) ? zoom : 1, 1, 3);
  const sourceSize = Math.min(imageWidth, imageHeight) / normalizedZoom;
  const availableX = imageWidth - sourceSize;
  const availableY = imageHeight - sourceSize;

  return {
    sourceX: availableX * (clamp(positionX, 0, 100) / 100),
    sourceY: availableY * (clamp(positionY, 0, 100) / 100),
    sourceSize
  };
}
