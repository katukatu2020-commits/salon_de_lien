import layout from "@/lib/coupons/coupon_red_fields_layout_v2.json";

export type CouponRect = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type CouponFontRole = keyof typeof layout.font_roles;

export type CouponSingleTextField = {
  type: "single_text";
  input_key: string;
  bbox: CouponRect;
  align: "left" | "center" | "right";
  vertical_align: "top" | "middle" | "bottom";
  font_role: CouponFontRole;
  max_font_size: number;
  min_font_size: number;
  letter_spacing?: number;
  fill: string;
  clip_to_bbox: boolean;
  default_text?: string;
  original_text?: string;
};

export type CouponMultilineField = {
  type: "multiline_list";
  input_key: string;
  bbox: CouponRect;
  max_lines: number;
  line_boxes: Array<CouponRect & { baseline_hint_y?: number }>;
  align: "left" | "center" | "right";
  vertical_align: "top" | "middle" | "bottom";
  font_role: CouponFontRole;
  max_font_size: number;
  min_font_size: number;
  letter_spacing?: number;
  fill: string;
  clip_to_bbox: boolean;
};

export type CouponTemplateField = CouponSingleTextField | CouponMultilineField;
export type CouponTemplateFieldKey = keyof typeof layout.fields;
export type CouponBarcodeRegion = {
  input_key: string;
  bbox: CouponRect;
  format: "jan13";
  quiet_zone_modules: number;
  fill: string;
  background_fill: string;
  clip_to_bbox: boolean;
  notes?: string;
};

export const COUPON_TEXT_LAYOUT = layout;
export const COUPON_BARCODE_REGION = COUPON_TEXT_LAYOUT.barcode_regions.coupon_code as CouponBarcodeRegion;

export const COUPON_TEMPLATE = {
  version: "coupon-v2-json",
  designWidth: layout.coordinate_system.image_width,
  designHeight: layout.coordinate_system.image_height,
  backgroundImage: "/coupon-template/coupon_template_clean_v2.png",
  layout: COUPON_TEXT_LAYOUT,
  fields: COUPON_TEXT_LAYOUT.fields as Record<CouponTemplateFieldKey, CouponTemplateField>
} as const;

export const COUPON_TEMPLATE_BACKGROUND_PATH = "public/coupon-template/coupon_template_clean_v2.png";
