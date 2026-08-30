import { COUPON_BARCODE_REGION, COUPON_TEMPLATE, type CouponMultilineField, type CouponRect, type CouponSingleTextField } from "@/lib/coupons/coupon-template.config";
import { buildCouponRenderValues, estimateFittedFontSize } from "@/lib/coupons/coupon-render-utils";
import { barcodeToRects, createJan13Barcode } from "@/lib/coupons/barcode-jan13";
import type { CouponIssueDisplayData } from "@/lib/coupons/coupon-validation";

type CouponFlyerPreviewProps = {
  issue: CouponIssueDisplayData;
  className?: string;
};

const COUPON_FONT_FACE_CSS = Object.entries(COUPON_TEMPLATE.layout.font_roles)
  .map(([role, info]) => {
    const fontPath = `/coupon-template/${info.production_font_file}`;
    const extension = info.production_font_file.split(".").pop()?.toLowerCase();
    const format = extension === "otf" ? "opentype" : extension === "ttc" ? "truetype-collection" : "truetype";

    return `@font-face{font-family:"${role}";src:url("${fontPath}") format("${format}");font-weight:400;font-style:normal;font-display:block;}`;
  })
  .join("\n");

export function CouponFlyerPreview({ issue, className = "" }: CouponFlyerPreviewProps) {
  const values = buildCouponRenderValues(issue);
  const fields = COUPON_TEMPLATE.fields;

  return (
    <article
      className={`print-page print-color-exact relative mx-auto min-w-0 max-w-full overflow-hidden rounded-md bg-[#fffaf5] shadow-lg ring-1 ring-[#e7cfc3] print:rounded-none print:shadow-none print:ring-0 sm:w-full sm:max-w-[1055px] ${className}`}
      style={{
        aspectRatio: `${COUPON_TEMPLATE.designWidth} / ${COUPON_TEMPLATE.designHeight}`,
        backgroundColor: "#fffaf5"
      }}
      aria-label="ORIMIA 限定クーポンチラシ"
    >
      <svg
        viewBox={`0 0 ${COUPON_TEMPLATE.designWidth} ${COUPON_TEMPLATE.designHeight}`}
        className="block h-full w-full"
        role="img"
        aria-label="限定クーポンチラシプレビュー"
      >
        <image href={COUPON_TEMPLATE.backgroundImage} x="0" y="0" width={COUPON_TEMPLATE.designWidth} height={COUPON_TEMPLATE.designHeight} preserveAspectRatio="none" />
        <defs>
          <style>{COUPON_FONT_FACE_CSS}</style>
          {Object.entries(fields).flatMap(([fieldName, field]) => {
            if (field.type === "multiline_list") {
              return field.line_boxes.map((box, index) => <ClipRect key={`${fieldName}-${index}`} id={`coupon-clip-${fieldName}-${index}`} rect={box} />);
            }

            return [<ClipRect key={fieldName} id={`coupon-clip-${fieldName}`} rect={field.bbox} />];
          })}
        </defs>

        <SingleText fieldName="customer_name" field={fields.customer_name as CouponSingleTextField} text={values.customer_name} />
        <SingleText fieldName="discount_number" field={fields.discount_number as CouponSingleTextField} text={values.discount_number} />
        <SingleText fieldName="discount_percent" field={fields.discount_percent as CouponSingleTextField} text={values.discount_percent_symbol} />
        <SingleText fieldName="discount_off" field={fields.discount_off as CouponSingleTextField} text={values.discount_off_text} />
        <MultiLine fieldName="target_menu_lines" field={fields.target_menu_lines as CouponMultilineField} lines={values.target_menu_lines} />
        <SingleText fieldName="expiry_date" field={fields.expiry_date as CouponSingleTextField} text={values.expiry_date} />
        <CouponBarcode value={values.coupon_code} />
      </svg>
    </article>
  );
}

function ClipRect({ id, rect }: { id: string; rect: CouponRect }) {
  return (
    <clipPath id={id}>
      <rect x={rect.x} y={rect.y} width={rect.w} height={rect.h} />
    </clipPath>
  );
}

function SingleText({ fieldName, field, text }: { fieldName: string; field: CouponSingleTextField; text: string }) {
  const fontSize = estimateFittedFontSize(field, text);
  const point = textPoint(field.bbox, field.align, field.vertical_align);

  return (
    <text
      data-coupon-field={fieldName}
      x={point.x}
      y={point.y}
      fill={field.fill}
      fontFamily={field.font_role}
      fontSize={fontSize}
      fontWeight={400}
      letterSpacing={field.letter_spacing ?? 0}
      textAnchor={textAnchor(field.align)}
      dominantBaseline={dominantBaseline(field.vertical_align)}
      clipPath={`url(#coupon-clip-${fieldName})`}
    >
      {text}
    </text>
  );
}

function MultiLine({ fieldName, field, lines }: { fieldName: string; field: CouponMultilineField; lines: string[] }) {
  return (
    <>
      {lines.slice(0, field.max_lines).map((line, index) => {
        const box = field.line_boxes[index];
        const fontSize = estimateFittedFontSize({ ...field, bbox: box }, line);
        const point = textPoint(box, field.align, field.vertical_align);

        return (
          <text
            key={`${fieldName}-${index}`}
            data-coupon-field={`${fieldName}-${index}`}
            x={point.x}
            y={point.y}
            fill={field.fill}
            fontFamily={field.font_role}
            fontSize={fontSize}
            letterSpacing={field.letter_spacing ?? 0}
            textAnchor={textAnchor(field.align)}
            dominantBaseline={dominantBaseline(field.vertical_align)}
            clipPath={`url(#coupon-clip-${fieldName}-${index})`}
          >
            {line}
          </text>
        );
      })}
    </>
  );
}

function CouponBarcode({ value }: { value: string }) {
  const barcode = createJan13Barcode(value);
  const { background, darkRects } = barcodeToRects(barcode, COUPON_BARCODE_REGION.bbox, COUPON_BARCODE_REGION.quiet_zone_modules);

  return (
    <g data-coupon-field="coupon_barcode" shapeRendering="crispEdges">
      <rect x={background.x} y={background.y} width={background.w} height={background.h} fill={COUPON_BARCODE_REGION.background_fill} />
      {darkRects.map((rect, index) => (
        <rect key={index} x={rect.x} y={rect.y} width={rect.w} height={rect.h} fill={COUPON_BARCODE_REGION.fill} />
      ))}
    </g>
  );
}

function textPoint(rect: CouponRect, align: "left" | "center" | "right", verticalAlign: "top" | "middle" | "bottom") {
  return {
    x: align === "left" ? rect.x : align === "right" ? rect.x + rect.w : rect.x + rect.w / 2,
    y: verticalAlign === "top" ? rect.y : verticalAlign === "bottom" ? rect.y + rect.h : rect.y + rect.h / 2
  };
}

function textAnchor(align: "left" | "center" | "right") {
  if (align === "left") return "start";
  if (align === "right") return "end";
  return "middle";
}

function dominantBaseline(verticalAlign: "top" | "middle" | "bottom") {
  if (verticalAlign === "top") return "text-before-edge";
  if (verticalAlign === "bottom") return "text-after-edge";
  return "middle";
}
