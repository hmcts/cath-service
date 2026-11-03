#!/usr/bin/env bash
# Gets pip ready to record a baseline: clones pip-frontend, pip-data-management and
# pip-account-management at the commits the baseline is defined against, applies the local
# sign-in patch to pip-frontend, installs its packages, and builds the two backend jars in Docker
# (no local Java needed). Safe to re-run: anything already done for these commits is skipped.
#
# usage: setup.sh <directory for the pip checkouts>
set -euo pipefail

PIP_SRC="$(mkdir -p "${1:?usage: setup.sh <directory for the pip checkouts>}" && cd "$1" && pwd)"
PIP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# The commits the committed fixtures, journeys and route inventory were written against.
# Changing one means re-checking those against the new pip.
PINS=(
  "pip-frontend f9ccef8ad2c81e608a31966a620c622d36147b80"
  "pip-data-management 7fe83c364a903abd654147c556b8af288a5ccd50"
  "pip-account-management 0c1016affdaa6755b0e01af76fb7677c59b3afbe"
)
JDK_IMAGE="eclipse-temurin:21-jdk"

step() { printf '\n== %s\n' "$*"; }

checkout() {
  local repo="$1" commit="$2" dir="$PIP_SRC/$1"
  if [ ! -d "$dir/.git" ]; then
    git clone --quiet --filter=blob:none "https://github.com/hmcts/$repo.git" "$dir"
  fi
  if [ "$(git -C "$dir" rev-parse HEAD)" != "$(git -C "$dir" rev-parse --verify --quiet "$commit^{commit}" || echo none)" ]; then
    git -C "$dir" fetch --quiet origin
    git -C "$dir" checkout --quiet --force --detach "$commit"
  fi
}

for pin in "${PINS[@]}"; do
  read -r repo commit <<<"$pin"
  step "$repo at $commit"
  checkout "$repo" "$commit"
done

step "Patching pip-frontend with the local sign-in"
FRONTEND="$PIP_SRC/pip-frontend"
if git -C "$FRONTEND" apply --reverse --check "$PIP_DIR/pip-frontend.patch" 2>/dev/null; then
  echo "already applied"
else
  git -C "$FRONTEND" checkout --quiet -- .
  git -C "$FRONTEND" apply "$PIP_DIR/pip-frontend.patch"
fi

step "Installing and building pip-frontend"
# The build copies GOV.UK Frontend's templates into src/main/views/govuk and builds the CSS and JS;
# without it every page fails to render
installed="$FRONTEND/node_modules/.ui-baseline-installed"
if [ "$(cat "$installed" 2>/dev/null)" = "$(git -C "$FRONTEND" rev-parse HEAD)" ] && [ -d "$FRONTEND/src/main/views/govuk" ]; then
  echo "already installed and built"
else
  (cd "$FRONTEND" && export COREPACK_ENABLE_DOWNLOAD_PROMPT=0 && corepack yarn install --immutable && corepack yarn build)
  git -C "$FRONTEND" rev-parse HEAD > "$installed"
fi

for repo in pip-data-management pip-account-management; do
  step "Building $repo"
  dir="$PIP_SRC/$repo"
  built="$dir/build/libs/.ui-baseline-built"
  if [ -f "$dir/build/libs/$repo.jar" ] && [ "$(cat "$built" 2>/dev/null)" = "$(git -C "$dir" rev-parse HEAD)" ]; then
    echo "already built"
    continue
  fi
  # Runs as the current user so the build output is not owned by root; Gradle's cache lives in
  # the checkout for the same reason
  build() {
    docker run --rm --user "$(id -u):$(id -g)" -v "$dir:/src" -w /src -e GRADLE_USER_HOME=/src/.gradle-home \
      "$JDK_IMAGE" ./gradlew --quiet --no-daemon assemble
  }
  # The build is memory-hungry; on a busy machine the JVM can be killed, so try once more
  if ! build && ! build; then
    echo "Building $repo failed twice. If the log says the Gradle daemon disappeared, the machine ran out of memory: stop other things (e.g. CaTH) and re-run." >&2
    exit 1
  fi
  git -C "$dir" rev-parse HEAD > "$built"
done

step "pip is ready in $PIP_SRC"
