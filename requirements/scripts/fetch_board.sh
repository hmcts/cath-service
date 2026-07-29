#!/usr/bin/env bash
# Fetch the live state of GitHub Project #43 (CaTH Kanban) as JSON Lines.
#
# One object per board item on stdout, with the board column already mapped to a
# requirement.status value. Fails loudly and non-zero if the board cannot be read.
#
# Why a script rather than something an agent does ad hoc: reading the board needs
# a token with organisation Projects access. When that read fails mid-prompt an
# agent will happily substitute a proxy for board status (issue closed + merged
# PR), which cannot see open issues and so silently reports "no drift". That is
# what put the committed database 126 requirements behind the board. An unreadable
# board must stop the run, not degrade it.
#
# Requires GH_TOKEN (or an authenticated gh) with read:project on the hmcts org.
#
# Usage: requirements/scripts/fetch_board.sh > board.jsonl

set -euo pipefail

PROJECT_ID="${PROJECT_ID:-PVT_kwDOAVwpV84BNDg2}"

for cmd in gh jq; do
  command -v "$cmd" >/dev/null || { echo "error: ${cmd} is required but not installed" >&2; exit 1; }
done

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

total=0
cursor=null

while :; do
  # stderr is kept separate: folding it into the captured JSON would turn any gh
  # warning on an otherwise-successful call into an unparseable response.
  if ! resp=$(read_page "$cursor" 2>/tmp/fetch_board_err.$$); then
    echo "error: cannot read Project board — GraphQL query failed." >&2
    echo "       The token needs organisation Projects: Read on hmcts." >&2
    cat /tmp/fetch_board_err.$$ >&2
    rm -f /tmp/fetch_board_err.$$
    exit 1
  fi
  rm -f /tmp/fetch_board_err.$$

  # A token without projects access gets a null node rather than an HTTP error.
  if [ "$(jq -r '.data.node // "null"' <<<"$resp")" = "null" ]; then
    echo "error: board returned no node for PROJECT_ID=${PROJECT_ID}." >&2
    echo "       The token almost certainly lacks organisation Projects: Read on hmcts." >&2
    exit 1
  fi

  page=$(jq '.data.node.items.nodes | length' <<<"$resp")
  total=$((total + page))

  # Board column -> requirement.status. Covers the WHOLE board, not just the
  # gated part, so the database can mirror backwards moves as well as forwards.
  jq -c '
    def map_status:
      if   . == "Backlog"             then "draft"
      elif . == "Prioritised Backlog" then "proposed"
      elif . == "Refined Tickets"     then "approved"
      elif . == "In Progress"         then "in_progress"
      elif . == "Code Review"         then "implemented"
      elif . == "Ready For Test"      then "implemented"
      elif . == "In Test"             then "implemented"
      elif . == "Ready For Sign Off"  then "implemented"
      elif . == "Done"                then "verified"
      else null end;
    .data.node.items.nodes[]
    | select(.content.number != null)
    | (.fieldValueByName.name // "") as $col
    | {
        issueNumber: .content.number,
        title:       .content.title,
        body:        (.content.body // ""),
        url:         .content.url,
        createdAt:   .content.createdAt,
        boardColumn: $col,
        status:      ($col | map_status),
        labels:      [.content.labels.nodes[].name],
        mergedPrs: [
          .content.closedByPullRequestsReferences.nodes[]
          | select(.state == "MERGED")
          | {number, mergeCommitOid: .mergeCommit.oid, paths: [.files.nodes[].path]}
        ]
      }
    | select(.status != null)' <<<"$resp"

  [ "$(jq -r '.data.node.items.pageInfo.hasNextPage' <<<"$resp")" = "true" ] || break
  cursor=$(jq -r '.data.node.items.pageInfo.endCursor' <<<"$resp")
done

if [ "$total" -eq 0 ]; then
  echo "error: board returned 0 items. Treating as a read failure, not an empty board." >&2
  exit 1
fi

echo "Read ${total} board items" >&2
