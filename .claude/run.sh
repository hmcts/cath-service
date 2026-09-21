#!/bin/bash
set -euo pipefail

# Check if claude is installed
if ! command -v claude &> /dev/null; then
    echo "Claude is not installed. Installing..."
    npm install -g @anthropic-ai/claude-code
fi

# Models are served through the HMCTS AI Gateway rather than Bedrock directly, so
# there is no per-engineer Bedrock token to paste in. Requires `az login`; the
# gateway authenticates with an Entra token (see cnp.settings.json -> token.sh)
# plus this APIM subscription key.
KEY=$(az keyvault secret show \
  --vault-name sps-ai-kv-sbox \
  --name apim-subscription-dtsse-ai-gateway-bedrock-swe \
  --query value -o tsv)

export CLAUDE_CODE_USE_BEDROCK=1
export CLAUDE_CODE_SKIP_BEDROCK_AUTH=1
export CLAUDE_CODE_API_KEY_HELPER_TTL_MS=300000
export AWS_REGION=eu-west-2
export ANTHROPIC_BEDROCK_BASE_URL=https://ai-gateway.sandbox.platform.hmcts.net/ai/platform/v1/bedrock
export ANTHROPIC_CUSTOM_HEADERS="Ocp-Apim-Subscription-Key: $KEY"
export ANTHROPIC_DEFAULT_HAIKU_MODEL='eu.anthropic.claude-haiku-4-5-20251001-v1:0'
export ANTHROPIC_DEFAULT_OPUS_MODEL='eu.anthropic.claude-opus-5[1m]'
export ANTHROPIC_DEFAULT_SONNET_MODEL='eu.anthropic.claude-sonnet-5[1m]'

# Export a GitHub token for the GitHub MCP server (see .mcp.json) by reusing the
# already-authenticated gh CLI. Kept ephemeral — re-read each session, never stored.
# If gh is not logged in, the var is left empty and the MCP server simply won't connect.
export GITHUB_MCP_TOKEN="$(gh auth token 2>/dev/null || true)"

exec claude --settings .claude/cnp.settings.json --dangerously-skip-permissions "$@"
