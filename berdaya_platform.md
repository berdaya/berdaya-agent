# Berdaya Platform Plan — berdaya.ai + api.berdaya.ai

Plan for building the **Berdaya product surface** (website, keys, **Midtrans token top-up billing**) and the **Berdaya inference gateway** (direct connections to frontier labs — not via OpenRouter or other resellers).

**Status:** Planning  
**Related:** `berdaya_provider.md` (agent-side provider plugin), `REBRANDING.md`

---

## 1. FastAPI vs Go — which should you use?

**Recommendation: start with FastAPI.** Revisit Go only if you hit concrete scale or latency limits, not preemptively.

### What this API actually does

`api.berdaya.ai` is an **I/O-bound gateway**, not a compute engine:

```
Client (Berdaya Agent) → api.berdaya.ai → Anthropic / OpenAI / DeepSeek / …
                              │
                         auth, rate limits,
                         routing, metering,
                         stream relay
```

99%+ of request time is **waiting on upstream labs**. Your gateway adds auth, routing, logging, and SSE relay — not model inference. Language choice matters less than adapter quality and ops.

### Comparison

| Dimension | FastAPI (Python) | Go |
|-----------|----------------|-----|
| **Time to MVP** | Fast — Pydantic, httpx, official SDKs | Slower — more boilerplate per provider adapter |
| **Streaming / SSE** | Excellent (`StreamingResponse`, async httpx) | Excellent (`io.Copy`, goroutines) |
| **Concurrent streams (typical startup)** | Thousands on one modest VM — enough for years | Tens of thousands — overkill early |
| **Memory per idle connection** | Higher (~MB scale under load) | Lower |
| **Raw proxy throughput** | Slightly lower | Slightly higher |
| **Multi-provider adapters** | Official Anthropic/OpenAI Python SDKs; agent repo already has transport patterns to reference | Official Go SDKs exist; no shared code with Berdaya Agent |
| **Team fit** | Berdaya Agent is Python — one language for agent + API | Splits stack unless team is Go-heavy |
| **Hiring / maintenance** | Same ecosystem as agent, skills transfer | Separate service expertise |
| **Deployment** | Uvicorn + Docker on Fly/Railway/VPS | Single static binary — nice, not decisive at MVP |

### When Go *would* be the better pick

Choose Go **from day one** only if most of these are true:

- You already have strong Go engineers and weak Python bench
- You expect **very high concurrent stream count** early (10k+ simultaneous) on tight memory
- You want one binary, minimal runtime deps, and no Python in production at all
- You are building infra-grade routing (multi-region, sub-10ms gateway overhead) before product validation

Otherwise Go is premature optimization for a direct-lab gateway at startup scale.

### When to migrate Python → Go (later)

Keep FastAPI until metrics say otherwise:

| Signal | Action |
|--------|--------|
| Gateway CPU/memory is the bottleneck (not upstream) | Profile; optimize hot paths first |
| Connection count exceeds comfortable Uvicorn limits | Horizontal scale + Redis first |
| Still saturated after scale-out | Extract **stream relay** to Go; or rewrite gateway |

Many successful AI gateways ran Python or Node for years before rewriting hot paths.

### Decision record

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Gateway language** | **FastAPI** | Same stack as agent, fastest path to direct Anthropic/OpenAI/DeepSeek adapters, sufficient for MVP→growth |
| **Product site** | **Next.js** | Auth, dashboard, keys, Midtrans top-up — not on critical inference path |
| **Billing model** | **Prepaid token balance** | Users top up via Midtrans; inference deducts tokens per usage |
| **Payments** | **Midtrans** | Snap / VA / QRIS / e-wallets (Indonesia-first) |
| **Cache / rate limits** | **Upstash Redis** | Serverless-friendly, global, low ops |
| **Primary DB** | **PostgreSQL** (Neon) | Users, keys, models, usage, billing |
| **Reseller policy** | **No OpenRouter in production path** | Direct lab contracts + keys; Berdaya owns routing and margin |

---

## 2. System overview

