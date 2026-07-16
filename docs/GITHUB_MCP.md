# GitHub MCP Server (local)

This repo ships a [Model Context Protocol](https://modelcontextprotocol.io) server
definition that gives Claude Code **typed GitHub tools** (read issues, pull
requests, repository contents, and Project boards) instead of relying on
hand-written `gh api graphql` calls and `jq` parsing.

It is **local-only**: it runs in developer Claude Code sessions. The CI workflows
(`requirements-sync.yml`, `claude.yml`) are unchanged and continue to use the `gh`
CLI directly.

## How it works

- **Definition:** [`.mcp.json`](../.mcp.json) at the repo root. It points at
  GitHub's **remote hosted** MCP server (`https://api.githubcopilot.com/mcp/`) over
  HTTP — there is no local process or Docker container to run.
- **Auto-enabled:** `.claude/settings.json` sets `enableAllProjectMcpServers: true`,
  so the server is picked up automatically — no per-developer enable step.
- **Read-only:** the `X-MCP-Readonly` header restricts it to the `issues`,
  `pull_requests`, `repos`, and `projects` toolsets in read mode.

## Setup

The server authenticates with a token read from your already-authenticated `gh`
CLI. There is **no new secret to create**.

1. Make sure you are logged in: `gh auth status` (run `gh auth login` if not).
2. Start Claude Code via [`.claude/run.sh`](../.claude/run.sh) — it exports
   `GITHUB_MCP_TOKEN="$(gh auth token)"` before launching, which `.mcp.json`
   interpolates into the `Authorization` header.

That's it. In a session, run `/mcp` to confirm the `github` server is connected.

The token is read fresh each session and never written to disk.

## Projects (v2) scope

Project-board tools need the `read:project` scope. The standard `gh` OAuth token
includes it. If a project-board read returns `401`/`403`, your token lacks the
scope — re-authenticate with it:

```bash
gh auth refresh -s read:project
```

Alternatively, export a [fine-grained PAT](https://github.com/settings/tokens) with
`read:project` plus repository contents/issues/PRs as `GITHUB_MCP_TOKEN` instead of
the `gh` token.
