"""Berdaya Cloud provider profile (production API)."""

from typing import Any

from agent.berdaya_tags import berdaya_portal_tags
from providers import register_provider
from providers.base import ProviderProfile


class BerdayaCloudProfile(ProviderProfile):
    def build_extra_body(
        self, *, session_id: str | None = None, **context: Any
    ) -> dict[str, Any]:
        return {"tags": berdaya_portal_tags()}


berdaya_cloud = BerdayaCloudProfile(
    name="berdaya-cloud",
    aliases=("berdaya", "berdaya-ai", "berdayaai"),
    env_vars=("BERDAYA_API_KEY", "BERDAYA_CLOUD_BASE_URL"),
    display_name="Berdaya Cloud",
    description="Berdaya AI — managed models via api.berdaya.ai",
    signup_url="https://berdaya.ai/keys",
    base_url="https://api.berdaya.ai/v1",
    models_url="https://api.berdaya.ai/v1/models",
    auth_type="api_key",
    default_aux_model="berdaya/1.0",
    fallback_models=("berdaya/1.0",),
)

register_provider(berdaya_cloud)
