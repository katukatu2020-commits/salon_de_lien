#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path
from typing import Any

import numpy as np
from PIL import Image, ImageDraw, ImageFont


def hex_to_rgba(hex_color: str) -> tuple[int, int, int, int]:
    h = hex_color.strip().lstrip("#")
    if len(h) != 6:
        raise ValueError(f"Unsupported color: {hex_color}")
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), 255)


def box_tuple(box: dict[str, int]) -> tuple[int, int, int, int]:
    return int(box["x"]), int(box["y"]), int(box["w"]), int(box["h"])


def box_inside_canvas(box: dict[str, int], size: tuple[int, int]) -> bool:
    x, y, w, h = box_tuple(box)
    W, H = size
    return x >= 0 and y >= 0 and w > 0 and h > 0 and x + w <= W and y + h <= H


def resolve_font(layout: dict[str, Any], role: str, production: bool) -> str:
    info = layout["font_roles"][role]
    primary = info.get("production_font_file")
    fallback = info.get("test_fallback_font_file")
    if production:
        if not primary or not Path(primary).exists():
            raise FileNotFoundError(
                f"Production font for role '{role}' is missing: {primary}. "
                "Put the exact original font at this path or update the JSON."
            )
        return primary
    if primary and Path(primary).exists():
        return primary
    if fallback and Path(fallback).exists():
        return fallback
    raise FileNotFoundError(f"No usable font for role '{role}'. primary={primary}, fallback={fallback}")


def text_bbox_for(font: ImageFont.FreeTypeFont, text: str, letter_spacing: float = 0) -> tuple[int, int, int, int]:
    dummy = Image.new("RGBA", (8, 8), (0, 0, 0, 0))
    d = ImageDraw.Draw(dummy)
    if not letter_spacing:
        return d.textbbox((0, 0), text, font=font)

    x = 0.0
    min_x = min_y = 10**9
    max_x = max_y = -10**9
    for ch in text:
        bb = d.textbbox((x, 0), ch, font=font)
        min_x = min(min_x, bb[0])
        min_y = min(min_y, bb[1])
        max_x = max(max_x, bb[2])
        max_y = max(max_y, bb[3])
        ch_bb = d.textbbox((0, 0), ch, font=font)
        x += (ch_bb[2] - ch_bb[0]) + letter_spacing
    if max_x < min_x:
        return (0, 0, 0, 0)
    return tuple(map(lambda v: int(round(v)), (min_x, min_y, max_x, max_y)))


def draw_text_with_tracking(
    draw: ImageDraw.ImageDraw,
    xy: tuple[float, float],
    text: str,
    font: ImageFont.FreeTypeFont,
    fill: tuple[int, int, int, int],
    letter_spacing: float = 0,
) -> None:
    x, y = xy
    if not letter_spacing:
        draw.text((x, y), text, font=font, fill=fill)
        return
    for ch in text:
        draw.text((x, y), ch, font=font, fill=fill)
        bb = draw.textbbox((0, 0), ch, font=font)
        x += (bb[2] - bb[0]) + letter_spacing


def fit_font_to_box(
    font_path: str,
    text: str,
    max_size: int,
    min_size: int,
    box: dict[str, int],
    letter_spacing: float,
) -> tuple[ImageFont.FreeTypeFont, int, tuple[int, int, int, int]]:
    max_w, max_h = int(box["w"]), int(box["h"])
    for size in range(int(max_size), int(min_size) - 1, -1):
        font = ImageFont.truetype(font_path, size)
        bb = text_bbox_for(font, text, letter_spacing)
        tw, th = bb[2] - bb[0], bb[3] - bb[1]
        if tw <= max_w and th <= max_h:
            return font, size, bb
    raise ValueError(f"Text does not fit even at min font size {min_size}: {text!r}, box={box}")


def paste_clipped(base: Image.Image, layer: Image.Image, bbox: dict[str, int]) -> None:
    x, y, w, h = box_tuple(bbox)
    mask = Image.new("L", base.size, 0)
    md = ImageDraw.Draw(mask)
    md.rectangle([x, y, x + w - 1, y + h - 1], fill=255)
    clipped = Image.composite(layer, Image.new("RGBA", base.size, (0, 0, 0, 0)), mask)
    base.alpha_composite(clipped)


