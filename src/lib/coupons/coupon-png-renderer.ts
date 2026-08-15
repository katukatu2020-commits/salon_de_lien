import "server-only";

import fs from "fs/promises";
import path from "path";
import sharp from "sharp";
import { COUPON_BARCODE_REGION, COUPON_TEMPLATE, type CouponMultilineField, type CouponRect, type CouponSingleTextField } from "@/lib/coupons/coupon-template.config";
import { buildCouponRenderValues, type CouponRenderValues } from "@/lib/coupons/coupon-render-utils";
import { barcodeToRects, createJan13Barcode } from "@/lib/coupons/barcode-jan13";
import type { CouponIssueDisplayData } from "@/lib/coupons/coupon-validation";

type MeasuredText = {
  xOffset: number;
  yOffset: number;
  width: number;
  height: number;
};

type FittedText = {
  fontSize: number;
  x: number;
  y: number;
  text: string;
  field: CouponSingleTextField;
  bbox: CouponRect;
  clipId: string;
};

type RenderReport = {
  imageSize: [number, number];
  changedPixelsTotal: number;
  changedPixelsOutsideEditableMask: number;
  pixelChangeValidationPassed: boolean;
};

const TEMPLATE_PATH = path.join(process.cwd(), "public", "coupon-template", "coupon_template_clean_v2.png");
const TEMPLATE_ASSET_ROOT = path.join(process.cwd(), "public", "coupon-template");

export async function renderCouponIssuePng(issue: CouponIssueDisplayData) {
  const values = buildCouponRenderValues(issue);
  return renderCouponPngFromValues(values);
}

export async function renderCouponPngFromValues(values: CouponRenderValues) {
  const { fontFacesCss } = await loadRequiredFonts();
  const template = sharp(TEMPLATE_PATH).ensureAlpha();
  const metadata = await template.metadata();
  const width = metadata.width;
  const height = metadata.height;

  if (width !== COUPON_TEMPLATE.designWidth || height !== COUPON_TEMPLATE.designHeight) {
    throw new Error(`coupon_template_clean_v2.png のサイズがJSONと一致しません: ${width}x${height} != ${COUPON_TEMPLATE.designWidth}x${COUPON_TEMPLATE.designHeight}`);
  }

  const fitted = await fitAllText(values, fontFacesCss);
  const overlaySvg = buildOverlaySvg(fitted, fontFacesCss, values.coupon_code);
  const overlayPng = await sharp(Buffer.from(overlaySvg)).png().toBuffer();
  const outputBuffer = await sharp(TEMPLATE_PATH)
    .ensureAlpha()
    .composite([{ input: overlayPng, left: 0, top: 0 }])
    .png()
    .toBuffer();
  const report = await validatePixelChanges(outputBuffer);

  if (!report.pixelChangeValidationPassed) {
    throw new Error(`editable mask外のピクセル変更を検出しました: ${report.changedPixelsOutsideEditableMask}px`);
  }

  return { png: outputBuffer, report };
}

export async function assertCouponProductionFontsReady() {
  await loadRequiredFonts();
}

async function loadRequiredFonts() {
  const roles = new Set<string>();

  Object.values(COUPON_TEMPLATE.fields).forEach((field) => roles.add(field.font_role));

  const fontFaces: string[] = [];
  const missing: string[] = [];

  for (const role of roles) {
    const info = COUPON_TEMPLATE.layout.font_roles[role as keyof typeof COUPON_TEMPLATE.layout.font_roles];
    const productionFontFile = info.production_font_file;
    const fontPath = path.isAbsolute(productionFontFile) ? productionFontFile : path.join(TEMPLATE_ASSET_ROOT, productionFontFile);

    try {
      const font = await fs.readFile(fontPath);
      const ext = path.extname(fontPath).toLowerCase();
      const format = ext === ".ttc" ? "truetype-collection" : ext === ".otf" ? "opentype" : "truetype";
      const mime = ext === ".otf" ? "font/otf" : "font/ttf";
      fontFaces.push(`@font-face{font-family:'${role}';src:url(data:${mime};base64,${font.toString("base64")}) format('${format}');font-weight:400;font-style:normal;}`);
    } catch {
      missing.push(fontPath);
    }
  }

  if (missing.length > 0) {
    throw new Error(`production_font_file が未配置です。自動代替は行いません: ${missing.join(", ")}`);
  }

  return { fontFacesCss: fontFaces.join("\n") };
}

