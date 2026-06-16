# Berdaya Provider — Implementation Plan

Plan for adding a first-class **Berdaya** inference provider to Berdaya Agent — a managed API gateway (OpenRouter-style) backed by Berdaya AI infrastructure, replacing Nous Portal as the default product path.

**Status:** Planning  
**Related:** `REBRANDING.md`, `berdaya_platform.md` (berdaya.ai + api.berdaya.ai backend), `plugins/model-providers/openrouter/`, `plugins/model-providers/nous/`

---

## 1. Current state (after rebrand)

### Nous Research provider — still in the repo, hidden in product UI

The **Nous Portal** provider is **not removed** from the codebase. It remains a bundled model-provider plugin:

| Location | What it is |
|----------|------------|
| `plugins/model-providers/nous/__init__.py` | `ProviderProfile` — OAuth device-code auth, inference at `https://inference.nousresearch.com/v1` |
| `plugins/model-providers/nous/plugin.yaml` | Plugin manifest (`kind: model-provider`) |
| `hermes_cli/auth.py` | Full OAuth device-code flow, JWT refresh, shared `nous_auth.json` import |
| `hermes_cli/nous_account.py` | Portal entitlements, free tier, subscription, tool-pool coverage |
| `agent/portal_tags.py` | Sends `product=hermes-agent` + client version tags on every Nous request |

**Rebrand work already done:** Nous is **hidden from Berdaya product surfaces**, not deleted:

| Surface | Mechanism |
|---------|-----------|
| Desktop app | `apps/desktop/src/lib/desktop-hidden-providers.ts` — `HIDDEN_DESKTOP_PROVIDER_IDS = ['nous']` |
| CLI / dashboard / setup | `hermes_constants.BERDAYA_HIDDEN_PROVIDER_IDS = frozenset({"nous"})` + `is_berdaya_hidden_provider()` |
| `berdaya auth add nous` | Blocked in `hermes_cli/auth_commands.py` with message to use OpenRouter instead |
| `berdaya portal` | Blocked in `hermes_cli/portal_cli.py` |
| Model picker / onboarding | Filtered in `hermes_cli/main.py`, `model_setup_flows.py`, `web_server.py` |

**Implication:** Existing users who already have Nous credentials in `~/.berdaya/auth.json` may still resolve `provider: nous` at runtime if config points there, but new Berdaya installs cannot discover or configure it through normal UX.

### OpenRouter — the reference pattern you want

OpenRouter is the best template for “we manage the API, users bring a key”:

| Concern | OpenRouter implementation |
|---------|---------------------------|
| Provider plugin | `plugins/model-providers/openrouter/__init__.py` — `ProviderProfile` subclass |
| Auth | Simple API key: `OPENROUTER_API_KEY` in `.env` / credential pool |
| Model catalog | Live fetch from `https://openrouter.ai/api/v1/models` + remote manifest in `website/static/api/model-catalog.json` |
| Registry wiring | Auto-wired via `register_provider()` — auth, doctor, setup, runtime, transport |
| Special logic | Reasoning passthrough, Anthropic adaptive-thinking quirks, optional `provider` routing prefs |

**Berdaya provider should follow this path first** (API key + OpenAI-compatible `/v1/chat/completions`), not the Nous OAuth Portal path, unless Berdaya explicitly wants device-code login and entitlements baked into the agent.

---

## 2. Goals

1. **First-class Berdaya provider** — visible in desktop, CLI setup, model picker, and `berdaya auth add berdaya`.
2. **Managed API gateway** — Berdaya hosts models behind one OpenAI-compatible base URL (like OpenRouter).
3. **Curated model catalog** — agent-side picker stays accurate without frequent releases (remote JSON manifest + `/models` fallback).
4. **Product attribution** — requests tagged so Berdaya can meter usage by client version (mirror `portal_tags`, with Berdaya product strings).
5. **Clean product story** — Nous stays hidden; Berdaya becomes the recommended default provider for new installs.

### Non-goals (phase 1)

- Replacing every `nous_*` module in one PR (large, risky).
- OAuth device-code / Portal JWT refresh (defer unless Berdaya API requires it).
- Free tool-pool entitlements (`managed_nous_tools`) — separate product decision.

---

## 3. Architecture decision

### Recommended: Path A — OpenRouter-style API key provider

