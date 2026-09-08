#!/usr/bin/env bash
set -euo pipefail

# Script: detect-affected-apps.sh
# Purpose: Detect which apps have been affected by changes using Turborepo
# Usage: detect-affected-apps.sh [base-sha]
#   base-sha: Optional. SHA to compare against (defaults to origin/master)
# Outputs:
#   - affected_apps: JSON array of buildable apps that were affected
#   - helm_apps: JSON array of all apps with Helm charts
#   - has_changes: boolean indicating if any apps were affected
#   - needs_shared_build: boolean, true if any affected app uses the shared build stage
#
# The root Dockerfile is the source of truth for which apps are buildable.

# Accept optional base SHA as first argument
BASE_SHA="${1:-}"

DOCKERFILE="Dockerfile"

# Stage aliases declared in the root Dockerfile, e.g. `web` from `FROM x AS web`.
dockerfile_stages() {
  awk '
    /^FROM[[:space:]]/ {
      for (i = 2; i < NF; i++) {
        if (tolower($i) == "as") { print $(i + 1) }
      }
    }
  ' "$DOCKERFILE"
}

# An app is buildable if the root Dockerfile has a stage named after it
buildable_apps() {
  local stages app
  stages="$(dockerfile_stages)"
  for dir in apps/*/; do
    app="$(basename "$dir")"
    if echo "$stages" | grep -qx "$app"; then
      echo "$app"
    fi
  done
}

# True if the app's stage copies anything out of the shared `build` stage.
stage_uses_shared_build() {
  awk -v stage="$1" '
    /^FROM[[:space:]]/ {
      alias = ""
      for (i = 2; i < NF; i++) {
        if (tolower($i) == "as") { alias = $(i + 1) }
      }
      in_stage = (alias == stage)
      next
    }
    in_stage && /--from=build[[:space:]]/ { found = 1 }
    END { exit (found ? 0 : 1) }
  ' "$DOCKERFILE"
}

main() {
  echo "Detecting affected apps using Turborepo..."

  # Find all apps with Helm charts
  local helm_apps
  helm_apps=$(find apps/*/helm -name Chart.yaml 2>/dev/null | sed 's|apps/\([^/]*\)/helm/Chart.yaml|\1|' | jq -R -s -c 'split("\n") | map(select(. != ""))')

  # A renamed stage would silently drop that app from the build matrix, leaving
  # the previously published image deployed against the new chart.
  local buildable app
  buildable="$(buildable_apps)"
  for app in $(echo "$helm_apps" | jq -r '.[]'); do
    if ! echo "$buildable" | grep -qx "$app"; then
      echo "Error: apps/${app}/helm/Chart.yaml exists but ${DOCKERFILE} has no '${app}' stage" >&2
      exit 1
    fi
  done

  local use_fallback="false"

  # Use provided base SHA, or default to origin/master
  if [ -n "$BASE_SHA" ]; then
    # A squash merge or force push can leave the cached SHA unreachable; the
    # comparisons below would then fail inside `if` conditions, where errexit
    # does not apply, and conclude "nothing affected".
    if git cat-file -e "${BASE_SHA}^{commit}" 2>/dev/null; then
      export TURBO_SCM_BASE="$BASE_SHA"
      echo "Using custom base: $BASE_SHA"
    else
      echo "Base SHA $BASE_SHA is unreachable - building all apps"
      use_fallback="true"
    fi
  else
    # No cached SHA - build all apps to establish baseline for this PR/change
    echo "No cached SHA - building all apps to establish baseline"
    use_fallback="true"
  fi

  if [ "$use_fallback" = "false" ]; then
    # Assigned rather than piped into grep, so a git failure is visible here
    # instead of reading as "no Dockerfile change".
    local changed_files
    if ! changed_files="$(git diff --name-only "$BASE_SHA" HEAD)"; then
      echo "Error: git diff against $BASE_SHA failed" >&2
      exit 1
    fi

    # These sit outside every workspace, so Turborepo cannot attribute a change
    # in them to any app.
    if echo "$changed_files" | grep -qE '^(Dockerfile[^/]*|\.dockerignore)$'; then
      echo "Root Dockerfile or .dockerignore changed - building all apps"
      use_fallback="true"
    fi
  fi

  local affected_apps affected_json

  # Get affected packages using Turborepo (comparing against base branch)
  # Note: --affected and --filter cannot be used together
  #
  # A turbo crash must fall back to building everything, not to an empty list
  # that is indistinguishable from "nothing changed".
  if [ "$use_fallback" = "false" ] &&
    ! affected_json=$(yarn turbo ls --affected --output=json 2>/dev/null); then
    echo "turbo ls --affected failed - building all apps"
    use_fallback="true"
  fi

  if [ "$use_fallback" = "true" ]; then
    affected_apps=$(echo "$buildable" | jq -R -s -c 'split("\n") | map(select(. != ""))')
    echo "Fallback: detected all buildable apps"
  else
    # Extract paths, filter to apps directory, strip apps/ prefix, and keep only buildable apps
    affected_apps=$(echo "$affected_json" | jq -r '.packages.items[].path // empty' | { grep '^apps/' || true; } | sed 's|^apps/||' | while read -r app_name; do
      if echo "$buildable" | grep -qx "$app_name"; then
        echo "$app_name"
      fi
    done | jq -R -s -c 'split("\n") | map(select(. != ""))')
  fi

  # Determine if we have any changes
  local has_changes="false"
  if [ "$affected_apps" != "[]" ] && [ -n "$affected_apps" ]; then
    has_changes="true"
  fi

  # Only warm the shared build stage if an affected app actually consumes it
  local needs_shared_build="false"
  for app in $(echo "$affected_apps" | jq -r '.[]'); do
    if stage_uses_shared_build "$app"; then
      needs_shared_build="true"
      break
    fi
  done

  # Output results for GitHub Actions
  if [ -n "${GITHUB_OUTPUT:-}" ]; then
    echo "affected-apps=$affected_apps" >> "$GITHUB_OUTPUT"
    echo "helm-apps=$helm_apps" >> "$GITHUB_OUTPUT"
    echo "has-changes=$has_changes" >> "$GITHUB_OUTPUT"
    echo "needs-shared-build=$needs_shared_build" >> "$GITHUB_OUTPUT"
  fi

  # Log results
  echo "Affected apps (buildable): $affected_apps"
  echo "Helm apps (all): $helm_apps"
  echo "Has changes: $has_changes"
  echo "Needs shared build: $needs_shared_build"
}

main "$@"
