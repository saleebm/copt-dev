#!/usr/bin/env bash
# Re-runnable agent-browser smoke test for the 6 rewritten BLOG stubs.
# Visits each slug at https://copt.localhost, asserts the page actually
# rendered post content (title + h1 + non-trivial body), and saves a
# screenshot per slug to scripts/agent-browser/snapshots/.
#
# Usage:
#   bash scripts/agent-browser/test-blog-rewrites.sh
#
# Requires:
#   - Dev server running at https://copt.localhost (bun run dev)
#   - agent-browser CLI on PATH (see .agents/skills/agent-browser/SKILL.md)

set -euo pipefail

SLUGS=(
  "06112025"
  "11112025"
  "7202025"
  "2026-05-12-apfvd"
  "2026-05-12-ttp"
  "2026-05-12-ykwya"
)

BASE_URL="${COPT_BASE_URL:-https://copt.localhost}"
SESSION="blog-rewrites"
SNAP_DIR="$(cd "$(dirname "$0")" && pwd)/snapshots"
MIN_BODY_LEN=200

mkdir -p "$SNAP_DIR"

pass_count=0
fail_count=0
failures=()

cleanup() {
  agent-browser --session "$SESSION" close >/dev/null 2>&1 || true
}
trap cleanup EXIT

# Strip wrapping double quotes / whitespace from `agent-browser eval` JSON-ish output.
strip_quotes() {
  local s="$1"
  s="${s#"${s%%[![:space:]]*}"}"
  s="${s%"${s##*[![:space:]]}"}"
  s="${s#\"}"
  s="${s%\"}"
  printf '%s' "$s"
}

check_slug() {
  local slug="$1"
  local url="${BASE_URL}/${slug}"
  local reason=""

  agent-browser --session "$SESSION" open "$url" >/dev/null
  agent-browser --session "$SESSION" wait --load networkidle >/dev/null

  local title
  title="$(strip_quotes "$(agent-browser --session "$SESSION" eval 'document.title')")"
  if [[ -z "$title" || "$title" == *"404"* || "$title" == *"Not Found"* ]]; then
    reason="title looked like 404: '$title'"
    echo "[FAIL] /$slug — $reason"
    failures+=("/$slug — $reason")
    fail_count=$((fail_count + 1))
    return
  fi

  local h1
  h1="$(strip_quotes "$(agent-browser --session "$SESSION" eval 'document.querySelector("h1")?.textContent ?? ""')")"
  if [[ -z "$h1" ]]; then
    reason="no <h1> on page"
    echo "[FAIL] /$slug — $reason"
    failures+=("/$slug — $reason")
    fail_count=$((fail_count + 1))
    return
  fi

  local body_len
  body_len="$(strip_quotes "$(agent-browser --session "$SESSION" eval 'document.body.innerText.length')")"
  if ! [[ "$body_len" =~ ^[0-9]+$ ]] || (( body_len < MIN_BODY_LEN )); then
    reason="body too short (len=$body_len, min=$MIN_BODY_LEN)"
    echo "[FAIL] /$slug — $reason"
    failures+=("/$slug — $reason")
    fail_count=$((fail_count + 1))
    return
  fi

  agent-browser --session "$SESSION" screenshot "$SNAP_DIR/${slug}.png" >/dev/null

  echo "[PASS] /$slug — title='$title' h1='$h1' body_len=$body_len"
  pass_count=$((pass_count + 1))
}

echo "agent-browser test: 6 blog rewrites @ $BASE_URL"
echo "snapshots: $SNAP_DIR"
echo

for slug in "${SLUGS[@]}"; do
  check_slug "$slug"
done

echo
echo "---"
echo "Passed: $pass_count / ${#SLUGS[@]}"
echo "Failed: $fail_count / ${#SLUGS[@]}"

if (( fail_count > 0 )); then
  echo
  echo "Failures:"
  for f in "${failures[@]}"; do
    echo "  - $f"
  done
  exit 1
fi