async function fitAllText(values: CouponRenderValues, fontFacesCss: string) {
  const fields = COUPON_TEMPLATE.fields;
  const fitted: FittedText[] = [];

  fitted.push(await fitSingle("customer_name", fields.customer_name as CouponSingleTextField, values.customer_name, fontFacesCss));
  fitted.push(await fitSingle("discount_number", fields.discount_number as CouponSingleTextField, values.discount_number, fontFacesCss));
  fitted.push(await fitSingle("discount_percent", fields.discount_percent as CouponSingleTextField, values.discount_percent_symbol, fontFacesCss));
  fitted.push(await fitSingle("discount_off", fields.discount_off as CouponSingleTextField, values.discount_off_text, fontFacesCss));
  fitted.push(await fitSingle("expiry_date", fields.expiry_date as CouponSingleTextField, values.expiry_date, fontFacesCss));

  const targetMenus = fields.target_menu_lines as CouponMultilineField;
  const lines = values.target_menu_lines.slice(0, targetMenus.max_lines);

  for (const [index, line] of lines.entries()) {
    const lineBox = targetMenus.line_boxes[index];
    fitted.push(
      await fitSingle(
        `target_menu_lines_${index}`,
        {
          ...targetMenus,
          type: "single_text",
          bbox: lineBox
        },
        line,
        fontFacesCss
      )
    );
  }

  return fitted;
}

async function fitSingle(name: string, field: CouponSingleTextField, text: string, fontFacesCss: string): Promise<FittedText> {
  for (let fontSize = field.max_font_size; fontSize >= field.min_font_size; fontSize -= 1) {
    const measured = await measureText(field, text, fontSize, fontFacesCss);

    if (measured.width <= field.bbox.w && measured.height <= field.bbox.h) {
      const { x, y } = positionedTextPoint(field.bbox, field.align, field.vertical_align, measured);
      return {
        fontSize,
        x: x - measured.xOffset,
        y: y - measured.yOffset,
        text,
        field,
        bbox: field.bbox,
        clipId: `clip_${name}`
      };
    }
  }

  throw new Error(`${name} がbbox内に収まりません: ${text}`);
}

