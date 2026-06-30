# appicons

> Generate and install a complete favicon / app-icon / PWA-icon stack straight
> into a project — from an emoji, a named icon, a logo file, or an image URL.
> No browser, no zip download, no manual unzip. Powered by
> [favicontools.com](https://favicontools.com).

A brand-new app shipping with a blank tab icon looks unfinished. This skill lets
a coding agent fix that from a single prompt — "add a fox favicon to this app" —
by generating the full icon set and writing it into the repo with the `<head>`
patched.

## What it produces

By default, the **full per-stage set**:

- `favicon.ico` + every PNG size (16/32/48/96)
- `apple-touch-icon.png` and Android icons
- theme-aware light/dark favicons
- per-environment variants — a clean **production** icon plus badged
  **staging** (`S`) and **dev** (`D`) icons, each with its own manifest
- `manifest.json` (+ `staging-manifest.json` / `dev-manifest.json`)
- a stage-aware `<head>` snippet that renders the right icon per environment

Pass `--no-badges` for a single plain icon, or `--no-theme-aware` to skip the
light/dark pair.

## Install

Copy this folder into your agent's skills directory:

- **Claude Code:** `~/.claude/skills/appicons/` (global) or `.claude/skills/appicons/` (per-project)
- Other agents: wherever your harness loads skills from.

```bash
git clone https://github.com/mewc/skills
cp -r skills/appicons ~/.claude/skills/appicons
chmod +x ~/.claude/skills/appicons/scripts/favicon-gen.sh
```

Then just ask your agent for a favicon.

## Use the script directly

```bash
scripts/favicon-gen.sh --source noto:fox --bg white --shape circular --out ./public
```

See `scripts/favicon-gen.sh --help` for all options, or `SKILL.md` for the full
agent workflow (source resolution, framework-aware install, per-stage wiring,
verification).

## Requirements

`curl`, `unzip`, and either `python3` or `jq`. Network access to
`favicontools.com` (override with `--api` or `FAVICON_API`).

## Provenance

The skill calls only the public [favicontools.com](https://favicontools.com)
API (`POST /api/favicons`) and the public [Iconify](https://icon-sets.iconify.design)
lookup. Built from the source project `mewc/favicon-generator` (private) — no
private source is included.