```
User → Berdaya Agent → https://api.berdaya.ai/v1  (OpenAI-compatible)
         Authorization: Bearer <BERDAYA_API_KEY>
         extra_body.tags: ["product=berdaya-agent", "client=berdaya-client-vX.Y.Z"]
```

**Why:** Minimal core footprint (one plugin directory + small catalog/attribution helpers). Matches how most aggregator providers work in this codebase. No changes to `run_agent.py` transport unless Berdaya API is non-standard.

### Alternative: Path B — Nous Portal fork

Reuse `hermes_cli/auth.py` OAuth flow, `nous_account.py` entitlements, and swap URLs/client IDs to Berdaya Portal.

**Only choose this if** Berdaya API is literally a Portal fork with the same JWT + inference-key exchange. Otherwise Path B duplicates hundreds of lines of Nous-specific logic and keeps `nous` naming forever.

---

## 4. Backend prerequisites (Berdaya API team)

Before agent work lands, the API should expose:

| Endpoint | Purpose |
|----------|---------|
| `GET /v1/models` | Model picker + doctor health check |
| `POST /v1/chat/completions` | Main agent loop (streaming supported) |
| (optional) `GET /v1/models/{id}` | Per-model metadata if needed |

**Contract:**

- OpenAI Chat Completions schema (tools, streaming, `reasoning` if supported).
- Bearer API key auth (`Authorization: Bearer …`).
- Stable model IDs (e.g. `berdaya/hermes-4`, `anthropic/claude-sonnet-4.6` — pick one namespace convention and stick to it).
- Accept optional `extra_body.tags` array for client attribution (same pattern Nous uses today).

**Staging URLs** (placeholders — replace with real endpoints):

```yaml
# config.yaml example for users
model:
  provider: berdaya
  model: berdaya/1.0
```

```bash
# .env (secrets only)
BERDAYA_API_KEY=sk-berdaya-...
# optional override for staging:
# BERDAYA_BASE_URL=https://staging-api.berdaya.ai/v1
```

---

## 4.1 Local development (platform + agent, before deploy)

You do **not** need Fly.io, Vercel, or `api.berdaya.ai` to integrate the agent. Run the **platform API on localhost**, expose it with **ngrok**, and point the agent at the ngrok URL.

### Architecture (local)

```text
Berdaya Agent (your machine)
    │  BERDAYA_BASE_URL=https://<ngrok>.ngrok-free.dev/v1
    │  Authorization: Bearer sk-berdaya-dev-local-key
    ▼
ngrok tunnel → localhost:8000
    ▼
apps/api (FastAPI)  ──►  Neon Postgres + upstream keys (Anthropic, …)

Dashboard / keys / billing (optional, same machine):
    http://localhost:3000  (apps/web — no ngrok required for agent testing)
```

**Tunnel the API (port 8000), not the web app.** The agent only calls `/v1/models` and `/v1/chat/completions`.

### Platform repo (`berdaya-platform`) — one-time setup

From repo root:

```bash
docker compose up -d          # optional if using Neon only
npm install
npm run db:push
npm run db:seed               # creates dev key + berdaya/1.0 model
```

**API** — `apps/api/.env`:

```env
DATABASE_URL=postgresql+asyncpg://USER:PASS@HOST/neondb?sslmode=require
ANTHROPIC_API_KEY=sk-ant-...  # at least one upstream lab key
APP_ENV=development
CORS_ORIGINS=http://localhost:3000,https://www.berdaya.ai
```

**Web** (for dashboard keys / billing) — `apps/web/.env`:

```env
DATABASE_URL=postgresql://USER:PASS@HOST/neondb?sslmode=require
AUTH_SECRET=...
AUTH_GOOGLE_ID=...
AUTH_GOOGLE_SECRET=...
ADMIN_EMAILS=you@example.com
```

Start services (two terminals):

```bash
npm run dev:api    # → http://localhost:8000
npm run dev:web    # → http://localhost:3000
```

Smoke test API locally:

```bash
curl http://localhost:8000/health
curl http://localhost:8000/v1/models
curl http://localhost:8000/v1/chat/completions \
  -H "Authorization: Bearer sk-berdaya-dev-local-key" \
  -H "Content-Type: application/json" \
  -d '{"model":"berdaya/1.0","messages":[{"role":"user","content":"hi"}]}'
```

### Expose API with ngrok

