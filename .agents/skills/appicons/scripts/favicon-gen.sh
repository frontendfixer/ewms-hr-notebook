#!/usr/bin/env bash
#
# favicon-gen.sh — agent-first favicon / app-icon stack generator.
#
# Resolves a source (local file | image URL | Iconify icon/emoji name) into a
# complete favicon + app-icon + PWA-icon package via favicontools.com and writes
# the files straight into your project. No browser, no zip download, no manual
# unzip.
#
# By default it pulls back the full per-stage set: a clean production icon plus
# badged staging/dev variants, theme-aware light/dark favicons, and a stage-aware
# <head> snippet that renders the right icon + manifest per environment.
#
# Usage:
#   favicon-gen.sh --source <file|url|iconify-name> [options]
#
# Source resolution:
#   ./logo.png            -> a local file (png/jpg/jpeg/webp/svg/gif)
#   https://x.com/l.png   -> a remote image, fetched and used as-is
#   noto:fox              -> an Iconify icon/emoji (prefix:name), fetched as SVG
#   noto/rocket           -> same, slash form also accepted
#     Useful prefixes: noto / twemoji / fluent-emoji (emoji),
#                      simple-icons / logos / fa6-brands (brands),
#                      lucide / mdi / tabler (UI icons). Browse: https://icon-sets.iconify.design
#
# Options:
#   --out <dir>        Output directory (default: ./public)
#   --bg <none|white|black>        Background fill (default: none)
#   --shape <square|circular>      Background shape (default: square)
#   --variant <none|badge|color>   Per-stage variant overlay (default: badge)
#   --primary <#hex>               Primary color for color/badge variants
#   --no-badges        Single production icon only — skip dev/staging variants
#   --no-theme-aware   Skip the light/dark theme-aware 16x16 favicons
#   --api <url>        Override API endpoint (default: $FAVICON_API or favicontools.com)
#   -h, --help         Show this help
#
set -euo pipefail

API="${FAVICON_API:-https://favicontools.com/api/favicons}"
OUT="./public"
SOURCE=""
BG="none"; SHAPE="square"; VARIANT="badge"; PRIMARY=""
# Default ON: pull back per-stage variants + theme-aware favicons.
THEME="true"; BADGES="true"

die() { echo "favicon-gen: $*" >&2; exit 1; }

while [ $# -gt 0 ]; do
  case "$1" in
    --source) SOURCE="${2:-}"; shift 2;;
    --out) OUT="${2:-}"; shift 2;;
    --bg) BG="${2:-}"; shift 2;;
    --shape) SHAPE="${2:-}"; shift 2;;
    --variant) VARIANT="${2:-}"; shift 2;;
    --primary) PRIMARY="${2:-}"; shift 2;;
    --badges) BADGES="true"; shift;;
    --no-badges) BADGES="false"; VARIANT="none"; shift;;
    --theme-aware) THEME="true"; shift;;
    --no-theme-aware) THEME="false"; shift;;
    --api) API="${2:-}"; shift 2;;
    -h|--help) sed -n '2,46p' "$0" | sed 's/^# \{0,1\}//'; exit 0;;
    *) die "unknown argument: $1 (try --help)";;
  esac
done

[ -n "$SOURCE" ] || die "missing --source (a file path, image URL, or Iconify name like noto:fox)"
command -v curl >/dev/null || die "curl is required"
command -v unzip >/dev/null || die "unzip is required"

# --- JSON field extractor: prefer python3, fall back to jq ---
extract_zip_b64() { # reads stdin (response json), prints zip.base64
  if command -v python3 >/dev/null; then
    python3 -c 'import sys,json; d=json.load(sys.stdin); print(d["zip"]["base64"])'
  elif command -v jq >/dev/null; then
    jq -r '.zip.base64'
  else
    die "need python3 or jq to parse the API response"
  fi
}
get_error() { # reads file, prints .error if present
  if command -v python3 >/dev/null; then
    python3 -c 'import sys,json
try:
 d=json.load(open(sys.argv[1])); print(d.get("error",""))
except Exception: print("")' "$1"
  else cat "$1"; fi
}

# --- Resolve SOURCE -> a base64 data URL in $DATAURL ---
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
b64() { base64 < "$1" | tr -d '\n'; }

if [ -f "$SOURCE" ]; then
  ext="${SOURCE##*.}"; ext="$(printf '%s' "$ext" | tr '[:upper:]' '[:lower:]')"
  case "$ext" in
    png) mime="image/png";; jpg|jpeg) mime="image/jpeg";; webp) mime="image/webp";;
    gif) mime="image/gif";; svg) mime="image/svg+xml";;
    *) die "unsupported file type .$ext (use png/jpg/webp/gif/svg)";;
  esac
  DATAURL="data:$mime;base64,$(b64 "$SOURCE")"
  echo "favicon-gen: source = local file $SOURCE" >&2
