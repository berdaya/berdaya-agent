# Berdaya Agent Rebranding Summary

This document summarizes the rebrand from **Hermes Agent** (Nous Research) to **Berdaya Agent** (Berdaya AI) in the `berdaya/berdaya-agent` fork.

**Status:** Complete for product-facing surfaces. Internal Python module names (`hermes_cli`, `HERMES_HOME`, etc.) are intentionally unchanged to avoid a large breaking refactor.

---

## Commits (chronological)

| Commit | Summary |
|--------|---------|
| `bdea53811` | Bulk rebrand: product name, `berdaya` CLI, `~/.berdaya` home, repo URLs |
| `1bddff1b2` | Fix broken rebrand identifiers; point desktop updates at `berdaya/berdaya-agent` |
| `1e463e049` | Replace app and UI brand assets with Berdaya icon |
| `8f7eff200` | Repair 829 identifier sites broken by bulk string replace |
| `5c65c30be` | Remove user-facing `hermes` alias from install scripts |
| `e4ad2bab7` | Fully isolate Berdaya home from legacy Hermes installs (desktop) |
| `17f216c89` | Home wordmark + remove Nous Portal from onboarding/settings |
| `057664803` | Berdaya AI agent identity + hide Nous Portal from model picker |

---

## 1. Product name and repository

- User-facing name: **Hermes Agent** → **Berdaya Agent**
- GitHub: **NousResearch/hermes-agent** → **berdaya/berdaya-agent**
- Install scripts, bootstrap URLs, PR/issue templates, and README updated
- README credits **Berdaya AI** as the builder

---

## 2. CLI command

| Before | After |
|--------|-------|
| `hermes` (primary) | **`berdaya`** (primary, user-facing) |
| — | `hermes` alias **removed** from install scripts |

Installers and docs advertise **`berdaya` only**.

**Note:** Internal code still uses `hermes` identifiers (`HermesCLI`, `HERMES_HOME`, `hermes_cli/`) where renaming would break imports and syntax. A dedicated sweep script repaired cases where the bulk rebrand inserted spaces into identifiers (e.g. `Berdaya AgentCLI` → `HermesCLI`).

---

## 3. Data directory (isolation from legacy Hermes)

| Setting | Value |
|---------|-------|
| Default home (Windows) | `%LOCALAPPDATA%\berdaya` |
| Default home (macOS/Linux) | `~/.berdaya` |
| Primary env var | `BERDAYA_HOME` |

**Removed for Berdaya installs:**

- Fallback to `~/.hermes` when choosing the data directory
- Honoring a stale `HERMES_HOME` env var in the desktop app (which caused 401 errors and logs pointing at old Hermes folders)

**Desktop behavior:**

- Child processes get `BERDAYA_HOME` pinned explicitly
- Backend resolution looks for **`berdaya`** on PATH, not `hermes`
- Fresh install creates a **clean `berdaya` folder** even if an old `hermes` install exists

**Files:** `hermes_constants.py`, `apps/desktop/electron/main.cjs`, `apps/desktop/electron/bootstrap-runner.cjs`, `scripts/install.ps1`, `scripts/install.sh`

---

## 4. Desktop app

| Area | Change |
|------|--------|
| App name | "Berdaya Agent" (window title, About, `package.json` `productName`) |
| Icons | New Berdaya `.ico` / `.png` / `.icns`; in-app `berdaya-mark.png` |
| Home screen wordmark | `HERMES AGENT` → **`BERDAYA AGENT`** (`apps/desktop/src/components/chat/intro.tsx`) |
| Brand mark | Berdaya mark on black (replaces Nous image) |
| Nous Portal | Hidden from onboarding, Settings → Providers, Settings → API keys, model picker, shell model menu |
| Updates | Remote update URLs point at `berdaya/berdaya-agent` |

**Nous Portal filtering:** `apps/desktop/src/lib/desktop-hidden-providers.ts` — applied in `getGlobalModelOptions()`, `listOAuthProviders()`, and `HermesGateway.request('model.options')`.

**Windows installer output:**

- `apps/desktop/release/Berdaya-0.15.1-win-x64.exe`
- `apps/desktop/release/Berdaya-0.15.1-win-x64.msi`

Build: `cd apps/desktop && npm run dist:win`

---

## 5. Agent identity (“who are you”)

The agent’s self-description comes from **SOUL.md** and a built-in fallback in the system prompt.

| Source | Change |
|--------|--------|
| `hermes_cli/default_soul.py` | Default SOUL template: “created by **Berdaya AI**” |
| `agent/prompt_builder.py` | `DEFAULT_AGENT_IDENTITY` and help guidance updated |
| CLI banner | “Nous Research” → “**Berdaya AI**” |
| Docs link in prompt | `hermes-agent.nousresearch.com` → `github.com/berdaya/berdaya-agent` |

