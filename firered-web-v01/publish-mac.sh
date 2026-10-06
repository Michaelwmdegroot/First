#!/usr/bin/env bash
set -Eeuo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(git -C "$HERE" rev-parse --show-toplevel)"
BRANCH="$(git -C "$ROOT" branch --show-current)"
TARGET_BRANCH="feature/firered-web-v01"

if [[ "$BRANCH" != "$TARGET_BRANCH" ]]; then
  printf 'ERROR: checkout %s first (current: %s).\n' "$TARGET_BRANCH" "${BRANCH:-detached}" >&2
  exit 1
fi

bash "$HERE/build-mac.sh"

git -C "$ROOT" add -- firered-web-v01/game.js firered-web-v01/game.wasm
if git -C "$ROOT" diff --cached --quiet -- firered-web-v01/game.js firered-web-v01/game.wasm; then
  printf 'Compiled output is unchanged; nothing to commit.\n'
else
  git -C "$ROOT" commit -m "Build FireRed Web V0.1 locally"
fi

git -C "$ROOT" push origin "HEAD:$TARGET_BRANCH"
SHA="$(git -C "$ROOT" rev-parse HEAD)"

printf '\nPublished without triggering GitHub Actions.\n'
printf 'Phone/browser URL:\n'
printf 'https://raw.githack.com/Michaelwmdegroot/First/%s/firered-web-v01/index.html\n' "$SHA"
