#!/bin/bash
# Post-write hook - runs after file modifications to ensure code quality

set -euo pipefail

# Get the repo root (hooks may run from a workspace subdirectory)
PROJECT_DIR="$(git rev-parse --show-toplevel)"

# Logging function
log_hook() {
    local log_file="$PROJECT_DIR/.claude/hooks/run.log"
    mkdir -p "$(dirname "$log_file")"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] POST-WRITE: $1" >> "$log_file"
}

log_hook "Hook started"
echo "🔧 Running post-write checks..."

# Run formatter and linter directly via root biome (not turbo per-workspace)
echo "Checking code formatting and linting..."
log_hook "Starting biome format and lint"
if ! "$PROJECT_DIR/node_modules/.bin/biome" format --write .; then
    echo "❌ Code formatting check failed. Run 'yarn format' to fix."
    log_hook "Formatter check failed"
    exit 2
fi

if ! "$PROJECT_DIR/node_modules/.bin/biome" check --write .; then
    echo "❌ Linting failed"
    log_hook "Linter failed"
    exit 2
fi

echo "✅ Post-write checks completed"
log_hook "Hook completed successfully"
exit 0