def draw_single(
    base: Image.Image,
    layout: dict[str, Any],
    field: dict[str, Any],
    text: str,
    production: bool,
) -> dict[str, Any]:
    font_path = resolve_font(layout, field["font_role"], production)
    letter_spacing = float(field.get("letter_spacing", 0))
    font, used_size, bb = fit_font_to_box(
        font_path,
        text,
        int(field["max_font_size"]),
        int(field["min_font_size"]),
        field["bbox"],
        letter_spacing,
    )

    x, y, w, h = box_tuple(field["bbox"])
    tw, th = bb[2] - bb[0], bb[3] - bb[1]

    align = field.get("align", "center")
    valign = field.get("vertical_align", "middle")

    if align == "left":
        tx = x - bb[0]
    elif align == "right":
        tx = x + w - tw - bb[0]
    else:
        tx = x + (w - tw) / 2 - bb[0]

    if valign == "top":
        ty = y - bb[1]
    elif valign == "bottom":
        ty = y + h - th - bb[1]
    else:
        ty = y + (h - th) / 2 - bb[1]

    layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
    ld = ImageDraw.Draw(layer)
    draw_text_with_tracking(ld, (tx, ty), text, font, hex_to_rgba(field["fill"]), letter_spacing)

    if field.get("clip_to_bbox", True):
        paste_clipped(base, layer, field["bbox"])
    else:
        base.alpha_composite(layer)

    drawn_bb = text_bbox_for(font, text, letter_spacing)
    visual = {
        "x": int(round(tx + drawn_bb[0])),
        "y": int(round(ty + drawn_bb[1])),
        "w": int(round(drawn_bb[2] - drawn_bb[0])),
        "h": int(round(drawn_bb[3] - drawn_bb[1])),
        "font_size": used_size,
        "font_path": font_path,
        "field_bbox": dict(field["bbox"]),
        "text": text,
    }
    return visual


def draw_multiline(
    base: Image.Image,
    layout: dict[str, Any],
    field: dict[str, Any],
    lines: list[str],
    production: bool,
) -> list[dict[str, Any]]:
    max_lines = int(field.get("max_lines", len(field["line_boxes"])))
    if len(lines) > max_lines:
        raise ValueError(f"Too many menu lines: {len(lines)} > {max_lines}")

    results: list[dict[str, Any]] = []
    for line, line_box in zip(lines, field["line_boxes"]):
        sub = {k: v for k, v in field.items() if k not in ("bbox", "line_boxes", "type")}
        sub["type"] = "single_text"
        sub["bbox"] = line_box
        sub["align"] = field.get("align", "left")
        sub["vertical_align"] = field.get("vertical_align", "middle")
        results.append(draw_single(base, layout, sub, line, production))
    return results


def render(
    template_path: str | Path,
    layout_path: str | Path,
    output_path: str | Path,
    values: dict[str, Any] | None = None,
    production: bool = False,
) -> dict[str, Any]:
    layout = json.loads(Path(layout_path).read_text(encoding="utf-8"))
    if values is None:
        values = layout.get("test_values", {})

    base = Image.open(template_path).convert("RGBA")
    expected_size = tuple(layout["validation"]["check_image_size"])
    if base.size != expected_size:
        raise ValueError(f"Image size mismatch: {base.size} != {expected_size}")

    results: dict[str, Any] = {}
    for field_name, field in layout["fields"].items():
        if field["type"] == "single_text":
            key = field["input_key"]
            text = str(values.get(key, field.get("default_text", field.get("original_text", ""))))
            results[field_name] = draw_single(base, layout, field, text, production)
        elif field["type"] == "multiline_list":
            key = field["input_key"]
            lines = values.get(key, [])
            if isinstance(lines, str):
                lines = [s for s in lines.splitlines() if s.strip()]
            results[field_name] = draw_multiline(base, layout, field, list(lines), production)
        else:
            raise ValueError(f"Unknown field type for {field_name}: {field['type']}")

    base.save(output_path)
    return results


def make_mask(size: tuple[int, int], boxes: list[dict[str, int]], padding: int = 0) -> Image.Image:
    W, H = size
    mask = Image.new("L", size, 0)
    d = ImageDraw.Draw(mask)
    for box in boxes:
        x, y, w, h = box_tuple(box)
        x1 = max(0, x - padding)
        y1 = max(0, y - padding)
        x2 = min(W - 1, x + w - 1 + padding)
        y2 = min(H - 1, y + h - 1 + padding)
        d.rectangle([x1, y1, x2, y2], fill=255)
    return mask


def editable_boxes(layout: dict[str, Any]) -> list[dict[str, int]]:
    boxes: list[dict[str, int]] = []
    for field in layout["fields"].values():
        if field["type"] == "single_text":
            boxes.append(field["bbox"])
        elif field["type"] == "multiline_list":
            boxes.append(field["bbox"])
    return boxes


def cleanup_boxes(layout: dict[str, Any]) -> list[dict[str, int]]:
    cleanup = layout.get("source_cleanup_for_generating_clean_template", {})
    regions = cleanup.get("rectangular_inpaint", {}).get("regions", [])
    return [r["bbox"] for r in regions]


