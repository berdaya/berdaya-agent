"""Tests for Berdaya Cloud / Local model provider plugins."""

from __future__ import annotations


def test_berdaya_cloud_profile_registers():
    from providers import get_provider_profile

    profile = get_provider_profile("berdaya-cloud")
    assert profile is not None
    assert profile.display_name == "Berdaya Cloud"
    assert profile.base_url == "https://api.berdaya.ai/v1"
    assert profile.auth_type == "api_key"
    assert "BERDAYA_API_KEY" in profile.env_vars


def test_berdaya_local_profile_registers():
    from providers import get_provider_profile

    profile = get_provider_profile("berdaya-local")
    assert profile is not None
    assert profile.display_name == "Berdaya Local"
    assert profile.base_url == "http://127.0.0.1:8000/v1"
    assert get_provider_profile("berdaya-local-dev") is profile


def test_berdaya_cloud_alias_berdaya():
    from providers import get_provider_profile

    assert get_provider_profile("berdaya") is get_provider_profile("berdaya-cloud")


def test_berdaya_tags():
    from agent.berdaya_tags import berdaya_portal_tags

    tags = berdaya_portal_tags()
    assert tags[0] == "product=berdaya-agent"
    assert tags[1].startswith("client=berdaya-client-v")


def test_berdaya_cloud_extra_body_tags():
    from providers import get_provider_profile

    profile = get_provider_profile("berdaya-cloud")
    body = profile.build_extra_body()
    assert body["tags"][0] == "product=berdaya-agent"
    assert body["tags"][1].startswith("client=berdaya-client-v")