In a **third** terminal:

```bash
ngrok http 8000
```

Copy the HTTPS URL, e.g. `https://abc123.ngrok-free.dev`.  
Your agent base URL is **`https://abc123.ngrok-free.dev/v1`** (include `/v1`).

> ngrok free URLs change when you restart ngrok. Update `BERDAYA_BASE_URL` each time, or use a reserved ngrok domain.

### Agent repo — config

**Option A — environment (recommended for local dev)**

`~/.berdaya/.env` or project `.env`:

```bash
BERDAYA_API_KEY=sk-berdaya-dev-local-key
BERDAYA_BASE_URL=https://abc123.ngrok-free.dev/v1
```

**Option B — config.yaml**

```yaml
model:
  provider: berdaya
  model: berdaya/1.0
  base_url: https://abc123.ngrok-free.dev/v1   # if profile supports override
```

Use the key from **Dashboard → API Keys** (`sk-berdaya-…`) if you created one; the seeded dev key works without the dashboard.

### Agent verification (Phase 1 checklist)

```bash
# After implementing plugins/model-providers/berdaya/
berdaya auth add berdaya --key sk-berdaya-dev-local-key

# Doctor should hit GET /v1/models via ngrok
berdaya doctor

# Quick chat (streaming)
berdaya --provider berdaya --model berdaya/1.0 -q "Say hello in one sentence"
```

**Expected platform behavior:**

| Check | Expected |
|-------|----------|
| Model list | Only `berdaya/*` (e.g. `berdaya/1.0`) |
| Auth failure | `401` without key |
| Empty balance | `402` with top-up hint |
| Tags | `usage_events.metadata.tags` on www Usage page |
| Token deduct | Balance drops after chat (Dashboard → Usage) |

### Midtrans / web ngrok (separate from agent)

Billing webhooks need ngrok on **port 3000** (web), not 8000:

```bash
ngrok http 3000
```

Set Midtrans Payment Notification URL to `https://<web-ngrok>/api/webhooks/midtrans` and add `AUTH_URL` / `NGROK_HOST` in `apps/web/.env` (see `apps/web/.env.example`). This is optional for agent integration.

### Production later

When ready to deploy, change only the URLs:

| Variable | Local + ngrok | Production |
|----------|---------------|------------|
| `BERDAYA_BASE_URL` | `https://<ngrok>.ngrok-free.dev/v1` | `https://api.berdaya.ai/v1` |
| Signup / keys | `http://localhost:3000/dashboard/keys` | `https://www.berdaya.ai/dashboard/keys` |

No agent code changes if the API contract stays the same.

See also **`berdaya_platform.md` § Local agent integration** for the platform-side checklist.

---

## 5. Agent implementation phases

### Phase 1 — Minimal provider plugin (MVP)

**Deliverable:** `berdaya auth add berdaya` + `berdaya --provider berdaya --model <id>` works end-to-end.

1. Create plugin directory:

   ```
   plugins/model-providers/berdaya/
   ├── __init__.py      # BerdayaProfile + register_provider()
   └── plugin.yaml
   ```

2. **`__init__.py` sketch** (start from `openrouter/__init__.py`, simplify):

   ```python
   class BerdayaProfile(ProviderProfile):
       def build_extra_body(self, *, session_id=None, **context):
           return {"tags": berdaya_portal_tags()}  # new helper

   berdaya = BerdayaProfile(
       name="berdaya",
       aliases=("berdaya-ai", "berdayaai"),
       env_vars=("BERDAYA_API_KEY", "BERDAYA_BASE_URL"),
       display_name="Berdaya",
       description="Berdaya — managed models via Berdaya AI",
       signup_url="https://www.berdaya.ai/dashboard/keys",
       base_url="https://api.berdaya.ai/v1",
       models_url="https://api.berdaya.ai/v1/models",
       auth_type="api_key",
       default_aux_model="berdaya/1.0",
       fallback_models=("berdaya/1.0",),
   )
   register_provider(berdaya)
   ```

3. Add **`agent/berdaya_tags.py`** (or extend `portal_tags.py` with Berdaya names):

   ```python
   def berdaya_portal_tags() -> list[str]:
       return ["product=berdaya-agent", f"client=berdaya-client-v{version}"]
   ```

