#!/usr/bin/env bash
# Verify that recovery recipes actually work on a sample candidate.
# Usage: recovery-test.sh <project> <bundle-path>
set -euo pipefail

project="${1:?usage: recovery-test.sh <project> <bundle-path>}"
bundle="${2:?missing bundle-path}"

cd "$project"

# Pick a sample candidate
ws=".repo_janitor_workspace"
sample=$(tail -n +2 "$ws/candidates.tsv" | head -1 | awk -F'\t' '{print $3}')
[[ -z "$sample" ]] && { echo "no candidates to test"; exit 0; }

# Write to a temp dir and verify byte-equality
tmp=$(mktemp -d -t repo-janitor-recovery-test-XXXX)
cp "$bundle/working-tree-copies/$sample" "$tmp/recovered"
live_hash=$(sha256sum "$sample" | awk '{print $1}')
recovered_hash=$(sha256sum "$tmp/recovered" | awk '{print $1}')
rm -rf "$tmp"

if [[ "$live_hash" == "$recovered_hash" ]]; then
    echo "recovery test PASS for sample: $sample (hash=$live_hash)"
    exit 0
else
    echo "recovery test FAIL for sample: $sample"
    echo "  live:      $live_hash"
    echo "  recovered: $recovered_hash"
    exit 1
fi
