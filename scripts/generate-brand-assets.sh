#!/usr/bin/env bash
# Regenerates every logo / icon file in public/ from the train glyph.
# Needs: rsvg-convert (librsvg) and ImageMagick (`magick`). Run: bash scripts/generate-brand-assets.sh
#
# The glyph is the "train_2_fill" icon (MingCute). Keep GLYPH in sync with
# src/components/brand/logo.tsx (LOGO_GLYPH_PATH).
set -euo pipefail

cd "$(dirname "$0")/.."
OUT=public
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

GLYPH='M17,2 C19.2091,2 21,3.79086 21,6 L21,15 C21,16.9094 19.6621,18.5063 17.8727,18.9045 L19.6,20.2 C20.0418,20.5314 20.1314,21.1582 19.8,21.6 C19.4686,22.0418 18.8418,22.1314 18.4,21.8 L14.6667,19 L9.33333,19 L5.6,21.8 C5.15817,22.1314 4.53137,22.0418 4.2,21.6 C3.86863,21.1582 3.95817,20.5314 4.4,20.2 L6.12731,18.9045 C4.33785,18.5063 3,16.9094 3,15 L3,6 C3,3.79086 4.79086,2 7,2 L17,2 Z M8.25,13.25 C7.55964,13.25 7,13.8096 7,14.5 C7,15.1904 7.55964,15.75 8.25,15.75 C8.94036,15.75 9.5,15.1904 9.5,14.5 C9.5,13.8096 8.94036,13.25 8.25,13.25 Z M15.75,13.25 C15.0596,13.25 14.5,13.8096 14.5,14.5 C14.5,15.1904 15.0596,15.75 15.75,15.75 C16.4404,15.75 17,15.1904 17,14.5 C17,13.8096 16.4404,13.25 15.75,13.25 Z M16.5,5 L7.5,5 C6.72030118,5 6.079551,5.59488554 6.00686655,6.35553954 L6,6.5 L6,9.5 C6,10.2796706 6.59488554,10.9204457 7.35553954,10.9931332 L7.5,11 L16.5,11 C17.2796706,11 17.9204457,10.4050879 17.9931332,9.64445577 L18,9.5 L18,6.5 C18,5.72030118 17.4050879,5.079551 16.6444558,5.00686655 L16.5,5 Z M16,7 L16,9 L8,9 L8,7 L16,7 Z'
FROM='#3b82f6'   # the app's primary blue, dark-mode shade
TO='#1d4ed8'     # the app's primary blue, light-mode shade (also the PWA theme colour)

# tile <file> <corner-radius> <glyph-scale>
#   A 512x512 gradient tile with the glyph in white, centred (the glyph's own centre is 12,12 of 24).
tile() {
  local file=$1 rx=$2 scale=$3
  local shift
  shift=$(awk "BEGIN { printf \"%.2f\", 256 - 12 * $scale }")
  cat > "$file" <<SVG
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="$FROM"/>
      <stop offset="1" stop-color="$TO"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="$rx" fill="url(#g)"/>
  <path transform="translate($shift $shift) scale($scale)" fill="#ffffff" fill-rule="nonzero" d="$GLYPH"/>
</svg>
SVG
}

png() { rsvg-convert -w "$2" -h "$2" "$1" -o "$3"; }

# Rounded tile, transparent corners: the "any" icons, the logo, and the SVG favicon.
tile "$TMP/any.svg" 112 15.5
# Small sizes get a bigger glyph so it still reads at 16px.
tile "$TMP/small.svg" 112 17.5
# Full bleed, glyph inside the maskable safe zone (the OS crops to a circle / squircle).
tile "$TMP/maskable.svg" 0 12.5
# Full bleed for iOS, which rounds the corners itself.
tile "$TMP/apple.svg" 0 14.5

cp "$TMP/any.svg" "$OUT/logo.svg"
cp "$TMP/any.svg" "$OUT/icon.svg"

png "$TMP/any.svg" 1024 "$OUT/logo.png"
png "$TMP/any.svg" 512 "$OUT/icon-512x512.png"
png "$TMP/any.svg" 192 "$OUT/icon-192x192.png"
png "$TMP/maskable.svg" 512 "$OUT/icon-maskable-512x512.png"
png "$TMP/apple.svg" 180 "$OUT/apple-touch-icon.png"
png "$TMP/small.svg" 32 "$OUT/favicon-32x32.png"
png "$TMP/small.svg" 16 "$OUT/favicon-16x16.png"
png "$TMP/small.svg" 48 "$TMP/favicon-48.png"
magick "$OUT/favicon-16x16.png" "$OUT/favicon-32x32.png" "$TMP/favicon-48.png" "$OUT/favicon.ico"

# Light/dark variants are no longer needed: the blue tile reads on both.
rm -f "$OUT/favicon-16x16-light.png" "$OUT/favicon-16x16-dark.png"

echo "Brand assets written to $OUT/"