async function measureText(field: CouponSingleTextField, text: string, fontSize: number, fontFacesCss: string): Promise<MeasuredText> {
  const margin = 256;
  const svg = svgDocument(`
    <style>${fontFacesCss}</style>
    <text x="${margin}" y="${margin}" font-family="${xmlAttr(field.font_role)}" font-size="${fontSize}" letter-spacing="${field.letter_spacing ?? 0}" fill="${xmlAttr(field.fill)}" text-anchor="start" dominant-baseline="text-before-edge">${xmlText(text)}</text>
  `);
  const { data, info } = await sharp(Buffer.from(svg)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const bbox = alphaBoundingBox(data, info.width, info.height);

  if (!bbox) {
    return { xOffset: 0, yOffset: 0, width: 0, height: 0 };
  }

  return {
    xOffset: bbox.x - margin,
    yOffset: bbox.y - margin,
    width: bbox.w,
    height: bbox.h
  };
}

function buildOverlaySvg(fitted: FittedText[], fontFacesCss: string, couponCode: string) {
  const clipPaths = fitted
    .map((item) => `<clipPath id="${item.clipId}"><rect x="${item.bbox.x}" y="${item.bbox.y}" width="${item.bbox.w}" height="${item.bbox.h}"/></clipPath>`)
    .join("");
  const textElements = fitted
    .map(
      (item) =>
        `<text clip-path="url(#${item.clipId})" x="${item.x}" y="${item.y}" font-family="${xmlAttr(item.field.font_role)}" font-size="${item.fontSize}" letter-spacing="${item.field.letter_spacing ?? 0}" fill="${xmlAttr(item.field.fill)}" text-anchor="start" dominant-baseline="text-before-edge">${xmlText(item.text)}</text>`
    )
    .join("");
  const barcodeElements = buildCouponBarcodeSvg(couponCode);

  return svgDocument(`<style>${fontFacesCss}</style><defs>${clipPaths}</defs>${textElements}${barcodeElements}`);
}

function buildCouponBarcodeSvg(couponCode: string) {
  const barcode = createJan13Barcode(couponCode);
  const { background, darkRects } = barcodeToRects(barcode, COUPON_BARCODE_REGION.bbox, COUPON_BARCODE_REGION.quiet_zone_modules);
  const darkModules = darkRects
    .map((rect) => `<rect x="${rect.x}" y="${rect.y}" width="${rect.w}" height="${rect.h}"/>`)
    .join("");

  return `<g shape-rendering="crispEdges"><rect x="${background.x}" y="${background.y}" width="${background.w}" height="${background.h}" fill="${xmlAttr(COUPON_BARCODE_REGION.background_fill)}"/><g fill="${xmlAttr(COUPON_BARCODE_REGION.fill)}">${darkModules}</g></g>`;
}

function svgDocument(contents: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${COUPON_TEMPLATE.designWidth}" height="${COUPON_TEMPLATE.designHeight}" viewBox="0 0 ${COUPON_TEMPLATE.designWidth} ${COUPON_TEMPLATE.designHeight}">${contents}</svg>`;
}

function positionedTextPoint(rect: CouponRect, align: CouponSingleTextField["align"], verticalAlign: CouponSingleTextField["vertical_align"], measured: MeasuredText) {
  const visualX = align === "left" ? rect.x : align === "right" ? rect.x + rect.w - measured.width : rect.x + (rect.w - measured.width) / 2;
  const visualY = verticalAlign === "top" ? rect.y : verticalAlign === "bottom" ? rect.y + rect.h - measured.height : rect.y + (rect.h - measured.height) / 2;

  return { x: visualX, y: visualY };
}

async function validatePixelChanges(outputBuffer: Buffer): Promise<RenderReport> {
  const [baseRaw, outputRaw] = await Promise.all([
    sharp(TEMPLATE_PATH).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
    sharp(outputBuffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  ]);
  const width = baseRaw.info.width;
  const height = baseRaw.info.height;
  const mask = editableMask(width, height);
  let changedPixelsTotal = 0;
  let changedPixelsOutsideEditableMask = 0;

  for (let pixel = 0; pixel < width * height; pixel += 1) {
    const offset = pixel * 4;
    const changed =
      baseRaw.data[offset] !== outputRaw.data[offset] ||
      baseRaw.data[offset + 1] !== outputRaw.data[offset + 1] ||
      baseRaw.data[offset + 2] !== outputRaw.data[offset + 2] ||
      baseRaw.data[offset + 3] !== outputRaw.data[offset + 3];

    if (!changed) {
      continue;
    }

    changedPixelsTotal += 1;

    if (!mask[pixel]) {
      changedPixelsOutsideEditableMask += 1;
    }
  }

  return {
    imageSize: [width, height],
    changedPixelsTotal,
    changedPixelsOutsideEditableMask,
    pixelChangeValidationPassed: changedPixelsOutsideEditableMask === 0
  };
}

function editableMask(width: number, height: number) {
  const padding = COUPON_TEMPLATE.layout.validation.editable_union_mask_padding_px ?? 0;
  const mask = new Uint8Array(width * height);

  Object.values(COUPON_TEMPLATE.layout.editable_regions).forEach((rect) => {
    const x1 = Math.max(0, rect.x - padding);
    const y1 = Math.max(0, rect.y - padding);
    const x2 = Math.min(width - 1, rect.x + rect.w - 1 + padding);
    const y2 = Math.min(height - 1, rect.y + rect.h - 1 + padding);

    for (let y = y1; y <= y2; y += 1) {
      for (let x = x1; x <= x2; x += 1) {
        mask[y * width + x] = 1;
      }
    }
  });

  return mask;
}

function alphaBoundingBox(rawRgba: Buffer, width: number, height: number) {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = rawRgba[(y * width + x) * 4 + 3];
      if (alpha === 0) {
        continue;
      }

      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  if (maxX < minX || maxY < minY) {
    return null;
  }

  return {
    x: minX,
    y: minY,
    w: maxX - minX + 1,
    h: maxY - minY + 1
  };
}

function xmlAttr(value: string) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function xmlText(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
