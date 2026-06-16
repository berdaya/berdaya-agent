"""Centralized Berdaya API request tags."""

from __future__ import annotations

from typing import List


def _berdaya_version() -> str:
    try:
        from hermes_cli import __version__

        return __version__
    except Exception:
        return "unknown"


def berdaya_client_tag() -> str:
    return f"client=berdaya-client-v{_berdaya_version()}"


def berdaya_portal_tags() -> List[str]:
    """Product attribution tags for Berdaya Cloud / Local inference."""
    return ["product=berdaya-agent", berdaya_client_tag()]
