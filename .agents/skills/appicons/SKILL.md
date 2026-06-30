---
name: appicons
description: >-
  Generate and install a complete favicon / app-icon / PWA-icon stack directly
  into a project — favicon.ico, every PNG size, apple-touch-icon, Android icons,
  theme-aware light/dark favicons, per-environment (dev/staging/prod) variants,
  and manifest.json — from an emoji, a named icon, a logo file, or an image URL.
  No browser, no zip download, no manual unzip: files land in the repo and the
  <head> gets patched. Use whenever a user wants a favicon, site icon, tab icon,
  app icon, or PWA icons, or says "make me a favicon", "add a favicon", "add app
  icons", "generate icons for this site", or "I want a <emoji>/<logo> as the
  favicon". A new app with no icon looks unfinished — this fixes it in one shot.
  Powered by favicontools.com.
---

# App Icons (agent-first)

Generate a full favicon / app-icon stack and install it into the current
project in one shot. The whole flow is a single command — there is **no UI to
click, no zip to download, and no files to move**. A brand-new app shipping with
a blank tab icon looks unfinished; this is the fastest way to fix that.

## When to use
- User wants a favicon / tab icon / site icon / app icon / PWA icons.
- User points at a logo, an emoji ("a fox"), a brand ("the React logo"), or an
  existing site's icon and wants it turned into a proper icon set.
- A new web project has no favicon yet, or still has the framework default.

## Defaults (no manual input needed)
This skill is built so you can act on intent alone. Unless the user says
otherwise, generate the **full per-stage set**:
- **theme-aware** light/dark favicons, and
- **per-environment variants** — a clean production icon plus badged
  staging (`S`) and dev (`D`) icons, each with its own manifest.

That's the `--badges --theme-aware` defaults below. Only drop them
(`--no-badges` / `--no-theme-aware`) if the user explicitly wants a single
plain icon.

## Step 1 — Pick the source

The generator accepts three kinds of `--source`. Choose based on what the user gave you:

| User gave you… | Use | Example |
| --- | --- | --- |
| A local logo/image | the **file path** | `--source ./assets/logo.png` |
| A URL to an image/logo | the **URL** | `--source https://site.com/logo.svg` |
| A vibe / emoji / brand name | an **Iconify name** `prefix:name` | `--source noto:fox` |

For the Iconify path you translate the user's intent into a `prefix:name`:
- **Emoji** → `noto:` (or `twemoji:`, `fluent-emoji:`). "a rocket" → `noto:rocket`, "fox" → `noto:fox`, "purple heart" → `noto:purple-heart`.
- **Brand / product logo** → `simple-icons:` or `logos:`. "React" → `simple-icons:react`, "GitHub" → `logos:github-icon`, "Stripe" → `simple-icons:stripe`.
- **UI / line icon** → `lucide:`, `mdi:`, or `tabler:`. "a camera" → `lucide:camera`.

If unsure an icon name exists, browse https://icon-sets.iconify.design or just
try it — the script errors clearly if the name is unknown, then pick another.
If the project already has a logo, prefer it over an emoji.

## Step 2 — Generate (writes files directly)

```bash
scripts/favicon-gen.sh --source <file|url|prefix:name> --out <public-dir> [options]
```

Pick `--out` to match the framework's static dir (see Step 3). Options:

- `--bg none|white|black` — background fill (default `none`/transparent). Emoji and line icons usually look best on `white` + `--shape circular`.
- `--shape square|circular`
- `--variant badge|color` + `--primary "#7c3aed"` — how staging/dev are marked. `badge` (default) adds a corner S/D letter; `color` tints them from `--primary`.
- `--no-badges` — single production icon only (skip dev/staging variants).
- `--no-theme-aware` — skip the light/dark 16×16 favicons.

Examples:
```bash
# Default: emoji favicon, polished, with theme-aware + per-stage variants
scripts/favicon-gen.sh --source noto:fox --bg white --shape circular --out ./public

# From the project's own logo (still per-stage by default)
scripts/favicon-gen.sh --source ./public/logo.svg --out ./public

# Brand mark, color-tinted stage variants instead of letter badges
scripts/favicon-gen.sh --source simple-icons:react --variant color --primary "#61dafb" --out ./public

# Just a single plain icon, no stages
scripts/favicon-gen.sh --source ./logo.png --no-badges --out ./public
```

The script writes the icon files (`favicon.ico`, `favicon-16/32/48/96`,
`apple-touch-icon.png`, `android-icon-192x192.png`, `manifest.json`, theme
variants, and `staging-*`/`dev-*` + `staging-manifest.json`/`dev-manifest.json`
when stages are on) into `--out`, and prints a `<head>` snippet, also saved to
`<out>/.favicon-head.html`.