```text
┌─────────────────────────────────────────────────────────────────────────┐
│  berdaya.ai (Next.js on Vercel)                                         │
│  • Marketing, docs, signup/login                                          │
│  • Dashboard: API keys, token balance, top-up (Midtrans), usage history   │
│  • Admin: model catalog, provider key rotation (internal)               │
│  • Does NOT terminate long LLM streams in production                      │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │ creates keys, reads usage (Postgres)
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  PostgreSQL (Neon)                                                       │
│  users, orgs, api_keys, token_balances, top_ups, models, usage_events    │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
┌───────────────────────────────┴─────────────────────────────────────────┐
│  api.berdaya.ai (FastAPI on Fly.io / Railway / VPS)                      │
│  • GET  /v1/models                                                       │
│  • POST /v1/chat/completions  (OpenAI-compatible surface for Berdaya Agent)│
│  • Bearer BERDAYA_API_KEY → validate → check token balance → route → deduct │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
   Anthropic API            OpenAI API              DeepSeek API
   (Messages API)           (Chat Completions)      (OpenAI-compatible)
        │                       │                       │
   Google Gemini            xAI Grok                 … future labs
   (OpenAI-compat or        (OpenAI-compatible)
    native SDK)
```

**Upstash Redis** sits beside the API service:

- Rate limits per API key / org
- Short TTL caches (`GET /v1/models`, provider health, org token balance)
- Idempotency keys for Midtrans webhook handling
- Circuit-breaker state per upstream

---

## 3. Domain split

### berdaya.ai — Next.js (product)

| Area | Responsibility |
|------|----------------|
| **Public** | Landing, pricing, docs links, status page link |
| **Auth** | Clerk or Auth.js — email/OAuth login |
| **Dashboard** | Create/revoke API keys, view token balance, top-up, usage history |
| **Billing** | Prepaid **token top-up** via **Midtrans Snap** (VA, QRIS, GoPay, etc.) |
| **Internal admin** | Model catalog, token packages, Midtrans reconciliation (protected routes) |

**Tech**

| Layer | Choice |
|-------|--------|
| Framework | Next.js 15 App Router, TypeScript |
| Styling | Tailwind + shadcn/ui |
| Auth | Clerk (fast) or Auth.js (more control) |
| ORM | Drizzle |
| DB | Neon Postgres (shared with API metadata) |
| Payments | Midtrans (Snap + Core API) |
| Hosting | Vercel |

**API routes on Next.js (thin only)**

- `POST /api/billing/topup/create` — create Midtrans transaction, return Snap token
- `POST /api/webhooks/midtrans` — payment notification handler (credit tokens idempotently)
- Server actions for dashboard CRUD that writes to Postgres
- Server actions for balance + usage read models

Do **not** implement `POST /v1/chat/completions` on Vercel for production traffic.

---

### api.berdaya.ai — FastAPI (inference gateway)

| Endpoint | Purpose |
|----------|---------|
| `GET /health` | Load balancer / Fly health check |
| `GET /v1/models` | Public model list (from Postgres catalog) |
| `POST /v1/chat/completions` | Unified OpenAI-compatible entry (Berdaya Agent calls this) |
| (future) `POST /v1/embeddings` | If needed for memory/search features |

**Tech**

| Layer | Choice |
|-------|--------|
| Framework | FastAPI |
| ASGI | Uvicorn (+ Gunicorn workers in prod) |
| HTTP upstream | httpx (async) + official SDKs where helpful |
| Validation | Pydantic v2 |
| Migrations | Alembic (if API owns tables) or shared Drizzle migrations from monorepo |
| Hosting | Fly.io (recommended) or Railway |
| Secrets | Fly secrets / Doppler — **lab API keys never in repo** |

---

## 4. Direct frontier labs (not OpenRouter)

Berdaya holds **direct** agreements and API keys with each lab. The gateway translates Berdaya’s unified surface into each lab’s native API.

### Provider integration matrix

| Lab | Upstream API | Berdaya adapter | Notes |
|-----|--------------|-----------------|-------|
| **Anthropic** | Messages API (`/v1/messages`) | `AnthropicAdapter` | Not OpenAI-compatible; must translate tools, thinking blocks, streaming events |
| **OpenAI** | Chat Completions (`/v1/chat/completions`) | Passthrough or thin wrapper | Simplest path; also GPT-4o, o-series with reasoning fields |
| **DeepSeek** | OpenAI-compatible | Passthrough | Base URL + key swap |
| **Google Gemini** | OpenAI-compatible endpoint or GenAI SDK | Wrapper | Pick one official path; avoid dual maintenance |
| **xAI** | OpenAI-compatible | Passthrough | Grok models |
| **Meta / others** | Via direct host or partner | Per-lab | Add when contracted |

### Unified external contract (what Berdaya Agent sees)

Berdaya Agent speaks **one** OpenAI Chat Completions dialect:

```http
POST https://api.berdaya.ai/v1/chat/completions
Authorization: Bearer sk-berdaya-live-…
Content-Type: application/json

{
  "model": "anthropic/claude-sonnet-4.6",
  "messages": [...],
  "tools": [...],
  "stream": true,
  "reasoning": { "enabled": true, "effort": "medium" }
}
```

**Model ID convention:** `{lab}/{model-id}` — e.g. `openai/gpt-5.4`, `anthropic/claude-sonnet-4.6`, `deepseek/deepseek-chat`.

Internally the gateway:

1. Parses prefix → selects adapter
2. Loads **Berdaya’s** upstream key for that lab (from secrets store)
3. Translates request → native upstream shape
4. Streams native response → OpenAI-compatible SSE chunks back to client
5. Computes token charge → deducts org balance (ledger) → records `usage_events`
6. Returns **402** if balance was already exhausted before request

### What you do NOT do

| Anti-pattern | Why |
|--------------|-----|
| Route production traffic through OpenRouter | Reseller dependency, double margin, less control |
| Expose lab keys to end users | Keys live only on api.berdaya.ai |
| One adapter assuming all labs are OpenAI-compat | Anthropic breaks that assumption — plan for native adapters |

### Reference in this repo

Berdaya Agent already implements per-lab transports (`agent/transports/anthropic.py`, `chat_completions.py`, etc.). The **gateway reimplements a subset** of that translation server-side — do not call back into the agent. Use the agent code as a **spec reference**, not a library dependency.

Suggested gateway layout:

```text
berdaya-api/
├── app/
│   ├── main.py
│   ├── auth/           # API key validation (Postgres + Redis cache)
│   ├── routes/
│   │   ├── models.py
│   │   └── chat.py     # POST /v1/chat/completions
│   ├── adapters/
│   │   ├── base.py
│   │   ├── openai.py   # passthrough
│   │   ├── deepseek.py # OpenAI-compat passthrough
│   │   ├── anthropic.py # Messages API translation (largest effort)
│   │   └── gemini.py
│   ├── routing/        # model string → adapter + upstream model id
│   ├── billing/        # balance check, deduct, ledger writes
│   ├── metering/       # usage events
│   └── streaming/      # SSE encode/decode helpers
├── tests/
└── Dockerfile
```

---

## 5. Auth & API keys

### Two key layers

| Key type | Who holds it | Example |
|----------|--------------|---------|
| **Berdaya API key** | End user (Berdaya Agent) | `sk-berdaya-live-abc…` |
| **Lab API key** | Berdaya platform only (server secrets) | `sk-ant-…`, `sk-…`, DeepSeek key |

### Berdaya key lifecycle

1. User signs up on **berdaya.ai**
2. Dashboard → “Create API key” → row in `api_keys` (store **hash** only, show prefix once)
3. Agent: `BERDAYA_API_KEY=sk-berdaya-live-…` or `berdaya auth add berdaya`
4. **api.berdaya.ai** validates hash, loads org limits, attaches `org_id` to request context

### Redis (Upstash) usage

| Key pattern | TTL | Purpose |
|-------------|-----|---------|
| `rl:{key_id}:{minute}` | 60s | Rate limit counter |
| `key:valid:{key_hash_prefix}` | 5m | Cache valid key → org_id lookup |
| `balance:{org_id}` | 30s | Cache token balance (invalidate on top-up / deduction) |
| `models:catalog` | 1–5m | Cache `GET /v1/models` JSON |
| `upstream:health:{lab}` | 30s | Circuit breaker / health |
| `midtrans:notify:{order_id}` | 24h | Webhook idempotency — prevent double credit |

---

## 6. Billing — prepaid tokens + Midtrans

Berdaya uses a **prepaid token balance**, not subscriptions. Users buy token packs with **Midtrans**; every inference call **deducts** tokens from the org balance. When balance hits zero, the API returns **402 Payment Required** until they top up again.

### Why prepaid tokens (not Stripe subscriptions)

| Approach | Fit for Berdaya |
|----------|-----------------|
| Stripe subscription | Monthly recurring — poor fit for bursty agent usage |
| Pay-as-you-go invoice | Hard in IDR market; delayed collection |
| **Prepaid token top-up** | Familiar in Indonesia; user controls spend; no surprise bills |

### What is a “token”?

**Berdaya tokens** are internal billing credits (not LLM tokens). One Berdaya token has a fixed **IDR value** you set in admin (e.g. 1 Berdaya token = Rp 1 or abstract unit).

Usage cost per request:

```text
berdaya_tokens_charged =
  (input_tokens  × model.input_price_per_token) +
  (output_tokens × model.output_price_per_token)
```

Store `input_price_per_token` / `output_price_per_token` on each model row (derived from upstream cost + margin). Deduct **after** the stream completes (or reserve estimate + reconcile — start with post-hoc deduct for MVP).

Dashboard shows:

- **Balance:** `1,250,000 Berdaya tokens` (~Rp equivalent)
- **Usage today:** tokens spent + approximate IDR
- **Top up** button → Midtrans Snap

### Midtrans integration flow

```text
User clicks "Top up" on berdaya.ai
        │
        ▼
POST /api/billing/topup/create
  • pick package (e.g. 100k / 500k / 2M tokens)
  • insert top_ups row (status=pending, order_id=unique)
  • call Midtrans Snap API → snap_token
        │
        ▼
Frontend opens Midtrans Snap (modal or redirect)
  • VA (BCA, Mandiri, …), QRIS, GoPay, ShopeePay, credit card, etc.
        │
        ▼
User pays → Midtrans POST notification to /api/webhooks/midtrans
  • verify signature (Server Key)
  • idempotent on order_id (Redis + DB unique constraint)
  • if settlement/capture success → credit org token_balances
  • mark top_ups status=completed
  • invalidate Redis balance:{org_id}
        │
        ▼
User sees updated balance; api.berdaya.ai accepts inference again
```

### Midtrans tech choices

| Item | Recommendation |
|------|----------------|
| Product | **Snap** for checkout UI + **Core API** notification webhook |
| Environment | Sandbox first (`app.sandbox.midtrans.com`), production after KYC |
| Keys | `MIDTRANS_SERVER_KEY`, `MIDTRANS_CLIENT_KEY` in secrets (never client-side server key) |
| Webhook URL | `https://berdaya.ai/api/webhooks/midtrans` |
| Order ID | Your `top_ups.id` or `BDY-{uuid}` — must be unique |
| Currency | **IDR** (Midtrans native) |
| Finish / unfinish URLs | Redirect back to `berdaya.ai/dashboard/billing?status=…` |

**Node SDK:** `@midtrans/midtrans-client` in Next.js route handlers, or call REST from FastAPI if webhooks live on API service (either works — recommend **webhook on Next.js** near dashboard, or **FastAPI** if you want one backend for money + inference; pick one owner).

### Token packages (example seed)

| Package | Price (IDR) | Tokens credited | Bonus |
|---------|-------------|-----------------|-------|
| Starter | Rp 50,000 | 50,000 | — |
| Pro | Rp 200,000 | 220,000 | +10% |
| Team | Rp 1,000,000 | 1,150,000 | +15% |

Packages live in `topup_packages` table — editable in admin without deploy.

### Gateway balance enforcement (api.berdaya.ai)

Before proxying upstream:

1. Resolve `org_id` from API key
2. Load balance (Redis → Postgres fallback)
3. Optional soft check: estimated cost vs balance (skip for MVP)
4. Run inference
5. On completion: compute charge → atomic deduct in Postgres → append `usage_events` + `ledger_entries`
6. If balance ≤ 0 after deduct: subsequent requests get `402`

```http
HTTP/1.1 402 Payment Required
Content-Type: application/json

{
  "error": {
    "type": "insufficient_balance",
    "message": "Token balance exhausted. Top up at https://berdaya.ai/dashboard/billing",
    "balance": 0,
    "required_estimate": 1200
  }
}
```

Agent can surface this in CLI/desktop (“Top up at berdaya.ai”).

### Ledger (audit trail)

Every balance change is an append-only ledger row — never mutate balance without a ledger entry:

| Event | Ledger type | Amount |
|-------|-------------|--------|
| Midtrans top-up success | `credit` | +tokens from package |
| Inference usage | `debit` | −computed charge |
| Admin adjustment | `adjustment` | ±manual |
| Refund (Midtrans) | `refund` | −tokens if clawback |

### Refunds & failed payments

- **Pending / expire / deny** — no credit; `top_ups.status` updated only
- **Chargeback / refund via Midtrans** — manual or automated clawback ledger entry; do not delete usage history
- Webhook handler must be **idempotent** — Midtrans retries notifications

---

## 7. Data model (PostgreSQL)

Minimal schema sketch:

