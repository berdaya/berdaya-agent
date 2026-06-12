# Berdaya Agent Desktop ☤

<p align="center">
  <a href="https://github.com/berdaya/berdaya-agent"><img src="https://img.shields.io/badge/GitHub-berdaya%2Fberdaya--agent-181717?style=for-the-badge&logo=github" alt="GitHub"></a>
  <a href="https://github.com/berdaya/berdaya-agent/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="License: MIT"></a>
</p>

**The native desktop app for [Berdaya Agent](../../README.md) — built by [Berdaya AI](https://github.com/berdaya/berdaya-agent).** Same agent, same skills, same memory as the CLI and gateway, in a polished native window — chat with streaming tool output, side-by-side previews, a file browser, voice, and settings, no terminal required. Available for **macOS, Windows, and Linux**.

<table>
<tr><td><b>Chat with the full agent</b></td><td>Streaming responses, live tool activity, structured tool summaries, and the same conversation history as every other Berdaya Agent surface.</td></tr>
<tr><td><b>Side-by-side previews</b></td><td>Render web pages, files, and tool outputs in a right-hand pane while you keep chatting.</td></tr>
<tr><td><b>File browser</b></td><td>Explore and preview the working directory without leaving the app.</td></tr>
<tr><td><b>Voice</b></td><td>Talk to Berdaya Agent and hear it back.</td></tr>
<tr><td><b>Settings & onboarding</b></td><td>Manage providers, models, tools, and credentials from a real UI. First-run setup gets you to your first message in seconds.</td></tr>
<tr><td><b>Stays current</b></td><td>Built-in updates pull the latest agent and rebuild the app in place.</td></tr>
</table>

---

## Install

### Install with Berdaya Agent (recommended)

Already have the Berdaya Agent CLI? Just run:

```bash
berdaya desktop
```

It builds and launches the GUI against your existing install — same config, keys, sessions, and skills. On first launch Berdaya Agent walks you through picking a provider and model; nothing else to configure.

### Windows: include desktop in install

```powershell
git clone https://github.com/berdaya/berdaya-agent.git
cd berdaya-agent
.\scripts\install.ps1 -IncludeDesktop
```

### Prebuilt installers

Build from source and distribute via [GitHub Releases](https://github.com/berdaya/berdaya-agent/releases):

```bash
cd apps/desktop
npm run dist:win     # or dist:mac / dist:linux
```

---

## Updating

The app checks for updates in the background and offers a one-click update when one is ready. You can also update any time from the CLI:

```bash
berdaya update
```

---

## Requirements

The installer handles everything for you (Python 3.11+, a portable Git, ripgrep). Node.js **^20.19** or **≥22.12** is required when building the desktop shell via `berdaya desktop`.

---

## Development

Want to hack on the app itself? Install workspace deps from the repo root once, then run the dev server from this directory:

```bash
npm install          # from repo root — links apps/desktop, web, apps/shared
cd apps/desktop
npm run dev          # Vite renderer + Electron, which boots the Python backend
```

Point the app at a specific source checkout, or sandbox it away from your real config:

```bash
HERMES_DESKTOP_HERMES_ROOT=/path/to/clone npm run dev
BERDAYA_HOME=/tmp/throwaway npm run dev
npm run dev:fake-boot   # exercise the startup overlay with deterministic delays
```

### Building installers

```bash
npm run dist:mac     # DMG + zip
npm run dist:win     # NSIS + MSI
npm run dist:linux   # AppImage + deb + rpm
npm run pack         # unpacked app under release/ (no installer)
```

### How it works

The packaged app ships only the Electron shell. On first launch it installs the Berdaya Agent runtime into `BERDAYA_HOME` (`~/.berdaya`, or `%LOCALAPPDATA%\berdaya` on Windows) — the **same layout a CLI install uses**, so the two are interchangeable. The renderer (React, in `src/`) talks to a `berdaya dashboard` backend over the standard gateway APIs. The install, backend-resolution, and self-update logic all live in `electron/main.cjs`.

### Verification

Run before opening a PR (lint may surface pre-existing warnings but must exit cleanly):

```bash
npm run fix
npm run typecheck
npm run lint
npm run test:desktop:all
```

### Troubleshooting

Boot logs land in `BERDAYA_HOME/logs/desktop.log` (includes backend output and recent Python tracebacks) — check it first if the app reports a boot failure.

**macOS / Linux:**

```bash
# Force a clean first-launch setup
rm "$HOME/.berdaya/berdaya-agent/.hermes-bootstrap-complete"
# Rebuild a broken Python venv
rm -rf "$HOME/.berdaya/berdaya-agent/venv"
```

**Windows (PowerShell):**

```powershell
Remove-Item "$env:LOCALAPPDATA\berdaya\berdaya-agent\.hermes-bootstrap-complete"
Remove-Item -Recurse -Force "$env:LOCALAPPDATA\berdaya\berdaya-agent\venv"
```

> Legacy installs may still use `~/.hermes` or `%LOCALAPPDATA%\hermes`. Set `BERDAYA_HOME` if you've relocated data.

---

## Community

- 🐛 [Issues](https://github.com/berdaya/berdaya-agent/issues)
- 📖 [Documentation](https://github.com/berdaya/berdaya-agent#documentation)

---

## License

MIT — see [LICENSE](../../LICENSE).

Built by **Berdaya AI**.
