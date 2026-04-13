#!/usr/bin/env python3
"""
ARM iOS Splash Screen Generator
Generates all required iOS splash screen PNGs from the apple-touch-icon.png.
Uses only Python stdlib + macOS sips — no external dependencies required.

Usage:
  python3 scripts/generate-icons.py
"""

import struct
import zlib
import os
import subprocess
import sys

ICON_PATH  = "public/icons/apple-touch-icon.png"
OUTPUT_DIR = "public/icons"
TMP_BMP    = "/tmp/arm_icon.bmp"

# Brand background colour #6B21A8
BG_R, BG_G, BG_B = 0x6B, 0x21, 0xA8

SPLASH_SCREENS = [
    ("splash-iphone-8.png",       750,  1334),
    ("splash-iphone-8-plus.png", 1242,  2208),
    ("splash-iphone-x.png",      1125,  2436),
    ("splash-iphone-11.png",      828,  1792),
    ("splash-iphone-12.png",     1170,  2532),
    ("splash-iphone-15-pro.png", 1290,  2796),
    ("splash-ipad.png",          1536,  2048),
    ("splash-ipad-pro.png",      2048,  2732),
]


def read_bmp(filepath):
    """Parse a 24-bit BMP file. Returns (width, height, rows) where
    rows is a list of bytearray rows in top-to-bottom order, each row
    being width * 3 bytes in RGB order."""
    with open(filepath, "rb") as f:
        data = f.read()

    if data[0:2] != b"BM":
        raise ValueError("Not a BMP file")

    pixel_offset = struct.unpack_from("<I", data, 10)[0]
    width        = struct.unpack_from("<i", data, 18)[0]
    height       = struct.unpack_from("<i", data, 22)[0]
    bit_count    = struct.unpack_from("<H", data, 28)[0]

    if bit_count != 24:
        raise ValueError(f"Expected 24-bit BMP, got {bit_count}-bit")

    bottom_up = height > 0
    height    = abs(height)

    # BMP rows are padded to 4-byte boundaries
    row_stride = ((width * 3 + 3) // 4) * 4

    rows = []
    for y in range(height):
        src_y      = (height - 1 - y) if bottom_up else y
        row_start  = pixel_offset + src_y * row_stride
        bgr        = data[row_start : row_start + width * 3]
        # Convert BGR → RGB
        rgb = bytearray(width * 3)
        for i in range(width):
            rgb[i * 3]     = bgr[i * 3 + 2]  # R
            rgb[i * 3 + 1] = bgr[i * 3 + 1]  # G
            rgb[i * 3 + 2] = bgr[i * 3]      # B
        rows.append(rgb)

    return width, height, rows


def png_chunk(chunk_type, chunk_data):
    crc = zlib.crc32(chunk_type + chunk_data) & 0xFFFFFFFF
    return (struct.pack(">I", len(chunk_data)) +
            chunk_type + chunk_data +
            struct.pack(">I", crc))


def create_splash_png(canvas_w, canvas_h, icon_rows, icon_w, icon_h, output_path):
    """Create a PNG with brand-colour background and centred icon."""
    off_x = (canvas_w - icon_w) // 2
    off_y = (canvas_h - icon_h) // 2

    bg_pixel  = bytes([BG_R, BG_G, BG_B])
    bg_row    = bg_pixel * canvas_w          # solid background scanline (no filter byte)

    raw = bytearray()
    for y in range(canvas_h):
        raw.append(0)                         # PNG filter byte (None)
        oy = y - off_y
        if 0 <= oy < icon_h:
            icon_rgb = icon_rows[oy]
            # left bg | icon | right bg
            raw.extend(bg_pixel * off_x)
            raw.extend(icon_rgb)
            raw.extend(bg_pixel * (canvas_w - off_x - icon_w))
        else:
            raw.extend(bg_row)

    ihdr     = struct.pack(">IIBBBBB", canvas_w, canvas_h, 8, 2, 0, 0, 0)
    idat     = zlib.compress(bytes(raw), 6)

    png = (b"\x89PNG\r\n\x1a\n" +
           png_chunk(b"IHDR", ihdr) +
           png_chunk(b"IDAT", idat) +
           png_chunk(b"IEND", b""))

    with open(output_path, "wb") as f:
        f.write(png)

    kb = len(png) // 1024
    print(f"  {os.path.basename(output_path):30s}  {canvas_w}x{canvas_h}  {kb} KB")


def main():
    # Step 1 — convert JPEG icon to 24-bit BMP via macOS sips
    print(f"Converting {ICON_PATH} → BMP …")
    r = subprocess.run(
        ["sips", "-s", "format", "bmp", ICON_PATH, "--out", TMP_BMP],
        capture_output=True, text=True
    )
    if r.returncode != 0:
        print(f"sips error: {r.stderr}", file=sys.stderr)
        sys.exit(1)

    # Step 2 — read pixel data
    icon_w, icon_h, icon_rows = read_bmp(TMP_BMP)
    os.remove(TMP_BMP)
    print(f"Icon size: {icon_w}x{icon_h}\n")

    # Step 3 — generate splash screens
    print("Generating splash screens:")
    for filename, w, h in SPLASH_SCREENS:
        out = os.path.join(OUTPUT_DIR, filename)
        create_splash_png(w, h, icon_rows, icon_w, icon_h, out)

    print("\nDone.")


if __name__ == "__main__":
    main()