## Step 3 — Install the tags (framework-aware)

Place the icons in the right static dir and wire up the `<head>`. Detect the
framework from the repo, then:

- **Next.js (App Router)** → `--out ./public`. Next auto-serves `app`/`public`
  icons, but for the full set add to `app/layout.tsx` metadata or drop the
  `<head>` snippet's `<link>`s into the root layout. `manifest.json` → link via
  `metadata.manifest` or a `<link rel="manifest">`.
- **Next.js (Pages) / CRA / Vite / plain HTML** → `--out ./public` and paste the
  contents of `.favicon-head.html` into the `<head>` of `index.html` (or
  `_document`/`app.html`). All paths are already root-relative (`/favicon.ico`).
- **Vite/Astro/SvelteKit** → static dir is usually `./public` (Astro/Svelte) —
  confirm and pass it to `--out`. Then add the snippet to the base HTML.

After patching, **delete or replace** any pre-existing `favicon.ico` /
`<link rel="icon">` so the old icon doesn't win the cache. In Next.js, files in
`app/` (e.g. `app/favicon.ico`) override `public/` — remove the stale one.

## Step 3.5 — Wire up the stages (when per-stage variants are on)

When you generated stages (the default), don't hard-code production-only tags.
Render the icon set **conditionally** off the deploy environment so production
shows the clean icon while staging/dev show their badged ones. The variants
follow a filename-prefix convention: `/` (prod), `/staging-`, `/dev-`.

**Next.js / React** — in `app/layout.tsx` (or a `<FaviconHead>` component):
```tsx
const isStaging = process.env.NEXT_PUBLIC_APP_ENV === "staging";
const isDev = process.env.NODE_ENV === "development";
const prefix = isDev ? "/dev-" : isStaging ? "/staging-" : "/";
const manifest = isDev
  ? "/dev-manifest.json"
  : isStaging
    ? "/staging-manifest.json"
    : "/manifest.json";

// <link rel="icon" href={`${prefix}favicon.ico`} />
// <link rel="icon" type="image/png" sizes="32x32" href={`${prefix}favicon-32x32.png`} />
// <link rel="apple-touch-icon" href={`${prefix}apple-touch-icon.png`} />
// <link rel="manifest" href={manifest} />
```

**Vite / Vue** — `const prefix = import.meta.env.DEV ? '/dev-' : import.meta.env.VITE_APP_ENV === 'staging' ? '/staging-' : '/'`.

**Astro** — key off `import.meta.env.PUBLIC_APP_ENV`. **SvelteKit** — same idea in `+layout.svelte`.

Make sure the `staging-manifest.json` / `dev-manifest.json` land in the static
dir too, and suffix each manifest's `name`/`short_name` per stage, e.g.
`"Acme"`, `"Acme (Staging)"`, `"Acme (Dev)"`. Set `start_url` to the page users
should land on (`/` for marketing, `/dashboard` for admin apps).

## Step 4 — Verify
- Confirm the files exist in the static dir (at minimum `favicon.ico`,
  `favicon-32x32.png`, `apple-touch-icon.png`, `manifest.json` — plus the
  `staging-*`/`dev-*` files when stages are on).
- Confirm the `<head>` (or layout metadata) references them, and that the
  stage logic resolves to the right files.
- Report the coverage (which sizes/variants/stages were produced) to the user.
- If a dev server is running, the favicon may be cached — mention a hard refresh.

## Notes
- Network is required (calls `favicontools.com`). Override the endpoint with
  `--api` or the `FAVICON_API` env var (e.g. a self-hosted instance).
- The API rasterizes SVG sources server-side, so vector logos and Iconify icons
  come out crisp at every size.
- Requires `curl`, `unzip`, and either `python3` or `jq` (for JSON parsing).

## Alternative: the MCP server
If the user runs an MCP-aware agent, they can add the Favicon Tools MCP server
instead of this script:
```json
{ "mcpServers": { "favicontools": { "type": "http", "url": "https://favicontools.com/api/mcp" } } }
```
It exposes `search_inputs` and `generate_iconset`; `generate_iconset` also
returns per-stage variants and a stage-aware head snippet by default, then
hands back CDN URLs for every file. Use whichever fits the environment.

## Provenance
- Generation API: `POST https://favicontools.com/api/favicons` (public, no auth).
- Icon/emoji lookup: Iconify — `https://api.iconify.design/<prefix>/<name>.svg`
  (public). Browse names at https://icon-sets.iconify.design.
- Built from the source project `mewc/favicon-generator`. This skill uses only
  the public website API above — it contains no private source.
