#!/usr/bin/env bash
#
# Predict which files would conflict when a branch is merged into the base branch,
# without touching the working tree or any ref.
#
# Uses `git merge-tree --write-tree`, which performs the merge entirely in the
# object database: no refs move, no working tree is touched, nothing is pushed.
# Its exit codes are 0 = merges clean, 1 = conflicts, >1 = could not run.
#
# Two callers, two modes:
#
#   Local (step 2 of SKILL.md) — one branch, human-readable:
#     .claude/skills/auto-rebase/check-conflicts.sh                 # current branch
#     .claude/skills/auto-rebase/check-conflicts.sh my-branch
#     BASE_REF=origin/main .claude/skills/auto-rebase/check-conflicts.sh
#
#   CI (.github/workflows/conflict-check.yml) — many PRs, JSON Lines out:
#     printf '563\tvibe-563\t478d910c\n' | BASE_REF=origin/master ./check-conflicts.sh --json
#     stdin is TSV: <pr-number>\t<head-label>\t<head-sha>
#
# A merge is predicted, not a rebase. A rebase replays each commit separately and
# so can stop on conflicts this does not surface — treat a clean result as "no
# overlapping hunks", not a guarantee the rebase will be painless.
#
# Exit status: 0 if every branch checked merges clean, 1 if any conflicts, 2 on
# usage or setup error.

set -uo pipefail

BASE_REF="${BASE_REF:-origin/master}"
MAX_FILES="${MAX_FILES:-20}"

mode=local
case "${1:-}" in
  --json) mode=json; shift ;;
  -h|--help) sed -n '2,26p' "$0" | sed 's/^# \?//'; exit 0 ;;
esac

base_sha=$(git rev-parse --verify "$BASE_REF" 2>/dev/null) || {
  echo "error: cannot resolve BASE_REF '$BASE_REF' — run 'git fetch origin' first" >&2
  exit 2
}

# Local mode: resolve one branch and report in prose. Kept separate from the JSON
# path so the CI contract cannot drift when this output is tweaked.
if [ "$mode" = local ]; then
  ref="${1:-HEAD}"
  head_sha=$(git rev-parse --verify "$ref" 2>/dev/null) || {
    echo "error: cannot resolve '$ref'" >&2
    exit 2
  }
  name=$(git rev-parse --abbrev-ref "$ref" 2>/dev/null)

  behind=$(git rev-list --count "${head_sha}..${base_sha}")
  ahead=$(git rev-list --count "${base_sha}..${head_sha}")

  if [ "$behind" -eq 0 ]; then
    echo "$name is up to date with $BASE_REF — no rebase needed."
    exit 0
  fi

  output=$(git merge-tree --write-tree --name-only "$base_sha" "$head_sha" 2>&1)
  rc=$?

  if [ "$rc" -gt 1 ]; then
    echo "could not predict conflicts: $(head -n1 <<<"$output")" >&2
    exit 2
  fi

  echo "$name is $behind behind $BASE_REF, with $ahead commit(s) to replay."

  if [ "$rc" -eq 0 ]; then
    echo "No conflicting files predicted."
    echo
    echo "A rebase replays commits one at a time, so it can still stop on a commit"
    echo "this whole-branch check does not see. Expect it to be straightforward."
    exit 0
  fi

  files=$(sed -n '2,/^$/p' <<<"$output" | sed '/^$/d')
  echo
  echo "Predicted conflicts in $(grep -c . <<<"$files") file(s):"
  sed 's/^/  /' <<<"$files"
  echo
  echo "Replaying $ahead commit(s) may stop more than once, and on files not listed"
  echo "here — merge-tree predicts a single merge, not a commit-by-commit replay."
  exit 1
fi

# jq -R . is the only safe way to quote arbitrary branch names and paths for JSON.
json_string() { jq -R . <<<"$1"; }

any_conflict=0

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
  any_conflict=1

  jq -nc \
    --argjson n "$number" \
    --argjson l "$(json_string "$label")" \
    --argjson b "$behind" \
    --argjson total "$total" \
    --argjson files "$(head -n "$MAX_FILES" <<<"$files" | jq -R . | jq -sc .)" \
    '{pr: $n, head: $l, status: "conflict", behind: $b, fileCount: $total, files: $files}'
done

exit "$any_conflict"
