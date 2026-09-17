#!/usr/bin/env bash
# Create a git worktree + branch for a lane.
# Usage: scripts/new-worktree.sh <ID>
# Example: scripts/new-worktree.sh A1  ->  ../asli-A1 on branch lane/A1
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 <ID>" >&2
  exit 1
fi

ID="$1"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORKTREE_DIR="${REPO_ROOT}/../asli-${ID}"
BRANCH="lane/${ID}"

cd "$REPO_ROOT"

if git show-ref --verify --quiet "refs/heads/${BRANCH}"; then
  echo "Branch ${BRANCH} already exists, adding worktree from it."
  git worktree add "$WORKTREE_DIR" "$BRANCH"
else
  git worktree add "$WORKTREE_DIR" -b "$BRANCH"
fi

echo "Worktree ready at ${WORKTREE_DIR} on branch ${BRANCH}"
echo "Start Claude Code there with:"
echo "  Read CLAUDE.md, then plan/tasks/${ID}-*.md, then the docs it lists. Do the task. Update the Handoff section before you stop."
