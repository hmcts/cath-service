#!/bin/bash
# Post-write hook - runs after file modifications to ensure code quality

set -euo pipefail

# Get the project directory - use CLAUDE_PROJECT_DIR if set (hooks run in worktree context),
# otherwise fall back to pwd
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"

# Resolve the main worktree (where node_modules lives)
COMMON_DIR="$(git -C "$PROJECT_DIR" rev-parse --git-common-dir 2>/dev/null || echo "$PROJECT_DIR/.git")"
MAIN_WORKTREE="$(dirname "$COMMON_DIR")"
if [ -d "$MAIN_WORKTREE/node_modules" ]; then
    BIOME_BIN="$MAIN_WORKTREE/node_modules/.bin/biome"
else
    BIOME_BIN="$PROJECT_DIR/node_modules/.bin/biome"
fi

# Logging function
log_hook() {
    local log_file="$PROJECT_DIR/.claude/hooks/run.log"
    mkdir -p "$(dirname "$log_file")"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] POST-WRITE: $1" >> "$log_file"
}

log_hook "Hook started"

if [ ! -x "$BIOME_BIN" ]; then
    log_hook "biome not found at $BIOME_BIN, skipping"
    exit 0
fi

# Only check files that were actually written (passed via CLAUDE_FILE_PATHS env var)
# Fall back to checking nothing if not set — don't scan the whole codebase
FILES_TO_CHECK="${CLAUDE_FILE_PATHS:-}"

if [ -z "$FILES_TO_CHECK" ]; then
    log_hook "No CLAUDE_FILE_PATHS set, skipping"
    exit 0
fi

# Filter to only TypeScript/JavaScript files (skip .njk, .json, .prisma, .sh, etc.)
TS_FILES=""
while IFS= read -r f; do
    case "$f" in
        *.ts|*.tsx|*.js|*.jsx)
            if [ -f "$f" ]; then
                TS_FILES="$TS_FILES $f"
            fi
            ;;
    esac
done <<< "$FILES_TO_CHECK"

if [ -z "$TS_FILES" ]; then
    log_hook "No TS/JS files to check"
    exit 0
fi

log_hook "Checking files: $TS_FILES"

# Format then lint only the written files
# Use || true so pre-existing errors elsewhere don't block this write
if ! $BIOME_BIN format --write $TS_FILES 2>&1; then
    log_hook "Format had issues (non-blocking)"
fi

if ! $BIOME_BIN check --write $TS_FILES 2>&1; then
    log_hook "Lint had issues (non-blocking)"
fi

log_hook "Hook completed"
exit 0
