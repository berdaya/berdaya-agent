"""Berdaya Local provider profile (dev server on localhost)."""

from typing import Any

from agent.berdaya_tags import berdaya_portal_tags
from providers import register_provider
from providers.base import ProviderProfile


class BerdayaLocalProfile(ProviderProfile):
    def build_extra_body(
        self, *, session_id: str | None = None, **context: Any
    ) -> dict[str, Any]:
        return {"tags": berdaya_portal_tags()}


berdaya_local = BerdayaLocalProfile(
    name="berdaya-local",
    aliases=("berdaya-local-dev",),
    env_vars=("BERDAYA_API_KEY", "BERDAYA_LOCAL_BASE_URL"),
    display_name="Berdaya Local",
    description="Berdaya AI — local dev server at 127.0.0.1:8000",
    signup_url="https://berdaya.ai/keys",
    base_url="http://127.0.0.1:8000/v1",
    models_url="http://127.0.0.1:8000/v1/models",
    auth_type="api_key",
    default_aux_model="berdaya/1.0",
    fallback_models=("berdaya/1.0",),
)

register_provider(berdaya_local)
