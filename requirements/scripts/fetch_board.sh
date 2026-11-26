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

# Board column -> requirement.status. Covers the WHOLE board, not just the gated
# part, so the database can mirror backwards moves as well as forwards. Defined once
# and shared by the unmapped-column check and the emit step, so they cannot diverge.
MAP_STATUS_DEF='
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
'

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
mapped=0
cursor=null

err_file=$(mktemp "${TMPDIR:-/tmp}/fetch_board_err.XXXXXX")
trap 'rm -f "$err_file"' EXIT

while :; do
  # stderr is kept separate: folding it into the captured JSON would turn any gh
  # warning on an otherwise-successful call into an unparseable response.
  if ! resp=$(read_page "$cursor" 2>"$err_file"); then
    echo "error: cannot read Project board — GraphQL query failed." >&2
    echo "       The token needs organisation Projects: Read on hmcts." >&2
    cat "$err_file" >&2
    exit 1
  fi

  # A token without projects access gets a null node rather than an HTTP error.
  if [ "$(jq -r '.data.node // "null"' <<<"$resp")" = "null" ]; then
    echo "error: board returned no node for PROJECT_ID=${PROJECT_ID}." >&2
    echo "       The token almost certainly lacks organisation Projects: Read on hmcts." >&2
    exit 1
  fi

  page=$(jq '[.data.node.items.nodes[] | select(.content.number != null)] | length' <<<"$resp")
  total=$((total + page))

  # An item in a column we do not recognise must not be silently dropped: that is
  # the same "quietly incomplete" failure this script exists to prevent. A renamed
  # or added column has to be mapped deliberately.
  unknown=$(jq -r "$MAP_STATUS_DEF"'
    .data.node.items.nodes[]
    | select(.content.number != null)
    | (.fieldValueByName.name // "") as $col
    | select(($col | map_status) == null)
    | "\($col)\t#\(.content.number)"' <<<"$resp")
  if [ -n "$unknown" ]; then
    echo "error: board items sit in columns with no status mapping:" >&2
    printf '%s\n' "$unknown" | sort -u | sed 's/^/       /' >&2
    echo "       Add the column to map_status in $0 (and to the status CHECK in" >&2
    echo "       requirements/schema.sql if it needs a status that does not exist yet)." >&2
    exit 1
  fi

  jq -c "$MAP_STATUS_DEF"'
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
      }' <<<"$resp"
  mapped=$((mapped + page))

  [ "$(jq -r '.data.node.items.pageInfo.hasNextPage' <<<"$resp")" = "true" ] || break
  cursor=$(jq -r '.data.node.items.pageInfo.endCursor' <<<"$resp")
done

if [ "$total" -eq 0 ]; then
  echo "error: board returned 0 items. Treating as a read failure, not an empty board." >&2
  exit 1
fi

echo "Read ${total} board items, all ${mapped} mapped to a status" >&2
