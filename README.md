<p align="center">
  <img src="assets/banner.png" alt="Berdaya Agent" width="100%">
</p>

# Berdaya Agent ☤
<p align="center">
  <a href="https://github.com/berdaya/berdaya-agent"><img src="https://img.shields.io/badge/GitHub-berdaya%2Fberdaya-agent-181717?style=for-the-badge&logo=github" alt="GitHub"></a>
  <a href="https://github.com/berdaya/berdaya-agent/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="License: MIT"></a>
  <a href="#"><img src="https://img.shields.io/badge/Built%20by-Berdaya%20AI-blueviolet?style=for-the-badge" alt="Built by Berdaya AI"></a>
  <a href="README.zh-CN.md"><img src="https://img.shields.io/badge/Lang-中文-red?style=for-the-badge" alt="中文"></a>
  <a href="README.ur-pk.md"><img src="https://img.shields.io/badge/Lang-اردو-green?style=for-the-badge" alt="اردو"></a>
</p>

**The self-improving AI agent built by [Berdaya AI](https://github.com/berdaya/berdaya-agent).** It's the only agent with a built-in learning loop — it creates skills from experience, improves them during use, nudges itself to persist knowledge, searches its own past conversations, and builds a deepening model of who you are across sessions. Run it on a $5 VPS, a GPU cluster, or serverless infrastructure that costs nearly nothing when idle. It's not tied to your laptop — talk to it from Telegram while it works on a cloud VM.

Use any model you want — [OpenRouter](https://openrouter.ai) (200+ models), [NovitaAI](https://novita.ai), [NVIDIA NIM](https://build.nvidia.com), [Kimi/Moonshot](https://platform.moonshot.ai), [MiniMax](https://www.minimax.io), [Hugging Face](https://huggingface.co), OpenAI, Anthropic, or your own endpoint. Switch with `berdaya model` — no code changes, no lock-in.

<table>
<tr><td><b>A real terminal interface</b></td><td>Full TUI with multiline editing, slash-command autocomplete, conversation history, interrupt-and-redirect, and streaming tool output.</td></tr>
<tr><td><b>Lives where you do</b></td><td>Telegram, Discord, Slack, WhatsApp, Signal, and CLI — all from a single gateway process. Voice memo transcription, cross-platform conversation continuity.</td></tr>
<tr><td><b>A closed learning loop</b></td><td>Agent-curated memory with periodic nudges. Autonomous skill creation after complex tasks. Skills self-improve during use. FTS5 session search with LLM summarization for cross-session recall. <a href="https://github.com/plastic-labs/honcho">Honcho</a> dialectic user modeling. Compatible with the <a href="https://agentskills.io">agentskills.io</a> open standard.</td></tr>
<tr><td><b>Scheduled automations</b></td><td>Built-in cron scheduler with delivery to any platform. Daily reports, nightly backups, weekly audits — all in natural language, running unattended.</td></tr>
<tr><td><b>Delegates and parallelizes</b></td><td>Spawn isolated subagents for parallel workstreams. Write Python scripts that call tools via RPC, collapsing multi-step pipelines into zero-context-cost turns.</td></tr>
<tr><td><b>Runs anywhere, not just your laptop</b></td><td>Six terminal backends — local, Docker, SSH, Singularity, Modal, and Daytona. Daytona and Modal offer serverless persistence — your agent's environment hibernates when idle and wakes on demand, costing nearly nothing between sessions. Run it on a $5 VPS or a GPU cluster.</td></tr>
<tr><td><b>Research-ready</b></td><td>Batch trajectory generation, trajectory compression for training the next generation of tool-calling models.</td></tr>
</table>

---

## Quick Install

### Linux, macOS, WSL2, Termux

One-liner (clones from this repo):

```bash
curl -fsSL https://raw.githubusercontent.com/berdaya/berdaya-agent/main/scripts/install.sh | bash
```

Or clone manually:

```bash
git clone https://github.com/berdaya/berdaya-agent.git
cd berdaya-agent
./scripts/install.sh
```

### Windows (native, PowerShell)

One-liner:

```powershell
iex (irm https://raw.githubusercontent.com/berdaya/berdaya-agent/main/scripts/install.ps1)
```

Or clone manually:

```powershell
git clone https://github.com/berdaya/berdaya-agent.git
cd berdaya-agent
.\scripts\install.ps1
```

The installer handles everything: uv, Python 3.11, Node.js, ripgrep, ffmpeg, **and a portable Git Bash** (MinGit, unpacked to `%LOCALAPPDATA%\berdaya\git` — no admin required). Berdaya Agent uses this bundled Git Bash to run shell commands on Windows.

> **Windows:** Native install lives under `%LOCALAPPDATA%\berdaya`; WSL2/Linux uses `~/.berdaya`. Existing data under `~/.hermes` or `%LOCALAPPDATA%\hermes` is still picked up automatically.

After installation:

```bash
source ~/.bashrc    # reload shell (or: source ~/.zshrc)
berdaya             # start chatting!
```

---

## Getting Started

```bash
berdaya              # Interactive CLI — start a conversation
berdaya model        # Choose your LLM provider and model
berdaya tools        # Configure which tools are enabled
berdaya config set   # Set individual config values
berdaya gateway      # Start the messaging gateway (Telegram, Discord, etc.)
berdaya setup        # Run the full setup wizard (configures everything at once)
berdaya claw migrate # Migrate from OpenClaw (if coming from OpenClaw)
berdaya update       # Update to the latest version
berdaya doctor       # Diagnose any issues
```

📖 **Documentation:** browse locally with `cd website && npm install && npm start`, or see [`AGENTS.md`](AGENTS.md) for development. After GitHub Pages is enabled, docs will be at [berdaya.github.io/berdaya-agent/docs](https://berdaya.github.io/berdaya-agent/docs/).

---

## CLI vs Messaging Quick Reference

Berdaya Agent has two entry points: start the terminal UI with `berdaya`, or run the gateway and talk to it from Telegram, Discord, Slack, WhatsApp, Signal, or Email.

| Action                         | CLI                                           | Messaging platforms                                                              |
| ------------------------------ | --------------------------------------------- | -------------------------------------------------------------------------------- |
| Start chatting                 | `berdaya`                                     | Run `berdaya gateway setup` + `berdaya gateway start`, then send the bot a message |
| Start fresh conversation       | `/new` or `/reset`                            | `/new` or `/reset`                                                               |
| Change model                   | `/model [provider:model]`                     | `/model [provider:model]`                                                        |
| Set a personality              | `/personality [name]`                         | `/personality [name]`                                                            |
| Retry or undo the last turn    | `/retry`, `/undo`                             | `/retry`, `/undo`                                                                |
| Compress context / check usage | `/compress`, `/usage`, `/insights [--days N]` | `/compress`, `/usage`, `/insights [days]`                                        |
| Browse skills                  | `/skills` or `/<skill-name>`                  | `/<skill-name>`                                                                  |
| Interrupt current work         | `Ctrl+C` or send a new message                | `/stop` or send a new message                                                    |
| Platform-specific status       | `/platforms`                                  | `/status`, `/sethome`                                                            |

Run `berdaya --help` or `/help` inside a session for the full command list.

---

## Documentation

| Resource | Location |
| -------- | -------- |
| Development guide | [`AGENTS.md`](AGENTS.md) |
| Contributor setup | [`CONTRIBUTING.md`](CONTRIBUTING.md) |
| Docusaurus site (local) | [`website/`](website/) — `npm install && npm start` |
| Runtime help | `berdaya doctor`, `berdaya --help`, `/help` in chat |

---

## Migrating from OpenClaw

If you're coming from OpenClaw, Berdaya Agent can automatically import your settings, memories, skills, and API keys.

**During first-time setup:** The setup wizard (`berdaya setup`) automatically detects `~/.openclaw` and offers to migrate before configuration begins.

**Anytime after install:**

```bash
berdaya claw migrate              # Interactive migration (full preset)
berdaya claw migrate --dry-run    # Preview what would be migrated
berdaya claw migrate --preset user-data   # Migrate without secrets
berdaya claw migrate --overwrite  # Overwrite existing conflicts
```

What gets imported:

- **SOUL.md** — persona file
- **Memories** — MEMORY.md and USER.md entries
- **Skills** — user-created skills → `~/.berdaya/skills/openclaw-imports/`
- **Command allowlist** — approval patterns
- **Messaging settings** — platform configs, allowed users, working directory
- **API keys** — allowlisted secrets (Telegram, OpenRouter, OpenAI, Anthropic, ElevenLabs)
- **TTS assets** — workspace audio files
- **Workspace instructions** — AGENTS.md (with `--workspace-target`)

See `berdaya claw migrate --help` for all options.

---

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for development setup, code style, and PR process.

Quick start for contributors:

```bash
git clone https://github.com/berdaya/berdaya-agent.git
cd berdaya-agent
./setup-hermes.sh     # installs uv, creates venv, installs .[all], symlinks ~/.local/bin/berdaya
./berdaya             # auto-detects the venv, no need to `source` first
```

Manual path (equivalent to the above):

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
uv venv .venv --python 3.11
source .venv/bin/activate
uv pip install -e ".[all,dev]"
scripts/run_tests.sh
```

---

## Community

- 🐛 [Issues](https://github.com/berdaya/berdaya-agent/issues)
- 📚 [Skills Hub](https://agentskills.io)

---

## License

MIT — see [LICENSE](LICENSE).

Built by **Berdaya AI**.
