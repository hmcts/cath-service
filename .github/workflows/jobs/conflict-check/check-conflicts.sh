#!/usr/bin/env bash
#
# Predict whether each open PR would conflict when merged into the base branch.
#
# Reads TSV on stdin: <pr-number>\t<head-label>\t<head-sha>
# Writes one JSON object per PR to stdout (JSON Lines).
#
# Uses `git merge-tree --write-tree`, which performs the merge entirely in the
# object database: no refs move, no working tree is touched, nothing is pushed.
# Exit codes are 0 = merges clean, 1 = conflicts, >1 = merge-tree could not run.
#
# Usage:
#   printf '563\tvibe-563\t478d910c\n' | BASE_REF=origin/master ./check-conflicts.sh

set -uo pipefail

BASE_REF="${BASE_REF:-origin/master}"
MAX_FILES="${MAX_FILES:-20}"

base_sha=$(git rev-parse --verify "$BASE_REF") || {
  echo "error: cannot resolve BASE_REF '$BASE_REF'" >&2
  exit 2
}

# jq -R . is the only safe way to quote arbitrary branch names and paths for JSON.
json_string() { jq -R . <<<"$1"; }

while IFS=$'\t' read -r number label head_sha; do
  [ -n "${number:-}" ] || continue

  # Fork heads are not on origin, but GitHub exposes every PR head under
  # refs/pull/<n>/head on the base repo, so one fetch path covers both cases.
  if ! git cat-file -e "${head_sha}^{commit}" 2>/dev/null; then
    git fetch --quiet --no-tags origin "pull/${number}/head" 2>/dev/null || true
  fi

  if ! git cat-file -e "${head_sha}^{commit}" 2>/dev/null; then
    jq -nc --argjson n "$number" --argjson l "$(json_string "$label")" \
      '{pr: $n, head: $l, status: "unknown", reason: "head commit unavailable", files: []}'
    continue
  fi

  # Nothing to predict when the PR already contains every base commit.
  behind=$(git rev-list --count "${head_sha}..${base_sha}")

  output=$(git merge-tree --write-tree --name-only "$base_sha" "$head_sha" 2>&1)
  rc=$?

  if [ "$rc" -gt 1 ]; then
    jq -nc --argjson n "$number" --argjson l "$(json_string "$label")" \
      --argjson r "$(json_string "$(head -c 300 <<<"$output")")" \
      '{pr: $n, head: $l, status: "unknown", reason: $r, files: []}'
    continue
  fi

  if [ "$rc" -eq 0 ]; then
    jq -nc --argjson n "$number" --argjson l "$(json_string "$label")" --argjson b "$behind" \
      '{pr: $n, head: $l, status: "clean", behind: $b, files: []}'
    continue
  fi

  # Conflict layout: line 1 is the tree OID, then one conflicted path per line
  # until a blank line separates the paths from the informational messages.
  files=$(sed -n '2,/^$/p' <<<"$output" | sed '/^$/d')
  total=$(grep -c . <<<"$files")

  jq -nc \
    --argjson n "$number" \
    --argjson l "$(json_string "$label")" \
    --argjson b "$behind" \
    --argjson total "$total" \
    --argjson files "$(head -n "$MAX_FILES" <<<"$files" | jq -R . | jq -sc .)" \
    '{pr: $n, head: $l, status: "conflict", behind: $b, fileCount: $total, files: $files}'
done
