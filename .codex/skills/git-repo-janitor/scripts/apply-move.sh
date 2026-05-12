#!/usr/bin/env bash
# Phase 6: apply a single move via git mv. The reference rewrites are done
# by the move-applier subagent via the Edit tool — this script just performs
# the rename + gates + commit prep.
# Usage: apply-move.sh <project> <src> <dest> <commit-message-file>
set -euo pipefail

project="${1:?usage: apply-move.sh <project> <src> <dest> <commit-msg-file>}"
src="${2:?missing src}"
dest="${3:?missing dest}"
msg="${4:?missing commit-msg-file}"

cd "$project"

# Pre-flight
[[ -f "$src" ]] || { echo "ERROR: source not found: $src" >&2; exit 1; }
[[ -e "$dest" ]] && { echo "ERROR: destination exists: $dest" >&2; exit 2; }

mkdir -p "$(dirname "$dest")"
git mv "$src" "$dest"

echo "moved: $src → $dest"
echo "(commit not yet made; run gates first, then commit using the prepared message)"