```sql
-- orgs / users (linked to Clerk/Auth.js subject id)
organizations (id, name, created_at)
users (id, org_id, email, auth_subject, role)

-- prepaid balance (one row per org; source of truth with ledger)
token_balances (org_id PK, balance_tokens BIGINT NOT NULL DEFAULT 0, updated_at)

-- append-only ledger for every credit/debit
ledger_entries (
  id, org_id, type,               -- 'credit' | 'debit' | 'adjustment' | 'refund'
  amount_tokens,                   -- positive for credit, negative for debit
  balance_after,
  reference_type,                  -- 'top_up' | 'usage_event' | 'admin'
  reference_id,
  created_at
)

-- Midtrans top-up orders
topup_packages (id, name, price_idr, tokens_granted, bonus_percent, enabled, sort_order)
top_ups (
  id, org_id, package_id,
  order_id UNIQUE,                 -- sent to Midtrans
  midtrans_transaction_id,
  price_idr, tokens_to_credit,
  status,                          -- pending | completed | failed | expired | refunded
  snap_token, payment_type,       -- va | qris | gopay | … from notification
  paid_at, created_at
)

-- customer-facing keys
api_keys (id, org_id, key_hash, prefix, label, revoked_at, created_at)

-- catalog: what Berdaya sells
models (
  id,                    -- e.g. 'anthropic/claude-sonnet-4.6'
  display_name,
  upstream_lab,
  upstream_model_id,
  enabled,
  supports_tools,
  supports_reasoning,
  context_length,
  price_input_per_token,   -- Berdaya tokens charged per upstream input token
  price_output_per_token   -- Berdaya tokens charged per upstream output token
)

-- metering (links to ledger debit)
usage_events (
  id, org_id, api_key_id, model_id,
  input_tokens, output_tokens,
  tokens_charged,
  ledger_entry_id,
  upstream_lab, latency_ms,
  request_id, metadata JSONB, created_at
)
```

Neon + Drizzle (Next.js) and SQLAlchemy/Alembic (FastAPI) can share one database; pick **one migration owner** (recommend Drizzle in monorepo root, API reads same tables).

---

## 8. Streaming architecture (FastAPI)

```python
# Pattern: upstream async stream → normalize → client SSE
async def chat_completions(...):
    adapter = router.resolve(model)
    upstream_stream = adapter.stream(request)
    return StreamingResponse(
        sse_encoder(normalize_chunks(upstream_stream)),
        media_type="text/event-stream",
    )
```

Requirements:

- Flush chunks immediately (no buffering whole response)
- Handle client disconnect → cancel upstream httpx stream
- Map Anthropic `message_start` / `content_block_delta` → OpenAI `chat.completion.chunk`
- Set `X-Request-Id` for support/debug

Load test with **one** model before adding the full catalog.

---

## 9. Attribution & Berdaya Agent integration

Gateway should accept and log tags (same idea as Nous Portal today):

```json
"tags": ["product=berdaya-agent", "client=berdaya-client-v0.15.1"]
```

Store on `usage_events.metadata` for analytics. Agent-side work is documented in **`berdaya_provider.md`**.

**Agent default after platform is live:**

```yaml
# ~/.berdaya/config.yaml
model:
  provider: berdaya
  model: anthropic/claude-sonnet-4.6   # or berdaya-curated default
```

```bash
# ~/.berdaya/.env
BERDAYA_API_KEY=sk-berdaya-live-...
```

---

## 10. Monorepo suggestion

```text
berdaya/                          # GitHub org
├── berdaya-agent/                # this repo (CLI, desktop, agent)
├── berdaya-platform/             # new monorepo (recommended)
│   ├── apps/
│   │   ├── web/                  # Next.js → berdaya.ai
│   │   └── api/                  # FastAPI → api.berdaya.ai
│   ├── packages/
│   │   └── db/                   # shared Drizzle schema + types (balances, top_ups)
│   ├── docker-compose.yml        # local Postgres + Redis
│   └── turbo.json                # optional
```

Keeping platform separate from **berdaya-agent** avoids coupling release cycles. Link via docs + `BERDAYA_BASE_URL`, not code imports.

---

## 11. Phased rollout

### Phase 0 — Foundations (1–2 weeks)

- [ ] Register domains: `berdaya.ai`, `api.berdaya.ai`
- [ ] Neon Postgres + Upstash Redis provisioned
- [ ] Midtrans sandbox account + Server/Client keys
- [ ] `berdaya-platform` repo scaffold (Next.js + FastAPI + Docker Compose)
- [ ] Clerk/Auth.js login on berdaya.ai
- [ ] DB schema: orgs, users, api_keys, token_balances, ledger_entries, topup_packages, models (seed 1 model + 2 packages)

