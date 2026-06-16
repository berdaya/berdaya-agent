"""Berdaya project identity file (PROJECT.md).

End-user-facing projects use PROJECT.md as the primary agent identity file.
Legacy installs may still have SOUL.md; readers fall back to it, writers always
target PROJECT.md.
"""

from __future__ import annotations

from pathlib import Path

from hermes_cli.default_soul import DEFAULT_SOUL_MD, LEGACY_DEFAULT_SOUL_MD

PROJECT_MD = "PROJECT.md"
LEGACY_SOUL_MD = "SOUL.md"

DEFAULT_PROJECT_MD = DEFAULT_SOUL_MD
LEGACY_DEFAULT_PROJECT_MD = LEGACY_DEFAULT_SOUL_MD


def identity_path_for_read(home: Path) -> Path | None:
    project = home / PROJECT_MD
    if project.exists():
        return project
    soul = home / LEGACY_SOUL_MD
    if soul.exists():
        return soul
    return None


def identity_path_for_write(home: Path) -> Path:
    return home / PROJECT_MD


def read_identity_content(home: Path) -> tuple[str, bool]:
    path = identity_path_for_read(home)
    if path is None:
        return "", False
    try:
        return path.read_text(encoding="utf-8"), True
    except OSError:
        return "", False


def write_identity_content(home: Path, content: str) -> None:
    identity_path_for_write(home).write_text(content, encoding="utf-8")