def validate(
    clean_template_path: str | Path,
    output_path: str | Path,
    layout_path: str | Path,
    draw_results: dict[str, Any],
) -> dict[str, Any]:
    layout = json.loads(Path(layout_path).read_text(encoding="utf-8"))
    clean = Image.open(clean_template_path).convert("RGBA")
    out = Image.open(output_path).convert("RGBA")
    if clean.size != out.size:
        raise ValueError("Template and output sizes differ")

    size = clean.size
    field_inside = {}
    for name, field in layout["fields"].items():
        if field["type"] == "single_text":
            field_inside[name] = box_inside_canvas(field["bbox"], size)
        else:
            field_inside[name] = box_inside_canvas(field["bbox"], size) and all(
                box_inside_canvas(b, size) for b in field["line_boxes"]
            )

    visual_inside = {}

    def _inside(v: dict[str, Any], b: dict[str, int]) -> bool:
        return (
            v["x"] >= b["x"]
            and v["y"] >= b["y"]
            and v["x"] + v["w"] <= b["x"] + b["w"]
            and v["y"] + v["h"] <= b["y"] + b["h"]
        )

    for name, res in draw_results.items():
        if isinstance(res, list):
            visual_inside[name] = [_inside(v, v["field_bbox"]) for v in res]
        else:
            visual_inside[name] = _inside(res, res["field_bbox"])

    pad = int(layout["validation"].get("editable_union_mask_padding_px", 0))
    mask = make_mask(size, editable_boxes(layout), padding=pad)
    clean_arr = np.array(clean)
    out_arr = np.array(out)
    changed = np.any(clean_arr != out_arr, axis=2)
    outside = np.array(mask) == 0
    invalid = changed & outside

    return {
        "image_size": list(size),
        "fields_inside_canvas": field_inside,
        "all_fields_inside_canvas": all(field_inside.values()),
        "text_visuals_inside_field_bbox": visual_inside,
        "all_text_visuals_inside_field_bbox": all(
            all(v) if isinstance(v, list) else bool(v) for v in visual_inside.values()
        ),
        "changed_pixels_from_clean_template_total": int(changed.sum()),
        "changed_pixels_outside_editable_mask": int(invalid.sum()),
        "pixel_change_validation_passed": int(invalid.sum()) == 0,
        "editable_mask_padding_px": pad,
    }


def prepare_clean_template(source_path: str | Path, layout_path: str | Path, clean_output_path: str | Path) -> dict[str, Any]:
    try:
        import cv2  # type: ignore
    except Exception as e:
        raise RuntimeError(
            "OpenCV is required only for preparing the clean template from the source JPEG. "
            "Install opencv-python, or use the already-prepared coupon_template_clean_v2.png."
        ) from e

    layout = json.loads(Path(layout_path).read_text(encoding="utf-8"))
    img = Image.open(source_path).convert("RGB")
    expected_size = tuple(layout["validation"]["check_image_size"])
    if img.size != expected_size:
        raise ValueError(f"Source image size mismatch: {img.size} != {expected_size}")

    arr = np.array(img)
    mask = np.zeros(arr.shape[:2], np.uint8)
    for box in cleanup_boxes(layout):
        x, y, w, h = box_tuple(box)
        cv2.rectangle(mask, (x, y), (x + w - 1, y + h - 1), 255, -1)

    cleanup = layout["source_cleanup_for_generating_clean_template"]
    radius = int(cleanup["rectangular_inpaint"]["radius_px"])
    algorithm_name = cleanup["rectangular_inpaint"].get("opencv_algorithm", "INPAINT_NS")
    algorithm = cv2.INPAINT_NS if algorithm_name == "INPAINT_NS" else cv2.INPAINT_TELEA

    bgr = cv2.cvtColor(arr, cv2.COLOR_RGB2BGR)
    cleaned = cv2.inpaint(bgr, mask, radius, algorithm)
    clean_rgb = cv2.cvtColor(cleaned, cv2.COLOR_BGR2RGB).astype(np.float32)
    original = arr.astype(np.float32)

    def stats_from_sample_rects(sample_rects: list[dict[str, int]]) -> tuple[np.ndarray, np.ndarray]:
        vals = []
        H, W = original.shape[:2]
        for sr in sample_rects:
            sx, sy, sw, sh = box_tuple(sr)
            sx1, sy1 = max(0, sx), max(0, sy)
            sx2, sy2 = min(W, sx + sw), min(H, sy + sh)
            patch = original[sy1:sy2, sx1:sx2]
            if patch.size == 0:
                continue
            dark = (patch[:, :, 0] < 160) & (patch[:, :, 1] < 150) & (patch[:, :, 2] < 130)
            pink = (patch[:, :, 0] > 140) & (patch[:, :, 1] < 170) & ((patch[:, :, 0] - patch[:, :, 1]) > 18)
            keep = ~(dark | pink)
            vals.append(patch[keep])
        if vals:
            all_vals = np.concatenate(vals, axis=0)
            return all_vals.mean(axis=0), np.maximum(all_vals.std(axis=0), np.array([1, 1, 1], dtype=np.float32))
        return np.array([250, 246, 236], dtype=np.float32), np.array([1, 1, 1], dtype=np.float32)

    for fill_spec in cleanup.get("post_cleanup_feather_fill", []):
        x, y, w, h = box_tuple(fill_spec["bbox"])
        mean, std = stats_from_sample_rects(fill_spec["sample_rects"])
        seed = int(fill_spec.get("random_seed", 0))
        feather = int(fill_spec.get("feather_px", 6))
        rng = np.random.default_rng(seed)
        noise = rng.normal(0, std * 0.6, (h, w, 3))
        fill = np.clip(mean + noise, 0, 255).astype(np.float32)
        fill = cv2.GaussianBlur(fill, (0, 0), 1.2)

        yy, xx = np.mgrid[0:h, 0:w]
        dist = np.minimum.reduce([xx, yy, w - 1 - xx, h - 1 - yy]).astype(np.float32)
        alpha = np.clip(dist / max(1, feather), 0, 1)
        alpha = cv2.GaussianBlur(alpha, (0, 0), 1.0)
        clean_rgb[y : y + h, x : x + w] = (
            clean_rgb[y : y + h, x : x + w] * (1 - alpha[:, :, None]) + fill * alpha[:, :, None]
        )

    out = Image.fromarray(np.clip(clean_rgb, 0, 255).astype(np.uint8))
    out.save(clean_output_path)

    # Verify preparation only changed cleanup rectangles.
    src_arr = np.array(img.convert("RGBA"))
    out_arr = np.array(out.convert("RGBA"))
    changed = np.any(src_arr != out_arr, axis=2)
    allowed = np.array(make_mask(img.size, cleanup_boxes(layout), padding=0)) > 0
    invalid = changed & ~allowed
    return {
        "clean_template_output": str(clean_output_path),
        "cleanup_changed_pixels_total": int(changed.sum()),
        "cleanup_changed_pixels_outside_cleanup_rectangles": int(invalid.sum()),
        "cleanup_validation_passed": int(invalid.sum()) == 0,
    }


