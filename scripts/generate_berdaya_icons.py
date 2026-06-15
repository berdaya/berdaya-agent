#!/usr/bin/env python3
"""Generate Berdaya Agent app icons (simple black orb on white)."""

from __future__ import annotations

import struct
import shutil
import zlib
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]

BG = (255, 255, 255, 255)
ORB = (0, 0, 0, 255)


def render_icon(size: int, *, padding: float = 0.18) -> Image.Image:
    """Render a square icon at `size`×`size` pixels."""
    img = Image.new("RGBA", (size, size), BG)
    cx = cy = size / 2
    radius = size * (0.5 - padding)
    draw = ImageDraw.Draw(img)
    draw.ellipse([cx - radius, cy - radius, cx + radius, cy + radius], fill=ORB)
    return img


def save_png(path: Path, size: int) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    render_icon(size).save(path, format="PNG", optimize=True)


def save_ico(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    sizes = [16, 24, 32, 48, 64, 128, 256]
    images = [render_icon(s).convert("RGBA") for s in sizes]
    images[-1].save(
        path,
        format="ICO",
        sizes=[(s, s) for s in sizes],
        append_images=images[:-1],
    )


def _png_chunk(tag: bytes, data: bytes) -> bytes:
    crc = zlib.crc32(tag + data) & 0xFFFFFFFF
    return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", crc)


def _write_icns(path: Path, png_paths: list[tuple[str, Path]]) -> None:
    """Minimal ICNS writer from PNG files (enough for Tauri / macOS)."""
    entries = b""
    for icon_type, png_path in png_paths:
        png_data = png_path.read_bytes()
        if png_data[:8] != b"\x89PNG\r\n\x1a\n":
            raise ValueError(f"not a PNG: {png_path}")
        entries += icon_type + struct.pack(">I", len(png_data)) + png_data

    header = b"icns" + struct.pack(">I", 8 + len(entries))
    path.write_bytes(header + entries)


def save_icns(path: Path) -> None:
    tmp = path.parent / ".icns_build"
    tmp.mkdir(parents=True, exist_ok=True)
    mapping = [
        (b"icp4", 16),
        (b"icp5", 32),
        (b"icp6", 64),
        (b"ic07", 128),
        (b"ic08", 256),
        (b"ic09", 512),
        (b"ic10", 1024),
    ]
    pngs: list[tuple[str, Path]] = []
    for icon_type, size in mapping:
        p = tmp / f"{size}.png"
        save_png(p, size)
        pngs.append((icon_type, p))
    _write_icns(path, pngs)
    shutil.rmtree(tmp, ignore_errors=True)


def main() -> None:
    desktop_assets = ROOT / "apps" / "desktop" / "assets"
    desktop_public = ROOT / "apps" / "desktop" / "public"
    installer_icons = ROOT / "apps" / "bootstrap-installer" / "src-tauri" / "icons"

    # Electron-builder master icon (1024 PNG + platform bundles).
    save_png(desktop_assets / "icon.png", 1024)
    save_ico(desktop_assets / "icon.ico")
    save_icns(desktop_assets / "icon.icns")

    # Web / renderer favicon + in-app brand mark.
    save_png(desktop_public / "apple-touch-icon.png", 180)
    save_png(desktop_public / "berdaya-mark.png", 512)

    # Tauri bootstrap installer icons.
    save_png(installer_icons / "32x32.png", 32)
    save_png(installer_icons / "128x128.png", 128)
    save_png(installer_icons / "128x128@2x.png", 256)
    save_ico(installer_icons / "icon.ico")
    save_icns(installer_icons / "icon.icns")

    print("Berdaya icons written:")
    for d in (desktop_assets, desktop_public, installer_icons):
        for p in sorted(d.glob("*")):
            if p.suffix.lower() in {".png", ".ico", ".icns"}:
                print(f"  {p.relative_to(ROOT)} ({p.stat().st_size:,} bytes)")


if __name__ == "__main__":
    main()