elif printf '%s' "$SOURCE" | grep -qiE '^https?://'; then
  ct="$(curl -sSL -m 30 -o "$TMP/src" -w '%{content_type}' "$SOURCE")" || die "failed to fetch $SOURCE"
  [ -s "$TMP/src" ] || die "fetched 0 bytes from $SOURCE"
  case "$ct" in *image/*|*svg*) :;; *) ct="image/png";; esac
  DATAURL="data:$ct;base64,$(b64 "$TMP/src")"
  echo "favicon-gen: source = remote image $SOURCE ($ct)" >&2
else
  # Treat as an Iconify name: prefix:name  or  prefix/name
  name="$(printf '%s' "$SOURCE" | tr ':' '/')"
  case "$name" in */*) :;; *) die "'$SOURCE' is not a file, URL, or prefix:name. e.g. noto:fox";; esac
  url="https://api.iconify.design/${name}.svg?width=512&height=512"
  curl -sSL -m 30 -o "$TMP/src.svg" "$url" || die "failed to fetch Iconify icon $SOURCE"
  grep -qi '<svg' "$TMP/src.svg" || die "Iconify has no icon '$SOURCE' (browse https://icon-sets.iconify.design)"
  DATAURL="data:image/svg+xml;base64,$(b64 "$TMP/src.svg")"
  echo "favicon-gen: source = Iconify $name" >&2
fi

# --- Build payload + call the API ---
payload="$(cat <<JSON
{"image":"$DATAURL","backgroundColor":"$BG","backgroundShape":"$SHAPE","variantType":"$VARIANT","includeDevVariations":$BADGES,"includeThemeAwareFavicon":$THEME$( [ -n "$PRIMARY" ] && printf ',"primaryColor":"%s"' "$PRIMARY" )}
JSON
)"

echo "favicon-gen: generating via $API ..." >&2
code="$(curl -sSL -m 60 -o "$TMP/resp.json" -w '%{http_code}' -X POST "$API" \
  -H 'Content-Type: application/json' --data "$payload")"
[ "$code" = "200" ] || die "API returned HTTP $code: $(get_error "$TMP/resp.json")"

# --- Decode the zip and unpack straight into OUT ---
mkdir -p "$OUT"
extract_zip_b64 < "$TMP/resp.json" | base64 -d > "$TMP/favicons.zip"
[ -s "$TMP/favicons.zip" ] || die "empty package returned"
unzip -o -q "$TMP/favicons.zip" -d "$OUT"

# --- Emit a <head> snippet for installation ---
HEAD="$OUT/.favicon-head.html"
{
  echo '<link rel="icon" type="image/x-icon" href="/favicon.ico">'
  echo '<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">'
  echo '<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">'
  echo '<link rel="icon" type="image/png" sizes="48x48" href="/favicon-48x48.png">'
  echo '<link rel="icon" type="image/png" sizes="96x96" href="/favicon-96x96.png">'
  echo '<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">'
  if [ "$THEME" = "true" ]; then
    echo '<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16-light.png" media="(prefers-color-scheme: light)">'
    echo '<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16-dark.png" media="(prefers-color-scheme: dark)">'
  fi
  echo '<link rel="manifest" href="/manifest.json">'
  if [ "$BADGES" = "true" ]; then
    cat <<'STAGE'

<!-- Per-stage icons: render the right set off your environment.
     Production stays clean; staging/dev get a badged icon + their own manifest.
     Swap the hard-coded tags above for stage-aware logic in your layout, e.g.:

       const isStaging = process.env.NEXT_PUBLIC_APP_ENV === "staging";
       const isDev     = process.env.NODE_ENV === "development";
       const prefix    = isDev ? "/dev-" : isStaging ? "/staging-" : "/";
       const manifest  = isDev ? "/dev-manifest.json"
                       : isStaging ? "/staging-manifest.json" : "/manifest.json";
       // <link rel="icon" href={`${prefix}favicon.ico`} />
       // <link rel="manifest" href={manifest} />

     Staging files: /staging-favicon.ico, /staging-favicon-32x32.png, /staging-manifest.json
     Dev files:     /dev-favicon.ico, /dev-favicon-32x32.png, /dev-manifest.json
-->
STAGE
  fi
} > "$HEAD"

echo >&2
echo "favicon-gen: ✓ wrote $(find "$OUT" -maxdepth 1 \( -name 'favicon*' -o -name 'apple*' -o -name 'android*' -o -name 'ms-icon*' -o -name '*manifest.json' -o -name 'staging-*' -o -name 'dev-*' \) | wc -l | tr -d ' ') files to $OUT" >&2
echo "favicon-gen: <head> snippet saved to $HEAD — install it as below:" >&2
echo "----------------------------------------" >&2
cat "$HEAD" >&2
echo "----------------------------------------" >&2