def draw_debug_boxes(template_path: str | Path, layout_path: str | Path, output_path: str | Path) -> None:
    layout = json.loads(Path(layout_path).read_text(encoding="utf-8"))
    img = Image.open(template_path).convert("RGBA")
    d = ImageDraw.Draw(img)
    # Simple RGB colors are deliberately hard-coded only for this debug overlay.
    color_cycle = [(255, 0, 0, 255), (0, 128, 255, 255), (0, 160, 0, 255), (160, 0, 160, 255)]
    i = 0
    for name, field in layout["fields"].items():
        if field["type"] == "single_text":
            boxes = [field["bbox"]]
        else:
            boxes = field["line_boxes"]
        for box in boxes:
            x, y, w, h = box_tuple(box)
            color = color_cycle[i % len(color_cycle)]
            d.rectangle([x, y, x + w - 1, y + h - 1], outline=color, width=2)
        # Label at main bbox.
        main = field["bbox"]
        d.text((main["x"], max(0, main["y"] - 15)), name, fill=color_cycle[i % len(color_cycle)])
        i += 1
    img.save(output_path)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--layout", required=True, help="coupon_red_fields_layout_v2.json")
    parser.add_argument("--template", help="clean base PNG. If omitted, --clean-template-output is used.")
    parser.add_argument("--source", help="source JPEG with old variable text; used only to prepare a clean template.")
    parser.add_argument("--clean-template-output", help="write prepared clean template PNG here.")
    parser.add_argument("--values", help="JSON containing replacement values. If omitted, layout.test_values is used.")
    parser.add_argument("--output", help="write rendered coupon PNG here.")
    parser.add_argument("--debug-boxes", help="write a debug PNG showing field bboxes.")
    parser.add_argument("--report", help="write validation report JSON here.")
    parser.add_argument("--production", action="store_true", help="require production_font_file paths instead of test fallbacks")
    args = parser.parse_args()

    report: dict[str, Any] = {}

    if args.source and args.clean_template_output:
        report["cleanup"] = prepare_clean_template(args.source, args.layout, args.clean_template_output)

    template = args.template or args.clean_template_output
    if not template:
        raise SystemExit("Either --template or --clean-template-output is required.")

    values = None
    if args.values:
        values = json.loads(Path(args.values).read_text(encoding="utf-8"))

    if args.output:
        draw_results = render(template, args.layout, args.output, values=values, production=args.production)
        report["draw_results"] = draw_results
        report["validation"] = validate(template, args.output, args.layout, draw_results)

    if args.debug_boxes:
        draw_debug_boxes(template, args.layout, args.debug_boxes)

    if args.report:
        Path(args.report).write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")

    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
