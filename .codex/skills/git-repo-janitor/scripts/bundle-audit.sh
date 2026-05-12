#!/usr/bin/env bash
# Deep audit of the bundle (beyond byte-equality).
# Usage: bundle-audit.sh <project> <bundle-path>
set -euo pipefail

project="${1:?usage: bundle-audit.sh <project> <bundle-path>}"
bundle="${2:?missing bundle-path}"

cd "$project"
log="$project/.repo_janitor_workspace/bundle_audit.log"
> "$log"

issues=0

# Every candidate has: bundle copy, meta file, index entry
ws=".repo_janitor_workspace"
while IFS=$'\t' read -r id blob_sha path size mtime smell first_sha; do
    [[ "$id" == "id" ]] && continue
    [[ -z "$id" ]] && continue
    if [[ ! -f "$bundle/working-tree-copies/$path" ]]; then
        echo "MISSING-COPY: $id $path" >> "$log"
        issues=$((issues + 1))
    fi
    if [[ ! -f "$bundle/meta/${id}.txt" ]]; then
        echo "MISSING-META: $id" >> "$log"
        issues=$((issues + 1))
    fi
done < "$ws/candidates.tsv"

# Bundle has README + index.tsv + reference-graph + gitignore-before
for f in README.md index.tsv gitignore-before.txt; do
    if [[ ! -f "$bundle/$f" ]]; then
        echo "MISSING-BUNDLE-FILE: $f" >> "$log"
        issues=$((issues + 1))
    fi
done

# Backup ref exists
date_str=$(date -u +%Y-%m-%d)
if ! git rev-parse "refs/repo-janitor-backup/${date_str}-pre-cleanup" >/dev/null 2>&1; then
    echo "MISSING-BACKUP-REF" >> "$log"
    issues=$((issues + 1))
fi

if [[ "$issues" -gt 0 ]]; then
    echo "FAIL: $issues issues; see $log"
    exit 1
fi

echo "audit clean"