4. Register secret in **`hermes_cli/config.py`** → `OPTIONAL_ENV_VARS`:

   ```python
   "BERDAYA_API_KEY": {
       "description": "Berdaya AI inference API key",
       "prompt": "Berdaya API Key",
       "url": "https://berdaya.ai/keys",
       "password": True,
       "category": "provider",
   },
   ```

5. Verify auto-wiring (no extra registry edits expected):
   - `hermes_cli/auth.py` picks up profile via `_discover_providers()` loop
   - `hermes doctor` probes `/models`
   - `hermes_cli/runtime_provider.py` resolves base URL + key

**Tests:**

- `tests/plugins/test_berdaya_provider.py` — profile registers, hostname detection, tags shape
- Extend `tests/test_hermes_constants.py` — `berdaya` is **not** in `BERDAYA_HIDDEN_PROVIDER_IDS`

---

### Phase 2 — Model catalog + picker UX

**Deliverable:** `/model` and desktop model picker show Berdaya models with sane defaults.

1. **Remote manifest** — add `"berdaya"` section to `website/static/api/model-catalog.json`:

   ```json
   "berdaya": {
     "metadata": { "description": "Berdaya managed models" },
     "models": [
       { "id": "berdaya/default-agentic", "description": "Default agentic model" }
     ]
   }
   ```

2. **`hermes_cli/model_catalog.py`** — add `get_curated_berdaya_models()` / `get_curated_berdaya_model_ids()` mirroring OpenRouter/Nous accessors.

3. **`hermes_cli/model_switch.py`** — wire Berdaya into curated provider list and default resolution order (see `_resolve_authenticated_providers()` — today falls back to `("openrouter", "nous")`; Berdaya fork should prefer `("berdaya", "openrouter")`).

4. **Default config** — update `DEFAULT_CONFIG["model"]` in `hermes_cli/config.py` if Berdaya should be the out-of-box provider (only when API key present or after setup wizard).

5. **Desktop** — ensure `berdaya` is **not** in `HIDDEN_DESKTOP_PROVIDER_IDS`; optionally pin as recommended in onboarding.

**Tests:**

- Catalog accessor falls back to hardcoded list when fetch fails
- Model picker includes `berdaya` slug when authenticated

---

### Phase 3 — Setup wizard + auth UX

**Deliverable:** First-run setup offers Berdaya alongside OpenRouter.

1. **`hermes_cli/model_setup_flows.py`** — add Berdaya branch (copy OpenRouter flow pattern).
2. **`hermes_cli/auth_commands.py`** — `berdaya auth add berdaya` with API key prompt (already works generically once profile exists; verify label/pool behavior).
3. **Desktop Settings → Providers / API keys** — Berdaya row with signup link (no code if backend RPC already lists all non-hidden providers).
4. **Update `REBRANDING.md`** — document Berdaya as the primary provider; Nous as legacy/hidden.

---

### Phase 4 — Reasoning, routing, and edge cases

Only if Berdaya API needs them (copy from OpenRouter profile as needed):

| Feature | When needed |
|---------|-------------|
| `build_api_kwargs_extras()` reasoning passthrough | Berdaya proxies models with thinking/reasoning |
| Provider routing preferences | Berdaya supports multi-backend routing like OpenRouter `provider` block |
| Model-specific quirks | Subclass `BerdayaProfile` like `OpenRouterProfile` |

Run **`berdaya doctor`** against staging with real key before shipping.

---

### Phase 5 — Nous cleanup (optional, later)

Keep Nous code for backward compatibility until you are ready to delete it:

| Option | Action |
|--------|--------|
| **Soft deprecation (current)** | Keep `nous` plugin + hide lists; document migration to Berdaya |
| **Hard removal** | Delete `plugins/model-providers/nous/`, strip `nous_*` modules, remove Portal CLI, update tests — large diff, breaks users with existing Nous auth |

**Do not remove Nous in the same PR as adding Berdaya** — ship Berdaya first, migrate docs, then consider deletion in a follow-up.

---

## 6. Files touch list (by phase)

### Phase 1 (required)

| File | Change |
|------|--------|
| `plugins/model-providers/berdaya/__init__.py` | **New** — provider profile |
| `plugins/model-providers/berdaya/plugin.yaml` | **New** — manifest |
| `agent/berdaya_tags.py` | **New** — attribution tags |
| `hermes_cli/config.py` | `OPTIONAL_ENV_VARS` + optional default model hints |
| `tests/plugins/test_berdaya_provider.py` | **New** — registration + tags |

