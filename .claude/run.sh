#!/bin/bash

# Ensure .claude directory exists
mkdir -p .claude

# Check if claude is installed
if ! command -v claude &> /dev/null; then
    echo "Claude is not installed. Installing..."
    npm install -g @anthropic-ai/claude-code
fi

# Check if .claude/claude.env exists
ENV_FILE=".claude/claude.env"

if [ ! -f "$ENV_FILE" ]; then
    echo "Creating $ENV_FILE..."

    # Prompt for bedrock token
    read -p "Enter your AWS Bedrock token: " BEDROCK_TOKEN

    # Create the env file
    cat > "$ENV_FILE" << EOF
export CLAUDE_CODE_MAX_OUTPUT_TOKENS=4096
export MAX_THINKING_TOKENS=1024
export ANTHROPIC_MODEL='eu.anthropic.claude-sonnet-4-5-20250929-v1:0'
export ANTHROPIC_SMALL_FAST_MODEL='eu.anthropic.claude-3-haiku-20240307-v1:0'
export CLAUDE_CODE_USE_BEDROCK=1
export AWS_BEARER_TOKEN_BEDROCK=$BEDROCK_TOKEN
export AWS_REGION=eu-west-1
EOF

    echo "Environment file created at $ENV_FILE"
fi

# Source the env file and run claude
source "$ENV_FILE"

# Export a GitHub token for the GitHub MCP server (see .mcp.json) by reusing the
# already-authenticated gh CLI. Kept ephemeral — re-read each session, never stored.
# If gh is not logged in, the var is left empty and the MCP server simply won't connect.
export GITHUB_MCP_TOKEN="$(gh auth token 2>/dev/null || true)"

claude --dangerously-skip-permissions