**Auto-migration:** On startup, if `SOUL.md` still contains the untouched pre-rebrand default text (“created by Nous Research”), it is upgraded automatically (`hermes_cli/config.py` + `LEGACY_DEFAULT_SOUL_MD`).

**User action:** If you customized `SOUL.md` but left “Nous Research” in the text, edit `%LOCALAPPDATA%\berdaya\SOUL.md` (Windows) or `~/.berdaya/SOUL.md` manually. Start a **new chat** after changes — identity is fixed per session.

---

## 6. Install scripts and bootstrap

- Banner: “An open source AI agent by **Berdaya AI**”
- Persist **`BERDAYA_HOME`** only (not `HERMES_HOME`) so old Hermes installs can coexist
- Bootstrap installer identifier: `com.berdayaai.agent.setup`
- Raw GitHub URLs: `berdaya/berdaya-agent`

### Code checkout directory (under data home)

| Before | After |
|--------|-------|
| `%LOCALAPPDATA%\berdaya\hermes-agent` | **`%LOCALAPPDATA%\berdaya\berdaya-agent`** |
| `~/.berdaya/hermes-agent` | **`~/.berdaya/berdaya-agent`** |

Fresh installs clone into **`berdaya-agent`**. Existing **`hermes-agent`** folders are migrated automatically by `install.ps1` / `install.sh` (rename when safe). Desktop and Python resolve the checkout via `get_agent_install_dir()` / `resolveAgentInstallRoot()` — prefer `berdaya-agent`, fall back to legacy.

**Note:** The pip package name remains `hermes-agent` internally; only the on-disk checkout folder was renamed.

**Files:** `hermes_constants.py`, `scripts/install.ps1`, `scripts/install.sh`, `apps/desktop/electron/agent-install-path.cjs`, `apps/bootstrap-installer/src-tauri/src/paths.rs`

---

## 7. Brand assets and tooling

| Asset / script | Purpose |
|----------------|---------|
| `scripts/generate_berdaya_icons.py` | Generate multi-format icons from source art |
| `apps/desktop/assets/icon.*` | Desktop Electron icons |
| `apps/desktop/public/berdaya-mark.png` | In-app brand badge |
| `apps/bootstrap-installer/src-tauri/icons/*` | Bootstrap installer icons |
| `scripts/rebrand_hermes.py` | Original bulk string rebrand |
| `scripts/fix_rebrand_technical_ids.py` | Fix broken HTTP headers / technical IDs |
| `scripts/fix_rebrand_identifiers_sweep.py` | Fix identifier corruption from bulk replace |

---

## 8. Company polish (Berdaya AI, no Nous in product UI)

Completed in a follow-up pass:

- Desktop `.exe` copyright/publisher → **Berdaya AI** (`main.cjs`, `set-exe-identity.cjs`)
- Bootstrap installer publisher/copyright → **Berdaya AI**
- Dashboard web UI org name → **Berdaya AI** (all `web/src/i18n/*.ts` locales)
- Install/reinstall URLs → `raw.githubusercontent.com/berdaya/berdaya-agent/...`
- Docs links in dashboard, setup wizard, CLI help → GitHub repo
- Skills hub CLI messages → Berdaya Agent
- Setup wizard: Nous Portal quick-setup path removed; `--portal` disabled
- OpenRouter API attribution header → GitHub repo

## 9. What we intentionally did not change

- **Internal Python/JS module and env names** (`hermes_cli`, `run_agent.py`, `HERMES_HOME` internally) — stability over cosmetic rename
- **Nous Portal backend** — still present in Python core for CLI/power users; **hidden only in the desktop UI**
- **Website / Docusaurus docs** — many pages still mention Nous Research or Nous Portal (upstream documentation content)
- **Optional skills / plugin metadata** — some `author:` fields still reference Nous Research

---

## 10. Verification checklist

After installing the latest desktop `.exe` or running from source:

- [ ] Data lives under `%LOCALAPPDATA%\berdaya` (not `.hermes`)
- [ ] Home screen shows **BERDAYA AGENT**
- [ ] No **Nous Portal** in onboarding, Settings → Providers, or model picker
- [ ] New chat: “who are you?” mentions **Berdaya AI**, not Nous Research
- [ ] CLI: `berdaya --help` works; install banner says Berdaya AI

---

## 11. Sharing the desktop app

**Windows:** Share `apps/desktop/release/Berdaya-0.15.1-win-x64.exe` — no GitHub URL required for end users.

**macOS:** NSIS/DMG builds require macOS or CI (GitHub Actions). Cross-building macOS installers from Windows is not supported by electron-builder.

**From source (developers):**

```bash
curl -fsSL https://raw.githubusercontent.com/berdaya/berdaya-agent/main/scripts/install.sh | bash
# or on Windows:
# iex (irm https://raw.githubusercontent.com/berdaya/berdaya-agent/main/scripts/install.ps1)
```

---

*Last updated: June 2026 — reflects commits through `057664803` on `main`.*