### Phase 2 (catalog + defaults)

| File | Change |
|------|--------|
| `website/static/api/model-catalog.json` | Add `berdaya` provider section |
| `scripts/build_model_catalog.py` | Include Berdaya if catalog is generated |
| `hermes_cli/model_catalog.py` | `get_curated_berdaya_*` accessors |
| `hermes_cli/model_switch.py` | Curated list + default provider order |
| `hermes_cli/models.py` | Verify `CANONICAL_PROVIDERS` includes `berdaya` (auto via registry) |

### Phase 3 (UX)

| File | Change |
|------|--------|
| `hermes_cli/model_setup_flows.py` | Setup wizard entry |
| `hermes_cli/main.py` | Default provider hints in `/model` |
| `REBRANDING.md` | Document Berdaya provider |
| `website/docs/user-guide/...` | User-facing setup docs (optional) |

### Explicitly do **not** hide Berdaya

These must **exclude** `berdaya` (only `nous` stays hidden):

- `hermes_constants.BERDAYA_HIDDEN_PROVIDER_IDS`
- `apps/desktop/src/lib/desktop-hidden-providers.ts`

---

## 7. Verification checklist

Before calling Phase 1 done:

- [ ] `python -c "from providers import get_provider_profile; print(get_provider_profile('berdaya'))"`
- [ ] `berdaya auth add berdaya --key sk-...` persists to `~/.berdaya/auth.json`
- [ ] `berdaya doctor` shows Berdaya `/models` probe green
- [ ] `berdaya --provider berdaya --model berdaya/1.0 -q "hi"` returns a response (local: via ngrok → `BERDAYA_BASE_URL`)
- [ ] Request payload includes `tags: ["product=berdaya-agent", "client=berdaya-client-v…"]`
- [ ] Desktop model picker lists Berdaya (Phase 2+)
- [ ] `is_berdaya_hidden_provider("berdaya")` is `False`
- [ ] `scripts/run_tests.sh tests/plugins/test_berdaya_provider.py -q` passes

---

## 8. Open questions for Berdaya AI

Resolve before **production** (local dev can proceed now):

1. **Production API base URL** — `https://api.berdaya.ai/v1` ✅ planned
2. **API key format & signup URL** — `sk-berdaya-…` from `https://www.berdaya.ai/dashboard/keys` ✅
3. **Auth model** — API key only for Phase 1 ✅ (OAuth is platform admin upstream, not agent auth)
4. **Model ID namespace** — **`berdaya/*` only** (e.g. `berdaya/1.0`); upstream mapping is server-side ✅
5. **Default agentic model** — **`berdaya/1.0`** ✅ (seeded in platform DB)
6. **Auxiliary model** — same as default for now, or add `berdaya/fast` later
7. **Reasoning support** — platform maps to Anthropic thinking when model supports it; agent may pass `reasoning` extra_body
8. **Remote catalog hosting** — `GET /v1/models` live + optional `model-catalog.json` on www
9. **Rate limits / billing errors** — `402 insufficient_balance` with top-up URL ✅ implemented

---

## 9. Suggested PR sequence

| PR | Scope |
|----|-------|
| **PR 1** | Phase 1 — plugin + tags + `OPTIONAL_ENV_VARS` + unit tests |
| **PR 2** | Phase 2 — catalog JSON + model_switch defaults + E2E against staging |
| **PR 3** | Phase 3 — setup wizard + desktop onboarding copy + docs |
| **PR 4** | Phase 4 — reasoning/routing quirks if needed |
| **PR 5** | (Optional) Nous hard removal |

---

## 10. Quick reference — Nous vs Berdaya

| | Nous Portal (legacy) | Berdaya (target) |
|--|----------------------|------------------|
| Plugin | `plugins/model-providers/nous/` | `plugins/model-providers/berdaya/` |
| Auth | OAuth device code | API key (`BERDAYA_API_KEY`) |
| Visible in Berdaya product | **No** (hidden) | **Yes** |
| Inference URL | `inference.nousresearch.com` | TBD (`api.berdaya.ai`) |
| Tags | `product=hermes-agent` | `product=berdaya-agent` |
| Template to copy | — | `plugins/model-providers/openrouter/` |

---

*Last updated: 2026-06-16*