### Phase 1 — API MVP, one lab (1–2 weeks)

- [ ] FastAPI: `GET /v1/models`, `POST /v1/chat/completions` (non-stream then stream)
- [ ] **First adapter: OpenAI OR DeepSeek** (passthrough — fastest)
- [ ] API key validation + Redis rate limit
- [ ] Balance check + post-request token deduct + `402` when empty
- [ ] Deploy api.berdaya.ai to Fly.io
- [ ] Manual test with curl + Berdaya Agent custom/base URL

### Phase 2 — Dashboard, keys & Midtrans top-up (1–2 weeks)

- [ ] berdaya.ai: create/revoke keys, show prefix
- [ ] Dashboard: token balance, usage history, ledger summary
- [ ] Midtrans Snap: package picker → create transaction → Snap modal
- [ ] Webhook: verify signature, idempotent credit, balance update
- [ ] Sandbox end-to-end: top up → inference → balance decreases

### Phase 3 — Anthropic adapter (2–3 weeks)

- [ ] Native Messages API adapter (tools + streaming) — **highest engineering cost**
- [ ] Reasoning/thinking field mapping aligned with agent expectations
- [ ] Add `anthropic/*` models to catalog

### Phase 4 — More labs + agent provider (parallel)

- [ ] DeepSeek, Gemini, xAI adapters (mostly passthrough)
- [ ] Implement `plugins/model-providers/berdaya/` per **berdaya_provider.md**
- [ ] Remote model catalog JSON on berdaya.ai or docs subdomain
- [ ] Default Berdaya provider in setup wizard

### Phase 5 — Production hardening

- [ ] Per-org soft/hard spend alerts (email when balance low)
- [ ] Midtrans production keys + reconciliation dashboard
- [ ] Sentry + structured logging + request tracing
- [ ] Upstream circuit breakers, fallback models (your routing, not OpenRouter)
- [ ] SOC2-minded secrets rotation for lab keys
- [ ] Status page + incident runbooks
- [ ] Optional: free signup trial tokens (single admin ledger credit on verify email)

---

## 12. Infrastructure checklist

| Service | Provider | Hosts |
|---------|----------|-------|
| `berdaya.ai` | Vercel | Next.js |
| `api.berdaya.ai` | Fly.io | FastAPI Docker |
| Postgres | Neon | Shared metadata |
| Redis | Upstash | Rate limits + cache |
| Auth | Clerk | berdaya.ai |
| Payments | Midtrans (Snap + notification webhook) | berdaya.ai |
| DNS | Cloudflare | A/CNAME + optional WAF on API |
| Secrets | Fly secrets + Doppler | Lab API keys |

**Estimated MVP cost:** ~$20–80/mo infra + lab usage (lab API spend dominates).

---

## 13. Open questions

1. **Legal/commercial** — Direct Anthropic/OpenAI enterprise agreements in place?
2. **Token ↔ IDR rate** — Fixed 1:1 with Rupiah or abstract credits with displayed IDR estimate?
3. **Model pricing** — Markup % over upstream $/MTok converted to IDR, or flat per-model token rates?
4. **Free trial** — One-time signup bonus tokens (ledger credit) without payment?
5. **Default model** — Which single model for “Berdaya Agent out of box”?
6. **Reasoning** — Expose unified `reasoning` extra_body on gateway; map per lab?
7. **Midtrans webhook owner** — Next.js only vs FastAPI (recommend one service owns money + ledger writes)
8. **Monorepo vs two repos** — `berdaya-platform` separate from `berdaya-agent`? (recommended: yes)

---

## 14. Summary

| Question | Answer |
|----------|--------|
| FastAPI or Go? | **FastAPI first** — right for I/O-bound direct-lab gateway, matches agent stack, faster MVP. Consider Go later if profiling proves gateway is the bottleneck. |
| Next.js for berdaya.ai? | **Yes** — product, keys, billing UI, Midtrans Snap. |
| Billing model? | **Prepaid Berdaya tokens** — top up via **Midtrans**, deduct per inference usage. |
| Upstash Redis? | **Yes** — rate limits, balance cache, webhook idempotency. |
| OpenRouter? | **No** in production — direct lab keys and adapters only. |
| Build order? | API + balance deduct → Midtrans top-up → Anthropic adapter → agent `berdaya` provider plugin. |

---

*Last updated: 2026-06-15*
