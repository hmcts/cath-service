#!/usr/bin/env bash
# Fetch the live state of GitHub Project #43 (CaTH Kanban) as JSON.
#
# Emits one JSON object per gated issue to stdout (JSON Lines), with the board
# status already mapped to a requirement.status value. Fails loudly and non-zero
# if the board cannot be read or comes back empty.
#
# Why this is a script and not part of the sync prompt: reading the board needs a
# projects permission the Claude App does not declare, so the GraphQL call used to
# fail silently mid-prompt. Claude then substituted its own proxy for board status
# (closed issue + merged closing PR), which cannot see gated issues that have no PR
# — every "Refined Tickets" item. The nightly job reported "no drift" for weeks
# while the DB fell 38 requirements behind. Fetching deterministically here means a
# board we cannot read stops the run instead of quietly degrading it.
#
# Requires GH_TOKEN with organization Projects: Read on the hmcts org.
#
# Usage: requirements/scripts/fetch_board.sh > board.jsonl

set -euo pipefail

PROJECT_ID="${PROJECT_ID:?PROJECT_ID must be set}"

for cmd in gh jq; do
  command -v "$cmd" >/dev/null || { echo "::error::${cmd} is required but not installed" >&2; exit 1; }
done

# Board columns at or after "Refined Tickets" are in scope; Backlog and
# Prioritised Backlog are not. Mapping matches how seed.sql was built.
map_status() {
  case "$1" in
    "Refined Tickets") echo "approved" ;;
    "In Progress") echo "in_progress" ;;
    "Code Review" | "Ready For Test" | "In Test" | "Ready For Sign Off") echo "implemented" ;;
    "Done") echo "verified" ;;
    *) echo "" ;;  # ungated (Backlog, Prioritised Backlog) or no Status set
  esac
}

read_page() {
  gh api graphql -f query='
    query($id: ID!, $after: String) {
      node(id: $id) {
        ... on ProjectV2 {
          items(first: 100, after: $after) {
            pageInfo { hasNextPage endCursor }
            nodes {
              fieldValueByName(name: "Status") {
                ... on ProjectV2ItemFieldSingleSelectValue { name }
              }
              content {
                ... on Issue {
                  number
                  title
                  body
                  url
                  createdAt
                  labels(first: 50) { nodes { name } }
                  closedByPullRequestsReferences(first: 20, includeClosedPrs: true) {
                    nodes {
                      number
                      state
                      mergeCommit { oid }
                      files(first: 100) { nodes { path } }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }' -F id="$PROJECT_ID" -F after="$1"
}

total_items=0
gated_items=0
cursor=null

while :; do
  if ! resp=$(read_page "$cursor" 2>&1); then
    echo "::error::Cannot read Project board — GraphQL query failed. The token needs organization Projects: Read on hmcts. Response: ${resp}" >&2
    exit 1
  fi

  # A token without projects access gets a null node rather than an HTTP error.
  if [ "$(jq -r '.data.node // "null"' <<<"$resp")" = "null" ]; then
    echo "::error::Project board returned no node for PROJECT_ID=${PROJECT_ID}. The token almost certainly lacks organization Projects: Read on hmcts." >&2
    exit 1
  fi

  page_total=$(jq '.data.node.items.nodes | length' <<<"$resp")
  total_items=$((total_items + page_total))

  while IFS= read -r item; do
    [ -n "$item" ] || continue
    board_status=$(jq -r '.boardStatus' <<<"$item")
    mapped=$(map_status "$board_status")
    [ -n "$mapped" ] || continue
    gated_items=$((gated_items + 1))
    jq -c --arg status "$mapped" '. + {status: $status}' <<<"$item"
  done < <(jq -c '
    .data.node.items.nodes[]
    | select(.content.number != null)
    | {
        issueNumber: .content.number,
        title: .content.title,
        body: .content.body,
        url: .content.url,
        createdAt: .content.createdAt,
        boardStatus: (.fieldValueByName.name // ""),
        labels: [.content.labels.nodes[].name],
        mergedPrs: [
          .content.closedByPullRequestsReferences.nodes[]
          | select(.state == "MERGED")
          | {number, mergeCommitOid: .mergeCommit.oid, paths: [.files.nodes[].path]}
        ]
      }' <<<"$resp")

  [ "$(jq -r '.data.node.items.pageInfo.hasNextPage' <<<"$resp")" = "true" ] || break
  cursor=$(jq -r '.data.node.items.pageInfo.endCursor' <<<"$resp")
done

if [ "$total_items" -eq 0 ]; then
  echo "::error::Project board returned 0 items. Treating as a read failure rather than an empty board." >&2
  exit 1
fi

echo "Read ${total_items} board items, ${gated_items} at or past 'Refined Tickets'" >&2
